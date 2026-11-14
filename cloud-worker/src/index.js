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
  const authBase = String(env.AUTH_API_BASE || "").replace(/\/+$/, "");
  if (!authBase) return { ok: false, response: json({ ok: false, error: "Cloud auth validation is not configured." }, 503) };
  try {
    const response = await fetch(authBase + "/auth/me", { method: "GET", headers: { Authorization: token, Accept: "application/json" }, redirect: "manual" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false || !body?.user) return { ok: false, response: json({ ok: false, error: "Cloud Account session is invalid or expired." }, 401) };
    return { ok: true, user: body.user };
  } catch {
    return { ok: false, response: json({ ok: false, error: "Cloud Account validation service is unavailable." }, 503) };
  }
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
  const key = env[config.secret];
  if (!key) return json({ ok: false, error: "Provider is not configured in Cloudflare Worker." }, 503);
  let url, headers = {};
  if (config.api === "openai") { url = "https://api.openai.com/v1/models"; headers.Authorization = "Bearer " + key; }
  if (config.api === "gemini") { url = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100"; headers["x-goog-api-key"] = key; }
  if (config.api === "groq") { url = "https://api.groq.com/openai/v1/models"; headers.Authorization = "Bearer " + key; }
  if (config.api === "openrouter") { url = "https://openrouter.ai/api/v1/models"; headers.Authorization = "Bearer " + key; }
  const upstream = await timedFetch(url, { headers }, 30_000);
  const body = await responseJson(upstream);
  if (!upstream.ok) return json({ ok: false, error: "Provider model catalogue request failed.", upstreamStatus: upstream.status }, upstream.status >= 500 ? 502 : upstream.status);
  return json({ ok: true, provider: config.api, models: modelRows(config.api, body) });
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
  const key = env[config.secret];
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
    if (!response.ok) throw Object.assign(new Error(safeProviderError(response.status)), { status: response.status, retryable: response.status === 429 || response.status >= 500 });
    return extractJsonObject(chatText(data));
  };
  try { return await request(false); }
  catch (error) {
    if ((isGroq || config.api === "openrouter") && (error instanceof SyntaxError || /JSON Tone Plan|invalid response/i.test(error.message))) {
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
  try { upstreamUrl = new URL(rawPath, "https://www.tone3000.com/api/v1"); } catch { return json({ ok: false, error: "Invalid TONE3000 API path." }, 400); }
  if (upstreamUrl.origin !== "https://www.tone3000.com" || !tonePathAllowed(upstreamUrl.pathname)) return json({ ok: false, error: "TONE3000 API path is not allowed through this gateway." }, 400);
  const allowedQuery = new Set(["page", "page_size", "sort", "gears", "format", "architecture", "query", "tone_id"]);
  for (const key of upstreamUrl.searchParams.keys()) if (!allowedQuery.has(key)) return json({ ok: false, error: "Unsupported TONE3000 query parameter." }, 400);
  const upstream = await timedFetch(upstreamUrl.toString(), { headers: { Authorization: token, Accept: "application/json" } }, 45_000);
  const bodyText = await upstream.text();
  let body;
  try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return json({ ok: false, error: "TONE3000 returned invalid JSON." }, 502); }
  return json(body, upstream.status);
}
function toneAssetAllowed(host, env) {
  const configured = String(env.TONE3000_ASSET_HOSTS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const allowed = ["tone3000.com", ...configured];
  return allowed.some(domain => host === domain || host.endsWith("." + domain));
}
async function downloadToneModel(request, env, url) {
  const token = toneAuth(request);
  if (!token) return json({ ok: false, error: "TONE3000 account authorization is required." }, 401);
  let target;
  try { target = new URL(url.searchParams.get("url") || ""); } catch { return json({ ok: false, error: "Invalid model download URL." }, 400); }
  if (target.protocol !== "https:" || !toneAssetAllowed(target.hostname, env)) return json({ ok: false, error: "TONE3000 model host is not in the Worker allow-list. Add the verified asset host to TONE3000_ASSET_HOSTS." }, 403);
  const upstream = await timedFetch(target.toString(), { headers: { Authorization: token } }, 60_000);
  if (!upstream.ok) return json({ ok: false, error: "TONE3000 model download failed.", upstreamStatus: upstream.status }, upstream.status);
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/octet-stream");
  headers.set("Cache-Control", "no-store");
  const length = upstream.headers.get("Content-Length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { status: 200, headers });
}
async function youtubeSearch(url, env) {
  const key = env.YOUTUBE_DATA_API_KEY;
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
      if (url.pathname === "/health" && request.method === "GET") {
        response = json({ ok: true, service: "nux-mg30-cloud-api", version: 1 });
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
          response = json({ ok: true, providers: {
            gpt: Boolean(env.OPENAI_API_KEY), gemini: Boolean(env.GEMINI_API_KEY), groq: Boolean(env.GROQ_API_KEY), openrouter: Boolean(env.OPENROUTER_API_KEY)
          } });
        } else if (url.pathname === "/api/v1/ai/models" && request.method === "GET") {
          response = await listModels(url.searchParams.get("provider") || "", env);
        } else if (url.pathname === "/api/v1/ai/tone-plan" && request.method === "POST") {
          const body = await readBody(request);
          const provider = String(body.provider || "");
          const model = String(body.model || "");
          const system = String(body.system || "");
          const prompt = String(body.prompt || "");
          if (system.length > 180_000 || prompt.length > 40_000 || !system || !prompt) response = json({ ok: false, error: "AI request content is missing or exceeds the allowed size." }, 400);
          else {
            try {
              const tonePlan = await generateTonePlan(provider, model, system, prompt, env);
              response = json({ ok: true, provider, model, tonePlan, requestId: crypto.randomUUID() });
            } catch (error) {
              response = json({ ok: false, error: error.message || "AI provider request failed.", requestId: crypto.randomUUID() }, error.status || 502);
            }
          }
        } else if (url.pathname === "/api/v1/youtube/status" && request.method === "GET") {
          response = json({ ok: true, configured: Boolean(env.YOUTUBE_DATA_API_KEY) });
        } else if (url.pathname === "/api/v1/youtube/search" && request.method === "GET") {
          response = await youtubeSearch(url, env);
        } else if (url.pathname === "/api/v1/tone3000/proxy" && request.method === "GET") {
          response = await proxyTone3000(request, env, url);
        } else if (url.pathname === "/api/v1/tone3000/download" && request.method === "GET") {
          response = await downloadToneModel(request, env, url);
        } else response = json({ ok: false, error: "Cloud API route not found." }, 404);
      } else response = json({ ok: false, error: "Not found." }, 404);
    } catch (error) {
      response = json({ ok: false, error: error.message || "Request failed." }, 400);
    }
    return withCors(response, request, env);
  }
};
