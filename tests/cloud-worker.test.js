import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker from '../cloud-worker/worker.js';

const APP_SECRET = 'worker-test-secret';
const baseEnv = {
  APP_LOGIN_USERNAME: 'tester',
  APP_LOGIN_PASSWORD: 'test-password',
  APP_AUTH_SECRET: APP_SECRET,
  APP_ORIGINS: 'https://localhost'
};
const jsonResponse = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', ...headers }
});
function tokenFor(username = 'tester') {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: username, iat: now, exp: now + 3600, iss: 'nux-mg30-studio' };
  const part = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', APP_SECRET).update(part).digest('base64url');
  return part + '.' + signature;
}
const authHeaders = (token = tokenFor()) => ({ Authorization: 'Bearer ' + token });

test('standalone Worker parses and retains original auth health route with boolean secret checks', async () => {
  const response = await worker.fetch(new Request('https://studio.example.test/health'), baseEnv);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.service, 'nux-mg30-studio-api');
  assert.equal(body.version, '1.2.5');
  assert.deepEqual(body.gateway_routes, { status: true, ai_providers: true, ai_models: true, ai_light_task: true, ai_tone_plan: true, youtube_status: true, youtube_search: true, tone3000_ai_search: true, tone3000_proxy: true, tone3000_download: true });
  assert.equal(body.auth_configured, true);
  assert.deepEqual(body.secret_checks, {
    APP_LOGIN_USERNAME: true, APP_LOGIN_PASSWORD: true, APP_AUTH_SECRET: true,
    GEMINI_API_KEY: false, GROQ_API_KEY: false, OPENROUTER_API_KEY: false,
    OPENAI_API_KEY: false, TONE3000_API_KEY: false, YOUTUBE_API_KEY: false, YOUTUBE_DATA_API_KEY: false, WORKERS_AI_BINDING: false
  });
  assert.equal(JSON.stringify(body).includes(APP_SECRET), false);
});

test('original login and /auth/me flow issue and validate compatible HMAC token', async () => {
  const login = await worker.fetch(new Request('https://studio.example.test/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'tester', password: 'test-password' })
  }), baseEnv);
  const loginBody = await login.json();
  assert.equal(login.status, 200);
  assert.equal(loginBody.ok, true);
  assert.equal(loginBody.user.username, 'tester');
  assert.ok(loginBody.token);

  const me = await worker.fetch(new Request('https://studio.example.test/auth/me', {
    headers: authHeaders(loginBody.token)
  }), baseEnv);
  const meBody = await me.json();
  assert.equal(me.status, 200);
  assert.equal(meBody.ok, true);
  assert.equal(meBody.user.username, 'tester');
});

test('login trims configured username/password for presence check and comparison', async () => {
  const env = { ...baseEnv, APP_LOGIN_USERNAME: ' tester ', APP_LOGIN_PASSWORD: ' test-password ' };
  const response = await worker.fetch(new Request('https://studio.example.test/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'tester', password: 'test-password' })
  }), env);
  assert.equal(response.status, 200);
});

test('all /api/v1 routes reject missing or invalid app JWT locally', async () => {
  const missing = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/providers'), baseEnv);
  assert.equal(missing.status, 401);
  const invalid = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/providers', {
    headers: { Authorization: 'Bearer not-a-valid-token' }
  }), baseEnv);
  assert.equal(invalid.status, 401);
});

test('provider status returns configured flags only after local JWT verification', async () => {
  const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/providers', {
    headers: { ...authHeaders(), Origin: 'https://localhost' }
  }), { ...baseEnv, OPENAI_API_KEY: 'secret-openai', GEMINI_API_KEY: 'secret-gemini' });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.service, 'nux-mg30-studio-api');
  assert.equal(body.workerVersion, '1.2.5');
  assert.deepEqual(body.providers, { gpt: true, gemini: true, groq: false, openrouter: false, cloudflare: false });
  assert.equal(JSON.stringify(body).includes('secret-openai'), false);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://localhost');
});

