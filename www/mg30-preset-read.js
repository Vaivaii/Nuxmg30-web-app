const PREFIX = [0xF0, 0x43, 0x58, 0x70];
const WAVE_SAMPLES = 2048;
const WAVE_FRAME_SAMPLES = 32;
const CURVE_VALUES = 600;
const CURVE_FRAME_VALUES = 64;

function assertIndex(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 127) {
    throw new Error(label + ' harus 0–127.');
  }
  return n;
}
function encodeWord16(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 0xFFFF) {
    throw new Error('Nilai packed uint16 tidak valid.');
  }
  const swapped = ((n & 0xFF) << 8) | (n >>> 8);
  return [(swapped >>> 14) & 3, (swapped >>> 7) & 0x7F, swapped & 0x7F];
}
function decodeWord16(a, b, c) {
  if (a > 3 || b > 0x7F || c > 0x7F) {
    throw new Error('Byte packed 7-bit berada di luar rentang.');
  }
  const packed = ((a & 3) << 14) | ((b & 0x7F) << 7) | (c & 0x7F);
  return ((packed & 0xFF) << 8) | (packed >>> 8);
}
function decodePackedBytes(packed, outputBytes) {
  if (!(packed instanceof Uint8Array) || packed.length !== outputBytes / 2 * 3) {
    throw new Error('Ukuran payload packed tidak cocok.');
  }
  const output = new Uint8Array(outputBytes);
  const view = new DataView(output.buffer);
  for (let i = 0, word = 0; i < packed.length; i += 3, word++) {
    view.setUint16(word * 2, decodeWord16(packed[i], packed[i + 1], packed[i + 2]), true);
  }
  return output;
}

export function buildMG30UserIRMetadataReadRequest(resourceIndex) {
  const index = assertIndex(resourceIndex, 'Indeks resource IR');
  // QuickTone 09/00 query: byte index at offset 6, seven zero bytes, F7.
  return Uint8Array.from([...PREFIX, 0x09, 0x00, index, 0, 0, 0, 0, 0, 0, 0, 0xF7]);
}

function buildDataReadRequest(command, resourceIndex, offset) {
  if (command !== 0x10 && command !== 0x11) throw new Error('Keluarga perintah read IR tidak dikenal.');
  const index = assertIndex(resourceIndex, 'Indeks resource IR');
  const address = Number(offset);
  const max = command === 0x10 ? 0x7E0 : 0x240;
  const step = command === 0x10 ? 0x20 : 0x40;
  if (!Number.isInteger(address) || address < 0 || address > max || address % step !== 0) {
    throw new Error('Offset read IR tidak valid untuk command 0x' + command.toString(16) + '.');
  }
  // The device expects the packed resource index and offset immediately after
  // the command; the two padding bytes are at the end of the frame.
  return Uint8Array.from([...PREFIX, command, 0x00, ...encodeWord16(index), ...encodeWord16(address), 0, 0, 0xF7]);
}
export function buildMG30UserIRWaveReadRequest(resourceIndex, sampleOffset) {
  return buildDataReadRequest(0x10, resourceIndex, sampleOffset);
}
export function buildMG30UserIRCurveReadRequest(resourceIndex, curveOffset) {
  return buildDataReadRequest(0x11, resourceIndex, curveOffset);
}

export function parseMG30UserIRMetadataReadReply(input, expectedIndex) {
  const body = input instanceof Uint8Array ? input : Uint8Array.from(input || []);
  const index = assertIndex(expectedIndex, 'Indeks resource IR');
  if (body.length !== 60 || body[0] !== 0x43 || body[1] !== 0x58 || body[2] !== 0x70 ||
      body[3] !== 0x09 || body[4] !== 0x02 || body[5] !== index) {
    throw new Error('Balasan 09/02 tidak cocok dengan indeks IR yang diminta.');
  }
  const metadata = decodePackedBytes(body.subarray(6), 36);
  const crc = metadata.slice(0, 4);
  const nameField = metadata.slice(4, 36);
  let nameEnd = nameField.indexOf(0);
  if (nameEnd < 0) nameEnd = nameField.length;
  const nameBytes = nameField.subarray(0, nameEnd);
  for (const byte of nameBytes) {
    if (byte < 0x20 || byte > 0x7E) throw new Error('Nama resource IR berisi karakter non-ASCII.');
  }
  const resourceName = String.fromCharCode(...nameBytes).trim();
  if (!resourceName) throw new Error('Resource IR pada indeks ' + index + ' tidak memiliki nama yang dapat diekspor.');
  return { resourceIndex: index, resourceName, crc, metadata };
}

