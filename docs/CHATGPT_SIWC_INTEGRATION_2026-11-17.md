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