test('AI model listing calls provider API without exposing provider secret', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), authorization: new Headers(options.headers).get('Authorization') });
    return jsonResponse({ data: [{ id: 'gpt-4.1-mini' }, { id: 'text-embedding-3-small' }] });
  };
  try {
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/models?provider=gpt', {
      headers: authHeaders()
    }), { ...baseEnv, OPENAI_API_KEY: 'secret-openai' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.models.map(x => x.id), ['gpt-4.1-mini']);
    assert.equal(calls[0].authorization, 'Bearer secret-openai');
  } finally { globalThis.fetch = originalFetch; }
});

test('YouTube status and search use Worker secret and preserve app result format', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async url => {
    requestedUrl = String(url);
    return jsonResponse({ items: [{ id: { videoId: 'abcdefghijk' }, snippet: { title: 'Test', channelTitle: 'Channel' } }] });
  };
  try {
    const env = { ...baseEnv, YOUTUBE_DATA_API_KEY: 'youtube-secret' };
    const status = await worker.fetch(new Request('https://studio.example.test/api/v1/youtube/status', { headers: authHeaders() }), env);
    assert.deepEqual(await status.json(), { ok: true, configured: true });
    const search = await worker.fetch(new Request('https://studio.example.test/api/v1/youtube/search?q=test', { headers: authHeaders() }), env);
    const body = await search.json();
    assert.equal(search.status, 200);
    assert.equal(body.items[0].id.videoId, 'abcdefghijk');
    assert.ok(requestedUrl.includes('key=youtube-secret'));
  } finally { globalThis.fetch = originalFetch; }
});

test('TONE3000 AI search runs query expansion and A2 NAM filtering inside the authenticated Worker', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), authorization: new Headers(options.headers).get('Authorization') });
    const target = new URL(String(url));
    if (target.searchParams.get('query') === 'Fender Deluxe') return jsonResponse({ data: [] });
    return jsonResponse({ data: [{ id: 42, title: 'Deluxe Reverb NAM', user: { username: 'capture-author' }, makes: [{ name: 'Fender' }], tags: [{ name: 'clean' }], a2_models_count: 3 }] });
  };
  try {
    const noOAuth = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/ai-search', {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Fender Deluxe', gear: 'amp-cab' })
    }), { ...baseEnv, TONE3000_API_KEY: 'worker-service-secret' });
    assert.equal(noOAuth.status, 401);
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/ai-search', {
      method: 'POST',
      headers: { ...authHeaders(), 'X-TONE3000-Authorization': 'Bearer user-tone-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Fender Deluxe', gear: 'amp-cab' })
    }), baseEnv);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.tones[0].id, '42');
    assert.equal(body.tones[0].creator, 'capture-author');
    assert.equal(body.searchMeta.queriesTried.length, 2);
    assert.ok(calls.every(item => item.authorization === 'Bearer user-tone-token'));
    assert.ok(calls.every(item => item.url.startsWith('https://www.tone3000.com/api/v1/tones/search?')));
    assert.ok(calls.every(item => item.url.includes('architecture=2') && item.url.includes('format=nam')));
    assert.ok(calls.every(item => item.url.includes('gears=amp-cab')));
  } finally { globalThis.fetch = originalFetch; }
});

test('TONE3000 AI search validates the requested gear and never bypasses app authentication', async () => {
  const noAppAuth = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/ai-search', {
    method: 'POST', headers: { 'X-TONE3000-Authorization': 'Bearer user-tone-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Fender Deluxe', gear: 'amp-cab' })
  }), baseEnv);
  assert.equal(noAppAuth.status, 401);
  const invalidGear = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/ai-search', {
    method: 'POST', headers: { ...authHeaders(), 'X-TONE3000-Authorization': 'Bearer user-tone-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Fender Deluxe', gear: 'all' })
  }), baseEnv);
  assert.equal(invalidGear.status, 400);
});

