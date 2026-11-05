import test from "node:test";
import assert from "node:assert/strict";
import { createMG30PresetManagerCache } from "../www/mg30-preset-manager-cache.js";

function makeReadback(program, resource = false) {
  const sceneReplies = Array.from({ length: 3 }, (_, scene) => {
    const reply = new Uint8Array(220);
    reply.set([0x43, 0x58, 0x70, 0x0B, 0x02, program, scene]);
    return reply;
  });
  return {
    recordOrdinal: program,
    sceneReplies,
    resourceMarker: resource ? 1 : 0,
    resourceName: resource ? "CACHE_IR_" + program : "",
    samples: resource ? Float32Array.from({ length: 2048 }, (_, i) => i / 2048) : null,
    curve: resource ? Uint16Array.from({ length: 600 }, (_, i) => i % 306) : null,
    resourceIndex: program
  };
}

test("cache requires an active USB session and begins with 128 missing slots", () => {
  const cache = createMG30PresetManagerCache();
  assert.equal(cache.get(0), null);
  assert.throws(() => cache.store(0, makeReadback(0)), /sesi USB-MIDI/);
  cache.beginSession();
  const status = cache.getStatus();
  assert.equal(status.active, true);
  assert.equal(status.freshCount, 0);
  assert.equal(status.missingCount, 128);
  assert.equal(status.complete, false);
});

test("cache accepts a complete three-scene slot without an attached IR resource", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession();
  cache.store(12, makeReadback(12));
  const readback = cache.get(12);
  assert.equal(readback.recordOrdinal, 12);
  assert.equal(readback.resourceMarker, 0);
  assert.equal(readback.resourceName, "");
  assert.equal(readback.samples, null);
  assert.equal(readback.curve, null);
  assert.equal(cache.getStatus().freshCount, 1);
});

test("cache accepts resource-bearing slots only with full waveform and curve arrays", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession();
  cache.store(7, makeReadback(7, true));
  const readback = cache.get(7);
  assert.equal(readback.resourceMarker, 1);
  assert.equal(readback.resourceName, "CACHE_IR_7");
  assert.equal(readback.samples.length, 2048);
  assert.equal(readback.curve.length, 600);
});

test("cache clones readback data when storing and retrieving snapshots", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession();
  const source = makeReadback(3, true);
  cache.store(3, source);
  source.sceneReplies[0][0] = 0;
  source.samples[0] = 99;
  const first = cache.get(3);
  first.sceneReplies[1][0] = 0;
  first.samples[1] = 99;
  const second = cache.get(3);
  assert.equal(second.sceneReplies[0][0], 0x43);
  assert.equal(second.sceneReplies[1][0], 0x43);
  assert.notEqual(second.samples[0], 99);
  assert.notEqual(second.samples[1], 99);
});

test("cache rejects wrong slot, incomplete or mismatched scenes, and invalid resource payloads", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession();
  assert.throws(() => cache.store(4, makeReadback(5)), /Ordinal/);
  const noScene = makeReadback(4);
  noScene.sceneReplies.pop();
  assert.throws(() => cache.store(4, noScene), /tiga balasan scene/);
  const wrongScene = makeReadback(4);
  wrongScene.sceneReplies[1][6] = 2;
  assert.throws(() => cache.store(4, wrongScene), /Scene 2/);
  const incompleteResource = makeReadback(4, true);
  incompleteResource.curve = null;
  assert.throws(() => cache.store(4, incompleteResource), /600 nilai curve/);
  const emptyName = makeReadback(4, true);
  emptyName.resourceName = "";
  assert.throws(() => cache.store(4, emptyName), /nama IR/);
  assert.throws(() => cache.store(128, makeReadback(128)), /0–127/);
});

test("targeted invalidation prevents stale slot reuse while preserving other fresh slots", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession();
  cache.store(8, makeReadback(8, true));
  cache.store(9, makeReadback(9));
  assert.equal(cache.invalidate(8, "scene changed"), true);
  assert.equal(cache.get(8), null);
  assert.equal(cache.getSlotState(8).status, "stale");
  assert.equal(cache.getSlotState(8).invalidationReason, "scene changed");
  assert.notEqual(cache.get(9), null);
  assert.equal(cache.getStatus().freshCount, 1);
  assert.equal(cache.getStatus().staleCount, 1);
});

test("bank invalidation marks all cached slots stale", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession();
  cache.store(0, makeReadback(0));
  cache.store(127, makeReadback(127));
  assert.equal(cache.invalidateAll("Import All started"), 2);
  assert.equal(cache.get(0), null);
  assert.equal(cache.get(127), null);
  assert.equal(cache.getStatus().freshCount, 0);
  assert.equal(cache.getStatus().staleCount, 2);
});

test("a bank is complete only when all 128 records are fresh", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession();
  for (let program = 0; program < 128; program++) {
    cache.store(program, makeReadback(program, program === 1 || program === 80));
  }
  assert.equal(cache.getStatus().freshCount, 128);
  assert.equal(cache.getStatus().missingCount, 0);
  assert.equal(cache.getStatus().complete, true);
  const records = cache.getAll();
  assert.equal(records.length, 128);
  assert.equal(records[0].recordOrdinal, 0);
  assert.equal(records[127].recordOrdinal, 127);
  assert.equal(records[1].resourceMarker, 1);
});

test("new connection session resets snapshots from the prior session", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession("first");
  cache.store(22, makeReadback(22, true));
  assert.equal(cache.beginSession("first"), false);
  assert.equal(cache.get(22).resourceName, "CACHE_IR_22");
  assert.equal(cache.beginSession("second"), true);
  assert.equal(cache.get(22), null);
  assert.equal(cache.getStatus().missingCount, 128);
  assert.equal(cache.getStatus().generation, 2);
});

test("disconnect clears all cached records", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession();
  cache.store(1, makeReadback(1));
  assert.equal(cache.endSession("USB disconnected"), true);
  assert.equal(cache.get(1), null);
  assert.equal(cache.getStatus().active, false);
  assert.equal(cache.getStatus().freshCount, 0);
  assert.equal(cache.getStatus().missingCount, 128);
});


test("cache accepts QuickTone manager 0B/02 scene readbacks without a Program Change", () => {
  const cache = createMG30PresetManagerCache();
  cache.beginSession();
  const readback = makeReadback(37, true);
  assert.ok(readback.sceneReplies.every(reply => reply[3] === 0x0B && reply[4] === 0x02));
  cache.store(37, readback, { source: "QuickTone-manager-readback" });
  assert.equal(cache.get(37).sceneReplies[2][3], 0x0B);
});
