// Song.link (Odesli) lookup: paste one streaming link, get title, artist, cover
// and the links for every other platform. Browser-only, no dependencies.
import { PLATFORMS } from '../../assets/js/platforms.js';

const API = 'https://api.song.link/v1-alpha.1/links';

const MSG_INPUT = 'Paste a full link, e.g. https://open.spotify.com/album/…';
const MSG_NOT_FOUND = "Couldn't find that link on the streaming services. Check the URL or fill the fields by hand.";
const MSG_RATE = 'Too many lookups — wait a minute and try again.';
const MSG_NETWORK = "Couldn't reach song.link (network or blocked). Fill the links by hand.";

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

export async function lookup(url, { country = 'US' } = {}) {
  const clean = String(url || '').trim();
  let parsed = null;
  try { parsed = new URL(clean); } catch (_) { parsed = null; }
  if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
    throw new Error(MSG_INPUT);
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

  const entities = data.entitiesByUniqueId || {};
  const byLinks = data.linksByPlatform || {};
  const all = Object.values(entities).filter(Boolean);

  if (all.length === 0 && Object.keys(byLinks).length === 0) throw new Error(MSG_NOT_FOUND);

  const main = entities[data.entityUniqueId]
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
    pageUrl: data.pageUrl || '',
    links,
  };
}
