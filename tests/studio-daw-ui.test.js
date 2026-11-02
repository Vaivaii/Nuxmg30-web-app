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

test('track settings and project/export tools are collapsed below the visible mixer', () => {
  assert.match(html, /<details class="daw-bottom-disclosure daw-track-settings-disclosure">/);
  assert.match(html, /<details class="daw-bottom-disclosure daw-project-disclosure">/);
  assert.match(html, /class="daw-quick-takes"/);
  assert.match(html, /id="dawProjectName"/);
});



test('Studio title and three mode tabs follow the approved mockup hierarchy', () => {
  assert.ok(html.includes('<h2>Jamm &amp; Record</h2>'));
  assert.ok(html.includes('Mini DAW – 4 Track'));
  assert.ok(!html.includes('Jam · Quick Record · Mini DAW'));
  assert.ok(css.includes('#page-studio .studio-daw-hero h2{'));
  assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
  assert.ok(css.includes('min-height:42px!important'));
});

test('Studio transport sits below the timeline and mixer is inline/collapsible', () => {
  for (const id of ['dawPlay', 'dawStop', 'dawRecord', 'dawRewind', 'dawForward', 'dawMixer', 'dawMixerDetails', 'dawUndo', 'dawRedo']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing Studio control: ' + id);
  }
  assert.match(html, /<details id="dawMixerDetails" class="daw-mixer-disclosure" open>/);
  assert.ok(!html.includes('dawControlDialog'));
  assert.ok(css.includes('#page-studio .daw-mixer-disclosure:not([open]) .daw-disclosure-chevron'));
  assert.ok(daw.includes("$('dawMixer')?.addEventListener('click', handleTrackClick);"));
});

