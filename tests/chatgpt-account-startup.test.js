import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const accountModule = readFileSync(new URL('../www/chatgpt-account.js', import.meta.url), 'utf8');

test('ChatGPT account row visibility is rendered directly without a self-triggering observer', () => {
  assert.match(accountModule, /if \(switchRow\) switchRow\.hidden = profiles\.length < 2;/);
  assert.doesNotMatch(accountModule, /new MutationObserver/);
  assert.doesNotMatch(accountModule, /observer\.observe\(switchRow/);
});
