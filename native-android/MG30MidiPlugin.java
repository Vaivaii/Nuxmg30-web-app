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
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.zip.CRC32;

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
    // Stage patch exports on disk while Android's document picker is open.
    private final Map<String, File> pendingPatchFiles = new ConcurrentHashMap<>();
    private static final int PATCH_EXPORT_CHUNK_LIMIT = 64 * 1024;

    private static final class PatchTransfer {
        final File file;
        final int expectedBytes;
        int receivedBytes;

        PatchTransfer(File file, int expectedBytes) {
            this.file = file;
            this.expectedBytes = expectedBytes;
            this.receivedBytes = 0;
        }
    }

    private final Map<String, PatchTransfer> pendingPatchTransfers = new ConcurrentHashMap<>();

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

    private static boolean isSupportedPatchSize(int length) {
        return length == 0x26AE || length == 0x135700;
    }
    private static String safePatchName(String requestedName) {
        String safeName = new File(requestedName == null ? "MG30_Preset.mg30patch" : requestedName)
            .getName().replaceAll("[^A-Za-z0-9._ -]", "_");
        if (safeName.isEmpty()) safeName = "MG30_Preset.mg30patch";
        if (!safeName.toLowerCase(Locale.ROOT).endsWith(".mg30patch")) safeName += ".mg30patch";
        return safeName;
    }

    private File patchExportDirectory() throws IOException {
        File directory = new File(getContext().getFilesDir(), "mg30-patch-export");
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IOException("Folder staging export tidak dapat dibuat.");
        }
        return directory;
    }

    /**
     * Start a bounded native transfer. Large All-Preset Base64 data is sent in
     * small sequential chunks instead of one multi-megabyte Capacitor message.
     */
    @PluginMethod
    public void beginPatchExport(PluginCall call) {
        Integer expectedValue = call.getInt("expectedBytes");
        int expectedBytes = expectedValue == null ? 0 : expectedValue;
        if (!isSupportedPatchSize(expectedBytes)) {
            call.reject("Ukuran patch transfer tidak didukung: " + expectedBytes + " byte.");
            return;
        }
        try {
            File staged = new File(patchExportDirectory(), "transfer-" + UUID.randomUUID() + ".tmp");
            try (FileOutputStream output = new FileOutputStream(staged, false)) {
                output.flush();
                output.getFD().sync();
            }
            String transferId = UUID.randomUUID().toString();
            pendingPatchTransfers.put(transferId, new PatchTransfer(staged, expectedBytes));
            JSObject result = new JSObject();
            result.put("transferId", transferId);
            result.put("expectedBytes", expectedBytes);
            result.put("maxChunkBytes", PATCH_EXPORT_CHUNK_LIMIT);
            call.resolve(result);
        } catch (IOException | RuntimeException error) {
            call.reject("Gagal memulai transfer file patch: " + error.getMessage());
        }
    }

    @PluginMethod
    public void writePatchExportChunk(PluginCall call) {
        String transferId = call.getString("transferId", "");
        Integer offsetValue = call.getInt("offset");
        String base64 = call.getString("base64", "");
        PatchTransfer transfer = pendingPatchTransfers.get(transferId);
        if (transfer == null) {
            call.reject("Sesi transfer patch tidak ditemukan atau sudah berakhir.");
            return;
        }
        if (offsetValue == null || base64.isEmpty() || base64.length() > 96 * 1024) {
            call.reject("Chunk patch kosong atau melebihi batas aman.");
            return;
        }
        try {
            byte[] chunk = Base64.decode(base64, Base64.DEFAULT);
            synchronized (transfer) {
                if (offsetValue != transfer.receivedBytes) {
                    call.reject("Offset chunk tidak berurutan: diterima " + offsetValue +
                        ", diharapkan " + transfer.receivedBytes + ".");
                    return;
                }
                if (chunk.length == 0 || chunk.length > PATCH_EXPORT_CHUNK_LIMIT ||
                    transfer.receivedBytes + chunk.length > transfer.expectedBytes) {
                    call.reject("Ukuran chunk patch di luar batas transfer.");
                    return;
                }
                try (FileOutputStream output = new FileOutputStream(transfer.file, true)) {
                    output.write(chunk);
                    output.flush();
                }
                transfer.receivedBytes += chunk.length;
                JSObject result = new JSObject();
                result.put("receivedBytes", transfer.receivedBytes);
                result.put("expectedBytes", transfer.expectedBytes);
                call.resolve(result);
            }
        } catch (IOException | IllegalArgumentException error) {
            call.reject("Gagal menulis chunk patch pada offset " + offsetValue + ": " + error.getMessage());
        }
    }

    @PluginMethod
    public void abortPatchExport(PluginCall call) {
        String transferId = call.getString("transferId", "");
        PatchTransfer transfer = pendingPatchTransfers.remove(transferId);
        if (transfer != null && transfer.file.exists()) transfer.file.delete();
        JSObject result = new JSObject();
        result.put("aborted", true);
        call.resolve(result);
    }

    @PluginMethod
    public void finishPatchExport(PluginCall call) {
        String transferId = call.getString("transferId", "");
        String safeName = safePatchName(call.getString("fileName", "MG30_Preset.mg30patch"));
        PatchTransfer transfer = pendingPatchTransfers.get(transferId);
        if (transfer == null) {
            call.reject("Sesi transfer patch tidak ditemukan saat finalisasi.");
            return;
        }
        File finalStage = null;
        String callbackId = call.getCallbackId();
        try {
            synchronized (transfer) {
                if (transfer.receivedBytes != transfer.expectedBytes ||
                    !transfer.file.isFile() || transfer.file.length() != transfer.expectedBytes) {
                    throw new IOException("Staging menerima " + transfer.receivedBytes + " dari " +
                        transfer.expectedBytes + " byte; file fisik " + transfer.file.length() + " byte.");
                }
                try (FileOutputStream sync = new FileOutputStream(transfer.file, true)) {
                    sync.getFD().sync();
                }
            }
            if (callbackId == null || callbackId.isEmpty()) {
                throw new IOException("ID callback penyimpanan Android tidak tersedia.");
            }
            String safeCallbackId = callbackId.replaceAll("[^A-Za-z0-9_-]", "_");
            finalStage = new File(patchExportDirectory(), safeCallbackId + ".mg30patch.tmp");
            if (finalStage.exists() && !finalStage.delete()) {
                throw new IOException("Staging callback sebelumnya tidak dapat dibersihkan.");
            }
            if (!transfer.file.renameTo(finalStage)) {
                try (InputStream input = new FileInputStream(transfer.file);
                     FileOutputStream output = new FileOutputStream(finalStage, false)) {
                    long copied = copyAndCount(input, output, null);
                    output.flush();
                    output.getFD().sync();
                    if (copied != transfer.expectedBytes) {
                        throw new IOException("Pemindahan staging berhenti pada " + copied + " byte.");
                    }
                }
                if (!transfer.file.delete()) transfer.file.deleteOnExit();
            }
            pendingPatchFiles.put(callbackId, finalStage);
            pendingPatchTransfers.remove(transferId);

            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/octet-stream");
            intent.putExtra(Intent.EXTRA_TITLE, safeName);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(call, intent, "savePatchResult");
        } catch (IOException | RuntimeException error) {
            pendingPatchTransfers.remove(transferId);
            if (transfer.file.exists()) transfer.file.delete();
            if (finalStage != null && finalStage.exists()) finalStage.delete();
            if (callbackId != null) pendingPatchFiles.remove(callbackId);
            call.reject("Gagal menyiapkan file patch untuk File manager: " + error.getMessage());
        }
    }



    private static long crc32(File file) throws IOException {
        CRC32 crc = new CRC32();
        byte[] buffer = new byte[64 * 1024];
        try (InputStream input = new FileInputStream(file)) {
            int count;
            while ((count = input.read(buffer)) != -1) {
                crc.update(buffer, 0, count);
            }
        }
        return crc.getValue();
    }

    private static long copyAndCount(InputStream input, OutputStream output, CRC32 crc) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        long total = 0;
        int count;
        while ((count = input.read(buffer)) != -1) {
            if (count == 0) continue;
            output.write(buffer, 0, count);
            if (crc != null) crc.update(buffer, 0, count);
            total += count;
        }
        return total;
    }

    @PluginMethod
    public void savePatch(PluginCall call) {
        String safeName = safePatchName(call.getString("fileName", "MG30_Preset.mg30patch"));

        String base64 = call.getString("base64", "");
        if (base64.isEmpty() || base64.length() > 2 * 1024 * 1024) {
            call.reject("Data preset kosong atau melebihi batas aman penyimpanan (2 MB Base64).");
            return;
        }
        File staged = null;
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            if (!isSupportedPatchSize(bytes.length)) {
                call.reject("Ukuran file .mg30patch tidak cocok: hanya single-preset 0x26AE atau All Preset 0x135700 yang didukung.");
                return;
            }

            // Do not keep a ~1.7 MB Base64 PluginCall payload as the only source
            // while ACTION_CREATE_DOCUMENT is in the foreground. Stage it first.
            // Use persistent app-private files, not cache: Android may reclaim
            // cache while ACTION_CREATE_DOCUMENT is foregrounded. Derive the
            // exact staging path from the saved PluginCall callback ID so it
            // survives plugin/activity recreation.
            String callbackId = call.getCallbackId();
            if (callbackId == null || callbackId.isEmpty()) {
                throw new IOException("ID callback penyimpanan Android tidak tersedia.");
            }
            File stagingDirectory = new File(getContext().getFilesDir(), "mg30-patch-export");
            if (!stagingDirectory.exists() && !stagingDirectory.mkdirs()) {
                throw new IOException("Folder staging export tidak dapat dibuat.");
            }
            String safeCallbackId = callbackId.replaceAll("[^A-Za-z0-9_-]", "_");
            staged = new File(stagingDirectory, safeCallbackId + ".mg30patch.tmp");
            try (FileOutputStream output = new FileOutputStream(staged)) {
                output.write(bytes);
                output.flush();
                output.getFD().sync();
            }
            if (staged.length() != bytes.length) {
                throw new IOException("Staging hanya menulis " + staged.length() + " dari " + bytes.length + " byte.");
            }

            pendingPatchFiles.put(callbackId, staged);

            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/octet-stream");
            intent.putExtra(Intent.EXTRA_TITLE, safeName);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(call, intent, "savePatchResult");
        } catch (IOException | RuntimeException error) {
            if (staged != null) staged.delete();
            pendingPatchFiles.remove(call.getCallbackId());
            call.reject("Gagal menyiapkan file export melalui File manager Android: " + error.getMessage());
        }
    }

    @ActivityCallback
    private void savePatchResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        String requestedName = call.getString("fileName", "MG30_Preset.mg30patch");
        String safeName = new File(requestedName).getName().replaceAll("[^A-Za-z0-9._ -]", "_");
        if (safeName.isEmpty()) safeName = "MG30_Preset.mg30patch";
        if (!safeName.toLowerCase(Locale.ROOT).endsWith(".mg30patch")) safeName += ".mg30patch";
        String callbackId = call.getCallbackId();
        File staged = callbackId == null ? null : pendingPatchFiles.remove(callbackId);
        if (staged == null && callbackId != null) {
            String safeCallbackId = callbackId.replaceAll("[^A-Za-z0-9_-]", "_");
            staged = new File(new File(getContext().getFilesDir(), "mg30-patch-export"),
                safeCallbackId + ".mg30patch.tmp");
        }
        try {
            if (result == null || result.getResultCode() != Activity.RESULT_OK ||
                result.getData() == null || result.getData().getData() == null) {
                JSObject cancelled = new JSObject();
                cancelled.put("saved", false);
                cancelled.put("cancelled", true);
                call.resolve(cancelled);
                return;
            }
            if (staged == null || !staged.isFile()) {
                throw new IOException("Payload staging export hilang setelah File manager ditutup.");
            }

            Uri uri = result.getData().getData();
            long expectedBytes = staged.length();
            if (!isSupportedPatchSize((int) expectedBytes)) {
                throw new IOException("Ukuran staging bukan format MG-30 yang didukung: " + expectedBytes + " byte.");
            }
            long expectedCrc = crc32(staged);

            try (InputStream input = new FileInputStream(staged);
                 OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
                if (output == null) throw new IOException("Android tidak dapat membuka lokasi file yang dipilih.");
                long written = copyAndCount(input, output, null);
                output.flush();
                if (written != expectedBytes) {
                    throw new IOException("Penyalinan berhenti pada " + written + " dari " + expectedBytes + " byte.");
                }
            }

            // Re-open the destination: never report success based only on the
            // length of the in-memory buffer or on OutputStream.write returning.
            CRC32 destinationCrc = new CRC32();
            long verifiedBytes;
            try (InputStream verify = getContext().getContentResolver().openInputStream(uri)) {
                if (verify == null) throw new IOException("File tujuan tidak dapat dibaca ulang untuk verifikasi.");
                verifiedBytes = copyAndCount(verify, new java.io.OutputStream() {
                    @Override public void write(int value) { destinationCrc.update(value); }
                    @Override public void write(byte[] buffer, int offset, int length) {
                        destinationCrc.update(buffer, offset, length);
                    }
                }, null);
            }
            if (verifiedBytes != expectedBytes || destinationCrc.getValue() != expectedCrc) {
                throw new IOException("Verifikasi file tujuan gagal: terbaca " + verifiedBytes +
                    " byte, seharusnya " + expectedBytes + " byte; CRC32 " +
                    Long.toHexString(destinationCrc.getValue()) + " tidak cocok dengan staging.");
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
            saved.put("bytes", verifiedBytes);
            saved.put("crc32", Long.toHexString(destinationCrc.getValue()));
            saved.put("uri", uri.toString());
            saved.put("storage", "android-system-file-picker-verified");
            call.resolve(saved);
        } catch (IOException | IllegalArgumentException error) {
            // ACTION_CREATE_DOCUMENT creates the destination before this
            // callback writes it. Remove that empty/partial document on failure.
            if (result != null && result.getData() != null && result.getData().getData() != null) {
                try {
                    android.provider.DocumentsContract.deleteDocument(
                        getContext().getContentResolver(), result.getData().getData()
                    );
                } catch (Exception ignored) {}
            }
            call.reject("Gagal menyimpan/verifikasi file melalui File manager Android: " + error.getMessage());
        } finally {
            if (staged != null && staged.exists()) staged.delete();
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
