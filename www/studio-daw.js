import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  DAW_TRACKS, DAW_INPUT_ROUTES, createDefaultProject, normalizeProject, makeId, projectDurationSeconds,
  barDurationSeconds, snapTime, selectStemTracks, safeExportName, floatStereoToPcm24, encodeWavHeader,
  makeWavBlob, createStoredZip, trimClipStart, trimClipEnd, splitClipAt, selectUsbChannelPositions,
  normalizeClipFades, clipFadeGainAt, analyzeWaveformPeaks,
  pinchZoomFromDistance, pinchScrollLeftForAnchor,
} from './studio-daw-core.js';

const NativeDawFiles = registerPlugin('MG30DawFiles');
const NativeAudioOutput = registerPlugin('MG30AudioOutput');
const $ = (id) => document.getElementById(id);
const DB_NAME = 'mg30-studio-daw';
const DB_VERSION = 1;
const SAMPLE_RATE = 48000;
const MAX_PROJECT_SECONDS = 30 * 60;
const RENDER_CHUNK_SECONDS = 8;

let project = createDefaultProject('Untitled Project');
let selectedTrackId = 'guitar';
let selectedClipId = '';
let playheadSeconds = 0;
let audioContext = null;
let analyser = null;
let liveTrackNodes = new Map();
let liveSources = [];
let playbackMaster = null;
let playing = false;
let nativeOutputPlayback = false;
let nativePlaybackGeneration = 0;
let nativePlaybackStartedAt = 0;
let playStartContextTime = 0;
let playStartPosition = 0;
let animationFrame = 0;
let recording = false;
let usbDiagnosticRecording = false;
let recordingTrackId = '';
let recordingStartPosition = 0;
let recordingStartPerformanceTime = 0;
let recordingWaveformTimer = 0;
let recordingWaveformPollInFlight = false;
let liveRecordingClipNode = null;
let liveRecordingWaveform = [3];
let liveRecordingInputRouteId = '';
let pendingImportTrackId = '';
let databasePromise = null;
let mediaBuffers = new Map();
let projectSaveTimer = null;
let lastMetronomeBeat = -1;
let dragClip = null;
const timelineTouchPointers = new Map();
let activeTimelinePinch = null;
let suppressTimelineClickUntil = 0;
let clipClipboard = null;
let playheadDragPointerId = null;
let selectedDawPage = 'timeline';
let historyPast = [];
let historyFuture = [];
let historySnapshot = '';
let historyTimer = 0;
let destroyed = false;

const storageKey = 'mg30-studio-last-mode';


function historyState() {
  const snapshot = JSON.parse(JSON.stringify(project));
  delete snapshot.updatedAt;
  return JSON.stringify(snapshot);
}

function updateHistoryButtons() {
  const undo = $('dawUndo');
  const redo = $('dawRedo');
  if (undo) undo.disabled = historyPast.length === 0;
  if (redo) redo.disabled = historyFuture.length === 0;
}

function resetHistory() {
  clearTimeout(historyTimer);
  historyPast = [];
  historyFuture = [];
  historySnapshot = historyState();
  updateHistoryButtons();
}

function commitHistoryChange() {
  clearTimeout(historyTimer);
  const next = historyState();
  if (next !== historySnapshot) {
    historyPast.push(historySnapshot);
    if (historyPast.length > 100) historyPast.shift();
    historyFuture = [];
    historySnapshot = next;
  }
  updateHistoryButtons();
}

function applyHistory(direction) {
  if (recording) {
    setStatus('Stop recording before using Undo or Redo.', 'warn');
    return;
  }
  commitHistoryChange();
  const source = direction === 'undo' ? historyPast : historyFuture;
  const destination = direction === 'undo' ? historyFuture : historyPast;
  if (!source.length) return;
  if (playing) pausePlayback();
  const current = historyState();
  const target = source.pop();
  destination.push(current);
  const restored = normalizeProject(JSON.parse(target));
  if (!restored) {
    source.push(target);
    destination.pop();
    setStatus('History snapshot could not be restored safely.', 'warn');
    updateHistoryButtons();
    return;
  }
  project = restored;
  selectedTrackId = getTrack(selectedTrackId) ? selectedTrackId : 'guitar';
  selectedClipId = '';
  historySnapshot = historyState();
  renderProject();
  scheduleProjectSave();
  setStatus(direction === 'undo' ? 'Last Studio edit undone.' : 'Studio edit restored.', 'ok');
  updateHistoryButtons();
}

function setPlayheadFromClientX(clientX) {
  const scroller = $('dawTimelineScroll');
  const canvas = $('dawTimelineCanvas');
  if (!scroller || !canvas) return;
  const metrics = timelineMetrics();
  const rect = scroller.getBoundingClientRect();
  let viewportX = clientX - rect.left;

  // While dragging, scroll the shared timeline when the pointer reaches either
  // viewport edge. Ruler, clips, lanes and the marker all retain one X coordinate.
  if (playheadDragPointerId !== null) {
    const edge = Math.min(28, Math.max(18, scroller.clientWidth * 0.08));
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    if (viewportX < edge && scroller.scrollLeft > 0) {
      scroller.scrollLeft = Math.max(0, scroller.scrollLeft - (edge - viewportX));
    } else if (viewportX > scroller.clientWidth - edge && scroller.scrollLeft < maxScroll) {
      scroller.scrollLeft = Math.min(maxScroll, scroller.scrollLeft + (viewportX - (scroller.clientWidth - edge)));
    }
  }

  const contentX = viewportX + scroller.scrollLeft;
  const x = Math.max(0, Math.min(metrics.width, contentX));
  playheadSeconds = (x / project.zoom) * metrics.barSeconds;
  renderPlayhead();
}

function startPlayheadDrag(event) {
  if (recording || playheadDragPointerId !== null) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  if (playing) pausePlayback();
  playheadDragPointerId = event.pointerId;
  setPlayheadFromClientX(event.clientX);
  try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
}

function movePlayheadDrag(event) {
  if (playheadDragPointerId === null || event.pointerId !== playheadDragPointerId) return;
  event.preventDefault();
  setPlayheadFromClientX(event.clientX);
}

function finishPlayheadDrag(event) {
  if (playheadDragPointerId === null || event.pointerId !== playheadDragPointerId) return;
  try {
    if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  } catch (_) {}
  playheadDragPointerId = null;
}

function safeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function setStatus(message, kind = '') {
  const node = $('dawStatus');
  if (!node) return;
  node.textContent = String(message || '');
  node.classList.remove('ok', 'warn');
  if (kind) node.classList.add(kind);
}

function getTrack(trackId) {
  return project.tracks.find((track) => track.id === trackId) || null;
}

function getSelectedClipContext() {
  const track = getTrack(selectedTrackId);
  const index = track?.clips.findIndex((clip) => clip.id === selectedClipId) ?? -1;
  return index >= 0 ? { track, index, clip: track.clips[index] } : null;
}

function activeLoopRange() {
  const duration = projectDurationSeconds(project);
  const start = Math.max(0, Math.min(duration, Number(project.loopStartSeconds) || 0));
  const requestedEnd = Number(project.loopEndSeconds) || 0;
  const end = requestedEnd > start + 0.05 ? Math.min(duration, requestedEnd) : duration;
  return end > start + 0.05 ? { start, end } : { start: 0, end: duration };
}

function copySelectedClip() {
  const selected = getSelectedClipContext();
  if (!selected) { setStatus('Select a clip before copying.', 'warn'); return; }
  clipClipboard = { ...selected.clip };
  setStatus('Copied "' + selected.clip.name + '". Paste at the playhead or duplicate it.', 'ok');
}

function pasteClip() {
  if (recording || playing) { setStatus('Pause playback and stop recording before pasting clips.', 'warn'); return; }
  if (!clipClipboard) { setStatus('Copy a clip first.', 'warn'); return; }
  const track = getTrack(selectedTrackId);
  if (!track) return;
  if (!mediaBuffers.has(clipClipboard.mediaId)) {
    setStatus('The source audio is not loaded in this project. Reopen the project and try again.', 'warn');
    return;
  }
  const clip = {
    ...clipClipboard,
    id: makeId('clip'),
    startSeconds: snapTime(playheadSeconds, project),
    name: String(clipClipboard.name || 'Audio clip') + ' (copy)',
  };
  track.clips.push(clip);
  track.clips.sort((a, b) => a.startSeconds - b.startSeconds);
  selectedClipId = clip.id;
  renderProject();
  scheduleProjectSave();
  setStatus('Pasted clip at the playhead on ' + track.name + '.', 'ok');
}

function duplicateSelectedClip() {
  if (recording || playing) { setStatus('Pause playback and stop recording before duplicating clips.', 'warn'); return; }
  const selected = getSelectedClipContext();
  if (!selected) { setStatus('Select a clip to duplicate.', 'warn'); return; }
  const duplicate = {
    ...selected.clip,
    id: makeId('clip'),
    startSeconds: snapTime(selected.clip.startSeconds + selected.clip.durationSeconds, project),
    name: String(selected.clip.name || 'Audio clip') + ' (copy)',
  };
  selected.track.clips.push(duplicate);
  selected.track.clips.sort((a, b) => a.startSeconds - b.startSeconds);
  selectedClipId = duplicate.id;
  renderProject();
  scheduleProjectSave();
  setStatus('Clip duplicated immediately after the original.', 'ok');
}

function nudgeSelectedClip(direction, bars = 0) {
  if (recording || playing) return;
  const selected = getSelectedClipContext();
  if (!selected) return;
  const step = bars ? barDurationSeconds(project.tempo, project.timeSignature)
    : project.snap === 'off' ? 0.01
      : project.snap === 'bar' ? barDurationSeconds(project.tempo, project.timeSignature)
        : project.snap === 'eighth' ? 30 / project.tempo : 60 / project.tempo;
  selected.clip.startSeconds = Math.max(0, snapTime(selected.clip.startSeconds + direction * step, project, project.snap));
  selected.track.clips.sort((a, b) => a.startSeconds - b.startSeconds);
  renderProject();
  scheduleProjectSave();
}

function setLoopBoundary(which) {
  if (recording) { setStatus('Stop recording before changing the loop section.', 'warn'); return; }
  const position = snapTime(playheadSeconds, project);
  if (which === 'start') {
    if (project.loopEndSeconds > 0 && position >= project.loopEndSeconds - 0.05) {
      setStatus('Loop In must be before Loop Out.', 'warn'); return;
    }
    project.loopStartSeconds = position;
  } else {
    if (position <= project.loopStartSeconds + 0.05) {
      setStatus('Move the playhead after Loop In before setting Loop Out.', 'warn'); return;
    }
    project.loopEndSeconds = position;
  }
  project.loopEnabled = true;
  renderProject();
  scheduleProjectSave();
  setStatus('Loop ' + (which === 'start' ? 'In' : 'Out') + ' set at ' + formatClock(position) + '.', 'ok');
}

function clearLoopSection() {
  project.loopStartSeconds = 0;
  project.loopEndSeconds = 0;
  project.loopEnabled = false;
  renderProject();
  scheduleProjectSave();
  setStatus('Loop section cleared.', 'ok');
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This WebView does not provide IndexedDB.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local project storage.'));
    request.onblocked = () => reject(new Error('Project storage is blocked by another MG30 Studio window.'));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

async function databaseRequest(storeName, mode, method, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let request;
    try {
      request = value === undefined ? store[method]() : store[method](value);
    } catch (error) {
      reject(error);
      return;
    }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local project storage operation failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('Local project storage transaction was aborted.'));
  });
}

function audioContextConstructor() {
  return window.AudioContext || window.webkitAudioContext || null;
}

async function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = audioContextConstructor();
    if (!AudioContextClass) throw new Error('This Android WebView does not support Web Audio playback.');
    audioContext = new AudioContextClass({ latencyHint: 'playback' });
  }
  if (audioContext.state === 'suspended') await audioContext.resume();
  return audioContext;
}

async function decodeBlob(blob) {
  const context = await getAudioContext();
  const bytes = await blob.arrayBuffer();
  return context.decodeAudioData(bytes.slice(0));
}

function analyzeWaveform(buffer, count = 128) {
  if (!buffer?.numberOfChannels || !buffer.length) return [];
  const peaks = new Array(count).fill(3);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 2) {
    const left = buffer.getChannelData(channel);
    const right = channel + 1 < buffer.numberOfChannels ? buffer.getChannelData(channel + 1) : left;
    const pairPeaks = analyzeWaveformPeaks(left, right, count);
    for (let index = 0; index < count; index += 1) {
      peaks[index] = Math.max(peaks[index], Number(pairPeaks[index]) || 3);
    }
  }
  return peaks;
}

function connectClipWithFade(context, source, clip, elapsedIntoClip, playbackDuration, when, trackGain) {
  const envelope = context.createGain();
  const sampleCount = 33;
  const curve = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const elapsed = elapsedIntoClip + (playbackDuration * index / (sampleCount - 1));
    curve[index] = clipFadeGainAt(clip, elapsed);
  }
  source.connect(envelope);
  envelope.connect(trackGain);
  if (playbackDuration >= 0.02 && typeof envelope.gain.setValueCurveAtTime === 'function') {
    envelope.gain.setValueCurveAtTime(curve, when, playbackDuration);
  } else {
    envelope.gain.setValueAtTime(clipFadeGainAt(clip, elapsedIntoClip), when);
  }
  return envelope;
}

function updateToolbar() {
  if ($('dawProjectName') && document.activeElement !== $('dawProjectName')) $('dawProjectName').value = project.name;
  if ($('dawTempo') && document.activeElement !== $('dawTempo')) $('dawTempo').value = String(project.tempo);
  if ($('dawTimeSignature')) $('dawTimeSignature').value = project.timeSignature;
  if ($('dawMetronome')) $('dawMetronome').checked = project.metronomeEnabled;
  if ($('dawLoop')) $('dawLoop').checked = project.loopEnabled;
  const loopReadout = $('dawLoopRangeReadout');
  if (loopReadout) {
    const loop = activeLoopRange();
    const hasSection = project.loopStartSeconds > 0 || project.loopEndSeconds > 0;
    loopReadout.textContent = hasSection
      ? 'Loop ' + formatClock(loop.start) + ' – ' + formatClock(loop.end)
      : 'Loop: full timeline';
  }
  const selectedClip = getSelectedClipContext()?.clip || null;
  const selectedTrack = getTrack(selectedTrackId);
  const fadeIn = $('dawFadeIn');
  const fadeOut = $('dawFadeOut');
  const fadeInReadout = $('dawFadeInReadout');
  const fadeOutReadout = $('dawFadeOutReadout');
  const fadeTarget = $('dawFadeTarget');
  if (fadeTarget) fadeTarget.textContent = selectedClip ? selectedClip.name : 'Select a clip to adjust its fades';
  if (fadeIn) {
    fadeIn.disabled = !selectedClip;
    fadeIn.max = String(selectedClip ? Math.min(10, selectedClip.durationSeconds) : 10);
    if (document.activeElement !== fadeIn) fadeIn.value = String(selectedClip ? (Number(selectedClip.fadeInSeconds) || 0) : 0);
  }
  if (fadeOut) {
    fadeOut.disabled = !selectedClip;
    fadeOut.max = String(selectedClip ? Math.min(10, selectedClip.durationSeconds) : 10);
    if (document.activeElement !== fadeOut) fadeOut.value = String(selectedClip ? (Number(selectedClip.fadeOutSeconds) || 0) : 0);
  }
  if (fadeInReadout) fadeInReadout.textContent = (selectedClip ? (Number(selectedClip.fadeInSeconds) || 0) : 0).toFixed(2) + ' s';
  if (fadeOutReadout) fadeOutReadout.textContent = (selectedClip ? (Number(selectedClip.fadeOutSeconds) || 0) : 0).toFixed(2) + ' s';
  const clipActionDisabled = !selectedClip || recording || playing;
  ['dawCopyClip','dawDuplicateClip','dawNudgeLeft','dawNudgeRight','dawTrimStart','dawTrimEnd','dawSplitClip','dawDeleteClip'].forEach((id) => {
    const button = $(id);
    if (button) button.disabled = clipActionDisabled;
  });
  const paste = $('dawPasteClip');
  if (paste) paste.disabled = !clipClipboard || !mediaBuffers.has(clipClipboard.mediaId) || recording || playing;
  const deleteTrack = $('dawDeleteTrack');
  if (deleteTrack) deleteTrack.disabled = !selectedTrack || project.tracks.length <= 1 || recording || playing;
  if ($('dawSnap')) $('dawSnap').value = project.snap;
  if ($('dawZoom')) $('dawZoom').value = String(project.zoom);
  if ($('dawProjectSummary')) $('dawProjectSummary').textContent = project.name;
  if ($('dawProjectMeta')) $('dawProjectMeta').textContent = project.tracks.length + ' Tracks · 48 kHz · 24-bit WAV';
}

