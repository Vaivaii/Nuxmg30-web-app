import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const exportSource = await readFile(new URL("../www/mg30-preset-export.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../www/index.html", import.meta.url), "utf8");

test("Export Single checks the session manager before invoking live readback", () => {
  assert.match(exportSource, /async function readSingleWithManagerCache/);
  assert.match(exportSource, /presetManagerCache\.get\(program\)/);
  assert.match(exportSource, /bridge\.readSingle\(onProgress/);
  assert.match(exportSource, /presetManagerCache\.store\(program, readback/);
});

test("Export All reuses fresh cache entries and reads only misses or stale slots", () => {
  assert.match(exportSource, /let readback = presetManagerCache\.get\(program\)/);
  assert.match(exportSource, /cacheHits \+= 1/);
  assert.match(exportSource, /await bridge\.selectProgramForRead\(program\)/);
  assert.match(exportSource, /readSingleWithManagerCache\(bridge, program/);
  assert.match(exportSource, /changedProgram/);
});

test("cache session starts on app connection and resets after disconnect", () => {
  assert.match(exportSource, /mg30-midi-connected/);
  assert.match(exportSource, /mg30-midi-connection-state/);
  assert.match(exportSource, /mg30-native-midi-state/);
  assert.match(appSource, /mg30-midi-connection-state/);
});

test("preset writes and parameter CC changes invalidate cached records", () => {
  assert.match(appSource, /invalidatePresetManagerCacheForWrite/);
  assert.match(appSource, /invalidate\(program,"Perintah tulis preset MG-30/);
  assert.match(appSource, /invalidateAll\("Perubahan resource IR/);
  assert.match(appSource, /invalidate\(targetSlot,"Parameter atau switch blok/);
});

test("NAM and Collection command families are outside the preset-cache invalidation helper", () => {
  const helper = appSource.match(/function invalidatePresetManagerCacheForWrite[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(helper.length > 0);
  assert.doesNotMatch(helper, /command===0x58|command===0x6A|command===0x6B|command===0x6C/);
});
