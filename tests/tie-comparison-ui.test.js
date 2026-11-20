import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../www/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../www/studio-daw.css", import.meta.url), "utf8");
const ui = readFileSync(new URL("../www/tie-comparison-ui.js", import.meta.url), "utf8");
const engine = readFileSync(new URL("../www/tie-comparison-engine.js", import.meta.url), "utf8");

test("TIE Compare exposes independent A/B source, channel, alignment and audition controls", () => {
  for (const id of [
    "tieCompareSourceA", "tieCompareSourceB", "tieCompareFileA", "tieCompareFileB",
    "tieCompareChannelA", "tieCompareChannelB", "tieCompareFftSize",
    "tieCompareOffsetMs", "tieCompareLevelMatch", "tieCompareRunButton",
    "tieCompareCancelButton", "tieComparePlayA", "tieComparePlayB", "tieCompareStop",
  ]) assert.ok(html.includes('id="' + id + '"'), "missing Compare control: " + id);
  assert.ok(ui.includes("loadImportedAudioFile("));
  assert.ok(ui.includes("loadQuickRecordTake("));
  assert.ok(ui.includes("listQuickRecordSources("));
});

test("TIE Compare displays spectrum overlay, spectral difference, dynamics and a measurement report", () => {
  for (const id of [
    "tieCompareOverlayCanvas", "tieCompareDiffCanvas", "tieCompareDynamicCanvas",
    "tieCompareRmsA", "tieComparePeakB", "tieCompareCentroidDelta",
    "tieCompareReportMeta", "tieCompareLimitations",
  ]) assert.ok(html.includes('id="' + id + '"'), "missing Compare result: " + id);
  assert.ok(ui.includes("drawSpectrumOverlay("));
  assert.ok(ui.includes("drawSpectrumDifference("));
  assert.ok(ui.includes("drawDynamicEnvelope("));
  assert.ok(ui.includes("buildComparisonReport("));
});

test("TIE Compare processes bounded worker chunks and terminates workers on completion or cancellation", () => {
  assert.ok(ui.includes('new Worker(new URL("./tie-dsp.worker.js", import.meta.url)'));
  assert.ok(ui.includes("channel.subarray("));
  assert.ok(ui.includes(").slice()"));
  assert.ok(ui.includes("worker.terminate()"));
  assert.ok(ui.includes("activeCompareController?.abort()"));
  assert.ok(ui.includes('document.addEventListener("visibilitychange"'));
});

test("TIE Compare audition is isolated and stops when source selection or app visibility changes", () => {
  assert.ok(ui.includes("createBufferSource()"));
  assert.ok(ui.includes("createGain()"));
  assert.ok(ui.includes("source.stop()"));
  assert.ok(ui.includes("void stopPreview()"));
  assert.ok(ui.includes('window.addEventListener("pagehide"'));
});

test("TIE Compare does not create a second AI/device/MIDI path and styles stay scoped to Studio", () => {
  assert.ok(!ui.includes("cloudApiRequest"));
  assert.ok(!ui.includes("requestMIDIAccess"));
  assert.ok(!ui.includes("MG30Midi"));
  assert.ok(css.includes("#page-studio .tie-compare-slots"));
  assert.ok(css.includes("@media(max-width:540px)"));
  assert.ok(engine.includes("B minus A"));
  assert.ok(ui.includes("tieCompareProvenance"));
  assert.ok(ui.includes("tieCompareListeningNotes"));
  assert.ok(ui.includes("report.listeningNotes"));
  assert.ok(engine.includes("sourceChannelCount"));
});
