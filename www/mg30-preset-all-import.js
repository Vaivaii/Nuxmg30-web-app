import { buildMG30SinglePresetImportPlan } from './mg30-preset-format.js';

const PRESET_COUNT = 128;
const SCENE_COUNT = 3;

function encodeWord16(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 0xFFFF) {
    throw new Error('Nilai word preset di luar rentang uint16.');
  }
  const w = ((n & 0xFF) << 8) | (n >>> 8);
  return [(w >>> 14) & 3, (w >>> 7) & 0x7F, w & 0x7F];
}

function sceneSteps(record, program) {
  if (!Array.isArray(record.scenes) || record.scenes.length !== SCENE_COUNT) {
    throw new Error('Preset ' + program + ' harus memiliki tepat tiga scene.');
  }
  return record.scenes.map((scene, part) => {
    if (scene.index !== part || !(scene.words instanceof Uint16Array) || scene.words.length !== 71) {
      throw new Error('Data scene ' + part + ' pada preset ' + program + ' tidak valid.');
    }
    const body = [0x43, 0x58, 0x70, 0x0B, 0x01, program, part];
    for (const word of scene.words) body.push(...encodeWord16(word));
    if (body.length !== 220) throw new Error('Ukuran frame scene preset tidak cocok.');
    return {
      kind: 'preset-scene',
      command: 0x0B,
      replyAction: 0x03,
      index: part,
      program,
      expectedStatus: 1,
      body: Uint8Array.from(body),
    };
  });
}

/**
 * Build the QuickTone MG-30 Gen2 Import All transaction observed in
 * importallpreset.pcapng. Input records must already be parsed and validated.
 * This function deliberately accepts only records returned by the dedicated
 * all-file parser; it never changes the strict single-preset parser.
 */
export function buildMG30AllPresetImportPlan(records) {
  if (!Array.isArray(records) || records.length !== PRESET_COUNT) {
    throw new Error('Import All harus berisi tepat 128 record yang sudah divalidasi.');
  }

  const resourcePrograms = [];
  const sceneGroups = [];
  const steps = [{
    kind: 'all-import-open',
    command: 0x75,
    replyAction: 0x02,
    program: 1,
    body: Uint8Array.from([0x43,0x58,0x70,0x75,0x01,0x01,0,0,0,0,0,0,0]),
  }];

  for (let program = 0; program < PRESET_COUNT; program++) {
    const record = records[program];
    if (!record || record.recordOrdinal !== program) {
      throw new Error('Urutan record .mg30patch tidak valid pada indeks ' + program + '.');
    }

    if (record.resourceMarker === 1 || record.hasResource === true) {
      const resourcePlan = buildMG30SinglePresetImportPlan(record, program);
      if (resourcePlan.steps.length !== 78) {
        throw new Error('Resource preset ' + program + ' tidak menghasilkan 78 langkah tervalidasi.');
      }
      steps.push(...resourcePlan.steps.slice(0, 75));
      resourcePrograms.push(program);
    } else if (record.resourceMarker !== 0 && record.hasResource !== false) {
      throw new Error('Penanda resource preset ' + program + ' tidak valid.');
    }

    sceneGroups.push(...sceneSteps(record, program));
  }

  // The capture fixture contained 27 resource-bearing presets, but that is
  // a property of that bank, not a protocol limit. Each resource group uses
  // the same 75-frame 09/10/11 transaction sequence for its own preset index.
  // QuickTone completes all 27 resource groups before writing any of the
  // 384 scene records. Preserve that captured phase ordering exactly.
  steps.push(...sceneGroups);

  steps.push({
    kind: 'all-import-finish',
    command: 0x15,
    replyAction: 0x02,
    program: 0x7F,
    part: 0x03,
    body: Uint8Array.from([0x43,0x58,0x70,0x15,0x01,0x7F,0x03,0,0,0,0,0,0]),
  });
  steps.push({
    kind: 'all-import-close',
    command: 0x75,
    replyAction: 0x02,
    program: 0,
    body: Uint8Array.from([0x43,0x58,0x70,0x75,0x01,0,0,0,0,0,0,0,0]),
  });

  const expectedFrames = 3 + resourcePrograms.length * 75 + PRESET_COUNT * SCENE_COUNT;
  if (steps.length !== expectedFrames) {
    throw new Error('Jumlah frame Import All tidak cocok dengan jumlah resource dan scene: ' +
      steps.length + ' (diharapkan ' + expectedFrames + ').');
  }

  return Object.freeze({
    format: 'NUX MG-30 Gen2 QuickTone Import All',
    presetCount: PRESET_COUNT,
    resourcePrograms: Object.freeze(resourcePrograms),
    steps: Object.freeze(steps),
    totalFrames: expectedFrames,
  });
}

export const MG30AllPresetImport = Object.freeze({
  PRESET_COUNT,
  buildPlan: buildMG30AllPresetImportPlan,
});
