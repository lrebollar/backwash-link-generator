/**
 * ============================================================================
 *  Backwash Records - Google Apps Script backend (Code.gs)
 * ============================================================================
 *
 *  WHAT THIS IS
 *  This script lives inside the store's Google Sheet. It is the only part that
 *  WRITES to the sheet. The public website reads the sheet directly, and the
 *  admin panel saves albums and store settings through this script's web app
 *  address (the "Web app URL").
 *
 *  The sheet has these tabs:
 *    - Albums:      one album per row. Row 1 holds the column names; do not
 *                   rename them. Column A (slug) must stay first.
 *    - Site:        one store setting per row: key | value | notes.
 *    - How to use:  plain instructions for editing by hand (not read by code).
 *
 *  FIRST-TIME SETUP (about 10 minutes, done once)
 *  1. Open the store's Google Sheet. Click Share, then General access, and set
 *     it to "Anyone with the link" with the role "Viewer". The public website
 *     needs this to read the albums.
 *  2. In the sheet, click Extensions, then Apps Script.
 *  3. Delete the sample code in the editor, paste this whole file in, and click
 *     the save icon.
 *  4. In the Apps Script editor, click the gear icon (Project Settings). Under
 *     "Script properties", click "Add script property":
 *        Property: ADMIN_PASSWORD      Value: a password you choose
 *     Click "Save script properties". Keep this password private.
 *  5. Back in the editor, choose "setup" from the function menu at the top and
 *     click Run. Google asks you to review permissions: choose your account,
 *     click Advanced, then "Go to ...", then Allow. If it stopped, run it again.
 *     Open the execution log (View, then Logs) to see what it did. Running setup
 *     again is always safe; it never deletes your data.
 *  6. Click Deploy, then New deployment. Click the gear icon next to "Select
 *     type" and choose "Web app". Set:
 *        Execute as: Me
 *        Who has access: Anyone
 *     Click Deploy, authorize again if asked, and copy the "Web app URL" (it
 *     ends in /exec). Paste it into the admin panel's Connection tab, and give it
 *     to whoever maintains the website.
 *  7. The sheet ID is the long code between /d/ and /edit in the sheet's address.
 *     It also goes into the website's docs/config.json, next to the Web app URL.
 *
 *  UPDATING THIS SCRIPT LATER (the Web app URL stays the same)
 *  1. Paste the new version into the editor and save.
 *  2. Choose "setup" from the function menu and click Run, then Allow if Google
 *     asks for a new permission (Auto-fill needs one to contact Spotify and
 *     Apple). Running setup again is always safe.
 *  3. Click Deploy, Manage deployments, the pencil icon, set Version to
 *     "New version", and click Deploy. Do NOT choose "New deployment" again:
 *     that creates a new URL.
 *
 *  Anyone who can EDIT the sheet can also see the script properties, so give
 *  edit access only to people you trust.
 *
 *  WEB APP API (summary)
 *  - GET  (public, read only, no password):
 *        no action                  -> service info
 *        ?action=site               -> the store settings
 *        ?action=album&slug=<slug>  -> one album
 *  - POST (JSON body {action, password, ...}): ping, listAlbums, getAlbum,
 *        saveAlbum, deleteAlbum, getSite, saveSite, uploadCover, autofill.
 *        autofill {url, country} reads one Spotify album link and finds the
 *        album's other streaming links.
 *  Every answer is JSON: {ok:true, ...} or {ok:false, code, error}.
 *  Codes: AUTH, SETUP, BAD_REQUEST, NOT_FOUND, EXISTS, CONFLICT, RATE_LIMIT, SERVER.
 */

// ============================================================================
// Constants
// ============================================================================

const ALBUMS_SHEET = 'Albums';
const SITE_SHEET = 'Site';
const API_VERSION = 3;

// Album columns in template order. Headers are matched BY NAME, so extra
// columns are tolerated and the order of these may differ in a real sheet.
const ALBUM_HEADERS = [
  'slug', 'title', 'artist', 'year', 'label', 'note', 'cover', 'shopUrl',
  'spotify', 'appleMusic', 'youtubeMusic', 'youtube', 'amazonMusic', 'deezer',
  'tidal', 'soundcloud', 'bandcamp', 'updatedAt',
];
const ALBUM_SCALAR_FIELDS = ['slug', 'title', 'artist', 'year', 'label', 'note', 'cover', 'shopUrl'];
const PLATFORM_KEYS = [
  'spotify', 'appleMusic', 'youtubeMusic', 'youtube', 'amazonMusic',
  'deezer', 'tidal', 'soundcloud', 'bandcamp',
];

