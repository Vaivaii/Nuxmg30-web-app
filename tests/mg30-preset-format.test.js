import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMG30SinglePresetPatch,
  parseMG30SinglePresetPatch,
  parseMG30AllPresetPatch,
  buildMG30SinglePresetImportPlan,
  fitMG30QuickToneIRName,
} from '../www/mg30-preset-format.js';

function makeRecord(resourceName) {
  return {
    recordOrdinal: 9,
    scenes: Array.from({ length: 3 }, (_, index) => ({
      index,
      words: Uint16Array.from({ length: 71 }, (_, word) => (index * 71 + word) & 0xffff),
    })),
    resourceName,
    samples: Float32Array.from({ length: 2048 }, (_, i) => Math.fround((i - 1024) / 2048)),
    curve: Uint16Array.from({ length: 600 }, (_, i) => i % 306),
  };
}

test('single-preset file preserves the full 32-byte QuickTone IR name field', () => {
  const source = makeRecord('LONG_IR_NAME_1234567890123456789');
  assert.equal(new TextEncoder().encode(source.resourceName).length, 32);
  const bytes = buildMG30SinglePresetPatch(source);
  const parsed = parseMG30SinglePresetPatch(bytes);
  const plan = buildMG30SinglePresetImportPlan(parsed, 10);

  assert.equal(String.fromCharCode(...bytes.subarray(0x1b2, 0x1d2)), source.resourceName);
  assert.equal(parsed.resourceName, source.resourceName);
  assert.equal(plan.resourceName, source.resourceName);
  assert.equal(plan.steps[0].kind, 'ir-name');
  assert.equal(plan.steps[0].command, 0x09);
  assert.equal(plan.steps[0].body.length, 60);
  assert.equal(plan.steps.length, 78);
  assert.equal(parsed.samples.length, 2048);
  assert.equal(parsed.curve.length, 600);
});

test('the 18-byte built-in IR name in the user report remains unchanged through export and import plan', () => {
  const originalName = 'YA DXVB 112 Mix 10';
  assert.equal(new TextEncoder().encode(originalName).length, 18);

  const quickToneName = fitMG30QuickToneIRName(originalName);
  assert.equal(quickToneName, originalName);

  const bytes = buildMG30SinglePresetPatch(makeRecord(quickToneName));
  const parsed = parseMG30SinglePresetPatch(bytes);
  const plan = buildMG30SinglePresetImportPlan(parsed, 10);

  assert.equal(parsed.resourceName, originalName);
  assert.equal(plan.resourceName, originalName);
  assert.equal(plan.steps[0].body.length, 60);
});

test('names longer than 32 ASCII bytes are limited to the first 32 bytes', () => {
  const name = 'NAME12345678901234567890123456789012';
  assert.equal(new TextEncoder().encode(name).length, 36);
  const fitted = fitMG30QuickToneIRName(name);
  assert.equal(fitted, name.slice(0, 32));
  assert.equal(new TextEncoder().encode(fitted).length, 32);

  const parsed = parseMG30SinglePresetPatch(buildMG30SinglePresetPatch(makeRecord(fitted)));
  assert.equal(parsed.resourceName, fitted);
});

test('QuickTone name fitting rejects unsupported characters', () => {
  assert.throws(() => fitMG30QuickToneIRName('IR_ÜBER_LONG_NAME'), /ASCII printable/);
});


test('all-preset parser validates 128 ordered records and only parses resources on marked records', () => {
  const resourcePrograms = new Set([0,1,2,3,6,7,8,9,10,11,12,13,14,15,17,22,27,31,80,81,82,83,91,109,110,111,115]);
  const chunks = [];
  for (let program = 0; program < 128; program++) {
    if (resourcePrograms.has(program)) {
      const source = makeRecord('IR_' + program);
      source.recordOrdinal = program;
      const bytes = buildMG30SinglePresetPatch(source);
      // Program 91 is a captured resource-bearing record with a nonstandard RIFF signature.
      if (program === 91) bytes.set([0x4A,0x55,0x4E,0x4B], 0x1D2);
      chunks.push(bytes);
    } else {
      const bytes = new Uint8Array(0x26AE);
      const view = new DataView(bytes.buffer);
      view.setUint32(0, program, true);
      for (let scene = 0; scene < 3; scene++) {
        for (let word = 0; word < 71; word++) {
          view.setUint16(4 + scene * 142 + word * 2, (program + scene + word) & 0xffff, true);
        }
      }
      view.setUint32(0x1AE, 0, true);
      chunks.push(bytes);
    }
  }
  const allBytes = new Uint8Array(128 * 0x26AE);
  chunks.forEach((chunk, index) => allBytes.set(chunk, index * 0x26AE));

  const parsed = parseMG30AllPresetPatch(allBytes);
  assert.equal(parsed.records.length, 128);
  assert.deepEqual(parsed.resourcePrograms, [...resourcePrograms]);
  assert.equal(parsed.records[0].resourceName, 'IR_0');
  assert.equal(parsed.records[4].hasResource, false);
  assert.equal(parsed.records[4].samples, undefined);
  assert.equal(parsed.records[91].resourceName, 'IR_91');
  assert.equal(parsed.records[91].samples.length, 2048);
  assert.equal(parsed.records[91].curve.length, 600);
  assert.throws(() => parseMG30SinglePresetPatch(allBytes), /128 preset sekaligus/);
});

test('all-preset parser rejects wrong size, reordered ordinals, invalid markers and invalid resource arrays', () => {
  const resourcePrograms = new Set([0,1,2,3,6,7,8,9,10,11,12,13,14,15,17,22,27,31,80,81,82,83,91,109,110,111,115]);
  const chunks = [];
  for (let program = 0; program < 128; program++) {
    const bytes = new Uint8Array(0x26AE);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, program, true);
    for (let scene = 0; scene < 3; scene++) {
      for (let word = 0; word < 71; word++) view.setUint16(4 + scene * 142 + word * 2, word, true);
    }
    view.setUint32(0x1AE, resourcePrograms.has(program) ? 1 : 0, true);
    if (resourcePrograms.has(program)) {
      bytes.set(new TextEncoder().encode('IR_' + program), 0x1B2);
      const sampleView = new DataView(bytes.buffer);
      for (let i = 0; i < 2048; i++) sampleView.setFloat32(0x1FE + i * 4, 0.1, true);
      for (let i = 0; i < 600; i++) sampleView.setUint16(0x21FE + i * 2, i % 306, true);
    }
    chunks.push(bytes);
  }
  const allBytes = new Uint8Array(128 * 0x26AE);
  chunks.forEach((chunk, index) => allBytes.set(chunk, index * 0x26AE));
  assert.throws(() => parseMG30AllPresetPatch(allBytes.subarray(0, -1)), /tepat/);

  const reordered = allBytes.slice();
  reordered.set(chunks[1], 0);
  assert.throws(() => parseMG30AllPresetPatch(reordered), /tidak berurutan/);

  const invalidMarker = allBytes.slice();
  new DataView(invalidMarker.buffer).setUint32(0x1AE, 2, true);
  assert.throws(() => parseMG30AllPresetPatch(invalidMarker), /Penanda resource/);

  const invalidCurve = allBytes.slice();
  new DataView(invalidCurve.buffer).setUint16(0x21FE, 306, true);
  assert.throws(() => parseMG30AllPresetPatch(invalidCurve), /Nilai kurva/);
});
