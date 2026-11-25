package com.vaivaii.mg30studio;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiInputPort;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(
    name = "MG30BluetoothMidi",
    permissions = {
        @Permission(alias = "bluetoothScan", strings = { Manifest.permission.BLUETOOTH_SCAN }),
        @Permission(alias = "bluetoothConnect", strings = { Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "legacyBluetoothLocation", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class MG30BluetoothMidiPlugin extends Plugin {
    private static final int DEFAULT_SCAN_MS = 10000;
    private static final int MAX_SCAN_MS = 20000;
    private static final int MAX_MIDI_BYTES = 4096;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Map<String, BluetoothDevice> discoveredDevices = new ConcurrentHashMap<>();

    private MidiManager midiManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeScanner bleScanner;
    private ScanCallback scanCallback;
    private Runnable scanTimeout;
    private MidiDevice activeMidiDevice;
    private MidiInputPort appToControllerPort;
    private MidiOutputPort controllerToAppPort;
    private MidiReceiver midiReceiver;
    private String activeAddress = "";
    private String activeName = "";

    @Override
    public void load() {
        midiManager = (MidiManager) getContext().getSystemService(Context.MIDI_SERVICE);
        BluetoothManager bluetoothManager =
            (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager != null) bluetoothAdapter = bluetoothManager.getAdapter();
    }

    @PluginMethod
    public void scanBleDevices(PluginCall call) {
        if (!ensureScanPermissions(call)) return;
        startBleScan(call);
    }

    @PermissionCallback
    private void onScanPermissionResult(PluginCall call) {
        if (call == null) return;
        if (!scanPermissionsGranted()) {
            call.reject("Izin Bluetooth/Nearby devices diperlukan untuk mencari Chocolate Plus.");
            return;
        }
        startBleScan(call);
    }

    private boolean ensureScanPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getPermissionState("bluetoothScan") != PermissionState.GRANTED ||
                getPermissionState("bluetoothConnect") != PermissionState.GRANTED) {
                requestPermissionForAliases(new String[] { "bluetoothScan", "bluetoothConnect" }, call, "onScanPermissionResult");
                return false;
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            getPermissionState("legacyBluetoothLocation") != PermissionState.GRANTED) {
            requestPermissionForAlias("legacyBluetoothLocation", call, "onScanPermissionResult");
            return false;
        }
        return true;
    }

    private boolean scanPermissionsGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return getPermissionState("bluetoothScan") == PermissionState.GRANTED &&
                getPermissionState("bluetoothConnect") == PermissionState.GRANTED;
        }
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
            getPermissionState("legacyBluetoothLocation") == PermissionState.GRANTED;
    }

    private void startBleScan(PluginCall call) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth belum aktif. Aktifkan Bluetooth Android lalu coba pindai lagi.");
            return;
        }
        if (midiManager == null) {
            call.reject("Android MIDI service tidak tersedia pada perangkat ini.");
            return;
        }
        bleScanner = bluetoothAdapter.getBluetoothLeScanner();
        if (bleScanner == null) {
            call.reject("BLE scanner tidak tersedia. Periksa dukungan Bluetooth Low Energy perangkat Android.");
            return;
        }

        stopBleScanInternal();
        discoveredDevices.clear();
        scanCallback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                publishDevice(result);
            }

            @Override
            public void onBatchScanResults(java.util.List<ScanResult> results) {
                for (ScanResult result : results) publishDevice(result);
            }

            @Override
            public void onScanFailed(int errorCode) {
                JSObject event = new JSObject();
                event.put("errorCode", errorCode);
                event.put("message", "Bluetooth LE scan gagal.");
                notifyListeners("bleMidiScanError", event);
            }
        };

        Integer requested = call.getInt("durationMs");
        int durationMs = requested == null ? DEFAULT_SCAN_MS :
            Math.max(3000, Math.min(MAX_SCAN_MS, requested));

        try {
            ScanSettings settings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build();
            bleScanner.startScan(null, settings, scanCallback);
            scanTimeout = () -> {
                stopBleScanInternal();
                JSObject event = new JSObject();
                event.put("scanning", false);
                event.put("found", discoveredDevices.size());
                notifyListeners("bleMidiScanFinished", event);
            };
            mainHandler.postDelayed(scanTimeout, durationMs);

            JSObject result = new JSObject();
            result.put("scanning", true);
            result.put("durationMs", durationMs);
            call.resolve(result);
        } catch (SecurityException error) {
            call.reject("Izin Bluetooth belum diberikan: " + error.getMessage());
        } catch (Exception error) {
            call.reject("Tidak dapat memulai BLE scan: " + error.getMessage());
        }
    }

    private void publishDevice(ScanResult result) {
        if (result == null || result.getDevice() == null) return;
        BluetoothDevice device = result.getDevice();
        String address;
        String name;
        try {
            address = device.getAddress();
            name = device.getName();
        } catch (SecurityException error) {
            return;
        }
        if (address == null || address.isEmpty()) return;
        discoveredDevices.put(address, device);

        JSObject event = new JSObject();
        event.put("address", address);
        event.put("name", name == null || name.trim().isEmpty() ? "Bluetooth MIDI device" : name);
        event.put("rssi", result.getRssi());
        event.put("isChocolatePlus", name != null && name.toLowerCase(java.util.Locale.ROOT).contains("chocolate"));
        notifyListeners("bleMidiDeviceFound", event);
    }

    @PluginMethod
    public void stopBleScan(PluginCall call) {
        stopBleScanInternal();
        JSObject result = new JSObject();
        result.put("scanning", false);
        result.put("found", discoveredDevices.size());
        call.resolve(result);
    }

    private void stopBleScanInternal() {
        if (scanTimeout != null) {
            mainHandler.removeCallbacks(scanTimeout);
            scanTimeout = null;
        }
        if (bleScanner != null && scanCallback != null) {
            try {
                bleScanner.stopScan(scanCallback);
            } catch (SecurityException ignored) {
                // The scan may already have stopped or permission may have been revoked.
            } catch (Exception ignored) {
                // Best-effort cleanup.
            }
        }
        scanCallback = null;
    }

    @PluginMethod
    public void connectBleDevice(PluginCall call) {
        String address = call.getString("address", "").trim();
        if (!BluetoothAdapter.checkBluetoothAddress(address)) {
            call.reject("Alamat Bluetooth perangkat tidak valid. Pindai Chocolate Plus lalu pilih dari daftar.");
            return;
        }
        if (!ensureConnectPermission(call)) return;
        openBleDevice(call, address);
    }

    @PermissionCallback
    private void onConnectPermissionResult(PluginCall call) {
        if (call == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            getPermissionState("bluetoothConnect") != PermissionState.GRANTED) {
            call.reject("Izin Nearby devices diperlukan untuk terhubung ke controller MIDI.");
            return;
        }
        openBleDevice(call, call.getString("address", "").trim());
    }

    private boolean ensureConnectPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            getPermissionState("bluetoothConnect") != PermissionState.GRANTED) {
            requestPermissionForAlias("bluetoothConnect", call, "onConnectPermissionResult");
            return false;
        }
        return true;
    }

    private void openBleDevice(PluginCall call, String address) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth Android tidak aktif.");
            return;
        }
        if (midiManager == null) {
            call.reject("Android MIDI service tidak tersedia.");
            return;
        }

        try {
            BluetoothDevice bluetoothDevice = discoveredDevices.get(address);
            if (bluetoothDevice == null) bluetoothDevice = bluetoothAdapter.getRemoteDevice(address);
            final BluetoothDevice selected = bluetoothDevice;
            stopBleScanInternal();
            closeBleConnection();

            midiManager.openBluetoothDevice(selected, device -> {
                if (device == null) {
                    call.reject("Android gagal membuka Bluetooth MIDI. Pastikan Chocolate Plus menyala dan tidak sedang dipakai aplikasi lain.");
                    return;
                }
                try {
                    MidiDeviceInfo info = device.getInfo();
                    if (info.getInputPortCount() < 1 || info.getOutputPortCount() < 1) {
                        device.close();
                        call.reject("Perangkat BLE terdeteksi, tetapi tidak menyediakan port MIDI dua arah.");
                        return;
                    }
                    MidiInputPort input = device.openInputPort(0);
                    MidiOutputPort output = device.openOutputPort(0);
                    if (input == null || output == null) {
                        if (input != null) input.close();
                        if (output != null) output.close();
                        device.close();
                        call.reject("Port Bluetooth MIDI tidak dapat dibuka.");
                        return;
                    }

                    activeMidiDevice = device;
                    appToControllerPort = input;
                    controllerToAppPort = output;
                    activeAddress = selected.getAddress();
                    try {
                        activeName = selected.getName();
                    } catch (SecurityException ignored) {
                        activeName = "";
                    }
                    if (activeName == null || activeName.isEmpty()) activeName = "Bluetooth MIDI";

                    midiReceiver = new MidiReceiver() {
                        @Override
                        public void onSend(byte[] message, int offset, int count, long timestamp) {
                            JSArray bytes = new JSArray();
                            for (int i = offset; i < offset + count; i++) bytes.put(message[i] & 0xFF);
                            JSObject payload = new JSObject();
                            payload.put("data", bytes);
                            payload.put("address", activeAddress);
                            payload.put("deviceName", activeName);
                            notifyListeners("bleMidiData", payload);
                        }
                    };
                    output.connect(midiReceiver);

                    JSObject connected = new JSObject();
                    connected.put("connected", true);
                    connected.put("address", activeAddress);
                    connected.put("name", activeName);
                    connected.put("inputPort", 0);
                    connected.put("outputPort", 0);
                    call.resolve(connected);
                    notifyListeners("bleMidiConnectionChanged", connected);
                } catch (Exception error) {
                    device.close();
                    call.reject("Gagal membuka port Bluetooth MIDI: " + error.getMessage());
                }
            }, mainHandler);
        } catch (SecurityException error) {
            call.reject("Izin Bluetooth belum tersedia: " + error.getMessage());
        } catch (IllegalArgumentException error) {
            call.reject("Controller tidak lagi tersedia: " + error.getMessage());
        }
    }

    @PluginMethod
    public void sendBleMidi(PluginCall call) {
        MidiInputPort port = appToControllerPort;
        if (port == null) {
            call.reject("Bluetooth MIDI belum terhubung.");
            return;
        }
        JSArray source = call.getArray("data");
        if (source == null || source.length() == 0 || source.length() > MAX_MIDI_BYTES) {
            call.reject("Data MIDI kosong atau melebihi batas " + MAX_MIDI_BYTES + " byte.");
            return;
        }

        byte[] bytes = new byte[source.length()];
        try {
            for (int i = 0; i < source.length(); i++) {
                int value = source.getInt(i);
                if (value < 0 || value > 255) {
                    call.reject("Nilai byte MIDI tidak valid pada posisi " + i + ".");
                    return;
                }
                bytes[i] = (byte) value;
            }
            port.send(bytes, 0, bytes.length, 0L);
            JSObject result = new JSObject();
            result.put("sent", true);
            result.put("bytes", bytes.length);
            call.resolve(result);
        } catch (JSONException | IOException error) {
            call.reject("Pengiriman Bluetooth MIDI gagal: " + error.getMessage());
        }
    }

    @PluginMethod
    public void disconnectBleDevice(PluginCall call) {
        closeBleConnection();
        JSObject result = new JSObject();
        result.put("connected", false);
        call.resolve(result);
    }

    private void closeBleConnection() {
        if (controllerToAppPort != null) {
            try {
                if (midiReceiver != null) controllerToAppPort.disconnect(midiReceiver);
                controllerToAppPort.close();
            } catch (IOException ignored) { }
        }
        if (appToControllerPort != null) {
            try { appToControllerPort.close(); } catch (IOException ignored) { }
        }
        if (activeMidiDevice != null) {
            try { activeMidiDevice.close(); } catch (IOException ignored) { }
        }
        controllerToAppPort = null;
        appToControllerPort = null;
        activeMidiDevice = null;
        midiReceiver = null;
        activeAddress = "";
        activeName = "";
        JSObject state = new JSObject();
        state.put("connected", false);
        notifyListeners("bleMidiConnectionChanged", state);
    }

    @Override
    protected void handleOnDestroy() {
        stopBleScanInternal();
        closeBleConnection();
        super.handleOnDestroy();
    }
}