const SITE_HEADERS = ['key', 'value', 'notes'];
// Every setting the code knows about, in template order. `value` is the default
// used when the key is missing from the sheet; `notes` is help text for people.
const SITE_KEYS = [
  { key: 'name', value: 'Backwash Records', notes: 'Store name, shown in the header and the browser tab.' },
  { key: 'tagline', value: 'Record store', notes: 'Short line under the store name.' },
  { key: 'theme', value: 'ink', notes: 'Default design: ink, paper, fire, sun or cover.' },
  { key: 'themeSwitcher', value: 'TRUE', notes: 'TRUE shows the "Change design" button to visitors. FALSE hides it.' },
  { key: 'catalogUrl', value: '', notes: 'Link to your full catalog ("Browse our catalog" button).' },
  { key: 'socials.instagram', value: '', notes: 'Full link to your Instagram profile. Empty hides it.' },
  { key: 'socials.facebook', value: '', notes: 'Full link to your Facebook page. Empty hides it.' },
  { key: 'socials.tiktok', value: '', notes: 'Full link to your TikTok profile. Empty hides it.' },
  { key: 'socials.x', value: '', notes: 'Full link to your X profile. Empty hides it.' },
  { key: 'socials.youtube', value: '', notes: 'Full link to your YouTube channel. Empty hides it.' },
  { key: 'socials.whatsapp', value: '', notes: 'WhatsApp link, for example https://wa.me/15551234567. Empty hides it.' },
  { key: 'socials.email', value: '', notes: 'Email address, without mailto:. Empty hides it.' },
  { key: 'socials.maps', value: '', notes: 'Link to your location on Google Maps. Empty hides it.' },
  { key: 'socials.website', value: '', notes: 'Link to your own website. Empty hides it.' },
  { key: 'texts.listen', value: 'Listen on', notes: 'Label above the streaming buttons. Empty = built-in wording.' },
  { key: 'texts.play', value: 'Play', notes: 'Label of the play button. Empty = built-in wording.' },
  { key: 'texts.shop', value: 'Buy this record', notes: 'Label of the shop button. Empty = built-in wording.' },
  { key: 'texts.catalog', value: 'Browse our catalog', notes: 'Label of the catalog button. Empty = built-in wording.' },
  { key: 'texts.follow', value: 'Follow us', notes: 'Label above the social links. Empty = built-in wording.' },
  { key: 'texts.notFound', value: "We couldn't find that record.", notes: 'Message when an album link is wrong. Empty = built-in wording.' },
];

const THEME_KEYS = ['ink', 'paper', 'fire', 'sun', 'cover'];

// Album slugs: lowercase letters, digits and single hyphens, 1-60 characters.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 60;

