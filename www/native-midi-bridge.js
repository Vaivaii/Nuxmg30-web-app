import { Capacitor, registerPlugin } from '@capacitor/core';
import { normalizeMidiBytes, routeControllerPacket } from './native-midi-routing.js';

const NativeBle = registerPlugin('MG30BluetoothMidi');
const nativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
let usbInput = null;
let usbOutput = null;
let usbInputListener = null;
let bleConnected = false;
let bleName = '';
let receivedByEditor = 0;
let forwardedToUsb = 0;
let config = { passthrough: true, feedback: true, ccMap: null };

function status(message) {
  const copy = String(message || '');
  for (const id of ['bridgeRouteStatus', 'bleMidiMessage']) {
    const node = document.getElementById(id);
    if (node) node.textContent = copy;
  }
}
function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' (timeout ' + ms + ' ms)')), ms);
    })
  ]).finally(() => clearTimeout(timer));
}
function registerNativeListener(eventName, handler) {
  try {
    const pending = NativeBle.addListener(eventName, handler);
    if (pending && typeof pending.catch === 'function') {
      pending.catch(error => status('Native BLE listener ' + eventName + ' failed: ' + (error?.message || error)));
    }
  } catch (error) {
    status('Cannot register native BLE listener ' + eventName + ': ' + (error?.message || error));
  }
}
function currentState() {
  return {
    usbConnected: Boolean(window.NUXNativeMidi?.isConnected?.()),
    bleConnected,
    bleName,
    receivedByEditor,
    forwardedToUsb,
    config: { ...config }
  };
}
function updateInputStatus(bytes, sourceName = bleName) {
  receivedByEditor += 1;
  const input = document.getElementById('bleMidiInputStatus');
  if (!input) return;
  const statusByte = bytes[0] || 0;
  const kind = (statusByte & 0xf0) === 0xb0 ? 'CC ' + (bytes[1] ?? 0) + ' = ' + (bytes[2] ?? 0)
    : (statusByte & 0xf0) === 0xc0 ? 'Program Change ' + (bytes[1] ?? 0)
    : 'MIDI ' + bytes.map(value => value.toString(16).padStart(2, '0')).join(' ');
  input.textContent = 'Editor received ' + receivedByEditor + ' message(s) · ' + kind +
    (sourceName ? ' · ' + sourceName : '');
}
async function attachUsbFeedback() {
  if (!window.NUXNativeMidi?.isConnected?.()) return false;
  try {
    const ports = await window.NUXNativeMidi.connect();
    usbInput = ports?.input || null;
    usbOutput = ports?.output || null;
    if (usbInput && !usbInputListener) {
      usbInputListener = event => {
        if (!bleConnected || !config.feedback || !event?.data?.length) return;
        try {
          const data = normalizeMidiBytes(event.data);
          NativeBle.sendBleMidi({ data }).catch(error => {
            status('USB → BLE feedback failed: ' + (error?.message || error));
          });
        } catch (error) {
          status('USB → BLE feedback data invalid: ' + (error?.message || error));
        }
      };
      usbInput.addEventListener('midimessage', usbInputListener);
    }
    return Boolean(usbOutput);
  } catch (error) {
    status('Unable to attach USB MIDI bridge: ' + (error?.message || error));
    return false;
  }
}
function detachUsbFeedback() {
  if (usbInput && usbInputListener) usbInput.removeEventListener('midimessage', usbInputListener);
  usbInput = null;
  usbOutput = null;
  usbInputListener = null;
}

/*
 * BLE input has two independent destinations:
 * 1) The editor virtual MIDI input, so Program Change/CC can update the editor UI.
 * 2) The MG-30 USB output, when the pedal is connected and passthrough allows it.
 * Editor input is never blocked merely because the pedal USB output is disconnected.
 */
