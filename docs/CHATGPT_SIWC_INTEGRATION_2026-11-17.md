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
- Reworked AI settings copy and model selector to describe ChatGPT as the primary account-powered engine.
- Added this branch to the Android APK GitHub Actions workflow.

## Remaining validation / known incomplete work

1. Run CI on this branch and fix Java/Gradle/JS/test failures.
2. Verify SIWC issuer discovery, dynamic registration callback parameters, required scope and token response against the currently supported OpenAI SIWC flow before release. Do not assume an unverified OAuth field.
3. Test first sign-in, interrupted code exchange/retry, existing account sign-in, add account, account switch, logout, token refresh and plan permission denial on a physical Android device.
4. Verify streaming Responses events and cancellation on-device.
5. Complete end-to-end AI conversation: follow-up chat context, TONE3000 search and NAM capture selection, Tone Plan generation, validation correction, and no unintended MIDI write on errors.
6. Add dedicated unit/instrumentation tests for the native plugin and bridge. Current JavaScript test suite does not prove OAuth or Android runtime correctness.
7. Consider moving the remaining obsolete Cloudflare AI-provider controls and dead multi-provider code out of the bundle only after tests prove no other app workflows depend on them.

## Important status caveat

A successful CI build proves compilation and existing automated tests only. It does not prove that OpenAI SIWC registration, token-sharing permission, plan usage, or real-device OAuth work. Do not call the integration complete or distribute an APK until both CI and physical-device checks pass.