// Spotify album links: open.spotify.com/album/<id> (also with /intl-xx/ or /embed/
// before "album", and with ?si=... after the id) or spotify:album:<id>.
const SPOTIFY_ALBUM_RE = /^(?:https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?album\/|spotify:album:)([A-Za-z0-9]{22})(?:[/?#]|$)/i;

const ADMIN_PASSWORD_PROPERTY = 'ADMIN_PASSWORD';
const COVERS_FOLDER_PROPERTY = 'COVERS_FOLDER_ID';
const COVERS_FOLDER_NAME = 'Backwash Records covers';
const LOCK_WAIT_MS = 20000;
const AUTH_DELAY_MS = 1000;
const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const COVER_MAX_BASE64_CHARS = 14 * 1024 * 1024; // about 10 MB of image data
const SPOTIFY_ALBUM_URL = 'https://open.spotify.com/album/';
const SPOTIFY_OEMBED_URL = 'https://open.spotify.com/oembed?url=';
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
// Amazon Music website per store country. Other countries use music.amazon.com.
const AMAZON_MUSIC_HOSTS = {
  US: 'music.amazon.com', GB: 'music.amazon.co.uk', DE: 'music.amazon.de', FR: 'music.amazon.fr',
  IT: 'music.amazon.it', ES: 'music.amazon.es', JP: 'music.amazon.co.jp', CA: 'music.amazon.ca',
  AU: 'music.amazon.com.au', MX: 'music.amazon.com.mx', BR: 'music.amazon.com.br', IN: 'music.amazon.in',
};
const MSG_RATE_LIMIT = 'Too many lookups — wait a minute and try again.';

// The demo album written by setup() when the Albums tab has no albums yet.
const DEMO_ALBUM = {
  slug: 'demo',
  title: 'Backwash Sampler Vol. 1',
  artist: 'Various Artists',
  year: '2026',
  label: 'Backwash Records',
  note: 'Demo record — delete me',
  cover: 'assets/img/demo-cover.jpg',
  shopUrl: '',
  links: {
    spotify: 'https://open.spotify.com/search/backwash%20records',
    appleMusic: 'https://music.apple.com/us/search?term=backwash%20records',
    youtubeMusic: 'https://music.youtube.com/search?q=backwash%20records',
    youtube: '',
    amazonMusic: '',
    deezer: 'https://www.deezer.com/search/backwash%20records',
    tidal: 'https://listen.tidal.com/search?q=backwash%20records',
    soundcloud: '',
    bandcamp: 'https://bandcamp.com/search?q=backwash%20records',
  },
  updatedAt: '2026-10-27T00:00:00.000Z',
};

// ============================================================================
// Pure helpers: no Apps Script services in this section, so they can be unit tested.
// ============================================================================

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function messageOf(err) {
  return err && err.message ? String(err.message) : String(err);
}

// Converts one cell value to text. Used on everything read from the sheet.
function toCellString(value) {
  if (value === null || value === undefined) return '';
  // Duck-typed Date check (works across realms, e.g. in tests).
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return isNaN(value.getTime()) ? '' : value.toISOString();
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

function cleanString(value) {
  return toCellString(value).trim();
}

// Undoes safeCellValue: a stored "'=..." is read back as "=...".
function unescapeCell(text) {
  return text.charAt(0) === "'" && text.charAt(1) === '=' ? text.slice(1) : text;
}

// Text of a cell as the API returns it.
function readCell(value) {
  return unescapeCell(cleanString(value));
}

// Text that is safe to write into a sheet: a leading "=" would become a formula,
// so it gets a leading apostrophe (the Sheets "store as text" marker).
function safeCellValue(value) {
  const text = toCellString(value);
  return text.charAt(0) === '=' ? "'" + text : text;
}

// "true", "yes" and "1" (any case) are true. Anything else is false.
function parseBool(value) {
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', '1'].indexOf(cleanString(value).toLowerCase()) !== -1;
}

function isValidSlug(slug) {
  return typeof slug === 'string' && slug.length <= SLUG_MAX_LENGTH && SLUG_RE.test(slug);
}

// The album ID in a Spotify album link, or '' when the text is not one.
function spotifyAlbumId(link) {
  const match = SPOTIFY_ALBUM_RE.exec(cleanString(link));
  return match ? match[1] : '';
}

// Turns HTML character references (&amp;, &#39;, &#x27;, ...) back into characters.
function decodeHtml(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return String(text).replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi, function (all, ref) {
    const lower = ref.toLowerCase();
    if (lower.charAt(0) !== '#') return named[lower];
    const code = lower.charAt(1) === 'x' ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
  });
}

// The <meta> tags of a web page as {property or name: content}. The first tag of a name wins.
function htmlMeta(html) {
  const meta = {};
  (String(html).match(/<meta\b[^>]*>/gi) || []).forEach(function (tag) {
    const attrs = {};
    tag.replace(/([a-z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, function (all, name, doubleQuoted, singleQuoted) {
      attrs[name.toLowerCase()] = doubleQuoted !== undefined ? doubleQuoted : singleQuoted;
      return all;
    });
    const key = attrs.property || attrs.name;
    if (key && attrs.content !== undefined && !hasOwn(meta, key)) {
      meta[key] = decodeHtml(attrs.content).trim();
    }
  });
  return meta;
}

// Album details from the meta tags of a Spotify album page. Its og:description reads like
// "Listen to <album> on Spotify. <artist> · Album · 2019 · 12 songs."
function spotifyAlbumInfo(meta) {
  const parts = cleanString(meta['og:description']).split(' · ');
  const intro = parts[0];
  const afterSpotify = intro.lastIndexOf('Spotify');
  const artistFromText = parts.length > 1
    ? intro.slice(afterSpotify < 0 ? 0 : afterSpotify + 'Spotify'.length).replace(/^[.!:\s]+/, '')
    : '';
  const yearFromText = parts.filter(function (part) { return /^\d{4}$/.test(part.trim()); })[0] || '';
  const releaseYear = (/^\d{4}/.exec(cleanString(meta['music:release_date'])) || [''])[0];
  return {
    title: cleanString(meta['og:title']),
    artist: cleanString(meta['music:musician_description']) || artistFromText.trim(),
    year: releaseYear || yearFromText.trim(),
    cover: /^https:\/\//i.test(cleanString(meta['og:image'])) ? cleanString(meta['og:image']) : '',
  };
}

// Lowercase words without accents, punctuation or "and"/"&", for comparing names.
function nameKey(text) {
  return cleanString(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(function (word) { return word && word !== 'and'; })
    .join(' ');
}

// An album title without Apple's " - Single" / " - EP" ending.
function titleKey(text) {
  return nameKey(cleanString(text).replace(/\s+-\s+(?:single|ep)$/i, ''));
}

// Like titleKey, but also without (...) and [...] parts such as "(Deluxe Edition)".
function bareTitleKey(text) {
  return titleKey(cleanString(text).replace(/\s*[([][^)\]]*[)\]]/g, ' '));
}

// 2 = same artist, 1 = Spotify's first artist is one of Apple's artists, 0 = different.
function artistScore(spotifyArtist, appleArtist) {
  const ours = nameKey(spotifyArtist);
  const theirs = nameKey(appleArtist);
  if (!ours || !theirs) return 0;
  if (ours === theirs) return 2;
  const first = nameKey(cleanString(spotifyArtist).split(',')[0]);
  return first && (' ' + theirs + ' ').indexOf(' ' + first + ' ') >= 0 ? 1 : 0;
}

// The iTunes Search API result for the same album as `album` ({title, artist, year}), or null.
// The title and artist must match. Exact titles beat titles that only match without
// (...) parts; then the closer artist and the same year win; then iTunes' own order.
function pickAppleAlbum(results, album) {
  const title = titleKey(album.title);
  if (!title || !nameKey(album.artist)) return null;
  const bare = bareTitleKey(album.title);
  let best = null;
  let bestScore = 0;
  (Array.isArray(results) ? results : []).forEach(function (result) {
    if (!result || !/^https:\/\//i.test(cleanString(result.collectionViewUrl))) return;
    const artist = artistScore(album.artist, result.artistName);
    let sameTitle = 0;
    if (titleKey(result.collectionName) === title) sameTitle = 2;
    else if (bare && bareTitleKey(result.collectionName) === bare) sameTitle = 1;
    if (!artist || !sameTitle) return;
    const sameYear = album.year && cleanString(result.releaseDate).slice(0, 4) === album.year ? 1 : 0;
    const score = sameTitle * 10 + artist * 2 + sameYear;
    if (score > bestScore) {
      best = result;
      bestScore = score;
    }
  });
  return best;
}

// The Apple Music album link of an iTunes Search API result, without the "?uo=4" tracking part.
function appleAlbumUrl(result) {
  return cleanString(result.collectionViewUrl).split('?')[0];
}

// The JSON object in `text`, or null when it is not one.
function parseJsonObject(text) {
  try {
    const data = JSON.parse(text);
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch (err) {
    return null;
  }
}

// Links that open a search for the album on services where the exact album can't be looked up.
function albumSearchLinks(album, country) {
  const words = cleanString(album.artist + ' ' + album.title).replace(/[\s/]+/g, ' ');
  const query = encodeURIComponent(words);
  return {
    appleMusic: 'https://music.apple.com/' + country.toLowerCase() + '/search?term=' + query,
    youtubeMusic: 'https://music.youtube.com/search?q=' + query,
    amazonMusic: 'https://' + (AMAZON_MUSIC_HOSTS[country] || AMAZON_MUSIC_HOSTS.US) + '/search/' + query,
  };
}

function normalizeTheme(value) {
  return cleanString(value).toLowerCase();
}

// Builds one sheet row. `valuesByName` gives values for named columns; other
// columns keep their value from `existingRow` (or are empty when it is missing).
function buildRow(headers, valuesByName, existingRow) {
  return headers.map(function (header, i) {
    const name = cleanString(header);
    if (hasOwn(valuesByName, name)) {
      return safeCellValue(cleanString(valuesByName[name]));
    }
    return existingRow && i < existingRow.length ? safeCellValue(existingRow[i]) : '';
  });
}

// Converts one album row (headers + values) to an album object.
function rowToAlbum(headers, row) {
  const names = (headers || []).map(cleanString);
  const cells = row || [];
  const cell = function (name) {
    const i = names.indexOf(name);
    return i < 0 ? '' : readCell(cells[i]);
  };
  const album = {};
  ALBUM_SCALAR_FIELDS.forEach(function (field) {
    album[field] = cell(field);
  });
  album.links = {};
  PLATFORM_KEYS.forEach(function (key) {
    album.links[key] = cell(key);
  });
  album.updatedAt = cell('updatedAt');
  return album;
}

// Converts an album object to a sheet row in the order of `headers`. Extra
// columns that the album does not know about keep their value from `existingRow`.
function albumToRow(headers, album, existingRow) {
  const a = album || {};
  const links = a.links || {};
  const values = {};
  ALBUM_SCALAR_FIELDS.forEach(function (field) {
    values[field] = a[field];
  });
  values.updatedAt = a.updatedAt;
  PLATFORM_KEYS.forEach(function (key) {
    values[key] = links[key];
  });
  return buildRow(headers, values, existingRow);
}

// Returns a copy of an album with every field as a trimmed string.
function cleanAlbum(input) {
  const a = input && typeof input === 'object' ? input : {};
  const links = a.links && typeof a.links === 'object' ? a.links : {};
  const album = {};
  ALBUM_SCALAR_FIELDS.forEach(function (field) {
    album[field] = cleanString(a[field]);
  });
  album.links = {};
  PLATFORM_KEYS.forEach(function (key) {
    album.links[key] = cleanString(links[key]);
  });
  album.updatedAt = cleanString(a.updatedAt);
  return album;
}

// Returns {ok:true} or {ok:false, error}.
function validateAlbum(album) {
  if (!album || typeof album !== 'object') {
    return { ok: false, error: 'Album data is missing.' };
  }
  const a = cleanAlbum(album);
  if (!isValidSlug(a.slug)) {
    return {
      ok: false,
      error: 'The slug must be 1 to 60 characters: lowercase letters, numbers and single hyphens, for example "backwash-vol-1".',
    };
  }
  if (!a.title) {
    return { ok: false, error: 'A title is required.' };
  }
  return { ok: true };
}

// `rows` is the whole Site table, header row first. Keys are matched by name
// (default: column 1 = key, column 2 = value). Unknown rows are ignored here.
// Missing keys get their default. Returns the site object the public page uses.
function siteRowsToObject(rows) {
  const table = Array.isArray(rows) ? rows : [];
  const headers = (table[0] || []).map(cleanString);
  let keyCol = headers.indexOf('key');
  if (keyCol < 0) keyCol = 0;
  let valueCol = headers.indexOf('value');
  if (valueCol < 0) valueCol = 1;

  const stored = {};
  for (let r = 1; r < table.length; r++) {
    const row = table[r] || [];
    const key = cleanString(row[keyCol]);
    if (key && !hasOwn(stored, key)) {
      stored[key] = readCell(row[valueCol]);
    }
  }

  const values = {};
  SITE_KEYS.forEach(function (def) {
    values[def.key] = hasOwn(stored, def.key) ? stored[def.key] : def.value;
  });

  const socials = {};
  const texts = {};
  SITE_KEYS.forEach(function (def) {
    if (def.key.indexOf('socials.') === 0) socials[def.key.slice(8)] = values[def.key];
    if (def.key.indexOf('texts.') === 0) texts[def.key.slice(6)] = values[def.key];
  });

  const theme = normalizeTheme(values.theme);
  return {
    name: values.name,
    tagline: values.tagline,
    theme: THEME_KEYS.indexOf(theme) >= 0 ? theme : 'ink',
    themeSwitcher: parseBool(values.themeSwitcher),
    catalogUrl: values.catalogUrl,
    socials: socials,
    texts: texts,
  };
}

// Site object -> one {key, value, notes} entry per known key, in template order.
// Missing fields are written as empty; themeSwitcher is written as TRUE or FALSE.
function siteObjectToEntries(site) {
  const s = site && typeof site === 'object' ? site : {};
  const socials = s.socials && typeof s.socials === 'object' ? s.socials : {};
  const texts = s.texts && typeof s.texts === 'object' ? s.texts : {};
  return SITE_KEYS.map(function (def) {
    let value;
    if (def.key.indexOf('socials.') === 0) {
      value = socials[def.key.slice(8)];
    } else if (def.key.indexOf('texts.') === 0) {
      value = texts[def.key.slice(6)];
    } else if (def.key === 'themeSwitcher') {
      value = parseBool(s.themeSwitcher) ? 'TRUE' : 'FALSE';
    } else if (def.key === 'theme') {
      value = normalizeTheme(s.theme);
    } else {
      value = s[def.key];
    }
    return { key: def.key, value: cleanString(value), notes: def.notes };
  });
}

// Returns {ok:true} or {ok:false, error}.
function validateSite(site) {
  if (!site || typeof site !== 'object') {
    return { ok: false, error: 'Site settings are missing.' };
  }
  if (THEME_KEYS.indexOf(normalizeTheme(site.theme)) < 0) {
    return { ok: false, error: 'Theme must be one of: ' + THEME_KEYS.join(', ') + '.' };
  }
  return { ok: true };
}

// Constant-time comparison, so the password check does not leak timing.
function passwordMatches(given, expected) {
  const a = String(given === null || given === undefined ? '' : given);
  const b = String(expected);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// An error that carries an API code (AUTH, NOT_FOUND, ...) to the response.
function apiError(code, message) {
  const err = new Error(message);
  err.apiCode = code;
  return err;
}

// ============================================================================
// Responses
// ============================================================================

function respond(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

function failure(code, message) {
  return { ok: false, error: message, code: code };
}

// Turns any thrown error into a JSON answer. Only the error message is shared.
function errorResponse(err) {
  if (err && err.apiCode) {
    return respond(failure(err.apiCode, messageOf(err)));
  }
  Logger.log('Unexpected error: ' + (err && err.stack ? err.stack : messageOf(err)));
  return respond(failure('SERVER', messageOf(err)));
}

// ============================================================================
// Sheet access (Apps Script services are used from here on)
// ============================================================================

function getSheetOrThrow_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw apiError('SETUP', 'The "' + name + '" tab is missing. Run setup() in Apps Script.');
  }
  return sheet;
}

function getAlbumsSheet_() {
  return getSheetOrThrow_(ALBUMS_SHEET);
}

function getSiteSheet_() {
  return getSheetOrThrow_(SITE_SHEET);
}

// Reads the whole used range with ONE getDataRange().getValues() call and
// converts every value to text. rows[i] is sheet row i + 2.
function readTable_(sheet, tabName, requiredHeaders) {
  const values = sheet.getDataRange().getValues();
  const headers = (values[0] || []).map(cleanString);
  const missing = requiredHeaders.filter(function (name) {
    return headers.indexOf(name) < 0;
  });
  if (missing.length) {
    throw apiError('SETUP', 'The "' + tabName + '" tab is missing column(s): ' +
      missing.join(', ') + '. Run setup() in Apps Script.');
  }
  const rows = values.slice(1).map(function (row) {
    return row.map(toCellString);
  });
  return { sheet: sheet, headers: headers, rows: rows };
}

function readAlbumTable_() {
  return readTable_(getAlbumsSheet_(), ALBUMS_SHEET, ALBUM_HEADERS);
}

function readSiteTable_() {
  return readTable_(getSiteSheet_(), SITE_SHEET, SITE_HEADERS);
}

function readSite_() {
  const table = readSiteTable_();
  return siteRowsToObject([table.headers].concat(table.rows));
}

// Index into table.rows of the album with this slug, or -1.
function findAlbumRow_(table, slug) {
  const col = table.headers.indexOf('slug');
  for (let i = 0; i < table.rows.length; i++) {
    if (readCell(table.rows[i][col]) === slug) return i;
  }
  return -1;
}

function albumsFromTable_(table) {
  return table.rows
    .map(function (row) {
      return rowToAlbum(table.headers, row);
    })
    .filter(function (album) {
      return album.slug !== '';
    });
}

function findAlbum_(slug) {
  const table = readAlbumTable_();
  const index = findAlbumRow_(table, slug);
  if (index < 0) {
    throw apiError('NOT_FOUND', 'No album with slug "' + slug + '".');
  }
  return rowToAlbum(table.headers, table.rows[index]);
}

// Makes sure the sheet has at least `rows` x `cols` cells.
function ensureSize_(sheet, rows, cols) {
  const haveRows = sheet.getMaxRows();
  if (haveRows < rows) sheet.insertRowsAfter(haveRows, rows - haveRows);
  const haveCols = sheet.getMaxColumns();
  if (haveCols < cols) sheet.insertColumnsAfter(haveCols, cols - haveCols);
}

// Writes one row of values in plain-text format (format first, then values).
function writeRow_(sheet, row, values) {
  ensureSize_(sheet, row, values.length);
  sheet.getRange(row, 1, 1, values.length).setNumberFormat('@').setValues([values]);
}

// Runs fn while holding the script lock, so two saves cannot overlap.
function withScriptLock_(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_WAIT_MS);
  } catch (err) {
    throw apiError('SERVER', 'Another change is still being saved. Wait a moment and try again.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// Web app entry points
// ============================================================================

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = cleanString(params.action);
    if (!action) {
      return respond({ ok: true, service: 'backwash-records', version: API_VERSION });
    }
    if (action === 'site') {
      return respond({ ok: true, site: readSite_() });
    }
    if (action === 'album') {
      const slug = cleanString(params.slug);
      if (!isValidSlug(slug)) {
        throw apiError('BAD_REQUEST', 'Bad album slug.');
      }
      return respond({ ok: true, album: findAlbum_(slug) });
    }
    throw apiError('BAD_REQUEST', 'Unknown action.');
  } catch (err) {
    return errorResponse(err);
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const expected = PropertiesService.getScriptProperties().getProperty(ADMIN_PASSWORD_PROPERTY);
    if (!expected) {
      throw apiError('SETUP', 'Set ADMIN_PASSWORD in Apps Script → Project Settings → Script properties');
    }
    if (!passwordMatches(body.password, expected)) {
      Utilities.sleep(AUTH_DELAY_MS);
      throw apiError('AUTH', 'Wrong admin password.');
    }
    return respond(Object.assign({ ok: true }, runAction_(cleanString(body.action), body)));
  } catch (err) {
    return errorResponse(err);
  }
}

function parseBody_(e) {
  const raw = e && e.postData ? e.postData.contents : '';
  let body;
  try {
    body = JSON.parse(raw || '');
  } catch (err) {
    throw apiError('BAD_REQUEST', 'The request body is not valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw apiError('BAD_REQUEST', 'The request body must be a JSON object.');
  }
  return body;
}

function requireSlug_(value) {
  const slug = cleanString(value);
  if (!isValidSlug(slug)) {
    throw apiError('BAD_REQUEST', 'Bad album slug.');
  }
  return slug;
}

function runAction_(action, body) {
  switch (action) {
    case 'ping':
      return pingAction_();
    case 'listAlbums':
      return { albums: albumsFromTable_(readAlbumTable_()) };
    case 'getAlbum':
      return { album: findAlbum_(requireSlug_(body.slug)) };
    case 'saveAlbum':
      return saveAlbumAction_(body);
    case 'deleteAlbum':
      return deleteAlbumAction_(body);
    case 'getSite':
      return { site: readSite_() };
    case 'saveSite':
      return saveSiteAction_(body);
    case 'uploadCover':
      return uploadCoverAction_(body);
    case 'autofill':
      return autofillAction_(body);
    case '':
      throw apiError('BAD_REQUEST', 'Missing "action".');
    default:
      throw apiError('BAD_REQUEST', 'Unknown action "' + action.slice(0, 40) + '".');
  }
}

function pingAction_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const table = readAlbumTable_();
  return {
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    albums: albumsFromTable_(table).length,
    version: API_VERSION,
  };
}

function saveAlbumAction_(body) {
  const check = validateAlbum(body.album);
  if (!check.ok) {
    throw apiError('BAD_REQUEST', check.error);
  }
  const input = cleanAlbum(body.album);
  const isNew = parseBool(body.isNew);
  const expectedUpdatedAt = cleanString(body.expectedUpdatedAt);

  return withScriptLock_(function () {
    const table = readAlbumTable_();
    const index = findAlbumRow_(table, input.slug);
    if (isNew && index >= 0) {
      throw apiError('EXISTS', 'An album with slug "' + input.slug + '" already exists.');
    }
    if (!isNew && index < 0) {
      throw apiError('NOT_FOUND', 'No album with slug "' + input.slug + '".');
    }
    if (!isNew && expectedUpdatedAt) {
      const stored = readCell(table.rows[index][table.headers.indexOf('updatedAt')]);
      if (expectedUpdatedAt !== stored) {
        throw apiError('CONFLICT', 'This album was changed elsewhere. Reload it and try again.');
      }
    }

    const stored = Object.assign({}, input, { updatedAt: new Date().toISOString() });
    const existing = isNew ? null : table.rows[index];
    const row = albumToRow(table.headers, stored, existing);
    const target = isNew ? table.sheet.getLastRow() + 1 : index + 2;
    writeRow_(table.sheet, target, row);
    return { album: rowToAlbum(table.headers, row) };
  });
}

function deleteAlbumAction_(body) {
  const slug = requireSlug_(body.slug);
  return withScriptLock_(function () {
    const table = readAlbumTable_();
    const index = findAlbumRow_(table, slug);
    if (index < 0) {
      throw apiError('NOT_FOUND', 'No album with slug "' + slug + '".');
    }
    table.sheet.deleteRow(index + 2);
    return {};
  });
}

function saveSiteAction_(body) {
  const check = validateSite(body.site);
  if (!check.ok) {
    throw apiError('BAD_REQUEST', check.error);
  }
  const entries = siteObjectToEntries(body.site);
  const pending = {};
  entries.forEach(function (entry) {
    pending[entry.key] = entry;
  });

  return withScriptLock_(function () {
    const table = readSiteTable_();
    const width = table.headers.length;
    const keyCol = table.headers.indexOf('key');
    const valueCol = table.headers.indexOf('value');
    const done = {};
    const out = [];

    // Existing rows: update the value of known keys, keep everything else.
    table.rows.forEach(function (row) {
      const line = row.map(safeCellValue);
      const key = cleanString(row[keyCol]);
      if (key && hasOwn(pending, key) && !hasOwn(done, key)) {
        line[valueCol] = safeCellValue(pending[key].value);
        done[key] = true;
      }
      out.push(line);
    });

    // Known keys that are not in the sheet yet are added at the bottom.
    entries.forEach(function (entry) {
      if (!hasOwn(done, entry.key)) {
        out.push(buildRow(table.headers, entry, null));
      }
    });

    ensureSize_(table.sheet, 1 + out.length, width);
    table.sheet.getRange(2, 1, out.length, width).setNumberFormat('@').setValues(out);
    return { site: siteRowsToObject([table.headers].concat(out)) };
  });
}

function uploadCoverAction_(body) {
  const slug = requireSlug_(body.slug);
  const mimeType = cleanString(body.mimeType) || 'image/jpeg';
  if (COVER_TYPES.indexOf(mimeType) < 0) {
    throw apiError('BAD_REQUEST', 'Use a JPEG, PNG, WebP or GIF image.');
  }
  const base64 = typeof body.base64 === 'string'
    ? body.base64.replace(/^data:[^,]*,/, '').replace(/\s+/g, '')
    : '';
  if (!base64) {
    throw apiError('BAD_REQUEST', 'No image was sent.');
  }
  if (base64.length > COVER_MAX_BASE64_CHARS) {
    throw apiError('BAD_REQUEST', 'The image is too large (the limit is about 10 MB).');
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw apiError('BAD_REQUEST', 'The image data is not valid base64.');
  }

  return withScriptLock_(function () {
    const bytes = Utilities.base64Decode(base64);
    const folder = getCoversFolder_();
    const name = slug + '.jpg';
    const file = folder.createFile(Utilities.newBlob(bytes, mimeType, name));

    // Older files with the same name are removed; the new one is kept.
    const sameName = folder.getFilesByName(name);
    while (sameName.hasNext()) {
      const older = sameName.next();
      if (older.getId() !== file.getId()) older.setTrashed(true);
    }
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w800' };
  });
}

// The Drive folder for covers. Its id is remembered in the script properties;
// if that folder is gone, a new one is created.
function getCoversFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty(COVERS_FOLDER_PROPERTY);
  if (savedId) {
    try {
      const folder = DriveApp.getFolderById(savedId);
      if (!folder.isTrashed()) return folder;
    } catch (err) {
      Logger.log('The covers folder ' + savedId + ' cannot be opened. Creating a new one.');
    }
  }
  const folder = DriveApp.createFolder(COVERS_FOLDER_NAME);
  props.setProperty(COVERS_FOLDER_PROPERTY, folder.getId());
  return folder;
}

// ============================================================================
// Auto-fill. The admin panel sends one Spotify album link; this reads the album from
// Spotify and finds it on Apple Music (browsers can't call these services: no CORS).
// It writes nothing, so it runs without the lock.
// ============================================================================

const MSG_SPOTIFY_NOT_FOUND = "Spotify doesn't know this album. Check the link.";

// UrlFetchApp.fetch that returns HTTP errors instead of throwing them. `service` names
// the site in the error shown when it can't be reached.
function fetchFrom_(service, url, options) {
  try {
    return UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true }, options));
  } catch (err) {
    if (/permission|external_request/i.test(messageOf(err))) {
      throw apiError('SETUP', 'The Apps Script needs one more permission: open Apps Script, run setup once and click Allow, then Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.');
    }
    throw apiError('SERVER', "Couldn't reach " + service + '. Try again, or fill the fields by hand.');
  }
}

