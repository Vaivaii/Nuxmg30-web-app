import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDefaultProject, normalizeProject, trimClipStart, trimClipEnd } from '../www/studio-daw-core.js';

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
    assert.ok(toolbar.includes(`id="${id}"`), `${id} is available in the compact overflow menu`);
  }
  assert.ok(toolbar.includes('class="daw-more-menu-panel daw-menu-panel"'));
  assert.ok(toolbar.includes('class="daw-section-toolbar"'));
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
  assert.ok(toolbar.includes('class="daw-section-context"'));
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

test('Undo/Redo flank the timer and Copy/Paste/Duplicate use the other side', () => {
  const start = index.indexOf('<div class="daw-quick-toolbar-position">');
  const end = index.indexOf('<div class="daw-section-toolbar"', start);
  const positionRow = index.slice(start, end);
  assert.ok(positionRow.indexOf('id="dawUndo"') < positionRow.indexOf('id="dawClock"'));
  assert.ok(positionRow.indexOf('id="dawRedo"') < positionRow.indexOf('id="dawClock"'));
  assert.ok(positionRow.indexOf('id="dawCopyClip"') > positionRow.indexOf('id="dawClock"'));
  assert.ok(positionRow.indexOf('id="dawPasteClip"') > positionRow.indexOf('id="dawClock"'));
  assert.ok(positionRow.indexOf('id="dawDuplicateClip"') > positionRow.indexOf('id="dawClock"'));
});
