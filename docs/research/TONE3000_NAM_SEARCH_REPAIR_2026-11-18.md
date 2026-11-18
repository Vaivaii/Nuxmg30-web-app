# TONE3000 NAM search and NAM preset repair — 2026-11-18

## Field report
The user reported that NAM discovery through the Cloudflare Worker did not work and that presets using NAM also failed. The screenshot showed TONE3000 NAM ON with Amp + Cab selected. It showed the AI sub-tasks for validating the TONE3000 NAM profile and deriving search terms as successful, but did not show an HTTP result, matching tone, model download, or device transfer. An AI sub-task marked successful is not end-to-end proof of NAM search or preset application.

## Diagnosis from repository source
The latest app source on the Worker feature branch already calls:
- `POST /api/v1/tone3000/ai-search`
- with the Cloud Account JWT in `Authorization`
- and the signed-in user's TONE3000 OAuth access token in `X-TONE3000-Authorization`
- sending `{ query, gear }`.

The previously prepared Worker 1.2.4 contains that route in `cloud-worker/worker.js`, and Wrangler configuration selects that file as the deployment entry point. However, the prior project record explicitly says Worker 1.2.4 was not deployed. The actual active production Worker version could not be queried from this environment. This makes an old deployed Worker missing the endpoint a concrete likely cause, not a confirmed live observation.

A second concrete gap was found in the Worker implementation: for a multi-word query, fallback attempted the full phrase and its final word, but did not try the broad A2 NAM catalogue if both searches returned no rows. This can produce zero results even when compatible A2 NAM profiles exist outside those specific text matches.

The NAM-dependent preset path calls this search before it can show profiles/captures, download and validate a candidate, then continue preset construction. Therefore a missing search route or an empty catalogue response can block preset creation before any NAM file or pedal data is changed.

## Implemented repair on a separate branch
Branch: `fix/tone3000-nam-search-worker-1.2.5`

1. Worker version bumped to 1.2.5.
2. Search fallback is now phrase → final term → broad/trending catalogue. All attempts retain the selected gear, `format=nam`, and `architecture=2` filters. Broad fallback is only attempted when narrower queries return no usable tones.
3. `GET /health` now exposes `gateway_routes.tone3000_ai_search: true`, alongside the Worker version, so deployment can be checked without revealing OAuth or secret values.
4. `cloud-worker/src/index.js` is synchronized byte-for-byte with the actual Wrangler entry point `cloud-worker/worker.js`; tests can no longer validate a different Worker copy.
5. App-side search errors distinguish an absent Worker route (HTTP 404 with no upstream status), TONE3000 OAuth rejection, TONE3000 entitlement/permission denial, rate limiting and other upstream errors.
6. Added runtime tests for the actual Worker handler, account JWT validation, required per-user TONE3000 OAuth, filter forwarding, result normalization, fallback order and health route.

## Deployment and acceptance gate
No production Cloudflare deployment was performed. To activate this fix, the Worker must be deployed from the repository root using:

```bash
npx wrangler deploy --config cloud-worker/wrangler.toml
```

After deployment, inspect:
`https://nux-mg30-studio-api.vaivai851.workers.dev/health`

Expected:
- `version: "1.2.5"`
- `gateway_routes.tone3000_ai_search: true`

Then, with a valid Cloud Account session and connected TONE3000 OAuth session, test one NAM search. If the Worker route is active but the result still fails, preserve the complete HTTP status and upstream status/error while redacting all bearer tokens, cookies and secrets. TONE3000 documents the Search Tones endpoint as heavily rate-limited by default and recommends contacting support for production search access; the app must not bypass provider permissions or rate limits.

## Protected behavior
No changes were made to the NAM A2-Lite file parser/1,871-weight validation, slot-10 transfer codec, slot metadata readback, pedal USB-MIDI transfer, IR User/Third Party/Collection mappings, MIDI CC or parameter mappings, preset binary codec, or USB audio paths.

## Validation status
- Automated runtime and source-contract tests have been added; GitHub Actions is the required validation source.
- Android build is not claimed until CI completes successfully.
- Live Worker deployment and TONE3000 API calls are not verified here.
- Physical MG-30 slot-10 transfer and final preset application remain unverified until tested on the user's pedal.

## Change log entry
Date: 2026-11-18
Area: TONE3000 NAM search and NAM-driven preset creation
Branch: `fix/tone3000-nam-search-worker-1.2.5`
Files changed: `cloud-worker/worker.js`, `cloud-worker/src/index.js`, `www/tone3000.js`, `cloud-worker/README.md`, `.github/workflows/build-apk.yml`, NAM Worker tests and this note.
Reason: NAM search and presets depending on NAM were reported not to work; the prior Worker endpoint was not confirmed deployed, and the implementation lacked a broad-catalogue fallback.
Status: repair committed to a dedicated GitHub branch; production deployment and hardware validation pending.
