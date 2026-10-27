// Client for the Apps Script web app bound to the Google Sheet (google-sheet/Code.gs).
// Browser-only ES module, no dependencies.

const MSG_UNREACHABLE = "Couldn't reach the Google Apps Script web app. Check its URL and that it is deployed with 'Who has access: Anyone'.";
const MSG_NOT_JSON = "The web app answered with a web page instead of data. Deploy it again with 'Who has access: Anyone'.";

export class SheetApi {
  #url;
  #password;

  /** @param {{url: string, password: string}} opts */
  constructor({ url, password }) {
    this.#url = url;
    this.#password = password;
  }

  /**
   * POSTs one action. No headers on purpose: a plain text/plain body needs no CORS preflight.
   * @returns {Promise<object>} the response JSON (ok: true)
   * @throws {Error} with `.code` (AUTH, SETUP, EXISTS, CONFLICT, NOT_FOUND, ...) when the web app says ok: false
   */
  async call(action, params = {}) {
    let res;
    try {
      res = await fetch(this.#url, {
        method: 'POST',
        body: JSON.stringify({ action, password: this.#password, ...params }),
      });
    } catch {
      throw new Error(MSG_UNREACHABLE);
    }
    let data;
    try {
      data = JSON.parse(await res.text());
    } catch {
      throw new Error(MSG_NOT_JSON);
    }
    if (data?.ok !== true) {
      throw Object.assign(new Error(data?.error || 'The web app sent an unexpected answer.'), { code: data?.code || 'SERVER' });
    }
    return data;
  }

  /** @returns {Promise<{ok: true, spreadsheetId: string, spreadsheetName: string, albums: number, version: number}>} */
  ping() {
    return this.call('ping');
  }

  /** @returns {Promise<object[]>} every album row */
  async listAlbums() {
    return (await this.call('listAlbums')).albums || [];
  }

  /** @returns {Promise<object>} the album (NOT_FOUND when missing) */
  async getAlbum(slug) {
    return (await this.call('getAlbum', { slug })).album;
  }

  /**
   * Creates (isNew) or updates an album. Pass the updatedAt the editor loaded as expectedUpdatedAt
   * so the server answers CONFLICT when someone else saved in between.
   * @returns {Promise<object>} the saved album, with its new updatedAt
   */
  async saveAlbum(album, { isNew = false, expectedUpdatedAt } = {}) {
    return (await this.call('saveAlbum', { album, isNew, expectedUpdatedAt })).album;
  }

  /** Removes the album row. */
  async deleteAlbum(slug) {
    await this.call('deleteAlbum', { slug });
  }

  /** @returns {Promise<object>} the site settings */
  async getSite() {
    return (await this.call('getSite')).site;
  }

  /** @returns {Promise<object>} the saved site settings */
  async saveSite(site) {
    return (await this.call('saveSite', { site })).site;
  }

  /**
   * Stores a cover image (base64, no data: prefix) in Drive.
   * @returns {Promise<string>} the public image URL to put in album.cover
   */
  async uploadCover(slug, base64, mimeType = 'image/jpeg') {
    return (await this.call('uploadCover', { slug, base64, mimeType })).url;
  }
}

/**
 * Reads docs/config.json (the public sheet ID and web app URL). A missing or broken file gives empty strings.
 * @returns {Promise<{sheetId: string, appsScriptUrl: string}>}
 */
export async function loadConfig() {
  const empty = { sheetId: '', appsScriptUrl: '' };
  try {
    const res = await fetch('../config.json', { cache: 'no-store' });
    if (!res.ok) return empty;
    const json = await res.json();
    return { sheetId: String(json.sheetId || ''), appsScriptUrl: String(json.appsScriptUrl || '') };
  } catch {
    return empty;
  }
}
