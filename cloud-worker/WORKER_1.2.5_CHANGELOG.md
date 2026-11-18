# NUX MG-30 Studio — Cloud Worker 1.2.5

Date: 2026-11-18

## Purpose
Improve the TONE3000 NAM search path used by AI preset creation and make stale Cloudflare deployments identifiable before any preset/device changes occur.

## Changes
- Bump the combined Worker version to 1.2.5.
- Keep `cloud-worker/worker.js` (Wrangler deployment entry point) byte-identical to `cloud-worker/src/index.js` (source/test mirror).
- Extend AI NAM search fallback: search the supplied phrase, then its final term, then the broad/trending catalogue constrained to the selected gear, NAM format and A2 architecture. Broad fallback runs only when narrower queries return no usable rows.
- Expose `gateway_routes.tone3000_ai_search: true` in unauthenticated `GET /health` so the deployed Worker version and route presence can be verified without exposing account tokens.
- Improve app-side error messages to distinguish a missing Worker route (404), Cloud Account/TONE3000 OAuth rejection, TONE3000 API permission errors (403), rate limits (429), and other upstream failures.
- Add runtime Worker tests for route health, authenticated request flow, broad-query fallback, A2/NAM/gear filters, result normalization and rejection of missing per-user OAuth.

## Preserved
- Original NUX MG-30 Gen 2 firmware 6.0.x target; not MKII.
- Existing NAM download, A2-Lite weight extraction/validation, slot-10 metadata readback, transfer codec and USB-MIDI path.
- Manual NAM import target selection.
- IR User/Third Party/Collection transfer and storage paths.
- Existing MIDI mappings, preset codec and USB audio paths.

## Deployment
Wrangler uses `cloud-worker/worker.js` as its entry point:
`npx wrangler deploy --config cloud-worker/wrangler.toml`

No production Cloudflare deployment is performed by this repository change. After an authorized deployment, `/health` must report `version: "1.2.5"` and `gateway_routes.tone3000_ai_search: true`.

## Validation
- Runtime Worker tests added under `tests/tone3000-ai-worker-runtime.test.js`.
- Existing NAM source-contract tests extended.
- JavaScript syntax, complete test suite and Android debug build are pending GitHub Actions for this branch.
- Live TONE3000 API access still depends on the user's OAuth entitlement and may be rate-limited; no access restriction is bypassed.
- Physical MG-30 acceptance is not claimed.

## Status
Code change prepared on `fix/tone3000-nam-search-worker-1.2.5`. Live Cloudflare deployment and device validation remain separate steps.
