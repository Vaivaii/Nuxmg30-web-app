import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const finalCss = html.match(/<style id="editor-fixed-reference-viewport-v2">([\s\S]*?)<\/style>/)?.[1] || '';

test('The final mobile Editor is fixed to the measured viewport with no vertical page scrolling', () => {
  assert.ok(finalCss.length > 1000);
  assert.match(finalCss, /height:100dvh!important/);
  assert.match(finalCss, /#page-editor:not\(\.hidden\)[\s\S]*?overflow:hidden!important/);
  const pageRule = finalCss.match(/body>\.app>#page-editor:not\(\.hidden\)\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(pageRule, /overflow:hidden!important/);
  assert.doesNotMatch(pageRule, /overflow-y\s*:\s*auto/i);
  assert.match(finalCss, /overflow-x:auto!important;overflow-y:hidden!important/);
});

test('Tone tab header remains visible with CTRL / EXP and Save to Device in one row', () => {
  assert.ok(html.includes('<span class="eyebrow">TONE WORKSPACE</span><strong>Tone Editor</strong>'));
  assert.match(finalCss, /#page-editor \.editor-section-label\s*\{[\s\S]*?display:flex!important/);
  assert.match(finalCss, /#page-editor \.editor-topbar\s*\{[\s\S]*?order:1!important/);
  assert.match(finalCss, /#page-editor \.editor-top-actions\s*\{[\s\S]*?display:flex!important/);
  assert.match(finalCss, /#page-editor \.hardware-preset-card\s*\{[\s\S]*?order:2!important/);
});

test('Signal Chain descriptions and model/state captions are hidden while block icons and names remain', () => {
  assert.match(finalCss, /#page-editor \.signal-chain-copy p\{display:none!important\}/);
  assert.match(finalCss, /#page-editor \.chain \.block small\{display:none!important\}/);
  assert.match(finalCss, /#page-editor \.chain \.block \.symbol svg/);
  assert.match(finalCss, /#page-editor \.chain \.block b\{/);
});

test('AMP and non-AMP artwork are contained and four-column parameter dials remain responsive', () => {
  assert.match(finalCss, /\.gear-art \.gear-svg\{[\s\S]*?object-fit:contain!important/);
  assert.match(finalCss, /#page-editor \.main-editor-card #knobs\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
  assert.match(html, /function fitInlineParameterDials\(\)/);
  assert.match(html, /ResizeObserver\(\(\)=>requestAnimationFrame\(fitInlineParameterDials\)\)/);
});

test('The Scene dock replaces the old AMP dock at the bottom and the Copy menu is an upward popup', () => {
  assert.match(finalCss, /#editorSceneDock\{[\s\S]*?position:fixed!important[\s\S]*?bottom:var\(--editor-scene-bottom,94px\)!important/);
  assert.match(finalCss, /#editorDockBackdrop,#editorParameterDock\{display:none!important\}/);
  assert.match(finalCss, /padding:0 0 var\(--editor-workspace-reserve,170px\)!important/);
  assert.match(html, /const top=Math\.max\(8,rect\.top-placedHeight-7\)/);
  assert.match(html, /menu\.style\.bottom='auto'/);
});

test('System-navigation clearance is measured from actual app-tab geometry', () => {
  assert.ok(html.includes('src="./editor-viewport-fit.js"'));
  assert.match(finalCss, /bottom:var\(--editor-scene-bottom,94px\)!important/);
  assert.match(finalCss, /padding:0 0 var\(--editor-workspace-reserve,170px\)!important/);
});
