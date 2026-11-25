import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const accountChatGPT = readFileSync(new URL('../www/chatgpt-account.js', import.meta.url), 'utf8');
const accountCloud = readFileSync(new URL('../www/cloud-account.js', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('../www/native-midi-bridge.js', import.meta.url), 'utf8');
const routing = readFileSync(new URL('../www/native-midi-routing.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../www/main.js', import.meta.url), 'utf8');
const plugin = readFileSync(new URL('../native-android/MG30BluetoothMidiPlugin.java', import.meta.url), 'utf8');

function countId(id) {
  return (html.match(new RegExp('id="' + id + '"', 'g')) || []).length;
}

test('live Android Device page contains horizontal Overview and MIDI tabs', () => {
  assert.match(html, /id="deviceTabOverview"[^>]*>\s*▦ <span>Overview<\/span>/);
  assert.match(html, /id="deviceTabMidi"[^>]*>\s*♫ <span>MIDI<\/span>/);
  assert.match(html, /id="deviceOverviewView"/);
  assert.match(html, /id="deviceMidiView" class="device-tab-view hidden"/);
  assert.match(html, /function setDeviceTab\(tab\)/);
  assert.match(html, /if\(p==='device'\)setDeviceTab\('overview'\)/);
});

test('ChatGPT and Cloud account panels mount inside Overview, not above the tabs', () => {
  assert.match(accountChatGPT, /const overview = \$\('deviceOverviewView'\) \|\| page/);
  assert.match(accountCloud, /const overview = \$\("deviceOverviewView"\) \|\| page/);
  assert.match(html, /id="deviceOverviewView"[\s\S]*?id="audioCheckBtn"/);
});

test('MIDI Center has independent USB, Bluetooth, Routing, and Mapping detail pages', () => {
  for (const id of ['midiCenterHome', 'midiUsbPage', 'midiBluetoothPage', 'midiRoutingPage', 'midiMappingPage']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /data-midi-open="usb"/);
  assert.match(html, /data-midi-open="bluetooth"/);
  assert.match(html, /data-midi-open="routing"/);
  assert.match(html, /data-midi-open="mapping"/);
});

test('MIDI action controls have unique IDs and remain on their respective pages', () => {
  const ids = [
    'deviceStatus', 'midiSupport', 'sysexStatus', 'connectMidiDevice',
    'readBuffer', 'checkMidi', 'goBackup', 'enableAndroidBluetooth',
    'scanBleMidi', 'disconnectBleMidi', 'bleMidiStatus', 'blePassthrough',
    'bleFeedback', 'bridgeRouteStatus', 'bridgeCcSource', 'bridgeCcTarget',
    'saveBridgeMapping', 'clearBridgeMapping'
  ];
  for (const id of ids) assert.equal(countId(id), 1, id + ' must exist exactly once');
  const usb = html.slice(html.indexOf('id="midiUsbPage"'), html.indexOf('id="midiBluetoothPage"'));
  const routingPage = html.slice(html.indexOf('id="midiRoutingPage"'), html.indexOf('id="midiMappingPage"'));
  const mappingStart = html.indexOf('id="midiMappingPage"');
  const mappingPage = html.slice(mappingStart, html.indexOf('id="page-backup"', mappingStart));
  assert.match(usb, /id="connectMidiDevice"/);
  assert.match(routingPage, /id="blePassthrough"/);
  assert.match(routingPage, /id="bleFeedback"/);
  assert.match(mappingPage, /id="bridgeCcSource"/);
});

test('Bluetooth activation uses the Android system consent dialog', () => {
  assert.match(html, /id="enableAndroidBluetooth"/);
  assert.match(html, /id="openBluetoothSettings"/);
  assert.match(html, /id="openAppPermissionSettings"/);
  assert.match(html, /id="bleMidiMessage"/);
  assert.match(bridge, /requestEnableBluetooth\(\)/);
  assert.match(plugin, /BluetoothAdapter\.ACTION_REQUEST_ENABLE/);
  assert.match(plugin, /@ActivityCallback[\s\S]*onBluetoothEnableResult/);
});

test('BLE MIDI bridge is loaded by the actual mobile app and routes to the existing USB MIDI output', () => {
  assert.match(main, /import '\.\/native-midi-bridge\.js'/);
  assert.match(bridge, /window\.NUXNativeMidi\.connect\(\)/);
  assert.match(bridge, /output/);
  assert.match(bridge, /usbInput\.addEventListener\('midimessage'/);
  assert.match(bridge, /NativeBle\.sendBleMidi/);
});

test('original passthrough and custom CC mapping are isolated from editor MIDI mapping', () => {
  assert.match(routing, /routeControllerPacket/);
  assert.match(bridge, /mg30-wireless-midi-bridge/);
  assert.match(html, /Original MIDI[\s\S]*PROTECTED/);
  assert.match(html, /Existing MG-30 editor MIDI mappings are not overwritten/);
});

test('editor shortcut opens the live Device MIDI tab', () => {
  assert.match(html, /openDeviceFromEditor[^\n]*setDeviceTab\('midi'\)/);
});