function timelineMetrics() {
  const barSeconds = barDurationSeconds(project.tempo, project.timeSignature);
  const contentBars = Math.ceil(projectDurationSeconds(project) / barSeconds) + 1;
  const playheadBars = Math.ceil(Math.max(0, playheadSeconds) / barSeconds) + 2;
  const bars = Math.max(4, contentBars, playheadBars);
  const width = bars * project.zoom;
  return { barSeconds, bars, width };
}

function waveformMarkup(waveform) {
  const levels = Array.isArray(waveform) ? waveform.slice(0, 256) : [];
  if (!levels.length) {
    return '<svg class="daw-waveform" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="daw-waveform-center" d="M0 50H100"></path></svg>';
  }
  const count = levels.length;
  const step = 100 / count;
  const bars = levels.map((value, index) => {
    const level = Math.max(3, Math.min(100, Number(value) || 3));
    const amplitude = Math.max(2, Math.min(47, level * 0.46));
    const x = ((index + 0.5) * step).toFixed(3);
    const y = (50 - amplitude).toFixed(2);
    const height = (amplitude * 2).toFixed(2);
    const width = (step * 0.68).toFixed(3);
    return '<rect x="' + (Number(x) - Number(width) / 2).toFixed(3) + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="0.18"></rect>';
  }).join('');
  return '<svg class="daw-waveform" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="daw-waveform-center" d="M0 50H100"></path><g class="daw-waveform-peaks">' + bars + '</g></svg>';
}

function renderRuler(metrics) {
  const ruler = $('dawRulerInner');
  const canvas = $('dawTimelineCanvas');
  if (!ruler || !canvas) return;
  canvas.style.width = metrics.width + 'px';
  canvas.style.setProperty('--daw-timeline-width', metrics.width + 'px');
  canvas.style.setProperty('--daw-bar-width', project.zoom + 'px');
  const beatCount = Number(String(project.timeSignature).split('/')[0]) || 4;
  canvas.style.setProperty('--daw-beat-width', (project.zoom / beatCount) + 'px');
  ruler.style.width = metrics.width + 'px';
  const loop = project.loopEnabled ? activeLoopRange() : null;
  const loopMarkup = loop
    ? '<span class="daw-loop-range" style="left:' + (loop.start / metrics.barSeconds * project.zoom) + 'px;width:' + ((loop.end - loop.start) / metrics.barSeconds * project.zoom) + 'px"></span>'
    : '';
  ruler.innerHTML = loopMarkup + Array.from({ length: metrics.bars }, (_, index) =>
    '<span class="daw-ruler-mark" style="left:' + (index * project.zoom) + 'px">' + (index + 1) + '</span>'
  ).join('');
}

function renderTrackRows() {
  const holder = $('dawTrackList');
  const rail = $('dawTrackRail');
  if (!holder || !rail) return;
  const metrics = timelineMetrics();
  const canvas = $('dawTimelineCanvas');
  if (canvas) canvas.style.width = metrics.width + 'px';
  holder.style.width = metrics.width + 'px';
  holder.style.setProperty('--daw-timeline-width', metrics.width + 'px');
  holder.style.setProperty('--daw-bar-width', project.zoom + 'px');

  rail.innerHTML = project.tracks.map((track, index) => {
    const isSelected = selectedTrackId === track.id;
    const recordButton = '<button type="button" data-track-action="arm" data-track-id="' + track.id + '" class="daw-track-record ' + (track.armed ? 'arm-active' : '') + '" aria-label="' + (track.armed ? 'Disarm ' : 'Arm ') + safeText(track.name) + '" title="' + (track.armed ? 'Armed for MG-30 USB overdub' : 'Arm for MG-30 USB overdub') + '">●</button>';
    return '<div class="daw-track-head' + (isSelected ? ' selected' : '') + '" data-track-select="' + track.id + '" style="--track-color:' + track.color + '">' +
      '<div class="daw-track-title"><span class="daw-track-color"></span><strong>' + String(index + 1).padStart(1, '0') + ' ' + safeText(track.name) + '</strong></div>' +
      '<div class="daw-track-input">' + safeText(track.input) + '</div>' +
      '<div class="daw-track-actions">' + recordButton +
        '<button type="button" data-track-action="mute" data-track-id="' + track.id + '" class="' + (track.mute ? 'active' : '') + '" aria-label="Mute ' + safeText(track.name) + '">M</button>' +
        '<button type="button" data-track-action="solo" data-track-id="' + track.id + '" class="' + (track.solo ? 'active' : '') + '" aria-label="Solo ' + safeText(track.name) + '">S</button>' +
        '<button type="button" data-track-action="import" data-track-id="' + track.id + '" class="import" aria-label="Import audio to ' + safeText(track.name) + '">＋</button>' +
      '</div>' +
    '</div>';
  }).join('');

  holder.innerHTML = project.tracks.map((track) => {
    const isSelected = selectedTrackId === track.id;
    const clips = track.clips.map((clip) => {
      const left = clip.startSeconds / metrics.barSeconds * project.zoom;
      const width = Math.max(20, clip.durationSeconds / metrics.barSeconds * project.zoom);
      const isClipSelected = selectedClipId === clip.id;
      const fadeInPercent = clip.durationSeconds > 0 ? Math.min(50, (Number(clip.fadeInSeconds) || 0) / clip.durationSeconds * 100) : 0;
      const fadeOutPercent = clip.durationSeconds > 0 ? Math.min(50, (Number(clip.fadeOutSeconds) || 0) / clip.durationSeconds * 100) : 0;
      return '<div role="button" tabindex="0" class="daw-clip' + (isClipSelected ? ' selected' : '') + '" data-clip-id="' + safeText(clip.id) + '" data-track-id="' + track.id + '" style="--track-color:' + track.color + ';--clip-fade-in:' + fadeInPercent + '%;--clip-fade-out:' + fadeOutPercent + '%;left:' + left + 'px;width:' + width + 'px" title="' + safeText(clip.name) + '">' +
        '<span class="daw-clip-edge daw-clip-edge-start" data-clip-edge="start" aria-label="Trim clip start"></span>' +
        '<span class="daw-clip-edge daw-clip-edge-end" data-clip-edge="end" aria-label="Trim clip end"></span>' +
        '<strong>' + safeText(clip.name) + '</strong><span class="daw-clip-fade daw-clip-fade-in"></span><span class="daw-clip-fade daw-clip-fade-out"></span>' + waveformMarkup(clip.waveform) + '</div>';
    }).join('');
    return '<div class="daw-track-row' + (isSelected ? ' selected' : '') + (track.mute ? ' is-muted' : '') + '" data-track-row="' + track.id + '">' +
      '<div class="daw-track-lane" data-track-lane="' + track.id + '" style="width:' + metrics.width + 'px">' + clips + '</div>' +
    '</div>';
  }).join('');
  renderPlayhead();
}
function renderMixer() {
  const mixer = $('dawMixer');
  if (!mixer) return;
  mixer.innerHTML = project.tracks.map((track, index) => {
    const panLabel = track.pan < -0.05 ? 'L ' + Math.round(Math.abs(track.pan) * 100) : track.pan > 0.05 ? 'R ' + Math.round(track.pan * 100) : 'CENTER';
    const panAngle = Math.round(track.pan * 45);
    const vuSegments = Array.from({ length: 12 }, (_, segment) => '<i data-vu-segment="' + segment + '"></i>').join('');
    return '<div class="daw-mixer-strip" style="--track-color:' + track.color + '" aria-label="' + safeText(track.name) + ' channel">' +
      '<span class="daw-mixer-index" aria-label="' + safeText(track.name) + ' channel ' + (index + 1) + '">' + (index + 1) + '</span>' +
      '<span class="daw-mixer-track-name">' + safeText(track.name) + '</span>' +
      '<div class="daw-mixer-pan-row"><span>L</span><div class="daw-pan-dial" style="--pan-angle:' + panAngle + 'deg"><i></i><input type="range" min="-100" max="100" step="1" value="' + Math.round(track.pan * 100) + '" data-track-pan="' + track.id + '" aria-label="' + safeText(track.name) + ' pan"></div><span>R</span></div>' +
      '<div class="daw-mixer-pan-readout" data-pan-readout="' + track.id + '">' + panLabel + '</div>' +
      '<div class="daw-mixer-control-row">' +
        '<div class="daw-mixer-fader-wrap"><input class="daw-mixer-fader" type="range" min="0" max="150" step="1" value="' + Math.round(track.gain * 100) + '" data-track-gain="' + track.id + '" aria-label="' + safeText(track.name) + ' level"></div>' +
        '<div class="daw-mixer-vu" data-vu-track="' + track.id + '" role="meter" aria-label="' + safeText(track.name) + ' playback level" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0">' + vuSegments + '</div>' +
      '</div>' +
      '<div class="daw-mixer-buttons"><button type="button" data-track-action="mute" data-track-id="' + track.id + '" class="' + (track.mute ? 'active' : '') + '">M</button><button type="button" data-track-action="solo" data-track-id="' + track.id + '" class="' + (track.solo ? 'active' : '') + '">S</button></div>' +
    '</div>';
  }).join('');
}

function renderInspector() {
  const holder = $('dawTrackInspector');
  const label = $('dawSelectedTrackLabel');
  if (!holder) return;
  const track = getTrack(selectedTrackId) || project.tracks[1];
  if (!track) return;
  if (label) label.textContent = track.name + ' selected';
  holder.innerHTML =
    '<label class="daw-track-name-field">Track name<input type="text" maxlength="32" value="' + safeText(track.name) + '" data-track-name="' + track.id + '" aria-label="Rename ' + safeText(track.name) + '" autocomplete="off"></label>' +
    '<div class="daw-inspector-grid">' +
      '<label>Track level <strong data-gain-readout="' + track.id + '">' + Math.round(track.gain * 100) + '%</strong><input type="range" min="0" max="150" value="' + Math.round(track.gain * 100) + '" data-track-gain="' + track.id + '"></label>' +
      '<label>Pan <strong data-pan-readout="' + track.id + '">' + Math.round(track.pan * 100) + '</strong><input type="range" min="-100" max="100" value="' + Math.round(track.pan * 100) + '" data-track-pan="' + track.id + '"></label>' +
    '</div>' +
    '<p class="daw-inspector-note">Clip trim, fade, split and delete controls are available from the main DAW card.</p>';
}
function renderProject() {
  updateToolbar();
  const metrics = timelineMetrics();
  renderRuler(metrics);
  renderTrackRows();
  if (recording) {
    ensureLiveRecordingClipNode();
    updateLiveRecordingClipGeometry();
  }
  renderMixer();
  renderInspector();
  renderOutputRoutingPanel();
  renderHardwareLevelPanel();
  if ($('dawTimelineInfo')) $('dawTimelineInfo').textContent = project.tracks.length + ' tracks · ' + metrics.bars + ' bars · 48 kHz / 24-bit';
  updatePlayheadReadout();
  updateTransport();
}

function renderOutputRoutingPanel() {
  const host = $('dawTrackSettingsPage');
  if (!host) return;
  let panel = host.querySelector('[data-daw-output-routing]');
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'daw-settings-section daw-output-routing-card';
    panel.dataset.dawOutputRouting = 'true';
    panel.innerHTML =
      '<div class="daw-project-settings-heading"><div><h4>Audio Output</h4><p>Choose where the complete DAW mix is played.</p></div></div>' +
      '<div class="daw-output-route-field">' +
        '<span class="daw-output-route-label">PLAYBACK OUTPUT</span>' +
        '<details class="daw-output-route-menu" id="dawOutputRouteMenu">' +
          '<summary aria-label="Select DAW playback output"><span id="dawOutputRouteLabel">Phone speaker / current Android output</span><span class="daw-output-route-chevron" aria-hidden="true">⌄</span></summary>' +
          '<div class="daw-output-route-options" role="group" aria-label="Playback output">' +
            '<button type="button" data-output-route-option="speaker" aria-pressed="true"><span><strong>Phone speaker</strong><small>Current Android output</small></span><span class="daw-output-route-check" aria-hidden="true">✓</span></button>' +
            '<button type="button" data-output-route-option="mg30" aria-pressed="false"><span><strong>NUX MG-30</strong><small>USB playback output</small></span><span class="daw-output-route-check" aria-hidden="true">✓</span></button>' +
          '</div>' +
        '</details>' +
        '<select id="dawOutputRoute" class="daw-output-route-native" aria-hidden="true" tabindex="-1"><option value="speaker">Phone speaker / current Android output</option><option value="mg30">NUX MG-30 · USB</option></select>' +
      '</div>' +
      '<small id="dawOutputRouteStatus" class="daw-inspector-note">The selected output applies to DAW playback. Recording input routing remains independent.</small>';
    host.prepend(panel);

    const select = panel.querySelector('#dawOutputRoute');
    const menu = panel.querySelector('#dawOutputRouteMenu');
    const syncMenu = () => {
      const route = select.value === 'mg30' ? 'mg30' : 'speaker';
      const label = panel.querySelector('#dawOutputRouteLabel');
      if (label) label.textContent = route === 'mg30' ? 'NUX MG-30 · USB output' : 'Phone speaker / current Android output';
      panel.querySelectorAll('[data-output-route-option]').forEach((button) => {
        const active = button.dataset.outputRouteOption === route;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    };

    select.addEventListener('change', () => {
      if (playing) pausePlayback();
      project.outputRoute = select.value === 'mg30' ? 'mg30' : 'speaker';
      const status = panel.querySelector('#dawOutputRouteStatus');
      if (status) status.textContent = project.outputRoute === 'mg30'
        ? 'MG-30 USB selected. Android route is checked before playback; acoustic output still needs listening confirmation.'
        : 'Phone / Android default output selected.';
      syncMenu();
      scheduleProjectSave();
    });
    panel.querySelectorAll('[data-output-route-option]').forEach((button) => {
      button.addEventListener('click', () => {
        select.value = button.dataset.outputRouteOption === 'mg30' ? 'mg30' : 'speaker';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if (menu) menu.open = false;
      });
    });
  }
  const select = panel.querySelector('#dawOutputRoute');
  if (select && document.activeElement !== select) select.value = project.outputRoute === 'mg30' ? 'mg30' : 'speaker';

  const route = project.outputRoute === 'mg30' ? 'mg30' : 'speaker';
  const label = panel.querySelector('#dawOutputRouteLabel');
  if (label) label.textContent = route === 'mg30' ? 'NUX MG-30 · USB output' : 'Phone speaker / current Android output';
  panel.querySelectorAll('[data-output-route-option]').forEach((button) => {
    const active = button.dataset.outputRouteOption === route;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const status = panel.querySelector('#dawOutputRouteStatus');
  if (status && document.activeElement !== select) {
    status.textContent = route === 'mg30'
      ? 'MG-30 USB selected. Android route is checked before playback; acoustic output still needs listening confirmation.'
      : 'Phone / Android default output selected.';
  }
}

// Experimental candidate SysEx controls. Header action and payload offsets are hypotheses; only send after user interaction.
function renderHardwareLevelPanel() {
  const host = $('dawTrackSettingsPage');
  if (!host) return;
  let panel = host.querySelector('[data-daw-hardware-levels]');
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'daw-settings-section daw-output-routing-card daw-hardware-levels-card';
    panel.dataset.dawHardwareLevels = 'true';
    panel.innerHTML =
      '<div class="daw-project-settings-heading"><div><h4>MG-30 Hardware Levels</h4><p>USB loopback and MG-30 recording/playback hardware levels.</p></div></div>' +
      '<label class="daw-hardware-toggle"><span><strong>USB Loopback</strong><small>Route MG-30 playback back to the USB recording input.</small></span><input type="checkbox" id="dawHardwareLoopback"></label>' +
      '<div class="daw-hardware-level-row"><label for="dawHardwareRecordLevel">Record Level <strong id="dawHardwareRecordReadout">0.0 dB</strong></label><input id="dawHardwareRecordLevel" type="range" min="-12" max="12" step="0.1" value="0"></div>' +
      '<div class="daw-hardware-level-row"><label for="dawHardwarePlaybackLevel">Playback Level <strong id="dawHardwarePlaybackReadout">0.0 dB</strong></label><input id="dawHardwarePlaybackLevel" type="range" min="-12" max="12" step="0.1" value="0"></div>';
    const outputPanel = host.querySelector('[data-daw-output-routing]');
    if (outputPanel?.nextSibling) host.insertBefore(panel, outputPanel.nextSibling);
    else host.appendChild(panel);
  }
  const loopback = $('dawHardwareLoopback');
  const record = $('dawHardwareRecordLevel');
  const playback = $('dawHardwarePlaybackLevel');
  const recordReadout = $('dawHardwareRecordReadout');
  const playbackReadout = $('dawHardwarePlaybackReadout');
  const reportWrite = (label, operation) => {
    Promise.resolve(operation).then(result => {
      if (result?.acknowledged === true) {
        setStatus(label + ' updated on MG-30.', 'ok');
      } else {
        setStatus(label + ' sent; device acknowledgement was not confirmed.', 'warn');
      }
    }).catch(error => {
      setStatus(label + ' failed: ' + (error?.message || String(error)), 'warn');
    });
  };
  if (record && recordReadout && !record.dataset.hardwareBound) {
    let timer = null;
    record.addEventListener('input', () => {
      recordReadout.textContent = formatMg30LevelDb(record.value);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (typeof window.setRecLevel === 'function') {
          reportWrite('Record Level ' + record.value, window.setRecLevel(record.value));
        }
      }, 220);
    });
    record.dataset.hardwareBound = 'true';
  }
  if (playback && playbackReadout && !playback.dataset.hardwareBound) {
    let timer = null;
    playback.addEventListener('input', () => {
      playbackReadout.textContent = formatMg30LevelDb(playback.value);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (typeof window.setPlayLevel === 'function') {
          reportWrite('Playback Level ' + playback.value, window.setPlayLevel(playback.value));
        }
      }, 220);
    });
    playback.dataset.hardwareBound = 'true';
  }
  if (loopback && !loopback.dataset.hardwareBound) {
    loopback.addEventListener('change', () => {
      if (typeof window.setLoopback === 'function') {
        reportWrite('USB Loopback ' + (loopback.checked ? 'ON' : 'OFF'), window.setLoopback(loopback.checked));
      }
    });
    loopback.dataset.hardwareBound = 'true';
  }
}

