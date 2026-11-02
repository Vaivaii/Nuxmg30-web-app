const NAME_FIRST_BIT = 106;
const NAME_LENGTH = 16;
const CHAIN_FIRST_BIT = 94;
const CHAIN_LENGTH = 12;

function readBitSlot(body, slot) {
  let value = 0;
  const start = 6 + 21 * Math.floor(slot / 2) + 8 * (slot % 2);
  for (let bit = 0; bit < 7; bit++) {
    const position = start + bit;
    const byte = body[7 + Math.floor(position / 7)];
    value = (value << 1) | ((byte >> (6 - (position % 7))) & 1);
  }
  return value;
}

function writeBitSlot(body, slot, value) {
  const start = 6 + 21 * Math.floor(slot / 2) + 8 * (slot % 2);
  for (let bit = 0; bit < 7; bit++) {
    const position = start + bit;
    const index = 7 + Math.floor(position / 7);
    const shift = 6 - (position % 7);
    const nextBit = (value >> (6 - bit)) & 1;
    body[index] = (body[index] & ~(1 << shift)) | (nextBit << shift);
  }
}

export function normalizeMG30PresetName(value) {
  const name = String(value ?? "").trim();
  if (!name) throw new Error("Nama preset tidak boleh kosong.");
  if (name.length > NAME_LENGTH) {
    throw new Error("Nama preset maksimal 16 karakter ASCII.");
  }
  for (const character of name) {
    const code = character.charCodeAt(0);
    if (code < 0x20 || code > 0x7e) {
      throw new Error("Nama preset hanya boleh memakai karakter ASCII yang dapat dicetak.");
    }
  }
  return name;
}

export function readMG30PresetName(body) {
  if (!body || body.length < 190) throw new Error("Data nama preset tidak lengkap.");
  let name = "";
  for (let index = 0; index < NAME_LENGTH; index++) {
    const code = readBitSlot(body, NAME_FIRST_BIT + index);
    if (code === 0) break;
    if (code < 0x20 || code > 0x7e) {
      throw new Error("Nama preset pada slot berisi karakter yang tidak valid.");
    }
    name += String.fromCharCode(code);
  }
  return name.trimEnd();
}

export function validateMG30PresetReadParts(parts, command, program = null) {
  if (!Array.isArray(parts) || parts.length !== 3) {
    throw new Error("Readback preset harus berisi tiga bagian scene.");
  }
  if (command !== 0x0b && command !== 0x0c) {
    throw new Error("Command readback preset tidak dikenal.");
  }
  return parts.map((part, index) => {
    const body = part instanceof Uint8Array ? part : Uint8Array.from(part || []);
    if (body.length < 190 ||
        body[0] !== 0x43 || body[1] !== 0x58 || body[2] !== 0x70 ||
        body[3] !== command || body[4] !== 0x02 || body[6] !== index ||
        (command === 0x0b && Number(body[5]) !== Number(program))) {
      throw new Error("Header readback preset bagian " + (index + 1) +
        " tidak cocok dengan slot/scene yang diminta.");
    }
    return body;
  });
}

export function renameMG30PresetParts(parts, value) {
  const name = normalizeMG30PresetName(value);
  if (!Array.isArray(parts) || parts.length !== 3) {
    throw new Error("Rename memerlukan tiga bagian preset hasil readback.");
  }
  const copy = parts.map(part => Uint8Array.from(part || []));
  if (copy.some(part => part.length < 190)) {
    throw new Error("Data preset terlalu pendek untuk memperbarui nama.");
  }
  for (let index = 0; index < NAME_LENGTH; index++) {
    writeBitSlot(copy[0], NAME_FIRST_BIT + index,
      index < name.length ? name.charCodeAt(index) : 0);
  }
  return copy;
}

export function prepareMG30SaveAsParts(parts, value, sceneIndex, chainOrder) {
  const name = normalizeMG30PresetName(value);
  if (!Array.isArray(parts) || parts.length !== 3) {
    throw new Error("Save As memerlukan tiga bagian edit buffer.");
  }
  if (!Number.isInteger(sceneIndex) || sceneIndex < 0 || sceneIndex > 2) {
    throw new Error("Scene aktif tidak valid untuk Save As.");
  }
  if (!Array.isArray(chainOrder) || chainOrder.length !== CHAIN_LENGTH ||
      new Set(chainOrder).size !== CHAIN_LENGTH ||
      chainOrder.some(id => !Number.isInteger(id) || id < 0 || id >= CHAIN_LENGTH)) {
    throw new Error("Urutan signal chain tidak valid; Save As dibatalkan.");
  }
  const copy = parts.map(part => Uint8Array.from(part || []));
  if (copy.some(part => part.length < 190)) {
    throw new Error("Edit buffer preset tidak lengkap untuk Save As.");
  }
  for (let index = 0; index < NAME_LENGTH; index++) {
    writeBitSlot(copy[0], NAME_FIRST_BIT + index,
      index < name.length ? name.charCodeAt(index) : 0);
  }
  for (let index = 0; index < CHAIN_LENGTH; index++) {
    writeBitSlot(copy[sceneIndex], CHAIN_FIRST_BIT + index, chainOrder[index]);
  }
  return copy;
}

export function createMG30PresetSlotBackup({
  program, label, parts, operation, sourceProgram = null, createdAt = new Date().toISOString()
}) {
  if (!Number.isInteger(program) || program < 0 || program > 127) {
    throw new Error("Slot backup tidak valid.");
  }
  if (!Array.isArray(parts) || parts.length !== 3) {
    throw new Error("Backup preset memerlukan tiga bagian scene.");
  }
  return {
    schemaVersion: 1,
    kind: "mg30-preset-slot-raw-readback",
    device: "NUX MG-30 Gen 2",
    targetProgram: program,
    targetLabel: String(label || ""),
    sourceProgram: Number.isInteger(sourceProgram) ? sourceProgram : null,
    operation: String(operation || "unknown"),
    createdAt: String(createdAt),
    restoreSupport: "raw snapshot only; no in-app restore workflow",
    parts: parts.map(part => Array.from(part || []))
  };
}
