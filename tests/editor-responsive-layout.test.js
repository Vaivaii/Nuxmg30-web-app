import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const legacyCss = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');
const fitSource = readFileSync(new URL('../www/editor-viewport-fit.js', import.meta.url), 'utf8');
const nativeInit = readFileSync(new URL('../scripts/init-android.mjs', import.meta.url), 'utf8');
const finalCss = html.match(/<style id="editor-reference-final-v5">([\s\S]*?)<\/style>/)?.[1] || '';

test('Vite generated CSS cannot override the final Editor styles: both authoritative style nodes are moved after the bundled stylesheet', () => {
  assert.ok(finalCss.length > 3000);
  assert.ok(html.includes("styleIds=['editor-reference-final-v4','editor-reference-final-v5']"));
  assert.ok(html.includes("document.head.appendChild(style)"));
  assert.ok(html.includes("document.addEventListener('DOMContentLoaded',moveStyles,{once:true})"));
  assert.ok(html.indexOf('moveEditorReferenceStylesAfterBundledCss') > html.indexOf('editor-reference-final-v5'));
  assert.ok(html.indexOf('moveEditorReferenceStylesAfterBundledCss') > html.indexOf('</head>'));
});

test('Preset strip has a hard 42px block-size so intrinsic card content cannot expand it', () => {
  assert.match(finalCss, /hardware-preset-card\{[\s\S]*?flex:0 0 42px!important[\s\S]*?max-height:42px!important[\s\S]*?block-size:42px!important/);
  assert.match(finalCss, /hardware-preset-main\{[\s\S]*?height:34px!important/);
  assert.match(finalCss, /hardware-preset-details small,[\s\S]*?display:none!important/);
});

test('Signal Chain heading and cards have a separate row with full visible block cards', () => {
  assert.match(finalCss, /signal-chain-panel\{[\s\S]*?height:88px!important[\s\S]*?overflow:hidden!important/);
  assert.match(finalCss, /signal-chain-panel \.chain-track\{[\s\S]*?height:50px!important/);
  assert.match(finalCss, /signal-chain-panel \.chain \.block\{[\s\S]*?height:46px!important[\s\S]*?max-height:46px!important/);
  assert.match(finalCss, /signal-chain-panel \.chain \.block small\{display:none!important/);
});

test('AMP toggle is pill-shaped and parameter grid has a divider under Based on metadata', () => {
  assert.match(finalCss, /\.block-toggle\{[\s\S]*?border-radius:999px!important/);
  assert.match(finalCss, /\.block-toggle\{[\s\S]*?border:1px solid #3b484c!important/);
  assert.match(finalCss, /#knobs\{[\s\S]*?border-top:1px solid #39464b!important/);
});

test('Scene dock is fixed to the measured app-tab top and reserves only the real remaining viewport space', () => {
  assert.match(finalCss, /#editorSceneDock\{[\s\S]*?position:fixed!important[\s\S]*?bottom:var\(--editor-scene-dock-bottom,78px\)!important/);
  assert.match(finalCss, /body>\.app>\.nav\{[\s\S]*?position:fixed!important[\s\S]*?bottom:0!important/);
  assert.match(fitSource, /navTop: navRect\.top/);
  assert.match(fitSource, /pageBottom: pageRect\.bottom/);
  assert.match(fitSource, /style\.setProperty\('--editor-scene-dock-bottom', metrics\.dockBottom \+ 'px'\)/);
  assert.match(fitSource, /style\.setProperty\('--editor-workspace-reserve', metrics\.workspaceReserve \+ 'px'\)/);
  assert.match(fitSource, /\[nav, scene, top, page\]/);
});

test('Android system bars remain handled by native WindowInsets, without a second JS inset offset', () => {
  assert.doesNotMatch(fitSource, /MG30AndroidInsets|getNavigationBottomInsetDp/);
  assert.doesNotMatch(nativeInit, /MG30AndroidInsets|getNavigationBottomInsetDp/);
  assert.match(nativeInit, /view\.setPadding\(insetsBaseLeft \+ systemInsets\.left/);
});
