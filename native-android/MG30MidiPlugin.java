package com.vaivaii.mg30studio;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiInputPort;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import androidx.activity.result.ActivityResult;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Locale;

@CapacitorPlugin(name = "MG30Midi")
public class MG30MidiPlugin extends Plugin {
    private MidiManager midiManager;
    private MidiDevice activeDevice;
    private MidiInputPort appToDevicePort;
    private MidiOutputPort deviceToAppPort;
    private MidiReceiver receiver;
    private int activeDeviceId = -1;
    private String activeDeviceName = "";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private MidiManager.DeviceCallback deviceCallback;

    @Override
    public void load() {
        Object service = getContext().getSystemService(Context.MIDI_SERVICE);
        if (!(service instanceof MidiManager)) return;
        midiManager = (MidiManager) service;
        deviceCallback = new MidiManager.DeviceCallback() {
            @Override
            public void onDeviceAdded(MidiDeviceInfo info) {
                notifyMidiDeviceChanged(info, true);
            }

            @Override
            public void onDeviceRemoved(MidiDeviceInfo info) {
                if (activeDeviceId == info.getId()) {
                    closeConnection();
                    JSObject state = new JSObject();
                    state.put("connected", false);
                    state.put("id", info.getId());
                    notifyListeners("midiConnectionChanged", state);
                }
                notifyMidiDeviceChanged(info, false);
            }
        };
        midiManager.registerDeviceCallback(deviceCallback, mainHandler);
    }

    @PluginMethod
    public void listDevices(PluginCall call) {
        if (midiManager == null) {
            call.reject("Android MIDI service tidak tersedia pada perangkat ini.");
            return;
        }
        JSArray list = new JSArray();
        for (MidiDeviceInfo info : midiManager.getDevices()) {
            JSObject item = new JSObject();
            item.put("id", info.getId());
            item.put("name", property(info, MidiDeviceInfo.PROPERTY_NAME));
            item.put("manufacturer", property(info, MidiDeviceInfo.PROPERTY_MANUFACTURER));
            item.put("product", property(info, MidiDeviceInfo.PROPERTY_PRODUCT));
            item.put("inputPortCount", info.getInputPortCount());
            item.put("outputPortCount", info.getOutputPortCount());
            list.put(item);
        }
        JSObject result = new JSObject();
        result.put("devices", list);
        result.put("count", list.length());
        call.resolve(result);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (midiManager == null) {
            call.reject("Android MIDI service tidak tersedia.");
            return;
        }
        Integer requestedId = call.getInt("deviceId");
        MidiDeviceInfo selected = null;
        MidiDeviceInfo[] devices = midiManager.getDevices();
        if (requestedId != null) {
            for (MidiDeviceInfo info : devices) {
                if (info.getId() == requestedId) selected = info;
            }
        } else {
            for (MidiDeviceInfo info : devices) {
                String name = (property(info, MidiDeviceInfo.PROPERTY_NAME) + " " +
                    property(info, MidiDeviceInfo.PROPERTY_PRODUCT) + " " +
                    property(info, MidiDeviceInfo.PROPERTY_MANUFACTURER)).toLowerCase(Locale.ROOT);
                if ((name.contains("mg-30") || name.contains("mg30") || name.contains("nux")) &&
                    info.getInputPortCount() > 0 && info.getOutputPortCount() > 0) {
                    selected = info;
                    break;
                }
            }
            if (selected == null && devices.length == 1 &&
                devices[0].getInputPortCount() > 0 && devices[0].getOutputPortCount() > 0) {
                selected = devices[0];
            }
        }
        if (selected == null) {
            call.reject("Port USB-MIDI MG-30 tidak ditemukan. Pastikan kabel OTG tersambung, lalu periksa daftar perangkat MIDI.");
            return;
        }
        if (selected.getInputPortCount() < 1 || selected.getOutputPortCount() < 1) {
            call.reject("Perangkat MIDI terdeteksi, tetapi tidak memiliki port masuk/keluar yang dibutuhkan.");
            return;
        }
        final MidiDeviceInfo chosen = selected;
        closeConnection();
        midiManager.openDevice(chosen, device -> {
            if (device == null) {
                call.reject("Android gagal membuka perangkat MIDI. Cabut-pasang kabel USB OTG lalu coba lagi.");
                return;
            }
            try {
                MidiInputPort input = device.openInputPort(0); // App -> MG-30
                MidiOutputPort output = device.openOutputPort(0); // MG-30 -> App
                if (input == null || output == null) {
                    if (input != null) input.close();
                    if (output != null) output.close();
                    device.close();
                    call.reject("Port MIDI tidak dapat dibuka.");
                    return;
                }
                activeDevice = device;
                appToDevicePort = input;
                deviceToAppPort = output;
                activeDeviceId = chosen.getId();
                activeDeviceName = property(chosen, MidiDeviceInfo.PROPERTY_NAME);
                if (activeDeviceName.isEmpty()) activeDeviceName = property(chosen, MidiDeviceInfo.PROPERTY_PRODUCT);
                if (activeDeviceName.isEmpty()) activeDeviceName = "NUX MG-30";
                receiver = new MidiReceiver() {
                    @Override
                    public void onSend(byte[] message, int offset, int count, long timestamp) {
                        JSArray values = new JSArray();
                        for (int i = offset; i < offset + count; i++) values.put(message[i] & 0xFF);
                        JSObject payload = new JSObject();
                        payload.put("data", values);
                        payload.put("deviceName", activeDeviceName);
                        notifyListeners("midiData", payload);
                    }
                };
                output.connect(receiver);
                JSObject result = new JSObject();
                result.put("connected", true);
                result.put("id", activeDeviceId);
                result.put("name", activeDeviceName);
                result.put("inputPort", 0);
                result.put("outputPort", 0);
                call.resolve(result);
                notifyListeners("midiConnectionChanged", result);
            } catch (Exception error) {
                closeConnection();
                call.reject("Gagal membuka port MIDI: " + error.getMessage());
            }
        }, mainHandler);
    }

