import test from 'node:test';
import assert from 'node:assert/strict';
import { SCNET_MODEL, validateModelArtifact, validateStemSet } from '../stem-poc/scnet-contract.js';

test('SCNet model pin is explicit and reproducible', () => {
  assert.equal(SCNET_MODEL.expectedBytes, 12900277);
  assert.match(SCNET_MODEL.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(SCNET_MODEL.stems, ['vocals', 'drums', 'bass', 'other']);
});

test('model artifact validator rejects wrong byte count and checksum', () => {
  const bytes = new Uint8Array([1, 2, 3]);
  assert.throws(() => validateModelArtifact(bytes, '00000000'), /size mismatch/i);
  assert.throws(() => validateModelArtifact(bytes, '0000000000000000000000000000000000000000000000000000000000000000'), /sha-256 mismatch/i);
});

test('four stem result validator requires matching format and duration', () => {
  const valid = Object.fromEntries(SCNET_MODEL.stems.map(name => [name, {
    sampleRate: 44100, channels: 2, frames: 441000, finite: true, peak: 0.95
  }]));
  assert.equal(validateStemSet(valid).valid, true);
  valid.bass.frames = 440999;
  assert.equal(validateStemSet(valid).valid, false);
  assert.match(validateStemSet(valid).errors.join(' '), /duration/i);
});
