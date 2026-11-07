import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exportSource = await readFile(new URL('../www/mg30-preset-export.js', import.meta.url), 'utf8');
const importSource = await readFile(new URL('../www/mg30-preset-import.js', import.meta.url), 'utf8');
const presetLibrarySource = await readFile(new URL('../www/preset-library-ui.js', import.meta.url), 'utf8');

test('Export All confirmation is English and keeps the read-only 128-preset explanation', () => {
  assert.ok(exportSource.includes("'EXPORT ALL PRESETS\\n\\n'"));
  assert.ok(exportSource.includes('MG30 Studio will read all 128 presets from the MG-30'));
  assert.ok(exportSource.includes('waveform and curve data will only be read for presets that contain an IR'));
  assert.ok(exportSource.includes('This is a read-only operation over USB-MIDI/SysEx.'));
  assert.ok(exportSource.includes('Continue reading the entire bank?'));
  assert.ok(!exportSource.includes('MG30 Studio akan membaca 128 preset'));
});

test('Export failure feedback preserves the error detail and auto-closes', () => {
  assert.ok(presetLibrarySource.includes('const EXPORT_FAILURE_AUTO_CLOSE_MS = 6500;'));
  assert.ok(presetLibrarySource.includes("showExportFeedback(title, text, 'error', 0, EXPORT_FAILURE_AUTO_CLOSE_MS)"));
});

test('Import All and Single terminal feedback uses English and clears persistent status text', () => {
  assert.ok(importSource.includes('const FAILURE_FEEDBACK_AUTO_CLOSE_MS = 5000;'));
  assert.ok(importSource.includes("finishProgressDialog('error', 'Import All Failed'"));
  assert.ok(importSource.includes("finishProgressDialog('error', 'Import Failed'"));
  assert.ok(importSource.includes("finishProgressDialog('success', 'Import All Complete'"));
  assert.ok(importSource.includes("finishProgressDialog('success', 'Import Complete'"));
  assert.ok(importSource.includes("message('');\n      finishProgressDialog('error', 'Import All Failed'"));
  assert.doesNotMatch(importSource, /Batch 128 preset belum didukung|Import All selesai|Import sedang berlangsung|Kurva IR|diakui perangkat/i);
});

test('Import confirmations are concise English and do not claim batch import is unsupported', () => {
  assert.ok(importSource.includes('IMPORT ALL PRESETS?'));
  assert.ok(importSource.includes('will overwrite all 128 preset slots (01A–32D)'));
  assert.ok(importSource.includes('Back up your presets before continuing.'));
  assert.ok(importSource.includes('This will overwrite the selected slot'));
  assert.ok(importSource.includes('Collection and NAM will not be affected.'));
  assert.doesNotMatch(importSource, /Batch 128 preset belum didukung|Batch import of 128 presets is not supported/i);
});

test('Import progress titles, instructions, counters, and notes are English', () => {
  assert.ok(importSource.includes('Import All in Progress'));
  assert.ok(importSource.includes('Do not close the app or disconnect USB'));
  assert.ok(importSource.includes('Verifying presets '));
  assert.ok(importSource.includes('frames acknowledged by the device.'));
  assert.doesNotMatch(importSource, /sedang berlangsung|Jangan tutup aplikasi|Memverifikasi preset|frame diakui perangkat|Kurva IR/i);
});

test('Dialog Back / Escape is blocked only while an Import or Export transfer is active', () => {
  assert.ok(importSource.includes("progressDialog.dataset.state === 'loading'"));
  assert.ok(importSource.includes("progressDialog.dataset.owner === 'import'"));
  assert.ok(importSource.includes("progressDialog.dataset.owner === 'export'"));
  assert.ok(importSource.includes('if (operationInProgress) event.preventDefault();'));
  assert.ok(importSource.includes("progressDialog?.addEventListener('close'"));
});

test('Android Back dismisses transient dialogs and exits the app when no dialog is open', () => {
  assert.ok(presetLibrarySource.includes("App.addListener('backButton'"));
  assert.ok(presetLibrarySource.includes("App.exitApp()"));
  assert.ok(presetLibrarySource.includes("document.querySelectorAll('dialog[open]')"));
  assert.ok(presetLibrarySource.includes("window.MG30PresetImportBusy"));
  assert.ok(presetLibrarySource.includes("window.MG30PresetExportBusy"));
  assert.ok(presetLibrarySource.includes("window.MG30IRTransferBusy"));
  assert.ok(presetLibrarySource.includes("window.MG30PresetManagerBusy"));
  assert.ok(presetLibrarySource.includes('activeDeviceOperation() ||'));
  assert.ok(presetLibrarySource.includes("topDialog.dataset.state === 'loading'"));
  assert.ok(presetLibrarySource.includes("topDialog.dataset.owner === 'import'"));
  assert.ok(presetLibrarySource.includes("topDialog.dataset.owner === 'export'"));
  assert.ok(presetLibrarySource.includes("feedbackDialog.addEventListener('close'"));
  assert.ok(!presetLibrarySource.includes('attachNativeFeedbackBackListener'));
  assert.ok(!presetLibrarySource.includes('feedbackDialogObserver'));
});