test('TONE3000 proxy requires both app JWT and the per-user OAuth token', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), authorization: new Headers(options.headers).get('Authorization') });
    return jsonResponse({ data: [] });
  };
  try {
    const noOAuth = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/proxy?path=%2Ftones%2Fsearch', {
      headers: authHeaders()
    }), baseEnv);
    assert.equal(noOAuth.status, 401);

    const ok = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/proxy?path=%2Ftones%2Fsearch', {
      headers: { ...authHeaders(), 'X-TONE3000-Authorization': 'Bearer user-tone-token' }
    }), baseEnv);
    assert.equal(ok.status, 200);
    assert.equal(calls[0].authorization, 'Bearer user-tone-token');
    assert.ok(calls[0].url.startsWith('https://www.tone3000.com/api/v1/tones/search'));
  } finally { globalThis.fetch = originalFetch; }
});

test('TONE3000 model download blocks unknown redirect hosts and does not forward OAuth token to CDN', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), authorization: new Headers(options.headers).get('Authorization') });
    return new Response(null, { status: 302, headers: { Location: 'https://cdn.unknown.example/model.nam' } });
  };
  try {
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/download?url=' + encodeURIComponent('https://api.tone3000.com/model/1.nam'), {
      headers: { ...authHeaders(), 'X-TONE3000-Authorization': 'Bearer private-tone-token' }
    }), baseEnv);
    assert.equal(response.status, 403);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].authorization, 'Bearer private-tone-token');
  } finally { globalThis.fetch = originalFetch; }
});

test('TONE3000 contract aliases are protected by app JWT and route to official API', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), authorization: new Headers(options.headers).get('Authorization') });
    return jsonResponse({ data: [] });
  };
  try {
    const noAuth = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/tones/123', {
      headers: { 'X-TONE3000-Authorization': 'Bearer user-tone-token' }
    }), baseEnv);
    assert.equal(noAuth.status, 401);

    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/tones/123?architecture=2', {
      headers: { ...authHeaders(), 'X-TONE3000-Authorization': 'Bearer user-tone-token' }
    }), baseEnv);
    assert.equal(response.status, 200);
    assert.ok(calls[0].url.includes('/api/v1/tones/123?architecture=2'));
  } finally { globalThis.fetch = originalFetch; }
});

test('AI auto fallback advances from Gemini to Groq and returns the successful provider', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    const target = String(url);
    calls.push(target);
    if (target.includes('generativelanguage.googleapis.com')) return jsonResponse({ error: { message: 'temporarily unavailable' } }, 503);
    if (target.includes('api.groq.com')) return jsonResponse({
      choices: [{ message: { content: JSON.stringify({ summary: 'Test tone', blocks: [], notes: [] }) } }]
    });
    throw new Error('Unexpected provider URL: ' + target);
  };
  try {
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/tone-plan', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'auto', system: 'System contract', prompt: 'Create a test tone' })
    }), { ...baseEnv, GEMINI_API_KEY: 'gemini-secret', GROQ_API_KEY: 'groq-secret', OPENROUTER_API_KEY: 'router-secret' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.provider, 'groq');
    assert.equal(body.model, 'openai/gpt-oss-20b');
    assert.equal(calls.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});


test('authenticated AI light-task gateway executes Cloudflare Workers AI and returns provider usage', async () => {
  const calls = [];
  const env = { ...baseEnv, AI: { run: async (model, options) => {
    calls.push({ model, options });
    return { response: JSON.stringify({ findings: ['verified response'], confidence: 0.91 }), usage: { prompt_tokens: 23, completion_tokens: 11, total_tokens: 34 } };
  } } };
  const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'tone-specialist', role: 'tone_researcher', provider: 'cloudflare', model: '@cf/google/gemma-4-26b-a4b-it', system: 'Return JSON only.', prompt: 'Research this guitar reference.', maxOutputTokens: 420 })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.task, 'tone-specialist');
  assert.equal(body.role, 'tone_researcher');
  assert.equal(body.provider, 'cloudflare');
  assert.equal(body.model, '@cf/google/gemma-4-26b-a4b-it');
  assert.deepEqual(body.result.findings, ['verified response']);
  assert.deepEqual(body.usage, { prompt_tokens: 23, completion_tokens: 11, total_tokens: 34 });
  assert.deepEqual(calls[0].options.response_format, { type: 'json_object' });
  assert.equal(calls[0].options.max_completion_tokens, 420);
  assert.equal(calls[0].options.chat_template_kwargs.enable_thinking, false);
  assert.equal(calls.length, 1);
});

