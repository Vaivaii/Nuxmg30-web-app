import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const html=readFileSync(new URL("../www/index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../www/studio-daw.css",import.meta.url),"utf8");
const ui=readFileSync(new URL("../www/tie-signal-chain-ui.js",import.meta.url),"utf8");
const review=readFileSync(new URL("../www/tie-configuration-review-ui.js",import.meta.url),"utf8");
const artwork=readFileSync(new URL("../www/pedal-reference-artwork.js",import.meta.url),"utf8");
const analyzer=readFileSync(new URL("../www/tie-analyzer-ui.js",import.meta.url),"utf8");

test("Signal Chain UI reuses the shared editor snapshot and original preset reader",()=>{
  assert.ok(html.includes("getSignalChainSnapshot(){"));
  assert.ok(html.includes("refreshSignalChainSnapshot(){"));
  assert.ok(html.includes("await aiRefreshDeviceSnapshot()"));
  assert.ok(html.includes("const chain=Array.from({length:12},(_,i)=>bitSlot(body,94+i))"));
  assert.ok(html.includes("parameterControls(index,state.model)"));
  assert.ok(ui.includes("window.MG30AIToneBridge"));
  assert.ok(!ui.includes("sendBlockParam("));
  assert.ok(!ui.includes("writeSignalChainRoutingMode("));
});
test("Pedalboard order, bypass and unknown states come from actual snapshot records",()=>{
  assert.ok(html.includes("order,blocks,"));
  assert.ok(html.includes("enabled:modelKnown?Boolean(state.on):null"));
  assert.ok(ui.includes("orderedBlocks(snapshot)"));
  assert.ok(ui.includes("snapshot.order"));
  assert.ok(ui.includes("block.enabled?'ON':'BYPASS'"));
});
test("Category pedal glyphs use colored Editor SVG strokes rather than the default black fill",()=>{
  assert.ok(html.includes("window.MG30EditorBlockIcon = renderBlockIcon;"));
  assert.ok(html.includes("window.MG30EditorGearArtwork = renderGearSvg;"));
  assert.ok(ui.includes("window.MG30EditorBlockIcon(block.id)"));
  assert.ok(css.includes("fill:none!important;stroke:currentColor!important"));
  for(const key of ["WAH","EFX","SR","GATE","AMP","IR"])assert.ok(css.includes(".tie-block-"+key));
});
test("Selected Block reuses actual local amp/pedal artwork and model parameter definitions",()=>{
  assert.ok(ui.includes("window.MG30EditorGearArtwork(block.id,block.model)"));
  assert.ok(artwork.includes("window.renderPedalReferenceSvg=function(blockId,modelName)"));
  assert.ok(html.includes('id="tieChainSelectedArtwork"'));
  assert.ok(ui.includes("function parameterMarkup(param)"));
  assert.ok(ui.includes("tie-knob-discrete"));
  assert.ok(ui.includes("Not read"));
  assert.ok(!ui.includes("sendBlockParam("));
});
test("Configuration Review replaces Chain-page siblings and provides five internal tabs",()=>{
  for(const tab of ["overview","chain","gain","tone","report"]){
    assert.ok(html.includes('data-tie-review-tab="'+tab+'"'));
    assert.ok(html.includes('data-tie-review-panel="'+tab+'"'));
  }
  assert.ok(html.includes('id="tieOpenConfigurationReview"'));
  assert.ok(html.includes('id="tieReviewBack"'));
  assert.ok(review.includes("function openReview()"));
  assert.ok(review.includes("savedSiblingVisibility"));
  assert.ok(review.includes("function closeReview()"));
});
test("Review mini pedalboard uses shared colored Editor SVG icons",()=>{
  assert.ok(review.includes("renderMiniChain()"));
  assert.ok(review.includes("window.MG30EditorBlockIcon(block.id)"));
  assert.ok(review.includes("data-tie-review-target"));
  assert.ok(css.includes(".tie-review-mini-pedal svg{"));
});
test("Gain metrics preserve measurement provenance and never fabricate stage levels",()=>{
  assert.ok(review.includes("metrics?.rmsDbfs"));
  assert.ok(review.includes("metrics.samplePeakDbfs"));
  assert.ok(review.includes("tieReviewHeadroom"));
  assert.ok(review.includes("tieReviewOutput"));
  assert.ok(review.includes("Not measured"));
  assert.ok(review.includes("Audio stage level not exposed"));
  assert.ok(html.includes('id="tieReviewRmsBar"'));
});
test("Tone graph uses the completed PCM Analyzer spectrum with frequency and dBFS grid",()=>{
  assert.ok(review.includes("function drawSpectrum(result)"));
  assert.ok(review.includes("spectrum.binWidthHz"));
  assert.ok(review.includes("spectrum.nyquistHz"));
  assert.ok(review.includes("No Analyzer spectrum available"));
  assert.ok(review.includes("metrics?.bandEnergyPct"));
  assert.ok(analyzer.includes("result.spectrum"));
});
test("Scene and preset comparison remain unavailable without multi-scene evidence",()=>{
  assert.ok(html.includes("Cross-scene level comparison is not available"));
  assert.ok(review.includes("Perbandingan antar-preset belum dijalankan"));
  assert.ok(review.includes("sceneName(snapshot?.sceneIndex)"));
  assert.ok(html.includes('id="tieReviewSceneBars"'));
  assert.ok(!review.includes("estimatedSceneLevel"));
});
test("Report sharing is real and PDF export remains explicitly pending",()=>{
  assert.ok(html.includes('id="tieReviewExportPdf" class="tie-review-primary" disabled'));
  assert.ok(html.includes("PDF generation is not implemented"));
  assert.ok(review.includes("navigator.share"));
  assert.ok(review.includes("navigator.clipboard"));
});
test("Analyzer bridge is reused without changing the DSP engine",()=>{
  assert.ok(analyzer.includes("lastAnalysisResult = result"));
  assert.ok(analyzer.includes("window.MG30TIEAnalyzerBridge = Object.freeze({ getResult: () => lastAnalysisResult })"));
  assert.ok(review.includes("window.MG30TIEAnalyzerBridge?.getResult?.()"));
  assert.ok(!review.includes("createDspAccumulator("));
});
test("Original app shell and the five Tone Analysis destinations remain mounted",()=>{
  for(const page of ["editor","nam","presets","studio","device"])assert.ok(html.includes('data-page="'+page+'"'));
  for(const page of ["analyzer","compare","signal-chain","intelligence","ai-consultant"])assert.ok(html.includes('data-tie-page="'+page+'"'));
});
test("Readback and user library mappings are read-only in Signal Chain",()=>{
  assert.ok(html.includes("mappingEvidence:[60,61].includes(namProfile.id)?'observed-device-id':'provisional-slot-id'"));
  assert.ok(html.includes("mg30-ir-collection-preset-map"));
  assert.ok(html.includes("mg30-user-ir-name"));
  assert.ok(ui.includes("Third Party / User"));
  assert.ok(!ui.includes("setItem("));
  assert.ok(!ui.includes("writeSlot("));
});


