import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('../native-midi-bridge.js', import.meta.url), 'utf8');
const plugin = readFileSync(new URL('../native-android/MG30BluetoothMidiPlugin.java', import.meta.url), 'utf8');

test('Device page exposes Overview and MIDI tabs with independent views', () => {
  assert.match(html, /id="deviceTabOverview"[^>]*>[^<]*▦ <span>Overview<\/span>/);
  assert.match(html, /id="deviceTabMidi"[^>]*>[^<]*♫ <span>MIDI<\/span>/);
  assert.match(html, /id="deviceOverviewView"/);
  assert.match(html, /id="deviceMidiView"/);
});

test('MIDI Center keeps USB, Bluetooth, Routing and Mapping on separate detail pages', () => {
  for (const id of ['midiUsbPage', 'midiBluetoothPage', 'midiRoutingPage', 'midiMappingPage']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /id="midiMappingPage"[\s\S]*?id="bridgeCcSource"/);
  assert.match(html, /id="midiRoutingPage"[\s\S]*?id="blePassthrough"/);
});

test('legacy bridge controls remain wired and custom CC config uses its existing storage key', () => {
  for (const id of ['scanBleMidi', 'disconnectBleMidi', 'blePassthrough', 'bleFeedback', 'bridgeCcSource', 'bridgeCcTarget', 'saveBridgeMapping', 'clearBridgeMapping']) {
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id + ' must exist exactly once');
  }
  assert.match(html, /mg30-wireless-midi-bridge/);
  assert.match(html, /function applyBridgeUiConfig\(\)/);
});

test('Android Bluetooth activation asks the user through the system enable intent', () => {
  assert.match(html, /id="enableAndroidBluetooth"/);
  assert.match(bridge, /requestEnableBluetooth/);
  assert.match(plugin, /BluetoothAdapter\.ACTION_REQUEST_ENABLE/);
  assert.match(plugin, /@ActivityCallback[\s\S]*onBluetoothEnableResult/);
});

test('editor shortcut opens the Device MIDI tab without changing the main navigation', () => {
  assert.match(html, /openDeviceFromEditor[^\n]*setDeviceTab\('midi'\)/);
  assert.match(html, /function showPage\(p\)[\s\S]*if\(p==='device'\)setDeviceTab\('overview'\)/);
});

test('original MIDI mappings are explicitly kept separate from custom bridge CC mapping', () => {
  assert.match(html, /Original MIDI[\s\S]*PROTECTED/);
  assert.match(html, /Custom CC Mapping disimpan pada konfigurasi Wireless MIDI Bridge yang terpisah/);
});
