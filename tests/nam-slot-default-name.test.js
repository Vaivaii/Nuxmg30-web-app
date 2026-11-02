import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const namTransfer = readFileSync(new URL('../www/nam-transfer.js', import.meta.url), 'utf8');

test('AATR default display name is assigned only to NAM ID 61 / slot 08', () => {
  assert.ok(indexHtml.includes("const defaultName=slot===8?'AATR SX3 Clean BAL3 CAB · ID 61':('NAM Slot '+number+' · ID '+id);"));
  assert.ok(!indexHtml.includes("slot===7?'AATR SX3 Clean BAL3 CAB"));
  assert.ok(indexHtml.includes("const slot=i+1,id=53+slot,number=String(slot).padStart(2,'0');"));
});

test('NAM slot 07 returns to its generic default label and ID 60', () => {
  assert.ok(indexHtml.includes("('NAM Slot '+number+' · ID '+id)"));
  assert.ok(indexHtml.includes("slot===8?'AATR SX3 Clean BAL3 CAB · ID 61'"));
  assert.ok(indexHtml.includes("id=53+slot"));
});

test('NAM transfer implementation retains its existing source and protocol markers', () => {
  assert.ok(namTransfer.includes('export async function sendMG30A2LiteTransfer'));
  assert.ok(namTransfer.includes('ACK'));
  assert.ok(namTransfer.includes('readMG30NAMSlotNames'));
});
