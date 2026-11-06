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


test('Third Party IR fragment is hidden before the NAM/IR merge and only revealed after relocation', () => {
  const startMarkup = html.indexOf('<div id="ir-import-content" class="ir-import-content hidden">');
  const mergeScript = html.indexOf('(function mergeNamAndIr()');
  const append = html.indexOf('namPage.appendChild(irContent);', mergeScript);
  const reveal = html.indexOf("irContent.classList.remove('hidden');", mergeScript);
  assert.ok(startMarkup >= 0, 'IR fragment begins hidden in static HTML');
  assert.ok(mergeScript > startMarkup, 'merge runs after the initial HTML fragment');
  assert.ok(append > mergeScript, 'IR fragment is moved into page-nam');
  assert.ok(reveal > append, 'IR fragment is revealed only after relocation');
  assert.match(html, /<section id="page-nam" class="hidden"/);
});
