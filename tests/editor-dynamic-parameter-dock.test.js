import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('All live model controls are mounted once, directly inside the AMP editor card', () => {
  const cardStart = html.indexOf('class="control main-editor-card"');
  const modelVisual = html.indexOf('id="modelVisual"', cardStart);
  const knobMount = html.indexOf('id="knobs"', modelVisual);
  const cardEnd = html.indexOf('<details class="control quick-panel"', cardStart);
  assert.ok(cardStart >= 0 && modelVisual > cardStart && knobMount > modelVisual && knobMount < cardEnd);
  assert.equal((html.match(/id="knobs"/g) || []).length, 1);
  assert.ok(html.includes("$('knobs').innerHTML=controls.map"));
  assert.ok(html.includes("sendBlockParam(dragIndex,param,current)"));
  assert.ok(html.includes("$('blockQuickSelect').onchange"));
});

test('The old floating model dock is never visible; the model selector stays in the AMP header', () => {
  assert.ok(html.includes('id="blockQuickSelect" class="block-quick-select"'));
  assert.ok(html.includes('id="modelSelect" class="hidden"'));
  assert.ok(html.includes('id="modelPrev"'));
  assert.ok(html.includes('id="modelNext"'));
  assert.match(html, /#editorParameterDock \{ display:none!important; \}/);
});

test('Parameter count determines grid rows without changing parameter mapping', () => {
  assert.ok(html.includes("Math.ceil(controls.length/4)"));
  assert.ok(html.includes("function fitInlineParameterDials()"));
  assert.ok(html.includes("holder.clientHeight/rows"));
  assert.ok(html.includes("requestAnimationFrame(fitInlineParameterDials)"));
  assert.ok(html.includes("$('knobs').dataset.parameterCount=String(controls.length)"));
  assert.ok(html.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));
  assert.ok(html.includes('grid-template-rows:repeat(var(--parameter-rows,1),minmax(0,1fr))'));
});
