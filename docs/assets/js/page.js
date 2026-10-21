// Public page. Renders either the store profile (no ?a=) or one album
// (?a=<slug>, or #preview=<base64url JSON> from the admin panel).
// Only trusted strings (ICONS) go through innerHTML; all data uses textContent / attributes.

import { PLATFORMS, SOCIALS, THEMES, DEFAULT_TEXTS, SLUG_RE } from './platforms.js';

const DEFAULT_NAME = 'Backwash Records';
const DEFAULT_THEME = 'ink';
const THEME_WAIT_MS = 3000;
const THEME_KEYS = THEMES.map((t) => t.key);
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const PREVIEW_RE = /^#preview=([A-Za-z0-9_-]+)/;

const params = new URLSearchParams(location.search);

// ---------- small helpers ----------

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function str(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// Only http(s) URLs and scheme-less relative paths survive (javascript:, data:, //host, ...).
function safeUrl(value) {
  const s = str(value);
  if (!s || CONTROL_CHARS.test(s)) return '';
  if (SCHEME_RE.test(s)) {
    try {
      const { protocol } = new URL(s);
      return protocol === 'https:' || protocol === 'http:' ? s : '';
    } catch {
      return '';
    }
  }
  if (s.startsWith('//') || s.startsWith('\\') || s.startsWith('/\\')) return '';
  return s;
}

// Social values: email gets mailto: when it has no scheme; everything else goes through safeUrl.
function socialHref(key, value) {
  if (key !== 'email') return safeUrl(value);
  const s = str(value);
  if (/^https?:\/\//i.test(s)) return safeUrl(s);
  const address = s.replace(/^mailto:/i, '');
  return !CONTROL_CHARS.test(address) && /^[^\s@]+@[^\s@]+$/.test(address) ? `mailto:${address}` : '';
}

// Icons come from icons.js (trusted markup). Missing key -> music icon -> nothing.
function setIcon(node, key, icons) {
  const svg = icons[key] || icons.music || '';
  node.innerHTML = typeof svg === 'string' ? svg : '';
  return node;
}

// ---------- data loading ----------

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  if (!isPlainObject(data)) throw new Error(`Expected an object in ${url}`);
  return data;
}

async function loadSite() {
  try {
    return await fetchJson('data/site.json');
  } catch (err) {
    console.warn('site.json unavailable, using defaults', err);
    return { name: DEFAULT_NAME };
  }
}

async function loadAlbum(slug) {
  try {
    return await fetchJson(`data/albums/${slug}.json`);
  } catch (err) {
    console.warn(`Album "${slug}" unavailable`, err);
    return null;
  }
}

// base64url UTF-8 JSON -> album object, or null.
function readPreview() {
  const match = PREVIEW_RE.exec(location.hash);
  if (!match) return null;
  try {
    let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return isPlainObject(data) ? data : null;
  } catch (err) {
    console.warn('Ignoring invalid #preview data', err);
    return null;
  }
}

function pickTheme(param, siteTheme) {
  if (THEME_KEYS.includes(param)) return param;
  if (THEME_KEYS.includes(siteTheme)) return siteTheme;
  return DEFAULT_THEME;
}

function textsFrom(custom) {
  const texts = { ...DEFAULT_TEXTS };
  if (isPlainObject(custom)) {
    for (const [key, value] of Object.entries(custom)) {
      const s = str(value);
      if (s) texts[key] = s;
    }
  }
  return texts;
}

// ---------- theme ----------

// Resolves when the stylesheet loads or fails, or after THEME_WAIT_MS.
function loadTheme(theme) {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `assets/css/themes/${theme}.css`;
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, THEME_WAIT_MS);
    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
    document.head.append(link);
  });
}

