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

test('Jam / Record / DAW tabs remain pinned below the application header while Studio content scrolls', () => {
  assert.ok(daw.includes("const appHeader = document.querySelector('.top')"));
  assert.ok(daw.includes('headerRect.bottom + 8'));
  assert.ok(css.includes('top:var(--studio-mode-tabs-top,8px)!important'));
  assert.ok(css.includes('position:sticky!important'));
  assert.ok(css.includes('z-index:225!important'));
});

test('Mixer channel strips display the editable track name below the channel number', () => {
  assert.ok(daw.includes('class="daw-mixer-track-name"'));
  assert.ok(daw.includes(`'<strong class="daw-mixer-track-name">' + safeText(track.name)`));
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
  assert.ok(daw.includes('window.innerHeight - navRect.top + 8'));
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
