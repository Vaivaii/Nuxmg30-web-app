import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const daw = readFileSync(new URL('../www/studio-daw.js', import.meta.url), 'utf8');

test('MG-30 hardware controls use the captured complete 14/01 frame', () => {
  assert.match(index, /MG30_HARDWARE_FRAME_TEMPLATE\s*=\s*Object\.freeze\(\[/);
  assert.match(index, /frame\.length !== 46/);
  assert.match(index, /frame\[4\] !== 0x14/);
  assert.match(index, /frame\[5\] !== 0x01/);
  assert.match(index, /body\[3\] === 0x14 && body\[4\] === 0x03 && body\.length === 13/);
});

test('captured control fields are isolated at their verified SysEx offsets', () => {
  assert.match(index, /updateMg30HardwareField\(0x20, enable \? 0x11 : 0x01, 'USB Loopback'\)/);
  assert.match(index, /updateMg30HardwareField\(0x1D, raw, 'Record Level'\)/);
  assert.match(index, /frame\[0x1E\] = \(value >> 7\) & 0x7F/);\n  assert.match(index, /frame\[0x1F\] = value & 0x7F/);\n  assert.match(index, /updateMg30PlaybackValue\(raw14Bit\)/);
  assert.match(index, /frame\[offset\] = Number\(rawValue\) & 0x7F/);
});

test('Track Settings controls are enabled and report device ACK or errors', () => {
  assert.ok(daw.includes('USB Loopback'));
  assert.ok(daw.includes('window.setLoopback(loopback.checked)'));
  assert.ok(daw.includes('window.setRecLevel(record.value)'));
  assert.ok(daw.includes('window.setPlayLevel(playback.value)'));
  assert.ok(daw.includes('device acknowledgement was not confirmed'));
  assert.ok(daw.includes('setStatus(label + \' updated on MG-30.\', \'ok\')'));
  assert.ok(!daw.includes('daw-hardware-protocol-note'));
  assert.ok(!daw.includes('candidate WRITE'));
  assert.doesNotMatch(daw, /Controls are locked pending verified/);
  assert.ok(daw.includes('step="1" value="50"'));
  assert.doesNotMatch(daw, /candidateBound/);
});

test('Record sends raw 7-bit values and Playback sends the captured 14-bit pair', () => {
  assert.match(index, /Math\.min\(100, number\)/);
  assert.match(index, /const raw = normalizeMg30HardwareSlider\(value\);[\s\S]*?updateMg30HardwareField\(0x1D, raw, 'Record Level'\)/);
  assert.match(index, /const raw14Bit = normalizeMg30PlaybackSlider\(value\);[\s\S]*?updateMg30PlaybackValue\(raw14Bit\)/);
  assert.doesNotMatch(index, /0x34 \+ \(normalized \/ 100\)/);
  assert.doesNotMatch(index, /0x68 \+ \(normalized \/ 100\)/);
  assert.match(daw, /dawHardwareRecordLevel[^\n]*max="100"[^\n]*value="50"/);
  assert.match(daw, /dawHardwarePlaybackLevel[^\n]*min="0"[^\n]*max="150"[^\n]*value="100"/);
  assert.match(daw, /recordReadout\.textContent = record\.value \+ ' \/ 100'/);
  assert.match(daw, /playbackReadout\.textContent = playback\.value \+ ' \/ 150'/);
});

test('Record stays 0-100 default 50; Playback is 0-150 default 100 with 14-bit mapping', () => {
  const frame = index.match(/const MG30_HARDWARE_FRAME_TEMPLATE = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(frame, 'complete 14/01 frame template exists');
  const bytes = [...frame[1].matchAll(/0x[0-9a-f]+/gi)].map(([hex]) => Number.parseInt(hex, 16));
  assert.equal(bytes[0x1D], 50, 'Record Level frame baseline is raw 50');
  assert.equal(bytes[0x1E], 0, 'Playback high 7-bit byte starts at zero');\n  assert.equal(bytes[0x1F], 100, 'Playback low 7-bit byte is raw 100');
  assert.match(daw, /dawHardwareRecordLevel[^\n]*min="0"[^\n]*max="100"[^\n]*value="50"/);
  assert.match(daw, /dawHardwarePlaybackLevel[^\n]*min="0"[^\n]*max="150"[^\n]*value="100"/);
});

test('Playback Level uses captured 14-bit pair and maps UI maximum 150 to raw 201', () => {
  assert.match(index, /function normalizeMg30PlaybackSlider\(value\)/);
  assert.match(index, /uiValue <= 100 \? uiValue : Math\.round\(100 \+ \(\(uiValue - 100\) \* 101 \/ 50\)\)/);
  assert.match(index, /function updateMg30PlaybackValue\(raw14Bit\)/);
  assert.match(index, /frame\[0x1E\] = \(value >> 7\) & 0x7F/);
  assert.match(index, /frame\[0x1F\] = value & 0x7F/);
  assert.match(index, /updateMg30PlaybackValue\(raw14Bit\)/);
  const frame = index.match(/const MG30_HARDWARE_FRAME_TEMPLATE = Object\.freeze\(\[([\s\S]*?)\]\);/);
  const bytes = [...frame[1].matchAll(/0x[0-9a-f]+/gi)].map(([hex]) => Number.parseInt(hex, 16));
  assert.equal(bytes[0x1D], 50, 'Record Level baseline remains raw 50');
  assert.equal(bytes[0x1E], 0, 'Playback high 7-bit byte defaults to zero');
  assert.equal(bytes[0x1F], 100, 'Playback low 7-bit byte defaults to raw 100');
  const map = (v) => { const n = Math.round(Math.max(0, Math.min(150, Number(v)))); return n <= 100 ? n : Math.round(100 + ((n - 100) * 101 / 50)); };
  const split = (v) => [(v >> 7) & 0x7F, v & 0x7F];
  assert.equal(map(100), 100);
  assert.deepEqual(split(map(100)), [0, 100]);
  assert.equal(map(125), 151);
  assert.deepEqual(split(map(125)), [1, 23]);
  assert.equal(map(150), 201);
  assert.deepEqual(split(map(150)), [1, 73]);
});
