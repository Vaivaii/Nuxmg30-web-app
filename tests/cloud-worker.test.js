import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloud-worker/src/index.js';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});
const baseEnv = { AUTH_API_BASE: 'https://auth.example.test', APP_ORIGINS: 'https://localhost' };

test('Cloud Worker health endpoint exposes no provider configuration or secret values', async () => {
  const response = await worker.fetch(new Request('https://cloud.example.test/health'), baseEnv);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.service, 'nux-mg30-cloud-api');
  assert.equal('providers' in body, false);
});

test('all application API routes require a Cloud Account bearer token', async () => {
  const response = await worker.fetch(new Request('https://cloud.example.test/api/v1/ai/providers'), baseEnv);
  assert.equal(response.status, 401);
});

test('provider status reports only configured flags after existing Worker session introspection', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.equal(String(url), baseEnv.AUTH_API_BASE + '/auth/me');
    return jsonResponse({ ok: true, user: { username: 'tester' } });
  };
  try {
    const response = await worker.fetch(new Request('https://cloud.example.test/api/v1/ai/providers', {
      headers: { Authorization: 'Bearer app-jwt', Origin: 'https://localhost' }
    }), { ...baseEnv, OPENAI_API_KEY: 'secret-openai', GEMINI_API_KEY: 'secret-gemini' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.providers, { gpt: true, gemini: true, groq: false, openrouter: false });
    assert.equal(JSON.stringify(body).includes('secret-openai'), false);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://localhost');
  } finally { globalThis.fetch = originalFetch; }
});

test('AI model route validates the app account and keeps provider credential server-side', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), authorization: new Headers(options.headers).get('Authorization') });
    if (String(url) === baseEnv.AUTH_API_BASE + '/auth/me') return jsonResponse({ ok: true, user: { username: 'tester' } });
    return jsonResponse({ data: [{ id: 'gpt-4.1-mini' }, { id: 'text-embedding-3-small' }] });
  };
  try {
    const response = await worker.fetch(new Request('https://cloud.example.test/api/v1/ai/models?provider=gpt', {
      headers: { Authorization: 'Bearer app-jwt' }
    }), { ...baseEnv, OPENAI_API_KEY: 'secret-openai' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.models.map(x => x.id), ['gpt-4.1-mini']);
    assert.equal(calls.some(x => x.url.includes('/auth/me')), true);
    const providerCall = calls.find(x => x.url.includes('api.openai.com'));
    assert.equal(providerCall.authorization, 'Bearer secret-openai');
  } finally { globalThis.fetch = originalFetch; }
});

test('TONE3000 proxy rejects paths outside the narrow official API allow-list', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => String(url) === baseEnv.AUTH_API_BASE + '/auth/me'
    ? jsonResponse({ ok: true, user: { username: 'tester' } })
    : jsonResponse({});
  try {
    const response = await worker.fetch(new Request('https://cloud.example.test/api/v1/tone3000/proxy?path=https%3A%2F%2Fevil.example%2Fsteal', {
      headers: { Authorization: 'Bearer app-jwt', 'X-TONE3000-Authorization': 'Bearer tone-token' }
    }), baseEnv);
    assert.equal(response.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});
