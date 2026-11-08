import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('Editor reference layout keeps the hardware header and preset/action rows', () => {
  assert.ok(html.includes('<header class="top">'));
  assert.ok(html.includes('class="hardware-preset-card"'));
  assert.ok(html.includes('id="hardwarePresetSlot"'));
  assert.ok(html.includes('id="prevHardwarePreset"'));
  assert.ok(html.includes('id="nextHardwarePreset"'));
  assert.ok(html.includes('id="openCtrlEditor"'));
  assert.ok(html.includes('id="saveDeviceBtn"'));
  assert.ok(html.includes('Save to Device'));
});

test('AMP card contains a dynamic model selector, ON switch, artwork and inline parameters', () => {
  assert.ok(html.includes('id="editorBlockIcon"'));
  assert.ok(html.includes('id="blockQuickSelect"'));
  assert.ok(html.includes('id="blockSwitch"'));
  assert.ok(html.includes('id="modelVisual"'));
  assert.ok(html.includes('id="knobs"'));
  assert.match(html, /editorBlockIcon'\)\.innerHTML=renderBlockIcon\(b\.id\)/);
});

test('Scenes use the bottom dock with the existing scene switch and copy IDs', () => {
  assert.ok(html.includes('id="editorSceneDock"'));
  assert.ok(html.includes('id="sceneButtons"'));
  assert.ok(html.includes('id="copySceneToggle"'));
  assert.match(html, /holder\.innerHTML=items\.map\(\(item,i\)=>.*data-scene.*\(i\+1\)/);
});

test('Only UI markup/styles and render presentation changed; MIDI mapping functions remain in place', () => {
  assert.ok(html.includes('function sendBlockParam('));
  assert.ok(html.includes('function sendBlockSwitch('));
  assert.ok(html.includes("sendBlockParam(dragIndex,param,current)"));
  assert.ok(html.includes("sendBlockSwitch(selected)"));
  assert.ok(html.includes("midiSend([0xB0,80,index])"));
  assert.ok(html.includes("function renderEditor()"));
  assert.ok(html.includes("Math.ceil(controls.length/4)"));
  assert.ok(html.includes("function fitInlineParameterDials()"));
});
