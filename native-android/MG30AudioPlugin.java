package com.vaivaii.mg30studio;

import android.Manifest;
import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Environment;
import android.os.SystemClock;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
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
    private int activeBits = 16;
    private int activeEncoding = AudioFormat.ENCODING_PCM_16BIT;
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
            if (isUsbInput(device)) {
                usb = device;
                break;
            }
        }
        if (usb == null) {
            call.reject("Input USB Audio belum terdeteksi. Pastikan MG-30 terhubung dengan kabel data dan OTG.");
            return;
        }

        int[] deviceRates = usb.getSampleRates();
        ArrayList<Integer> rates = new ArrayList<>();
        addRate(rates, 48000, deviceRates);
        addRate(rates, 44100, deviceRates);
        addRate(rates, 96000, deviceRates);
        if (deviceRates.length > 0) {
            for (int rate : deviceRates) addRate(rates, rate, deviceRates);
        } else {
            rates.add(48000);
            rates.add(44100);
        }
        int[] countOptions = usb.getChannelCounts();
        int channels = contains(countOptions, 2) ? 2 : 1;
        int channelMask = channels == 2 ? AudioFormat.CHANNEL_IN_STEREO : AudioFormat.CHANNEL_IN_MONO;

        ArrayList<Integer> encodings = new ArrayList<>();
        if (call.getBoolean("prefer24Bit", true) && Build.VERSION.SDK_INT >= 31 &&
            contains(usb.getEncodings(), AudioFormat.ENCODING_PCM_24BIT_PACKED)) {
            encodings.add(AudioFormat.ENCODING_PCM_24BIT_PACKED);
        }
        encodings.add(AudioFormat.ENCODING_PCM_16BIT);

        AudioRecord selectedRecord = null;
        int selectedRate = 48000;
        int selectedEncoding = AudioFormat.ENCODING_PCM_16BIT;
        int selectedBuffer = 0;
        for (int encoding : encodings) {
            for (int rate : rates) {
                int min = AudioRecord.getMinBufferSize(rate, channelMask, encoding);
                if (min <= 0) continue;
                int bufferSize = Math.max(min * 2, rate * channels * (encoding == AudioFormat.ENCODING_PCM_24BIT_PACKED ? 3 : 2) / 4);
                try {
                    AudioFormat format = new AudioFormat.Builder()
                        .setSampleRate(rate)
                        .setChannelMask(channelMask)
                        .setEncoding(encoding)
                        .build();
                    AudioRecord candidate = new AudioRecord.Builder()
                        .setAudioSource(Build.VERSION.SDK_INT >= 24 ? MediaRecorder.AudioSource.UNPROCESSED : MediaRecorder.AudioSource.MIC)
                        .setAudioFormat(format)
                        .setBufferSizeInBytes(bufferSize)
                        .build();
                    if (candidate.getState() == AudioRecord.STATE_INITIALIZED && candidate.setPreferredDevice(usb)) {
                        selectedRecord = candidate;
                        selectedRate = rate;
                        selectedEncoding = encoding;
                        selectedBuffer = bufferSize;
                        break;
                    }
                    candidate.release();
                } catch (IllegalArgumentException | SecurityException ignored) {
                    // Some Android audio HALs advertise formats they cannot actually open.
                }
            }
            if (selectedRecord != null) break;
        }
        if (selectedRecord == null) {
            call.reject("Android tidak bisa membuka format input USB yang tersedia. Tes format 48 kHz/44.1 kHz belum berhasil.");
            return;
        }

        try {
            selectedRecord.startRecording();
            SystemClock.sleep(180);
            AudioDeviceInfo routed = Build.VERSION.SDK_INT >= 23 ? selectedRecord.getRoutedDevice() : null;
            if (routed == null || !isUsbInput(routed)) {
                selectedRecord.stop();
                selectedRecord.release();
                call.reject("Android tidak merutekan AudioRecord ke input USB MG-30. Rekaman dibatalkan agar mikrofon HP tidak terekam tanpa sengaja.");
                return;
            }

            File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_MUSIC);
            if (dir == null) dir = new File(getContext().getFilesDir(), "Music");
            if (!dir.exists() && !dir.mkdirs()) {
                selectedRecord.stop();
                selectedRecord.release();
                call.reject("Folder untuk menyimpan rekaman tidak dapat dibuat.");
                return;
            }
            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            activeFile = new File(dir, "MG30_Take_" + timestamp + ".wav");
            activeSampleRate = selectedRate;
            activeChannels = channels;
            activeEncoding = selectedEncoding;
            activeBits = selectedEncoding == AudioFormat.ENCODING_PCM_24BIT_PACKED ? 24 : 16;
            activeRouteName = routed.getProductName() == null ? typeName(routed.getType()) : routed.getProductName().toString();
            pcmBytesWritten = 0;
            captureError = "";
            RandomAccessFile output = new RandomAccessFile(activeFile, "rw");
            output.setLength(0);
            output.write(new byte[44]);
            audioRecord = selectedRecord;
            recording = true;
            final RandomAccessFile outputRef = output;
            final AudioRecord recordRef = selectedRecord;
            captureThread = new Thread(() -> {
                byte[] buffer = new byte[Math.max(4096, selectedBuffer)];
                try {
                    while (recording) {
                        int read = recordRef.read(buffer, 0, buffer.length, AudioRecord.READ_BLOCKING);
                        if (read > 0) {
                            outputRef.write(buffer, 0, read);
                            pcmBytesWritten += read;
                        } else if (read < 0 && read != AudioRecord.ERROR_DEAD_OBJECT) {
                            captureError = "AudioRecord read error: " + read;
                            break;
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
            result.put("routeName", activeRouteName);
            result.put("fileName", activeFile.getName());
            result.put("note", "PCM bit depth is the Android AudioRecord capture format, not a guarantee of the MG-30's internal USB transport format.");
            call.resolve(result);
        } catch (Exception e) {
            recording = false;
            try { selectedRecord.stop(); } catch (Exception ignored) {}
            selectedRecord.release();
            call.reject("Gagal memulai input USB Audio: " + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
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
            writeWavHeader(activeFile, dataBytes, activeSampleRate, activeChannels, activeBits);
            JSObject result = new JSObject();
            result.put("path", activeFile.getAbsolutePath());
            result.put("fileName", activeFile.getName());
            result.put("sampleRate", activeSampleRate);
            result.put("channels", activeChannels);
            result.put("bitDepth", activeBits);
            result.put("dataBytes", dataBytes);
            result.put("durationSeconds", dataBytes / (double) (activeSampleRate * activeChannels * (activeBits / 8)));
            result.put("routeName", activeRouteName);
            result.put("captureError", captureError);
            result.put("note", "File berada di folder Music internal aplikasi. Format ini menunjukkan stream capture Android; verifikasi langsung dengan perangkat tetap diperlukan.");
            call.resolve(result);
        } catch (IOException e) {
            call.reject("Take terhenti tetapi header WAV gagal ditulis: " + e.getMessage());
        }
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

    private static void writeWavHeader(File file, long dataLength, int rate, int channels, int bits) throws IOException {
        long byteRate = (long) rate * channels * bits / 8;
        try (RandomAccessFile out = new RandomAccessFile(file, "rw")) {
            out.seek(0);
            out.writeBytes("RIFF");
            writeIntLE(out, (int) Math.min(0x7fffffffL, dataLength + 36));
            out.writeBytes("WAVE");
            out.writeBytes("fmt ");
            writeIntLE(out, 16);
            writeShortLE(out, 1);
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