function formatMg30LevelDb(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.0 dB';
  const db = Math.round(Math.max(-12, Math.min(12, number)) * 10) / 10;
  if (Math.abs(db) < 0.05) return '0.0 dB';
  return (db > 0 ? '+' : '') + db.toFixed(1) + ' dB';
}

function formatClock(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const secs = (total - minutes * 60).toFixed(1).padStart(4, '0');
  return String(minutes).padStart(2, '0') + ':' + secs;
}

function updatePlayheadReadout() {
  const beatSeconds = 60 / project.tempo;
  const barSeconds = barDurationSeconds(project.tempo, project.timeSignature);
  const absoluteBar = Math.floor(playheadSeconds / barSeconds);
  const withinBar = playheadSeconds - absoluteBar * barSeconds;
  const beat = Math.floor(withinBar / beatSeconds) + 1;
  const ticks = Math.floor(((withinBar % beatSeconds) / beatSeconds) * 960);
  if ($('dawPosition')) $('dawPosition').textContent = (absoluteBar + 1) + ':' + beat + ':' + String(ticks).padStart(3, '0');
  if ($('dawClock')) $('dawClock').textContent = formatClock(playheadSeconds);
}

function renderPlayhead() {
  const metrics = timelineMetrics();
  const ruler = $('dawRulerInner');
  const holder = $('dawTrackList');
  if (ruler && holder && ruler.children.length < metrics.bars) {
    renderRuler(metrics);
    holder.style.width = metrics.width + 'px';
    holder.style.setProperty('--daw-timeline-width', metrics.width + 'px');
    holder.querySelectorAll('.daw-track-lane').forEach((lane) => { lane.style.width = metrics.width + 'px'; });
    if ($('dawTimelineInfo')) $('dawTimelineInfo').textContent = project.tracks.length + ' tracks · ' + metrics.bars + ' bars · 48 kHz / 24-bit';
  }
  const left = Math.max(0, (playheadSeconds / metrics.barSeconds) * project.zoom);
  const playhead = $('dawGlobalPlayhead');
  if (playhead) {
    // CSS left is driven by this variable; inline style.left was previously
    // overridden by the legacy !important left:0 rule and froze the marker.
    playhead.style.setProperty('--daw-playhead-x', left + 'px');
  }
  updatePlayheadReadout();
}

// Expand the shared timeline horizon as the live cursor advances during long playback/overdubs.
function followPlayheadDuringPlayback() {
  if (!playing && !recording) return;
  const scroller = $('dawTimelineScroll');
  if (!scroller || !scroller.clientWidth) return;
  const metrics = timelineMetrics();
  const x = Math.max(0, (playheadSeconds / metrics.barSeconds) * project.zoom);
  const left = scroller.scrollLeft;
  const right = left + scroller.clientWidth;
  const preferred = left + scroller.clientWidth * 0.72;
  if (x > preferred) {
    scroller.scrollLeft = Math.min(x - scroller.clientWidth * 0.62, scroller.scrollWidth - scroller.clientWidth);
  } else if (x < left + 12 && left > 0) {
    scroller.scrollLeft = Math.max(0, x - 12);
  }
}

function updateTransport() {
  const play = $('dawPlay');
  const record = $('dawRecord');
  if (play) { play.textContent = playing ? 'Ⅱ' : '▶'; play.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
  if (record) {
    record.classList.toggle('is-recording', recording);
    record.textContent = recording ? '■' : '●';
    record.setAttribute('aria-label', recording ? 'Stop recording' : 'Record');
  }
  const armed = project.tracks.some((track) => track.armed);
  if (record) record.disabled = !recording && !armed;
  syncTrackInputRoutingPanel();
}

function scheduleProjectSave() {
  clearTimeout(projectSaveTimer);
  clearTimeout(historyTimer);
  historyTimer = setTimeout(commitHistoryChange, 220);
  projectSaveTimer = setTimeout(() => { void saveProject(false); }, 650);
}

async function saveProject(showFeedback = true) {
  try {
    project.updatedAt = new Date().toISOString();
    await databaseRequest('projects', 'readwrite', 'put', project);
    await populateSavedProjects();
    if (showFeedback) setStatus('Project saved on this device.', 'ok');
    return true;
  } catch (error) {
    setStatus('Project could not be saved: ' + (error?.message || 'local storage error'), 'warn');
    return false;
  }
}

async function populateSavedProjects() {
  const select = $('dawSavedProjects');
  if (!select) return;
  const current = select.value;
  try {
    const projects = await databaseRequest('projects', 'readonly', 'getAll');
    const ordered = (projects || []).sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
    select.innerHTML = '<option value="">Saved projects</option>' + ordered.map((item) =>
      '<option value="' + safeText(item.id) + '">' + safeText(item.name) + '</option>'
    ).join('');
    if (ordered.some((item) => item.id === current)) select.value = current;
    else select.value = project.id;
  } catch (error) {
    setStatus('Local project storage is unavailable: ' + (error?.message || 'unknown error'), 'warn');
  }
}

async function loadProject(projectId) {
  if (!projectId) return;
  if (recording) await stopDawRecording();
  stopPlayback(true);
  try {
    const saved = await databaseRequest('projects', 'readonly', 'get', projectId);
    const normalized = normalizeProject(saved);
    if (!normalized) throw new Error('The selected project file is not valid.');
    project = normalized;
    resetHistory();
    mediaBuffers.clear();
    let missing = 0;
    let waveformUpdated = false;
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        try {
          const media = await databaseRequest('media', 'readonly', 'get', clip.mediaId);
          if (!media?.blob) { missing += 1; continue; }
          const buffer = await decodeBlob(media.blob);
          mediaBuffers.set(clip.mediaId, buffer);
          if (!Array.isArray(clip.waveform) || clip.waveform.length !== 128) {
            clip.waveform = analyzeWaveform(buffer, 128);
            waveformUpdated = true;
          }
        } catch (_) { missing += 1; }
      }
    }
    if (waveformUpdated) {
      resetHistory();
      await saveProject(false);
    }
    selectedTrackId = 'guitar';
    selectedClipId = '';
    playheadSeconds = 0;
    renderProject();
    await populateSavedProjects();
    if (missing) setStatus('Project loaded, but ' + missing + ' audio clip(s) could not be found in local storage.', 'warn');
    else setStatus('Project loaded: ' + project.name, 'ok');
  } catch (error) {
    setStatus('Could not load project: ' + (error?.message || 'unknown error'), 'warn');
  }
}

async function createNewProject() {
  if (recording) {
    setStatus('Stop the active recording before creating a new project.', 'warn');
    return;
  }
  const name = window.prompt('Project name', 'New Song');
  if (name === null) return;
  stopPlayback(true);
  project = createDefaultProject(name || 'New Song');
  resetHistory();
  selectedTrackId = 'guitar';
  selectedClipId = '';
  mediaBuffers.clear();
  playheadSeconds = 0;
  renderProject();
  await saveProject(false);
  setStatus('New four-track project created. Choose the input source independently for each track in Track Settings.', 'ok');
}

function selectCapturedInputBuffer(buffer, inputRouteId, capturedChannelIndexMask) {
  const route = DAW_INPUT_ROUTES.find((item) => item.id === inputRouteId);
  if (!route || route.captureMode !== 'multichannel') {
    throw new Error('Choose a USB input route for this multichannel take in Track Settings.');
  }
  const fallbackMask = (1 << Math.max(1, Math.min(8, buffer.numberOfChannels))) - 1;
  const capturedMask = Number(capturedChannelIndexMask) || fallbackMask;
  const positions = selectUsbChannelPositions(capturedMask, route.channelIndexMask);
  if (positions.some((position) => position >= buffer.numberOfChannels)) {
    throw new Error('The selected MG-30 USB channel pair is not present in this take.');
  }
  const context = audioContext;
  if (!context) throw new Error('Web Audio is not ready to prepare the selected input channels.');
  const stereo = context.createBuffer(2, buffer.length, buffer.sampleRate);
  const left = buffer.getChannelData(positions[0]);
  const right = buffer.getChannelData(positions.length > 1 ? positions[1] : positions[0]);
  stereo.copyToChannel(left, 0);
  stereo.copyToChannel(right, 1);
  return stereo;
}

async function addAudioBlobToTrack(blob, trackId, fileName, startAt = playheadSeconds, metadata = {}) {
  const track = getTrack(trackId);
  if (!track) throw new Error('Select a DAW track first.');
  if (!(blob instanceof Blob) || !blob.size) throw new Error('The selected audio file is empty.');
  if (blob.size > 180 * 1024 * 1024) throw new Error('This audio file is too large for a mobile DAW project (180 MB limit per source).');
  setStatus('Importing and decoding ' + fileName + '…');
  let buffer = await decodeBlob(blob);
  let storedBlob = blob;
  const inputRouteId = String(metadata.inputRoute || track.inputRoute || 'file');
  const route = DAW_INPUT_ROUTES.find((item) => item.id === inputRouteId) || DAW_INPUT_ROUTES[0];
  const capturedChannels = Number(metadata.channels) || buffer.numberOfChannels;
  if (metadata.captureMode === 'multichannel' || metadata.captureMode === 'loopback') {
    buffer = selectCapturedInputBuffer(buffer, inputRouteId, metadata.channelIndexMask);
    const pcm = floatStereoToPcm24(buffer.getChannelData(0), buffer.getChannelData(1));
    storedBlob = new Blob([encodeWavHeader(pcm.byteLength, buffer.sampleRate, 2, 24), pcm], { type: 'audio/wav' });
  }
  if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('The selected file does not contain playable audio.');
  const mediaId = makeId('media');
  await databaseRequest('media', 'readwrite', 'put', {
    id: mediaId,
    blob: storedBlob,
    name: String(fileName || 'Audio clip').slice(0, 120),
    type: storedBlob.type || 'audio/wav',
    size: storedBlob.size,
    addedAt: new Date().toISOString(),
  });
  mediaBuffers.set(mediaId, buffer);
  track.clips.push({
    id: makeId('clip'),
    mediaId,
    name: String(fileName || 'Audio clip').replace(/\\.[a-z0-9]{2,5}$/i, '').slice(0, 80) || 'Audio clip',
    startSeconds: snapTime(startAt, project),
    sourceOffsetSeconds: 0,
    durationSeconds: buffer.duration,
    sampleRate: Number(metadata.sampleRate) || buffer.sampleRate,
    channels: buffer.numberOfChannels,
    captureMode: String(metadata.captureMode || 'file'),
    channelIndexMask: Number(metadata.channelIndexMask) || 0,
    inputChannelMask: route.channelIndexMask,
    inputRoute: inputRouteId,
    waveform: analyzeWaveform(buffer),
  });
  selectedTrackId = track.id;
  selectedClipId = track.clips[track.clips.length - 1].id;
  track.input = metadata.captureMode === 'multichannel' || metadata.captureMode === 'loopback'
    ? route.label : 'Audio file · imported';
  renderProject();
  commitHistoryChange();
  await saveProject(false);
  setStatus('Audio added to ' + track.name + ' using ' + track.input + '. Project saved locally.', 'ok');
}
async function addAudioFile(file, trackId) {
  try {
    await addAudioBlobToTrack(file, trackId, file.name);
  } catch (error) {
    setStatus('Audio import failed: ' + (error?.message || 'unsupported audio file'), 'warn');
  }
}

async function importQuickTake(take, trackId = selectedTrackId, startAt = playheadSeconds) {
  const recorder = window.NUXStudioRecorder;
  if (!recorder?.pathToUrl || !take?.path) throw new Error('The saved Quick Record take is not available.');
  setStatus('Reading Quick Record take ' + take.fileName + '…');
  const response = await fetch(recorder.pathToUrl(take));
  if (!response.ok) throw new Error('Android could not read the saved WAV take (HTTP ' + response.status + ').');
  const blob = await response.blob();
  const track = getTrack(trackId);
  await addAudioBlobToTrack(blob, trackId, take.fileName, startAt, {
    ...take,
    inputRoute: track?.inputRoute || 'file',
  });
}

function refreshQuickTakes() {
  const select = $('dawQuickTakeSelect');
  if (!select) return;
  const takes = window.NUXStudioRecorder?.listTakes?.() || [];
  select.innerHTML = '<option value="">Select a saved take</option>' + takes.map((take, index) =>
    '<option value="' + index + '">' + safeText(take.fileName) + '</option>'
  ).join('');
}

function selectTrack(trackId) {
  if (!getTrack(trackId)) return;
  selectedTrackId = trackId;
  selectedClipId = '';
  renderProject();
}

