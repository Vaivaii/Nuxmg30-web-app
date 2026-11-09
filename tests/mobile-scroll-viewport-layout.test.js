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
