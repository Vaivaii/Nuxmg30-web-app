import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../www/studio-daw.css', import.meta.url), 'utf8');
const core = readFileSync(new URL('../www/studio-daw-core.js', import.meta.url), 'utf8');
const daw = readFileSync(new URL('../www/studio-daw.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../www/main.js', import.meta.url), 'utf8');

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

test('Track Settings and Project Settings are grouped on their own DAW page', () => {
  assert.match(html, /<section id="dawTrackSettingsPage"[^>]*>/);
  assert.match(html, /class="daw-settings-section"/);
  assert.match(html, /class="daw-project-settings"/);
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

test('Studio transport remains available and Mixer is rendered on its dedicated page', () => {
  for (const id of ['dawPlay','dawStop','dawRecord','dawRewind','dawForward','dawMixer','dawUndo','dawRedo']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing Studio control: ' + id);
  }
  assert.match(html, /<section id="dawMixerPage"[^>]*>/);
  assert.ok(!html.includes('dawMixerDetails'));
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

test('clip edges expose non-destructive trim handles and fade sliders live in the overflow menu', () => {
  for (const value of ['data-clip-edge="start"', 'data-clip-edge="end"']) {
    assert.ok(daw.includes(value), 'missing clip trim affordance: ' + value);
  }
  for (const value of ['data-toolbar-fade="in"', 'data-toolbar-fade="out"']) {
    assert.ok(html.includes(value), 'missing overflow fade control: ' + value);
  }
  assert.ok(daw.includes("$('dawMoreMenuPanel')?.addEventListener('input'"));
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
  assert.ok(html.includes('id="dawMixerPage"'));
  assert.ok(html.includes('id="dawTrackSettingsPage"'));
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
  assert.ok(daw.includes('inputRoute: track?.inputRoute || \'file\''));
  assert.ok(daw.includes('await addAudioBlobToTrack(blob, trackId, take.fileName, startAt, {'));
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
  assert.ok(daw.includes("studio?.querySelectorAll(':scope > [data-studio-mode-panel]')"));
  assert.ok(daw.includes("panel.style.setProperty('display', active ? (panel.id === 'studio-daw-workspace' ? 'flex' : 'block') : 'none', 'important')"));
  assert.ok(css.includes('#page-studio #studio-daw-workspace[hidden]{display:none!important}'));
});

test('transport and DAW sub-navigation are fixed together without an accordion overlay', () => {
  assert.ok(css.includes('#page-studio #dawStudioDock{'));
  assert.ok(css.includes('position:fixed!important'));
  assert.ok(css.includes('#page-studio .daw-subnav'));
  assert.ok(html.includes('data-daw-page="timeline"'));
  assert.ok(html.includes('data-daw-page="mixer"'));
});

test('mixer channel strip has a dedicated pan readout row below its fader', () => {
  assert.ok(css.includes('grid-template-rows:22px 13px 8px 42px minmax(70px,1fr) 12px 26px!important'));
  assert.ok(css.includes('#page-studio .daw-mixer-pan-readout'));
  assert.ok(css.includes('white-space:nowrap!important'));
});

test('all four track rails fill the label column and expose arm, mute, solo and import', () => {
  assert.ok(!daw.includes("track.id === 'backing'"));
  assert.ok(css.includes('#page-studio .daw-track-head{'));
  assert.ok(css.includes('width:100%!important'));
  assert.ok(css.includes('overflow:visible!important'));
  assert.ok(daw.includes('data-track-action="import"'));
  assert.ok(daw.includes('data-track-action="arm"'));
});

test('Backing can be armed and recorded through the existing MG-30 USB route', () => {
  assert.ok(!daw.includes("track.id === 'backing'"));
  assert.ok(daw.includes('const track = project.tracks.find((item) => item.armed);'));
  assert.ok(daw.includes('const recorder = window.NUXStudioRecorder;'));
});

test('playhead drag uses a wide full-height hit target and pointer capture', () => {
  assert.ok(daw.includes("$('dawGlobalPlayhead')?.addEventListener('pointerdown', startPlayheadDrag);"));
  assert.ok(css.includes('width:28px!important'));
  assert.ok(css.includes('touch-action:none!important'));
});


test('transport and all DAW page tabs share one fixed dock', () => {
  assert.match(html, /<div id="dawStudioDock"[^>]*>[\s\S]*?class="daw-transport-row"[\s\S]*?class="daw-subnav"/);
  assert.ok(css.includes('#page-studio #dawStudioDock{'));
  assert.ok(css.includes('position:fixed!important'));
});

test('Mixer has a full-page channel layout with usable vertical faders', () => {
  assert.ok(css.includes('#page-studio #dawMixerPage #dawMixer'));
  assert.ok(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))!important'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-fader'));
  assert.ok(css.includes('min-height:140px!important'));
});

test('transport is part of the fixed bottom dock above internal DAW navigation', () => {
  assert.ok(css.includes('#page-studio #dawStudioDock .daw-transport-row'));
  assert.ok(css.includes('position:relative!important'));
  assert.ok(css.includes('.daw-subnav button.active'));
});

test('Timeline page restores full-height track lanes and aligned rail', () => {
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-track-list'));
  assert.ok(css.includes('grid-template-rows:repeat(4,minmax(68px,1fr))!important'));
  assert.ok(css.includes('min-height:68px!important'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-track-head'));
});


test('Timeline rail and lane rows use the same flexible height below the ruler', () => {
  assert.ok(css.includes('grid-template-rows:31px minmax(0,1fr)!important'));
  assert.ok(css.includes('grid-template-rows:repeat(4,minmax(68px,1fr))!important'));
  assert.ok(css.includes('row-gap:0!important'));
});


test('playhead visual position is driven by the live playhead coordinate', () => {
  assert.ok(daw.includes("playhead.style.setProperty('--daw-playhead-x', left + 'px')"));
  assert.ok(css.includes('left:var(--daw-playhead-x,0px)!important'));
  assert.ok(daw.includes('followPlayheadDuringPlayback();'));
});

test('playhead drag converts screen coordinates through the shared scroller offset', () => {
  assert.ok(daw.includes("const scroller = $('dawTimelineScroll')"));
  assert.ok(daw.includes('const contentX = viewportX + scroller.scrollLeft;'));
  assert.ok(daw.includes("playheadDragPointerId = event.pointerId"));
  assert.ok(css.includes('width:32px!important'));
  assert.ok(css.includes('pointer-events:auto!important'));
  assert.ok(css.includes('touch-action:none!important'));
});

test('Studio dock is fixed to the lower viewport and removed from normal timeline flow', () => {
  assert.ok(css.includes('position:fixed!important'));
  assert.ok(css.includes('left:50%!important'));
  assert.ok(css.includes('bottom:calc(50px + env(safe-area-inset-bottom,0px))!important'));
  assert.ok(css.includes('width:min(calc(100vw - 20px),1172px)!important'));
});


test('DAW uses three independent pages: Timeline, Mixer and Track Settings', () => {
  for (const page of ['timeline', 'mixer', 'track-settings']) {
    assert.ok(html.includes('data-daw-page-panel="' + page + '"'), 'missing page panel ' + page);
    assert.ok(html.includes('data-daw-page="' + page + '"'), 'missing sub-navigation tab ' + page);
  }
  assert.ok(html.includes('id="dawTimelinePage"'));
  assert.ok(html.includes('id="dawMixerPage"'));
  assert.ok(html.includes('id="dawTrackSettingsPage"'));
  assert.ok(!html.includes('id="dawMixerDetails"'));
});

test('Mixer page contains a standalone four-channel mixer, not an accordion under Timeline', () => {
  assert.match(html, /<section id="dawMixerPage"[^>]*>[\s\S]*?id="dawMixer"/);
  assert.ok(!html.includes('<details id="dawMixerDetails"'));
  assert.ok(css.includes('#page-studio #dawMixerPage #dawMixer'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-strip'));
});

test('Track Settings page includes selected-track controls and Project Settings', () => {
  assert.match(html, /<section id="dawTrackSettingsPage"[^>]*>[\s\S]*?id="dawTrackInspector"[\s\S]*?class="daw-project-settings"/);
  for (const id of ['dawProjectName','dawSavedProjects','dawExportMix','dawExportStems','dawQuickTakeSelect','dawImportQuickTake']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing Project Settings control ' + id);
  }
});

test('Transport and three DAW page tabs share one fixed dock', () => {
  assert.match(html, /<div id="dawStudioDock"[^>]*>[\s\S]*?class="daw-transport-row"[\s\S]*?class="daw-subnav"/);
  assert.ok(css.includes('#page-studio #dawStudioDock{'));
  assert.ok(css.includes('position:fixed!important'));
  assert.ok(css.includes('#page-studio .daw-subnav'));
});

test('Internal DAW sub-navigation changes only one page at a time', () => {
  assert.ok(daw.includes('function setDawPage(page)'));
  assert.ok(daw.includes("panel.dataset.dawPagePanel === selected"));
  assert.ok(daw.includes("button.dataset.dawPage === selected"));
  assert.ok(daw.includes("button.addEventListener('click', () => setDawPage(button.dataset.dawPage));"));
  assert.ok(css.includes('#page-studio #studio-daw-workspace>.daw-subpage[hidden]'));
});

test('Timeline gets its own full-height workspace independent of Mixer and Track Settings', () => {
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-timeline-panel'));
  assert.ok(css.includes('flex:1 1 auto!important'));
  assert.ok(css.includes('min-height:clamp(320px,calc(100dvh - 560px),720px)!important'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-track-list'));
});

test('DAW page selection is stored separately from Jam/Record/DAW mode', () => {
  assert.ok(daw.includes("localStorage.setItem('mg30-studio-daw-page', selected)"));
  assert.ok(daw.includes("localStorage.getItem('mg30-studio-daw-page')"));
  assert.ok(daw.includes("['timeline', 'mixer', 'track-settings'].includes(savedPage)"));
});


test('Timeline status remains accessible but no longer reserves a visible status card', () => {
  assert.ok(html.includes('id="dawStatus" class="daw-status daw-status-sr-only"'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-status-sr-only'));
  assert.ok(css.includes('clip:rect(0,0,0,0)!important'));
});

test('Jam / Record / DAW mode tabs stay sticky above the Studio page content', () => {
  assert.ok(css.includes('#page-studio>.studio-mode-tabs'));
  assert.ok(css.includes('position:sticky!important'));
  assert.ok(css.includes('top:0!important'));
  assert.ok(css.includes('z-index:205!important'));
});

test('Mixer page hides page and channel headings to maximize fader area', () => {
  assert.ok(!html.includes('DAW · MIX'));
  assert.ok(!daw.includes("'<strong>' + safeText(track.name) + '</strong>'"));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-subpage-heading{display:none!important}'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-strip>strong{display:none!important}'));
});

test('Each Mixer fader has its own 12-segment LED meter', () => {
  assert.ok(daw.includes('data-vu-track="\' + track.id + \'"'));
  assert.ok(daw.includes('data-vu-segment="\' + segment + \'"'));
  assert.ok(daw.includes('trackMeter = context.createAnalyser()') || daw.includes('const trackMeter = context.createAnalyser()'));
  assert.ok(daw.includes('liveTrackNodes.set(track.id, { gain, pan, meter: trackMeter'));
  assert.ok(daw.includes('nodes.meter.getFloatTimeDomainData(samples)'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-vu'));
  assert.ok(css.includes('i:nth-child(n+11).active'));
});

test('Mixer fader and LED VU ladder fit the channel without internal page scrolling', () => {
  assert.ok(css.includes('#page-studio #dawMixerPage{'));
  assert.ok(css.includes('overflow:hidden!important'));
  assert.ok(css.includes('#page-studio #dawMixerPage #dawMixer'));
  assert.ok(css.includes('grid-template-rows:minmax(0,1fr)!important'));
  assert.ok(css.includes('height:100%!important'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-fader{'));
});

test('Ruler and track lanes use one common beat/bar grid origin and dimensions', () => {
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-ruler-inner,'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-track-lane{'));
  assert.ok(css.includes('var(--daw-beat-width,23px) 100%'));
  assert.ok(css.includes('var(--daw-bar-width,92px) 100%'));
  assert.ok(css.includes('background-position:1px 0,1px 0!important'));
});


test('Transport and DAW page dock aligns to the measured top edge of the app navigation', () => {
  assert.ok(daw.includes('function syncStudioPinnedControls()'));
  assert.ok(daw.includes('const navRect = appNav.getBoundingClientRect()'));
  assert.ok(daw.includes('viewportHeight - navRect.top + 8'));
  assert.ok(daw.includes("dock.style.setProperty('--studio-dock-bottom', dockBottom + 'px')"));
  assert.ok(css.includes('bottom:var(--studio-dock-bottom,calc(96px + env(safe-area-inset-bottom,0px)))!important'));
  assert.ok(css.includes('width:var(--studio-dock-width,min(calc(100vw - 28px),1172px))!important'));
});

test('Jam / Record / DAW tabs remain pinned to the Studio scroll region below the fixed app header', () => {
  assert.ok(css.includes('#page-studio>.studio-page-hero.studio-daw-hero{'));
  assert.ok(css.includes('position:relative!important'));
  assert.ok(css.includes('#page-studio>.studio-mode-tabs{'));
  assert.ok(css.includes('top:0!important'));
  assert.ok(css.includes('position:sticky!important'));
  assert.ok(css.includes('z-index:205!important'));
  assert.ok(!daw.includes("const appHeader = document.querySelector('.top')"));
});

test('Mixer channel strips display the editable track name below the channel number', () => {
  assert.ok(daw.includes('class="daw-mixer-track-name"'));
  assert.ok(daw.includes(`'<span class="daw-mixer-track-name">' + safeText(track.name)`));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-track-name'));
  assert.ok(css.includes('display:block!important'));
});

test('Selected Track settings exposes a persistent editable track name field', () => {
  assert.ok(daw.includes('class="daw-track-name-field"'));
  assert.ok(daw.includes(`data-track-name="' + track.id + '"`));
  assert.ok(daw.includes("addEventListener('change', (event) => {"));
  assert.ok(daw.includes('nameInput.dataset.trackName'));
  assert.ok(daw.includes('track.name = nameInput.value.trim().slice(0, 32) || track.name'));
  assert.ok(daw.includes('scheduleProjectSave()'));
  assert.ok(css.includes('#page-studio .daw-track-name-field input'));
});

test('Track Settings removes redundant page and selected-track subheadings', () => {
  assert.ok(!html.includes('DAW · CONFIGURATION'));
  assert.ok(!html.includes('<h4>Selected Track</h4>'));
  assert.ok(html.includes('class="daw-project-settings"'));
});


test('Studio dock geometry is recalculated after selecting Studio from the main navigation', () => {
  assert.ok(daw.includes("document.querySelector('.nav')?.addEventListener('click'"));
  assert.ok(daw.includes('button[data-page="studio"]'));
  assert.ok(daw.includes('window.requestAnimationFrame(syncStudioPinnedControls)'));
});


test('Build 316: Studio mode tabs stick to the Studio scroll region, not the app header offset', () => {
  assert.ok(css.includes('#page-studio>.studio-mode-tabs{'));
  assert.ok(css.includes('top:0!important'));
  assert.ok(css.includes('position:sticky!important'));
  assert.ok(css.includes('#page-studio>.studio-page-hero.studio-daw-hero{'));
  assert.ok(css.includes('position:relative!important'));
  assert.ok(!daw.includes("const appHeader = document.querySelector('.top')"));
  assert.ok(!daw.includes('studio-mode-tabs-top'));
});

test('Build 316: dock width is proportional to viewport and bottom is aligned above measured nav', () => {
  assert.ok(css.includes('width:min(calc(100vw - 20px),1172px)!important'));
  assert.ok(css.includes('bottom:var(--studio-dock-bottom,calc(88px + env(safe-area-inset-bottom,0px)))!important'));
  assert.ok(daw.includes('const navRect = appNav.getBoundingClientRect()'));
  assert.ok(daw.includes('viewportHeight - navRect.top + 8'));
  assert.ok(!daw.includes('--studio-dock-width'));
  assert.ok(!daw.includes('--studio-dock-left'));
});

test('Build 316: mixer channel has six explicit rows so the fader control cannot collapse into an implicit row', () => {
  assert.ok(css.includes('grid-template-rows:24px 18px 40px 12px minmax(150px,1fr) 31px!important'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-control-row'));
  assert.ok(css.includes('min-height:150px!important'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-fader'));
  assert.ok(css.includes('height:100%!important'));
  assert.ok(css.includes('min-height:150px!important'));
});

test('Build 316: channel track names are visible and remain separate from the fader grid rows', () => {
  assert.ok(daw.includes('<span class="daw-mixer-track-name">'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-track-name'));
  assert.ok(css.includes('display:block!important'));
  assert.ok(css.includes('grid-template-rows:24px 18px 40px 12px minmax(150px,1fr) 31px!important'));
});


test('Build 321: imported clip waveform is a real SVG peak envelope, not a decorative fallback', () => {
  assert.ok(daw.includes('analyzeWaveformPeaks'));
  assert.ok(daw.includes('function waveformMarkup(waveform)'));
  assert.ok(daw.includes('class="daw-waveform-peaks"'));
  assert.ok(daw.includes('<rect x="'));
  assert.ok(!daw.includes('18 + ((index * 19) % 62)'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-waveform-peaks'));
});

test('Build 321: previously saved clips rebuild missing or old waveform data from IndexedDB audio', () => {
  assert.ok(daw.includes('const buffer = await decodeBlob(media.blob)'));
  assert.ok(daw.includes('clip.waveform.length !== 128'));
  assert.ok(daw.includes('clip.waveform = analyzeWaveform(buffer, 128)'));
  assert.ok(daw.includes('if (waveformUpdated)'));
  assert.ok(daw.includes('await saveProject(false)'));
});

test('Build 321: Mixer fader is centered independently of the right-side VU meter', () => {
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-control-row{'));
  assert.ok(css.includes('position:relative!important'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-fader-wrap{'));
  assert.ok(css.includes('left:50%!important'));
  assert.ok(css.includes('transform:translateX(-50%)!important'));
  assert.ok(css.includes('#page-studio #dawMixerPage .daw-mixer-vu{'));
  assert.ok(css.includes('right:1px!important'));
});


test('Build 327: Studio title and Jam / Record / DAW selector share one pinned header wrapper', () => {
  assert.match(html, /<section id="page-studio"[^>]*>[\s\S]*?<div class="studio-fixed-header">[\s\S]*?class="hero studio-page-hero studio-daw-hero"[\s\S]*?class="studio-mode-tabs"[\s\S]*?<\/div>\s*<div class="studio-mode-panel"/);
  assert.ok(css.includes('#page-studio > .studio-fixed-header{'));
  assert.ok(css.includes('position:sticky!important'));
  assert.ok(css.includes('top:0!important'));
  assert.ok(css.includes('z-index:230!important'));
});

test('Build 327: Studio hero and mode tabs are not independently sticky or scrollable', () => {
  assert.ok(css.includes('#page-studio > .studio-fixed-header > .studio-page-hero{'));
  assert.ok(css.includes('#page-studio > .studio-fixed-header > .studio-mode-tabs{'));
  assert.ok(css.includes('position:relative!important'));
  assert.ok(css.includes('flex:0 0 auto!important'));
  assert.ok(css.includes('background:#0b1012!important'));
});

test('Build 327: Studio mode panels remain after the pinned header and retain independent mode visibility', () => {
  assert.ok(html.includes('data-studio-mode-panel="jam"'));
  assert.ok(html.includes('data-studio-mode-panel="record"'));
  assert.ok(html.includes('data-studio-mode-panel="daw"'));
  assert.ok(daw.includes("studio?.querySelectorAll(':scope > [data-studio-mode-panel]')"));
});


test('Build 329: Timeline playhead has no stray white arrow and ruler bar numbers remain readable', () => {
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-global-playhead::before'));
  assert.ok(css.includes('display:none!important'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-ruler-mark'));
  assert.ok(css.includes('width:24px!important'));
  assert.ok(css.includes('line-height:31px!important'));
});

test('Build 329: left track-name rail has no ruler-spacer separator line and keeps rounded corners', () => {
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-ruler-spacer{'));
  assert.ok(css.includes('border:0!important'));
  assert.ok(css.includes('border-radius:13px 0 0 0!important'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-track-rail-column'));
  assert.ok(css.includes('border-radius:13px 0 0 13px!important'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-track-head'));
});

test('Build 329: Track Settings separates the track name field from level and pan controls', () => {
  assert.ok(css.includes('#page-studio .daw-track-name-field{'));
  assert.ok(css.includes('margin-bottom:12px!important'));
  assert.ok(css.includes('row-gap:18px!important'));
  assert.ok(css.includes('column-gap:12px!important'));
});

test('Build 329: decorative Project Settings glyph is removed while the project controls remain', () => {
  assert.ok(!html.includes('daw-project-settings-icon'));
  assert.ok(html.includes('id="dawProjectName"'));
  assert.ok(html.includes('id="dawSavedProjects"'));
  assert.ok(html.includes('id="dawExportMix"'));
});

test('Build 329: all visible Jam and Record mode copy is English', () => {
  const studioStart = html.indexOf('<section id="page-studio"');
  const studioEnd = html.indexOf('</section>', html.indexOf('id="dawStudioDock"', studioStart)) + 10;
  const studioMarkup = html.slice(studioStart, studioEnd);
  for (const phrase of ['Pilih file', 'Cari lagu', 'API key diatur', 'Rekam langsung', 'Tes input USB', 'Rekaman tersimpan', 'Nama, penyimpanan', 'kamu miliki']) {
    assert.ok(!studioMarkup.includes(phrase), 'Indonesian Studio text remains: ' + phrase);
  }
  assert.ok(studioMarkup.includes('Choose File'));
  assert.ok(studioMarkup.includes('Saved Recordings'));
  assert.ok(studioMarkup.includes('Project name, storage, format and export.'));
});

test('Build 329: Studio Record, backing and YouTube runtime messages are English', () => {
  for (const phrase of ['Tidak dapat', 'Belum ada rekaman', 'Nama rekaman', 'Gagal memutar', 'Pemutaran dihentikan', 'Menyiapkan AudioRecord', 'Tidak dapat memulai', 'Backing siap diputar', 'Pilih file audio', 'Tidak ada video', 'Pencarian YouTube gagal', 'API key dihapus']) {
    assert.ok(!main.includes(phrase), 'Indonesian Studio runtime text remains: ' + phrase);
  }
  assert.ok(main.includes('Could not start USB recording.'));
  assert.ok(main.includes('Backing track is ready.'));
  assert.ok(main.includes('YouTube search failed:'));
});


test('Build 330: no Indonesian copy remains in Studio mode controls or the recording rename dialog', () => {
  const studioStart = html.indexOf('<section id="page-studio"');
  const studioEnd = html.indexOf('</section>', html.indexOf('id="dawStudioDock"', studioStart)) + 10;
  const studioMarkup = html.slice(studioStart, studioEnd);
  const dialogStart = html.indexOf('<dialog id="renameTakeDialog"');
  const dialogEnd = html.indexOf('</dialog>', dialogStart) + 9;
  const recordingDialog = html.slice(dialogStart, dialogEnd);
  for (const phrase of ['Pilih file', 'Cari lagu', 'Putar backing', 'Putar rekaman', 'Stop dan simpan', 'Ganti nama', 'Batal', 'Contoh:', 'Rekaman tersimpan', 'Tes input USB']) {
    assert.ok(!studioMarkup.includes(phrase), 'Indonesian Studio label remains: ' + phrase);
    assert.ok(!recordingDialog.includes(phrase), 'Indonesian recording dialog label remains: ' + phrase);
  }
});

test('Build 330: Record, backing playback and YouTube failure messages use English wording', () => {
  for (const phrase of ['Recording name diubah', 'Ganti nama', 'Backing sedang diputar', 'Backing selesai diputar', 'Periksa API key', 'Kuota YouTube Data API', 'Tidak dapat memutar', 'Pilih file audio']) {
    assert.ok(!main.includes(phrase), 'Indonesian Studio runtime text remains: ' + phrase);
  }
  for (const phrase of ['Recording renamed to', 'Backing track is playing.', 'Backing track playback finished.', 'Check your API key.', 'The YouTube Data API daily quota has been exceeded.']) {
    assert.ok(main.includes(phrase), 'Missing English Studio runtime text: ' + phrase);
  }
});


test('Build 332: no white playhead arrow pseudo-element remains on the ruler', () => {
  assert.ok(css.includes('#page-studio #dawTimelinePage #dawGlobalPlayhead::before'));
  assert.ok(css.includes('#page-studio #dawTimelinePage #dawPlayheadHit::before'));
  assert.ok(css.includes('content:none!important'));
  assert.ok(css.includes('display:none!important'));
  assert.ok(css.includes('#page-studio .daw-global-playhead:after'));
});

test('Build 332: decorative ellipsis is removed from every track header', () => {
  assert.ok(!daw.includes('class="daw-track-menu">•••</span>'));
  assert.ok(!daw.includes('daw-track-menu">'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-track-menu'));
  assert.ok(css.includes('display:none!important'));
});

test('Build 333: track-head columns keep square corners at every viewport size', () => {
  const build333Start = css.lastIndexOf('Build #332 track-rail alignment retained');
  const build334Start = css.indexOf('/* Build #334:');
  const build333Styles = css.slice(build333Start, build334Start >= 0 ? build334Start : undefined);
  assert.ok(build333Styles.includes('#page-studio #dawTimelinePage .daw-track-head'));
  assert.ok(build333Styles.includes('#page-studio #dawTimelinePage .daw-track-head.selected'));
  assert.equal((build333Styles.match(/border-radius:0!important/g) || []).length, 3);
  assert.ok(!build333Styles.includes('border-radius:11px!important'));
  assert.ok(!build333Styles.includes('border-radius:10px!important'));
});

test('Build 333: square track rail retains aligned gaps and colored left accents', () => {
  const build333Start = css.lastIndexOf('Build #332 track-rail alignment retained');
  const build334Start = css.indexOf('/* Build #334:');
  const build333Styles = css.slice(build333Start, build334Start >= 0 ? build334Start : undefined);
  assert.ok(build333Styles.includes('#page-studio #dawTimelinePage .daw-track-rail-column'));
  assert.ok(build333Styles.includes('border-right:0!important'));
  assert.ok(build333Styles.includes('#page-studio #dawTimelinePage .daw-track-rail,'));
  assert.ok(build333Styles.includes('gap:6px!important'));
  assert.ok(build333Styles.includes('border:1px solid #344139!important'));
  assert.ok(build333Styles.includes('border-left:5px solid var(--track-color)!important'));
});


test('Build 334: invisible playhead hit button has no Android/WebView native appearance', () => {
  const build334Styles = css.slice(css.lastIndexOf('Build #334: neutralize Android/WebView native chrome'));
  assert.ok(build334Styles.includes('#page-studio #dawTimelinePage #dawPlayheadHit{'));
  assert.ok(build334Styles.includes('-webkit-appearance:none!important'));
  assert.ok(build334Styles.includes('appearance:none!important'));
  assert.ok(build334Styles.includes('background:transparent!important'));
  assert.ok(build334Styles.includes('border:0!important'));
  assert.ok(build334Styles.includes('color:transparent!important'));
  assert.ok(build334Styles.includes('font:0/0 sans-serif!important'));
  assert.ok(build334Styles.includes('#dawPlayheadHit::-webkit-focus-inner'));
  assert.ok(build334Styles.includes('#dawPlayheadHit:focus-visible'));
});

test('Build 334: playhead hit button cannot create pseudo-element artifacts', () => {
  const build334Styles = css.slice(css.lastIndexOf('Build #334: neutralize Android/WebView native chrome'));
  assert.equal((build334Styles.match(/content:none!important/g) || []).length, 1);
  assert.equal((build334Styles.match(/display:none!important/g) || []).length, 1);
  assert.ok(html.includes('id="dawPlayheadHit"'));
  assert.ok(daw.includes("$('dawGlobalPlayhead')?.addEventListener('pointerdown', startPlayheadDrag);"));
});


test('Build 338: ruler labels retain their per-bar horizontal positions', () => {
  assert.ok(daw.includes("'<span class=\"daw-ruler-mark\" style=\"left:' + (index * project.zoom) + 'px\">' + (index + 1) + '</span>'"));
  assert.ok(!css.includes('--ruler-mark-x'));
  assert.ok(!css.includes('left:calc(var(--ruler-mark-x,0px))!important'));
  assert.ok(css.includes('#page-studio #dawTimelinePage .daw-ruler-mark'));
});


test('DAW timeline toolbar controls have usable touch targets and Section dropdown stays inside viewport', () => {
  assert.ok(daw.includes('gap:5px!important;min-width:0!important}\n    #page-studio .daw-toolbar-icon-btn{'));
  assert.ok(daw.includes('flex:0 0 32px!important;width:32px!important;min-width:32px!important;height:34px!important;min-height:34px!important'));
  assert.ok(daw.includes('flex-basis:28px!important;width:28px!important;min-width:28px!important;height:32px!important'));
  assert.ok(daw.includes('.daw-section-menu-panel{left:auto!important;right:0!important;width:min(225px,calc(100vw - 32px))!important;max-width:calc(100vw - 32px)!important;box-sizing:border-box!important}'));
  assert.ok(css.includes('flex:0 0 32px!important;width:32px!important;min-width:32px!important;height:34px!important;min-height:34px!important'));
  assert.ok(css.includes('gap:5px!important;min-width:0!important'));
  assert.ok(html.includes('studio-daw.css?v=compact-daw-3'));
  assert.ok(daw.includes('#page-studio .daw-quick-toolbar{gap:5px!important;padding:7px!important}'));
});

test('DAW overflow menu stacks above the timeline playhead and stays unclipped', () => {
  assert.ok(daw.includes('z-index:32!important;overflow:visible!important;isolation:isolate!important'));
  assert.ok(daw.includes('z-index:1000!important'));
  assert.ok(daw.includes('z-index:1!important'));
});

test('Compact DAW toolbar places history/navigation beside the clock and retains dropdown actions', () => {
  const start = html.indexOf('<div class="daw-quick-toolbar">');
  const end = html.indexOf('<div class="daw-timeline-panel">', start);
  const toolbar = html.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(toolbar.includes('class="daw-quick-toolbar-primary"'));
  assert.ok(toolbar.includes('class="daw-quick-toolbar-position"'));
  assert.equal((toolbar.match(/class="daw-quick-toolbar-(?:primary|position)"/g) || []).length, 2);
  assert.equal(toolbar.includes('daw-section-toolbar'), false);
  const ids = [
    'dawTempo','dawTimeSignature','dawMetronome','dawClock','dawPosition',
    'dawUndo','dawRedo','dawCursorStart','dawCursorEnd',
    'dawLoop','dawLoopIn','dawLoopOut','dawClearLoop','dawLoopRangeReadout',
    'dawCopyClip','dawPasteClip','dawDuplicateClip',
    'dawTrimStart','dawTrimEnd','dawSplitClip','dawDeleteClip','dawDeleteTrack',
    'dawSnap','dawZoom','dawNudgeLeft','dawNudgeRight','dawFadeIn','dawFadeOut'
  ];
  for (const id of ids) {
    assert.equal((toolbar.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id + ' must remain exactly once');
  }
  const inlineStart = toolbar.indexOf('class="daw-inline-history-tools"');
  const inlineEnd = toolbar.indexOf('</div>', inlineStart);
  const inline = toolbar.slice(inlineStart, inlineEnd);
  for (const id of ['dawUndo','dawRedo','dawCursorStart','dawCursorEnd','dawNudgeLeft','dawNudgeRight']) {
    assert.ok(inline.includes('id="' + id + '"'), id + ' must sit beside the playback clock');
  }
  const moreStart = toolbar.indexOf('id="dawMoreMenuPanel"');
  const moreEnd = toolbar.indexOf('</details>', moreStart);
  const more = toolbar.slice(moreStart, moreEnd);
  for (const id of ['dawUndo','dawRedo','dawCursorStart','dawCursorEnd','dawNudgeLeft','dawNudgeRight']) {
    assert.equal(more.includes('id="' + id + '"'), false, id + ' must not remain in More');
  }
  for (const id of ['dawSnap','dawZoom']) assert.ok(more.includes('id="' + id + '"'), id + ' remains in More');
  assert.ok(css.includes('grid-template-columns:auto minmax(0,1fr) auto'));
  assert.ok(daw.includes('#page-studio .daw-toolbar-icon-btn{'));
  assert.ok(daw.includes('width:min(280px,calc(100vw - 48px))!important'));
  assert.ok(daw.includes('max-height:min(64vh,460px)!important'));
  assert.ok(daw.includes('#page-studio .daw-toolbar-fade-control{grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(daw.includes('#page-studio .daw-quick-toolbar{gap:5px!important;padding:7px!important}'));
  assert.ok(html.includes('studio-daw.css?v=compact-daw-3'));
  const sectionStart = toolbar.indexOf('class="daw-action-menu daw-section-menu"');
  const sectionEnd = toolbar.indexOf('</details>', sectionStart);
  const section = toolbar.slice(sectionStart, sectionEnd);
  for (const id of ['dawLoop','dawLoopIn','dawLoopOut','dawClearLoop','dawLoopRangeReadout']) {
    assert.ok(section.includes('id="' + id + '"'), id + ' must stay in Section menu');
  }
  const clipStart = toolbar.indexOf('class="daw-action-menu daw-clip-menu"');
  const clipEnd = toolbar.indexOf('</details>', clipStart);
  const clip = toolbar.slice(clipStart, clipEnd);
  for (const id of ['dawCopyClip','dawPasteClip','dawDuplicateClip','dawTrimStart','dawTrimEnd','dawSplitClip','dawDeleteClip']) {
    assert.ok(clip.includes('id="' + id + '"'), id + ' must stay in Clip menu');
  }
  assert.ok(toolbar.includes('class="daw-action-menu daw-track-menu"'));
  assert.ok(css.includes('overflow-y:hidden!important'));
  assert.ok(css.includes('min-height:68px!important'));
});


test('timeline grid supports two-finger pinch pointer gestures', () => {
  assert.ok(daw.includes("addEventListener('pointerdown', beginTimelinePinch)"));
  assert.ok(daw.includes("addEventListener('pointerup', endTimelinePinch)"));
  assert.ok(daw.includes("addEventListener('pointercancel', endTimelinePinch)"));
  assert.ok(css.includes('touch-action:pan-x pan-y!important'));
});


test('Track Input Routing uses the standard Track Settings card palette and English copy', () => {
  assert.ok(daw.includes("panel.className = 'daw-settings-section daw-input-routing-panel'"));
  for (const value of [
    'Four fixed tracks.',
    'USB Input 1/2 and Wet Sync 3/4 are separate paths.',
    'Input 1 = mono',
    'Phone loopback uses the USB Input 1–2 recording path',
  ]) {
    assert.ok(daw.includes(value), 'missing English Track Input Routing copy: ' + value);
  }
  assert.ok(daw.includes('background:#101816'));
  assert.ok(daw.includes('border:1px solid #334139'));
  assert.equal(daw.includes('Empat track tetap.'), false);
});

test('Playback Output uses the app-styled custom selector, retaining the persisted route value', () => {
  for (const value of [
    'dawOutputRouteMenu',
    'dawOutputRouteLabel',
    'data-output-route-option="speaker"',
    'data-output-route-option="mg30"',
    'daw-output-route-options',
    'daw-output-route-native',
    'dispatchEvent(new Event(\'change\', { bubbles: true }))',
    'project.outputRoute = select.value === \'mg30\' ? \'mg30\' : \'speaker\'',
  ]) {
    assert.ok(daw.includes(value), 'missing custom Playback Output feature: ' + value);
  }
  assert.ok(daw.includes('min-height:56px'));
  assert.ok(daw.includes('min-height:58px'));
  assert.equal(daw.includes('PLAYBACK OUTPUT<select id="dawOutputRoute">'), false);
});

test('USB Output Routing Test card is not mounted in the Studio Track Settings page', () => {
  assert.equal(html.includes('./studio-usb-output.js'), false);
  assert.equal(html.includes('dawUsbOutput'), false);
});


test('More dropdown stacks above the compact Section/Clip/Track menu row', () => {
  const toolbar = daw.slice(daw.indexOf('function addTrackInputRoutingStyles()'), daw.indexOf('function syncTrackInputRoutingPanel()'));
  assert.ok(toolbar.includes('.daw-quick-toolbar-primary{position:relative!important;z-index:90!important}'));
  assert.ok(toolbar.includes('.daw-quick-toolbar-position{position:relative!important;z-index:80!important}'));
  assert.ok(toolbar.includes('.daw-more-menu-panel{z-index:1000!important}'));
  assert.ok(toolbar.indexOf('z-index:90!important') < toolbar.indexOf('z-index:80!important'));
  assert.ok(toolbar.includes('isolation:isolate!important'));
});


test('simulated CSS stacking paths place the main popover above Clip and Track menus', () => {
  const cssStart = daw.indexOf('function addTrackInputRoutingStyles()');
  const cssEnd = daw.indexOf('function syncTrackInputRoutingPanel()', cssStart);
  const css = daw.slice(cssStart, cssEnd);
  const z = (selector, property = 'z-index') => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = [...css.matchAll(new RegExp(escaped + '\\{[^}]*' + property + ':([0-9]+)', 'g'))];
    assert.ok(matches.length, 'missing stacking rule for ' + selector);
    // The runtime style block contains earlier defaults and a later cascade override.
    return Number(matches[matches.length - 1][1]);
  };
  const compareStackPath = (left, right) => {
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      if (left[i] !== right[i]) return Math.sign(left[i] - right[i]);
    }
    return Math.sign(left.length - right.length);
  };
  const dropdownStack = [
    z('#page-studio .daw-quick-toolbar-primary'),
    z('#page-studio .daw-more-menu'),
    z('#page-studio .daw-more-menu-panel'),
  ];
  const clipTrackStack = [
    z('#page-studio .daw-quick-toolbar-position'),
    z('#page-studio .daw-action-menu'),
    z('#page-studio .daw-action-menu-panel'),
  ];
  assert.deepEqual(dropdownStack, [90, 100, 1000]);
  assert.deepEqual(clipTrackStack, [80, 40, 60]);
  assert.equal(compareStackPath(dropdownStack, clipTrackStack), 1,
    'the ancestor stacking context decides paint order before descendant z-index');
});


test('Track Settings reserves enough mobile scroll clearance above the fixed DAW transport dock', () => {
  const marker = '/* Community .16 — reserve scroll room below Track Settings for the fixed DAW dock.';
  const start = css.lastIndexOf(marker);
  assert.ok(start >= 0, 'the final Track Settings clearance rule must be present');
  const finalRule = css.slice(start);
  assert.ok(finalRule.includes('#page-studio #dawTrackSettingsPage:not([hidden]){'));
  assert.ok(finalRule.includes('padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))!important;'));
  assert.ok(css.includes('position:fixed!important;left:50%!important;right:auto!important;bottom:calc(58px + env(safe-area-inset-bottom,0px))!important'),
    'the existing pinned Studio transport dock remains fixed in its original position');
  assert.ok(html.includes('id="dawStudioDock"'));
  assert.ok(html.includes('data-daw-page="track-settings"'));
});
