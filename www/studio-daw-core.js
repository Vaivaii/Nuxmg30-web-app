export const DAW_INPUT_ROUTES = Object.freeze([
  { id: 'file', label: 'Audio file / Import', channelIndexMask: 0, captureMode: 'file' },
  { id: 'usb-ch1-mono', label: 'MG-30 USB · Input 1 (Mono)', channelIndexMask: 1, captureMode: 'multichannel' },
  { id: 'usb-ch1-2-stereo', label: 'MG-30 USB · Input 1–2 (Stereo + Host Loopback Mix)', channelIndexMask: 3, captureMode: 'multichannel' },
  { id: 'usb-wet-sync-3-4-stereo', label: 'MG-30 USB · Input 3–4 (Wet Sync / Dry Out)', channelIndexMask: 12, captureMode: 'multichannel' },
]);

export const DAW_TRACKS = Object.freeze([
  { id: 'backing', name: 'Backing', shortName: 'BACKING', color: '#4daeff', input: 'Audio file', inputRoute: 'file' },
  { id: 'guitar', name: 'Guitar', shortName: 'GUITAR', color: '#c5f36b', input: 'MG-30 USB', inputRoute: 'usb-ch1-2-stereo' },
  { id: 'bass', name: 'Bass', shortName: 'BASS', color: '#bd83f5', input: 'MG-30 USB', inputRoute: 'usb-ch1-2-stereo' },
  { id: 'vocals', name: 'Vocals', shortName: 'VOCALS', color: '#edc85b', input: 'MG-30 USB', inputRoute: 'usb-ch1-2-stereo' },
]);

export function selectUsbChannelPositions(capturedMask, requestedMask) {
  const actualMask = Number(capturedMask) >>> 0;
  const desiredMask = Number(requestedMask) >>> 0;
  const requiredBits = [];
  for (let bit = 0; bit < 8; bit += 1) {
    if ((desiredMask & (1 << bit)) !== 0) requiredBits.push(1 << bit);
  }
  if (!requiredBits.length || requiredBits.length > 2) {
    throw new RangeError('USB input route must select one mono channel or one stereo pair.');
  }
  const positions = [];
  let sourcePosition = 0;
  for (let bit = 0; bit < 8; bit += 1) {
    if ((actualMask & (1 << bit)) === 0) continue;
    if ((desiredMask & (1 << bit)) !== 0) positions.push(sourcePosition);
    sourcePosition += 1;
  }
  if (positions.length !== requiredBits.length) {
    throw new Error('The MG-30 USB capture does not contain the channel(s) selected for this track.');
  }
  return positions;
}

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
      inputRoute: track.inputRoute,
      gain: 1,
      pan: 0,
      mute: false,
      solo: false,
      armed: track.id === 'guitar',
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
      const fades = normalizeClipFades(durationSeconds, clip.fadeInSeconds, clip.fadeOutSeconds);
      return {
        id: String(clip.id || makeId('clip')).slice(0, 100),
        mediaId: String(clip.mediaId).slice(0, 120),
        name: String(clip.name || 'Audio clip').slice(0, 120),
        startSeconds,
        sourceOffsetSeconds,
        durationSeconds,
        fadeInSeconds: fades.fadeInSeconds,
        fadeOutSeconds: fades.fadeOutSeconds,
        sampleRate: Math.max(8000, Math.min(384000, Number(clip.sampleRate) || 48000)),
        channels: Math.max(1, Math.min(8, Math.round(Number(clip.channels) || 2))),
        captureMode: ['normal', 'loopback', 'multichannel', 'file'].includes(clip.captureMode) ? clip.captureMode : 'file',
        channelIndexMask: Math.max(0, Math.min(255, Math.round(Number(clip.channelIndexMask) || 0))),
        inputChannelMask: Math.max(0, Math.min(255, Math.round(Number(clip.inputChannelMask) || 0))),
        inputRoute: DAW_INPUT_ROUTES.some((route) => route.id === (clip.inputRoute === 'usb-loopback-3-4-stereo' ? 'usb-wet-sync-3-4-stereo' : clip.inputRoute))
          ? (clip.inputRoute === 'usb-loopback-3-4-stereo' ? 'usb-wet-sync-3-4-stereo' : clip.inputRoute) : 'file',
        waveform: Array.isArray(clip.waveform) ? clip.waveform.slice(0, 128).map((value) => Math.max(0, Math.min(100, Number(value) || 0))) : [],
      };
    }).filter(Boolean) : [];
    return {
      id: definition.id,
      name: String(source.name || definition.name).slice(0, 40),
      color: definition.color,
      input: String(source.input || definition.input).slice(0, 80),
      inputRoute: DAW_INPUT_ROUTES.some((route) => route.id === (source.inputRoute === 'usb-loopback-3-4-stereo' ? 'usb-wet-sync-3-4-stereo' : source.inputRoute))
        ? (source.inputRoute === 'usb-loopback-3-4-stereo' ? 'usb-wet-sync-3-4-stereo' : source.inputRoute) : definition.inputRoute,
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
    legacyLoopbackClips: normalizeArchivedLoopbackClips(input, tracks),
    tracks: normalizedTracks,
  };
}

 
function normalizeArchivedLoopbackClips(input, tracks) {
  const priorArchive = Array.isArray(input.legacyLoopbackClips)
    ? input.legacyLoopbackClips
    : (tracks.find((track) => track && track.id === 'loopback')?.clips || []);
  return priorArchive.slice(0, 512).map((clip) => {
    if (!clip || typeof clip !== 'object' || !String(clip.mediaId || '')) return null;
    const startSeconds = Math.max(0, Number(clip.startSeconds) || 0);
    const sourceOffsetSeconds = Math.max(0, Number(clip.sourceOffsetSeconds) || 0);
    const durationSeconds = Math.max(0, Number(clip.durationSeconds) || 0);
    if (!Number.isFinite(startSeconds + sourceOffsetSeconds + durationSeconds) || durationSeconds <= 0) return null;
    const fades = normalizeClipFades(durationSeconds, clip.fadeInSeconds, clip.fadeOutSeconds);
    return {
      ...clip,
      id: String(clip.id || makeId('clip')).slice(0, 100),
      mediaId: String(clip.mediaId).slice(0, 120),
      name: String(clip.name || 'Archived Loopback clip').slice(0, 120),
      startSeconds,
      sourceOffsetSeconds,
      durationSeconds,
      ...fades,
      sampleRate: Math.max(8000, Math.min(384000, Number(clip.sampleRate) || 48000)),
      channels: Math.max(1, Math.min(8, Math.round(Number(clip.channels) || 2))),
      captureMode: ['normal', 'loopback', 'multichannel', 'file'].includes(clip.captureMode) ? clip.captureMode : 'loopback',
      channelIndexMask: Math.max(0, Math.min(255, Math.round(Number(clip.channelIndexMask) || 0))),
      inputChannelMask: Math.max(0, Math.min(255, Math.round(Number(clip.inputChannelMask) || 0))),
      inputRoute: clip.inputRoute === 'usb-loopback-3-4-stereo' ? 'usb-wet-sync-3-4-stereo'
        : (DAW_INPUT_ROUTES.some((route) => route.id === clip.inputRoute) ? clip.inputRoute : 'usb-wet-sync-3-4-stereo'),
      waveform: Array.isArray(clip.waveform) ? clip.waveform.slice(0, 128).map((value) => Math.max(0, Math.min(100, Number(value) || 0))) : [],
    };
  }).filter(Boolean);
}


