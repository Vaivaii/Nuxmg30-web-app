const $ = id => document.getElementById(id);
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
    throw new Error('Data slot preset tidak lengkap.');
  }
  let name = '';
  for (let index = 0; index < 16; index++) {
    const code = window.bitSlot(body, 106 + index);
    if (code === 0) break;
    if (code < 0x20 || code > 0x7e) throw new Error('Nama preset berisi karakter yang tidak dapat ditampilkan.');
    name += String.fromCharCode(code);
  }
  return name.trimEnd();
}

function activeDeviceOperation() {
  if (window.MG30PresetImportBusy || window.MG30PresetExportBusy || window.MG30IRTransferBusy) return true;
  if ($('readNamSlotsBtn')?.dataset.busy === '1') return true;
  const status = String($('deviceStatus')?.textContent || '');
  return /Menyimpan:|Menyimpan preset|Copy Scene:|Menulis bagian|Impor preset:|menunggu antrean MIDI/i.test(status);
}

function initPresetLibraryUI() {
  const page = $('page-presets');
  const cards = $('presetLibraryCards');
  const scanStatus = $('presetLibraryScanStatus');
  const importBar = $('presetLibraryImportBar');
  const importInput = $('presetImportFile');
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
      showExportFeedback(title, '', 'error', 0, 1900);
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
      if (scanStatus) scanStatus.textContent = 'Sinkronisasi slot perangkat tidak tersedia.';
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
        scanStatus.textContent = 'Slot tujuan belum berubah. Tunggu sinkronisasi perangkat, lalu pilih kembali.';
      }
    } finally {
      card.disabled = false;
      renderCards();
    }
  });

  async function readStoredName(program) {
    if (typeof window.readSysExPart !== 'function') throw new Error('Pembaca slot preset tidak tersedia.');
    // 0B/00 is the existing read-only stored-preset path already used by device read-back.
    // Read one scene part only; this does not send Program Change or write to the pedal.
    for (let attempt = 0; attempt < 2; attempt++) {
      const body = await window.readSysExPart(0x0b, program, 0);
      if (Number(body?.[5]) !== program || Number(body?.[6]) !== 0) continue;
      return readPresetName(body);
    }
    throw new Error('Balasan slot ' + slotLabel(program) + ' tidak cocok dengan permintaan.');
  }

  async function scanMissingNames() {
    if (scanPromise) return scanPromise;
    if (Object.keys(names).length >= 128) return;
    const bridge = window.MG30PresetExportBridge;
    if (!bridge?.isConnected?.()) return;
    if (activeDeviceOperation()) {
      if (scanStatus) scanStatus.textContent = 'Tunggu operasi perangkat selesai, lalu buka kembali Preset Manager.';
      return;
    }

    scanPromise = (async () => {
      let completed = Object.keys(names).length;
      try {
        for (let program = 0; program < 128; program++) {
          if (Object.prototype.hasOwnProperty.call(names, program)) continue;
          if (activeDeviceOperation()) {
            throw new Error('Operasi perangkat lain dimulai; pembacaan dihentikan dengan aman.');
          }
          const name = await readStoredName(program);
          names[program] = name;
          completed++;
          if (completed % 4 === 0 || completed === 128) {
            try { localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(names)); } catch {}
            renderCards();
            if (scanStatus) scanStatus.textContent = 'Membaca nama preset ' + completed + '/128…';
          }
        }
        try { localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(names)); } catch {}
        if (scanStatus) scanStatus.textContent = '';
        renderCards();
      } catch (error) {
        try { localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(names)); } catch {}
        if (scanStatus) scanStatus.textContent =
          'Pembacaan berhenti di ' + completed + '/128. Buka kembali tab Preset untuk melanjutkan.';
        console.warn('[Preset Library] Name scan stopped:', error);
        renderCards();
      } finally {
        scanPromise = null;
      }
    })();
    return scanPromise;
  }

  // Device -> app: the existing app dispatches this event whenever its hardware slot state changes.
  window.addEventListener('mg30-active-preset-changed', onActivePresetChanged);
  window.addEventListener('mg30-preset-import-target-changed', onActivePresetChanged);

  // Keep Import's existing file-selection and transfer handlers intact; only reveal its compact action row.
  importInput?.addEventListener('change', () => {
    importBar?.classList.toggle('has-file', Boolean(importInput.files?.length));
  });

  document.querySelectorAll('.nav button[data-page="presets"]').forEach(button => {
    button.addEventListener('click', () => {
      window.setTimeout(() => {
        if (!page.classList.contains('hidden')) {
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
