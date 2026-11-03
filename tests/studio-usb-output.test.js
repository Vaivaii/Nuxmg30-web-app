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

test('USB output discovery is explicitly read-only and does not claim a working reamp route', () => {
  assert.match(outputPlugin, /Read-only output endpoint discovery/);
  assert.match(outputPlugin, /does not prove that a stream reaches the MG-30/);
  assert.doesNotMatch(outputPlugin, /new AudioTrack/);
  assert.ok(!outputPlugin.includes('import android.media.AudioRecord;'));
  assert.ok(!outputPlugin.includes('new AudioRecord'));
  assert.ok(!outputPlugin.includes('AudioRecord.Builder'));
});
test('Android initialization copies and registers the isolated output plugin', () => {
  assert.ok(init.includes("MG30AudioOutputPlugin.java"));
  assert.ok(init.includes('registerPlugin(MG30AudioOutputPlugin.class);'));
});

test('Studio exposes a native-only USB output discovery check', () => {
  assert.ok(index.includes('./studio-usb-output.js'));
  assert.ok(ui.includes("registerPlugin('MG30AudioOutput')"));
  assert.ok(ui.includes('inspectOutputDevices()'));
  assert.ok(ui.includes('result.mg30OutputFound'));
  assert.ok(ui.includes('PERIKSA USB OUT'));
  assert.match(ui, /belum membuktikan jalur Reamp \/ Loopback/i);
});

test('the existing MG-30 USB recorder plugin remains unchanged and isolated', () => {
  assert.ok(recorder.includes('public void startRecording(PluginCall call)'));
  assert.ok(recorder.includes('AudioRecord'));
  assert.ok(!recorder.includes('GET_DEVICES_OUTPUTS'));
  assert.ok(!recorder.includes('AudioTrack'));
});
