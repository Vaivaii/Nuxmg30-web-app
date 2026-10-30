import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMG30UserIRMetadataReadRequest,
  buildMG30UserIRWaveReadRequest,
  buildMG30UserIRCurveReadRequest,
  parseMG30UserIRMetadataReadReply,
  parseMG30UserIRWaveReadReply,
  parseMG30UserIRCurveReadReply,
  assembleMG30UserIRReadback,
} from '../www/mg30-preset-read.js';

const encodeWord = value => {
  const swapped = ((value & 0xff) << 8) | (value >>> 8);
  return [(swapped >>> 14) & 3, (swapped >>> 7) & 0x7f, swapped & 0x7f];
};
const packWords = bytes => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const packed = [];
  for (let i = 0; i < bytes.length; i += 2) packed.push(...encodeWord(view.getUint16(i, true)));
  return packed;
};
function makeDataReply(command, index, offset, values, type) {
  const decoded = new Uint8Array(132);
  const view = new DataView(decoded.buffer);
  view.setUint16(0, index, true);
  view.setUint16(2, offset, true);
  values.forEach((value, i) => {
    if (type === 'float32') view.setFloat32(4 + i * 4, value, true);
    else view.setUint16(4 + i * 2, value, true);
  });
  return Uint8Array.from([0x43, 0x58, 0x70, command, 0x02, ...packWords(decoded)]);
}
function makeMetadataReply(index, name = 'TEST_IR') {
  const decoded = new Uint8Array(36);
  decoded.set([1, 2, 3, 4]);
  decoded.set(Array.from(name, char => char.charCodeAt(0)), 4);
  return Uint8Array.from([0x43, 0x58, 0x70, 0x09, 0x02, index, ...packWords(decoded)]);
}

test('read requests match the 15-byte QuickTone request frames', () => {
  assert.equal(buildMG30UserIRMetadataReadRequest(7).length, 15);
  assert.deepEqual([...buildMG30UserIRMetadataReadRequest(7)], [
    0xf0,0x43,0x58,0x70,0x09,0x00,0x07,0,0,0,0,0,0,0,0xf7
  ]);
  assert.equal(buildMG30UserIRWaveReadRequest(7, 32).length, 15);
  assert.equal(buildMG30UserIRCurveReadRequest(7, 64).length, 15);
  assert.throws(() => buildMG30UserIRWaveReadRequest(7, 31), /Offset/);
  assert.throws(() => buildMG30UserIRCurveReadRequest(7, 65), /Offset/);
});

test('metadata reply validates index and extracts the resource name', () => {
  const reply = makeMetadataReply(7, 'TEST_IR');
  assert.equal(parseMG30UserIRMetadataReadReply(reply, 7).resourceName, 'TEST_IR');
  assert.throws(() => parseMG30UserIRMetadataReadReply(reply, 8), /tidak cocok/);
});

test('wave and curve replies validate index/offset and decode values', () => {
  const wave = makeDataReply(0x10, 7, 32, Array.from({length:32}, (_,i)=>(32+i)/2048), 'float32');
  assert.equal(parseMG30UserIRWaveReadReply(wave, 7, 32).samples[0], 32/2048);
  assert.throws(() => parseMG30UserIRWaveReadReply(wave, 7, 64), /indeks\/offset/);
  const curve = makeDataReply(0x11, 7, 64, Array.from({length:64}, (_,i)=>Math.min(305,64+i)), 'uint16');
  assert.equal(parseMG30UserIRCurveReadReply(curve, 7, 64).values[0], 64);
  assert.throws(() => parseMG30UserIRCurveReadReply(curve, 8, 64), /indeks\/offset/);
});

test('64 waveform replies and 10 curve replies assemble a complete IR resource', () => {
  const waves = Array.from({length:64}, (_,frame) =>
    makeDataReply(0x10, 7, frame*32, Array.from({length:32}, (_,i)=>(frame*32+i)/2048), 'float32'));
  const curves = Array.from({length:10}, (_,frame) =>
    makeDataReply(0x11, 7, frame*64, Array.from({length:64}, (_,i)=>Math.min(305,frame*64+i)), 'uint16'));
  const result = assembleMG30UserIRReadback(7, waves, curves);
  assert.equal(result.samples.length, 2048);
  assert.equal(result.curve.length, 600);
  assert.equal(result.samples[0], 0);
  assert.equal(result.samples[2047], 2047/2048);
  assert.equal(result.curve[599], 305);
  assert.throws(() => assembleMG30UserIRReadback(8, waves, curves), /indeks\/offset/);
});