const MIN_CLIP_SECONDS = 0.05;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function normalizeClipFades(durationSeconds, fadeInSeconds = 0, fadeOutSeconds = 0) {
  const duration = Math.max(MIN_CLIP_SECONDS, Number(durationSeconds) || MIN_CLIP_SECONDS);
  let fadeIn = clamp(fadeInSeconds, 0, duration);
  let fadeOut = clamp(fadeOutSeconds, 0, duration);
  const total = fadeIn + fadeOut;
  if (total > duration && total > 0) {
    const factor = duration / total;
    fadeIn *= factor;
    fadeOut *= factor;
  }
  return { fadeInSeconds: fadeIn, fadeOutSeconds: fadeOut };
}

export function trimClipStart(clip, deltaSeconds, sourceDurationSeconds, minimumSeconds = MIN_CLIP_SECONDS) {
  if (!clip || !Number.isFinite(Number(deltaSeconds))) throw new TypeError('A clip and finite trim delta are required.');
  const sourceDuration = Math.max(minimumSeconds, Number(sourceDurationSeconds) || Number(clip.sourceOffsetSeconds) + Number(clip.durationSeconds));
  const originalStart = Math.max(0, Number(clip.startSeconds) || 0);
  const originalOffset = Math.max(0, Number(clip.sourceOffsetSeconds) || 0);
  const originalDuration = Math.max(minimumSeconds, Number(clip.durationSeconds) || minimumSeconds);
  const maxOffset = Math.max(0, Math.min(sourceDuration - minimumSeconds, originalOffset + originalDuration - minimumSeconds));
  const minimumDelta = -Math.min(originalOffset, originalStart);
  const maximumDelta = Math.max(0, maxOffset - originalOffset);
  const appliedDelta = clamp(deltaSeconds, minimumDelta, maximumDelta);
  const nextOffset = originalOffset + appliedDelta;
  const nextDuration = originalDuration - appliedDelta;
  const next = { ...clip, startSeconds: Math.max(0, originalStart + appliedDelta), sourceOffsetSeconds: nextOffset, durationSeconds: nextDuration };
  const fades = normalizeClipFades(nextDuration, clip.fadeInSeconds, clip.fadeOutSeconds);
  return { ...next, ...fades };
}

