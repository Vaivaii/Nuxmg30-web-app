import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMG30SinglePresetPatch,
  parseMG30SinglePresetPatch,
  buildMG30SinglePresetImportPlan,
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
  const source = makeRecord('LONG_IR_ALIAS16');
  assert.equal(new TextEncoder().encode(source.resourceName).length, 15);
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

test('serializer refuses the original long device name until an explicit short alias is chosen', () => {
  const originalName = 'BUILTIN_IR_NAME_18';
  assert.equal(new TextEncoder().encode(originalName).length, 18);
  assert.throws(
    () => buildMG30SinglePresetPatch(makeRecord(originalName)),
    /1–16 byte ASCII printable/
  );

  const alias = 'BUILTIN_IR_18';
  const bytes = buildMG30SinglePresetPatch(makeRecord(alias));
  const parsed = parseMG30SinglePresetPatch(bytes);
  const plan = buildMG30SinglePresetImportPlan(parsed, 10);

  assert.equal(parsed.resourceName, alias);
  assert.equal(plan.resourceName, alias);
  assert.equal(plan.steps[0].kind, 'ir-name');
});
