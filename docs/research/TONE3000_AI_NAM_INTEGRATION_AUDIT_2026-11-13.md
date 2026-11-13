# TONE3000 + AI NAM Integration Audit

**Date:** 2026-11-13 (Asia/Jakarta)  
**Repository:** `Vaivaii/Nuxmg30-web-app`  
**Audited branch:** `feature/ai-live-tone-studio`  
**Target device:** original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
**Audit-only:** no application source, protocol, or workflow code was changed during this audit.

## Executive summary

The existing application already has most of the hard parts required for AI NAM import:

1. TONE3000 Publishable Key configuration.
2. OAuth 2.0 Authorization Code with PKCE (S256), deep-link callback handling, token exchange, refresh, and sign-out.
3. TONE selection through the official TONE3000 Select experience.
4. Loading a selected tone and its A2 model list.
5. Downloading individual model files.
6. Persistent, app-private NAM Library storage on Android.
7. A validated original MG-30 Gen 2 A2-Lite transfer path with write ACKs and two-pass slot-name readback.

The key missing integration is an AI-facing bridge. Those functions are currently private inside `www/tone3000.js`; AI Tone Studio cannot call them without either duplicating the OAuth/API implementation or adding a narrow public facade.

The current TONE3000 flow also hardcodes `gears=amp-cab`. It does not currently offer the requested Amp Only choice. The official API documents both `amp` and `amp-cab` gear filters, so this is a small flow-parameter gap, not a new OAuth requirement.

The existing MG-30 transfer path only accepts a validated A2-Lite WaveNet payload with exactly 1,871 weights. An API response marked architecture 2 is not sufficient by itself to prove that a downloaded file is compatible; the existing byte-level validator must remain authoritative.

## 1. Existing TONE3000 integration

### UI and module wiring

- `www/main.js` imports `./tone3000.js`; the existing TONE3000 integration is already started by the app.
- `www/tone3000.js` creates the TONE3000 picker in the NAM pane and places Publishable Key / Redirect URI settings under Device settings.
- The settings panel accepts a `t3k_pub_...` Publishable Key. The key is an OAuth `client_id`, not a server Secret Key.
- The configured target slot is stored at `localStorage['mg30-t3k-target_slot']`. The UI currently allows slots 1–10 and has no AI-specific default; the initial selection is empty unless previously saved.

### OAuth flow already present

The current implementation:
- Generates a random PKCE verifier and `state`.
- Computes the SHA-256 / base64url PKCE challenge and uses `code_challenge_method=S256`.
- Launches `https://www.tone3000.com/api/v1/oauth/authorize` through Capacitor Browser on Android.
- Handles the return via Capacitor `appUrlOpen`, launch URL, and app-resume URL checks.
- Verifies callback `state` before exchanging the code.
- Exchanges the authorization code at `/oauth/token`.
- Refreshes expired tokens using `grant_type=refresh_token`.
- Supports sign-out and invalid-grant handling.

### Important current security/storage finding

The Publishable Key is intentionally public and is stored in localStorage. However, the current code also stores these OAuth values in WebView localStorage:

- `mg30-t3k-access_token`
- `mg30-t3k-refresh_token`
- `mg30-t3k-expires_at`
- In-flight `code_verifier`, `state`, and `redirect_uri`

The existing Android `MG30SecureStorePlugin` already provides Keystore-backed AES-GCM storage for the AI provider keys, but TONE3000 OAuth tokens do not currently use it. TONE3000's current API documentation says to store access token, refresh token, and expiry securely. Before extending AI use, token handling should be moved behind the existing secure-storage capability with a backward-compatible one-time migration from the current localStorage keys. Do not create a second TONE3000 credential field or a second OAuth session.

## 2. Existing TONE3000 tone/model browse and download path

After a successful Select callback, `processCallback()` reads `tone_id` and calls `loadSelectedTone()`.

That function:
- Calls `GET /tones/{tone_id}?architecture=2`.
- Calls `GET /models?tone_id={tone_id}&architecture=2&page=...&page_size=50`.
- Collects model pages and stores the selected tone/model catalogue through `tone3000-workspace.js`.
- Preserves selected model ID, tone title, creator, description, model name, model URL, architecture, size, and description.

Existing download actions:
- **Download Only** downloads a model and saves it into the Android app-private NAM Library through `MG30Midi.saveModel`.
- **Download & Import** downloads the model bytes, runs the MG-30 A2-Lite validator, builds a transfer plan, saves a local copy, and then sends the model to the selected device slot.
- The selected TONE3000 model is fetched from its per-model `model_url` using the current OAuth Bearer token.

