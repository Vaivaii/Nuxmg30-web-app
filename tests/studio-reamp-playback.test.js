import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const plugin = read('../native-android/MG30AudioOutputPlugin.java');
const daw = read('../www/studio-daw.js');
const recorder = read('../native-android/MG30AudioPlugin.java');

test('DAW JavaScript parses after the reamp workflow additions', () => {
  const dawPath = fileURLToPath(new URL('../www/studio-daw.js', import.meta.url));
  assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', dawPath]));
});

test('native reamp session is explicitly limited to 48 kHz stereo PCM16', () => {
  assert.match(plugin, /REAMP_SAMPLE_RATE = 48000/);
  assert.match(plugin, /REAMP_CHANNELS = 2/);
  assert.match(plugin, /REAMP_BYTES_PER_FRAME = 4/);
  assert.match(plugin, /AudioFormat\.ENCODING_PCM_16BIT/);
  assert.match(plugin, /PCM16 stereo 48 kHz/);
});

test('native dry playback resolves the chosen MG-30 endpoint and validates route before writing samples', () => {
  const startAt = plugin.indexOf('public void startReampPlayback(PluginCall call)');
  const endAt = plugin.indexOf('private void runReampPlayback', startAt);
  assert.ok(startAt >= 0 && endAt > startAt);
  const method = plugin.slice(startAt, endAt);
  assert.match(method, /findMg30Output\(session\.deviceId\)/);
  assert.match(method, /track\.setPreferredDevice\(target\)/);
  assert.match(method, /track\.play\(\)/);
  assert.match(method, /track\.getRoutedDevice\(\)/);
  assert.match(method, /routed\.getId\(\) != session\.deviceId/);
  assert.ok(method.indexOf('track.getRoutedDevice()') < method.indexOf('session.worker.start()'));
  assert.ok(method.indexOf('routed.getId() != session.deviceId') < method.indexOf('session.worker.start()'));
});

test('native reamp stream has chunk upload, status, stop, and release lifecycle', () => {
  for (const method of [
    'beginReampPlayback', 'appendReampPlaybackChunk', 'startReampPlayback',
    'getReampPlaybackStatus', 'stopReampPlayback', 'releaseReampPlayback',
  ]) assert.ok(plugin.includes('void ' + method + '(PluginCall call)'), method + ' is registered');
  assert.match(plugin, /REAMP_MAX_CHUNK_BYTES = 192 \* 1024/);
  assert.match(plugin, /REAMP_MAX_FILE_BYTES/);
  assert.match(plugin, /current\.getId\(\) != session\.deviceId/);
  assert.doesNotMatch(plugin, /AudioRecord/);
});

test('DAW prepares a selected dry source into PCM16 chunks and routes it through the native output plugin', () => {
  assert.ok(daw.includes("registerPlugin('MG30AudioOutput')"));
  assert.ok(daw.includes('floatStereoToPcm16'));
  assert.ok(daw.includes('beginReampPlayback'));
  assert.ok(daw.includes('appendReampPlaybackChunk'));
  assert.ok(daw.includes('startReampPlayback'));
  assert.ok(daw.includes('getReampPlaybackStatus'));
  assert.ok(daw.includes('stopReampPlayback'));
  assert.match(daw, /PCM16 stereo 48 kHz/);
});

test('DAW requires separate source and return tracks and reuses the existing USB recorder for return capture', () => {
  assert.match(daw, /returnTrack\.id === sourceTrack\.id/);
  assert.match(daw, /armTrack\(returnTrack\.id\)/);
  assert.match(daw, /await startDawRecording\(\)/);
  assert.match(daw, /await stopDawRecording\(\)/);
  assert.match(daw, /USB return recorder/);
  assert.ok(recorder.includes('public void startRecording(PluginCall call)'));
  assert.ok(recorder.includes('AudioRecord'));
  assert.ok(!recorder.includes('GET_DEVICES_OUTPUTS'));
  assert.ok(!recorder.includes('AudioTrack'));
});

test('reamp UI labels unverified dry/wet USB channel mapping instead of assuming channel numbers', () => {
  assert.match(daw, /DRY SOURCE TRACK/);
  assert.match(daw, /USB RETURN TRACK/);
  assert.match(daw, /Nomor channel dry\/wet MG-30 belum dikunci oleh capture/);
  assert.match(daw, /ROUTING MODE pedal = REAMP/);
});
