const RECORD_SIZE = 0x26AE;
const ALL_FILE_SIZE = 128 * RECORD_SIZE;
const SCENE_OFFSET = 4;
const SCENE_BYTES = 142;
const RESOURCE_MARKER_OFFSET = 0x1AE;
const RESOURCE_NAME_OFFSET = 0x1B2;
const RIFF_OFFSET = 0x1D2;
const FLOAT_DATA_OFFSET = 0x1FE;
const FLOAT_DATA_END = 0x19FE;
const FLOAT_TAIL_OFFSET = 0x19FE;
const FLOAT_TAIL_END = 0x21FE;
const CURVE_OFFSET = 0x21FE;

function bytesOf(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError('Data .mg30patch bukan byte buffer yang valid.');
}
function tagAt(b, offset, tag) {
  return offset >= 0 && offset + tag.length <= b.length &&
    tag.split('').every((c, i) => b[offset + i] === c.charCodeAt(0));
}
function encodeWord16(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 0xFFFF) throw new Error('Nilai word preset di luar rentang uint16.');
  const w = ((n & 0xFF) << 8) | (n >>> 8);
  return [(w >>> 14) & 3, (w >>> 7) & 0x7F, w & 0x7F];
}
function decodeAsciiField(bytes) {
  let end = bytes.indexOf(0);
  if (end < 0) end = bytes.length;
  const visible = bytes.subarray(0, end);
  for (const byte of visible) if (byte < 0x20 || byte > 0x7E) {
    throw new Error('Nama resource IR berisi karakter non-ASCII yang belum didukung.');
  }
  return String.fromCharCode(...visible);
}

/**
 * Parser single-preset only. The all-preset 128-record container is rejected
 * intentionally until its batch-import mapping is independently captured.
 */
export function parseMG30SinglePresetPatch(input) {
  const b = bytesOf(input);
  if (b.length === ALL_FILE_SIZE) {
    throw new Error('File ini berisi 128 preset sekaligus. Import batch 128 preset belum diaktifkan; pilih file single-preset .mg30patch.');
  }
  if (b.length !== RECORD_SIZE) {
    throw new Error('Ukuran single-preset .mg30patch tidak cocok: ' + b.length + ' byte; format tervalidasi berukuran ' + RECORD_SIZE + ' byte.');
  }
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const recordOrdinal = v.getUint32(0, true);
  if (recordOrdinal > 127) throw new Error('Indeks record .mg30patch di luar rentang 0–127.');

  const scenes = [];
  for (let scene = 0; scene < 3; scene++) {
    const start = SCENE_OFFSET + scene * SCENE_BYTES;
    const raw = b.slice(start, start + SCENE_BYTES);
    if (raw.length !== SCENE_BYTES || start + SCENE_BYTES > RESOURCE_MARKER_OFFSET) throw new Error('Data scene terpotong.');
    const sv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const words = new Uint16Array(71);
    for (let i = 0; i < words.length; i++) words[i] = sv.getUint16(i * 2, true);
    scenes.push({ index: scene, raw, words });
  }

  const resourceMarker = v.getUint32(RESOURCE_MARKER_OFFSET, true);
  if (resourceMarker !== 1) {
    throw new Error('Penanda resource record tidak cocok dengan varian single-preset yang tervalidasi. Tidak ada data yang dikirim.');
  }
  const resourceName = decodeAsciiField(b.subarray(RESOURCE_NAME_OFFSET, RESOURCE_NAME_OFFSET + 16)).trim();
  if (!resourceName) throw new Error('Nama resource IR pada record kosong.');

  // The internal QuickTone record uses a RIFF/WAVE-shaped header, but the
  // 2048 resource samples are stored as raw float32, not decoded as PCM24.
  if (!tagAt(b, RIFF_OFFSET, 'RIFF') || !tagAt(b, RIFF_OFFSET + 8, 'WAVE') ||
      v.getUint32(RIFF_OFFSET + 4, true) !== 0x1824 ||
      !tagAt(b, RIFF_OFFSET + 12, 'fmt ') ||
      v.getUint32(RIFF_OFFSET + 16, true) !== 16 ||
      v.getUint16(RIFF_OFFSET + 20, true) !== 1 ||
      v.getUint16(RIFF_OFFSET + 22, true) !== 1 ||
      v.getUint32(RIFF_OFFSET + 24, true) !== 48000 ||
      v.getUint32(RIFF_OFFSET + 28, true) !== 144000 ||
      v.getUint16(RIFF_OFFSET + 32, true) !== 3 ||
      v.getUint16(RIFF_OFFSET + 34, true) !== 24 ||
      !tagAt(b, RIFF_OFFSET + 36, 'data') ||
      v.getUint32(RIFF_OFFSET + 40, true) !== 0x1800) {
    throw new Error('Metadata RIFF/resource tidak cocok dengan sampel single-preset yang dianalisis.');
  }

  const rawSamples = new Uint8Array(2048 * 4);
  rawSamples.set(b.subarray(FLOAT_DATA_OFFSET, FLOAT_DATA_END), 0);        // 1536 float32
  rawSamples.set(b.subarray(FLOAT_TAIL_OFFSET, FLOAT_TAIL_END), 0x1800);  // 512 float32
  const sampleView = new DataView(rawSamples.buffer);
  const samples = new Float32Array(2048);
  for (let i = 0; i < samples.length; i++) {
    const x = sampleView.getFloat32(i * 4, true);
    if (!Number.isFinite(x)) throw new Error('Float32 resource tidak valid pada sampel ' + i + '.');
    samples[i] = x;
  }

  const curveBytes = b.subarray(CURVE_OFFSET, RECORD_SIZE);
  if (curveBytes.length !== 1200) throw new Error('Panjang tabel kurva resource tidak cocok.');
  const cv = new DataView(b.buffer, b.byteOffset + CURVE_OFFSET, curveBytes.length);
  const curve = new Uint16Array(600);
  for (let i = 0; i < curve.length; i++) {
    const x = cv.getUint16(i * 2, true);
    if (x > 305) throw new Error('Nilai kurva IR di luar rentang yang tervalidasi pada indeks ' + i + '.');
    curve[i] = x;
  }

  return { format: 'NUX MG-30 Gen2 single preset .mg30patch', recordOrdinal, scenes, resourceMarker, resourceName, samples, curve, byteLength: b.length };
}