export function inspectMG30UserIRDataReadReply(input, command) {
  if (command !== 0x10 && command !== 0x11) {
    throw new Error('Keluarga perintah read IR tidak dikenal.');
  }
  const body = input instanceof Uint8Array ? input : Uint8Array.from(input || []);
  if (body.length !== 203 || body[0] !== 0x43 || body[1] !== 0x58 || body[2] !== 0x70 ||
      body[3] !== command || body[4] !== 0x02) {
    throw new Error('Ukuran/header reply read IR tidak cocok untuk command 0x' + command.toString(16) + '/02.');
  }
  // QuickTone's 10/02 handler consumes the second decoded word as the sample
  // offset and does not treat the first word as an echoed resource index.
  // Keep that first word opaque: its meaning differs from the request index.
  const decoded = decodePackedBytes(body.subarray(5), 132);
  const view = new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength);
  return {
    decoded,
    replyTag: view.getUint16(0, true),
    offset: view.getUint16(2, true),
  };
}

function parseDataReadReply(input, command, expectedIndex, expectedOffset) {
  const index = assertIndex(expectedIndex, 'Indeks resource IR');
  const offset = Number(expectedOffset);
  const max = command === 0x10 ? 0x7E0 : 0x240;
  const step = command === 0x10 ? 0x20 : 0x40;
  if (!Number.isInteger(offset) || offset < 0 || offset > max || offset % step !== 0) {
    throw new Error('Offset reply IR yang diharapkan tidak valid.');
  }
  const inspected = inspectMG30UserIRDataReadReply(input, command);
  if (inspected.offset !== offset) {
    throw new Error('Balasan read IR membawa offset ' + inspected.offset +
      ', diharapkan ' + offset + '. Tag balasan=' + inspected.replyTag + '.');
  }
  return {
    decoded: inspected.decoded,
    resourceIndex: index,
    replyTag: inspected.replyTag,
    offset: inspected.offset,
  };
}

export function parseMG30UserIRWaveReadReply(input, expectedIndex, expectedSampleOffset) {
  const parsed = parseDataReadReply(input, 0x10, expectedIndex, expectedSampleOffset);
  const samples = new Float32Array(WAVE_FRAME_SAMPLES);
  const view = new DataView(parsed.decoded.buffer, parsed.decoded.byteOffset, parsed.decoded.byteLength);
  for (let i = 0; i < WAVE_FRAME_SAMPLES; i++) {
    const value = view.getFloat32(4 + i * 4, true);
    if (!Number.isFinite(value)) throw new Error('Sampel waveform IR tidak finite pada offset ' + (parsed.offset + i) + '.');
    samples[i] = value;
  }
  return { resourceIndex: parsed.resourceIndex, replyTag: parsed.replyTag, offset: parsed.offset, samples };
}

export function parseMG30UserIRCurveReadReply(input, expectedIndex, expectedCurveOffset) {
  const parsed = parseDataReadReply(input, 0x11, expectedIndex, expectedCurveOffset);
  const values = new Uint16Array(CURVE_FRAME_VALUES);
  const view = new DataView(parsed.decoded.buffer, parsed.decoded.byteOffset, parsed.decoded.byteLength);
  for (let i = 0; i < CURVE_FRAME_VALUES; i++) values[i] = view.getUint16(4 + i * 2, true);
  const validCount = Math.min(CURVE_FRAME_VALUES, CURVE_VALUES - parsed.offset);
  for (let i = 0; i < validCount; i++) {
    if (values[i] > 305) throw new Error('Nilai kurva IR di luar rentang pada offset ' + (parsed.offset + i) + '.');
  }
  return { resourceIndex: parsed.resourceIndex, replyTag: parsed.replyTag, offset: parsed.offset, values, validCount };
}

