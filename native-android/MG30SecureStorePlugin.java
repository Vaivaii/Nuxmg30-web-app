package com.vaivaii.mg30studio;

import android.content.SharedPreferences;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

/**
 * Encrypted at-rest storage for user-supplied AI provider keys and TONE3000 OAuth session data.
 * The AES key is non-exportable and held by Android Keystore; only ciphertext
 * and the GCM IV are stored in app-private SharedPreferences.
 */
@CapacitorPlugin(name = "MG30SecureStore")
public class MG30SecureStorePlugin extends Plugin {
    private static final String PREFS = "mg30_ai_secure_store";
    private static final String KEY_ALIAS = "mg30_ai_provider_aes_v1";
    private static final int GCM_TAG_BITS = 128;

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE);
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        java.security.Key existing = keyStore.getKey(KEY_ALIAS, null);
        if (existing instanceof SecretKey) return (SecretKey) existing;

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .setKeySize(256)
                .build());
        return generator.generateKey();
    }

    private String provider(PluginCall call) {
        String value = call.getString("provider", "");
        if (!"openai".equals(value) && !"gemini".equals(value) && !"tone3000".equals(value)) {
            throw new IllegalArgumentException("Secure-store namespace is invalid.");
        }
        return value;
    }

    @PluginMethod
    public void setSecret(PluginCall call) {
        try {
            String provider = provider(call);
            String value = call.getString("value", "").trim();
            if (value.isEmpty()) {
                call.reject("API key kosong.");
                return;
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] iv = cipher.getIV();
            byte[] packed = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, packed, 0, iv.length);
            System.arraycopy(encrypted, 0, packed, iv.length, encrypted.length);
            boolean saved = preferences().edit()
                    .putString("secret_" + provider, Base64.encodeToString(packed, Base64.NO_WRAP))
                    .commit();
            if (!saved) throw new IllegalStateException("Penyimpanan lokal gagal.");
            JSObject result = new JSObject();
            result.put("saved", true);
            result.put("provider", provider);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Gagal menyimpan API key terenkripsi: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void getSecret(PluginCall call) {
        try {
            String provider = provider(call);
            String packedValue = preferences().getString("secret_" + provider, null);
            String secret = "";
            if (packedValue != null && !packedValue.isEmpty()) {
                byte[] packed = Base64.decode(packedValue, Base64.NO_WRAP);
                if (packed.length <= 12) throw new IllegalStateException("Data terenkripsi tidak lengkap.");
                byte[] iv = new byte[12];
                byte[] encrypted = new byte[packed.length - iv.length];
                System.arraycopy(packed, 0, iv, 0, iv.length);
                System.arraycopy(packed, iv.length, encrypted, 0, encrypted.length);
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
                secret = new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
            }
            JSObject result = new JSObject();
            result.put("value", secret);
            result.put("configured", !secret.isEmpty());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Gagal membaca API key terenkripsi: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void deleteSecret(PluginCall call) {
        try {
            String provider = provider(call);
            boolean saved = preferences().edit().remove("secret_" + provider).commit();
            JSObject result = new JSObject();
            result.put("deleted", saved);
            result.put("provider", provider);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Gagal menghapus API key: " + error.getMessage(), error);
        }
    }
}
