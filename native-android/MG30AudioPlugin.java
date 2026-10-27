package com.vaivaii.mg30studio;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Environment;
import android.os.SystemClock;

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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(
    name = "MG30Audio",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class MG30AudioPlugin extends Plugin {
    private AudioRecord audioRecord;
    private Thread captureThread;
    private volatile boolean recording = false;
    private volatile long pcmBytesWritten = 0;
    private File activeFile;
    private int activeSampleRate = 48000;
    private int activeChannels = 2;
    private int activeBits = 24;
    private int activeEncoding = AudioFormat.ENCODING_PCM_32BIT;
    private int activeWavFormatCode = 1;
    private boolean activeFloatCapture = false;
    private String activeInputEncodingName = "PCM 32-bit integer (24-bit left-justified in 32-bit container)";
    private String activeRouteName = "USB audio";
    private String captureError = "";

    @PluginMethod
    public void inspectDevices(PluginCall call) {
        AudioManager manager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        JSArray devices = new JSArray();
        boolean usbFound = false;
        if (manager != null) {
            for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_INPUTS)) {
                boolean isUsb = isUsbInput(device);
                usbFound = usbFound || isUsb;
                JSObject item = new JSObject();
                item.put("id", device.getId());
                item.put("name", device.getProductName() == null ? "Audio input " + device.getId() : device.getProductName().toString());
                item.put("type", device.getType());
                item.put("typeName", typeName(device.getType()));
                item.put("isUsb", isUsb);
                item.put("sampleRates", toJsArray(device.getSampleRates()));
                item.put("channelCounts", toJsArray(device.getChannelCounts()));
                JSArray encodings = new JSArray();
                if (Build.VERSION.SDK_INT >= 31) {
                    for (int encoding : device.getEncodings()) encodings.put(encoding);
                }
                item.put("encodings", encodings);
                item.put("supports24BitPacked", Build.VERSION.SDK_INT >= 31 && contains(device.getEncodings(), AudioFormat.ENCODING_PCM_24BIT_PACKED));
                devices.put(item);
            }
        }
        JSObject result = new JSObject();
        result.put("native", true);
        result.put("androidApi", Build.VERSION.SDK_INT);
        result.put("usbInputFound", usbFound);
        result.put("devices", devices);
        result.put("note", "Device capability metadata is advisory. A recording test is needed to confirm actual routing.");
        call.resolve(result);
    }

    @PluginMethod
    public void listTakes(PluginCall call) {
        File directory = getMusicDirectory();
        File[] files = directory == null ? null : directory.listFiles((dir, name) -> name.toLowerCase(Locale.ROOT).endsWith(".wav"));
        JSArray listed = new JSArray();
        if (files != null) {
            Arrays.sort(files, (left, right) -> Long.compare(right.lastModified(), left.lastModified()));
            for (File file : files) {
                if (!file.isFile()) continue;
                try {
                    listed.put(takeDetails(file));
                } catch (IOException ignored) {
                    // Skip an incomplete file rather than hiding the remaining takes.
                }
            }
        }
        JSObject result = new JSObject();
        result.put("takes", listed);
        result.put("count", listed.length());
        call.resolve(result);
    }

    @PluginMethod
    public void renameTake(PluginCall call) {
        File file = resolveTakeFile(call.getString("path"));
        if (file == null || !file.exists() || !file.isFile()) {
            call.reject("File rekaman tidak ditemukan di penyimpanan aplikasi.");
            return;
        }
        String newName = call.getString("newName", "").trim();
        StringBuilder cleanName = new StringBuilder();
        for (int i = 0; i < newName.length(); i++) {
            char ch = newName.charAt(i);
            if (ch == '/' || ch == '\\' || ch == ':' || ch == '*' || ch == '?' ||
                ch == '"' || ch == '<' || ch == '>' || ch == '|' || Character.isISOControl(ch)) {
                cleanName.append('_');
            } else {
                cleanName.append(ch);
            }
        }
        newName = cleanName.toString().replaceAll("\\s+", " ").replaceAll("(?i)\\.wav$", "").trim();
        while (newName.startsWith(".")) newName = newName.substring(1);
        if (newName.isEmpty()) {
            call.reject("Nama rekaman tidak boleh kosong.");
            return;
        }
        if (newName.length() > 90) newName = newName.substring(0, 90).trim();
        File renamed = new File(file.getParentFile(), newName + ".wav");
        if (renamed.exists() && !renamed.equals(file)) {
            call.reject("Nama file itu sudah digunakan. Pilih nama lain.");
            return;
        }
        if (!file.equals(renamed) && !file.renameTo(renamed)) {
            call.reject("Android tidak bisa mengganti nama file ini.");
            return;
        }
        try {
            call.resolve(takeDetails(renamed));
        } catch (IOException e) {
            call.reject("Nama berubah, tetapi metadata rekaman gagal dibaca: " + e.getMessage());
        }
    }

    @PluginMethod
    public void exportTake(PluginCall call) {
        File file = resolveTakeFile(call.getString("path"));
        if (file == null || !file.exists() || !file.isFile()) {
            call.reject("File rekaman tidak ditemukan untuk diekspor.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("audio/wav");
        intent.putExtra(Intent.EXTRA_TITLE, file.getName());
        startActivityForResult(call, intent, "handleExportTakeResult");
    }

    @ActivityCallback
    private void handleExportTakeResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Ekspor dibatalkan.");
            return;
        }
        Uri destination = result.getData().getData();
        File source = resolveTakeFile(call.getString("path"));
        if (source == null || !source.exists()) {
            call.reject("File rekaman tidak ditemukan lagi.");
            return;
        }
        try (InputStream input = new FileInputStream(source);
             OutputStream output = getContext().getContentResolver().openOutputStream(destination, "w")) {
            if (output == null) throw new IOException("Lokasi tujuan tidak dapat ditulis.");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            output.flush();
            JSObject response = new JSObject();
            response.put("success", true);
            response.put("fileName", source.getName());
            response.put("destinationUri", destination.toString());
            call.resolve(response);
        } catch (IOException e) {
            call.reject("Ekspor rekaman gagal: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
        if (recording) {
            call.reject("Rekaman sedang berjalan.");
            return;
        }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
            return;
        }
        startRecordingWithPermission(call);
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Izin rekam audio ditolak. Aktifkan izin mikrofon untuk merekam input USB.");
            return;
        }
        startRecordingWithPermission(call);
    }

    private void startRecordingWithPermission(PluginCall call) {
        AudioManager manager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (manager == null) {
            call.reject("AudioManager Android tidak tersedia.");
            return;
        }

        AudioDeviceInfo usb = null;
        for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_INPUTS)) {
            if (isUsbInput(device) && device.getProductName() != null &&
                (device.getProductName().toString().toLowerCase(Locale.ROOT).contains("mg-30") ||
                 device.getProductName().toString().toLowerCase(Locale.ROOT).contains("nux"))) {
                usb = device;
                break;
            }
        }
        if (usb == null) {
            for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_INPUTS)) {
                if (isUsbInput(device)) { usb = device; break; }
            }
        }
        if (usb == null) {
            call.reject("Input USB Audio belum terdeteksi. Pastikan MG-30 terhubung dengan kabel data dan OTG.");
            return;
        }

        int[] deviceRates = usb.getSampleRates();
        ArrayList<Integer> rates = new ArrayList<>();
        addRate(rates, 48000, deviceRates);
        if (deviceRates.length > 0) {
            for (int rate : deviceRates) addRate(rates, rate, deviceRates);
        } else {
            addRate(rates, 44100, deviceRates);
        }
        if (rates.isEmpty()) rates.add(48000);

        int[] countOptions = usb.getChannelCounts();
        ArrayList<Integer> channelOptions = new ArrayList<>();
        if (countOptions.length == 0 || contains(countOptions, 2)) channelOptions.add(2);
        if (countOptions.length == 0 || contains(countOptions, 1)) channelOptions.add(1);
        if (channelOptions.isEmpty()) {
            channelOptions.add(2);
            channelOptions.add(1);
        }

        int[] advertised = Build.VERSION.SDK_INT >= 31 ? usb.getEncodings() : new int[0];
        ArrayList<Integer> encodings = new ArrayList<>();
        // USB UAC devices carry integer PCM. Android exposes 24 useful bits left-justified
        // in a 32-bit sample for this path; request that before float/16-bit fallbacks.
        if (Build.VERSION.SDK_INT >= 31 &&
            (advertised.length == 0 || contains(advertised, AudioFormat.ENCODING_PCM_32BIT))) {
            encodings.add(AudioFormat.ENCODING_PCM_32BIT);
        }
        if (Build.VERSION.SDK_INT >= 31 &&
            (advertised.length == 0 || contains(advertised, AudioFormat.ENCODING_PCM_FLOAT))) {
            encodings.add(AudioFormat.ENCODING_PCM_FLOAT);
        }
        if (advertised.length == 0 || contains(advertised, AudioFormat.ENCODING_PCM_16BIT)) {
            encodings.add(AudioFormat.ENCODING_PCM_16BIT);
        }
        if (encodings.isEmpty()) encodings.add(AudioFormat.ENCODING_PCM_16BIT);

        int[] sources = Build.VERSION.SDK_INT >= 24
            ? new int[] { MediaRecorder.AudioSource.DEFAULT, MediaRecorder.AudioSource.MIC, MediaRecorder.AudioSource.UNPROCESSED }
            : new int[] { MediaRecorder.AudioSource.DEFAULT, MediaRecorder.AudioSource.MIC };

        AudioRecord selectedRecord = null;
        int selectedRate = 48000;
        int selectedChannels = 2;
        int selectedEncoding = AudioFormat.ENCODING_PCM_16BIT;
        int selectedBuffer = 0;
        AudioDeviceInfo selectedRoute = null;
        String selectedSourceName = "Default";

        for (int source : sources) {
            boolean foundForSource = false;
            for (int encoding : encodings) {
                if (encoding == AudioFormat.ENCODING_PCM_32BIT && Build.VERSION.SDK_INT < 31) continue;
                for (int channels : channelOptions) {
                    int channelMask = channels == 2 ? AudioFormat.CHANNEL_IN_STEREO : AudioFormat.CHANNEL_IN_MONO;
                    for (int rate : rates) {
                        int min = AudioRecord.getMinBufferSize(rate, channelMask, encoding);
                        if (min <= 0) continue;
                        int bytesPerCaptureSample = encoding == AudioFormat.ENCODING_PCM_16BIT ? 2 : 4;
                        int bufferSize = Math.max(min * 2, rate * channels * bytesPerCaptureSample / 4);
                        AudioRecord candidate = null;
                        try {
                            AudioFormat format = new AudioFormat.Builder()
                                .setSampleRate(rate)
                                .setChannelMask(channelMask)
                                .setEncoding(encoding)
                                .build();
                            candidate = new AudioRecord.Builder()
                                .setAudioSource(source)
                                .setAudioFormat(format)
                                .setBufferSizeInBytes(bufferSize)
                                .build();
                            if (candidate.getState() != AudioRecord.STATE_INITIALIZED) {
                                candidate.release();
                                continue;
                            }

                            boolean preferred = candidate.setPreferredDevice(usb);
                            if (!preferred) {
                                candidate.release();
                                continue;
                            }

                            candidate.startRecording();
                            AudioDeviceInfo routed = null;
                            long routeDeadline = SystemClock.elapsedRealtime() + 850;
                            while (SystemClock.elapsedRealtime() < routeDeadline) {
                                routed = Build.VERSION.SDK_INT >= 24 ? candidate.getRoutedDevice() : null;
                                if (routed != null && isUsbInput(routed)) break;
                                SystemClock.sleep(50);
                            }
                            if (routed != null && isUsbInput(routed)) {
                                selectedRecord = candidate;
                                selectedRoute = routed;
                                selectedRate = rate;
                                selectedChannels = channels;
                                selectedEncoding = encoding;
                                selectedBuffer = bufferSize;
                                selectedSourceName = sourceName(source);
                                foundForSource = true;
                                break;
                            }
                            try { candidate.stop(); } catch (Exception ignored) {}
                            candidate.release();
                        } catch (IllegalArgumentException | SecurityException | IllegalStateException ignored) {
                            if (candidate != null) {
                                try { candidate.stop(); } catch (Exception ignoredStop) {}
                                try { candidate.release(); } catch (Exception ignoredRelease) {}
                            }
                        }
                    }
                    if (foundForSource) break;
                }
                if (foundForSource) break;
            }
            if (foundForSource) break;
        }

        if (selectedRecord == null || selectedRoute == null) {
            call.reject("Android mendeteksi USB-Audio - NUX MG-30, tetapi AudioRecord tidak bisa mempertahankan routing input ke MG-30 pada format yang dilaporkan. Mikrofon HP tidak direkam. Perangkat ini mungkin memerlukan driver USB Audio Class langsung agar stream 24-bit/48 kHz dapat diakses.");
            return;
        }

        try {
            File dir = getMusicDirectory();
            if (!dir.exists() && !dir.mkdirs()) {
                try { selectedRecord.stop(); } catch (Exception ignored) {}
                selectedRecord.release();
                call.reject("Folder untuk menyimpan rekaman tidak dapat dibuat.");
                return;
            }
            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            activeFile = new File(dir, "MG30_Take_" + timestamp + ".wav");
            activeSampleRate = selectedRate;
            activeChannels = selectedChannels;
            activeEncoding = selectedEncoding;
            activeBits = 24; // User-facing file is always integer PCM 24-bit WAV.
            activeWavFormatCode = 1;
            activeFloatCapture = selectedEncoding == AudioFormat.ENCODING_PCM_FLOAT;
            activeInputEncodingName = captureEncodingName(selectedEncoding);
            activeRouteName = selectedRoute.getProductName() == null ? typeName(selectedRoute.getType()) : selectedRoute.getProductName().toString();
            pcmBytesWritten = 0;
            captureError = "";

            RandomAccessFile output = new RandomAccessFile(activeFile, "rw");
            output.setLength(0);
            output.write(new byte[44]);
            audioRecord = selectedRecord;
            recording = true;
            final RandomAccessFile outputRef = output;
            final AudioRecord recordRef = selectedRecord;
            final int captureBufferSize = selectedBuffer;
            final int captureEncoding = selectedEncoding;
            final int captureRate = selectedRate;
            final int captureChannels = selectedChannels;
            captureThread = new Thread(() -> {
                int inputBytesPerSample = captureEncoding == AudioFormat.ENCODING_PCM_16BIT ? 2 : 4;
                int sampleCount = Math.max(2048, captureBufferSize / inputBytesPerSample);
                byte[] pcm24 = new byte[sampleCount * 3];
                try {
                    if (captureEncoding == AudioFormat.ENCODING_PCM_32BIT) {
                        int rawSize = sampleCount * 4;
                        ByteBuffer rawBuffer = ByteBuffer.allocateDirect(rawSize).order(ByteOrder.LITTLE_ENDIAN);
                        byte[] rawSamples = new byte[rawSize];
                        while (recording) {
                            rawBuffer.clear();
                            int read = recordRef.read(rawBuffer, rawSize, AudioRecord.READ_BLOCKING);
                            if (read > 0) {
                                // AudioRecord ByteBuffer reads preserve the configured 32-bit sample layout.
                                rawBuffer.position(0);
                                rawBuffer.get(rawSamples, 0, read);
                                int samplesRead = read / 4;
                                packInt32LeftJustified24(rawSamples, samplesRead, pcm24);
                                int bytes = samplesRead * 3;
                                outputRef.write(pcm24, 0, bytes);
                                pcmBytesWritten += bytes;
                            } else if (read < 0 && read != AudioRecord.ERROR_DEAD_OBJECT) {
                                captureError = "AudioRecord PCM32 read error: " + read;
                                break;
                            }
                        }
                    } else if (captureEncoding == AudioFormat.ENCODING_PCM_FLOAT) {
                        float[] samples = new float[sampleCount];
                        while (recording) {
                            int read = recordRef.read(samples, 0, samples.length, AudioRecord.READ_BLOCKING);
                            if (read > 0) {
                                packFloatToPcm24(samples, read, pcm24);
                                int bytes = read * 3;
                                outputRef.write(pcm24, 0, bytes);
                                pcmBytesWritten += bytes;
                            } else if (read < 0 && read != AudioRecord.ERROR_DEAD_OBJECT) {
                                captureError = "AudioRecord float read error: " + read;
                                break;
                            }
                        }
                    } else {
                        short[] samples = new short[sampleCount];
                        while (recording) {
                            int read = recordRef.read(samples, 0, samples.length, AudioRecord.READ_BLOCKING);
                            if (read > 0) {
                                packShortToPcm24(samples, read, pcm24);
                                int bytes = read * 3;
                                outputRef.write(pcm24, 0, bytes);
                                pcmBytesWritten += bytes;
                            } else if (read < 0 && read != AudioRecord.ERROR_DEAD_OBJECT) {
                                captureError = "AudioRecord PCM16 read error: " + read;
                                break;
                            }
                        }
                    }
                } catch (IOException e) {
                    captureError = e.getMessage() == null ? "Kesalahan menulis file audio" : e.getMessage();
                } finally {
                    try { outputRef.close(); } catch (IOException ignored) {}
                }
            }, "MG30-USB-Audio-Capture");
            captureThread.setPriority(Thread.MAX_PRIORITY);
            captureThread.start();

            JSObject result = new JSObject();
            result.put("recording", true);
            result.put("sampleRate", activeSampleRate);
            result.put("channels", activeChannels);
            result.put("bitDepth", activeBits);
            result.put("encodingName", "WAV PCM 24-bit / " + activeSampleRate + " Hz");
            result.put("captureSource", activeInputEncodingName);
            result.put("routeName", activeRouteName);
            result.put("inputSource", selectedSourceName);
            result.put("fileName", activeFile.getName());
            result.put("note", "WAV output is 24-bit integer PCM. Source format was " + activeInputEncodingName + "; Android may convert the source stream before the app receives it.");
            call.resolve(result);
        } catch (Exception e) {
            recording = false;
            try { selectedRecord.stop(); } catch (Exception ignored) {}
            selectedRecord.release();
            call.reject("Gagal memulai input USB Audio: " + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
        }
    }

    private static String sourceName(int source) {
        if (source == MediaRecorder.AudioSource.DEFAULT) return "DEFAULT";
        if (source == MediaRecorder.AudioSource.MIC) return "MIC";
        if (Build.VERSION.SDK_INT >= 24 && source == MediaRecorder.AudioSource.UNPROCESSED) return "UNPROCESSED";
        return "AudioSource " + source;
    }

    private static String captureEncodingName(int encoding) {
        if (encoding == AudioFormat.ENCODING_PCM_32BIT) return "PCM 32-bit integer (24-bit left-justified in 32-bit container)";
        if (encoding == AudioFormat.ENCODING_PCM_FLOAT) return "PCM float 32-bit (Android capture path)";
        return "PCM 16-bit fallback";
    }

    private static void packInt32LeftJustified24(byte[] samples, int count, byte[] target) {
        // Android USB UAC: 24 useful bits are left-justified in each 32-bit word.
        // The first byte in the little-endian word is padding; keep the remaining 3 bytes.
        for (int i = 0; i < count; i++) {
            int source = i * 4;
            int targetOffset = i * 3;
            target[targetOffset] = samples[source + 1];
            target[targetOffset + 1] = samples[source + 2];
            target[targetOffset + 2] = samples[source + 3];
        }
    }

    private static void packFloatToPcm24(float[] samples, int count, byte[] target) {
        for (int i = 0; i < count; i++) {
            float sample = Math.max(-1.0f, Math.min(1.0f, samples[i]));
            int value = sample <= -1.0f ? -8388608 : Math.round(sample * 8388607.0f);
            int p = i * 3;
            target[p] = (byte) (value & 0xff);
            target[p + 1] = (byte) ((value >> 8) & 0xff);
            target[p + 2] = (byte) ((value >> 16) & 0xff);
        }
    }

    private static void packShortToPcm24(short[] samples, int count, byte[] target) {
        for (int i = 0; i < count; i++) {
            int value = samples[i] << 8;
            int p = i * 3;
            target[p] = (byte) (value & 0xff);
            target[p + 1] = (byte) ((value >> 8) & 0xff);
            target[p + 2] = (byte) ((value >> 16) & 0xff);
        }
    }

    @PluginMethod
    public void stopRecording(PluginCall call) {
        if (!recording || audioRecord == null || activeFile == null) {
            call.reject("Tidak ada rekaman yang sedang berjalan.");
            return;
        }
        recording = false;
        AudioRecord record = audioRecord;
        try { record.stop(); } catch (Exception ignored) {}
        try {
            if (captureThread != null) captureThread.join(2500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        try { record.release(); } catch (Exception ignored) {}
        audioRecord = null;
        captureThread = null;

        try {
            long dataBytes = activeFile.length() - 44;
            if (dataBytes < 0) dataBytes = 0;
            writeWavHeader(activeFile, dataBytes, activeSampleRate, activeChannels, activeBits, activeWavFormatCode);
            JSObject result = new JSObject();
            result.put("path", activeFile.getAbsolutePath());
            result.put("fileName", activeFile.getName());
            result.put("sampleRate", activeSampleRate);
            result.put("channels", activeChannels);
            result.put("bitDepth", activeBits);
            result.put("encodingName", "WAV PCM 24-bit / " + activeSampleRate + " Hz");
            result.put("captureSource", activeInputEncodingName);
            result.put("wavFormat", "PCM integer 24-bit");
            result.put("dataBytes", dataBytes);
            result.put("durationSeconds", dataBytes / (double) (activeSampleRate * activeChannels * (activeBits / 8)));
            result.put("routeName", activeRouteName);
            result.put("captureError", captureError);
            result.put("note", "File tersimpan di folder Music internal aplikasi. WAV dibuat sebagai integer PCM 24-bit; source stream berasal dari " + activeInputEncodingName + ".");
            call.resolve(result);
        } catch (IOException e) {
            call.reject("Take terhenti tetapi header WAV gagal ditulis: " + e.getMessage());
        }
    }

    private File getMusicDirectory() {
        File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_MUSIC);
        if (dir == null) dir = new File(getContext().getFilesDir(), "Music");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    private File resolveTakeFile(String path) {
        if (path == null || path.trim().isEmpty()) return null;
        try {
            File directory = getMusicDirectory().getCanonicalFile();
            File requested = new File(path).getCanonicalFile();
            if (requested.getParentFile() == null || !requested.getParentFile().equals(directory) ||
                !requested.getName().toLowerCase(Locale.ROOT).endsWith(".wav")) return null;
            return requested;
        } catch (IOException e) {
            return null;
        }
    }

    private JSObject takeDetails(File file) throws IOException {
        int sampleRate = 48000;
        int channels = 2;
        int bits = 24;
        long dataBytes = Math.max(0, file.length() - 44);
        try (RandomAccessFile input = new RandomAccessFile(file, "r")) {
            if (input.length() >= 44) {
                input.seek(22);
                channels = readShortLE(input);
                sampleRate = readIntLE(input);
                input.seek(34);
                bits = readShortLE(input);
                input.seek(40);
                long declared = Integer.toUnsignedLong(readIntLE(input));
                if (declared <= input.length() - 44) dataBytes = declared;
            }
        } catch (IOException ignored) {
            // Use safe defaults if the WAV header from an older take is incomplete.
        }
        if (channels < 1 || channels > 8) channels = 2;
        if (sampleRate < 8000 || sampleRate > 384000) sampleRate = 48000;
        if (bits != 16 && bits != 24 && bits != 32) bits = 24;
        JSObject item = new JSObject();
        item.put("path", file.getAbsolutePath());
        item.put("fileName", file.getName());
        item.put("sampleRate", sampleRate);
        item.put("channels", channels);
        item.put("bitDepth", bits);
        item.put("dataBytes", dataBytes);
        item.put("durationSeconds", dataBytes / (double) (sampleRate * channels * (bits / 8)));
        item.put("lastModified", file.lastModified());
        item.put("routeName", "USB-Audio · NUX MG-30");
        return item;
    }

    private static int readShortLE(RandomAccessFile input) throws IOException {
        int lo = input.read();
        int hi = input.read();
        if (lo < 0 || hi < 0) throw new IOException("Incomplete WAV header");
        return lo | (hi << 8);
    }

    private static int readIntLE(RandomAccessFile input) throws IOException {
        int b0 = input.read();
        int b1 = input.read();
        int b2 = input.read();
        int b3 = input.read();
        if ((b0 | b1 | b2 | b3) < 0) throw new IOException("Incomplete WAV header");
        return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
    }

    private static boolean isUsbInput(AudioDeviceInfo device) {
        int type = device.getType();
        return type == AudioDeviceInfo.TYPE_USB_DEVICE ||
            type == AudioDeviceInfo.TYPE_USB_HEADSET ||
            (Build.VERSION.SDK_INT >= 26 && type == AudioDeviceInfo.TYPE_USB_ACCESSORY);
    }

    private static String typeName(int type) {
        switch (type) {
            case AudioDeviceInfo.TYPE_USB_DEVICE: return "USB device";
            case AudioDeviceInfo.TYPE_USB_HEADSET: return "USB headset";
            case AudioDeviceInfo.TYPE_BUILTIN_MIC: return "Mikrofon bawaan";
            case AudioDeviceInfo.TYPE_WIRED_HEADSET: return "Headset berkabel";
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO: return "Bluetooth input";
            default: return "Audio input type " + type;
        }
    }

    private static JSArray toJsArray(int[] values) {
        JSArray array = new JSArray();
        for (int value : values) array.put(value);
        return array;
    }

    private static boolean contains(int[] values, int target) {
        for (int value : values) if (value == target) return true;
        return false;
    }

    private static void addRate(ArrayList<Integer> rates, int rate, int[] supported) {
        if ((supported.length == 0 || contains(supported, rate)) && !rates.contains(rate)) rates.add(rate);
    }

    private static void writeWavHeader(File file, long dataLength, int rate, int channels, int bits, int formatCode) throws IOException {
        long byteRate = (long) rate * channels * bits / 8;
        try (RandomAccessFile out = new RandomAccessFile(file, "rw")) {
            out.seek(0);
            out.writeBytes("RIFF");
            writeIntLE(out, (int) Math.min(0x7fffffffL, dataLength + 36));
            out.writeBytes("WAVE");
            out.writeBytes("fmt ");
            writeIntLE(out, 16);
            writeShortLE(out, formatCode);
            writeShortLE(out, channels);
            writeIntLE(out, rate);
            writeIntLE(out, (int) byteRate);
            writeShortLE(out, channels * bits / 8);
            writeShortLE(out, bits);
            out.writeBytes("data");
            writeIntLE(out, (int) Math.min(0x7fffffffL, dataLength));
        }
    }

    private static void writeIntLE(RandomAccessFile out, int value) throws IOException {
        out.write(value & 0xff);
        out.write((value >> 8) & 0xff);
        out.write((value >> 16) & 0xff);
        out.write((value >> 24) & 0xff);
    }

    private static void writeShortLE(RandomAccessFile out, int value) throws IOException {
        out.write(value & 0xff);
        out.write((value >> 8) & 0xff);
    }
}