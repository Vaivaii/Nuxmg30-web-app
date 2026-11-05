import {
  buildMG30SinglePresetPatchFromReplies,
  buildMG30AllPresetPatch,
  parseMG30AllPresetPatch,
  fitMG30QuickToneIRName
} from './mg30-preset-format.js';
import { MG30PresetReadFormat } from './mg30-preset-read.js';

window.MG30PresetReadFormat = MG30PresetReadFormat;

const $ = id => document.getElementById(id);
function slotLabel(program) {
  const slot = Math.max(0, Math.min(127, Number(program) || 0));
  return String(Math.floor(slot / 4) + 1).padStart(2, '0') + 'ABCD'[slot % 4];
}
function setStatus(message, kind = '') {
  const node = $('presetExportStatus');
  if (!node) return;
  node.textContent = message;
  node.classList.remove('ok', 'warn');
  if (kind) node.classList.add(kind);
}
function renderDiagnostics(open = false) {
  const details = $('presetExportDiagnosticsDetails');
  const field = $('presetExportDiagnosticsText');
  const trace = window.MG30PresetExportLastDiagnostics;
  if (!details || !field || !trace) return;
  field.value = JSON.stringify(trace, null, 2);
  details.hidden = false;
  if (open) details.open = true;
}
function updateTarget() {
  const bridge = window.MG30PresetExportBridge;
  const program = Number(bridge?.getTargetProgram?.() ?? 0);
  const label = bridge?.getTargetLabel?.() || slotLabel(program);
  const target = $('presetExportTarget');
  const button = $('presetExportStart');
  if (target) target.textContent = 'Sumber: ' + label;
  if (button && !button.disabled) button.textContent = 'Ekspor ' + label + ' sebagai .mg30patch';
}
function downloadPatch(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function bytesToBase64(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index++) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}
async function savePatch(bytes, filename) {
  const nativeBridge = window.NUXNativeMidi;
  if (nativeBridge?.available === true) {
    if (typeof nativeBridge.savePatch !== 'function') {
      throw new Error('Dialog File manager Android belum tersedia. Perbarui aplikasi MG30 Studio ke versi terbaru.');
    }
    return {
      ...(await nativeBridge.savePatch({
        fileName: filename,
        mimeType: 'application/octet-stream',
        base64: bytesToBase64(bytes)
      })),
      native: true
    };
  }
  downloadPatch(bytes, filename);
  return { saved: true, native: false, fileName: filename, bytes: bytes.length };
}
let localAllPresetMemory = null;
let allExportBusy = false;

function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return null;
}

function localAllPresetSource() {
  const source = window.MG30AllPresetMemory || localAllPresetMemory;
  if (!source) return null;
  if (Array.isArray(source.records) && source.records.length === 128) {
    return { records: source.records, sourceName: source.sourceName || 'memori lokal' };
  }
  if (Array.isArray(source) && source.length === 128) {
    return { records: source, sourceName: 'memori lokal' };
  }
  const raw = asBytes(source.bytes ?? source.rawBytes ?? source);
  if (raw) {
    const parsed = parseMG30AllPresetPatch(raw);
    return { records: parsed.records, sourceName: source.sourceName || 'memori lokal' };
  }
  return null;
}

async function cacheLocalAllPresetFile(file) {
  const allButton = $('presetExportAllStart');
  localAllPresetMemory = null;
  if (window.MG30AllPresetMemory?.sourceName) window.MG30AllPresetMemory = null;
  if (allButton) allButton.disabled = true;
  if (!file) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseMG30AllPresetPatch(bytes);
    localAllPresetMemory = {
      sourceName: file.name || 'MG30AllPatch.mg30patch',
      bytes,
      records: parsed.records,
      byteLength: parsed.byteLength
    };
    // Export All reads this local cache only. It does not access the MIDI bridge.
    window.MG30AllPresetMemory = localAllPresetMemory;
    if (allButton) {
      allButton.disabled = false;
      allButton.textContent = 'Export All · 128 Preset';
      allButton.title = 'Ekspor dari file All Preset yang sudah divalidasi dan disimpan di memori lokal aplikasi.';
    }
  } catch (_) {
    // A single-preset file or a non-patch file is not an Export All source.
    localAllPresetMemory = null;
    if (allButton) allButton.disabled = true;
  }
}

/**
 * Build and download the 128-record .mg30patch from local application memory.
 * No MIDI connection, readSingle(), SysEx request, or pedal access is used.
 */
