export const DAW_TRACKS = Object.freeze([
  { id: 'backing', name: 'Backing', shortName: 'BACKING', color: '#4daeff', input: 'Audio file' },
  { id: 'guitar', name: 'Guitar', shortName: 'GUITAR', color: '#c5f36b', input: 'MG-30 USB' },
  { id: 'bass', name: 'Bass', shortName: 'BASS', color: '#bd83f5', input: 'Import / MG-30 USB overdub' },
  { id: 'vocals', name: 'Vocals', shortName: 'VOCALS', color: '#edc85b', input: 'Import / MG-30 USB overdub' },
]);

export function makeId(prefix = 'daw') {
  const random = globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
  return prefix + '-' + random;
}

export function createDefaultProject(name = 'Untitled Project', now = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    id: makeId('project'),
    name: String(name || 'Untitled Project').trim().slice(0, 80) || 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    tempo: 100,
    timeSignature: '4/4',
    sampleRate: 48000,
    bitDepth: 24,
    loopEnabled: false,
    metronomeEnabled: false,
    snap: 'beat',
    zoom: 92,
    masterGain: 0.9,
    tracks: DAW_TRACKS.map((track, index) => ({
      id: track.id,
      name: track.name,
      color: track.color,
      input: track.input,
      gain: 1,
      pan: 0,
      mute: false,
      solo: false,
      armed: index === 1,
      clips: [],
    })),
  };
}

export function normalizeProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const defaults = createDefaultProject();
  const tracks = Array.isArray(input.tracks) ? input.tracks : [];
  const normalizedTracks = DAW_TRACKS.map((definition, index) => {
    const source = tracks.find((track) => track && track.id === definition.id) || {};
    const clips = Array.isArray(source.clips) ? source.clips.slice(0, 512).map((clip) => {
      if (!clip || typeof clip !== 'object' || !String(clip.mediaId || '')) return null;
      const startSeconds = Math.max(0, Number(clip.startSeconds) || 0);
      const sourceOffsetSeconds = Math.max(0, Number(clip.sourceOffsetSeconds) || 0);
      const durationSeconds = Math.max(0, Number(clip.durationSeconds) || 0);
      if (!Number.isFinite(startSeconds + sourceOffsetSeconds + durationSeconds) || durationSeconds <= 0) return null;
      return {
        id: String(clip.id || makeId('clip')).slice(0, 100),
        mediaId: String(clip.mediaId).slice(0, 120),
        name: String(clip.name || 'Audio clip').slice(0, 120),
        startSeconds,
        sourceOffsetSeconds,
        durationSeconds,
        sampleRate: Math.max(8000, Math.min(384000, Number(clip.sampleRate) || 48000)),
        channels: Math.max(1, Math.min(8, Math.round(Number(clip.channels) || 2))),
        waveform: Array.isArray(clip.waveform) ? clip.waveform.slice(0, 128).map((value) => Math.max(0, Math.min(100, Number(value) || 0))) : [],
      };
    }).filter(Boolean) : [];
    return {
      id: definition.id,
      name: String(source.name || definition.name).slice(0, 40),
      color: definition.color,
      input: String(source.input || definition.input).slice(0, 80),
      gain: Math.max(0, Math.min(2, Number.isFinite(Number(source.gain)) ? Number(source.gain) : 1)),
      pan: Math.max(-1, Math.min(1, Number.isFinite(Number(source.pan)) ? Number(source.pan) : 0)),
      mute: Boolean(source.mute),
      solo: Boolean(source.solo),
      armed: Boolean(source.armed) && index !== 0,
      clips,
    };
  });
  const armed = normalizedTracks.filter((track) => track.armed);
  if (armed.length > 1) armed.slice(1).forEach((track) => { track.armed = false; });
  const timeSignature = ['4/4', '3/4', '6/8'].includes(input.timeSignature) ? input.timeSignature : '4/4';
  return {
    schemaVersion: 1,
    id: String(input.id || makeId('project')).slice(0, 120),
    name: String(input.name || defaults.name).trim().slice(0, 80) || defaults.name,
    createdAt: String(input.createdAt || defaults.createdAt),
    updatedAt: String(input.updatedAt || defaults.updatedAt),
    tempo: Math.max(40, Math.min(240, Math.round(Number(input.tempo) || defaults.tempo))),
    timeSignature,
    sampleRate: 48000,
    bitDepth: 24,
    loopEnabled: Boolean(input.loopEnabled),
    metronomeEnabled: Boolean(input.metronomeEnabled),
    snap: ['off', 'beat', 'bar', 'eighth'].includes(input.snap) ? input.snap : 'beat',
    zoom: Math.max(44, Math.min(180, Number(input.zoom) || defaults.zoom)),
    masterGain: Number.isFinite(Number(input.masterGain)) ? Math.max(0, Math.min(1.5, Number(input.masterGain))) : defaults.masterGain,
    tracks: normalizedTracks,
  };
}

export function beatsPerBar(timeSignature = '4/4') {
  if (timeSignature === '3/4') return 3;
  if (timeSignature === '6/8') return 6;
  return 4;
}

export function barDurationSeconds(tempo = 100, timeSignature = '4/4') {
  return (60 / Math.max(40, Math.min(240, Number(tempo) || 100))) * beatsPerBar(timeSignature);
}

