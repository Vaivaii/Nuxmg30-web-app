import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('Reference Editor is a fixed-height mobile workspace without vertical page scrolling', () => {
  assert.match(html, /#page-editor:not\(\.hidden\)[\s\S]*?overflow:hidden!important/);
  assert.match(html, /\.app \{[\s\S]*?height:100dvh!important[\s\S]*?overflow:hidden!important/);
  assert.doesNotMatch(html, /#page-editor:not\(\.hidden\)[^}]*overflow-y:auto/);
});

test('Preset row, CTRL/EXP and Save actions, chain, AMP, Scene dock and tab bar use the reference order', () => {
  assert.match(html, /\.hardware-preset-card \{[\s\S]*?order:1!important/);
  assert.match(html, /\.editor-topbar \{[\s\S]*?order:2!important/);
  assert.match(html, /\.signal-chain-panel \{[\s\S]*?order:3!important/);
  assert.match(html, /#page-editor > \.editor \{[\s\S]*?order:4!important/);
  assert.match(html, /#editorSceneDock\s*\{[\s\S]*?position:fixed!important/);
  assert.match(html, /\.nav \{[\s\S]*?position:fixed!important/);
});

test('Signal-chain cards show only block names and dim bypassed effects', () => {
  assert.match(html, /\.chain \.block small \{ display:none!important; \}/);
  assert.match(html, /\.chain \.block\.off \{ opacity:\.34!important/);
});

test('Scene buttons are docked above the app tabs and retain Copy Scene control', () => {
  assert.match(html, /id="editorSceneDock"/);
  assert.match(html, /id="sceneButtons"/);
  assert.match(html, /id="copySceneToggle"/);
  assert.match(html, /bottom:calc\(66px \+ env\(safe-area-inset-bottom,0px\)\)/);
});
