package com.vaivaii.mg30studio;

import android.Manifest;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.RectF;
import android.graphics.SurfaceTexture;
import android.graphics.drawable.GradientDrawable;
import android.hardware.camera2.*;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.MediaRecorder;
import android.os.Environment;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Range;
import android.util.Size;
import android.view.Gravity;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.TextView;
import android.widget.Toast;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name="MG30Camera", permissions={
    @Permission(alias="camera", strings={Manifest.permission.CAMERA})
})
public class MG30CameraPlugin extends Plugin implements TextureView.SurfaceTextureListener {
    private static final int INK = Color.rgb(11,16,18);
    private static final int PANEL = Color.rgb(22,29,32);
    private static final int LIME = Color.rgb(197,243,107);
    private static final int MUTED = Color.rgb(158,172,173);
    private static final int RED = Color.rgb(244,83,75);

    private CameraManager manager;
    private HandlerThread cameraThread;
    private Handler handler;
    private CameraDevice device;
    private CameraCaptureSession session;
    private CameraCharacteristics characteristics;
    private TextureView texture;
    private FrameLayout activityRoot;
    private FrameLayout cameraRoot;
    private LinearLayout topBar;
    private LinearLayout bottomPanel;
    private TextView resolutionLabel;
    private TextView timerLabel;
    private TextView processingLabel;
    private TextView lensLabel;
    private Button recordButton;
    private Button stopButton;
    private Surface previewSurface;
    private Surface encoderSurface;
    private MediaRecorder recorder;
    private PluginCall pendingOpen;

    private String cameraId;
    private boolean requestedFront;
    private boolean actualFront;
    private boolean opening;
    private boolean recording;
    private boolean closeInProgress;
    private long recordStartedAt;
    private File activeVideoFile;
    private Size[] availableVideoSizes = new Size[0];
    private Size currentVideoSize = new Size(1280, 720);
    private Size currentPreviewSize = new Size(1280, 720);
    private int displayRotationDegrees;
    private String lastProcessingKey = "";
    private boolean nrOffSupported;
    private boolean edgeOffSupported;
    private final Runnable timerTick = new Runnable() {
        @Override public void run() {
            if (timerLabel != null && recording) {
                long seconds = Math.max(0, (System.currentTimeMillis() - recordStartedAt) / 1000);
                timerLabel.setText(String.format(Locale.US, "%02d:%02d", seconds / 60, seconds % 60));
                if (handler != null) handler.postDelayed(this, 250);
            }
        }
    };

    @Override public void load() {
        super.load();
        manager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
        cameraThread = new HandlerThread("MG30-Camera2");
        cameraThread.start();
        handler = new Handler(cameraThread.getLooper());
    }

    @PluginMethod public void listCameras(PluginCall call) {
        try {
            JSArray result = new JSArray();
            for (String id : manager.getCameraIdList()) {
                CameraCharacteristics c = manager.getCameraCharacteristics(id);
                Integer f = c.get(CameraCharacteristics.LENS_FACING);
                JSObject item = new JSObject();
                item.put("id", id);
                item.put("facing", f != null && f == CameraCharacteristics.LENS_FACING_FRONT ? "front" : "back");
                item.put("noiseReductionOffSupported", has(c.get(CameraCharacteristics.NOISE_REDUCTION_AVAILABLE_NOISE_REDUCTION_MODES), CaptureRequest.NOISE_REDUCTION_MODE_OFF));
                item.put("edgeOffSupported", has(c.get(CameraCharacteristics.EDGE_AVAILABLE_EDGE_MODES), CaptureRequest.EDGE_MODE_OFF));
                result.put(item);
            }
            JSObject out = new JSObject(); out.put("cameras", result); call.resolve(out);
        } catch (Exception e) { call.reject("Gagal membaca kamera: " + message(e)); }
    }

