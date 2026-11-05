import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('Post-EFX routing exposes two independent compact controls between their effect blocks', () => {
  assert.match(html, /routingCard\(1,'MOD → DELAY'\)/);
  assert.match(html, /routingCard\(2,'DELAY → REVERB'\)/);
  assert.match(html, /class="routing-card /);
  assert.match(html, /data-routing-bit=/);
  assert.match(html, /flex:0 0 68px;width:68px;min-width:68px;max-width:68px;height:78px;min-height:78px/);
  assert.match(html, /flex:0 0 62px;width:62px;min-width:62px;max-width:62px;height:73px;min-height:73px/);
  assert.match(html, /flex:0 0 59px;width:59px;min-width:59px;max-width:59px;height:70px;min-height:70px/);
});

test('Routing cards show only the compact routing symbol, not labels or helper copy', () => {
  assert.match(html, /class="routing-symbol"/);
  assert.doesNotMatch(html, /routing-mode-label/);
  assert.doesNotMatch(html, /Tap untuk ubah/);
  assert.doesNotMatch(html, /<b>\'+title\+\'<\\/b>/);
});

test('Serial and Parallel use distinct NUX-style signal-path SVG topologies', () => {
  assert.match(html, /function signalChainRoutingIcon\(parallel\)/);
  assert.match(html, /one input splits into two effect paths/);
  assert.match(html, /two effect blocks connected one after another/);
  assert.match(html, /M2 16H6\.5M6\.5 16V8H11M6\.5 16V24H11/);
  assert.match(html, /M2 16H6M13 16H19M26 16H29/);
});

test('Routing mode is decoded as two independent bits', () => {
  assert.match(html, /\(mode&1\?['"]MOD–DELAY Parallel['"]/);
  assert.match(html, /\(mode&2\?['"]DELAY–REVERB Parallel['"]/);
  assert.match(html, /current\^bit/);
});

test('Routing mode changes update the SVG icon immediately from the verified device state', () => {
  assert.match(html, /const symbol=button\.querySelector\('\.routing-symbol'\);/);
  assert.match(html, /symbol\.innerHTML=signalChainRoutingIcon\(parallel\)/);
  assert.match(html, /signalChainRoutingMode=mode;renderSignalChainRoutingControls\(\)/);
  assert.match(html, /button\.title=title\+' · '\+\(parallel\?'Parallel':'Serial'\)/);
});

test('Routing writes use 0D/01 and verify the complete 0D/02 acknowledgement', () => {
  assert.match(html, /0x0D,0x01,\.\.\.currentOrder,mode/);
  assert.match(html, /echoMode!==mode/);
  assert.match(html, /const controlByte=await readSignalChainRoutingMode\(\)/);
});