// Title, artist, year and cover of one Spotify album, read from its public page. When the
// page has no details, Spotify's oEmbed answer gives at least the title and cover.
function spotifyAlbum_(id) {
  const link = SPOTIFY_ALBUM_URL + id;
  const page = fetchFrom_('Spotify', link, { headers: { 'Accept-Language': 'en' } });
  const pageStatus = page.getResponseCode();
  if (pageStatus === 404) throw apiError('NOT_FOUND', MSG_SPOTIFY_NOT_FOUND);
  if (pageStatus >= 200 && pageStatus <= 299) {
    const album = spotifyAlbumInfo(htmlMeta(page.getContentText()));
    if (album.title) return album;
  }

  const answer = fetchFrom_('Spotify', SPOTIFY_OEMBED_URL + encodeURIComponent(link));
  const status = answer.getResponseCode();
  if (status === 400 || status === 404) throw apiError('NOT_FOUND', MSG_SPOTIFY_NOT_FOUND);
  if (status === 429) throw apiError('RATE_LIMIT', MSG_RATE_LIMIT);
  const data = status >= 200 && status <= 299 ? parseJsonObject(answer.getContentText()) : null;
  if (!data || !cleanString(data.title)) {
    throw apiError('SERVER', "Spotify didn't send this album's details (HTTP " + status + '). Try again, or fill the fields by hand.');
  }
  const cover = cleanString(data.thumbnail_url);
  return { title: cleanString(data.title), artist: '', year: '', cover: /^https:\/\//i.test(cover) ? cover : '' };
}

// The Apple Music album that matches `album`, found with the iTunes Search API, or null.
// Auto-fill works without it (Apple Music then gets a search link), so errors are only logged.
function appleAlbum_(album, country) {
  if (!album.artist) return null;
  const url = ITUNES_SEARCH_URL + '?media=music&entity=album&limit=25&country=' + country +
    '&term=' + encodeURIComponent(album.artist + ' ' + album.title);
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const status = response.getResponseCode();
    if (status < 200 || status > 299) {
      Logger.log('iTunes search answered HTTP ' + status + '.');
      return null;
    }
    const data = parseJsonObject(response.getContentText());
    return pickAppleAlbum(data && data.results, album);
  } catch (err) {
    Logger.log('iTunes search failed: ' + messageOf(err));
    return null;
  }
}

