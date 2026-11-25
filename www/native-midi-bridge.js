import { Capacitor, registerPlugin } from '@capacitor/core';
import { normalizeMidiBytes, routeControllerPacket } from './native-midi-routing.js';

const NativeBleMidi = registerPlugin('MG30BluetoothMidi');
const nativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
let usbInput = null;
let usbOutput = null;
let usbInputListener = null;
let bleConnected = false;
let bleName = '';
let config = { passthrough: true, feedback: true, ccMap: null };

function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
function status(message) {
  const copy = String(message || '');
  const node = document.getElementById('bridgeRouteStatus');
  const visible = document.getElementById('bleMidiMessage');
  if (node) node.textContent = copy;
  if (visible) visible.textContent = copy;
}
function currentState() {
  return {
    usbConnected: Boolean(window.NUXNativeMidi?.isConnected?.()),
    bleConnected,
    bleName,
    config: { ...config }
  };
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
        const data = normalizeMidiBytes(event.data);
        NativeBle.sendBleMidi({ data }).catch(error => {
          status('USB → BLE feedback failed: ' + (error?.message || error));
        });
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
async function routeBleToUsb(payload) {
  const bytes = payload?.data || [];
  if (!bytes.length) return;
  if (!window.NUXNativeMidi?.isConnected?.()) {
    status('Chocolate Plus is sending MIDI, but NUX MG-30 is not connected through USB.');
    emit('mg30-wireless-midi-activity', { direction: 'ble-to-usb', sent: false });
    return;
  }
  if (!usbOutput) await attachUsbFeedback();
  if (!usbOutput) {
    status('USB MIDI output is not ready. Reconnect the MG-30 first.');
    return;
  }
  try {
    const packets = routeControllerPacket(bytes, config);
    for (const packet of packets) await usbOutput.send(packet);
    emit('mg30-wireless-midi-activity', {
      direction: 'ble-to-usb',
      sent: packets.length > 0,
      bytes: bytes.length
    });
  } catch (error) {
    status('BLE → USB route failed: ' + (error?.message || error));
  }
}
if (nativeAndroid) {
  NativeBle.addListener('bleMidiDeviceFound', device => emit('mg30-wireless-midi-device-found', device));
  NativeBle.addListener('bleMidiData', payload => { void routeBleToUsb(payload); });
  NativeBle.addListener('bleMidiScanFinished', state => emit('mg30-wireless-midi-scan-finished', state));
  NativeBle.addListener('bleMidiScanError', error => emit('mg30-wireless-midi-scan-error', error));
  NativeBle.addListener('bleMidiConnectionChanged', state => {
    bleConnected = Boolean(state?.connected);
    bleName = state?.name || '';
    emit('mg30-wireless-midi-connection', { connected: bleConnected, name: bleName });
    status(bleConnected
      ? (window.NUXNativeMidi?.isConnected?.() ? 'BLE ↔ USB MIDI bridge is connected.' : 'BLE connected. Connect MG-30 through USB OTG to route controller messages.')
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
  if (window.NUXNativeMidi?.isConnected?.()) void attachUsbFeedback();
}

window.MG30WirelessMidi = Object.freeze({
  available: nativeAndroid,
  async getBluetoothState() {
    if (!nativeAndroid) throw new Error('Bluetooth MIDI is available only in the Android app.');
    return NativeBle.getBluetoothState({});
  },
  async requestEnableBluetooth() {
    if (!nativeAndroid) throw new Error('Bluetooth MIDI is available only in the Android app.');
    return NativeBle.requestEnableBluetooth({});
  },
  async openBluetoothSettings() {
    if (!nativeAndroid) throw new Error('Bluetooth settings are available only in the Android app.');
    return NativeBle.openBluetoothSettings({});
  },
  async openAppPermissionSettings() {
    if (!nativeAndroid) throw new Error('App permission settings are available only in the Android app.');
    return NativeBle.openAppPermissionSettings({});
  },
  async scan(options = {}) {
    if (!nativeAndroid) throw new Error('BLE MIDI is available only in the Android app.');
    return NativeBle.scanBleDevices({ durationMs: options.durationMs || 12000 });
  },
  async connect(address) {
    if (!nativeAndroid) throw new Error('BLE MIDI is available only in the Android app.');
    return NativeBle.connectBleDevice({ address });
  },
  async disconnect() {
    if (!nativeAndroid) return { connected: false };
    const result = await NativeBle.disconnectBleDevice({});
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
  window.MG30WirelessMidi?.configure(next);
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
    (Number.isFinite(device.rssi) ? ' · ' + device.rssi + ' dBm' : '');
  button.onclick = async () => {
    const state = document.getElementById('bleMidiStatus');
    if (state) state.textContent = 'Connecting…';
    try {
      const result = await window.MG30WirelessMidi.connect(device.address);
      if (state) state.textContent = 'Connected · ' + (result.name || device.name || 'Bluetooth MIDI');
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
    return null;
  }
  try {
    const state = await window.MG30WirelessMidi.getBluetoothState();
    if (chip) chip.textContent = state.enabled ? 'Bluetooth ON' : 'Bluetooth OFF';
    const details = [];
    if (!state.available) details.push('Bluetooth adapter is unavailable on this device.');
    if (state.permissionError) details.push('Bluetooth permission: ' + state.permissionError);
    if (state.sdkInt < 31 && !state.locationServicesEnabled) details.push('Turn on Android Location services before BLE scan.');
    if (state.enabled && !state.bleScannerAvailable) details.push('Android BLE scanner is unavailable.');
    if (details.length) status(details.join(' '));
    return state;
  } catch (error) {
    if (chip) chip.textContent = 'Status unavailable';
    status('Unable to read Android Bluetooth state: ' + (error?.message || error));
    return null;
  }
}

async function enableAndroidBluetooth() {
  const chip = document.getElementById('androidBluetoothStatus');
  const button = document.getElementById('enableAndroidBluetooth');
  if (button) button.disabled = true;
  if (chip) chip.textContent = 'Checking permission…';
  status('Requesting Android Nearby devices permission and Bluetooth activation…');
  try {
    const result = await window.MG30WirelessMidi.requestEnableBluetooth();
    const state = await refreshBluetoothState();
    if (state?.enabled || result?.enabled) {
      if (chip) chip.textContent = 'Bluetooth ON';
      status('Bluetooth is enabled. You can now scan for Chocolate Plus.');
    } else {
      if (chip) chip.textContent = 'Bluetooth OFF';
      status('Bluetooth was not enabled. Use Open Bluetooth Settings, turn it ON, then return here.');
    }
  } catch (error) {
    if (chip) chip.textContent = 'Permission needed';
    status('Android did not open the Bluetooth activation prompt: ' + (error?.message || error) +
      '. Use Open Bluetooth Settings below, enable Bluetooth, then return and scan.');
  } finally {
    if (button) button.disabled = !nativeAndroid;
  }
}

async function openAndroidBluetoothSettings() {
  status('Opening Android Bluetooth settings…');
  try {
    await window.MG30WirelessMidi.openBluetoothSettings();
    status('Turn Bluetooth ON in Android Settings, then return to MG30 Studio.');
  } catch (error) {
    status('Cannot open Android Bluetooth settings: ' + (error?.message || error));
  }
}
async function openAndroidAppPermissionSettings() {
  status('Opening MG30 Studio app permissions…');
  try {
    await window.MG30WirelessMidi.openAppPermissionSettings();
    status('Allow Nearby devices permission for MG30 Studio, then return and scan again.');
  } catch (error) {
    status('Cannot open app permission settings: ' + (error?.message || error));
  }
}

async function scanBleMidiDevices() {
  const list = document.getElementById('bleMidiDeviceList');
  const bleStatus = document.getElementById('bleMidiStatus');
  const scan = document.getElementById('scanBleMidi');
  if (list) list.replaceChildren();
  if (bleStatus) bleStatus.textContent = 'Checking Bluetooth…';
  if (scan) scan.disabled = true;
  try {
    const state = await refreshBluetoothState();
    if (!state?.available) throw new Error('This Android device does not expose a Bluetooth adapter.');
    if (!state?.enabled && !state?.permissionError) throw new Error('Bluetooth Android is OFF. Enable it first, then scan again.');
    if (state.sdkInt < 31 && !state.locationServicesEnabled) {
      throw new Error('Turn on Android Location services before scanning BLE devices on this Android version.');
    }
    if (bleStatus) bleStatus.textContent = 'Scanning for 12 seconds…';
    status('Scanning nearby BLE MIDI devices. Make sure Chocolate Plus is powered on and in BLE MIDI mode.');
    await window.MG30WirelessMidi.scan({ durationMs: 12000 });
  } catch (error) {
    if (bleStatus) bleStatus.textContent = 'Scan failed';
    status(error?.message || String(error));
  } finally {
    if (scan) scan.disabled = !nativeAndroid;
  }
}

document.addEventListener('click', event => {
  const target = event.target?.closest?.('#enableAndroidBluetooth, #openBluetoothSettings, #openAppPermissionSettings, #scanBleMidi');
  if (!target) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (target.id === 'enableAndroidBluetooth') void enableAndroidBluetooth();
  else if (target.id === 'openBluetoothSettings') void openAndroidBluetoothSettings();
  else if (target.id === 'openAppPermissionSettings') void openAndroidAppPermissionSettings();
  else if (target.id === 'scanBleMidi') void scanBleMidiDevices();
}, true);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void refreshBluetoothState();
});
window.addEventListener('focus', () => { void refreshBluetoothState(); });

function bindUi() {
  const enable = document.getElementById('enableAndroidBluetooth');
  const scan = document.getElementById('scanBleMidi');
  const disconnect = document.getElementById('disconnectBleMidi');
  const passthrough = document.getElementById('blePassthrough');
  const feedback = document.getElementById('bleFeedback');
  const save = document.getElementById('saveBridgeMapping');
  const clear = document.getElementById('clearBridgeMapping');
  const androidStatus = document.getElementById('androidBluetoothStatus');
  const bleStatus = document.getElementById('bleMidiStatus');
  if (enable) enable.disabled = !nativeAndroid;
  const openSettings = document.getElementById('openBluetoothSettings');
  if (openSettings) openSettings.disabled = !nativeAndroid;
  const appSettings = document.getElementById('openAppPermissionSettings');
  if (appSettings) appSettings.disabled = !nativeAndroid;
  if (scan) scan.disabled = !nativeAndroid;
  refreshBluetoothState();

  if (disconnect) disconnect.addEventListener('click', async () => {
    try {
      await window.MG30WirelessMidi.disconnect();
      if (bleStatus) bleStatus.textContent = 'Disconnected';
    } catch (error) { status(error?.message || String(error)); }
  });
  if (passthrough) passthrough.addEventListener('change', configureFromUi);
  if (feedback) feedback.addEventListener('change', configureFromUi);
  if (save) save.addEventListener('click', () => {
    const a = document.getElementById('bridgeCcSource')?.value.trim() || '';
    const b = document.getElementById('bridgeCcTarget')?.value.trim() || '';
    if (!a || !b || !Number.isInteger(Number(a)) || !Number.isInteger(Number(b)) ||
      Number(a) < 0 || Number(a) > 127 || Number(b) < 0 || Number(b) > 127) {
      status('Source and target CC must both be integers from 0 to 127.');
      return;
    }
    configureFromUi();
    status('Custom CC mapping saved.');
  });
  if (clear) clear.addEventListener('click', () => {
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
    if (bleStatus) bleStatus.textContent = connected ? 'Connected · ' + (event.detail?.name || 'Bluetooth MIDI') : 'Disconnected';
    const summary = document.getElementById('midiCenterBleStatus');
    if (summary) summary.textContent = connected ? 'Connected' : 'Not connected';
    const usb = document.getElementById('bluetoothUsbStatus');
    if (usb) usb.textContent = window.NUXNativeMidi?.isConnected?.() ? 'Connected' : 'Not connected';
  });
  window.addEventListener('mg30-wireless-midi-scan-finished', event => {
    if (bleStatus && !bleStatus.textContent.startsWith('Connected')) {
      const found = Number(event.detail?.found || 0);
      bleStatus.textContent = found + ' device(s) found';
      status(found ? found + ' BLE device(s) found. Select the controller to connect.' : 'No BLE devices found. Wake Chocolate Plus, enable BLE MIDI mode, and scan again.');
    }
  });
  window.addEventListener('mg30-wireless-midi-scan-error', event => {
    if (bleStatus) bleStatus.textContent = 'Scan failed · code ' + (event.detail?.errorCode ?? '?');
    status(event.detail?.message || 'Bluetooth LE scan failed. Check Nearby devices permission and Android Bluetooth settings.');
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
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUi, { once: true });
else bindUi();
