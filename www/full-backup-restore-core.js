export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP_ID = 'com.vaivaii.mg30studio';
export const BACKUP_SAFE_SETTINGS_KEYS = Object.freeze([
  'mg30-favorite-slots',
  'mg30-nam-slot-names',
  'mg30-user-ir-name',
  'mg30-preset-library-card-names-v1',
  'mg30-t3k-redirect_uri_config',
  'mg30-t3k-target_slot',
  'mg30-t3k-selected_tone_id',
  'mg30-t3k-selected_model_id',
  'mg30-t3k-catalogue_expanded'
]);

export function sanitizeBackupSettings(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const output = {};
  for (const key of BACKUP_SAFE_SETTINGS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key) &&
        (typeof source[key] === 'string' || source[key] === null)) {
      const value = source[key];
      if (value === null || value.length <= 20000) output[key] = value;
    }
  }
  return output;
}

function safeFileName(value) {
  const name = String(value || '').split(/[\\/]/).pop().replace(/[^A-Za-z0-9._ -]/g, '_').trim();
  if (!name || name === '.' || name === '..' || name.length > 180) {
    throw new Error('Backup contains an invalid file name.');
  }
  return name;
}

function uniqueName(fileName, used) {
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const extension = dot > 0 ? fileName.slice(dot) : '';
  let suffix = 2;
  let candidate = stem + ' (' + suffix + ')' + extension;
  while (used.has(candidate.toLowerCase())) candidate = stem + ' (' + (++suffix) + ')' + extension;
  return candidate;
}

export function planNamRestore(files, existingNames, conflict = 'keep-both') {
  if (!Array.isArray(files)) throw new TypeError('NAM restore list must be an array.');
  if (!['keep-existing', 'replace', 'keep-both'].includes(conflict)) throw new Error('Unknown NAM conflict policy.');
  const existing = new Set(Array.from(existingNames || [], value => String(value).toLowerCase()));
  const incoming = new Set();
  const reserved = new Set(existing);
  const normalized = files.map(file => {
    const fileName = safeFileName(file.fileName);
    if (!/\.(nam|namb|image)$/i.test(fileName)) throw new Error('Unsupported NAM Library file: ' + fileName);
    const lower = fileName.toLowerCase();
    if (incoming.has(lower)) throw new Error('Backup contains duplicate NAM file names: ' + fileName);
    incoming.add(lower);
    reserved.add(lower);
    return { file, fileName, lower };
  });
  const actions = [];
  for (const item of normalized) {
    const { fileName, lower } = item;
    const exists = existing.has(lower);
    if (exists && conflict === 'keep-existing') {
      actions.push({ action: 'skip', fileName, reason: 'Existing file kept' });
    } else if (exists && conflict === 'replace') {
      actions.push({ action: 'replace', fileName });
    } else if (exists) {
      const destination = uniqueName(fileName, reserved);
      reserved.add(destination.toLowerCase());
      actions.push({ action: 'keep-both', fileName, destination });
    } else {
      actions.push({ action: 'create', fileName, destination: fileName });
    }
  }
  return actions;
}

export function planIRRestore(records, existingSlots, conflict = 'keep-both') {
  if (!Array.isArray(records)) throw new TypeError('IR restore list must be an array.');
  if (!['keep-existing', 'replace', 'keep-both'].includes(conflict)) throw new Error('Unknown IR conflict policy.');
  const existing = new Set(Array.from(existingSlots || [], Number).filter(slot => Number.isInteger(slot) && slot >= 1 && slot <= 24));
  const sourceSlots = new Set();
  const normalized = records.map(record => {
    const sourceSlot = Number(record.slot);
    if (!Number.isInteger(sourceSlot) || sourceSlot < 1 || sourceSlot > 24) throw new Error('Backup contains an invalid IR Collection slot.');
    if (sourceSlots.has(sourceSlot)) throw new Error('Backup contains duplicate IR Collection slot ' + sourceSlot + '.');
    sourceSlots.add(sourceSlot);
    return { record, sourceSlot };
  });
  // Reserve all incoming source slots before allocating duplicates. This prevents
  // an early conflict from stealing a later record's original empty destination.
  const reserved = new Set([...existing, ...sourceSlots]);
  const actions = [];
  for (const { sourceSlot } of normalized) {
    if (existing.has(sourceSlot)) {
      if (conflict === 'keep-existing') {
        actions.push({ action: 'skip', sourceSlot, reason: 'Existing Collection slot kept' });
      } else if (conflict === 'replace') {
        actions.push({ action: 'replace', sourceSlot, destinationSlot: sourceSlot });
      } else {
        let destinationSlot = 0;
        for (let slot = 1; slot <= 24; slot++) {
          if (!reserved.has(slot)) { destinationSlot = slot; break; }
        }
        if (!destinationSlot) {
          actions.push({ action: 'skip', sourceSlot, reason: 'No empty Collection slot for a second copy' });
        } else {
          reserved.add(destinationSlot);
          actions.push({ action: 'keep-both', sourceSlot, destinationSlot });
        }
      }
    } else {
      actions.push({ action: 'create', sourceSlot, destinationSlot: sourceSlot });
    }
  }
  return actions;
}

export function mergePresetDrafts(currentDrafts, incomingDrafts, conflict = 'keep-both') {
  if (!Array.isArray(currentDrafts) || !Array.isArray(incomingDrafts)) {
    throw new TypeError('Preset draft collections must be arrays.');
  }
  if (!['keep-existing', 'replace', 'keep-both'].includes(conflict)) throw new Error('Unknown preset draft conflict policy.');
  if (conflict === 'replace') return incomingDrafts.map(item => ({ ...item }));
  const output = currentDrafts.map(item => ({ ...item }));
  const ids = new Set(output.map(item => String(item?.id ?? '')));
  for (const item of incomingDrafts) {
    const id = String(item?.id ?? '');
    if (!id || !ids.has(id)) {
      const copy = { ...item };
      output.push(copy);
      if (id) ids.add(id);
      continue;
    }
    if (conflict === 'keep-existing') continue;
    let suffix = 2;
    let nextId = id + '-restored-' + suffix;
    while (ids.has(nextId)) nextId = id + '-restored-' + (++suffix);
    output.push({ ...item, id: nextId, name: String(item?.name || 'Preset') + ' (Restored)' });
    ids.add(nextId);
  }
  return output;
}

export function validateBackupManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) ||
      manifest.format !== 'mg30-studio-full-backup' ||
      manifest.schemaVersion !== BACKUP_SCHEMA_VERSION ||
      manifest.appId !== BACKUP_APP_ID ||
      !manifest.sections || typeof manifest.sections !== 'object') {
    throw new Error('This is not a supported MG30 Studio Full Backup archive.');
  }
  for (const [section, descriptor] of Object.entries(manifest.sections)) {
    if (!['presetBank', 'presetDrafts', 'nam', 'ir', 'settings'].includes(section)) {
      throw new Error('Backup contains an unknown section: ' + section);
    }
    if (!descriptor || typeof descriptor !== 'object') throw new Error('Backup section metadata is invalid: ' + section);
  }
  return manifest;
}
