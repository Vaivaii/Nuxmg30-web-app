import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import worker from '../cloud-worker/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function makeCloudAccountToken(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({
    sub: 'nam-worker-test',
    iat: now,
    exp: now + 300,
    iss: 'nux-mg30-studio'
  }));
  const key = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await webcrypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );
  return payload + '.' + Buffer.from(signature).toString('base64url');
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function namSearchRequest(token, body, includeToneToken = true) {
  const headers = {
    Authorization: 'Bearer ' + token,
    Origin: 'https://app.test',
    'Content-Type': 'application/json'
  };
  if (includeToneToken) headers['X-TONE3000-Authorization'] = 'Bearer t3k-user-token';
  return new Request('https://worker.test/api/v1/tone3000/ai-search', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

test('deployment entry point and source/test mirror stay byte-identical', () => {
  const deployed = readFileSync(new URL('../cloud-worker/worker.js', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../cloud-worker/src/index.js', import.meta.url), 'utf8');
  assert.equal(source, deployed);
  assert.match(deployed, /const VERSION = "1.2.5";/);
});

test('health exposes the NAM AI search route and deployed version', async () => {
  const response = await worker.fetch(
    new Request('https://worker.test/health'),
    {}
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.version, '1.2.5');
  assert.equal(body.gateway_routes.tone3000_ai_search, true);
});

test('NAM search retries the broad A2 NAM catalogue only after specific queries return no rows', async t => {
  const originalFetch = globalThis.fetch;
  const secret = 'test-only-cloud-secret';
  const calls = [];
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ url, headers: new Headers(init.headers) });
    assert.equal(url.origin, 'https://www.tone3000.com');
    assert.equal(url.pathname, '/api/v1/tones/search');

    if (url.searchParams.has('query')) {
      return jsonResponse({ data: [], total: 0, page: 1, page_size: 25, total_pages: 0 });
    }

    return jsonResponse({
      data: [{
        id: 12345,
        title: 'SRV Blues Amp Capture',
        user: { username: 'test-capturer' },
        description: 'A2-Lite amplifier capture',
        makes: [{ name: 'Fender' }],
        tags: [{ name: 'blues' }],
        sizes: [{ name: 'lite' }],
        format: 'nam',
        a2_models_count: 2,
        gear: 'amp-cab'
      }],
      total: 1,
      page: 1,
      page_size: 25,
      total_pages: 1
    });
  };

  const token = await makeCloudAccountToken(secret);
  const response = await worker.fetch(
    namSearchRequest(token, { query: 'SRV blues', gear: 'amp-cab' }),
    { APP_AUTH_SECRET: secret, APP_ORIGINS: 'https://app.test' }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.tones.length, 1);
  assert.equal(body.tones[0].id, '12345');
  assert.equal(body.tones[0].creator, 'test-capturer');
  assert.equal(body.tones[0].format, 'nam');
  assert.equal(body.tones[0].a2ModelsCount, 2);
  assert.deepEqual(body.searchMeta.queriesTried, [
    'SRV blues',
    'blues',
    '(broad A2 NAM catalogue)'
  ]);
  assert.equal(body.searchMeta.matchedQuery, '');

  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.equal(call.url.searchParams.get('gears'), 'amp-cab');
    assert.equal(call.url.searchParams.get('format'), 'nam');
    assert.equal(call.url.searchParams.get('architecture'), '2');
    assert.equal(call.url.searchParams.get('page'), '1');
    assert.equal(call.url.searchParams.get('page_size'), '25');
    assert.equal(call.headers.get('Authorization'), 'Bearer t3k-user-token');
  }
  assert.equal(calls[0].url.searchParams.get('query'), 'SRV blues');
  assert.equal(calls[1].url.searchParams.get('query'), 'blues');
  assert.equal(calls[2].url.searchParams.has('query'), false);
  assert.equal(calls[2].url.searchParams.get('sort'), 'trending');
});

test('NAM search never falls back to a shared service token when user OAuth is missing', async t => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async () => {
    upstreamCalled = true;
    return jsonResponse({ data: [] });
  };

  const secret = 'test-only-cloud-secret';
  const token = await makeCloudAccountToken(secret);
  const response = await worker.fetch(
    namSearchRequest(token, { query: 'blues', gear: 'amp' }, false),
    {
      APP_AUTH_SECRET: secret,
      APP_ORIGINS: 'https://app.test',
      TONE3000_API_KEY: 'shared-service-secret-must-not-be-used'
    }
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.ok, false);
  assert.match(body.error, /signed-in user authorization is required/i);
  assert.equal(upstreamCalled, false);
});
