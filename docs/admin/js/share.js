// Share helpers for the admin panel: QR code (SVG on screen, PNG download), Web NFC
// write of one URL record to an NTAG sticker, and a capacity hint for the sticker chip.
import qrcode from '../vendor/qrcode.mjs';

const QUIET_ZONE = 4; // modules of white border the QR spec asks for

function makeQr(text) {
  const qr = qrcode(0, 'M'); // typeNumber 0 = auto size, error correction M
  qr.addData(String(text));
  qr.make();
  return qr;
}

// Replace the container's contents with an SVG QR code, sized by CSS (max 240px).
export function renderQR(container, text) {
  const svg = makeQr(text).createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  const styled = svg.replace(
    '<svg ',
    '<svg style="width:100%;max-width:240px;height:auto;background:#fff" ',
  );
  container.innerHTML = styled;
}

// PNG data URL of the QR code (black on white, 4-module quiet zone), about `size` px square.
export function qrPngDataUrl(text, size = 600) {
  const qr = makeQr(text);
  const n = qr.getModuleCount();
  const total = n + QUIET_ZONE * 2;
  const cell = Math.max(1, Math.floor(size / total)); // whole pixels keep the modules sharp
  const canvas = document.createElement('canvas');
  canvas.width = cell * total;
  canvas.height = cell * total;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect((c + QUIET_ZONE) * cell, (r + QUIET_ZONE) * cell, cell, cell);
      }
    }
  }
  return canvas.toDataURL('image/png');
}

export function nfcSupported() {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

function nfcErrorMessage(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
      return 'NFC permission denied. Allow NFC for this site in Chrome settings.';
    case 'AbortError':
      return 'Timed out — hold the sticker against the back of the phone and try again.';
    case 'NotSupportedError':
      return 'NFC is off or not available on this phone.';
    case 'NetworkError':
      return 'Lost contact with the sticker — hold it still and retry.';
    default:
      return (err && err.message) || 'NFC write failed.';
  }
}

// Writes one NDEF URL record. Resolves when the sticker has been written.
export async function writeNfc(url, { timeoutMs = 30000 } = {}) {
  if (!nfcSupported()) {
    throw new Error("This browser can't write NFC. Use Chrome on Android, or the free 'NFC Tools' app (iPhone/Android).");
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const ndef = new NDEFReader();
    await ndef.write(
      { records: [{ recordType: 'url', data: url }] },
      { signal: ctrl.signal, overwrite: true },
    );
  } catch (err) {
    throw new Error(nfcErrorMessage(err));
  } finally {
    clearTimeout(timer);
  }
}

// NDEF URI prefixes that the record can compress into one byte (longest first).
const URI_PREFIXES = ['https://www.', 'http://www.', 'https://', 'http://'];

// Bytes of URL after the prefix byte is removed.
function restBytes(url) {
  let rest = url;
  for (const p of URI_PREFIXES) {
    if (rest.startsWith(p)) { rest = rest.slice(p.length); break; }
  }
  return new TextEncoder().encode(rest).length;
}

// Limits are on the URL bytes after the prefix byte. They come from the NTAG user memory
// (144 / 504 / 888 bytes) minus the NDEF framing: 7 bytes for a short record, 12 for a long one
// (payloads over 255 bytes). NTAG215 is therefore 492, not 496. The 868 limit for NTAG216 is
// deliberately a little under the exact figure.
const LIMIT_NTAG213 = 137;
const LIMIT_NTAG215 = 492;
const LIMIT_NTAG216 = 868;

// Human hint for which NTAG chip holds this URL when written as a single URL record.
export function ntagHint(url) {
  const text = String(url || '').trim();
  if (!text) return 'Enter the link first.';
  const rest = restBytes(text);
  // Total NDEF bytes: TLV + record + prefix byte + URL (the 0xFE terminator is not counted).
  // Payloads over 255 bytes need a long record header (+3 bytes), and a TLV length over 254
  // needs the 3-byte length form (+2 bytes).
  const payload = rest + 1;
  const recordHeader = payload <= 255 ? 4 : 7; // flags, type length, payload length, type "U"
  const message = payload + recordHeader;
  const total = message + (message <= 254 ? 2 : 4);

  if (rest <= LIMIT_NTAG213) {
    return `${total} bytes — fits NTAG213 (144 bytes), NTAG215, NTAG216.`;
  }
  if (rest <= LIMIT_NTAG215) {
    return `${total} bytes — too long for NTAG213 (144 bytes). Use NTAG215 (504 bytes) or NTAG216.`;
  }
  if (rest <= LIMIT_NTAG216) {
    return `${total} bytes — too long for NTAG215 (504 bytes). Use NTAG216 (888 bytes).`;
  }
  return `${total} bytes — too long for any NTAG chip. Use a shorter link.`;
}
