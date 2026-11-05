import { Capacitor, registerPlugin } from '@capacitor/core';

const NativeMidi = registerPlugin('MG30Midi');
const MIDIMsgListeners = new Set();
const inputListeners = new Set();

const inputPort = {
  id: 'mg30-native-midi-in',
  name: 'NUX MG-30',
  manufacturer: 'NUX',
  state: 'disconnected',
  type: 'input',
  onmidimessage: null,
  addEventListener(type, handler) {
    if (type === 'midimessage' && typeof handler === 'function') inputListeners.add(handler);
  },
  removeEventListener(type, handler) {
    if (type === 'midimessage') inputListeners.delete(handler);
  },
};

let connected = false;
let outputPort = null;
let accessShim = null;
let rawSysex = null;
let runningStatus = 0;
let currentMessage = [];
let expectedLength = 0;
let liveDeviceName = 'NUX MG-30';

function dispatchMessage(bytes) {
  if (!bytes || bytes.length === 0) return;
  const event = { data: new Uint8Array(bytes), receivedTime: performance.now(), target: inputPort };
  if (typeof inputPort.onmidimessage === 'function') inputPort.onmidimessage(event);
  for (const listener of inputListeners) {
    try { listener(event); } catch (error) { console.warn('Native MIDI listener error', error); }
  }
}

function messageLength(status) {
  if (status >= 0x80 && status <= 0xEF) return ((status & 0xF0) === 0xC0 || (status & 0xF0) === 0xD0) ? 2 : 3;
  if (status === 0xF1 || status === 0xF3) return 2;
  if (status === 0xF2) return 3;
  return 1;
}

// Android MidiReceiver may split incoming SysEx into several buffers. Reassemble
// complete SysEx frames before exposing them through the same shape as Web MIDI.
function consumeRawBytes(source) {
  for (const value of source || []) {
    const byte = Number(value) & 0xFF;
    if (byte >= 0xF8) {
      dispatchMessage([byte]);
      continue;
    }
    if (rawSysex) {
      rawSysex.push(byte);
      if (rawSysex.length > 1024 * 1024) rawSysex = null;
      else if (byte === 0xF7) {
        dispatchMessage(rawSysex);
        rawSysex = null;
      }
      continue;
    }
    if (byte === 0xF0) {
      rawSysex = [byte];
      currentMessage = [];
      runningStatus = 0;
      expectedLength = 0;
      continue;
    }
    if (byte & 0x80) {
      runningStatus = (byte < 0xF0) ? byte : 0;
      expectedLength = messageLength(byte);
      currentMessage = [byte];
      if (expectedLength === 1) {
        dispatchMessage(currentMessage);
        currentMessage = [];
        if (byte >= 0xF0) runningStatus = 0;
      }
      continue;
    }
    if (!runningStatus) continue;
    if (currentMessage.length === 0) currentMessage = [runningStatus];
    currentMessage.push(byte);
    if (currentMessage.length >= expectedLength) {
      dispatchMessage(currentMessage.slice(0, expectedLength));
      currentMessage = runningStatus ? [runningStatus] : [];
    }
  }
}

function notifyConnection(connectedNow, deviceName = liveDeviceName) {
  connected = Boolean(connectedNow);
  liveDeviceName = deviceName || liveDeviceName;
  inputPort.state = connected ? 'connected' : 'disconnected';
  if (outputPort) outputPort.state = inputPort.state;
  if (accessShim?.onstatechange) {
    try { accessShim.onstatechange({ port: inputPort }); } catch (error) { console.warn(error); }
  }
  window.dispatchEvent(new CustomEvent('mg30-native-midi-state', {
    detail: { connected, name: liveDeviceName }
  }));
}