function syncThemeColor() {
  const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
  if (!/^(#|rgb)/i.test(bg)) return;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
  }
  meta.content = bg;
}

// ---------- markup ----------

function storeButton(className, href, label, iconKey, icons) {
  const a = h('a', className);
  a.setAttribute('href', href);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener');
  a.append(setIcon(h('span', 'btn__icon'), iconKey, icons), document.createTextNode(label));
  return a;
}

function linkItem(platform, href, texts, icons) {
  const li = h('li');
  const a = h('a', `link link--${platform.key}`);
  a.setAttribute('href', href);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener');
  a.append(
    setIcon(h('span', 'link__icon'), platform.icon, icons),
    h('span', 'link__label', platform.label),
    h('span', 'link__cta', texts.play),
  );
  li.append(a);
  return li;
}

function socialItem(social, href, icons) {
  const li = h('li');
  const a = h('a', `social social--${social.key}`);
  a.setAttribute('href', href);
  if (!href.toLowerCase().startsWith('mailto:')) {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
  }
  a.setAttribute('aria-label', social.label);
  setIcon(a, social.icon, icons);
  li.append(a);
  return li;
}

function albumSection(album, backdrop) {
  const title = str(album.title);
  const artist = str(album.artist);
  const section = h('section', 'album');

  const cover = safeUrl(album.cover);
  if (cover) {
    const box = h('div', 'album__cover');
    const img = document.createElement('img');
    img.src = cover;
    img.alt = title ? `${title} cover` : 'Album cover';
    img.decoding = 'async';
    // A missing cover file should not leave a broken image behind.
    img.addEventListener('error', () => {
      box.remove();
      backdrop.style.backgroundImage = '';
    }, { once: true });
    box.append(img);
    section.append(box);
    backdrop.style.backgroundImage = 'url(' + JSON.stringify(cover) + ')';
  }

  section.append(h('h1', 'album__title', title));
  if (artist) section.append(h('p', 'album__artist', artist));
  const meta = [str(album.year), str(album.label)].filter(Boolean).join(' · ');
  if (meta) section.append(h('p', 'album__meta', meta));
  const note = str(album.note);
  if (note) section.append(h('p', 'album__note', note));
  return section;
}

function linksSection(album, texts, icons) {
  const data = isPlainObject(album.links) ? album.links : {};
  const items = PLATFORMS.map((p) => [p, safeUrl(data[p.key])]).filter(([, href]) => href);
  if (!items.length) return null;
  const section = h('section', 'links');
  section.append(h('h2', 'section-title', texts.listen));
  const list = h('ul', 'links__list');
  for (const [platform, href] of items) list.append(linkItem(platform, href, texts, icons));
  section.append(list);
  return section;
}

function footerSection(site, name, texts, icons) {
  const footer = h('footer', 'footer');
  const data = isPlainObject(site.socials) ? site.socials : {};
  const items = SOCIALS.map((s) => [s, socialHref(s.key, data[s.key])]).filter(([, href]) => href);
  if (items.length) {
    footer.append(h('h2', 'section-title', texts.follow));
    const list = h('ul', 'socials');
    for (const [social, href] of items) list.append(socialItem(social, href, icons));
    footer.append(list);
  }
  footer.append(h('p', 'footer__name', `© ${new Date().getFullYear()} ${name}`));
  return footer;
}

function buildPage({ site, name, texts, album, notFound, icons }) {
  const backdrop = h('div', 'backdrop');
  const main = h('main', 'page');

  const brand = h('header', 'brand');
  const logo = h('a', 'brand__logo');
  logo.setAttribute('href', './');
  logo.setAttribute('role', 'img');
  logo.setAttribute('aria-label', name);
  brand.append(logo);
  const tagline = str(site.tagline);
  if (!album && tagline) brand.append(h('p', 'brand__tagline', tagline));
  main.append(brand);

  if (notFound) main.append(h('p', 'notice', texts.notFound));

  if (album) {
    main.append(albumSection(album, backdrop));
    const links = linksSection(album, texts, icons);
    if (links) main.append(links);
  }

  const buttons = [];
  const shopUrl = album ? safeUrl(album.shopUrl) : '';
  const catalogUrl = safeUrl(site.catalogUrl);
  if (shopUrl) buttons.push(storeButton('btn btn--primary', shopUrl, texts.shop, 'bag', icons));
  if (catalogUrl) {
    buttons.push(storeButton(album ? 'btn btn--secondary' : 'btn btn--primary', catalogUrl, texts.catalog, 'disc', icons));
  }
  if (buttons.length) {
    const store = h('section', 'store');
    store.append(...buttons);
    main.append(store);
  }

  main.append(footerSection(site, name, texts, icons));
  return { backdrop, main };
}

function setDocumentTitle(name, album) {
  const parts = album ? [str(album.title), str(album.artist)].filter(Boolean) : [];
  const head = parts.join(' — ');
  document.title = head ? `${head} | ${name}` : name;
}

// ---------- boot ----------

async function boot() {
  const slug = params.get('a') ?? '';
  const validSlug = SLUG_RE.test(slug) ? slug : '';
  const preview = readPreview();

  const [{ ICONS }, site, albumData] = await Promise.all([
    import('./icons.js').catch(() => ({ ICONS: {} })),
    loadSite(),
    preview ? Promise.resolve(preview) : validSlug ? loadAlbum(validSlug) : Promise.resolve(null),
  ]);

  const icons = ICONS && typeof ICONS === 'object' ? ICONS : {};
  const name = str(site.name) || DEFAULT_NAME;
  const texts = textsFrom(site.texts);
  const theme = pickTheme(params.get('theme'), site.theme);
  const album = albumData && isPlainObject(albumData) ? albumData : null;
  const notFound = !preview && Boolean(validSlug) && !album;

  const { backdrop, main } = buildPage({ site, name, texts, album, notFound, icons });
  document.body.append(backdrop, main);
  setDocumentTitle(name, album);

  await loadTheme(theme);
  document.body.classList.add(`theme-${theme}`, album ? 'view-album' : 'view-store');
  syncThemeColor();
  document.body.classList.remove('is-loading');
}

boot()
  .catch((err) => console.error('Page failed to render', err))
  .finally(() => document.body.classList.remove('is-loading'));
