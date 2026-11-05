import {
  normalizeMG30PresetName,
  readMG30PresetName,
  validateMG30PresetReadParts,
  renameMG30PresetParts,
  prepareMG30SaveAsParts,
  createMG30PresetSlotBackup,
} from "./preset-library-operations.js";

const $ = id => document.getElementById(id);
const SLOT_BACKUP_KEY_PREFIX = "mg30-preset-slot-backup-v1-";
const NAME_CACHE_KEY = 'mg30-preset-library-card-names-v1';
const SLOT_LETTERS = 'ABCD';

function slotLabel(program) {
  const slot = Math.max(0, Math.min(127, Number(program) || 0));
  return String(Math.floor(slot / 4) + 1).padStart(2, '0') + SLOT_LETTERS[slot % 4];
}

function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function loadNameCache() {
  try {
    const value = JSON.parse(localStorage.getItem(NAME_CACHE_KEY) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};
    for (const [key, name] of Object.entries(value)) {
      const program = Number(key);
      if (Number.isInteger(program) && program >= 0 && program < 128 && typeof name === 'string') {
        result[program] = name;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function currentHardwareSlot() {
  const label = String($('slotLabel')?.textContent || '01A').trim();
  const match = /^(\d{2})([ABCD])$/.exec(label);
  if (!match) return 0;
  return Math.max(0, Math.min(127,
    (Number(match[1]) - 1) * 4 + SLOT_LETTERS.indexOf(match[2])
  ));
}

function readPresetName(body) {
  if (!body || body.length < 190 || typeof window.bitSlot !== 'function') {
    throw new Error('Preset slot data is incomplete.');
  }
  let name = '';
  for (let index = 0; index < 16; index++) {
    const code = window.bitSlot(body, 106 + index);
    if (code === 0) break;
    if (code < 0x20 || code > 0x7e) throw new Error('Preset name contains unsupported characters.');
    name += String.fromCharCode(code);
  }
  return name.trimEnd();
}

function activeDeviceOperation(ignoreManagerSync = false) {
  if (window.MG30PresetManagerBusy || window.MG30PresetImportBusy ||
      window.MG30PresetExportBusy || window.MG30IRTransferBusy ||
      (window.MG30PresetManagerSyncBusy && !ignoreManagerSync)) return true;
  if ($('readNamSlotsBtn')?.dataset.busy === '1') return true;
  if ($('copySceneToggle')?.disabled ||
      [...document.querySelectorAll('#sceneButtons button')].some(button => button.disabled) ||
      $('ctrlEditorDialog')?.open) return true;
  const status = String($('deviceStatus')?.textContent || '');
  return /Menyimpan:|Menyimpan preset|Copy Scene:|Menulis bagian|Impor preset:|menunggu antrean MIDI|Membaca .*preset|Membaca (?:buffer|status)|Program Change/i.test(status);
}

function initPresetLibraryUI() {
  const page = $('page-presets');
  const cards = $('presetLibraryCards');
  const scanStatus = $('presetLibraryScanStatus');
  const importBar = $('presetLibraryImportBar');
  const importInput = $('presetImportFile');
  const topBar = document.querySelector('.top');
  const nav = document.querySelector('.nav');
  const exportStatus = $('presetExportStatus');
  const feedbackDialog = $('presetImportProgressDialog');
  const feedbackTitle = $('presetImportProgressTitle');
  const feedbackTrack = $('presetImportProgressTrack');
  const feedbackFill = $('presetImportProgressFill');
  const feedbackNote = $('presetImportProgressNote');
  if (!page || !cards || page.dataset.cardUiReady === '1') return;
  page.dataset.cardUiReady = '1';

  let names = loadNameCache();
  let scanPromise = null;
  let exportFeedbackTimer = null;

  // Keep only Preset Manager fixed between the sticky app header and fixed bottom navigation.
  // This isolates its card scrolling from the shared NAM & IR / other-tab document scroll.
  // Legacy Draft compatibility IDs remain hidden and never participate in viewport sizing.
  function clearPresetViewport() {
    document.body.classList.remove('preset-manager-active');
    page.style.removeProperty('--preset-manager-top');
    page.style.removeProperty('--preset-manager-bottom');
    cards.style.removeProperty('height');
    cards.style.removeProperty('max-height');
  }

  function resizeCardViewport() {
    if (page.classList.contains('hidden')) {
      clearPresetViewport();
      return;
    }
    if (!topBar || !nav || window.innerWidth > 720) {
      clearPresetViewport();
      return;
    }

    const headerBottom = topBar.getBoundingClientRect().bottom;
    const navTop = nav.getBoundingClientRect().top;
    const top = Math.max(0, Math.ceil(headerBottom + 7));
    const bottom = Math.max(0, Math.ceil(window.innerHeight - navTop));

    document.body.classList.add('preset-manager-active');
    page.style.setProperty('--preset-manager-top', top + 'px');
    page.style.setProperty('--preset-manager-bottom', bottom + 'px');
    cards.style.removeProperty('height');
    cards.style.removeProperty('max-height');
  }

  const presetVisibilityObserver = new MutationObserver(() => {
    if (page.classList.contains('hidden')) clearPresetViewport();
    else resizeCardViewport();
  });
  presetVisibilityObserver.observe(page, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', resizeCardViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', resizeCardViewport);

  function closeExportFeedback() {
    if (!feedbackDialog || feedbackDialog.dataset.owner !== 'export') return;
    if (feedbackDialog.open && typeof feedbackDialog.close === 'function') feedbackDialog.close();
    else feedbackDialog.removeAttribute('open');
    delete feedbackDialog.dataset.owner;
  }

  function showExportFeedback(title, note, state, percent, autoCloseMs = 0, indeterminate = false) {
    if (!feedbackDialog || !feedbackTitle || !feedbackTrack || !feedbackFill || !feedbackNote) return;
    if (feedbackDialog.dataset.owner === 'import') return;
    if (exportFeedbackTimer) window.clearTimeout(exportFeedbackTimer);
    exportFeedbackTimer = null;
    feedbackDialog.dataset.owner = 'export';
    feedbackDialog.dataset.state = state;
    feedbackTitle.textContent = title;
    feedbackNote.textContent = note;
    feedbackTrack.classList.toggle('is-indeterminate', Boolean(indeterminate));
    feedbackTrack.setAttribute('aria-valuenow', String(Math.max(0, Math.min(100, percent))));
    feedbackFill.style.width = Math.max(0, Math.min(100, percent)) + '%';
    if (!feedbackDialog.open) {
      if (typeof feedbackDialog.showModal === 'function') feedbackDialog.showModal();
      else feedbackDialog.setAttribute('open', '');
    }
    if (autoCloseMs > 0) {
      exportFeedbackTimer = window.setTimeout(() => {
        closeExportFeedback();
        exportFeedbackTimer = null;
      }, autoCloseMs);
    }
  }

  function reflectExportStatus() {
    if (!exportStatus) return;
    const text = String(exportStatus.textContent || '').trim();
    if (!text || feedbackDialog?.dataset.owner === 'import') return;
    // Export All is a local serialization + Android save-picker operation,
    // not a USB transfer. Suppress only its intermediate progress statuses.
    // Final success/error/cancel feedback must remain visible to the user.
    if (window.MG30LocalPresetExportActive === true) {
      if (feedbackDialog?.dataset.owner !== 'import') closeExportFeedback();
      const isTerminal = exportStatus.classList.contains('ok') ||
        exportStatus.classList.contains('warn') ||
        /dibatalkan|gagal/i.test(text);
      if (!isTerminal) return;
    }
    const cancelled = /dibatalkan/i.test(text);
    const failed = exportStatus.classList.contains('warn') || /gagal|tidak valid|belum terhubung/i.test(text);
    const succeeded = exportStatus.classList.contains('ok') || /file tersimpan:/i.test(text);

    // The native Android Documents picker must open without the web progress dialog above it.
    // Closing here avoids the split/slide transition artefact captured in the user's video.
    if (/memilih lokasi penyimpanan|file manager android/i.test(text)) {
      if (exportFeedbackTimer) window.clearTimeout(exportFeedbackTimer);
      exportFeedbackTimer = null;
      closeExportFeedback();
      return;
    }

    if (cancelled) {
      showExportFeedback('Export dibatalkan', '', 'cancelled', 0, 1050);
      return;
    }
    if (succeeded) {
      showExportFeedback('Export selesai', '', 'success', 100, 1050);
      return;
    }
    if (failed) {
      const title = /belum terhubung/i.test(text) ? 'MG-30 belum terhubung' : 'Export gagal';
      // Keep the actual protocol/readback error visible. A blank error dialog
      // hides the failing slot/phase and makes field diagnosis impossible.
      showExportFeedback(title, text, 'error', 0, 0);
      return;
    }

    const matches = [...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
    const progress = matches[matches.length - 1];
    const hasProgress = Boolean(progress && Number(progress[2]) > 0);
    const percent = hasProgress
      ? Math.round(Math.max(0, Math.min(1, Number(progress[1]) / Number(progress[2]))) * 100)
      : 0;
    showExportFeedback('Export sedang berlangsung',
      'Jangan tutup aplikasi atau lepas koneksi USB selama proses berlangsung.',
      'loading', percent, 0, !hasProgress);
  }

  if (exportStatus && !exportStatus.dataset.feedbackObserved) {
    exportStatus.dataset.feedbackObserved = '1';
    const exportStatusObserver = new MutationObserver(reflectExportStatus);
    exportStatusObserver.observe(exportStatus, {
      childList: true, characterData: true, attributes: true, subtree: true
    });
  }

  function selectedProgram() {
    return currentHardwareSlot();
  }

  const operationRow = document.createElement("div");
  operationRow.className = "preset-library-ops-actions";
  const renameButton = document.createElement("button");
  renameButton.type = "button";
  renameButton.className = "btn";
  renameButton.textContent = "Rename";
  renameButton.setAttribute("aria-label", "Rename selected pedal preset");
  const saveAsButton = document.createElement("button");
  saveAsButton.type = "button";
  saveAsButton.className = "btn primary";
  saveAsButton.textContent = "Save As";
  saveAsButton.setAttribute("aria-label", "Save the current edit buffer to another pedal slot");
  operationRow.append(renameButton, saveAsButton);

  const operationDialog = document.createElement("dialog");
  operationDialog.className = "preset-library-ops-dialog";
  operationDialog.setAttribute("aria-labelledby", "presetLibraryOpsTitle");
  operationDialog.innerHTML = `
    <div class="preset-library-ops-shell">
      <h3 id="presetLibraryOpsTitle">Preset operation</h3>
      <label id="presetLibraryOpsDestinationWrap" hidden>
        <span>Destination slot</span>
        <select id="presetLibraryOpsDestination"></select>
      </label>
      <label class="preset-library-ops-name">
        <span>Preset name</span>
        <input id="presetLibraryOpsName" type="text" maxlength="16" autocomplete="off" spellcheck="false">
      </label>
      <div class="preset-library-ops-dialog-actions">
        <button type="button" class="btn" id="presetLibraryOpsCancel">Cancel</button>
        <button type="button" class="btn primary" id="presetLibraryOpsConfirm">Continue</button>
      </div>
    </div>`;
  const opsHeader = page.querySelector(".preset-library-header");
  if (opsHeader) opsHeader.after(operationRow);
  else page.prepend(operationRow);
  page.append(operationDialog);
  const opsTitle = $("presetLibraryOpsTitle");
  const destinationWrap = $("presetLibraryOpsDestinationWrap");
  const destinationSelect = $("presetLibraryOpsDestination");
  const nameInput = $("presetLibraryOpsName");
  const opsConfirm = $("presetLibraryOpsConfirm");
  let operationBusy = false;

  function showOperationToast(message, kind = "success") {
    if (typeof window.toast === "function") {
      window.toast(message, kind === "error" ? 3200 : 1900);
    }
  }

  function operationErrorMessage(error) {
    const detail = String(error?.message || error || "");
    if (/read.?back|readback|payload|header|tidak cocok/i.test(detail)) {
      return "Verification failed. Check the pedal before trying again.";
    }
    if (/destination.*invalid|slot tujuan tidak valid/i.test(detail)) {
      return "Choose a valid destination slot.";
    }
    if (/same.*source|slot berbeda|different.*slot/i.test(detail)) {
      return "Choose a different destination slot.";
    }
    if (/USB|connect|terhubung/i.test(detail)) {
      return "Connect the MG-30 and try again.";
    }
    if (/busy|running|operation|operasi|berlangsung|sinkronisasi/i.test(detail)) {
      return "Another device operation is running. Try again shortly.";
    }
    if (/name|nama|ASCII|character|karakter/i.test(detail)) {
      return "Enter a valid preset name (1–16 characters).";
    }
    return "Preset operation failed. Please try again.";
  }

  function storeSlotBackup(program, parts, operation, sourceProgram = null) {
    const record = createMG30PresetSlotBackup({
      program,
      label: slotLabel(program),
      parts,
      operation,
      sourceProgram
    });
    const key = SLOT_BACKUP_KEY_PREFIX + program;
    let history = [];
    try {
      const prior = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(prior)) history = prior;
    } catch {}
    history.unshift(record);
    localStorage.setItem(key, JSON.stringify(history.slice(0, 3)));
    return record;
  }

  function persistNameCache() {
    try {
      localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(names));
      return true;
    } catch {
      return false;
    }
  }

  function buildDestinationOptions(sourceProgram) {
    destinationSelect.replaceChildren();
    for (let program = 0; program < 128; program++) {
      const label = names[program] ? names[program] : "Name not loaded";
      const option = new Option(slotLabel(program) + " · " + label, String(program));
      if (program === sourceProgram) option.disabled = true;
      destinationSelect.add(option);
    }
    destinationSelect.value = String(sourceProgram === 127 ? 0 : sourceProgram + 1);
  }

  function openOperationsDialog(mode) {
    const sourceProgram = selectedProgram();
    const sourceName = names[sourceProgram] || $("presetName")?.value || "";
    operationDialog.dataset.mode = mode;
    destinationWrap.hidden = mode !== "save-as";
    opsTitle.textContent = mode === "rename" ? "Rename preset" : "Save As to pedal";
    nameInput.value = sourceName.slice(0, 16);
    opsConfirm.textContent = mode === "rename" ? "Rename on pedal" : "Write / overwrite";
    if (mode === "save-as") buildDestinationOptions(sourceProgram);
    if (typeof operationDialog.showModal === "function") operationDialog.showModal();
    else operationDialog.setAttribute("open", "");
    nameInput.focus();
    nameInput.select();
  }

  function closeOperationsDialog() {
    if (operationDialog.open && typeof operationDialog.close === "function") operationDialog.close();
    else operationDialog.removeAttribute("open");
  }

  function validateOperationRuntime() {
    if (scanPromise) throw new Error("Sinkronisasi daftar nama preset masih berjalan. Tunggu sampai selesai.");
    const bridge = window.MG30PresetExportBridge;
    if (!bridge?.isConnected?.()) throw new Error("Hubungkan NUX MG-30 melalui USB-MIDI terlebih dahulu.");
    if (typeof window.readActiveProgramScene !== "function" ||
        typeof window.readPresetParts !== "function" ||
        typeof window.writeHardwarePreset !== "function") {
      throw new Error("Jalur baca/tulis preset Gen2 yang ada tidak tersedia. Tidak ada data yang dikirim.");
    }
    if (activeDeviceOperation() || operationBusy) {
      throw new Error("Operasi perangkat lain sedang berlangsung. Tunggu sampai selesai.");
    }
  }

  function setOperationControlsDisabled(disabled) {
    const selectors = [
      "#page-presets button", ".nav button", "#saveDeviceBtn", "#connectMidi",
      "#connectMidiDevice", "#copySceneToggle", "#chainEditToggle", "#chain button",
      "#sceneButtons button", "#blockQuickSelect", "#modelPrev", "#modelNext",
      "#blockSwitch", "#knobs input", "#knobs button"
    ];
    const nodes = [...new Set(selectors.flatMap(selector => [...document.querySelectorAll(selector)]))];
    if (disabled) {
      const previous = new Map(nodes.map(node => [node, Boolean(node.disabled)]));
      nodes.forEach(node => { node.disabled = true; });
      return () => previous.forEach((value, node) => { node.disabled = value; });
    }
    nodes.forEach(node => { node.disabled = false; });
    return () => {};
  }

  async function runPresetLibraryOperation(label, action) {
    validateOperationRuntime();
    operationBusy = true;
    window.MG30PresetManagerBusy = true;
    const restoreControls = setOperationControlsDisabled(true);
    if (typeof window.stopHardwareStatePolling === "function") window.stopHardwareStatePolling();
    closeOperationsDialog();
    try {
      await action();
    } catch (error) {
      console.error("[Preset Library operation]", error);
      showOperationToast(operationErrorMessage(error), "error");
    } finally {
      restoreControls();
      operationBusy = false;
      window.MG30PresetManagerBusy = false;
      if (typeof window.startHardwareStatePolling === "function") window.startHardwareStatePolling();
      renderCards();
    }
  }

  async function readActiveSourceProgram(expectedProgram) {
    const status = await window.readActiveProgramScene();
    if (!Number.isInteger(Number(status?.program)) || Number(status.program) !== expectedProgram) {
      throw new Error("The selected slot does not match the active pedal slot. No data was written.");
    }
  }

  async function runRename(nameValue) {
    const program = selectedProgram();
    const name = normalizeMG30PresetName(nameValue);
    await runPresetLibraryOperation("Rename " + slotLabel(program), async () => {
      await readActiveSourceProgram(program);
      const stored = validateMG30PresetReadParts(
        await window.readPresetParts(0x0b, program), 0x0b, program
      );
      const previousName = readMG30PresetName(stored[0]);
      if (previousName === name) {
        showOperationToast("Name unchanged");
        return;
      }
      const confirmed = window.confirm(
        "Rename preset " + slotLabel(program) + " from \"" +
        (previousName || "(unnamed)") + "\" to \"" + name + "\"?"
      );
      if (!confirmed) {
        return;
      }
      await readActiveSourceProgram(program);
      storeSlotBackup(program, stored, "rename", program);
      const updated = renameMG30PresetParts(stored, name);
      const verified = await window.writeHardwarePreset(program, updated);
      if (!verified) throw new Error("Preset read-back verification failed.");
      names[program] = name;
      persistNameCache();
      const editorName = $("presetName");
      if (editorName && editorName.value.trim() === previousName) {
        editorName.value = name;
        editorName.dispatchEvent(new Event("input", { bubbles: true }));
      }
      window.dispatchEvent(new CustomEvent("mg30-preset-library-name-changed", {
        detail: { program, name, operation: "rename" }
      }));
      showOperationToast("Preset renamed · " + slotLabel(program));
    });
  }

  async function runSaveAs(destinationValue, nameValue) {
    const sourceProgram = selectedProgram();
    const destinationProgram = Number(destinationValue);
    const name = normalizeMG30PresetName(nameValue);
    if (!Number.isInteger(destinationProgram) || destinationProgram < 0 || destinationProgram > 127) {
      throw new Error("Destination slot is invalid.");
    }
    if (destinationProgram === sourceProgram) {
      throw new Error("Choose a destination slot different from the active slot.");
    }
    await runPresetLibraryOperation("Save As " + slotLabel(destinationProgram), async () => {
      await readActiveSourceProgram(sourceProgram);
      const bufferParts = validateMG30PresetReadParts(
        await window.readPresetParts(0x0c, 0), 0x0c
      );
      const destinationParts = validateMG30PresetReadParts(
        await window.readPresetParts(0x0b, destinationProgram), 0x0b, destinationProgram
      );
      const previousName = readMG30PresetName(destinationParts[0]);
      const destinationDescription = previousName
        ? 'The existing preset "' + previousName + '" will be replaced.'
        : "The destination contents may be overwritten.";
      const confirmed = window.confirm(
        'Save "' + name + '" to ' + slotLabel(destinationProgram) + "?\n" +
        destinationDescription
      );
      if (!confirmed) {
        return;
      }
      await readActiveSourceProgram(sourceProgram);
      storeSlotBackup(destinationProgram, destinationParts, "save-as-overwrite", sourceProgram);

      const chainOrder = [...document.querySelectorAll("#chain > .block[data-i]")]
        .map(element => Number(element.dataset.i));
      const sceneIndex = Number($("sceneSelect")?.selectedIndex);
      const outputParts = prepareMG30SaveAsParts(bufferParts, name, sceneIndex, chainOrder);
      const verified = await window.writeHardwarePreset(destinationProgram, outputParts);
      if (!verified) throw new Error("Destination preset verification failed.");
      names[destinationProgram] = name;
      persistNameCache();
      window.dispatchEvent(new CustomEvent("mg30-preset-library-name-changed", {
        detail: { program: destinationProgram, sourceProgram, name, operation: "save-as" }
      }));
      showOperationToast("Preset saved · " + slotLabel(destinationProgram));
    });
  }

  renameButton.addEventListener("click", () => openOperationsDialog("rename"));
  saveAsButton.addEventListener("click", () => openOperationsDialog("save-as"));
  $("presetLibraryOpsCancel").addEventListener("click", closeOperationsDialog);
  opsConfirm.addEventListener("click", async () => {
    try {
      const mode = operationDialog.dataset.mode;
      const name = normalizeMG30PresetName(nameInput.value);
      if (mode === "rename") await runRename(name);
      else await runSaveAs(destinationSelect.value, name);
    } catch (error) {
      closeOperationsDialog();
      showOperationToast(operationErrorMessage(error), "error");
    }
  });

  function renderCards() {
    const selected = selectedProgram();
    const fragment = [];
    for (let program = 0; program < 128; program++) {
      const name = Object.prototype.hasOwnProperty.call(names, program) && names[program]
        ? names[program]
        : '—';
      fragment.push(
        '<button type="button" class="preset-library-card' + (program === selected ? ' is-selected' : '') +
        '" role="option" aria-selected="' + (program === selected ? 'true' : 'false') +
        '" data-preset-program="' + program + '" aria-label="' + escapeText(slotLabel(program) + ' ' + name) + '">' +
          '<span class="preset-library-card-slot">' + slotLabel(program) + '</span>' +
          '<span class="preset-library-card-divider" aria-hidden="true"></span>' +
          '<span class="preset-library-card-name">' + escapeText(name) + '</span>' +
        '</button>'
      );
    }
    cards.innerHTML = fragment.join('');
  }

  function revealSelectedCard() {
    const selected = cards.querySelector('[data-preset-program="' + selectedProgram() + '"]');
    selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function onActivePresetChanged() {
    renderCards();
    if (!page.classList.contains('hidden')) revealSelectedCard();
  }

  cards.addEventListener('click', async event => {
    const card = event.target.closest('[data-preset-program]');
    if (!card) return;
    const program = Number(card.dataset.presetProgram);
    if (!Number.isInteger(program) || program < 0 || program > 127) return;
    const selectHardwareSlot = window.selectHardwareSlot;
    if (typeof selectHardwareSlot !== 'function') {
      if (scanStatus) scanStatus.textContent = 'Hardware slot selection is unavailable.';
      return;
    }
    card.disabled = true;
    try {
      // Reuse the existing two-way hardware slot selection; do not maintain a second local slot state.
      await selectHardwareSlot(program, false);
      // Only announce a destination after the existing slotLabel confirms the selection resolved.
      if (currentHardwareSlot() === program) {
        window.dispatchEvent(new CustomEvent('mg30-preset-library-target-selected', {
          detail: { program }
        }));
      } else if (scanStatus) {
        scanStatus.textContent = 'The hardware slot has not changed. Wait for synchronization, then try again.';
      }
    } finally {
      card.disabled = false;
      renderCards();
    }
  });

  async function readStoredName(program) {
    if (typeof window.readSysExPart !== 'function') throw new Error('Preset slot reader is unavailable.');
    // Keep the exact 0B/02 scene-0 reply: it contains the name and becomes
    // the first scene in the complete Export All cache record.
    for (let attempt = 0; attempt < 2; attempt++) {
      const body = await window.readSysExPart(0x0b, program, 0);
      if (Number(body?.[5]) !== program || Number(body?.[6]) !== 0) continue;
      return { name: readPresetName(body), sceneReply0: Uint8Array.from(body) };
    }
    throw new Error('The response for slot ' + slotLabel(program) + ' did not match the request.');
  }

  function showScanToast(result) {
    const messages = {
      selesai: 'Preset list updated',
      gagal: 'Could not update preset list',
      ditunda: 'Preset list update postponed'
    };
    if (typeof window.toast === 'function') window.toast(messages[result], 2200);
  }

  async function scanMissingNames() {
    if (scanPromise) return scanPromise;
    const bridge = window.MG30PresetExportBridge;
    const exportCache = window.MG30PresetManagerCache;
    const captureSlot = window.MG30PresetManagerCaptureScanSlot;
    const canWarmExportCache = Boolean(exportCache && typeof captureSlot === 'function');
    const nativeStartupPending = Boolean(window.NUXNativeMidi?.available &&
      window.NUXNAMTransfer?.readMG30NAMSlotNames &&
      window.MG30NativeStartupSyncComplete !== true);
    if (nativeStartupPending) {
      if (scanStatus) scanStatus.textContent = 'Menunggu sinkronisasi NAM dan IR Collection selesai…';
      return;
    }
    if (!canWarmExportCache && Object.keys(names).length >= 128) return;
    if (!bridge?.isConnected?.()) {
      showScanToast('ditunda');
      return;
    }
    if (activeDeviceOperation()) {
      showScanToast('ditunda');
      return;
    }

    scanPromise = (async () => {
      let completedNames = Object.keys(names).length;
      let completedCache = exportCache?.getStatus?.().freshCount || 0;
      let deferred = false;
      let pollingWasStopped = false;
      try {
        window.MG30PresetManagerSyncBusy = true;
        if (typeof window.stopHardwareStatePolling === 'function') {
          window.stopHardwareStatePolling();
          pollingWasStopped = true;
        }
        for (let program = 0; program < 128; program++) {
          const nameExists = Object.prototype.hasOwnProperty.call(names, program);
          const cached = exportCache?.get?.(program) || null;
          if (cached) {
            if (!nameExists) {
              names[program] = readPresetName(cached.sceneReplies[0]);
              completedNames++;
            }
            continue;
          }
          if (nameExists && !canWarmExportCache) continue;
          if (activeDeviceOperation(true)) {
            deferred = true;
            throw new Error('Sinkronisasi ditunda karena operasi perangkat lain dimulai.');
          }

          const label = slotLabel(program);
          if (scanStatus) {
            scanStatus.textContent = canWarmExportCache
              ? 'Sinkronisasi Preset Manager · ' + label + ' · cache lengkap ' + completedCache + '/128'
              : 'Membaca nama preset · ' + label;
          }
          const stored = await readStoredName(program);
          names[program] = stored.name;
          if (!nameExists) completedNames++;

          if (canWarmExportCache) {
            await captureSlot(program, stored.sceneReply0, progress => {
              const phase = progress?.phase || 'Melengkapi data preset';
              const part = Number(progress?.completed) || 0;
              const total = Number(progress?.total) || 0;
              if (scanStatus) {
                scanStatus.textContent = 'Preset Manager · ' + label + ' · ' + phase +
                  (total ? ' · ' + part + '/' + total : '');
              }
            });
            completedCache = exportCache.getStatus().freshCount;
          }

          if (completedNames % 4 === 0 || program === 127) {
            try { localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(names)); } catch {}
            renderCards();
          }
        }
        try { localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(names)); } catch {}
        renderCards();
        if (canWarmExportCache) {
          const status = exportCache.getStatus();
          if (!status.complete) throw new Error('Cache manager lengkap ' + status.freshCount + '/128 preset; ekspor belum boleh dianggap siap.');
          if (scanStatus) scanStatus.textContent = 'Preset Manager tersinkron · 128/128 preset · cache Export All siap.';
        } else if (scanStatus) {
          scanStatus.textContent = 'Daftar nama preset tersinkron.';
        }
        showScanToast('selesai');
      } catch (error) {
        try { localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(names)); } catch {}
        console.warn('[Preset Library] Manager scan stopped:', error);
        if (scanStatus) scanStatus.textContent = 'Sinkronisasi tertunda · cache ' +
          (exportCache?.getStatus?.().freshCount || 0) + '/128 · ' + (error?.message || String(error));
        renderCards();
        showScanToast(deferred || activeDeviceOperation(true) ? 'ditunda' : 'gagal');
      } finally {
        window.MG30PresetManagerSyncBusy = false;
        scanPromise = null;
        if (pollingWasStopped && typeof window.startHardwareStatePolling === 'function') {
          window.startHardwareStatePolling();
        }
      }
    })();
    return scanPromise;
  }

  // When a device connects while Presets is already open, start the deferred name scan.
  window.addEventListener('mg30-midi-connected', () => {
    if (!page.classList.contains('hidden')) void scanMissingNames();
  });
  window.addEventListener('mg30-ir-collection-sync-complete', () => {
    if (!page.classList.contains('hidden')) void scanMissingNames();
  });

  // Device -> app: the existing app dispatches this event whenever its hardware slot state changes.
  window.addEventListener('mg30-active-preset-changed', onActivePresetChanged);
  window.addEventListener('mg30-preset-import-target-changed', onActivePresetChanged);

  // Keep Import's existing file-selection and transfer handlers intact; only reveal its compact action row.
  importInput?.addEventListener('change', () => {
    importBar?.classList.toggle('has-file', Boolean(importInput.files?.length));
    window.setTimeout(resizeCardViewport, 0);
  });

  document.querySelectorAll('.nav button[data-page="presets"]').forEach(button => {
    button.addEventListener('click', () => {
      window.setTimeout(() => {
        if (!page.classList.contains('hidden')) {
          resizeCardViewport();
          renderCards();
          revealSelectedCard();
          void scanMissingNames();
        }
      }, 0);
    });
  });

  renderCards();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPresetLibraryUI, { once: true });
} else {
  initPresetLibraryUI();
}
