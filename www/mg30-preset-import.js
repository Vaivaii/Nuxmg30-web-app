import { parseMG30SinglePresetPatch, parseMG30AllPresetPatch, buildMG30SinglePresetImportPlan } from './mg30-preset-format.js';
import { buildMG30AllPresetImportPlan } from './mg30-preset-all-import.js';

const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('id-ID').format(n) + ' byte';
const FAILURE_FEEDBACK_AUTO_CLOSE_MS = 5000;

function slotLabel(program) {
  const slot = Math.max(0, Math.min(127, Number(program) || 0));
  return String(Math.floor(slot / 4) + 1).padStart(2, '0') + 'ABCD'[slot % 4];
}

function init() {
  const input = $('presetImportFile');
  const choose = $('presetImportChoose');
  const allChoose = $('presetImportAllChoose');
  const allRun = $('presetImportAllRun');
  const info = $('presetImportFileInfo');
  const status = $('presetImportStatus');
  const targetLabel = $('presetImportTarget');
  const importBar = $('presetLibraryImportBar');
  const progressDialog = $('presetImportProgressDialog');
  const progressTitle = $('presetImportProgressTitle');
  const progressTrack = $('presetImportProgressTrack');
  const progressFill = $('presetImportProgressFill');
  const progressNote = $('presetImportProgressNote');
  const progressReady = Boolean(progressDialog && progressTitle && progressTrack && progressFill && progressNote);
  if (!input || !choose || !allChoose || !allRun || !info || !status || !targetLabel || !importBar) return;

  let parsed = null;
  let parsedAll = null;
  let importMode = 'single';
  let progressTotal = 78;
  let file = null;
  let busy = false;
  let selectedTargetProgram = null;
  let progressCloseTimer = null;
  let progressCompleted = 0;

  const api = () => window.MG30PresetImportBridge;
  const message = (text, kind = '') => {
    status.textContent = text;
    status.classList.remove('ok', 'warn');
    if (kind) status.classList.add(kind);
  };

  function closeProgressDialog() {
    if (!progressReady) return;
    if (progressDialog.open && typeof progressDialog.close === 'function') {
      progressDialog.close();
    } else {
      progressDialog.removeAttribute('open');
    }
    delete progressDialog.dataset.owner;
  }

  function openProgressDialog() {
    if (progressCloseTimer) window.clearTimeout(progressCloseTimer);
    progressCloseTimer = null;
    progressCompleted = 0;
    message('');
    if (!progressReady) return;
    progressDialog.dataset.owner = 'import';
    progressDialog.dataset.state = 'loading';
    progressTitle.textContent = importMode === 'all' ? 'Import All sedang berlangsung' : 'Import sedang berlangsung';
    progressTrack.classList.remove('is-indeterminate');
    progressTrack.setAttribute('aria-valuenow', '0');
    progressFill.style.width = '0%';
    progressNote.textContent = 'Jangan tutup aplikasi atau lepas koneksi USB selama proses berlangsung.';
    if (!progressDialog.open) {
      if (typeof progressDialog.showModal === 'function') progressDialog.showModal();
      else progressDialog.setAttribute('open', '');
    }
  }

  function updateProgressDialog(progress) {
    const completed = Math.max(0, Math.min(progressTotal, Number(progress?.completed) || 0));
    progressCompleted = completed;
    if (progressReady) {
      progressTrack.classList.remove('is-indeterminate');
      progressTrack.setAttribute('aria-valuenow', String(Math.round(completed / progressTotal * 100)));
      progressFill.style.width = (completed / progressTotal * 100) + '%';
      if (progress?.phase === 'Verifikasi readback') {
        progressNote.textContent = 'Memverifikasi preset ' + (progress.verifiedPrograms || 0) + '/128 (' + (progress.verifiedScenes || 0) + '/384 scene)…';
      } else if (progress?.phase) {
        progressNote.textContent = progress.phase + ' · ' + completed.toLocaleString('id-ID') + '/' + progressTotal.toLocaleString('id-ID') + ' frame diakui perangkat.';
      }
    }
  }

  function finishProgressDialog(state, title, note, completed, delay) {
    if (!progressReady) {
      window.setTimeout(() => message(''), delay);
      return;
    }
    progressDialog.dataset.state = state;
    progressTitle.textContent = title;
    progressTrack.classList.remove('is-indeterminate');
    progressTrack.setAttribute('aria-valuenow', String(Math.round(completed / progressTotal * 100)));
    progressFill.style.width = (completed / progressTotal * 100) + '%';
    progressNote.textContent = note;
    if (progressCloseTimer) window.clearTimeout(progressCloseTimer);
    progressCloseTimer = window.setTimeout(() => {
      closeProgressDialog();
      progressCloseTimer = null;
    }, delay);
  }

  progressDialog?.addEventListener('cancel', event => {
    // Do not dismiss an active USB transfer. Once it reaches a terminal state,
    // allow Escape / Android Back to close the result dialog immediately.
    const operationInProgress = progressDialog.dataset.state === 'loading' &&
      (progressDialog.dataset.owner === 'import' || progressDialog.dataset.owner === 'export');
    if (operationInProgress) event.preventDefault();
  });
  progressDialog?.addEventListener('close', () => {
    if (progressCloseTimer) window.clearTimeout(progressCloseTimer);
    progressCloseTimer = null;
    if (progressDialog.dataset.owner === 'import') delete progressDialog.dataset.owner;
  });
  const refreshTarget = () => {
    if (selectedTargetProgram === null) {
      targetLabel.textContent = 'Pilih slot tujuan dengan mengetuk kartu preset di bawah.';
      return;
    }
    const label = api()?.getTargetLabel?.() || slotLabel(selectedTargetProgram);
    targetLabel.textContent = 'Slot tujuan: ' + label;
  };
  const lock = value => {
    busy = value;
    input.disabled = value;
    choose.disabled = value;
    allChoose.disabled = value;
    allRun.disabled = value;
  };

  choose.addEventListener('click', () => {
    if (!busy) {
      importMode = 'single';
      parsedAll = null;
      allRun.classList.add('hidden');
      input.click();
    }
  });

  allChoose.addEventListener('click', () => {
    if (!busy) {
      importMode = 'all';
      parsed = null;
      allRun.classList.add('hidden');
      input.click();
    }
  });

  input.addEventListener('change', async () => {
    file = input.files?.[0] || null;
    parsed = null;
    parsedAll = null;
    allRun.classList.add('hidden');
    selectedTargetProgram = null;
    refreshTarget();

    if (!file) {
      info.textContent = '';
      message('Tidak ada file yang dipilih.');
      importBar.classList.remove('has-file');
      return;
    }

    info.textContent = file.name;
    targetLabel.textContent = 'Pilih slot tujuan.';
    importBar.classList.add('has-file');
    message('Memeriksa struktur .mg30patch…');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (importMode === 'all') {
        parsedAll = parseMG30AllPresetPatch(bytes);
        info.textContent = file.name;
        targetLabel.textContent = parsedAll.records.length.toLocaleString('id-ID') + ' preset siap diimpor · ' + parsedAll.resourcePrograms.length.toLocaleString('id-ID') + ' preset membawa resource IR.';
        allRun.classList.remove('hidden');
        message('File All Preset valid. Menekan tombol di bawah akan menimpa seluruh bank 128 preset.', 'warn');
      } else {
        parsed = parseMG30SinglePresetPatch(bytes);
        info.textContent = file.name;
        targetLabel.textContent = 'Pilih slot tujuan.';
        message('');
      }
    } catch (error) {
      parsed = null;
      parsedAll = null;
      allRun.classList.add('hidden');
      message(error?.message || 'File .mg30patch tidak valid.', 'warn');
    }
  });


  allRun.addEventListener('click', async () => {
    if (busy || !parsedAll || !file) return;
    const bridge = api();
    if (!bridge?.isConnected?.()) {
      message('File All Preset valid. Hubungkan MG-30 melalui USB-MIDI sebelum memulai.', 'warn');
      return;
    }
    let plan;
    try {
      plan = buildMG30AllPresetImportPlan(parsedAll.records);
    } catch (error) {
      message(error?.message || 'Rencana Import All tidak valid.', 'warn');
      return;
    }
    const confirmed = window.confirm(
      'PERINGATAN: IMPORT ALL PRESET\n\n' +
      'File ' + file.name + ' akan menulis ulang SELURUH 128 preset (slot 01A–32D) pada MG-30. ' +
      'Sebanyak ' + plan.resourcePrograms.length + ' preset juga mengirim resource IR melalui jalur User / Third Party.\n\n' +
      'Proses tidak dapat dibatalkan setelah pengiriman dimulai. Jika kabel terlepas atau transfer gagal, bank dapat tertinggal dalam kondisi sebagian terisi. ' +
      'Pastikan kamu memiliki backup lengkap dan pedal menggunakan firmware MG-30 Gen2 6.0.x (bukan MKII).\n\n' +
      'Lanjutkan menimpa seluruh 128 preset?'
    );
    if (!confirmed) return;

    progressTotal = plan.totalFrames;
    lock(true);
    openProgressDialog();
    try {
      await bridge.importAll(plan, updateProgressDialog);
      message('Import All selesai: 128 preset dan 384 scene telah diverifikasi.', 'ok');
      finishProgressDialog('success', 'Import All selesai', '128 preset / 384 scene lolos readback.', plan.totalFrames, 1800);
      input.value = '';
      file = null;
      parsedAll = null;
      info.textContent = '';
      importBar.classList.remove('has-file');
      allRun.classList.add('hidden');
      targetLabel.textContent = 'Pilih slot tujuan dengan mengetuk kartu preset di bawah.';
    } catch (error) {
      message(error?.message || 'Import All gagal.', 'warn');
      finishProgressDialog('error', 'Import All gagal', 'Bank mungkin terisi sebagian. Jangan lepas USB sebelum perangkat stabil.', progressCompleted, FAILURE_FEEDBACK_AUTO_CLOSE_MS);
    } finally {
      lock(false);
      progressTotal = 78;
    }
  });

  async function confirmAndImport(program) {
    if (busy || !parsed || !file) return;
    if (!Number.isInteger(program) || program < 0 || program > 127) return;

    const bridge = api();
    selectedTargetProgram = program;
    refreshTarget();

    if (!bridge?.isConnected?.()) {
      message('File siap. Hubungkan MG-30 melalui USB-MIDI sebelum mengimpor ke ' +
        slotLabel(program) + '.', 'warn');
      return;
    }

    const activeProgram = Number(bridge.getTargetProgram?.());
    if (activeProgram !== program) {
      message('Slot perangkat belum cocok dengan pilihan. Pilih kembali kartu slot tujuan.', 'warn');
      return;
    }

    let plan;
    try {
      plan = buildMG30SinglePresetImportPlan(parsed, program);
    } catch (error) {
      message(error?.message || 'Rencana impor tidak valid.', 'warn');
      return;
    }

    const target = bridge.getTargetLabel?.() || slotLabel(program);
    const confirmed = window.confirm(
      'Impor ' + file.name + ' ke preset ' + target + '?\n\n' +
      'Resource IR "' + parsed.resourceName +
      '" akan dikirim ke Third Party / User, lalu tiga scene preset akan ditulis. ' +
      'Slot tujuan akan ditimpa.\n\n' +
      'Batch 128 preset belum didukung. Collection dan NAM tidak disentuh. ' +
      'Pastikan data penting sudah dicadangkan sebelum melanjutkan.'
    );

    if (!confirmed) {
      message('');
      return;
    }

    lock(true);
    openProgressDialog();
    try {
      await bridge.import(plan, updateProgressDialog);
      message('');
      finishProgressDialog('success', 'Import selesai', '', 78, 1050);
      input.value = '';
      file = null;
      parsed = null;
      parsedAll = null;
      selectedTargetProgram = null;
      info.textContent = '';
      importBar.classList.remove('has-file');
      refreshTarget();
    } catch {
      message('');
      finishProgressDialog('error', 'Import gagal', 'Periksa koneksi perangkat.', progressCompleted, FAILURE_FEEDBACK_AUTO_CLOSE_MS);
    } finally {
      lock(false);
    }
  }

  // Selecting a preset card selects the hardware slot through the existing sync path first.
  // Only then does the user receive the native Cancel / OK confirmation prompt.
  window.addEventListener('mg30-preset-library-target-selected', event => {
    const program = Number(event.detail?.program);
    void confirmAndImport(program);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
