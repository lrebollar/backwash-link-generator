// Data for the public page. Store settings and albums come from the public Google Sheet
// (gviz endpoint, no API key); the Apps Script web app is the fallback. Without a sheet ID the
// sample JSON in data/ is used. Readers resolve to a value or null and never throw.

import { PLATFORMS, SLUG_RE } from './platforms.js';

const CONFIG_URL = 'config.json';
const GVIZ_BASE = 'https://docs.google.com/spreadsheets/d/';
const SITE_TAB = 'Site';
const ALBUMS_TAB = 'Albums';
const LOCAL_SITE_URL = 'data/site.json';
const localAlbumUrl = (slug) => `data/albums/${slug}.json`;
const SHEET_URL_ID_RE = /\/d\/([a-zA-Z0-9_-]{20,})/;
const SHEET_ID_RE = /^[a-zA-Z0-9_-]{20,}$/;
const GROUP_KEY_RE = /^(socials|texts)\.([A-Za-z][A-Za-z0-9]*)$/;
const SITE_KEYS = ['name', 'tagline', 'theme', 'catalogUrl'];
const TRUE_RE = /^(true|yes|1)$/i;

// ---------- small helpers ----------

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Trimmed string; finite numbers become text; anything else is empty.
function plain(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

// Bare ID, or any Google Sheets URL containing /d/<id>. Anything else is ''.
function normalizeSheetId(value) {
  const s = plain(value);
  const fromUrl = SHEET_URL_ID_RE.exec(s);
  if (fromUrl) return fromUrl[1];
  return SHEET_ID_RE.test(s) ? s : '';
}

function normalizeAppsScriptUrl(value) {
  const s = plain(value);
  if (!s) return '';
  try {
    return new URL(s).protocol === 'https:' ? s : '';
  } catch {
    return '';
  }
}

async function readLocalJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  if (!isPlainObject(data)) throw new Error(`Expected an object in ${url}`);
  return data;
}

// ---------- config ----------

// config.json is set once by hand. Missing or broken means "no sheet yet": use the sample data.
export async function loadConfig() {
  try {
    const res = await fetch(CONFIG_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${CONFIG_URL}`);
    const data = await res.json();
    if (!isPlainObject(data)) throw new Error(`Expected an object in ${CONFIG_URL}`);
    const sheetId = normalizeSheetId(data.sheetId);
    if (plain(data.sheetId) && !sheetId) console.warn('config.json: sheetId is not a Google Sheet ID or URL, ignoring it');
    return { sheetId, appsScriptUrl: normalizeAppsScriptUrl(data.appsScriptUrl) };
  } catch (err) {
    console.warn('config.json unavailable, using the sample data', err);
    return { sheetId: '', appsScriptUrl: '' };
  }
}

// ---------- Google Sheet (gviz) ----------

// One gviz cell as text. v wins (numbers and booleans included), then the formatted f.
function cellText(cell) {
  if (!isPlainObject(cell)) return '';
  const { v, f } = cell;
  // Date cells come as "Date(y,m,d)"; their formatted text (f) is the useful value.
  if (typeof v === 'string' && !v.startsWith('Date(')) return v;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return typeof f === 'string' ? f : '';
}

// gviz answers with JavaScript, not JSON: /*O_o*/ google.visualization.Query.setResponse({...});
// A sheet that is not public returns an HTML login page instead, which throws here too.
export function parseGviz(text) {
  const body = typeof text === 'string' ? text : '';
  const callAt = body.indexOf('setResponse');
  const open = callAt < 0 ? -1 : body.indexOf('(', callAt);
  const close = body.lastIndexOf(')');
  if (open < 0 || close < open) throw new Error('Not a Google Sheets query response');

  let data;
  try {
    data = JSON.parse(body.slice(open + 1, close));
  } catch {
    throw new Error('Google Sheets response is not valid JSON');
  }
  if (!isPlainObject(data)) throw new Error('Google Sheets response is not an object');
  if (data.status === 'error') {
    const first = Array.isArray(data.errors) && isPlainObject(data.errors[0]) ? data.errors[0] : {};
    throw new Error(plain(first.detailed_message) || plain(first.message) || 'Google Sheets query failed');
  }

  const table = data.table;
  if (!isPlainObject(table) || !Array.isArray(table.cols)) throw new Error('Google Sheets response has no table');
  const cols = table.cols.map((col) => plain(isPlainObject(col) ? col.label : ''));
  const rows = (Array.isArray(table.rows) ? table.rows : []).map((row) => {
    const cells = isPlainObject(row) && Array.isArray(row.c) ? row.c : [];
    return cols.map((_, i) => cellText(cells[i]));
  });
  return { cols, rows };
}

// Rows as plain objects keyed by the trimmed column label. Blank labels are dropped.
export function rowsToObjects(cols, rows) {
  const keys = cols.map((label) => plain(label));
  return rows.map((row) => {
    const obj = {};
    keys.forEach((key, i) => {
      if (key && key !== '__proto__' && !Object.hasOwn(obj, key)) obj[key] = plain(row[i]);
    });
    return obj;
  });
}

async function fetchGviz(sheetId, tab, query = '') {
  let url = `${GVIZ_BASE}${sheetId}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(tab)}`;
  if (query) url += `&tq=${encodeURIComponent(query)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} from the sheet (${tab} tab)`);
  return parseGviz(await res.text());
}

// Site tab entries ({ key, value }) to the site object. Dotted keys nest:
// socials.instagram, texts.listen. themeSwitcher is read as true/yes/1; anything else is false.
export function siteFromEntries(entries) {
  const site = { themeSwitcher: false, socials: {}, texts: {} };
  for (const entry of Array.isArray(entries) ? entries : []) {
    const key = plain(entry && entry.key);
    const value = plain(entry && entry.value);
    const group = GROUP_KEY_RE.exec(key);
    if (group) site[group[1]][group[2]] = value;
    else if (key === 'themeSwitcher') site.themeSwitcher = TRUE_RE.test(value);
    else if (SITE_KEYS.includes(key)) site[key] = value;
  }
  return site;
}

// An Albums row, or an album from the Apps Script web app or data/albums/*.json, as the album
// object. Platform links are read from album.links when nested, else from the flat columns.
export function albumFromRow(obj) {
  const row = isPlainObject(obj) ? obj : {};
  const links = isPlainObject(row.links) ? row.links : row;
  const album = {
    slug: plain(row.slug),
    title: plain(row.title),
    artist: plain(row.artist),
    year: plain(row.year),
    label: plain(row.label),
    note: plain(row.note),
    cover: plain(row.cover),
    shopUrl: plain(row.shopUrl),
    links: {},
    updatedAt: plain(row.updatedAt),
  };
  for (const { key } of PLATFORMS) album.links[key] = plain(links[key]);
  return album;
}

async function siteFromSheet(sheetId) {
  const { cols, rows } = await fetchGviz(sheetId, SITE_TAB);
  return siteFromEntries(rowsToObjects(cols, rows));
}

// Album by exact slug. An empty result is "not found" and does not fall back to Apps Script.
async function albumFromSheet(sheetId, slug) {
  const { cols, rows } = await fetchGviz(sheetId, ALBUMS_TAB, `select * where A = '${slug}'`);
  const row = rowsToObjects(cols, rows).find((r) => r.slug === slug);
  return row ? albumFromRow(row) : null;
}

// ---------- Apps Script web app (fallback) ----------

// The web app answers HTTP 200 with JSON: { ok: true, ... } or { ok: false, code, error }.
// Resolves null for NOT_FOUND; throws for anything else.
async function fetchAppsScript(baseUrl, params) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} from the Apps Script web app`);
  const data = await res.json();
  if (isPlainObject(data) && data.ok === true) return data;
  if (isPlainObject(data) && data.code === 'NOT_FOUND') return null;
  throw new Error(`Apps Script web app: ${(isPlainObject(data) && plain(data.error)) || 'unexpected answer'}`);
}

