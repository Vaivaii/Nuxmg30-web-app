import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const exportSource = await readFile(new URL("../www/mg30-preset-export.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
const irTransferSource = await readFile(new URL("../www/ir-transfer.js", import.meta.url), "utf8");

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


const presetLibrarySource = await readFile(new URL("../www/preset-library-ui.js", import.meta.url), "utf8");

test("Preset Manager sync is name-only and does not warm the full export cache", () => {
  assert.match(presetLibrarySource, /return readPresetName\(body\)/);
  assert.match(presetLibrarySource, /Object\.keys\(names\)\.length >= 128/);
  assert.doesNotMatch(presetLibrarySource, /MG30PresetManagerCaptureScanSlot|MG30PresetManagerCache|MG30NativeStartupSyncComplete/);
});

test("Import and Export dropdowns preserve the existing single/all action IDs", () => {
  assert.match(appSource, /id="presetImportMenuToggle"/);
  assert.match(appSource, /id="presetImportMenuDropdown"/);
  assert.match(appSource, /id="presetImportChoose"/);
  assert.match(appSource, /id="presetImportAllChoose"/);
  assert.match(appSource, /id="presetExportMenuToggle"/);
  assert.match(appSource, /id="presetExportMenuDropdown"/);
  assert.match(appSource, /id="presetExportStart"/);
  assert.match(appSource, /id="presetExportAllStart"/);
  assert.match(presetLibrarySource, /closeActionMenus/);
});


test("Export All uses per-slot RAM cache before selecting or reading the pedal", () => {
  const loop = exportSource.match(/for \(let program = 0; program < 128; program\+\+\) \{[\s\S]*?records\.push\(record\);/)?.[0] || "";
  assert.ok(loop.length > 0);
  assert.ok(loop.indexOf("presetManagerCache.get(program)") < loop.indexOf("bridge.selectProgramForRead(program)"));
  assert.ok(loop.indexOf("presetManagerCache.get(program)") < loop.indexOf("readSingleWithManagerCache(bridge, program"));
  assert.match(loop, /if \(readback\) \{[\s\S]*?cacheHits \+= 1/);
});

test("Export All fast MIDI pacing is scoped to the bulk export operation", () => {
  assert.match(appSource, /EXPORT_ALL_MIDI_GAP=22/);
  assert.match(appSource, /EXPORT_PROGRAM_SETTLE_MS=25/);
  assert.match(appSource, /exportAllFastMidiMode\?EXPORT_ALL_MIDI_GAP:MIDI_GAP/);
  assert.match(appSource, /setExportFastMode\(enabled\)/);
  assert.match(exportSource, /bridge\.setExportFastMode\(true\)/);
  assert.match(exportSource, /if \(fastModeEnabled\) bridge\.setExportFastMode\(false\)/);
});

test("scene read requests remain response-gated by matching SysEx replies", () => {
  assert.match(appSource, /const pending=waitForSysEx\(match,timeout\)/);
  assert.match(appSource, /return await pending/);
  assert.match(appSource, /0x0C&&b\[4\]===0x02&&b\[5\]===program&&b\[6\]===part/);
});
