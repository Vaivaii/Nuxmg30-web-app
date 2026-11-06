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

test('Import Single and Import All failure dialogs auto-close after five seconds', () => {
  assert.ok(importSource.includes('const FAILURE_FEEDBACK_AUTO_CLOSE_MS = 5000;'));
  assert.ok(importSource.includes("finishProgressDialog('error', 'Import All gagal', 'Bank mungkin terisi sebagian. Jangan lepas USB sebelum perangkat stabil.', progressCompleted, FAILURE_FEEDBACK_AUTO_CLOSE_MS)"));
  assert.ok(importSource.includes("finishProgressDialog('error', 'Import gagal', 'Periksa koneksi perangkat.', progressCompleted, FAILURE_FEEDBACK_AUTO_CLOSE_MS)"));
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
  assert.ok(presetLibrarySource.includes("topDialog.dataset.state === 'loading'"));
  assert.ok(presetLibrarySource.includes("topDialog.dataset.owner === 'import'"));
  assert.ok(presetLibrarySource.includes("topDialog.dataset.owner === 'export'"));
  assert.ok(presetLibrarySource.includes("feedbackDialog.addEventListener('close'"));
  assert.ok(!presetLibrarySource.includes('attachNativeFeedbackBackListener'));
  assert.ok(!presetLibrarySource.includes('feedbackDialogObserver'));
});
