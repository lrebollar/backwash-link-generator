// Public page. Renders either the store profile (no ?a=) or one album
// (?a=<slug>, or #preview=<base64url JSON> from the admin panel).
// Only trusted strings (ICONS) go through innerHTML; all data uses textContent / attributes.

import { PLATFORMS, SOCIALS, THEMES, THEME_STORAGE_KEY, DEFAULT_TEXTS, SLUG_RE } from './platforms.js';
import { loadConfig, loadSite, loadAlbum } from './data.js';

const DEFAULT_NAME = 'Backwash Records';
const DEFAULT_THEME = 'ink';
const THEME_WAIT_MS = 3000;
const THEME_LINK_ID = 'theme-css';
const THEME_KEYS = THEMES.map((t) => t.key);
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const PREVIEW_RE = /^#preview=([A-Za-z0-9_-]+)/;
// RFC 2606 example domains (example.com/net/org and their subdomains) are template placeholders.
const PLACEHOLDER_HOST_RE = /(^|\.)example\.(com|net|org)$/i;
// Socials where a link without a profile path ("https://www.instagram.com/") is a placeholder.
const PROFILE_SOCIALS = ['instagram', 'facebook', 'tiktok', 'x', 'youtube', 'whatsapp'];

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
// Placeholder hosts give '' too, so every link type (shop, catalog, platforms, socials) hides them.
function safeUrl(value) {
  const s = str(value);
  if (!s || CONTROL_CHARS.test(s)) return '';
  if (SCHEME_RE.test(s)) {
    try {
      const { protocol, hostname } = new URL(s);
      if (protocol !== 'https:' && protocol !== 'http:') return '';
      return PLACEHOLDER_HOST_RE.test(hostname) ? '' : s;
    } catch {
      return '';
    }
  }
  if (s.startsWith('//') || s.startsWith('\\') || s.startsWith('/\\')) return '';
  return s;
}

// A profile social needs a path: "https://x.com" alone is a placeholder. Relative hrefs resolve
// against this page, so only the root ('/' or empty path) counts as no profile.
function hasProfilePath(key, href) {
  if (!PROFILE_SOCIALS.includes(key)) return true;
  try {
    const { pathname } = new URL(href, location.href);
    return !['', '/'].includes(pathname);
  } catch {
    return false;
  }
}

// Social values: email gets mailto: when it has no scheme; everything else goes through safeUrl.
// Empty, placeholder and profile-less values give ''.
function socialHref(key, value) {
  if (key !== 'email') {
    const href = safeUrl(value);
    return href && hasProfilePath(key, href) ? href : '';
  }
  const s = str(value);
  if (/^https?:\/\//i.test(s)) return safeUrl(s);
  const address = s.replace(/^mailto:/i, '');
  const match = /^[^\s@]+@([^\s@]+)$/.exec(address);
  if (!match || CONTROL_CHARS.test(address) || PLACEHOLDER_HOST_RE.test(match[1])) return '';
  return `mailto:${address}`;
}

// Icons come from icons.js (trusted markup). Missing key -> music icon -> nothing.
function setIcon(node, key, icons) {
  const svg = icons[key] || icons.music || '';
  node.innerHTML = typeof svg === 'string' ? svg : '';
  return node;
}

// ---------- preview ----------

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

function siteDefaultTheme(siteTheme) {
  return THEME_KEYS.includes(siteTheme) ? siteTheme : DEFAULT_THEME;
}

// Precedence: valid ?theme= > stored pick (only when the switcher is on) > site.theme > 'ink'.
function pickTheme(param, stored, siteTheme) {
  if (THEME_KEYS.includes(param)) return param;
  if (THEME_KEYS.includes(stored)) return stored;
  return siteDefaultTheme(siteTheme);
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

function themeLink(key) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `assets/css/themes/${key}.css`;
  return link;
}

// Boot only: resolves when the stylesheet loads or fails, or after THEME_WAIT_MS,
// so a slow file cannot hold up the page (there is no old sheet to keep at boot).
function waitForStylesheet(link) {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, THEME_WAIT_MS);
    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
  });
}