test('AI light-task rejects invalid specialist roles and reports missing Workers AI binding', async () => {
  const invalidRole = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'tone-specialist', role: 'unknown_role', provider: 'cloudflare', system: 'x', prompt: 'y' })
  }), baseEnv);
  assert.equal(invalidRole.status, 400);
  const unavailable = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'tone-specialist', role: 'tone_researcher', provider: 'cloudflare', system: 'Return JSON.', prompt: 'Run the task.' })
  }), baseEnv);
  assert.equal(unavailable.status, 503);
});

test('AI light-task executes focused Gemini role tasks through configured provider credentials', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async url => {
    requestedUrl = String(url);
    return jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify({ amp: 'Deluxe Rvb', confidence: 0.88 }) }] } }], usageMetadata: { promptTokenCount: 17, candidatesTokenCount: 9, totalTokenCount: 26 } });
  };
  try {
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'tone-specialist', role: 'amp_cabinet_specialist', provider: 'gemini', model: 'gemini-2.5-flash', system: 'Return JSON only.', prompt: 'Select exact MG-30 amp and cab.' })
    }), { ...baseEnv, GEMINI_API_KEY: 'gemini-test-secret' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.provider, 'gemini');
    assert.equal(body.model, 'gemini-2.5-flash');
    assert.equal(body.result.amp, 'Deluxe Rvb');
    assert.deepEqual(body.usage, { input_tokens: 17, output_tokens: 9, total_tokens: 26 });
    assert.ok(requestedUrl.includes('generativelanguage.googleapis.com'));
  } finally { globalThis.fetch = originalFetch; }
});

test('TONE3000 optional Worker API secret is used only when the app sends no user OAuth header', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), authorization: new Headers(options.headers).get('Authorization') });
    return jsonResponse({ data: [] });
  };
  try {
    const env = { ...baseEnv, TONE3000_API_KEY: 'service-tone-key' };
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/proxy?path=%2Ftones%2Fsearch', {
      headers: authHeaders()
    }), env);
    assert.equal(response.status, 200);
    assert.equal(calls[0].authorization, 'Bearer service-tone-key');

    const oauthResponse = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/proxy?path=%2Ftones%2Fsearch', {
      headers: { ...authHeaders(), 'X-TONE3000-Authorization': 'Bearer per-user-oauth' }
    }), env);
    assert.equal(oauthResponse.status, 200);
    assert.equal(calls[1].authorization, 'Bearer per-user-oauth');
  } finally { globalThis.fetch = originalFetch; }
});

test('YouTube accepts YOUTUBE_API_KEY as the preferred secret alias', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async url => {
    requestedUrl = String(url);
    return jsonResponse({ items: [] });
  };
  try {
    const env = { ...baseEnv, YOUTUBE_API_KEY: 'youtube-alias-secret' };
    const status = await worker.fetch(new Request('https://studio.example.test/api/v1/youtube/status', { headers: authHeaders() }), env);
    assert.deepEqual(await status.json(), { ok: true, configured: true });
    const search = await worker.fetch(new Request('https://studio.example.test/api/v1/youtube/search?q=test', { headers: authHeaders() }), env);
    assert.equal(search.status, 200);
    assert.ok(requestedUrl.includes('key=youtube-alias-secret'));
  } finally { globalThis.fetch = originalFetch; }
});

