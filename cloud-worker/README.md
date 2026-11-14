# NUX MG30 Studio Cloud API Worker

This is a **separate** Worker named `nux-mg30-cloud-api`. It does not replace the existing `nux-mg30-studio-api` Worker that handles account login.

## Deploy

Run from the repository root:

```bash
npx wrangler deploy --config cloud-worker/wrangler.toml
```

The app gateway URL in `www/cloud-api.js` is configured for the default workers.dev hostname:
`https://nux-mg30-cloud-api.vaivai851.workers.dev`.

## Configure provider secrets

Set each key directly in Cloudflare Worker secret storage. Never paste provider keys into this chat, the app, GitHub source, or a committed file.

```bash
npx wrangler secret put OPENAI_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put GEMINI_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put GROQ_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put OPENROUTER_API_KEY --config cloud-worker/wrangler.toml
npx wrangler secret put YOUTUBE_DATA_API_KEY --config cloud-worker/wrangler.toml
```

Only configure the providers actually being used. A missing secret is reported as `configured: false`; its value is never returned.

## TONE3000 asset hosts

OAuth Authorization Code + PKCE and refresh remain with the official TONE3000 OAuth endpoints, using the user's own account. Metadata/search and model file requests are sent through this gateway with the user's TONE3000 bearer token in the `X-TONE3000-Authorization` header. The Worker never stores a shared TONE3000 user token.

Model downloads are limited to HTTPS hosts under `tone3000.com` by default. If TONE3000 model catalogue responses supply a CDN hostname outside that domain, verify the hostname from an actual `model_url` and add that exact domain to `TONE3000_ASSET_HOSTS` as a comma-separated Worker variable before attempting downloads. Do not broaden this to arbitrary hosts; this endpoint must not become an open proxy.

TONE3000 `403` and `429` responses remain meaningful. This Worker does not bypass account entitlements, search limits, or API terms.

## Routes

- `GET /health` — deployment health only; no secrets.
- `GET /api/v1/status` — authenticated feature configuration status.
- `GET /api/v1/ai/providers` — authenticated configured/not-configured state.
- `GET /api/v1/ai/models?provider=gpt|gemini|groq|openrouter` — list available text models.
- `POST /api/v1/ai/tone-plan` — authenticated provider call returning a Tone Plan proposal.
- `GET /api/v1/youtube/status` and `GET /api/v1/youtube/search?q=...`.
- `GET /api/v1/tone3000/proxy?path=...` — restricted metadata/search proxy.
- `GET /api/v1/tone3000/download?url=...` — allow-listed HTTPS model file proxy.

All `/api/v1/*` routes validate the app's JWT by calling the existing Worker `/auth/me`. This avoids duplicating or changing the current authentication implementation. Set `AUTH_API_BASE` to the existing auth Worker origin in `wrangler.toml` if it changes.

## CORS and deployment configuration

Set `APP_ORIGINS` in `wrangler.toml` to a comma-separated list of exact origins used by the web app/PWA and Capacitor. The defaults cover common Capacitor localhost origins; add the real web origin if deployed elsewhere. Do not use wildcard CORS with authenticated requests.

## Security and limits

- Provider keys are Worker secrets only.
- App JWT is required for all application service routes.
- TONE3000 OAuth tokens are forwarded only per user request and are not logged or persisted by this Worker.
- Provider output is untrusted. The app must still run its original MG-30 firmware 6.0.x catalog validator before MIDI changes.
- The Worker does not generate raw preset/SysEx data and has no device protocol access.
- The current gateway has payload limits and bounded upstream timeouts. Before a public launch, add Cloudflare Rate Limiting rules/account quotas and operational monitoring. Expensive AI calls should not be left open to unmetered public traffic.
- Audio-reference analysis and AI Stem Studio are not implemented by this text-generation gateway; they need separate upload/job infrastructure, storage retention and compute service.

## Known staged dependency

The actual hostname used by TONE3000's downloadable model URLs must be checked against the user's authenticated catalogue. If it is outside `tone3000.com`, add that verified hostname to `TONE3000_ASSET_HOSTS`; downloads intentionally fail closed until it is allow-listed.