    @PluginMethod public void openPreview(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionResult");
            return;
        }
        openGranted(call);
    }

    @PermissionCallback private void cameraPermissionResult(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) openGranted(call);
        else call.reject("Izin kamera tidak diberikan.");
    }

    private void openGranted(PluginCall call) {
        if (recording || device != null || opening) { call.reject("Kamera sudah aktif."); return; }
        requestedFront = "front".equalsIgnoreCase(call.getString("facing", "back"));
        pendingOpen = call;
        lastProcessingKey = "";
        getActivity().runOnUiThread(() -> {
            try {
                attachFullScreenCameraUi();
                if (texture.isAvailable()) onSurfaceTextureAvailable(texture.getSurfaceTexture(), texture.getWidth(), texture.getHeight());
            } catch (Exception e) {
                rejectOpen("Tidak dapat menyiapkan UI kamera: " + message(e));
                closeAll();
            }
        });
    }

    @PluginMethod public void updatePreviewBounds(PluginCall call) {
        // Native camera mode owns the full content area, so the HTML card bounds are intentionally ignored.
        getActivity().runOnUiThread(this::layoutFullScreen);
        JSObject out = new JSObject(); out.put("updated", true); out.put("fullScreen", true); call.resolve(out);
    }

    @PluginMethod public void updateUiState(PluginCall call) {
        boolean isRecording = call.getBoolean("recording", recording);
        getActivity().runOnUiThread(() -> applyRecordingUiState(isRecording));
        JSObject out = new JSObject(); out.put("updated", true); call.resolve(out);
    }

    private void attachFullScreenCameraUi() {
        if (cameraRoot != null) return;
        View content = getActivity().findViewById(android.R.id.content);
        if (!(content instanceof FrameLayout)) throw new IllegalStateException("Kontainer aplikasi Android tidak tersedia.");
        activityRoot = (FrameLayout) content;

        cameraRoot = new FrameLayout(getContext());
        cameraRoot.setBackgroundColor(Color.BLACK);
        FrameLayout.LayoutParams rootParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
        activityRoot.addView(cameraRoot, rootParams);

        texture = new TextureView(getContext());
        texture.setSurfaceTextureListener(this);
        texture.setOpaque(true);
        FrameLayout.LayoutParams textureParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
        cameraRoot.addView(texture, textureParams);

        buildTopBar();
        buildBottomControls();
        layoutFullScreen();
    }

    private void buildTopBar() {
        topBar = new LinearLayout(getContext());
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setPadding(dp(14), dp(12), dp(14), dp(12));
        topBar.setBackgroundColor(0xB8090D0F);

        Button close = iconButton("×", 48);
        close.setContentDescription("Tutup kamera");
        close.setOnClickListener(v -> dispatchAction("close"));
        topBar.addView(close, new LinearLayout.LayoutParams(dp(48), dp(48)));

        LinearLayout titleStack = new LinearLayout(getContext());
        titleStack.setOrientation(LinearLayout.VERTICAL);
        titleStack.setPadding(dp(12), 0, dp(8), 0);
        TextView title = text("MG30 CAMERA", 13, Color.WHITE, true);
        TextView subtitle = text("NUX MG-30 · VIDEO", 9, MUTED, true);
        subtitle.setLetterSpacing(0.12f);
        titleStack.addView(title);
        titleStack.addView(subtitle);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, -2, 1f);
        topBar.addView(titleStack, titleParams);

        resolutionLabel = textButton("1080p  ▾", LIME, PANEL);
        resolutionLabel.setContentDescription("Pilih resolusi video");
        resolutionLabel.setOnClickListener(this::showResolutionMenu);
        topBar.addView(resolutionLabel, new LinearLayout.LayoutParams(-2, dp(42)));

        Button settings = iconButton("⋮", 44);
        settings.setContentDescription("Pengaturan kamera");
        settings.setOnClickListener(this::showCameraMenu);
        LinearLayout.LayoutParams settingsParams = new LinearLayout.LayoutParams(dp(44), dp(44));
        settingsParams.leftMargin = dp(6);
        topBar.addView(settings, settingsParams);

        FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(-1, -2, Gravity.TOP);
        cameraRoot.addView(topBar, p);
    }

    private void buildBottomControls() {
        bottomPanel = new LinearLayout(getContext());
        bottomPanel.setOrientation(LinearLayout.VERTICAL);
        bottomPanel.setPadding(dp(18), dp(16), dp(18), dp(20));
        bottomPanel.setBackgroundColor(0xD9090D0F);

        processingLabel = text("NR OFF  ·  EDGE OFF", 10, LIME, true);
        processingLabel.setGravity(Gravity.CENTER);
        processingLabel.setPadding(dp(8), dp(6), dp(8), dp(6));
        processingLabel.setBackground(roundBg(0x241D2B18, 0x665E813B, 12));
        bottomPanel.addView(processingLabel, new LinearLayout.LayoutParams(-1, dp(31)));

        LinearLayout status = new LinearLayout(getContext());
        status.setGravity(Gravity.CENTER_VERTICAL);
        status.setPadding(0, dp(14), 0, dp(13));

        lensLabel = text(actualFront ? "KAMERA DEPAN" : "KAMERA BELAKANG", 10, MUTED, true);
        lensLabel.setLetterSpacing(0.08f);
        status.addView(lensLabel, new LinearLayout.LayoutParams(0, -2, 1f));

        timerLabel = text("00:00", 22, Color.WHITE, true);
        timerLabel.setGravity(Gravity.CENTER);
        status.addView(timerLabel, new LinearLayout.LayoutParams(-2, -2));
        status.addView(text("  DURASI", 9, MUTED, true));
        bottomPanel.addView(status);

        LinearLayout controls = new LinearLayout(getContext());
        controls.setGravity(Gravity.CENTER_VERTICAL);
        controls.setOrientation(LinearLayout.HORIZONTAL);

        Button switchLens = iconButton("↻", 54);
        switchLens.setTextSize(24);
        switchLens.setContentDescription("Ganti kamera depan atau belakang");
        switchLens.setOnClickListener(v -> dispatchAction("switch"));
        controls.addView(switchLens, new LinearLayout.LayoutParams(dp(58), dp(58)));

        LinearLayout spacer = new LinearLayout(getContext());
        controls.addView(spacer, new LinearLayout.LayoutParams(0, 1, 1f));

        recordButton = iconButton("●", 80);
        recordButton.setTextSize(32);
        recordButton.setTextColor(Color.WHITE);
        recordButton.setBackground(roundBg(RED, RED, 50));
        recordButton.setContentDescription("Rekam video");
        recordButton.setOnClickListener(v -> dispatchAction("record"));
        controls.addView(recordButton, new LinearLayout.LayoutParams(dp(80), dp(80)));

        LinearLayout spacer2 = new LinearLayout(getContext());
        controls.addView(spacer2, new LinearLayout.LayoutParams(0, 1, 1f));

        stopButton = iconButton("■", 58);
        stopButton.setTextSize(20);
        stopButton.setContentDescription("Stop dan simpan video");
        stopButton.setOnClickListener(v -> dispatchAction("stop"));
        controls.addView(stopButton, new LinearLayout.LayoutParams(dp(58), dp(58)));
        bottomPanel.addView(controls);

        TextView hint = text("Video only  ·  Sumber gitar USB tersimpan terpisah", 9, MUTED, false);
        hint.setGravity(Gravity.CENTER);
        hint.setPadding(0, dp(13), 0, 0);
        bottomPanel.addView(hint);

        FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        cameraRoot.addView(bottomPanel, p);
        applyRecordingUiState(false);
    }

    private void showResolutionMenu(View anchor) {
        if (recording) {
            Toast.makeText(getContext(), "Hentikan rekaman sebelum mengubah resolusi.", Toast.LENGTH_SHORT).show();
            return;
        }
        PopupMenu menu = new PopupMenu(getContext(), anchor);
        for (int i = 0; i < availableVideoSizes.length; i++) {
            Size s = availableVideoSizes[i];
            String label = resolutionLabel(s) + "  ·  " + s.getWidth() + "×" + s.getHeight();
            menu.getMenu().add(0, i, i, label);
        }
        if (availableVideoSizes.length == 0) {
            menu.getMenu().add("Resolusi perangkat tidak tersedia").setEnabled(false);
        }
        menu.setOnMenuItemClickListener(item -> {
            int index = item.getItemId();
            if (index >= 0 && index < availableVideoSizes.length) selectResolution(availableVideoSizes[index]);
            return true;
        });
        menu.show();
    }

    private void showCameraMenu(View anchor) {
        PopupMenu menu = new PopupMenu(getContext(), anchor);
        menu.getMenu().add("Processing natural · NR OFF / Edge OFF").setOnMenuItemClickListener(item -> {
            showProcessingDialog();
            return true;
        });
        menu.getMenu().add("Info kamera").setOnMenuItemClickListener(item -> {
            showCameraInfo();
            return true;
        });
        menu.getMenu().add("Kembali ke Studio").setOnMenuItemClickListener(item -> {
            dispatchAction("close");
            return true;
        });
        menu.show();
    }

    private void showProcessingDialog() {
        String nr = nrOffSupported ? "Noise reduction: OFF diminta, hasil CaptureResult akan diperiksa." : "Noise reduction OFF tidak didukung lensa ini.";
        String edge = edgeOffSupported ? "Edge sharpening: OFF diminta, hasil CaptureResult akan diperiksa." : "Edge OFF tidak didukung lensa ini.";
        new android.app.AlertDialog.Builder(getContext())
            .setTitle("Pemrosesan gambar")
            .setMessage(nr + "\n\n" + edge + "\n\nPemrosesan tetap pada ISP/encoder produsen mungkin tidak dapat dimatikan.")
            .setPositiveButton("OK", null)
            .show();
    }

    private void showCameraInfo() {
        String lens = actualFront ? "Depan" : "Belakang";
        String text = "Lensa: " + lens + "\nVideo: " + currentVideoSize.getWidth() + "×" + currentVideoSize.getHeight() +
            "\nCamera2 NR OFF: " + (nrOffSupported ? "didukung" : "tidak didukung") +
            "\nCamera2 Edge OFF: " + (edgeOffSupported ? "didukung" : "tidak didukung");
        new android.app.AlertDialog.Builder(getContext()).setTitle("MG30 Camera").setMessage(text).setPositiveButton("OK", null).show();
    }

    private Button iconButton(String label, int sizeDp) {
        Button b = new Button(getContext());
        b.setText(label);
        b.setAllCaps(false);
        b.setTextColor(Color.WHITE);
        b.setTextSize(18);
        b.setPadding(0, 0, 0, 0);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setBackground(roundBg(0x8B1A2225, 0xAA536065, sizeDp / 2));
        return b;
    }

    private TextView textButton(String label, int fg, int bg) {
        TextView b = text(label, 12, fg, true);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(12), 0, dp(12), 0);
        b.setBackground(roundBg(bg, 0x775A753C, 22));
        return b;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView t = new TextView(getContext());
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER_VERTICAL);
        if (bold) t.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        return t;
    }

    private GradientDrawable roundBg(int color, int strokeColor, int radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radiusDp));
        if (strokeColor != Color.TRANSPARENT) d.setStroke(dp(1), strokeColor);
        return d;
    }

    private int dp(int value) {
        return Math.round(value * getContext().getResources().getDisplayMetrics().density);
    }

    private void dispatchAction(String action) {
        JSObject out = new JSObject();
        out.put("action", action);
        notifyListeners("cameraAction", out);
    }

    private void applyRecordingUiState(boolean isRecording) {
        if (recordButton != null) {
            recordButton.setEnabled(!isRecording);
            recordButton.setAlpha(isRecording ? 0.4f : 1f);
            recordButton.setText(isRecording ? "●" : "●");
            recordButton.setBackground(roundBg(isRecording ? 0xFF771C1C : RED, RED, 50));
        }
        if (stopButton != null) {
            stopButton.setEnabled(isRecording);
            stopButton.setAlpha(isRecording ? 1f : 0.4f);
        }
        if (lensLabel != null) lensLabel.setText(actualFront ? "KAMERA DEPAN" : "KAMERA BELAKANG");
        if (resolutionLabel != null && currentVideoSize != null) resolutionLabel.setText(resolutionLabel(currentVideoSize) + "  ▾");
    }

    private void selectResolution(Size picked) {
        if (recording || picked == null || picked.equals(currentVideoSize)) return;
        currentVideoSize = picked;
        StreamConfigurationMap map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
        currentPreviewSize = choosePreviewSize(map == null ? null : map.getOutputSizes(SurfaceTexture.class), picked);
        try {
            if (session != null) { try { session.stopRepeating(); } catch (Exception ignored) {} session.close(); session = null; }
            if (texture != null && texture.isAvailable()) texture.getSurfaceTexture().setDefaultBufferSize(currentPreviewSize.getWidth(), currentPreviewSize.getHeight());
            configureTransform(texture == null ? 0 : texture.getWidth(), texture == null ? 0 : texture.getHeight());
            if (resolutionLabel != null) resolutionLabel.setText(resolutionLabel(picked) + "  ▾");
            configure(false, null);
            Toast.makeText(getContext(), "Resolusi " + picked.getWidth() + "×" + picked.getHeight(), Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(getContext(), "Gagal mengubah resolusi: " + message(e), Toast.LENGTH_LONG).show();
        }
    }

    private String resolutionLabel(Size size) {
        int h = size.getHeight();
        if (h >= 2160) return "4K";
        if (h >= 1440) return "1440p";
        if (h >= 1080) return "1080p";
        if (h >= 720) return "720p";
        if (h >= 480) return "480p";
        return h + "p";
    }

    @Override public void onSurfaceTextureAvailable(SurfaceTexture surfaceTexture, int w, int h) {
        if (device != null || opening || manager == null) return;
        try { openSelectedCamera(); } catch (Exception e) {
            rejectOpen("Kamera gagal dibuka: " + message(e));
            closeAll();
        }
    }

    private void openSelectedCamera() throws Exception {
        String chosen = null, fallback = null;
        for (String id : manager.getCameraIdList()) {
            CameraCharacteristics c = manager.getCameraCharacteristics(id);
            Integer facing = c.get(CameraCharacteristics.LENS_FACING);
            boolean isFront = facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT;
            if (fallback == null) fallback = id;
            if (isFront == requestedFront) { chosen = id; break; }
        }
        if (chosen == null) chosen = fallback;
        if (chosen == null) throw new IllegalStateException("Tidak ada kamera yang tersedia.");
        cameraId = chosen;
        characteristics = manager.getCameraCharacteristics(chosen);
        Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
        actualFront = facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT;
        nrOffSupported = has(characteristics.get(CameraCharacteristics.NOISE_REDUCTION_AVAILABLE_NOISE_REDUCTION_MODES), CaptureRequest.NOISE_REDUCTION_MODE_OFF);
        edgeOffSupported = has(characteristics.get(CameraCharacteristics.EDGE_AVAILABLE_EDGE_MODES), CaptureRequest.EDGE_MODE_OFF);

        StreamConfigurationMap map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
        if (map == null) throw new IllegalStateException("Kamera tidak menyediakan stream Camera2.");
        availableVideoSizes = filterVideoSizes(map.getOutputSizes(MediaRecorder.class));
        if (availableVideoSizes.length == 0) throw new IllegalStateException("Kamera tidak menyediakan format video MediaRecorder.");
        currentVideoSize = chooseDefaultVideoSize(availableVideoSizes);
        currentPreviewSize = choosePreviewSize(map.getOutputSizes(SurfaceTexture.class), currentVideoSize);
        texture.getSurfaceTexture().setDefaultBufferSize(currentPreviewSize.getWidth(), currentPreviewSize.getHeight());
        previewSurface = new Surface(texture.getSurfaceTexture());
        configureTransform(texture.getWidth(), texture.getHeight());
        if (resolutionLabel != null) resolutionLabel.setText(resolutionLabel(currentVideoSize) + "  ▾");
        if (processingLabel != null) processingLabel.setText("NR " + (nrOffSupported ? "OFF" : "—") + "  ·  EDGE " + (edgeOffSupported ? "OFF" : "—"));
        opening = true;
        manager.openCamera(chosen, new CameraDevice.StateCallback() {
            @Override public void onOpened(CameraDevice camera) { opening = false; device = camera; configure(false, null); }
            @Override public void onDisconnected(CameraDevice camera) {
                opening = false; camera.close(); if (device == camera) device = null;
                notifyListeners("cameraError", event("Kamera terputus."));
                rejectOpen("Kamera terputus.");
                if (!recording) closeAll();
            }
            @Override public void onError(CameraDevice camera, int error) {
                opening = false; camera.close(); if (device == camera) device = null;
                notifyListeners("cameraError", event("Camera2 error " + error + "."));
                rejectOpen("Camera2 error " + error + ".");
                closeAll();
            }
        }, handler);
    }

    private Size[] filterVideoSizes(Size[] input) {
        if (input == null || input.length == 0) return new Size[0];
        List<Size> list = new ArrayList<>();
        for (Size s : input) {
            if (s.getWidth() < 640 || s.getHeight() < 360) continue;
            double ratio = s.getWidth() / (double) s.getHeight();
            if (Math.abs(ratio - 16.0 / 9.0) < 0.07) list.add(s);
        }
        if (list.isEmpty()) for (Size s : input) if (s.getWidth() >= 640 && s.getHeight() >= 360) list.add(s);
        Collections.sort(list, (a,b) -> {
            long aa = (long)a.getWidth()*a.getHeight(), bb=(long)b.getWidth()*b.getHeight();
            return Long.compare(aa, bb);
        });
        // The picker offers a concise range, only where actual stream sizes exist.
        List<Size> concise = new ArrayList<>();
        int[] targets = new int[]{480, 720, 1080, 1440, 2160};
        for (int target : targets) {
            Size best = null;
            for (Size s : list) {
                if (s.getHeight() == target) { best = s; break; }
            }
            if (best == null) {
                for (Size s : list) {
                    if (s.getHeight() >= target && s.getHeight() <= target + 120) { best = s; break; }
                }
            }
            if (best == null && target == 480 && !list.isEmpty()) best = list.get(0);
            if (best != null && !concise.contains(best)) concise.add(best);
        }
        if (concise.isEmpty()) concise.add(list.get(list.size()-1));
        return concise.toArray(new Size[0]);
    }

    private Size chooseDefaultVideoSize(Size[] sizes) {
        Size best = null;
        for (Size s : sizes) if (s.getHeight() <= 1080 && (best == null || s.getHeight() > best.getHeight())) best = s;
        return best == null ? sizes[sizes.length - 1] : best;
    }

    private Size choosePreviewSize(Size[] sizes, Size video) {
        if (sizes == null || sizes.length == 0) return video;
        double ratio = video.getWidth() / (double) video.getHeight();
        Size best = null; double score = Double.MAX_VALUE;
        for (Size s : sizes) {
            double r = Math.abs(s.getWidth() / (double) s.getHeight() - ratio);
            long areaDiff = Math.abs((long)s.getWidth()*s.getHeight() - (long)video.getWidth()*video.getHeight());
            double v = r * 100000 + areaDiff / 1000.0;
            if (v < score) { score = v; best = s; }
        }
        return best == null ? video : best;
    }

    @PluginMethod public void startRecording(PluginCall call) {
        if (device == null || previewSurface == null || recording) { call.reject("Aktifkan kamera sebelum merekam."); return; }
        try {
            String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            activeVideoFile = new File(videoDirectory(), "MG30_Video_" + stamp + ".mp4");
            recorder = new MediaRecorder();
            recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setOutputFile(activeVideoFile.getAbsolutePath());
            recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
            recorder.setVideoSize(currentVideoSize.getWidth(), currentVideoSize.getHeight());
            recorder.setVideoFrameRate(30);
            recorder.setVideoEncodingBitRate(currentVideoSize.getWidth() * (long)currentVideoSize.getHeight() >= 2073600 ? 12000000 : 8000000);
            recorder.setOrientationHint(orientationHint());
            recorder.prepare();
            encoderSurface = recorder.getSurface();
            if (session != null) { session.close(); session = null; }
            configure(true, call);
        } catch (Exception e) {
            releaseRecorder();
            if (activeVideoFile != null && activeVideoFile.exists() && activeVideoFile.length() == 0) activeVideoFile.delete();
            activeVideoFile = null;
            call.reject("Gagal menyiapkan video: " + message(e));
            configure(false, null);
        }
    }

    @PluginMethod public void stopRecording(PluginCall call) {
        if (!recording || recorder == null || activeVideoFile == null) { call.reject("Tidak ada rekaman aktif."); return; }
        try { JSObject result = finishFile(); configure(false, null); call.resolve(result); }
        catch (Exception e) { releaseRecorder(); recording = false; call.reject("Gagal menyimpan video: " + message(e)); configure(false, null); }
    }

    @PluginMethod public void closePreview(PluginCall call) {
        JSObject stopped = null;
        if (recording && recorder != null && activeVideoFile != null) {
            try { stopped = finishFile(); }
            catch (Exception e) { releaseRecorder(); recording = false; notifyListeners("cameraError", event("Rekaman berhenti: " + message(e))); }
        }
        closeAll();
        JSObject out = new JSObject(); out.put("closed", true);
        if (stopped != null) out.put("stoppedRecording", stopped);
        // Resolve only after the full-screen native overlay has been removed; this prevents
        // a rapid front/back switch from reusing a TextureView that is still being detached.
        getActivity().runOnUiThread(() -> call.resolve(out));
    }

    private void configure(boolean forRecording, PluginCall startCall) {
        if (device == null || previewSurface == null) { if (startCall != null) startCall.reject("Kamera belum siap."); return; }
        try {
            List<Surface> outputs = new ArrayList<>(); outputs.add(previewSurface);
            if (forRecording) { if (encoderSurface == null) throw new IllegalStateException("Encoder belum siap."); outputs.add(encoderSurface); }
            device.createCaptureSession(outputs, new CameraCaptureSession.StateCallback() {
                @Override public void onConfigured(CameraCaptureSession s) {
                    session = s;
                    try {
                        CaptureRequest.Builder b = device.createCaptureRequest(forRecording ? CameraDevice.TEMPLATE_RECORD : CameraDevice.TEMPLATE_PREVIEW);
                        b.addTarget(previewSurface);
                        if (forRecording) b.addTarget(encoderSurface);
                        applyControls(b);
                        s.setRepeatingRequest(b.build(), new CameraCaptureSession.CaptureCallback() {
                            @Override public void onCaptureCompleted(CameraCaptureSession ss, CaptureRequest req, TotalCaptureResult result) { publishModes(result, forRecording); }
                            @Override public void onCaptureFailed(CameraCaptureSession ss, CaptureRequest req, CaptureFailure failure) {
                                notifyListeners("cameraError", event("Capture Camera2 gagal: " + failure.getReason()));
                            }
                        }, handler);
                        if (forRecording) {
                            recorder.start(); recording = true; recordStartedAt = System.currentTimeMillis();
                            if (handler != null) handler.post(timerTick);
                            getActivity().runOnUiThread(() -> applyRecordingUiState(true));
                            JSObject out = cameraInfo(); out.put("recording", true);
                            out.put("fileName", activeVideoFile.getName()); out.put("videoWidth", currentVideoSize.getWidth()); out.put("videoHeight", currentVideoSize.getHeight());
                            startCall.resolve(out);
                        } else {
                            getActivity().runOnUiThread(() ->
                                configureTransform(texture == null ? 0 : texture.getWidth(), texture == null ? 0 : texture.getHeight()));
                            resolveOpenWhenReady();
                        }
                    } catch (Exception e) {
                        if (startCall != null) startCall.reject("Camera2 tidak dapat memulai capture: " + message(e));
                        rejectOpen(message(e)); notifyListeners("cameraError", event(message(e)));
                    }
                }
                @Override public void onConfigureFailed(CameraCaptureSession s) {
                    s.close(); if (startCall != null) startCall.reject("Konfigurasi sesi kamera gagal.");
                    rejectOpen("Preview tidak dapat dikonfigurasi.");
                }
            }, handler);
        } catch (Exception e) { if (startCall != null) startCall.reject(message(e)); rejectOpen(message(e)); }
    }

    private void resolveOpenWhenReady() {
        if (pendingOpen == null) return;
        PluginCall c = pendingOpen; pendingOpen = null;
        JSObject out = cameraInfo(); out.put("previewReady", true); out.put("fullScreen", true);
        c.resolve(out);
    }

    private void applyControls(CaptureRequest.Builder b) {
        int[] af = characteristics.get(CameraCharacteristics.CONTROL_AF_AVAILABLE_MODES);
        if (has(af, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_VIDEO)) b.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_VIDEO);
        else if (has(af, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)) b.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
        int[] ae = characteristics.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_MODES);
        if (has(ae, CaptureRequest.CONTROL_AE_MODE_ON)) b.set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON);
        int[] awb = characteristics.get(CameraCharacteristics.CONTROL_AWB_AVAILABLE_MODES);
        if (has(awb, CaptureRequest.CONTROL_AWB_MODE_AUTO)) b.set(CaptureRequest.CONTROL_AWB_MODE, CaptureRequest.CONTROL_AWB_MODE_AUTO);
        Range<Integer>[] ranges = characteristics.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES);
        if (ranges != null) {
            Range<Integer> best = null; int bestScore = Integer.MAX_VALUE;
            for (Range<Integer> r : ranges) if (r.getLower() <= 30 && r.getUpper() >= 30) {
                int score = Math.abs(r.getLower()-30)+Math.abs(r.getUpper()-30);
                if (score < bestScore) { best = r; bestScore = score; }
            }
            if (best != null) b.set(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, best);
        }
        if (has(characteristics.get(CameraCharacteristics.NOISE_REDUCTION_AVAILABLE_NOISE_REDUCTION_MODES), CaptureRequest.NOISE_REDUCTION_MODE_OFF))
            b.set(CaptureRequest.NOISE_REDUCTION_MODE, CaptureRequest.NOISE_REDUCTION_MODE_OFF);
        if (has(characteristics.get(CameraCharacteristics.EDGE_AVAILABLE_EDGE_MODES), CaptureRequest.EDGE_MODE_OFF))
            b.set(CaptureRequest.EDGE_MODE, CaptureRequest.EDGE_MODE_OFF);
        if (has(characteristics.get(CameraCharacteristics.COLOR_CORRECTION_AVAILABLE_ABERRATION_MODES), CaptureRequest.COLOR_CORRECTION_ABERRATION_MODE_OFF))
            b.set(CaptureRequest.COLOR_CORRECTION_ABERRATION_MODE, CaptureRequest.COLOR_CORRECTION_ABERRATION_MODE_OFF);
        if (android.os.Build.VERSION.SDK_INT >= 28 && has(characteristics.get(CameraCharacteristics.DISTORTION_CORRECTION_AVAILABLE_MODES), CaptureRequest.DISTORTION_CORRECTION_MODE_OFF))
            b.set(CaptureRequest.DISTORTION_CORRECTION_MODE, CaptureRequest.DISTORTION_CORRECTION_MODE_OFF);
    }

    private void publishModes(CaptureResult result, boolean isVideo) {
        Integer nr = result.get(CaptureResult.NOISE_REDUCTION_MODE), edge = result.get(CaptureResult.EDGE_MODE);
        String key = isVideo + ":" + nr + ":" + edge;
        if (key.equals(lastProcessingKey)) return;
        lastProcessingKey = key;
        JSObject out = new JSObject(); out.put("pipeline", isVideo ? "recording" : "preview");
        out.put("noiseReductionMode", nr); out.put("edgeMode", edge);
        out.put("noiseReductionOffSupported", nrOffSupported); out.put("edgeOffSupported", edgeOffSupported);
        out.put("noiseReductionStatus", nr == null ? "Tidak dapat diverifikasi" : nr == 0 ? "OFF diterapkan" : "Mode aktif: " + nr);
        out.put("edgeStatus", edge == null ? "Tidak dapat diverifikasi" : edge == 0 ? "OFF diterapkan" : "Mode aktif: " + edge);
        notifyListeners("processingStatus", out);
        if (processingLabel != null) {
            final String label = "NR " + (nr == null ? "?" : nr == 0 ? "OFF" : "ON") + "  ·  EDGE " + (edge == null ? "?" : edge == 0 ? "OFF" : "ON");
            getActivity().runOnUiThread(() -> processingLabel.setText(label));
        }
    }

    private JSObject cameraInfo() {
        JSObject out = new JSObject();
        out.put("cameraId", cameraId == null ? "" : cameraId); out.put("facing", actualFront ? "front" : "back");
        out.put("noiseReductionOffSupported", nrOffSupported); out.put("edgeOffSupported", edgeOffSupported);
        out.put("videoWidth", currentVideoSize.getWidth()); out.put("videoHeight", currentVideoSize.getHeight());
        return out;
    }

    private JSObject finishFile() throws IOException {
        File finished = activeVideoFile;
        RuntimeException stopFailure = null;
        try { recorder.stop(); } catch (RuntimeException e) { stopFailure = e; }
        releaseRecorder(); recording = false;
        if (handler != null) handler.removeCallbacks(timerTick);
        long duration = Math.max(0, System.currentTimeMillis() - recordStartedAt);
        if (session != null) { try { session.close(); } catch (Exception ignored) {} session = null; }
        if (stopFailure != null || finished == null || !finished.exists() || finished.length() < 1024) {
            if (finished != null && finished.exists()) finished.delete();
            activeVideoFile = null; throw new IOException("Video tidak valid atau terlalu pendek; rekam minimal 2 detik.");
        }
        JSObject out = new JSObject();
        out.put("path", finished.getAbsolutePath()); out.put("fileName", finished.getName());
        out.put("sizeBytes", finished.length()); out.put("lastModified", finished.lastModified());
        out.put("durationMs", duration); out.put("videoWidth", currentVideoSize.getWidth()); out.put("videoHeight", currentVideoSize.getHeight());
        activeVideoFile = null; recordStartedAt = 0;
        getActivity().runOnUiThread(() -> applyRecordingUiState(false));
        return out;
    }

    private void releaseRecorder() {
        if (encoderSurface != null) { try { encoderSurface.release(); } catch (Exception ignored) {} encoderSurface = null; }
        if (recorder != null) { try { recorder.reset(); } catch (Exception ignored) {} try { recorder.release(); } catch (Exception ignored) {} recorder = null; }
    }

    private int orientationHint() {
        int rotation = getActivity().getWindowManager().getDefaultDisplay().getRotation();
        int degrees = rotation == Surface.ROTATION_90 ? 90 : rotation == Surface.ROTATION_180 ? 180 : rotation == Surface.ROTATION_270 ? 270 : 0;
        Integer sensor = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION);
        int s = sensor == null ? 0 : sensor;
        return actualFront ? (s - degrees + 360) % 360 : (s + degrees) % 360;
    }

    private File videoDirectory() {
        File ext = getContext().getExternalFilesDir(Environment.DIRECTORY_MOVIES);
        File directory = new File(ext == null ? getContext().getFilesDir() : ext, "MG30Studio");
        if (!directory.exists()) directory.mkdirs();
        return directory;
    }

    private File ownedVideo(String path) {
        try {
            File base = videoDirectory().getCanonicalFile();
            File f = new File(path == null ? "" : path).getCanonicalFile();
            return f.getParentFile() != null && f.getParentFile().equals(base) && f.getName().toLowerCase(Locale.ROOT).endsWith(".mp4") ? f : null;
        } catch (IOException e) { return null; }
    }

    @PluginMethod public void listRecordings(PluginCall call) {
        File[] files = videoDirectory().listFiles((d,n) -> n.toLowerCase(Locale.ROOT).endsWith(".mp4"));
        if (files == null) files = new File[0];
        Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());
        JSArray list = new JSArray();
        for (File f : files) if (f.isFile() && f.length() > 1024) {
            JSObject o = new JSObject(); o.put("path", f.getAbsolutePath()); o.put("fileName", f.getName());
            o.put("sizeBytes", f.length()); o.put("lastModified", f.lastModified()); list.put(o);
        }
        JSObject out = new JSObject(); out.put("recordings", list); call.resolve(out);
    }

    @PluginMethod public void renameRecording(PluginCall call) {
        File f = ownedVideo(call.getString("path", ""));
        if (f == null || !f.exists()) { call.reject("File video tidak ditemukan."); return; }
        String name = call.getString("name", "").trim().replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        if (name.isEmpty()) { call.reject("Nama tidak boleh kosong."); return; }
        if (!name.toLowerCase(Locale.ROOT).endsWith(".mp4")) name += ".mp4";
        File dst = new File(videoDirectory(), name);
        if (dst.exists()) { call.reject("Nama file tersebut sudah dipakai."); return; }
        if (!f.renameTo(dst)) { call.reject("Gagal mengganti nama video."); return; }
        JSObject out = new JSObject(); out.put("path", dst.getAbsolutePath()); out.put("fileName", dst.getName());
        out.put("sizeBytes", dst.length()); out.put("lastModified", dst.lastModified()); call.resolve(out);
    }

    private void configureTransform(int viewWidth, int viewHeight) {
        if (texture == null || viewWidth <= 0 || viewHeight <= 0 || currentPreviewSize == null || characteristics == null) return;
        int rotation = getActivity().getWindowManager().getDefaultDisplay().getRotation();
        int degrees = rotation == Surface.ROTATION_90 ? 90 : rotation == Surface.ROTATION_180 ? 180 : rotation == Surface.ROTATION_270 ? 270 : 0;
        Integer sensor = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION);
        int s = sensor == null ? 0 : sensor;
        int orientation = actualFront ? (s + degrees) % 360 : (s - degrees + 360) % 360;
        float rawW = currentPreviewSize.getWidth(), rawH = currentPreviewSize.getHeight();
        float rotatedW = (orientation == 90 || orientation == 270) ? rawH : rawW;
        float rotatedH = (orientation == 90 || orientation == 270) ? rawW : rawH;
        float scale = Math.max(viewWidth / rotatedW, viewHeight / rotatedH);
        float cx = viewWidth / 2f, cy = viewHeight / 2f;
        Matrix matrix = new Matrix();
        matrix.postTranslate(-rawW / 2f, -rawH / 2f);
        matrix.postRotate(orientation);
        matrix.postScale(scale, scale);
        matrix.postTranslate(cx, cy);
        if (actualFront) matrix.postScale(-1f, 1f, cx, cy);
        texture.setTransform(matrix);
    }

    private void layoutFullScreen() {
        if (cameraRoot == null) return;
        FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(-1, -1);
        cameraRoot.setLayoutParams(p);
        if (texture != null) {
            texture.setLayoutParams(new FrameLayout.LayoutParams(-1, -1));
            configureTransform(texture.getWidth(), texture.getHeight());
        }
        if (topBar != null) topBar.bringToFront();
        if (bottomPanel != null) bottomPanel.bringToFront();
    }

    private void closeAll() {
        if (session != null) { try { session.stopRepeating(); } catch (Exception ignored) {} try { session.close(); } catch (Exception ignored) {} session = null; }
        if (device != null) { try { device.close(); } catch (Exception ignored) {} device = null; }
        opening = false; closeInProgress = false;
        if (previewSurface != null) { try { previewSurface.release(); } catch (Exception ignored) {} previewSurface = null; }
        if (handler != null) handler.removeCallbacks(timerTick);
        rejectOpen("Preview ditutup.");
        try {
            getActivity().runOnUiThread(() -> {
                if (activityRoot != null && cameraRoot != null) activityRoot.removeView(cameraRoot);
                cameraRoot = null; activityRoot = null; texture = null; topBar = null; bottomPanel = null;
                resolutionLabel = null; timerLabel = null; processingLabel = null; lensLabel = null; recordButton = null; stopButton = null;
            });
        } catch (Exception ignored) {}
    }

    private void rejectOpen(String message) {
        if (pendingOpen != null) { PluginCall call = pendingOpen; pendingOpen = null; call.reject(message); }
    }
    private JSObject event(String message) { JSObject o = new JSObject(); o.put("message", message); return o; }
    private static boolean has(int[] values, int target) { if (values == null) return false; for (int value : values) if (value == target) return true; return false; }
    private static String message(Exception e) { return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage(); }

    @Override public void onSurfaceTextureSizeChanged(SurfaceTexture st, int width, int height) { configureTransform(width, height); }
    @Override public boolean onSurfaceTextureDestroyed(SurfaceTexture st) { return true; }
    @Override public void onSurfaceTextureUpdated(SurfaceTexture st) {}

    @Override protected void handleOnPause() {
        super.handleOnPause();
        if (recording && recorder != null && activeVideoFile != null) {
            try { JSObject take = finishFile(); notifyListeners("recordingInterrupted", take); }
            catch (Exception e) { releaseRecorder(); recording = false; notifyListeners("cameraError", event(message(e))); }
        }
        closeAll();
    }

    @Override protected void handleOnDestroy() {
        closeAll();
        if (cameraThread != null) {
            cameraThread.quitSafely();
            try { cameraThread.join(500); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            cameraThread = null; handler = null;
        }
        super.handleOnDestroy();
    }
}
