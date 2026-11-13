import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('English UI uses English copy for the screenshot-reported strings', async () => {
  const html = await read('../www/index.html');
  const nativeMidi = await read('../www/native-midi.js');

  assert.match(html, /12 blocks/);
  assert.doesNotMatch(html, /12 blok/);
  assert.match(html, /placeholder="Search for a song or artist…"/);
  assert.match(html, /⠿ MOVE/);
  assert.match(html, /Drag the MOVE handle on a card/);
  assert.match(html, /OTG connection failed:/);
  assert.doesNotMatch(html, /Koneksi OTG gagal:/);

  assert.match(nativeMidi, /Android cannot detect the USB-MIDI device/);
  assert.match(nativeMidi, /No matching USB-MIDI device is selected/);
  assert.doesNotMatch(nativeMidi, /Android belum melihat perangkat USB-MIDI/);
});
