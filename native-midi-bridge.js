import { Capacitor, registerPlugin } from '@capacitor/core';
import { normalizeMidiBytes, routeControllerPacket } from './native-midi-routing.js';

const nativePlatform = Capacitor.isNativePlatform();
const UsbMidi = registerPlugin('MG30Midi');
const BleMidi = registerPlugin('MG30BluetoothMidi');

let usbConnected = false;
let bleConnected = false;
let bridgeConfig = { passthrough: true, feedback: true, ccMap: null };
let usbListenerHandle = null;
let bleListenerHandle = null;

const midiInputListeners = new Set();
const midiInput = {
  id: 'mg30-native-usb-input',
  name: 'NUX MG-30',
  manufacturer: 'NUX',
  type: 'input',
  state: 'disconnected',
  onmidimessage: null,
  addEventListener(type, callback) {
    if (type === 'midimessage' && typeof callback === 'function') midiInputListeners.add(callback);
  },
  removeEventListener(type, callback) {
    if (type === 'midimessage') midiInputListeners.delete(callback);
  },
  emit(data) {
    const event = { data: new Uint8Array(data), target: midiInput, receivedTime: performance.now() };
    if (typeof midiInput.onmidimessage === 'function') midiInput.onmidimessage(event);
    for (const callback of [...midiInputListeners]) {
      try { callback(event); } catch (error) { console.error('[MG30 MIDI] input listener failed', error); }
    }
  }
};

const midiOutput = {
  id: 'mg30-native-usb-output',
  name: 'NUX MG-30',
  manufacturer: 'NUX',
  type: 'output',
  state: 'disconnected',
  send(data) {
    if (!usbConnected) throw new Error('USB MIDI MG-30 belum terhubung');
    const bytes = normalizeMidiBytes(data);
    UsbMidi.send({ data: bytes }).catch(error => emitNativeError('USB MIDI send failed', error));
  },
  clear() {}
};

const midiAccess = {
  inputs: new Map([[midiInput.id, midiInput]]),
  outputs: new Map([[midiOutput.id, midiOutput]]),
  onstatechange: null
};

function notifyMidiState() {
  const state = { port: midiInput, connected: usbConnected };
  if (typeof midiAccess.onstatechange === 'function') midiAccess.onstatechange(state);
  window.dispatchEvent(new CustomEvent('mg30native-usb-state', { detail: state }));
}

function emitNativeError(message, error) {
  window.dispatchEvent(new CustomEvent('mg30native-midi-error', {
    detail: { message, error: String(error?.message || error || '') }
  }));
}

async function sendUsb(data) {
  if (!usbConnected) return false;
  const bytes = normalizeMidiBytes(data);
  await UsbMidi.send({ data: bytes });
  return true;
}

async function sendBle(data) {
  if (!bleConnected) return false;
  const bytes = normalizeMidiBytes(data);
  await BleMidi.sendBleMidi({ data: bytes });
  return true;
}

function routeControllerToUsb(data) {
  if (!usbConnected) return;
  for (const packet of routeControllerPacket(data, bridgeConfig)) {
    sendUsb(packet).catch(error => emitNativeError('BLE → USB route failed', error));
  }
}

function routeUsbToController(data) {
  if (!bleConnected || !bridgeConfig.feedback) return;
  sendBle(data).catch(error => emitNativeError('USB → BLE feedback failed', error));
}

async function connectUsb() {
  const result = await UsbMidi.connect({});
  usbConnected = true;
  midiInput.state = 'connected';
  midiOutput.state = 'connected';
  notifyMidiState();
  return result;
}

async function scanBleDevices(options = {}) {
  if (!nativePlatform) throw new Error('BLE MIDI native hanya tersedia di aplikasi Android.');
  return BleMidi.scanBleDevices({ durationMs: options.durationMs || 10000 });
}

async function connectBleDevice(address) {
  const result = await BleMidi.connectBleDevice({ address });
  bleConnected = true;
  window.dispatchEvent(new CustomEvent('mg30ble-midi-connection', { detail: result }));
  return result;
}

async function disconnectBleDevice() {
  await BleMidi.disconnectBleDevice({});
  bleConnected = false;
  window.dispatchEvent(new CustomEvent('mg30ble-midi-connection', {
    detail: { connected: false }
  }));
}

function configureBridge(config = {}) {
  bridgeConfig = {
    passthrough: config.passthrough !== false,
    feedback: config.feedback !== false,
    ccMap: config.ccMap && Number.isInteger(Number(config.ccMap.source)) &&
      Number.isInteger(Number(config.ccMap.target)) &&
      Number(config.ccMap.source) >= 0 && Number(config.ccMap.source) <= 127 &&
      Number(config.ccMap.target) >= 0 && Number(config.ccMap.target) <= 127
        ? { source: Number(config.ccMap.source), target: Number(config.ccMap.target) }
        : null
  };
  return { ...bridgeConfig };
}

async function attachNativeListeners() {
  if (!nativePlatform || usbListenerHandle || bleListenerHandle) return;
  try {
    usbListenerHandle = await UsbMidi.addListener('midiData', payload => {
      const data = payload?.data || [];
      if (!data.length) return;
      midiInput.emit(data);
      routeUsbToController(data);
    });
    await UsbMidi.addListener('midiConnectionChanged', state => {
      usbConnected = !!state?.connected;
      midiInput.state = usbConnected ? 'connected' : 'disconnected';
      midiOutput.state = midiInput.state;
      notifyMidiState();
    });
    bleListenerHandle = await BleMidi.addListener('bleMidiData', payload => {
      const data = payload?.data || [];
      if (data.length) routeControllerToUsb(data);
      window.dispatchEvent(new CustomEvent('mg30ble-midi-data', { detail: payload }));
    });
    await BleMidi.addListener('bleMidiDeviceFound', device => {
      window.dispatchEvent(new CustomEvent('mg30ble-midi-device-found', { detail: device }));
    });
    await BleMidi.addListener('bleMidiScanFinished', state => {
      window.dispatchEvent(new CustomEvent('mg30ble-midi-scan-finished', { detail: state }));
    });
    await BleMidi.addListener('bleMidiScanError', state => {
      window.dispatchEvent(new CustomEvent('mg30ble-midi-scan-error', { detail: state }));
    });
    await BleMidi.addListener('bleMidiConnectionChanged', state => {
      bleConnected = !!state?.connected;
      window.dispatchEvent(new CustomEvent('mg30ble-midi-connection', { detail: state }));
    });
  } catch (error) {
    emitNativeError('Native MIDI listener setup failed', error);
  }
}

window.MG30NativeMidi = {
  isNative: nativePlatform,
  connectUsb,
  sendUsb,
  scanBleDevices,
  connectBleDevice,
  disconnectBleDevice,
  configureBridge,
  getMidiAccess: () => midiAccess,
  getState: () => ({ usbConnected, bleConnected, bridgeConfig: { ...bridgeConfig } })
};

if (nativePlatform) {
  attachNativeListeners();
  window.dispatchEvent(new CustomEvent('mg30native-midi-ready'));
}
