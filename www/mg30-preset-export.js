import {
  buildMG30SinglePresetPatchFromReplies,
  buildMG30AllPresetPatch,
  parseMG30AllPresetPatch,
  fitMG30QuickToneIRName,
  decodeMG30PresetSceneReply
} from './mg30-preset-format.js';
import { MG30PresetReadFormat } from './mg30-preset-read.js';
import { createMG30PresetManagerCache } from './mg30-preset-manager-cache.js';

window.MG30PresetReadFormat = MG30PresetReadFormat;

const presetManagerCache = createMG30PresetManagerCache();
window.MG30PresetManagerCache = presetManagerCache;

function ensurePresetManagerSession(bridge) {
  if (bridge?.isConnected?.() && !presetManagerCache.isSessionActive()) {
    presetManagerCache.beginSession('mg30-usb-session');
  }
}

async function readSingleWithManagerCache(bridge, program, onProgress = () => {}, options = {}) {
  ensurePresetManagerSession(bridge);
  const cached = presetManagerCache.get(program);
  if (cached) return { readback: cached, cacheHit: true };
  const readback = await bridge.readSingle(onProgress, {
    ...options,
    programOverride: program
  });
  presetManagerCache.store(program, readback, { source: 'MG30-live-readback' });
  return { readback, cacheHit: false };
}

window.addEventListener('mg30-midi-connected', () => {
  presetManagerCache.beginSession('mg30-usb-session');
});
window.addEventListener('mg30-midi-connection-state', event => {
  if (event?.detail?.connected === false) presetManagerCache.endSession('USB-MIDI disconnected');
  else if (event?.detail?.connected === true) presetManagerCache.beginSession('mg30-usb-session');
});
window.addEventListener('mg30-native-midi-state', event => {
  if (event?.detail?.connected === false) presetManagerCache.endSession('Native USB-MIDI disconnected');
});
window.addEventListener('mg30-user-ir-write-complete', event => {
  presetManagerCache.invalidateAll('User IR upload selesai; readback preset perlu diperbarui');
});


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
  if (button && !button.disabled) {
    button.textContent = 'Export Single';
    button.title = 'Ekspor ' + label + ' sebagai .mg30patch';
  }
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
async function savePatch(bytes, filename) {
  const nativeBridge = window.NUXNativeMidi;
  if (nativeBridge?.available === true) {
    if (typeof nativeBridge.savePatch !== 'function') {
      throw new Error('Dialog File manager Android belum tersedia. Perbarui aplikasi MG30 Studio ke versi terbaru.');
    }
    const result = await nativeBridge.savePatch({
      fileName: filename,
      mimeType: 'application/octet-stream',
      bytes
    });
    if (result?.cancelled) return { ...result, native: true };
    if (result?.saved !== true) {
      throw new Error('Android belum mengonfirmasi file tersimpan.');
    }
    const actualBytes = Number(result.bytes);
    if (!Number.isSafeInteger(actualBytes) || actualBytes !== bytes.length) {
      throw new Error('Verifikasi ukuran file Android gagal: tertulis ' +
        (Number.isFinite(actualBytes) ? actualBytes : 0) + ' dari ' +
        bytes.length + ' byte. File kosong/tidak lengkap tidak dianggap berhasil.');
    }
    return { ...result, native: true };
  }
  downloadPatch(bytes, filename);
  return { saved: true, native: false, fileName: filename, bytes: bytes.length };
}
let allExportBusy = false;

/**
 * Read the live 128-slot Gen2 bank using the same read-only per-preset
 * readback core as Export Single, then package the 128 records in one file.
 * Presets without an attached User IR are valid and keep a zeroed resource area.
 */
