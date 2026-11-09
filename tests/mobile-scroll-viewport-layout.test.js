import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');
const presetCss = readFileSync(new URL('../www/preset-library-ui.css', import.meta.url), 'utf8');
const presetUi = readFileSync(new URL('../www/preset-library-ui.js', import.meta.url), 'utf8');
const irTransfer = readFileSync(new URL('../www/ir-transfer.js', import.meta.url), 'utf8');
const namLibrary = readFileSync(new URL('../www/nam-model-library-ui.js', import.meta.url), 'utf8');

function cssBlock(source, selector) {
  const start = source.indexOf(selector);
  assert.ok(start >= 0, 'missing CSS selector: ' + selector);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  assert.ok(open > start && close > open, 'invalid CSS block for: ' + selector);
  return source.slice(open + 1, close);
}

test('NAM and IR Collection receives its own fourth grid row below the NAM library', () => {
  const selector = 'body.ir-collection-manager-active > .app > #page-nam:not(.hidden)';
  const page = cssBlock(css, selector);
  assert.match(page, /position:\s*fixed/);
  assert.match(page, /grid-template-rows:\s*max-content max-content max-content minmax\(0, 1fr\)\s*!important/);
  assert.match(irTransfer, /const bottom\s*=\s*Math\.max\(0,\s*Math\.ceil\(window\.innerHeight\s*-\s*navTop\)\)/);
  assert.match(irTransfer, /page\.style\.setProperty\('--ir-collection-manager-top'/);
  assert.match(irTransfer, /page\.style\.setProperty\('--ir-collection-manager-bottom'/);
  assert.match(namLibrary, /page\.insertBefore\(panel,\s*irContent\)/,
    'the Downloaded / Available NAM panel remains a direct child before Collection');
});

test('Collection grid remains the only 24-slot vertical scroller and keeps safe end spacing', () => {
  const grid = cssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-grid');
  assert.match(grid, /min-height:\s*0/);
  assert.match(grid, /overflow-y:\s*auto\s*!important/);
  assert.match(grid, /padding:\s*7px 6px 12px/);
  assert.match(grid, /scroll-padding-bottom:\s*12px/);
  assert.match(irTransfer, /for\(let slot=1;slot<=24;slot\+\+\)/,
    'all 24 Collection records remain restored');
});

test('Preset Manager fixed viewport consumes measured header/nav edges, not document flex height', () => {
  const selector = 'body.preset-manager-active > .app > #page-presets.preset-library-page:not(.hidden)';
  const page = cssBlock(css, selector);
  assert.match(page, /position:\s*fixed\s*!important/);
  assert.match(page, /top:\s*var\(--preset-manager-top, 166px\)\s*!important/);
  assert.match(page, /bottom:\s*var\(--preset-manager-bottom, 107px\)\s*!important/);
  assert.match(page, /left:\s*10px\s*!important/);
  assert.match(page, /right:\s*10px\s*!important/);
  assert.doesNotMatch(page, /position:\s*relative/);
  assert.match(presetUi, /const headerBottom\s*=\s*topBar\.getBoundingClientRect\(\)\.bottom/);
  assert.match(presetUi, /const navTop\s*=\s*nav\.getBoundingClientRect\(\)\.top/);
  assert.match(presetUi, /page\.style\.setProperty\('--preset-manager-top'/);
  assert.match(presetUi, /page\.style\.setProperty\('--preset-manager-bottom'/);
});

test('Preset Manager card list remains independently scrollable inside the measured viewport', () => {
  const list = cssBlock(css, 'body.preset-manager-active #page-presets .preset-library-card-list');
  assert.match(list, /flex:\s*1 1 0\s*!important/);
  assert.match(list, /min-height:\s*0\s*!important/);
  assert.match(list, /overflow-y:\s*auto\s*!important/);
  const legacyFallback = cssBlock(presetCss, '#page-presets .preset-library-card-list');
  assert.match(legacyFallback, /overflow-y:\s*auto/);
  assert.match(presetUi, /selected\?\.scrollIntoView\(\{ block: 'nearest', behavior: 'smooth' \}\)/);
});


function lastCssBlock(source, selector) {
  const start = source.lastIndexOf(selector);
  assert.ok(start >= 0, 'missing final CSS selector: ' + selector);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  assert.ok(open > start && close > open, 'invalid final CSS block for: ' + selector);
  return source.slice(open + 1, close);
}

test('IR Collection uses compact one-column horizontal slot cards without changing slot actions', () => {
  const grid = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-grid,');
  assert.match(grid, /grid-template-columns:\\s*minmax\\(0, 1fr\\)\\s*!important/);
  assert.match(grid, /padding:\\s*8px 7px 14px\\s*!important/);
  const card = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-slot,');
  assert.match(card, /display:\\s*grid\\s*!important/);
  assert.match(card, /grid-template-columns:\\s*42px minmax\\(0, 1fr\\) minmax\\(96px, 112px\\)\\s*!important/);
  assert.match(css, /\\.ir-collection-slot-head,\\s*body\\.ir-collection-layout-fallback #page-nam \\.ir-collection-slot-head\\s*\\{\\s*display:\\s*contents\\s*!important/);
  assert.match(irTransfer, /data-slot-import/);
  assert.match(irTransfer, /data-slot-use/);
  assert.match(irTransfer, /for\\(let slot=1;slot<=24;slot\\+\\+\\)/);
});

test('IR Collection and Preset Manager reserve a 12px gap above the bottom navigation', () => {
  assert.match(irTransfer, /const bottom=Math\\.max\\(0,Math\\.ceil\\(window\\.innerHeight-navTop\\)\\+12\\)/);
  assert.match(presetUi, /const bottom = Math\\.max\\(0, Math\\.ceil\\(window\\.innerHeight - navTop\\) \\+ 12\\)/);
  assert.match(css, /body\\.preset-manager-active #page-presets \\.preset-library-card-list\\s*\\{\\s*padding-bottom:\\s*16px\\s*!important;\\s*scroll-padding-bottom:\\s*16px\\s*!important/);
});

test('bottom navigation is only slightly shorter and all five tab buttons remain intact', () => {
  const nav = lastCssBlock(css, 'body > .app > .nav {');
  assert.match(nav, /padding:\\s*5px 8px calc\\(5px \\+ env\\(safe-area-inset-bottom, 0px\\)\\)\\s*!important/);
  const button = lastCssBlock(css, 'body > .app > .nav button {');
  assert.match(button, /padding:\\s*4px 2px 2px\\s*!important/);
  assert.match(css, /grid-template-columns:\\s*repeat\\(5, minmax\\(0, 1fr\\)\\)/);
});
