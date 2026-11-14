# Cloud Services Integration Contract — 2026-11-14

## Status and target

- Repository: `Vaivaii/Nuxmg30-web-app`
- Working branch: `feature/ai-live-tone-studio`
- Target pedal: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII).
- Cloudflare Worker: `https://nux-mg30-studio-api.vaivai851.workers.dev`
- Current verified milestone: Cloud Account login and `/auth/me` session validation work on the user's installed APK.
- This document is an implementation contract and inventory. It does not claim that AI, TONE3000, or YouTube proxy routes are deployed.

## 1. Existing application inventory (observed in branch)

### Cloud Account
- `www/cloud-account.js` authenticates using `POST /auth/login` and validates the session using `GET /auth/me`.
- Session token and username are held in localStorage. Password is not persisted.
- The Worker currently verified by the project only provides the account authentication layer.

### AI Tone Studio
- `www/ai-tone-studio.js` already implements Tone Plan construction, model/provider selection, provider fallback, JSON parsing, catalog validation and the live editor bridge.
- Current providers are called directly from the app: Gemini, Groq, OpenRouter and OpenAI.
- Provider credentials are currently stored through the Android `MG30SecureStore` plugin, not in the Cloudflare Worker.
- The deterministic `validateAiTonePlan()` and the exact MG-30 editor catalog are the authority. A Worker response must remain an untrusted proposal and pass the existing validator before any editor action.
- AI requests must never write preset bytes/SysEx directly. The existing editor MIDI bridge is the only permitted live-control path, with the existing confirmation/undo behavior.

### TONE3000 / NAM
- `www/tone3000.js` already implements the official TONE3000 OAuth Authorization Code + PKCE flow, Select callback, catalogue loading, model download and existing NAM import.
- TONE3000 Publishable Key is an OAuth client identifier, not a server secret.
- OAuth access/refresh tokens are already migrated to Android Keystore-backed storage on native Android; retain that behavior.
- TONE3000 API requests currently go directly from the app using the user's OAuth Bearer token.
- AI-facing code must reuse the existing TONE3000 session and catalogue/download implementation. Do not create a second OAuth session or duplicate token refresh.
- The current integration filters `gears=amp-cab`; the existing audit identifies the supported `amp` filter as the Amp Only option.
- TONE3000 search access is subject to provider rate limits and API tier/terms. Do not bypass a 403, rate limit, or account entitlement.
- Any downloaded model must pass the existing A2-Lite byte-level validator (WaveNet with exactly 1,871 weights) before it is represented as compatible or sent to the pedal.

### YouTube
- `www/main.js` currently calls the YouTube Data API v3 search endpoint directly.
- The current design has a client-side key storage identifier `mg30-youtube-data-api-key`. This must be retired from the normal production request path once the Worker proxy is deployed.
- Search results and playback/embedding are separate concerns: the Worker should proxy Data API metadata/search only; playback should continue using official YouTube embed/player URLs and comply with YouTube policies.

## 2. Target architecture

```
MG30 Studio app
  ├─ Cloud Account session (Bearer app JWT)
  ├─ AI Tone Studio ───────────┐
  ├─ TONE3000 OAuth session ───┼──> Cloudflare Worker API gateway
  └─ YouTube search UI ────────┘       ├─ AI provider adapters
                                      ├─ TONE3000 API proxy
                                      └─ YouTube Data API proxy
                                             |
                                      provider APIs
```

The app JWT authenticates the MG30 Studio account to the Worker. Provider credentials stay in Worker secrets. TONE3000 user OAuth remains user-scoped: the app obtains consent with the existing PKCE flow, then sends the user's access token to the Worker only in an Authorization header for the specific proxied request. The Worker must not turn a user's TONE3000 token into a shared/global credential or log it.

## 3. Proposed Worker routes (versioned contract)

All routes below except the existing `/auth/*` are proposed and are not yet confirmed deployed.