async function exportAllPresets() {
  // Export All is deliberately a local serializer. Do not call the MIDI bridge,
  // readSingle(), readPresetParts(), or any SysEx helper from this function.
  const source = localAllPresetSource();
  if (!source) {
    throw new Error('Data All Preset belum ada di memori lokal. Pilih file 128-preset .mg30patch melalui tombol Import All terlebih dahulu; operasi ini tidak membaca preset dari pedal.');
  }

  const confirmed = window.confirm(
    'EXPORT ALL PRESET\n\n' +
    'Sumber: ' + source.sourceName + '\n' +
    'Isi file: 128 preset (01A–32D), 3 scene per preset.\n' +
    'Nama file: MG30_All_Preset.mg30patch\n' +
    'Ukuran hasil: 1.267.456 byte.\n\n' +
    'File akan dibuat dari data lokal yang sudah dipilih sebelumnya. ' +
    'Operasi ini TIDAK membaca atau mengirim data melalui USB-MIDI/SysEx dan tidak mengubah pedal.\n\n' +
    'Lanjutkan dan pilih lokasi penyimpanan?'
  );
  if (!confirmed) {
    setStatus('Export All dibatalkan. Data lokal dan pedal tidak diubah.', 'warn');
    return { saved: false, cancelled: true };
  }

  if (!Array.isArray(source.records) || source.records.length !== 128) {
    throw new Error('Sumber lokal Export All harus berisi tepat 128 record preset.');
  }
  for (let ordinal = 0; ordinal < 128; ordinal++) {
    const record = source.records[ordinal];
    if (!record || Number(record.recordOrdinal) !== ordinal ||
        !Array.isArray(record.scenes) || record.scenes.length !== 3) {
      throw new Error('Memori lokal tidak lengkap/berurutan pada preset ' + ordinal + '. Export dibatalkan.');
    }
  }

  // buildMG30AllPresetPatch writes one 0x26AE record per slot. Parsed local
  // records retain rawRecord, preserving each original RIFF/WAVE header and
  // opaque padding; newly-created resource records get padded name/header
  // fields from the format serializer.
  const bytes = buildMG30AllPresetPatch(source.records);
  if (!(bytes instanceof Uint8Array) || bytes.length !== 0x135700) {
    throw new Error('Buffer Export All harus tepat 0x135700 byte (128 × 0x26AE).');
  }

  // Validate the completed binary before opening the save dialog.
  const verified = parseMG30AllPresetPatch(bytes);
  if (verified.records.length !== 128 ||
      verified.byteLength !== 0x135700 ||
      verified.resourcePrograms.length !== 27) {
    throw new Error('Validasi hasil serialisasi All Preset gagal (128 record / 27 resource IR).');
  }

  const filename = 'MG30_All_Preset.mg30patch';
  // Close the shared web progress overlay before invoking Android's native
  // Documents picker. preset-library-ui.js watches for this exact hand-off
  // phrase; without it the generic overlay remains above the native picker.
  setStatus('Export All selesai disusun dari memori lokal (' +
    bytes.length.toLocaleString('id-ID') + ' byte). Memilih lokasi penyimpanan di File manager Android…');
  const saved = await savePatch(bytes, filename);
  if (saved?.cancelled) {
    setStatus('Penyimpanan Export All dibatalkan. Tidak ada data yang dikirim ke pedal.', 'warn');
    return { saved: false, cancelled: true, bytes: bytes.length };
  }
  if (!saved?.saved) throw new Error('Penyimpanan file Export All tidak dikonfirmasi.');
  setStatus('Export All berhasil: ' + (saved.fileName || filename) + ' · ' +
    Number(saved.bytes || bytes.length).toLocaleString('id-ID') +
    ' byte · 128 preset · 27 resource IR. Sumber: ' + source.sourceName +
    '. Tidak ada perintah MIDI/SysEx yang dikirim.', 'ok');
  return { saved: true, fileName: saved.fileName || filename, bytes: bytes.length };
}

window.MG30PresetExportAll = exportAllPresets;

