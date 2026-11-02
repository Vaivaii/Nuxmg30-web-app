import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const studioCss = readFileSync(new URL('../www/studio-daw.css', import.meta.url), 'utf8');
const irTransfer = readFileSync(new URL('../www/ir-transfer.js', import.meta.url), 'utf8');

test('app-wide motion layer provides short entrances for every main app tab', () => {
  assert.ok(css.includes('@keyframes mg30-page-enter'));
  assert.ok(css.includes('body>.app>section[id^="page-"]:not(.hidden)'));
  assert.ok(css.includes('animation:mg30-page-enter .18s ease-out both'));
  assert.ok(css.includes('@keyframes mg30-content-enter'));
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
  assert.ok(html.includes('ui-redesign.css?v=motion-lite-2'));
  assert.ok(!html.includes('ui-redesign.css?v=param-quantize-1'));
});


test('Studio panels containing the fixed DAW dock use opacity-only entrance animations', () => {
  assert.ok(css.includes('@keyframes mg30-studio-panel-fade{from{opacity:0}to{opacity:1}}'));
  assert.ok(css.includes('#page-studio [data-studio-mode-panel]:not(.hidden),'));
  assert.ok(css.includes('#page-studio [data-daw-page-panel]:not(.hidden){animation:mg30-studio-panel-fade .16s ease-out both}'));
  assert.ok(!css.includes('#page-studio [data-daw-page-panel]:not(.hidden){animation:mg30-content-enter'));
  assert.ok(!css.includes('#page-studio [data-studio-mode-panel]:not(.hidden){animation:mg30-content-enter'));
  assert.ok(studioCss.includes('#page-studio #dawStudioDock'));
  assert.ok(studioCss.includes('position:fixed!important'));
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
