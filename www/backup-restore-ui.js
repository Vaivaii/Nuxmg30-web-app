import { Capacitor, registerPlugin } from '@capacitor/core';
import { encodeStoredZip, decodeStoredZip } from './backup-archive.js';
import {
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  BACKUP_SAFE_SETTINGS_KEYS,
  sanitizeBackupSettings,
  planNamRestore,
  planIRRestore,
  mergePresetDrafts,
  validateBackupManifest
} from './full-backup-restore-core.js';
import { parseMG30AllPresetPatch } from './mg30-preset-format.js';
import { buildMG30AllPresetImportPlan } from './mg30-preset-all-import.js';
import { extractMG30A2LiteWeights } from './nam-transfer.js';
import { readMG30IRWav } from './ir-transfer.js';
import './backup-restore.css';

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const NativeMidi = registerPlugin('MG30Midi');
  const DB_NAME = 'mg30-studio-ir-collection-v1';
  const DB_STORE = 'slots';
  const IR_ASSIGNMENTS_KEY = 'mg30-ir-collection-preset-map';
  const DRAFTS_KEY = 'mg30-presets';
  const ACTIVE_DRAFT_KEY = 'mg30-draft';
  const SLOT_BACKUP_PREFIX = 'mg30-preset-slot-backup-v1-';
  const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;
  const CHUNK_BYTES = 64 * 1024;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });

  function jsonBytes(value) {
    return encoder.encode(JSON.stringify(value, null, 2));
  }
  function parseJsonBytes(bytes, label) {
    try { return JSON.parse(decoder.decode(bytes)); }
    catch { throw new Error(label + ' is not valid JSON.'); }
  }
  function fromBase64(value) {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
    }
    return btoa(binary);
  }
  function safeSegment(value) {
    const raw = String(value || '');
    if (raw.includes('/') || raw.includes('\\\\') || raw === '.' || raw === '..') {
      throw new Error('A stored filename is not safe for backup.');
    }
    const name = raw.replace(/[^A-Za-z0-9._ ()-]/g, '_').trim();
    if (!name || name.length > 180) throw new Error('A stored filename is not safe for backup.');
    return name;
  }
  function parseStoredJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }
  function readLocalDrafts() {
    const presets = parseStoredJson(DRAFTS_KEY, []);
    const activeDraft = parseStoredJson(ACTIVE_DRAFT_KEY, null);
    if (!Array.isArray(presets)) throw new Error('The local preset draft collection is invalid. Fix it before making a full backup.');
    const slotBackups = {};
    for (let slot = 0; slot < 128; slot++) {
      const key = SLOT_BACKUP_PREFIX + slot;
      const value = parseStoredJson(key, null);
      if (Array.isArray(value) && value.length) slotBackups[String(slot)] = value.slice(0, 3);
    }
    return { schemaVersion: 1, presets, activeDraft, slotBackups };
  }
  function readSettings() {
    const values = {};
    for (const key of BACKUP_SAFE_SETTINGS_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) values[key] = value;
    }
    return sanitizeBackupSettings(values);
  }
  function readIRAssignments() {
    const value = parseStoredJson(IR_ASSIGNMENTS_KEY, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function openIRDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB is not available on this device.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'slot' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open IR Collection storage.'));
    });
  }
  async function readIRCollection() {
    const db = await openIRDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(DB_STORE, 'readonly');
        const request = transaction.objectStore(DB_STORE).getAll();
        request.onsuccess = () => resolve((request.result || []).sort((a, b) => Number(a.slot) - Number(b.slot)));
        request.onerror = () => reject(request.error || new Error('Unable to read IR Collection.'));
      });
    } finally { db.close(); }
  }
  async function writeIRCollection(records) {
    if (!records.length) return;
    const db = await openIRDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(DB_STORE, 'readwrite');
        const store = transaction.objectStore(DB_STORE);
        for (const record of records) store.put(record);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error || new Error('Failed to write IR Collection records.'));
        transaction.onabort = () => reject(transaction.error || new Error('IR Collection restore was rolled back.'));
      });
    } finally { db.close(); }
  }

  async function readNamFiles(onProgress = () => {}) {
    if (!Capacitor.isNativePlatform()) return [];
    const result = await NativeMidi.listModels();
    const models = Array.isArray(result?.files) ? result.files : [];
    const candidates = models.filter(model => /\.(nam|namb)$/i.test(String(model.fileName || '')));
    const files = [];
    emitProgress(onProgress, { completed: 0, total: candidates.length, fileName: '' });
    for (const model of candidates) {
      const fileName = safeSegment(model.fileName);
      const record = await NativeMidi.readModel({ fileName });
      const bytes = fromBase64(record.base64);
      if (!bytes.length || bytes.length > 20 * 1024 * 1024 || bytes.length !== Number(record.bytes)) {
        throw new Error('NAM Library readback size mismatch for ' + fileName + '.');
      }
      files.push({ fileName, bytes });
      emitProgress(onProgress, { completed: files.length, total: candidates.length, fileName });
    }
    return files;
  }

  async function buildFullBackup(onProgress = () => {}) {
    if (!Capacitor.isNativePlatform()) throw new Error('Full Backup is supported in the Android APK so it can read the persistent NAM Library.');
    if (!window.MG30PresetExportBridge?.isConnected?.()) {
      throw new Error('Connect the original NUX MG-30 via USB OTG before creating a full backup. The device preset bank must be read through the existing Export All Presets workflow.');
    }
    const presetExporter = window.MG30PresetExportAll;
    if (typeof presetExporter !== 'function') throw new Error('The existing Export All Presets module is not ready. Reopen Preset Manager and try again.');

    setStatus('Reading the 128-preset MG-30 bank with the existing read-only Export All protocol…');
    emitProgress(onProgress, { title: 'Full Backup', step: 'Reading MG-30 preset bank', detail: 'Preparing the read-only 128-preset transfer…', percent: 0, indeterminate: true });
    const presetResult = await presetExporter({
      returnBytes: true,
      confirm: false,
      onProgress: event => {
        const completed = Math.max(0, Math.min(128, Number(event?.completed) || 0));
        const percent = Math.round(completed / 128 * 52);
        emitProgress(onProgress, {
          title: 'Full Backup',
          step: 'Reading MG-30 preset bank',
          detail: (event?.label ? event.label + ' · ' : '') + completed + '/128 presets',
          percent
        });
      }
    });
    if (presetResult?.exported !== true || !(presetResult.bytes instanceof Uint8Array)) {
      throw new Error('Export All Presets did not return a complete device backup.');
    }
    const parsedBank = parseMG30AllPresetPatch(presetResult.bytes);
    if (parsedBank.records.length !== 128 || parsedBank.byteLength !== 0x135700) {
      throw new Error('The exported device preset bank failed its 128-record format check.');
    }

    setStatus('Reading NAM Library files…');
    emitProgress(onProgress, { title: 'Full Backup', step: 'Reading NAM Library', detail: 'Listing stored NAM files…', percent: 52, indeterminate: true });
    const namFiles = await readNamFiles(progress => {
      const total = Number(progress.total) || 0, completed = Number(progress.completed) || 0;
      const percent = total ? 52 + Math.round(completed / total * 10) : 62;
      emitProgress(onProgress, {
        title: 'Full Backup',
        step: 'Reading NAM Library',
        detail: total ? completed + '/' + total + ' files' + (progress.fileName ? ' · ' + progress.fileName : '') : 'No NAM files found',
        percent
      });
    });
    const entries = [];
    const namDescriptors = [];
    for (const file of namFiles) {
      const path = 'nam/' + file.fileName;
      entries.push({ path, data: file.bytes });
      namDescriptors.push({ fileName: file.fileName, path, bytes: file.bytes.length });
    }

    setStatus('Reading local IR Collection WAV files…');
    emitProgress(onProgress, { title: 'Full Backup', step: 'Reading IR Collection', detail: 'Opening local WAV collection…', percent: 62, indeterminate: true });
    const irRecords = await readIRCollection();
    const irSlots = [];
    for (let irIndex = 0; irIndex < irRecords.length; irIndex++) {
      const record = irRecords[irIndex];
      if (!(record.blob instanceof Blob)) {
        throw new Error('IR Collection slot ' + record.slot + ' does not contain its original local WAV file. Backup stopped to avoid silently omitting it.');
      }
      const bytes = new Uint8Array(await record.blob.arrayBuffer());
      readMG30IRWav(bytes);
      const slot = Number(record.slot);
      if (!Number.isInteger(slot) || slot < 1 || slot > 24) throw new Error('An IR Collection record has an invalid slot number.');
      const path = 'ir/slot-' + String(slot).padStart(2, '0') + '.wav';
      entries.push({ path, data: bytes });
      irSlots.push({
        slot,
        path,
        name: String(record.name || ''),
        fileName: safeSegment(record.fileName || ('slot-' + slot + '.wav')),
        updatedAt: String(record.updatedAt || ''),
        source: String(record.source || 'MG30 Studio'),
        bytes: bytes.length
      });
      const completed = irIndex + 1;
      const percent = irRecords.length ? 62 + Math.round(completed / irRecords.length * 13) : 75;
      emitProgress(onProgress, {
        title: 'Full Backup',
        step: 'Reading IR Collection',
        detail: completed + '/' + irRecords.length + ' WAV files · slot ' + slot,
        percent
      });
    }
    const irDescriptor = {
      schemaVersion: 1,
      slots: irSlots,
      presetAssignments: readIRAssignments()
    };
    entries.push({ path: 'ir/collection.json', data: jsonBytes(irDescriptor) });

    setStatus('Collecting local preset drafts and safe app settings…');
    emitProgress(onProgress, { title: 'Full Backup', step: 'Collecting app data', detail: 'Reading local preset drafts and safe settings…', percent: 78, indeterminate: true });
    const drafts = readLocalDrafts();
    entries.push({ path: 'presets/local-drafts.json', data: jsonBytes(drafts) });
    const settings = readSettings();
    entries.push({ path: 'settings/app-settings.json', data: jsonBytes(settings) });
    emitProgress(onProgress, { title: 'Full Backup', step: 'Collecting app data', detail: drafts.presets.length + ' drafts · ' + Object.keys(settings).length + ' safe settings', percent: 82 });
    entries.push({ path: 'presets/MG30_All_Preset.mg30patch', data: presetResult.bytes });

    const manifest = {
      format: 'mg30-studio-full-backup',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appId: BACKUP_APP_ID,
      createdAt: new Date().toISOString(),
      device: { model: 'NUX MG-30 Gen 2', firmwareTarget: '6.0.x', mkII: false },
      export: {
        presetBank: { presetCount: 128, resourcePresetCount: parsedBank.resourcePrograms.length, bytes: presetResult.bytes.length },
        presetExportCacheHits: Number(presetResult.cacheHits) || 0,
        presetExportLiveReadbacks: Number(presetResult.liveReadbacks) || 0
      },
      sections: {
        presetBank: { path: 'presets/MG30_All_Preset.mg30patch', presetCount: 128, resourcePrograms: parsedBank.resourcePrograms, bytes: presetResult.bytes.length },
        presetDrafts: { path: 'presets/local-drafts.json', count: drafts.presets.length, hasActiveDraft: Boolean(drafts.activeDraft), slotBackupCount: Object.keys(drafts.slotBackups).length },
        nam: { count: namDescriptors.length, files: namDescriptors },
        ir: { path: 'ir/collection.json', count: irSlots.length, slots: irSlots },
        settings: { path: 'settings/app-settings.json', count: Object.keys(settings).length }
      }
    };
    entries.push({ path: 'manifest.json', data: jsonBytes(manifest) });
    entries.push({
      path: 'README.txt',
      data: encoder.encode(
        'MG30 Studio Full Backup\n' +
        'Target: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII).\n' +
        'The Preset Bank contains the 128-slot .mg30patch export read from the connected pedal.\n' +
        'Restoring Preset Bank overwrites all 128 hardware slots and the embedded User IR resources present in the patch.\n' +
        'NAM Library files and IR Collection WAV files are restored to this app only; they are not automatically sent to the pedal.\n' +
        'API keys and Tone3000 authentication tokens are intentionally excluded.\n'
      )
    });

    emitProgress(onProgress, { title: 'Full Backup', step: 'Building verified ZIP archive', detail: 'Packaging ' + entries.length + ' files…', percent: 85, indeterminate: true });
    await new Promise(resolve => requestAnimationFrame(() => resolve()));
    const archive = encodeStoredZip(entries, { maxBytes: MAX_ARCHIVE_BYTES });
    if (archive.length <= 22 || archive.length > MAX_ARCHIVE_BYTES + 2 * 1024 * 1024) {
      throw new Error('The completed ZIP failed its size check.');
    }
    emitProgress(onProgress, { title: 'Full Backup', step: 'ZIP archive ready', detail: archive.length.toLocaleString('en-US') + ' bytes · CRC32 entries prepared', percent: 88 });
    return { archive, manifest };
  }

  async function saveBackupArchive(bytes, onProgress = () => {}) {
    let transferId = '';
    try {
      const started = await NativeMidi.beginBackupExport({ expectedBytes: bytes.length });
      transferId = String(started?.transferId || '');
      if (!transferId) throw new Error('Android did not open a backup export session.');
      for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
        const chunk = bytes.subarray(offset, Math.min(offset + CHUNK_BYTES, bytes.length));
        await NativeMidi.writeBackupExportChunk({
          transferId,
          offset,
          base64: toBase64(chunk)
        });
        const written = Math.min(offset + chunk.length, bytes.length);
        setStatus('Saving backup file… ' + written.toLocaleString('en-US') +
          '/' + bytes.length.toLocaleString('en-US') + ' bytes.');
        emitProgress(onProgress, {
          title: 'Full Backup',
          step: 'Saving ZIP to Android',
          detail: written.toLocaleString('en-US') + '/' + bytes.length.toLocaleString('en-US') + ' bytes',
          percent: 88 + Math.round(written / bytes.length * 12)
        });
      }
      const saved = await NativeMidi.finishBackupExport({
        transferId,
        fileName: 'MG30_Studio_Full_Backup.zip'
      });
      transferId = '';
      if (saved?.cancelled) return { cancelled: true };
      if (saved?.saved !== true || Number(saved.bytes) !== bytes.length) {
        throw new Error('Android did not verify the completed backup ZIP.');
      }
      return saved;
    } catch (error) {
      if (transferId) {
        try { await NativeMidi.abortBackupExport({ transferId }); } catch {}
      }
      throw error;
    }
  }

  async function validateArchiveFile(file, onProgress = () => {}) {
    if (!file || !file.size || file.size > MAX_ARCHIVE_BYTES + 2 * 1024 * 1024) {
      throw new Error('Choose a non-empty backup ZIP no larger than 200 MB.');
    }
    emitProgress(onProgress, { title: 'Selective Restore', step: 'Inspecting backup ZIP', detail: 'Reading ' + file.name + '…', percent: null, indeterminate: true });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const files = decodeStoredZip(bytes, { maxBytes: MAX_ARCHIVE_BYTES });
    const manifestBytes = files.get('manifest.json');
    if (!manifestBytes) throw new Error('Backup manifest.json is missing.');
    const manifest = validateBackupManifest(parseJsonBytes(manifestBytes, 'Backup manifest'));
    const available = {};

    const presetBank = manifest.sections.presetBank;
    if (presetBank) {
      const patch = files.get(presetBank.path);
      if (!patch || patch.length !== Number(presetBank.bytes)) throw new Error('Device preset bank file is missing or has the wrong size.');
      const parsed = parseMG30AllPresetPatch(patch);
      if (parsed.records.length !== 128 || parsed.byteLength !== 0x135700) throw new Error('Device preset bank is not a complete 128-preset Gen2 bank.');
      available.presetBank = { patch, parsed, count: parsed.records.length };
    }

    const draftsDescriptor = manifest.sections.presetDrafts;
    if (draftsDescriptor) {
      const data = files.get(draftsDescriptor.path);
      if (!data) throw new Error('Local preset drafts are missing from the archive.');
      const drafts = parseJsonBytes(data, 'Local preset drafts');
      if (drafts?.schemaVersion !== 1 || !Array.isArray(drafts.presets) ||
          (drafts.activeDraft !== null && typeof drafts.activeDraft !== 'object') ||
          !drafts.slotBackups || typeof drafts.slotBackups !== 'object') {
        throw new Error('Local preset draft data has an unsupported structure.');
      }
      available.presetDrafts = { drafts, count: drafts.presets.length };
    }

    const namDescriptor = manifest.sections.nam;
    if (namDescriptor) {
      if (!Array.isArray(namDescriptor.files) || namDescriptor.files.length > 100) throw new Error('NAM Library manifest is invalid.');
      const namFiles = [];
      const names = new Set();
      for (const item of namDescriptor.files) {
        const fileName = safeSegment(item.fileName);
        if (!/\.(nam|namb)$/i.test(fileName) || names.has(fileName.toLowerCase())) throw new Error('Backup contains an unsupported or duplicate NAM filename.');
        names.add(fileName.toLowerCase());
        const data = files.get(item.path);
        if (!data || data.length !== Number(item.bytes) || !data.length || data.length > 20 * 1024 * 1024) {
          throw new Error('NAM backup file is missing or has an invalid size: ' + fileName);
        }
        extractMG30A2LiteWeights(data);
        namFiles.push({ fileName, bytes: data });
      }
      available.nam = { files: namFiles, count: namFiles.length };
    }

    const irDescriptor = manifest.sections.ir;
    if (irDescriptor) {
      const descriptorBytes = files.get(irDescriptor.path);
      if (!descriptorBytes) throw new Error('IR Collection metadata is missing.');
      const irMeta = parseJsonBytes(descriptorBytes, 'IR Collection metadata');
      if (irMeta?.schemaVersion !== 1 || !Array.isArray(irMeta.slots) || irMeta.slots.length > 24) {
        throw new Error('IR Collection manifest is invalid.');
      }
      const seenSlots = new Set();
      const irRecords = [];
      for (const item of irMeta.slots) {
        const slot = Number(item.slot);
        if (!Number.isInteger(slot) || slot < 1 || slot > 24 || seenSlots.has(slot)) throw new Error('Backup has an invalid or duplicate IR slot.');
        seenSlots.add(slot);
        const data = files.get(item.path);
        if (!data || data.length !== Number(item.bytes) || data.length > 32 * 1024 * 1024) throw new Error('IR WAV is missing or has an invalid size for slot ' + slot + '.');
        readMG30IRWav(data);
        irRecords.push({ ...item, slot, bytes: data });
      }
      available.ir = {
        records: irRecords,
        presetAssignments: irMeta.presetAssignments && typeof irMeta.presetAssignments === 'object' ? irMeta.presetAssignments : {},
        count: irRecords.length
      };
    }

    const settingsDescriptor = manifest.sections.settings;
    if (settingsDescriptor) {
      const data = files.get(settingsDescriptor.path);
      if (!data) throw new Error('App settings are missing.');
      const values = sanitizeBackupSettings(parseJsonBytes(data, 'App settings'));
      available.settings = { values, count: Object.keys(values).length };
    }
    emitProgress(onProgress, { title: 'Selective Restore', step: 'Backup validation complete', detail: files.size + ' files · CRC32 verified', percent: 100 });
    return { fileName: file.name, manifest, available, archiveBytes: bytes.length };
  }

  function setStatus(message, kind = '') {
    const node = $('backupRestoreStatus');
    if (!node) return;
    node.textContent = String(message || '');
    node.classList.remove('ok', 'warn');
    if (kind) node.classList.add(kind);
  }

  function setOperationProgress(progress = {}) {
    const overlay = $('backupProgressOverlay');
    const title = $('backupProgressTitle');
    const step = $('backupProgressStep');
    const detail = $('backupProgressDetail');
    const bar = $('backupProgressBar');
    const fill = $('backupProgressFill');
    const percentText = $('backupProgressPercent');
    if (!overlay || !bar || !fill) return;
    if (title) title.textContent = String(progress.title || 'Working');
    if (step) step.textContent = String(progress.step || 'Please keep the app open.');
    if (detail) detail.textContent = String(progress.detail || '');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    const hasPercent = Number.isFinite(progress.percent) && progress.indeterminate !== true;
    bar.classList.toggle('is-indeterminate', !hasPercent);
    if (hasPercent) {
      const value = Math.max(0, Math.min(100, Math.round(progress.percent)));
      fill.style.width = value + '%';
      bar.setAttribute('aria-valuenow', String(value));
      if (percentText) percentText.textContent = value + '%';
    } else {
      fill.style.width = '38%';
      bar.removeAttribute('aria-valuenow');
      if (percentText) percentText.textContent = 'Working…';
    }
  }

  function hideOperationProgress() {
    const overlay = $('backupProgressOverlay');
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }

  function emitProgress(onProgress, progress) {
    if (typeof onProgress !== 'function') return;
    try { onProgress(progress); } catch { /* Progress UI must never interrupt a backup transaction. */ }
  }

  function sectionLabel(key, descriptor) {
    if (key === 'presetBank') return ['MG-30 Preset Bank', '128 hardware slots · restores through the existing Import All transaction'];
    if (key === 'presetDrafts') return ['Local Preset Drafts', (descriptor.count || 0) + ' saved drafts · active editor draft and slot snapshots'];
    if (key === 'nam') return ['NAM Library', (descriptor.count || 0) + ' local NAM files · copied into this app only'];
    if (key === 'ir') return ['IR Collection', (descriptor.count || 0) + ' local WAV slots · restored to app storage only'];
    return ['App Settings', (descriptor.count || 0) + ' safe preferences · credentials excluded'];
  }

  function renderRestorePreview(state) {
    const preview = $('backupRestorePreview');
    const selection = $('backupRestoreSelections');
    const restoreButton = $('backupRestoreStart');
    if (!preview || !selection || !restoreButton) return;
    selection.replaceChildren();
    const sections = Object.entries(state.available);
    for (const [key, descriptor] of sections) {
      const [label, description] = sectionLabel(key, descriptor);
      const row = document.createElement('label');
      row.className = 'backup-restore-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = false;
      checkbox.dataset.restoreSection = key;
      const copy = document.createElement('span');
      copy.className = 'backup-restore-option-copy';
      const strong = document.createElement('strong');
      strong.textContent = label;
      const small = document.createElement('small');
      small.textContent = description;
      copy.append(strong, small);
      row.append(checkbox, copy);
      selection.appendChild(row);
    }
    const counts = sections.map(([key, descriptor]) => sectionLabel(key, descriptor)[1]);
    preview.hidden = false;
    preview.textContent = state.fileName + ' · ' + state.manifest.createdAt +
      '\n' + sections.length + ' restorable sections: ' + counts.join(' · ');
    restoreButton.disabled = true;
    restoreButton.textContent = 'Restore Selected';
  }

  function selectedRestoreSections() {
    return Array.from(document.querySelectorAll('[data-restore-section]:checked'))
      .map(node => node.dataset.restoreSection);
  }

  function readExistingPresetSlotBackups() {
    const output = {};
    for (let slot = 0; slot < 128; slot++) {
      const key = SLOT_BACKUP_PREFIX + slot;
      const value = parseStoredJson(key, []);
      if (Array.isArray(value) && value.length) output[String(slot)] = value;
    }
    return output;
  }

  function applyLocalStorageTransaction(changes) {
    const entries = Array.from(changes.entries());
    const previous = new Map();
    try {
      for (const [key, value] of entries) {
        previous.set(key, localStorage.getItem(key));
        localStorage.setItem(key, value);
      }
    } catch (error) {
      for (const [key] of entries.slice().reverse()) {
        if (!previous.has(key)) continue;
        const oldValue = previous.get(key);
        try {
          if (oldValue === null) localStorage.removeItem(key);
          else localStorage.setItem(key, oldValue);
        } catch {}
      }
      throw new Error('Local restore failed; previous local values were rolled back. ' +
        (error?.message || error));
    }
  }

  function restoreLocalDrafts(incoming, conflict) {
    const current = parseStoredJson(DRAFTS_KEY, []);
    if (!Array.isArray(current)) throw new Error('Current local preset drafts are invalid; no drafts were changed.');
    const merged = mergePresetDrafts(current, incoming.presets, conflict);
    const changes = new Map();
    changes.set(DRAFTS_KEY, JSON.stringify(merged));

    const active = parseStoredJson(ACTIVE_DRAFT_KEY, null);
    if (incoming.activeDraft && typeof incoming.activeDraft === 'object') {
      if (conflict === 'replace' || !active) {
        changes.set(ACTIVE_DRAFT_KEY, JSON.stringify(incoming.activeDraft));
      } else if (conflict === 'keep-both') {
        const restored = { ...incoming.activeDraft, name: String(incoming.activeDraft.name || 'Draft') + ' (Restored Draft)' };
        merged.push({ id: 'restored-active-' + Date.now(), date: new Date().toISOString(), ...restored });
        changes.set(DRAFTS_KEY, JSON.stringify(merged));
      }
    }

    const priorBackups = readExistingPresetSlotBackups();
    for (const [slotText, incomingHistory] of Object.entries(incoming.slotBackups || {})) {
      const slot = Number(slotText);
      if (!Number.isInteger(slot) || slot < 0 || slot > 127 || !Array.isArray(incomingHistory)) continue;
      const key = SLOT_BACKUP_PREFIX + slot;
      if (conflict === 'replace') {
        changes.set(key, JSON.stringify(incomingHistory.slice(0, 3)));
      } else {
        const currentHistory = priorBackups[slotText] || [];
        const byFingerprint = new Set(currentHistory.map(item => item?.createdAt + '|' + item?.operation));
        const combined = [...currentHistory];
        for (const item of incomingHistory) {
          const fingerprint = item?.createdAt + '|' + item?.operation;
          if (!byFingerprint.has(fingerprint)) { combined.push(item); byFingerprint.add(fingerprint); }
        }
        changes.set(key, JSON.stringify(combined.slice(0, 3)));
      }
    }
    applyLocalStorageTransaction(changes);
    return { drafts: incoming.presets.length, totalDrafts: merged.length };
  }

  async function restoreNamFiles(files, conflict, onProgress = () => {}) {
    if (!Capacitor.isNativePlatform()) throw new Error('NAM Library restore requires the Android APK.');
    const current = await NativeMidi.listModels();
    const existing = (current?.files || []).map(item => item.fileName);
    const actions = planNamRestore(files, existing, conflict);
    const journal = [];
    const results = [];
    try {
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (action.action === 'skip') {
          results.push({ ...action });
          emitProgress(onProgress, { completed: i + 1, total: actions.length, fileName: action.fileName, action: 'kept' });
          continue;
        }
        const source = files.find(item => item.fileName === action.fileName);
        const base64 = toBase64(source.bytes);
        if (action.action === 'replace') {
          // Keep the exact prior bytes so a later file failure can roll back this replacement.
          const prior = await NativeMidi.readModel({ fileName: action.fileName });
          journal.push({ action: 'restore', fileName: action.fileName, base64: prior.base64 });
          await NativeMidi.restoreModel({ fileName: action.fileName, base64 });
          results.push({ fileName: action.fileName, action: 'replaced' });
        } else {
          const destination = action.destination || action.fileName;
          const saved = await NativeMidi.saveModel({ fileName: destination, base64 });
          const savedName = saved.fileName || destination;
          journal.push({ action: 'delete', fileName: savedName });
          results.push({ fileName: savedName, action: action.action });
        }
        setStatus('Restoring NAM Library… ' + (i + 1) + '/' + actions.length);
        emitProgress(onProgress, { completed: i + 1, total: actions.length, fileName: action.fileName, action: action.action });
      }
      window.dispatchEvent(new Event('mg30-nam-library-updated'));
      return results;
    } catch (error) {
      const rollbackErrors = [];
      for (const item of journal.reverse()) {
        try {
          if (item.action === 'restore') {
            await NativeMidi.restoreModel({ fileName: item.fileName, base64: item.base64 });
          } else {
            await NativeMidi.deleteModel({ fileName: item.fileName });
          }
        } catch (rollbackError) {
          rollbackErrors.push(item.fileName + ': ' + (rollbackError?.message || rollbackError));
        }
      }
      window.dispatchEvent(new Event('mg30-nam-library-updated'));
      throw new Error('NAM restore failed: ' + (error?.message || error) +
        (rollbackErrors.length
          ? '. Rollback could not finish for: ' + rollbackErrors.join('; ')
          : '. All earlier NAM Library changes in this batch were rolled back.'));
    }
  }

  async function restoreIRCollection(section, conflict, onProgress = () => {}) {
    const current = await readIRCollection();
    const existingSlots = current.map(item => Number(item.slot));
    const plan = planIRRestore(section.records, existingSlots, conflict);
    const writes = [];
    const slotMap = new Map();
    const report = [];
    for (let planIndex = 0; planIndex < plan.length; planIndex++) {
      const action = plan[planIndex];
      if (action.action === 'skip') {
        if (conflict === 'keep-existing') slotMap.set(action.sourceSlot, action.sourceSlot);
        report.push(action);
        emitProgress(onProgress, { completed: planIndex + 1, total: plan.length, slot: action.sourceSlot, action: 'kept' });
        continue;
      }
      const source = section.records.find(item => Number(item.slot) === action.sourceSlot);
      const destinationSlot = action.destinationSlot;
      const record = {
        slot: destinationSlot,
        name: String(source.name || ('Collection ' + destinationSlot)),
        fileName: String(source.fileName || ('slot-' + destinationSlot + '.wav')),
        blob: new Blob([source.bytes], { type: 'audio/wav' }),
        updatedAt: source.updatedAt || new Date().toISOString(),
        source: source.source || 'MG30 Studio Backup'
      };
      writes.push(record);
      slotMap.set(action.sourceSlot, destinationSlot);
      report.push({ ...action });
      emitProgress(onProgress, { completed: planIndex + 1, total: plan.length, slot: destinationSlot, action: action.action });
    }
    const assignments = readIRAssignments();
    for (const [program, sourceSlotValue] of Object.entries(section.presetAssignments || {})) {
      const programNumber = Number(program);
      const sourceSlot = Number(sourceSlotValue);
      const restoredSlot = slotMap.has(sourceSlot) ? slotMap.get(sourceSlot) : null;
      if (Number.isInteger(programNumber) && programNumber >= 0 && programNumber < 128 && restoredSlot) {
        assignments[String(programNumber)] = restoredSlot;
      }
    }
    const previousAssignments = localStorage.getItem(IR_ASSIGNMENTS_KEY);
    localStorage.setItem(IR_ASSIGNMENTS_KEY, JSON.stringify(assignments));
    try {
      emitProgress(onProgress, { completed: plan.length, total: plan.length, fraction: 0.9, stage: 'Writing collection records' });
      await writeIRCollection(writes);
      emitProgress(onProgress, { completed: plan.length, total: plan.length, fraction: 1, stage: 'Collection records committed' });
    } catch (error) {
      try {
        if (previousAssignments === null) localStorage.removeItem(IR_ASSIGNMENTS_KEY);
        else localStorage.setItem(IR_ASSIGNMENTS_KEY, previousAssignments);
      } catch {}
      throw error;
    }
    return report;
  }

  function restoreSafeSettings(values, conflict) {
    const safe = sanitizeBackupSettings(values);
    const changes = new Map();
    let skipped = 0;
    for (const [key, value] of Object.entries(safe)) {
      if (conflict !== 'replace' && localStorage.getItem(key) !== null) { skipped++; continue; }
      changes.set(key, value);
    }
    applyLocalStorageTransaction(changes);
    return { restored: changes.size, skipped };
  }

  async function restoreSelected(state, onProgress = () => {}) {
    const selected = selectedRestoreSections();
    if (!selected.length) throw new Error('Select at least one section to restore.');
    const conflict = $('backupRestoreConflict')?.value || 'keep-both';
    const wantsBank = selected.includes('presetBank');
    if (wantsBank && !window.MG30PresetImportBridge?.isConnected?.()) {
      throw new Error('Connect the original MG-30 via USB OTG before restoring its 128-preset bank.');
    }
    if (selected.includes('nam') && !Capacitor.isNativePlatform()) {
      throw new Error('NAM Library restore requires the Android APK.');
    }
    if (selected.includes('ir') && !('indexedDB' in window)) {
      throw new Error('IR Collection restore requires IndexedDB support.');
    }
    let importPlan = null;
    if (wantsBank) importPlan = buildMG30AllPresetImportPlan(state.available.presetBank.parsed.records);

    const summary = selected.map(key => sectionLabel(key, state.manifest.sections[key])[0]);
    const bankWarning = wantsBank
      ? '\n\nWARNING: MG-30 Preset Bank restore overwrites all 128 hardware slots. The .mg30patch also contains embedded User IR resources for presets that have them. Keep USB OTG connected until readback verification is complete.'
      : '';
    const replaceWarning = conflict === 'replace'
      ? '\n\nReplace mode overwrites same-name NAM files, occupied IR Collection slots, local drafts, and matching safe settings.'
      : conflict === 'keep-existing' ? '\n\nKeep Existing skips conflicting NAM files and IR slots, and leaves current app settings/drafts in place.' :
        '\n\nKeep Both creates a second NAM filename and places conflicting IR slots in the next free Collection slot.';
    if (!window.confirm('RESTORE SELECTED BACKUP DATA?\n\n' + summary.join('\n') + bankWarning + replaceWarning +
      '\n\nReview the preview before continuing. Selected local collections will be restored to this app; NAM and IR files are not sent to the pedal.')) return false;

    let stageIndex = 0;
    const totalStages = Math.max(1, selected.length);
    const reportStageFraction = (label, fraction, detail = '') => {
      const local = Math.max(0, Math.min(1, Number(fraction) || 0));
      const percent = Math.round(((stageIndex + local) / totalStages) * 100);
      emitProgress(onProgress, { title: 'Selective Restore', step: label, detail, percent });
    };
    const reportStage = (label, completed, total, detail = '') => {
      const local = total > 0 ? Math.max(0, Math.min(1, completed / total)) : 1;
      reportStageFraction(label, local, detail);
    };
    const outcomes = [];
    if (selected.includes('nam')) {
      reportStage('Restoring NAM Library', 0, state.available.nam.count, 'Preparing file journal…');
      const result = await restoreNamFiles(state.available.nam.files, conflict, progress => {
        reportStage('Restoring NAM Library', progress.completed, progress.total,
          progress.fileName ? progress.fileName + ' · ' + progress.action : 'Preparing…');
      });
      stageIndex++;
      outcomes.push('NAM Library: ' + result.filter(x => x.action !== 'skip').length + ' restored, ' + result.filter(x => x.action === 'skip').length + ' kept');
    }
    if (selected.includes('ir')) {
      reportStage('Restoring IR Collection', 0, state.available.ir.count, 'Planning destination slots…');
      const result = await restoreIRCollection(state.available.ir, conflict, progress => {
        const fraction = Number.isFinite(progress.fraction)
          ? progress.fraction
          : (progress.total > 0 ? progress.completed / progress.total : 1);
        reportStageFraction('Restoring IR Collection', fraction,
          (progress.slot ? 'IR slot ' + progress.slot : 'Writing collection') + ' · ' + (progress.action || progress.stage || 'planned'));
      });
      stageIndex++;
      outcomes.push('IR Collection: ' + result.filter(x => x.action !== 'skip').length + ' restored, ' + result.filter(x => x.action === 'skip').length + ' kept');
    }
    if (selected.includes('presetDrafts')) {
      reportStage('Restoring local preset drafts', 0, 1, 'Applying draft history…');
      const result = restoreLocalDrafts(state.available.presetDrafts.drafts, conflict);
      reportStage('Restoring local preset drafts', 1, 1, result.drafts + ' drafts from backup');
      stageIndex++;
      outcomes.push('Local drafts: ' + result.drafts + ' from backup, ' + result.totalDrafts + ' total');
    }
    if (selected.includes('settings')) {
      reportStage('Restoring safe app settings', 0, 1, 'Applying whitelisted preferences…');
      const result = restoreSafeSettings(state.available.settings.values, conflict);
      reportStage('Restoring safe app settings', 1, 1, result.restored + ' restored · ' + result.skipped + ' kept');
      stageIndex++;
      outcomes.push('App settings: ' + result.restored + ' restored, ' + result.skipped + ' kept');
    }
    if (wantsBank) {
      reportStage('Restoring 128-preset MG-30 bank', 0, 1, 'Starting verified Import All transaction…');
      setStatus('Restoring the 128-preset MG-30 bank through the existing verified Import All protocol…');
      const result = await window.MG30PresetImportBridge.importAll(importPlan, progress => {
        if (progress.phase === 'Verifying readback') {
          const completed = Math.max(0, Math.min(128, Number(progress.verifiedPrograms) || 0));
          reportStageFraction('Verifying MG-30 preset readback', 0.65 + (completed / 128 * 0.35),
            completed + '/128 presets · ' + progress.verifiedScenes + '/384 scenes');
          setStatus('Verifying MG-30 preset bank… ' + progress.verifiedPrograms + '/128 presets · ' + progress.verifiedScenes + '/384 scenes.');
        } else {
          const completed = Math.max(0, Number(progress.completed) || 0);
          const total = Math.max(1, Number(progress.total) || 1);
          reportStageFraction('Writing MG-30 preset bank', 0.65 * Math.min(1, completed / total),
            completed.toLocaleString('en-US') + '/' + Number(progress.total || 0).toLocaleString('en-US') + ' ACKs · ' + progress.phase);
          setStatus('Writing MG-30 preset bank… ' + progress.completed.toLocaleString('en-US') +
            '/' + progress.total.toLocaleString('en-US') + ' ACKs · ' + progress.phase + '.');
        }
      });
      if (result?.success !== true || result.verifiedPrograms !== 128 || result.verifiedScenes !== 384) {
        throw new Error('Device preset restore did not pass the complete 128-preset/384-scene readback.');
      }
      stageIndex++;
      reportStage('Restore completed', 1, 1, '128 presets / 384 scenes verified');
      outcomes.push('MG-30 bank: 128 presets / 384 scenes written and verified');
    }
    window.dispatchEvent(new Event('mg30-nam-library-updated'));
    setStatus('Restore completed. ' + outcomes.join(' · ') + '.', 'ok');
    return outcomes;
  }

  function init() {
    const page = $('page-backup');
    const createButton = $('fullBackupCreate');
    const fileInput = $('backupRestoreFile');
    const restoreButton = $('backupRestoreStart');
    if (!page || !createButton || !fileInput || !restoreButton || page.dataset.fullBackupReady === '1') return;
    page.dataset.fullBackupReady = '1';
    let archiveState = null;
    const setBusy = busy => {
      createButton.disabled = busy;
      restoreButton.disabled = busy || !archiveState || selectedRestoreSections().length === 0;
      fileInput.disabled = busy;
      page.setAttribute('aria-busy', busy ? 'true' : 'false');
    };

    createButton.addEventListener('click', async () => {
      if (createButton.disabled) return;
      const confirmed = window.confirm(
        'CREATE FULL BACKUP?\n\nMG30 Studio will read all 128 presets from the connected original MG-30, then package the hardware preset bank, local preset drafts, NAM Library, IR Collection WAV files and safe app settings into one ZIP. This reads the device; it does not write to the pedal. API keys and authentication tokens are excluded.'
      );
      if (!confirmed) return;
      setBusy(true);
      setOperationProgress({ title: 'Full Backup', step: 'Starting backup', detail: 'Preparing read-only device export…', percent: 0, indeterminate: true });
      try {
        setStatus('Starting full backup…');
        const result = await buildFullBackup(setOperationProgress);
        setStatus('Preparing ZIP archive…');
        const saved = await saveBackupArchive(result.archive, setOperationProgress);
        if (saved.cancelled) {
          setStatus('Backup save was cancelled. No backup file was created.', 'warn');
          return;
        }
        setStatus('Full Backup saved and verified: ' + saved.fileName + ' · ' +
          Number(saved.bytes).toLocaleString('en-US') + ' bytes. ' +
          '128 device presets · ' + result.manifest.sections.nam.count + ' NAM files · ' +
          result.manifest.sections.ir.count + ' IR WAV files · ' +
          result.manifest.sections.presetDrafts.count + ' local drafts.', 'ok');
      } catch (error) {
        setStatus('Full Backup failed: ' + (error?.message || error), 'warn');
      } finally { hideOperationProgress(); setBusy(false); }
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      setBusy(true);
      setOperationProgress({ title: 'Selective Restore', step: 'Inspecting backup ZIP', detail: 'Loading archive and verifying its contents…', percent: null, indeterminate: true });
      try {
        setStatus('Checking ZIP directory, file sizes and CRC32…');
        archiveState = await validateArchiveFile(file, setOperationProgress);
        renderRestorePreview(archiveState);
        setStatus('Backup validated: ' + archiveState.fileName + '. Choose exactly which sections to restore.', 'ok');
      } catch (error) {
        archiveState = null;
        $('backupRestorePreview').hidden = true;
        $('backupRestoreSelections').replaceChildren();
        restoreButton.disabled = true;
        setStatus('Backup validation failed: ' + (error?.message || error), 'warn');
      } finally { hideOperationProgress(); setBusy(false); }
    });

    restoreButton.addEventListener('click', async () => {
      if (!archiveState || restoreButton.disabled) return;
      setBusy(true);
      try {
        setStatus('Preparing selected restore sections…');
        const result = await restoreSelected(archiveState, setOperationProgress);
        if (result === false) return;
      } catch (error) {
        setStatus('Restore stopped: ' + (error?.message || error) +
          '. Review the affected section before retrying.', 'warn');
      } finally { hideOperationProgress(); setBusy(false); }
    });

    $('backupRestoreSelectAll')?.addEventListener('click', () => {
      document.querySelectorAll('[data-restore-section]').forEach(input => { input.checked = true; });
      restoreButton.disabled = !archiveState;
    });
    $('backupRestoreClearAll')?.addEventListener('click', () => {
      document.querySelectorAll('[data-restore-section]').forEach(input => { input.checked = false; });
      restoreButton.disabled = true;
    });
    $('backupRestoreSelections')?.addEventListener('change', () => {
      restoreButton.disabled = !archiveState || selectedRestoreSections().length === 0;
    });
  }

  function boot() {
    if (init(), $('page-backup')?.dataset.fullBackupReady === '1') return;
    const observer = new MutationObserver(() => {
      if ($('page-backup') && $('fullBackupCreate')) {
        init();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  boot();
})();
