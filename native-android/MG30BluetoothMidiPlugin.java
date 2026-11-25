package com.vaivaii.mg30studio;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.location.LocationManager;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiInputPort;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.activity.result.ActivityResult;

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
import java.util.Set;
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

    private boolean hasPermissionStateGranted(String alias) {
        try {
            return getPermissionState(alias) == PermissionState.GRANTED;
        } catch (Exception error) {
            return false;
        }
    }

    @PluginMethod
    public void getBluetoothState(PluginCall call) {
        JSObject state = new JSObject();
        try {
            state.put("available", bluetoothAdapter != null);
            state.put("enabled", false);
            state.put("bleScannerAvailable", false);
            state.put("midiServiceAvailable", midiManager != null);
            state.put("sdkInt", Build.VERSION.SDK_INT);

            if (bluetoothAdapter != null) {
                try {
                    state.put("enabled", bluetoothAdapter.isEnabled());
                    state.put("bleScannerAvailable", bluetoothAdapter.getBluetoothLeScanner() != null);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && hasPermissionStateGranted("bluetoothConnect")) {
                        Set<BluetoothDevice> bonded = bluetoothAdapter.getBondedDevices();
                        state.put("bondedDeviceCount", bonded == null ? 0 : bonded.size());
                    }
                } catch (SecurityException error) {
                    state.put("permissionError", error.getMessage());
                }
            }

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                try {
                    LocationManager location = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
                    boolean enabled = Build.VERSION.SDK_INT < Build.VERSION_CODES.P
                        ? location != null && (location.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                            location.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
                        : location != null && location.isLocationEnabled();
                    state.put("locationServicesEnabled", enabled);
                } catch (Exception error) {
                    state.put("locationServicesEnabled", false);
                    state.put("locationDiagnostic", error.getMessage());
                }
            } else {
                state.put("locationServicesEnabled", true);
            }

            state.put("scanPermissionGranted", Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                hasPermissionStateGranted("bluetoothScan"));
            state.put("connectPermissionGranted", Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                hasPermissionStateGranted("bluetoothConnect"));
            state.put("legacyLocationPermissionGranted", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ||
                Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                hasPermissionStateGranted("legacyBluetoothLocation"));
            state.put("diagnosticsOk", true);
        } catch (Exception error) {
            state.put("diagnosticsOk", false);
            state.put("diagnosticError", error.getClass().getSimpleName() + ": " + error.getMessage());
        }
        call.resolve(state);
    }

    @PluginMethod
    public void openAppPermissionSettings(PluginCall call) {
        try {
            Intent settings = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            settings.setData(android.net.Uri.fromParts("package", getContext().getPackageName(), null));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Pengaturan izin aplikasi Android tidak dapat dibuka: " + error.getMessage());
        }
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        try {
            Intent settings = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Pengaturan Bluetooth Android tidak dapat dibuka: " + error.getMessage());
        }
    }

    @PluginMethod
    public void requestEnableBluetooth(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth tidak tersedia pada perangkat Android ini.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasPermissionStateGranted("bluetoothConnect")) {
            try {
                requestPermissionForAlias("bluetoothConnect", call, "onBluetoothEnablePermissionResult");
            } catch (Exception error) {
                call.reject("Permintaan izin Nearby devices gagal: " + error.getMessage());
            }
            return;
        }
        launchBluetoothEnableRequest(call);
    }

    @PermissionCallback
    private void onBluetoothEnablePermissionResult(PluginCall call) {
        if (call == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasPermissionStateGranted("bluetoothConnect")) {
            call.reject("Izin Nearby devices diperlukan untuk memeriksa dan mengaktifkan Bluetooth.");
            return;
        }
        launchBluetoothEnableRequest(call);
    }

    private void launchBluetoothEnableRequest(PluginCall call) {
        try {
            if (bluetoothAdapter.isEnabled()) {
                JSObject state = new JSObject();
                state.put("enabled", true);
                state.put("alreadyEnabled", true);
                call.resolve(state);
                return;
            }
            Intent request = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(call, request, "onBluetoothEnableResult");
        } catch (SecurityException error) {
            call.reject("Izin Bluetooth belum tersedia: " + error.getMessage());
        } catch (Exception error) {
            call.reject("Dialog aktivasi Bluetooth tidak dapat dibuka: " + error.getMessage());
        }
    }

    @ActivityCallback
    private void onBluetoothEnableResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        try {
            boolean enabled = bluetoothAdapter != null && bluetoothAdapter.isEnabled();
            JSObject state = new JSObject();
            state.put("enabled", enabled);
            state.put("accepted", result != null && result.getResultCode() == Activity.RESULT_OK);
            call.resolve(state);
        } catch (SecurityException error) {
            call.reject("Tidak dapat memeriksa status Bluetooth: " + error.getMessage());
        }
    }

    @PluginMethod
    public void scanBleDevices(PluginCall call) {
        try {
            if (!ensureScanPermissions(call)) return;
            startBleScan(call);
        } catch (Exception error) {
            call.reject("Tidak dapat meminta izin BLE scan: " + error.getClass().getSimpleName() + ": " + error.getMessage());
        }
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
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!hasPermissionStateGranted("bluetoothScan") || !hasPermissionStateGranted("bluetoothConnect")) {
                    requestPermissionForAliases(new String[] { "bluetoothScan", "bluetoothConnect" }, call, "onScanPermissionResult");
                    return false;
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                !hasPermissionStateGranted("legacyBluetoothLocation")) {
                requestPermissionForAlias("legacyBluetoothLocation", call, "onScanPermissionResult");
                return false;
            }
            return true;
        } catch (Exception error) {
            call.reject("Permintaan izin Nearby devices gagal: " + error.getMessage());
            return false;
        }
    }

    private boolean scanPermissionsGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return hasPermissionStateGranted("bluetoothScan") && hasPermissionStateGranted("bluetoothConnect");
        }
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
            hasPermissionStateGranted("legacyBluetoothLocation");
    }

    private void startBleScan(PluginCall call) {
        try {
            if (bluetoothAdapter == null) {
                call.reject("Bluetooth adapter tidak tersedia pada perangkat ini.");
                return;
            }
            if (!bluetoothAdapter.isEnabled()) {
                call.reject("Bluetooth Android masih OFF. Tekan Enable Bluetooth atau buka Bluetooth Settings.");
                return;
            }
            if (midiManager == null) {
                call.reject("Android MIDI service tidak tersedia pada perangkat ini.");
                return;
            }
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                LocationManager location = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
                boolean locationEnabled = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? location != null && location.isLocationEnabled()
                    : location != null && (location.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                        location.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
                if (!locationEnabled) {
                    call.reject("Layanan Lokasi Android harus aktif untuk BLE scan pada Android versi ini. Aktifkan Location lalu pindai lagi.");
                    return;
                }
            }
            bleScanner = bluetoothAdapter.getBluetoothLeScanner();
            if (bleScanner == null) {
                call.reject("BLE scanner tidak tersedia. Pastikan perangkat mendukung Bluetooth Low Energy.");
                return;
            }

            stopBleScanInternal();
            discoveredDevices.clear();
            // A controller may already be paired in Android Settings and may not
            // advertise while idle. Include known M-VAVE/FootCtrlPlus bonded devices.
            publishBondedMidiControllers();
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
            call.reject("Izin Nearby devices/Bluetooth belum diberikan: " + error.getMessage());
        } catch (Exception error) {
            call.reject("Tidak dapat memulai BLE scan: " + error.getClass().getSimpleName() + ": " + error.getMessage());
        }
        } catch (SecurityException error) {
            call.reject("Akses Bluetooth ditolak Android: " + error.getMessage());
        } catch (Exception error) {
            call.reject("BLE scan gagal sebelum dimulai: " + error.getClass().getSimpleName() + ": " + error.getMessage());
        }
    }

    private void publishBondedMidiControllers() {
        if (bluetoothAdapter == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasPermissionStateGranted("bluetoothConnect")) return;
            Set<BluetoothDevice> bonded = bluetoothAdapter.getBondedDevices();
            if (bonded == null) return;
            for (BluetoothDevice device : bonded) {
                if (device == null) continue;
                String name = "";
                String address = "";
                try {
                    name = device.getName();
                    address = device.getAddress();
                } catch (SecurityException ignored) {
                    continue;
                }
                String normalized = name == null ? "" : name.toLowerCase(java.util.Locale.ROOT);
                boolean likelyController = normalized.contains("chocolate") ||
                    normalized.contains("footctrl") || normalized.contains("m-vave") ||
                    normalized.contains("mvave");
                if (!likelyController || address == null || address.isEmpty()) continue;
                discoveredDevices.put(address, device);
                JSObject event = new JSObject();
                event.put("address", address);
                event.put("name", name);
                event.put("rssi", 0);
                event.put("bonded", true);
                event.put("isChocolatePlus", normalized.contains("chocolate") ||
                    normalized.contains("footctrlplus"));
                event.put("source", "android-bonded-device");
                notifyListeners("bleMidiDeviceFound", event);
            }
        } catch (SecurityException error) {
            JSObject diagnostic = new JSObject();
            diagnostic.put("message", "Tidak dapat membaca perangkat Bluetooth yang sudah dipasangkan: " + error.getMessage());
            notifyListeners("bleMidiScanError", diagnostic);
        } catch (Exception error) {
            JSObject diagnostic = new JSObject();
            diagnostic.put("message", "Gagal membaca daftar Bluetooth paired: " + error.getMessage());
            notifyListeners("bleMidiScanError", diagnostic);
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
            if ((name == null || name.trim().isEmpty()) &&
                result.getScanRecord() != null) {
                name = result.getScanRecord().getDeviceName();
            }
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasPermissionStateGranted("bluetoothConnect")) {
            call.reject("Izin Nearby devices diperlukan untuk terhubung ke controller MIDI.");
            return;
        }
        openBleDevice(call, call.getString("address", "").trim());
    }

    private boolean ensureConnectPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasPermissionStateGranted("bluetoothConnect")) {
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
                    try {
                        device.close();
                    } catch (IOException closeError) {
                        error.addSuppressed(closeError);
                    }
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