function updateTrackMix(trackId, kind, value) {
  const track = getTrack(trackId);
  if (!track) return;
  if (kind === 'gain') track.gain = Math.max(0, Math.min(1.5, Number(value) / 100));
  if (kind === 'pan') track.pan = Math.max(-1, Math.min(1, Number(value) / 100));
  const live = liveTrackNodes.get(trackId);
  if (live) {
    live.gain.gain.setTargetAtTime(track.mute ? 0 : track.gain, audioContext.currentTime, 0.015);
    live.pan.pan.setTargetAtTime(track.pan, audioContext.currentTime, 0.015);
  }
  document.querySelectorAll('[data-track-gain="' + trackId + '"]').forEach((input) => {
    if (document.activeElement !== input) input.value = String(Math.round(track.gain * 100));
  });
  document.querySelectorAll('[data-track-pan="' + trackId + '"]').forEach((input) => {
    if (document.activeElement !== input) input.value = String(Math.round(track.pan * 100));
  });
  document.querySelectorAll('[data-gain-readout="' + trackId + '"]').forEach((node) => { node.textContent = Math.round(track.gain * 100) + '%'; });
  document.querySelectorAll('[data-pan-readout="' + trackId + '"]').forEach((node) => {
    node.textContent = track.pan < -0.05 ? 'L ' + Math.round(Math.abs(track.pan) * 100) : track.pan > 0.05 ? 'R ' + Math.round(track.pan * 100) : 'CENTER';
  });
  const dial = document.querySelector('[data-track-pan="' + trackId + '"]')?.closest('.daw-pan-dial');
  if (dial) dial.style.setProperty('--pan-angle', Math.round(track.pan * 45) + 'deg');
  scheduleProjectSave();
}

function setTrackMuteSolo(trackId, action) {
  const track = getTrack(trackId);
  if (!track) return;
  if (action === 'mute') track.mute = !track.mute;
  if (action === 'solo') track.solo = !track.solo;
  if (playing) void restartPlaybackAt(playheadSeconds);
  renderProject();
  scheduleProjectSave();
}

function armTrack(trackId) {
  if (recording) {
    setStatus('Stop the current overdub before changing the armed track.', 'warn');
    return;
  }
  project.tracks.forEach((track) => { track.armed = track.id === trackId; });
  selectedTrackId = trackId;
  selectedClipId = '';
  renderProject();
  scheduleProjectSave();
  const track = getTrack(trackId);
  const route = DAW_INPUT_ROUTES.find((item) => item.id === track?.inputRoute) || DAW_INPUT_ROUTES[0];
  setStatus(track.name + ' armed · next recording input: ' + route.label + '.', 'ok');
}

function deleteSelectedClip() {
  if (recording || playing) {
    setStatus('Pause playback and stop recording before deleting a clip.', 'warn');
    return;
  }
  const selected = getSelectedClipContext();
  if (!selected) { setStatus('Select a clip to delete.', 'warn'); return; }
  selected.track.clips.splice(selected.index, 1);
  selectedClipId = '';
  renderProject();
  scheduleProjectSave();
  setStatus('Clip removed from the project. Source audio remains in local media storage.');
}

function trimSelectedClipToPlayhead(edge) {
  if (recording || playing) {
    setStatus('Pause playback and stop recording before trimming a clip.', 'warn');
    return;
  }
  const selected = getSelectedClipContext();
  if (!selected) { setStatus('Select a clip before trimming.', 'warn'); return; }
  const clip = selected.clip;
  const start = Number(clip.startSeconds) || 0;
  const end = start + Math.max(0, Number(clip.durationSeconds) || 0);
  const position = snapTime(playheadSeconds, project);
  if (position <= start + 0.05 || position >= end - 0.05) {
    setStatus('Place the cursor inside the selected clip to trim its ' + (edge === 'start' ? 'start' : 'end') + '.', 'warn');
    return;
  }
  const source = mediaBuffers.get(clip.mediaId);
  const sourceDuration = source?.duration || (Number(clip.sourceOffsetSeconds) + Number(clip.durationSeconds));
  const trimmed = edge === 'start'
    ? trimClipStart(clip, position - start, sourceDuration)
    : trimClipEnd(clip, position - end, sourceDuration);
  selected.track.clips[selected.index] = trimmed;
  selectedClipId = trimmed.id;
  renderProject();
  scheduleProjectSave();
  setStatus(edge === 'start'
    ? 'Clip start trimmed to the cursor. Source audio remains unchanged.'
    : 'Clip end trimmed to the cursor. Source audio remains unchanged.', 'ok');
}

function deleteSelectedTrack() {
  if (recording || playing) {
    setStatus('Pause playback and stop recording before deleting a track.', 'warn');
    return;
  }
  const index = project.tracks.findIndex((track) => track.id === selectedTrackId);
  if (index < 0) { setStatus('Select a track to delete.', 'warn'); return; }
  if (project.tracks.length <= 1) {
    setStatus('At least one track must remain in the project.', 'warn');
    return;
  }
  const track = project.tracks[index];
  const clipCount = track.clips.length;
  const confirmed = window.confirm('Delete track "' + track.name + '" and its ' + clipCount + ' clip(s) from this project? The original audio files will remain in local media storage.');
  if (!confirmed) return;
  project.tracks.splice(index, 1);
  selectedTrackId = project.tracks[Math.min(index, project.tracks.length - 1)].id;
  selectedClipId = '';
  renderProject();
  scheduleProjectSave();
  setStatus('Track "' + track.name + '" removed from the project. Source audio files remain in local media storage.', 'ok');
}
function splitSelectedClip() {
  const track = getTrack(selectedTrackId);
  const index = track?.clips.findIndex((clip) => clip.id === selectedClipId) ?? -1;
  if (index < 0) { setStatus('Select a clip to split.', 'warn'); return; }
  const clip = track.clips[index];
  const splitAt = snapTime(playheadSeconds, project);
  const end = clip.startSeconds + clip.durationSeconds;
  if (splitAt <= clip.startSeconds + 0.05 || splitAt >= end - 0.05) {
    setStatus('Move the playhead inside the selected clip before splitting it.', 'warn');
    return;
  }
  const split = splitClipAt(clip, splitAt);
  if (!split) { setStatus('The split point is too close to a clip edge.', 'warn'); return; }
  track.clips[index] = split.left;
  track.clips.splice(index + 1, 0, split.right);
  selectedClipId = split.right.id;
  renderProject();
  scheduleProjectSave();
  setStatus('Clip split at the playhead.', 'ok');
}

function timelineTouchDistance(first, second) {
  return Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
}

function beginTimelinePinch(event) {
  if (event.pointerType !== 'touch') return;
  const scroller = $('dawTimelineScroll');
  if (!scroller || !scroller.contains(event.target)) return;
  timelineTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (timelineTouchPointers.size < 2) return;

  const points = Array.from(timelineTouchPointers.values()).slice(0, 2);
  const distance = timelineTouchDistance(points[0], points[1]);
  const rect = scroller.getBoundingClientRect();
  const midpoint = (points[0].x + points[1].x) / 2;
  const midpointOffset = midpoint - rect.left;
  const initialZoom = project.zoom;
  const canvas = $('dawTimelineCanvas');
  if (!canvas) return;

  // A second finger cancels any one-finger clip/playhead drag.
  dragClip = null;
  if (playheadDragPointerId !== null) {
    finishPlayheadDrag({ pointerId: playheadDragPointerId });
  }
  const metrics = timelineMetrics();
  activeTimelinePinch = {
    initialDistance: distance,
    initialZoom,
    initialWidth: metrics.width,
    anchorBars: (scroller.scrollLeft + midpointOffset) / initialZoom,
    midpointOffset,
    latestZoom: initialZoom,
  };
  scroller.classList.add('daw-pinch-active');
  event.preventDefault();
}

function updateTimelinePinch(event) {
  if (event.pointerType !== 'touch' || !timelineTouchPointers.has(event.pointerId)) return;
  timelineTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!activeTimelinePinch || timelineTouchPointers.size < 2) return;

  const points = Array.from(timelineTouchPointers.values()).slice(0, 2);
  const distance = timelineTouchDistance(points[0], points[1]);
  const midpoint = (points[0].x + points[1].x) / 2;
  const scroller = $('dawTimelineScroll');
  const canvas = $('dawTimelineCanvas');
  if (!scroller || !canvas) return;

  const pinch = activeTimelinePinch;
  const nextZoom = pinchZoomFromDistance(pinch.initialZoom, pinch.initialDistance, distance);
  const scale = nextZoom / pinch.initialZoom;
  project.zoom = nextZoom;
  pinch.latestZoom = nextZoom;
  pinch.midpointOffset = midpoint - scroller.getBoundingClientRect().left;

  // Scale the complete timeline as one layer; defer DOM rebuild until the gesture ends.
  canvas.style.transformOrigin = 'left top';
  canvas.style.transform = 'scaleX(' + scale + ')';
  const virtualWidth = pinch.initialWidth * scale;
  const maxScroll = Math.max(0, virtualWidth - scroller.clientWidth);
  scroller.scrollLeft = pinchScrollLeftForAnchor(
    pinch.anchorBars, nextZoom, pinch.midpointOffset, maxScroll,
  );
  updateToolbar();
  event.preventDefault();
}

function endTimelinePinch(event) {
  if (event.pointerType !== 'touch') return;
  timelineTouchPointers.delete(event.pointerId);
  if (!activeTimelinePinch || timelineTouchPointers.size >= 2) return;

  const pinch = activeTimelinePinch;
  activeTimelinePinch = null;
  const scroller = $('dawTimelineScroll');
  const canvas = $('dawTimelineCanvas');
  if (scroller) scroller.classList.remove('daw-pinch-active');
  if (canvas) {
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
  }

  // Commit once, then restore the exact timeline bar beneath the fingers' midpoint.
  renderProject();
  if (scroller) {
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollLeft = pinchScrollLeftForAnchor(
      pinch.anchorBars, project.zoom, pinch.midpointOffset, maxScroll,
    );
  }
  scheduleProjectSave();
  suppressTimelineClickUntil = performance.now() + 500;
  event.preventDefault();
}

function handleTrackClick(event) {
  if (performance.now() < suppressTimelineClickUntil) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const actionButton = event.target.closest('[data-track-action]');
  if (actionButton) {
    const trackId = actionButton.dataset.trackId;
    const action = actionButton.dataset.trackAction;
    if (action === 'arm') armTrack(trackId);
    else if (action === 'mute' || action === 'solo') setTrackMuteSolo(trackId, action);
    else if (action === 'import') {
      pendingImportTrackId = trackId;
      $('dawAudioFileInput')?.click();
    }
    return;
  }
  const trackHeader = event.target.closest('[data-track-select]');
  if (trackHeader) {
    selectedTrackId = trackHeader.dataset.trackSelect;
    selectedClipId = '';
    renderProject();
    return;
  }
  const clipButton = event.target.closest('[data-clip-id]');
  if (clipButton) {
    selectedTrackId = clipButton.dataset.trackId;
    selectedClipId = clipButton.dataset.clipId;
    renderProject();
    return;
  }
  const lane = event.target.closest('[data-track-lane]');
  if (lane) {
    const rect = lane.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const metrics = timelineMetrics();
    playheadSeconds = Math.max(0, x / project.zoom * metrics.barSeconds);
    selectedTrackId = lane.dataset.trackLane;
    selectedClipId = '';
    renderProject();
  }
}

function startClipDrag(event) {
  const clipNode = event.target.closest('[data-clip-id]');
  if (!clipNode || event.button !== 0 || recording || playing) return;
  const track = getTrack(clipNode.dataset.trackId);
  const clip = track?.clips.find((item) => item.id === clipNode.dataset.clipId);
  if (!clip) return;
  const edge = event.target.closest('[data-clip-edge]')?.dataset.clipEdge || 'move';
  dragClip = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    mode: edge,
    trackId: track.id,
    clipId: clip.id,
    initial: { ...clip },
    moved: false,
  };
  try { clipNode.setPointerCapture(event.pointerId); } catch (_) {}
}

function moveClipDrag(event) {
  if (!dragClip || dragClip.pointerId !== event.pointerId) return;
  if (Math.abs(event.clientX - dragClip.x) > 4 || Math.abs(event.clientY - dragClip.y) > 4) dragClip.moved = true;
}

function finishClipDrag(event) {
  if (!dragClip || dragClip.pointerId !== event.pointerId) return;
  const drag = dragClip;
  dragClip = null;
  if (!drag.moved) return;
  const track = getTrack(drag.trackId);
  const index = track?.clips.findIndex((item) => item.id === drag.clipId) ?? -1;
  if (index < 0) return;
  const initial = drag.initial;
  const metrics = timelineMetrics();
  const movement = ((event.clientX - drag.x) / project.zoom) * metrics.barSeconds;
  const source = mediaBuffers.get(initial.mediaId);
  const sourceDuration = source?.duration || (initial.sourceOffsetSeconds + initial.durationSeconds);
  let next = { ...initial };
  if (drag.mode === 'start') {
    const requestedStart = snapTime(Math.max(0, initial.startSeconds + movement), project);
    next = trimClipStart(initial, requestedStart - initial.startSeconds, sourceDuration);
  } else if (drag.mode === 'end') {
    const requestedEnd = snapTime(Math.max(initial.startSeconds + 0.05, initial.startSeconds + initial.durationSeconds + movement), project);
    next = trimClipEnd(initial, requestedEnd - (initial.startSeconds + initial.durationSeconds), sourceDuration);
  } else {
    next.startSeconds = snapTime(Math.max(0, initial.startSeconds + movement), project);
  }
  if (drag.mode === 'move') {
    const destinationLane = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-track-lane]');
    const destinationTrack = destinationLane ? getTrack(destinationLane.dataset.trackLane) : track;
    if (destinationTrack && destinationTrack.id !== track.id) {
      track.clips.splice(index, 1);
      destinationTrack.clips.push(next);
      destinationTrack.clips.sort((a, b) => a.startSeconds - b.startSeconds);
      selectedTrackId = destinationTrack.id;
    } else {
      track.clips[index] = next;
      selectedTrackId = track.id;
    }
  } else {
    track.clips[index] = next;
    selectedTrackId = track.id;
  }
  selectedClipId = next.id;
  renderProject();
  scheduleProjectSave();
  setStatus(drag.mode === 'move' ? 'Clip moved on the timeline without changing its source audio.' : 'Clip edge trimmed non-destructively.', 'ok');
}

function createPlaybackMaster(context) {
  const master = context.createGain();
  master.gain.value = project.masterGain;
  const meter = context.createAnalyser();
  meter.fftSize = 512;
  master.connect(meter);
  meter.connect(context.destination);
  analyser = meter;
  playbackMaster = master;
}

function stopScheduledAudio() {
  liveSources.forEach((source) => {
    try { source.stop(); } catch (_) {}
    try { source.disconnect(); } catch (_) {}
  });
  liveSources = [];
  liveTrackNodes.forEach((nodes, trackId) => {
    try { nodes.gain.disconnect(); } catch (_) {}
    try { nodes.pan.disconnect(); } catch (_) {}
    try { nodes.meter?.disconnect(); } catch (_) {}
    const vu = document.querySelector('[data-vu-track="' + trackId + '"]');
    if (vu) {
      vu.setAttribute('aria-valuenow', '0');
      vu.querySelectorAll('[data-vu-segment]').forEach((led) => led.classList.remove('active'));
    }
  });
  liveTrackNodes.clear();
  if (playbackMaster) {
    try { playbackMaster.disconnect(); } catch (_) {}
    playbackMaster = null;
  }
  analyser = null;
}

function scheduleMetronomeClick(context, when, beatIndex) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const beats = project.timeSignature === '6/8' ? 6 : Number(project.timeSignature.split('/')[0]) || 4;
  oscillator.type = 'sine';
  oscillator.frequency.value = beatIndex % beats === 0 ? 1500 : 900;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.16, when + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(when);
  oscillator.stop(when + 0.05);
}