function makeNameBody(name, target) {
  const nameBytes = new TextEncoder().encode(name);
  if (nameBytes.length > 20) throw new Error('Nama IR lebih dari 20 byte ASCII.');
  const padded = new Uint8Array(32);
  padded.set(nameBytes);
  const body = [0x43, 0x58, 0x70, 0x09, 0x01, target, 0, 2, 0, 0, 0, 0];
  for (let i = 0; i < 32; i += 2) body.push(...encodeWord16(padded[i] | (padded[i + 1] << 8)));
  if (body.length !== 60) throw new Error('Ukuran frame nama IR tidak cocok.');
  return Uint8Array.from(body);
}
function makeWaveBodies(samples, target) {
  if (!(samples instanceof Float32Array) || samples.length !== 2048) throw new Error('Waveform resource harus 2048 float32.');
  const view = new DataView(samples.buffer, samples.byteOffset, samples.byteLength);
  const out = [];
  for (let frame = 0; frame < 64; frame++) {
    const body = [0x43, 0x58, 0x70, 0x10, 0x01, ...encodeWord16(target), ...encodeWord16(frame * 32)];
    for (let word = 0; word < 64; word++) body.push(...encodeWord16(view.getUint16((frame * 64 + word) * 2, true)));
    if (body.length !== 203) throw new Error('Ukuran frame waveform IR tidak cocok.');
    out.push(Uint8Array.from(body));
  }
  return out;
}
function makeCurveBodies(curve, target) {
  if (!(curve instanceof Uint16Array) || curve.length !== 600) throw new Error('Kurva IR harus 600 nilai uint16.');
  const padded = new Uint16Array(640);
  padded.set(curve); // Do not reproduce QuickTone's 8 non-zero stale tail words.
  const out = [];
  for (let frame = 0; frame < 10; frame++) {
    const body = [0x43, 0x58, 0x70, 0x11, 0x01, ...encodeWord16(target), ...encodeWord16(frame * 64)];
    for (let i = frame * 64; i < (frame + 1) * 64; i++) body.push(...encodeWord16(padded[i]));
    if (body.length !== 203) throw new Error('Ukuran frame kurva IR tidak cocok.');
    out.push(Uint8Array.from(body));
  }
  return out;
}