### AI
- `POST /api/v1/ai/tone-plan`
  - Auth: MG30 Studio app JWT.
  - Request: `{ provider?: "auto"|"gemini"|"groq"|"openrouter"|"openai", model?: string, system: string, prompt: string, catalogVersion: string, context?: object }`.
  - Response: `{ ok: true, provider: string, model: string, tonePlan: object, requestId: string }`.
  - Worker selects the configured provider secret, enforces body/schema limits, provider allow-list, timeout and per-user quota.
  - App still runs `validateAiTonePlan()` against the live catalog. Invalid output is rejected; it never reaches MIDI.
- `GET /api/v1/ai/providers`
  - Auth: app JWT.
  - Returns only configured provider/model availability metadata; never returns keys.
- Future reference-audio analysis must use a separate upload/job contract with explicit consent, size/duration limits, temporary storage and deletion policy. Do not send audio through the text Tone Plan endpoint.
- Future Stem Studio processing is asynchronous and requires a separately selected/licensed model, compute worker, job queue and temporary object storage. It is not implied by the current text-generation route.

### TONE3000
- `GET /api/v1/tone3000/tones/:id?architecture=2`
- `GET /api/v1/tone3000/models?tone_id=...&architecture=2&page=...&page_size=...`
- `GET /api/v1/tone3000/model-download?url=...` (or a server-validated model-id route if the official API supports it).
  - Auth: app JWT plus user TONE3000 OAuth Bearer token in a dedicated header (proposed: `X-TONE3000-Authorization: Bearer ...`).
  - Worker must allow-list the official TONE3000 API host and validate path/query parameters; never accept arbitrary proxy URLs.
  - Respect TONE3000 API access tier, terms, 403 responses and rate limits. Do not implement unauthorized global search or scrape the website.
  - Keep OAuth authorization-code exchange/PKCE and refresh semantics compatible with the official provider flow. Before proxying token exchange, verify whether the provider permits the Worker as a confidential client and what redirect/client configuration is required. Do not break the already-working app PKCE flow.
  - For the first migration, preserve existing direct OAuth and NAM download paths until proxy routes are tested end-to-end. Switch one API operation at a time.
  - Model bytes remain subject to the existing app-side A2-Lite validator and NAM import transaction.

### YouTube Data API
- `GET /api/v1/youtube/search?q=...&type=video&maxResults=...`
  - Auth: app JWT.
  - Worker calls YouTube Data API v3 using the Worker secret `YOUTUBE_DATA_API_KEY`.
  - Validate query length, result count and supported filters; enforce per-user/IP rate limits and cache safe search metadata briefly.
  - Return only fields required by the current UI (video id, title, channel title, thumbnail, published time).
  - Do not proxy video streams, download videos, or bypass YouTube playback/embedding restrictions.
  - After successful migration, remove the app's dependency on localStorage key `mg30-youtube-data-api-key`; do not erase a user's existing key until the new route is verified and a migration notice is shown.

## 4. Worker secret and configuration inventory

Names below are proposed configuration names, not claims that secrets have been added:

- Existing account secrets: `APP_LOGIN_USERNAME`, `APP_LOGIN_PASSWORD`, `APP_AUTH_SECRET`.
- AI provider secrets: `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`.
- YouTube: `YOUTUBE_DATA_API_KEY`.
- Optional provider/model configuration: non-secret allow-list/config variables (e.g. enabled providers, default model, quota policy).
- TONE3000: user's OAuth access/refresh token remains per-user and must not be stored as a single Worker secret. A TONE3000 client secret is not assumed; confirm the official app registration type and provider terms before adding one.

No API key, OAuth token, password or signing secret may be embedded in the APK, Vite bundle, repository, logs, error messages or analytics.

## 5. Security and operational requirements

