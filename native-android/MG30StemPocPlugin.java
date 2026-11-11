package com.vaivaii.mg30studio;

import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ai.onnxruntime.NodeInfo;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import ai.onnxruntime.TensorInfo;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MG30StemPoc")
public class MG30StemPocPlugin extends Plugin {
    private static final String MODEL_NAME = "scnet.int8.onnx";
    private static final long MODEL_BYTES = 12900277L;
    private static final String MODEL_SHA256 = "98228931494151762a1c4ab1ec7899a894b1f81fd4a509921a9d2f9bacc50845";
    private static final String MODEL_URL = "https://huggingface.co/audiojs/scnet/resolve/main/scnet.int8.onnx";
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Object sessionLock = new Object();
    private OrtEnvironment environment;
    private OrtSession session;
    private OrtSession.SessionOptions sessionOptions;

    @PluginMethod
    public void downloadModel(PluginCall call) {
        worker.execute(() -> {
            File directory = new File(getContext().getFilesDir(), "stem-poc");
            File target = new File(directory, MODEL_NAME);
            File partial = new File(directory, MODEL_NAME + ".part");
            HttpURLConnection connection = null;
            try {
                if (!directory.exists() && !directory.mkdirs()) throw new Exception("Cannot create model directory");
                if (target.isFile() && target.length() == MODEL_BYTES && MODEL_SHA256.equals(sha256(target))) {
                    JSObject cached = new JSObject(); cached.put("installed", true); cached.put("cached", true);
                    cached.put("bytes", target.length()); cached.put("sha256", MODEL_SHA256); call.resolve(cached); return;
                }
                connection = (HttpURLConnection) new URL(MODEL_URL).openConnection();
                connection.setConnectTimeout(20000); connection.setReadTimeout(60000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "NUX-MG30-Studio-Android-POC");
                connection.connect();
                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) throw new Exception("Model server HTTP " + status);
                long contentLength = connection.getContentLengthLong();
                if (contentLength > 0 && contentLength != MODEL_BYTES) throw new Exception("Unexpected Content-Length: " + contentLength);
                MessageDigest digest = MessageDigest.getInstance("SHA-256"); long count = 0;
                try (InputStream in = connection.getInputStream(); FileOutputStream out = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[64 * 1024]; int n;
                    while ((n = in.read(buffer)) != -1) {
                        count += n; if (count > MODEL_BYTES) throw new Exception("Model exceeds pinned byte count");
                        digest.update(buffer, 0, n); out.write(buffer, 0, n);
                    }
                    out.getFD().sync();
                }
                String actual = hex(digest.digest());
                if (count != MODEL_BYTES) throw new Exception("Model byte count mismatch: " + count);
                if (!MODEL_SHA256.equals(actual)) throw new Exception("Model SHA-256 mismatch: " + actual);
                if (target.exists() && !target.delete()) throw new Exception("Cannot replace old model");
                if (!partial.renameTo(target)) throw new Exception("Cannot atomically install verified model");
                JSObject result = new JSObject(); result.put("installed", true); result.put("cached", false);
                result.put("bytes", count); result.put("sha256", actual); call.resolve(result);
            } catch (Exception error) {
                if (partial.exists()) partial.delete();
                call.reject("SCNet model download/verification failed: " + error.getMessage(), error);
            } finally { if (connection != null) connection.disconnect(); }
        });
    }

    @PluginMethod
    public void inspectModel(PluginCall call) {
        worker.execute(() -> {
            try {
                File model = new File(new File(getContext().getFilesDir(), "stem-poc"), MODEL_NAME);
                if (!model.isFile() || model.length() != MODEL_BYTES || !MODEL_SHA256.equals(sha256(model))) {
                    call.reject("Verified SCNet model is not installed. Run downloadModel first."); return;
                }
                synchronized (sessionLock) {
                    closeSessionResources();
                    if (environment == null) environment = OrtEnvironment.getEnvironment();
                    OrtSession.SessionOptions newOptions = new OrtSession.SessionOptions();
                    try {
                        newOptions.setIntraOpNumThreads(2);
                        OrtSession newSession = environment.createSession(model.getAbsolutePath(), newOptions);
                        sessionOptions = newOptions;
                        session = newSession;
                    } catch (Exception sessionError) {
                        try { newOptions.close(); } catch (Exception ignored) {}
                        throw sessionError;
                    }
                    JSObject result = new JSObject(); result.put("loaded", true);
                    result.put("modelBytes", model.length()); result.put("modelSha256", MODEL_SHA256);
                    result.put("runtime", "ONNX Runtime Android 1.31.1");
                    result.put("abi", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "unknown");
                    result.put("inputs", describeNodes(session.getInputInfo()));
                    result.put("outputs", describeNodes(session.getOutputInfo()));
                    result.put("note", "Metadata-only smoke test; no inference tensor allocated.");
                    call.resolve(result);
                }
            } catch (Exception error) { call.reject("SCNet ONNX session load failed: " + error.getMessage(), error); }
        });
    }

    private JSArray describeNodes(Map<String, NodeInfo> nodes) {
        JSArray array = new JSArray();
        for (Map.Entry<String, NodeInfo> entry : nodes.entrySet()) {
            JSObject item = new JSObject(); item.put("name", entry.getKey());
            if (entry.getValue().getInfo() instanceof TensorInfo) {
                TensorInfo info = (TensorInfo) entry.getValue().getInfo();
                item.put("type", info.type.toString()); JSArray shape = new JSArray();
                for (long dim : info.getShape()) shape.put(dim); item.put("shape", shape);
            } else item.put("type", entry.getValue().getInfo().toString());
            array.put(item);
        }
        return array;
    }

    private static String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(file)) {
            byte[] buffer = new byte[64 * 1024]; int n;
            while ((n = in.read(buffer)) != -1) digest.update(buffer, 0, n);
        }
        return hex(digest.digest());
    }
    private static String hex(byte[] bytes) {
        StringBuilder out = new StringBuilder();
        for (byte value : bytes) out.append(String.format("%02x", value & 0xff));
        return out.toString();
    }
    private void closeSessionResources() {
        if (session != null) {
            try { session.close(); } catch (Exception ignored) {}
            session = null;
        }
        if (sessionOptions != null) {
            try { sessionOptions.close(); } catch (Exception ignored) {}
            sessionOptions = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        worker.shutdownNow();
        synchronized (sessionLock) {
            closeSessionResources();
        }
        super.handleOnDestroy();
    }
}