export function projectDurationSeconds(project, minimumBars = 4) {
  const bar = barDurationSeconds(project?.tempo, project?.timeSignature);
  const longest = (project?.tracks || []).reduce((max, track) => (track.clips || []).reduce(
    (inner, clip) => Math.max(inner, (Number(clip.startSeconds) || 0) + (Number(clip.durationSeconds) || 0)),
    max,
  ), 0);
  return Math.max(bar * minimumBars, longest);
}

export function snapTime(seconds, project, mode = project?.snap) {
  const beat = 60 / Math.max(40, Math.min(240, Number(project?.tempo) || 100));
  const bar = beat * beatsPerBar(project?.timeSignature);
  let step = 0;
  if (mode === 'bar') step = bar;
  else if (mode === 'beat') step = beat;
  else if (mode === 'eighth') step = beat / 2;
  return step > 0 ? Math.max(0, Math.round(Math.max(0, seconds) / step) * step) : Math.max(0, seconds);
}

export function selectStemTracks(project, selectedIds) {
  const selected = new Set((selectedIds || []).map(String));
  return (project?.tracks || []).filter((track) => selected.has(track.id) && track.clips?.length);
}

export function safeExportName(value, fallback = 'MG30-Studio-Export') {
  const cleaned = String(value || '').normalize('NFKC')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || fallback).slice(0, 100);
}

export function encodeWavHeader(dataBytes, sampleRate = 48000, channels = 2, bits = 24) {
  if (!Number.isSafeInteger(dataBytes) || dataBytes < 0 || dataBytes > 0xffffffff - 36) throw new RangeError('WAV is too large for the classic RIFF format.');
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF');
  view.setUint32(4, dataBytes + 36, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bits / 8), true);
  view.setUint16(32, channels * (bits / 8), true);
  view.setUint16(34, bits, true);
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  return new Uint8Array(header);
}

export function floatStereoToPcm24(left, right) {
  if (!left || !right || left.length !== right.length) throw new TypeError('Stereo channels must have matching lengths.');
  const pcm = new Uint8Array(left.length * 6);
  let offset = 0;
  for (let i = 0; i < left.length; i++) {
    for (const raw of [left[i], right[i]]) {
      const sample = Number.isFinite(raw) ? Math.max(-1, Math.min(1, raw)) : 0;
      const value = sample <= -1 ? -8388608 : Math.round(sample * 8388607);
      pcm[offset++] = value & 0xff;
      pcm[offset++] = (value >> 8) & 0xff;
      pcm[offset++] = (value >> 16) & 0xff;
    }
  }
  return pcm;
}

export function makeWavBlob(pcmChunks, frameCount, sampleRate = 48000) {
  const chunks = (pcmChunks || []).filter((chunk) => chunk && chunk.byteLength);
  const dataBytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  if (dataBytes !== frameCount * 6) throw new Error('Rendered PCM length does not match the stereo WAV frame count.');
  return new Blob([encodeWavHeader(dataBytes, sampleRate, 2, 24), ...chunks], { type: 'audio/wav' });
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes, initial = 0xffffffff) {
  let crc = initial >>> 0;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return crc >>> 0;
}

async function crc32Blob(blob) {
  let crc = 0xffffffff;
  const chunkSize = 1024 * 1024;
  for (let offset = 0; offset < blob.size; offset += chunkSize) {
    const bytes = new Uint8Array(await blob.slice(offset, offset + chunkSize).arrayBuffer());
    crc = crc32(bytes, crc);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

export async function createStoredZip(entries) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 4) throw new Error('Select at least one and no more than four tracks for stem export.');
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  let centralSize = 0;
  const encoder = new TextEncoder();
  const stamp = dosDateTime();
  const names = new Set();
  for (const entry of entries) {
    const name = safeExportName(entry.name, 'Track.wav');
    if (names.has(name)) throw new Error('Stem file names must be unique.');
    names.add(name);
    const filename = encoder.encode(name);
    const blob = entry.blob instanceof Blob ? entry.blob : new Blob([entry.blob || new Uint8Array(0)]);
    if (blob.size > 0xffffffff) throw new RangeError('A stem exceeds the ZIP 32-bit size limit.');
    const checksum = await crc32Blob(blob);
    const localHeader = new Uint8Array(30 + filename.length);
    const local = new DataView(localHeader.buffer);
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0808, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, stamp.time, true);
    local.setUint16(12, stamp.day, true);
    local.setUint16(26, filename.length, true);
    localHeader.set(filename, 30);
    const descriptor = new Uint8Array(16);
    const desc = new DataView(descriptor.buffer);
    desc.setUint32(0, 0x08074b50, true);
    desc.setUint32(4, checksum, true);
    desc.setUint32(8, blob.size, true);
    desc.setUint32(12, blob.size, true);
    localParts.push(localHeader, blob, descriptor);

    const central = new Uint8Array(46 + filename.length);
    const cd = new DataView(central.buffer);
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0808, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, stamp.time, true);
    cd.setUint16(14, stamp.day, true);
    cd.setUint32(16, checksum, true);
    cd.setUint32(20, blob.size, true);
    cd.setUint32(24, blob.size, true);
    cd.setUint16(28, filename.length, true);
    cd.setUint32(42, localOffset, true);
    central.set(filename, 46);
    centralParts.push(central);
    localOffset += localHeader.byteLength + blob.size + descriptor.byteLength;
    centralSize += central.byteLength;
  }
  if (localOffset + centralSize > 0xffffffff) throw new RangeError('The ZIP archive exceeds the classic ZIP size limit.');
  const end = new Uint8Array(22);
  const eocd = new DataView(end.buffer);
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, localOffset, true);
  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}
