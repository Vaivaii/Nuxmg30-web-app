import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudApiFetch, cloudApiRequest, CLOUD_API_BASE } from '../www/cloud-api.js';

function setStorage(token) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => key === 'mg30-cloud-auth-token' ? token : null } });
  return () => descriptor ? Object.defineProperty(globalThis, 'localStorage', descriptor) : delete globalThis.localStorage;
}

test('Cloud API refuses online service calls without an app session token', async () => {
  const restore = setStorage('');
  try {
    await assert.rejects(() => cloudApiFetch('/api/v1/status'), /Connect your Cloud Account/);
  } finally { restore(); }
});

test('Cloud API attaches app JWT and parses authenticated JSON responses', async () => {
  const restore = setStorage('test-session-token');
  const originalFetch = globalThis.fetch;
  let seenUrl = '', seenAuthorization = '';
  globalThis.fetch = async (url, options) => {
    seenUrl = String(url);
    seenAuthorization = new Headers(options.headers).get('Authorization') || '';
    return new Response(JSON.stringify({ ok: true, configured: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const data = await cloudApiRequest('/api/v1/youtube/status');
    assert.equal(data.configured, true);
    assert.equal(seenUrl, CLOUD_API_BASE + '/api/v1/youtube/status');
    assert.equal(seenAuthorization, 'Bearer test-session-token');
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test('Cloud API client restricts requests to versioned service routes', async () => {
  const restore = setStorage('test-session-token');
  try {
    await assert.rejects(() => cloudApiFetch('https://example.com/'), /Invalid Cloud API path/);
  } finally { restore(); }
});

test('Cloud API reports the exact gateway path when a stale or wrong Worker returns 404', async () => {
  const restore = setStorage('test-session-token');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>Not found</html>', { status: 404, headers: { 'Content-Type': 'text/html' } });
  try {
    await assert.rejects(
      () => cloudApiFetch('/api/v1/ai/models?provider=gemini'),
      error => error.status === 404 && error.message.includes('/api/v1/ai/models?provider=gemini') && error.requestUrl === CLOUD_API_BASE + '/api/v1/ai/models?provider=gemini'
    );
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});
