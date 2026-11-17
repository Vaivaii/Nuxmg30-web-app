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

## Adaptive ChatGPT Tone Architect and token-efficient live apply — 2026-11-17

The earlier "offline draft" implementation note above has been superseded. The accepted architecture is ChatGPT-first and adaptive, not free-first multi-agent orchestration and not a disconnected-only draft workflow.

### Product flow

1. The user continues the normal AI Live Tone Assistant conversation. ChatGPT uses the current request plus compact recent conversation context.
2. For a simple request or focused edit, ChatGPT handles the entire task in one native SIWC Responses call. The specialist tool schema is not sent.
3. For a named artist/song/style reference or genuinely complex signal-chain request, the app may expose one narrowly scoped specialist tool only when a free specialist provider is actually available.
4. ChatGPT decides whether that specialist is materially useful. At most one specialist task is permitted for one Tone Plan. The specialist receives a short brief, a compact conversation excerpt and only the relevant MG-30 catalog/snapshot blocks; it does not receive the full conversation or catalog.
5. The specialist is advisory. ChatGPT receives its structured result and remains the sole synthesizer/final decision authority. No second specialist or consensus fan-out is allowed.
6. The final Tone Plan is validated against the exact runtime catalog before any device write.
7. Tone Plan generation is not blocked by USB-MIDI disconnection. If the pedal is disconnected, the validated plan is kept in a session-local pending-apply slot. No MIDI is sent. Once connected, a natural follow-up such as "terapkan tone" or "lanjutkan" reuses and revalidates that plan; it does not call ChatGPT or the specialist again. A new tone request replaces the old pending plan.

### Token and cost controls

- One ChatGPT call for simple requests.
- One optional specialist at most for a qualified complex/artist-reference request; no default fan-out.
- One ChatGPT synthesis call only when a specialist was actually called.
- Specialist output caps: Tone Architect 220, Gear Specialist 240, Parameter Engineer 320, Critical Reviewer 260 tokens (server-side limits still apply).
- Specialist inputs are capped and block-filtered; only up to four relevant block IDs are accepted.
- ChatGPT tool calls are sequential (parallel_tool_calls=false), limited to one tool definition and one invocation.
- The native bridge caps Responses output tokens at 1,800 and carries actual usage metadata back to the UI. Responses are stored with store:false.
- No specialist is offered for routine/simple edits or same-tone refinements. A named artist/style or complex signal chain is required before even exposing the tool schema.

### Implementation changes on feature/chatgpt-siwc-android

- www/ai-tone-studio.js: added adaptive ChatGPT tool orchestration, specialist eligibility, compact specialist execution, one-call cap, final synthesis, and session-local pending Tone Plan reuse after USB-MIDI reconnect.
- www/chatgpt-account.js: forwards only the bounded tool definition and output-token controls through the native SIWC bridge.
- native-android/MG30ChatGPTPlugin.java: validates the single approved specialist tool, caps token output and tool count, preserves Responses output items/function-call handoff, and accepts complete assistant message content arrays for the second Responses request.
- tests/ai-tone-studio.test.js: covers one-call simple requests, one-specialist delegation, no second tool, token usage aggregation, specialist eligibility and pending plan reuse.
- tests/tone3000-ai-nam.test.js: covers the ordering of planning/validation before live USB-MIDI apply and the native Responses handoff contract.
- The existing ChatGPT SIWC account/OAuth mechanism remains the direct Android connection. ChatGPT tokens and Responses requests are not sent through Cloudflare. The Worker is used only for the optional non-ChatGPT free specialist call where configured.

### Protected boundaries

No changes were made to NAM A2-Lite transfer codec, TONE3000 download/import protocol, NAM slot 10 mapping, IR User/Third Party or Collection mapping, MIDI CC/parameter mapping, preset/scene codec, or USB audio capture/analysis. The target remains original MG-30 Gen 2 firmware 6.0.x, not MKII.

### Validation status

