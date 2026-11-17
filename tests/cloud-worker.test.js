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
  assert.equal(body.version, '1.2.3');
  assert.deepEqual(body.workers_ai_models, [
    '@cf/google/gemma-4-26b-a4b-it',
    '@cf/openai/gpt-oss-20b',
    '@cf/mistralai/mistral-small-3.1-24b-instruct',
    '@cf/meta/llama-4-scout-17b-16e-instruct'
  ]);
  assert.deepEqual(body.gateway_routes, { status: true, ai_providers: true, ai_models: true, ai_light_task: true, ai_tone_plan: true, youtube_status: true, youtube_search: true, tone3000_proxy: true, tone3000_download: true });
  assert.equal(body.auth_configured, true);
  assert.deepEqual(body.secret_checks, {
    APP_LOGIN_USERNAME: true, APP_LOGIN_PASSWORD: true, APP_AUTH_SECRET: true,
    GEMINI_API_KEY: false, WORKERS_AI_BINDING: false, GROQ_API_KEY: false, OPENROUTER_API_KEY: false,
    OPENAI_API_KEY: false, TONE3000_API_KEY: false, YOUTUBE_API_KEY: false, YOUTUBE_DATA_API_KEY: false
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
  assert.equal(body.workerVersion, '1.2.3');
  assert.deepEqual(body.providers, { gpt: true, gemini: true, groq: false, openrouter: false, cloudflare: false });
  assert.deepEqual(body.workers_ai_models, [
    '@cf/google/gemma-4-26b-a4b-it',
    '@cf/openai/gpt-oss-20b',
    '@cf/mistralai/mistral-small-3.1-24b-instruct',
    '@cf/meta/llama-4-scout-17b-16e-instruct'
  ]);
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


test('AI tone-plan forwards bounded output tokens and returns normalized Gemini usage', async () => {
  const originalFetch = globalThis.fetch;
  let upstreamRequest = null;
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    upstreamRequest = { url: target, body: JSON.parse(options.body || '{}') };
    return jsonResponse({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 'Test tone', blocks: [{ id: 'AMP', model: 'Deluxe Rvb', enabled: true, parameters: { gain: 30 } }], notes: [] }) }] } }],
      usageMetadata: { promptTokenCount: 321, candidatesTokenCount: 74, totalTokenCount: 395 }
    });
  };
  try {
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/tone-plan', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'gemini', model: 'gemini-3.1-flash-lite-preview', system: 'Compact system', prompt: 'Create a tone', maxOutputTokens: 180 })
    }), { ...baseEnv, GEMINI_API_KEY: 'gemini-secret' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(upstreamRequest.body.generationConfig.maxOutputTokens, 180);
    assert.equal(body.maxOutputTokens, 180);
    assert.deepEqual(body.usage, { prompt_tokens: 321, completion_tokens: 74, total_tokens: 395 });
    assert.equal(body.provider, 'gemini');
  } finally { globalThis.fetch = originalFetch; }
});

test('AI tone-plan output-token limits are clamped to the safe provider maximum', async () => {
  const originalFetch = globalThis.fetch;
  let limit = 0;
  globalThis.fetch = async (_url, options = {}) => {
    limit = JSON.parse(options.body || '{}').generationConfig.maxOutputTokens;
    return jsonResponse({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 'Compact', blocks: [{ id: 'AMP', model: 'Deluxe Rvb', enabled: true, parameters: { gain: 30 } }], notes: [] }) }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 }
    });
  };
  try {
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/tone-plan', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'gemini', model: 'gemini-3.1-flash-lite-preview', system: 'S', prompt: 'P', maxOutputTokens: 99999 })
    }), { ...baseEnv, GEMINI_API_KEY: 'gemini-secret' });
    assert.equal(response.status, 200);
    assert.equal(limit, 2048);
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