    @PluginMethod
    public void send(PluginCall call) {
        MidiInputPort port = appToDevicePort;
        if (port == null) {
            call.reject("MIDI belum terhubung ke MG-30.");
            return;
        }
        JSArray source = call.getArray("data");
        if (source == null || source.length() == 0 || source.length() > 4096) {
            call.reject("Data MIDI kosong atau melebihi batas aman 4096 byte per pesan.");
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
            call.reject("Pengiriman MIDI gagal: " + error.getMessage());
        }
    }

    @PluginMethod
    public void savePatch(PluginCall call) {
        String requestedName = call.getString("fileName", "MG30_Preset.mg30patch");
        String safeName = new File(requestedName).getName().replaceAll("[^A-Za-z0-9._ -]", "_");
        if (safeName.isEmpty()) safeName = "MG30_Preset.mg30patch";
        if (!safeName.toLowerCase(Locale.ROOT).endsWith(".mg30patch")) safeName += ".mg30patch";

        String base64 = call.getString("base64", "");
        if (base64.isEmpty() || base64.length() > 1024 * 1024) {
            call.reject("Data preset kosong atau melebihi batas aman untuk penyimpanan.");
            return;
        }
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            if (bytes.length != 0x26AE) {
                call.reject("Ukuran file .mg30patch tidak sesuai format Gen2 single-preset.");
                return;
            }

            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/octet-stream");
            intent.putExtra(Intent.EXTRA_TITLE, safeName);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(call, intent, "savePatchResult");
        } catch (IllegalArgumentException error) {
            call.reject("Data file preset tidak valid: " + error.getMessage());
        }
    }

    @ActivityCallback
    private void savePatchResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != Activity.RESULT_OK ||
            result.getData() == null || result.getData().getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("saved", false);
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        Uri uri = result.getData().getData();
        String requestedName = call.getString("fileName", "MG30_Preset.mg30patch");
        String safeName = new File(requestedName).getName().replaceAll("[^A-Za-z0-9._ -]", "_");
        if (safeName.isEmpty()) safeName = "MG30_Preset.mg30patch";
        if (!safeName.toLowerCase(Locale.ROOT).endsWith(".mg30patch")) safeName += ".mg30patch";

        String base64 = call.getString("base64", "");
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            if (bytes.length != 0x26AE) {
                call.reject("Ukuran file .mg30patch tidak sesuai format Gen2 single-preset.");
                return;
            }
            try (java.io.OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
                if (output == null) throw new IOException("Android tidak dapat membuka lokasi file yang dipilih.");
                output.write(bytes);
                output.flush();
            }

            String displayName = safeName;
            try (android.database.Cursor cursor = getContext().getContentResolver().query(
                uri, new String[]{android.provider.OpenableColumns.DISPLAY_NAME}, null, null, null
            )) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameColumn = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                    if (nameColumn >= 0) displayName = cursor.getString(nameColumn);
                }
            } catch (Exception ignored) {}

            JSObject saved = new JSObject();
            saved.put("saved", true);
            saved.put("fileName", displayName);
            saved.put("bytes", bytes.length);
            saved.put("uri", uri.toString());
            saved.put("storage", "android-system-file-picker");
            call.resolve(saved);
        } catch (IllegalArgumentException | IOException error) {
            call.reject("Gagal menyimpan file melalui File manager Android: " + error.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        closeConnection();
        JSObject result = new JSObject();
        result.put("connected", false);
        call.resolve(result);
        notifyListeners("midiConnectionChanged", result);
    }

    @PluginMethod
    public void saveModel(PluginCall call) {
        String fileName = call.getString("fileName", "tone-model.nam");
        String base64 = call.getString("base64", "");
        if (base64.isEmpty() || base64.length() > 8 * 1024 * 1024) {
            call.reject("Data model kosong atau terlalu besar.");
            return;
        }
        String safeName = new File(fileName).getName().replaceAll("[^A-Za-z0-9._ -]", "_");
        if (safeName.isEmpty()) safeName = "tone-model.nam";
        try {
            byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            File directory = new File(getContext().getFilesDir(), "nam-models");
            if (!directory.exists() && !directory.mkdirs()) {
                call.reject("Folder penyimpanan model tidak dapat dibuat.");
                return;
            }
            File target = new File(directory, safeName);
            try (FileOutputStream output = new FileOutputStream(target)) {
                output.write(bytes);
                output.getFD().sync();
            }
            JSObject result = new JSObject();
            result.put("fileName", safeName);
            result.put("bytes", bytes.length);
            result.put("path", target.getAbsolutePath());
            result.put("note", "File disimpan di penyimpanan internal aplikasi untuk alur impor lanjutan.");
            call.resolve(result);
        } catch (IllegalArgumentException | IOException error) {
            call.reject("Gagal menyimpan file model: " + error.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (midiManager != null && deviceCallback != null) {
            try { midiManager.unregisterDeviceCallback(deviceCallback); } catch (Exception ignored) {}
            deviceCallback = null;
        }
        closeConnection();
        super.handleOnDestroy();
    }

    private void notifyMidiDeviceChanged(MidiDeviceInfo info, boolean attached) {
        JSObject event = new JSObject();
        event.put("id", info.getId());
        event.put("name", property(info, MidiDeviceInfo.PROPERTY_NAME));
        event.put("manufacturer", property(info, MidiDeviceInfo.PROPERTY_MANUFACTURER));
        event.put("product", property(info, MidiDeviceInfo.PROPERTY_PRODUCT));
        event.put("inputPortCount", info.getInputPortCount());
        event.put("outputPortCount", info.getOutputPortCount());
        event.put("attached", attached);
        notifyListeners("midiDeviceChanged", event);
    }

    private String property(MidiDeviceInfo info, String key) {
        String value = info.getProperties().getString(key);
        return value == null ? "" : value;
    }

    private synchronized void closeConnection() {
        try {
            if (deviceToAppPort != null && receiver != null) deviceToAppPort.disconnect(receiver);
        } catch (Exception ignored) {}
        try { if (appToDevicePort != null) appToDevicePort.close(); } catch (Exception ignored) {}
        try { if (deviceToAppPort != null) deviceToAppPort.close(); } catch (Exception ignored) {}
        try { if (activeDevice != null) activeDevice.close(); } catch (Exception ignored) {}
        appToDevicePort = null;
        deviceToAppPort = null;
        receiver = null;
        activeDevice = null;
        activeDeviceId = -1;
        activeDeviceName = "";
    }
}
