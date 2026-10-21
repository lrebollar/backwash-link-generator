// GitHub REST "Contents" client for the admin panel. Dependency-free browser ES module.

const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const CHUNK = 0x8000;
const enc = encodeURIComponent;

/** UTF-8 string → standard base64 (safe for non-ASCII text). */
export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Base64 (whitespace allowed, as GitHub returns it) → UTF-8 decoded string. */
export function base64ToUtf8(b64) {
  const bin = atob(String(b64).replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export class GitHubClient {
  #owner;
  #repo;
  #branch;
  #token;

  constructor({ owner, repo, branch, token }) {
    this.#owner = owner;
    this.#repo = repo;
    this.#branch = branch;
    this.#token = token;
  }

  /**
   * Verifies the token can see the repo and that the branch exists.
   * @returns {Promise<{ok: true, repoFullName: string, canPush: boolean, defaultBranch: string}>}
   */
  async testConnection() {
    const base = this.#repoUrl();
    const repo = await (await this.#request('GET', base)).json();
    const branch = await this.#request('GET', `${base}/branches/${enc(this.#branch)}`, { nullOn404: true });
    if (!branch) throw Object.assign(new Error(`Branch "${this.#branch}" not found`), { status: 404 });
    return {
      ok: true,
      repoFullName: repo.full_name,
      canPush: !!repo.permissions?.push,
      defaultBranch: repo.default_branch,
    };
  }

  /**
   * Reads a file from the branch.
   * @returns {Promise<{text: string, sha: string} | null>} null if the file does not exist
   */
  async getFile(path) {
    const url = this.#contentsUrl(path, true);
    const res = await this.#request('GET', url, { nullOn404: true });
    if (!res) return null;
    const json = await res.json();
    if (Array.isArray(json)) throw new Error(`"${path}" is a directory, not a file.`);
    let text = '';
    if (json.content) {
      text = base64ToUtf8(json.content);
    } else if (json.size > 0) {
      // Files over 1 MB come back without content; fetch the raw body instead.
      text = await (await this.#request('GET', url, { raw: true })).text();
    }
    return { text, sha: json.sha };
  }

  /**
   * Creates (no sha) or updates (sha from getFile) a text file in one commit.
   * @returns {Promise<{sha: string}>} sha of the new blob
   */
  async putFile(path, text, message, sha) {
    return this.#put(path, utf8ToBase64(text), message, sha);
  }

  /** Same as putFile, but content is already base64 (no data: prefix). */
  async putBinary(path, base64, message, sha) {
    return this.#put(path, String(base64).replace(/\s+/g, ''), message, sha);
  }

  /** Deletes a file in one commit. `sha` must be the file's current sha. */
  async deleteFile(path, sha, message) {
    await this.#request('DELETE', this.#contentsUrl(path), {
      body: { message: message || `Update ${path}`, sha, branch: this.#branch },
    });
  }

  /**
   * Lists a directory.
   * @returns {Promise<Array<{name: string, path: string, sha: string, type: string}>>} [] if missing or not a directory
   */
  async listDir(path) {
    const res = await this.#request('GET', this.#contentsUrl(path, true), { nullOn404: true });
    const json = res ? await res.json() : null;
    if (!Array.isArray(json)) return [];
    return json.map(({ name, path: p, sha, type }) => ({ name, path: p, sha, type }));
  }

  /** @returns {Promise<string | null>} blob sha, or null if the file does not exist */
  async getSha(path) {
    const res = await this.#request('GET', this.#contentsUrl(path, true), { nullOn404: true });
    if (!res) return null;
    const json = await res.json();
    return Array.isArray(json) ? null : (json.sha ?? null);
  }

  async #put(path, contentBase64, message, sha) {
    const body = { message: message || `Update ${path}`, content: contentBase64, branch: this.#branch };
    if (sha) body.sha = sha;
    const res = await this.#request('PUT', this.#contentsUrl(path), { body });
    const json = await res.json();
    return { sha: json.content.sha };
  }

  async #request(method, url, { body, raw = false, nullOn404 = false } = {}) {
    const headers = {
      Authorization: `Bearer ${this.#token}`,
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
    };
    const init = { method, headers, cache: 'no-store' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(url, init);
    } catch (err) {
      throw Object.assign(new Error(`Network error talking to GitHub: ${err.message}`), { status: 0 });
    }
    if (res.ok) return res;
    if (res.status === 404 && nullOn404) return null;
    throw await this.#httpError(res);
  }

  async #httpError(res) {
    let message = '';
    try {
      message = JSON.parse(await res.text()).message || '';
    } catch {
      /* body is not JSON */
    }
    const { status } = res;
    const repo = `${this.#owner}/${this.#repo}`;
    let text;
    if (status === 401) {
      text = 'GitHub token is invalid or expired (401).';
    } else if (status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
      text = `GitHub rate limit exceeded (403). Wait a while and try again. ${message}`;
    } else if (status === 403) {
      text = `Permission denied (403): the token needs 'Contents: Read and write' access to ${repo}. ${message}`;
    } else if (status === 404) {
      text = 'Not found (404): check owner/repo/branch and that the token has access to this repository.';
    } else if (status === 409 || status === 422) {
      text = `Conflict (${status}): the file changed on GitHub since it was loaded. Reload and try again. ${message}`;
    } else {
      text = `GitHub API error (${status}): ${message || res.statusText || 'unknown error'}`;
    }
    return Object.assign(new Error(text.trim()), { status });
  }

  #repoUrl() {
    return `${API}/repos/${enc(this.#owner)}/${enc(this.#repo)}`;
  }

  #contentsUrl(path, withRef = false) {
    const p = String(path).replace(/^\/+|\/+$/g, '').split('/').map(enc).join('/');
    const url = `${this.#repoUrl()}/contents/${p}`;
    return withRef ? `${url}?ref=${enc(this.#branch)}` : url;
  }
}
