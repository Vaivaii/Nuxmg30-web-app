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
  assert.ok(html.includes("parameterGridRowCount(controls,4)"));
  assert.ok(html.includes("const span=isDiscreteSwitch(control)?2:1"));
  assert.ok(html.includes("function fitInlineParameterDials()"));
});

test('The visible Tone Workspace / Tone Editor header and both actions remain mounted', () => {
  assert.ok(html.includes('<span class="eyebrow">TONE WORKSPACE</span><strong>Tone Editor</strong>'));
  assert.ok(html.includes('id="openCtrlEditor"'));
  assert.ok(html.includes('id="saveDeviceBtn"'));
});

test('Signal Chain wrapper exposes scroll arrows without replacing the existing chain mount', () => {
  assert.ok(html.includes('<div class="chain" id="chain"></div>'));
  assert.ok(html.includes('id="chainScrollPrev"'));
  assert.ok(html.includes('id="chainScrollNext"'));
});

test('The final Editor cascade keeps the original parameter renderer, MIDI handlers and Scene controls', () => {
  assert.ok(html.includes('id="knobs"'));
  assert.ok(html.includes('function parameterControls('));
  assert.ok(html.includes('function sendBlockParam('));
  assert.ok(html.includes('function sendBlockSwitch('));
  assert.ok(html.includes('id="editorSceneDock"'));
  assert.ok(html.includes('id="sceneButtons"'));
  assert.ok(html.includes('id="copySceneToggle"'));
});


test('NAM slot subtitle is stacked below AMP and left-aligned like built-in model subtitles', () => {
  const start = html.indexOf('<style id="editor-reference-final-v9">');
  const end = html.indexOf('</style>', start);
  assert.ok(start >= 0 && end > start, 'the final Editor cascade must be present');
  const finalCascade = html.slice(start, end);
  const headingRuleStart = finalCascade.indexOf('.editor-heading.is-nam-profile>div{');
  assert.ok(headingRuleStart >= 0, 'NAM heading content must have a dedicated layout rule');
  const headingRuleEnd = finalCascade.indexOf('}', headingRuleStart);
  const headingRule = finalCascade.slice(headingRuleStart, headingRuleEnd);
  assert.ok(headingRule.includes('flex-direction:column!important'));
  assert.ok(headingRule.includes('align-items:flex-start!important'));
  assert.ok(finalCascade.includes('.editor-heading.is-nam-profile #editorSub{'));
  assert.ok(html.includes("$('editorSub').closest('.editor-heading')?.classList.toggle('is-nam-profile',!!namProfile)"));
});