// Switching: settles when the stylesheet loads or errors. No timer, so the old sheet
// stays on screen until the new one has actually arrived.
function stylesheetSettled(link) {
  return new Promise((resolve) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });
}

// A file that did not arrive leaves no rules. A sheet that has rules still works after an
// error, e.g. when an optional web-font @import was blocked, so the error alone does not decide.
function sheetHasRules(link) {
  try {
    return link.sheet !== null && link.sheet.cssRules.length > 0;
  } catch {
    return false;
  }
}

async function loadTheme(key) {
  const link = themeLink(key);
  link.id = THEME_LINK_ID;
  const loaded = waitForStylesheet(link);
  document.head.append(link);
  await loaded;
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

let activeTheme = null;
// Bumped on every switch, so a slow stylesheet cannot overwrite a newer pick.
let themeRequest = 0;

// Swaps the theme without a reload. The new stylesheet is added beside the old one, and the
// switch is committed only after it has loaded, so the page keeps its look while it downloads.
// Resolves true when the new design is on screen; false when it failed or a newer pick replaced it.
async function switchTheme(key) {
  if (!THEME_KEYS.includes(key)) return false;
  const request = ++themeRequest;
  if (key === activeTheme) return true;
  const current = document.getElementById(THEME_LINK_ID);
  const link = themeLink(key);
  const settled = stylesheetSettled(link);
  if (current) current.after(link);
  else document.head.append(link);
  await settled;
  if (request !== themeRequest) {
    // A newer pick took over while this one was downloading.
    link.remove();
    return false;
  }
  if (!sheetHasRules(link)) {
    // The theme file did not arrive: keep the current design.
    link.remove();
    console.warn(`Theme "${key}" could not be loaded; keeping the current design`);
    return false;
  }
  if (current) current.remove();
  link.id = THEME_LINK_ID;
  activeTheme = key;
  document.body.classList.remove(...THEME_KEYS.map((k) => `theme-${k}`));
  document.body.classList.add(`theme-${key}`);
  syncThemeColor();
  return true;
}

// localStorage can throw (private mode, blocked site data), so every access is guarded.
function storedTheme() {
  try {
    const key = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_KEYS.includes(key) ? key : null;
  } catch {
    return null;
  }
}

function saveTheme(key) {
  try {
    if (key) localStorage.setItem(THEME_STORAGE_KEY, key);
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Not saved: the pick still applies for this page view.
  }
}

// Drops ?theme= so the URL no longer overrides the pick. The hash stays.
function dropThemeParam() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has('theme')) return;
    url.searchParams.delete('theme');
    history.replaceState(history.state, '', url);
  } catch {
    // Some sandboxed contexts refuse replaceState; the stale param is harmless.
  }
}

// ---------- design switcher ----------

