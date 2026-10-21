// Cover art helpers for the admin panel: fetch or take an image, center-crop it to a
// square, scale it down and return base64 JPEG (no data: prefix) ready for the repo.
// Browser-only (canvas, createImageBitmap, FileReader).

const MSG_BLOCKED = "Couldn't download the cover image (the site may block it). Download it and upload the file instead.";
const MSG_UNREADABLE = "Couldn't read that image. Try a JPG or PNG file.";
const MSG_NOT_URL = 'Paste a full image link (https://…) or choose a file.';

// Load a Blob as a drawable source. Prefers createImageBitmap, falls back to <img>.
async function loadImage(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return {
        draw: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => { if (bitmap.close) bitmap.close(); },
      };
    } catch (_) { /* fall through to <img> */ }
  }

  const objectUrl = URL.createObjectURL(blob);
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error(MSG_UNREADABLE));
      img.src = objectUrl;
    });
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
  return {
    draw: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(objectUrl),
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error(MSG_UNREADABLE));
    reader.readAsDataURL(blob);
  });
}

function canvasToBase64(canvas, quality) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) resolve(blobToBase64(blob));
        else reject(new Error(MSG_UNREADABLE));
      }, 'image/jpeg', quality);
      return;
    }
    // Old browsers without toBlob.
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
  });
}

export async function toJpegBase64(source, { max = 800, quality = 0.85 } = {}) {
  let blob;
  if (typeof source === 'string') {
    const url = source.trim();
    if (!/^https?:\/\//i.test(url)) throw new Error(MSG_NOT_URL);
    let res;
    try {
      res = await fetch(url, { mode: 'cors' });
    } catch (_) {
      // Network failure or CORS block.
      throw new Error(MSG_BLOCKED);
    }
    if (!res.ok) throw new Error(MSG_BLOCKED);
    blob = await res.blob();
  } else if (source instanceof Blob) {
    blob = source;
  } else {
    throw new Error(MSG_NOT_URL);
  }

  const img = await loadImage(blob);
  try {
    const side = Math.min(img.width, img.height);
    if (!side) throw new Error(MSG_UNREADABLE);

    const size = Math.max(1, Math.round(Math.min(max, side)));
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img.draw, sx, sy, side, side, 0, 0, size, size);

    return await canvasToBase64(canvas, quality);
  } finally {
    img.release();
  }
}

// Object URL for a File/Blob (caller should URL.revokeObjectURL it when done), or the string itself.
export function previewUrl(fileOrUrl) {
  if (!fileOrUrl) return '';
  if (typeof fileOrUrl === 'string') return fileOrUrl;
  return URL.createObjectURL(fileOrUrl);
}
