// Backwash Records admin panel. Plain ES module, no build step.
// Reads and writes albums and site settings through the Apps Script web app (api.js).

import { SheetApi, loadConfig } from './api.js';
import { lookup } from './odesli.js';
import { toJpegBase64 } from './cover.js';
import { renderQR, qrPngDataUrl, nfcSupported, writeNfc, ntagHint } from './share.js';
import { PLATFORMS, SOCIALS, THEMES, DEFAULT_TEXTS, SLUG_RE, slugify } from '../../assets/js/platforms.js';

const SETTINGS_KEY = 'bw-admin-sheet';
const OLD_SETTINGS_KEY = 'bw-admin-settings';
const DEFAULT_SITE_URL = new URL('../', location.href).href;
const SAVED_MSG = 'Saved ✓ — the public page shows it within a minute.';
const VIEWS = ['connection', 'albums', 'editor', 'sticker', 'site'];
const TAB_OF_VIEW = { connection: 'connection', albums: 'albums', editor: 'albums', sticker: 'albums', site: 'site' };
const TEXT_LABELS = {
  listen: 'Heading above the platform buttons',
  play: 'Label on each platform button',
  shop: 'Button: buy this record',
  catalog: 'Button: browse the catalog',
  follow: 'Heading above the social icons',
  notFound: 'Message when the record is not found',
};
const NFC_TOOLS_HINT = "Writing NFC from the browser only works in Chrome on Android. On iPhone (or any phone) use the free app 'NFC Tools': Write → Add a record → URL/URI → paste the link → Write → hold the sticker.";

const state = {
  config: { sheetId: '', appsScriptUrl: '' }, // from docs/config.json
  settings: null,    // { url, password, siteUrl, country }, saved in this browser
  albums: [],        // album objects from listAlbums
  editor: null,      // { isNew, slug, expectedUpdatedAt }
  coverObjectUrl: '',
  statusTimer: 0,
};

/* ---------- small helpers ---------- */

const $ = (id) => document.getElementById(id);
const val = (id) => $(id).value.trim();
const setVal = (id, value) => { $(id).value = value ?? ''; };
const errorText = (e) => (e && e.message) || String(e);
const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test(s);
// Accepts the bare sheet ID or a full sheet URL, like the public pages do.
const sheetIdOf = (raw) => {
  const text = String(raw || '').trim();
  return text.match(/\/d\/([a-zA-Z0-9_-]{20,})/)?.[1] || text;
};

// DOM builder: never parses strings as HTML.
function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

function setMsg(id, text, kind = '') {
  const el = $(id);
  el.textContent = text;
  el.dataset.kind = kind;
}

function setStatus(text, kind = 'ok') {
  const bar = $('status');
  clearTimeout(state.statusTimer);
  bar.textContent = text;
  bar.dataset.kind = kind;
  bar.hidden = !text;
  if (text && kind !== 'err') {
    state.statusTimer = setTimeout(() => { bar.hidden = true; }, 6000);
  }
}

// Runs an async action; any error is shown in the status bar.
async function guard(task) {
  try {
    await task();
  } catch (e) {
    setStatus(errorText(e), 'err');
  }
}

// Disables a button and shows progress text; text '' restores the label.
function setBusy(button, text) {
  if (text) {
    if (button.dataset.label === undefined) button.dataset.label = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    if (button.dataset.label !== undefined) button.textContent = button.dataset.label;
    delete button.dataset.label;
    button.disabled = false;
  }
}

function toBase64Url(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Copies an input's value; selects it when the Clipboard API is blocked.
async function copyFrom(el) {
  try {
    await navigator.clipboard.writeText(el.value);
    return true;
  } catch {
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
    return document.execCommand('copy');
  }
}

/* ---------- settings ---------- */

function normalizeSiteUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim() || DEFAULT_SITE_URL, location.href);
  } catch {
    throw new Error('Public site URL is not a valid URL.');
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error('Public site URL must start with https://');
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/[^/]*\.html?$/i, '');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

// Only the keys of SETTINGS_KEY are read. Settings saved by the old repo-based admin held an access
// token, so they are deleted. The web app URL falls back to docs/config.json when nothing is saved yet.
function loadSettings(config) {
  let saved = {};
  try {
    localStorage.removeItem(OLD_SETTINGS_KEY);
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
  } catch {
    saved = {};
  }
  const settings = {
    url: String(saved.url || config.appsScriptUrl || ''),
    password: String(saved.password || ''),
    siteUrl: String(saved.siteUrl || ''),
    country: String(saved.country || 'US'),
  };
  try {
    settings.siteUrl = normalizeSiteUrl(settings.siteUrl);
  } catch {
    settings.siteUrl = DEFAULT_SITE_URL;
  }
  return settings;
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    return true;
  } catch {
    return false;
  }
}

