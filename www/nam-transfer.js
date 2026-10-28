// NUX MG-30 Gen 2 native A2-Lite transfer codec recovered from QuickTone 2.6.7.16.
// Transaction format is validated against Friedman/slot 9 and Mesa/slot 10 captures.
// Keep the caller responsible for explicit user confirmation and slot selection.

const ROOT = Uint8Array.from([0xF0, 0x43, 0x58, 0x70, 0x58]);
const BUFFER_SIZE = 8192;
const CHUNK_SIZE = 136;
const WEIGHT_COUNT = 1871;
const WEIGHT_BYTES = WEIGHT_COUNT * 4;
const ACK_TIMEOUT_MS = 1200;
const MAX_SEND_ATTEMPTS = 2;

// This 96-byte metadata tail is stable across the two captured native A2-Lite imports.
// Field semantics are not fully decoded; treat it as a recovered device metadata template.
const METADATA_TAIL = Uint8Array.from(
  ('03 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ' +
   '00 00 00 00 00 00 80 3f 00 00 00 00 00 00 00 00 ' +
   '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ' +
   '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ' +
   '32 32 32 32 32 00 00 00 00 00 00 00 00 00 00 00 ' +
   '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00')
    .trim().split(/\s+/).map(value => parseInt(value, 16))
);

const toBytes = input => input instanceof Uint8Array
  ? input
  : input instanceof ArrayBuffer
    ? new Uint8Array(input)
    : ArrayBuffer.isView(input)
      ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
      : new Uint8Array(input || []);

const sameBytes = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

function pack7(raw) {
  const source = toBytes(raw);
  const out = [];
  let acc = 0;
  let bits = 0;
  for (const value of source) {
    acc |= value << bits;
    bits += 8;
    while (bits >= 7) {
      out.push(acc & 0x7F);
      acc >>>= 7;
      bits -= 7;
    }
  }
  if (bits) out.push(acc & 0x7F);
  return Uint8Array.from(out);
}

