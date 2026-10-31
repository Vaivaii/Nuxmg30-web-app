import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMG30UserIRMetadataReadRequest,
  buildMG30UserIRWaveReadRequest,
  buildMG30UserIRCurveReadRequest,
  parseMG30UserIRMetadataReadReply,
  parseMG30UserIRWaveReadReply,
  parseMG30UserIRCurveReadReply,
  inspectMG30UserIRDataReadReply,
  orderMG30UserIRDataReadReplies,
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
function makeDataReply(command, replyTag, offset, values, type) {
  const decoded = new Uint8Array(132);
  const view = new DataView(decoded.buffer);
  view.setUint16(0, replyTag, true);
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
  assert.deepEqual([...buildMG30UserIRWaveReadRequest(7, 0)], [
    0xf0,0x43,0x58,0x70,0x10,0x00,0,0x0e,0,0,0,0,0,0,0xf7
  ]);
  // QuickTone places both packed fields directly after the command; the two
  // padding bytes are trailing. Check source slot 04A / program 12, offset 32.
  assert.deepEqual([...buildMG30UserIRWaveReadRequest(12, 32)], [
    0xf0,0x43,0x58,0x70,0x10,0x00,0,0x18,0,0,0x40,0,0,0,0xf7
  ]);
  assert.deepEqual([...buildMG30UserIRCurveReadRequest(7, 64)], [
    0xf0,0x43,0x58,0x70,0x11,0x00,0,0x0e,0,1,0,0,0,0,0xf7
  ]);
  assert.throws(() => buildMG30UserIRWaveReadRequest(7, 31), /Offset/);
  assert.throws(() => buildMG30UserIRCurveReadRequest(7, 65), /Offset/);
});

test('metadata reply validates index and extracts the resource name', () => {
  const reply = makeMetadataReply(7, 'TEST_IR');
  assert.equal(parseMG30UserIRMetadataReadReply(reply, 7).resourceName, 'TEST_IR');
  assert.throws(() => parseMG30UserIRMetadataReadReply(reply, 8), /tidak cocok/);
});

test('wave and curve replies treat the first decoded word as an opaque tag and validate offset', () => {
  const wave = makeDataReply(0x10, 256, 32, Array.from({length:32}, (_,i)=>(32+i)/2048), 'float32');
  const waveHeader = inspectMG30UserIRDataReadReply(wave, 0x10);
  assert.equal(waveHeader.replyTag, 256);
  assert.equal(waveHeader.offset, 32);
  assert.equal(parseMG30UserIRWaveReadReply(wave, 7, 32).samples[0], 32/2048);
  assert.throws(() => parseMG30UserIRWaveReadReply(wave, 7, 64), /offset 32, diharapkan 64/);
  const curve = makeDataReply(0x11, 0, 64, Array.from({length:64}, (_,i)=>Math.min(305,64+i)), 'uint16');
  assert.equal(parseMG30UserIRCurveReadReply(curve, 7, 64).values[0], 64);
  assert.throws(() => parseMG30UserIRCurveReadReply(curve, 8, 128), /offset 64, diharapkan 128/);
});

test('read replies are ordered by returned offset, not request arrival order', () => {
  const waves = Array.from({length:64}, (_,frame) =>
    makeDataReply(0x10, 0, frame*32,
      Array.from({length:32}, (_,i)=>(frame*32+i)/2048), 'float32'));
  const curves = Array.from({length:10}, (_,frame) =>
    makeDataReply(0x11, 0, frame*64,
      Array.from({length:64}, (_,i)=>Math.min(305,frame*64+i)), 'uint16'));
  const orderedWaves = orderMG30UserIRDataReadReplies(waves.slice().reverse(), 0x10, 13);
  const orderedCurves = orderMG30UserIRDataReadReplies(
    [curves[4],curves[0],curves[9],curves[3],curves[1],curves[7],curves[2],curves[8],curves[5],curves[6]],
    0x11, 13);
  assert.equal(inspectMG30UserIRDataReadReply(orderedWaves[0],0x10).offset,0);
  assert.equal(inspectMG30UserIRDataReadReply(orderedWaves[1],0x10).offset,32);
  assert.equal(inspectMG30UserIRDataReadReply(orderedWaves[63],0x10).offset,2016);
  assert.equal(inspectMG30UserIRDataReadReply(orderedCurves[0],0x11).offset,0);
  assert.equal(inspectMG30UserIRDataReadReply(orderedCurves[9],0x11).offset,576);
  const assembled = assembleMG30UserIRReadback(13, orderedWaves, orderedCurves);
  assert.equal(assembled.samples[0],0);
  assert.equal(assembled.samples[2047],2047/2048);
  assert.equal(assembled.curve[599],305);
  assert.throws(() => orderMG30UserIRDataReadReplies(
    [...waves.slice(1),waves[1]],0x10,13), /duplikat/);
  assert.throws(() => orderMG30UserIRDataReadReplies(
    waves.slice(1),0x10,13), /Jumlah reply/);
  assert.throws(() => orderMG30UserIRDataReadReplies(
    [...waves.slice(0,63),makeDataReply(0x10,0,64,Array(32).fill(0),'float32')],
    0x10,13), /duplikat|offset/);
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
  // Data replies do not echo the requested index in the first word; index is a request-side context.
  assert.equal(assembleMG30UserIRReadback(8, waves, curves).resourceIndex, 8);
});
