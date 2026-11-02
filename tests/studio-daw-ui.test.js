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
  assert.ok(html.includes('<h2>Studio</h2>'));
  assert.ok(!html.includes('Jam · Quick Record · Mini DAW'));
  assert.ok(css.includes('#page-studio .studio-daw-hero h2{'));
  assert.ok(css.includes('font-size:19px!important'));
  assert.ok(css.includes('min-height:29px!important'));
});

test('DAW transport remains sticky and opens the mixer/settings control dialog', () => {
  assert.ok(html.includes('class="daw-sticky-transport" data-studio-mode-panel="daw"'));
  for (const id of ['dawPlay', 'dawStop', 'dawRecord', 'dawRewind', 'dawOpenControl', 'dawControlDialog', 'dawCloseControl']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing sticky transport/control: ' + id);
  }
  assert.ok(html.includes('id="dawMixer"'));
  assert.ok(html.includes('class="daw-control-group"'));
  assert.ok(css.includes('.daw-sticky-transport[hidden]{display:none!important}'));
});

test('four timeline lanes use one global playhead and consistent fixed-height track rows', () => {
  assert.ok(daw.includes('dawGlobalPlayhead'));
  assert.ok(!daw.includes('<span class="daw-playhead"></span>'));
  assert.ok(css.includes('#page-studio .daw-track-row{'));
  assert.ok(css.includes('height:82px!important'));
  assert.ok(css.includes('#page-studio .daw-global-playhead{'));
});

test('track record control is represented by a circular indicator instead of ARM text', () => {
  assert.ok(daw.includes('class="daw-track-record'));
  assert.ok(css.includes('#page-studio .daw-track-actions .daw-track-record{'));
  assert.ok(css.includes('border-radius:50%!important'));
  assert.ok(!daw.includes('>ARM</button>'));
});

test('clip edges expose non-destructive trim handles and individual fade controls', () => {
  for (const value of ['data-clip-edge="start"', 'data-clip-edge="end"', 'data-clip-fade="in"', 'data-clip-fade="out"']) {
    assert.ok(daw.includes(value), 'missing clip edit affordance: ' + value);
  }
  for (const value of ['trimClipStart(', 'trimClipEnd(', 'splitClipAt(', 'clipFadeGainAt(']) {
    assert.ok(daw.includes(value), 'missing non-destructive edit function: ' + value);
  }
  for (const value of ['.daw-clip-edge{', '.daw-clip-fade-in{', '.daw-clip-fade-out{']) {
    assert.ok(css.includes(value), 'missing clip editing style: ' + value);
  }
});

test('clip fade envelope is applied to live playback and offline WAV rendering', () => {
  assert.ok(daw.includes('connectClipWithFade(context, source, clip, elapsedIntoClip, available'));
  assert.ok(daw.includes('connectClipWithFade(context, source, clip, offsetIntoClip, playbackDuration'));
});