function updateAudioMeters() {
  if (analyser) {
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) sum += sample * sample;
    const rms = Math.min(1, Math.sqrt(sum / samples.length) * 2.2);
    const width = Math.max(0, Math.round(rms * 100));
    if ($('dawMasterLeft')) $('dawMasterLeft').style.width = width + '%';
    if ($('dawMasterRight')) $('dawMasterRight').style.width = width + '%';
  }

  // Read an independent analyser tap for each active track. The LED ladders
  // therefore show which channel is playing instead of duplicating master VU.
  liveTrackNodes.forEach((nodes, trackId) => {
    if (!nodes.meter) return;
    const samples = nodes.meterSamples || new Float32Array(nodes.meter.fftSize);
    nodes.meterSamples = samples;
    nodes.meter.getFloatTimeDomainData(samples);
    let sum = 0;
    let peak = 0;
    for (const sample of samples) {
      sum += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    const rms = Math.sqrt(sum / samples.length);
    const normalized = Math.min(1, Math.max(rms * 4.6, peak * 0.62));
    const activeSegments = Math.max(0, Math.min(12, Math.round(normalized * 12)));
    const vu = document.querySelector('[data-vu-track="' + trackId + '"]');
    if (!vu) return;
    vu.setAttribute('aria-valuenow', String(activeSegments));
    vu.querySelectorAll('[data-vu-segment]').forEach((led) => {
      const segment = Number(led.dataset.vuSegment);
      led.classList.toggle('active', segment < activeSegments);
    });
  });
}

function updatePlayheadFrame() {
  if (!playing && !recording) return;
  const elapsed = playing && nativeOutputPlayback
    ? Math.max(0, (performance.now() - nativePlaybackStartedAt) / 1000)
    : playing && audioContext
      ? Math.max(0, audioContext.currentTime - playStartContextTime)
      : recording
        ? Math.max(0, (performance.now() - recordingStartPerformanceTime) / 1000)
        : 0;
  const maxDuration = projectDurationSeconds(project);
  const loop = project.loopEnabled ? activeLoopRange() : null;
  const rawPosition = playStartPosition + elapsed;
  playheadSeconds = loop && nativeOutputPlayback && rawPosition >= loop.end
    ? loop.start + ((rawPosition - loop.start) % (loop.end - loop.start))
    : rawPosition;
  if (!recording && loop && playheadSeconds >= loop.end) {
    playheadSeconds = loop.start;
    void restartPlaybackAt(loop.start);
    return;
  }
  if (!recording && !loop && playheadSeconds >= maxDuration) {
    playing = false;
    cancelAnimationFrame(animationFrame);
    if (nativeOutputPlayback) {
      nativeOutputPlayback = false;
      nativePlaybackGeneration += 1;
      void NativeAudioOutput.stopDawPlayback().catch(() => {});
    } else {
      stopScheduledAudio();
    }
    updateTransport();
    renderPlayhead();
    return;
  }
  renderPlayhead();
  updateLiveRecordingClipGeometry();
  followPlayheadDuringPlayback();
  updateAudioMeters();
  if (project.metronomeEnabled && audioContext && !nativeOutputPlayback) {
    const beatDuration = 60 / project.tempo;
    const beat = Math.floor(playheadSeconds / beatDuration + 0.015);
    if (beat !== lastMetronomeBeat) {
      lastMetronomeBeat = beat;
      scheduleMetronomeClick(audioContext, audioContext.currentTime + 0.012, beat);
    }
  }
  animationFrame = requestAnimationFrame(updatePlayheadFrame);
}

async function restartPlaybackAt(position) {
  const shouldContinue = playing;
  if (shouldContinue) {
    playheadSeconds = position;
    playing = false;
    cancelAnimationFrame(animationFrame);
    if (nativeOutputPlayback) {
      nativeOutputPlayback = false;
      nativePlaybackGeneration += 1;
      try { await NativeAudioOutput.stopDawPlayback(); } catch (_) {}
    } else {
      stopScheduledAudio();
    }
    await startPlayback(position);
  }
}

function encodeFloatStereoPcm16Base64(left, right) {
  if (!left || !right || left.length !== right.length) throw new TypeError('Stereo render buffers are invalid.');
  const bytes = new Uint8Array(left.length * 4);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < left.length; index += 1) {
    const l = Math.max(-1, Math.min(1, Number(left[index]) || 0));
    const r = Math.max(-1, Math.min(1, Number(right[index]) || 0));
    view.setInt16(index * 4, Math.round(l * (l < 0 ? 32768 : 32767)), true);
    view.setInt16(index * 4 + 2, Math.round(r * (r < 0 ? 32768 : 32767)), true);
  }
  let binary = '';
  const step = 0x6000;
  for (let offset = 0; offset < bytes.length; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step));
  }
  return btoa(binary);
}

async function pumpNativeDawPlayback(position, generation, trackIds) {
  const chunkFrames = 24000; // 500 ms at 48 kHz; bounds stop/seek latency.
  let cursor = position;
  const projectEnd = projectDurationSeconds(project);
  const loop = project.loopEnabled ? activeLoopRange() : null;
  const end = loop ? loop.end : projectEnd;
  try {
    while (playing && nativeOutputPlayback && generation === nativePlaybackGeneration) {
      if (cursor >= end) {
        if (loop) cursor = loop.start;
        else break;
      }
      const count = Math.min(chunkFrames, Math.ceil((end - cursor) * SAMPLE_RATE));
      if (count <= 0) break;
      const rendered = await renderAudioChunk(trackIds, cursor, count, 'mix');
      if (!playing || generation !== nativePlaybackGeneration) break;
      const payload = encodeFloatStereoPcm16Base64(rendered.getChannelData(0), rendered.getChannelData(1));
      await NativeAudioOutput.writeDawPlaybackChunk({ dataBase64: payload });
      cursor += count / SAMPLE_RATE;
    }
    if (generation === nativePlaybackGeneration && playing) {
      playing = false;
      nativeOutputPlayback = false;
      cancelAnimationFrame(animationFrame);
      try { await NativeAudioOutput.stopDawPlayback(); } catch (_) {}
      updateTransport();
      renderPlayhead();
    }
  } catch (error) {
    if (generation === nativePlaybackGeneration) {
      playing = false;
      nativeOutputPlayback = false;
      cancelAnimationFrame(animationFrame);
      try { await NativeAudioOutput.stopDawPlayback(); } catch (_) {}
      updateTransport();
      setStatus('MG-30 USB playback stopped: ' + (error?.message || 'audio stream error'), 'warn');
    }
  }
}

async function startNativeDawPlayback(position, tracksWithAudio) {
  if (!Capacitor.isNativePlatform()) throw new Error('MG-30 USB playback requires the Android app.');
  const endpoints = await NativeAudioOutput.inspectOutputDevices();
  const target = (endpoints.devices || []).find((device) => device.isMg30 && Number.isInteger(Number(device.id)));
  if (!target) throw new Error('USB output NUX MG-30 was not found. Connect the pedal and check USB OUT.');
  const started = await NativeAudioOutput.startDawPlayback({ deviceId: Number(target.id) });
  if (!started.started || Number(started.routedDeviceId) !== Number(target.id)) {
    throw new Error('Android did not confirm the selected MG-30 output route.');
  }
  stopScheduledAudio();
  playheadSeconds = Math.max(0, position);
  playStartPosition = playheadSeconds;
  nativePlaybackStartedAt = performance.now();
  nativeOutputPlayback = true;
  playing = true;
  const generation = ++nativePlaybackGeneration;
  lastMetronomeBeat = -1;
  updateTransport();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(updatePlayheadFrame);
  setStatus('Android output route confirmed: ' + (started.routedDeviceName || 'NUX MG-30') + '. Listen to confirm the pedal output.', 'ok');
  void pumpNativeDawPlayback(playheadSeconds, generation, tracksWithAudio.map((track) => track.id));
  return true;
}

async function startPlayback(position = playheadSeconds) {
  if (project.loopEnabled) {
    const loop = activeLoopRange();
    if (position < loop.start || position >= loop.end) position = loop.start;
  }
  const tracksWithAudio = project.tracks.filter((track) => track.clips.some((clip) => mediaBuffers.has(clip.mediaId)));
  if (!tracksWithAudio.length) {
    setStatus('Import at least one audio clip before starting playback.', 'warn');
    return false;
  }
  try {
    if (project.outputRoute === 'mg30') return await startNativeDawPlayback(position, tracksWithAudio);
    nativeOutputPlayback = false;
    const context = await getAudioContext();
    stopScheduledAudio();
    const soloActive = project.tracks.some((track) => track.solo && !track.mute);
    createPlaybackMaster(context);
    const startAt = context.currentTime + 0.055;
    liveTrackNodes = new Map();
    liveSources = [];
    for (const track of project.tracks) {
      if (track.mute || (soloActive && !track.solo)) continue;
      const gain = context.createGain();
      gain.gain.value = track.gain;
      const pan = context.createStereoPanner ? context.createStereoPanner() : context.createGain();
      if ('pan' in pan) pan.pan.value = track.pan;
      const trackMeter = context.createAnalyser();
      trackMeter.fftSize = 256;
      gain.connect(pan);
      pan.connect(trackMeter);
      trackMeter.connect(playbackMaster);
      liveTrackNodes.set(track.id, { gain, pan, meter: trackMeter, meterSamples: new Float32Array(trackMeter.fftSize) });
      for (const clip of track.clips) {
        const buffer = mediaBuffers.get(clip.mediaId);
        if (!buffer) continue;
        const clipEnd = clip.startSeconds + clip.durationSeconds;
        if (clipEnd <= position) continue;
        const elapsedIntoClip = Math.max(0, position - clip.startSeconds);
        const offset = clip.sourceOffsetSeconds + elapsedIntoClip;
        const available = Math.min(clip.durationSeconds - elapsedIntoClip, buffer.duration - offset);
        if (available <= 0.01) continue;
        const source = context.createBufferSource();
        source.buffer = buffer;
        const when = startAt + Math.max(0, clip.startSeconds - position);
        connectClipWithFade(context, source, clip, elapsedIntoClip, available, when, gain);
        source.start(when, offset, available);
        liveSources.push(source);
      }
    }
    playheadSeconds = Math.max(0, position);
    playStartPosition = playheadSeconds;
    playStartContextTime = startAt;
    playing = true;
    lastMetronomeBeat = -1;
    updateTransport();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(updatePlayheadFrame);
    return true;
  } catch (error) {
    playing = false;
    stopScheduledAudio();
    updateTransport();
    setStatus('Playback could not start: ' + (error?.message || 'audio engine error'), 'warn');
    return false;
  }
}

function pausePlayback() {
  if (!playing) return;
  const rawPosition = playStartPosition + Math.max(0, nativeOutputPlayback
    ? (performance.now() - nativePlaybackStartedAt) / 1000
    : (audioContext ? audioContext.currentTime - playStartContextTime : 0));
  if (project.loopEnabled) {
    const loop = activeLoopRange();
    playheadSeconds = rawPosition >= loop.end ? loop.start + ((rawPosition - loop.start) % (loop.end - loop.start)) : rawPosition;
  } else {
    playheadSeconds = rawPosition;
  }
  playing = false;
  cancelAnimationFrame(animationFrame);
  if (nativeOutputPlayback) {
    nativeOutputPlayback = false;
    nativePlaybackGeneration += 1;
    void NativeAudioOutput.stopDawPlayback().catch(() => {});
  } else {
    stopScheduledAudio();
  }
  updateTransport();
  renderPlayhead();
}

function stopPlayback(reset = true) {
  playing = false;
  cancelAnimationFrame(animationFrame);
  if (nativeOutputPlayback) {
    nativeOutputPlayback = false;
    nativePlaybackGeneration += 1;
    void NativeAudioOutput.stopDawPlayback().catch(() => {});
  } else {
    stopScheduledAudio();
  }
  if (reset) playheadSeconds = 0;
  updateTransport();
  renderPlayhead();
}

async function togglePlayback() {
  if (playing) pausePlayback();
  else await startPlayback(playheadSeconds);
}

function getLiveRecordingElapsedSeconds() {
  if (playing && !nativeOutputPlayback && audioContext) return Math.max(0, playheadSeconds - recordingStartPosition);
  return Math.max(0, (performance.now() - recordingStartPerformanceTime) / 1000);
}

function waveformLevelsFromRecordingStats(stats, route) {
  const channels = Array.isArray(stats?.channelWaveforms) ? stats.channelWaveforms : [];
  if (!channels.length) return [];
  const capturedMask = Number(stats.channelIndexMask) || route.channelIndexMask;
  let positions = [];
  try {
    positions = selectUsbChannelPositions(capturedMask, route.channelIndexMask);
  } catch (_) {
    positions = channels.map((_, index) => index);
  }
  const selected = positions.map((position) => channels[position]?.peaks)
    .filter((peaks) => Array.isArray(peaks) && peaks.length);
  if (!selected.length) return [];
  const length = Math.max(...selected.map((peaks) => peaks.length));
  const levels = [];
  for (let index = 0; index < length; index += 1) {
    let peak = 0;
    selected.forEach((peaks) => { peak = Math.max(peak, Number(peaks[index]) || 0); });
    levels.push(Math.max(3, Math.min(100, Math.round(peak * 100))));
  }
  return levels;
}

function ensureLiveRecordingClipNode() {
  if (!recording || !recordingTrackId) return null;
  if (liveRecordingClipNode?.isConnected) return liveRecordingClipNode;
  const lane = document.querySelector('[data-track-lane="' + recordingTrackId + '"]');
  if (!lane) return null;
  const node = document.createElement('div');
  node.className = 'daw-clip daw-clip-live-recording';
  node.dataset.liveRecordingClip = 'true';
  node.setAttribute('aria-label', 'Live USB recording waveform');
  const track = getTrack(recordingTrackId);
  if (track?.color) node.style.setProperty('--track-color', track.color);
  node.style.pointerEvents = 'none';
  node.style.zIndex = '4';
  lane.appendChild(node);
  liveRecordingClipNode = node;
  updateLiveRecordingClipGeometry();
  updateLiveRecordingClipWaveform();
  return node;
}

function updateLiveRecordingClipGeometry() {
  if (!recording || !recordingTrackId) return;
  const node = ensureLiveRecordingClipNode();
  if (!node) return;
  const metrics = timelineMetrics();
  const startSeconds = snapTime(recordingStartPosition, project);
  const elapsedSeconds = getLiveRecordingElapsedSeconds();
  const left = (startSeconds / metrics.barSeconds) * project.zoom;
  const width = Math.max(24, (elapsedSeconds / metrics.barSeconds) * project.zoom);
  node.style.left = left + 'px';
  node.style.width = width + 'px';
  const track = getTrack(recordingTrackId);
  node.title = 'Recording ' + (track?.name || 'track') + ' · ' + formatClock(elapsedSeconds);
}

function updateLiveRecordingClipWaveform() {
  const node = ensureLiveRecordingClipNode();
  if (!node) return;
  const track = getTrack(recordingTrackId);
  const title = 'REC · ' + (track?.name || 'USB');
  node.innerHTML = '<strong>' + safeText(title) + '</strong>' +
    '<span class="daw-clip-fade daw-clip-fade-in"></span>' +
    '<span class="daw-clip-fade daw-clip-fade-out"></span>' +
    waveformMarkup(liveRecordingWaveform);
}

function stopLiveRecordingWaveformPolling() {
  if (recordingWaveformTimer) window.clearInterval(recordingWaveformTimer);
  recordingWaveformTimer = 0;
  recordingWaveformPollInFlight = false;
}

function removeLiveRecordingClip() {
  stopLiveRecordingWaveformPolling();
  liveRecordingClipNode?.remove();
  liveRecordingClipNode = null;
  liveRecordingWaveform = [3];
  liveRecordingInputRouteId = '';
}

