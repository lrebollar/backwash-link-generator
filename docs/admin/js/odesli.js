// Song.link (Odesli) lookup: paste one streaming link, get title, artist, cover
// and the links for every other platform. Browser-only, no dependencies.
// The admin panel passes its SheetApi client, so the lookup runs in the Apps Script (browsers
// cannot call song.link directly: no CORS). Without a client the browser calls song.link itself.
import { PLATFORMS } from '../../assets/js/platforms.js';

const API = 'https://api.song.link/v1-alpha.1/links';

const MSG_INPUT = 'Paste a full link, e.g. https://open.spotify.com/album/…';
const MSG_NOT_FOUND = "Couldn't find that link on the streaming services. Check the URL or fill the fields by hand.";
const MSG_RATE = 'Too many lookups — wait a minute and try again.';
const MSG_NETWORK = "Couldn't reach song.link (network or blocked). Fill the links by hand.";
const MSG_SETUP = 'The Apps Script needs one more permission: open Apps Script, run setup once and click Allow, then Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.';
const MSG_OLD_SCRIPT = 'Your Apps Script is an older version. Update it with the latest google-sheet/Code.gs (ops/maintenance/google-sheet.md: Update the Apps Script).';

// Lower rank = preferred when two thumbnails have the same width.
function artRank(entity) {
  return entity.apiProvider === 'spotify' || entity.apiProvider === 'itunes' ? 0 : 1;
}

function pickCover(entities) {
  let best = null;
  for (const entity of entities) {
    if (!entity || !entity.thumbnailUrl) continue;
    if (!best) { best = entity; continue; }
    const w = Number(entity.thumbnailWidth) || 0;
    const bw = Number(best.thumbnailWidth) || 0;
    if (w > bw || (w === bw && artRank(entity) < artRank(best))) best = entity;
  }
  return best ? best.thumbnailUrl : '';
}

/**
 * Maps a raw song.link response to the fields the admin panel fills in.
 * @param {object} data the song.link JSON (as returned by the Apps Script `lookup` action in `data`)
 * @throws {Error} when song.link knows nothing about the link
 */
export function parseOdesli(data) {
  const reply = data || {};
  const entities = reply.entitiesByUniqueId || {};
  const byLinks = reply.linksByPlatform || {};
  const all = Object.values(entities).filter(Boolean);

  if (all.length === 0 && Object.keys(byLinks).length === 0) throw new Error(MSG_NOT_FOUND);

  const main = entities[reply.entityUniqueId]
    || all.find((e) => e.title)
    || all[0]
    || {};

  const links = {};
  for (const p of PLATFORMS) {
    links[p.key] = byLinks[p.odesli]?.url || '';
  }

  return {
    title: main.title || '',
    artist: main.artistName || '',
    cover: pickCover(all),
    type: main.type || '',
    pageUrl: reply.pageUrl || '',
    links,
  };
}

// Turns an error from SheetApi.call('lookup') into the message shown under the auto-fill box.
function appsScriptMessage(e) {
  if (e?.code === 'RATE_LIMIT') return MSG_RATE;
  if (e?.code === 'NOT_FOUND') return MSG_NOT_FOUND;
  if (e?.code === 'SETUP') return MSG_SETUP;
  if (e?.code === 'BAD_REQUEST' && /unknown action/i.test(e.message || '')) return MSG_OLD_SCRIPT;
  return (e && e.message) || String(e);
}

/**
 * Looks up one streaming link.
 * @param {string} url a Spotify / Apple Music / YouTube / Deezer / Tidal ... link
 * @param {{country?: string, api?: import('./api.js').SheetApi}} [opts] with `api`, the lookup runs
 *   through the Apps Script; without it, the browser calls song.link directly.
 * @returns {Promise<{title: string, artist: string, cover: string, type: string, pageUrl: string, links: object}>}
 */
export async function lookup(url, { country = 'US', api } = {}) {
  const clean = String(url || '').trim();
  let parsed = null;
  try { parsed = new URL(clean); } catch (_) { parsed = null; }
  if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
    throw new Error(MSG_INPUT);
  }

  if (api) {
    let result;
    try {
      result = await api.call('lookup', { url: clean, country });
    } catch (e) {
      throw new Error(appsScriptMessage(e));
    }
    return parseOdesli(result.data);
  }

  const endpoint = `${API}?url=${encodeURIComponent(clean)}&userCountry=${encodeURIComponent(country)}`;

  let res;
  try {
    res = await fetch(endpoint);
  } catch (_) {
    // fetch() rejects on network failure and on CORS blocks alike.
    throw new Error(MSG_NETWORK);
  }

  if (res.status === 400 || res.status === 404) throw new Error(MSG_NOT_FOUND);
  if (res.status === 429) throw new Error(MSG_RATE);
  if (!res.ok) {
    throw new Error(`Song.link lookup failed (HTTP ${res.status}). Fill the links by hand.`);
  }

  let data;
  try {
    data = await res.json();
  } catch (_) {
    throw new Error('Song.link sent an unreadable reply. Fill the links by hand.');
  }

  return parseOdesli(data);
}
