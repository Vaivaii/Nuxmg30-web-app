import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const init = readFileSync(new URL('../scripts/init-android.mjs', import.meta.url), 'utf8');
const finalCss = html.match(/<style id="editor-fixed-reference-viewport-v3">([\s\S]*?)<\/style>/)?.[1] || '';

test('The reference Editor is fixed with a normal-flow Scene dock and no vertical page scrolling', () => {
  assert.ok(finalCss.length > 1000);
  assert.match(finalCss, /height:100dvh!important/);
  const page = finalCss.match(/body>\.app>#page-editor:not\(\.hidden\)\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(page, /overflow:hidden!important/);
  assert.doesNotMatch(page, /overflow-y\s*:\s*auto/i);
  assert.match(finalCss, /#editorSceneDock\{[\s\S]*?position:relative!important/);
  assert.doesNotMatch(finalCss.match(/#editorSceneDock\{([\s\S]*?)\}/)?.[1] || '', /position:fixed/i);
});

test('Reference sizing keeps the title/action row, preset strip and compact 88px Signal Chain proportions', () => {
  assert.match(finalCss, /\.editor-topbar\{[\s\S]*?flex:0 0 38px!important/);
  assert.match(finalCss, /\.hardware-preset-card\{[\s\S]*?flex:0 0 42px!important/);
  assert.match(finalCss, /\.signal-chain-panel\{[\s\S]*?flex:0 0 88px!important/);
  assert.match(finalCss, /#page-editor \.editor-section-label\{[\s\S]*?display:flex!important/);
  assert.ok(html.includes('<span class="eyebrow">TONE WORKSPACE</span><strong>Tone Editor</strong>'));
  assert.match(finalCss, /#openCtrlEditor\{width:82px!important\}/);
  assert.match(finalCss, /#saveDeviceBtn\{width:104px!important\}/);
});

test('Signal Chain removes the descriptive sentence and keeps only compact block icon/name cards with arrows', () => {
  assert.match(finalCss, /body>\.app>#page-editor>\.signal-chain-panel \.signal-chain-copy p\{display:none!important/);
  assert.match(finalCss, /#page-editor \.chain \.block small\{display:none!important\}/);
  assert.match(finalCss, /#page-editor \.chain \.block \.symbol svg/);
  assert.match(finalCss, /#page-editor \.chain \.block b\{/);
  assert.ok(html.includes('id="chainScrollPrev"'));
  assert.ok(html.includes('id="chainScrollNext"'));
  assert.ok(html.includes("holder.scrollBy({left:-Math.max(100,holder.clientWidth*.72),behavior:'smooth'})"));
});

test('All model artwork is contained, AMP art is enlarged and four-column inline knobs remain responsive', () => {
  assert.match(finalCss, /\.gear-art \.gear-svg\{[\s\S]*?object-fit:contain!important/);
  assert.match(finalCss, /\.gear-art\.gear-art-amp \.gear-svg\{width:84%!important/);
  assert.match(finalCss, /#modelVisual \.gear-copy-head \.gear-type\{display:none!important/);
  assert.match(finalCss, /#page-editor \.main-editor-card #knobs\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
  assert.match(html, /function fitInlineParameterDials\(\)/);
  assert.match(html, /ResizeObserver\(\(\)=>requestAnimationFrame\(fitInlineParameterDials\)\)/);
});

test('Scene dock replaces the AMP model dock; Android app tabs respect native navigation insets', () => {
  assert.match(finalCss, /bottom:var\(--mg30-system-nav-bottom,env\(safe-area-inset-bottom,0px\)\)!important/);
  assert.match(finalCss, /padding:0 0 var\(--editor-workspace-reserve,92px\)!important/);
  assert.match(finalCss, /#editorSceneDock\{[\s\S]*?order:5!important/);
  assert.match(finalCss, /#editorDockBackdrop,#editorParameterDock\{display:none!important\}/);
  assert.match(html, /const top=Math\.max\(8,rect\.top-placedHeight-7\)/);
  assert.match(html, /menu\.style\.bottom='auto'/);
  assert.match(init, /WindowInsetsCompat\.Type\.navigationBars\(\)/);
  assert.match(init, /getNavigationBottomInsetDp/);
  assert.match(init, /addJavascriptInterface\(androidInsetsBridge, "MG30AndroidInsets"\)/);
});

test('Native inset changes trigger a recalculation of normal-flow workspace reserve', () => {
  assert.ok(html.includes('src="./editor-viewport-fit.js"'));
  assert.match(viewportSource, /window\.MG30AndroidInsets\?\.getNavigationBottomInsetDp\?\(\)/);
  assert.match(viewportSource, /window\.addEventListener\('mg30androidinsets',schedule\)/);
});