// Floating "Change design" button. Only rendered when site.themeSwitcher is true and not in an iframe.
function renderThemeSwitcher(defaultTheme, icons) {
  const wrap = h('div', 'theme-switcher');
  // The popover panel holds the title and hint; only the inner list is the ARIA menu.
  // tabindex=-1 keeps focus inside the panel when its title or hint is clicked.
  const menu = h('div', 'theme-switcher__menu');
  menu.id = 'theme-menu';
  menu.tabIndex = -1;
  menu.hidden = true;
  const list = h('div', 'theme-switcher__list');
  list.setAttribute('role', 'menu');
  list.setAttribute('aria-label', 'Design');

  const designItems = THEMES.map((theme) => {
    const item = h('button', null, theme.name);
    item.setAttribute('type', 'button');
    item.setAttribute('role', 'menuitemradio');
    item.dataset.theme = theme.key;
    return item;
  });
  const separator = h('div', 'theme-switcher__sep');
  separator.setAttribute('role', 'separator');
  const defaultItem = h('button', null, 'Use store default');
  defaultItem.setAttribute('type', 'button');
  defaultItem.setAttribute('role', 'menuitem');
  defaultItem.dataset.theme = '';
  list.append(...designItems, separator, defaultItem);
  menu.append(
    h('p', 'theme-switcher__title', 'Design'),
    list,
    h('p', 'theme-switcher__hint', 'Saved on this device.'),
  );

  const toggle = h('button', 'theme-switcher__toggle');
  toggle.setAttribute('type', 'button');
  toggle.setAttribute('aria-label', 'Change design');
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'theme-menu');
  setIcon(toggle, 'palette', icons);

  wrap.append(menu, toggle);
  document.body.append(wrap);
  document.body.classList.add('has-theme-switcher');

  const isOpen = () => !menu.hidden;

  const markChecked = (key) => {
    for (const item of designItems) item.setAttribute('aria-checked', String(item.dataset.theme === key));
  };
  markChecked(activeTheme);

  function openMenu() {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    const checked = designItems.find((item) => item.getAttribute('aria-checked') === 'true');
    (checked ?? designItems[0]).focus();
  }

  function closeMenu({ returnFocus = false } = {}) {
    if (!isOpen()) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  }

  // key '' means "Use store default". The pick is saved only once it is actually on screen.
  async function choose(key) {
    const target = key || defaultTheme;
    closeMenu({ returnFocus: true });
    if (await switchTheme(target)) {
      saveTheme(key);
      markChecked(target);
      dropThemeParam();
    }
  }

  toggle.addEventListener('click', () => (isOpen() ? closeMenu() : openMenu()));
  menu.addEventListener('click', (event) => {
    const item = event.target.closest('button[data-theme]');
    if (item) choose(item.dataset.theme);
  });

  wrap.addEventListener('keydown', (event) => {
    if (!isOpen() || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    const items = [...menu.querySelectorAll('button')];
    const at = items.indexOf(document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = at < 0 ? (step > 0 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
    items[next].focus();
  });

  // Focus leaving the switcher closes the menu, including tabbing past the last element
  // (relatedTarget is null then).
  wrap.addEventListener('focusout', (event) => {
    if (isOpen() && !wrap.contains(event.relatedTarget)) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) closeMenu({ returnFocus: true });
  });

  document.addEventListener('pointerdown', (event) => {
    if (isOpen() && !wrap.contains(event.target)) closeMenu();
  });
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
  const config = loadConfig();

  const [{ ICONS }, siteData, albumData] = await Promise.all([
    import('./icons.js').catch(() => ({ ICONS: {} })),
    config.then(loadSite),
    preview ? Promise.resolve(preview) : validSlug ? config.then((c) => loadAlbum(c, validSlug)) : Promise.resolve(null),
  ]);

  // loadSite resolves null when the sheet and the fallback both fail: use the bare defaults.
  const site = siteData || { name: DEFAULT_NAME };
  const icons = ICONS && typeof ICONS === 'object' ? ICONS : {};
  const name = str(site.name) || DEFAULT_NAME;
  const texts = textsFrom(site.texts);
  // A stored pick only counts while the switcher is on; otherwise the site is "locked" to its default.
  const switcherOn = site.themeSwitcher === true;
  const defaultTheme = siteDefaultTheme(site.theme);
  const theme = pickTheme(params.get('theme'), switcherOn ? storedTheme() : null, defaultTheme);
  const album = albumData && isPlainObject(albumData) ? albumData : null;
  const notFound = !preview && Boolean(validSlug) && !album;

  const { backdrop, main } = buildPage({ site, name, texts, album, notFound, icons });
  document.body.append(backdrop, main);
  setDocumentTitle(name, album);

  await loadTheme(theme);
  activeTheme = theme;
  document.body.classList.add(`theme-${theme}`, album ? 'view-album' : 'view-store');
  syncThemeColor();
  if (switcherOn && window.self === window.top) renderThemeSwitcher(defaultTheme, icons);
  document.body.classList.remove('is-loading');
}

boot()
  .catch((err) => console.error('Page failed to render', err))
  .finally(() => document.body.classList.remove('is-loading'));
