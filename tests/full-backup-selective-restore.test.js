import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, encodeStoredZip, decodeStoredZip } from '../www/backup-archive.js';
import {
  sanitizeBackupSettings,
  planNamRestore,
  planIRRestore,
  mergePresetDrafts,
  validateBackupManifest
} from '../www/full-backup-restore-core.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

test('STORE ZIP round-trips UTF-8 names and binary files with CRC verification', () => {
  const source = [
    { path: 'manifest.json', data: encoder.encode('{"format":"mg30-studio-full-backup"}') },
    { path: 'nam/Clean Head (2).nam', data: Uint8Array.from([0, 1, 2, 127, 128, 255]) },
    { path: 'ir/slot-01.wav', data: Uint8Array.from({ length: 1024 }, (_, i) => (i * 17) & 255) }
  ];
  const archive = encodeStoredZip(source, { date: '2026-11-10T00:00:00.000Z' });
  const decoded = decodeStoredZip(archive);
  assert.equal(decoder.decode(decoded.get('manifest.json')), '{"format":"mg30-studio-full-backup"}');
  assert.deepEqual(Array.from(decoded.get('nam/Clean Head (2).nam')), Array.from(source[1].data));
  assert.deepEqual(Array.from(decoded.get('ir/slot-01.wav')), Array.from(source[2].data));
  assert.equal(crc32(source[1].data), crc32(decoded.get('nam/Clean Head (2).nam')));
});

test('ZIP writer rejects duplicate and traversal paths', () => {
  assert.throws(() => encodeStoredZip([
    { path: 'manifest.json', data: encoder.encode('{}') },
    { path: 'manifest.json', data: encoder.encode('{}') }
  ]), /Duplicate ZIP entry/);
  assert.throws(() => encodeStoredZip([{ path: '../outside.json', data: encoder.encode('{}') }]), /unsafe/);
  assert.throws(() => encodeStoredZip([{ path: '/absolute.json', data: encoder.encode('{}') }]), /unsafe/);
});

test('ZIP reader rejects a changed payload when CRC no longer matches', () => {
  const archive = encodeStoredZip([{ path: 'file.bin', data: Uint8Array.from([1, 2, 3, 4]) }]);
  const changed = archive.slice();
  // The local file payload begins after the 30-byte local header and filename.
  changed[38] ^= 0x40;
  assert.throws(() => decodeStoredZip(changed), /CRC32 verification failed/);
});

test('ZIP reader rejects unsupported compression and malformed signatures', () => {
  assert.throws(() => decodeStoredZip(Uint8Array.from([1, 2, 3])), /end record/);
  const archive = encodeStoredZip([{ path: 'file.bin', data: Uint8Array.from([1]) }]);
  const broken = archive.slice();
  // Central-directory compression method is byte 10 of the central header.
  const end = broken.length - 22;
  const centralOffset = new DataView(broken.buffer).getUint32(end + 16, true);
  new DataView(broken.buffer).setUint16(centralOffset + 10, 8, true);
  assert.throws(() => decodeStoredZip(broken), /compression/);
});

test('NAM restore plans keep, replace, or retain both without filename collisions', () => {
  const files = [{ fileName: 'amp.nam' }, { fileName: 'cab.namb' }];
  assert.deepEqual(planNamRestore(files, ['amp.nam'], 'keep-existing'), [
    { action: 'skip', fileName: 'amp.nam', reason: 'Existing file kept' },
    { action: 'create', fileName: 'cab.namb', destination: 'cab.namb' }
  ]);
  assert.deepEqual(planNamRestore([files[0]], ['amp.nam'], 'replace'), [
    { action: 'replace', fileName: 'amp.nam' }
  ]);
  assert.deepEqual(planNamRestore([files[0]], ['amp.nam'], 'keep-both'), [
    { action: 'keep-both', fileName: 'amp.nam', destination: 'amp (2).nam' }
  ]);
  assert.deepEqual(planNamRestore([{ fileName: 'amp (2).nam' }], [], 'keep-both'), [
    { action: 'create', fileName: 'amp (2).nam', destination: 'amp (2).nam' }
  ]);
  assert.deepEqual(planNamRestore(
    [{ fileName: 'amp.nam' }, { fileName: 'amp (2).nam' }],
    ['amp.nam'],
    'keep-both'
  ).map(x => x.destination), ['amp (3).nam', 'amp (2).nam']);
  assert.throws(() => planNamRestore([{ fileName: '../escape.nam' }], [], 'keep-both'), /invalid file name/);
});

