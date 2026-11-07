import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridgeSource = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
const importUiSource = await readFile(new URL("../www/mg30-preset-import.js", import.meta.url), "utf8");
const allImportStart = bridgeSource.indexOf(" async importAll(plan,onProgress=()=>{}){");
assert.ok(allImportStart >= 0, "native Import All bridge should exist");
const allImportEnd = bridgeSource.indexOf("\n }\n});", allImportStart);
assert.ok(allImportEnd > allImportStart, "native Import All bridge should close cleanly");
const allImportBridge = bridgeSource.slice(allImportStart, allImportEnd);

test("native Import All validates variable IR group count and dynamic total frames", () => {
  assert.match(allImportBridge, /expectedFrames=resourcePrograms\?387\+resourcePrograms\.length\*75:0/);
  assert.match(allImportBridge, /plan\.totalFrames!==expectedFrames/);
  assert.match(allImportBridge, /irWaveCount!==resourcePrograms\.length\*64/);
  assert.match(allImportBridge, /irCurveCount!==resourcePrograms\.length\*10/);
  assert.match(allImportBridge, /sceneCount!==384/);
  assert.match(allImportBridge, /total:plan\.totalFrames/);
  assert.doesNotMatch(allImportBridge, /2412/);
});

test("Import All summary appears only in the confirmation popup, not as a persistent button or label", async () => {
  const html = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /presetImportAllRun/);
  assert.doesNotMatch(importUiSource, /allRun|presetImportAllRun/);
  assert.ok(importUiSource.includes("START IMPORT ALL · "));
  assert.ok(importUiSource.includes("presets are ready to import."));
  assert.ok(importUiSource.includes("presets include embedded IR resources."));
  assert.ok(importUiSource.includes("finally {\\n      clearAllImportSelection();"));
  assert.ok(importUiSource.includes("clearAllImportSelection();"));
});

test("Import All UI displays parsed resource count and uses the plan frame total", () => {
  assert.ok(importUiSource.includes('const irPresetCount = parsedAll.resourcePrograms.length;'));
  assert.ok(importUiSource.includes("irPresetCount.toLocaleString('en-US')"));
  assert.match(importUiSource, /progressTotal = plan\.totalFrames/);
  assert.match(importUiSource, /plan\.totalFrames, 5000/);
  assert.doesNotMatch(importUiSource, /27 preset membawa resource IR/);
  assert.match(importUiSource, /completed\.toLocaleString\('en-US'\)/);
  assert.match(importUiSource, /progressDone\.hidden = false/);
  assert.match(importUiSource, /window\.alert\(copy\)/);
  assert.match(bridgeSource, /phase:'Verifying readback'/);
  assert.match(bridgeSource, /const phase=currentStep\.kind==='ir-name'\?'IR name':currentStep\.kind==='ir-waveform'\?'IR waveform':currentStep\.kind==='ir-curve'\?'IR curve':'Preset scene'/);
  assert.match(bridgeSource, /currentStep=null;\s*setDeviceStatus\(acknowledged\.toLocaleString\('en-US'\)/);
  assert.doesNotMatch(importUiSource, /progressTotal = 2412/);
});