// Auto-fill from one Spotify album link: the album's title, artist, year, cover and links.
// Apple Music gets the album's own link when the iTunes search finds it. YouTube Music and
// Amazon Music have no free search service, so they get search links. `searchLinks` lists
// the platforms whose link is a search link.
function autofillAction_(body) {
  const id = spotifyAlbumId(body.url);
  if (!id) {
    throw apiError('BAD_REQUEST', 'Paste a Spotify album link, e.g. https://open.spotify.com/album/…');
  }
  const country = cleanString(body.country).toUpperCase() || 'US';
  if (!/^[A-Z]{2}$/.test(country)) {
    throw apiError('BAD_REQUEST', 'The country must be a 2-letter code, for example US.');
  }
  const album = spotifyAlbum_(id);
  const links = albumSearchLinks(album, country);
  links.spotify = SPOTIFY_ALBUM_URL + id;
  let searchLinks = ['appleMusic', 'youtubeMusic', 'amazonMusic'];
  const apple = appleAlbum_(album, country);
  if (apple) {
    links.appleMusic = appleAlbumUrl(apple);
    searchLinks = ['youtubeMusic', 'amazonMusic'];
  }
  return { album: Object.assign({}, album, { links: links }), searchLinks: searchLinks };
}

// ============================================================================
// setup(): run once from the editor (and safe to run again)
// ============================================================================