async function exportAllPresets() {
  const bridge = window.MG30PresetExportBridge;
  if (!bridge?.isConnected?.()) {
    throw new Error('Hubungkan MG-30 melalui USB-MIDI sebelum Export All. Export All membaca bank aktif secara read-only.');
  }

  const confirmed = window.confirm(
    'EXPORT ALL PRESET\n\n' +
    'MG30 Studio akan membaca 128 preset dari MG-30 (01A–32D), termasuk tiga scene setiap preset. ' +
    'Metadata resource akan diperiksa; waveform dan curve hanya dibaca untuk preset yang memiliki IR.\n\n' +
    'Setelah semua record lengkap, aplikasi menyimpan satu file MG30_All_Preset.mg30patch (0x135700 byte).\n\n' +
    'Operasi ini hanya membaca melalui USB-MIDI/SysEx. Tidak ada preset, NAM, User IR, atau Collection yang ditulis atau diubah.\n\n' +
    'Lanjutkan membaca seluruh bank?'
  );
  if (!confirmed) {
    setStatus('Export All dibatalkan. Tidak ada data yang ditulis ke MG-30.', 'warn');
    return { saved: false, cancelled: true };
  }

  ensurePresetManagerSession(bridge);
  const initialCacheStatus = presetManagerCache.getStatus();
  setStatus('Export All · cache tersedia ' + initialCacheStatus.freshCount +
    '/128 · slot kosong/kedaluwarsa akan dibaca dari pedal.');
  const records = [];
  const resourcePrograms = [];
  const originalProgram = Number(bridge.getTargetProgram?.());
  let cacheHits = 0;
  let liveReadbacks = 0;
  let changedProgram = false;
  let fastModeEnabled = false;
  try {
    if (typeof bridge.setExportFastMode !== 'function') {
      throw new Error('Mode transfer cepat Export All tidak tersedia pada bridge USB-MIDI.');
    }
    bridge.setExportFastMode(true);
    fastModeEnabled = true;
  for (let program = 0; program < 128; program++) {
    const label = slotLabel(program);
    let readback = presetManagerCache.get(program);
    if (readback) {
      cacheHits += 1;
      setStatus('Export All · preset ' + label + ' · memakai cache ' + cacheHits + '/128…');
    } else {
      setStatus('Export All · memilih preset ' + label + ' · ' + (program + 1) + '/128…');
      await bridge.selectProgramForRead(program);
      changedProgram = true;
      setStatus('Export All · membaca preset ' + label + ' · ' + (program + 1) + '/128…');
      const cachedRead = await readSingleWithManagerCache(bridge, program, progress => {
        const phase = progress?.phase || 'Membaca perangkat';
        setStatus('Export All · preset ' + label + ' · ' + (program + 1) + '/128 · ' + phase);
      }, {
        allowMissingResource: true,
        deferPollingRestart: true
      });
      readback = cachedRead.readback;
      liveReadbacks += 1;
    }

    if (!Array.isArray(readback.sceneReplies) || readback.sceneReplies.length !== 3) {
      throw new Error('Preset ' + label + ' tidak menghasilkan tiga balasan scene lengkap.');
    }
    const scenes = readback.sceneReplies.map((reply, sceneIndex) =>
      decodeMG30PresetSceneReply(reply, program, sceneIndex)
    );
    const marker = Number(readback.resourceMarker);
    if (marker !== 0 && marker !== 1) {
      throw new Error('Status resource preset ' + label + ' tidak dapat dipastikan. Export All dihentikan.');
    }

    const record = {
      recordOrdinal: program,
      scenes,
      resourceMarker: marker,
      hasResource: marker === 1
    };
    if (marker === 1) {
      if (!readback.resourceName ||
          !(readback.samples instanceof Float32Array) || readback.samples.length !== 2048 ||
          !(readback.curve instanceof Uint16Array) || readback.curve.length !== 600) {
        throw new Error('Readback resource preset ' + label + ' tidak lengkap. Tidak membuat file bank parsial.');
      }
      record.resourceName = readback.resourceName;
      record.samples = readback.samples;
      record.curve = readback.curve;
      resourcePrograms.push(program);
    }
    records.push(record);
  }

  if (records.length !== 128) {
    throw new Error('Export All berhenti sebelum 128 record berhasil dibaca.');
  }

  setStatus('128 preset selesai dibaca. Menyusun satu file bank…');
  const bytes = buildMG30AllPresetPatch(records);
  if (!(bytes instanceof Uint8Array) || bytes.length !== 0x135700) {
    throw new Error('Ukuran hasil Export All harus tepat 0x135700 byte (128 × 0x26AE).');
  }

  const verified = parseMG30AllPresetPatch(bytes);
  if (verified.records.length !== 128 || verified.byteLength !== 0x135700 ||
      verified.resourcePrograms.length !== resourcePrograms.length) {
    throw new Error('Validasi akhir file bank gagal. File tidak disimpan.');
  }

  const filename = 'MG30_All_Preset.mg30patch';
  setStatus('128 preset tervalidasi · ' + resourcePrograms.length +
    ' preset memiliki resource IR · ' + bytes.length.toLocaleString('id-ID') +
    ' byte. Memilih lokasi penyimpanan di File manager Android…');
  const saved = await savePatch(bytes, filename);
  if (saved?.cancelled) {
    setStatus('Penyimpanan Export All dibatalkan. Tidak ada data yang ditulis ke MG-30.', 'warn');
    return { saved: false, cancelled: true, bytes: bytes.length };
  }
  if (!saved?.saved) throw new Error('Android tidak mengonfirmasi penyimpanan file Export All.');

  setStatus('Export All berhasil: ' + (saved.fileName || filename) + ' · ' +
    Number(saved.bytes || bytes.length).toLocaleString('id-ID') +
    ' byte · 128 preset · ' + resourcePrograms.length +
    ' resource IR · ' + cacheHits + ' dari cache · ' + liveReadbacks +
    ' dibaca langsung. Cache sesi lengkap; tidak ada data yang ditulis ke MG-30.', 'ok');
  return {
    saved: true,
    fileName: saved.fileName || filename,
    bytes: bytes.length,
    resourcePrograms,
    cacheHits,
    liveReadbacks
  };
  } finally {
    try {
      // Restore the original active program only if a cache miss switched the pedal.
      if (changedProgram && Number.isInteger(originalProgram) && originalProgram >= 0 && originalProgram < 128) {
        try { await bridge.selectProgramForRead(originalProgram); } catch (_) {}
      }
    } finally {
      // Never leave 22 ms MIDI pacing enabled outside Export All.
      if (fastModeEnabled) bridge.setExportFastMode(false);
    }
  }
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
      const cachedRead = await readSingleWithManagerCache(api, program, progress => {
        const completed = Number(progress?.completed) || 0;
        const total = Number(progress?.total) || 0;
        const phase = progress?.phase || 'Membaca perangkat';
        const detail = progress?.detail ? ' · ' + progress.detail : '';
        setStatus(phase + (total ? ' · ' + completed + '/' + total : '') + detail);
      });
      const source = cachedRead.readback;
      if (cachedRead.cacheHit) setStatus('Preset ' + label + ' menggunakan cache readback sesi USB-MIDI.');
      // QuickTone-compatible fixed field: preserve the first 16 ASCII bytes.
      // This changes only the name stored in the file, never the device's IR metadata.
      if (Number(source.resourceMarker) !== 1 || !source.resourceName ||
          !(source.samples instanceof Float32Array) || source.samples.length !== 2048 ||
          !(source.curve instanceof Uint16Array) || source.curve.length !== 600) {
        throw new Error('Preset ' + label + ' tidak memiliki resource IR lengkap untuk Export Single.');
      }
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
    allButton.disabled = false;
    allButton.textContent = 'Export All · 128 Preset';
    allButton.title = 'Baca bank aktif MG-30 (read-only), lalu simpan 128 preset sebagai satu file.';
    allButton.addEventListener('click', async () => {
      if (allExportBusy) return;
      allExportBusy = true;
      allButton.disabled = true;
      allButton.textContent = 'Membaca bank…';
      const bridge = window.MG30PresetExportBridge;
      try {
        await exportAllPresets();
      } catch (error) {
        setStatus('Export All gagal: ' + (error?.message || String(error)) +
          ' Tidak ada perintah tulis yang dikirim ke MG-30.', 'warn');
      } finally {
        allExportBusy = false;
        allButton.disabled = false;
        allButton.textContent = 'Export All · 128 Preset';
        bridge?.resumePolling?.();
      }
    });
  }

  window.addEventListener('mg30-active-preset-changed', updateTarget);
  window.addEventListener('mg30-preset-import-target-changed', updateTarget);
  updateTarget();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