test("Phase 4 browser modules parse as valid JavaScript before Android packaging",()=>{
  assert.doesNotThrow(()=>new Script(ui,{filename:"tie-signal-chain-ui.js"}));
  assert.doesNotThrow(()=>new Script(review,{filename:"tie-configuration-review-ui.js"}));
});
test("Configuration Review preserves a route into the existing Tone Comparison tab",()=>{
  assert.ok(html.includes('id="tieReviewCompare"'));
  assert.ok(html.includes("Open Tone Comparison"));
  assert.ok(review.includes('tieReviewCompare'));
  assert.ok(review.includes('data-tie-page="compare"'));
});


test("Reference first view selects the known AMP block while preserving manual block selection",()=>{
  assert.ok(ui.includes("order.find(block=>block.id==='AMP'&&block.known)?.index"));
  assert.ok(ui.includes("state.selectedIndex=Number(button.dataset.tieChainBlock)"));
});

test("Editor and both TIE pedalboards share one category color token map",()=>{
  for(const [id,token] of [["WAH","wah"],["EFX","efx"],["S/R","sr"],["GATE","gate"],["AMP","amp"],["IR","ir"],["CMP","cmp"],["EQ","eq"],["MOD","mod"],["DLY","dly"],["RVB","rvb"],["VOL","vol"]]){
    assert.ok(html.includes("--effect-category-"+token+":"),"missing root color token for "+id);
    assert.ok(html.includes('data-category="'+escapeHtmlForTest(id)+'"')||id==="S/R","Editor chain must identify "+id);
    const safe=id.replace(/[^a-z0-9]/gi,"");
    assert.ok(css.includes(".tie-block-"+safe),"missing Signal Chain Intelligence category style for "+id);
    assert.ok(css.includes(".tie-mini-"+safe),"missing Configuration Review mini-chain style for "+id);
  }
  assert.ok(css.includes("body>.app>#page-editor>.signal-chain-panel .chain .block[data-category] .symbol"));
  assert.ok(css.includes("color:var(--tie-category,var(--lime))!important"));
  assert.ok(css.includes(".chain .block.off[data-category] .symbol"));
});
test("Preset identity uses one compact card with a small readback action and honest device state",()=>{
  assert.ok(html.includes('class="tie-chain-toolbar tie-preset-identity"'));
  assert.ok(html.includes('id="tieChainDeviceName"'));
  assert.ok(html.includes('id="tieChainDeviceStatus"'));
  assert.ok(html.includes('class="tie-sr-only" role="status"'));
  assert.ok(html.includes('aria-label="Read active preset"'));
  assert.ok(css.includes("#page-studio .tie-preset-identity"));
  assert.ok(css.includes("#page-studio .tie-chain-refresh"));
  assert.ok(ui.includes("snapshot.connected?'Connected':'Disconnected'"));
  assert.ok(ui.includes("setDevice('Editor snapshot','Local Draft','is-warning')"));
});
test("Selected Block identity chip includes the shared Editor glyph and category identity",()=>{
  assert.ok(ui.includes("window.MG30EditorBlockIcon(block.id)"));
  assert.ok(ui.includes("categoryTag.dataset.category=block.id"));
  assert.ok(css.includes("#page-studio .tie-selected-category svg"));
});

test("Gain overview uses the Input Level card label without presenting PCM RMS as a live pedal meter",()=>{
  assert.ok(html.includes("<small>Input Level</small>"));
  assert.ok(review.includes("PCM RMS, not live pedal input"));
});
