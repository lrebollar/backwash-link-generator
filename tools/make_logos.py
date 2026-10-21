#!/usr/bin/env python3
"""Build the Backwash Records logo and image assets into docs/assets/img/.

Run from the repository root:  python3 tools/make_logos.py
Inputs: brand/*.jpg (1600x1600 JPEG). Needs Pillow and numpy only.
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND_DIR = os.path.join(ROOT, 'brand')
OUT_DIR = os.path.join(ROOT, 'docs', 'assets', 'img')

TRIM = 4          # sources carry a 1 px grey/light stripe on their right and bottom edge
BG_TOL = 90.0     # RGB distance under which a pixel counts as background
BAND = 3          # px of anti-aliased edge around a cut-out
STRONG = 150.0    # RGB distance from background above which a pixel is solid foreground
RAD = 5           # search radius (px) for the nearest solid foreground colour
MAX_SIDE = 1000   # longest side of transparent logos
PNG_LIMIT = 500 * 1024
PAD = 0.03        # crop padding, fraction of the longest side
LANCZOS = Image.Resampling.LANCZOS


def load_src(name):
    """Source JPEG as RGB with the edge stripe trimmed off."""
    im = Image.open(os.path.join(BRAND_DIR, name)).convert('RGB')
    w, h = im.size
    return im.crop((TRIM, TRIM, w - TRIM, h - TRIM))


def border_bg(arr):
    """Median colour of the image border (float32 RGB)."""
    edge = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
    return np.median(edge, axis=0).astype(np.float32)


def rgb_dist(arr, ref):
    diff = arr.astype(np.float32) - ref
    return np.sqrt((diff * diff).sum(-1))


def dilate(m):
    """8-neighbourhood binary dilation."""
    h, w = m.shape
    p = np.pad(m, 1)
    out = np.zeros_like(m)
    for dy in range(3):
        for dx in range(3):
            out |= p[dy:dy + h, dx:dx + w]
    return out


def flood_from_border(cand):
    """Pixels of `cand` 4-connected to any border pixel (iterative BFS)."""
    h, w = cand.shape
    n = h * w
    m = bytearray(cand.tobytes())   # 1 = still unvisited candidate
    reg = bytearray(n)
    seeds = np.concatenate([np.arange(w), np.arange((h - 1) * w, n),
                            np.arange(0, n, w), np.arange(w - 1, n, w)])
    stack = []
    for i in seeds.tolist():
        if m[i]:
            m[i] = 0
            reg[i] = 1
            stack.append(i)
    pop, push = stack.pop, stack.append
    while stack:
        i = pop()
        x = i % w
        j = i - 1
        if x and m[j]:
            m[j] = 0
            reg[j] = 1
            push(j)
        j = i + 1
        if x < w - 1 and m[j]:
            m[j] = 0
            reg[j] = 1
            push(j)
        j = i - w
        if i >= w and m[j]:
            m[j] = 0
            reg[j] = 1
            push(j)
        j = i + w
        if j < n and m[j]:
            m[j] = 0
            reg[j] = 1
            push(j)
    return np.frombuffer(bytes(reg), np.uint8).reshape(h, w).astype(bool)


def trim_to_content(im, alpha_min=8):
    """Crop an RGBA image to its alpha bbox plus PAD of its longest side."""
    alpha = np.asarray(im.getchannel('A'))
    ys, xs = np.nonzero(alpha >= alpha_min)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    pad = int(round(PAD * max(x1 - x0, y1 - y0)))
    w, h = im.size
    box = (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))
    return im.crop(box)


def fit_longest(im, max_side=MAX_SIDE):
    w, h = im.size
    s = max_side / max(w, h)
    if s >= 1:
        return im
    size = (max(1, round(w * s)), max(1, round(h * s)))
    # resize premultiplied so transparent pixels do not bleed colour into edges
    return im.convert('RGBa').resize(size, LANCZOS).convert('RGBA')


def save_png(im, name):
    path = os.path.join(OUT_DIR, name)
    im.save(path, optimize=True)
    if os.path.getsize(path) > PNG_LIMIT:
        # 256-colour palette with alpha kept
        im.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)
    return path


def lineart_logo(src, colour, name):
    """White/black line art: alpha from luminance (<=40 -> 0, >=215 -> 255)."""
    arr = np.asarray(load_src(src)).astype(np.float32)
    lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    alpha = np.clip((lum - 40.0) / (215.0 - 40.0), 0.0, 1.0) * 255.0
    rgba = np.empty(arr.shape[:2] + (4,), np.uint8)
    rgba[..., :3] = colour
    rgba[..., 3] = np.round(alpha).astype(np.uint8)
    im = fit_longest(trim_to_content(Image.fromarray(rgba)))
    return save_png(im, name)


def cutout(src):
    """Remove the background connected to the border; anti-alias the cut edge.

    Edge pixels within BAND px of the cut get alpha = projection of their colour
    onto the bg->foreground line (colour / alpha un-mixed from the bg), so the
    edge carries no bg-coloured fringe.
    """
    arr = np.asarray(load_src(src))
    bg = border_bg(arr)
    d = rgb_dist(arr, bg)
    removed = flood_from_border(d < BG_TOL)
    keep = ~removed

    rgb = arr.astype(np.float32)
    alpha = np.where(keep, 255.0, 0.0).astype(np.float32)

    band = dilate(removed)
    for _ in range(BAND - 1):
        band = dilate(band)
    band &= keep
    ys, xs = np.nonzero(band)
    if len(ys):
        h, w = keep.shape
        C = rgb[ys, xs]
        best = np.full(len(ys), np.inf, np.float32)
        F = C.copy()
        for dy in range(-RAD, RAD + 1):
            for dx in range(-RAD, RAD + 1):
                d2 = dy * dy + dx * dx
                if d2 == 0 or d2 > RAD * RAD:
                    continue
                yy = np.clip(ys + dy, 0, h - 1)
                xx = np.clip(xs + dx, 0, w - 1)
                ok = keep[yy, xx] & (d[yy, xx] >= STRONG) & (d2 < best)
                best[ok] = d2
                F[ok] = rgb[yy[ok], xx[ok]]
        found = np.isfinite(best)
        FB = F - bg
        denom = np.maximum((FB * FB).sum(-1), 1.0)
        t = np.clip(((C - bg) * FB).sum(-1) / denom, 0.0, 1.0)
        t = np.where(found, t, 1.0)
        unmixed = (C - (1.0 - t)[:, None] * bg) / np.maximum(t, 1e-3)[:, None]
        newC = np.where((found & (t >= 0.25))[:, None], unmixed,
                        np.where(found[:, None], F, C))
        rgb[ys, xs] = np.clip(newC, 0, 255)
        alpha[ys, xs] = t * 255.0

    rgba = np.dstack([np.clip(np.round(rgb), 0, 255).astype(np.uint8),
                      np.round(alpha).astype(np.uint8)])
    return Image.fromarray(rgba)


def color_logo(src, name):
    im = fit_longest(trim_to_content(cutout(src)))
    return save_png(im, name)


def mono_wordmark(colour, name):
    """Single-colour wordmark: the bright letter fills (yellow BACKWASH, red RECORDS) become solid,
    the black outline becomes transparent. alpha = cut-out alpha * max(R, G, B)."""
    cut = np.asarray(cutout('wordmark-red.jpg')).astype(np.float32)
    value = cut[..., :3].max(axis=2)
    alpha = cut[..., 3] * np.clip((value - 60.0) / (200.0 - 60.0), 0.0, 1.0)
    rgba = np.empty(cut.shape[:2] + (4,), np.uint8)
    rgba[..., :3] = colour
    rgba[..., 3] = np.round(alpha).astype(np.uint8)
    im = fit_longest(trim_to_content(Image.fromarray(rgba)))
    return save_png(im, name)


def art_square(pad=0.06):
    """Square crop of mascot-red tightly around the artwork, bg kept opaque."""
    img = load_src('mascot-red.jpg')
    arr = np.asarray(img)
    bg = border_bg(arr)
    mask = rgb_dist(arr, bg) >= BG_TOL
    rows = np.nonzero(mask.sum(1) >= 3)[0]
    cols = np.nonzero(mask.sum(0) >= 3)[0]
    x0, x1 = cols.min(), cols.max() + 1
    y0, y1 = rows.min(), rows.max() + 1
    side = int(round(max(x1 - x0, y1 - y0) * (1 + 2 * pad)))
    left = int(round((x0 + x1) / 2 - side / 2))
    top = int(round((y0 + y1) / 2 - side / 2))
    w, h = img.size
    canvas = Image.new('RGB', (side, side), tuple(int(round(v)) for v in bg))
    ix0, iy0 = max(0, left), max(0, top)
    ix1, iy1 = min(w, left + side), min(h, top + side)
    canvas.paste(img.crop((ix0, iy0, ix1, iy1)), (ix0 - left, iy0 - top))
    return canvas


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    written = []

    written.append(lineart_logo('logo-lineart-black.jpg', (255, 255, 255), 'logo-white.png'))
    written.append(lineart_logo('logo-lineart-black.jpg', (0, 0, 0), 'logo-black.png'))
    written.append(color_logo('logo-yellow.jpg', 'logo-color.png'))
    written.append(color_logo('mascot-red.jpg', 'mark-color.png'))
    written.append(color_logo('wordmark-red.jpg', 'wordmark-color.png'))
    written.append(mono_wordmark((255, 255, 255), 'wordmark-white.png'))
    written.append(mono_wordmark((0, 0, 0), 'wordmark-black.png'))

    mascot = load_src('mascot-red.jpg')
    p = os.path.join(OUT_DIR, 'demo-cover.jpg')
    mascot.resize((800, 800), LANCZOS).save(p, quality=85, optimize=True)
    written.append(p)

    square = art_square()
    for size, name in [(32, 'favicon-32.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
        p = os.path.join(OUT_DIR, name)
        square.resize((size, size), LANCZOS).save(p, optimize=True)
        written.append(p)

    p = os.path.join(OUT_DIR, 'og-image.jpg')
    load_src('logo-yellow.jpg').resize((1200, 1200), LANCZOS).save(p, quality=85, optimize=True)
    written.append(p)

    for p in written:
        with Image.open(p) as im:
            size = im.size
        print(f'{os.path.relpath(p, ROOT)}  {size[0]}x{size[1]}  {os.path.getsize(p)} bytes')


if __name__ == '__main__':
    main()
