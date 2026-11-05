import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exportSource = await readFile(new URL('../www/mg30-preset-export.js', import.meta.url), 'utf8');
const importSource = await readFile(new URL('../www/mg30-preset-import.js', import.meta.url), 'utf8');
const presetLibrarySource = await readFile(new URL('../www/preset-library-ui.js', import.meta.url), 'utf8');

test('Export All confirmation is English and keeps the read-only 128-preset explanation', () => {
  assert.match(exportSource, /'EXPORT ALL PRESETS\\n\\n'/);
  assert.match(exportSource, /MG30 Studio will read all 128 presets from the MG-30/);
  assert.match(exportSource, /waveform and curve data will only be read for presets that contain an IR/);
  assert.match(exportSource, /This is a read-only operation over USB-MIDI\\/SysEx/);
  assert.match(exportSource, /Continue reading the entire bank\\?/);
  assert.doesNotMatch(exportSource, /MG30 Studio akan membaca 128 preset/);
});

test('Export failure feedback preserves the error detail and auto-closes', () => {
  assert.match(presetLibrarySource, /const EXPORT_FAILURE_AUTO_CLOSE_MS = 6500;/);
  assert.match(presetLibrarySource, /showExportFeedback\\(title, text, 'error', 0, EXPORT_FAILURE_AUTO_CLOSE_MS\\)/);
});

test('Import Single and Import All failure dialogs auto-close after five seconds', () => {
  assert.match(importSource, /const FAILURE_FEEDBACK_AUTO_CLOSE_MS = 5000;/);
  assert.match(importSource, /Import All gagal'[\\s\\S]*?progressCompleted, FAILURE_FEEDBACK_AUTO_CLOSE_MS/);
  assert.match(importSource, /Import gagal'[\\s\\S]*?progressCompleted, FAILURE_FEEDBACK_AUTO_CLOSE_MS/);
});

test('Dialog Back / Escape is blocked only while an Import or Export transfer is active', () => {
  assert.match(importSource, /progressDialog\\.dataset\\.state === 'loading'/);
  assert.match(importSource, /progressDialog\\.dataset\\.owner === 'import'/);
  assert.match(importSource, /progressDialog\\.dataset\\.owner === 'export'/);
  assert.match(importSource, /if \\(operationInProgress\\) event\\.preventDefault\\(\\)/);
  assert.match(importSource, /progressDialog\\?\\.addEventListener\\('close'/);
});

test('Android Back dismisses a terminal feedback dialog and listener exists only while it is open', () => {
  assert.match(presetLibrarySource, /App\\.addListener\\('backButton'/);
  assert.match(presetLibrarySource, /if \\(feedbackDialog\\.dataset\\.state === 'loading'\\) return/);
  assert.match(presetLibrarySource, /if \\(feedbackDialog\\.dataset\\.owner === 'export'\\) closeExportFeedback\\(\\)/);
  assert.match(presetLibrarySource, /else feedbackDialog\\.close\\(\\)/);
  assert.match(presetLibrarySource, /feedbackDialogObserver\\.observe\\(feedbackDialog/);
  assert.match(presetLibrarySource, /else detachNativeFeedbackBackListener\\(\\)/);
});
