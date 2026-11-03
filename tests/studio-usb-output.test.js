import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const outputPlugin = read('../native-android/MG30AudioOutputPlugin.java');
const init = read('../scripts/init-android.mjs');
const index = read('../www/index.html');
const ui = read('../www/studio-usb-output.js');
const recorder = read('../native-android/MG30AudioPlugin.java');

test('Android initializer is valid JavaScript before platform generation', () => {
  const initializerPath = fileURLToPath(new URL('../scripts/init-android.mjs', import.meta.url));
  assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', initializerPath]));
});

test('USB output discovery uses Android output endpoints and labels USB types', () => {
  assert.ok(outputPlugin.includes('AudioManager.GET_DEVICES_OUTPUTS'));
  assert.ok(outputPlugin.includes('AudioDeviceInfo.TYPE_USB_DEVICE'));
  assert.ok(outputPlugin.includes('AudioDeviceInfo.TYPE_USB_HEADSET'));
  assert.ok(outputPlugin.includes('usbOutputFound'));
  assert.ok(outputPlugin.includes('mg30OutputFound'));
  assert.ok(outputPlugin.includes('isMg30ProductName'));
  assert.ok(outputPlugin.includes('inspectOutputDevices'));
});

test('USB playback probe remains separate from the existing USB input recorder', () => {
  assert.match(outputPlugin, /does not touch MG30AudioPlugin/);
  assert.doesNotMatch(outputPlugin, /new AudioRecord/);
  assert.doesNotMatch(outputPlugin, /AudioRecord\.Builder/);
  assert.ok(!outputPlugin.includes('import android.media.AudioRecord;'));
  assert.ok(!outputPlugin.includes('AudioManager.GET_DEVICES_INPUTS'));
});

test('test tone is low-level, short, and only writes after actual MG-30 routing is confirmed', () => {
  const playMethodStart = outputPlugin.indexOf('public void playTestTone(PluginCall call)');
  const playMethodEnd = outputPlugin.indexOf('private static boolean isUsbOutput');
  assert.ok(playMethodStart >= 0);
  assert.ok(playMethodEnd > playMethodStart);
  const playMethod = outputPlugin.slice(playMethodStart, playMethodEnd);
  assert.match(outputPlugin, /PROBE_DURATION_MS = 1200/);
  assert.match(outputPlugin, /PROBE_AMPLITUDE = 0\.025f/);
  assert.match(playMethod, /target\.getSampleRates\(\)/);
  assert.match(playMethod, /target\.getChannelCounts\(\)/);
  assert.match(playMethod, /track\.setPreferredDevice\(target\)/);
  const actualRouteCheck = playMethod.indexOf('track.getRoutedDevice()');
  const firstAudioWrite = playMethod.indexOf('track.write(');
  assert.ok(actualRouteCheck >= 0);
  assert.ok(firstAudioWrite > actualRouteCheck, 'actual output route must be checked before any tone samples are written');
  assert.match(playMethod, /currentRoute\.getId\(\) != requestedId/);
  assert.match(playMethod, /AudioFormat\.ENCODING_PCM_FLOAT/);
  assert.match(playMethod, /track\.release\(\)/);
});

test('Android initialization copies and registers the isolated output plugin', () => {
  assert.ok(init.includes('MG30AudioOutputPlugin.java'));
  assert.ok(init.includes('registerPlugin(MG30AudioOutputPlugin.class);'));
});

test('Studio exposes native USB output discovery and an explicit tone-test action', () => {
  assert.ok(index.includes('./studio-usb-output.js'));
  assert.ok(ui.includes("registerPlugin('MG30AudioOutput')"));
  assert.ok(ui.includes('inspectOutputDevices()'));
  assert.ok(ui.includes('playTestTone({ deviceId: Number(selectedMg30Device.id) })'));
  assert.ok(ui.includes('result.mg30OutputFound'));
  assert.ok(ui.includes('PERIKSA USB OUT'));
  assert.ok(ui.includes('TES AUDIO 1,2 DETIK'));
  assert.match(ui, /Dengarkan apakah nada terdengar dari MG-30/i);
  assert.match(ui, /Tidak dihitung berhasil sebagai tes output MG-30/i);
});

test('the existing MG-30 USB recorder plugin remains unchanged and isolated', () => {
  assert.ok(recorder.includes('public void startRecording(PluginCall call)'));
  assert.ok(recorder.includes('AudioRecord'));
  assert.ok(!recorder.includes('GET_DEVICES_OUTPUTS'));
  assert.ok(!recorder.includes('AudioTrack'));
});


test('DAW output stream is isolated in the USB output plugin and verifies routing before PCM writes', () => {
  assert.ok(outputPlugin.includes('public synchronized void startDawPlayback'));
  assert.ok(outputPlugin.includes('public synchronized void writeDawPlaybackChunk'));
  assert.ok(outputPlugin.includes('public synchronized void stopDawPlayback'));
  assert.ok(outputPlugin.includes('AudioFormat.ENCODING_PCM_16BIT'));
  assert.ok(outputPlugin.includes('track.setPreferredDevice(target)'));
  assert.ok(outputPlugin.includes('routed.getId() != requestedId'));
  assert.ok(outputPlugin.includes('dawPlaybackTrack.write(pcm'));
  assert.ok(outputPlugin.includes('stopDawPlaybackInternal'));
  assert.doesNotMatch(outputPlugin, /new AudioRecord/);
});

test('DAW output selector supports phone output and explicit MG-30 USB playback', () => {
  const daw = read('../www/studio-daw.js');
  const core = read('../www/studio-daw-core.js');
  assert.ok(core.includes("outputRoute: 'speaker'"));
  assert.ok(core.includes("outputRoute: input.outputRoute === 'mg30' ? 'mg30' : 'speaker'"));
  assert.ok(daw.includes('Phone speaker / current Android output'));
  assert.ok(daw.includes('NUX MG-30 · USB'));
  assert.ok(daw.includes("project.outputRoute === 'mg30'"));
  assert.ok(daw.includes('startNativeDawPlayback'));
  assert.ok(daw.includes('writeDawPlaybackChunk'));
  assert.ok(daw.includes('encodeFloatStereoPcm16Base64'));
  assert.ok(daw.includes('Listen to confirm the pedal output'));
  assert.ok(daw.includes('nativePlaybackGeneration'));
});
