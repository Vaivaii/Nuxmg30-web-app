import { parseMG30SinglePresetPatch, buildMG30SinglePresetImportPlan } from './mg30-preset-format.js';

const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('id-ID').format(n) + ' byte';

function slotLabel(program) {
  const slot = Math.max(0, Math.min(127, Number(program) || 0));
  return String(Math.floor(slot / 4) + 1).padStart(2, '0') + 'ABCD'[slot % 4];
}

function init() {
  const input = $('presetImportFile');
  const choose = $('presetImportChoose');
  const info = $('presetImportFileInfo');
  const status = $('presetImportStatus');
  const targetLabel = $('presetImportTarget');
  const importBar = $('presetLibraryImportBar');
  const progressDialog = $('presetImportProgressDialog');
  const progressTitle = $('presetImportProgressTitle');
  const progressMessage = $('presetImportProgressMessage');
  const progressPhase = $('presetImportProgressPhase');
  const progressTrack = $('presetImportProgressTrack');
  const progressFill = $('presetImportProgressFill');
  const progressAck = $('presetImportProgressAck');
  const progressNote = $('presetImportProgressNote');
  const progressIcon = $('presetImportProgressIcon');
  const progressReady = Boolean(progressDialog && progressTitle && progressMessage &&
    progressPhase && progressTrack && progressFill && progressAck && progressNote && progressIcon);
  if (!input || !choose || !info || !status || !targetLabel || !importBar) return;

  let parsed = null;
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
  }

  function openProgressDialog(target, resourceName) {
    if (progressCloseTimer) window.clearTimeout(progressCloseTimer);
    progressCloseTimer = null;
    progressCompleted = 0;
    message('');
    if (!progressReady) {
      message('Import sedang berlangsung ke ' + target + '…');
      return;
    }
    progressDialog.dataset.state = 'loading';
    progressTitle.textContent = 'Import sedang berlangsung';
    progressMessage.textContent = 'Mengirim resource IR "' + resourceName +
      '" ke Third Party / User, lalu menulis tiga scene preset ke slot ' + target + '.';
    progressPhase.textContent = 'Menyiapkan transfer…';
    progressTrack.setAttribute('aria-valuenow', '0');
    progressFill.style.width = '0%';
    progressAck.textContent = '0/78 ACK';
    progressNote.textContent = 'Jangan tutup aplikasi atau lepas koneksi USB selama proses berlangsung.';
    progressIcon.textContent = '';
    if (!progressDialog.open) {
      if (typeof progressDialog.showModal === 'function') progressDialog.showModal();
      else progressDialog.setAttribute('open', '');
    }
  }

  function updateProgressDialog(progress) {
    const completed = Math.max(0, Math.min(78, Number(progress?.completed) || 0));
    const phase = String(progress?.phase || 'Memproses');
    progressCompleted = completed;
    if (progressReady) {
      progressPhase.textContent = phase;
      progressTrack.setAttribute('aria-valuenow', String(completed));
      progressFill.style.width = (completed / 78 * 100) + '%';
      progressAck.textContent = completed + '/78 ACK';
    } else {
      message(phase + ' · ' + completed + '/78 ACK');
    }
  }

  function finishProgressDialog(state, title, detail, phase, completed, delay) {
    if (!progressReady) {
      message(detail, state === 'error' ? 'warn' : 'ok');
      window.setTimeout(() => message(''), delay);
      return;
    }
    progressDialog.dataset.state = state;
    progressTitle.textContent = title;
    progressMessage.textContent = detail;
    progressPhase.textContent = phase;
    progressTrack.setAttribute('aria-valuenow', String(completed));
    progressFill.style.width = (completed / 78 * 100) + '%';
    progressAck.textContent = completed + '/78 ACK';
    progressNote.textContent = 'Dialog akan tertutup otomatis.';
    progressIcon.textContent = state === 'success' ? '✓' : '!';
    if (progressCloseTimer) window.clearTimeout(progressCloseTimer);
    progressCloseTimer = window.setTimeout(() => {
      closeProgressDialog();
      progressCloseTimer = null;
    }, delay);
  }

  progressDialog?.addEventListener('cancel', event => {
    // Keep the progress overlay open while the import is running and until its result auto-closes.
    event.preventDefault();
  });
  const refreshTarget = () => {
    if (selectedTargetProgram === null) {
      targetLabel.textContent = 'Pilih slot tujuan dengan mengetuk kartu preset di bawah.';
      return;
    }
    const label = api()?.getTargetLabel?.() || slotLabel(selectedTargetProgram);
    targetLabel.textContent = 'Slot tujuan dipilih: ' + label;
  };
  const lock = value => {
    busy = value;
    input.disabled = value;
    choose.disabled = value;
  };

  choose.addEventListener('click', () => {
    if (!busy) input.click();
  });

  input.addEventListener('change', async () => {
    file = input.files?.[0] || null;
    parsed = null;
    selectedTargetProgram = null;
    refreshTarget();

    if (!file) {
      info.textContent = '';
      message('Tidak ada file yang dipilih.');
      importBar.classList.remove('has-file');
      return;
    }

    info.textContent = file.name + ' · ' + fmt(file.size);
    importBar.classList.add('has-file');
    message('Memeriksa struktur .mg30patch…');

    try {
      parsed = parseMG30SinglePresetPatch(new Uint8Array(await file.arrayBuffer()));
      info.textContent = file.name + ' · ' + fmt(parsed.byteLength) +
        ' · record sumber ' + parsed.recordOrdinal + ' · 3 scene · IR ' + parsed.resourceName;
      message('File valid. Sekarang ketuk kartu slot tujuan pada daftar Preset Manager.', 'ok');
    } catch (error) {
      parsed = null;
      message(error?.message || 'File .mg30patch tidak valid.', 'warn');
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
      message('Impor dibatalkan. Tidak ada data yang dikirim. File tetap dipilih; ' +
        'ketuk kartu slot lain untuk mengganti tujuan atau pilih kembali slot ini.', '');
      return;
    }

    lock(true);
    openProgressDialog(target, parsed.resourceName);
    try {
      const result = await bridge.import(plan, updateProgressDialog);
      const successDetail = 'Import ke ' + target + ' berhasil: 78/78 ACK. ' +
        'Tiga scene cocok dengan pembacaan ulang perangkat. Resource IR "' +
        result.resourceName + '" mendapat ACK semua fase; readback resource IR belum dilakukan.';
      message('');
      finishProgressDialog('success', 'Import selesai', successDetail, 'Selesai', 78, 1500);
      input.value = '';
      file = null;
      parsed = null;
      selectedTargetProgram = null;
      info.textContent = '';
      importBar.classList.remove('has-file');
      refreshTarget();
    } catch (error) {
      const failureDetail = 'Import tidak selesai: ' + (error?.message || error) +
        ' Periksa pedal sebelum mengulangi; transfer terputus dapat meninggalkan resource atau preset parsial.';
      message('');
      finishProgressDialog('error', 'Import tidak selesai', failureDetail,
        'Perlu pemeriksaan perangkat', progressCompleted, 2600);
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