The AI feature should call this existing integration. It should not duplicate OAuth, token refresh, model URL handling, or direct-download logic.

## 3. Existing NAM Library and native file storage

The persistent Library is implemented in:
- `www/nam-model-library-ui.js`
- `native-android/MG30MidiPlugin.java`

Native model files are stored in the app-private directory `filesDir/nam-models`. The existing plugin provides:
- `saveModel`
- `listModels`
- `readModel`
- `deleteModel`

The existing UI accepts `.nam`, `.namb`, and `.image` library entries, with a 20 MB limit. Library import reads the file from native storage, validates its payload, and then reuses the original MG-30 transfer implementation.

Note: Download Only in `tone3000.js` currently stores the downloaded bytes without first running the A2-Lite compatibility validator. The Library Import action validates before writing to the pedal. For the AI auto-import path, validate downloaded bytes before both transfer and any claim that the model is compatible. Do not delete or silently replace existing Library files.

## 4. Existing MG-30 Gen 2 NAM transfer path — preserve unchanged

The verified transfer implementation is `www/nam-transfer.js`.

### Accepted model payloads

The current validator accepts:
- JSON NAM with `architecture: "WaveNet"` and exactly 1,871 weights; or
- A `SlimmableContainer` containing a nested WaveNet submodel with exactly 1,871 weights; or
- Native `.namb` version 1, valid CRC32, WaveNet marker, and exactly 1,871 weights.

The validator exports `extractMG30A2LiteWeights()`. This is the compatibility gate. A TONE3000 listing tagged architecture 2 must not bypass it.

### Transfer and readback

- `buildMG30A2LiteTransferPlan(weightBytes, label, slot)` accepts UI slots 1–10 and maps each to zero-based device slot index.
- The existing sender writes the metadata/name frame and data frames through the existing NUX SysEx transaction.
- Each write waits for a matching device ACK (1.2 s timeout; maximum two attempts).
- It performs two passes of slot metadata/name queries and verifies the target slot name.
- The existing protocol does **not** read back NAM model weights. A successful transfer plus verified slot name is not a byte-for-byte weight readback.

The AI import must reuse `extractMG30A2LiteWeights`, `buildMG30A2LiteTransferPlan`, and `sendMG30A2LiteTransfer`. Do not implement a second SysEx path, change frame definitions, alter retry behavior, or replace the ACK/readback logic.

## 5. Slot 10 status

- Existing TONE3000 target slot UI supports slots 1–10.
- Existing NAM Library import UI supports slots 1–10.
- Existing transfer-plan builder supports slot 10; slot 10 maps to zero-based slot index 9.
- The app does not currently reserve slot 10 for AI. The stored TONE3000 target slot is an ordinary user-selected value and may be empty.
- Existing NAM slot naming/metadata maps ten NAM slots to device slot IDs 54–63; slot 10 is the tenth existing NAM slot, not a new slot.

Recommended AI behavior:
- Default AI NAM target to slot 10 without altering the default target used by manual NAM imports.
- Read the current ten-slot metadata using the existing two-pass read operation.
- Show the currently reported slot-10 name and ask for explicit confirmation before overwriting it.
- Do not treat a blank/unreadable name as proof that the slot is empty.
- Keep the downloaded NAM file in NAM Library after transfer, and never silently delete a previous file.

## 6. Amp Only vs Amp + Cab finding

The current `startSelectFlow()` builds these fixed OAuth query parameters:

- `prompt=select_tone`
- `format=nam`
- `architecture=2`
- `gears=amp-cab`

This locks the current TONE3000 selection view to Amp + Cab. The official TONE3000 API documentation lists both `amp` and `amp-cab` as valid gear values. The requested AI follow-up can therefore map as follows:

| AI choice | TONE3000 gear filter |
|---|---|
| Amp Only | `gears=amp` |
| Amp + Cab | `gears=amp-cab` |

This must be an input to the existing OAuth selection flow; it must not be implemented as a second OAuth client or second API-key field.

## 7. Search capability and API terms constraint

The current app does not call `/tones/search`. It uses the official Select experience, then loads the selected tone's models.

TONE3000's official documentation recommends the Select OAuth flow for catalog browsing and search, and warns that `/tones/search` is heavily rate-limited. The published API Terms distinguish free/non-commercial integrations from commercial integrations; full API access is subject to the applicable tier and commercial approval. Before shipping autonomous AI-driven global search, confirm the app's applicable TONE3000 API tier and permitted endpoint access with TONE3000.