async function routeBleToUsb(payload) {
  let bytes;
  try {
    bytes = normalizeMidiBytes(payload?.data || []);
  } catch (error) {
    status('Invalid BLE MIDI message: ' + (error?.message || error));
    return;
  }
  if (!bytes.length) return;

  const editorPackets = routeControllerPacket(bytes, { ...config, passthrough: true });
  let editorDelivered = false;
  for (const packet of editorPackets) {
    if (window.NUXNativeMidi?.injectInput) {
      const delivered = window.NUXNativeMidi.injectInput(packet, {
        source: 'BLE MIDI',
        name: payload?.deviceName || bleName
      });
      editorDelivered = Boolean(delivered) || editorDelivered;
      if (delivered) updateInputStatus(packet, payload?.deviceName || bleName);
      else status('BLE message received, but the editor input port rejected it.');
    } else {
      status('BLE message received, but editor MIDI input bridge is not initialized.');
    }
  }

  const usbPackets = routeControllerPacket(bytes, config);
  if (!window.NUXNativeMidi?.isConnected?.()) {
    status(editorDelivered
      ? 'BLE MIDI → Editor received. Connect NUX MG-30 by USB OTG to also forward messages to the pedal.'
      : 'BLE MIDI received. Editor input bridge is not ready.');
    emit('mg30-wireless-midi-activity', {
      direction: 'ble-to-editor',
      editorDelivered,
      usbForwarded: false,
      bytes: bytes.length
    });
    return;
  }
  if (!usbOutput) await attachUsbFeedback();
  if (!usbOutput) {
    status(editorDelivered
      ? 'Editor received BLE MIDI, but USB-MIDI output is not ready.'
      : 'USB MIDI output is not ready. Reconnect the MG-30 first.');
    return;
  }
  try {
    for (const packet of usbPackets) {
      await usbOutput.send(packet);
      forwardedToUsb += 1;
    }
    status('BLE MIDI → Editor: ' + (editorDelivered ? 'received' : 'not available') +
      ' · MG-30 USB: ' + usbPackets.length + ' packet(s) forwarded.');
    emit('mg30-wireless-midi-activity', {
      direction: 'ble-to-editor-and-usb',
      editorDelivered,
      usbForwarded: usbPackets.length > 0,
      bytes: bytes.length
    });
  } catch (error) {
    status('Editor input ' + (editorDelivered ? 'received' : 'not available') +
      '; BLE → USB route failed: ' + (error?.message || error));
  }
}

if (nativeAndroid) {
  registerNativeListener('bleMidiDeviceFound', device => emit('mg30-wireless-midi-device-found', device));
  registerNativeListener('bleMidiData', payload => { void routeBleToUsb(payload); });
  registerNativeListener('bleMidiScanFinished', state => emit('mg30-wireless-midi-scan-finished', state));
  registerNativeListener('bleMidiScanError', error => emit('mg30-wireless-midi-scan-error', error));
  registerNativeListener('bleMidiConnectionChanged', state => {
    bleConnected = Boolean(state?.connected);
    bleName = state?.name || '';
    emit('mg30-wireless-midi-connection', { connected: bleConnected, name: bleName });
    if (bleConnected && window.NUXNativeMidi?.isConnected?.()) void attachUsbFeedback();
    status(bleConnected
      ? 'BLE connected: ' + (bleName || 'Bluetooth MIDI') + '. Incoming messages are routed to the editor.'
      : 'Bluetooth MIDI disconnected.');
  });
  window.addEventListener('mg30-native-midi-state', event => {
    if (event.detail?.connected) {
      void attachUsbFeedback();
      status(bleConnected ? 'BLE ↔ USB MIDI bridge is connected.' : 'USB MIDI connected. Connect Chocolate Plus to enable wireless control.');
    } else {
      detachUsbFeedback();
      status(bleConnected ? 'BLE controller connected; USB MG-30 is disconnected.' : 'USB and BLE MIDI are disconnected.');
    }
    emit('mg30-wireless-midi-state', currentState());
  });
}