function unpack7(packed) {
  const out = [];
  let acc = 0;
  let bits = 0;
  for (const value of toBytes(packed)) {
    if (value & 0x80) throw new Error('Payload SysEx mengandung byte non-7-bit.');
    acc |= value << bits;
    bits += 7;
    while (bits >= 8) {
      out.push(acc & 0xFF);
      acc >>>= 8;
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

function concatBytes(...parts) {
  const arrays = parts.map(toBytes);
  const out = new Uint8Array(arrays.reduce((sum, item) => sum + item.length, 0));
  let offset = 0;
  for (const part of arrays) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function makeDescriptor(slotIndex, field2, field3, offset, size) {
  const d = new Uint8Array(12);
  d[0] = 0;
  d[1] = slotIndex;
  d[2] = field2;
  d[3] = field3;
  const view = new DataView(d.buffer);
  view.setUint32(4, offset >>> 0, true);
  view.setUint32(8, size >>> 0, true);
  return d;
}

function makeFrame(command, rawBody) {
  return concatBytes(ROOT, Uint8Array.of(command), pack7(rawBody), Uint8Array.of(0xF7));
}

function decodeFrame(message) {
  const bytes = toBytes(message);
  if (bytes.length < 19 || bytes[bytes.length - 1] !== 0xF7 ||
      !sameBytes(bytes.subarray(0, ROOT.length), ROOT)) return null;
  let raw;
  try {
    raw = unpack7(bytes.subarray(6, bytes.length - 1));
  } catch {
    return null;
  }
  if (raw.length < 12) return null;
  const d = raw.subarray(0, 12);
  const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
  return {
    command: bytes[5],
    descriptor: Uint8Array.from(d),
    slotIndex: d[1],
    field2: d[2],
    field3: d[3],
    offset: view.getUint32(4, true),
    size: view.getUint32(8, true),
    payload: raw.subarray(12),
  };
}

function crc32SkippingChecksum(bytes, totalSize) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < totalSize; i++) {
    if (i >= 24 && i < 28) continue;
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function getWeightsFromNamb(bytes) {
  if (bytes.length < 80 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'NAMB') {
    throw new Error('File .namb tidak valid atau terlalu pendek.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint16(4, true);
  const totalSize = view.getUint32(8, true);
  const weightsOffset = view.getUint32(12, true);
  const count = view.getUint32(16, true);
  const storedCrc = view.getUint32(24, true);
  if (version !== 1) throw new Error('Versi format .namb belum didukung.');
  if (totalSize > bytes.length || totalSize < 80 ||
      weightsOffset + count * 4 > totalSize) {
    throw new Error('Header .namb menunjukkan rentang data yang tidak valid.');
  }
  if (crc32SkippingChecksum(bytes, totalSize) !== storedCrc) {
    throw new Error('CRC32 .namb tidak cocok; transfer dibatalkan.');
  }
  if (bytes[80] !== 3 || count !== WEIGHT_COUNT) {
    throw new Error('Model .namb ini bukan model WaveNet A2-Lite 1.871 bobot yang cocok untuk MG-30 Gen 2.');
  }
  return Uint8Array.from(bytes.subarray(weightsOffset, weightsOffset + WEIGHT_BYTES));
}

function floatWeightsToBytes(weights) {
  if (!Array.isArray(weights) || weights.length !== WEIGHT_COUNT) {
    throw new Error('Model harus memiliki tepat ' + WEIGHT_COUNT + ' bobot A2-Lite.');
  }
  const bytes = new Uint8Array(WEIGHT_BYTES);
  const view = new DataView(bytes.buffer);
  weights.forEach((value, index) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error('Bobot model ke-' + (index + 1) + ' bukan angka valid.');
    view.setFloat32(index * 4, numeric, true);
  });
  return bytes;
}

export function extractMG30A2LiteWeights(input) {
  const bytes = toBytes(input);
  if (bytes.length >= 4 && String.fromCharCode(...bytes.subarray(0, 4)) === 'NAMB') {
    return getWeightsFromNamb(bytes);
  }

  let root;
  try {
    root = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('File NAM bukan JSON yang valid. Pastikan model yang diunduh berformat .nam atau .namb.');
  }

  let model = root;
  if (root?.architecture === 'SlimmableContainer') {
    const submodels = root?.config?.submodels;
    const lite = Array.isArray(submodels)
      ? submodels.map(item => item?.model).find(item =>
          item?.architecture === 'WaveNet' && Array.isArray(item?.weights) &&
          item.weights.length === WEIGHT_COUNT)
      : null;
    if (!lite) throw new Error('Kontainer NAM ini tidak memiliki submodel A2-Lite dengan 1.871 bobot.');
    model = lite;
  }
  if (model?.architecture !== 'WaveNet') {
    throw new Error('Arsitektur model tidak cocok; hanya A2-Lite WaveNet native yang didukung pada tahap ini.');
  }
  return floatWeightsToBytes(model.weights);
}

export function safeMG30SlotLabel(value) {
  let label = String(value ?? 'NAM model').replace(/\.(nam|namb)$/i, '').trim();
  if (typeof label.normalize === 'function') label = label.normalize('NFKD').replace(/\p{M}/gu, '');
  label = Array.from(label, char => {
    const code = char.codePointAt(0);
    return code >= 0x20 && code <= 0x7E ? char : '_';
  }).join('');
  return label.slice(0, 32) || 'NAM model';
}

function makeMetadataFrame(slotIndex, label) {
  const name = new Uint8Array(32);
  name.set(new TextEncoder().encode(safeMG30SlotLabel(label)).subarray(0, 32));
  const payload = concatBytes(name, METADATA_TAIL);
  return makeFrame(1, concatBytes(makeDescriptor(slotIndex, 3, 0, 0, 128), payload));
}

function makeDataFrame(slotIndex, offset, buffer) {
  return makeFrame(1, concatBytes(
    makeDescriptor(slotIndex, 1, 3, offset, BUFFER_SIZE),
    buffer.subarray(offset, offset + CHUNK_SIZE)
  ));
}

function makeQueryFrame(slotIndex) {
  return makeFrame(0, concatBytes(makeDescriptor(slotIndex, 4, 0, 0, 0), new Uint8Array(CHUNK_SIZE)));
}

export function buildMG30A2LiteTransferPlan(weightBytes, label, uiSlot) {
  const weights = toBytes(weightBytes);
  if (weights.length !== WEIGHT_BYTES) {
    throw new Error('Panjang bobot tidak valid: harus ' + WEIGHT_BYTES + ' byte untuk A2-Lite.');
  }
  const slotIndex = Number(uiSlot) - 1;
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 9) {
    throw new Error('Pilih slot MG-30 dari 1 sampai 10.');
  }
  const buffer = new Uint8Array(BUFFER_SIZE);
  buffer.set(weights);

  // QuickTone captures send offset 0 twice; retain the same observed behavior.
  const offsets = [0, 0];
  for (let offset = CHUNK_SIZE; offset < BUFFER_SIZE; offset += CHUNK_SIZE) offsets.push(offset);
  const dataFrames = offsets.map(offset => makeDataFrame(slotIndex, offset, buffer));
  const readbackRounds = [
    Array.from({ length: 10 }, (_, slot) => makeQueryFrame(slot)),
    Array.from({ length: 10 }, (_, slot) => makeQueryFrame(slot)),
  ];
  return {
    slotIndex,
    slotNumber: slotIndex + 1,
    label: safeMG30SlotLabel(label),
    buffer,
    metadataFrame: makeMetadataFrame(slotIndex, label),
    dataFrames,
    readbackRounds,
    totalDataFrames: dataFrames.length,
  };
}

function waitForMatchingMessage(input, predicate, timeoutMs, description) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      input.removeEventListener('midimessage', onMessage);
    };
    const onMessage = event => {
      const parsed = decodeFrame(event?.data);
      if (!parsed) return;
      let matched = false;
      try { matched = predicate(parsed); } catch { matched = false; }
      if (matched) {
        cleanup();
        resolve(parsed);
      }
    };
    input.addEventListener('midimessage', onMessage);
    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout menunggu ' + description + '.'));
    }, timeoutMs);
  });
}

