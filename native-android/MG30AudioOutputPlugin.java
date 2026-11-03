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
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

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

    // Reamp playback is a separate file-backed AudioTrack path. It never touches
    // the existing AudioRecord plugin or its input-device selection.
    private static final int REAMP_SAMPLE_RATE = 48000;
    private static final int REAMP_CHANNELS = 2;
    private static final int REAMP_BYTES_PER_FRAME = 4; // stereo PCM16
    private static final int REAMP_MAX_CHUNK_BYTES = 192 * 1024;
    private static final long REAMP_MAX_FILE_BYTES =
        (long) REAMP_SAMPLE_RATE * REAMP_BYTES_PER_FRAME * 30 * 60;

    private final Map<String, ReampSession> reampSessions = new ConcurrentHashMap<>();

    private static final class ReampSession {
        final String id;
        final File file;
        final int deviceId;
        volatile String state = "uploading";
        volatile String error = "";
        volatile boolean stopRequested = false;
        volatile boolean started = false;
        volatile int framesWritten = 0;
        volatile long framesPlayed = 0;
        volatile long totalFrames = 0;
        volatile int routedDeviceId = -1;
        volatile String routedDeviceName = "";
        volatile AudioTrack track;
        volatile Thread worker;

        ReampSession(String id, File file, int deviceId) {
            this.id = id;
            this.file = file;
            this.deviceId = deviceId;
        }
    }

    @PluginMethod
    public void beginReampPlayback(PluginCall call) {
        Integer deviceId = call.getInt("deviceId");
        Integer sampleRate = call.getInt("sampleRate", REAMP_SAMPLE_RATE);
        Integer channels = call.getInt("channelCount", REAMP_CHANNELS);
        if (deviceId == null || deviceId < 0) {
            call.reject("Pilih endpoint USB MG-30 sebelum menyiapkan Reamp.");
            return;
        }
        if (sampleRate != REAMP_SAMPLE_RATE || channels != REAMP_CHANNELS) {
            call.reject("Jalur Reamp saat ini hanya menerima PCM stereo 48 kHz.");
            return;
        }
        for (ReampSession existing : reampSessions.values()) {
            if ("playing".equals(existing.state) || "uploading".equals(existing.state) || "ready".equals(existing.state)) {
                call.reject("Sesi Reamp lain masih aktif. Hentikan atau selesaikan sesi itu terlebih dahulu.");
                return;
            }
        }
        AudioDeviceInfo target = findMg30Output(deviceId);
        if (target == null) {
            call.reject("Endpoint USB MG-30 tidak tersedia. Periksa ulang USB OUT.");
            return;
        }
        try {
            File directory = new File(getContext().getCacheDir(), "mg30-reamp-playback");
            if (!directory.exists() && !directory.mkdirs()) {
                call.reject("Folder sementara Reamp tidak dapat dibuat.");
                return;
            }
            String sessionId = UUID.randomUUID().toString();
            File targetFile = new File(directory, "reamp-" + sessionId + ".pcm");
            if (!targetFile.createNewFile()) {
                call.reject("File sementara Reamp tidak dapat dibuat.");
                return;
            }
            ReampSession session = new ReampSession(sessionId, targetFile, deviceId);
            reampSessions.put(sessionId, session);
            JSObject result = new JSObject();
            result.put("sessionId", sessionId);
            result.put("ready", true);
            result.put("sampleRate", REAMP_SAMPLE_RATE);
            result.put("channelCount", REAMP_CHANNELS);
            result.put("encoding", "PCM_16BIT_LE");
            result.put("targetDeviceId", deviceId);
            result.put("targetDeviceName", target.getProductName() == null ? "NUX MG-30" : target.getProductName().toString());
            call.resolve(result);
        } catch (IOException error) {
            call.reject("Tidak dapat menyiapkan file Reamp: " + error.getMessage());
        }
    }

    @PluginMethod
    public void appendReampPlaybackChunk(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String encoded = call.getString("dataBase64");
        ReampSession session = reampSessions.get(sessionId);
        if (session == null || session.started || !"uploading".equals(session.state)) {
            call.reject("Sesi upload Reamp tidak valid atau sudah dimulai.");
            return;
        }
        if (encoded == null || encoded.isEmpty() || encoded.length() > 4 * REAMP_MAX_CHUNK_BYTES / 3 + 16) {
            call.reject("Chunk audio Reamp kosong atau melebihi batas bridge.");
            return;
        }
        try {
            byte[] bytes = android.util.Base64.decode(encoded, android.util.Base64.DEFAULT);
            if (bytes.length == 0 || bytes.length > REAMP_MAX_CHUNK_BYTES ||
                bytes.length % REAMP_BYTES_PER_FRAME != 0) {
                call.reject("Chunk Reamp harus berisi frame PCM16 stereo lengkap.");
                return;
            }
            synchronized (session) {
                if (session.started || !"uploading".equals(session.state)) {
                    call.reject("Sesi Reamp sudah tidak menerima data.");
                    return;
                }
                long nextLength = session.file.length() + bytes.length;
                if (nextLength > REAMP_MAX_FILE_BYTES) {
                    call.reject("Track Reamp melebihi batas aman 30 menit.");
                    return;
                }
                try (FileOutputStream output = new FileOutputStream(session.file, true)) {
                    output.write(bytes);
                    output.flush();
                }
                JSObject result = new JSObject();
                result.put("writtenBytes", bytes.length);
                result.put("totalBytes", nextLength);
                call.resolve(result);
            }
        } catch (IllegalArgumentException | IOException error) {
            call.reject("Gagal menulis data audio Reamp: " + error.getMessage());
        }
    }

    @PluginMethod
    public void startReampPlayback(PluginCall call) {
        String sessionId = call.getString("sessionId");
        ReampSession session = reampSessions.get(sessionId);
        if (session == null || session.started || !"uploading".equals(session.state) ||
            !session.file.isFile() || session.file.length() < REAMP_BYTES_PER_FRAME ||
            session.file.length() % REAMP_BYTES_PER_FRAME != 0) {
            call.reject("File PCM Reamp belum lengkap atau sesi tidak valid.");
            return;
        }
        AudioDeviceInfo target = findMg30Output(session.deviceId);
        if (target == null) {
            call.reject("Endpoint MG-30 terputus sebelum playback Reamp dimulai.");
            return;
        }

        AudioTrack track = null;
        try {
            int minBuffer = AudioTrack.getMinBufferSize(
                REAMP_SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_STEREO,
                AudioFormat.ENCODING_PCM_16BIT
            );
            if (minBuffer <= 0) {
                throw new IllegalStateException("Android menolak buffer PCM16 stereo 48 kHz (" + minBuffer + ").");
            }
            AudioFormat format = new AudioFormat.Builder()
                .setSampleRate(REAMP_SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .build();
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            track = new AudioTrack.Builder()
                .setAudioAttributes(attributes)
                .setAudioFormat(format)
                .setBufferSizeInBytes(Math.max(minBuffer * 2, REAMP_SAMPLE_RATE * REAMP_BYTES_PER_FRAME / 2))
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build();
            if (track.getState() != AudioTrack.STATE_INITIALIZED) {
                throw new IllegalStateException("AudioTrack PCM16 Reamp gagal diinisialisasi.");
            }
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N || !track.setPreferredDevice(target)) {
                throw new IllegalStateException("Android menolak rute langsung ke USB MG-30.");
            }

            track.play();
            AudioDeviceInfo routed = null;
            long deadline = SystemClock.elapsedRealtime() + 1200;
            while (SystemClock.elapsedRealtime() < deadline) {
                routed = track.getRoutedDevice();
                if (routed != null) break;
                SystemClock.sleep(35);
            }
            if (routed == null || routed.getId() != session.deviceId) {
                try { track.stop(); } catch (Exception ignored) {}
                track.release();
                call.reject("Rute aktual AudioTrack tidak cocok dengan MG-30. Tidak ada frame DI yang dikirim.");
                return;
            }

            session.track = track;
            session.routedDeviceId = routed.getId();
            session.routedDeviceName = routed.getProductName() == null ? "" : routed.getProductName().toString();
            session.totalFrames = session.file.length() / REAMP_BYTES_PER_FRAME;
            session.started = true;
            session.state = "playing";

            final AudioTrack playbackTrack = track;
            session.worker = new Thread(() -> runReampPlayback(session, playbackTrack), "MG30-Reamp-Playback");
            session.worker.start();

            JSObject result = new JSObject();
            result.put("started", true);
            result.put("sessionId", session.id);
            result.put("routedDeviceId", session.routedDeviceId);
            result.put("routedDeviceName", session.routedDeviceName);
            result.put("sampleRate", REAMP_SAMPLE_RATE);
            result.put("channelCount", REAMP_CHANNELS);
            result.put("totalFrames", session.totalFrames);
            result.put("durationSeconds", (double) session.totalFrames / REAMP_SAMPLE_RATE);
            call.resolve(result);
        } catch (Exception error) {
            if (track != null) {
                try { track.stop(); } catch (Exception ignored) {}
                track.release();
            }
            session.state = "error";
            session.error = error.getMessage() == null ? "AudioTrack Reamp gagal dimulai." : error.getMessage();
            call.reject(session.error);
        }
    }

    private void runReampPlayback(ReampSession session, AudioTrack track) {
        byte[] buffer = new byte[16 * 1024];
        try (FileInputStream input = new FileInputStream(session.file)) {
            int read;
            while (!session.stopRequested && (read = input.read(buffer)) != -1) {
                if (read == 0) continue;
                AudioDeviceInfo current = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N ? track.getRoutedDevice() : null;
                if (current == null || current.getId() != session.deviceId) {
                    throw new IOException("Rute USB berubah selama Reamp. Pengiriman dihentikan.");
                }
                int offset = 0;
                while (offset < read && !session.stopRequested) {
                    int written = track.write(buffer, offset, read - offset, AudioTrack.WRITE_BLOCKING);
                    if (written < 0) throw new IOException("AudioTrack.write Reamp gagal: " + written);
                    if (written == 0) throw new IOException("AudioTrack tidak menerima data Reamp.");
                    offset += written;
                    session.framesWritten += written / REAMP_BYTES_PER_FRAME;
                }
            }

            if (!session.stopRequested) {
                long drainDeadline = SystemClock.elapsedRealtime() + 5000;
                while (SystemClock.elapsedRealtime() < drainDeadline) {
                    session.framesPlayed = Integer.toUnsignedLong(track.getPlaybackHeadPosition());
                    if (session.framesPlayed >= session.totalFrames) break;
                    if (session.stopRequested) break;
                    SystemClock.sleep(12);
                }
                if (!session.stopRequested && session.framesPlayed + 1024 < session.totalFrames) {
                    throw new IOException("Playback Reamp berhenti sebelum seluruh frame selesai diputar.");
                }
                if (!session.stopRequested) {
                    session.framesPlayed = session.totalFrames;
                    session.state = "completed";
                }
            } else {
                session.state = "stopped";
            }
        } catch (Exception error) {
            if (session.stopRequested) session.state = "stopped";
            else {
                session.state = "error";
                session.error = error.getMessage() == null ? "Playback Reamp gagal." : error.getMessage();
            }
        } finally {
            session.framesPlayed = Math.max(session.framesPlayed,
                track == null ? 0 : Integer.toUnsignedLong(track.getPlaybackHeadPosition()));
            try { if (track.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) track.stop(); } catch (Exception ignored) {}
            track.release();
            session.track = null;
        }
    }

    @PluginMethod
    public void getReampPlaybackStatus(PluginCall call) {
        String sessionId = call.getString("sessionId");
        ReampSession session = reampSessions.get(sessionId);
        if (session == null) {
            call.reject("Sesi playback Reamp tidak ditemukan.");
            return;
        }
        AudioTrack track = session.track;
        if (track != null) {
            try {
                session.framesPlayed = Integer.toUnsignedLong(track.getPlaybackHeadPosition());
            } catch (Exception ignored) {}
        }
        JSObject result = new JSObject();
        result.put("sessionId", session.id);
        result.put("state", session.state);
        result.put("error", session.error);
        result.put("framesWritten", session.framesWritten);
        result.put("framesPlayed", session.framesPlayed);
        result.put("totalFrames", session.totalFrames);
        result.put("progress", session.totalFrames > 0
            ? Math.min(1.0, (double) session.framesPlayed / session.totalFrames) : 0.0);
        result.put("routedDeviceId", session.routedDeviceId);
        result.put("routedDeviceName", session.routedDeviceName);
        call.resolve(result);
    }

    @PluginMethod
    public void stopReampPlayback(PluginCall call) {
        String sessionId = call.getString("sessionId");
        ReampSession session = reampSessions.get(sessionId);
        if (session == null) {
            JSObject result = new JSObject();
            result.put("stopped", true);
            call.resolve(result);
            return;
        }
        session.stopRequested = true;
        AudioTrack track = session.track;
        if (track != null) {
            try { track.pause(); } catch (Exception ignored) {}
            try { track.flush(); } catch (Exception ignored) {}
            try { track.stop(); } catch (Exception ignored) {}
        }
        Thread worker = session.worker;
        if (worker != null) worker.interrupt();
        session.state = "stopping";
        JSObject result = new JSObject();
        result.put("stopped", true);
        result.put("sessionId", session.id);
        call.resolve(result);
    }

    @PluginMethod
    public void releaseReampPlayback(PluginCall call) {
        String sessionId = call.getString("sessionId");
        ReampSession session = reampSessions.remove(sessionId);
        if (session != null) {
            if (session.track != null || session.worker != null && session.worker.isAlive()) {
                session.stopRequested = true;
                AudioTrack track = session.track;
                if (track != null) {
                    try { track.stop(); } catch (Exception ignored) {}
                }
                reampSessions.put(session.id, session);
                call.reject("Playback Reamp masih membersihkan AudioTrack; coba release setelah status berhenti.");
                return;
            }
            if (session.file.exists()) session.file.delete();
        }
        JSObject result = new JSObject();
        result.put("released", true);
        call.resolve(result);
    }

    private AudioDeviceInfo findMg30Output(int deviceId) {
        AudioManager manager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (manager == null) return null;
        for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
            String name = device.getProductName() == null ? "" : device.getProductName().toString();
            if (device.getId() == deviceId && isUsbOutput(device) && isMg30ProductName(name)) return device;
        }
        return null;
    }

}