function beginLiveRecordingWaveformPolling() {
  stopLiveRecordingWaveformPolling();
  const poll = async () => {
    if (!recording || recordingWaveformPollInFlight) return;
    const recorder = window.NUXStudioRecorder;
    if (typeof recorder?.getRecordingStats !== 'function') return;
    recordingWaveformPollInFlight = true;
    try {
      const stats = await recorder.getRecordingStats();
      if (!recording || !stats?.recording) return;
      const route = DAW_INPUT_ROUTES.find((item) => item.id === liveRecordingInputRouteId) || DAW_INPUT_ROUTES[0];
      const levels = waveformLevelsFromRecordingStats(stats, route);
      if (levels.length) {
        liveRecordingWaveform = levels;
        updateLiveRecordingClipWaveform();
      }
      updateLiveRecordingClipGeometry();
    } catch (_) {
      // The take remains recordable; a temporary stats-query failure only
      // pauses the live preview and must not stop or interrupt USB capture.
    } finally {
      recordingWaveformPollInFlight = false;
    }
  };
  void poll();
  recordingWaveformTimer = window.setInterval(() => { void poll(); }, 200);
}

async function startDawRecording() {
  if (recording) {
    await stopDawRecording();
    return;
  }
  const track = project.tracks.find((item) => item.armed);
  if (!track) {
    setStatus('Arm one track before recording.', 'warn');
    return;
  }
  const recorder = window.NUXStudioRecorder;
  if (!recorder?.isNative?.()) {
    setStatus('USB recording for DAW overdubs is available in the Android APK only. No phone-microphone fallback is used.', 'warn');
    return;
  }
  if (recorder.isRecording()) {
    setStatus('The Quick Record input is already recording. Stop it before starting a DAW overdub.', 'warn');
    return;
  }
  try {
    const inputRoute = DAW_INPUT_ROUTES.find((item) => item.id === track.inputRoute) || DAW_INPUT_ROUTES[0];
    if (inputRoute.captureMode !== 'multichannel') {
      setStatus('Pilih sumber USB untuk track ' + track.name + ' di Track Settings. File/Import digunakan untuk memasukkan audio, bukan merekam USB.', 'warn');
      return;
    }
    const captureMode = 'multichannel';
    const result = await recorder.start({ captureMode, channelIndexMask: inputRoute.channelIndexMask });
    if (!result?.recording) throw new Error('The MG-30 USB recorder did not confirm that recording started.');
    // USB capture is independent of the Web Audio output path. Keep an idle
    // context suspended so it cannot take audio focus from the phone's player.
    if (!playing && audioContext?.state === 'running') await audioContext.suspend();
    const context = playing ? audioContext : null;
    recording = true;
    recordingTrackId = track.id;
    recordingStartPosition = playheadSeconds;
    recordingStartPerformanceTime = performance.now();
    liveRecordingInputRouteId = inputRoute.id;
    liveRecordingWaveform = [3];
    if (!playing) {
      playStartPosition = playheadSeconds;
      playStartContextTime = context ? context.currentTime : 0;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updatePlayheadFrame);
    }
    updateTransport();
    ensureLiveRecordingClipNode();
    updateLiveRecordingClipGeometry();
    beginLiveRecordingWaveformPolling();
    setStatus('Recording ' + track.name + ' · source ' + inputRoute.label +
      ' · raw USB capture ' + (result.channels || 2) + ' channel(s) from ' + (result.routeName || 'NUX MG-30') +
      '. The selected channel(s) will be routed into this track only.', 'ok');
  } catch (error) {
    if (recorder.isRecording()) {
      try { await recorder.stop(); } catch (_) {}
    }
    recording = false;
    recordingTrackId = '';
    cancelAnimationFrame(animationFrame);
    removeLiveRecordingClip();
    updateTransport();
    setStatus('DAW recording failed: ' + (error?.message || 'USB recording error'), 'warn');
  }
}

async function stopDawRecording() {
  if (!recording) return;
  const trackId = recordingTrackId;
  const startAt = recordingStartPosition;
  if (playing && audioContext) {
    playheadSeconds = playStartPosition + Math.max(0, audioContext.currentTime - playStartContextTime);
  } else {
    playheadSeconds = playStartPosition + Math.max(0, (performance.now() - recordingStartPerformanceTime) / 1000);
  }
  recording = false;
  recordingTrackId = '';
  cancelAnimationFrame(animationFrame);
  stopLiveRecordingWaveformPolling();
  updateTransport();
  try {
    const recorder = window.NUXStudioRecorder;
    const take = await recorder.stop();
    pausePlayback();
    if (!take?.path) throw new Error('The MG-30 recorder did not return a saved WAV take.');
    await importQuickTake(take, trackId, startAt);
    const track = getTrack(trackId);
    const route = DAW_INPUT_ROUTES.find((item) => item.id === track?.inputRoute) || DAW_INPUT_ROUTES[0];
    setStatus('Take saved to ' + (track?.name || 'track') + ' · input ' + route.label +
      ' · raw source ' + (take.channels || 2) + ' ch / ' + (take.sampleRate || 48000) + ' Hz.', 'ok');
  } catch (error) {
    setStatus('Could not save DAW overdub: ' + (error?.message || 'WAV save error'), 'warn');
  } finally {
    removeLiveRecordingClip();
    updateTransport();
    refreshQuickTakes();
  }
}

async function handleDawRecordClick() {
  if (recording) await stopDawRecording();
  else await startDawRecording();
}

async function renderAudioChunk(trackIds, startSeconds, frameCount, mode) {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) throw new Error('Offline Audio rendering is not supported by this WebView.');
  const context = new OfflineContext(2, frameCount, SAMPLE_RATE);
  const master = context.createGain();
  master.gain.value = mode === 'mix' ? project.masterGain : 1;
  master.connect(context.destination);
  const selected = new Set(trackIds);
  const soloActive = mode === 'mix' && project.tracks.some((track) => track.solo && !track.mute);
  const chunkEnd = startSeconds + frameCount / SAMPLE_RATE;
  for (const track of project.tracks) {
    if (!selected.has(track.id)) continue;
    if (mode === 'mix' && (track.mute || (soloActive && !track.solo))) continue;
    if (!track.clips.length) continue;
    const gain = context.createGain();
    gain.gain.value = track.gain;
    const pan = context.createStereoPanner ? context.createStereoPanner() : context.createGain();
    if ('pan' in pan) pan.pan.value = track.pan;
    gain.connect(pan);
    pan.connect(master);
    for (const clip of track.clips) {
      const buffer = mediaBuffers.get(clip.mediaId);
      if (!buffer) throw new Error('Missing audio media for clip "' + clip.name + '". Load or re-import this clip before exporting.');
      const clipStart = clip.startSeconds;
      const clipEnd = clip.startSeconds + clip.durationSeconds;
      const overlapStart = Math.max(startSeconds, clipStart);
      const overlapEnd = Math.min(chunkEnd, clipEnd);
      if (overlapEnd <= overlapStart) continue;
      const offsetIntoClip = overlapStart - clipStart;
      const sourceOffset = clip.sourceOffsetSeconds + offsetIntoClip;
      const playbackDuration = Math.min(overlapEnd - overlapStart, buffer.duration - sourceOffset);
      if (playbackDuration <= 0) continue;
      const source = context.createBufferSource();
      source.buffer = buffer;
      const sourceWhen = overlapStart - startSeconds;
      connectClipWithFade(context, source, clip, offsetIntoClip, playbackDuration, sourceWhen, gain);
      source.start(sourceWhen, sourceOffset, playbackDuration);
    }
  }
  return context.startRendering();
}

async function renderWav(trackIds, mode) {
  const selectedTracks = project.tracks.filter((track) => trackIds.includes(track.id));
  if (!selectedTracks.some((track) => track.clips.length)) throw new Error('There is no audio on the selected track(s) to export.');
  const duration = projectDurationSeconds(project);
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_PROJECT_SECONDS) {
    throw new Error('Mobile DAW export is limited to 30 minutes per render. Shorten the project timeline and try again.');
  }
  for (const track of selectedTracks) {
    for (const clip of track.clips) {
      if (!mediaBuffers.has(clip.mediaId)) {
        const media = await databaseRequest('media', 'readonly', 'get', clip.mediaId);
        if (!media?.blob) throw new Error('Audio source for "' + clip.name + '" is missing from local storage.');
        mediaBuffers.set(clip.mediaId, await decodeBlob(media.blob));
      }
    }
  }
  const totalFrames = Math.ceil(duration * SAMPLE_RATE);
  const chunkFrames = RENDER_CHUNK_SECONDS * SAMPLE_RATE;
  const pcmChunks = [];
  for (let start = 0; start < totalFrames; start += chunkFrames) {
    const count = Math.min(chunkFrames, totalFrames - start);
    const rendered = await renderAudioChunk(selectedTracks.map((track) => track.id), start / SAMPLE_RATE, count, mode);
    pcmChunks.push(floatStereoToPcm24(rendered.getChannelData(0), rendered.getChannelData(1)));
    const progress = Math.round(Math.min(1, (start + count) / totalFrames) * 100);
    setStatus('Rendering ' + (mode === 'mix' ? 'Full Mix' : selectedTracks[0].name + ' stem') + '… ' + progress + '%');
  }
  return makeWavBlob(pcmChunks, totalFrames, SAMPLE_RATE);
}

function blobToBase64(bytes) {
  let binary = '';
  const step = 0x4000;
  for (let offset = 0; offset < bytes.length; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step));
  }
  return btoa(binary);
}

async function saveExportBlob(blob, fileName, mimeType) {
  if (!Capacitor.isNativePlatform() || !NativeDawFiles?.beginExport) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { success: true, fileName, browserDownload: true };
  }
  let sessionId = '';
  try {
    const started = await NativeDawFiles.beginExport({ fileName });
    sessionId = started.sessionId;
    if (!sessionId) throw new Error('Android export session could not be created.');
    const chunkSize = 128 * 1024;
    for (let offset = 0; offset < blob.size; offset += chunkSize) {
      const bytes = new Uint8Array(await blob.slice(offset, offset + chunkSize).arrayBuffer());
      await NativeDawFiles.appendExportChunk({ sessionId, dataBase64: blobToBase64(bytes) });
      setStatus('Preparing Android file export… ' + Math.round(Math.min(blob.size, offset + bytes.length) / blob.size * 100) + '%');
    }
    return await NativeDawFiles.finishExport({ sessionId, fileName, mimeType });
  } catch (error) {
    if (sessionId) {
      try { await NativeDawFiles.cancelExport({ sessionId }); } catch (_) {}
    }
    throw error;
  }
}

async function exportFullMix() {
  if (recording || playing) {
    if (recording) await stopDawRecording();
    pausePlayback();
  }
  try {
    setStatus('Preparing stereo Full Mix export…');
    const tracks = project.tracks.filter((track) => track.clips.length);
    const blob = await renderWav(tracks.map((track) => track.id), 'mix');
    const fileName = safeExportName(project.name, 'MG30-Studio') + '-Full-Mix.wav';
    await saveExportBlob(blob, fileName, 'audio/wav');
    setStatus('Full Mix exported: ' + fileName + ' · WAV PCM 24-bit / 48 kHz.', 'ok');
  } catch (error) {
    setStatus('Full Mix export failed: ' + (error?.message || 'render error'), 'warn');
  }
}

function openStemDialog() {
  const holder = $('dawStemChecklist');
  const dialog = $('dawStemDialog');
  if (!holder || !dialog) return;
  const tracks = project.tracks.filter((track) => track.clips.length);
  if (!tracks.length) {
    setStatus('Import or record audio before exporting stems.', 'warn');
    return;
  }
  holder.innerHTML = tracks.map((track) =>
    '<label class="daw-stem-option"><input type="checkbox" value="' + track.id + '" checked><strong>' + safeText(track.name) + '</strong><small>' + track.clips.length + ' clip(s)</small></label>'
  ).join('');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else setStatus('Stem export selection requires a dialog-capable WebView.', 'warn');
}

async function confirmStemExport() {
  const dialog = $('dawStemDialog');
  const selectedIds = [...(dialog?.querySelectorAll('input[type=checkbox]:checked') || [])].map((input) => input.value);
  const selected = selectStemTracks(project, selectedIds);
  if (!selected.length) {
    setStatus('Select at least one track that contains audio.', 'warn');
    return;
  }
  if (recording || playing) {
    if (recording) await stopDawRecording();
    pausePlayback();
  }
  const button = $('dawStemConfirm');
  if (button) button.disabled = true;
  try {
    const entries = [];
    for (let index = 0; index < selected.length; index += 1) {
      const track = selected[index];
      const fileName = String(project.tracks.indexOf(track) + 1).padStart(2, '0') + '-' + safeExportName(track.name, 'Track') + '.wav';
      setStatus('Rendering stem ' + (index + 1) + ' of ' + selected.length + ': ' + track.name);
      entries.push({ name: fileName, blob: await renderWav([track.id], 'stem') });
    }
    setStatus('Packing selected stems into a ZIP archive…');
    const zip = await createStoredZip(entries);
    const archiveName = safeExportName(project.name, 'MG30-Studio') + '-Stems.zip';
    await saveExportBlob(zip, archiveName, 'application/zip');
    if (dialog?.open) dialog.close();
    setStatus('Stem ZIP exported: ' + archiveName + ' · ' + entries.length + ' WAV file(s).', 'ok');
  } catch (error) {
    setStatus('Stem export failed: ' + (error?.message || 'ZIP render error'), 'warn');
  } finally {
    if (button) button.disabled = false;
  }
}

function updateProjectField(field, value) {
  if (field === 'tempo') project.tempo = Math.max(40, Math.min(240, Math.round(Number(value) || 100)));
  if (field === 'timeSignature') project.timeSignature = ['4/4', '3/4', '6/8'].includes(value) ? value : '4/4';
  if (field === 'metronome') project.metronomeEnabled = Boolean(value);
  if (field === 'loop') project.loopEnabled = Boolean(value);
  if (field === 'snap') project.snap = ['off', 'beat', 'bar', 'eighth'].includes(value) ? value : 'beat';
  if (field === 'zoom') project.zoom = Math.max(44, Math.min(180, Number(value) || 92));
  renderProject();
  scheduleProjectSave();
}