- Intermediate Actions #1006 at commit b7017b42feed798d2b20733419a6f0b4a252702c: 561 tests passed and Android debug APK build/artifact upload succeeded. This artifact is NOT the deliverable because further specialist-eligibility and bridge regression changes followed it.
- The latest source/test commits after that intermediate build include d123f7b4a96cb6158c2a45284e7185c3e88c9c50, 76877e5d3ea41594ba238f912a1c65338939b564, 137a4b1c750b37bd9c38024a280810cbf418e6bb, 59180d0917e9874e78099aa24248ee66b819337c, 8e6e1b92527945dfc7e6199e23a3231be2264ff0, and 106ccfc36551f2d618ded49fd26d7c6e7a370c66.
- Final source commit built: 106ccfc36551f2d618ded49fd26d7c6e7a370c66. The branch HEAD was subsequently advanced only by documentation commit 4b8236ea664514d4aa6784a5aba3619c3752cd4e; no source code changed after the tested source commit.
- Final GitHub Actions run #1013: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44025327422 — success.
  - JavaScript syntax validation: passed.
  - Regression tests: 563 passed, 0 failed.
  - Capacitor Android generation and USB audio plugin setup: passed.
  - Gradle assembleDebug: BUILD SUCCESSFUL.
  - APK artifact uploaded: MG30-Studio-debug-APK, artifact ID 14301599965, APK size 4,746,824 bytes.
  - Extracted APK SHA-256: 7ae8f3d6641487a2d33217269269af995e14a5ae7fdffa14c13d8f3e1c1352b9.
- The APK corresponds to the final tested source commit; it is not the superseded #1006 artifact.
- Physical Android + original MG-30 Gen 2 firmware 6.0.x verification remains pending; CI does not prove hardware behavior.


## Fix: natural ChatGPT discussion was incorrectly forced through Tone Plan JSON — 2026-11-17

- User demonstrated that an ordinary contextual follow-up such as "Kalau yang ini gimana?" after a successful tone discussion returned: `Failed: chatgpt: The AI response does not contain a JSON Tone Plan.`
- Confirmed root cause in source:
  - `submit()` correctly classified the example as `consultation` and routed it to `answerToneConversation()`.
  - `answerToneConversation()` called `invokeWorkersAILightTask('tone-discussion', ...)`.
  - In ChatGPT mode, `invokeWorkersAILightTask()` redirected to `askNamAIJson()`, which called the structured `chatgpt()` adapter and its `parseJson()` Tone Plan parser.
  - Thus the request asked for natural conversation but the transport/parser still required a JSON Tone Plan. The same detour also violated the ChatGPT-first decision by using the Worker light-task abstraction for the default ChatGPT discussion path.
- Changed `www/ai-tone-studio.js`:
  - Added `requestChatGptConversation()`, a dedicated native SIWC Responses call that accepts ordinary plain-text output. It has no JSON parser, no Tone Plan schema, no specialist tools, and no route to `makePlan()` or `applyPlan()`.
  - ChatGPT-mode consultation now calls `window.MG30ChatGPTBridge.sendResponse` directly and returns the natural-language response.
  - The manual non-ChatGPT provider path remains available as an alternate; it is not used by the ChatGPT primary path.
  - Preserved compact current context: recent discussion is capped at 1,500 characters, current editor snapshot at 8 blocks / 5 parameters each and 900 serialized characters, and the user message at 500 characters. Conversation output is capped by the existing 520-token stage budget (native bridge bounds it between 256 and 700).
  - The discussion instruction explicitly forbids JSON, Tone Plan creation, MIDI, preset writes, and claims that settings changed.
  - Corrected usage-monitor parsing to read native SIWC usage fields `input_tokens` and `output_tokens` as actual provider usage, instead of incorrectly treating them as absent and falling back to character estimates.
- Added regression coverage in `tests/ai-tone-studio.test.js`:
  - Contextual "Kalau yang ini gimana?" / "Kalau yang tadi bagaimana?" / "Apa kekurangannya?" remains `consultation`; explicit "Oke, buatkan tonenya" remains `tone_create`.
  - Plain prose from the native ChatGPT bridge is accepted without JSON parsing; one call only, no tool payload, with the configured 520-token output cap and actual usage retained.
  - The ChatGPT consultation branch is asserted to bypass `invokeWorkersAILightTask`, `askNamAIJson`, `parseJson`, `makePlan()`, and `applyPlan()`.
  - The old test expectation that Workers AI was the primary discussion route was replaced with a test asserting native SIWC as the ChatGPT primary route while retaining the manual-provider alternate.
