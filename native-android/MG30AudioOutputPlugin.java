package com.vaivaii.mg30studio;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Build;
import android.os.SystemClock;

import java.util.Locale;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Isolated USB output discovery and short, low-level playback probe.
 *
 * This plugin deliberately does not touch MG30AudioPlugin or its AudioRecord
 * input/capture path. The playback probe writes a quiet tone only after Android
 * reports that AudioTrack is actually routed to the selected MG-30 USB output.
 */
@CapacitorPlugin(name = "MG30AudioOutput")
public class MG30AudioOutputPlugin extends Plugin {
    private static final int PROBE_SAMPLE_RATE = 48000;
    private static final int PROBE_DURATION_MS = 1200;
    private static final int PROBE_CHANNELS = 2;
    private static final float PROBE_AMPLITUDE = 0.025f;
    private static final double PROBE_FREQUENCY_HZ = 440.0;

    @PluginMethod
    public void inspectOutputDevices(PluginCall call) {
        AudioManager manager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        JSArray devices = new JSArray();
        boolean usbOutputFound = false;
        boolean mg30OutputFound = false;

        if (manager != null) {
            for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
                boolean isUsb = isUsbOutput(device);
                String productName = device.getProductName() == null ? "" : device.getProductName().toString();
                boolean isMg30 = isUsb && isMg30ProductName(productName);
                usbOutputFound = usbOutputFound || isUsb;
                mg30OutputFound = mg30OutputFound || isMg30;

                JSObject item = new JSObject();
                item.put("id", device.getId());
                item.put("name", productName.isEmpty() ? "Audio output " + device.getId() : productName);
                item.put("type", device.getType());
                item.put("typeName", typeName(device.getType()));
                item.put("isUsb", isUsb);
                item.put("isMg30", isMg30);
                item.put("sampleRates", toJsArray(device.getSampleRates()));
                item.put("channelCounts", toJsArray(device.getChannelCounts()));

                JSArray encodings = new JSArray();
                if (Build.VERSION.SDK_INT >= 31) {
                    for (int encoding : device.getEncodings()) encodings.put(encoding);
                }
                item.put("encodings", encodings);
                item.put("supports24BitPacked", Build.VERSION.SDK_INT >= 31
                    && contains(device.getEncodings(), AudioFormat.ENCODING_PCM_24BIT_PACKED));
                devices.put(item);
            }
        }