async function sendAndWait(connection, frame, predicate, description) {
  const pending = waitForMatchingMessage(connection.input, predicate, ACK_TIMEOUT_MS, description);
  try {
    await connection.output.send(frame);
  } catch (error) {
    // Cancel the pending wait if Android rejected the USB-MIDI write immediately.
    // A late reply will be ignored because waitForMatchingMessage times out and cleans up.
    throw new Error('Gagal mengirim ' + description + ': ' + (error?.message || error));
  }
  return await pending;
}

function ackMatches(parsed, descriptor) {
  return parsed.command === 3 && sameBytes(parsed.descriptor, descriptor);
}

function replyMatches(parsed, slotIndex) {
  return parsed.command === 2 && parsed.slotIndex === slotIndex &&
    parsed.field2 === 4 && parsed.field3 === 0 &&
    parsed.offset === 0 && parsed.size === 128 && parsed.payload.length === 128;
}

export async function sendMG30A2LiteTransfer(connection, plan, onProgress = () => {}) {
  if (!connection?.input?.addEventListener || !connection?.output?.send) {
    throw new Error('Koneksi USB-MIDI MG-30 tidak siap.');
  }
  let completedWrites = 0;
  const totalWrites = 1 + plan.dataFrames.length;

  async function writeWithAck(frame, label) {
    const outgoing = decodeFrame(frame);
    if (!outgoing) throw new Error('Frame internal gagal divalidasi.');
    let lastError;
    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
      try {
        await sendAndWait(connection, frame,
          parsed => ackMatches(parsed, outgoing.descriptor), label);
        completedWrites++;
        onProgress({ stage: 'write', completed: completedWrites, total: totalWrites, label });
        return;
      } catch (error) {
        lastError = error;
        if (attempt === MAX_SEND_ATTEMPTS) break;
        onProgress({ stage: 'retry', completed: completedWrites, total: totalWrites, label, attempt });
      }
    }
    throw new Error(label + ' tidak mendapat ACK setelah ' + MAX_SEND_ATTEMPTS +
      ' percobaan: ' + (lastError?.message || lastError));
  }

  await writeWithAck(plan.metadataFrame, 'metadata/nama slot');
  for (let i = 0; i < plan.dataFrames.length; i++) {
    const d = decodeFrame(plan.dataFrames[i]);
    await writeWithAck(plan.dataFrames[i], 'data offset ' + d.offset);
  }

  const readbacks = [[], []];
  for (let round = 0; round < 2; round++) {
    for (let slot = 0; slot < 10; slot++) {
      const reply = await sendAndWait(connection, plan.readbackRounds[round][slot],
        parsed => replyMatches(parsed, slot),
        'readback metadata slot ' + (slot + 1) + ', putaran ' + (round + 1));
      readbacks[round][slot] = Uint8Array.from(reply.payload);
      onProgress({ stage: 'readback', round: round + 1, slot: slot + 1, total: 20 });
    }
  }

  for (let slot = 0; slot < 10; slot++) {
    if (!sameBytes(readbacks[0][slot], readbacks[1][slot])) {
      throw new Error('Readback metadata slot ' + (slot + 1) + ' berubah di antara dua putaran.');
    }
  }
  const expectedName = new Uint8Array(32);
  expectedName.set(new TextEncoder().encode(plan.label).subarray(0, 32));
  if (!sameBytes(readbacks[1][plan.slotIndex].subarray(0, 32), expectedName)) {
    throw new Error('Readback selesai, tetapi nama slot ' + plan.slotNumber +
      ' tidak cocok. Periksa perangkat sebelum mencoba ulang.');
  }

  return {
    success: true,
    slotNumber: plan.slotNumber,
    label: plan.label,
    acknowledgedWriteFrames: completedWrites,
    dataFrames: plan.dataFrames.length,
    readbackRounds: 2,
    readbackNameVerified: true,
    note: 'Semua frame mendapat ACK dan nama slot berhasil diverifikasi. Capture tidak menyediakan readback bobot, sehingga isi bobot tidak dapat diverifikasi melalui query metadata saja.',
  };
}
