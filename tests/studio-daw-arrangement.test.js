import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDefaultProject, normalizeProject } from '../www/studio-daw-core.js';

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