        JSObject result = new JSObject();
        result.put("native", true);
        result.put("androidApi", Build.VERSION.SDK_INT);
        result.put("usbOutputFound", usbOutputFound);
        result.put("mg30OutputFound", mg30OutputFound);
        result.put("devices", devices);
        result.put("note", "Output endpoint discovery only. Use the separate low-level playback probe to verify actual AudioTrack routing; this does not prove DAW playback, USB input, full duplex, Reamp or Loopback.");
        call.resolve(result);
    }

    /**
     * Plays a 1.2-second, -32 dBFS 440 Hz stereo test tone.
     * No audio is written unless the active AudioTrack route matches the
     * explicitly selected MG-30 USB device ID. A phone-speaker fallback is
     * treated as a routing failure, not as a successful test.
     */
    @PluginMethod
    public void playTestTone(PluginCall call) {
        Integer requestedId = call.getInt("deviceId");
        if (requestedId == null || requestedId < 0) {
            call.reject("Pilih endpoint USB MG-30 terlebih dahulu.");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            call.reject("Pemeriksaan rute AudioTrack memerlukan Android 7.0 atau lebih baru.");
            return;
        }

        AudioManager manager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        AudioDeviceInfo target = null;
        if (manager != null) {
            for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
                if (device.getId() == requestedId) {
                    target = device;
                    break;
                }
            }
        }
        if (target == null || !isUsbOutput(target) || !isMg30ProductName(
            target.getProductName() == null ? "" : target.getProductName().toString())) {
            call.reject("Endpoint USB NUX / MG-30 yang dipilih tidak lagi tersedia. Periksa ulang USB OUT.");
            return;
        }

        String targetName = target.getProductName() == null ? "NUX MG-30" : target.getProductName().toString();
        if (!contains(target.getSampleRates(), PROBE_SAMPLE_RATE)) {
            call.reject("MG-30 tidak melaporkan sample rate 48 kHz untuk output ini. Tes dihentikan tanpa mengirim audio.");
            return;
        }
        if (!contains(target.getChannelCounts(), PROBE_CHANNELS)) {
            call.reject("MG-30 tidak melaporkan output stereo 2 kanal. Tes dihentikan tanpa mengirim audio.");
            return;
        }

        int[] supportedEncodings = target.getEncodings();
        if (Build.VERSION.SDK_INT >= 31 && supportedEncodings.length > 0
            && !contains(supportedEncodings, AudioFormat.ENCODING_PCM_FLOAT)) {
            call.reject("Endpoint MG-30 tidak melaporkan dukungan PCM_FLOAT. Tes aman ini tidak dijalankan.");
            return;
        }

        AudioTrack track = null;
        JSObject result;
        int routedId = -1;
        String routedName = "";
        String message;
        boolean played = false;
        int framesWritten = 0;

        try {
            AudioFormat format = new AudioFormat.Builder()
                .setSampleRate(PROBE_SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                .build();
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            int minBuffer = AudioTrack.getMinBufferSize(
                PROBE_SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_STEREO,
                AudioFormat.ENCODING_PCM_FLOAT
            );
            if (minBuffer <= 0) {
                throw new IllegalStateException("Android menolak konfigurasi buffer PCM_FLOAT 48 kHz stereo (" + minBuffer + ").");
            }

            track = new AudioTrack.Builder()
                .setAudioAttributes(attributes)
                .setAudioFormat(format)
                .setBufferSizeInBytes(Math.max(minBuffer, PROBE_SAMPLE_RATE * PROBE_CHANNELS * 4 / 10))
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build();
            if (track.getState() != AudioTrack.STATE_INITIALIZED) {
                throw new IllegalStateException("AudioTrack gagal diinisialisasi.");
            }
            if (!track.setPreferredDevice(target)) {
                throw new IllegalStateException("Android menolak permintaan rute langsung ke endpoint USB MG-30.");
            }

            // Start an empty stream first. Verify the actual route before
            // writing even one non-zero audio sample.
            track.play();
            AudioDeviceInfo routed = null;
            long routeDeadline = SystemClock.elapsedRealtime() + 900;
            while (SystemClock.elapsedRealtime() < routeDeadline) {
                routed = track.getRoutedDevice();
                if (routed != null) break;
                SystemClock.sleep(40);
            }

            if (routed != null) {
                routedId = routed.getId();
                routedName = routed.getProductName() == null ? "" : routed.getProductName().toString();
            }
            if (routed == null || routedId != requestedId) {
                message = "Rute aktual belum cocok dengan MG-30. Tidak ada nada tes yang dikirim.";
            } else {
                final int framesPerBlock = 960; // 20 ms at 48 kHz
                final float[] samples = new float[framesPerBlock * PROBE_CHANNELS];
                final int totalFrames = PROBE_SAMPLE_RATE * PROBE_DURATION_MS / 1000;
                double phase = 0.0;
                double phaseStep = 2.0 * Math.PI * PROBE_FREQUENCY_HZ / PROBE_SAMPLE_RATE;
                boolean routeStayedOnMg30 = true;

                for (int frame = 0; frame < totalFrames; frame += framesPerBlock) {
                    AudioDeviceInfo currentRoute = track.getRoutedDevice();
                    if (currentRoute == null || currentRoute.getId() != requestedId) {
                        routeStayedOnMg30 = false;
                        break;
                    }
                    int blockFrames = Math.min(framesPerBlock, totalFrames - frame);
                    for (int i = 0; i < blockFrames; i++) {
                        float sample = (float) (Math.sin(phase) * PROBE_AMPLITUDE);
                        phase += phaseStep;
                        samples[i * 2] = sample;
                        samples[i * 2 + 1] = sample;
                    }
                    int sampleCount = blockFrames * PROBE_CHANNELS;
                    int offset = 0;
                    while (offset < sampleCount) {
                        int written = track.write(samples, offset, sampleCount - offset, AudioTrack.WRITE_BLOCKING);
                        if (written < 0) {
                            throw new IllegalStateException("AudioTrack.write gagal dengan kode " + written + ".");
                        }
                        if (written == 0) {
                            throw new IllegalStateException("AudioTrack tidak menerima data audio.");
                        }
                        offset += written;
                    }
                    framesWritten += blockFrames;
                }
                played = routeStayedOnMg30 && framesWritten == totalFrames;
                message = played
                    ? "Nada tes 440 Hz level rendah berhasil ditulis saat AudioTrack ter-route ke MG-30."
                    : "Rute USB berubah atau terputus saat tes. Pengiriman dihentikan.";
            }
        } catch (Exception error) {
            message = error.getMessage() == null ? "Tes output USB gagal." : error.getMessage();
        } finally {
            if (track != null) {
                try {
                    if (track.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) track.stop();
                } catch (Exception ignored) {
                    // Always release the native audio handle below.
                }
                track.release();
            }
        }

        result = new JSObject();
        result.put("played", played);
        result.put("requestedDeviceId", requestedId);
        result.put("requestedDeviceName", targetName);
        result.put("routedDeviceId", routedId);
        result.put("routedDeviceName", routedName);
        result.put("sampleRate", PROBE_SAMPLE_RATE);
        result.put("channelCount", PROBE_CHANNELS);
        result.put("encoding", AudioFormat.ENCODING_PCM_FLOAT);
        result.put("durationMs", PROBE_DURATION_MS);
        result.put("amplitude", PROBE_AMPLITUDE);
        result.put("framesWritten", framesWritten);
        result.put("message", message);
        call.resolve(result);
    }

    private static boolean isUsbOutput(AudioDeviceInfo device) {
        int type = device.getType();
        return type == AudioDeviceInfo.TYPE_USB_DEVICE
            || type == AudioDeviceInfo.TYPE_USB_ACCESSORY
            || (Build.VERSION.SDK_INT >= 26 && type == AudioDeviceInfo.TYPE_USB_HEADSET);
    }

    private static boolean isMg30ProductName(String productName) {
        String normalized = productName == null ? "" : productName.toLowerCase(Locale.ROOT);
        return normalized.contains("mg-30") || normalized.contains("nux");
    }

    private static String typeName(int type) {
        switch (type) {
            case AudioDeviceInfo.TYPE_USB_DEVICE: return "USB device output";
            case AudioDeviceInfo.TYPE_USB_HEADSET: return "USB headset output";
            case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER: return "Speaker bawaan";
            case AudioDeviceInfo.TYPE_WIRED_HEADPHONES: return "Headphone berkabel";
            case AudioDeviceInfo.TYPE_WIRED_HEADSET: return "Headset berkabel";
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP: return "Bluetooth A2DP";
            default: return "Audio output type " + type;
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
}