test('Workers AI light tasks parse response.response and enforce task-specific token budgets', async () => {
  const calls = [];
  const env = {
    ...baseEnv,
    AI: {
      async run(model, input) {
        calls.push({ model, input });
        const prompt = input.messages[1].content;
        const queryTask = prompt.includes('TONE REQUEST');
        const profileTask = prompt.includes('RANK_PROFILE');
        const captureTask = prompt.includes('SELECT_CAPTURE');
        return {
          response: JSON.stringify(profileTask
            ? { toneId: '123', reason: 'Profil paling dekat dengan amplifier yang diminta.' }
            : captureTask
              ? { modelId: 'm2', reason: 'Capture A2 paling sesuai.' }
              : queryTask
                ? { query: 'Fender Deluxe Reverb', reason: 'Model amplifier yang paling sesuai.' }
                : { reply: 'Coba kurangi treble sedikit dan naikkan mids untuk artikulasi.' }),
          usage: { prompt_tokens: 120, completion_tokens: 18, total_tokens: 138 }
        };
      }
    }
  };
  const discussion = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'tone-discussion', system: 'Return JSON with reply.',
      prompt: 'USER MESSAGE: How do I make this tone warmer?', maxOutputTokens: 999
    })
  }), env);
  const discussionBody = await discussion.json();
  assert.equal(discussion.status, 200);
  assert.equal(discussionBody.provider, 'cloudflare');
  assert.equal(discussionBody.model, '@cf/google/gemma-4-26b-a4b-it');
  assert.equal(discussionBody.result.reply, 'Coba kurangi treble sedikit dan naikkan mids untuk artikulasi.');
  assert.equal(discussionBody.maxOutputTokens, 520);
  assert.deepEqual(discussionBody.usage, { prompt_tokens: 120, completion_tokens: 18, total_tokens: 138 });

  const searchTerms = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'tone3000-search-terms', system: 'Return JSON with query and reason.',
      prompt: 'USER TONE REQUEST: clean Fender-style blackface combo', maxOutputTokens: 400
    })
  }), env);
  const searchBody = await searchTerms.json();
  assert.equal(searchTerms.status, 200);
  assert.equal(searchBody.result.query, 'Fender Deluxe Reverb');
  assert.equal(searchBody.maxOutputTokens, 180);
  const profileRanking = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'tone3000-profile-ranking', system: 'Return toneId and reason.', prompt: 'RANK_PROFILE', maxOutputTokens: 999 })
  }), env);
  const profileBody = await profileRanking.json();
  assert.equal(profileRanking.status, 200);
  assert.equal(profileBody.result.toneId, '123');
  assert.equal(profileBody.maxOutputTokens, 320);

  const captureSelection = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'tone3000-capture-selection', system: 'Return modelId and reason.', prompt: 'SELECT_CAPTURE', maxOutputTokens: 999 })
  }), env);
  const captureBody = await captureSelection.json();
  assert.equal(captureSelection.status, 200);
  assert.equal(captureBody.result.modelId, 'm2');
  assert.equal(captureBody.maxOutputTokens, 320);

  assert.equal(calls.length, 4);
  assert.equal(calls[0].model, '@cf/google/gemma-4-26b-a4b-it');
  assert.equal(calls[0].input.max_completion_tokens, 520);
  assert.equal(calls[1].input.max_completion_tokens, 180);
  assert.deepEqual(calls[0].input.chat_template_kwargs, { enable_thinking: false });
});

