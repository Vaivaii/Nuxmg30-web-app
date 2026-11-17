# ChatGPT SIWC Integration — MG30 Studio

Last updated: 2026-11-17
Working branch: `feature/chatgpt-siwc-android`
Target device: Android app; original NUX MG-30 Gen 2 firmware 6.0.x (not MKII).

## Product decision

- ChatGPT is the primary, persistent AI partner ("lead"/orchestrator) inside AI Live Tone Studio.
- The user signs in from Device settings using Sign in with ChatGPT (SIWC). No OpenAI API key is requested.
- The app uses the user's eligible ChatGPT plan permission directly from the Android runtime; SIWC requests and Responses API calls must not pass through the shared Cloudflare Worker.
- ChatGPT handles open-ended discussion, artist/gear research, TONE3000 NAM search-query design and candidate selection, tone diagnosis, and final Tone Plan creation.
- Specialist agents are optional workers. ChatGPT should invoke them only when a task materially benefits from a specialist; avoid default multi-agent fan-out to conserve usage.
- Do not require a "Create tone from discussion" button. The ongoing AI chat is the context; when the user asks to create a tone, ChatGPT should continue the same conversation and then generate the structured plan.
- Public users sign in with their own ChatGPT account. There is no shared Cloudflare AI login or shared API-key pool for the AI assistant.
- Cloudflare may remain for unrelated existing app services, but it is not the SIWC identity/token/Responses proxy and must not be used for ChatGPT plan calls.

## Security and implementation boundaries

- Native Android plugin owns OAuth, PKCE, loopback callback, OIDC ID-token signature/claims verification, token refresh/revocation, and Responses API requests.
- OAuth access, refresh, and ID tokens are encrypted using Android Keystore AES-GCM. Tokens and authorization headers must never be exposed to WebView JavaScript or Cloudflare.
- Store multiple ChatGPT profiles separately; allow add, switch, and logout.
- Persist the user-bound dynamic `client_id` after callback and before exchanging the one-time authorization code, so an interrupted exchange can be retried using the same registration.
- Use exact registered client ID and validate callback state, issuer, audience/authorized party, nonce, token times and subject.
- Keep `store:false` for Responses API requests. The app maintains its own chat history/context.
- SIWC does not import the user's ChatGPT web conversation history or Memory. The app sends its own conversation history and instructions.
- Respect plan permissions, rate limits and usage limits. Do not build a generic API proxy or use a shared runtime.

## AI/Tone engine behavior

- Route all current AI planning sub-tasks (including NAM query derivation, TONE3000 tone/capture selection, Tone Plan generation, and one validation correction) through ChatGPT by default.
- Use compact conversation context, MG-30 catalog and current editor snapshot; do not send full raw pedal data unless necessary.
- Validate all generated plans against the exact runtime catalog before any MIDI command.
- Never bypass catalog validation or invent parameter aliases.
- Preserve existing NAM import path, slot 10 safety checks, TONE3000 download validation, NAM slot behavior and user selection flow.
- Preserve IR collection/user mappings and correct MIDI mapping. Do not modify IR import or MIDI protocols as part of this integration.
- Preserve original MG-30 Gen 2 6.0.x target; never substitute MKII catalog/behavior.

## Work committed on this branch so far

- Added native `MG30ChatGPTPlugin` with Android Keystore encrypted profile storage, dynamic-client SIWC flow, PKCE loopback callback, OIDC validation, refresh, logout/revocation, model listing, streaming Responses API and cancellation method.
- Registered the native plugin in `scripts/init-android.mjs`.
- Added Device tab ChatGPT account panel in `www/chatgpt-account.js`; loaded it from `www/index.html`.
- Added direct ChatGPT model listing and Responses calls in `www/ai-tone-studio.js`; primary Auto mode is ChatGPT-only and no longer fans out to Cloudflare AI providers.
- Added a natural discussion path that does not require the MG-30 to be connected, carries recent in-app conversation context into later NAM research and Tone Plans, and enters structured Tone Plan generation only when the user explicitly asks to create/build/apply a tone or preset.
- Added a TONE3000 NAM research path: ChatGPT derives the search phrase, the app retrieves live TONE3000 candidates, and ChatGPT explains/ranks those source results without automatically importing or changing the pedal.
- Reworked AI settings copy and model selector to describe ChatGPT as the primary account-powered engine.
- Added this branch to the Android APK GitHub Actions workflow.

## Remaining validation / known incomplete work

