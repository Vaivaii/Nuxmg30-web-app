import { parseMG30SinglePresetPatch, parseMG30AllPresetPatch, buildMG30SinglePresetImportPlan } from './mg30-preset-format.js';
import { buildMG30AllPresetImportPlan } from './mg30-preset-all-import.js';

const $ = id => document.getElementById(id);
const englishText = value => {
  const text = String(value ?? '');
  return window.MG30EnglishUI?.translate?.(text) ?? text;
};
const fmt = n => new Intl.NumberFormat('en-US').format(n) + (Number(n) === 1 ? ' byte' : ' bytes');
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
    status.textContent = englishText(text);
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
    progressTitle.textContent = importMode === 'all' ? 'Import All in Progress' : 'Import in Progress';
    progressTrack.classList.remove('is-indeterminate');
    progressTrack.setAttribute('aria-valuenow', '0');
    progressFill.style.width = '0%';
    progressNote.textContent = 'Do not close the app or disconnect USB while the transfer is running.';
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
        progressNote.textContent = 'Verifying presets ' + (progress.verifiedPrograms || 0) + '/128 (' + (progress.verifiedScenes || 0) + '/384 scenes)…';
      } else if (progress?.phase) {
        progressNote.textContent = englishText(progress.phase) + ' · ' + completed.toLocaleString('en-US') + '/' + progressTotal.toLocaleString('en-US') + ' frames acknowledged by the device.';
      }
    }
  }

  function finishProgressDialog(state, title, note, completed, delay) {
    if (!progressReady) {
      window.setTimeout(() => message(''), delay);
      return;
    }
    progressDialog.dataset.state = state;
    progressTitle.textContent = englishText(title);
    progressTrack.classList.remove('is-indeterminate');
    progressTrack.setAttribute('aria-valuenow', String(Math.round(completed / progressTotal * 100)));
    progressFill.style.width = (completed / progressTotal * 100) + '%';
    progressNote.textContent = englishText(note);
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
      targetLabel.textContent = 'Select a destination slot by tapping a preset card below.';
      return;
    }
    const label = api()?.getTargetLabel?.() || slotLabel(selectedTargetProgram);
    targetLabel.textContent = 'Destination slot: ' + label;
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
      message('No file selected.');
      importBar.classList.remove('has-file');
      return;
    }

    info.textContent = file.name;
    targetLabel.textContent = 'Select a destination slot.';
    importBar.classList.add('has-file');
    message('Checking .mg30patch file structure…');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (importMode === 'all') {
        parsedAll = parseMG30AllPresetPatch(bytes);
        info.textContent = file.name;
        targetLabel.textContent = parsedAll.records.length.toLocaleString('en-US') + ' presets ready to import · ' + parsedAll.resourcePrograms.length.toLocaleString('en-US') + ' presets include embedded IR resources.';
        allRun.classList.remove('hidden');
        message('Valid All Preset file. Starting the import will overwrite all 128 preset slots.', 'warn');
      } else {
        parsed = parseMG30SinglePresetPatch(bytes);
        info.textContent = file.name;
        targetLabel.textContent = 'Select a destination slot.';
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
      message(error?.message || 'Invalid Import All plan.', 'warn');
      return;
    }
    const confirmed = window.confirm(
      'IMPORT ALL PRESETS?\n\n' +
      file.name + ' will overwrite all 128 preset slots (01A–32D) and transfer any embedded IR resources included in the file.\n\n' +
      'The transfer cannot be canceled once it starts. Back up your presets before continuing.\n\n' +
      'Continue with Import All?'
    );
    if (!confirmed) return;

    progressTotal = plan.totalFrames;
    lock(true);
    openProgressDialog();
    try {
      await bridge.importAll(plan, updateProgressDialog);
      message('');
      finishProgressDialog('success', 'Import All Complete', '128 presets and 384 scenes passed readback verification.', plan.totalFrames, 1800);
      input.value = '';
      file = null;
      parsedAll = null;
      info.textContent = '';
      importBar.classList.remove('has-file');
      allRun.classList.add('hidden');
      targetLabel.textContent = 'Select a destination slot by tapping a preset card below.';
    } catch (error) {
      message('');
      finishProgressDialog('error', 'Import All Failed', (error?.message || 'The import could not be completed.') + '\n\nThe bank may be partially written. Keep USB connected until the MG-30 is stable.', progressCompleted, FAILURE_FEEDBACK_AUTO_CLOSE_MS);
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
      message('File ready. Connect the MG-30 via USB-MIDI before importing to ' +
        slotLabel(program) + '.', 'warn');
      return;
    }

    const activeProgram = Number(bridge.getTargetProgram?.());
    if (activeProgram !== program) {
      message('The selected slot does not match the active device slot. Select the destination card again.', 'warn');
      return;
    }

    let plan;
    try {
      plan = buildMG30SinglePresetImportPlan(parsed, program);
    } catch (error) {
      message(error?.message || 'Invalid preset import plan.', 'warn');
      return;
    }

    const target = bridge.getTargetLabel?.() || slotLabel(program);
    const confirmed = window.confirm(
      'Import "' + file.name + '" to preset ' + target + '?\n\n' +
      'This will overwrite the selected slot, transfer the embedded IR resource, and write all three scenes. ' +
      'Collection and NAM will not be affected. Back up important data first.\n\n' +
      'Continue?'
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
      finishProgressDialog('success', 'Import Complete', 'The preset and all three scenes passed readback verification.', 78, 1800);
      input.value = '';
      file = null;
      parsed = null;
      parsedAll = null;
      selectedTargetProgram = null;
      info.textContent = '';
      importBar.classList.remove('has-file');
      refreshTarget();
    } catch (error) {
      message('');
      finishProgressDialog('error', 'Import Failed', (error?.message || 'The import could not be completed.') + '\n\nCheck the USB connection and keep the MG-30 connected until it is stable.', progressCompleted, FAILURE_FEEDBACK_AUTO_CLOSE_MS);
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
