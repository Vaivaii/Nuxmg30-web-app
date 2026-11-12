import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMG30ActiveSceneStatusReply
} from '../www/mg30-scene-status.js';

function reply(program, scene, field1 = 0x22, field2 = 0x33, field4 = 0x00) {
  // Body after Web MIDI waitForSysEx has stripped F0 and F7.
  return [0x43,0x58,0x70,0x15,0x02,program,field1,field2,scene,field4];
}

test('status reply maps body field3 (body[8]) to active Scene 1', () => {
  const parsed = parseMG30ActiveSceneStatusReply(reply(0x1a, 0, 0x44, 0x55, 0));
  assert.deepEqual({program:parsed.program,scene:parsed.scene},{program:0x1a,scene:0});
});

test('status reply maps body field3 (body[8]) to active Scene 2 even when field4 is zero', () => {
  const parsed = parseMG30ActiveSceneStatusReply(reply(0x1a, 1, 0x44, 0x55, 0));
  assert.equal(parsed.program,0x1a);
  assert.equal(parsed.scene,1);
  assert.equal(parsed.fields[3],1);
  assert.equal(parsed.fields[4],0);
});

test('status reply maps body field3 (body[8]) to active Scene 3 even when field4 is zero', () => {
  const parsed = parseMG30ActiveSceneStatusReply(reply(0x1a, 2, 0x44, 0x55, 0));
  assert.equal(parsed.program,0x1a);
  assert.equal(parsed.scene,2);
});

test('the prior off-by-one implementation would return Scene 1 for this Scene 3 fixture', () => {
  const fixture = reply(0x1a, 2, 0x44, 0x55, 0);
  assert.equal(fixture[9],0); // Wrong old field.
  assert.equal(parseMG30ActiveSceneStatusReply(fixture).scene,2);
});

test('status parser rejects unrelated command headers and truncated data', () => {
  assert.throws(() => parseMG30ActiveSceneStatusReply([0x43,0x58,0x70,0x15,0x03,0,0,0,1,0]), /Header/);
  assert.throws(() => parseMG30ActiveSceneStatusReply([0x43,0x58,0x70,0x15,0x02,0,0,0,1]), /terlalu pendek/);
});

test('status parser rejects non-7-bit fields and invalid scene indexes', () => {
  assert.throws(() => parseMG30ActiveSceneStatusReply(reply(0x80,1)), /tidak valid/);
  assert.throws(() => parseMG30ActiveSceneStatusReply(reply(1,3)), /Indeks Scene/);
});

test('the returned parsed fields are immutable and preserve raw field order', () => {
  const parsed = parseMG30ActiveSceneStatusReply(reply(0x21,2,0x31,0x32,0x33));
  assert.deepEqual(parsed.fields,[0x21,0x31,0x32,2,0x33]);
  assert.throws(() => { parsed.scene = 0; }, TypeError);
});