// Makes sure row 1 has every wanted column name. Existing names keep their place;
// missing ones are added at the end. An empty row 1 gets all of them, in order.
function repairHeaderRow_(sheet, tabName, wanted, changes) {
  const values = sheet.getDataRange().getValues();
  const current = (values[0] || []).map(cleanString);
  if (current.every(function (name) { return name === ''; })) {
    writeRow_(sheet, 1, wanted);
    changes.push(tabName + ': wrote the column names in row 1.');
    return { headers: wanted.slice(), values: values };
  }
  const missing = wanted.filter(function (name) {
    return current.indexOf(name) < 0;
  });
  if (!missing.length) {
    return { headers: current, values: values };
  }
  const next = current.concat(missing);
  writeRow_(sheet, 1, next);
  changes.push(tabName + ': added the missing column(s) ' + missing.join(', ') + '.');
  return { headers: next, values: values };
}

// Plain-text format on the used columns, bold frozen header row.
function formatTab_(sheet, width) {
  const rows = Math.max(sheet.getMaxRows(), 2);
  sheet.getRange(1, 1, rows, width).setNumberFormat('@');
  sheet.getRange(1, 1, 1, width).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function setupAlbums_(ss, changes) {
  let sheet = ss.getSheetByName(ALBUMS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ALBUMS_SHEET);
    changes.push('Created the "Albums" tab.');
  }
  const repaired = repairHeaderRow_(sheet, ALBUMS_SHEET, ALBUM_HEADERS, changes);
  const headers = repaired.headers;

  const hasAlbums = repaired.values.slice(1).some(function (row) {
    return row.some(function (cell) {
      return cleanString(cell) !== '';
    });
  });
  if (!hasAlbums) {
    writeRow_(sheet, 2, albumToRow(headers, DEMO_ALBUM, null));
    changes.push('Albums: added the demo album "demo". Delete it when you add your own albums.');
  }
  formatTab_(sheet, headers.length);
}

