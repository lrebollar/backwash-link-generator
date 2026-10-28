// Auto-fill and the "Look up" links of the album editor. Browser-only, no dependencies.
// - autofill(): the Apps Script (google-sheet/Code.gs, action `autofill`) reads one Spotify,
//   Apple Music or Deezer album link and finds the same album on Apple Music and Deezer.
//   Browsers cannot call these services themselves (no CORS).
// - searchLink(): a link that opens a search for the album on one streaming service.

// The first Code.gs version whose `autofill` reads Apple Music and Deezer links and finds labels.
const MIN_API_VERSION = 4;
const MSG_RATE = 'Too many lookups — wait a minute and try again.';
const MSG_SETUP = 'The Apps Script needs one more permission: open Apps Script, run setup once and click Allow, then Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.';
const MSG_OLD_SCRIPT = 'Your Apps Script is an older version. Update it with the latest google-sheet/Code.gs (ops/maintenance/google-sheet.md: Update the Apps Script).';

// The platforms whose album links Auto-fill can read.
export const AUTOFILL_PLATFORMS = ['spotify', 'appleMusic', 'deezer'];

// Amazon Music website per store country. Other countries use music.amazon.com.
const AMAZON_MUSIC_HOSTS = {
  US: 'music.amazon.com', GB: 'music.amazon.co.uk', DE: 'music.amazon.de', FR: 'music.amazon.fr',
  IT: 'music.amazon.it', ES: 'music.amazon.es', JP: 'music.amazon.co.jp', CA: 'music.amazon.ca',
  AU: 'music.amazon.com.au', MX: 'music.amazon.com.mx', BR: 'music.amazon.com.br', IN: 'music.amazon.in',
};

// Search page per platform key (assets/js/platforms.js). `q` is already URL-encoded.
const SEARCH = {
  spotify: (q) => `https://open.spotify.com/search/${q}`,
  appleMusic: (q, country) => `https://music.apple.com/${country.toLowerCase()}/search?term=${q}`,
  youtubeMusic: (q) => `https://music.youtube.com/search?q=${q}`,
  youtube: (q) => `https://www.youtube.com/results?search_query=${q}`,
  amazonMusic: (q, country) => `https://${AMAZON_MUSIC_HOSTS[country] || AMAZON_MUSIC_HOSTS.US}/search/${q}`,
  deezer: (q) => `https://www.deezer.com/search/${q}`,
  tidal: (q) => `https://listen.tidal.com/search?q=${q}`,
  soundcloud: (q) => `https://soundcloud.com/search?q=${q}`,
  bandcamp: (q) => `https://bandcamp.com/search?q=${q}&item_type=a`,
};

/**
 * A link that opens a search for `words` (e.g. "Nirvana Nevermind") on one platform, or ''.
 * @param {string} key platform key, e.g. 'appleMusic'
 * @param {string} words what to search for
 * @param {string} [country] 2-letter store country (Apple Music and Amazon Music use it)
 */
export function searchLink(key, words, country = 'US') {
  const make = SEARCH[key];
  // A "/" would end the path of the services that take the search in the path.
  const query = String(words || '').replace(/[\s/]+/g, ' ').trim();
  return make && query ? make(encodeURIComponent(query), String(country || 'US').toUpperCase()) : '';
}

// True for a link that opens a search page (…/search…, YouTube's /results) instead of an album.
// Older versions of Auto-fill saved such links.
export function isSearchLink(url) {
  try {
    return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:search|results)(?:\/|$)/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

// Turns an error from SheetApi.call('autofill') into the message shown to the user.
function appsScriptMessage(e) {
  if (e?.code === 'RATE_LIMIT') return MSG_RATE;
  if (e?.code === 'SETUP') return MSG_SETUP;
  if (e?.code === 'BAD_REQUEST' && /unknown action/i.test(e.message || '')) return MSG_OLD_SCRIPT;
  return (e && e.message) || String(e);
}

/**
 * Reads one Spotify, Apple Music or Deezer album link through the Apps Script.
 * @param {string} url an album link, e.g. https://open.spotify.com/album/…
 * @param {{country?: string, api: import('./api.js').SheetApi}} opts
 * @returns {Promise<{title: string, artist: string, year: string, label: string, cover: string, links: object, source: string}>}
 *   `links` holds the album's own links that were found (spotify, appleMusic, deezer); `source`
 *   is the platform key of `url`.
 */
export async function autofill(url, { country = 'US', api }) {
  let result;
  try {
    result = await api.call('autofill', { url: String(url || '').trim(), country });
  } catch (e) {
    throw new Error(appsScriptMessage(e));
  }
  if (!(result.version >= MIN_API_VERSION)) throw new Error(MSG_OLD_SCRIPT);
  const album = result.album || {};
  return {
    title: album.title || '',
    artist: album.artist || '',
    year: album.year || '',
    label: album.label || '',
    cover: album.cover || '',
    links: album.links || {},
    source: result.source || '',
  };
}
