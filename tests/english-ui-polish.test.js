import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('English UI uses English copy for the screenshot-reported strings', async () => {
  const html = await read('../www/index.html');
  const nativeMidi = await read('../www/native-midi.js');

  assert.doesNotMatch(html, /12 blocks/);
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

test('Global English copy covers all remaining visible Indonesian interface labels and Import All feedback', async () => {
  const english = await read('../www/english-ui.js');
  const html = await read('../www/index.html');
  const root = { nodeType: 1, querySelectorAll: () => [], matches: () => false, closest: () => null,
    hasAttribute: () => false, getAttribute: () => null };
  const window = {};
  class MutationObserver { observe() {} }
  const document = { documentElement: root, createTreeWalker: () => ({ nextNode: () => false }) };
  runInNewContext(english, { window, document, MutationObserver, NodeFilter: { SHOW_TEXT: 4 } });
  const translate = window.MG30EnglishUI.translate;
  const cases = new Map([
    ['Mendukung .nam (JSON SlimmableContainer) dan .namb A2-Lite 1.871 bobot', 'Supports .nam (JSON SlimmableContainer) and .namb A2-Lite (1,871 weights).'],
    ['WAV RIFF, mono/stereo. PCM 8/16/24/32-bit atau Float32; 8–192 kHz akan dikonversi ke 48 kHz. Stereo memakai kanal kiri.', 'WAV RIFF, mono/stereo. PCM 8/16/24/32-bit or Float32; 8–192 kHz files are converted to 48 kHz. Stereo uses the left channel.'],
    ['Aktifkan atau bypass blok', 'Enable or bypass block'],
    ['Tutup panel parameter', 'Close parameter panel'],
    ['Buka atau tutup parameter model', 'Open or close model parameters'],
    ['Tutup panel CTRL', 'Close CTRL panel'],
    ['Import All gagal', 'Import All failed'],
    ['Bank mungkin terisi sebagian. Jangan lepas USB sebelum perangkat stabil.', 'The bank may be partially populated. Do not disconnect USB until the device is stable.'],
    ['File All Preset valid. Hubungkan MG-30 melalui USB-MIDI sebelum memulai.', 'The All Preset file is valid. Connect the MG-30 via USB-MIDI before starting.'],
    ['Rencana Import All tidak valid.', 'The Import All plan is invalid.'],
    ['Import All selesai: 128 preset dan 384 scene telah diverifikasi.', 'Import All complete: all 128 presets and 384 scenes have been verified.']
  ]);
  for (const [source, expected] of cases) assert.equal(translate(source), expected, source);

  const dynamicCases = [
    ['Android tidak mengonfirmasi penyimpanan file Export All.', 'Android did not confirm that the Export All file was saved.'],
    ['128 preset selesai dibaca. Menyusun satu file bank…', 'All 128 presets have been read. Building a single bank file…'],
    ['Export All berhenti sebelum 128 record berhasil dibaca.', 'Export All stopped before all 128 records could be read.'],
    ['Nama IR: "cab_57".', 'IR name: "cab_57".'],
    ['Nama IR di pedal tidak diubah.', 'The IR name on the pedal was not changed.'],
    ['Model harus memiliki tepat 1.871 bobot A2-Lite.', 'The model must contain exactly 1,871 A2-Lite weights.'],
    ['Bobot model ke-5 bukan angka valid.', 'Model weight 5 is not a valid number.'],
    ['Timeout ACK untuk fase 43', 'ACK timeout for phase 43'],
    ['Pengiriman fase gagal: USB disconnected', 'Failed to send phase: USB disconnected'],
    ['Gagal sinkron preset: timeout', 'Preset synchronization failed: timeout'],
    ['Membaca model, parameter, dan chain preset 03A…', 'Reading model, parameters, and preset signal chain 03A…'],
    ['Sinkronisasi selesai: 03A · Fender Deluxe', 'Synchronization complete: 03A · Fender Deluxe'],
    ['File tersimpan: sample.wav · 1,234 byte. Lokasi: folder yang kamu pilih di File manager Android.', 'File saved: sample.wav · 1,234 bytes. Location: the folder you selected in the Android file manager.'],
    ['IR Collection gagal dimuat: Local storage read error', 'Failed to load IR Collection: Local storage read error']
  ];
  for (const [source, expected] of dynamicCases) assert.equal(translate(source), expected, source);
  assert.match(html, /<html lang="en">/);
  assert.equal(html.includes("toast('Preset '+slotName()+' dibaca ke aplikasi'"), false);
});


test('Cloud Account module ships English-only interface text and status messages', async () => {
  const cloud = await read('../www/cloud-account.js');
  assert.match(cloud, /A personal account for Cloud services/);
  assert.match(cloud, /Cloud Account connected/);
  assert.match(cloud, /Checking session…/);
  assert.match(cloud, /<span>Account<\\/span>/);
  assert.match(cloud, /Cloud services are online-only/);
  assert.doesNotMatch(cloud, /Akun pribadi|Cloud Account aktif|Memeriksa sesi|<span>Akun<\\/span>|Cloud hanya untuk layanan online/);
});
