import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const indexHtml = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const namTransfer = readFileSync(new URL('../www/nam-transfer.js', import.meta.url), 'utf8');
const profileBlock = indexHtml.match(/const AMP_NAM_SLOT_PROFILES=\(\(\)=>\{[\s\S]*?\}\)\(\);/);

function createProfiles(initialNames = {}) {
  assert.ok(profileBlock, 'NAM profile initializer must exist');
  let storage = JSON.stringify(initialNames);
  const localStorage = {
    getItem(key) { return key === 'mg30-nam-slot-names' ? storage : null; },
    setItem(key, value) { if (key === 'mg30-nam-slot-names') storage = String(value); }
  };
  const context = { localStorage };
  vm.runInNewContext(profileBlock[0] + '\nglobalThis.__profiles = AMP_NAM_SLOT_PROFILES;', context, { timeout: 1000 });
  return { profiles: Array.from(context.__profiles, x => ({ slot:x.slot, id:x.id, defaultName:x.defaultName, name:x.name })), saved: JSON.parse(storage) };
}

test('all ten NAM default labels follow the screenshot ID sequence', () => {
  const { profiles } = createProfiles();
  assert.equal(profiles.length, 10);
  for (let i = 0; i < 10; i++) {
    const slot = i + 1;
    const id = 53 + slot;
    const expected = 'NAM Slot ' + String(slot).padStart(2, '0') + ' · ID ' + id;
    assert.equal(profiles[i].slot, slot);
    assert.equal(profiles[i].id, id);
    assert.equal(profiles[i].defaultName, expected);
    assert.equal(profiles[i].name, expected);
  }
});

test('stale AATR label from previous slot 07 default is migrated to generic ID 60 name', () => {
  const { profiles, saved } = createProfiles({ '60':'AATR SX3 Clean BAL3 CAB · NAM 07' });
  assert.equal(profiles[6].name, 'NAM Slot 07 · ID 60');
  assert.equal(saved['60'], 'NAM Slot 07 · ID 60');
});

test('stale AATR label from previous slot 08 default is migrated to generic ID 61 name', () => {
  const { profiles, saved } = createProfiles({ '61':'AATR SX3 Clean BAL3 CAB · ID 61' });
  assert.equal(profiles[7].name, 'NAM Slot 08 · ID 61');
  assert.equal(saved['61'], 'NAM Slot 08 · ID 61');
});

test('unrelated user-customized slot names are preserved during the stale-label migration', () => {
  const custom = 'My Custom NAM';
  const { profiles, saved } = createProfiles({ '59':custom, '60':'AATR SX3 Clean BAL3 CAB · NAM 07' });
  assert.equal(profiles[5].name, custom);
  assert.equal(saved['59'], custom);
  assert.equal(profiles[6].name, 'NAM Slot 07 · ID 60');
});

test('NAM ID numbering formula remains contiguous and unchanged', () => {
  assert.ok(indexHtml.includes('const slot=i+1,id=53+slot,number=String(slot).padStart(2,\'0\');'));
  assert.ok(indexHtml.includes('const AMP_NAM_DEVICE_IDS=AMP_NAM_SLOT_PROFILES.map(profile=>profile.id);'));
});

test('NAM transfer implementation source is retained without protocol edits', () => {
  assert.ok(namTransfer.includes('export async function sendMG30A2LiteTransfer'));
  assert.ok(namTransfer.includes('readMG30NAMSlotNames'));
  assert.ok(namTransfer.includes('ACK'));
});
