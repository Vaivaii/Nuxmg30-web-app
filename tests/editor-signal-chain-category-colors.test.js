import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html=readFileSync(new URL("../www/index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../www/studio-daw.css",import.meta.url),"utf8");
const studio=readFileSync(new URL("../www/studio-daw.js",import.meta.url),"utf8");

test("Editor Signal Chain exposes the real block category and preserves live state expressions",()=>{
  assert.ok(html.includes(`data-category="'+escapeHtml(b.id)+'"`));
  assert.ok(html.includes("states[i].on?'● ON':'○ OFF'"));
  assert.ok(html.includes("i===selected?'selected ':'"));
  assert.ok(html.includes("chainOrder=order"));
  assert.ok(html.includes("renderBlockIcon(b.id)"));
});
test("Editor categories retain their individual colours",()=>{
  const categories=[["WAH","wah","#c47bea"],["EFX","efx","#31c6ec"],["S/R","sr","#e6c84a"],["GATE","gate","#36d7c7"],["AMP","amp","#ef5b58"],["IR","ir","#36cbdc"],["CMP","cmp","#e3a84d"],["EQ","eq","#98c95b"],["MOD","mod","#6ea6ee"],["DLY","dly","#d78c58"],["RVB","rvb","#a68ce7"],["VOL","vol","#b5c2cb"]];
  for(const [category,token,color] of categories){
    assert.ok(html.includes("--effect-category-"+token+":"+color),"missing "+category+" token");
    assert.ok(css.includes('.chain .block[data-category="'+category+'"]'),"missing "+category+" selector");
  }
});
test("Editor category colours cover SVG strokes, borders, selected glow and bypass visibility",()=>{
  assert.ok(css.includes(".chain .block[data-category] .symbol svg"));
  assert.ok(css.includes("fill:none!important;stroke:currentColor!important"));
  assert.ok(css.includes(".chain .block.selected[data-category]"));
  assert.ok(css.includes(".chain .block.off[data-category]"));
  assert.ok(css.includes("opacity:.68!important"));
});
test("Editor selected category outline stays inside blocks and preserves horizontal chain scrolling",()=>{
  const selectedRule=css.slice(css.indexOf("#page-editor .chain .block.selected[data-category]"),css.indexOf("#page-editor .chain .block.off[data-category]"));
  assert.ok(selectedRule.includes("box-shadow:inset 0 0 0 1px"),"selection ring must be inset to avoid overflow clipping");
  assert.doesNotMatch(selectedRule,/box-shadow:\s*0 0 0 1px/,"selection ring must not expand outside the block");
  assert.ok(html.includes(".chain{display:flex;gap:8px;overflow:auto;padding:2px 1px 10px;align-items:stretch;"),"horizontal scrolling and chain padding remain intact");
  assert.ok(html.includes(".block{position:relative;flex:0 0 100px;text-align:left;min-height:108px;"),"pedal card footprint remains unchanged");
});

test("Studio is restored to original Jamm & Record modes without Tone Analysis routes",()=>{
  assert.ok(html.includes('class="studio-fixed-header"'));
  assert.ok(html.includes('class="studio-mode-tabs"'));
  assert.ok(html.includes('data-studio-mode-panel="jam"'));
  assert.ok(html.includes('data-studio-mode-panel="record"'));
  assert.ok(html.includes('id="studio-daw-workspace"'));
  assert.ok(!html.includes("data-studio-workspace="));
  assert.ok(!html.includes("data-tie-page="));
  assert.ok(!html.includes("tie-analyzer-ui.js"));
  assert.ok(!css.includes("/* TIE Phase"));
  assert.ok(!studio.includes("function setStudioWorkspace("));
});

test("Editor category colour overrides legacy responsive icon colours without changing SVG artwork",()=>{
  const htmlOverride="body>.app>#page-editor>.signal-chain-panel .chain .block[data-category] .symbol{";
  assert.ok(html.includes('<style id="editor-reference-final-v9">'));
  assert.ok(html.includes(htmlOverride),"missing final-cascade category icon override");
  assert.ok(html.includes("color:var(--editor-category,var(--lime))!important"),"icon must inherit the exact shared category token");
  assert.ok(css.includes("fill:none!important;stroke:currentColor!important"),"line-art SVG must preserve transparent interiors and use currentColor strokes");
  assert.ok(html.includes("renderBlockIcon(b.id)"),"existing SVG artwork renderer must remain in use");
  assert.ok(!html.includes("filter:") || css.includes(".chain .block.off[data-category]"),"bypass styling remains scoped to category blocks");
});
