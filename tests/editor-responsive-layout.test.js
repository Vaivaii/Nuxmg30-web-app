import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const legacyCss = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');
const fitSource = readFileSync(new URL('../www/editor-viewport-fit.js', import.meta.url), 'utf8');
const nativeInit = readFileSync(new URL('../scripts/init-android.mjs', import.meta.url), 'utf8');
const finalCss = html.match(/<style id="editor-reference-final-v4">([\s\S]*?)<\/style>/)?.[1] || '';

test('The final mobile cascade fixes the Editor viewport and removes legacy scroll-recovery overrides', () => {
  assert.ok(finalCss.length > 8000);
  assert.ok(html.lastIndexOf('editor-reference-final-v4') > html.lastIndexOf('editor-fixed-reference-viewport-v3'));
  assert.ok(!legacyCss.includes('Android 3-button / compact-height recovery'));
  assert.ok(!legacyCss.includes('Final compact mobile Editor layout: complete artwork'));
  const page = finalCss.match(/body>\.app>#page-editor:not\(\.hidden\)\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(page, /overflow:hidden!important/);
  assert.doesNotMatch(page, /overflow-y:auto/i);
});

test('The original tab title/actions remain and the preset row matches the compact reference', () => {
  assert.ok(html.includes('<span class="eyebrow">TONE WORKSPACE</span><strong>Tone Editor</strong>'));
  assert.match(finalCss, /hardware-preset-card\{[\s\S]*?flex:0 0 42px!important/);
  assert.match(finalCss, /hardware-preset-name-trigger::after\{content:none!important/);
  assert.match(finalCss, /editor-topbar\{[\s\S]*?flex:0 0 38px!important/);
  assert.match(finalCss, /#openCtrlEditor\{width:76px!important/);
  assert.match(finalCss, /#saveDeviceBtn\{width:98px!important/);
  assert.match(finalCss, /body>\.app>\.top \.logo\{[\s\S]*?flex:0 0 68px!important/);
});

test('Signal Chain heading/actions are separated from compact icon/name blocks; description is hidden', () => {
  assert.match(finalCss, /signal-chain-panel\{[\s\S]*?flex:0 0 88px!important/);
  assert.match(finalCss, /signal-chain-panel>\.panel-head\{[\s\S]*?flex:0 0 21px!important/);
  assert.match(finalCss, /signal-chain-copy p\{display:none!important/);
  assert.match(finalCss, /signal-chain-panel \.chain \.block small\{display:none!important/);
  assert.ok(html.includes('id="chainScrollPrev"'));
  assert.ok(html.includes('id="chainScrollNext"'));
});

test('AMP and non-AMP artwork fit and the inline parameter mount expands into remaining height', () => {
  assert.match(finalCss, /#modelVisual\.model-visual-stage\{[\s\S]*?flex:0 0 116px!important/);
  assert.match(finalCss, /gear-art \.gear-svg\{[\s\S]*?object-fit:contain!important/);
  assert.match(finalCss, /gear-art-amp \.gear-svg\{[\s\S]*?width:84%!important/);
  assert.match(finalCss, /gear-copy \.gear-type,[\s\S]*?display:none!important/);
  assert.match(finalCss, /#knobs\{[\s\S]*?flex:1 1 0!important[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
  assert.match(html, /function fitInlineParameterDials\(\)/);
  assert.match(html, /ResizeObserver\(\(\)=>requestAnimationFrame\(fitInlineParameterDials\)\)/);
});

test('Scene dock is normal-flow and adjacent to app tabs; tabs stay above Android system bars', () => {
  assert.match(finalCss, /#editorSceneDock\{[\s\S]*?position:relative!important[\s\S]*?flex:0 0 54px!important/);
  assert.match(finalCss, /#editorSceneDock \.scene-button\{[\s\S]*?height:44px!important/);
  assert.match(finalCss, /body>\.app>\.nav\{[\s\S]*?bottom:0!important[\s\S]*?height:72px!important/);
  assert.match(finalCss, /padding:0 0 var\(--editor-workspace-reserve,80px\)!important/);
});

test('Android system inset is not counted twice because MainActivity already applies WindowInsets', () => {
  assert.match(fitSource, /workspaceReserve: resolvedNavHeight \+ resolvedGap/);
  assert.match(fitSource, /style\.setProperty\('--mg30-system-nav-bottom', '0px'\)/);
  assert.doesNotMatch(fitSource, /MG30AndroidInsets|getNavigationBottomInsetDp/);
  assert.doesNotMatch(nativeInit, /MG30AndroidInsets|getNavigationBottomInsetDp/);
  assert.match(nativeInit, /view\.setPadding\(insetsBaseLeft \+ systemInsets\.left/);
});
