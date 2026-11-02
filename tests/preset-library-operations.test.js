import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMG30PresetName,
  readMG30PresetName,
  validateMG30PresetReadParts,
  renameMG30PresetParts,
  prepareMG30SaveAsParts,
  createMG30PresetSlotBackup,
} from "../www/preset-library-operations.js";

function bitSlot(body, slot) {
  const start = 6 + 21 * Math.floor(slot / 2) + 8 * (slot % 2);
  let value = 0;
  for (let bit = 0; bit < 7; bit++) {
    const position = start + bit;
    value = (value << 1) |
      ((body[7 + Math.floor(position / 7)] >> (6 - (position % 7))) & 1);
  }
  return value;
}

function setBitSlot(body, slot, value) {
  const start = 6 + 21 * Math.floor(slot / 2) + 8 * (slot % 2);
  for (let bit = 0; bit < 7; bit++) {
    const position = start + bit;
    const index = 7 + Math.floor(position / 7);
    const shift = 6 - (position % 7);
    const nextBit = (value >> (6 - bit)) & 1;
    body[index] = (body[index] & ~(1 << shift)) | (nextBit << shift);
  }
}

function makeParts(command = 0x0b, program = 7) {
  return Array.from({ length: 3 }, (_, part) => {
    const body = new Uint8Array(220);
    body.set([0x43, 0x58, 0x70, command, 0x02, program, part]);
    return body;
  });
}

function setName(body, name) {
  for (let i = 0; i < 16; i++) setBitSlot(body, 106 + i, i < name.length ? name.charCodeAt(i) : 0);
}

test("preset names accept printable ASCII up to 16 characters", () => {
  assert.equal(normalizeMG30PresetName("  Clean  "), "Clean");
  assert.equal(normalizeMG30PresetName("ABCDEFGHIJKLMNOP"), "ABCDEFGHIJKLMNOP");
  assert.throws(() => normalizeMG30PresetName(""), /tidak boleh kosong/);
  assert.throws(() => normalizeMG30PresetName("12345678901234567"), /maksimal 16/);
  assert.throws(() => normalizeMG30PresetName("Crème"), /ASCII/);
  assert.throws(() => normalizeMG30PresetName("Line\nBreak"), /ASCII/);
});

test("stored name is decoded from the Gen2 packed preset name bits", () => {
  const parts = makeParts();
  setName(parts[0], "TEST CLEAN");
  assert.equal(readMG30PresetName(parts[0]), "TEST CLEAN");
});

test("stored readback requires three matching slot/scene headers", () => {
  const parts = makeParts(0x0b, 7);
  assert.equal(validateMG30PresetReadParts(parts, 0x0b, 7).length, 3);
  assert.throws(() => validateMG30PresetReadParts(parts, 0x0b, 8), /Header readback/);
  const invalid = parts.map(part => part.slice());
  invalid[2][6] = 1;
  assert.throws(() => validateMG30PresetReadParts(invalid, 0x0b, 7), /Header readback/);
});

test("Rename changes only the packed name in scene 1 and keeps source readback intact", () => {
  const source = makeParts(0x0b, 7);
  setName(source[0], "OLD NAME");
  source[1][205] = 55;
  const renamed = renameMG30PresetParts(source, "NEW NAME");
  assert.equal(readMG30PresetName(renamed[0]), "NEW NAME");
  assert.equal(readMG30PresetName(source[0]), "OLD NAME");
  assert.equal(renamed[1][205], 55);
  assert.deepEqual([...renamed[1]], [...source[1]]);
  assert.deepEqual([...renamed[2]], [...source[2]]);
});

test("Save As applies the new name and selected scene chain order without mutating source", () => {
  const source = makeParts(0x0c, 0);
  setName(source[0], "SOURCE");
  const sourceBefore = source.map(part => [...part]);
  const order = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 10, 11];
  const result = prepareMG30SaveAsParts(source, "COPY A", 2, order);
  assert.equal(readMG30PresetName(result[0]), "COPY A");
  assert.equal(readMG30PresetName(source[0]), "SOURCE");
  order.forEach((id, index) => assert.equal(bitSlot(result[2], 94 + index), id));
  assert.equal(bitSlot(result[0], 94), 0);
  assert.deepEqual(source.map(part => [...part]), sourceBefore);
});

test("Save As rejects invalid scene and incomplete/duplicate chain order", () => {
  const source = makeParts(0x0c, 0);
  assert.throws(() => prepareMG30SaveAsParts(source, "COPY", 3, Array.from({length:12}, (_,i)=>i)), /Scene aktif/);
  assert.throws(() => prepareMG30SaveAsParts(source, "COPY", 0, Array(12).fill(1)), /signal chain/);
});

test("raw destination backup remains JSON serializable and records its limitation", () => {
  const parts = makeParts(0x0b, 9);
  const backup = createMG30PresetSlotBackup({
    program: 9, label: "03B", parts, operation: "save-as", sourceProgram: 7,
    createdAt: "2026-11-02T00:00:00.000Z"
  });
  const restored = JSON.parse(JSON.stringify(backup));
  assert.equal(restored.targetProgram, 9);
  assert.equal(restored.targetLabel, "03B");
  assert.equal(restored.parts.length, 3);
  assert.equal(restored.parts[0].length, 220);
  assert.match(restored.restoreSupport, /no in-app restore/);
});
