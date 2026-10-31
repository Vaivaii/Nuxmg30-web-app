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

test('single-preset file preserves a valid 16-byte IR name and imports it as the same name', () => {
  const source = makeRecord('LONG_IR_ALIAS_16');
  assert.equal(new TextEncoder().encode(source.resourceName).length, 16);
  const bytes = buildMG30SinglePresetPatch(source);
  const parsed = parseMG30SinglePresetPatch(bytes);
  const plan = buildMG30SinglePresetImportPlan(parsed, 10);

  assert.equal(parsed.resourceName, source.resourceName);
  assert.equal(plan.resourceName, source.resourceName);
  assert.equal(plan.steps[0].kind, 'ir-name');
  assert.equal(plan.steps[0].command, 0x09);
  assert.equal(plan.steps.length, 78);
  assert.equal(parsed.samples.length, 2048);
  assert.equal(parsed.curve.length, 600);
});

test('long IR names use QuickTone first-16-byte behavior without an alias prompt', () => {
  const originalName = 'YA DXVB 112 Mix 10';
  assert.equal(new TextEncoder().encode(originalName).length, 18);

  const quickToneName = fitMG30QuickToneIRName(originalName);
  assert.equal(quickToneName, 'YA DXVB 112 Mix');
  assert.equal(new TextEncoder().encode(quickToneName).length, 15);

  const source = makeRecord(quickToneName);
  const bytes = buildMG30SinglePresetPatch(source);
  const parsed = parseMG30SinglePresetPatch(bytes);
  const plan = buildMG30SinglePresetImportPlan(parsed, 10);

  assert.equal(parsed.resourceName, quickToneName);
  assert.equal(plan.resourceName, quickToneName);
  assert.equal(plan.steps[0].kind, 'ir-name');
  assert.equal(plan.steps[0].command, 0x09);
  assert.equal(plan.steps.length, 78);
});

test('QuickTone name fitting keeps exactly the first 16 ASCII bytes and rejects unsupported characters', () => {
  const name = '1234567890ABCDEFZZ';
  assert.equal(fitMG30QuickToneIRName(name), '1234567890ABCDEF');
  assert.equal(new TextEncoder().encode(fitMG30QuickToneIRName(name)).length, 16);
  assert.throws(() => fitMG30QuickToneIRName('IR_ÜBER_LONG_NAME'), /ASCII printable/);
});