function addTrackInputRoutingStyles() {
  if ($('dawTrackInputRoutingStyles')) return;
  const style = document.createElement('style');
  style.id = 'dawTrackInputRoutingStyles';
  style.textContent = `
    #page-studio .daw-quick-toolbar{gap:5px!important;padding:7px!important}
    #page-studio .daw-quick-toolbar-primary{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:6px!important;min-width:0!important}
    #page-studio .daw-quick-toolbar-position{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:5px!important;min-width:0!important;min-height:34px!important}
    #page-studio .daw-position-readout{display:grid!important;justify-items:start!important;gap:0!important;min-width:76px!important;flex:0 0 auto!important;text-align:left!important}
    #page-studio .daw-inline-history-tools{display:flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;min-width:0!important}
    #page-studio .daw-toolbar-icon-btn{display:grid!important;place-items:center!important;flex:0 0 32px!important;width:32px!important;min-width:32px!important;height:34px!important;min-height:34px!important;padding:0!important;border:1px solid #34413c!important;border-radius:8px!important;background:#141d1b!important;color:#e6eee4!important;font-size:14px!important;font-weight:800!important;line-height:1!important;cursor:pointer!important}
    #page-studio .daw-toolbar-icon-btn:disabled{opacity:.32!important;cursor:not-allowed!important}
    #page-studio .daw-toolbar-icon-btn:not(:disabled):active{border-color:#8fae60!important;color:#c5f36b!important}
    #page-studio .daw-compact-menu-row{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:4px!important;min-width:0!important}
    #page-studio .daw-position-readout strong{font-size:clamp(18px,4.8vw,23px)!important;line-height:1.02!important}
    #page-studio .daw-position-readout small{font-size:9px!important;line-height:1.05!important}
    #page-studio .daw-section-controls{display:flex;align-items:center;gap:5px;flex:0 0 auto}
    #page-studio .daw-section-loop-toggle{display:flex;align-items:center;justify-content:flex-start;gap:6px;width:100%;min-height:34px;padding:0 8px;border:1px solid #34413c;border-radius:8px;background:#141d1b;color:#e7eee5;font-size:10px;font-weight:750;white-space:nowrap}
    #page-studio .daw-section-loop-toggle input{width:14px;height:14px;margin:0;accent-color:#c5f36b}
    #page-studio .daw-section-loop-toggle:has(input:checked){border-color:#c5f36b;color:#c5f36b;background:#c5f36b12}
    #page-studio .daw-section-menu-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
    #page-studio .daw-section-menu-controls .daw-tool-btn{min-width:0;min-height:34px;padding:5px 7px;font-size:10px;text-align:center}
    #page-studio .daw-loop-range-readout{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:9px;color:#8fd7cf;white-space:nowrap;padding:1px 2px}
    #page-studio .daw-action-menu{position:relative;flex:0 0 auto;z-index:40}
    #page-studio .daw-action-menu>summary{display:flex;align-items:center;justify-content:center;min-height:32px;padding:4px 8px;border:1px solid #34413c;border-radius:8px;background:#141d1b;color:#dce8d8;font-size:9px;font-weight:800;white-space:nowrap;cursor:pointer;list-style:none}
    #page-studio .daw-action-menu>summary::-webkit-details-marker{display:none}
    #page-studio .daw-action-menu[open]>summary{border-color:#8fae60;color:#c5f36b}
    #page-studio .daw-action-menu-panel{position:absolute;z-index:60;right:0;top:37px;width:min(230px,calc(100vw - 34px));display:grid;gap:6px;padding:9px;border:1px solid #3d4a3e;border-radius:11px;background:#111a16;box-shadow:0 8px 24px #0009}
    #page-studio .daw-section-menu-panel{left:auto!important;right:0!important;width:min(225px,calc(100vw - 32px))!important;max-width:calc(100vw - 32px)!important;box-sizing:border-box!important}
    #page-studio .daw-clip-menu-panel{width:min(245px,calc(100vw - 34px))}
    #page-studio .daw-action-menu-panel .daw-tool-btn{width:100%;min-width:0;min-height:36px;padding:6px 9px;text-align:left;font-size:10px}
    #page-studio .daw-action-menu-panel .daw-tool-btn:disabled{opacity:.35}
    #page-studio .daw-clip-quick-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
    #page-studio .daw-clip-quick-actions .daw-tool-btn{min-width:0;min-height:34px;padding:5px 3px;text-align:center}
    #page-studio .daw-history-nav-grid .daw-tool-btn{min-height:34px;text-align:center}
    #page-studio .daw-danger-btn{border-color:#70423e!important;background:#2b1918!important;color:#ffb6a9!important}
    #page-studio .daw-loop-range{position:absolute;top:0;bottom:0;background:rgba(83,212,199,.18);border-left:2px solid #53d4c7;border-right:2px solid #53d4c7;pointer-events:none;z-index:1}
    #page-studio .daw-ruler-inner{position:relative}
    #page-studio .daw-more-menu{position:relative!important;z-index:50!important}
    #page-studio .daw-more-menu-panel{position:absolute!important;z-index:60!important;right:0!important;top:42px!important;width:min(280px,calc(100vw - 48px))!important;max-height:min(64vh,460px)!important;overflow-y:auto!important;display:grid!important;gap:6px!important;padding:9px!important;border:1px solid #3d4a3e!important;border-radius:10px!important;background:#111a16!important;box-shadow:0 8px 24px #0009!important}
    #page-studio .daw-menu-section-label{font-size:9px;color:#91a08b;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 1px}
    #page-studio .daw-fade-target{font-size:10px;color:#9ba996;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #page-studio .daw-toolbar-fade-control{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px;border:1px solid #29372e;border-radius:9px;background:#0d1512}
    #page-studio .daw-toolbar-fade-control label{display:grid;gap:5px;font-size:10px;color:#dce8d8}
    #page-studio .daw-toolbar-fade-control strong{font-size:10px;color:#c5f36b}
    #page-studio .daw-toolbar-fade-control input{width:100%;min-width:0;accent-color:#c5f36b}
    #page-studio .daw-toolbar-fade-control input:disabled{opacity:.3}
    #page-studio .daw-menu-control{display:flex;align-items:center;justify-content:space-between;gap:9px;color:#cbd8c8;font-size:10px}
    #page-studio .daw-menu-control select{max-width:125px;padding:6px;border:1px solid #39483a;border-radius:7px;background:#101713;color:#e9f1e5}
    #page-studio .daw-menu-control input{width:125px;accent-color:#c5f36b}
    #page-studio .daw-edit-menu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
    #page-studio .daw-edit-menu-grid .daw-tool-btn{width:100%;min-width:0;min-height:36px;padding:6px 8px;font-size:10px;text-align:left;white-space:nowrap}
    @media(max-width:380px){#page-studio .daw-position-readout{min-width:70px!important}#page-studio .daw-toolbar-icon-btn{flex-basis:28px!important;width:28px!important;min-width:28px!important;height:32px!important;min-height:32px!important;font-size:12px!important}#page-studio .daw-action-menu>summary{padding:4px 6px!important}#page-studio .daw-inline-history-tools{gap:3px!important}}
    @media(max-width:520px){#page-studio .daw-quick-toolbar-position{gap:4px!important}#page-studio .daw-clock-actions{gap:3px!important}#page-studio .daw-clock-action-btn{min-width:30px!important;height:32px!important;padding:0 5px!important;font-size:9px!important}#page-studio .daw-position-readout{min-width:78px!important}#page-studio .daw-section-toolbar{gap:4px;flex-wrap:wrap}#page-studio .daw-section-controls{gap:4px}#page-studio .daw-section-loop-toggle{padding:0 6px;font-size:9px}#page-studio .daw-section-toolbar .daw-tool-btn{padding:4px 6px;font-size:9px}#page-studio .daw-loop-range-readout{flex:1 1 75px;font-size:8px}#page-studio .daw-section-context{margin-left:auto}#page-studio .daw-toolbar-fade-control{grid-template-columns:repeat(2,minmax(0,1fr))}}
    #page-studio .daw-input-routing-panel{margin:14px 0;padding:12px;border:1px solid #334139;border-radius:14px;background:#101816;color:#e6eddf}
    #page-studio .daw-input-routing-head{margin-bottom:12px}
    #page-studio .daw-input-routing-eyebrow{font-size:9px;letter-spacing:.12em;font-weight:850;color:#a7b89a}
    #page-studio .daw-input-routing-panel h4{margin:4px 0 5px;font-size:15px;font-weight:800;color:#eaf1e6}
    #page-studio .daw-input-routing-panel p{margin:0;color:#97a694;font-size:10px;line-height:1.5}
    #page-studio .daw-input-routing-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    #page-studio .daw-input-route-row{display:grid;gap:7px;padding:10px;border:1px solid #303d34;border-radius:10px;background:#0c1411;color:#d5e1d3;font-size:11px;font-weight:750}
    #page-studio .daw-input-route-row select{appearance:none;-webkit-appearance:none;width:100%;min-width:0;min-height:48px;padding:0 34px 0 12px;border:1px solid #3a493e;border-radius:9px;background-color:#111b16;background-image:linear-gradient(45deg,transparent 50%,#b7c5b3 50%),linear-gradient(135deg,#b7c5b3 50%,transparent 50%);background-position:calc(100% - 17px) 21px,calc(100% - 12px) 21px;background-size:5px 5px,5px 5px;background-repeat:no-repeat;color:#e6eddf;font-size:12px}
    #page-studio .daw-input-routing-note{display:block;margin-top:10px;color:#97a694;font-size:10px;line-height:1.55}
    #page-studio .daw-usb-diagnostic{display:grid;gap:8px;margin-top:12px;padding:11px;border:1px solid #303d34;border-radius:10px;background:#0c1411}
    #page-studio .daw-usb-diagnostic strong{font-size:11px;color:#e6eddf}
    #page-studio .daw-usb-diagnostic p{font-size:10px;color:#97a694}
    #page-studio .daw-usb-diagnostic button{justify-self:start;min-height:40px}
    #page-studio .daw-usb-diagnostic-result{font-size:10px;line-height:1.65;white-space:pre-wrap;color:#b9c8b5}
    @media(max-width:420px){#page-studio .daw-input-routing-list{grid-template-columns:1fr}}
    #page-studio .daw-output-route-field{display:grid;gap:8px;min-width:0}
    #page-studio .daw-output-route-label{font-size:10px;font-weight:800;letter-spacing:.06em;color:#9eac99}
    #page-studio .daw-output-route-menu{position:relative;z-index:8;min-width:0}
    #page-studio .daw-output-route-menu>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:56px;padding:0 15px;border:1px solid #3b493d;border-radius:12px;background:#0c1411;color:#eef4e9;font-size:14px;font-weight:750;list-style:none;cursor:pointer}
    #page-studio .daw-output-route-menu>summary::-webkit-details-marker{display:none}
    #page-studio .daw-output-route-menu[open]>summary{border-color:#a6ce62;border-bottom-left-radius:7px;border-bottom-right-radius:7px}
    #page-studio .daw-output-route-chevron{flex:0 0 auto;color:#c5f36b;font-size:20px;line-height:1;transition:transform .15s ease}
    #page-studio .daw-output-route-menu[open] .daw-output-route-chevron{transform:rotate(180deg)}
    #page-studio .daw-output-route-options{position:absolute;top:calc(100% + 5px);left:0;right:0;z-index:30;display:grid;gap:5px;padding:7px;border:1px solid #3b493d;border-radius:11px;background:#101816;box-shadow:0 12px 28px #0009}
    #page-studio .daw-output-route-options button{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-width:0;min-height:58px;padding:9px 12px;border:1px solid transparent;border-radius:9px;background:#0c1411;color:#e6eddf;text-align:left}
    #page-studio .daw-output-route-options button.active{border-color:#a6ce62;background:#18251a}
    #page-studio .daw-output-route-options button>span:first-child{display:grid;gap:3px;min-width:0}
    #page-studio .daw-output-route-options strong{font-size:12px;font-weight:800}
    #page-studio .daw-output-route-options small{color:#9eac99;font-size:10px}
    #page-studio .daw-output-route-check{color:#c5f36b;opacity:0;font-weight:900;font-size:16px}
    #page-studio .daw-output-route-options button.active .daw-output-route-check{opacity:1}
    #page-studio .daw-output-route-native{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;opacity:0!important;pointer-events:none!important}

    #page-studio .daw-quick-toolbar{position:relative!important;z-index:32!important;overflow:visible!important;isolation:isolate!important}
    /* Keep the primary tempo row above the compact secondary-action menus. */
    #page-studio .daw-quick-toolbar-primary{position:relative!important;z-index:90!important}
    #page-studio .daw-quick-toolbar-position{position:relative!important;z-index:80!important}
    #page-studio .daw-more-menu{position:relative!important;z-index:100!important}
    #page-studio .daw-more-menu-panel{z-index:1000!important}
    #page-studio .daw-timeline-panel{position:relative!important;z-index:1!important}
    #page-studio .daw-clock-action-btn.daw-cursor-action-btn{min-width:30px!important;padding:0 4px!important;font-size:11px!important;letter-spacing:-1px!important}

  `;
  document.head.appendChild(style);
}

function syncTrackInputRoutingPanel() {
  const list = $('dawTrackInputRoutingList');
  if (!list) return;
  list.innerHTML = project.tracks.map((track, index) => {
    const routeId = DAW_INPUT_ROUTES.some((route) => route.id === track.inputRoute) ? track.inputRoute : 'file';
    return '<label class="daw-input-route-row"><span>' + (index + 1) + ' · ' + safeText(track.name) + '</span>' +
      '<select data-track-input-route="' + track.id + '" aria-label="' + safeText(track.name) + ' recording input">' +
      DAW_INPUT_ROUTES.map((route) => '<option value="' + route.id + '"' + (route.id === routeId ? ' selected' : '') + '>' + safeText(route.label) + '</option>').join('') +
      '</select></label>';
  }).join('');
}

function renderUsbDiagnosticButton() {
  const button = $('dawUsbDiagnosticButton');
  if (!button) return;
  button.textContent = usbDiagnosticRecording ? 'STOP RAW USB 1–4 TEST' : 'START RAW USB 1–4 TEST';
  button.classList.toggle('is-recording', usbDiagnosticRecording);
  button.disabled = !usbDiagnosticRecording && Boolean(window.NUXStudioRecorder?.isRecording?.());
}

function formatDiagnosticDb(value) {
  const db = Number(value);
  return Number.isFinite(db) ? (db <= -239 ? '-∞' : db.toFixed(1)) + ' dBFS' : 'n/a';
}

async function toggleRawUsbDiagnostic() {
  const recorder = window.NUXStudioRecorder;
  if (usbDiagnosticRecording) {
    try {
      const take = await recorder.stop();
      usbDiagnosticRecording = false;
      const rows = Array.isArray(take?.channelStats) ? take.channelStats : [];
      const report = rows.map((item) =>
        'USB IN ' + item.channel + '  Peak ' + formatDiagnosticDb(item.peakDbfs) +
        '  RMS ' + formatDiagnosticDb(item.rmsDbfs)
      );
      const header = 'Take: ' + (take?.fileName || 'not returned') +
        '\nEndpoint: ' + (take?.routeName || 'MG-30 USB') +
        '\nActual channels: ' + (take?.channels || 0) +
        ' · requested mask: 0x' + Number(take?.requestedChannelIndexMask || 0).toString(16).toUpperCase() +
        ' · actual mask: 0x' + Number(take?.channelIndexMask || 0).toString(16).toUpperCase() +
        '\nBytes: ' + (take?.bytesWritten || take?.dataBytes || 0) +
        '\n' + (report.length ? report.join('\n') : 'Per-channel statistics were not returned.');
      const result = $('dawUsbDiagnosticResult');
      if (result) result.textContent = header;
      setStatus('Raw USB diagnostic saved. Export the four-channel take from Quick Takes for further analysis.', 'ok');
      refreshQuickTakes();
    } catch (error) {
      usbDiagnosticRecording = false;
      setStatus('The USB diagnostic could not be finalized: ' + (error?.message || 'capture error'), 'warn');
    } finally {
      renderUsbDiagnosticButton();
    }
    return;
  }
  if (!recorder?.isNative?.()) {
    setStatus('Raw USB diagnostics require the Android app.', 'warn');
    return;
  }
  if (recording || recorder.isRecording()) {
    setStatus('Stop the current DAW/Quick Record recording before starting the raw USB diagnostic.', 'warn');
    return;
  }
  try {
    if (!playing && audioContext?.state === 'running') await audioContext.suspend();
    const result = await recorder.start({ captureMode: 'diagnostic', channelIndexMask: 0xF });
    if (!result?.recording) throw new Error('MG-30 did not confirm a four-channel USB capture.');
    usbDiagnosticRecording = true;
    const report = $('dawUsbDiagnosticResult');
    if (report) report.textContent = 'Capturing USB IN mask 0xF · ' + (result.channels || 0) +
      ' channels · ' + (result.sampleRate || 0) + ' Hz. Play the phone/host audio that should be included by Loopback, then stop this test.';
    setStatus('The four-channel USB diagnostic is recording. This does not change any DAW track or preset.', 'ok');
  } catch (error) {
    usbDiagnosticRecording = false;
    setStatus('Could not start the raw USB diagnostic: ' + (error?.message || 'capture error'), 'warn');
  } finally {
    renderUsbDiagnosticButton();
  }
}