async function siteFromScript(baseUrl) {
  const data = await fetchAppsScript(baseUrl, { action: 'site' });
  if (!data || !isPlainObject(data.site)) throw new Error('Apps Script web app returned no site');
  return data.site;
}

async function albumFromScript(baseUrl, slug) {
  const data = await fetchAppsScript(baseUrl, { action: 'album', slug });
  if (!data) return null;
  if (!isPlainObject(data.album)) throw new Error('Apps Script web app returned no album');
  return albumFromRow(data.album);
}

// ---------- public loaders ----------

// Site settings, or null when they cannot be read (page.js then uses its defaults).
// Without a sheet ID: data/site.json.
export async function loadSite(config) {
  const sheetId = normalizeSheetId(config?.sheetId);
  const appsScriptUrl = normalizeAppsScriptUrl(config?.appsScriptUrl);
  try {
    if (!sheetId) return await readLocalJson(LOCAL_SITE_URL);
    try {
      return await siteFromSheet(sheetId);
    } catch (err) {
      if (!appsScriptUrl) throw err;
      console.warn('Site tab unavailable, trying the Apps Script web app', err);
      return await siteFromScript(appsScriptUrl);
    }
  } catch (err) {
    console.warn('Site settings unavailable, using defaults', err);
    return null;
  }
}

// One album by slug, or null when it is not found or cannot be read.
// Without a sheet ID: data/albums/<slug>.json.
export async function loadAlbum(config, slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return null;
  const sheetId = normalizeSheetId(config?.sheetId);
  const appsScriptUrl = normalizeAppsScriptUrl(config?.appsScriptUrl);
  try {
    if (!sheetId) return albumFromRow(await readLocalJson(localAlbumUrl(slug)));
    try {
      return await albumFromSheet(sheetId, slug);
    } catch (err) {
      if (!appsScriptUrl) throw err;
      console.warn('Albums tab unavailable, trying the Apps Script web app', err);
      return await albumFromScript(appsScriptUrl, slug);
    }
  } catch (err) {
    console.warn(`Album "${slug}" unavailable`, err);
    return null;
  }
}
