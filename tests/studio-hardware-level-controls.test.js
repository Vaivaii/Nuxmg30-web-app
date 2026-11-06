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
  assert.match(index, /updateMg30HardwareField\(0x1F, raw, 'Playback Level'\)/);
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
  assert.match(daw, /data-hardware-levels/);
  assert.doesNotMatch(daw, /candidateBound/);
});