/* Publish the facade before binding UI so a missing native event listener cannot
 * prevent the Bluetooth buttons from getting their own handlers. */
window.MG30WirelessMidi = Object.freeze({
  available: nativeAndroid,
  async getBluetoothState() {
    if (!nativeAndroid) throw new Error('Bluetooth MIDI is available only in the Android app.');
    return withTimeout(NativeBle.getBluetoothState({}), 4000, 'Android Bluetooth state request did not return');
  },
  async requestEnableBluetooth() {
    if (!nativeAndroid) throw new Error('Bluetooth MIDI is available only in the Android app.');
    return withTimeout(NativeBle.requestEnableBluetooth({}), 15000, 'Android Bluetooth activation request did not return');
  },
  async openBluetoothSettings() {
    if (!nativeAndroid) throw new Error('Bluetooth settings are available only in the Android app.');
    return withTimeout(NativeBle.openBluetoothSettings({}), 5000, 'Android Bluetooth Settings request did not return');
  },
  async openAppPermissionSettings() {
    if (!nativeAndroid) throw new Error('App permission settings are available only in the Android app.');
    return withTimeout(NativeBle.openAppPermissionSettings({}), 5000, 'Android app settings request did not return');
  },
  async scan(options = {}) {
    if (!nativeAndroid) throw new Error('BLE MIDI is available only in the Android app.');
    return withTimeout(
      NativeBle.scanBleDevices({ durationMs: options.durationMs || 12000 }),
      6000,
      'Android BLE scan request did not start'
    );
  },
  async connect(address) {
    if (!nativeAndroid) throw new Error('BLE MIDI is available only in the Android app.');
    return withTimeout(NativeBle.connectBleDevice({ address }), 15000, 'Android BLE MIDI connection did not complete');
  },
  async disconnect() {
    if (!nativeAndroid) return { connected: false };
    const result = await withTimeout(NativeBle.disconnectBleDevice({}), 5000, 'BLE disconnect did not complete');
    bleConnected = false;
    bleName = '';
    return result;
  },
  configure(next = {}) {
    const source = next.ccMap?.source;
    const target = next.ccMap?.target;
    config = {
      passthrough: next.passthrough !== false,
      feedback: next.feedback !== false,
      ccMap: Number.isInteger(Number(source)) && Number.isInteger(Number(target)) &&
        Number(source) >= 0 && Number(source) <= 127 &&
        Number(target) >= 0 && Number(target) <= 127
          ? { source: Number(source), target: Number(target) }
          : null
    };
    emit('mg30-wireless-midi-state', currentState());
    return { ...config };
  },
  getState: currentState
});

