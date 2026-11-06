import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const daw = readFileSync(new URL('../www/studio-daw.js', import.meta.url), 'utf8');
const nativeMidi = readFileSync(new URL('../native-android/MG30MidiPlugin.java', import.meta.url), 'utf8');

test('MG-30 hardware controls preserve the complete 46-byte 14/01 frame and 14/03 ACK', () => {
  assert.match(index, /MG30_HARDWARE_FRAME_TEMPLATE\s*=\s*Object\.freeze\(\[/);
  assert.match(index, /frame\.length !== 46/);
  assert.match(index, /frame\[4\] !== 0x14/);
  assert.match(index, /frame\[5\] !== 0x01/);
  assert.match(index, /body\[3\] === 0x14 && body\[4\] === 0x03 && body\.length === 13/);
  assert.match(index, /function midiSend\(data,onDispatch\).*await midiOutput\.send\(data\)/s);
});

test('Record and Playback retain their captured parameter offsets and paired Playback bytes', () => {
  assert.match(index, /updateMg30HardwareField\(0x20, enable \? 0x11 : 0x01, 'USB Loopback'\)/);
  assert.match(index, /updateMg30HardwareField\(0x1D, raw, 'Record Level'\)/);
  assert.match(index, /frame\[0x1E\] = \(value >> 7\) & 0x7F/);
  assert.match(index, /frame\[0x1F\] = value & 0x7F/);
  assert.match(index, /updateMg30PlaybackValue\(raw14Bit\)/);
});

test('Track Settings uses centered signed dB sliders with live readouts', () => {
  assert.ok(daw.includes('window.setRecLevel(record.value)'));
  assert.ok(daw.includes('window.setPlayLevel(playback.value)'));
  assert.match(daw, /dawHardwareRecordLevel[^\n]*min="-12"[^\n]*max="12"[^\n]*step="0\.1"[^\n]*value="0"/);
  assert.match(daw, /dawHardwarePlaybackLevel[^\n]*min="-12"[^\n]*max="12"[^\n]*step="0\.1"[^\n]*value="0"/);
  assert.match(daw, /recordReadout\.textContent = formatMg30LevelDb\(record\.value\)/);
  assert.match(daw, /playbackReadout\.textContent = formatMg30LevelDb\(playback\.value\)/);
  assert.match(daw, /function formatMg30LevelDb\(value\)/);
});

test('Record Level mapping preserves -12 / 0 / +12 dB raw anchors 0 / 50 / 100', () => {
  assert.match(index, /function normalizeMg30HardwareSlider\(value\)/);
  assert.match(index, /50 \+ \(clampedDb \* 50 \/ 12\)/);
  const map = db => Math.round(50 + (Math.max(-12, Math.min(12, db)) * 50 / 12));
  assert.equal(map(-12), 0);
  assert.equal(map(0), 50);
  assert.equal(map(12), 100);
});

test('Playback Level mapping preserves 14-bit raw anchors 0 / 100 / 201', () => {
  assert.match(index, /function normalizeMg30PlaybackSlider\(value\)/);
  assert.match(index, /clampedDb <= 0[\s\S]*?Math\.round\(100 \+ \(clampedDb \* 101 \/ 12\)\)/);
  const map = db => {
    const n = Math.max(-12, Math.min(12, db));
    return n <= 0 ? Math.round(100 + (n * 100 / 12)) : Math.round(100 + (n * 101 / 12));
  };
  const split = value => [(value >> 7) & 0x7F, value & 0x7F];
  assert.deepEqual(split(map(-12)), [0, 0]);
  assert.deepEqual(split(map(0)), [0, 100]);
  assert.deepEqual(split(map(12)), [1, 73]);
});

test('release UI has no temporary Playback diagnostic and native send has no hex echo', () => {
  assert.doesNotMatch(daw, /dawHardwarePlaybackTx|MidiInputPort\.send\(\): /);
  assert.doesNotMatch(index, /MG30LastHardwareSend|nativeEchoMatches|sysexHex|dataHex/);
  assert.doesNotMatch(nativeMidi, /sysexHex|bytesToHex/);
});

test('dB formatter prints negative, centered zero and positive endpoints like the pedal', () => {
  assert.match(daw, /return \(db > 0 \? '\+' : ''\) \+ db\.toFixed\(1\) \+ ' dB'/);
  const format = value => {
    const db = Math.round(Math.max(-12, Math.min(12, Number(value))) * 10) / 10;
    if (Math.abs(db) < 0.05) return '0.0 dB';
    return (db > 0 ? '+' : '') + db.toFixed(1) + ' dB';
  };
  assert.equal(format(-12), '-12.0 dB');
  assert.equal(format(0), '0.0 dB');
  assert.equal(format(12), '+12.0 dB');
});
