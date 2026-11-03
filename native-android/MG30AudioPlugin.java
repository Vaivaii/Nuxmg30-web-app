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
import java.util.Collections;
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
    private String activeCaptureMode = "normal";
    private int activeChannelIndexMask = 0;
    private int activeRequestedChannelIndexMask = 0;
    private int activeRouteDeviceId = -1;
    private long[] channelSampleCounts = new long[0];
    private double[] channelSquareSums = new double[0];
    private double[] channelPeakAbs = new double[0];
    private String captureError = "";
    private static final int LIVE_WAVEFORM_BUCKET_MS = 100;
    private static final int MAX_LIVE_WAVEFORM_BUCKETS = 8192;
    private final Object liveWaveformLock = new Object();
    private double[][] liveWaveformRing = new double[0][];
    private double[] liveBucketPeakAbs = new double[0];
    private int liveWaveformWriteIndex = 0;
    private int liveWaveformCount = 0;
    private int liveBucketTargetFrames = 4800;
    private long liveFramesInBucket = 0;
    private long liveTotalFrames = 0;

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
                item.put("channelMasks", Build.VERSION.SDK_INT >= 23 ? toJsArray(device.getChannelMasks()) : new JSArray());
                item.put("channelIndexMasks", Build.VERSION.SDK_INT >= 23 ? toJsArray(device.getChannelIndexMasks()) : new JSArray());
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
        String captureMode = call.getString("captureMode", "normal");
        boolean loopbackCapture = "loopback".equalsIgnoreCase(captureMode);
        boolean diagnosticCapture = "diagnostic".equalsIgnoreCase(captureMode);
        boolean multichannelCapture = loopbackCapture || diagnosticCapture || "multichannel".equalsIgnoreCase(captureMode);
        int requestedChannelIndexMask = call.getInt("channelIndexMask", 0);
        if (diagnosticCapture && requestedChannelIndexMask != 0xF) {
            call.reject("Mode diagnostik USB memerlukan empat kanal mentah dengan index mask 0xF.");
            return;
        }
        if (multichannelCapture && !diagnosticCapture && requestedChannelIndexMask != 0 &&
            (Integer.bitCount(requestedChannelIndexMask) < 1 || Integer.bitCount(requestedChannelIndexMask) > 2)) {
            call.reject("Pemetaan input track harus memilih satu kanal mono atau sepasang kanal stereo.");
            return;
        }
        if (multichannelCapture && Build.VERSION.SDK_INT < 23 && (requestedChannelIndexMask & 0xF) != 0) {
            call.reject("Pemilihan input USB kanal 3–4 memerlukan Android API 23 atau lebih baru.");
            return;
        }
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
        if (usb == null && !multichannelCapture) {
            // Preserve the pre-existing generic USB fallback for normal Guitar capture.
            for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_INPUTS)) {
                if (isUsbInput(device)) { usb = device; break; }
            }
        }
        if (usb == null) {
            call.reject(multichannelCapture
                ? "Input USB NUX MG-30 tidak terdeteksi untuk Loopback. Periksa sambungan dan endpoint MG-30."
                : "Input USB Audio belum terdeteksi. Pastikan MG-30 terhubung dengan kabel data dan OTG.");
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
        int[] advertisedIndexMasks = Build.VERSION.SDK_INT >= 23 ? usb.getChannelIndexMasks() : new int[0];
        ArrayList<Integer> channelOptions = new ArrayList<>();
        ArrayList<Integer> loopbackIndexMasks = new ArrayList<>();
        if (multichannelCapture && Build.VERSION.SDK_INT >= 23) {
            // Preserve the exact index masks advertised by Android. They need not be
            // contiguous: for example 0xC selects index channels 3 and 4, while 0xF
            // selects all four. Prefer the widest layout without assigning semantics.
            if (advertisedIndexMasks.length > 0) {
                for (int indexMask : advertisedIndexMasks) {
                    int channels = Integer.bitCount(indexMask);
                    if (indexMask == 0 || channels < 1 || channels > 8) continue;
                    if (requestedChannelIndexMask != 0 &&
                        (indexMask & requestedChannelIndexMask) != requestedChannelIndexMask) continue;
                    if (countOptions.length > 0 && !contains(countOptions, channels)) continue;
                    if (!loopbackIndexMasks.contains(indexMask)) {
                        loopbackIndexMasks.add(indexMask);
                        channelOptions.add(channels);
                    }
                }
                // Collections.sort is stable, so equal-width masks retain the
                // endpoint's advertised order for deterministic fallback behavior.
                ArrayList<Integer> originalMasks = new ArrayList<>(loopbackIndexMasks);
                ArrayList<Integer> originalCounts = new ArrayList<>(channelOptions);
                ArrayList<Integer> order = new ArrayList<>();
                for (int i = 0; i < originalMasks.size(); i++) order.add(i);
                Collections.sort(order, (left, right) ->
                    Integer.compare(Integer.bitCount(originalMasks.get(right)),
                                    Integer.bitCount(originalMasks.get(left))));
                loopbackIndexMasks.clear();
                channelOptions.clear();
                for (int index : order) {
                    loopbackIndexMasks.add(originalMasks.get(index));
                    channelOptions.add(originalCounts.get(index));
                }
            } else {
                // No index masks advertised: try contiguous layouts by width.
                int[] preferredLoopbackCounts = new int[] { 4, 3, 2, 1 };
                for (int channels : preferredLoopbackCounts) {
                    if (countOptions.length == 0 || contains(countOptions, channels)) {
                        int fallbackMask = (1 << channels) - 1;
                        if (requestedChannelIndexMask != 0 &&
                            (fallbackMask & requestedChannelIndexMask) != requestedChannelIndexMask) continue;
                        channelOptions.add(channels);
                        loopbackIndexMasks.add(fallbackMask);
                    }
                }
            }
        } else {
            if (countOptions.length == 0 || contains(countOptions, 2)) channelOptions.add(2);
            if (countOptions.length == 0 || contains(countOptions, 1)) channelOptions.add(1);
        }
        if (multichannelCapture && requestedChannelIndexMask != 0 && channelOptions.isEmpty()) {
            call.reject("MG-30 tidak mengekspos kanal USB yang dibutuhkan oleh input track ini. Pilih sumber input lain atau periksa format kanal USB yang dilaporkan Android.");
            return;
        }
        if (multichannelCapture && requestedChannelIndexMask == 0 &&
            Build.VERSION.SDK_INT >= 23 && advertisedIndexMasks.length > 0 && channelOptions.isEmpty()) {
            call.reject("MG-30 mengiklankan channel-index mask USB, tetapi tidak ada mask yang cocok dengan jumlah kanal input. Capture dihentikan tanpa menebak pemetaan kanal.");
            return;
        }
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
        int selectedChannelIndexMask = 0;
        int selectedEncoding = AudioFormat.ENCODING_PCM_16BIT;
        int selectedBuffer = 0;
        AudioDeviceInfo selectedRoute = null;
        String selectedSourceName = "Default";

        for (int source : sources) {
            boolean foundForSource = false;
            for (int encoding : encodings) {
                if (encoding == AudioFormat.ENCODING_PCM_32BIT && Build.VERSION.SDK_INT < 31) continue;
                for (int channelOptionIndex = 0; channelOptionIndex < channelOptions.size(); channelOptionIndex++) {
                    int channels = channelOptions.get(channelOptionIndex);
                    boolean useChannelIndexMask = multichannelCapture && Build.VERSION.SDK_INT >= 23;
                    int channelIndexMask = useChannelIndexMask
                        ? (loopbackIndexMasks.isEmpty() ? (1 << channels) - 1 : loopbackIndexMasks.get(channelOptionIndex))
                        : 0;
                    int channelConfig = useChannelIndexMask
                        ? channelIndexMask
                        : (channels == 2 ? AudioFormat.CHANNEL_IN_STEREO : AudioFormat.CHANNEL_IN_MONO);
                    for (int rate : rates) {
                        int bytesPerCaptureSample = encoding == AudioFormat.ENCODING_PCM_16BIT ? 2 : 4;
                        // getMinBufferSize accepts channel-position masks, not arbitrary
                        // endpoint index masks. For index-mask Loopback, size the stream
                        // directly from its channel count and sample format instead.
                        int min = useChannelIndexMask
                            ? rate * channels * bytesPerCaptureSample / 10
                            : AudioRecord.getMinBufferSize(rate, channelConfig, encoding);
                        if (min <= 0) continue;
                        int bufferSize = Math.max(min * 2, rate * channels * bytesPerCaptureSample / 4);
                        AudioRecord candidate = null;
                        try {
                            AudioFormat.Builder formatBuilder = new AudioFormat.Builder()
                                .setSampleRate(rate)
                                .setEncoding(encoding);
                            if (useChannelIndexMask) {
                                formatBuilder.setChannelIndexMask(channelIndexMask);
                            } else {
                                formatBuilder.setChannelMask(channelConfig);
                            }
                            AudioFormat format = formatBuilder.build();
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
                                if (routed != null && isUsbInput(routed) &&
                                    (!multichannelCapture || isMg30UsbDevice(routed))) break;
                                SystemClock.sleep(50);
                            }
                            if (routed != null && isUsbInput(routed) &&
                                (!multichannelCapture || isMg30UsbDevice(routed))) {
                                selectedRecord = candidate;
                                selectedRoute = routed;
                                selectedRate = rate;
                                selectedChannels = channels;
                                selectedChannelIndexMask = channelIndexMask;
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
            activeFile = new File(dir, (diagnosticCapture ? "MG30_USB_Raw4ch_Diagnostic_" : (loopbackCapture ? "MG30_Loopback_Take_" : (multichannelCapture ? "MG30_USB_Input_Take_" : "MG30_Take_")) ) + timestamp + ".wav");
            activeSampleRate = selectedRate;
            activeChannels = selectedChannels;
            activeChannelIndexMask = selectedChannelIndexMask;
            activeRequestedChannelIndexMask = requestedChannelIndexMask;
            activeRouteDeviceId = selectedRoute.getId();
            activeCaptureMode = diagnosticCapture ? "diagnostic"
                : (multichannelCapture ? (loopbackCapture ? "loopback" : "multichannel") : "normal");
            activeEncoding = selectedEncoding;
            activeBits = 24; // User-facing file is always integer PCM 24-bit WAV.
            activeWavFormatCode = 1;
            activeFloatCapture = selectedEncoding == AudioFormat.ENCODING_PCM_FLOAT;
            activeInputEncodingName = captureEncodingName(selectedEncoding);
            activeRouteName = selectedRoute.getProductName() == null ? typeName(selectedRoute.getType()) : selectedRoute.getProductName().toString();
            pcmBytesWritten = 0;
            channelSampleCounts = new long[selectedChannels];
            channelSquareSums = new double[selectedChannels];
            channelPeakAbs = new double[selectedChannels];
            resetLiveWaveform(selectedChannels, selectedRate);
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
                // Keep each read request on a complete interleaved frame for
                // 1/2/3/4-channel captures, including non-contiguous index masks.
                int sampleCount = Math.max(2048, captureBufferSize / inputBytesPerSample);
                sampleCount -= sampleCount % captureChannels;
                if (sampleCount <= 0) sampleCount = captureChannels * 512;
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
                                accumulatePcm32Stats(rawSamples, samplesRead, captureChannels);
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
                                accumulateFloatStats(samples, read, captureChannels);
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
                                accumulatePcm16Stats(samples, read, captureChannels);
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
            result.put("captureMode", activeCaptureMode);
            result.put("channelIndexMask", activeChannelIndexMask);
            result.put("requestedChannelIndexMask", activeRequestedChannelIndexMask);
            result.put("routeDeviceId", activeRouteDeviceId);
            result.put("channelLayout", activeChannelIndexMask != 0
                ? "USB channel-index mask 0x" + Integer.toHexString(activeChannelIndexMask).toUpperCase(Locale.ROOT)
                : (activeChannels == 2 ? "USB stereo position mask" : "USB mono position mask"));
            result.put("bitDepth", activeBits);
            result.put("encodingName", "WAV PCM 24-bit / " + activeSampleRate + " Hz");
            result.put("captureSource", activeInputEncodingName);
            result.put("routeName", activeRouteName);
            result.put("inputSource", selectedSourceName);
            result.put("fileName", activeFile.getName());
            result.put("note", "WAV output is 24-bit integer PCM. Source format was " + activeInputEncodingName +
                "; capture mode " + activeCaptureMode + "; Android may convert the source stream before the app receives it.");
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

    private void resetLiveWaveform(int channels, int sampleRate) {
        synchronized (liveWaveformLock) {
            liveWaveformRing = new double[channels][MAX_LIVE_WAVEFORM_BUCKETS];
            liveBucketPeakAbs = new double[channels];
            liveWaveformWriteIndex = 0;
            liveWaveformCount = 0;
            liveBucketTargetFrames = Math.max(1, sampleRate * LIVE_WAVEFORM_BUCKET_MS / 1000);
            liveFramesInBucket = 0;
            liveTotalFrames = 0;
        }
    }

    // Called for interleaved samples while liveWaveformLock is held by the
    // corresponding accumulate method. One peak bucket represents 100 ms.
    private void updateSampleStats(int channel, double sample, int channels) {
        if (channel < 0 || channel >= channelSampleCounts.length || !Double.isFinite(sample)) return;
        channelSampleCounts[channel]++;
        channelSquareSums[channel] += sample * sample;
        double absolute = Math.abs(sample);
        channelPeakAbs[channel] = Math.max(channelPeakAbs[channel], absolute);
        liveBucketPeakAbs[channel] = Math.max(liveBucketPeakAbs[channel], absolute);
        if (channel == channels - 1) {
            liveFramesInBucket++;
            liveTotalFrames++;
            if (liveFramesInBucket >= liveBucketTargetFrames) {
                for (int index = 0; index < channels; index++) {
                    liveWaveformRing[index][liveWaveformWriteIndex] = liveBucketPeakAbs[index];
                    liveBucketPeakAbs[index] = 0.0;
                }
                liveWaveformWriteIndex = (liveWaveformWriteIndex + 1) % MAX_LIVE_WAVEFORM_BUCKETS;
                liveWaveformCount = Math.min(MAX_LIVE_WAVEFORM_BUCKETS, liveWaveformCount + 1);
                liveFramesInBucket = 0;
            }
        }
    }

    private void accumulatePcm32Stats(byte[] data, int sampleCount, int channels) {
        synchronized (liveWaveformLock) {
            for (int i = 0; i < sampleCount; i++) {
                int offset = i * 4;
                int raw = (data[offset] & 0xff)
                    | ((data[offset + 1] & 0xff) << 8)
                    | ((data[offset + 2] & 0xff) << 16)
                    | (data[offset + 3] << 24);
                updateSampleStats(i % channels, raw / 2147483648.0, channels);
            }
        }
    }

    private void accumulatePcm16Stats(short[] data, int sampleCount, int channels) {
        synchronized (liveWaveformLock) {
            for (int i = 0; i < sampleCount; i++) {
                updateSampleStats(i % channels, data[i] / 32768.0, channels);
            }
        }
    }

    private void accumulateFloatStats(float[] data, int sampleCount, int channels) {
        synchronized (liveWaveformLock) {
            for (int i = 0; i < sampleCount; i++) {
                updateSampleStats(i % channels, data[i], channels);
            }
        }
    }

    private JSArray buildLiveChannelWaveforms() {
        JSArray result = new JSArray();
        synchronized (liveWaveformLock) {
            int totalBuckets = liveWaveformCount + (liveFramesInBucket > 0 ? 1 : 0);
            int displayBuckets = Math.min(256, totalBuckets);
            int oldestIndex = (liveWaveformWriteIndex - liveWaveformCount + MAX_LIVE_WAVEFORM_BUCKETS)
                % MAX_LIVE_WAVEFORM_BUCKETS;
            for (int channelIndex = 0; channelIndex < liveWaveformRing.length; channelIndex++) {
                JSArray peaks = new JSArray();
                for (int displayIndex = 0; displayIndex < displayBuckets; displayIndex++) {
                    int first = (int) ((long) displayIndex * totalBuckets / displayBuckets);
                    int limit = (int) ((long) (displayIndex + 1) * totalBuckets / displayBuckets);
                    limit = Math.max(first + 1, limit);
                    double peak = 0.0;
                    for (int bucket = first; bucket < limit; bucket++) {
                        double value;
                        if (bucket < liveWaveformCount) {
                            int ringIndex = (oldestIndex + bucket) % MAX_LIVE_WAVEFORM_BUCKETS;
                            value = liveWaveformRing[channelIndex][ringIndex];
                        } else {
                            value = liveBucketPeakAbs[channelIndex];
                        }
                        peak = Math.max(peak, value);
                    }
                    peaks.put(peak);
                }
                JSObject channel = new JSObject();
                channel.put("channel", channelIndex + 1);
                channel.put("peaks", peaks);
                result.put(channel);
            }
        }
        return result;
    }

    @PluginMethod
    public void getRecordingStats(PluginCall call) {
        JSObject result = new JSObject();
        boolean active = recording;
        result.put("recording", active);
        if (active) {
            result.put("sampleRate", activeSampleRate);
            result.put("channels", activeChannels);
            result.put("channelIndexMask", activeChannelIndexMask);
            result.put("requestedChannelIndexMask", activeRequestedChannelIndexMask);
            result.put("durationSeconds", getLiveRecordingDurationSeconds());
            result.put("channelWaveforms", buildLiveChannelWaveforms());
        }
        call.resolve(result);
    }

    private double getLiveRecordingDurationSeconds() {
        synchronized (liveWaveformLock) {
            return (liveTotalFrames + liveFramesInBucket) / (double) Math.max(1, activeSampleRate);
        }
    }

    private JSArray buildChannelStats() {
        JSArray values = new JSArray();
        for (int i = 0; i < channelSampleCounts.length; i++) {
            long count = channelSampleCounts[i];
            double rms = count > 0 ? Math.sqrt(channelSquareSums[i] / count) : 0.0;
            double peak = channelPeakAbs[i];
            JSObject channel = new JSObject();
            channel.put("channel", i + 1);
            channel.put("samples", count);
            channel.put("peak", peak);
            channel.put("rms", rms);
            channel.put("peakDbfs", peak > 0 ? 20.0 * Math.log10(peak) : -240.0);
            channel.put("rmsDbfs", rms > 0 ? 20.0 * Math.log10(rms) : -240.0);
            values.put(channel);
        }
        return values;
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
            result.put("captureMode", activeCaptureMode);
            result.put("channelIndexMask", activeChannelIndexMask);
            result.put("requestedChannelIndexMask", activeRequestedChannelIndexMask);
            result.put("routeDeviceId", activeRouteDeviceId);
            result.put("channelStats", buildChannelStats());
            result.put("bytesWritten", dataBytes);
            result.put("channelLayout", activeChannelIndexMask != 0
                ? "USB channel-index mask 0x" + Integer.toHexString(activeChannelIndexMask).toUpperCase(Locale.ROOT)
                : (activeChannels == 2 ? "USB stereo position mask" : "USB mono position mask"));
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

    private static boolean isMg30UsbDevice(AudioDeviceInfo device) {
        String name = device.getProductName() == null ? "" : device.getProductName().toString().toLowerCase(Locale.ROOT);
        return name.contains("mg-30") || name.contains("nux");
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