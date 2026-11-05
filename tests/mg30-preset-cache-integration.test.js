import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const exportSource = await readFile(new URL("../www/mg30-preset-export.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
const irTransferSource = await readFile(new URL("../www/ir-transfer.js", import.meta.url), "utf8");
const presetLibrarySource = await readFile(new URL("../www/preset-library-ui.js", import.meta.url), "utf8");

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


test("the direct Save-to-device helper invalidates cache after its 0B/01 and 07/01 writes", () => {
  assert.ok(appSource.includes("midiOutput.send(frame);invalidatePresetManagerCacheForWrite(frame)"));
});


test("successful User IR upload invalidates preset cache, while Collection transfer does not", () => {
  assert.match(irTransferSource, /plan\.target==='user'[^;]*mg30-user-ir-write-complete/);
  assert.match(irTransferSource, /target==='collection'\?/);
  assert.match(exportSource, /mg30-user-ir-write-complete/);
  assert.match(exportSource, /invalidateAll\('User IR upload selesai/);
});


test("Export All readback uses explicit metadata hasResource flag so placeholder names skip waveform and curve reads", () => {
  assert.match(appSource, /if\(metadata\.hasResource!==true\)/);
  assert.match(exportSource, /allowMissingResource: true/);
});

test("existing Preset Manager scan reuses its 0B/02 scene-zero reply to populate Export All cache", () => {
  assert.match(presetLibrarySource, /return \{ name: readPresetName\(body\), sceneReply0: Uint8Array\.from\(body\) \}/);
  assert.match(presetLibrarySource, /window\.MG30PresetManagerCaptureScanSlot/);
  assert.match(presetLibrarySource, /await captureSlot\(program, stored\.sceneReply0/);
  assert.match(exportSource, /initialSceneReply0: sceneReply0/);
  assert.match(appSource, /reusedPresetManagerScene0=true/);
  assert.match(appSource, /for\(let part=sceneReplies\.length;part<3;part\+\+\)/);
  assert.match(exportSource, /source: 'PresetManager-existing-name-scan'/);
});

test("full Preset Manager cache scan waits for Android NAM and Collection startup sync", () => {
  assert.match(presetLibrarySource, /MG30NativeStartupSyncComplete !== true/);
  assert.match(presetLibrarySource, /mg30-ir-collection-sync-complete/);
  assert.match(irTransferSource, /mg30-nam-sync-complete',async[\s\S]*?await syncCollectionFromDevice[\s\S]*?MG30NativeStartupSyncComplete=true/);
});