function isConfigured() {
  return Boolean(state.settings.url && state.settings.password);
}

function makeClient() {
  if (!isConfigured()) throw new Error('Connect to the Google Sheet first (Connection tab).');
  return new SheetApi({ url: state.settings.url, password: state.settings.password });
}

const siteBase = () => state.settings.siteUrl;

/* ---------- views ---------- */

function showView(name) {
  for (const v of VIEWS) $(`view-${v}`).hidden = v !== name;
  for (const b of document.querySelectorAll('[data-tab]')) {
    b.classList.toggle('on', b.dataset.tab === TAB_OF_VIEW[name]);
  }
  window.scrollTo(0, 0);
}

// Sends the user to the Connection tab when no password is saved yet.
function requireConfig() {
  if (isConfigured()) return true;
  showView('connection');
  setStatus('Connect first: enter the web app URL and admin password, then press "Save & test".', 'err');
  return false;
}

/* ---------- connection ---------- */

function fillConnectionForm() {
  const s = state.settings;
  setVal('c-url', s.url);
  setVal('c-password', s.password);
  setVal('c-site', s.siteUrl);
  setVal('c-country', s.country);
}

function readConnectionForm() {
  const next = {
    url: val('c-url'),
    password: $('c-password').value,
    siteUrl: normalizeSiteUrl(val('c-site')),
    country: val('c-country').toUpperCase() || 'US',
  };
  if (!next.url) throw new Error('Paste the Apps Script web app URL first.');
  if (!/^https:\/\//i.test(next.url)) throw new Error('The web app URL must start with https://');
  if (!next.password.trim()) throw new Error('Type the admin password first.');
  if (!/^[A-Z]{2}$/.test(next.country)) throw new Error('Country must be a 2-letter code, e.g. US.');
  return next;
}

// The public pages read docs/config.json; warn when it does not point at this sheet yet.
function showSheetCheck(ping) {
  if (sheetIdOf(state.config.sheetId) === ping.spreadsheetId) {
    $('c-config').hidden = true;
    return;
  }
  setVal('c-config-json', JSON.stringify({ sheetId: ping.spreadsheetId, appsScriptUrl: state.settings.url }, null, 2));
  $('c-config').hidden = false;
}

function hideSheetCheck() {
  $('c-config').hidden = true;
}

async function onSaveConnection() {
  let next;
  try {
    next = readConnectionForm();
  } catch (e) {
    setMsg('c-result', errorText(e), 'err');
    return;
  }
  state.settings = { ...state.settings, ...next };
  const remembered = persistSettings();
  setVal('c-site', next.siteUrl);
  const btn = $('c-save');
  setBusy(btn, 'Testing…');
  try {
    const res = await makeClient().ping();
    const n = res.albums;
    setMsg('c-result', `✓ Connected to ${res.spreadsheetName} (${n} album${n === 1 ? '' : 's'})`, 'ok');
    setStatus(remembered ? 'Connection saved.' : 'Connected, but this browser would not remember the settings.', remembered ? 'ok' : 'err');
    showSheetCheck(res);
  } catch (e) {
    setMsg('c-result', errorText(e), 'err');
    hideSheetCheck();
  } finally {
    setBusy(btn, '');
  }
}

function onForgetPassword() {
  state.settings = { ...state.settings, password: '' };
  state.albums = [];
  setVal('c-password', '');
  persistSettings();
  hideSheetCheck();
  setMsg('c-result', 'Password forgotten on this browser.', 'ok');
  setStatus('Password forgotten. Type it again to reconnect.', 'info');
}

async function onCopyConfig() {
  const ok = await copyFrom($('c-config-json'));
  setStatus(ok ? 'Copied.' : 'Copy failed — select the text and copy it by hand.', ok ? 'ok' : 'err');
}

/* ---------- album list ---------- */

async function showAlbums() {
  if (!requireConfig()) return;
  showView('albums');
  await loadAlbums();
}

async function loadAlbums() {
  setMsg('l-status', 'Loading…');
  $('l-list').replaceChildren();
  try {
    state.albums = await makeClient().listAlbums();
    const n = state.albums.length;
    setMsg('l-status', `${n} album${n === 1 ? '' : 's'}.`);
    renderAlbumList();
  } catch (e) {
    setMsg('l-status', 'Could not load the album list.', 'err');
    setStatus(errorText(e), 'err');
  }
}

function compareAlbums(a, b) {
  const ua = String(a.updatedAt || '');
  const ub = String(b.updatedAt || '');
  if (ua !== ub) return ub.localeCompare(ua);
  return String(a.title || a.slug).localeCompare(String(b.title || b.slug));
}

function renderAlbumList() {
  const q = val('l-search').toLowerCase();
  const rows = state.albums
    .filter((a) => !q || [a.slug, a.title, a.artist].join(' ').toLowerCase().includes(q))
    .sort(compareAlbums);
  const list = $('l-list');
  list.replaceChildren(...rows.map(albumRow));
  if (!state.albums.length) list.append(h('li', { class: 'hint', text: 'No albums yet. Tap "New album" to add one.' }));
  else if (!rows.length) list.append(h('li', { class: 'hint', text: 'No album matches the search.' }));
}

function albumRow(a) {
  const label = `${a.artist ? `${a.artist} — ` : ''}${a.title || '(untitled)'} (${a.slug})`;
  return h('li', { class: 'row' },
    h('span', { class: 'row-text', text: label }),
    h('span', {},
      h('button', { type: 'button', text: 'Edit', onclick: () => guard(() => openAlbum(a.slug)) }),
      h('button', { type: 'button', text: 'Sticker', onclick: () => guard(() => showSticker(a.slug, a)) })));
}

/* ---------- album editor ---------- */

function newAlbum() {
  if (!requireConfig()) return;
  state.editor = { isNew: true, slug: '', expectedUpdatedAt: '' };
  fillAlbumForm({});
  showView('editor');
}

async function openAlbum(slug) {
  const album = await makeClient().getAlbum(slug);
  state.editor = { isNew: false, slug, expectedUpdatedAt: album.updatedAt || '' };
  fillAlbumForm(album);
  showView('editor');
}

function fillAlbumForm(a) {
  const links = a.links || {};
  setVal('a-title', a.title);
  setVal('a-artist', a.artist);
  setVal('a-year', a.year);
  setVal('a-label', a.label);
  setVal('a-note', a.note);
  setVal('a-slug', state.editor.slug);
  setVal('a-cover', a.cover);
  setVal('a-shop', a.shopUrl);
  for (const p of PLATFORMS) setVal(`a-link-${p.key}`, links[p.key]);
  setVal('a-lookup-url', '');
  clearCoverFile();
  setMsg('a-lookup-msg', '');
  setMsg('a-msg', '');
  refreshEditorChrome();
  updateCoverPreview();
}

function refreshEditorChrome() {
  const { isNew, slug } = state.editor;
  $('a-heading').textContent = isNew ? 'New album' : `Edit: ${slug}`;
  $('a-slug').readOnly = !isNew;
  $('a-slug-hint').textContent = isNew
    ? 'Lowercase letters, digits and single hyphens. It becomes part of the sticker link.'
    : "The slug is part of the sticker URL — it can't change.";
  $('a-delete').hidden = isNew;
}

function readAlbumForm() {
  const links = {};
  for (const p of PLATFORMS) links[p.key] = val(`a-link-${p.key}`);
  return {
    slug: val('a-slug'),
    title: val('a-title'),
    artist: val('a-artist'),
    year: val('a-year'),
    label: val('a-label'),
    note: val('a-note'),
    cover: val('a-cover'),
    shopUrl: val('a-shop'),
    links,
  };
}

function validateAlbum(a) {
  if (!a.title) return 'Title is required.';
  if (!a.slug) return 'Slug is required.';
  if (!SLUG_RE.test(a.slug) || a.slug.length > 60) return 'Slug: use lowercase letters, digits and single hyphens (max 60 characters).';
  for (const p of PLATFORMS) {
    const v = a.links[p.key];
    if (v && !isHttpUrl(v)) return `${p.label} link must start with https://`;
  }
  if (a.shopUrl && !isHttpUrl(a.shopUrl)) return 'Shop URL must start with https://';
  return '';
}

async function onLookup() {
  const url = val('a-lookup-url');
  if (!url) {
    setMsg('a-lookup-msg', 'Paste a streaming link first.', 'err');
    return;
  }
  const btn = $('a-lookup-btn');
  setBusy(btn, 'Looking up…');
  setMsg('a-lookup-msg', 'Looking up the link…');
  try {
    // Connected: the Apps Script does the song.link call (browsers are blocked by CORS).
    const api = isConfigured() ? makeClient() : undefined;
    const found = await lookup(url, { country: state.settings.country || 'US', api });
    applyLookup(found);
    setMsg('a-lookup-msg', 'Filled in. Check the values, then save.', 'ok');
  } catch (e) {
    setMsg('a-lookup-msg', errorText(e), 'err');
  } finally {
    setBusy(btn, '');
  }
}

// Fills only what the lookup returned; empty results keep the current values.
function applyLookup(found) {
  if (found.title) setVal('a-title', found.title);
  if (found.artist) setVal('a-artist', found.artist);
  if (found.cover) {
    clearCoverFile();
    setVal('a-cover', found.cover);
  }
  for (const p of PLATFORMS) {
    const v = found.links?.[p.key];
    if (v) setVal(`a-link-${p.key}`, v);
  }
  if (state.editor.isNew && !val('a-slug')) {
    const slug = slugify(`${val('a-artist')} ${val('a-title')}`);
    if (slug) setVal('a-slug', slug);
  }
  updateCoverPreview();
}

function revokeCoverObjectUrl() {
  if (state.coverObjectUrl) {
    URL.revokeObjectURL(state.coverObjectUrl);
    state.coverObjectUrl = '';
  }
}

function clearCoverFile() {
  $('a-cover-file').value = '';
  revokeCoverObjectUrl();
}

function onCoverFileChange() {
  revokeCoverObjectUrl();
  const file = $('a-cover-file').files[0];
  if (file) state.coverObjectUrl = URL.createObjectURL(file);
  updateCoverPreview();
}

// Relative covers (e.g. assets/img/...) resolve against the public site.
function absoluteCover(raw) {
  return isHttpUrl(raw) ? raw : siteBase() + raw.replace(/^\/+/, '');
}

function updateCoverPreview() {
  const img = $('a-cover-preview');
  const raw = val('a-cover');
  const src = state.coverObjectUrl || (raw ? absoluteCover(raw) : '');
  setMsg('a-cover-msg', '');
  img.hidden = !src;
  if (src) img.src = src;
  else img.removeAttribute('src');
}

function onCoverPreviewError() {
  const img = $('a-cover-preview');
  if (img.hidden) return;
  img.hidden = true;
  setMsg('a-cover-msg', 'Cover preview not available. Check the image link.', 'warn');
}

async function onSaveAlbum() {
  const ed = state.editor;
  const album = readAlbumForm();
  const problem = validateAlbum(album);
  if (problem) {
    setMsg('a-msg', problem, 'err');
    return;
  }
  const btn = $('a-save');
  const file = $('a-cover-file').files[0];
  setMsg('a-msg', '');
  setBusy(btn, 'Saving…');
  try {
    const client = makeClient();
    let jpeg = null;
    if (file) {
      setBusy(btn, 'Processing cover…');
      jpeg = await toJpegBase64(file);
    }
    setBusy(btn, 'Saving album…');
    const opts = ed.isNew ? { isNew: true } : { isNew: false, expectedUpdatedAt: ed.expectedUpdatedAt };
    let saved = await client.saveAlbum(album, opts);
    if (jpeg) {
      // The text is saved first, so EXISTS / CONFLICT stop here before uploadCover, which replaces <slug>.jpg.
      state.editor = { isNew: false, slug: album.slug, expectedUpdatedAt: saved.updatedAt || '' };
      refreshEditorChrome();
      setBusy(btn, 'Uploading cover…');
      album.cover = await client.uploadCover(album.slug, jpeg, 'image/jpeg');
      setBusy(btn, 'Saving album…');
      saved = await client.saveAlbum(album, { isNew: false, expectedUpdatedAt: saved.updatedAt });
    }
    state.editor = { isNew: false, slug: album.slug, expectedUpdatedAt: saved.updatedAt || '' };
    setVal('a-cover', album.cover);
    clearCoverFile();
    refreshEditorChrome();
    updateCoverPreview();
    setStatus(SAVED_MSG, 'ok');
    await showSticker(album.slug, album);
  } catch (e) {
    setMsg('a-msg', errorText(e), 'err');
  } finally {
    setBusy(btn, '');
  }
}

function onPreview() {
  const album = { ...readAlbumForm(), updatedAt: new Date().toISOString() };
  window.open(`${siteBase()}#preview=${toBase64Url(JSON.stringify(album))}`, '_blank', 'noopener');
}

async function onDeleteAlbum() {
  const ed = state.editor;
  if (!ed || ed.isNew) return;
  const title = val('a-title') || ed.slug;
  if (!confirm(`Delete "${title}"?\n\nStickers pointing to this album will show "record not found".`)) return;
  const btn = $('a-delete');
  setBusy(btn, 'Deleting…');
  try {
    await makeClient().deleteAlbum(ed.slug);
    state.editor = null;
    await showAlbums();
    setStatus(`Deleted ${ed.slug}.`, 'ok');
  } catch (e) {
    setStatus(errorText(e), 'err');
  } finally {
    setBusy(btn, '');
  }
}

/* ---------- sticker panel ---------- */

async function showSticker(slug, album) {
  const url = `${siteBase()}?a=${slug}`;
  $('k-title').textContent = `Sticker: ${album?.title || slug}`;
  setVal('k-url', url);
  $('k-ntag').textContent = ntagHint(url);

  const qr = $('k-qr');
  qr.replaceChildren();
  try {
    renderQR(qr, url);
  } catch (e) {
    qr.textContent = `QR code unavailable: ${errorText(e)}`;
  }
  const download = $('k-qr-dl');
  download.setAttribute('download', `${slug}-qr.png`);
  try {
    download.href = await qrPngDataUrl(url);
  } catch (e) {
    download.removeAttribute('href');
    setStatus(`QR download unavailable: ${errorText(e)}`, 'err');
  }

  $('k-open').href = url;
  const supported = nfcSupported();
  $('k-nfc').disabled = !supported;
  setMsg('k-nfc-msg', supported ? '' : NFC_TOOLS_HINT);
  showView('sticker');
}

async function onCopy() {
  const ok = await copyFrom($('k-url'));
  setStatus(ok ? 'Link copied.' : 'Copy failed — select the link and copy it by hand.', ok ? 'ok' : 'err');
}

async function onNfcWrite() {
  const btn = $('k-nfc');
  setMsg('k-nfc-msg', 'Hold the sticker to the back of your phone…');
  setBusy(btn, 'Writing…');
  try {
    await writeNfc($('k-url').value);
    setMsg('k-nfc-msg', '✓ Written. Tap the sticker to test it.', 'ok');
  } catch (e) {
    setMsg('k-nfc-msg', errorText(e), 'err');
  } finally {
    setBusy(btn, '');
  }
}

/* ---------- site settings ---------- */

async function showSite() {
  if (!requireConfig()) return;
  showView('site');
  $('s-save').disabled = true;
  setMsg('s-msg', 'Loading…');
  try {
    fillSiteForm(await makeClient().getSite());
    $('s-save').disabled = false;
    setMsg('s-msg', '');
  } catch (e) {
    setMsg('s-msg', `Could not load site settings: ${errorText(e)}`, 'err');
  }
}

function fillSiteForm(site) {
  setVal('s-name', site.name);
  setVal('s-tagline', site.tagline);
  setVal('s-catalog', site.catalogUrl);
  $('s-theme').value = THEMES.some((t) => t.key === site.theme) ? site.theme : 'ink';
  $('s-switcher').checked = site.themeSwitcher === true;
  for (const s of SOCIALS) setVal(`s-social-${s.key}`, site.socials?.[s.key]);
  for (const key of Object.keys(DEFAULT_TEXTS)) setVal(`s-text-${key}`, site.texts?.[key]);
}

// Texts that equal the default (or are empty) are saved as '' so the public page uses its own default.
function readSiteForm() {
  const socials = Object.fromEntries(SOCIALS.map((s) => [s.key, val(`s-social-${s.key}`)]));
  const texts = {};
  for (const key of Object.keys(DEFAULT_TEXTS)) {
    const v = val(`s-text-${key}`);
    texts[key] = !v || v === DEFAULT_TEXTS[key] ? '' : v;
  }
  return {
    name: val('s-name'),
    tagline: val('s-tagline'),
    theme: $('s-theme').value,
    themeSwitcher: $('s-switcher').checked,
    catalogUrl: val('s-catalog'),
    socials,
    texts,
  };
}

function validateSite(site) {
  if (!site.name) return 'Store name is required.';
  if (site.catalogUrl && !isHttpUrl(site.catalogUrl)) return 'Catalog URL must start with https://';
  for (const s of SOCIALS) {
    const v = site.socials[s.key];
    if (!v) continue;
    if (s.key === 'email') {
      if (!/^[^\s@]+@[^\s@]+$/.test(v)) return 'Email: enter an email address.';
    } else if (!isHttpUrl(v)) {
      return `${s.label} must start with https://`;
    }
  }
  return '';
}

async function onSaveSite() {
  const site = readSiteForm();
  const problem = validateSite(site);
  if (problem) {
    setMsg('s-msg', problem, 'err');
    return;
  }
  const btn = $('s-save');
  setBusy(btn, 'Saving…');
  try {
    await makeClient().saveSite(site);
    setMsg('s-msg', SAVED_MSG, 'ok');
  } catch (e) {
    setMsg('s-msg', errorText(e), 'err');
  } finally {
    setBusy(btn, '');
  }
}

/* ---------- form building ---------- */

function textField(id, labelText, { type = 'text', placeholder = '', hint = '', inputmode } = {}) {
  return h('div', { class: 'field' },
    h('label', { for: id, text: labelText }),
    h('input', { id, type, placeholder, inputmode, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' }),
    hint ? h('p', { class: 'hint', text: hint }) : null);
}

function socialOptions(s) {
  if (s.key === 'email') return { type: 'email', placeholder: 'hello@example.com' };
  if (s.key === 'whatsapp') {
    return { type: 'url', placeholder: 'https://wa.me/5215555555555', hint: 'https://wa.me/<country code + number>, no + or spaces.' };
  }
  return { type: 'url', placeholder: 'https://', inputmode: 'url' };
}

function buildFields() {
  $('a-links').replaceChildren(...PLATFORMS.map((p) =>
    textField(`a-link-${p.key}`, p.label, { type: 'url', placeholder: 'https://', inputmode: 'url' })));
  $('s-socials').replaceChildren(...SOCIALS.map((s) => textField(`s-social-${s.key}`, s.label, socialOptions(s))));
  $('s-texts').replaceChildren(...Object.keys(DEFAULT_TEXTS).map((key) =>
    textField(`s-text-${key}`, TEXT_LABELS[key] || key, { placeholder: DEFAULT_TEXTS[key] })));
  $('s-theme').replaceChildren(...THEMES.map((t) => h('option', { value: t.key, text: t.label })));
}

/* ---------- wiring ---------- */

function onTab(name) {
  if (name === 'albums') return guard(showAlbums);
  if (name === 'site') return guard(showSite);
  showView('connection');
  return undefined;
}

function wire() {
  for (const b of document.querySelectorAll('[data-tab]')) {
    b.addEventListener('click', () => onTab(b.dataset.tab));
  }
  $('status').addEventListener('click', () => { $('status').hidden = true; });

  $('c-save').addEventListener('click', () => guard(onSaveConnection));
  $('c-forget').addEventListener('click', onForgetPassword);
  $('c-config-copy').addEventListener('click', () => guard(onCopyConfig));

  $('l-new').addEventListener('click', () => guard(async () => newAlbum()));
  $('l-search').addEventListener('input', renderAlbumList);

  $('a-back').addEventListener('click', () => guard(showAlbums));
  $('a-lookup-btn').addEventListener('click', () => guard(onLookup));
  $('a-lookup-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      guard(onLookup);
    }
  });
  $('a-cover').addEventListener('input', updateCoverPreview);
  $('a-cover-file').addEventListener('change', onCoverFileChange);
  $('a-cover-preview').addEventListener('error', onCoverPreviewError);
  $('a-save').addEventListener('click', () => guard(onSaveAlbum));
  $('a-preview').addEventListener('click', () => guard(async () => onPreview()));
  $('a-delete').addEventListener('click', () => guard(onDeleteAlbum));

  $('k-back').addEventListener('click', () => guard(showAlbums));
  $('k-copy').addEventListener('click', () => guard(onCopy));
  $('k-nfc').addEventListener('click', () => guard(onNfcWrite));

  $('s-save').addEventListener('click', () => guard(onSaveSite));
}

async function init() {
  state.config = await loadConfig();
  state.settings = loadSettings(state.config);
  buildFields();
  fillConnectionForm();
  wire();
  if (isConfigured()) {
    guard(showAlbums);
  } else {
    showView('connection');
    setStatus('Welcome! Enter the web app URL and admin password on this page to start.', 'info');
  }
}

init();