test('AI auto Tone Plan prefers Workers AI before external providers', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let workersAiModel = '';
  globalThis.fetch = async url => {
    const target = String(url);
    calls.push(target);
    if (target.includes('generativelanguage.googleapis.com')) return jsonResponse({ error: { message: 'quota' } }, 429);
    if (target.includes('api.groq.com')) return jsonResponse({ error: { message: 'temporarily unavailable' } }, 503);
    if (target.includes('openrouter.ai')) return jsonResponse({ error: { message: 'rate limited' } }, 429);
    throw new Error('Unexpected provider URL: ' + target);
  };
  const env = {
    ...baseEnv,
    GEMINI_API_KEY: 'gemini-secret',
    GROQ_API_KEY: 'groq-secret',
    OPENROUTER_API_KEY: 'router-secret',
    AI: {
      async run(model, input) {
        workersAiModel = model;
        assert.equal(input.max_completion_tokens, 240);
        return {
          response: JSON.stringify({
            summary: 'Clean blackface tone',
            blocks: [{ id: 'AMP', model: 'Deluxe Rvb', enabled: true, parameters: { gain: 35 } }],
            notes: ['Workers AI fallback']
          })
        };
      }
    }
  };
  try {
    const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/tone-plan', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'auto', system: 'Tone Plan JSON contract', prompt: 'Create a clean tone', maxOutputTokens: 240 })
    }), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.provider, 'cloudflare');
    assert.equal(body.model, '@cf/google/gemma-4-26b-a4b-it');
    assert.equal(body.tonePlan.summary, 'Clean blackface tone');
    assert.deepEqual(body.tonePlan.blocks[0].parameters, { gain: 35 });
    assert.equal(workersAiModel, '@cf/google/gemma-4-26b-a4b-it');
    assert.equal(calls.length, 0);
  } finally { globalThis.fetch = originalFetch; }
});


test('Workers AI uses Gemma first then GPT-OSS, Mistral Small 3.1 and Llama 4 Scout on inference or JSON failure', async () => {
  const models = [];
  const env = {
    ...baseEnv,
    AI: {
      async run(model, input) {
        models.push({ model, input });
        if (model === '@cf/google/gemma-4-26b-a4b-it') throw new Error('Gemma capacity unavailable');
        if (model === '@cf/openai/gpt-oss-20b') return {
          response: 'not valid JSON',
          usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 }
        };
        if (model === '@cf/mistralai/mistral-small-3.1-24b-instruct') return {
          response: JSON.stringify({ reply: 'Workers AI Mistral fallback responded.' }),
          usage: { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 }
        };
        throw new Error('Unexpected model should not be called after success: ' + model);
      }
    }
  };
  const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/light-task', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'tone-discussion', system: 'Return JSON with reply.', prompt: 'Confirm fallback.', maxOutputTokens: 200 })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.provider, 'cloudflare');
  assert.equal(body.model, '@cf/mistralai/mistral-small-3.1-24b-instruct');
  assert.equal(body.result.reply, 'Workers AI Mistral fallback responded.');
  assert.deepEqual(body.usage, { prompt_tokens: 34, completion_tokens: 10, total_tokens: 44 });
  assert.deepEqual(models.map(row => row.model), [
    '@cf/google/gemma-4-26b-a4b-it',
    '@cf/openai/gpt-oss-20b',
    '@cf/mistralai/mistral-small-3.1-24b-instruct'
  ]);
  assert.equal(models[0].input.max_completion_tokens, 200);
  assert.equal(models[1].input.max_tokens, 200);
  assert.equal(models[2].input.max_tokens, 200);
});


test('explicit Cloudflare model preference is allow-listed and runs before remaining Workers AI fallbacks', async () => {
  const calls = [];
  const env = {
    ...baseEnv,
    AI: {
      async run(model, input) {
        calls.push({ model, input });
        return { response: JSON.stringify({ summary: 'Preferred Mistral tone', blocks: [], notes: [] }) };
      }
    }
  };
  const preferred = '@cf/mistralai/mistral-small-3.1-24b-instruct';
  const response = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/tone-plan', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'cloudflare', model: preferred, system: 'Return Tone Plan JSON.', prompt: 'Create a tone.', maxOutputTokens: 160 })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.provider, 'cloudflare');
  assert.equal(body.model, preferred);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, preferred);
  assert.equal(calls[0].input.max_tokens, 160);
  assert.equal(calls[0].input.max_completion_tokens, undefined);

  const rejected = await worker.fetch(new Request('https://studio.example.test/api/v1/ai/tone-plan', {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'cloudflare', model: '@cf/vendor/unapproved-model', system: 'S', prompt: 'P' })
  }), env);
  const rejectedBody = await rejected.json();
  assert.equal(rejected.status, 400);
  assert.match(rejectedBody.error, /approved fallback list/);
  assert.equal(calls.length, 1);
});
