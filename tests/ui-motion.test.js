import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const studioCss = readFileSync(new URL('../www/studio-daw.css', import.meta.url), 'utf8');
const studioJs = readFileSync(new URL('../www/studio-daw.js', import.meta.url), 'utf8');
const irTransfer = readFileSync(new URL('../www/ir-transfer.js', import.meta.url), 'utf8');

test('main app pages are covered by the horizontal navigation motion layer', () => {
  assert.ok(css.includes('@keyframes mg30-page-enter'));
  assert.ok(css.includes('body>.app>section[id^="page-"]:not(.hidden){animation:none}'));
  assert.ok(html.includes('function playHorizontalSlide(node,offset)'));
  for (const id of ['page-editor', 'page-nam', 'page-presets', 'page-studio', 'page-device', 'page-backup']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing app tab: ' + id);
  }
});

test('all native popup dialogs get a lightweight entrance and backdrop fade', () => {
  assert.ok(css.includes('@keyframes mg30-dialog-enter'));
  assert.ok(css.includes('dialog[open]{'));
  assert.ok(css.includes('animation:mg30-dialog-enter .19s'));
  assert.ok(css.includes('dialog[open]::backdrop'));
  assert.ok(css.includes('@keyframes mg30-backdrop-enter'));
  for (const id of ['ctrlEditorDialog', 'presetImportProgressDialog', 'dawStemDialog', 'renameTakeDialog']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing dialog: ' + id);
  }
});

test('menus, controls, cards and toast have bounded micro-interactions', () => {
  assert.ok(css.includes('@keyframes mg30-popup-enter'));
  assert.ok(css.includes('.scene-copy-menu:not([hidden])'));
  assert.ok(css.includes('.app .preset-jump-menu:not(.hidden)'));
  assert.ok(css.includes('.app details[open]>:not(summary)'));
  assert.ok(css.includes('.app button:not(:disabled):not(.daw-playhead-hit):active'));
  assert.ok(css.includes('.app input:not([type="range"])'));
  assert.ok(css.includes('.app .preset-library-card'));
  assert.ok(css.includes('@keyframes mg30-toast-enter'));
  assert.ok(css.includes('.app .toast.show'));
});

test('reduced-motion preference disables app-wide motion', () => {
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('animation-duration:.01ms!important'));
  assert.ok(css.includes('transition-duration:.01ms!important'));
  assert.ok(css.includes('scroll-behavior:auto!important'));
});

test('shared stylesheet cache token is bumped for the motion layer', () => {
  assert.ok(html.includes('ui-redesign.css?v=editor-fluid-1'));
  assert.ok(!html.includes('ui-redesign.css?v=param-quantize-1'));
});


test('Main app navigation uses directional horizontal transform/opacity motion', () => {
  assert.ok(html.includes('function playHorizontalSlide(node,offset)'));
  assert.ok(html.includes('window.MG30PlayHorizontalSlide=playHorizontalSlide'));
  assert.ok(html.includes("playHorizontalSlide(targetPage,offset)"));
  assert.ok(html.includes("targetPage.querySelector('.studio-fixed-header')"));
  assert.ok(html.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)').matches"));
  assert.ok(html.includes("duration:240,easing:'cubic-bezier(.22,1,.36,1)',fill:'none'"));
  assert.ok(css.includes('body>.app>section[id^="page-"]:not(.hidden){animation:none}'));
});

test('Studio and DAW sub-tabs slide horizontally without moving the fixed transport dock', () => {
  assert.ok(studioJs.includes("window.MG30PlayHorizontalSlide?.(panel, offset)"));
  assert.ok(studioJs.includes("const previous = workspace?.querySelector('[data-daw-page].active')"));
  assert.ok(studioJs.includes("const previous = studio?.querySelector('[data-studio-mode].active')"));
  const dockIndex = html.indexOf('id="dawStudioDock"');
  const dawWorkspaceIndex = html.indexOf('id="studio-daw-workspace"');
  assert.ok(dawWorkspaceIndex >= 0 && dockIndex > dawWorkspaceIndex);
  assert.ok(html.slice(dawWorkspaceIndex, dockIndex).includes('</section>'));
  assert.ok(studioCss.includes('#page-studio #dawStudioDock'));
  assert.ok(studioCss.includes('position:fixed!important'));
});

