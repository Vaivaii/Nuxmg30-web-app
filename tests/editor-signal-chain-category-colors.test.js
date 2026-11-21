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

test("Inline SVG glyphs use the category token even when legacy Editor CSS forces lime on the wrapper",()=>{
  const iconStart=html.indexOf("function renderBlockIcon(blockId){");
  const iconEnd=html.indexOf("\\nfunction ",iconStart+10);
  assert.ok(iconStart>=0,"inline SVG icon renderer must remain in place");
  assert.ok(iconEnd>iconStart,"inline SVG renderer should be a bounded function");
  const renderer=html.slice(iconStart,iconEnd);
  assert.ok(renderer.includes("return '<svg viewBox=\\"0 0 32 32\\""),"keep the existing inline SVG artwork renderer");
  const directSvgRule="body>.app>#page-editor>.signal-chain-panel .chain .block[data-category] .symbol svg";
  assert.ok(css.includes(directSvgRule),"category colour must be assigned directly to the SVG element with sufficient specificity");
  assert.ok(css.includes("color:var(--editor-category,var(--lime))!important;"),"SVG currentColor must resolve from the shared category token");
  assert.ok(css.includes("fill:none!important;"),"preserve transparent outline artwork");
  assert.ok(css.includes("stroke:currentColor!important;"),"SVG outlines must follow the category color");
  assert.ok(css.includes("body>.app>#page-editor>.signal-chain-panel .chain .block.off[data-category]"),"bypass state must keep category identity");
  assert.ok(css.includes("opacity:.68!important;"),"bypass must be dimmed without becoming monochrome");
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
