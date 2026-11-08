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
  assert.ok(html.includes("styleIds=['editor-reference-final-v4','editor-reference-final-v5','editor-reference-final-v6']"));
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

test('Preset name is vertically centered in the compact preset card',()=>{
  const v6=html.slice(html.indexOf('<style id="editor-reference-final-v6">'),html.indexOf('</style>',html.indexOf('<style id="editor-reference-final-v6">')));
  assert.match(v6,/hardware-preset-details\{[\s\S]*?align-items:center!important/);
  assert.match(v6,/hardware-preset-name-trigger\{[\s\S]*?align-items:center!important[\s\S]*?height:100%!important/);
  assert.match(v6,/hardware-preset-name-trigger strong\{[\s\S]*?line-height:1\.15!important/);
});

test('NAM slot hides only the long QuickTone slot subtitle; built-in AMP retains Model N',()=>{
  assert.match(html,/\$\('editorSub'\)\.textContent=namProfile\?'':\('Model '\+\(s\.model\+1\)\)/);
  assert.match(html,/editor-heading'\)\?\.classList\.toggle\('is-nam-profile',!!namProfile\)/);
  const v6=html.slice(html.indexOf('<style id="editor-reference-final-v6">'),html.indexOf('</style>',html.indexOf('<style id="editor-reference-final-v6">')));
  assert.match(v6,/editor-heading\.is-nam-profile #editorSub\{[\s\S]*?display:none!important/);
});

test('Discrete AMP/pedal switches span two grid columns and keep button labels horizontal',()=>{
  assert.match(html,/function parameterGridRowCount\(controls,columns=4\)/);
  assert.match(html,/const span=isDiscreteSwitch\(control\)\?2:1/);
  assert.match(html,/parameterGridRowCount\(controls,4\)/);
  const v6=html.slice(html.indexOf('<style id="editor-reference-final-v6">'),html.indexOf('</style>',html.indexOf('<style id="editor-reference-final-v6">')));
  assert.match(v6,/knob-discrete-switch\{[\s\S]*?grid-column:span 2!important/);
  assert.match(v6,/three-way-switch\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(v6,/switch-position-button\{[\s\S]*?writing-mode:horizontal-tb!important[\s\S]*?overflow-wrap:normal!important/);
});

test('Cabinet selector placeholders are English while parameter values and IDs remain unchanged',()=>{
  assert.ok(html.includes("placeholder=p==='mic'?'Select mic':'Select position'"));
  assert.ok(html.includes("el.onchange=()=>{"));
  assert.ok(html.includes("normalizeParameterValue(param,raw)"));
  assert.ok(html.includes("sendBlockParam(selected,param,value)"));
  assert.ok(!html.includes("placeholder=p==='mic'?'Pilih mic':'Pilih posisi'"));
});

test('v6 is moved after the Vite stylesheet by the authoritative style installer',()=>{
  assert.ok(html.includes("styleIds=['editor-reference-final-v4','editor-reference-final-v5','editor-reference-final-v6']"));
  assert.ok(html.includes("document.head.appendChild(style)"));
});

test('Discrete switch cards have a compact fixed footprint and do not repeat UP/DOWN or OFF/ON labels',()=>{
  const v7=html.slice(html.indexOf('<style id="editor-reference-final-v7">'),html.indexOf('</style>',html.indexOf('<style id="editor-reference-final-v7">')));
  assert.match(v7,/knob-discrete-switch\{[\s\S]*?width:min\(100%,224px\)!important[\s\S]*?height:116px!important/);
  assert.match(v7,/three-way-switch\{[\s\S]*?height:94px!important/);
  assert.match(v7,/knob-two-way \.switch-position\{[\s\S]*?display:none!important/);
  assert.ok(html.includes("choice.position+' '+choice.label"));
  assert.ok(html.includes("data-switch-value=\"'+choice.value+'\""));
});

test('Parallel-routing connector cards are wide enough for the complete routing icon',()=>{
  const v7=html.slice(html.indexOf('<style id="editor-reference-final-v7">'),html.indexOf('</style>',html.indexOf('<style id="editor-reference-final-v7">')));
  assert.match(v7,/chain \.routing-card\{[\s\S]*?flex:0 0 38px!important[\s\S]*?width:38px!important/);
  assert.match(v7,/routing-symbol svg\{[\s\S]*?width:28px!important[\s\S]*?overflow:visible!important/);
  assert.ok(html.includes("function signalChainRoutingIcon(parallel)"));
  assert.ok(html.includes("data-routing-bit"));
});

test('Device page owns a vertical scroll viewport and reserves room above the app navigation',()=>{
  const v7=html.slice(html.indexOf('<style id="editor-reference-final-v7">'),html.indexOf('</style>',html.indexOf('<style id="editor-reference-final-v7">')));
  assert.match(v7,/#page-device:not\(\.hidden\)\{[\s\S]*?flex:1 1 0!important[\s\S]*?overflow-y:auto!important/);
  assert.match(v7,/#page-device:not\(\.hidden\)\{[\s\S]*?padding:0 0 calc\(92px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
  assert.match(html,/id="page-device" class="hidden"/);
  assert.ok(html.includes("document.querySelectorAll('[id^=\"page-\"]')"));
});

test('v7 is installed after the bundled CSS and after all earlier Editor final styles',()=>{
  assert.ok(html.includes("styleIds=['editor-reference-final-v4','editor-reference-final-v5','editor-reference-final-v6','editor-reference-final-v7']"));
  assert.ok(html.indexOf('editor-reference-final-v7')<html.indexOf('</head>'));
  assert.ok(html.includes("document.head.appendChild(style)"));
});