- No NAM/TONE3000 import code, A2-Lite transfer codec, NAM slot mapping, IR User/Third Party/Collection mapping, MIDI mapping, USB Audio capture/analysis, preset codec, or MG-30 Gen 2 catalog was changed.
- Successful final GitHub Actions run #1019: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44031479752
  - Source/test commit built: `4d6512c47a6a968009997bc6c3057d917dec292f`.
  - JavaScript syntax validation: passed.
  - Regression tests: 566 passed, 0 failed.
  - Capacitor Android generation and USB Audio plugin setup: passed.
  - Gradle `assembleDebug`: BUILD SUCCESSFUL.
  - APK artifact: `MG30-Studio-debug-APK`, artifact ID `14305781263`.
  - Extracted APK size: 4,747,508 bytes.
  - APK archive integrity: `unzip -t` passed; host identified file as Android package (APK).
  - Extracted APK SHA-256: `b9f082684c9ff0f73c43a901bd35ef73c8be313ab136681a3b35a40d1889a17b`.
- Physical Android verification of follow-up chat, actual SIWC usage counts, and live MG-30 Gen 2 firmware 6.0.x operation remains pending. Do not claim device-level verification based on CI alone.


## Task-based ChatGPT Auto models and per-agent token accounting — 2026-11-17

### Auto model policy

- This policy applies when the provider is ChatGPT SIWC and the model selector is Auto. Explicitly selected manual models are preserved and used for both tasks.
- Ordinary conversation/discussion selects the light ChatGPT model from the signed-in model catalogue. With the currently observed model catalogue, the preferred discussion choice is `gpt-5.6-luna` (GPT-5.6-Luna). If that exact model is absent, Auto prefers a listed mini/nano/flash/lite/small model, then a GPT-5 family entry, then the first catalogue model.
- Tone Plan generation selects GPT-6-Luna (`gpt-6-luna`) from the signed-in model catalogue. If GPT-6-Luna is not listed, it may use another listed GPT-6 model. If no GPT-6 model is available, the app fails with a clear message rather than silently downgrading the Tone Architect model.
- The model selector's Auto label now describes the behavior: light chat / GPT-6 tone build.
- Conversation requests remain plain-text SIWC calls and use the discussion model. Build requests and catalog-correction calls use the Tone Plan model. Manual model selection is not overridden.

### Per-model and per-agent usage monitor

- Session usage now retains provider totals plus separate provider/model rows. For ChatGPT this distinguishes, for example, `chatgpt · gpt-5.6-luna` discussion usage from `chatgpt · gpt-6-luna` Tone Plan usage.
- Task/agent rows include model identity, input tokens, output tokens, total tokens, request count, and successful/failed invocation counts.
- When ChatGPT calls one specialist, the routing/decision Responses call and final synthesis Responses call are logged as separate ChatGPT orchestrator requests. The specialist is a separate row labelled by role and actual provider/model.
- Specialist success rows use the provider and model returned by the Worker. If a specialist invocation fails before the Worker can identify an upstream model, the monitor records a failed `free-specialist · provider/model unavailable` attempt with estimated input usage instead of inventing a provider/model.
- The Cloudflare Worker now returns normalized actual usage when the upstream supplies it: Gemini `usageMetadata`, OpenAI Responses `usage`, and Groq/OpenRouter chat-completion `usage`. When no upstream usage is available, the UI estimates and marks the affected row with `~`.
- Monitor headings now read "By provider / model" and "By task / agent + model"; detail rows show input/output and success/failure counts.

### Final validation and artifact

- Final GitHub Actions run #1030: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44037645087 — success.
- Built source/test commit: `b8919c8bef9a3568aa168b25d181a12872868892`.
- JavaScript syntax: passed.
- Regression tests: 643 passed, 0 failed.
- Capacitor Android generation and USB Audio plugin setup: passed.
- Gradle `assembleDebug`: BUILD SUCCESSFUL.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `14307956536`, size `4,371,266` bytes (compressed ZIP).
- Extracted `app-debug.apk`: 4,748,716 bytes; archive integrity test passed; identified as an Android package with APK Signing Block.
- APK SHA-256: `6c9c39c68c8effbb97f74bd6c38cc035e83394b763d299b494c6fb45c896be9e`.
- Physical-device validation is still required to confirm that the signed-in SIWC model catalogue actually offers both GPT-5.6-Luna and GPT-6-Luna for the user's account, and to observe provider-reported token usage for the models/providers used in live specialist calls. The app's Auto selection is based on the catalogue returned by that account; the model names are not hard-coded as assumed available.
- No NAM/TONE3000 transfer code, NAM slot-10 mapping, IR User/Third Party/Collection mapping, MIDI mapping, USB Audio capture/analysis, MG-30 preset codec, or original MG-30 Gen 2 firmware 6.0.x device catalog was changed.
