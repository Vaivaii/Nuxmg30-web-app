import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const initializer = readFileSync(new URL('../scripts/init-android.mjs', import.meta.url), 'utf8');
const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('Android disables the stale activity preview during app startup', () => {
  assert.ok(initializer.includes('<item name="android:windowDisablePreview">true</item>'));
  assert.ok(initializer.includes('<item name="android:windowBackground">#0b1012</item>'));
});

test('Initial WebView markup already opens Editor and keeps NAM/IR hidden', () => {
  assert.match(html, /<button class="active" data-page="editor"/);
  assert.match(html, /<section id="page-editor">/);
  assert.match(html, /<section id="page-nam" class="hidden"/);
  assert.match(html, /\.hidden\{display:none!important\}/);
});