test('four timeline lanes share one global playhead and uniform lane heights', () => {
  assert.ok(daw.includes('dawGlobalPlayhead'));
  assert.ok(!daw.includes('<span class="daw-playhead"></span>'));
  assert.ok(css.includes('#page-studio .daw-track-row{'));
  assert.ok(css.includes('height:76px!important'));
  assert.ok(css.includes('#page-studio .daw-global-playhead{'));
  assert.ok(css.includes('width:var(--daw-timeline-width,736px)!important'));
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


test('ruler and all four track lanes use one shared horizontal timeline scroller', () => {
  for (const id of ['dawTimelineScroll', 'dawTimelineCanvas', 'dawTrackRail', 'dawTrackList', 'dawRulerInner', 'dawGlobalPlayhead']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing shared timeline element: ' + id);
  }
  assert.ok(daw.includes("const canvas = $('dawTimelineCanvas')"));
  assert.ok(!daw.includes('dawRulerScroll'));
  assert.ok(!daw.includes('data-lane-scroll'));
  assert.ok(css.includes('#page-studio .daw-timeline-canvas'));
  assert.ok(css.includes('var(--daw-bar-width'));
});

test('playhead can be dragged freely and lane clicks seek without snap quantization', () => {
  assert.ok(html.includes('id="dawPlayheadHit"'));
  assert.ok(daw.includes('function startPlayheadDrag(event)'));
  assert.ok(daw.includes('function movePlayheadDrag(event)'));
  assert.ok(daw.includes('function setPlayheadFromClientX(clientX)'));
  assert.ok(!/playheadSeconds = snapTime\(Math\.max\(0, x \/ project\.zoom \* metrics\.barSeconds\), project\)/.test(daw));
});

test('Studio provides project-scoped undo and redo controls with keyboard shortcuts', () => {
  for (const value of ['function historyState()', 'function commitHistoryChange()', 'function applyHistory(direction)', 'function resetHistory()']) {
    assert.ok(daw.includes(value), 'missing undo/redo implementation: ' + value);
  }
  assert.ok(daw.includes("event.key.toLowerCase() === 'z'"));
  assert.ok(daw.includes("event.key.toLowerCase() === 'y'"));
  assert.ok(css.includes('#page-studio .daw-history-tools button:disabled'));
});

test('approved Studio mockup hierarchy is present and the bottom navigation stays in the app shell', () => {
  assert.ok(html.includes('Jamm &amp; Record'));
  assert.ok(html.includes('Mini DAW – 4 Track'));
  assert.ok(html.includes('Project: <strong id="dawProjectSummary">'));
  assert.ok(html.includes('id="dawMixerDetails"'));
  assert.ok(html.includes('id="page-device"'));
  assert.ok(html.includes('id="page-studio"'));
});


test('Undo and Redo are tucked inside the mockup three-dot options control', () => {
  assert.match(html, /<details class="daw-more-menu">/);
  assert.match(html, /aria-label="More Studio options"/);
  assert.match(html, /id="dawUndo"/);
  assert.match(html, /id="dawRedo"/);
  assert.ok(css.includes('#page-studio .daw-more-menu>summary'));
});

test('imported audio and Quick Record takes are undoable Studio edits', () => {
  assert.match(daw, /commitHistoryChange\(\);\s*await saveProject\(false\);/);
  assert.ok(daw.includes('async function importQuickTake('));
  assert.ok(daw.includes('await addAudioBlobToTrack(blob, trackId, take.fileName, startAt, take);'));
});

test('playhead auto-follows during playback while the left track rail remains separate', () => {
  assert.ok(daw.includes('function followPlayheadDuringPlayback()'));
  assert.ok(daw.includes('followPlayheadDuringPlayback();'));
  assert.ok(html.includes('id="dawTimelineScroll"'));
  assert.ok(css.includes('#page-studio .daw-track-rail-column'));
});


test('timeline grid is offset to align beat/bar boundaries with ruler marks', () => {
  assert.ok(css.includes('background-position:1px 0!important'));
  assert.ok(css.includes('var(--daw-beat-width,23px)'));
  assert.ok(css.includes('var(--daw-bar-width,92px)'));
});


test('timeline canvas extends as the playhead advances beyond the initial bars', () => {
  assert.ok(daw.includes('const playheadBars = Math.ceil(Math.max(0, playheadSeconds) / barSeconds) + 2;'));
  assert.ok(daw.includes('ruler.children.length < metrics.bars'));
  assert.ok(daw.includes("lane.style.width = metrics.width + 'px'"));
});


test('Jam and Record modes explicitly hide the entire DAW workspace', () => {
  assert.ok(js.includes("studio?.querySelectorAll(':scope > [data-studio-mode-panel]')"));
  assert.ok(js.includes("panel.style.setProperty('display', active ? (panel.id === 'studio-daw-workspace' ? 'grid' : 'block') : 'none', 'important')"));
  assert.ok(css.includes('#page-studio #studio-daw-workspace[hidden]{display:none!important}'));
});

test('transport is sticky and Mixer opens upward as a bounded overlay', () => {
  assert.ok(css.includes('position:sticky!important;'));
  assert.ok(css.includes('bottom:calc(86px + env(safe-area-inset-bottom,0px))'));
  assert.ok(css.includes('#page-studio .daw-mixer-disclosure[open] #dawMixer'));
  assert.ok(css.includes('bottom:calc(100% + 8px)!important'));
  assert.ok(css.includes('overflow-y:auto!important'));
});

test('mixer channel strip has a dedicated pan readout row below its fader', () => {
  assert.ok(css.includes('grid-template-rows:22px 13px 8px 42px minmax(70px,1fr) 12px 26px!important'));
  assert.ok(css.includes('#page-studio .daw-mixer-pan-readout'));
  assert.ok(css.includes('white-space:nowrap!important'));
});

test('all four track rails fill the label column and expose arm, mute, solo and import', () => {
  assert.ok(!js.includes("track.id === 'backing'"));
  assert.ok(css.includes('#page-studio .daw-track-head{'));
  assert.ok(css.includes('width:100%!important'));
  assert.ok(css.includes('overflow:visible!important'));
  assert.ok(js.includes('data-track-action="import"'));
  assert.ok(js.includes('data-track-action="arm"'));
});

test('Backing can be armed and recorded through the existing MG-30 USB route', () => {
  assert.ok(!js.includes("track.id === 'backing'"));
  assert.ok(js.includes('const track = project.tracks.find((item) => item.armed);'));
  assert.ok(js.includes('const recorder = window.NUXStudioRecorder;'));
});

test('playhead drag uses a wide full-height hit target and pointer capture', () => {
  assert.ok(js.includes("$('dawGlobalPlayhead')?.addEventListener('pointerdown', startPlayheadDrag);"));
  assert.ok(css.includes('width:28px!important'));
  assert.ok(css.includes('touch-action:none!important'));
});
