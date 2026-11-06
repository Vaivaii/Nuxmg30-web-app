import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ctrlSource = await readFile(new URL('../www/ctrl-editor.js', import.meta.url), 'utf8');

test('Successful CTRL readback does not render the green status subtitle', () => {
  const start = ctrlSource.indexOf('function loadState(state) {');
  const end = ctrlSource.indexOf('\nasync function readFromPedal()', start);
  assert.ok(start >= 0 && end > start, 'loadState() must exist');
  const loadState = ctrlSource.slice(start, end);
  assert.match(loadState, /setStatus\(""\)/);
  assert.doesNotMatch(loadState, /Readback berhasil|Multi |CTRL1 |CTRL2 /);
});

test('CTRL read and write continue through the existing bridge calls', () => {
  assert.match(ctrlSource, /await bridge\.readState\(\)/);
  assert.match(ctrlSource, /await bridge\.writeState\(draftState\.bytes\.slice\(\)\)/);
  assert.match(ctrlSource, /setStatus\("Mengirim 13 01, menunggu ACK 13 03, lalu membaca ulang 13 02…"\)/);
  assert.match(ctrlSource, /result\.matched/);
});
