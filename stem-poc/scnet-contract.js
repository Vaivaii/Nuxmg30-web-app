import { createHash } from 'node:crypto';

export const SCNET_MODEL = Object.freeze({
  id: 'audiojs/scnet',
  file: 'scnet.int8.onnx',
  expectedBytes: 12900277,
  sha256: '98228931494151762a1c4ab1ec7899a894b1f81fd4a509921a9d2f9bacc50845',
  sampleRate: 44100,
  segmentSeconds: 11,
  stems: Object.freeze(['vocals', 'drums', 'bass', 'other']),
  source: 'https://huggingface.co/audiojs/scnet'
});

export function validateModelArtifact(bytes, expectedSha256 = SCNET_MODEL.sha256) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Model artifact must be Uint8Array');
  if (bytes.byteLength !== SCNET_MODEL.expectedBytes) {
    throw new Error(`Model size mismatch: expected ${SCNET_MODEL.expectedBytes}, got ${bytes.byteLength}`);
  }
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== expectedSha256) throw new Error(`Model SHA-256 mismatch: ${actual}`);
  return { valid: true, bytes: bytes.byteLength, sha256: actual };
}

export function validateStemSet(stems) {
  const errors = [];
  for (const name of SCNET_MODEL.stems) {
    if (!stems || !stems[name]) errors.push(`Missing stem: ${name}`);
  }
  if (errors.length) return { valid: false, errors };
  const first = stems[SCNET_MODEL.stems[0]];
  for (const name of SCNET_MODEL.stems) {
    const item = stems[name];
    if (item.sampleRate !== first.sampleRate) errors.push(`Sample-rate mismatch: ${name}`);
    if (item.channels !== first.channels) errors.push(`Channel-layout mismatch: ${name}`);
    if (item.frames !== first.frames) errors.push(`Duration mismatch: ${name}`);
    if (item.finite !== true) errors.push(`Non-finite samples: ${name}`);
    if (!Number.isFinite(item.peak) || item.peak > 1) errors.push(`Invalid/clipped peak: ${name}`);
  }
  return { valid: errors.length === 0, errors };
}
