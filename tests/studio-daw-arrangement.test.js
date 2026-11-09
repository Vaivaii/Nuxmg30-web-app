import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDefaultProject, normalizeProject, trimClipStart, trimClipEnd, pinchZoomFromDistance, pinchScrollLeftForAnchor } from '../www/studio-daw-core.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const daw = read('../www/studio-daw.js');
const index = read('../www/index.html');
const core = read('../www/studio-daw-core.js');

test('new DAW projects initialize section loop boundaries without changing legacy loop behavior', () => {
  const project = createDefaultProject();
  assert.equal(project.loopEnabled, false);
  assert.equal(project.loopStartSeconds, 0);
  assert.equal(project.loopEndSeconds, 0);
});

test('project normalization persists valid arrangement loop boundaries', () => {
  const project = createDefaultProject();
  project.loopEnabled = true;
  project.loopStartSeconds = 12.5;
  project.loopEndSeconds = 25;
  const restored = normalizeProject(project);
  assert.equal(restored.loopEnabled, true);
  assert.equal(restored.loopStartSeconds, 12.5);
  assert.equal(restored.loopEndSeconds, 25);
});

test('selected clip supports copy, paste at playhead, and adjacent duplicate', () => {
  assert.ok(daw.includes('function copySelectedClip()'));
  assert.ok(daw.includes('function pasteClip()'));
  assert.ok(daw.includes('function duplicateSelectedClip()'));
  assert.ok(daw.includes('startSeconds: snapTime(playheadSeconds, project)'));
  assert.ok(daw.includes('startSeconds: snapTime(selected.clip.startSeconds + selected.clip.durationSeconds, project)'));
  assert.ok(index.includes('id="dawCopyClip"'));
  assert.ok(index.includes('id="dawPasteClip"'));
  assert.ok(index.includes('id="dawDuplicateClip"'));
});

test('clips can move across track lanes without altering source media references', () => {
  assert.ok(daw.includes('document.elementFromPoint(event.clientX, event.clientY)?.closest(\'[data-track-lane]\')'));
  assert.ok(daw.includes('destinationTrack.clips.push(next)'));
  assert.ok(daw.includes('track.clips.splice(index, 1)'));
  assert.ok(daw.includes('next.startSeconds = snapTime(Math.max(0, initial.startSeconds + movement), project)'));
});

test('arrangement keyboard shortcuts and fine clip nudging are wired', () => {
  assert.ok(daw.includes("event.key.toLowerCase() === 'c'"));
  assert.ok(daw.includes("event.key.toLowerCase() === 'v'"));
  assert.ok(daw.includes("event.key.toLowerCase() === 'd'"));
  assert.ok(daw.includes("event.key === 'ArrowLeft'"));
  assert.ok(daw.includes("event.key === 'ArrowRight'"));
});

test('section loop in/out is saved, displayed and applied to speaker and native playback', () => {
  assert.ok(daw.includes('function setLoopBoundary(which)'));
  assert.ok(daw.includes('function activeLoopRange()'));
  assert.ok(daw.includes('project.loopStartSeconds = position'));
  assert.ok(daw.includes('project.loopEndSeconds = position'));
  assert.ok(daw.includes('const loop = project.loopEnabled ? activeLoopRange() : null'));
  assert.ok(daw.includes('if (loop) cursor = loop.start'));
  assert.ok(index.includes('id="dawLoopIn"'));
  assert.ok(index.includes('id="dawLoopOut"'));
  assert.ok(index.includes('id="dawClearLoop"'));
  assert.ok(index.includes('id="dawLoop"'));
  assert.equal((index.match(/id="dawLoop"/g) || []).length, 1);
});

test('editing controls do not alter the media source or native recorder implementation', () => {
  assert.ok(daw.includes('...selected.clip'));
  assert.ok(daw.includes('clipClipboard.mediaId'));
  assert.ok(core.includes('loopStartSeconds:'));
  assert.ok(core.includes('loopEndSeconds:'));
});