- Require a valid MG30 Studio JWT on every `/api/v1/*` route.
- Validate JSON schema, content type, request size, allowed provider/model, URL/path and query parameters.
- Use explicit CORS allow-list for the production app origins and required Capacitor origins; do not use wildcard origin with credentials.
- Apply per-account rate limits and quotas. Add abuse protection for expensive AI calls.
- Use bounded provider timeouts, bounded retries only for transient errors, normalized public errors and request IDs.
- Never expose provider raw error payloads, secrets or reasoning traces to clients.
- Do not log prompt/audio content or authorization headers by default.
- Keep provider-specific adapters behind a stable Worker contract so app code does not know vendor URLs or key formats.
- Add health/config diagnostics that report configured/not-configured only, never secret values.
- Do not claim AI Stem Studio is available until queue, model compute, storage, retention and deletion are implemented.

## 6. App migration sequence

1. Deploy and test Worker AI provider availability + text Tone Plan endpoint using Worker secrets.
2. Add an isolated app Cloud API client that attaches the app JWT and calls the Worker. Keep existing provider implementation as a temporary fallback behind a development flag only; production should not silently send requests to both paths.
3. Compare Worker output with the existing provider response adapter and run the same local catalog validator. Add contract tests and failure-path tests.
4. Migrate YouTube search to the Worker proxy; retain official YouTube player embedding.
5. Add TONE3000 read-only proxy routes, test the current OAuth token flow and pagination, then route model download through a validated proxy only if terms and content delivery support it.
6. Only after these are stable, add audio-reference analysis and Stem Studio job infrastructure.
7. Run full test suite and Android build; install and test on the user's phone. Report automated tests, APK verification and physical-device tests separately.

## 7. Non-regression boundaries

Do not modify as part of cloud gateway work:
- MG-30 USB-MIDI, SysEx frame/ACK/readback transactions.
- Original Gen 2 firmware 6.0.x effect/model catalog or parameter mappings.
- NAM A2-Lite transfer, 1,871-weight validator, slot metadata and NAM Library persistence.
- IR User/Third Party and IR Collection transfer protocols or collection mapping.
- MIDI_PARAM_CC, KNOB_SLOTS or any correct MIDI mapping.
- Preset serialization, scenes, USB audio, Loopback or local offline workflows.

Cloud outage, missing account session or provider quota must not disable local MG-30, NAM, IR, preset, MIDI or USB-audio features.

## 8. Acceptance checklist

- [ ] Existing Cloud Account login and `/auth/me` still work.
- [ ] Worker reports provider configured state without disclosing credentials.
- [ ] AI Tone Plan endpoint returns a schema-valid proposal for each configured provider.
- [ ] The app's existing MG-30 catalog validator rejects unknown blocks/models/parameters and out-of-range values.
- [ ] No AI response can write device state except through the existing editor bridge.
- [ ] YouTube search uses Worker secret; app bundle contains no YouTube API key.
- [ ] YouTube results still open official YouTube playback/embed.
- [ ] TONE3000 user consent and OAuth session remain intact; provider 403/429 responses are respected.
- [ ] TONE3000 model downloads pass existing A2-Lite validation before import.
- [ ] Existing NAM, IR User/Third Party, IR Collection, MIDI and offline regression tests pass.
- [ ] APK build and physical-device tests pass.

## 9. Current blockers / required external configuration

- AI provider keys have not been confirmed as configured in Worker.
- YouTube Data API key has not been confirmed as configured in Worker.
- TONE3000 Worker proxy routes do not exist in the verified Worker surface; provider OAuth/client configuration and API-tier permissions must be checked before routing.
- No Worker source repository or deployment interface is currently available through the connected GitHub repository. The app repo contains no Worker implementation.
- Do not ask the user to paste secrets into chat. Secrets must be entered directly into Cloudflare Worker secret storage. After the secret names are configured, test only presence/status and endpoint behavior.

## 10. Work log

