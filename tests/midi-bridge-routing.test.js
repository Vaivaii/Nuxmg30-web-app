import test from 'node:test';
import assert from 'node:assert/strict';
import { routeControllerPacket, normalizeMidiBytes } from '../native-midi-routing.js';

test('default bridge preserves controller MIDI bytes unchanged', () => {
  assert.deepEqual(routeControllerPacket([0xB0, 20, 127]), [[0xB0, 20, 127]]);
  assert.deepEqual(routeControllerPacket([0xC0, 4]), [[0xC0, 4]]);
  assert.deepEqual(routeControllerPacket([0xF0, 1, 2, 0xF7]), [[0xF0, 1, 2, 0xF7]]);
});

test('custom CC mapping changes only the configured CC and retains value/channel', () => {
  assert.deepEqual(
    routeControllerPacket([0xB2, 20, 91], { passthrough: true, ccMap: { source: 20, target: 72 } }),
    [[0xB2, 72, 91]]
  );
});

test('passthrough continues for messages not covered by a custom CC mapping', () => {
  assert.deepEqual(
    routeControllerPacket([0xB0, 21, 64], { passthrough: true, ccMap: { source: 20, target: 72 } }),
    [[0xB0, 21, 64]]
  );
});

test('custom-only mode drops unrelated messages but retains mapped CC', () => {
  const config = { passthrough: false, ccMap: { source: 20, target: 72 } };
  assert.deepEqual(routeControllerPacket([0xB0, 21, 64], config), []);
  assert.deepEqual(routeControllerPacket([0xB0, 20, 64], config), [[0xB0, 72, 64]]);
});

test('invalid byte values are rejected before sending', () => {
  assert.throws(() => normalizeMidiBytes([0xB0, 256, 1]), TypeError);
});
