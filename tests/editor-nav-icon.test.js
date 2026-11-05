import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('Editor navigation keeps its page target and label while showing an amp-head icon', () => {
  const editorButton = html.match(/<button class="active" data-page="editor">([\s\S]*?)<\/button>/);
  assert.ok(editorButton, 'Editor navigation button must remain present');
  assert.match(editorButton[0], /data-page="editor"/);
  assert.match(editorButton[0], /<span>Editor<\/span>/);
  assert.match(editorButton[0], /<svg viewBox="0 0 24 24">/);
  assert.match(editorButton[0], /<circle cx="7\.2" cy="10" r="1"\/>/);
  assert.match(editorButton[0], /<circle cx="16\.8" cy="10" r="1"\/>/);
  assert.match(editorButton[0], /M8 5\.5v-1a1 1 0 0 1 1-1h6/);
  assert.match(editorButton[0], /M7 15\.7h10M8 17\.6h8/);
  assert.doesNotMatch(editorButton[0], /M4 6h16M4 12h16M4 18h16/);
});

test('other primary navigation targets and labels remain unchanged', () => {
  const expected = [
    ['nam', 'NAM &amp; IR'],
    ['presets', 'Presets'],
    ['studio', 'Studio'],
    ['device', 'Device']
  ];
  for (const [target, label] of expected) {
    assert.match(html, new RegExp('<button data-page="' + target + '">[\\s\\S]*?<span>' + label + '<\\/span><\\/button>'));
  }
});
