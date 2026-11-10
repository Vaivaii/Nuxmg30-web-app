import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../www/nam-model-library-ui.js', import.meta.url), 'utf8');
const tone = readFileSync(new URL('../www/tone3000.js', import.meta.url), 'utf8');
const native = readFileSync(new URL('../native-android/MG30MidiPlugin.java', import.meta.url), 'utf8');
const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('NAM Library is mounted in the NAM tab and replaces the old one-file transfer card', () => {
  assert.match(ui, /namPane\.insertBefore\(panel, legacyPanel\)/);
  assert.match(ui, /legacyPanel\.hidden = true/);
  assert.match(ui, /panel\.id = 'namModelLibrary'/);
  assert.doesNotMatch(ui, /namIrTonePane|t3kToneDetails|t3kModelList/);
  assert.match(html, /nam-model-library-ui\.js\?v=nam-library-1/);
});

test('NAM Library cards provide Import, per-card target slot, and manual add/delete actions', () => {
  assert.match(ui, /class="nam-library-import"[^>]*data-nam-import/);
  assert.match(ui, /class="nam-library-slot-row"/);
  assert.match(ui, /data-nam-slot=/);
  assert.match(ui, /Add NAM File/);
  assert.match(ui, /NativeMidi\.deleteModel/);
  assert.match(ui, /NativeMidi\.saveModel/);
});

test('Library import reuses the validated native A2-Lite transfer protocol', () => {
  assert.match(ui, /extractMG30A2LiteWeights\(modelBytes\)/);
  assert.match(ui, /buildMG30A2LiteTransferPlan\(weightBytes, label, slotNumber\)/);
  assert.match(ui, /sendMG30A2LiteTransfer\(connection, plan/);
  assert.match(ui, /mg30-nam-names-sync/);
  assert.match(ui, /The model file remains in NAM Library/);
});

test('Android NAM storage lists, reads, and deletes private files without overwriting name collisions', () => {
  assert.match(native, /public void listModels\(PluginCall call\)/);
  assert.match(native, /public void readModel\(PluginCall call\)/);
  assert.match(native, /public void deleteModel\(PluginCall call\)/);
  assert.match(native, /while \(target\.exists\(\)\)/);
  assert.match(native, /new File\(getContext\(\)\.getFilesDir\(\), "nam-models"\)/);
  assert.match(native, /getCanonicalFile\(\)/);
});

test('Tone3000 downloads refresh the persistent library and no longer claim transfer is pending', () => {
  assert.match(tone, /window\.dispatchEvent\(new Event\('mg30-nam-library-updated'\)\)/);
  assert.match(tone, /Model saved to NAM Library/);
  assert.match(tone, /saved in NAM Library as/);
  assert.doesNotMatch(tone, /direct device transfer will be enabled after the transfer protocol is validated/);
  assert.doesNotMatch(tone, /direct upload will be enabled after the transfer protocol is validated/);
  assert.doesNotMatch(tone, /\n\s*initLocalNamImport\(\);/);
});

test('NAM Library cards use the lime Import action and compact dark card layout', () => {
  assert.match(css, /\.nam-library-item \{/);
  assert.match(css, /\.nam-library-import \{/);
  assert.match(css, /\.nam-library-slot-row select/);
  assert.match(css, /background: #c5f36b !important/);
  assert.match(css, /\.nam-library-delete/);
});