1. **CI completed successfully on 2026-11-17** for commit `80f6779a5dfeab67805970114f6878fb63175460`: 492 tests passed, 0 failed; Capacitor Android project generation and `assembleDebug` succeeded; APK artifact uploaded.
2. Verify SIWC issuer discovery, dynamic registration callback parameters, required scope and token response against the currently supported OpenAI SIWC flow before release. Do not assume an unverified OAuth field.
3. Test first sign-in, interrupted code exchange/retry, existing account sign-in, add account, account switch, logout, token refresh and plan permission denial on a physical Android device.
4. Verify streaming Responses events and cancellation on-device.
5. Complete end-to-end AI conversation: follow-up chat context, TONE3000 search and NAM capture selection, Tone Plan generation, validation correction, and no unintended MIDI write on errors.
6. Add dedicated unit/instrumentation tests for the native plugin and bridge. Current JavaScript test suite does not prove OAuth or Android runtime correctness.
7. Consider moving the remaining obsolete Cloudflare AI-provider controls and dead multi-provider code out of the bundle only after tests prove no other app workflows depend on them.

## Build artifact

- GitHub Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44007567444
- Artifact: `MG30-Studio-debug-APK` (debug APK, 4,713,572 bytes)
- Build SHA-256: `05b9056aa6c61eb348236599a3862fab8b2883b23479f8faaefd939e50a2664b`

## Important status caveat

A successful CI build proves compilation and existing automated tests only. It does not prove that OpenAI SIWC registration, token-sharing permission, plan usage, or real-device OAuth work. Do not call the integration complete or distribute an APK until both CI and physical-device checks pass.

## Android first-launch freeze hotfix — 2026-11-17

- User reported that the first installed app launch froze and no controls responded.
- Root cause found in `www/chatgpt-account.js`: a `MutationObserver` watched the account switch row's `hidden` attribute, then its callback rewrote that same attribute. The repeated attribute mutation could recursively schedule observer callbacks and lock the Android WebView main thread.
- Removed the observer. The existing `render()` function already owns and updates the row's visibility, so no observer is needed.
- Added `tests/chatgpt-account-startup.test.js` to prevent reintroducing a self-triggering observer.
- Hotfix commits: `fd2e6865ab413833f7cfb957c14e79a97e7ec38e` (source), `16da509a52102d47addee37dcb63b502454ec0a0` (regression test).
- Rebuild and verify first launch on a physical Android device after CI completes. The source-level cause is addressed, but the real-device freeze fix must not be marked confirmed until the replacement APK is installed and tested.

## Restore latest AI workspace UI and add SIWC provider — 2026-11-17

- The prior SIWC branch had replaced the latest AI workspace module with an older, reduced assistant panel. This removed the USB Audio Listening / Analyze Once / Live Listening dock and the provider-selection experience, and left stale test-button listeners that could throw before the Send handler was attached.
- Restored `www/ai-tone-studio.js`, `www/index.html`, and `tests/ai-tone-studio.test.js` from `feature/multi-ai-free-tone-architect`, the latest source branch containing the current conversation UI, audio diagnosis, provider selection, NAM cards and recent conversation behavior.
- Restored `www/ai-audio-analysis.js`, used by the current USB Audio analysis dock.
- Added ChatGPT SIWC as an additional provider in the restored provider selector; the prior Auto, Cloudflare Workers AI, Gemini, Groq, OpenRouter, GPT API and Multi-AI choices remain present.
- ChatGPT is the default selected provider. Requests use the native `MG30ChatGPTBridge.sendResponse` path and do not send SIWC credentials or Responses traffic through Cloudflare. The existing provider selection and fallback behavior for other modes remains intact. ChatGPT does not silently fall back to a different provider when selected.
- Native ChatGPT model discovery is performed independently of Cloud Account status, so a user can use SIWC without first signing in to MG30 Cloud.
- Added `tests/chatgpt-si-wc-ui-preservation.test.js` covering restoration of the audio UI, prior provider choices, native SIWC routing, Cloud-independent model discovery, ChatGPT primary selection and Send handler presence.
- IR import / User / Collection mapping, NAM transfer codec/slot protocol and MIDI mapping were not changed in this UI restoration.
- Updated source commits: `07f358cec65fe4284f4f9b6f89a1b58f838f5c76`, `7ba2b7da07e5943841937821b3843cafc2ab5ac6`, `0fa36202984c819007d8d9189094171e4f74329f`, `aeea452859d590abd39c82ce242aedccdf78ec8d`, plus regression tests `ecdcdc175d6cefa1663b6ffb76909eeb8d22f6e9` and `4c0b72a3a80939cc3f7448a6fd52ab82d6279213`.
- This is source restoration and integration only; the current branch must still pass CI and the replacement APK must be tested on the physical Android device before confirming the regression is fixed.

## Repair of the latest ChatGPT-first branch Actions failures — 2026-11-17

