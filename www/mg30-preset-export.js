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
function init() {
  const button = $('presetExportStart');
  if (!button || button.dataset.initialized === '1') return;
  button.dataset.initialized = '1';
  let busy = false;
  const bridge = () => window.MG30PresetExportBridge;
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
    setStatus('Memulai pembacaan preset ' + label + '…');
    try {
      const source = await api.readSingle(progress => {
        const completed = Number(progress?.completed) || 0;
        const total = Number(progress?.total) || 0;
        const phase = progress?.phase || 'Membaca perangkat';
        const detail = progress?.detail ? ' · ' + progress.detail : '';
        setStatus(phase + (total ? ' · ' + completed + '/' + total : '') + detail);
      });
      const bytes = buildMG30SinglePresetPatchFromReplies(source);
      if (!(bytes instanceof Uint8Array) || bytes.length !== 0x26AE) {
        throw new Error('Ukuran record hasil export tidak cocok dengan format Gen2 single-preset.');
      }
      const filename = 'MG30_' + label + '.mg30patch';
      downloadPatch(bytes, filename);
      setStatus('Export selesai: ' + filename + ' · ' + bytes.length.toLocaleString('id-ID') +
        ' byte. File berisi 3 scene dan IR "' + source.resourceName +
        '" hasil pembacaan 2.048 sampel + 600 nilai kurva.', 'ok');
    } catch (error) {
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