- 2026-11-14: Inspected `feature/ai-live-tone-studio` at `45ed5917e60fcfa47949862917f58a5c9b24af04`.
- 2026-11-14: Confirmed AI providers are called directly by `www/ai-tone-studio.js`; provider keys use Android Keystore storage.
- 2026-11-14: Confirmed TONE3000 OAuth/PKCE, catalogue and NAM download/import already exist in `www/tone3000.js`; current API calls are direct from the app.
- 2026-11-14: Confirmed YouTube Data API search is called directly from `www/main.js`; a client-side localStorage key identifier exists.
- 2026-11-14: No application source, device protocol or Worker deployment code changed in this inventory step.


## 11. Implementation completed in app repository (2026-11-14)

- Added a separate Cloudflare Worker service source at `cloud-worker/src/index.js`, with deployment configuration at `cloud-worker/wrangler.toml`.
- The new gateway validates the existing Cloud Account session by calling the already deployed `nux-mg30-studio-api/auth/me`. It does not replace or modify the login Worker.
- Added `www/cloud-api.js`, which attaches the saved Cloud Account JWT to versioned Worker requests.
- AI Tone Studio now requests configured provider status, model catalogues and Tone Plans through the Cloud gateway. No AI provider API key input or Android SecureStore copy remains in AI Tone Studio. The existing local MG-30 catalog validator and live editor bridge are unchanged.
- YouTube search now uses the Cloud gateway and no longer reads or sends a YouTube API key from app localStorage. YouTube playback still uses the existing official privacy-enhanced embed URL.
- TONE3000 catalogue search, tone metadata, model list and model download calls now use restricted Cloud Worker routes. Official OAuth Authorization Code + PKCE, refresh and the user's per-account TONE3000 session remain unchanged; the app forwards that user's OAuth token in a dedicated header for each Worker request.
- The Worker rejects arbitrary TONE3000 paths and arbitrary download hosts. The default model-file allow-list is `tone3000.com`; if actual account-specific TONE3000 `model_url` values use a separate CDN hostname, verify that hostname and add it to the Worker variable `TONE3000_ASSET_HOSTS`. The download must fail closed until then.
- Added tests for Cloud API bearer attachment, login-required routes, Worker auth introspection, provider secret visibility, model-list filtering and TONE3000 proxy path restrictions.
- Updated existing tests that previously assumed AI/YouTube provider API keys were stored in local app storage.

## 12. Deployment and verification state

- **Source implementation:** committed to `feature/ai-live-tone-studio`.
- **Existing login Worker:** unchanged; the user's previously confirmed login still uses `nux-mg30-studio-api`.
- **New Cloud gateway deployment:** not performed from this environment; no Cloudflare deployment credential/dashboard connection is available here.
- **Provider secrets:** not configured or tested here. Set them directly using the deployment commands in `cloud-worker/README.md`.
- **AI provider live API calls, YouTube live search and TONE3000 proxied catalogue/download:** pending deployment and secrets. Automated mocked tests do not count as provider acceptance.
- **APK build:** CI is the authoritative source for test/build outcome. An APK that has the new gateway client must not be considered a service-ready release until the new Worker is deployed and required secrets/allowed origins are configured.
- **Hardware tests:** no pedal protocol or transfer source was intentionally changed; physical regression still requires the user's original MG-30 Gen 2 firmware 6.0.x.

## 13. Preservation checks

- No edits to `www/nam-transfer.js`, `www/ir-transfer.js`, preset codec, MIDI mapping tables, `MIDI_PARAM_CC`, or `KNOB_SLOTS` as part of Cloud gateway migration.
- TONE3000 A2-Lite validation and slot-10 import continue to use the existing `extractMG30A2LiteWeights`, `buildMG30A2LiteTransferPlan`, `sendMG30A2LiteTransfer` and NAM storage paths.
- Cloud provider output is still an untrusted proposal and must pass the current app-side catalog validator before editor updates.