function mountTrackInputRoutingPanel() {
  const host = $('dawTrackSettingsPage');
  const projectSettings = host?.querySelector('.daw-project-settings');
  if (!host || !projectSettings || $('dawTrackInputRoutingPanel')) return;
  addTrackInputRoutingStyles();
  const panel = document.createElement('section');
  panel.id = 'dawTrackInputRoutingPanel';
  panel.className = 'daw-settings-section daw-input-routing-panel';
  panel.innerHTML = `
    <div class="daw-input-routing-head">
      <span class="daw-input-routing-eyebrow">USB AUDIO · PER-TRACK INPUT</span>
      <h4>Track Input Routing</h4>
      <p>Four fixed tracks. USB Input 1/2 and Wet Sync 3/4 are separate paths. Input 3/4 is not automatically the phone's playback loopback.</p>
    </div>
    <div class="daw-input-routing-list" id="dawTrackInputRoutingList"></div>
    <small class="daw-input-routing-note">Input 1 = mono · Inputs 1–2 = stereo + host loopback mix when Routing Mode is Normal and Loopback is ON · Inputs 3–4 = Wet Sync (Dry Out mode). Phone loopback uses the USB Input 1–2 recording path, not a separate USB bus. To keep backing tracks separate, use Audio file / Import; separation of guitar and playback while Loopback is ON has not been verified.</small>
  `;
  host.insertBefore(panel, projectSettings);
  syncTrackInputRoutingPanel();
  // Raw USB diagnostic panel removed from the user-facing Track Settings UI.
  host.addEventListener('change', (event) => {
    const select = event.target.closest('[data-track-input-route]');
    if (!select) return;
    const track = getTrack(select.dataset.trackInputRoute);
    const route = DAW_INPUT_ROUTES.find((item) => item.id === select.value);
    if (!track || !route) return;
    track.inputRoute = route.id;
    track.input = route.label;
    renderProject();
    scheduleProjectSave();
    setStatus(track.name + ' input set to ' + route.label + '. This applies to the next recording only; existing clips remain unchanged.', 'ok');
  });
}

function syncStudioPinnedControls() {
  const dock = $('dawStudioDock');
  const appNav = document.querySelector('.nav');
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  if (!dock || !appNav || !viewportHeight) return;
  const navRect = appNav.getBoundingClientRect();
  const navIsFixedAtBottom = navRect.height > 0
    && navRect.top < viewportHeight
    && Math.abs(viewportHeight - navRect.bottom) < Math.max(8, navRect.height * 0.15);

  // The nav occupies the safe-area too. Place the dock 8px above its actual top.
  // If the nav is not currently measurable, fall back to the known mobile nav
  // footprint rather than using a stale Studio content width/offset.
  const dockBottom = navIsFixedAtBottom
    ? Math.ceil(viewportHeight - navRect.top + 8)
    : Math.ceil((appNav.offsetHeight || 64) + 16);
  dock.style.setProperty('--studio-dock-bottom', dockBottom + 'px');
}

function setDawPage(page) {
  const selected = ['timeline', 'mixer', 'track-settings'].includes(page) ? page : 'timeline';
  selectedDawPage = selected;
  const workspace = $('studio-daw-workspace');
  workspace?.querySelectorAll('[data-daw-page-panel]').forEach((panel) => {
    const active = panel.dataset.dawPagePanel === selected;
    panel.hidden = !active;
    panel.setAttribute('aria-hidden', String(!active));
    panel.style.setProperty('display', active ? 'flex' : 'none', 'important');
  });
  workspace?.querySelectorAll('[data-daw-page]').forEach((button) => {
    const active = button.dataset.dawPage === selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  try { localStorage.setItem('mg30-studio-daw-page', selected); } catch (_) {}
  syncStudioPinnedControls();
  if (selected === 'mixer') renderMixer();
  if (selected === 'track-settings') {
    renderInspector();
    void populateSavedProjects();
  }
}

function setStudioMode(mode) {
  const selected = ['jam', 'record', 'daw'].includes(mode) ? mode : 'daw';
  document.querySelectorAll('[data-studio-mode]').forEach((button) => {
    const active = button.dataset.studioMode === selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  const studio = $('page-studio');
  studio?.querySelectorAll(':scope > [data-studio-mode-panel]').forEach((panel) => {
    const active = panel.dataset.studioModePanel === selected;
    panel.hidden = !active;
    panel.setAttribute('aria-hidden', String(!active));
    // The DAW workspace uses an explicit flex layout; keep its display state
    // scoped to Studio so page rules cannot leak into Jam or Record.
    panel.style.setProperty('display', active ? (panel.id === 'studio-daw-workspace' ? 'flex' : 'block') : 'none', 'important');
  });
  try { localStorage.setItem('mg30-studio-last-mode', selected); } catch (_) {}
  syncStudioPinnedControls();
  if (selected === 'daw') {
    renderPlayhead();
    refreshQuickTakes();
  } else {
    if (recording) void stopDawRecording();
    else if (playing) pausePlayback();
  }
}

function bindEvents() {
  syncStudioPinnedControls();
  mountTrackInputRoutingPanel();
  renderOutputRoutingPanel();
  window.addEventListener('resize', syncStudioPinnedControls, { passive: true });
  document.querySelector('.nav')?.addEventListener('click', (event) => {
    if (event.target.closest('button[data-page="studio"]')) {
      window.requestAnimationFrame(syncStudioPinnedControls);
    }
  });
  document.querySelectorAll('[data-studio-mode]').forEach((button) => {
    button.addEventListener('click', () => setStudioMode(button.dataset.studioMode));
  });
  document.querySelectorAll('[data-daw-page]').forEach((button) => {
    button.addEventListener('click', () => setDawPage(button.dataset.dawPage));
  });
  $('dawNewProject')?.addEventListener('click', () => { void createNewProject(); });
  $('dawSaveProject')?.addEventListener('click', () => { void saveProject(true); });
  $('dawSavedProjects')?.addEventListener('change', (event) => { if (event.target.value) void loadProject(event.target.value); });
  $('dawProjectName')?.addEventListener('change', (event) => {
    project.name = event.target.value.trim().slice(0, 80) || 'Untitled Project';
    event.target.value = project.name;
    if ($('dawProjectSummary')) $('dawProjectSummary').textContent = project.name;
    scheduleProjectSave();
    void populateSavedProjects();
  });
  $('dawTempo')?.addEventListener('change', (event) => updateProjectField('tempo', event.target.value));
  $('dawTimeSignature')?.addEventListener('change', (event) => updateProjectField('timeSignature', event.target.value));
  $('dawMetronome')?.addEventListener('change', (event) => updateProjectField('metronome', event.target.checked));
  $('dawLoop')?.addEventListener('change', (event) => updateProjectField('loop', event.target.checked));
  $('dawTrimStart')?.addEventListener('click', () => trimSelectedClipToPlayhead('start'));
  $('dawTrimEnd')?.addEventListener('click', () => trimSelectedClipToPlayhead('end'));
  $('dawSplitClip')?.addEventListener('click', splitSelectedClip);
  $('dawDeleteClip')?.addEventListener('click', deleteSelectedClip);
  $('dawDeleteTrack')?.addEventListener('click', deleteSelectedTrack);
  $('dawCopyClip')?.addEventListener('click', copySelectedClip);
  $('dawPasteClip')?.addEventListener('click', pasteClip);
  $('dawDuplicateClip')?.addEventListener('click', duplicateSelectedClip);
  $('dawLoopIn')?.addEventListener('click', () => setLoopBoundary('start'));
  $('dawLoopOut')?.addEventListener('click', () => setLoopBoundary('end'));
  $('dawClearLoop')?.addEventListener('click', clearLoopSection);
  $('dawCursorStart')?.addEventListener('click', () => { playheadSeconds = 0; renderPlayhead(); });
  $('dawCursorEnd')?.addEventListener('click', () => { playheadSeconds = projectDurationSeconds(project); renderPlayhead(); });
  $('dawNudgeLeft')?.addEventListener('click', () => nudgeSelectedClip(-1));
  $('dawNudgeRight')?.addEventListener('click', () => nudgeSelectedClip(1));
  document.querySelectorAll('#page-studio .daw-menu-panel button').forEach((button) => {
    button.addEventListener('click', () => {
      const menu = button.closest('details');
      if (menu) menu.open = false;
    });
  });
  $('dawSnap')?.addEventListener('change', (event) => updateProjectField('snap', event.target.value));
  $('dawZoom')?.addEventListener('input', (event) => updateProjectField('zoom', event.target.value));
  $('dawAudioFileInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    const target = pendingImportTrackId || selectedTrackId;
    pendingImportTrackId = '';
    event.target.value = '';
    if (file) await addAudioFile(file, target);
  });
  $('dawTrackRail')?.addEventListener('click', handleTrackClick);
  $('dawTrackList')?.addEventListener('click', handleTrackClick);
  $('dawMixer')?.addEventListener('click', handleTrackClick);
  $('dawTimelineScroll')?.addEventListener('pointerdown', beginTimelinePinch);
  $('dawTimelineScroll')?.addEventListener('pointermove', updateTimelinePinch, { passive: false });
  $('dawTimelineScroll')?.addEventListener('pointerup', endTimelinePinch);
  $('dawTimelineScroll')?.addEventListener('pointercancel', endTimelinePinch);
  $('dawTrackList')?.addEventListener('pointerdown', startClipDrag);
  $('dawTrackList')?.addEventListener('pointermove', moveClipDrag);
  $('dawTrackList')?.addEventListener('pointerup', finishClipDrag);
  $('dawTrackList')?.addEventListener('pointercancel', () => { dragClip = null; });
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (typing || event.altKey) return;
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelectedClip(); }
    else if (command && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteClip(); }
    else if (command && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelectedClip(); }
    else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedClipId) { event.preventDefault(); deleteSelectedClip(); }
    else if (event.key === 'ArrowLeft' && selectedClipId) { event.preventDefault(); nudgeSelectedClip(-1, event.shiftKey ? 1 : 0); }
    else if (event.key === 'ArrowRight' && selectedClipId) { event.preventDefault(); nudgeSelectedClip(1, event.shiftKey ? 1 : 0); }
  });
  document.addEventListener('input', (event) => {
    const gain = event.target.closest('[data-track-gain]');
    if (gain) updateTrackMix(gain.dataset.trackGain, 'gain', gain.value);
    const pan = event.target.closest('[data-track-pan]');
    if (pan) updateTrackMix(pan.dataset.trackPan, 'pan', pan.value);
  });
  $('dawTrackInspector')?.addEventListener('change', (event) => {
    const nameInput = event.target.closest('[data-track-name]');
    if (!nameInput) return;
    const track = getTrack(nameInput.dataset.trackName);
    if (!track) return;
    track.name = nameInput.value.trim().slice(0, 32) || track.name;
    nameInput.value = track.name;
    if ($('dawSelectedTrackLabel')) $('dawSelectedTrackLabel').textContent = track.name + ' selected';
    renderTrackRows();
    renderMixer();
    scheduleProjectSave();
  });
  $('dawTrackInspector')?.addEventListener('click', (event) => {
    const action = event.target.closest('[data-clip-action]')?.dataset.clipAction;
    if (action === 'delete') deleteSelectedClip();
    if (action === 'split') splitSelectedClip();
    if (action === 'copy') copySelectedClip();
    if (action === 'duplicate') duplicateSelectedClip();
  });
  $('dawMoreMenuPanel')?.addEventListener('input', (event) => {
    const fade = event.target.closest('[data-toolbar-fade]');
    if (!fade) return;
    const selected = getSelectedClipContext();
    if (!selected) return;
    const next = normalizeClipFades(
      selected.clip.durationSeconds,
      fade.dataset.toolbarFade === 'in' ? fade.value : selected.clip.fadeInSeconds,
      fade.dataset.toolbarFade === 'out' ? fade.value : selected.clip.fadeOutSeconds,
    );
    selected.clip.fadeInSeconds = next.fadeInSeconds;
    selected.clip.fadeOutSeconds = next.fadeOutSeconds;
    updateToolbar();
    scheduleProjectSave();
  });

  $('dawGlobalPlayhead')?.addEventListener('pointerdown', startPlayheadDrag);
  $('dawGlobalPlayhead')?.addEventListener('lostpointercapture', finishPlayheadDrag);
  document.addEventListener('pointermove', movePlayheadDrag, { passive: false });
  document.addEventListener('pointerup', finishPlayheadDrag);
  document.addEventListener('pointercancel', finishPlayheadDrag);
  $('dawRulerInner')?.addEventListener('click', (event) => {
    if (event.target.closest('.daw-ruler-mark')) setPlayheadFromClientX(event.clientX);
    else setPlayheadFromClientX(event.clientX);
  });
  $('dawUndo')?.addEventListener('click', () => applyHistory('undo'));
  $('dawRedo')?.addEventListener('click', () => applyHistory('redo'));
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const target = event.target;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      applyHistory(event.shiftKey ? 'redo' : 'undo');
    } else if (event.key.toLowerCase() === 'y') {
      event.preventDefault();
      applyHistory('redo');
    }
  });
  $('dawForward')?.addEventListener('click', () => {
    const metrics = timelineMetrics();
    playheadSeconds = Math.min(metrics.bars * metrics.barSeconds, playheadSeconds + metrics.barSeconds);
    if (playing) void restartPlaybackAt(playheadSeconds);
    else renderPlayhead();
  });
  $('dawPlay')?.addEventListener('click', () => { void togglePlayback(); });
  $('dawStop')?.addEventListener('click', async () => {
    if (recording) await stopDawRecording();
    stopPlayback(true);
  });
  $('dawRewind')?.addEventListener('click', () => {
    if (playing) void restartPlaybackAt(0);
    else { playheadSeconds = 0; renderPlayhead(); }
  });
  $('dawRecord')?.addEventListener('click', () => { void handleDawRecordClick(); });
  $('dawExportStems')?.addEventListener('click', openStemDialog);
  $('dawExportMix')?.addEventListener('click', () => { void exportFullMix(); });
  $('dawStemCancel')?.addEventListener('click', () => $('dawStemDialog')?.close());
  $('dawStemConfirm')?.addEventListener('click', () => { void confirmStemExport(); });
  $('dawImportQuickTake')?.addEventListener('click', async () => {
    const index = Number($('dawQuickTakeSelect')?.value);
    const take = window.NUXStudioRecorder?.listTakes?.()[index];
    if (!take) { setStatus('Select a saved Quick Record take first.', 'warn'); return; }
    try { await importQuickTake(take, selectedTrackId, playheadSeconds); }
    catch (error) { setStatus('Quick Record import failed: ' + (error?.message || 'file read error'), 'warn'); }
  });
  window.addEventListener('nux-studio-recorder-ready', refreshQuickTakes);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && recording) void stopDawRecording();
    else if (document.hidden && usbDiagnosticRecording) void toggleRawUsbDiagnostic();
    else if (document.hidden && playing) pausePlayback();
  });
}

async function initDaw() {
  bindEvents();
  resetHistory();
  renderProject();
  let dawPage = 'timeline';
  try {
    const savedPage = localStorage.getItem('mg30-studio-daw-page');
    if (['timeline', 'mixer', 'track-settings'].includes(savedPage)) dawPage = savedPage;
  } catch (_) {}
  setDawPage(dawPage);
  let mode = 'daw';
  try {
    const savedMode = localStorage.getItem(storageKey);
    if (['jam', 'record', 'daw'].includes(savedMode)) mode = savedMode;
  } catch (_) {}
  setStudioMode(mode);
  refreshQuickTakes();
  try {
    await openDatabase();
    await populateSavedProjects();
    setStatus('Four-track Mini DAW ready. Configure each track input independently in Track Settings.', 'ok');
  } catch (error) {
    setStatus('Project storage could not open: ' + (error?.message || 'IndexedDB unavailable'), 'warn');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void initDaw(); }, { once: true });
} else {
  void initDaw();
}
