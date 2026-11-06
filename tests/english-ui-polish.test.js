import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

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


test('English translator covers remaining Device, NAM and dynamic toast/status messages', async () => {
  const english = await read('../www/english-ui.js');
  const html = await read('../www/index.html');
  const root = { nodeType: 1, querySelectorAll: () => [], matches: () => false, closest: () => null,
    hasAttribute: () => false, getAttribute: () => null };
  const window = {};
  class MutationObserver { observe() {} }
  const document = { documentElement: root, createTreeWalker: () => ({ nextNode: () => false }) };
  runInNewContext(english, { window, document, MutationObserver, NodeFilter: { SHOW_TEXT: 4 } });
  const translate = window.MG30EnglishUI.translate;
  assert.equal(translate('USB-MIDI terputus'), 'USB-MIDI disconnected');
  assert.equal(translate('Terhubung via USB-MIDI Android. Membaca preset aktif…'), 'Connected via Android USB-MIDI. Reading the active preset…');
  assert.equal(translate('128 preset berhasil diimpor dan diverifikasi'), '128 presets imported and verified');
  assert.equal(translate('Nama 10 slot NAM disinkronkan dari MG-30'), 'Names for all 10 NAM slots synced from the MG-30');
  assert.equal(translate('Pilih model blok aktif'), 'Select the active block model');
  const device = html.slice(html.indexOf('<section id="page-device"'), html.indexOf('<section id="page-backup"'));
  assert.doesNotMatch(device, /Status koneksi|Baca buffer aktif|Atur API key|Tes USB berjalan|Belum terhubung/);
  assert.match(html, /function appEnglishText\(value\)/);
  assert.match(html, /el\.textContent=appEnglishText\(s\)/);
  assert.match(html, /const copy=appEnglishText\(message\)/);
});
test('Native audio status strings pass through the English translator', async () => {
  const main = await read('../www/main.js');
  assert.match(main, /window\.MG30EnglishUI\?\.translate\?\.\(String\(message\s*\?\?\s*''\)\)/);
  assert.match(main, /Sample rate not reported by Android/);
  assert.match(main, /Channel count not reported/);
});