if (Capacitor.isNativePlatform()) {
  outputPort = {
    id: 'mg30-native-midi-out',
    name: 'NUX MG-30',
    manufacturer: 'NUX',
    state: 'disconnected',
    type: 'output',
    send(data) {
      if (!connected) return Promise.reject(new Error('USB-MIDI is not connected.'));
      const bytes = Array.from(data || [], value => Number(value) & 0xFF);
      if (!bytes.length) return Promise.resolve();
      return NativeMidi.send({ data: bytes });
    },
  };
  accessShim = {
    inputs: new Map([[inputPort.id, inputPort]]),
    outputs: new Map([[outputPort.id, outputPort]]),
    onstatechange: null,
  };

  NativeMidi.addListener('midiData', event => consumeRawBytes(event?.data || []));
  NativeMidi.addListener('midiConnectionChanged', event => {
    notifyConnection(Boolean(event?.connected), event?.name || liveDeviceName);
  });
  NativeMidi.addListener('midiDeviceChanged', event => {
    window.dispatchEvent(new CustomEvent('mg30-native-midi-device', { detail: event || {} }));
  });

  window.NUXNativeMidi = {
    available: true,
    isConnected: () => connected,
    async connect(options = {}) {
      if (connected && outputPort) {
        return { input: inputPort, output: outputPort, access: accessShim, deviceName: liveDeviceName };
      }
      const result = await NativeMidi.listDevices();
      const devices = Array.isArray(result?.devices) ? result.devices : [];
      const hasPorts = device => Number(device.inputPortCount) > 0 && Number(device.outputPortCount) > 0;
      let candidates = devices.filter(device => hasPorts(device));
      let selected = candidates.find(device => /mg\s*-?\s*30|mg30/i.test(
        String(device.name || '') + ' ' + String(device.product || '')
      ));
      if (!selected) selected = candidates.find(device => /nux/i.test(
        String(device.name || '') + ' ' + String(device.product || '') + ' ' + String(device.manufacturer || '')
      ));
      if (!selected && candidates.length === 1 && options.autoOnly !== true) selected = candidates[0];
      if (!selected) {
        const labels = candidates.map(device => String(device.name || device.product || 'MIDI device') + ' (ID ' + device.id + ')');
        throw new Error(labels.length
          ? 'No matching USB-MIDI device is selected. Detected: ' + labels.join(', ')
          : 'Android cannot detect the USB-MIDI device. Check the data cable and OTG adapter.');
      }
      const opened = await NativeMidi.connect({ deviceId: Number(selected.id) });
      notifyConnection(true, opened?.name || selected.name || selected.product || 'NUX MG-30');
      return { input: inputPort, output: outputPort, access: accessShim, deviceName: liveDeviceName };
    },
    async disconnect() {
      try { await NativeMidi.disconnect(); } finally { notifyConnection(false); }
    },
    async listDevices() {
      const result = await NativeMidi.listDevices();
      return Array.isArray(result?.devices) ? result.devices : [];
    },
    async savePatch(options = {}) {
      const bytes = options.bytes instanceof Uint8Array
        ? options.bytes
        : (options.bytes instanceof ArrayBuffer ? new Uint8Array(options.bytes) : null);
      if (!bytes || !bytes.length) {
        throw new Error('Payload file patch tidak tersedia sebagai Uint8Array.');
      }
      if (bytes.length !== 0x26AE && bytes.length !== 0x135700) {
        throw new Error('Ukuran file patch tidak cocok: ' + bytes.length + ' byte.');
      }
      const fileName = String(options.fileName || 'MG30_Preset.mg30patch');
      const chunkBytes = 48 * 1024;
      const toBase64 = chunk => {
        let binary = '';
        for (let index = 0; index < chunk.length; index++) {
          binary += String.fromCharCode(chunk[index]);
        }
        return btoa(binary);
      };

      const session = await NativeMidi.beginPatchExport({
        fileName,
        expectedBytes: bytes.length,
      });
      const transferId = session?.transferId;
      if (!transferId) throw new Error('Android tidak memberikan ID transfer file patch.');
      let finalized = false;
      try {
        for (let offset = 0; offset < bytes.length; offset += chunkBytes) {
          const chunk = bytes.subarray(offset, Math.min(offset + chunkBytes, bytes.length));
          const ack = await NativeMidi.writePatchExportChunk({
            transferId,
            offset,
            base64: toBase64(chunk),
          });
          const expectedReceived = offset + chunk.length;
          if (Number(ack?.receivedBytes) !== expectedReceived) {
            throw new Error('ACK chunk tidak cocok: staging menerima ' +
              Number(ack?.receivedBytes || 0) + ' dari ' + expectedReceived + ' byte.');
          }
        }
        const result = await NativeMidi.finishPatchExport({ transferId, fileName });
        finalized = true;
        return result;
      } finally {
        if (!finalized) {
          try { await NativeMidi.abortPatchExport({ transferId }); } catch (_) {}
        }
      }
    },
  };
  window.dispatchEvent(new CustomEvent('mg30-native-midi-ready'));
}