/** Order is taken from the captured QuickTone import: 09, 10x64, 11x10, 0Bx3. */
export function buildMG30SinglePresetImportPlan(parsed, targetProgram) {
  const target = Number(targetProgram);
  if (!Number.isInteger(target) || target < 0 || target > 127) throw new Error('Slot tujuan harus 0–127.');
  if (!parsed || parsed.scenes?.length !== 3 || parsed.samples?.length !== 2048 || parsed.curve?.length !== 600) {
    throw new Error('Record preset belum berhasil divalidasi.');
  }
  const steps = [{ kind: 'ir-name', command: 0x09, index: 0, expectedStatus: 0, body: makeNameBody(parsed.resourceName, target) }];
  makeWaveBodies(parsed.samples, target).forEach((body, index) =>
    steps.push({ kind: 'ir-waveform', command: 0x10, index, expectedStatus: index === 63 ? 3 : 2, body }));
  makeCurveBodies(parsed.curve, target).forEach((body, index) =>
    steps.push({ kind: 'ir-curve', command: 0x11, index, expectedStatus: index === 9 ? 3 : 2, body }));
  parsed.scenes.forEach(scene => {
    const body = [0x43, 0x58, 0x70, 0x0B, 0x01, target, scene.index];
    for (const word of scene.words) body.push(...encodeWord16(word));
    if (body.length !== 220) throw new Error('Ukuran frame scene preset tidak cocok.');
    steps.push({ kind: 'preset-scene', command: 0x0B, index: scene.index, expectedStatus: 1, body: Uint8Array.from(body) });
  });
  if (steps.length !== 78) throw new Error('Rencana import harus berisi 78 frame sesuai capture QuickTone.');
  return { targetProgram: target, sourceRecordOrdinal: parsed.recordOrdinal, resourceName: parsed.resourceName, steps, totalFrames: 78 };
}

export const MG30PresetFormat = Object.freeze({
  SINGLE_RECORD_BYTES: RECORD_SIZE,
  ALL_RECORDS_BYTES: ALL_FILE_SIZE,
  parseSingle: parseMG30SinglePresetPatch,
  buildImportPlan: buildMG30SinglePresetImportPlan,
});


/** Inverse of the 16-bit-to-three-7-bit-byte format used in 0B/02 replies. */
function decodeWord16(bytes, offset) {
  const a=bytes[offset],b=bytes[offset+1],c=bytes[offset+2];
  if(!Number.isInteger(a)||!Number.isInteger(b)||!Number.isInteger(c)||
     a>3||b>0x7F||c>0x7F) throw new Error('Word scene berisi byte packed di luar rentang.');
  const packed=((a&3)<<14)|((b&0x7F)<<7)|(c&0x7F);
  return ((packed&0xFF)<<8)|(packed>>>8);
}

/**
 * Decode one read-only 0C/02 scene reply into the 71 uint16 words stored in
 * a QuickTone .mg30patch record. The reply body excludes F0/F7, like the
 * existing MG30 Studio waitForSysEx helper.
 */
export function decodeMG30PresetSceneReply(input, expectedProgram, expectedPart) {
  const body=bytesOf(input);
  if(!Number.isInteger(expectedProgram)||expectedProgram<0||expectedProgram>127)
    throw new Error('Program scene tidak valid (0–127).');
  if(!Number.isInteger(expectedPart)||expectedPart<0||expectedPart>2)
    throw new Error('Indeks scene tidak valid (0–2).');
  if(body.length!==220||body[0]!==0x43||body[1]!==0x58||body[2]!==0x70||
     body[3]!==0x0C||body[4]!==0x02||body[5]!==expectedProgram||body[6]!==expectedPart)
    throw new Error('Header/panjang balasan 0C/02 tidak cocok dengan preset dan scene yang diminta.');
  const words=new Uint16Array(71),raw=new Uint8Array(SCENE_BYTES),view=new DataView(raw.buffer);
  for(let i=0;i<words.length;i++){
    words[i]=decodeWord16(body,7+i*3);
    view.setUint16(i*2,words[i],true);
  }
  return {index:expectedPart,words,raw,program:expectedProgram};
}

