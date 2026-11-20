import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../www/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../www/studio-daw.css", import.meta.url), "utf8");
const ui = readFileSync(new URL("../www/tie-analyzer-ui.js", import.meta.url), "utf8");
const sources = readFileSync(new URL("../www/tie-audio-source.js", import.meta.url), "utf8");
const dsp = readFileSync(new URL("../www/tie-dsp-engine.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../www/tie-dsp.worker.js", import.meta.url), "utf8");

test("TIE Analyzer exposes only imported audio and saved Quick Record sources in this phase", () => {
  for (const id of ["tieAudioSourceSelect", "tieAudioFileInput", "tieImportAudioButton", "tieAnalyzeButton", "tieCancelAnalysisButton"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing Analyzer control: " + id);
  }
  assert.ok(ui.includes("listQuickRecordSources(window.NUXStudioRecorder)"));
  assert.ok(ui.includes("loadImportedAudioFile(importedFile, decodeArrayBuffer)"));
  assert.ok(ui.includes("loadQuickRecordTake("));
  assert.ok(html.includes("Direct USB/live capture and internal DAW-track access remain unverified"));
});

test("TIE Analyzer exposes measured metrics and spectrum/spectrogram visualizations", () => {
  for (const id of ["tieMetricRms", "tieMetricPeak", "tieMetricCrest", "tieMetricCentroid", "tieMetricRolloff", "tieMetricClipping", "tieSpectrumCanvas", "tieSpectrogramCanvas", "tieBandEnergy"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing Analyzer result field: " + id);
  }
  assert.ok(ui.includes("drawSpectrum(result.spectrum)"));
  assert.ok(ui.includes("drawSpectrogram(result.spectrogram)"));
  assert.ok(ui.includes("result.limitations"));
  assert.ok(ui.includes('"Source rate"'));
  assert.ok(ui.includes('"Analysis rate"'));
  assert.ok(ui.includes('"Source channels"'));
  assert.ok(ui.includes('"Analysis channels"'));
  assert.ok(ui.includes('"Resampling"'));
});

test("TIE Analyzer uses a module worker and bounded chunk transfer rather than main-thread full-buffer FFT", () => {
  assert.ok(ui.includes('new Worker(new URL("./tie-dsp.worker.js", import.meta.url)'));
  assert.ok(ui.includes("source.subarray(startFrame, startFrame + coreFrameCount + overlapFrames).slice()"));
  assert.ok(ui.includes("worker.terminate()"));
  assert.ok(worker.includes("processDspChunk("));
  assert.ok(dsp.includes("MAX_SPECTROGRAM_ROWS"));
});

test("TIE source and UI adapters do not call the AI provider or change device/MIDI routing", () => {
  assert.ok(!ui.includes("cloudApiRequest"));
  assert.ok(!ui.includes("startToneAnalysis("));
  assert.ok(!ui.includes("requestMIDIAccess"));
  assert.ok(!sources.includes("MG30Audio"));
});

test("TIE Analyzer styles remain scoped to the existing Studio workspace", () => {
  assert.ok(css.includes("#page-studio .tie-analyzer-page"));
  assert.ok(css.includes("#page-studio #tieSpectrumCanvas"));
  assert.ok(css.includes("#page-studio #tieSpectrogramCanvas"));
});


test("TIE Analyzer visual tabs expose Spectrum, Spectrogram, Meter and an honest unmeasured Harmonics state", () => {
  for (const view of ["spectrum", "spectrogram", "meter", "harmonics"]) {
    assert.ok(html.includes('data-tie-analyzer-view="' + view + '"'), "missing Analyzer view tab " + view);
    assert.ok(html.includes('data-tie-analyzer-panel="' + view + '"'), "missing Analyzer view panel " + view);
    assert.ok(ui.includes('"' + view + '"'), "Analyzer module must handle " + view);
  }
  for (const id of ["tieMeterRmsFill", "tieMeterPeakFill", "tieMeterRmsValue", "tieMeterPeakValue", "tieQuickDiagnosisTitle", "tieQuickDiagnosisDetails"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing measured meter/diagnostic element " + id);
    assert.ok(ui.includes('$("#' + id + '")') || ui.includes('$("' + id + '")'), "Analyzer must update " + id);
  }
  assert.ok(ui.includes("metrics.clipping.detected"));
  assert.ok(ui.includes("metrics.clipping.sampleCount"));
  assert.ok(html.includes("No harmonic peaks or THD values are inferred"));
  assert.ok(css.includes("#page-studio .tie-view-tabs"));
  assert.ok(css.includes("#page-studio .tie-level-meter-row"));
});
