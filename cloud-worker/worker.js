
const VERSION = "1.2.5";
const WORKERS_AI_MODELS = [
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/openai/gpt-oss-20b",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/meta/llama-4-scout-17b-16e-instruct"
];
const WORKERS_AI_MODEL = WORKERS_AI_MODELS[0];
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
function workersAiText(body) {
  if (typeof body === "string") return body;
  if (typeof body?.response === "string") return body.response;
  if (typeof body?.response?.text === "string") return body.response.text;
  return chatText(body);
}
function normalizeWorkersAiUsage(body) {
  const raw = body?.usage || body?.metrics || body?.response?.usage;
  if (!raw || typeof raw !== "object") return null;
  const read = (...keys) => {
    for (const key of keys) {
      if (raw[key] === undefined || raw[key] === null || raw[key] === "") continue;
      const value = Number(raw[key]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return null;
  };
  const prompt_tokens = read("prompt_tokens", "input_tokens", "promptTokenCount");
  const completion_tokens = read("completion_tokens", "output_tokens", "completionTokenCount");
  const total_tokens = read("total_tokens", "totalTokenCount") ??
    (prompt_tokens !== null && completion_tokens !== null ? prompt_tokens + completion_tokens : null);
  if (prompt_tokens === null && completion_tokens === null && total_tokens === null) return null;
  return { prompt_tokens, completion_tokens, total_tokens };
}
function safeProviderError(status) {
  if (status === 401 || status === 403) return "Provider rejected the Cloudflare credential or access.";
  if (status === 429) return "Provider quota or rate limit reached.";
  if (status >= 500) return "Provider is temporarily unavailable.";
  return "Provider rejected the request. Check the selected model and request settings.";
}
function clampOutputTokenLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1200;
  return Math.max(96, Math.min(2048, Math.floor(parsed)));
}
function normalizeProviderUsage(body, api) {
  const usage = api === "gemini" ? body?.usageMetadata : body?.usage;
  if (!usage || typeof usage !== "object") return null;
  const input = api === "gemini" ? usage.promptTokenCount : (usage.input_tokens ?? usage.prompt_tokens);
  const output = api === "gemini" ? usage.candidatesTokenCount : (usage.output_tokens ?? usage.completion_tokens);
  const total = api === "gemini" ? usage.totalTokenCount : usage.total_tokens;
  if (input === undefined && output === undefined && total === undefined) return null;
  const inputTokens = Number(input || 0);
  const outputTokens = Number(output || 0);
  const totalTokens = Number(total ?? (inputTokens + outputTokens));
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
    total_tokens: totalTokens
  };
}
function mergeProviderUsage(...rows) {
  const values = rows.filter(Boolean);
  if (!values.length) return null;
  const sum = key => {
    const present = values.map(row => row[key]).filter(value => Number.isFinite(value));
    return present.length ? present.reduce((total, value) => total + value, 0) : null;
  };
  const prompt_tokens = sum("prompt_tokens"), completion_tokens = sum("completion_tokens");
  const total_tokens = sum("total_tokens") ??
    (prompt_tokens !== null && completion_tokens !== null ? prompt_tokens + completion_tokens : null);
  return { prompt_tokens, completion_tokens, total_tokens };
}
async function generateWorkersAiJson(system, prompt, env, maxOutputTokens = 1200, preferredModel = "") {
  if (!env.AI || typeof env.AI.run !== "function") {
    throw Object.assign(new Error("Cloudflare Workers AI binding AI is not configured."), { status: 503, retryable: true });
  }
  const messages = [
    { role: "system", content: String(system || "") + "\nReturn exactly one valid JSON object only. Do not use Markdown fences or explanatory text." },
    { role: "user", content: String(prompt || "") }
  ];
  const requestedModel = String(preferredModel || "").trim();
  if (requestedModel && !WORKERS_AI_MODELS.includes(requestedModel)) {
    throw Object.assign(new Error("Requested Cloudflare Workers AI model is not in the approved fallback list."), { status: 400 });
  }
  const candidates = requestedModel
    ? [requestedModel, ...WORKERS_AI_MODELS.filter(model => model !== requestedModel)]
    : WORKERS_AI_MODELS;
  const limit = clampOutputTokenLimit(maxOutputTokens);
  const failures = [];
  const usageRows = [];
  for (const model of candidates) {
    let usage = null;
    try {
      // Gemma 4 uses the completion-token and thinking-template options already validated
      // by the MG30 integration. The other Workers AI chat models use max_tokens.
      const options = model === WORKERS_AI_MODEL
        ? { messages, temperature: 0.2, max_completion_tokens: limit, response_format: { type: "json_object" }, chat_template_kwargs: { enable_thinking: false } }
        : { messages, temperature: 0.2, max_tokens: limit, response_format: { type: "json_object" } };
      const body = await env.AI.run(model, options);
      usage = normalizeWorkersAiUsage(body);
      const tonePlan = extractJsonObject(workersAiText(body));
      return { tonePlan, usage: mergeProviderUsage(...usageRows, usage), model };
    } catch (error) {
      if (usage) usageRows.push(usage);
      else if (error?.usage) usageRows.push(error.usage);
      failures.push(model + ": " + String(error?.message || "inference or JSON validation failed").slice(0, 220));
    }
  }
  const error = Object.assign(new Error("All configured Cloudflare Workers AI models failed. " + failures.join(" | ").slice(0, 900)), {
    status: 502, retryable: true, usage: mergeProviderUsage(...usageRows)
  });
  throw error;
}
async function generateTonePlan(provider, model, system, prompt, env, maxOutputTokens = 1200) {
  if (provider === "cloudflare") return generateWorkersAiJson(system, prompt, env, maxOutputTokens, model);
  const config = PROVIDERS[provider];
  if (!config) throw Object.assign(new Error("Unknown AI provider."), { status: 400 });
  const key = String(env[config.secret] || "").trim();
  if (!key) throw Object.assign(new Error("Provider is not configured in Cloudflare Worker."), { status: 503 });
  if (!model || model.length > 200) throw Object.assign(new Error("A valid model must be selected."), { status: 400 });
  let upstream, body;
  if (config.api === "gemini") {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
    upstream = await timedFetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.25, maxOutputTokens: clampOutputTokenLimit(maxOutputTokens) } }) });
    body = await responseJson(upstream);
    if (!upstream.ok) throw Object.assign(new Error(safeProviderError(upstream.status)), { status: upstream.status });
    const usage = normalizeProviderUsage(body, provider);
    try { return { tonePlan: extractJsonObject(geminiText(body)), usage }; }
    catch (error) { error.usage = usage; throw error; }
  }
  if (config.api === "openai") {
    upstream = await timedFetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model, input: [{ role: "system", content: [{ type: "input_text", text: system }] }, { role: "user", content: [{ type: "input_text", text: prompt }] }], text: { format: { type: "json_object" } }, max_output_tokens: clampOutputTokenLimit(maxOutputTokens) }) });
    body = await responseJson(upstream);
    if (!upstream.ok) throw Object.assign(new Error(safeProviderError(upstream.status)), { status: upstream.status });
    const output = typeof body.output_text === "string" ? body.output_text :
      (body.output || []).flatMap(x => x.content || []).map(x => x.text || "").filter(Boolean).join("\n");
    const usage = normalizeProviderUsage(body, provider);
    try { return { tonePlan: extractJsonObject(output), usage }; }
    catch (error) { error.usage = usage; throw error; }
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
      ...(isGroq ? { max_completion_tokens: clampOutputTokenLimit(maxOutputTokens) } : { max_tokens: clampOutputTokenLimit(maxOutputTokens), reasoning: { effort: "low", exclude: true } }),
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
    const usage = normalizeProviderUsage(data, provider);
    try { return { tonePlan: extractJsonObject(chatText(data)), usage }; }
    catch (error) { error.usage = usage; throw error; }
  };
  try { return await request(false); }
  catch (error) {
    if ((isGroq && (error instanceof SyntaxError || error.failedGeneration || (error.status === 400 && /rejected the request/i.test(error.message)))) ||
        (config.api === "openrouter" && (error instanceof SyntaxError || /JSON Tone Plan|invalid response/i.test(error.message) || error.retryable))) {
      try {
        const retryResult = await request(true);
        return { ...retryResult, usage: mergeProviderUsage(error.usage, retryResult.usage) };
      } catch (retryError) {
        retryError.usage = mergeProviderUsage(error.usage, retryError.usage);
        throw retryError;
      }
    }
    throw error;
  }
}
async function runAiLightTask(body, env) {
  const task = String(body?.task || "").trim();
  const taskLimits = {
    "tone-discussion": 520,
    "tone3000-search-terms": 180,
    "tone3000-profile-ranking": 320,
    "tone3000-capture-selection": 320,
    "provider-test": 96,
    "tone-plan": 3200,
    "tone-specialist": 1200
  };
  if (!Object.prototype.hasOwnProperty.call(taskLimits, task)) {
    return json({ ok: false, error: "Unsupported AI task." }, 400);
  }
  const role = String(body?.role || "");
  const specialistRoles = new Set([
    "tone_researcher", "amp_cabinet_specialist", "effects_specialist",
    "guitar_input_specialist", "tone_calibration_specialist", "tone_critic"
  ]);
  if (task === "tone-specialist" && !specialistRoles.has(role)) {
    return json({ ok: false, error: "Unsupported Tone Architect specialist role." }, 400);
  }
  const provider = String(body?.provider || "cloudflare").toLowerCase();
  if (!["cloudflare", "gemini", "groq", "openrouter"].includes(provider)) {
    return json({ ok: false, error: "Unsupported specialist AI provider." }, 400);
  }
  const system = String(body?.system || "");
  const prompt = String(body?.prompt || "");
  if (!system || !prompt || system.length > 30_000 || prompt.length > 40_000) {
    return json({ ok: false, error: "AI task content is missing or exceeds the allowed size." }, 400);
  }
  const requested = Number(body?.maxOutputTokens);
  const maxOutputTokens = Number.isFinite(requested)
    ? Math.max(96, Math.min(taskLimits[task], Math.floor(requested)))
    : taskLimits[task];
  const model = provider === "cloudflare"
    ? (String(body?.model || "").trim() || WORKERS_AI_MODEL)
    : String(body?.model || "").trim();
  if (!model) return json({ ok: false, error: "A model is required for this provider task." }, 400);
  try {
    const generated = await generateTonePlan(provider, model, system, prompt, env, maxOutputTokens);
    return json({
      ok: true, task, role: task === "tone-specialist" ? role : null,
      provider, model: generated.model || model, result: generated.tonePlan,
      usage: generated.usage || null, maxOutputTokens
    });
  } catch (error) {
    return json({
      ok: false, task, role: task === "tone-specialist" ? role : null,
      provider, model, error: error?.message || "AI provider task failed.",
      usage: error?.usage || null
    }, error?.status || 502);
  }
}
function toneAuth(request, env) {
  // Prefer the signed-in user's OAuth token. Use the optional Worker service secret
  // only when the app did not send a valid per-user OAuth header.
  const value = request.headers.get("X-TONE3000-Authorization") || "";
  if (/^Bearer\s+\S+$/i.test(value)) return value;
  const serviceKey = String(env.TONE3000_API_KEY || "").trim();
  if (!serviceKey) return "";
  const serviceAuthorization = /^Bearer\s+\S+$/i.test(serviceKey) ? serviceKey : "Bearer " + serviceKey;
  return /^Bearer\s+\S+$/i.test(serviceAuthorization) ? serviceAuthorization : "";
}
function tonePathAllowed(value) {
  return value === "/tones/search" || value === "/models" || /^\/tones\/\d+$/.test(value);
}
async function proxyTone3000(request, env, url) {
  const token = toneAuth(request, env);
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
async function tone3000AiSearch(request, env, body) {
  // Require the user's TONE3000 OAuth token. Do not use the Worker service-key
  // fallback for this AI search endpoint because search must remain user-scoped.
  const userOAuth = request.headers.get("X-TONE3000-Authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(userOAuth) || !toneAuth(request, env)) {
    return json({ ok: false, error: "TONE3000 signed-in user authorization is required." }, 401);
  }

  const query = String(body?.query || "").trim().replace(/\s+/g, " ").slice(0, 160);
  const gear = String(body?.gear || "amp-cab");
  if (query.length < 2) {
    return json({ ok: false, error: "A TONE3000 amplifier search phrase is required." }, 400);
  }
  if (gear !== "amp" && gear !== "amp-cab") {
    return json({ ok: false, error: "TONE3000 gear must be amp or amp-cab." }, 400);
  }

  // Run catalogue search through the existing, allow-listed TONE3000 proxy.
  // The device/app does not need to implement query fallback or row normalization.
  const words = query.split(/\s+/).filter(Boolean);
  const candidates = [...new Set([query, words.length > 1 ? words[words.length - 1] : "", ""])];
  const attempts = [];

  for (const candidate of candidates) {
    const params = new URLSearchParams({
      page: "1",
      page_size: "25",
      sort: candidate ? "best-match" : "trending",
      gears: gear,
      format: "nam",
      architecture: "2"
    });
    if (candidate) params.set("query", candidate);

    const gatewayUrl = new URL(request.url);
    gatewayUrl.search = "";
    gatewayUrl.searchParams.set("path", "/tones/search?" + params.toString());
    const upstream = await proxyTone3000(request, env, gatewayUrl);
    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return json({
        ok: false,
        error: data?.error || "TONE3000 catalogue search failed.",
        upstreamStatus: upstream.status
      }, upstream.status);
    }

    const sourceRows = Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.tones) ? data.tones
      : Array.isArray(data?.items) ? data.items
      : Array.isArray(data?.data?.items) ? data.data.items
      : [];

    const tones = sourceRows.map(tone => {
      const creator = tone?.user?.username || tone?.creator?.username || tone?.username ||
        (typeof tone?.creator === "string" ? tone.creator : "");
      return {
        id: String(tone?.id ?? tone?.tone_id ?? ""),
        name: String(tone?.title || tone?.name || tone?.tone_name || "Untitled tone"),
        creator: String(creator || ""),
        description: String(tone?.description || ""),
        makes: Array.isArray(tone?.makes) ? tone.makes.slice(0, 5).map(item => String(item?.name || item)) : [],
        tags: Array.isArray(tone?.tags) ? tone.tags.slice(0, 6).map(item => String(item?.name || item)) : [],
        sizes: Array.isArray(tone?.sizes) ? tone.sizes.map(item => String(item?.name || item)) : [],
        format: String(tone?.format || "nam"),
        a2ModelsCount: Number(tone?.a2_models_count ?? 0),
        gear: String(tone?.gear || gear)
      };
    }).filter(tone => /^\d+$/.test(tone.id));

    const meta = {
      query: candidate || "(broad A2 NAM catalogue)",
      total: Number(data?.total ?? tones.length),
      page: Number(data?.page ?? 1),
      pageSize: Number(data?.page_size ?? 25),
      totalPages: Number(data?.total_pages ?? 0),
      rowsReturned: tones.length
    };
    attempts.push(meta);

    if (tones.length) {
      return json({
        ok: true,
        query,
        gear,
        tones,
        searchMeta: {
          requestedQuery: query,
          queriesTried: attempts.map(item => item.query),
          attempts,
          matchedQuery: candidate,
          ...meta
        }
      });
    }
  }

  const last = attempts[attempts.length - 1] || {};
  return json({
    ok: true,
    query,
    gear,
    tones: [],
    searchMeta: {
      requestedQuery: query,
      queriesTried: attempts.map(item => item.query),
      attempts,
      ...last
    }
  });
}
function toneOfficialHost(host) {
  return host === "tone3000.com" || host.endsWith(".tone3000.com");
}
function toneAssetAllowed(host, env) {
  const configured = String(env.TONE3000_ASSET_HOSTS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  return toneOfficialHost(host) || configured.includes(host);
}
async function downloadToneModel(request, env, url) {
  const token = toneAuth(request, env);
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
function youtubeApiKey(env) {
  return String(env.YOUTUBE_API_KEY || env.YOUTUBE_DATA_API_KEY || "").trim();
}
async function youtubeSearch(url, env) {
  const key = youtubeApiKey(env);
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
            status: true, ai_providers: true, ai_models: true, ai_light_task: true, ai_tone_plan: true,
            youtube_status: true, youtube_search: true, tone3000_ai_search: true, tone3000_proxy: true, tone3000_download: true
          },
          auth_configured: Boolean(String(env.APP_LOGIN_USERNAME || "").trim() && String(env.APP_LOGIN_PASSWORD || "").trim() && String(env.APP_AUTH_SECRET || "").trim()),
          secret_checks: {
            APP_LOGIN_USERNAME: Boolean(String(env.APP_LOGIN_USERNAME || "").trim()),
            APP_LOGIN_PASSWORD: Boolean(String(env.APP_LOGIN_PASSWORD || "").trim()),
            APP_AUTH_SECRET: Boolean(String(env.APP_AUTH_SECRET || "").trim()),
            GEMINI_API_KEY: Boolean(String(env.GEMINI_API_KEY || "").trim()),
            WORKERS_AI_BINDING: Boolean(env.AI && typeof env.AI.run === "function"),
            GROQ_API_KEY: Boolean(String(env.GROQ_API_KEY || "").trim()),
            OPENROUTER_API_KEY: Boolean(String(env.OPENROUTER_API_KEY || "").trim()),
            OPENAI_API_KEY: Boolean(String(env.OPENAI_API_KEY || "").trim()),
            YOUTUBE_API_KEY: Boolean(String(env.YOUTUBE_API_KEY || "").trim()),
            YOUTUBE_DATA_API_KEY: Boolean(String(env.YOUTUBE_DATA_API_KEY || "").trim()),
            TONE3000_API_KEY: Boolean(String(env.TONE3000_API_KEY || "").trim())
          },
          ai: { gemini: Boolean(env.GEMINI_API_KEY), groq: Boolean(env.GROQ_API_KEY), openrouter: Boolean(env.OPENROUTER_API_KEY), cloudflare: Boolean(env.AI && typeof env.AI.run === "function"), gpt: Boolean(env.OPENAI_API_KEY) },
          workers_ai_models: WORKERS_AI_MODELS,
          youtube: Boolean(youtubeApiKey(env)), tone3000_oauth_proxy: true, tone3000_service_key_fallback: Boolean(String(env.TONE3000_API_KEY || "").trim())
        });
      } else if (url.pathname === "/api/v1/status" && request.method === "GET") {
        const auth = await requireAccount(request, env);
        if (!auth.ok) response = auth.response;
        else response = json({ ok: true, user: { username: auth.user.username || null }, ai: {
          gpt: Boolean(env.OPENAI_API_KEY), gemini: Boolean(env.GEMINI_API_KEY), groq: Boolean(env.GROQ_API_KEY), openrouter: Boolean(env.OPENROUTER_API_KEY),
          cloudflare: Boolean(env.AI && typeof env.AI.run === "function")
        }, youtube: Boolean(youtubeApiKey(env)), tone3000Proxy: true });
      } else if (url.pathname.startsWith("/api/v1/")) {
        const auth = await requireAccount(request, env);
        if (!auth.ok) response = auth.response;
        else if (url.pathname === "/api/v1/ai/providers" && request.method === "GET") {
          response = json({
            ok: true, service: "nux-mg30-studio-api", workerVersion: VERSION,
            providers: {
              gpt: Boolean(env.OPENAI_API_KEY), gemini: Boolean(env.GEMINI_API_KEY),
              groq: Boolean(env.GROQ_API_KEY), openrouter: Boolean(env.OPENROUTER_API_KEY),
              cloudflare: Boolean(env.AI && typeof env.AI.run === "function")
            },
            workers_ai_models: WORKERS_AI_MODELS
          });
        } else if (url.pathname === "/api/v1/ai/models" && request.method === "GET") {
          response = await listModels(url.searchParams.get("provider") || "", env);
        } else if (url.pathname === "/api/v1/ai/light-task" && request.method === "POST") {
          const body = await readBody(request);
          response = await runAiLightTask(body, env);
        } else if (url.pathname === "/api/v1/ai/tone-plan" && request.method === "POST") {
          const body = await readBody(request);
          const requestedProvider = String(body.provider || "auto").toLowerCase();
          const system = String(body.system || "");
          const prompt = String(body.prompt || "");
          const maxOutputTokens = clampOutputTokenLimit(body.maxOutputTokens);
          if (system.length > 180_000 || prompt.length > 40_000 || !system || !prompt) response = json({ ok: false, error: "AI request content is missing or exceeds the allowed size." }, 400);
          else {
            const order = requestedProvider === "auto" ? ["cloudflare", "gemini", "groq", "openrouter"] : [requestedProvider];
            const failures = [];
            let completed = null;
            for (const candidate of order) {
              if (candidate === "cloudflare" && (!env.AI || typeof env.AI.run !== "function")) {
                failures.push("cloudflare: Workers AI binding AI is not configured");
                continue;
              }
              const keyName = PROVIDERS[candidate]?.secret;
              if (candidate !== "cloudflare" && (!keyName || !String(env[keyName] || "").trim())) {
                failures.push(candidate + ": not configured"); continue;
              }
              const defaultModels = { gemini: "gemini-2.5-flash", groq: "openai/gpt-oss-20b", openrouter: "openrouter/free", cloudflare: WORKERS_AI_MODEL };
              const selectedModel = candidate === "cloudflare"
                ? (requestedProvider === "cloudflare" ? (String(body.model || "").trim() || WORKERS_AI_MODEL) : WORKERS_AI_MODEL)
                : (String(body.model || "").trim() || defaultModels[candidate]);
              try {
                const generated = await generateTonePlan(candidate, selectedModel, system, prompt, env, maxOutputTokens);
                completed = { ok: true, provider: candidate, model: generated.model || selectedModel, tonePlan: generated.tonePlan, usage: generated.usage, maxOutputTokens, requestId: crypto.randomUUID() };
                break;
              } catch (error) {
                failures.push(candidate + ": " + (error.message || "provider error"));
                // Auto mode prioritizes Cloudflare Workers AI. If its internal model pool fails,
                // continue through external providers only for callers explicitly using Worker auto.
                if (requestedProvider !== "auto") {
                  response = json({ ok: false, error: error.message || "AI provider request failed.", requestId: crypto.randomUUID() }, error.status || 502);
                  break;
                }
              }
            }
            if (completed) response = json(completed);
            else if (!response) response = json({ ok: false, error: "All automatic AI providers failed or are not configured.", failures, requestId: crypto.randomUUID() }, 503);
          }
        } else if (url.pathname === "/api/v1/youtube/status" && request.method === "GET") {
          response = json({ ok: true, configured: Boolean(youtubeApiKey(env)) });
        } else if (url.pathname === "/api/v1/youtube/search" && request.method === "GET") {
          response = await youtubeSearch(url, env);
        } else if (url.pathname === "/api/v1/tone3000/ai-search" && request.method === "POST") {
          const body = await readBody(request, 32_000);
          response = await tone3000AiSearch(request, env, body);
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
      response = json({ ok: false, error: error.message || "Request failed." }, Number(error?.status) || 400);
    }
    return withCors(response, request, env);
  }
};