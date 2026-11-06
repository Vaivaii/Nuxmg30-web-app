import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');

test('Editor has one fixed dynamic dock with centered block/model title and side navigation', () => {
  assert.ok(html.includes('id="editorParameterDock" class="editor-parameter-dock"'));
  assert.ok(html.includes('id="editorDockToggle"'));
  assert.ok(html.includes('id="editorDockBlockType"'));
  assert.ok(html.includes('id="modelCurrentName"'));
  assert.ok(html.includes('id="modelPrev"'));
  assert.ok(html.includes('id="modelNext"'));
  assert.ok(!html.includes('class="row model-select-row"'));
});

test('Existing parameter renderer mounts its live knobs inside the dock sheet', () => {
  const panelStart = html.indexOf('id="editorParameterPanel"');
  const knobMount = html.indexOf('id="knobs"', panelStart);
  const dockEnd = html.indexOf('<dialog id="ctrlEditorDialog"', panelStart);
  assert.ok(panelStart >= 0);
  assert.ok(knobMount > panelStart && knobMount < dockEnd);
  assert.ok(html.includes("$('knobs').innerHTML=controls.map"));
  assert.ok(html.includes("$('modelPrev').onclick=()=>changeSelectedModel(-1)"));
  assert.ok(html.includes("$('modelNext').onclick=()=>changeSelectedModel(1)"));
});

test('Dock expands upward, scrolls its own parameter content, and collapses from the same header', () => {
  assert.ok(html.includes('function setEditorParameterDockExpanded(expanded)'));
  assert.ok(html.includes("dock.classList.toggle('is-expanded',open)"));
  assert.ok(html.includes("setEditorParameterDockExpanded(!dock?.classList.contains('is-expanded'))"));
  assert.ok(css.includes('.editor-parameter-dock{'));
  assert.ok(css.includes('position:fixed'));
  assert.ok(css.includes('overflow-y:auto'));
  assert.ok(css.includes('transition:max-height .32s'));
});

test('Dock is hidden off the Editor page and the parameter panel closes on page navigation', () => {
  assert.ok(html.includes("dock.classList.toggle('hidden',p!=='editor')"));
  assert.ok(html.includes("if(p!=='editor')setEditorParameterDockExpanded(false)"));
  assert.ok(html.includes("setEditorParameterDockExpanded(false)"));
});
