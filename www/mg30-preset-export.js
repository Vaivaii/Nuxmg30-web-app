import { buildMG30SinglePresetPatchFromReplies, fitMG30QuickToneIRName } from './mg30-preset-format.js';
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
  window.addEventListener('mg30-active-preset-changed', updateTarget);
  window.addEventListener('mg30-preset-import-target-changed', updateTarget);
  updateTarget();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
