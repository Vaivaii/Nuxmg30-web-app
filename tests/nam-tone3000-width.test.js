import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const irTransfer = readFileSync(new URL('../www/ir-transfer.js', import.meta.url), 'utf8');
const tone3000 = readFileSync(new URL('../www/tone3000.js', import.meta.url), 'utf8');
const modelLibrary = readFileSync(new URL('../www/nam-model-library-ui.js', import.meta.url), 'utf8');

test('mobile NAM page uses one shrinkable grid column instead of intrinsic auto width', () => {
  assert.match(css, /body\.ir-collection-manager-active > \.app > #page-nam:not\(\.hidden\)\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) !important/s);
  assert.match(css, /body\.ir-collection-manager-active > \.app > #page-nam:not\(\.hidden\)\s*\{[^}]*max-width:\s*calc\(100vw - 20px\) !important/s);
  assert.match(css, /body\.ir-collection-manager-active > \.app > #page-nam:not\(\.hidden\) > \*,\s*body\.ir-collection-layout-fallback > \.app > #page-nam:not\(\.hidden\) > \*\s*\{[^}]*min-width:\s*0 !important;[^}]*max-width:\s*100% !important/s);
});

test('loaded TONE3000 catalogue and model cards are constrained to the NAM library width', () => {
  for (const selector of [
    'body.ir-collection-manager-active #namModelLibrary .nam-model-library-content',
    'body.ir-collection-manager-active #namModelLibrary #t3kToneDetails',
    'body.ir-collection-manager-active #namModelLibrary #t3kModelList',
    'body.ir-collection-manager-active #namModelLibrary .t3k-card',
    'body.ir-collection-manager-active #namModelLibrary .t3k-card-head',
    'body.ir-collection-manager-active #namModelLibrary .t3k-actions',
  ]) {
    assert.ok(css.includes(selector), 'missing width guard for ' + selector);
  }
  assert.match(css, /body\.ir-collection-manager-active #page-nam > #namModelLibrary,[\s\S]*?max-width:\s*100% !important;[\s\S]*?box-sizing:\s*border-box !important;/);
});

test('Collection fallback also keeps the NAM page and nested TONE3000 catalogue within viewport width', () => {
  assert.match(css, /body\.ir-collection-layout-fallback > \.app > #page-nam:not\(\.hidden\)\s*\{[^}]*max-width:\s*calc\(100vw - 20px\) !important/s);
  assert.ok(css.includes('body.ir-collection-layout-fallback #namModelLibrary #t3kModelList'));
  assert.ok(css.includes('body.ir-collection-layout-fallback #namModelLibrary .t3k-card'));
});

test('TONE3000 selection still populates and moves the original catalogue node without replacing handlers', () => {
  assert.ok(tone3000.includes("const panel = document.createElement('section')"));
  assert.ok(tone3000.includes("panel.id = 'tone3000Panel'"));
  assert.ok(tone3000.includes('renderToneCatalogue(snapshot, { expand: options.expand ?? true, persist: true })'));
  assert.ok(modelLibrary.includes('content.appendChild(catalogue)'));
  assert.ok(modelLibrary.includes('stateButton.click()'));
  assert.ok(irTransfer.includes("toolNav.querySelector('#namIrModeNam')"));
  assert.ok(irTransfer.includes("toolNav.querySelector('#namIrModeTone')"));
});

test('NAM/TONE3000 width fix is cache-busted without altering transfer sources', () => {
  assert.ok(html.includes('ui-redesign.css?v=stable-ui-3'));
  assert.ok(!html.includes('ui-redesign.css?v=stable-ui-2'));
  assert.ok(!html.includes('ui-redesign.css?v=motion-lite-2'));
  assert.ok(irTransfer.includes('function toggleModelTool(mode)'));
  assert.ok(tone3000.includes('async function loadSelectedTone(toneId, options = {})'));
});

