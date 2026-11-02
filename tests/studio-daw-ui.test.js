import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../www/studio-daw.css', import.meta.url), 'utf8');
const core = readFileSync(new URL('../www/studio-daw-core.js', import.meta.url), 'utf8');

test('Studio keeps Jam, Record and DAW as separate mode panels', () => {
  assert.match(html, /data-studio-mode="jam"/);
  assert.match(html, /data-studio-mode="record"/);
  assert.match(html, /data-studio-mode="daw"/);
  assert.match(html, /data-studio-mode-panel="jam"/);
  assert.match(html, /data-studio-mode-panel="record"/);
  assert.match(html, /data-studio-mode-panel="daw"/);
});

test('DAW keeps its four tracks, transport and export controls', () => {
  for (const id of ['dawTrackList', 'dawMixer', 'dawPlay', 'dawStop', 'dawRecord', 'dawExportStems', 'dawExportMix']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing Studio control: ' + id);
  }
  for (const track of ["id: 'backing', name: 'Backing'", "id: 'guitar', name: 'Guitar'", "id: 'bass', name: 'Bass'", "id: 'vocals', name: 'Vocals'"]) {
    assert.ok(core.includes(track), 'missing DAW track definition: ' + track);
  }
  assert.match(html, /id="dawStemDialog"/);
});

test('project title, actions and saved project selector use a compact grouped layout', () => {
  assert.match(html, /class="daw-project-main"/);
  assert.match(html, /class="daw-project-actions"/);
  assert.match(html, /id="dawSavedProjects"/);
  assert.ok(css.includes('#page-studio .daw-project-main'));
  assert.ok(css.includes('#page-studio .daw-project-actions'));
});

test('mobile DAW toolbar wraps into a tidy two-row grid instead of clipping Snap', () => {
  assert.ok(css.includes('grid-template-columns:repeat(6,minmax(0,1fr))'));
  assert.ok(css.includes('daw-session-toolbar label:nth-child(5)'));
});

test('track settings and project/export tools start collapsed to keep all four lanes in view', () => {
  assert.match(html, /<details class="daw-collapse-panel"><summary>Track settings/);
  assert.match(html, /<details class="daw-collapse-panel"><summary>Project &amp; export/);
  assert.match(html, /class="daw-quick-takes"/);
});
