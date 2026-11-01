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
    const tonePane = $('namIrTonePane');
    if (!page || !toolsFrame || !irContent || !tonePane) return false;
    if ($('namModelLibrary')) return true;

    const panel = document.createElement('section');
    panel.id = 'namModelLibrary';
    panel.className = 'nam-model-library-panel';
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

    // Direct page child: the IR layout owns four ordered rows (hero, tools, library, Collection).
    page.insertBefore(panel, irContent);
    const content = $('namModelLibraryContent');
    const empty = $('namModelLibraryEmpty');
    const headerToggle = $('namModelLibraryToggle');

    let observedCatalogue = null;
    let catalogueObserver = null;
    let tonePaneObserver = null;

    function setText(node, value) {
      if (node && node.textContent !== value) node.textContent = value;
    }

    function syncPanel() {
      const catalogue = $('t3kToneDetails');
      const stateButton = $('t3kCatalogueToggle');
      const list = $('t3kModelList');

      if (catalogue && !content.contains(catalogue)) {
        // Stop the mount watcher before reparenting; avoid observing our own move.
        tonePaneObserver?.disconnect();
        content.appendChild(catalogue);
      }

      const ready = Boolean(catalogue && !catalogue.hidden && list);
      const countText = $('t3kCatalogueCount')?.textContent?.trim() || '0 MODELS';
      const count = countText.replace(/\s+MODELS?$/i, '').trim() || '0';
      const toneName = $('t3kCatalogueTitle')?.textContent?.trim() || '';
      const metaText = ready
        ? count + ' model' + (count === '1' ? '' : 's') + ' · ' + (toneName || 'TONE3000')
        : 'Pilih tone untuk memuat model';

      // The library header stays visible independently of the inner catalogue's hidden state.
      if (panel.hidden) panel.hidden = false;
      setText($('namModelLibraryMeta'), metaText);

      const expanded = ready
        ? stateButton?.getAttribute('aria-expanded') === 'true'
        : localExpanded;
      if (panel.classList.contains('is-expanded') !== expanded) {
        panel.classList.toggle('is-expanded', expanded);
      }
      const ariaExpanded = String(expanded);
      if (headerToggle.getAttribute('aria-expanded') !== ariaExpanded) {
        headerToggle.setAttribute('aria-expanded', ariaExpanded);
      }
      setText(headerToggle, expanded ? 'Hide⌃' : 'Show⌄');
      if (content.hidden === expanded) content.hidden = !expanded;
      if (empty.hidden !== ready) empty.hidden = ready;

      if (catalogue && catalogue !== observedCatalogue) {
        catalogueObserver?.disconnect();
        observedCatalogue = catalogue;
        catalogueObserver = new MutationObserver(syncPanel);
        // Observe only the existing catalogue subtree. Never watch the entire page:
        // changing a header text node from inside a page-wide observer can self-trigger forever.
        catalogueObserver.observe(catalogue, {
          attributes: true,
          attributeFilter: ['hidden', 'class'],
          childList: true,
          characterData: true,
          subtree: true
        });
      }
      return ready;
    }

    headerToggle.addEventListener('click', () => {
      const catalogue = $('t3kToneDetails');
      const stateButton = $('t3kCatalogueToggle');
      if (catalogue && !catalogue.hidden && stateButton) {
        // Delegate to TONE3000's original handler to preserve saved expansion state.
        stateButton.click();
      } else {
        localExpanded = !localExpanded;
      }
      syncPanel();
    });

    // TONE3000 mounts its panel into this dedicated pane after ir-transfer initializes.
    // Observe only this pane until the catalogue is found; disconnect before moving it.
    tonePaneObserver = new MutationObserver(() => {
      if ($('t3kToneDetails')) {
        syncPanel();
        tonePaneObserver?.disconnect();
      }
    });
    tonePaneObserver.observe(tonePane, { childList: true, subtree: true });

    // Handle a cached catalogue that was restored before this UI controller mounted.
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