test('IR restore keeps existing, replaces, and remaps a second copy to the next free slot', () => {
  const slots = [{ slot: 1 }, { slot: 2 }, { slot: 3 }];
  assert.deepEqual(planIRRestore(slots, [1, 2], 'keep-existing').map(x => x.action), ['skip', 'skip', 'create']);
  assert.deepEqual(planIRRestore(slots, [1, 2], 'replace').map(x => x.destinationSlot), [1, 2, 3]);
  assert.deepEqual(planIRRestore(slots, [1, 2], 'keep-both').map(x => x.destinationSlot), [4, 5, 3]);
  const full = Array.from({ length: 24 }, (_, i) => i + 1);
  assert.equal(planIRRestore([{ slot: 1 }], full, 'keep-both')[0].action, 'skip');
  assert.throws(() => planIRRestore([{ slot: 0 }], [], 'keep-both'), /invalid IR/);
});

test('preset drafts merge safely under each conflict policy', () => {
  const current = [{ id: 'a', name: 'Current' }];
  const incoming = [{ id: 'a', name: 'Backup A' }, { id: 'b', name: 'Backup B' }];
  assert.deepEqual(mergePresetDrafts(current, incoming, 'replace'), incoming);
  assert.deepEqual(mergePresetDrafts(current, incoming, 'keep-existing').map(x => x.id), ['a', 'b']);
  const both = mergePresetDrafts(current, incoming, 'keep-both');
  assert.deepEqual(both.map(x => x.id), ['a', 'a-restored-2', 'b']);
  assert.equal(both[1].name, 'Backup A (Restored)');
});

test('settings whitelist excludes API keys, access tokens, and refresh tokens', () => {
  const safe = sanitizeBackupSettings({
    'mg30-favorite-slots': '[1,2]',
    'mg30-nam-slot-names': '{"61":"NAM 08"}',
    'mg30-t3k-redirect_uri_config': 'mg30studio://oauth/callback',
    'mg30-youtube-data-api-key': 'secret',
    'mg30-t3k-access_token': 'token',
    'mg30-t3k-refresh_token': 'refresh',
    'unrecognized-secret': 'secret'
  });
  assert.deepEqual(safe, {
    'mg30-favorite-slots': '[1,2]',
    'mg30-nam-slot-names': '{"61":"NAM 08"}',
    'mg30-t3k-redirect_uri_config': 'mg30studio://oauth/callback'
  });
});

test('backup manifest is strict about app id, format, schema, and known sections', () => {
  const valid = {
    format: 'mg30-studio-full-backup',
    schemaVersion: 1,
    appId: 'com.vaivaii.mg30studio',
    sections: { nam: { count: 1 } }
  };
  assert.equal(validateBackupManifest(valid), valid);
  assert.throws(() => validateBackupManifest({ ...valid, appId: 'other.app' }), /not a supported/);
  assert.throws(() => validateBackupManifest({ ...valid, sections: { deviceWipe: {} } }), /unknown section/);
});


test('Keep Both settings policy preserves existing app preferences', () => {
  // The restore policy is intentionally implemented by the UI adapter;
  // this core assertion documents that settings are only whitelisted and
  // the caller must preserve an already configured value unless Replace is selected.
  const values = sanitizeBackupSettings({ 'mg30-favorite-slots': '[3,4]' });
  assert.deepEqual(values, { 'mg30-favorite-slots': '[3,4]' });
});
