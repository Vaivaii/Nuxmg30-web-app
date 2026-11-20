import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../www/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../www/studio-daw.css", import.meta.url), "utf8");
const studio = readFileSync(new URL("../www/studio-daw.js", import.meta.url), "utf8");
const analyzer = readFileSync(new URL("../www/tie-analyzer-ui.js", import.meta.url), "utf8");
const compare = readFileSync(new URL("../www/tie-comparison-ui.js", import.meta.url), "utf8");
const engine = readFileSync(new URL("../www/tie-comparison-engine.js", import.meta.url), "utf8");

test("Studio redesign retains the five primary application navigation destinations", () => {
  const navStart = html.indexOf('<nav class="nav"');
  const navEnd = html.indexOf("</nav>", navStart);
  assert.ok(navStart >= 0 && navEnd > navStart, "primary navigation must remain in the document");
  const navMarkup = html.slice(navStart, navEnd);
  for (const page of ["editor", "nam", "presets", "studio", "device"]) {
    assert.ok(navMarkup.includes('data-page="' + page + '"'), "missing primary navigation destination: " + page);
  }
});

test("Studio workspace redesign keeps the existing Jamm/Record/DAW and Tone Analysis visibility controls", () => {
  for (const workspace of ["jam-record", "tone-analysis"]) {
    assert.ok(html.includes('data-studio-workspace="' + workspace + '"'));
    assert.ok(html.includes('data-studio-workspace-panel="' + workspace + '"'));
  }
  for (const mode of ["jam", "record", "daw"]) {
    assert.ok(html.includes('data-studio-mode="' + mode + '"'));
  }
  assert.ok(studio.includes("function setStudioWorkspace("));
  assert.ok(studio.includes("function setStudioMode("));
  assert.ok(studio.includes("renderPlayhead()"));
  assert.ok(studio.includes("refreshQuickTakes()"));
  assert.ok(css.includes("#page-studio .studio-workspace-tabs"));
  assert.ok(css.includes("#page-studio .studio-mode-tabs"));
});

test("TIE keeps all five sections with segmented icon navigation and unique panels", () => {
  const pages = ["analyzer", "compare", "signal-chain", "intelligence", "ai-consultant"];
  for (const page of pages) {
    assert.equal((html.match(new RegExp('data-tie-page="' + page + '"', "g")) || []).length, 1);
    assert.equal((html.match(new RegExp('data-tie-page-panel="' + page + '"', "g")) || []).length, 1);
  }
  assert.ok(html.includes("tie-nav-icon"));
  assert.ok(css.includes("#page-studio .tie-subnav"));
  assert.ok(css.includes("grid-template-columns:repeat(5,minmax(0,1fr))"));
});

test("Signal Chain uses live shared preset state and never presents a generic flow as a device snapshot", () => {
  assert.ok(html.includes('id="tieChainFlow"'));
  assert.ok(html.includes('id="tieChainRefresh"'));
  assert.ok(html.includes("getSignalChainSnapshot(){"));
  assert.ok(html.includes("knownBlocks.includes(index)"));
  assert.ok(html.includes("No device readback has been captured in this session."));
  assert.ok(!html.includes("Live effect-block snapshot is not connected"));
  assert.ok(!html.includes("Preset: 02D"));
  assert.ok(!html.includes("Deluxe Amp"));
  assert.ok(analyzer.includes("metrics.rmsDbfs"));
  assert.ok(compare.includes("assistantTrigger.click()"));
});

test("AI Consultant opens the existing shared assistant and uses no duplicate provider UI", () => {
  assert.ok(html.includes('id="tieOpenAiAssistant"'));
  assert.ok(compare.includes('document.getElementById("aiToneOpenButton")'));
  assert.ok(compare.includes("assistantTrigger.click()"));
  assert.ok(html.includes("existing MG30 Studio AI Assistant"));
  assert.ok(!html.includes('id="tieAiPrompt"'));
});

test("Recent Sessions are not fabricated; existing saved-project functionality remains mounted", () => {
  assert.ok(html.includes('id="dawSavedProjects"'));
  assert.ok(studio.includes("populateSavedProjects()"));
  assert.ok(!html.includes("TK Imperial Crunch"));
  assert.ok(!html.includes("IR Mix Comparison"));
});

test("Visual refinement remains scoped to Studio and retains mobile layouts", () => {
  assert.ok(css.includes("#page-studio{"));
  assert.ok(css.includes("@media(max-width:480px)"));
  assert.ok(css.includes("@media(max-width:360px)"));
  assert.ok(css.includes("#page-studio .daw-timeline-panel"));
  assert.ok(css.includes("#page-studio #dawTimelinePage #dawPlayheadHit::before"));
});

test("Analyzer meter and comparison bands are presentation of existing production measurements only", () => {
  assert.ok(analyzer.includes("metrics.rmsDbfs"));
  assert.ok(analyzer.includes("metrics.samplePeakDbfs"));
  assert.ok(analyzer.includes("metrics.clipping.sampleCount"));
  assert.ok(analyzer.includes("metrics.bandEnergyPct"));
  assert.ok(engine.includes("resultA.metrics.bandEnergyPct"));
  assert.ok(engine.includes("resultB.metrics.bandEnergyPct"));
  assert.ok(engine.includes("Group the existing DSP relative-band measurements for presentation only."));
  assert.ok(!analyzer.includes("createDspAccumulator"));
  assert.ok(!compare.includes("createDspAccumulator"));
});
