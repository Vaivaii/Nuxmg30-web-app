/* Dedicated NAM Model Library panel.
   Presentation-only: reuse TONE3000's existing catalogue state and click handler. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let localExpanded = false;

  function initNamModelLibrary() {
    const page = $('page-nam');
    const toolsFrame = page?.querySelector(':scope > .nam-ir-tools-frame');
    const irContent = $('ir-import-content');
    if (!page || !toolsFrame || !irContent) return false;
    if ($('namModelLibrary')) return true;

    const panel = document.createElement('section');
    panel.id = 'namModelLibrary';
    panel.className = 'nam-model-library-panel';
    panel.hidden = false;
    panel.innerHTML = `
      <header class="nam-model-library-head">
        <span class="nam-model-library-heading">
          <strong>Downloaded / Available NAM</strong>
          <small id="namModelLibraryMeta">Pilih tone untuk memuat model</small>
        </span>
        <button id="namModelLibraryToggle" class="nam-model-library-toggle" type="button"
          aria-expanded="false" aria-controls="namModelLibraryContent">Show⌄</button>
      </header>
      <div id="namModelLibraryContent" class="nam-model-library-content" hidden>
        <div id="namModelLibraryEmpty" class="nam-model-library-empty">
          Pilih tone dari TONE3000 untuk menampilkan model NAM di sini.
        </div>
      </div>
    `;

    // Normal page-flow order: controls -> model library -> IR Collection.
    page.insertBefore(panel, irContent);
    const content = $('namModelLibraryContent');
    const empty = $('namModelLibraryEmpty');
    const headerToggle = $('namModelLibraryToggle');

    let observedCatalogue = null;
    let catalogueObserver = null;

    function syncPanel() {
      const catalogue = $('t3kToneDetails');
      if (catalogue && !content.contains(catalogue)) {
        content.appendChild(catalogue);
      }

      const stateButton = $('t3kCatalogueToggle');
      const list = $('t3kModelList');
      const catalogueReady = Boolean(catalogue && !catalogue.hidden && list);
      const countText = $('t3kCatalogueCount')?.textContent?.trim() || '0 MODELS';
      const count = countText.replace(/\s+MODELS?$/i, '').trim() || '0';
      const toneName = $('t3kCatalogueTitle')?.textContent?.trim() || '';
      const meta = $('namModelLibraryMeta');

      // The library header itself must never inherit the catalogue's hidden state.
      panel.hidden = false;
      if (meta) {
        meta.textContent = catalogueReady
          ? count + ' model' + (count === '1' ? '' : 's') + ' · ' + (toneName || 'TONE3000')
          : 'Pilih tone untuk memuat model';
      }

      const expanded = catalogueReady
        ? (stateButton?.getAttribute('aria-expanded') === 'true')
        : localExpanded;
      panel.classList.toggle('is-expanded', expanded);
      headerToggle.setAttribute('aria-expanded', String(expanded));
      headerToggle.textContent = expanded ? 'Hide⌃' : 'Show⌄';
      content.hidden = !expanded;
      empty.hidden = catalogueReady;

      if (catalogue && catalogue !== observedCatalogue) {
        catalogueObserver?.disconnect();
        observedCatalogue = catalogue;
        catalogueObserver = new MutationObserver(syncPanel);
        catalogueObserver.observe(catalogue, {
          attributes: true,
          attributeFilter: ['hidden', 'class', 'aria-expanded'],
          childList: true,
          characterData: true,
          subtree: true
        });
      }
    }

    headerToggle.addEventListener('click', () => {
      const catalogue = $('t3kToneDetails');
      const stateButton = $('t3kCatalogueToggle');
      if (catalogue && !catalogue.hidden && stateButton) {
        // Preserve TONE3000's original state handler and localStorage persistence.
        stateButton.click();
      } else {
        localExpanded = !localExpanded;
      }
      syncPanel();
    });

    // Watch the NAM page because TONE3000 can mount/recreate its catalogue after this panel.
    const mountObserver = new MutationObserver(syncPanel);
    mountObserver.observe(page, { childList: true, subtree: true });
    syncPanel();
    return true;
  }

  function boot() {
    if (initNamModelLibrary()) return;
    // ir-transfer.js creates the tools frame at runtime; wait until it exists.
    const observer = new MutationObserver(() => {
      if (initNamModelLibrary()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  boot();
})();