test('TONE3000 global service token is never forwarded to an external model CDN', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), authorization: new Headers(options.headers).get('Authorization') });
    return new Response(null, { status: 302, headers: { Location: 'https://cdn.unknown.example/model.nam' } });
  };
  try {
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/tone3000/download?url=' + encodeURIComponent('https://api.tone3000.com/model/1.nam'), {
      headers: authHeaders()
    }), { ...baseEnv, TONE3000_API_KEY: 'service-tone-key' });
    assert.equal(response.status, 403);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].authorization, 'Bearer service-tone-key');
  } finally { globalThis.fetch = originalFetch; }
});


test('Cloudflare Workers AI accepts structured object JSON Mode responses without stringifying failures', async () => {
  const calls = [];
  const env = { ...baseEnv, AI: { run: async (model, options) => {
    calls.push({ model, options });
    return { response: { effects: [{ id: 'MOD', model: 'Tremolo' }], confidence: 0.92 }, usage: { prompt_tokens: 31, completion_tokens: 18, total_tokens: 49 } };
  } } };
  const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'tone-specialist', role: 'effects_specialist', provider: 'cloudflare', model: '@cf/google/gemma-4-26b-a4b-it', system: 'Return a JSON object.', prompt: 'Recommend exact effects.', maxOutputTokens: 640 })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.model, '@cf/google/gemma-4-26b-a4b-it');
  assert.deepEqual(body.result.effects, [{ id: 'MOD', model: 'Tremolo' }]);
  assert.deepEqual(body.usage, { prompt_tokens: 31, completion_tokens: 18, total_tokens: 49 });
  assert.deepEqual(calls[0].options.response_format, { type: 'json_object' });
  assert.equal(calls[0].options.max_completion_tokens, 640);
});

test('Cloudflare Workers AI skips malformed Gemma JSON and succeeds with the next configured model', async () => {
  const calls = [];
  const env = { ...baseEnv, AI: { run: async (model, options) => {
    calls.push({ model, options });
    if (model === '@cf/google/gemma-4-26b-a4b-it') return { response: '{"effects":[{"id":"MOD","model":}]}', usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 } };
    return { response: { effects: [{ id: 'MOD', model: 'Tremolo' }], confidence: 0.9 }, usage: { prompt_tokens: 14, completion_tokens: 19, total_tokens: 33 } };
  } } };
  const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'tone-specialist', role: 'effects_specialist', provider: 'cloudflare', model: '@cf/google/gemma-4-26b-a4b-it', system: 'Return a JSON object.', prompt: 'Recommend exact effects.', maxOutputTokens: 640 })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.model, '@cf/openai/gpt-oss-20b');
  assert.deepEqual(body.result.effects, [{ id: 'MOD', model: 'Tremolo' }]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(call => call.options.response_format), [{ type: 'json_object' }, { type: 'json_object' }]);
});

test('OpenRouter retries a transient upstream 502 once without JSON-mode constraints', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), payload: JSON.parse(options.body) });
    if (calls.length === 1) return jsonResponse({ error: { message: 'temporary upstream gateway failure' } }, 502);
    return jsonResponse({ choices: [{ message: { content: JSON.stringify({ summary: 'Recovered', blocks: [], notes: [] }) } }] });
  };
  try {
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/tone-plan', {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openrouter', model: 'openrouter/free', system: 'Return JSON.', prompt: 'Create an effects analysis.' })
    }), { ...baseEnv, OPENROUTER_API_KEY: 'router-secret' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.provider, 'openrouter');
    assert.equal(body.tonePlan.summary, 'Recovered');
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].payload.response_format, { type: 'json_object' });
    assert.equal(calls[1].payload.response_format, undefined);
    assert.match(calls[1].payload.messages.at(-1).content, /FINAL OUTPUT CONTRACT/);
  } finally { globalThis.fetch = originalFetch; }
});