export function trimClipEnd(clip, deltaSeconds, sourceDurationSeconds, minimumSeconds = MIN_CLIP_SECONDS) {
  if (!clip || !Number.isFinite(Number(deltaSeconds))) throw new TypeError('A clip and finite trim delta are required.');
  const sourceDuration = Math.max(minimumSeconds, Number(sourceDurationSeconds) || Number(clip.sourceOffsetSeconds) + Number(clip.durationSeconds));
  const sourceOffset = Math.max(0, Number(clip.sourceOffsetSeconds) || 0);
  const originalDuration = Math.max(minimumSeconds, Number(clip.durationSeconds) || minimumSeconds);
  const available = Math.max(minimumSeconds, sourceDuration - sourceOffset);
  const durationSeconds = clamp(originalDuration + Number(deltaSeconds), minimumSeconds, available);
  const next = { ...clip, durationSeconds };
  const fades = normalizeClipFades(durationSeconds, clip.fadeInSeconds, clip.fadeOutSeconds);
  return { ...next, ...fades };
}

export function splitClipAt(clip, splitAtSeconds) {
  if (!clip || !Number.isFinite(Number(splitAtSeconds))) throw new TypeError('A clip and finite split position are required.');
  const start = Math.max(0, Number(clip.startSeconds) || 0);
  const duration = Math.max(0, Number(clip.durationSeconds) || 0);
  const end = start + duration;
  const splitAt = Number(splitAtSeconds);
  if (splitAt <= start + MIN_CLIP_SECONDS || splitAt >= end - MIN_CLIP_SECONDS) return null;
  const leftDuration = splitAt - start;
  const rightDuration = end - splitAt;
  const offset = splitAt - start;
  const leftFades = normalizeClipFades(leftDuration, clip.fadeInSeconds, 0);
  const rightFades = normalizeClipFades(rightDuration, 0, clip.fadeOutSeconds);
  return {
    left: { ...clip, durationSeconds: leftDuration, ...leftFades },
    right: {
      ...clip,
      id: makeId('clip'),
      name: String(clip.name || 'Audio clip') + ' (split)',
      startSeconds: splitAt,
      sourceOffsetSeconds: Math.max(0, Number(clip.sourceOffsetSeconds) || 0) + offset,
      durationSeconds: rightDuration,
      ...rightFades,
    },
  };
}

export function clipFadeGainAt(clip, elapsedSeconds) {
  const duration = Math.max(0, Number(clip?.durationSeconds) || 0);
  const elapsed = clamp(elapsedSeconds, 0, duration);
  const fadeIn = Math.max(0, Number(clip?.fadeInSeconds) || 0);
  const fadeOut = Math.max(0, Number(clip?.fadeOutSeconds) || 0);
  const fadeInGain = fadeIn > 0 ? clamp(elapsed / fadeIn, 0, 1) : 1;
  const remaining = duration - elapsed;
  const fadeOutGain = fadeOut > 0 ? clamp(remaining / fadeOut, 0, 1) : 1;
  return fadeInGain * fadeOutGain;
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


/**
 * Build a compact, symmetrical DAW waveform from decoded audio samples.
 * Peak preserves transients while RMS keeps sustained, quieter material visible.
 */
export function analyzeWaveformPeaks(firstChannel, secondChannel = firstChannel, count = 128) {
  const first = firstChannel && Number.isFinite(firstChannel.length) ? firstChannel : [];
  const second = secondChannel && Number.isFinite(secondChannel.length) ? secondChannel : first;
  if (!first.length) return [];

  const bins = Math.max(16, Math.min(256, Math.round(Number(count) || 128)));
  const result = [];
  for (let index = 0; index < bins; index += 1) {
    const start = Math.floor(index * first.length / bins);
    const end = Math.min(first.length, Math.max(start + 1, Math.floor((index + 1) * first.length / bins)));
    let peak = 0;
    let squareSum = 0;
    let samples = 0;
    for (let sample = start; sample < end; sample += 1) {
      const left = Number(first[sample]) || 0;
      const right = sample < second.length ? (Number(second[sample]) || 0) : left;
      peak = Math.max(peak, Math.abs(left), Math.abs(right));
      squareSum += (left * left + right * right) * 0.5;
      samples += 1;
    }
    const rms = samples ? Math.sqrt(squareSum / samples) : 0;
    const amplitude = Math.min(1, Math.max(peak * 0.9, rms * 1.7));
    result.push(Math.max(3, Math.min(100, Math.round(amplitude * 100))));
  }
  return result;
}