/**
 * Serialize the fully reconstructed record into QuickTone's original Gen2
 * single-preset .mg30patch layout. This deliberately requires the associated
 * IR resource; a scene-only backup is not represented as a valid .mg30patch.
 */
export function buildMG30SinglePresetPatch({recordOrdinal,scenes,resourceName,samples,curve}) {
  const ordinal=Number(recordOrdinal);
  if(!Number.isInteger(ordinal)||ordinal<0||ordinal>127)
    throw new Error('Indeks record sumber harus 0–127.');
  if(!Array.isArray(scenes)||scenes.length!==3)
    throw new Error('Export membutuhkan tepat tiga scene yang sudah dibaca dari perangkat.');
  if(!(samples instanceof Float32Array)||samples.length!==2048)
    throw new Error('Export membutuhkan resource IR lengkap: 2.048 sampel float32.');
  if(!(curve instanceof Uint16Array)||curve.length!==600)
    throw new Error('Export membutuhkan kurva IR lengkap: 600 nilai uint16.');
  const name=String(resourceName||'');
  const nameBytes=new TextEncoder().encode(name);
  if(!nameBytes.length||nameBytes.length>16||Array.from(nameBytes).some(x=>x<0x20||x>0x7E))
    throw new Error('Nama resource IR harus 1–16 byte ASCII printable sesuai field file.');
  for(let i=0;i<samples.length;i++)if(!Number.isFinite(samples[i]))
    throw new Error('Sampel IR tidak finite pada indeks '+i+'.');
  for(let i=0;i<curve.length;i++)if(curve[i]>305)
    throw new Error('Nilai kurva IR di luar rentang 0–305 pada indeks '+i+'.');

  const out=new Uint8Array(RECORD_SIZE),view=new DataView(out.buffer);
  view.setUint32(0,ordinal,true);
  for(let scene=0;scene<3;scene++){
    const words=scenes[scene]?.words;
    if(!(words instanceof Uint16Array)||words.length!==71)
      throw new Error('Scene '+(scene+1)+' harus berisi tepat 71 word uint16 hasil readback.');
    const at=SCENE_OFFSET+scene*SCENE_BYTES;
    for(let i=0;i<71;i++)view.setUint16(at+i*2,words[i],true);
  }
  view.setUint32(RESOURCE_MARKER_OFFSET,1,true);
  out.set(nameBytes,RESOURCE_NAME_OFFSET);
  // 0x1C2..0x1D1 is the zero-filled 16-byte field in the supplied format.
  const riff=RIFF_OFFSET;
  out.set([0x52,0x49,0x46,0x46],riff);
  view.setUint32(riff+4,0x1824,true);
  out.set([0x57,0x41,0x56,0x45],riff+8);
  out.set([0x66,0x6D,0x74,0x20],riff+12);
  view.setUint32(riff+16,16,true);
  view.setUint16(riff+20,1,true);
  view.setUint16(riff+22,1,true);
  view.setUint32(riff+24,48000,true);
  view.setUint32(riff+28,144000,true);
  view.setUint16(riff+32,3,true);
  view.setUint16(riff+34,24,true);
  out.set([0x64,0x61,0x74,0x61],riff+36);
  view.setUint32(riff+40,0x1800,true);
  for(let i=0;i<2048;i++)view.setFloat32(FLOAT_DATA_OFFSET+i*4,samples[i],true);
  for(let i=0;i<600;i++)view.setUint16(CURVE_OFFSET+i*2,curve[i],true);
  if(out.length!==RECORD_SIZE)throw new Error('Panjang hasil export single-preset tidak cocok.');
  return out;
}

export function buildMG30SinglePresetPatchFromReplies({recordOrdinal,sceneReplies,resourceName,samples,curve}) {
  if(!Array.isArray(sceneReplies)||sceneReplies.length!==3)
    throw new Error('Export membutuhkan tiga balasan scene 0C/02.');
  const scenes=sceneReplies.map((reply,index)=>decodeMG30PresetSceneReply(reply,recordOrdinal,index));
  return buildMG30SinglePresetPatch({recordOrdinal,scenes,resourceName,samples,curve});
}