function init() {
  const button = $('presetExportStart');
  if (!button || button.dataset.initialized === '1') return;
  button.dataset.initialized = '1';
  let busy = false;
  const bridge = () => window.MG30PresetExportBridge;
  const copyDiagnostics = $('presetExportCopyDiagnostics');
  if (copyDiagnostics && copyDiagnostics.dataset.initialized !== '1') {
    copyDiagnostics.dataset.initialized = '1';
    copyDiagnostics.addEventListener('click', async () => {
      const field = $('presetExportDiagnosticsText');
      if (!field || !field.value) return;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API tidak tersedia.');
        await navigator.clipboard.writeText(field.value);
        copyDiagnostics.textContent = 'Log tersalin';
      } catch (_) {
        field.focus();
        field.select();
        copyDiagnostics.textContent = 'Log dipilih · gunakan Salin';
      }
    });
  }
  button.addEventListener('click', async () => {
    if (busy) return;
    const api = bridge();
    if (!api?.isConnected?.()) {
      setStatus('Hubungkan MG-30 melalui USB-MIDI sebelum export.', 'warn');
      return;
    }
    const program = Number(api.getTargetProgram());
    const label = api.getTargetLabel?.() || slotLabel(program);
    if (!Number.isInteger(program) || program < 0 || program > 127) {
      setStatus('Slot sumber export tidak valid.', 'warn');
      return;
    }
    if (!confirm('Baca preset ' + label + ' dari MG-30 dan simpan sebagai file .mg30patch?\n\nQuickTone-compatible export akan membaca tiga scene, nama resource User IR, 2.048 sampel waveform, dan 600 nilai kurva. Operasi ini hanya membaca; tidak ada data yang ditulis ke pedal.')) {
      setStatus('Export dibatalkan. Tidak ada perintah dikirim.');
      return;
    }
    busy = true;
    button.disabled = true;
    button.textContent = 'Mengekspor ' + label + '…';
    const diagnosticsDetails = $('presetExportDiagnosticsDetails');
    if (diagnosticsDetails) diagnosticsDetails.hidden = true;
    setStatus('Memulai pembacaan preset ' + label + '…');
    try {
      const source = await api.readSingle(progress => {
        const completed = Number(progress?.completed) || 0;
        const total = Number(progress?.total) || 0;
        const phase = progress?.phase || 'Membaca perangkat';
        const detail = progress?.detail ? ' · ' + progress.detail : '';
        setStatus(phase + (total ? ' · ' + completed + '/' + total : '') + detail);
      });
      // QuickTone-compatible fixed field: preserve the first 16 ASCII bytes.
      // This changes only the name stored in the file, never the device's IR metadata.
      const exportResourceName = fitMG30QuickToneIRName(source.resourceName);
      const exportSource = { ...source, resourceName: exportResourceName };
      const bytes = buildMG30SinglePresetPatchFromReplies(exportSource);
      if (!(bytes instanceof Uint8Array) || bytes.length !== 0x26AE) {
        throw new Error('Ukuran record hasil export tidak cocok dengan format Gen2 single-preset.');
      }
      const filename = 'MG30_' + label + '.mg30patch';
      setStatus('Pembacaan selesai. Memilih lokasi penyimpanan di File manager Android…');
      const saved = await savePatch(bytes, filename);
      if (saved?.cancelled) {
        setStatus('Penyimpanan dibatalkan. File ' + filename + ' belum disimpan.', 'warn');
        return;
      }
      if (!saved?.saved) throw new Error('Android tidak mengonfirmasi penyimpanan file.');
      const savedName = saved.fileName || filename;
      const locationText = saved.native
        ? 'Lokasi: folder yang kamu pilih di File manager Android.'
        : 'Unduhan browser dimulai.';
      const resourceNameStatus = exportResourceName === source.resourceName
        ? ' Nama IR: "' + source.resourceName + '".'
        : ' Nama IR di file mengikuti batas QuickTone: "' + exportResourceName +
          '" (32 byte pertama dari "' + source.resourceName + '"). Nama IR di pedal tidak diubah.';
      setStatus('File tersimpan: ' + savedName + ' · ' +
        Number(saved.bytes || bytes.length).toLocaleString('id-ID') + ' byte. ' + locationText +
        ' File berisi 3 scene, 2.048 sampel waveform, dan 600 nilai kurva.' + resourceNameStatus, 'ok');
      const diagnosticsDetails = $('presetExportDiagnosticsDetails');
      if (diagnosticsDetails) diagnosticsDetails.hidden = true;
    } catch (error) {
      renderDiagnostics(true);
      setStatus('Export gagal: ' + (error?.message || String(error)) +
        ' Tidak ada data yang ditulis ke MG-30.', 'warn');
    } finally {
      busy = false;
      button.disabled = false;
      updateTarget();
    }
  });
  const allButton = $('presetExportAllStart');
  if (allButton && allButton.dataset.initialized !== '1') {
    allButton.dataset.initialized = '1';
    allButton.disabled = !localAllPresetSource();
    allButton.addEventListener('click', async () => {
      if (allExportBusy) return;
      allExportBusy = true;
      // Export All is a local file operation. Explicitly suppress the shared
      // USB-transfer feedback modal for the complete confirm/build/save flow.
      window.MG30LocalPresetExportActive = true;
      allButton.disabled = true;
      const priorLabel = allButton.textContent;
      allButton.textContent = 'Menyusun 128 preset…';
      try {
        await exportAllPresets();
      } catch (error) {
        setStatus('Export All gagal: ' + (error?.message || String(error)) +
          ' Tidak ada perintah MIDI/SysEx yang dikirim.', 'warn');
      } finally {
        allExportBusy = false;
        allButton.disabled = !localAllPresetSource();
        allButton.textContent = localAllPresetSource() ? 'Export All · 128 Preset' : priorLabel;
        // Let the status observer process the final state while the local-export
        // suppression flag is still set; no device-transfer dialog is needed.
        window.setTimeout(() => { window.MG30LocalPresetExportActive = false; }, 0);
      }
    });
  }

  const allPatchInput = $('presetImportFile');
  if (allPatchInput && allPatchInput.dataset.exportAllCacheAttached !== '1') {
    allPatchInput.dataset.exportAllCacheAttached = '1';
    allPatchInput.addEventListener('change', () => {
      void cacheLocalAllPresetFile(allPatchInput.files?.[0] || null);
    });
  }

  window.addEventListener('mg30-active-preset-changed', updateTarget);
  window.addEventListener('mg30-preset-import-target-changed', updateTarget);
  updateTarget();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
