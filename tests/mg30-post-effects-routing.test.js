import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('Post-EFX routing exposes two independent controls', () => {
  assert.match(html, /data-routing-bit="1"/);
  assert.match(html, /data-routing-bit="2"/);
  assert.match(html, /MOD → DELAY/);
  assert.match(html, /DELAY → REVERB/);
});

test('Routing mode is decoded as two independent bits', () => {
  assert.match(html, /\(mode&1\?['"]MOD–DELAY Parallel['"]/);
  assert.match(html, /\(mode&2\?['"]DELAY–REVERB Parallel['"]/);
  assert.match(html, /current\^bit/);
});

test('Routing writes use 0D/01 and verify the complete 0D/02 acknowledgement', () => {
  assert.match(html, /0x0D,0x01,\.\.\.currentOrder,mode/);
  assert.match(html, /echoMode!==mode/);
  assert.match(html, /const controlByte=await readSignalChainRoutingMode\(\)/);
});