export function createMG30UserIRReadRequests(resourceIndex) {
  const index = assertIndex(resourceIndex, 'Indeks resource IR');
  const waveform = Array.from({ length: 64 }, (_, frame) =>
    buildMG30UserIRWaveReadRequest(index, frame * WAVE_FRAME_SAMPLES));
  const curve = Array.from({ length: 10 }, (_, frame) =>
    buildMG30UserIRCurveReadRequest(index, frame * CURVE_FRAME_VALUES));
  return {
    resourceIndex: index,
    metadata: buildMG30UserIRMetadataReadRequest(index),
    waveform,
    curve,
    totalRequests: 75,
  };
}

export function orderMG30UserIRDataReadReplies(replies, command, resourceIndex) {
  const index = assertIndex(resourceIndex, 'Indeks resource IR');
  if (command !== 0x10 && command !== 0x11) {
    throw new Error('Keluarga perintah read IR tidak dikenal.');
  }
  const count = command === 0x10 ? 64 : 10;
  const step = command === 0x10 ? WAVE_FRAME_SAMPLES : CURVE_FRAME_VALUES;
  const max = command === 0x10 ? 0x7E0 : 0x240;
  if (!Array.isArray(replies) || replies.length !== count) {
    throw new Error('Jumlah reply read IR tidak lengkap; diterima ' +
      (Array.isArray(replies) ? replies.length : 0) + ', diharapkan ' + count + '.');
  }
  const byOffset = new Map();
  for (const reply of replies) {
    const body = reply instanceof Uint8Array ? reply : Uint8Array.from(reply || []);
    const header = inspectMG30UserIRDataReadReply(body, command);
    if (header.offset > max || header.offset % step !== 0) {
      throw new Error('Offset reply IR di luar tabel: ' + header.offset + '.');
    }
    if (byOffset.has(header.offset)) {
      throw new Error('Reply IR duplikat untuk offset ' + header.offset + '.');
    }
    if (command === 0x10) {
      parseMG30UserIRWaveReadReply(body, index, header.offset);
    } else {
      parseMG30UserIRCurveReadReply(body, index, header.offset);
    }
    byOffset.set(header.offset, body);
  }
  const ordered = [];
  for (let frame = 0; frame < count; frame++) {
    const offset = frame * step;
    const body = byOffset.get(offset);
    if (!body) throw new Error('Reply IR untuk offset ' + offset + ' belum diterima.');
    ordered.push(body);
  }
  return ordered;
}

export function assembleMG30UserIRReadback(resourceIndex, waveReplies, curveReplies) {
  const index = assertIndex(resourceIndex, 'Indeks resource IR');
  if (!Array.isArray(waveReplies) || waveReplies.length !== 64 ||
      !Array.isArray(curveReplies) || curveReplies.length !== 10) {
    throw new Error('Readback IR memerlukan 64 reply waveform dan 10 reply kurva.');
  }
  const samples = new Float32Array(WAVE_SAMPLES);
  const curve = new Uint16Array(CURVE_VALUES);
  for (let frame = 0; frame < 64; frame++) {
    const parsed = parseMG30UserIRWaveReadReply(waveReplies[frame], index, frame * WAVE_FRAME_SAMPLES);
    samples.set(parsed.samples, parsed.offset);
  }
  for (let frame = 0; frame < 10; frame++) {
    const parsed = parseMG30UserIRCurveReadReply(curveReplies[frame], index, frame * CURVE_FRAME_VALUES);
    curve.set(parsed.values.subarray(0, parsed.validCount), parsed.offset);
  }
  return { resourceIndex: index, samples, curve };
}

export const MG30PresetReadFormat = Object.freeze({
  buildMetadataRequest: buildMG30UserIRMetadataReadRequest,
  buildWaveRequest: buildMG30UserIRWaveReadRequest,
  buildCurveRequest: buildMG30UserIRCurveReadRequest,
  parseMetadataReply: parseMG30UserIRMetadataReadReply,
  parseWaveReply: parseMG30UserIRWaveReadReply,
  parseCurveReply: parseMG30UserIRCurveReadReply,
  inspectDataReply: inspectMG30UserIRDataReadReply,
  createReadRequests: createMG30UserIRReadRequests,
  assembleReadback: assembleMG30UserIRReadback,
  orderDataReplies: orderMG30UserIRDataReadReplies,
});
