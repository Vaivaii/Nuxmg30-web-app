package com.vaivaii.mg30studio;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.spec.RSAPublicKeySpec;
import java.util.UUID;
import java.util.Date;
import java.util.Locale;
import java.text.SimpleDateFormat;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;

/**
 * ChatGPT Sign in with ChatGPT (SIWC) host for Android.
 *
 * Security boundary:
 * - OAuth, refresh, ID-token verification and Responses API calls stay native.
 * - Access/refresh/ID tokens are encrypted with an Android Keystore AES-GCM key.
 * - No credential or authorization header is returned to the WebView.
 * - The plugin never forwards SIWC requests or tokens through Cloudflare.
 */
@CapacitorPlugin(name = "MG30ChatGPT")
public class MG30ChatGPTPlugin extends Plugin {
    private static final String PREFS = "mg30_chatgpt_siwc";
    private static final String KEY_ALIAS = "mg30_chatgpt_oauth_aes_v1";
    private static final String BLOB_KEY = "encrypted_profiles_v1";
    private static final String HOST_KEY = "runtime_host_id";
    private static final String ISSUER = "https://auth.openai.com";
    private static final String API_BASE = "https://api.openai.com/v1";
    private static final String RESOURCE = "https://api.openai.com/v1";
    private static final String REQUIRED_SCOPE = "chatgpt.tokens.use.direct";
    private static final String APP_NAME = "NUX MG-30 Studio";
    private static final String CALLBACK_PATH = "/auth/callback";
    private static final int CONNECT_TIMEOUT_MS = 30000;
    private static final int READ_TIMEOUT_MS = 180000;
    private static final int MAX_RESPONSE_CHARS = 16 * 1024 * 1024;

