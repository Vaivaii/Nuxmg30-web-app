# NUX MG30 Studio Combined Cloud Worker

This Worker combines the existing Cloud Account authentication routes and the authenticated Cloud services gateway in one deployment named **nux-mg30-studio-api**.

## Deploy

From the repository root:

```bash
npx wrangler deploy --config cloud-worker/wrangler.toml
```

The Wrangler config uses `cloud-worker/worker.js` as the complete standalone Worker entry point. `cloud-worker/src/index.js` is kept synchronized for source/test tooling. The `[ai]` binding maps Cloudflare Workers AI to `env.AI`; it requires no model API key secret.

**Important:** deploy this merged code to the existing `nux-mg30-studio-api` Worker. Do not paste it into a different Worker and do not overwrite it with the former cloud-only Worker. The app's Cloud Account and Cloud API clients now use this same host.

## Secrets

Set secrets on the **nux-mg30-studio-api** Worker, not on `nux-mg30-cloud-api`. Keep existing account secrets unchanged. If provider keys currently exist only on the old cloud Worker, add them again to this Worker directly in Cloudflare:

```bash
npx wrangler secret put APP_LOGIN_USERNAME --config cloud-worker/wrangler.toml
npx wrangler secret put APP_LOGIN_PASSWORD --config cloud-worker/wrangler.toml
npx wrangler secret put APP_AUTH_SECRET --config cloud-worker/wrangler.toml
npx wrangler secret put GEMINI_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put GROQ_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put OPENROUTER_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put OPENAI_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put YOUTUBE_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put YOUTUBE_DATA_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put TONE3000_API_KEY --config cloud-worker/wrangler.toml
```

Wrangler prompts for each value. Never paste keys, passwords, signing secrets, or OAuth tokens into chat, source files, or GitHub. Do not change the values of the three existing account secrets: the HMAC signing secret must remain the same or existing app sessions will no longer validate.

`/health` reports only boolean presence checks. TONE3000 does not use a global Worker API key: the app continues its official per-user OAuth Authorization Code + PKCE flow and sends that user's access token in `X-TONE3000-Authorization` for each proxied request.

## Routes

Unauthenticated:
- `GET /health` — service/version and boolean secret-presence checks.
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

All `/api/v1/*` routes require the app JWT in `Authorization: Bearer <token>`, verified locally with the same `APP_AUTH_SECRET` used by the original login flow:
- `GET /api/v1/status`
- `GET /api/v1/ai/providers`
- `GET /api/v1/ai/models?provider=gpt|gemini|groq|openrouter`
- `POST /api/v1/ai/light-task` — authenticated allow-listed lightweight tasks (`tone-discussion`, `tone3000-search-terms`, `tone3000-profile-ranking`, `tone3000-capture-selection`) run only through the Cloudflare Workers AI model pool on `env.AI`.
- `POST /api/v1/ai/tone-plan` — `provider: "auto"` tries Cloudflare Workers AI first, then Gemini, Groq and OpenRouter if the Workers AI model pool is exhausted. Explicit provider selection is also supported. OpenAI remains manual-only in the app.
- Cloudflare Workers AI internal model order: Gemma 4 26B → GPT-OSS 20B → Mistral Small 3.1 24B → Llama 4 Scout 17B. The Worker advances on binding errors or non-JSON output and returns the model that actually succeeded.
- The `/api/v1/ai/light-task` route supports `tone-discussion`, `tone3000-search-terms`, `tone3000-profile-ranking` and `tone3000-capture-selection`. In app Auto mode, these tasks and ordinary/single-agent Tone Plans stay on Workers AI only, preserving external provider RPM. Complex Auto Tone Architect / Collab uses Workers AI as the first team member, then the existing Gemini/Groq/OpenRouter agents.
- `GET /api/v1/youtube/status`
- `GET /api/v1/youtube/search?q=...`
- `GET /api/v1/tone3000/proxy?path=...` — app-compatible restricted metadata proxy.
- `GET /api/v1/tone3000/download?url=...` — app-compatible allow-listed model-file proxy.
- `GET /api/v1/tone3000/tones/:id?architecture=2`
- `GET /api/v1/tone3000/models?tone_id=...&architecture=2&page=...&page_size=...`
- `GET /api/v1/tone3000/model-download?url=...`

The TONE3000 route aliases and app-compatible proxy routes are all authenticated and restricted to approved API paths/HTTPS asset hosts. The user's OAuth token is never forwarded to third-party CDN hosts.

## TONE3000 model asset hosts

Downloads are limited to HTTPS hosts under `tone3000.com` by default. If a real catalogue `model_url` redirects to a CDN outside that domain, verify the exact hostname and add it to `TONE3000_ASSET_HOSTS` in the Worker variables. Do not use arbitrary hosts or a global shared TONE3000 credential. Provider 403/429 responses and user entitlements are respected.

## Origins and operations

Set `APP_ORIGINS` in `wrangler.toml` to exact deployed web/PWA origins plus required Capacitor origins. Do not use wildcard CORS for authenticated traffic. Add Cloudflare rate limits/quotas before public release; provider keys are billable credentials.

AI output remains an untrusted proposal. The app must run its existing original MG-30 Gen 2 firmware 6.0.x catalogue validator before any editor update. No raw preset/SysEx writes are performed by this Worker. NAM A2-Lite validation/import, IR User/Third Party, IR Collection, MIDI mappings, USB-MIDI and offline functions remain app-side and must not be changed by this gateway.

## Deployment verification

After deploy:
1. Open `https://nux-mg30-studio-api.vaivai851.workers.dev/health`; expect `service: "nux-mg30-studio-api"` and boolean secret checks.
2. Sign in through the app.
3. Refresh AI provider status, list models and run one Tone Plan.
4. Test YouTube search.
5. Test TONE3000 catalogue and model download using the user's existing OAuth session, then confirm the existing app-side A2-Lite validator before import.

Workers AI is not unmetered by default: its daily free allocation and model-specific unit pricing are controlled by the Cloudflare account. The current Gemma 4 model page lists $0.10 per million input tokens and $0.30 per million output tokens; check the Cloudflare dashboard before enabling frequent calls. A successful `/health` does not prove provider credentials or the Workers AI model invocation are valid. Live provider calls must be tested separately. The Workers AI binding is reported as `WORKERS_AI_BINDING` / `providers.cloudflare`; it is a Cloudflare service binding, not a text secret. Confirm the `AI` binding exists on the deployed Worker. No deployment is performed by this repository update.


### TONE3000 and YouTube credential compatibility

- TONE3000 first uses the signed-in user's `X-TONE3000-Authorization: Bearer ...` OAuth token. When that header is absent/invalid, the Worker may use the optional `TONE3000_API_KEY` secret as a service-level Bearer credential. This fallback shares the Worker credential across app users; per-user OAuth is preferred where user-specific entitlements/account attribution matter.
- The service-level TONE3000 credential is sent only to official TONE3000 hosts. It is not forwarded to external model/CDN hosts during redirects.
- YouTube accepts `YOUTUBE_API_KEY` first, then falls back to the legacy `YOUTUBE_DATA_API_KEY`. When both exist, `YOUTUBE_API_KEY` takes precedence.
- `/health` reports boolean presence flags for both YouTube variable names and `TONE3000_API_KEY`; it never returns secret values.
