package com.vaivaii.mg30studio;

import android.content.Context;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiInputPort;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

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

    @Override
    public void load() {
        Object service = getContext().getSystemService(Context.MIDI_SERVICE);
        if (service instanceof MidiManager) midiManager = (MidiManager) service;
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
                        try {
                            for (int i = offset; i < offset + count; i++) values.put(message[i] & 0xFF);
                            JSObject payload = new JSObject();
                            payload.put("data", values);
                            payload.put("deviceName", activeDeviceName);
                            notifyListeners("midiData", payload);
                        } catch (JSONException ignored) {
                            // Invalid event is discarded; never let a JS bridge failure stop the MIDI receiver.
                        }
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
            port.send(bytes, 0, bytes.length, MidiReceiver.TIMESTAMP_IMMEDIATE);
            JSObject result = new JSObject();
            result.put("sent", true);
            result.put("bytes", bytes.length);
            call.resolve(result);
        } catch (JSONException | IOException error) {
            call.reject("Pengiriman MIDI gagal: " + error.getMessage());
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
        closeConnection();
        super.handleOnDestroy();
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
