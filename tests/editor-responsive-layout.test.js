import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');

test('Mobile Editor workspace scrolls above fixed dock and tab navigation', () => {
  const start = css.lastIndexOf('/* Android 3-button / compact-height recovery:');
  assert.ok(start >= 0, 'final Editor scroll recovery rules exist');
  const rules = css.slice(start);
  assert.match(rules, /#page-editor:not\(\.hidden\)[\s\S]*?overflow-y:auto!important/);
  assert.match(rules, /padding:0 0 calc\(220px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
  assert.match(rules, /scroll-padding-bottom:calc\(220px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
});

test('Editor and AMP card no longer clip Scene buttons or force a viewport-sized card', () => {
  const start = css.lastIndexOf('/* Android 3-button / compact-height recovery:');
  const rules = css.slice(start);
  assert.match(rules, /#page-editor > \.editor\s*\{[\s\S]*?overflow:visible!important/);
  assert.match(rules, /#page-editor > \.editor > \.main-editor-card\s*\{[\s\S]*?height:auto!important[\s\S]*?overflow:visible!important/);
  assert.match(rules, /\.main-editor-card \.scene-bar\s*\{[\s\S]*?margin:8px 0 8px!important/);
});