Safe initial route:
1. AI asks Amp Only or Amp + Cab.
2. AI opens the existing Select OAuth flow with the corresponding `gears` filter, `format=nam`, and `architecture=2`.
3. The user browses/selects a tone in TONE3000.
4. The app receives the tone ID, loads its available models, and AI ranks only the compatible A2-Lite candidates returned for that selected tone.
5. AI downloads, validates, previews the candidate metadata, asks before writing, then reuses the existing slot-10 transfer path.

True autonomous search across the entire TONE3000 catalog using `/tones/search` is a separate API-permission decision, not something the current implementation already supports.

## 8. Missing AI integration bridge

At present, `www/ai-tone-studio.js` calls `window.MG30AIToneBridge` for tone-block editing. It does not have a TONE3000 bridge.

In `www/tone3000.js`, the relevant functions remain module-private:
- `startSelectFlow`
- `ensureAccessToken`
- `apiJSON`
- `fetchAllToneModels`
- `loadSelectedTone`
- `saveModel`
- `sendModel`

The only existing window export from that module is `window.NUXNAMTransfer.readMG30NAMSlotNames`.

A later implementation should add one narrow, read-only/command facade owned by `tone3000.js` (for example, `window.NUXTONE3000Bridge`) so AI can:
- check whether a valid TONE3000 session exists;
- start the existing Select flow with the selected gear filter;
- wait for/observe the selected tone and model catalogue;
- list compatible candidate metadata;
- ask the existing module to download, validate, save to NAM Library, and transfer to a requested slot using the existing transfer functions.

The facade must not expose refresh tokens, duplicate OAuth logic in AI code, or allow model writes that bypass explicit slot validation and overwrite confirmation.

## 9. Current automated-test coverage and gaps

Existing tests:
- `tests/tone3000-workspace.test.js` covers catalogue normalization, cached workspace storage, model selection, and invalid catalogue handling.
- `tests/nam-model-library-ui.test.js` covers Library card actions, manual add/delete, and reuse of the A2-Lite transfer path.
- `tests/ai-tone-studio.test.js` covers AI Tone Plan validation, editor MIDI bridge constraints, provider UI, and secure storage for GPT/Gemini keys.

Audit gap:
- No dedicated test file currently covers TONE3000 PKCE callback, token refresh/storage, AI-to-TONE3000 handoff, Amp Only/Amp + Cab filter selection, automatic A2-Lite candidate filtering, or AI default slot-10 overwrite protection.
- No test currently asserts that AI NAM import reuses the existing TONE3000/native NAM transfer functions without touching other slots.

These are required additions before implementing the automatic NAM flow.

## 10. Recommended implementation sequence

1. **Secure token adapter:** add TONE3000 OAuth token access to the existing Android Keystore-backed secure store. Migrate existing localStorage tokens safely; keep Publishable Key as the single public `client_id`.
2. **TONE3000 bridge:** expose a small facade from `tone3000.js`; do not copy OAuth/API code into `ai-tone-studio.js`.
3. **Gear choice:** parameterize the current Select flow for `amp` or `amp-cab`; continue to force `format=nam` and `architecture=2`.
4. **Candidate validation:** filter model list candidates by available metadata, then download and run the existing binary validator. Only a file that passes `extractMG30A2LiteWeights()` may be offered as directly transferable.
5. **AI Slot 10:** default only AI import to slot 10, read existing metadata, require overwrite confirmation, and preserve the local NAM file.
6. **Test and hardware validation:** test OAuth resume, token refresh, Amp/Amp+Cab filters, compatible/incompatible A2 files, slot 10 success, interruption during frame send, and non-target slot preservation.

## Protected scope

This audit made no application changes. During implementation:
- Keep the original NUX MG-30 Gen 2 firmware 6.0.x target; never substitute MKII behavior.
- Keep the existing NAM A2-Lite transfer codec and native USB-MIDI transaction intact.
- Do not modify NAM slot mapping or other slots.
- Do not modify NAM Library storage semantics except through a deliberately tested adapter.
- Do not change IR User / Third Party / Collection transfer, IR collection, NAM assets, or existing MIDI mappings.
- Do not change the working GPT/Gemini direct tone-editor bridge.
- Do not modify the Community .32 release branch.

## Official TONE3000 references checked

- API overview, OAuth/PKCE, Select flow, gear filters, tone/model endpoints, and commercial terms: https://www.tone3000.com/api
- API Terms of Service (effective July 7, 2026): https://www.tone3000.com/api/terms

The API documentation explicitly identifies the Publishable Key as the OAuth `client_id`, marks the Secret Key as server-only, documents the `amp` and `amp-cab` gear filters, and recommends the Select flow for catalog browsing/search. It documents per-tone model listing through `/models?tone_id=...` and per-model download via `model_url`.