- Work was continued on the existing active branch `feature/chatgpt-siwc-android`, after reading the latest HEAD documentation commit `627c934191e7028f7bf0a0602086a6c42a7f94bc` and inspecting the code commit immediately before it. No branch reset or source rollback was performed.
- The nine failures in Actions run #985 were traced to a combination of stale regression expectations and one real Worker implementation gap:
  - Two provider tests still asserted the superseded Auto/free Multi-AI default. Updated them to assert ChatGPT SIWC is the selected default while Auto and the other provider modes remain available.
  - The Cloudflare provider test expected a non-optional click listener. Updated it to preserve and assert the current optional listener, which avoids failures if a settings button is absent.
  - The USB audio test searched for unescaped quote characters in a JavaScript string containing escaped HTML attributes. Corrected its matching expression; no audio UI or capture behavior was changed.
  - Three NAM tests expected the former inline NAM selection/transfer flow. Updated them to verify the current conversation-card flow: TONE3000 profile selection, A2 capture selection, download and A2-Lite preflight, explicit transfer confirmation, and USB-MIDI connection required only at the final slot-10 transfer step.
  - The SIWC test expected obsolete explanatory wording. It now asserts the actual native `MG30ChatGPTBridge.sendResponse` path and direct Android connection status.
  - The Worker test exposed an actual omission: output-token limits were hard-coded in some provider adapters. Added `clampOutputTokenLimit`, passed the bounded request budget to Gemini/OpenAI-compatible adapters, and used bounded `max_completion_tokens` / `max_tokens` values for Groq and OpenRouter, including the JSON retry.
- Files changed for this repair are limited to `cloud-worker/src/index.js` and regression test files:
  - `tests/ai-tone-studio.test.js`
  - `tests/chatgpt-si-wc-ui-preservation.test.js`
  - `tests/tone3000-ai-nam.test.js`
- A commit comparison from the preceding project HEAD `627c934` to the successful build commit confirms these four files are the only changed paths. No NAM codec, TONE3000 transfer implementation, IR import implementation/mapping, MIDI mapping, native ChatGPT plugin, or USB audio implementation was edited for this repair.
- Repair commits on this branch: `c495889a9dcda0b24779df5b485cc4d704781e81`, `8bf7ccea1cb464b22bbb9fa391da65c658d4a6d2`, `66c3231aaa5aace2d9a391c2a66c59e836e2eee6`, `4dacbe247f26e63a672ce3ad315466f3609780a2`, and `65385d3fe8109e9eda19cf70f5c70ddf74bab597`.
- Successful GitHub Actions run #990: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44019610029
  - Commit built: `65385d3fe8109e9eda19cf70f5c70ddf74bab597`
  - JavaScript syntax validation: passed.
  - Protocol regression tests: 558 passed, 0 failed.
  - Capacitor Android project generation and USB audio plugin setup: passed.
  - Gradle debug APK build: passed.
  - APK artifact upload: passed; artifact name `MG30-Studio-debug-APK`, 4,740,288 bytes.
- Extracted debug APK SHA-256: `581d154444c4bb7c048d6fae5e3cf10d474f0768c0b0724e28783b1fbd20b986`.
- Physical-device acceptance is still pending. CI success does not prove actual SIWC sign-in or MG-30 Gen 2 NAM/audio/MIDI hardware operation. Install and verify on the original MG-30 Gen 2 with firmware 6.0.x before treating hardware validation as complete.

## Fix: generate Tone Plans while USB-MIDI is disconnected — 2026-11-17

- User confirmed ChatGPT discussion works, but every request to create a tone returned `MG-30 is disconnected. Connect USB-MIDI before applying a built-in amp live tone.`
- Root cause: `submit()` checked `bridge.isConnected()` before calling `makePlan()`. The precondition blocked the AI planning stage, conflating Tone Plan generation with live hardware application.
- Changed `www/ai-tone-studio.js`:
  - Removed the early USB-MIDI guard before AI planning.
  - ChatGPT can now generate and catalog-validate a Tone Plan while disconnected.
  - If the pedal is disconnected after planning, the validated Tone Plan is retained in an in-memory pending draft and shown in chat with a block summary. No MIDI is sent.
  - When the user reconnects USB-MIDI and sends an explicit apply command (e.g. `terapkan tone`), the app revalidates the retained plan against the current catalog and then calls the existing `applyPlan` path.
  - If the user requests apply while still disconnected, the assistant explains that the plan is ready and asks for USB-MIDI connection; it does not fail the generation stage.
  - A new tone-creation request clears an older pending draft. A successfully applied draft is cleared.
- Added regression test in `tests/ai-tone-studio.test.js` for offline draft generation and explicit apply after reconnect. Updated the NAM preflight regression in `tests/tone3000-ai-nam.test.js` so it no longer expects the obsolete pre-generation connection guard.
- Source/test commits: `0d5bf85dec823a6b71ac8a965b06fe187fa876a3`, `58913b36e3742822cdf2fb4ec90b62f5bd12f1cb`, `e0dcdec369f3d47860b05b4d6811dabe9eb33606`.
- GitHub Actions run #993: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44021209728
  - JavaScript syntax validation: passed.
  - Regression tests: 559 passed, 0 failed.
  - Capacitor Android generation: passed.
  - Gradle debug APK build: was still running when this note was written; do not claim APK success until Actions confirms completion and artifact upload.
- No NAM transfer codec, TONE3000 download/preflight implementation, IR import mapping, MIDI mapping, or USB audio analysis implementation was changed. Hardware verification on the original MG-30 Gen 2 firmware 6.0.x remains pending.
