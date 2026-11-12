import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const backupUi = readFileSync(new URL('../www/backup-restore-ui.js', import.meta.url), 'utf8');
const backupCss = readFileSync(new URL('../www/backup-restore.css', import.meta.url), 'utf8');
const presetExport = readFileSync(new URL('../www/mg30-preset-export.js', import.meta.url), 'utf8');
const releaseWorkflow = readFileSync(new URL('../.github/workflows/community-release.yml', import.meta.url), 'utf8');
const buildWorkflow = readFileSync(new URL('../.github/workflows/build-apk.yml', import.meta.url), 'utf8');

test('Backup & Restore exposes an accessible full-screen progress dialog and progressbar', () => {
  assert.match(html, /id="backupProgressOverlay"/);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /id="backupProgressTitle"/);
  assert.match(html, /id="backupProgressStep"/);
  assert.match(html, /id="backupProgressDetail"/);
  assert.match(html, /id="backupProgressBar" role="progressbar"/);
  assert.match(html, /id="backupProgressFill"/);
  assert.match(backupUi, /function setOperationProgress\(/);
  assert.match(backupUi, /function hideOperationProgress\(/);
  assert.match(backupUi, /bar\.setAttribute\('aria-valuenow'/);
  assert.match(backupUi, /bar\.classList\.toggle\('is-indeterminate'/);
});

test('Full Backup progress follows preset-bank, NAM, IR, ZIP and Android chunk work', () => {
  assert.match(presetExport, /options\.onProgress\?\.\(\{ phase: 'Reading preset bank'/);
  assert.match(backupUi, /onProgress: event =>/);
  assert.match(backupUi, /52 \+ Math\.round\(completed \/ 128 \* 52\)/);
  assert.match(backupUi, /async function readNamFiles\(onProgress = \(\) => \{\}\)/);
  assert.match(backupUi, /Reading NAM Library/);
  assert.match(backupUi, /Reading IR Collection/);
  assert.match(backupUi, /Building verified ZIP archive/);
  assert.match(backupUi, /Saving ZIP to Android/);
  assert.match(backupUi, /written \/ bytes\.length \* 12/);
});

test('Selective Restore progress follows NAM/IR records and hardware ACK/readback callbacks', () => {
  assert.match(backupUi, /async function restoreNamFiles\(files, conflict, onProgress/);
  assert.match(backupUi, /async function restoreIRCollection\(section, conflict, onProgress/);
  assert.match(backupUi, /async function restoreSelected\(state, onProgress/);
  assert.match(backupUi, /reportStage\('Restoring NAM Library'/);
  assert.match(backupUi, /reportStage\('Restoring IR Collection'/);
  assert.match(backupUi, /Writing MG-30 preset bank/);
  assert.match(backupUi, /Verifying MG-30 preset readback/);
  assert.match(backupUi, /hideOperationProgress\(\); setBusy\(false\)/);
});

test('Backup page receives its own mobile scrollport and no fixed bottom fade covers its warning', () => {
  assert.match(backupCss, /body > \.app > #page-backup:not\(\.hidden\)/);
  assert.match(backupCss, /overflow-y:\s*auto\s*!important/);
  assert.match(backupCss, /touch-action:\s*pan-y\s*!important/);
  assert.match(backupCss, /scroll-padding-bottom:\s*calc\(92px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(backupCss, /body > \.app > #page-backup:not\(\.hidden\)::after\s*\{\s*display:\s*none\s*!important/);
  assert.match(backupCss, /\.backup-progress-overlay\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});

test('Final candidate branch is enabled for both debug validation and release signing', () => {
  assert.match(buildWorkflow, /- release\/mg30-studio-final-polish/);
  assert.match(releaseWorkflow, /- release\/mg30-studio-final-polish/);
  assert.match(releaseWorkflow, /assembleRelease/);
  assert.match(releaseWorkflow, /apksigner verify --verbose --print-certs/);
  assert.match(releaseWorkflow, /ANDROID_KEYSTORE_BASE64/);
  assert.match(releaseWorkflow, /ANDROID_KEY_ALIAS/);
  assert.match(releaseWorkflow, /MG30-Studio-Community\.apk\.sha256/);
  assert.match(releaseWorkflow, /versionCode = 32/);
});
