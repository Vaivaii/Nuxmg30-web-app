import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMG30AllPresetImportPlan } from '../www/mg30-preset-all-import.js';

function makeRecord(program, hasResource) {
  const record = {
    recordOrdinal: program,
    resourceMarker: hasResource ? 1 : 0,
    scenes: Array.from({length:3}, (_, index) => ({
      index,
      words: Uint16Array.from({length:71}, (_, word) => (program + index + word) & 0xffff),
    })),
  };
  if (hasResource) {
    record.resourceName = 'IR_' + program;
    record.samples = Float32Array.from({length:2048}, (_, i) => Math.fround((i - 1024) / 2048));
    record.curve = Uint16Array.from({length:600}, (_, i) => i % 306);
  }
  return record;
}

const resourcePrograms = new Set([0,1,2,3,6,7,8,9,10,11,12,13,14,15,17,22,27,31,80,81,82,83,91,109,110,111,115]);

test('Import All plan matches the captured 128-preset Gen2 transaction', () => {
  const records = Array.from({length:128}, (_, program) => makeRecord(program, resourcePrograms.has(program)));
  const plan = buildMG30AllPresetImportPlan(records);

  assert.equal(plan.totalFrames, 2412);
  assert.deepEqual(plan.resourcePrograms, [...resourcePrograms]);
  assert.equal(plan.steps[0].kind, 'all-import-open');
  assert.deepEqual(Array.from(plan.steps[0].body), [0x43,0x58,0x70,0x75,0x01,0x01,0,0,0,0,0,0,0]);
  assert.equal(plan.steps.at(-2).kind, 'all-import-finish');
  assert.deepEqual(Array.from(plan.steps.at(-2).body), [0x43,0x58,0x70,0x15,0x01,0x7f,0x03,0,0,0,0,0,0]);
  assert.equal(plan.steps.at(-1).kind, 'all-import-close');
  assert.deepEqual(Array.from(plan.steps.at(-1).body), [0x43,0x58,0x70,0x75,0x01,0,0,0,0,0,0,0,0]);

  const counts = new Map();
  for (const step of plan.steps) {
    const key = step.command.toString(16).padStart(2,'0') + '/' + step.body[4].toString(16).padStart(2,'0');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  assert.equal(counts.get('09/01'), 27);
  assert.equal(counts.get('10/01'), 1728);
  assert.equal(counts.get('11/01'), 270);
  assert.equal(counts.get('0b/01'), 384);
  assert.equal(counts.get('75/01'), 2);
  assert.equal(counts.get('15/01'), 1);
});

test('resource-bearing preset encodes the program address with the existing QuickTone uint16 packing', () => {
  const records = Array.from({length:128}, (_, program) => makeRecord(program, resourcePrograms.has(program)));
  const plan = buildMG30AllPresetImportPlan(records);
  const firstWaveForProgram91 = plan.steps.find(step =>
    step.kind === 'ir-waveform' && step.body[5] === 0x01 && step.body[6] === 0x36 && step.body[7] === 0);
  assert.ok(firstWaveForProgram91);
  assert.deepEqual(Array.from(firstWaveForProgram91.body.slice(5,8)), [0x01,0x36,0x00]); // encodeWord16(91)
});

test('Import All plan rejects missing, reordered, or unexpected resource records before sending', () => {
  const records = Array.from({length:128}, (_, program) => makeRecord(program, resourcePrograms.has(program)));
  assert.throws(() => buildMG30AllPresetImportPlan(records.slice(0,127)), /128 record/);
  const reordered = records.slice();
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  assert.throws(() => buildMG30AllPresetImportPlan(reordered), /Urutan record/);
  const missingResource = records.map((record, i) => i === 91 ? makeRecord(i, false) : record);
  assert.throws(() => buildMG30AllPresetImportPlan(missingResource), /27 preset/);
});

test('scene payloads retain all three 71-word scene parts for every preset', () => {
  const records = Array.from({length:128}, (_, program) => makeRecord(program, resourcePrograms.has(program)));
  const plan = buildMG30AllPresetImportPlan(records);
  const scenes = plan.steps.filter(step => step.kind === 'preset-scene');
  assert.equal(scenes.length, 384);
  assert.deepEqual(scenes.slice(0,3).map(step => [step.program,step.index]), [[0,0],[0,1],[0,2]]);
  assert.deepEqual(scenes.slice(-3).map(step => [step.program,step.index]), [[127,0],[127,1],[127,2]]);
});
