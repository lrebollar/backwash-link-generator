#!/usr/bin/env node
/*
 * Builds docs/assets/js/icons.js from npm packages. No icon path data is hand-drawn.
 *
 * Usage. Run it from a scratch directory where the packages are installed, not from the repo:
 *
 *   mkdir icons-build && cd icons-build && npm init -y
 *   npm i simple-icons lucide-static simple-icons-legacy@npm:simple-icons@14.15.0
 *   node <path-to-repo>/tools/build-icons.mjs [optional/output/icons.js]
 *
 * The default output is docs/assets/js/icons.js in this repo. Re-run after changing a package version.
 *
 * Sources:
 *   - Brand icons come from simple-icons (current major first). simple-icons-legacy is the npm alias
 *     of simple-icons 14.15.0; it supplies amazonMusic, which simple-icons dropped in 15.x.
 *     A brand missing from both falls back to the lucide "music" icon and is reported on stderr and
 *     in the output header.
 *   - Generic icons come from lucide-static.
 *
 * Licenses: simple-icons is CC0-1.0 and lucide-static is ISC. Brand names and logos are trademarks
 * of their respective owners.
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(process.argv[2] ?? join(HERE, '..', 'docs', 'assets', 'js', 'icons.js'));

// Packages resolve from the directory the script is run in (where npm installed them).
const req = createRequire(join(process.cwd(), 'package.json'));

// Every key the output must contain, in output order.
const KEYS = [
  'spotify', 'appleMusic', 'youtubeMusic', 'youtube', 'amazonMusic', 'deezer', 'tidal', 'soundcloud',
  'bandcamp', 'instagram', 'facebook', 'tiktok', 'x', 'whatsapp',
  'mail', 'mapPin', 'globe', 'music', 'bag', 'disc',
];

// ICONS key -> simple-icons export name.
const BRANDS = {
  spotify: 'siSpotify',
  appleMusic: 'siApplemusic',
  youtubeMusic: 'siYoutubemusic',
  youtube: 'siYoutube',
  amazonMusic: 'siAmazonmusic',
  deezer: 'siDeezer',
  tidal: 'siTidal',
  soundcloud: 'siSoundcloud',
  bandcamp: 'siBandcamp',
  instagram: 'siInstagram',
  facebook: 'siFacebook',
  tiktok: 'siTiktok',
  x: 'siX',
  whatsapp: 'siWhatsapp',
};

// ICONS key -> file name (without .svg) in lucide-static/icons/.
const GENERIC = {
  mail: 'mail',
  mapPin: 'map-pin',
  globe: 'globe',
  music: 'music',
  bag: 'shopping-bag',
  disc: 'disc-3',
};

const FALLBACK_LUCIDE = GENERIC.music;

function need(name) {
  try {
    return req(name);
  } catch (err) {
    throw new Error(`"${name}" is not installed in ${process.cwd()}. Run: npm i ${name}`, { cause: err });
  }
}

// Walks up from a package's entry file to its root (the nearest package.json that has a version).
function packageInfo(name) {
  let dir = dirname(req.resolve(name));
  for (;;) {
    try {
      const pj = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      if (pj.version) return { dir, version: pj.version, license: pj.license ?? 'unknown license' };
    } catch {
      // No readable package.json at this level; keep walking up.
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Cannot find the package root for "${name}"`);
    dir = parent;
  }
}

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function brandSvg(icon) {
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${escapeAttr(icon.path)}"/></svg>`;
}

function lucideSvg(lucideDir, file) {
  const raw = readFileSync(join(lucideDir, 'icons', `${file}.svg`), 'utf8');
  const m = raw.match(/<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/);
  if (!m) throw new Error(`No <svg> element in lucide icon "${file}"`);
  const inner = m[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/>/g, '/>')
    .replace(/>\s+</g, '><')
    .trim();
  if (!inner.startsWith('<')) throw new Error(`Empty lucide icon "${file}"`);
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
}

// Single-quoted JS string literal, escaping backslashes and quotes.
const jsString = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function main() {
  const lucide = packageInfo('lucide-static');
  const currentPkg = packageInfo('simple-icons');
  const legacyPkg = packageInfo('simple-icons-legacy');
  const SOURCES = [
    { pkg: currentPkg, mod: need('simple-icons'), label: `simple-icons ${currentPkg.version}` },
    { pkg: legacyPkg, mod: need('simple-icons-legacy'), label: `simple-icons ${legacyPkg.version}` },
  ];

  const icons = {};
  const usedFrom = new Map(); // label -> keys
  const add = (label, key) => usedFrom.set(label, [...(usedFrom.get(label) ?? []), key]);
  const fallbacks = [];

  for (const [key, exportName] of Object.entries(BRANDS)) {
    const src = SOURCES.find((s) => s.mod[exportName]?.path);
    if (src) {
      icons[key] = brandSvg(src.mod[exportName]);
      add(`${src.label}, ${src.pkg.license}`, key);
    } else {
      console.warn(`WARNING: ${exportName} not found in any simple-icons version; "${key}" uses the lucide music icon`);
      icons[key] = lucideSvg(lucide.dir, FALLBACK_LUCIDE);
      fallbacks.push(key);
    }
  }

  for (const [key, file] of Object.entries(GENERIC)) {
    icons[key] = lucideSvg(lucide.dir, file);
    add(`lucide-static ${lucide.version}, ${lucide.license}`, key);
  }

  const missing = KEYS.filter((k) => !icons[k]);
  const extra = Object.keys(icons).filter((k) => !KEYS.includes(k));
  if (missing.length || extra.length) {
    throw new Error(`Key mismatch. Missing: [${missing}] Extra: [${extra}]`);
  }

  const sourceLines = [...usedFrom].map(
    ([label, keys]) => ` *   - ${label}: ${keys.join(', ')}`,
  );
  if (fallbacks.length) {
    sourceLines.push(` *   - Fallback to the lucide music icon (no source found): ${fallbacks.join(', ')}`);
  }

  const header = [
    '/*',
    ' * Icon SVGs for the Backwash link pages (ICONS map below).',
    ' * GENERATED by tools/build-icons.mjs from npm packages. Do not edit by hand; re-run the script.',
    ' *',
    ' * Sources and licenses:',
    ...sourceLines,
    ' *',
    ' * Brand icons (simple-icons, https://simpleicons.org) are trademarks of their respective owners.',
    ' * They identify the platforms only and do not imply endorsement.',
    ' * Generic icons come from Lucide (https://lucide.dev).',
    ' */',
  ].join('\n');

  const body = [
    'export const ICONS = {',
    ...KEYS.map((k) => `  ${k}: ${jsString(icons[k])},`),
    '};',
    '',
  ].join('\n');

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, `${header}\n\n${body}`, 'utf8');
  console.log(`Wrote ${KEYS.length} icons to ${OUT_FILE}`);
  console.log(`Sources: ${[...usedFrom.keys()].join(' | ')}`);
}

try {
  main();
} catch (err) {
  console.error(`build-icons failed: ${err.message}`);
  process.exit(1);
}
