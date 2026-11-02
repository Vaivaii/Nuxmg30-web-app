import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../www/studio-daw.css', import.meta.url), 'utf8');
const core = readFileSync(new URL('../www/studio-daw-core.js', import.meta.url), 'utf8');
const daw = readFileSync(new URL('../www/studio-daw.js', import.meta.url), 'utf8');

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


test('Studio title and mode tabs are compact with no redundant subtitle', () => {
  assert.match(html, /<h2>Studio<\\/h2>/);
  assert.doesNotMatch(html, /Jam · Quick Record · Mini DAW/);
  assert.match(css, /studio-daw-hero h2\\{font-size:19px/);
  assert.match(css, /studio-mode-tabs button\\{[\\s\\S]*?min-height:29px/);
});

test('DAW transport remains sticky and opens the mixer/settings control dialog', () => {
  assert.match(html, /class="daw-sticky-transport" data-studio-mode-panel="daw"/);
  for (const id of ['dawPlay', 'dawStop', 'dawRecord', 'dawRewind', 'dawOpenControl', 'dawControlDialog', 'dawCloseControl']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing sticky transport/control: ' + id);
  }
  assert.match(html, /id="dawMixer"/);
  assert.match(html, /class="daw-control-group"/);
  assert.match(css, /\\.daw-sticky-transport\\[hidden\\]\\{display:none!important\\}/);
});

test('four timeline lanes use one global playhead and consistent fixed-height track rows', () => {
  assert.match(daw, /dawGlobalPlayhead/);
  assert.doesNotMatch(daw, /<span class="daw-playhead"><\\/span>/);
  assert.match(css, /\\.daw-track-row\\{[\\s\\S]*?height:82px!important/);
  assert.match(css, /\\.daw-global-playhead\\{/);
});

test('track record control is represented by a circular indicator instead of ARM text', () => {
  assert.match(daw, /class="daw-track-record/);
  assert.match(css, /\\.daw-track-actions \\.daw-track-record\\{[\\s\\S]*?border-radius:50%/);
  assert.doesNotMatch(daw, />ARM<\\/button>/);
});

test('clip edges expose non-destructive trim handles and individual fade controls', () => {
  assert.match(daw, /data-clip-edge="start"/);
  assert.match(daw, /data-clip-edge="end"/);
  assert.match(daw, /data-clip-fade="in"/);
  assert.match(daw, /data-clip-fade="out"/);
  assert.match(daw, /trimClipStart\\(/);
  assert.match(daw, /trimClipEnd\\(/);
  assert.match(daw, /splitClipAt\\(/);
  assert.match(daw, /clipFadeGainAt\\(/);
  assert.match(css, /\\.daw-clip-edge\\{/);
  assert.match(css, /\\.daw-clip-fade-in\\{/);
  assert.match(css, /\\.daw-clip-fade-out\\{/);
});

test('clip fade envelope is applied to live playback and offline WAV rendering', () => {
  assert.match(daw, /connectClipWithFade\\(context, source, clip, elapsedIntoClip, available/);
  assert.match(daw, /connectClipWithFade\\(context, source, clip, offsetIntoClip, playbackDuration/);
});
