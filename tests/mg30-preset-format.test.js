import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMG30SinglePresetPatch,
  parseMG30SinglePresetPatch,
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
