package com.vaivaii.mg30studio;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.UUID;

@CapacitorPlugin(name = "MG30DawFiles")
public class MG30DawFilesPlugin extends Plugin {
    private static final int MAX_CHUNK_BYTES = 256 * 1024;

    @PluginMethod
    public void beginExport(PluginCall call) {
        try {
            File directory = exportDirectory();
            if (!directory.exists() && !directory.mkdirs()) {
                call.reject("Could not create the Studio export cache directory.");
                return;
            }
            String sessionId = UUID.randomUUID().toString();
            File target = new File(directory, "daw-" + sessionId + ".part");
            if (!target.createNewFile()) {
                call.reject("Could not create a temporary Studio export file.");
                return;
            }
            JSObject response = new JSObject();
            response.put("sessionId", sessionId);
            response.put("ready", true);
            call.resolve(response);
        } catch (IOException error) {
            call.reject("Could not prepare the Android export: " + error.getMessage());
        }
    }

    @PluginMethod
    public void appendExportChunk(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String encoded = call.getString("dataBase64");
        File target = resolveSessionFile(sessionId);
        if (target == null || !target.isFile()) {
            call.reject("The Android export session is invalid or has expired.");
            return;
        }
        if (encoded == null || encoded.isEmpty() || encoded.length() > 4 * MAX_CHUNK_BYTES / 3 + 16) {
            call.reject("The Studio export chunk is empty or exceeds the safe bridge limit.");
            return;
        }
        try {
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            if (bytes.length == 0 || bytes.length > MAX_CHUNK_BYTES) {
                call.reject("The Studio export chunk has an invalid size.");
                return;
            }
            try (FileOutputStream output = new FileOutputStream(target, true)) {
                output.write(bytes);
                output.flush();
            }
            JSObject response = new JSObject();
            response.put("writtenBytes", bytes.length);
            response.put("totalBytes", target.length());
            call.resolve(response);
        } catch (IllegalArgumentException | IOException error) {
            call.reject("Could not write Studio export data: " + error.getMessage());
        }
    }

    @PluginMethod
    public void finishExport(PluginCall call) {
        String sessionId = call.getString("sessionId");
        File source = resolveSessionFile(sessionId);
        if (source == null || !source.isFile() || source.length() <= 0) {
            call.reject("The Studio export file is missing or empty.");
            return;
        }
        String fileName = safeFileName(call.getString("fileName"));
        String mimeType = call.getString("mimeType");
        if (mimeType == null || mimeType.isEmpty()) mimeType = "application/octet-stream";
        if (!"audio/wav".equals(mimeType) && !"application/zip".equals(mimeType)) {
            mimeType = "application/octet-stream";
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        startActivityForResult(call, intent, "handleDawExportResult");
    }

    @ActivityCallback
    private void handleDawExportResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        String sessionId = call.getString("sessionId");
        File source = resolveSessionFile(sessionId);
        if (result == null || result.getResultCode() != Activity.RESULT_OK ||
            result.getData() == null || result.getData().getData() == null) {
            deleteSession(sessionId);
            call.reject("Export canceled.");
            return;
        }
        if (source == null || !source.isFile()) {
            call.reject("The temporary Studio export file could not be found.");
            return;
        }
        Uri destination = result.getData().getData();
        try (InputStream input = new FileInputStream(source);
             OutputStream output = getContext().getContentResolver().openOutputStream(destination, "w")) {
            if (output == null) throw new IOException("Android File Picker returned a location that cannot be written.");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            output.flush();
            long savedBytes = source.length();
            String fileName = call.getString("fileName");
            source.delete();
            JSObject response = new JSObject();
            response.put("success", true);
            response.put("fileName", fileName == null ? source.getName() : fileName);
            response.put("bytesWritten", savedBytes);
            response.put("destinationUri", destination.toString());
            call.resolve(response);
        } catch (IOException error) {
            call.reject("Android could not save the Studio export: " + error.getMessage());
        }
    }

    @PluginMethod
    public void cancelExport(PluginCall call) {
        String sessionId = call.getString("sessionId");
        deleteSession(sessionId);
        JSObject response = new JSObject();
        response.put("success", true);
        call.resolve(response);
    }

    private File exportDirectory() {
        return new File(getContext().getCacheDir(), "mg30-studio-daw-exports");
    }

    private File resolveSessionFile(String sessionId) {
        if (sessionId == null || !sessionId.matches("[0-9a-fA-F-]{36}")) return null;
        try {
            File directory = exportDirectory().getCanonicalFile();
            File file = new File(directory, "daw-" + sessionId + ".part").getCanonicalFile();
            if (file.getParentFile() == null || !file.getParentFile().equals(directory)) return null;
            return file;
        } catch (IOException error) {
            return null;
        }
    }

    private void deleteSession(String sessionId) {
        File file = resolveSessionFile(sessionId);
        if (file != null && file.exists()) file.delete();
    }

    private String safeFileName(String raw) {
        String name = raw == null ? "MG30-Studio-Export" : raw;
        name = name.replaceAll("[\\\\/:*?\"<>|\\\\p{Cntrl}]", "-").trim();
        if (name.isEmpty() || ".".equals(name) || "..".equals(name)) name = "MG30-Studio-Export";
        if (name.length() > 120) name = name.substring(0, 120);
        return name;
    }
}
