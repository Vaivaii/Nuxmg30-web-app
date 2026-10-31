import { buildMG30SinglePresetPatchFromReplies } from './mg30-preset-format.js';
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
function chooseExportResourceName(originalName) {
  const original = String(originalName || '');
  const encoder = new TextEncoder();
  const originalBytes = encoder.encode(original);
  if (!originalBytes.length) throw new Error('Nama IR kosong; file preset tidak akan dibuat.');
  if (originalBytes.length <= 16) return original;

  const suggestion = Array.from(original).slice(0, 16).join('');
  const alias = window.prompt(
    'Nama IR asli di MG-30: "' + original + '" (' + originalBytes.length +
    ' byte). Field nama pada .mg30patch yang sudah tervalidasi hanya 16 byte. ' +
    'Masukkan nama alias 1–16 karakter ASCII. Alias ini akan menjadi nama IR saat file diimpor kembali; data waveform dan kurva tidak diubah.',
    suggestion
  );
  if (alias === null) return null;
  const chosen = alias.trim();
  const bytes = encoder.encode(chosen);
  if (!bytes.length || bytes.length > 16 ||
      Array.from(bytes).some(byte => byte < 0x20 || byte > 0x7E)) {
    throw new Error('Nama alias IR harus 1–16 byte ASCII printable. Export dibatalkan tanpa mengubah perangkat.');
  }
  return chosen;
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
      const exportResourceName = chooseExportResourceName(source.resourceName);
      if (exportResourceName === null) {
        setStatus('Export dibatalkan saat memilih alias nama IR. Tidak ada data yang ditulis ke MG-30.', 'warn');
        return;
      }
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
        : ' Nama IR asli di pedal: "' + source.resourceName + '". File memakai alias "' +
          exportResourceName + '"; saat file diimpor kembali, alias tersebut akan menjadi nama IR di User/Third Party.';
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
