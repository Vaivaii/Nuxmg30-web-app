import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../www/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../www/studio-daw.css", import.meta.url), "utf8");
const ui = readFileSync(new URL("../www/tie-signal-chain-ui.js", import.meta.url), "utf8");
const review = readFileSync(new URL("../www/tie-configuration-review-ui.js", import.meta.url), "utf8");
const analyzer = readFileSync(new URL("../www/tie-analyzer-ui.js", import.meta.url), "utf8");

test("Phase 4 Signal Chain panel replaces the generic preview with a live snapshot surface", () => {
  assert.ok(html.includes('id="tieChainFlow"'));
  assert.ok(html.includes('id="tieChainRefresh"'));
  assert.ok(html.includes('id="tieChainParameters"'));
  assert.ok(html.includes('id="tieChainDiagnostics"'));
  assert.ok(!html.includes("Live effect-block snapshot is not connected"));
  assert.ok(html.includes('src="./tie-signal-chain-ui.js?v=phase4-3"'));
});

test("Signal Chain Intelligence consumes the existing shared editor and preset reader", () => {
  assert.ok(html.includes("getSignalChainSnapshot(){"));
  assert.ok(html.includes("refreshSignalChainSnapshot(){"));
  assert.ok(html.includes("await aiRefreshDeviceSnapshot()"));
  assert.ok(html.includes("const chain=Array.from({length:12},(_,i)=>bitSlot(body,94+i))"));
  assert.ok(html.includes("parameterControls(index,state.model)"));
  assert.ok(ui.includes("window.MG30AIToneBridge"));
  assert.ok(!ui.includes("applyPlan("));
  assert.ok(!ui.includes("writeSignalChainRoutingMode("));
});

test("Signal chain ordering and bypass state are sourced from the shared preset state", () => {
  assert.ok(html.includes("order,blocks,"));
  assert.ok(html.includes("enabled:modelKnown?Boolean(state.on):null"));
  assert.ok(ui.includes("orderedBlocks(snapshot)"));
  assert.ok(ui.includes("block.enabled?'ON':'BYPASS'"));
  assert.ok(ui.includes("block.known?(block.enabled?'ON':'BYPASS'):'UNKNOWN'"));
});

test("Unavailable device data and provisional NAM mapping are explicitly distinguished", () => {
  assert.ok(html.includes("knownBlocks.includes(index)"));
  assert.ok(html.includes("preserveSignalChain:!ok"));
  assert.ok(html.includes("if(programChanged||sceneChanged)signalChainReadbackMeta=null;"));
  assert.ok(html.includes("mappingEvidence:[60,61].includes(namProfile.id)?'observed-device-id':'provisional-slot-id'"));
  assert.ok(ui.includes("Preset readback supplies the selected NAM slot ID, not a verified .nam filename."));
  assert.ok(ui.includes("provisional-slot-id"));
  assert.ok(ui.includes("No verified device readback or saved editor draft is available."));
  assert.ok(ui.includes("Device disconnected · showing last successful readback"));
});

test("IR context reads the existing User and Collection assignment without changing it", () => {
  assert.ok(html.includes("mg30-ir-collection-preset-map"));
  assert.ok(html.includes("mg30-user-ir-name"));
  assert.ok(ui.includes("Third Party / User"));
  assert.ok(ui.includes("Collection slot "));
  assert.ok(!ui.includes("setItem("));
  assert.ok(!ui.includes("writeSlot("));
});

test("Diagnostics separate configuration hypotheses from measured clipping and noise", () => {
  assert.ok(ui.includes("Potential stacked gain controls"));
  assert.ok(ui.includes("configuration heuristic, not a measured signal level"));
  assert.ok(ui.includes("Cannot confirm clipping"));
  assert.ok(ui.includes("Clipping, headroom and noise diagnoses are withheld."));
  assert.ok(html.includes("Open DSP Analyzer"));
  assert.ok(html.includes("Open Tone Comparison"));
});

test("Phase 4 layout remains responsive and does not change the Studio shell", () => {
  assert.ok(css.includes("#page-studio .tie-chain-flow"));
  assert.ok(css.includes("@media(max-width:640px)"));
  assert.ok(css.includes("#page-studio .tie-chain-detail-grid{grid-template-columns:1fr}"));
  assert.ok(html.includes('data-tie-page="analyzer"'));
  assert.ok(html.includes('data-tie-page="compare"'));
});


test("Configuration Review is an in-context five-tab page, not a new application navigation item", () => {
  for (const tab of ["overview", "chain", "gain", "tone", "report"]) {
    assert.ok(html.includes('data-tie-review-tab="' + tab + '"'));
    assert.ok(html.includes('data-tie-review-panel="' + tab + '"'));
  }
  assert.ok(html.includes('id="tieOpenConfigurationReview"'));
  assert.ok(html.includes('id="tieReviewBack"'));
  assert.ok(html.includes('src="./tie-configuration-review-ui.js?v=phase4-2"'));
  assert.ok(review.includes('function closeReview()'));
  assert.ok(review.includes('data-tie-page-panel'));
});

test("Signal Chain pedalboard reuses the Editor SVG renderer and actual snapshot order", () => {
  assert.ok(html.includes("window.MG30EditorBlockIcon = renderBlockIcon"));
  assert.ok(ui.includes("window.MG30EditorBlockIcon(block.id)"));
  assert.ok(ui.includes("orderedBlocks(snapshot)"));
  assert.ok(ui.includes("snapshot.order"));
  assert.ok(ui.includes("tie-block-"));
});

test("Configuration Review never fabricates gain measurements or spectral results", () => {
  assert.ok(review.includes('metrics?.rmsDbfs'));
  assert.ok(review.includes('metrics.samplePeakDbfs'));
  assert.ok(review.includes('Not measured'));
  assert.ok(review.includes('Headroom'));
  assert.ok(review.includes('Per-block audio levels are not exposed'));
  assert.ok(review.includes('No Analyzer spectrum available'));
  assert.ok(review.includes('bandEnergyPct'));
  assert.ok(review.includes('does not establish headroom'));
});

test("PDF export is explicitly unavailable and report share is a real host capability check", () => {
  assert.ok(html.includes('id="tieReviewExportPdf" class="tie-review-primary" disabled'));
  assert.ok(review.includes('navigator.share'));
  assert.ok(review.includes('navigator.clipboard'));
});

test("PCM Analyzer exposes only the latest completed result without changing DSP processing", () => {
  assert.ok(analyzer.includes('lastAnalysisResult = result'));
  assert.ok(analyzer.includes('window.MG30TIEAnalyzerBridge = Object.freeze({ getResult: () => lastAnalysisResult })'));
  assert.ok(review.includes('window.MG30TIEAnalyzerBridge?.getResult?.()'));
});