test('mobile DAW controls are consolidated into the metronome card and overflow menu', () => {
  const quickStart = index.indexOf('<div class="daw-quick-toolbar">');
  const timelineStart = index.indexOf('<div class="daw-timeline-panel">', quickStart);
  assert.ok(quickStart >= 0 && timelineStart > quickStart);
  const toolbar = index.slice(quickStart, timelineStart);
  for (const id of ['dawLoop', 'dawLoopIn', 'dawLoopOut', 'dawClearLoop', 'dawLoopRangeReadout']) {
    assert.ok(toolbar.includes(`id="${id}"`), `${id} stays inside the metronome card`);
  }
  for (const id of ['dawUndo', 'dawRedo', 'dawCopyClip', 'dawPasteClip', 'dawDuplicateClip', 'dawNudgeLeft', 'dawNudgeRight', 'dawCursorStart', 'dawCursorEnd']) {
    assert.ok(toolbar.includes(`id="${id}"`), `${id} remains available in the DAW toolbar`);
  }
  const inlineToolsStart = toolbar.indexOf('class="daw-inline-history-tools"');
  const inlineToolsEnd = toolbar.indexOf('</div>', inlineToolsStart);
  const inlineTools = toolbar.slice(inlineToolsStart, inlineToolsEnd);
  for (const id of ['dawUndo','dawRedo','dawCursorStart','dawCursorEnd','dawNudgeLeft','dawNudgeRight']) {
    assert.ok(inlineTools.includes('id="' + id + '"'), id + ' is directly beside the playback clock');
  }
  const moreStart = toolbar.indexOf('id="dawMoreMenuPanel"');
  const moreEnd = toolbar.indexOf('</details>', moreStart);
  const more = toolbar.slice(moreStart, moreEnd);
  for (const id of ['dawUndo','dawRedo','dawCursorStart','dawCursorEnd','dawNudgeLeft','dawNudgeRight']) {
    assert.equal(more.includes('id="' + id + '"'), false, id + ' must not be trapped in More');
  }
  assert.ok(more.includes('id="dawSnap"'));
  assert.ok(more.includes('id="dawZoom"'));
  assert.ok(daw.includes('#page-studio .daw-more-menu-panel{position:absolute!important;z-index:60!important;right:0!important;top:42px!important;width:min(280px,calc(100vw - 48px))!important'));
  assert.ok(daw.includes('max-height:min(64vh,460px)!important'));
  assert.ok(daw.includes('#page-studio .daw-quick-toolbar{gap:5px!important;padding:7px!important}'));
  assert.ok(toolbar.includes('class="daw-more-menu-panel daw-menu-panel"'));
  assert.ok(toolbar.includes('class="daw-quick-toolbar-position"'));
  assert.ok(toolbar.includes('class="daw-compact-menu-row"'));
  assert.ok(toolbar.includes('class="daw-action-menu daw-section-menu"'));
  assert.equal(index.includes('class="daw-arrangement-tools"'), false);
  assert.ok(daw.includes("document.querySelectorAll('#page-studio .daw-menu-panel button')"));
  assert.ok(daw.includes('menu.open = false'));
});


test('trim-to-cursor keeps trim non-destructive and uses the existing source media reference', () => {
  const clip = {
    id: 'clip-a', mediaId: 'media-a', startSeconds: 2,
    sourceOffsetSeconds: 1, durationSeconds: 6, fadeInSeconds: 0.4, fadeOutSeconds: 0.5,
  };
  const trimStart = trimClipStart(clip, 2, 12);
  assert.equal(trimStart.startSeconds, 4);
  assert.equal(trimStart.sourceOffsetSeconds, 3);
  assert.equal(trimStart.durationSeconds, 4);
  assert.equal(trimStart.mediaId, 'media-a');
  const trimEnd = trimClipEnd(clip, -2, 12);
  assert.equal(trimEnd.durationSeconds, 4);
  assert.equal(trimEnd.mediaId, 'media-a');
  assert.equal(clip.durationSeconds, 6, 'the original clip object remains unchanged');
});