function applyUiConfig() {
  const passthrough = document.getElementById('blePassthrough');
  const feedback = document.getElementById('bleFeedback');
  const source = document.getElementById('bridgeCcSource');
  const target = document.getElementById('bridgeCcTarget');
  if (!passthrough || !feedback || !source || !target) return;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('mg30-wireless-midi-bridge') || '{}'); } catch {}
  passthrough.checked = saved.passthrough !== false;
  feedback.checked = saved.feedback !== false;
  source.value = saved.ccMap?.source ?? '';
  target.value = saved.ccMap?.target ?? '';
  configureFromUi();
}
function configureFromUi() {
  const passthrough = document.getElementById('blePassthrough');
  const feedback = document.getElementById('bleFeedback');
  const source = document.getElementById('bridgeCcSource');
  const target = document.getElementById('bridgeCcTarget');
  if (!passthrough || !feedback || !source || !target) return;
  const a = source.value.trim();
  const b = target.value.trim();
  const ccMap = a !== '' && b !== '' &&
    Number.isInteger(Number(a)) && Number.isInteger(Number(b)) &&
    Number(a) >= 0 && Number(a) <= 127 && Number(b) >= 0 && Number(b) <= 127
      ? { source: Number(a), target: Number(b) }
      : null;
  const next = { passthrough: passthrough.checked, feedback: feedback.checked, ccMap };
  localStorage.setItem('mg30-wireless-midi-bridge', JSON.stringify(next));
  window.MG30WirelessMidi.configure(next);
  const label = document.getElementById('bridgeCcMapStatus');
  if (label) label.textContent = ccMap
    ? 'CC ' + ccMap.source + ' → CC ' + ccMap.target + ' active'
    : 'No custom CC mapping configured.';
}
function renderDevice(device) {
  if (!device?.address) return;
  const list = document.getElementById('bleMidiDeviceList');
  if (!list) return;
  let button = [...list.children].find(item => item.dataset.address === device.address);
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.dataset.address = device.address;
    list.appendChild(button);
  }
  button.textContent = (device.isChocolatePlus ? '★ ' : '') +
    (device.name || 'Bluetooth MIDI device') + ' · ' + device.address +
    (Number.isFinite(device.rssi) ? ' · ' + device.rssi + ' dBm' : '') +
    (device.bonded ? ' · PAIRED' : '');
  button.onclick = async () => {
    const state = document.getElementById('bleMidiStatus');
    if (state) state.textContent = 'Connecting…';
    status('Opening Android BLE-MIDI device ' + (device.name || device.address) + '…');
    try {
      const result = await window.MG30WirelessMidi.connect(device.address);
      if (state) state.textContent = 'Connected · ' + (result.name || device.name || 'Bluetooth MIDI');
      status('BLE-MIDI connection open. Press a Chocolate Plus footswitch to verify editor input.');
    } catch (error) {
      if (state) state.textContent = 'Connection failed';
      status(error?.message || String(error));
    }
  };
}

