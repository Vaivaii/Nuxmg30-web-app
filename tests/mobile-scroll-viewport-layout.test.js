import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
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

test('NAM and IR Collection is a bounded fourth flex region below the NAM library', () => {
  const selector = 'body.ir-collection-manager-active > .app > #page-nam:not(.hidden)';
  const page = cssBlock(css, selector);
  assert.match(page, /position:\s*fixed/);
  assert.match(page, /display:\s*flex\s*!important/);
  assert.match(page, /flex-direction:\s*column\s*!important/);
  assert.match(page, /overflow:\s*hidden/);
  assert.doesNotMatch(page, /grid-template-rows/);
  assert.ok(irTransfer.includes('const frameHeight=Math.max(0,Math.floor(navTop-frameTop-12));'));
  assert.match(irTransfer, /collectionFrame\.getBoundingClientRect\(\)\.top/);
  assert.match(irTransfer, /collectionFrame\.style\.setProperty\('--ir-collection-frame-height'/);
  assert.match(irTransfer, /grid\?\.closest\('\.ir-collection-frame'\)\?\.style\.removeProperty\('--ir-collection-frame-height'/);
  assert.match(css, /flex:\s*0 0 var\(--ir-collection-frame-height, auto\) !important/);
  assert.match(css, /height:\s*var\(--ir-collection-frame-height, auto\) !important/);
  assert.match(irTransfer, /page\.style\.setProperty\('--ir-collection-manager-top'/);
  assert.match(irTransfer, /page\.style\.setProperty\('--ir-collection-manager-bottom'/);
  assert.match(namLibrary, /namPane\.insertBefore\(panel,\s*legacyPanel\)/,
    'the permanent NAM Library is mounted inside the NAM tab above the retired single-file transfer panel');
});

test('Collection grid remains the only 24-slot vertical scroller with a full fade-safe tail', () => {
  const grid = cssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-grid');
  assert.match(grid, /flex:\s*1 1 0/);
  assert.match(grid, /min-height:\s*0\s*!important/);
  assert.match(grid, /overflow-y:\s*auto\s*!important/);
  assert.match(grid, /padding:\s*7px 6px 64px/);
  assert.match(grid, /scroll-padding-bottom:\s*64px/);
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

test('Preset Manager outer frame bounds the independently scrolling card list', () => {
  const frame = cssBlock(presetCss, '#page-presets .preset-library-frame');
  assert.match(frame, /position:\s*relative/);
  assert.match(frame, /display:\s*flex/);
  assert.match(frame, /min-height:\s*260px/);
  assert.match(frame, /overflow:\s*hidden/);
  const list = cssBlock(presetCss, '#page-presets .preset-library-card-list');
  assert.match(list, /flex:\s*1 1 0/);
  assert.match(list, /min-height:\s*0/);
  assert.match(list, /padding:\s*9px 8px 32px/);
  assert.match(list, /overflow-y:\s*auto/);
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
  assert.ok(grid.includes('grid-template-columns: minmax(0, 1fr) !important;'));
  assert.ok(grid.includes('padding: 8px 7px 14px !important;'));
  const card = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-slot,');
  assert.ok(card.includes('display: grid !important;'));
  assert.ok(card.includes('grid-template-columns: 64px minmax(0, 1fr) minmax(96px, 112px) !important;'));
  assert.ok(css.includes('display: contents !important;'));
  assert.ok(irTransfer.includes('data-slot-import'));
  assert.ok(irTransfer.includes('data-slot-use'));
  assert.ok(irTransfer.includes('for(let slot=1;slot<=24;slot++)'));
});

test('IR Collection and Preset Manager reserve safe space above the bottom navigation', () => {
  assert.ok(irTransfer.includes('const bottom=Math.max(0,Math.ceil(window.innerHeight-navTop)+12);'));
  assert.ok(presetUi.includes('const bottom = Math.max(0, Math.ceil(window.innerHeight - navTop) + 12);'));
  const list = cssBlock(presetCss, '#page-presets .preset-library-card-list');
  assert.ok(list.includes('padding: 9px 8px 32px;'));
  assert.ok(list.includes('scroll-padding: 9px 0 32px;'));
  const irGrid = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-grid {');
  assert.ok(irGrid.includes('padding: 7px 6px 64px;'));
});

test('bottom navigation is only slightly shorter and all five tab buttons remain intact', () => {
  const nav = lastCssBlock(css, 'body > .app > .nav {');
  assert.ok(nav.includes('padding: 5px 8px calc(5px + env(safe-area-inset-bottom, 0px)) !important;'));
  const button = lastCssBlock(css, 'body > .app > .nav button {');
  assert.ok(button.includes('padding: 4px 2px 2px !important;'));
  assert.ok(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
});


test('IR slot number is a full-height filled rail with a separate divider, matching preset card anatomy', () => {
  const card = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-slot,');
  const number = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-slot-number,');
  assert.ok(number.includes('width: 64px !important;'));
  assert.ok(number.includes('height: 100% !important;'));
  assert.ok(card.includes('grid-template-rows: repeat(3, minmax(0, 1fr)) !important;'));
  assert.ok(card.includes('min-height: 80px !important;'));
  assert.ok(number.includes('background: rgba(0, 0, 0, .13) !important;'));
  assert.ok(number.includes('border: 0 !important;'));
  assert.ok(number.includes('border-radius: 11px 0 0 11px !important;'));
  assert.ok(!number.includes('border-right: 3px solid #7d8982'));
  const divider = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-slot-number::after,');
  assert.ok(divider.includes('top: 0 !important;'));
  assert.ok(divider.includes('bottom: 0 !important;'));
  assert.ok(divider.includes('width: 3px !important;'));
  assert.ok(divider.includes('background: #75847d !important;'));
});


test('Preset Manager fade is an absolute non-interactive sibling pinned to the outer frame bottom', () => {
  assert.equal((presetCss.match(/#page-presets \.preset-library-fade/g) || []).length, 2);
  const fade = cssBlock(presetCss, '#page-presets .preset-library-fade');
  assert.ok(fade.includes('position: absolute;'));
  assert.ok(fade.includes('bottom: 0;'));
  assert.ok(fade.includes('right: 0;'));
  assert.ok(fade.includes('left: 0;'));
  assert.ok(fade.includes('height: 32px;'));
  assert.ok(fade.includes('z-index: 20;'));
  assert.ok(fade.includes('pointer-events: none;'));
  assert.ok(!presetCss.includes('.preset-library-card-list::after'));
  const htmlFrame = html.indexOf('<div class="preset-library-frame">');
  const htmlList = html.indexOf('id="presetLibraryCards"', htmlFrame);
  const htmlFade = html.indexOf('class="preset-library-fade"', htmlList);
  assert.ok(htmlFrame >= 0 && htmlList > htmlFrame && htmlFade > htmlList,
    'the fade is a sibling after the scroll list inside the outer frame');
});


test('full-height IR rail retains the red used-in-current-preset state marker', () => {
  const used = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-slot-number.is-used-in-current-preset,');
  assert.ok(used.includes('background: #e53935 !important;'));
  assert.ok(used.includes('color: #fff !important;'));
  assert.ok(used.includes('box-shadow: 0 0 0 2px rgba(229, 57, 53, .16) !important;'));
});


test('IR Collection outer frame is a bounded flex column containing the inner scrollport', () => {
  const card = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam #ir-manager-ui > .ir-manager-card.ir-collection-frame {');
  assert.ok(card.includes('position: relative;'));
  assert.ok(card.includes('display: flex !important;'));
  assert.ok(card.includes('flex: 0 0 var(--ir-collection-frame-height, auto) !important;'));
  assert.ok(card.includes('min-height: 0;'));
  assert.ok(card.includes('overflow: hidden;'));
  const grid = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-grid {');
  assert.ok(grid.includes('height: auto !important;'));
  assert.ok(grid.includes('min-height: 0 !important;'));
  assert.ok(grid.includes('max-height: none !important;'));
  assert.ok(grid.includes('align-self: stretch !important;'));
  assert.ok(grid.includes('box-sizing: border-box;'));
  assert.ok(grid.includes('overflow-y: auto !important;'));
});

test('Community .23 WebView cache tokens are advanced for both corrected layout stylesheets', () => {
  assert.ok(html.includes('ui-redesign.css?v=stable-ui-8'));
  assert.ok(html.includes('preset-library-ui.css?v=card-v5'));
});


test('IR Collection uses a bounded flex chain and a sibling fade without changing slot actions', () => {
  const root = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam > #ir-import-content.ir-import-content {');
  assert.ok(root.includes('display: flex !important;'));
  assert.ok(root.includes('flex: 1 1 0;'));
  assert.ok(root.includes('flex-direction: column !important;'));
  assert.ok(root.includes('height: auto !important;'));
  assert.ok(!root.includes('grid-template-rows'));
  assert.ok(!root.includes('height: 100%'));

  const manager = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam #ir-manager-ui.ir-manager-grid {');
  assert.ok(manager.includes('display: flex !important;'));
  assert.ok(manager.includes('flex: 1 1 0;'));
  assert.ok(manager.includes('min-height: 0;'));
  assert.ok(!manager.includes('height: 100%'));

  const card = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam #ir-manager-ui > .ir-manager-card.ir-collection-frame {');
  assert.ok(card.includes('position: relative;'));
  assert.ok(card.includes('display: flex !important;'));
  assert.ok(card.includes('flex: 0 0 var(--ir-collection-frame-height, auto) !important;'));
  assert.ok(card.includes('min-height: 0;'));
  assert.ok(card.includes('overflow: hidden;'));

  const grid = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-grid {');
  assert.ok(grid.includes('flex: 1 1 0;'));
  assert.ok(grid.includes('height: auto !important;'));
  assert.ok(grid.includes('min-height: 0 !important;'));
  assert.ok(grid.includes('overflow-y: auto !important;'));
  assert.ok(!grid.includes('height: 100%'));

  const fade = lastCssBlock(css, 'body.ir-collection-manager-active #page-nam .ir-collection-fade {');
  assert.ok(fade.includes('position: absolute;'));
  assert.ok(fade.includes('bottom: 0;'));
  assert.ok(fade.includes('pointer-events: none;'));
  const statusIndex = irTransfer.indexOf('id="irManagerCollectionStatus"');
  const gridIndex = irTransfer.indexOf('id="irManagerCollectionGrid"');
  const fadeIndex = irTransfer.indexOf('class="ir-collection-fade"');
  assert.ok(statusIndex > 0 && statusIndex < gridIndex && fadeIndex > gridIndex);
  assert.ok(irTransfer.includes('class="ir-manager-card ir-collection-frame"'));
  assert.ok(irTransfer.includes('data-slot-import'));
  assert.ok(irTransfer.includes('data-slot-use'));
  assert.ok(irTransfer.includes('for(let slot=1;slot<=24;slot++)'));
});

test('Community .23 cache tokens point to the corrected layout stylesheets', () => {
  assert.ok(html.includes('ui-redesign.css?v=stable-ui-8'));
  assert.ok(html.includes('preset-library-ui.css?v=card-v5'));
});


test('Collection root selector has one authoritative flex sizing rule', () => {
  const rootSelector = 'body.ir-collection-manager-active #page-nam > #ir-import-content.ir-import-content {';
  assert.equal(css.split(rootSelector).length - 1, 1);
  const root = lastCssBlock(css, rootSelector);
  assert.ok(root.includes('order: 4;'));
  assert.ok(root.includes('display: flex !important;'));
  assert.ok(root.includes('flex: 1 1 0;'));
  assert.ok(!root.includes('grid-row: 4;'));
  assert.ok(!root.includes('grid-template-rows'));
});
