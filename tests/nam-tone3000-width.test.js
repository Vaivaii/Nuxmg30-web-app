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
    'body.ir-collection-manager-active .nam-ir-tone-pane #tone3000Panel',
    'body.ir-collection-manager-active .nam-ir-tone-pane #t3kToneDetails',
    'body.ir-collection-manager-active .nam-ir-tone-pane #t3kModelList',
    'body.ir-collection-manager-active .nam-ir-tone-pane .t3k-card',
    'body.ir-collection-manager-active .nam-ir-tone-pane .t3k-card-head',
    'body.ir-collection-manager-active .nam-ir-tone-pane .t3k-actions',
  ]) {
    assert.ok(css.includes(selector), 'missing width guard for ' + selector);
  }
  assert.match(css, /body\.ir-collection-manager-active #page-nam .nam-ir-nam-pane > #namModelLibrary,[\s\S]*?max-width:\s*100% !important;[\s\S]*?box-sizing:\s*border-box !important;/);
});

test('Collection fallback also keeps the NAM page and nested TONE3000 catalogue within viewport width', () => {
  assert.match(css, /body\.ir-collection-layout-fallback > \.app > #page-nam:not\(\.hidden\)\s*\{[^}]*max-width:\s*calc\(100vw - 20px\) !important/s);
  assert.ok(css.includes('body.ir-collection-layout-fallback .nam-ir-tone-pane #t3kModelList'));
  assert.ok(css.includes('body.ir-collection-layout-fallback .nam-ir-tone-pane .t3k-card'));
});

test('TONE3000 selection keeps its original catalogue in the separate TONE3000 pane', () => {
  assert.ok(tone3000.includes("const panel = document.createElement('section')"));
  assert.ok(tone3000.includes("panel.id = 'tone3000Panel'"));
  assert.ok(tone3000.includes('renderToneCatalogue(snapshot, { expand: options.expand ?? true, persist: true })'));
  assert.ok(modelLibrary.includes("panel.id = 'namModelLibrary'"));
  assert.ok(modelLibrary.includes('namPane.insertBefore(panel, legacyPanel)'));
  assert.ok(!modelLibrary.includes('content.appendChild(catalogue)'));
  assert.ok(irTransfer.includes("if(child===tonePanel||child.id==='tone3000Panel')tonePane.appendChild(child)"));
  assert.ok(irTransfer.includes("toolNav.querySelector('#namIrModeNam')"));
  assert.ok(irTransfer.includes("toolNav.querySelector('#namIrModeTone')"));
});

test('NAM/TONE3000 width fix is cache-busted without altering transfer sources', () => {
  assert.ok(html.includes('ui-redesign.css?v=stable-ui-8'));
  assert.ok(!html.includes('ui-redesign.css?v=stable-ui-2'));
  assert.ok(!html.includes('ui-redesign.css?v=motion-lite-2'));
  assert.ok(irTransfer.includes('function toggleModelTool(mode)'));
  assert.ok(tone3000.includes('async function loadSelectedTone(toneId, options = {})'));
});


 
test('NAM and TONE3000 expanded content stays in normal flow and pushes Collection down', () => {
  const dynamicPane = css.lastIndexOf('body.ir-collection-manager-active #page-nam .nam-ir-tool-pane:not([hidden])');
  assert.ok(dynamicPane >= 0, 'dynamic visible-pane sizing override exists');
  const paneBlock = css.slice(dynamicPane, css.indexOf('}', dynamicPane));
  assert.ok(paneBlock.includes('max-height: none !important;'));
  assert.ok(paneBlock.includes('overflow: visible !important;'));

  const expanded = css.lastIndexOf('body.ir-collection-manager-active #page-nam .nam-ir-tone-pane .t3k-catalogue.is-expanded {');
  assert.ok(expanded >= 0, 'expanded catalogue flow override exists');
  const expandedBlock = css.slice(expanded, css.indexOf('}', expanded));
  assert.ok(expandedBlock.includes('position: relative !important;'));
  assert.ok(expandedBlock.includes('display: block !important;'));
  assert.ok(expandedBlock.includes('height: auto !important;'));
  assert.doesNotMatch(expandedBlock, /position:\\s*fixed/);

  const modelList = css.lastIndexOf('body.ir-collection-manager-active #page-nam .nam-ir-tone-pane .t3k-catalogue.is-expanded #t3kModelList {');
  assert.ok(modelList >= 0, 'expanded model list has an internal scroll area');
  const modelBlock = css.slice(modelList, css.indexOf('}', modelList));
  assert.ok(modelBlock.includes('max-height: min(38dvh, 440px) !important;'));
  assert.ok(modelBlock.includes('overflow-y: auto !important;'));
});

test('NAM Library has a larger independent list scroller and pane changes resize Collection', () => {
  const libraryList = css.lastIndexOf('body.ir-collection-manager-active #page-nam .nam-library-list {');
  assert.ok(libraryList >= 0, 'NAM Library list sizing override exists');
  const listBlock = css.slice(libraryList, css.indexOf('}', libraryList));
  assert.ok(listBlock.includes('max-height: min(38dvh, 440px);'));
  assert.ok(listBlock.includes('overflow-y: auto;'));
  assert.ok(irTransfer.includes('new ResizeObserver(() => {'));
  assert.ok(irTransfer.includes('toolsResizeObserver.observe(toolsFrame)'));
});
