import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  extractMG30A2LiteWeights,
  buildMG30A2LiteTransferPlan,
  sendMG30A2LiteTransfer,
  safeMG30SlotLabel
} from './nam-transfer.js';

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const NativeMidi = registerPlugin('MG30Midi');
  const Native = () => Capacitor.isNativePlatform();
  const MAX_FILE_BYTES = 20 * 1024 * 1024;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function bytesToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function formatBytes(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function formatDate(value) {
    const date = new Date(Number(value) || 0);
    return Number.isNaN(date.getTime()) || !value ? 'Saved locally' :
      'Saved ' + date.toLocaleDateString();
  }

  function initNamModelLibrary() {
    const page = $('page-nam');
    const toolsFrame = page?.querySelector(':scope > .nam-ir-tools-frame');
    const namPane = $('namIrNamPane');
    const legacyPanel = $('namImportTransferPanel');
    if (!page || !toolsFrame || !namPane || !legacyPanel) return false;
    if ($('namModelLibrary')) return true;

    legacyPanel.hidden = true;
    legacyPanel.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('section');
    panel.id = 'namModelLibrary';
    panel.className = 'nam-library-panel';
    panel.innerHTML = `
      <header class="nam-library-head">
        <div class="nam-library-heading">
          <strong>NAM Library</strong>
          <small id="namLibraryMeta">Loading saved models…</small>
        </div>
        <div class="nam-library-head-actions">
          <button id="namLibraryRefresh" type="button">Refresh</button>
          <button id="namLibraryAdd" class="primary" type="button">Add NAM File</button>
        </div>
      </header>
      <div id="namLibraryStatus" class="nam-library-status" role="status" aria-live="polite">
        Your downloaded and manually added NAM files stay in this device's app storage.
      </div>
      <div id="namLibraryList" class="nam-library-list">
        <div class="nam-library-empty">Loading NAM Library…</div>
      </div>
      <input id="namLibraryFileInput" class="hidden" type="file"
        accept=".nam,.namb,application/json,application/octet-stream">
    `;
    namPane.insertBefore(panel, legacyPanel);

    const list = $('namLibraryList');
    const meta = $('namLibraryMeta');
    const status = $('namLibraryStatus');
    const addButton = $('namLibraryAdd');
    const refreshButton = $('namLibraryRefresh');
    const fileInput = $('namLibraryFileInput');

    function setStatus(message, kind = '') {
      status.textContent = String(message || '');
      status.classList.toggle('is-error', kind === 'error');
      status.classList.toggle('is-success', kind === 'success');
    }

    function renderFiles(files) {
      const rows = Array.isArray(files) ? files : [];
      meta.textContent = rows.length + ' saved model' + (rows.length === 1 ? '' : 's') + ' · Local storage';
      if (!rows.length) {
        list.innerHTML = '<div class="nam-library-empty">No NAM files saved yet. Download a model from TONE3000 or add a .nam/.namb file from this device.</div>';
        return;
      }
      list.innerHTML = rows.map((file, index) => {
        const fileName = String(file.fileName || 'NAM model');
        const safeName = escapeHtml(fileName);
        const slotOptions = Array.from({ length: 10 }, (_, slot) =>
          '<option value="' + (slot + 1) + '"' + (slot === 0 ? ' selected' : '') + '>Slot ' + (slot + 1) + '</option>'
        ).join('');
        return '<article class="nam-library-item" data-nam-library-file="' + safeName + '">' +
          '<div class="nam-library-item-head"><div class="nam-library-file-icon">NAM</div>' +
          '<div class="nam-library-file-copy"><strong>' + safeName + '</strong>' +
          '<small>' + escapeHtml(formatBytes(file.bytes)) + ' · ' + escapeHtml(formatDate(file.modifiedAt)) + '</small></div>' +
          '<button class="nam-library-delete" type="button" data-nam-delete="' + safeName + '" aria-label="Delete ' + safeName + '">Delete</button></div>' +
          '<button class="nam-library-import" type="button" data-nam-import="' + safeName + '">Import</button>' +
          '<label class="nam-library-slot-row"><span>Target Slot</span><select data-nam-slot="' + safeName + '" aria-label="Target slot for ' + safeName + '">' +
          slotOptions + '</select></label></article>';
      }).join('');

      list.querySelectorAll('[data-nam-import]').forEach(button => {
        button.addEventListener('click', () => {
          const fileName = button.dataset.namImport;
          const slot = list.querySelector('[data-nam-slot="' + CSS.escape(fileName) + '"]');
          void importSavedModel(fileName, Number(slot?.value || 0), button);
        });
      });
      list.querySelectorAll('[data-nam-delete]').forEach(button => {
        button.addEventListener('click', () => void deleteSavedModel(button.dataset.namDelete, button));
      });
    }

    async function refreshLibrary() {
      if (!Native()) {
        renderFiles([]);
        setStatus('The persistent NAM Library is available in the Android APK.', 'error');
        addButton.disabled = true;
        refreshButton.disabled = true;
        return;
      }
      refreshButton.disabled = true;
      try {
        const result = await NativeMidi.listModels();
        renderFiles(result?.files || []);
        setStatus('Downloaded and manually added NAM files are stored locally and remain available after restarting the app.');
      } catch (error) {
        list.innerHTML = '<div class="nam-library-empty">Could not read NAM Library.</div>';
        setStatus('Failed to load NAM Library: ' + (error?.message || error), 'error');
      } finally {
        refreshButton.disabled = false;
      }
    }

    async function importSavedModel(fileName, slotNumber, button) {
      if (!Native() || !window.NUXNativeMidi?.connect) {
        setStatus('Import requires the Android APK and a USB OTG connection to MG-30.', 'error');
        return;
      }
      if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 10) {
        setStatus('Select a target slot from 1 to 10.', 'error');
        return;
      }
      if (!window.confirm('Import "' + fileName + '" to MG-30 slot ' + slotNumber +
        '? The existing model in this slot will be overwritten. Back it up first.')) return;

      button.disabled = true;
      button.textContent = 'Importing…';
      const slotSelect = list.querySelector('[data-nam-slot="' + CSS.escape(fileName) + '"]');
      if (slotSelect) slotSelect.disabled = true;
      try {
        setStatus('Reading ' + fileName + ' from NAM Library…');
        const stored = await NativeMidi.readModel({ fileName });
        const modelBytes = base64ToBytes(stored.base64);
        const weightBytes = extractMG30A2LiteWeights(modelBytes);
        const label = safeMG30SlotLabel(fileName);
        const plan = buildMG30A2LiteTransferPlan(weightBytes, label, slotNumber);
        setStatus('A2-Lite validated (' + weightBytes.length.toLocaleString() +
          ' weight bytes). Connecting to MG-30…');
        const connection = await window.NUXNativeMidi.connect();
        const result = await sendMG30A2LiteTransfer(connection, plan, progress => {
          if (progress.stage === 'write') {
            setStatus('Slot ' + slotNumber + ': ACK ' + progress.completed + '/' +
              progress.total + ' · ' + progress.label + '. Do not disconnect USB OTG.');
          } else if (progress.stage === 'retry') {
            setStatus('ACK not received for ' + progress.label + '; retry ' +
              progress.attempt + '. Do not disconnect USB OTG.');
          } else if (progress.stage === 'readback') {
            setStatus('Checking device slot names: pass ' + progress.round + '/2, slot ' +
              progress.slot + '/10…');
          }
        });
        window.dispatchEvent(new CustomEvent('mg30-nam-names-sync', {
          detail: { slots: result.slots, source: 'transfer' }
        }));
        setStatus('Import complete: ' + fileName + ' → slot ' + result.slotNumber +
          '. All ' + result.acknowledgedWriteFrames +
          ' write frames received ACKs and the slot name was verified. The model file remains in NAM Library.',
          'success');
      } catch (error) {
        setStatus('Import failed: ' + (error?.message || error) +
          '. If writing started, check the target slot before retrying.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Import';
        if (slotSelect) slotSelect.disabled = false;
      }
    }

    async function deleteSavedModel(fileName, button) {
      if (!Native()) return;
      if (!window.confirm('Delete "' + fileName + '" from NAM Library? This does not change models already stored in MG-30.')) return;
      button.disabled = true;
      try {
        await NativeMidi.deleteModel({ fileName });
        setStatus('Deleted ' + fileName + ' from NAM Library.', 'success');
        await refreshLibrary();
      } catch (error) {
        setStatus('Could not delete ' + fileName + ': ' + (error?.message || error), 'error');
        button.disabled = false;
      }
    }

    addButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      if (!Native()) {
        setStatus('Adding files to NAM Library requires the Android APK.', 'error');
        return;
      }
      if (!file.size || file.size > MAX_FILE_BYTES) {
        setStatus('The selected file is empty or exceeds the 20 MB limit.', 'error');
        return;
      }
      addButton.disabled = true;
      try {
        const bytes = await file.arrayBuffer();
        extractMG30A2LiteWeights(bytes);
        const result = await NativeMidi.saveModel({
          fileName: file.name,
          base64: bytesToBase64(bytes)
        });
        setStatus('Added ' + result.fileName + ' (' + formatBytes(result.bytes) +
          ') to NAM Library.', 'success');
        await refreshLibrary();
      } catch (error) {
        setStatus('The file was not added: ' + (error?.message || error), 'error');
      } finally {
        addButton.disabled = false;
      }
    });

    refreshButton.addEventListener('click', () => void refreshLibrary());
    window.addEventListener('mg30-nam-library-updated', () => void refreshLibrary());
    void refreshLibrary();
    return true;
  }

  function boot() {
    if (initNamModelLibrary()) return;
    const observer = new MutationObserver(() => {
      if (initNamModelLibrary()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  boot();
})();