test('main DAW card exposes selected clip trim/delete and selected track delete actions', () => {
  const start = index.indexOf('<div class="daw-quick-toolbar">');
  const end = index.indexOf('<div class="daw-timeline-panel">', start);
  const toolbar = index.slice(start, end);
  for (const id of ['dawTrimStart','dawTrimEnd','dawSplitClip','dawDeleteClip','dawDeleteTrack']) {
    assert.ok(toolbar.includes(`id="${id}"`), `${id} is available in the DAW card`);
  }
  assert.ok(toolbar.includes('class="daw-action-menu daw-clip-menu"'));
  assert.ok(toolbar.includes('class="daw-action-menu daw-track-menu"'));
  assert.ok(daw.includes('function trimSelectedClipToPlayhead(edge)'));
  assert.ok(daw.includes('trimClipStart(clip, position - start, sourceDuration)'));
  assert.ok(daw.includes('trimClipEnd(clip, position - end, sourceDuration)'));
  assert.ok(daw.includes('function deleteSelectedTrack()'));
  assert.ok(daw.includes('At least one track must remain in the project.'));
  assert.ok(daw.includes('function deleteSelectedClip()'));
  assert.ok(daw.includes('Source audio remains in local media storage.'));
});

test('fade in/out controls are in the overflow menu rather than Track Settings', () => {
  const morePanel = index.slice(index.indexOf('id="dawMoreMenuPanel"'), index.indexOf('</details>', index.indexOf('id="dawMoreMenuPanel"')));
  assert.ok(morePanel.includes('id="dawFadeIn"'));
  assert.ok(morePanel.includes('id="dawFadeOut"'));
  assert.ok(daw.includes("$('dawMoreMenuPanel')?.addEventListener('input'"));
  assert.equal(daw.includes("data-clip-fade=\"in\""), false);
  assert.equal(daw.includes("data-clip-fade=\"out\""), false);
  assert.ok(daw.includes('Clip trim, fade, split and delete controls are available from the main DAW card.'));
});

test('secondary DAW actions remain discoverable in More and Clip menus outside the compact clock row', () => {
  const start = index.indexOf('<div class="daw-quick-toolbar">');
  const end = index.indexOf('<div class="daw-timeline-panel">', start);
  const toolbar = index.slice(start, end);
  const position = toolbar.slice(toolbar.indexOf('<div class="daw-quick-toolbar-position">'));
  assert.ok(position.includes('id="dawClock"'));
  assert.equal(position.includes('id="dawUndo"'), false);
  assert.equal(position.includes('id="dawRedo"'), false);
  assert.equal(position.includes('id="dawCursorStart"'), false);
  assert.equal(position.includes('id="dawCursorEnd"'), false);
  const more = toolbar.slice(toolbar.indexOf('id="dawMoreMenuPanel"'), toolbar.indexOf('</details>', toolbar.indexOf('id="dawMoreMenuPanel"')));
  for (const id of ['dawUndo','dawRedo','dawCursorStart','dawCursorEnd']) assert.ok(more.includes('id="' + id + '"'));
  const clipStart = toolbar.indexOf('class="daw-action-menu daw-clip-menu"');
  const clip = toolbar.slice(clipStart, toolbar.indexOf('</details>', clipStart));
  for (const id of ['dawCopyClip','dawPasteClip','dawDuplicateClip']) assert.ok(clip.includes('id="' + id + '"'));
});


test('pinch distance changes zoom proportionally within the DAW zoom limits', () => {
  assert.equal(pinchZoomFromDistance(92, 100, 150), 138);
  assert.equal(pinchZoomFromDistance(92, 100, 250), 180);
  assert.equal(pinchZoomFromDistance(92, 100, 20), 44);
  assert.equal(pinchZoomFromDistance(92, 0, 100), 92);
});

test('pinch zoom keeps the timeline bar under the midpoint anchored', () => {
  assert.equal(pinchScrollLeftForAnchor(5, 120, 100, 1000), 500);
  assert.equal(pinchScrollLeftForAnchor(1, 60, 100, 1000), 0);
  assert.equal(pinchScrollLeftForAnchor(10, 180, 100, 500), 500);
});

test('timeline pinch handlers cancel clip dragging and commit zoom without rebuilding during touch move', () => {
  assert.ok(daw.includes('function beginTimelinePinch(event)'));
  assert.ok(daw.includes('function updateTimelinePinch(event)'));
  assert.ok(daw.includes('function endTimelinePinch(event)'));
  assert.ok(daw.includes('dragClip = null;'));
  assert.ok(daw.includes("addEventListener('pointermove', updateTimelinePinch, { passive: false })"));
  assert.ok(daw.includes("canvas.style.transform = 'scaleX(' + scale + ')'"));
  assert.ok(daw.includes('pinchZoomFromDistance('));
  assert.ok(daw.includes('pinchScrollLeftForAnchor('));
});