test('Editor artwork is slightly smaller, taller in its stage, and Scenes sit lower', () => {
  assert.ok(css.includes('height:clamp(136px,18dvh,172px) !important'));
  assert.ok(css.includes('transform:scale(.92) !important'));
  assert.ok(css.includes('margin-top:auto !important'));
  assert.ok(css.includes('height:clamp(112px,16dvh,136px) !important'));
});

test('Editor parameter sheet is behind its dock header and bottom navigation', () => {
  assert.ok(css.includes('.editor-dock-backdrop { z-index:58; }'));
  assert.ok(css.includes('.editor-parameter-dock { z-index:59; isolation:isolate; }'));
  assert.ok(css.includes('.editor-parameter-panel { z-index:1; }'));
  assert.ok(css.includes('.editor-model-dock { position:relative; z-index:2; }'));
  assert.ok(css.includes('z-index:60'));
});


test('NAM and TONE3000 panes use opacity-only entrance to preserve mobile width layout', () => {
  assert.ok(irTransfer.includes("namPane.className='nam-ir-tool-pane nam-ir-nam-pane'"));
  assert.ok(irTransfer.includes("tonePane.className='nam-ir-tool-pane nam-ir-tone-pane'"));
  assert.ok(css.includes('@keyframes mg30-nam-pane-fade{from{opacity:0}to{opacity:1}}'));
  assert.ok(css.includes('#page-nam .nam-ir-tool-pane:not([hidden]){animation:mg30-nam-pane-fade .16s ease-out both}'));
  assert.ok(!css.includes('#page-nam .nam-ir-tool-pane:not([hidden]){animation:mg30-content-enter'));
  assert.ok(css.includes('.nam-ir-tools-stage { min-width: 0; }'));
  assert.ok(css.includes('.nam-ir-tool-pane:not([hidden]) { display: block; min-width: 0; margin-top: 7px; }'));
});


test('Editor viewport is fixed and the parameter sheet uses transform-only animation', () => {
  assert.match(css, /editor-parameter-panel\s*\{[\s\S]*?position: absolute !important/);
  assert.match(css, /transform: translate3d\(0, calc\(100% \+ 8px\), 0\)/);
  assert.match(css, /transform \.4s cubic-bezier\(\.22, 1, \.36, 1\)/);
  assert.doesNotMatch(css, /transition:max-height/);
  assert.match(css, /#page-editor:not\(\.hidden\)\s*\{[\s\S]*?overflow: hidden !important/);
});


test('non-AMP gear artwork uses separate visual scale classes', () => {
  assert.ok(html.includes('const artClass=block.id==="AMP"?"gear-art-amp"'));
  assert.ok(html.includes('"IR"?"gear-art-cabinet"'));
  assert.ok(html.includes('"WAH"?"gear-art-expression"'));
  assert.ok(css.includes('.gear-art.gear-art-amp .gear-svg'));
  assert.ok(css.includes('transform:scale(.80) !important'));
  assert.ok(css.includes('transform:scale(.78) !important'));
  assert.ok(css.includes('transform:scale(.72) !important'));
  assert.ok(css.includes('transform:scale(.84) !important'));
});

test('parameter sheet height follows its contents and only caps long knob sets', () => {
  assert.ok(css.includes('height:auto !important;'));
  assert.ok(css.includes('min-height:0 !important;'));
  assert.ok(css.includes('max-height:min(64dvh,580px) !important;'));
  assert.ok(css.includes('.editor-parameter-panel .knobs {'));
  assert.ok(!css.includes('height: min(62dvh, 580px); min-height: 180px;'));
});

test('moving pages reveal a stable app-shell gradient rather than the body gradient', () => {
  assert.ok(css.includes('body > .app {\n    background:radial-gradient(ellipse at 75% -10%,#283522 0,transparent 38%),#0b1012 !important;'));
});

test('Studio dock is positioned synchronously before Studio is made visible', () => {
  assert.ok(html.includes("if(p==='studio')window.MG30SyncStudioPinnedControls?.();"));
  assert.ok(studioJs.includes('window.MG30SyncStudioPinnedControls = syncStudioPinnedControls;'));
  assert.ok(!studioJs.includes('window.requestAnimationFrame(syncStudioPinnedControls)'));
});
