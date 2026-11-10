const UTF8 = new TextEncoder();
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const MAX_ENTRIES = 512;
const DEFAULT_MAX_BYTES = 200 * 1024 * 1024;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(input) {
  const bytes = toBytes(input);
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError('ZIP entry data must be bytes.');
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function write16(view, offset, value) { view.setUint16(offset, value, true); }
function write32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function validateArchivePath(path) {
  const value = String(path || '');
  if (!value || value.length > 240 || value.startsWith('/') || value.startsWith('\\') ||
      value.includes('\\') || value.split('/').some(part => !part || part === '.' || part === '..') ||
      /^[A-Za-z]:/.test(value)) {
    throw new Error('ZIP path is empty, unsafe, or outside the backup folder: ' + value);
  }
  return value;
}

/** Creates a standards-compliant ZIP using STORE (no compression) for predictable Android WebView support. */
export function encodeStoredZip(entries, options = {}) {
  if (!Array.isArray(entries) || !entries.length || entries.length > MAX_ENTRIES) {
    throw new Error('Backup archive must contain between 1 and ' + MAX_ENTRIES + ' files.');
  }
  const maxBytes = Number(options.maxBytes) || DEFAULT_MAX_BYTES;
  const names = new Set();
  let totalBytes = 0;
  const localParts = [], centralParts = [];
  const stamp = dosDateTime(options.date ? new Date(options.date) : new Date());
  let localOffset = 0;

  for (const entry of entries) {
    const path = validateArchivePath(entry?.path);
    if (names.has(path)) throw new Error('Duplicate ZIP entry: ' + path);
    names.add(path);
    const nameBytes = UTF8.encode(path);
    if (!nameBytes.length || nameBytes.length > 240) throw new Error('ZIP filename is too long: ' + path);
    const data = toBytes(entry.data);
    totalBytes += data.length;
    if (totalBytes > maxBytes || data.length > 0xFFFFFFFF) throw new Error('Backup is larger than the supported ZIP limit.');
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    write32(lv, 0, 0x04034B50);
    write16(lv, 4, 20);
    write16(lv, 6, 0x0800);
    write16(lv, 8, 0);
    write16(lv, 10, stamp.time);
    write16(lv, 12, stamp.date);
    write32(lv, 14, crc);
    write32(lv, 18, data.length);
    write32(lv, 22, data.length);
    write16(lv, 26, nameBytes.length);
    write16(lv, 28, 0);
    local.set(nameBytes, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    write32(cv, 0, 0x02014B50);
    write16(cv, 4, 20);
    write16(cv, 6, 20);
    write16(cv, 8, 0x0800);
    write16(cv, 10, 0);
    write16(cv, 12, stamp.time);
    write16(cv, 14, stamp.date);
    write32(cv, 16, crc);
    write32(cv, 20, data.length);
    write32(cv, 24, data.length);
    write16(cv, 28, nameBytes.length);
    write16(cv, 30, 0);
    write16(cv, 32, 0);
    write16(cv, 34, 0);
    write16(cv, 36, 0);
    write32(cv, 38, 0);
    write32(cv, 42, localOffset);
    central.set(nameBytes, 46);
    centralParts.push(central);
    localOffset += local.length + data.length;
    if (localOffset > 0xFFFFFFFF) throw new Error('ZIP64 is not supported; backup is too large.');
  }

  const centralBytes = concatBytes(centralParts);
  const centralOffset = localOffset;
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  write32(ev, 0, 0x06054B50);
  write16(ev, 4, 0);
  write16(ev, 6, 0);
  write16(ev, 8, entries.length);
  write16(ev, 10, entries.length);
  write32(ev, 12, centralBytes.length);
  write32(ev, 16, centralOffset);
  write16(ev, 20, 0);

  const archive = concatBytes([...localParts, centralBytes, end]);
  if (archive.length > maxBytes + 2 * 1024 * 1024) throw new Error('ZIP archive exceeded the configured size limit.');
  return archive;
}

/** Reads this app's STORE-only ZIPs, enforcing path, size, CRC, and directory bounds. */
export function decodeStoredZip(input, options = {}) {
  const bytes = toBytes(input);
  const maxBytes = Number(options.maxBytes) || DEFAULT_MAX_BYTES;
  if (!bytes.length || bytes.length > maxBytes + 2 * 1024 * 1024) throw new Error('Backup ZIP is empty or exceeds the supported size limit.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minOffset = Math.max(0, bytes.length - 22 - 0xFFFF);
  let endOffset = -1;
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054B50) { endOffset = i; break; }
  }
  if (endOffset < 0) throw new Error('ZIP end record was not found. The file may be truncated or invalid.');
  const disk = view.getUint16(endOffset + 4, true);
  const centralDisk = view.getUint16(endOffset + 6, true);
  const diskEntries = view.getUint16(endOffset + 8, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralSize = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  const commentLength = view.getUint16(endOffset + 20, true);
  if (disk || centralDisk || diskEntries !== entryCount || entryCount < 1 || entryCount > MAX_ENTRIES ||
      endOffset + 22 + commentLength !== bytes.length ||
      centralOffset + centralSize > endOffset) {
    throw new Error('ZIP directory is inconsistent or uses an unsupported multi-disk/ZIP64 layout.');
  }

  const files = new Map();
  let cursor = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index++) {
    if (cursor + 46 > centralOffset + centralSize || view.getUint32(cursor, true) !== 0x02014B50) {
      throw new Error('ZIP central directory entry ' + index + ' is malformed.');
    }
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const crc = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const entryCommentLength = view.getUint16(cursor + 32, true);
    const diskStart = view.getUint16(cursor + 34, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const end = cursor + 46 + nameLength + extraLength + entryCommentLength;
    if (end > centralOffset + centralSize || diskStart !== 0 || (flags & 1) || method !== 0 ||
        compressedSize !== uncompressedSize || (flags & 0x0008)) {
      throw new Error('ZIP entry uses encryption, compression, descriptors, or split disks not supported by MG30 Studio.');
    }
    let path;
    try { path = UTF8_DECODER.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength)); }
    catch { throw new Error('ZIP entry filename is not valid UTF-8.'); }
    validateArchivePath(path);
    if (files.has(path)) throw new Error('Backup ZIP contains duplicate entry: ' + path);
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > maxBytes) throw new Error('Backup expands beyond the supported size limit.');

    if (localOffset + 30 > centralOffset || view.getUint32(localOffset, true) !== 0x04034B50) {
      throw new Error('ZIP local header is missing for ' + path + '.');
    }
    const localFlags = view.getUint16(localOffset + 6, true);
    const localMethod = view.getUint16(localOffset + 8, true);
    const localCrc = view.getUint32(localOffset + 14, true);
    const localCompressed = view.getUint32(localOffset + 18, true);
    const localUncompressed = view.getUint32(localOffset + 22, true);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (localFlags !== flags || localMethod !== method || localCrc !== crc ||
        localCompressed !== compressedSize || localUncompressed !== uncompressedSize ||
        dataEnd > centralOffset || localNameLength !== nameLength ||
        UTF8_DECODER.decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength)) !== path) {
      throw new Error('ZIP local/central headers do not match for ' + path + '.');
    }
    const data = bytes.slice(dataStart, dataEnd);
    if (crc32(data) !== crc) throw new Error('ZIP CRC32 verification failed for ' + path + '.');
    files.set(path, data);
    cursor = end;
  }
  if (cursor !== centralOffset + centralSize) throw new Error('ZIP central directory has trailing or missing data.');
  return files;
}
