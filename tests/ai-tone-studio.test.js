import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAiTonePlan } from '../www/ai-tone-studio.js';

const catalog = [
  {
    id: 'AMP',
    currentModel: 'Deluxe Rvb',
    models: [
      { name: 'Deluxe Rvb', parameters: [
        { key: 'gain', kind: 'range' },
        { key: 'bass', kind: 'range' },
        { key: 'middle', kind: 'range' },
        { key: 'treble', kind: 'range' }
      ] },
      { name: 'Twin Rvb', parameters: [
        { key: 'gain', kind: 'range' },
        { key: 'master', kind: 'range' }
      ] }
    ]
  },
  {
    id: 'RVB',
    currentModel: 'Spring',
    models: [
      { name: 'Spring', parameters: [{ key: 'decay', kind: 'range' }, { key: 'level', kind: 'range' }] },
      { name: 'Hall', parameters: [{ key: 'decay', kind: 'range' }, { key: 'predelay', kind: 'range' }] }
    ]
  },
  {
    id: 'MOD',
    currentModel: 'CE-1',
    models: [
      { name: 'CE-1', parameters: [{ key: 'depth', kind: 'range' }, { key: 'subd', kind: 'discrete', choices: [{ value: 0 }, { value: 1 }] }] }
    ]
  }
];

test('validates a partial parameter refinement on the current model', () => {
  const plan = validateAiTonePlan({
    summary: 'Menambah sedikit karakter amp.',
    blocks: [{ id: 'AMP', model: 'Deluxe Rvb', parameters: { gain: 38, middle: 62 } }],
    notes: []
  }, catalog);
  assert.equal(plan.blocks[0].parameters.gain, 38);
  assert.equal(plan.blocks[0].parameters.middle, 62);
});

test('requires every writable parameter when AI changes a model', () => {
  assert.throws(() => validateAiTonePlan({
    blocks: [{ id: 'AMP', model: 'Twin Rvb', parameters: { gain: 40 } }]
  }, catalog), /requires all parameters/);
});

test('accepts a complete model change and multiple blocks', () => {
  const plan = validateAiTonePlan({
    summary: 'Amp dan reverb diperbarui.',
    blocks: [
      { id: 'AMP', model: 'Twin Rvb', parameters: { gain: 40, master: 65 } },
      { id: 'RVB', model: 'Spring', parameters: { decay: 32 } }
    ]
  }, catalog);
  assert.equal(plan.blocks.length, 2);
});

test('rejects unknown blocks, models and parameter names', () => {
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'IR', model: 'Third-party', parameters: { level: 50 } }] }, catalog), /not allowed/);
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'AMP', model: 'Fake Amp', parameters: { gain: 50 } }] }, catalog), /not available in the .* catalog/);
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'AMP', model: 'Deluxe Rvb', parameters: { magic: 50 } }] }, catalog), /not available/);
});

test('rejects values outside the normalized range and invalid discrete choices', () => {
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'AMP', model: 'Deluxe Rvb', parameters: { gain: 101 } }] }, catalog), /outside the supported choices\/range/);
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'MOD', model: 'CE-1', parameters: { subd: 7 } }] }, catalog), /outside the supported choices\/range/i);
});

test('rejects duplicate blocks and plans with no changes', () => {
  assert.throws(() => validateAiTonePlan({ blocks: [
    { id: 'AMP', model: 'Deluxe Rvb', parameters: { gain: 40 } },
    { id: 'AMP', model: 'Deluxe Rvb', parameters: { bass: 45 } }
  ] }, catalog), /duplicate block/i);
  assert.throws(() => validateAiTonePlan({ blocks: [] }, catalog), /invalid|no changes/);
});

test('AI UI has no Apply-to-Editor action and exposes the three provider modes plus Undo', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /data-ai-provider="gpt"/);
  assert.match(source, /data-ai-provider="gemini"/);
  assert.match(source, /data-ai-provider="collab"/);
  assert.match(source, /Undo AI Changes/);
  assert.doesNotMatch(source, /Terapkan ke Editor|Apply to Editor/i);
});

test('live bridge keeps AI writes inside existing parameter CC path and excludes IR/NAM blocks', () => {
  const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(html, /window\.MG30AIToneBridge=Object\.freeze/);
  assert.match(html, /BLOCKS\.slice\(0,9\)/);
  assert.match(html, /await midiSend\(\[0xB0,cc/);
  assert.match(html, /aiSendCC\(parameter\.cc,parameter\.rawValue\)/);
  assert.match(html, /ai-tone-midi-transaction/);
  assert.match(source, /ai-tone-midi-transaction #page-editor/);
  assert.doesNotMatch(html.slice(html.indexOf('window.MG30AIToneBridge=Object.freeze'), html.indexOf('window.MG30CtrlBridge=Object.freeze')), /sendMg30SysEx|midiFrame\(/);
});

test('Android credential plugin uses Android Keystore and authenticated encryption', () => {
  const java = readFileSync(new URL('../native-android/MG30SecureStorePlugin.java', import.meta.url), 'utf8');
  assert.match(java, /AndroidKeyStore/);
  assert.match(java, /AES\/GCM\/NoPadding/);
  assert.match(java, /GCMParameterSpec/);
  assert.match(java, /MODE_PRIVATE/);
  assert.doesNotMatch(java, /Log\.[diwe].*value/);
});


test('AI assistant UI is taller, keeps chat readable and exposes a visible working indicator', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.ok(source.includes('height:auto;min-height:0;max-height:var(--ai-tone-max-height)'));
  assert.ok(source.includes('--ai-tone-max-height:91dvh'));
  assert.ok(source.includes('.ai-tone-messages{display:flex;flex-direction:column;gap:10px;min-height:0'));
  assert.ok(source.includes('max-height:30dvh'));
  assert.match(source, /\.ai-tone-message[^}]*font-size:14px/);
  assert.match(source, /#aiToneOpenButton[^}]*font-size:17px/);
  assert.match(source, /ai-tone-status\[data-state=busy\]::before/);
  assert.match(source, /@keyframes aiToneSpin/);
  assert.match(source, /busy\?'Working…':'Send ↗'/);
});

test('AI assistant interface and generated tone summaries are English', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /Keep the summary and notes in English/);
  assert.match(source, /Waiting for MG-30 connection/);
  assert.match(source, /Save API Keys/);
  assert.match(source, /Undo AI Changes/);
  assert.match(source, /Parameters sent to:/);
  assert.doesNotMatch(source, /Menunggu koneksi|Simpan API Key|Kirim ↗|Parameter dikirim|Undo gagal|berhasil merespons/);
});

test('AI AMP catalog exposes only NAM slot 10 as selection-only with no internal controls', () => {
  const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('namProfile?.slot!==10)return;'));
  assert.ok(html.includes('namProfile?.slot!==10)return;'));
  assert.ok(html.includes('NAM slot 10 is selection-only'));
  assert.ok(html.includes('if(blockIndex===3&&ampNamProfileForModelIndex(state.model))return'));
});