function setupSite_(ss, changes) {
  let sheet = ss.getSheetByName(SITE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SITE_SHEET);
    changes.push('Created the "Site" tab.');
  }
  const repaired = repairHeaderRow_(sheet, SITE_SHEET, SITE_HEADERS, changes);
  const headers = repaired.headers;
  const keyCol = headers.indexOf('key');

  const present = {};
  repaired.values.slice(1).forEach(function (row) {
    const key = cleanString(row[keyCol]);
    if (key) present[key] = true;
  });
  const missing = SITE_KEYS.filter(function (def) {
    return !hasOwn(present, def.key);
  });
  if (missing.length) {
    const start = sheet.getLastRow() + 1;
    const rows = missing.map(function (def) {
      return buildRow(headers, def, null);
    });
    ensureSize_(sheet, start + rows.length - 1, headers.length);
    sheet.getRange(start, 1, rows.length, headers.length).setNumberFormat('@').setValues(rows);
    changes.push('Site: added the missing setting(s) ' + missing.map(function (def) {
      return def.key;
    }).join(', ') + '.');
  }
  formatTab_(sheet, headers.length);
}

function setup() {
  const changes = [];
  try {
    withScriptLock_(function () {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      setupAlbums_(ss, changes);
      setupSite_(ss, changes);
    });
  } catch (err) {
    Logger.log('setup() stopped: ' + messageOf(err));
    return { ok: false, code: err && err.apiCode ? err.apiCode : 'SERVER', error: messageOf(err) };
  }
  if (changes.length) {
    changes.forEach(function (line) { Logger.log(line); });
  } else {
    Logger.log('Nothing to change: the sheet was already set up.');
  }
  Logger.log('Setup finished. Next: Deploy, New deployment (see the instructions at the top of Code.gs).');
  return { ok: true, changes: changes };
}
