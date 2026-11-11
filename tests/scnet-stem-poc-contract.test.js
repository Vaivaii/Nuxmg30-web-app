import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCNET_MODEL, validateModelArtifact, validateStemSet } from '../stem-poc/scnet-contract.js';

test('SCNet model pin is explicit and reproducible', () => {
  assert.equal(SCNET_MODEL.expectedBytes, 12900277);
  assert.equal(SCNET_MODEL.file, 'scnet.int8.onnx');
  assert.match(SCNET_MODEL.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(SCNET_MODEL.stems, ['vocals', 'drums', 'bass', 'other']);
});

test('model artifact validator rejects wrong byte count and checksum', () => {
  const bytes = new Uint8Array([1, 2, 3]);
  assert.throws(() => validateModelArtifact(bytes, '00000000'), /size mismatch/i);
  const fullSizeWrongModel = new Uint8Array(SCNET_MODEL.expectedBytes);
  fullSizeWrongModel.fill(1);
  assert.throws(() => validateModelArtifact(fullSizeWrongModel, '0000000000000000000000000000000000000000000000000000000000000000'), /sha-256 mismatch/i);
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

test('Android POC keeps SessionOptions alive for the full OrtSession lifetime', () => {
  const source = readFileSync(new URL('../native-android/MG30StemPocPlugin.java', import.meta.url), 'utf8');
  assert.match(source, /private OrtSession\\.SessionOptions sessionOptions;/);
  assert.match(source, /sessionOptions = newOptions;/);
  const closeSession = source.indexOf('try { session.close(); }');
  const closeOptions = source.indexOf('try { sessionOptions.close(); }');
  assert.ok(closeSession >= 0 && closeOptions > closeSession, 'session must close before its SessionOptions');
});

test('Android initializer wires the POC plugin exactly once and pins ORT', () => {
  const source = readFileSync(new URL('../scripts/init-android.mjs', import.meta.url), 'utf8');
  assert.equal(source.split("copyFileSync(resolve(root, 'native-android/MG30StemPocPlugin.java'").length - 1, 1);
  assert.equal(source.split('registerPlugin(MG30StemPocPlugin.class)').length - 1, 1);
  assert.match(source, /com\\.microsoft\\.onnxruntime:onnxruntime-android:1\\.31\\.1/);
  assert.equal(source.split('const appGradlePath').length - 1, 1, 'Gradle injection must remain idempotent');
});
