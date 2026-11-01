/* Dedicated NAM Model Library panel.
   Presentation-only: reuse TONE3000's existing catalogue state and click handler. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);

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
    panel.hidden = true;
    panel.innerHTML = `
      <header class="nam-model-library-head">
        <span class="nam-model-library-heading">
          <strong>Downloaded / Available NAM</strong>
          <small id="namModelLibraryMeta">Belum ada model yang dimuat</small>
        </span>
        <button id="namModelLibraryToggle" class="nam-model-library-toggle" type="button"
          aria-expanded="false" aria-controls="namModelLibraryContent">Show⌄</button>
      </header>
      <div id="namModelLibraryContent" class="nam-model-library-content" hidden></div>
    `;

    // Keep the library in normal page flow between the TONE3000 controls and Collection.
    page.insertBefore(panel, irContent);
    const content = $('namModelLibraryContent');
    const headerToggle = $('namModelLibraryToggle');

    let observedCatalogue = null;
    let catalogueObserver = null;

    function syncPanel() {
      const catalogue = $('t3kToneDetails');
      if (catalogue && !content.contains(catalogue)) {
        content.appendChild(catalogue);
      }
      if (!catalogue) {
        panel.hidden = true;
        return;
      }

      const stateButton = $('t3kCatalogueToggle');
      const expanded = stateButton?.getAttribute('aria-expanded') === 'true';
      const countText = $('t3kCatalogueCount')?.textContent?.trim() || '0 MODELS';
      const count = countText.replace(/\s+MODELS?$/i, '').trim() || '0';
      const toneName = $('t3kCatalogueTitle')?.textContent?.trim() || 'TONE3000';
      const meta = $('namModelLibraryMeta');

      panel.hidden = Boolean(catalogue.hidden);
      panel.classList.toggle('is-expanded', expanded);
      headerToggle.setAttribute('aria-expanded', String(expanded));
      headerToggle.textContent = expanded ? 'Hide⌃' : 'Show⌄';
      content.hidden = !expanded;
      if (meta) meta.textContent = count + ' model' + (count === '1' ? '' : 's') + ' · ' + toneName;

      if (catalogue !== observedCatalogue) {
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
      const stateButton = $('t3kCatalogueToggle');
      if (!stateButton) return;
      // Delegate to TONE3000's original state handler so localStorage and catalogue
      // selection persistence continue to behave exactly as before.
      stateButton.click();
      syncPanel();
    });

    // TONE3000 mounts its panel before this module normally runs. Keep a narrow observer
    // for delayed/recreated catalogues without observing unrelated IR slot updates.
    const mountObserver = new MutationObserver(syncPanel);
    mountObserver.observe(tonePane, { childList: true, subtree: true });
    syncPanel();
    return true;
  }

  function boot() {
    if (initNamModelLibrary()) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    }
  }

  boot();
})();