async function refreshBluetoothState() {
  const chip = document.getElementById('androidBluetoothStatus');
  if (!nativeAndroid) {
    if (chip) chip.textContent = 'Android app required';
    status('Native Android BLE bridge is not available in this runtime.');
    return null;
  }
  if (chip) chip.textContent = 'Checking…';
  try {
    const state = await window.MG30WirelessMidi.getBluetoothState();
    if (chip) chip.textContent = state.enabled ? 'Bluetooth ON' : 'Bluetooth OFF';
    const details = [];
    if (!state.available) details.push('Bluetooth adapter unavailable.');
    if (state.permissionError) details.push('Bluetooth runtime permission missing: ' + state.permissionError);
    if (state.sdkInt < 31 && !state.locationServicesEnabled) details.push('Turn on Android Location Services before BLE scan.');
    if (!state.midiServiceAvailable) details.push('Android MIDI service is unavailable on this device.');
    if (details.length) status(details.join(' '));
    else status(state.enabled
      ? 'Bluetooth is ON. Nearby-device permission: ' + (state.scanPermissionGranted ? 'granted' : 'not granted yet') + '.'
      : 'Bluetooth is OFF. Enable it here or in Android Bluetooth Settings.');
    return state;
  } catch (error) {
    if (chip) chip.textContent = 'Status unavailable';
    status('Bluetooth diagnostics failed: ' + (error?.message || error));
    return null;
  }
}
async function enableAndroidBluetooth() {
  const chip = document.getElementById('androidBluetoothStatus');
  const button = document.getElementById('enableAndroidBluetooth');
  if (button) button.disabled = true;
  if (chip) chip.textContent = 'Requesting…';
  status('Requesting Android Nearby devices permission / Bluetooth activation…');
  try {
    const result = await window.MG30WirelessMidi.requestEnableBluetooth();
    const state = await refreshBluetoothState();
    if (state?.enabled || result?.enabled) {
      if (chip) chip.textContent = 'Bluetooth ON';
      status('Bluetooth is ON. Scan for Chocolate Plus next.');
    } else {
      if (chip) chip.textContent = 'Bluetooth OFF';
      status('Bluetooth was not enabled. Use Open Bluetooth Settings and turn it ON.');
    }
  } catch (error) {
    if (chip) chip.textContent = 'Activation failed';
    status('Bluetooth activation request failed: ' + (error?.message || error) +
      '. You can still open Android Bluetooth Settings and then retry.');
  } finally {
    if (button) button.disabled = !nativeAndroid;
  }
}
async function openAndroidBluetoothSettings() {
  status('Opening Android Bluetooth Settings…');
  try {
    await window.MG30WirelessMidi.openBluetoothSettings();
    status('Turn Bluetooth ON or confirm it is ON, then return to MG30 Studio.');
  } catch (error) {
    status('Cannot open Bluetooth Settings: ' + (error?.message || error));
  }
}
async function openAndroidAppPermissionSettings() {
  status('Opening MG30 Studio app permission settings…');
  try {
    await window.MG30WirelessMidi.openAppPermissionSettings();
    status('Allow Nearby devices permission for MG30 Studio, then return to this page.');
  } catch (error) {
    status('Cannot open app permission settings: ' + (error?.message || error));
  }
}
async function scanBleMidiDevices() {
  const list = document.getElementById('bleMidiDeviceList');
  const bleStatus = document.getElementById('bleMidiStatus');
  const scan = document.getElementById('scanBleMidi');
  if (list) list.replaceChildren();
  if (bleStatus) bleStatus.textContent = 'Checking…';
  if (scan) scan.disabled = true;
  try {
    const state = await refreshBluetoothState();
    if (state && !state.available) throw new Error('No Bluetooth adapter is available on this Android device.');
    if (state && !state.enabled && !state.permissionError) {
      throw new Error('Bluetooth Android is OFF. Enable it first, then scan again.');
    }
    if (state && state.sdkInt < 31 && !state.locationServicesEnabled) {
      throw new Error('Turn on Android Location Services before BLE scan on this Android version.');
    }
    if (bleStatus) bleStatus.textContent = 'Requesting Nearby devices permission…';
    status('Starting BLE scan. Android may ask for Nearby devices permission. Keep Chocolate Plus powered ON, selector at H, and BLE connection mode active.');
    const result = await window.MG30WirelessMidi.scan({ durationMs: 15000 });
    if (bleStatus) bleStatus.textContent = 'Scanning…';
    if (result?.scanning) status('BLE scan running for 15 seconds. Waiting for Chocolate Plus advertisement…');
  } catch (error) {
    if (bleStatus) bleStatus.textContent = 'Scan failed';
    status(error?.message || String(error));
  } finally {
    if (scan) scan.disabled = !nativeAndroid;
  }
}
function bindButton(id, handler) {
  const button = document.getElementById(id);
  if (!button) {
    status('Bluetooth MIDI UI control not found: ' + id);
    return;
  }
  button.disabled = !nativeAndroid;
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    void handler();
  });
}
function bindUi() {
  status('Bluetooth MIDI bridge module loaded. Checking Android Bluetooth…');
  const androidStatus = document.getElementById('androidBluetoothStatus');
  if (androidStatus) androidStatus.textContent = 'Checking…';
  bindButton('enableAndroidBluetooth', enableAndroidBluetooth);
  bindButton('openBluetoothSettings', openAndroidBluetoothSettings);
  bindButton('openAppPermissionSettings', openAndroidAppPermissionSettings);
  bindButton('scanBleMidi', scanBleMidiDevices);

  const disconnect = document.getElementById('disconnectBleMidi');
  if (disconnect) disconnect.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await window.MG30WirelessMidi.disconnect();
      const bleStatus = document.getElementById('bleMidiStatus');
      if (bleStatus) bleStatus.textContent = 'Disconnected';
      status('Bluetooth MIDI disconnected.');
    } catch (error) {
      status('BLE disconnect failed: ' + (error?.message || error));
    }
  });

  const passthrough = document.getElementById('blePassthrough');
  const feedback = document.getElementById('bleFeedback');
  const save = document.getElementById('saveBridgeMapping');
  const clear = document.getElementById('clearBridgeMapping');
  if (passthrough) passthrough.addEventListener('change', configureFromUi);
  if (feedback) feedback.addEventListener('change', configureFromUi);
  if (save) save.addEventListener('click', event => {
    event.preventDefault();
    const source = document.getElementById('bridgeCcSource')?.value.trim() || '';
    const target = document.getElementById('bridgeCcTarget')?.value.trim() || '';
    if (!source || !target || !Number.isInteger(Number(source)) || !Number.isInteger(Number(target)) ||
        Number(source) < 0 || Number(source) > 127 || Number(target) < 0 || Number(target) > 127) {
      status('Source and target CC must both be integers from 0 to 127.');
      return;
    }
    configureFromUi();
    status('Custom CC mapping saved.');
  });
  if (clear) clear.addEventListener('click', event => {
    event.preventDefault();
    const source = document.getElementById('bridgeCcSource');
    const target = document.getElementById('bridgeCcTarget');
    if (source) source.value = '';
    if (target) target.value = '';
    configureFromUi();
    status('Custom CC mapping cleared.');
  });

  applyUiConfig();
  window.addEventListener('mg30-open-bluetooth-midi', () => { void refreshBluetoothState(); });
  window.addEventListener('mg30-wireless-midi-device-found', event => renderDevice(event.detail));
  window.addEventListener('mg30-wireless-midi-connection', event => {
    const connected = Boolean(event.detail?.connected);
    const bleStatus = document.getElementById('bleMidiStatus');
    if (bleStatus) bleStatus.textContent = connected ? 'Connected · ' + (event.detail?.name || 'Bluetooth MIDI') : 'Disconnected';
    const summary = document.getElementById('midiCenterBleStatus');
    if (summary) summary.textContent = connected ? 'Connected' : 'Not connected';
    const usb = document.getElementById('bluetoothUsbStatus');
    if (usb) usb.textContent = window.NUXNativeMidi?.isConnected?.() ? 'Connected' : 'Not connected';
  });
  window.addEventListener('mg30-wireless-midi-scan-finished', event => {
    const found = Number(event.detail?.found || 0);
    const bleStatus = document.getElementById('bleMidiStatus');
    if (bleStatus && !bleStatus.textContent.startsWith('Connected')) {
      bleStatus.textContent = found + ' device(s) found';
    }
    status(found
      ? found + ' BLE MIDI device(s) found. Select the Chocolate Plus entry.'
      : 'No BLE devices found. Keep Chocolate Plus ON, switch at H, and try again.');
  });
  window.addEventListener('mg30-wireless-midi-scan-error', event => {
    const bleStatus = document.getElementById('bleMidiStatus');
    if (bleStatus) bleStatus.textContent = 'Scan failed · ' + (event.detail?.errorCode ?? '?');
    status(event.detail?.message || 'Bluetooth LE scan failed. Check Nearby devices permission.');
  });
  window.addEventListener('mg30-native-midi-state', event => {
    const connected = Boolean(event.detail?.connected);
    for (const id of ['midiCenterUsbStatus', 'bluetoothUsbStatus']) {
      const node = document.getElementById(id);
      if (node) node.textContent = connected ? 'Connected' : 'Not connected';
    }
    const state = document.getElementById('deviceStatus');
    if (state) state.textContent = connected ? 'Connected' : 'Not connected';
  });
  window.addEventListener('mg30-midi-external-input', event => {
    const input = document.getElementById('bleMidiInputStatus');
    if (input) input.textContent = 'Editor input: ' + receivedByEditor + ' message(s) received from ' +
      (event.detail?.name || 'BLE MIDI');
  });
  void refreshBluetoothState();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUi, { once: true });
else bindUi();