    private final AtomicBoolean responseCancelled = new AtomicBoolean(false);
    private volatile ServerSocket pendingServer;

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private SecretKey storageKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        java.security.Key existing = keyStore.getKey(KEY_ALIAS, null);
        if (existing instanceof SecretKey) return (SecretKey) existing;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .setKeySize(256)
                .build());
        return generator.generateKey();
    }

    private JSONObject readStore() throws Exception {
        String encoded = prefs().getString(BLOB_KEY, null);
        if (encoded == null || encoded.isEmpty()) {
            JSONObject empty = new JSONObject();
            empty.put("version", 1);
            empty.put("activeProfileId", JSONObject.NULL);
            empty.put("profiles", new JSONArray());
            return empty;
        }
        byte[] packed = Base64.decode(encoded, Base64.NO_WRAP);
        if (packed.length <= 12) throw new IllegalStateException("Encrypted ChatGPT profile storage is incomplete.");
        byte[] iv = new byte[12];
        byte[] ciphertext = new byte[packed.length - 12];
        System.arraycopy(packed, 0, iv, 0, 12);
        System.arraycopy(packed, 12, ciphertext, 0, ciphertext.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, storageKey(), new GCMParameterSpec(128, iv));
        String plaintext = new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        JSONObject root = new JSONObject(plaintext);
        if (root.optInt("version") != 1 || !(root.opt("profiles") instanceof JSONArray)) {
            throw new IllegalStateException("Saved ChatGPT profile data has an unsupported format.");
        }
        return root;
    }

    private void writeStore(JSONObject root) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, storageKey());
        byte[] encrypted = cipher.doFinal(root.toString().getBytes(StandardCharsets.UTF_8));
        byte[] iv = cipher.getIV();
        byte[] packed = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, packed, 0, iv.length);
        System.arraycopy(encrypted, 0, packed, iv.length, encrypted.length);
        if (!prefs().edit().putString(BLOB_KEY, Base64.encodeToString(packed, Base64.NO_WRAP)).commit()) {
            throw new IllegalStateException("Could not persist encrypted ChatGPT profile data.");
        }
    }

    private String hostId() {
        String value = prefs().getString(HOST_KEY, null);
        if (value != null && value.startsWith("urn:uuid:")) return value;
        String created = "urn:uuid:" + UUID.randomUUID().toString();
        prefs().edit().putString(HOST_KEY, created).commit();
        return created;
    }

    private JSONObject activeProfile(JSONObject root) throws Exception {
        String activeId = root.optString("activeProfileId", "");
        JSONArray profiles = root.getJSONArray("profiles");
        for (int i = 0; i < profiles.length(); i++) {
            JSONObject profile = profiles.getJSONObject(i);
            if (activeId.equals(profile.optString("id"))) return profile;
        }
        return null;
    }

    private JSONObject publicSession(JSONObject root) throws Exception {
        JSONObject profile = activeProfile(root);
        JSONObject out = new JSONObject();
        if (profile == null) {
            out.put("status", "disconnected");
            out.put("sharing", false);
            return out;
        }
        out.put("status", profile.optString("status", "disconnected"));
        JSONArray scopes = profile.optJSONArray("scopes");
        boolean sharing = false;
        if (scopes != null) for (int i = 0; i < scopes.length(); i++) {
            if (REQUIRED_SCOPE.equals(scopes.optString(i))) sharing = true;
        }
        out.put("sharing", sharing && !profile.optString("accessToken", "").isEmpty());
        out.put("profileId", profile.optString("id"));
        out.put("profileLabel", profile.optString("label", "ChatGPT account"));
        JSONObject identity = new JSONObject();
        if (profile.has("name")) identity.put("name", profile.optString("name"));
        if (profile.has("email")) identity.put("email", profile.optString("email"));
        if (identity.length() > 0) out.put("identity", identity);
        return out;
    }

    private JSONArray publicProfiles(JSONObject root) throws Exception {
        JSONArray rows = new JSONArray();
        JSONArray profiles = root.getJSONArray("profiles");
        for (int i = 0; i < profiles.length(); i++) {
            JSONObject profile = profiles.getJSONObject(i);
            JSONObject row = new JSONObject();
            row.put("id", profile.optString("id"));
            row.put("label", profile.optString("label", "ChatGPT account"));
            row.put("status", profile.optString("status", "disconnected"));
            row.put("email", profile.optString("email", ""));
            row.put("name", profile.optString("name", ""));
            JSONArray scopes = profile.optJSONArray("scopes");
            boolean sharing = false;
            if (scopes != null) for (int j = 0; j < scopes.length(); j++) {
                if (REQUIRED_SCOPE.equals(scopes.optString(j))) sharing = true;
            }
            row.put("sharing", sharing && !profile.optString("accessToken", "").isEmpty());
            rows.put(row);
        }
        return rows;
    }

    private JSONObject discovery() throws Exception {
        JSONObject config = getJson(ISSUER + "/.well-known/openid-configuration", null, null);
        if (!ISSUER.equals(config.optString("issuer"))) throw new IllegalStateException("ChatGPT sign-in issuer could not be verified.");
        for (String key : new String[]{"authorization_endpoint", "token_endpoint", "jwks_uri"}) {
            Uri uri = Uri.parse(config.optString(key));
            if (!"https".equals(uri.getScheme()) || !ISSUER.equals(uri.getScheme() + "://" + uri.getHost())) {
                throw new IllegalStateException("ChatGPT sign-in endpoint failed origin validation.");
            }
        }
        if (config.has("revocation_endpoint")) {
            Uri uri = Uri.parse(config.optString("revocation_endpoint"));
            if (!"https".equals(uri.getScheme()) || !ISSUER.equals(uri.getScheme() + "://" + uri.getHost())) {
                throw new IllegalStateException("ChatGPT revocation endpoint failed origin validation.");
            }
        }
        return config;
    }

    private HttpsURLConnection connection(String address, String method) throws Exception {
        URL url = new URL(address);
        if (!"https".equalsIgnoreCase(url.getProtocol())) throw new IllegalArgumentException("Only HTTPS requests are permitted.");
        HttpsURLConnection connection = (HttpsURLConnection) url.openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept", "application/json");
        return connection;
    }

    private JSONObject readJsonResponse(HttpsURLConnection connection) throws Exception {
        int code = connection.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
        if (stream == null) return new JSONObject();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = stream.read(buffer)) != -1) {
            output.write(buffer, 0, read);
            if (output.size() > 2 * 1024 * 1024) throw new IllegalStateException("ChatGPT returned an unexpectedly large JSON response.");
        }
        JSONObject body = new JSONObject(new String(output.toByteArray(), StandardCharsets.UTF_8));
        if (code < 200 || code >= 300) throw apiError(body, code);
        return body;
    }

    private JSONObject getJson(String address, String bearer, String accept) throws Exception {
        HttpsURLConnection c = connection(address, "GET");
        if (bearer != null) c.setRequestProperty("Authorization", "Bearer " + bearer);
        if (accept != null) c.setRequestProperty("Accept", accept);
        try { return readJsonResponse(c); } finally { c.disconnect(); }
    }

    private void postFormNoBody(String address, JSONObject form) throws Exception {
        HttpsURLConnection c = connection(address, "POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        StringBuilder body = new StringBuilder();
        java.util.Iterator<String> keys = form.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (body.length() > 0) body.append('&');
            body.append(URLEncoder.encode(key, "UTF-8")).append('=')
                    .append(URLEncoder.encode(String.valueOf(form.get(key)), "UTF-8"));
        }
        try {
            try (OutputStream output = c.getOutputStream()) {
                output.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int code = c.getResponseCode();
            if (code < 200 || code >= 300) {
                InputStream error = c.getErrorStream();
                String raw = readLimited(error, 65536);
                JSONObject detail = new JSONObject(raw.isEmpty() ? "{}" : raw);
                throw new IllegalStateException(apiError(detail, code));
            }
        } finally { c.disconnect(); }
    }

    private JSONObject postForm(String address, JSONObject form) throws Exception {
        HttpsURLConnection c = connection(address, "POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        StringBuilder body = new StringBuilder();
        JSONArray names = new JSONArray();
        java.util.Iterator<String> keys = form.keys();
        while (keys.hasNext()) names.put(keys.next());
        for (int i = 0; i < names.length(); i++) {
            String key = names.getString(i);
            if (body.length() > 0) body.append('&');
            body.append(URLEncoder.encode(key, "UTF-8")).append('=')
                    .append(URLEncoder.encode(String.valueOf(form.get(key)), "UTF-8"));
        }
        try {
            try (OutputStream output = c.getOutputStream()) {
                output.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            return readJsonResponse(c);
        } finally { c.disconnect(); }
    }

    private String apiError(JSONObject body, int status) {
        JSONObject error = body.optJSONObject("error");
        String code = error != null ? error.optString("code", error.optString("type", "")) : body.optString("error", "");
        String message = error != null ? error.optString("message", "") : body.optString("message", "");
        if (status == 401 || status == 403) return "ChatGPT authorization or account permission was rejected. Reconnect ChatGPT and check plan-sharing permission.";
        if (status == 429) return "ChatGPT plan usage limit or rate limit reached. Check your ChatGPT usage page.";
        if (status >= 500) return "ChatGPT is temporarily unavailable. Try again shortly.";
        if (!message.isEmpty()) return message.substring(0, Math.min(message.length(), 360));
        return "ChatGPT request failed (HTTP " + status + (code.isEmpty() ? "" : ", " + code) + ").";
    }

    private String b64url(byte[] bytes) {
        return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private byte[] sha256(byte[] bytes) throws Exception {
        return MessageDigest.getInstance("SHA-256").digest(bytes);
    }

    private String randomValue() {
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        return b64url(bytes);
    }

    private String buildQuery(JSONObject values) throws Exception {
        StringBuilder query = new StringBuilder();
        java.util.Iterator<String> keys = values.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (query.length() > 0) query.append('&');
            query.append(URLEncoder.encode(key, "UTF-8")).append('=')
                    .append(URLEncoder.encode(String.valueOf(values.get(key)), "UTF-8"));
        }
        return query.toString();
    }

    private JSONObject waitForCallback(int port, String expectedState) throws Exception {
        ServerSocket server = new ServerSocket(port, 1, InetAddress.getByName("127.0.0.1"));
        pendingServer = server;
        server.setSoTimeout(10 * 60 * 1000);
        try (Socket socket = server.accept()) {
            socket.setSoTimeout(15000);
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            String requestLine = reader.readLine();
            if (requestLine == null || !requestLine.startsWith("GET ")) throw new IllegalStateException("Unexpected ChatGPT sign-in callback.");
            String target = requestLine.split(" ", 3)[1];
            while (true) {
                String line = reader.readLine();
                if (line == null || line.isEmpty()) break;
            }
            Uri callback = Uri.parse("http://127.0.0.1" + target);
            if (!CALLBACK_PATH.equals(callback.getPath())) throw new IllegalStateException("ChatGPT callback path did not match.");
            String returnedState = callback.getQueryParameter("state");
            if (returnedState == null || !MessageDigest.isEqual(expectedState.getBytes(StandardCharsets.UTF_8), returnedState.getBytes(StandardCharsets.UTF_8))) {
                writeCallback(socket, "Invalid sign-in state. Return to the app and try again.");
                throw new IllegalStateException("ChatGPT sign-in state validation failed.");
            }
            String error = callback.getQueryParameter("error");
            if (error != null) {
                writeCallback(socket, "ChatGPT sign-in was not completed: " + error);
                throw new IllegalStateException("ChatGPT sign-in was not completed (" + error + ").");
            }
            String code = callback.getQueryParameter("code");
            String clientId = callback.getQueryParameter("client_id");
            if (code == null || code.isEmpty() || clientId == null || !clientId.matches("[A-Za-z0-9_-]{1,200}") ||
                    "dynamic_agent_client".equals(clientId)) {
                writeCallback(socket, "ChatGPT did not complete app registration. Return to the app.");
                throw new IllegalStateException("ChatGPT did not return a valid authorization code and registered client ID.");
            }
            writeCallback(socket, "ChatGPT sign-in received. Return to NUX MG-30 Studio.");
            JSONObject result = new JSONObject();
            result.put("code", code);
            result.put("clientId", clientId);
            return result;
        } finally {
            pendingServer = null;
            try { server.close(); } catch (Exception ignored) {}
        }
    }

    private void writeCallback(Socket socket, String message) {
        try {
            String html = "<!doctype html><html><meta charset=utf-8><title>NUX MG-30 Studio</title><body style='font:16px system-ui;max-width:34rem;margin:15vh auto;padding:24px;color:#222'><h2>Return to NUX MG-30 Studio</h2><p>" + message + "</p><p>You can close this tab.</p></body></html>";
            byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
            OutputStream output = socket.getOutputStream();
            output.write(("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: " + bytes.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.UTF_8));
            output.write(bytes);
            output.flush();
        } catch (Exception ignored) {}
    }

    private JSONObject verifyIdToken(String token, String clientId, String nonce, String jwksUrl) throws Exception {
        String[] parts = token.split("\\.");
        if (parts.length != 3) throw new IllegalStateException("ChatGPT identity token is malformed.");
        JSONObject header = new JSONObject(new String(Base64.decode(parts[0], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING), StandardCharsets.UTF_8));
        if (!"RS256".equals(header.optString("alg"))) throw new IllegalStateException("ChatGPT identity token used an unsupported signature algorithm.");
        String kid = header.optString("kid");
        JSONObject keys = getJson(jwksUrl, null, null);
        JSONArray jwks = keys.optJSONArray("keys");
        if (jwks == null) throw new IllegalStateException("ChatGPT identity keys are unavailable.");
        JSONObject selected = null;
        for (int i = 0; i < jwks.length(); i++) {
            JSONObject key = jwks.optJSONObject(i);
            if (key != null && kid.equals(key.optString("kid")) && "RSA".equals(key.optString("kty")) &&
                    (key.optString("use", "sig").equals("sig")) && key.optString("alg", "RS256").equals("RS256")) {
                selected = key;
                break;
            }
        }
        if (selected == null) throw new IllegalStateException("ChatGPT identity signing key was not found.");
        byte[] modulus = Base64.decode(selected.getString("n"), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        byte[] exponent = Base64.decode(selected.getString("e"), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        java.math.BigInteger n = new java.math.BigInteger(1, modulus);
        java.math.BigInteger e = new java.math.BigInteger(1, exponent);
        java.security.PublicKey publicKey = KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(n, e));
        Signature verifier = Signature.getInstance("SHA256withRSA");
        verifier.initVerify(publicKey);
        verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
        byte[] signature = Base64.decode(parts[2], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        if (!verifier.verify(signature)) throw new IllegalStateException("ChatGPT identity signature is invalid.");

        JSONObject claims = new JSONObject(new String(Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING), StandardCharsets.UTF_8));
        long now = System.currentTimeMillis() / 1000L;
        if (!ISSUER.equals(claims.optString("iss")) || claims.optLong("exp", 0) <= now - 5 ||
                claims.optLong("iat", now + 999) > now + 60 || (nonce != null && !nonce.equals(claims.optString("nonce")))) {
            throw new IllegalStateException("ChatGPT identity claims could not be verified.");
        }
        boolean audience = clientId.equals(claims.optString("aud"));
        JSONArray aud = claims.optJSONArray("aud");
        if (aud != null) {
            for (int i = 0; i < aud.length(); i++) if (clientId.equals(aud.optString(i))) audience = true;
        }
        JSONArray audiences = claims.optJSONArray("aud");
        if (!audience || (claims.has("azp") && !clientId.equals(claims.optString("azp"))) ||
                (audiences != null && audiences.length() > 1 && !clientId.equals(claims.optString("azp"))) ||
                claims.optString("sub").isEmpty()) {
            throw new IllegalStateException("ChatGPT identity does not match this app registration.");
        }
        JSONObject result = new JSONObject();
        result.put("subject", claims.getString("sub"));
        if (claims.has("name")) result.put("name", claims.optString("name"));
        if (claims.has("email")) result.put("email", claims.optString("email"));
        return result;
    }

    private JSONArray parseScopes(String value) throws Exception {
        JSONArray scopes = new JSONArray();
        for (String scope : value.trim().split("\\s+")) if (!scope.isEmpty()) scopes.put(scope);
        return scopes;
    }

    private JSONObject exchangeCode(JSONObject callback, String verifier, String redirectUri, JSONObject discovery) throws Exception {
        JSONObject form = new JSONObject();
        form.put("grant_type", "authorization_code");
        form.put("client_id", callback.getString("clientId"));
        form.put("code", callback.getString("code"));
        form.put("code_verifier", verifier);
        form.put("redirect_uri", redirectUri);
        form.put("resource", RESOURCE);
        return postForm(discovery.getString("token_endpoint"), form);
    }

    private JSONObject currentProfileOrNew(JSONObject root, boolean newProfile) throws Exception {
        JSONObject active = activeProfile(root);
        if (!newProfile && active != null) return active;
        JSONObject profile = new JSONObject();
        profile.put("id", UUID.randomUUID().toString());
        JSONArray profiles = root.getJSONArray("profiles");
        profile.put("label", "ChatGPT account " + (profiles.length() + 1));
        profile.put("status", "connecting");
        profile.put("clientId", "dynamic_agent_client");
        return profile;
    }

    private void doSignIn(PluginCall call) {
        try {
            boolean newProfile = call.getBoolean("newProfile", false);
            JSONObject root = readStore();
            JSONObject previous = currentProfileOrNew(root, newProfile);
            boolean isNew = "dynamic_agent_client".equals(previous.optString("clientId"));
            String existingSubject = previous.optString("subject", "");
            JSONObject oidc = discovery();

            ServerSocket server = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"));
            pendingServer = server;
            int port = server.getLocalPort();
            server.setSoTimeout(10 * 60 * 1000);
            String redirectUri = "http://127.0.0.1:" + port + CALLBACK_PATH;
            String state = randomValue();
            String nonce = randomValue();
            String verifier = randomValue();
            String challenge = b64url(sha256(verifier.getBytes(StandardCharsets.UTF_8)));

            JSONObject params = new JSONObject();
            params.put("client_id", previous.optString("clientId", "dynamic_agent_client"));
            params.put("response_type", "code");
            params.put("redirect_uri", redirectUri);
            params.put("scope", "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct");
            params.put("resource", RESOURCE);
            params.put("state", state);
            params.put("nonce", nonce);
            params.put("code_challenge_method", "S256");
            params.put("code_challenge", challenge);
            params.put("ext_agent_host_id", hostId());
            if (isNew) params.put("agent_name_hint", APP_NAME);
            else {
                if (!previous.optString("idToken", "").isEmpty()) params.put("id_token_hint", previous.optString("idToken"));
                if (!previous.optString("email", "").isEmpty()) params.put("login_hint", previous.optString("email"));
            }
            String authorizationUrl = oidc.getString("authorization_endpoint") + "?" + buildQuery(params);

            getActivity().runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(authorizationUrl));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                } catch (Exception error) {
                    closePendingServer();
                    call.reject("Could not open the browser for ChatGPT sign-in.");
                }
            });

            JSONObject callback = acceptCallback(server, state);
            String callbackClientId = callback.getString("clientId");
            if (!isNew && !callbackClientId.equals(previous.optString("clientId"))) {
                throw new IllegalStateException("ChatGPT returned a different client registration for this saved account.");
            }
            // Persist the issued registration before exchanging its one-time code.
            // A failed/expired code can then be retried with the same client_id.
            JSONObject pendingProfile = new JSONObject(previous.toString());
            pendingProfile.put("clientId", callbackClientId);
            pendingProfile.put("status", "disconnected");
            upsertProfile(root, pendingProfile);
            root.put("activeProfileId", pendingProfile.getString("id"));
            writeStore(root);

            JSONObject token = exchangeCode(callback, verifier, redirectUri, oidc);
            String clientId = callback.getString("clientId");
            if (!clientId.equals(token.optString("client_id", clientId))) throw new IllegalStateException("ChatGPT returned a different OAuth client registration.");
            if (!"Bearer".equalsIgnoreCase(token.optString("token_type")) ||
                    token.optString("access_token").isEmpty() || token.optString("refresh_token").isEmpty() ||
                    token.optDouble("expires_in", 0) <= 0 || !token.has("id_token")) {
                throw new IllegalStateException("ChatGPT did not return the complete credentials required for plan sharing.");
            }
            JSONArray scopes = parseScopes(token.optString("scope", ""));
            boolean sharing = false;
            for (int i = 0; i < scopes.length(); i++) if (REQUIRED_SCOPE.equals(scopes.optString(i))) sharing = true;
            if (!sharing) throw new IllegalStateException("Login succeeded, but ChatGPT plan-use permission was not granted. Enable token sharing when asked, then reconnect.");

            JSONObject identity = verifyIdToken(token.getString("id_token"), clientId, nonce, oidc.getString("jwks_uri"));
            String subject = identity.getString("subject");
            if (!existingSubject.isEmpty() && !existingSubject.equals(subject)) throw new IllegalStateException("This login returned a different ChatGPT account. Add a new account instead of replacing the existing profile.");

            JSONObject profile = new JSONObject();
            profile.put("id", previous.getString("id"));
            profile.put("label", identity.optString("email", previous.optString("label", "ChatGPT account")));
            profile.put("clientId", clientId);
            profile.put("subject", subject);
            profile.put("name", identity.optString("name", ""));
            profile.put("email", identity.optString("email", ""));
            profile.put("status", "connected");
            profile.put("scopes", scopes);
            profile.put("idToken", token.getString("id_token"));
            profile.put("accessToken", token.getString("access_token"));
            profile.put("refreshToken", token.getString("refresh_token"));
            profile.put("expiresAt", System.currentTimeMillis() + (long) (token.getDouble("expires_in") * 1000));
            if (token.has("earliest_refresh_at")) profile.put("earliestRefreshAt", token.opt("earliest_refresh_at"));

            upsertProfile(root, profile);
            root.put("activeProfileId", profile.getString("id"));
            writeStore(root);
            JSObject result = publicSession(root);
            result.put("ok", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("ChatGPT sign-in failed: " + error.getMessage());
        } finally {
            closePendingServer();
        }
    }

    private JSONObject acceptCallback(ServerSocket server, String state) throws Exception {
        try (Socket socket = server.accept()) {
            socket.setSoTimeout(15000);
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            String requestLine = reader.readLine();
            if (requestLine == null || !requestLine.startsWith("GET ")) throw new IllegalStateException("Unexpected ChatGPT callback request.");
            String target = requestLine.split(" ", 3)[1];
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {}
            Uri callback = Uri.parse("http://127.0.0.1" + target);
            if (!CALLBACK_PATH.equals(callback.getPath())) throw new IllegalStateException("ChatGPT callback path did not match.");
            String returnedState = callback.getQueryParameter("state");
            if (returnedState == null || callback.getQueryParameters("state").size() != 1 ||
                    callback.getQueryParameters("code").size() > 1 || callback.getQueryParameters("client_id").size() != 1 ||
                    !MessageDigest.isEqual(state.getBytes(StandardCharsets.UTF_8), returnedState.getBytes(StandardCharsets.UTF_8))) {
                writeCallback(socket, "Invalid sign-in state. Return to the app and try again.");
                throw new IllegalStateException("ChatGPT sign-in state validation failed.");
            }
            if (callback.getQueryParameter("error") != null) {
                writeCallback(socket, "ChatGPT sign-in was not completed. Return to the app and try again.");
                throw new IllegalStateException("ChatGPT sign-in was not completed. You can retry from Device settings.");
            }
            String code = callback.getQueryParameter("code");
            String clientId = callback.getQueryParameter("client_id");
            if (code == null || code.isEmpty() || clientId == null ||
                    !clientId.matches("[A-Za-z0-9_-]{1,200}") || "dynamic_agent_client".equals(clientId)) {
                writeCallback(socket, "ChatGPT did not complete app registration. Return to the app.");
                throw new IllegalStateException("ChatGPT did not return an authorization code and registered client ID.");
            }
            writeCallback(socket, "ChatGPT sign-in received. Return to NUX MG-30 Studio.");
            JSONObject result = new JSONObject();
            result.put("code", code);
            result.put("clientId", clientId);
            return result;
        }
    }

    private void upsertProfile(JSONObject root, JSONObject profile) throws Exception {
        JSONArray current = root.getJSONArray("profiles");
        JSONArray updated = new JSONArray();
        boolean replaced = false;
        for (int i = 0; i < current.length(); i++) {
            JSONObject row = current.getJSONObject(i);
            if (profile.getString("id").equals(row.optString("id"))) {
                updated.put(profile);
                replaced = true;
            } else updated.put(row);
        }
        if (!replaced) updated.put(profile);
        root.put("profiles", updated);
    }

    private void closePendingServer() {
        ServerSocket server = pendingServer;
        pendingServer = null;
        if (server != null) try { server.close(); } catch (Exception ignored) {}
    }

    private String refreshAccessToken(JSONObject profile) throws Exception {
        long expiresAt = profile.optLong("expiresAt", 0);
        if (expiresAt > System.currentTimeMillis() + 60000) return profile.getString("accessToken");
        JSONObject oidc = discovery();
        Object earliestValue = profile.opt("earliestRefreshAt");
        long earliest = 0;
        if (earliestValue instanceof Number) {
            earliest = ((Number) earliestValue).longValue() * 1000L;
        } else if (earliestValue instanceof String) {
            String value = (String) earliestValue;
            try { earliest = Long.parseLong(value) * 1000L; }
            catch (Exception ignored) {
                try {
                    SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US);
                    Date parsed = iso.parse(value);
                    if (parsed != null) earliest = parsed.getTime();
                } catch (Exception ignoredAgain) {}
            }
        }
        if (earliest > System.currentTimeMillis() && expiresAt > System.currentTimeMillis()) {
            throw new IllegalStateException("ChatGPT access token is not yet eligible for refresh. Try again shortly.");
        }

        JSONObject form = new JSONObject();
        form.put("grant_type", "refresh_token");
        form.put("client_id", profile.getString("clientId"));
        form.put("refresh_token", profile.getString("refreshToken"));
        form.put("resource", RESOURCE);
        JSONObject token = postForm(oidc.getString("token_endpoint"), form);
        String access = token.optString("access_token", "");
        String refresh = token.optString("refresh_token", profile.optString("refreshToken", ""));
        double expires = token.optDouble("expires_in", 0);
        if (access.isEmpty() || refresh.isEmpty() || expires <= 0) throw new IllegalStateException("ChatGPT refresh response did not contain complete credentials.");

        if (token.has("id_token")) {
            JSONObject identity = verifyIdToken(token.getString("id_token"), profile.getString("clientId"), null, oidc.getString("jwks_uri"));
            if (!profile.optString("subject").equals(identity.optString("subject"))) throw new IllegalStateException("Refreshed ChatGPT identity does not match the saved account.");
            profile.put("idToken", token.getString("id_token"));
        }
        JSONArray scopes = token.has("scope") ? parseScopes(token.optString("scope")) : profile.optJSONArray("scopes");
        boolean sharing = false;
        if (scopes != null) for (int i = 0; i < scopes.length(); i++) if (REQUIRED_SCOPE.equals(scopes.optString(i))) sharing = true;
        if (!sharing) throw new IllegalStateException("ChatGPT plan-use permission is no longer available. Reconnect ChatGPT.");

        profile.put("accessToken", access);
        profile.put("refreshToken", refresh);
        profile.put("expiresAt", System.currentTimeMillis() + (long) (expires * 1000));
        profile.put("scopes", scopes);
        if (token.has("earliest_refresh_at")) profile.put("earliestRefreshAt", token.opt("earliest_refresh_at"));
        JSONObject root = readStore();
        upsertProfile(root, profile);
        writeStore(root);
        return access;
    }

    private JSONObject requireActiveProfile() throws Exception {
        JSONObject root = readStore();
        JSONObject profile = activeProfile(root);
        if (profile == null || !"connected".equals(profile.optString("status")) ||
                profile.optString("accessToken").isEmpty() || profile.optString("refreshToken").isEmpty()) {
            throw new IllegalStateException("Sign in with ChatGPT from Device settings first.");
        }
        return profile;
    }

    @PluginMethod
    public void getSession(PluginCall call) {
        try { call.resolve(publicSession(readStore())); }
        catch (Exception error) { call.reject("Could not read ChatGPT connection state: " + error.getMessage()); }
    }

    @PluginMethod
    public void listProfiles(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("profiles", publicProfiles(readStore()));
            call.resolve(result);
        } catch (Exception error) { call.reject("Could not read ChatGPT accounts: " + error.getMessage()); }
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        new Thread(() -> doSignIn(call), "mg30-chatgpt-signin").start();
    }

    @PluginMethod
    public void cancelSignIn(PluginCall call) {
        closePendingServer();
        call.resolve();
    }

    @PluginMethod
    public void selectProfile(PluginCall call) {
        try {
            String id = call.getString("profileId", "");
            JSONObject root = readStore();
            JSONArray rows = root.getJSONArray("profiles");
            boolean found = false;
            for (int i = 0; i < rows.length(); i++) if (id.equals(rows.getJSONObject(i).optString("id"))) found = true;
            if (!found) throw new IllegalArgumentException("ChatGPT account profile was not found.");
            root.put("activeProfileId", id);
            writeStore(root);
            call.resolve(publicSession(root));
        } catch (Exception error) { call.reject("Could not switch ChatGPT account: " + error.getMessage()); }
    }

    @PluginMethod
    public void logout(PluginCall call) {
        new Thread(() -> {
            try {
                JSONObject root = readStore();
                JSONObject profile = activeProfile(root);
                if (profile == null) { call.resolve(publicSession(root)); return; }
                String refresh = profile.optString("refreshToken", "");
                if (!refresh.isEmpty()) {
                    try {
                        JSONObject oidc = discovery();
                        JSONObject form = new JSONObject();
                        form.put("token", refresh);
                        form.put("token_type_hint", "refresh_token");
                        form.put("client_id", profile.getString("clientId"));
                        postFormNoBody(oidc.getString("revocation_endpoint"), form);
                    } catch (Exception ignored) { /* Local credentials are removed even if remote revocation is offline. */ }
                }
                profile.remove("accessToken");
                profile.remove("refreshToken");
                profile.remove("expiresAt");
                profile.remove("earliestRefreshAt");
                profile.put("status", "disconnected");
                profile.put("scopes", new JSONArray());
                upsertProfile(root, profile);
                writeStore(root);
                call.resolve(publicSession(root));
            } catch (Exception error) { call.reject("Could not disconnect ChatGPT: " + error.getMessage()); }
        }, "mg30-chatgpt-logout").start();
    }

    @PluginMethod
    public void listModels(PluginCall call) {
        new Thread(() -> {
            try {
                JSONObject profile = requireActiveProfile();
                String token = refreshAccessToken(profile);
                JSONObject body = getJson(API_BASE + "/models", token, "application/json");
                JSONArray rows = body.optJSONArray("models");
                if (rows == null) throw new IllegalStateException("ChatGPT returned an unexpected model catalogue.");
                JSONArray models = new JSONArray();
                for (int i = 0; i < rows.length(); i++) {
                    JSONObject row = rows.optJSONObject(i);
                    if (row == null || !"list".equals(row.optString("visibility"))) continue;
                    String slug = row.optString("slug", "");
                    String name = row.optString("display_name", "");
                    if (slug.isEmpty() || name.isEmpty()) continue;
                    JSONObject item = new JSONObject();
                    item.put("slug", slug);
                    item.put("displayName", name);
                    models.put(item);
                }
                JSObject result = new JSObject();
                result.put("models", models);
                call.resolve(result);
            } catch (Exception error) { call.reject(error.getMessage()); }
        }, "mg30-chatgpt-models").start();
    }

    @PluginMethod
    public void sendResponse(PluginCall call) {
        responseCancelled.set(false);
        new Thread(() -> {
            HttpsURLConnection connection = null;
            try {
                JSONObject profile = requireActiveProfile();
                String accessToken = refreshAccessToken(profile);
                String model = call.getString("model", "").trim();
                if (model.isEmpty() || model.length() > 160) throw new IllegalArgumentException("Choose an available ChatGPT model.");
                String instructions = call.getString("instructions", "");
                String rawInput = call.getString("input", "[]");
                JSONArray input = new JSONArray(rawInput);
                if (input.length() < 1 || input.length() > 40) throw new IllegalArgumentException("Conversation context must contain between 1 and 40 messages.");
                for (int i = 0; i < input.length(); i++) {
                    JSONObject message = input.optJSONObject(i);
                    if (message == null || !("user".equals(message.optString("role")) ||
                            "assistant".equals(message.optString("role")) || "developer".equals(message.optString("role"))) ||
                            !(message.opt("content") instanceof String)) {
                        throw new IllegalArgumentException("Conversation messages must use user, assistant, or developer roles with text content.");
                    }
                }
                JSONObject payload = new JSONObject();
                payload.put("model", model);
                payload.put("instructions", instructions);
                payload.put("input", input);
                payload.put("store", false);
                payload.put("stream", true);

                byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
                if (bytes.length > 900000) throw new IllegalArgumentException("Conversation context is too large. Shorten the discussion and try again.");
                connection = connection(API_BASE + "/responses", "POST");
                connection.setDoOutput(true);
                connection.setRequestProperty("Authorization", "Bearer " + accessToken);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Accept", "text/event-stream");
                connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
                connection.setReadTimeout(READ_TIMEOUT_MS);
                try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }

                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) {
                    InputStream errorStream = connection.getErrorStream();
                    String errorText = readLimited(errorStream, 65536);
                    JSONObject errorBody = new JSONObject(errorText.isEmpty() ? "{}" : errorText);
                    throw new IllegalStateException(apiError(errorBody, status));
                }

                StringBuilder finalText = new StringBuilder();
                boolean completed = false;
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null && !responseCancelled.get()) {
                        if (!line.startsWith("data:")) continue;
                        String data = line.substring(5).trim();
                        if (data.isEmpty() || "[DONE]".equals(data)) continue;
                        JSONObject event;
                        try { event = new JSONObject(data); } catch (Exception ignored) { continue; }
                        String type = event.optString("type", "");
                        if ("response.output_text.delta".equals(type)) {
                            String delta = event.optString("delta", "");
                            finalText.append(delta);
                            if (finalText.length() > MAX_RESPONSE_CHARS) throw new IllegalStateException("ChatGPT response exceeded the app's safe display limit.");
                            JSObject update = new JSObject();
                            update.put("delta", delta);
                            notifyListeners("chatgptDelta", update);
                        } else if ("response.failed".equals(type) || "error".equals(type)) {
                            JSONObject detail = event.optJSONObject("response");
                            throw new IllegalStateException(detail != null ? apiError(detail, status) : apiError(event, status));
                        } else if ("response.incomplete".equals(type)) {
                            throw new IllegalStateException("ChatGPT stopped before completing the response. You can retry.");
                        } else if ("response.completed".equals(type)) {
                            completed = true;
                            break;
                        }
                    }
                }
                if (responseCancelled.get()) throw new InterruptedException("ChatGPT response cancelled.");
                if (!completed) throw new IllegalStateException("ChatGPT stream ended before response.completed. Try again.");
                JSObject result = new JSObject();
                result.put("text", finalText.toString());
                result.put("model", model);
                call.resolve(result);
            } catch (InterruptedException error) {
                call.reject(error.getMessage());
            } catch (Exception error) {
                call.reject(error.getMessage() == null ? "ChatGPT request failed." : error.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "mg30-chatgpt-response").start();
    }

    @PluginMethod
    public void cancelResponse(PluginCall call) {
        responseCancelled.set(true);
        call.resolve();
    }

    private String readLimited(InputStream stream, int max) throws Exception {
        if (stream == null) return "";
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = stream.read(buffer)) != -1) {
            output.write(buffer, 0, count);
            if (output.size() > max) break;
        }
        return new String(output.toByteArray(), StandardCharsets.UTF_8);
    }
}
