import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const backupUi = readFileSync(new URL('../www/backup-restore-ui.js', import.meta.url), 'utf8');
const native = readFileSync(new URL('../native-android/MG30MidiPlugin.java', import.meta.url), 'utf8');
const presetExport = readFileSync(new URL('../www/mg30-preset-export.js', import.meta.url), 'utf8');
const irTransfer = readFileSync(new URL('../www/ir-transfer.js', import.meta.url), 'utf8');

test('Backup page is wired to the new Full Backup and Selective Restore module', () => {
  assert.match(html, /id="fullBackupCreate"/);
  assert.match(html, /id="backupRestoreFile"/);
  assert.match(html, /id="backupRestoreSelections"/);
  assert.match(html, /id="backupRestoreConflict"/);
  assert.match(html, /backup-restore-ui\.js\?v=full-backup-1/);
  assert.match(backupUi, /createButton\.addEventListener\('click'/);
  assert.match(backupUi, /fileInput\.addEventListener\('change'/);
  assert.match(backupUi, /restoreButton\.addEventListener\('click'/);
});

test('Full Backup calls the existing Export All Presets serializer in read-only bytes mode', () => {
  assert.match(presetExport, /async function exportAllPresets\(options = \{\}\)/);
  assert.match(presetExport, /options\.returnBytes === true/);
  assert.match(presetExport, /exported: true/);
  assert.match(backupUi, /window\.MG30PresetExportAll/);
  assert.match(backupUi, /presetExporter\(\{ returnBytes: true, confirm: false \}\)/);
  assert.match(backupUi, /parseMG30AllPresetPatch\(presetResult\.bytes\)/);
});

test('Full Backup includes local NAM Library, IR Collection, preset drafts and safe settings', () => {
  assert.match(backupUi, /NativeMidi\.listModels\(\)/);
  assert.match(backupUi, /NativeMidi\.readModel\(\{ fileName \}\)/);
  assert.match(backupUi, /readIRCollection\(\)/);
  assert.match(backupUi, /mg30-studio-ir-collection-v1/);
  assert.match(backupUi, /mg30-presets/);
  assert.match(backupUi, /mg30-draft/);
  assert.match(backupUi, /sanitizeBackupSettings/);
  assert.doesNotMatch(backupUi, /mg30-youtube-data-api-key/);
  assert.doesNotMatch(backupUi, /mg30-t3k-access_token|mg30-t3k-refresh_token/);
});

test('Full Backup uses bounded native chunk upload and verified Android document save', () => {
  for (const method of ['beginBackupExport', 'writeBackupExportChunk', 'abortBackupExport', 'finishBackupExport']) {
    assert.match(backupUi, new RegExp('NativeMidi\\.' + method + '\\('));
    assert.match(native, new RegExp('public void ' + method + '\\(PluginCall call\\)'));
  }
  assert.match(native, /BACKUP_ARCHIVE_MAX_BYTES = 200 \* 1024 \* 1024/);
  assert.match(native, /saveBackupArchiveResult\(PluginCall call, ActivityResult result\)/);
  assert.match(native, /destinationCrc\.getValue\(\) != expectedCrc/);
});

test('Selective restore offers independent sections and conflict policies', () => {
  assert.match(backupUi, /data-restore-section/);
  assert.match(backupUi, /selectedRestoreSections\(\)/);
  assert.match(backupUi, /planNamRestore/);
  assert.match(backupUi, /planIRRestore/);
  assert.match(backupUi, /mergePresetDrafts/);
  assert.match(backupUi, /restoreSafeSettings/);
  assert.match(backupUi, /NativeMidi\.restoreModel/);
  assert.match(backupUi, /window\.MG30PresetImportBridge\.importAll/);
  assert.match(backupUi, /window\.confirm\('RESTORE SELECTED BACKUP DATA/);
});

test('IR Collection local restore writes to the existing app store without sending to MG-30', () => {
  assert.match(backupUi, /function writeIRCollection\(records\)/);
  assert.match(backupUi, /store\.put\(record\)/);
  assert.match(backupUi, /new Blob\(\[source\.bytes\], \{ type: 'audio\/wav' \}\)/);
  assert.match(backupUi, /IR Collection WAV files are restored to this app only/);
  assert.match(irTransfer, /const DB_NAME='mg30-studio-ir-collection-v1',STORE='slots'/);
});

test('Device preset restore reuses the existing Import All transaction with full readback verification', () => {
  assert.match(backupUi, /buildMG30AllPresetImportPlan\(state\.available\.presetBank\.parsed\.records\)/);
  assert.match(backupUi, /importAll\(importPlan/);
  assert.match(backupUi, /verifiedPrograms !== 128/);
  assert.match(backupUi, /verifiedScenes !== 384/);
  assert.match(html, /overwrites all 128 hardware preset slots/);
});


test('Restore starts with no selected sections and stays disabled until an explicit checkbox selection', () => {
  assert.ok(backupUi.includes('checkbox.checked = false;'));
  assert.ok(backupUi.includes('restoreButton.disabled = true;'));
  assert.ok(backupUi.includes('restoreButton.disabled = busy || !archiveState || selectedRestoreSections().length === 0;'));
  assert.ok(backupUi.includes("backupRestoreSelections')?.addEventListener('change'"));
});

test('NAM multi-file restore journals replacements/additions and rolls back on a later failure', () => {
  assert.ok(backupUi.includes('const journal = [];'));
  assert.ok(backupUi.includes('NativeMidi.readModel({ fileName: action.fileName })'));
  assert.ok(backupUi.includes("journal.push({ action: 'restore'"));
  assert.ok(backupUi.includes("journal.push({ action: 'delete'"));
  assert.ok(backupUi.includes('for (const item of journal.reverse())'));
  assert.ok(backupUi.includes('All earlier NAM Library changes in this batch were rolled back.'));
});

test('Local draft/settings restore uses rollback-capable localStorage updates', () => {
  assert.ok(backupUi.includes('function applyLocalStorageTransaction(changes)'));
  assert.ok(backupUi.includes('previous.set(key, localStorage.getItem(key))'));
  assert.ok(backupUi.includes('previous local values were rolled back'));
  assert.ok(backupUi.includes('applyLocalStorageTransaction(changes)'));
});
