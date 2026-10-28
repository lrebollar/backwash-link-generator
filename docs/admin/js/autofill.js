// Auto-fill: paste one Spotify album link; the Apps Script (google-sheet/Code.gs, action
// `autofill`) reads the album from Spotify and finds its other streaming links. Browsers
// cannot call these services themselves (no CORS). Browser-only, no dependencies.

const MSG_RATE = 'Too many lookups — wait a minute and try again.';
const MSG_SETUP = 'The Apps Script needs one more permission: open Apps Script, run setup once and click Allow, then Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.';
const MSG_OLD_SCRIPT = 'Your Apps Script is an older version. Update it with the latest google-sheet/Code.gs (ops/maintenance/google-sheet.md: Update the Apps Script).';

// Turns an error from SheetApi.call('autofill') into the message shown under the auto-fill box.
function appsScriptMessage(e) {
  if (e?.code === 'RATE_LIMIT') return MSG_RATE;
  if (e?.code === 'SETUP') return MSG_SETUP;
  if (e?.code === 'BAD_REQUEST' && /unknown action/i.test(e.message || '')) return MSG_OLD_SCRIPT;
  return (e && e.message) || String(e);
}

/**
 * Looks up one Spotify album link through the Apps Script.
 * @param {string} url a Spotify album link (https://open.spotify.com/album/…)
 * @param {{country?: string, api: import('./api.js').SheetApi}} opts
 * @returns {Promise<{title: string, artist: string, year: string, cover: string, links: object, searchLinks: string[]}>}
 *   `links` holds spotify, appleMusic, youtubeMusic and amazonMusic; `searchLinks` names the
 *   platforms whose link opens a search instead of the album itself.
 */
export async function autofill(url, { country = 'US', api }) {
  let result;
  try {
    result = await api.call('autofill', { url: String(url || '').trim(), country });
  } catch (e) {
    throw new Error(appsScriptMessage(e));
  }
  const album = result.album || {};
  return {
    title: album.title || '',
    artist: album.artist || '',
    year: album.year || '',
    cover: album.cover || '',
    links: album.links || {},
    searchLinks: Array.isArray(result.searchLinks) ? result.searchLinks : [],
  };
}
