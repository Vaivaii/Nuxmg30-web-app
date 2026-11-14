
const VERSION = "1.1.0";
const TOKEN_TTL_SECONDS = 604800;
const enc = new TextEncoder();

function equal(a, b) {
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - s.length % 4) % 4);
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
async function importHmac(secret, usages) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usages);
}
async function createToken(username, secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: username, iat: now, exp: now + TOKEN_TTL_SECONDS, iss: "nux-mg30-studio" };
  const part = b64url(enc.encode(JSON.stringify(payload)));
  const key = await importHmac(secret, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(part)));
  return part + "." + b64url(sig);
}
async function verifyToken(token, secret) {
  try {
    const p = token.split(".");
    if (p.length !== 2) return null;
    const key = await importHmac(secret, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, fromB64url(p[1]), enc.encode(p[0]));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(p[0])));
    if (!data.sub || data.iss !== "nux-mg30-studio" || !Number.isFinite(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const PROVIDERS = {
  gpt: { secret: "OPENAI_API_KEY", api: "openai" },
  openai: { secret: "OPENAI_API_KEY", api: "openai" },
  gemini: { secret: "GEMINI_API_KEY", api: "gemini" },
  groq: { secret: "GROQ_API_KEY", api: "groq" },
  openrouter: { secret: "OPENROUTER_API_KEY", api: "openrouter" }
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const configured = String(env.APP_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  const defaults = ["capacitor://localhost", "https://localhost", "http://localhost", "http://localhost:5173"];
  const allowed = configured.length ? configured : defaults;
  const headers = { "Vary": "Origin", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type, X-TONE3000-Authorization", "Access-Control-Max-Age": "86400" };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function bearer(request) {
  const value = request.headers.get("Authorization") || "";
  return /^Bearer\s+\S+$/i.test(value) ? value : "";
}
async function requireAccount(request, env) {
  const token = bearer(request);
  if (!token) return { ok: false, response: json({ ok: false, error: "Cloud Account login is required." }, 401) };
  if (!env.APP_AUTH_SECRET || !String(env.APP_AUTH_SECRET).trim()) return { ok: false, response: json({ ok: false, error: "Cloud authentication is not configured." }, 503) };
  const payload = await verifyToken(token.slice(7), env.APP_AUTH_SECRET);
  if (!payload) return { ok: false, response: json({ ok: false, error: "Cloud Account session is invalid or expired." }, 401) };
  return { ok: true, user: { username: payload.sub } };
}
async function readBody(request, maxBytes = 256_000) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > maxBytes) throw new Error("Request body exceeds the allowed size.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("Request body exceeds the allowed size.");
  try { return JSON.parse(text || "{}"); } catch { throw new Error("Request body must be valid JSON."); }
}
async function timedFetch(url, init = {}, timeoutMs = 90_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal, redirect: "manual" }); }
  catch (error) {
    if (error?.name === "AbortError") throw new Error("Upstream service timed out.");
    throw new Error("Upstream service could not be reached.");
  } finally { clearTimeout(timer); }
}
async function responseJson(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { throw new Error("Provider returned an invalid response."); }
}
function textModel(id) {
  return Boolean(id) && !/(embed|whisper|audio|speech|transcri|\btts\b|image|video|moderation|guard|rerank|realtime|robotics)/i.test(id);
}
function modelRows(provider, body) {
  let rows = [];
  if (provider === "gemini") rows = (body.models || []).filter(x => (x.supportedGenerationMethods || []).includes("generateContent") && textModel(x.name || ""))
    .map(x => ({ id: String(x.name || "").replace(/^models\//, ""), name: x.displayName || String(x.name || "").replace(/^models\//, "") }));
  else if (provider === "openrouter") {
    rows = (body.data || []).filter(x => textModel(x.id || "") && Number(x?.pricing?.prompt) === 0 && Number(x?.pricing?.completion) === 0)
      .map(x => ({ id: x.id, name: x.name || x.id }));
    rows.unshift({ id: "openrouter/free", name: "Auto Free Model Router" });
  } else rows = (body.data || []).filter(x => {
    const id = String(x.id || "");
    return textModel(id) && (provider !== "openai" || /^(gpt-|o[134]-|chatgpt-)/i.test(id));
  }).map(x => ({ id: x.id, name: x.id }));
  const seen = new Set();
  return rows.filter(x => x.id && !seen.has(x.id) && seen.add(x.id)).slice(0, 100);
}
async function listModels(provider, env) {
  const config = PROVIDERS[provider];
  if (!config) return json({ ok: false, error: "Unknown AI provider." }, 400);
  const key = String(env[config.secret] || "").trim();
  if (!key) return json({ ok: false, error: "Provider is not configured in Cloudflare Worker." }, 503);
  let url, headers = {};
  if (config.api === "openai") { url = "https://api.openai.com/v1/models"; headers.Authorization = "Bearer " + key; }
  if (config.api === "gemini") { url = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100"; headers["x-goog-api-key"] = key; }
  if (config.api === "groq") { url = "https://api.groq.com/openai/v1/models"; headers.Authorization = "Bearer " + key; }
  if (config.api === "openrouter") { url = "https://openrouter.ai/api/v1/models"; headers.Authorization = "Bearer " + key; }
  const upstream = await timedFetch(url, { headers }, 30_000);
  const body = await responseJson(upstream);
  if (!upstream.ok) {
    const providerMessage = String(body?.error?.message || body?.error?.status || body?.message || "").slice(0, 240);
    return json({
      ok: false,
      provider: config.api,
      error: "Provider model catalogue request failed.",
      upstreamStatus: upstream.status,
      upstreamMessage: providerMessage || null,
      worker: "nux-mg30-studio-api",
      workerVersion: VERSION
    }, 502);
  }
  return json({ ok: true, service: "nux-mg30-studio-api", workerVersion: VERSION, provider: config.api, models: modelRows(config.api, body) });
}
function extractJsonObject(value) {
  const text = String(value || "").trim();
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("Provider did not return a JSON Tone Plan.");
  return JSON.parse(text.slice(a, b + 1));
}
function geminiText(body) {
  return (body?.candidates?.[0]?.content?.parts || []).map(x => x?.text || "").filter(Boolean).join("\n");
}
function chatText(body) {
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(x => typeof x === "string" ? x : x?.text || x?.content || "").filter(Boolean).join("\n");
  return String(body?.output_text || body?.choices?.[0]?.text || "");
}
function safeProviderError(status) {
  if (status === 401 || status === 403) return "Provider rejected the Cloudflare credential or access.";
  if (status === 429) return "Provider quota or rate limit reached.";
  if (status >= 500) return "Provider is temporarily unavailable.";
  return "Provider rejected the request. Check the selected model and request settings.";
}
async function generateTonePlan(provider, model, system, prompt, env) {
  const config = PROVIDERS[provider];
  if (!config) throw Object.assign(new Error("Unknown AI provider."), { status: 400 });
  const key = String(env[config.secret] || "").trim();
  if (!key) throw Object.assign(new Error("Provider is not configured in Cloudflare Worker."), { status: 503 });
  if (!model || model.length > 200) throw Object.assign(new Error("A valid model must be selected."), { status: 400 });
  let upstream, body;
  if (config.api === "gemini") {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
    upstream = await timedFetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.35, maxOutputTokens: 2600 } }) });
    body = await responseJson(upstream);
    if (!upstream.ok) throw Object.assign(new Error(safeProviderError(upstream.status)), { status: upstream.status });
    return extractJsonObject(geminiText(body));
  }
  if (config.api === "openai") {
    upstream = await timedFetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model, input: [{ role: "system", content: [{ type: "input_text", text: system }] }, { role: "user", content: [{ type: "input_text", text: prompt }] }], text: { format: { type: "json_object" } }, max_output_tokens: 2600 }) });
    body = await responseJson(upstream);
    if (!upstream.ok) throw Object.assign(new Error(safeProviderError(upstream.status)), { status: upstream.status });
    const output = typeof body.output_text === "string" ? body.output_text :
      (body.output || []).flatMap(x => x.content || []).map(x => x.text || "").filter(Boolean).join("\n");
    return extractJsonObject(output);
  }
  const isGroq = config.api === "groq";
  const isGptOss = isGroq && model.toLowerCase().startsWith("openai/gpt-oss-");
  const base = isGroq ? "https://api.groq.com/openai/v1" : "https://openrouter.ai/api/v1";
  const messages = isGptOss ? [{ role: "user", content: system + "\n\n" + prompt }] :
    [{ role: "system", content: system + "\nReturn a valid JSON object only." }, { role: "user", content: prompt }];
  const request = async (retry = false) => {
    const payload = {
      model, messages: retry ? [...messages.slice(0, -1), { role: "user", content: messages[messages.length - 1].content +
        "\n\nFINAL OUTPUT CONTRACT: Return one complete JSON object only with summary, blocks, and notes." }] : messages,
      ...(retry ? {} : { response_format: { type: "json_object" } }),
      ...(isGroq ? { max_completion_tokens: retry ? 3200 : 2600 } : { max_tokens: retry ? 3200 : 2600, reasoning: { effort: "low", exclude: true } }),
      ...(isGptOss ? { reasoning_effort: "low", include_reasoning: false } : { temperature: 0.2 })
    };
    const response = await timedFetch(base + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify(payload) });
    const data = await responseJson(response);
    if (!response.ok) {
      const failedGeneration = Boolean(data?.error?.failed_generation);
      throw Object.assign(new Error(safeProviderError(response.status)), {
        status: response.status, failedGeneration,
        retryable: response.status === 429 || response.status >= 500
      });
    }
    return extractJsonObject(chatText(data));
  };
  try { return await request(false); }
  catch (error) {
    if ((isGroq && (error instanceof SyntaxError || error.failedGeneration || (error.status === 400 && /rejected the request/i.test(error.message)))) ||
        (config.api === "openrouter" && (error instanceof SyntaxError || /JSON Tone Plan|invalid response/i.test(error.message)))) {
      try { return await request(true); } catch (retryError) { throw retryError; }
    }
    throw error;
  }
}
function toneAuth(request) {
  const value = request.headers.get("X-TONE3000-Authorization") || "";
  return /^Bearer\s+\S+$/i.test(value) ? value : "";
}
function tonePathAllowed(value) {
  return value === "/tones/search" || value === "/models" || /^\/tones\/\d+$/.test(value);
}
async function proxyTone3000(request, env, url) {
  const token = toneAuth(request);
  if (!token) return json({ ok: false, error: "TONE3000 account authorization is required." }, 401);
  const rawPath = url.searchParams.get("path") || "";
  let upstreamUrl;
  try {
    const relativePath = rawPath.startsWith("/") ? rawPath : "/" + rawPath;
    upstreamUrl = new URL("https://www.tone3000.com/api/v1" + relativePath);
  } catch { return json({ ok: false, error: "Invalid TONE3000 API path." }, 400); }
  const apiPath = upstreamUrl.pathname.slice("/api/v1".length) || "/";
  if (upstreamUrl.origin !== "https://www.tone3000.com" || !tonePathAllowed(apiPath)) return json({ ok: false, error: "TONE3000 API path is not allowed through this gateway." }, 400);
  const allowedQuery = new Set(["page", "page_size", "sort", "gears", "format", "architecture", "query", "tone_id"]);
  for (const key of upstreamUrl.searchParams.keys()) if (!allowedQuery.has(key)) return json({ ok: false, error: "Unsupported TONE3000 query parameter." }, 400);
  const upstream = await timedFetch(upstreamUrl.toString(), { headers: { Authorization: token, Accept: "application/json" } }, 45_000);
  const bodyText = await upstream.text();
  let body;
  try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return json({ ok: false, error: "TONE3000 returned invalid JSON." }, 502); }
  return json(body, upstream.status);
}
function toneOfficialHost(host) {
  return host === "tone3000.com" || host.endsWith(".tone3000.com");
}
function toneAssetAllowed(host, env) {
  const configured = String(env.TONE3000_ASSET_HOSTS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  return toneOfficialHost(host) || configured.includes(host);
}
async function downloadToneModel(request, env, url) {
  const token = toneAuth(request);
  if (!token) return json({ ok: false, error: "TONE3000 account authorization is required." }, 401);
  let target;
  try { target = new URL(url.searchParams.get("url") || ""); } catch { return json({ ok: false, error: "Invalid model download URL." }, 400); }
  if (target.protocol !== "https:" || !toneAssetAllowed(target.hostname.toLowerCase(), env)) {
    return json({ ok: false, error: "TONE3000 model host is not in the Worker allow-list. Add the verified asset hostname to TONE3000_ASSET_HOSTS." }, 403);
  }

  let upstream = null;
  for (let hop = 0; hop < 4; hop++) {
    const headers = { Accept: "*/*" };
    // Never forward a user's TONE3000 OAuth token to a third-party asset/CDN host.
    if (toneOfficialHost(target.hostname.toLowerCase())) headers.Authorization = token;
    upstream = await timedFetch(target.toString(), { headers }, 60_000);
    if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
    const location = upstream.headers.get("Location");
    if (!location) return json({ ok: false, error: "TONE3000 model redirect did not include a destination." }, 502);
    try { target = new URL(location, target); } catch { return json({ ok: false, error: "TONE3000 model redirect URL is invalid." }, 502); }
    if (target.protocol !== "https:" || !toneAssetAllowed(target.hostname.toLowerCase(), env)) {
      return json({ ok: false, error: "TONE3000 redirected the model to a host that is not allow-listed. Verify and add its exact hostname to TONE3000_ASSET_HOSTS." }, 403);
    }
  }
  if (!upstream || !upstream.ok) return json({ ok: false, error: "TONE3000 model download failed.", upstreamStatus: upstream?.status || 502 }, 502);
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/octet-stream");
  headers.set("Cache-Control", "no-store");
  const length = upstream.headers.get("Content-Length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { status: 200, headers });
}
async function youtubeSearch(url, env) {
  const key = String(env.YOUTUBE_DATA_API_KEY || "").trim();
  if (!key) return json({ ok: false, error: "YouTube Data API is not configured in Cloudflare Worker." }, 503);
  const q = String(url.searchParams.get("q") || "").trim();
  if (q.length < 2 || q.length > 200) return json({ ok: false, error: "Search query must contain 2 to 200 characters." }, 400);
  const params = new URLSearchParams({ part: "snippet", type: "video", maxResults: "12", q, videoEmbeddable: "true", key });
  const upstream = await timedFetch("https://www.googleapis.com/youtube/v3/search?" + params.toString(), {}, 30_000);
  const body = await responseJson(upstream);
  if (!upstream.ok) {
    const reason = body?.error?.errors?.[0]?.reason || "";
    const message = reason === "quotaExceeded" ? "YouTube Data API daily quota has been exceeded." :
      reason === "keyInvalid" ? "YouTube Data API key is invalid." : "YouTube search request failed.";
    return json({ ok: false, error: message, reason }, upstream.status >= 500 ? 502 : upstream.status);
  }
  return json({ ok: true, items: body.items || [] });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), request, env);
    let response;
    try {
      if (url.pathname === "/auth/login" && request.method === "POST") {
        if (!String(env.APP_LOGIN_USERNAME || "").trim() || !String(env.APP_LOGIN_PASSWORD || "").trim() || !String(env.APP_AUTH_SECRET || "").trim()) {
          response = json({ ok: false, code: "AUTH_NOT_CONFIGURED", error: "Server authentication is not configured" }, 500);
        } else {
          let body;
          try { body = await request.json(); } catch { body = null; }
          if (!body || typeof body !== "object" || Array.isArray(body)) response = json({ ok: false, code: "INVALID_BODY", error: "Request body must contain username and password" }, 400);
          else {
            const username = typeof body.username === "string" ? body.username.trim() : "";
            const password = typeof body.password === "string" ? body.password : "";
            const configuredUsername = String(env.APP_LOGIN_USERNAME).trim();
            const configuredPassword = String(env.APP_LOGIN_PASSWORD).trim();
            const usernameMatch = equal(username, configuredUsername);
            const passwordMatch = equal(password, configuredPassword);
            if (!usernameMatch || !passwordMatch) response = json({ ok: false, code: "INVALID_CREDENTIALS", error: "Username or password is incorrect" }, 401);
            else {
              const token = await createToken(String(env.APP_LOGIN_USERNAME).trim(), env.APP_AUTH_SECRET);
              response = json({ ok: true, version: VERSION, token, token_type: "Bearer", expires_in: TOKEN_TTL_SECONDS, user: { username: String(env.APP_LOGIN_USERNAME).trim() } });
            }
          }
        }
      } else if (url.pathname === "/auth/me" && request.method === "GET") {
        if (!String(env.APP_AUTH_SECRET || "").trim()) response = json({ ok: false, code: "AUTH_NOT_CONFIGURED", error: "Server authentication is not configured" }, 500);
        else {
          const token = bearer(request).slice(7);
          const payload = token ? await verifyToken(token, env.APP_AUTH_SECRET) : null;
          if (!payload) response = json({ ok: false, error: "Unauthorized" }, 401);
          else response = json({ ok: true, user: { username: payload.sub }, expires_at: payload.exp });
        }
      } else if (url.pathname === "/auth/logout" && request.method === "POST") {
        response = json({ ok: true, message: "Discard the client token to log out" });
      } else if (url.pathname === "/health" && request.method === "GET") {
        response = json({
          ok: true, service: "nux-mg30-studio-api", version: VERSION,
          gateway_routes: {
            status: true, ai_providers: true, ai_models: true, ai_tone_plan: true,
            youtube_status: true, youtube_search: true, tone3000_proxy: true, tone3000_download: true
          },
          auth_configured: Boolean(String(env.APP_LOGIN_USERNAME || "").trim() && String(env.APP_LOGIN_PASSWORD || "").trim() && String(env.APP_AUTH_SECRET || "").trim()),
          secret_checks: {
            APP_LOGIN_USERNAME: Boolean(String(env.APP_LOGIN_USERNAME || "").trim()),
            APP_LOGIN_PASSWORD: Boolean(String(env.APP_LOGIN_PASSWORD || "").trim()),
            APP_AUTH_SECRET: Boolean(String(env.APP_AUTH_SECRET || "").trim()),
            GEMINI_API_KEY: Boolean(String(env.GEMINI_API_KEY || "").trim()),
            GROQ_API_KEY: Boolean(String(env.GROQ_API_KEY || "").trim()),
            OPENROUTER_API_KEY: Boolean(String(env.OPENROUTER_API_KEY || "").trim()),
            OPENAI_API_KEY: Boolean(String(env.OPENAI_API_KEY || "").trim()),
            YOUTUBE_DATA_API_KEY: Boolean(String(env.YOUTUBE_DATA_API_KEY || "").trim())
          },
          ai: { gemini: Boolean(env.GEMINI_API_KEY), groq: Boolean(env.GROQ_API_KEY), openrouter: Boolean(env.OPENROUTER_API_KEY), gpt: Boolean(env.OPENAI_API_KEY) },
          youtube: Boolean(String(env.YOUTUBE_DATA_API_KEY || "").trim()), tone3000_oauth_proxy: true
        });
      } else if (url.pathname === "/api/v1/status" && request.method === "GET") {
        const auth = await requireAccount(request, env);
        if (!auth.ok) response = auth.response;
        else response = json({ ok: true, user: { username: auth.user.username || null }, ai: {
          gpt: Boolean(env.OPENAI_API_KEY), gemini: Boolean(env.GEMINI_API_KEY), groq: Boolean(env.GROQ_API_KEY), openrouter: Boolean(env.OPENROUTER_API_KEY)
        }, youtube: Boolean(env.YOUTUBE_DATA_API_KEY), tone3000Proxy: true });
      } else if (url.pathname.startsWith("/api/v1/")) {
        const auth = await requireAccount(request, env);
        if (!auth.ok) response = auth.response;
        else if (url.pathname === "/api/v1/ai/providers" && request.method === "GET") {
          response = json({
            ok: true, service: "nux-mg30-studio-api", workerVersion: VERSION,
            providers: {
              gpt: Boolean(env.OPENAI_API_KEY), gemini: Boolean(env.GEMINI_API_KEY),
              groq: Boolean(env.GROQ_API_KEY), openrouter: Boolean(env.OPENROUTER_API_KEY)
            }
          });
        } else if (url.pathname === "/api/v1/ai/models" && request.method === "GET") {
          response = await listModels(url.searchParams.get("provider") || "", env);
        } else if (url.pathname === "/api/v1/ai/tone-plan" && request.method === "POST") {
          const body = await readBody(request);
          const requestedProvider = String(body.provider || "auto").toLowerCase();
          const system = String(body.system || "");
          const prompt = String(body.prompt || "");
          if (system.length > 180_000 || prompt.length > 40_000 || !system || !prompt) response = json({ ok: false, error: "AI request content is missing or exceeds the allowed size." }, 400);
          else {
            const order = requestedProvider === "auto" ? ["gemini", "groq", "openrouter"] : [requestedProvider];
            const failures = [];
            let completed = null;
            for (const candidate of order) {
              const keyName = PROVIDERS[candidate]?.secret;
              if (!keyName || !String(env[keyName] || "").trim()) { failures.push(candidate + ": not configured"); continue; }
              const defaultModels = { gemini: "gemini-2.5-flash", groq: "openai/gpt-oss-20b", openrouter: "openrouter/free" };
              const selectedModel = String(body.model || "").trim() || defaultModels[candidate];
              try {
                const tonePlan = await generateTonePlan(candidate, selectedModel, system, prompt, env);
                completed = { ok: true, provider: candidate, model: selectedModel, tonePlan, requestId: crypto.randomUUID() };
                break;
              } catch (error) {
                failures.push(candidate + ": " + (error.message || "provider error"));
                if (requestedProvider !== "auto" || !(error.retryable || error.status === 429 || error.status >= 500 || !error.status)) {
                  if (requestedProvider !== "auto") { response = json({ ok: false, error: error.message || "AI provider request failed.", requestId: crypto.randomUUID() }, error.status || 502); }
                  break;
                }
              }
            }
            if (completed) response = json(completed);
            else if (!response) response = json({ ok: false, error: "All automatic AI providers failed or are not configured.", failures, requestId: crypto.randomUUID() }, 503);
          }
        } else if (url.pathname === "/api/v1/youtube/status" && request.method === "GET") {
          response = json({ ok: true, configured: Boolean(env.YOUTUBE_DATA_API_KEY) });
        } else if (url.pathname === "/api/v1/youtube/search" && request.method === "GET") {
          response = await youtubeSearch(url, env);
        } else if (url.pathname === "/api/v1/tone3000/proxy" && request.method === "GET") {
          response = await proxyTone3000(request, env, url);
        } else if (url.pathname === "/api/v1/tone3000/download" && request.method === "GET") {
          response = await downloadToneModel(request, env, url);
        } else if (/^\/api\/v1\/tone3000\/tones\/\d+$/.test(url.pathname) && request.method === "GET") {
          const toneId = url.pathname.split("/").pop();
          const alias = new URL(url.toString());
          alias.searchParams.set("path", "/tones/" + toneId + (url.search ? url.search : ""));
          response = await proxyTone3000(request, env, alias);
        } else if (url.pathname === "/api/v1/tone3000/models" && request.method === "GET") {
          const params = new URLSearchParams(url.searchParams); params.delete("path");
          const alias = new URL(url.toString()); alias.searchParams.set("path", "/models?" + params.toString());
          response = await proxyTone3000(request, env, alias);
        } else if (url.pathname === "/api/v1/tone3000/model-download" && request.method === "GET") {
          const alias = new URL(url.toString()); alias.searchParams.set("url", url.searchParams.get("url") || "");
          response = await downloadToneModel(request, env, alias);
        } else response = json({ ok: false, error: "Cloud API route not found." }, 404);
      } else response = json({ ok: false, error: "Not found." }, 404);
    } catch (error) {
      response = json({ ok: false, error: error.message || "Request failed." }, 400);
    }
    return withCors(response, request, env);
  }
};
