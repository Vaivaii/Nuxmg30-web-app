# AI Live Tone Studio — Branch & Parallel APK Setup

Date: 2026-11-13

## Branch isolation
- Branch: `feature/ai-live-tone-studio`
- Base: `release/mg30-studio-final-polish` (Community .32 known-good baseline).
- Stable Community branch is not modified.
- Target remains original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.

## Parallel Android installation
- Display name: MG30 Studio AI
- Android applicationId: `com.vaivaii.mg30studio.ai`
- Stable app applicationId remains `com.vaivaii.mg30studio`.
- Capacitor/native Java namespace is intentionally kept as `com.vaivaii.mg30studio` so existing native plugins and USB-MIDI implementation do not need package refactoring.
- `scripts/init-android.mjs` patches only the generated Gradle applicationId after Capacitor sync. This keeps Android package identity separate while preserving the existing native plugin package.
- `.github/workflows/build-apk.yml` now includes this branch.

## Signing
- The existing Community .32 release APK uses its established release signing identity.
- This branch's current APK workflow builds a DEBUG APK, which is signed with Android's debug signing identity and is distinct from the Community release certificate. Together with the separate applicationId, it can be installed alongside Community .32.
- Hosted CI debug keystores may not be persistent between workflow runs. Do not treat successive debug APKs as guaranteed in-place upgrades; a persistent dedicated AI release keystore should be configured through protected GitHub Actions secrets before distributing upgradeable AI builds. Never commit keystore files or passwords to the repository.

## AI product direction
- AI is embedded in the Tone Editor as live operator, not a separate import workflow.
- Providers: GPT/OpenAI API, Gemini API, and collaboration mode (GPT + Gemini).
- User prompt causes validated editor parameter changes to be sent immediately through the existing MG-30 device communication layer; no Apply-to-Editor button.
- The editor and pedal must confirm successful communication. Disconnect, timeout, rejected parameter or failed transfer must display a clear failure and must not claim success.
- Undo AI Changes restores the state captured before the last AI transaction. Manual edits and AI revisions need a coherent undo/history model.
- Save to Device remains an explicit user action after auditioning/tweaking.

## Non-regression guardrails
- Do not change existing NAM A2-Lite import/slot metadata.
- Do not change IR User/Third Party protocol 10/09/11 or IR Collection 6A/6C/6B.
- Do not change existing MIDI mappings, preset serialization/transfer, USB Audio or Loopback behavior.
- AI must use a verified original Gen 2 6.0.x effect/parameter catalog and deterministic validation. Never guess effect IDs, ranges, steps or scene structures.
- AI must not generate raw device bytes or create a parallel device protocol.
- Preserve the existing device core as the sole owner of USB-MIDI and preset transfer.

## AI Live Tone Studio implementation status — 2026-11-13

### Implemented
- AI entry point is inserted in the Tone Editor header immediately before CTRL / EXP; assistant opens as a bottom sheet and leaves the editor mounted.
- Provider modes: GPT, Gemini, and GPT + Gemini collaboration (GPT proposes, Gemini reviews and returns the final proposal).
- Two API key fields and editable model IDs; cost-conscious default is `gpt-6-luna`, with `gemini-3.8-flash` for Gemini.
- Android `MG30SecureStorePlugin` encrypts API keys using AES-256-GCM; its non-exportable key is held by Android Keystore. Ciphertext and IV are stored in app-private SharedPreferences.
- AI returns a structured Tone Plan. The app validates block/model/parameter identities and normalized ranges or discrete choices against the live editor catalog before any hardware write.
- AI catalog is intentionally restricted to the first nine tone blocks (WAH, CMP, EFX, AMP, EQ, GATE, MOD, DLY, RVB). IR, NAM, S/R, VOL, presets, scenes and chain order are excluded from AI writes.
- Device writes use the editor's existing `midiSend` / serialized MIDI queue and the existing parameter CC maps. No new SysEx or device protocol path was introduced.
- There is no Apply-to-Editor button. A validated plan updates the editor immediately and queues parameter CC commands to the connected MG-30.
- Undo AI Changes captures pre-change block state. Undo skips any block changed after the AI transaction, protecting later manual tweaks.
- During a live MIDI batch or Undo transaction, the editor page is temporarily locked against manual interactions to prevent knob changes racing the AI queue. It unlocks immediately when the transaction completes or fails.
- If USB-MIDI disconnects before/during writes, the UI reports failure. Code attempts best-effort MIDI rollback when still connected; if disconnected, it restores local editor state and tells the user to reconnect/read back before proceeding.
- The UI states parameter CC has no per-parameter ACK/readback. A successful send means the existing MIDI queue/write returned without error; it is not full hardware readback confirmation.

### Automated verification and APK
- Latest GitHub Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43386675571 (success).
- Regression tests: **426 passed, 0 failed** (417 existing + 9 AI tests).
- Capacitor Android generation and plugin registration: passed.
- Gradle `assembleDebug`: passed.
- Artifact ID: `14019087392`; artifact name: `MG30-Studio-debug-APK`.
- APK size: 4,671,988 bytes.
- APK SHA-256: `0323b427da6beea6ceeec8ecd0d71e06074303a13ca21291d7b2a26882def7d5`.
- APK manifest package verified: `com.vaivaii.mg30studio.ai`; Community .32 package remains `com.vaivaii.mg30studio`.
- APK Signature Scheme v2 verified. AI debug certificate SHA-256: `b97d1885117c93b2c87ff2886eb2a21117196128ffb081a2ad7967ee30e95614`.
- Community .32 release certificate SHA-256 (verified from its signed artifact): `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`. Package IDs and signing certificates differ, so these APKs are eligible to install side-by-side.
- This is a CI debug-signed APK. The runner's debug key can be regenerated in later runs; a persistent dedicated AI signing keystore stored as protected CI secrets is needed to guarantee future in-place upgrades. Never commit keystore files or passwords.
- Physical Android installation and physical MG-30 USB-MIDI live-tone tests have not been performed. Do not describe the feature as hardware-validated.

### Next validation tasks
1. Install on the physical phone alongside Community .32 and verify both remain installed.
2. Connect the original MG-30 Gen 2 firmware 6.0.x and hardware-test prompt-to-CC, model changes, disconnect mid-send, Undo, manual-tweak preservation and Save to Device.
3. Verify OpenAI and Gemini connectivity using the user's keys. API usage billing remains separate from ChatGPT Go.
4. Improve transaction semantics only after hardware evidence. MIDI CC has no per-parameter ACK in this integration; do not promise guaranteed hardware application beyond the observed send result.
5. Consider a backend gateway before public distribution so provider credentials are not sent from the client directly. Local Android Keystore encryption only protects keys at rest.
6. Configure a persistent dedicated AI signing key through protected GitHub Actions secrets before regular distribution/upgrades.

## AI assistant UI refinement — 2026-11-13

Based on the first successful device-use screenshots:
- Increased the mobile bottom-sheet height (91dvh on narrow screens; minimum 84dvh) so the conversation and composer are not pushed into a short, partially hidden panel.
- Increased chat message typography to 14px and provider controls to 13px; enlarged the Tone Editor AI entry button to 17px with a larger touch target.
- Added a visible animated spinner to the live status row while the provider is working. The Send control changes to “Working…” and is disabled during requests; stage text reports GPT drafting, Gemini drafting, or Gemini reviewing GPT in collaboration mode.
- Localized the complete AI assistant interface, statuses, errors, provider settings and button labels to English. AI system instructions now require English summaries and notes even when the user's prompt is written in another language.
- Added automated assertions for taller mobile layout, chat readability, visible busy indicator, larger AI entry button and English UI copy.
- No device protocol, MIDI mapping, NAM handling, IR import/collection code, or Community .32 release branch was changed.
- GitHub Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43396949653 (success).
- Regression tests: **428 passed, 0 failed**.
- Capacitor Android generation/plugin registration and Gradle `assembleDebug`: passed.
- Artifact ID: `14023172073`; artifact name: `MG30-Studio-debug-APK`.
- Extracted APK: 4,672,344 bytes; SHA-256: `ac8469103e32e20ebbafbfb98ce17383da7d788d8dfb04d0fb0bcc32e1f876af`.
- The updated visual layout has not yet been physically checked on the user's phone. Earlier live MIDI operation was confirmed by the user with the previous AI build; this UI-only update has no hardware protocol changes.

## TONE3000 + AI NAM integration audit — 2026-11-13

Detailed audit saved at `docs/research/TONE3000_AI_NAM_INTEGRATION_AUDIT_2026-11-13.md`.

Key verified findings:
- Existing OAuth PKCE, callback/deep-link handling, code exchange, token refresh, selected-tone loading, model listing, model download, NAM Library save, and direct import are already present in `www/tone3000.js`, `www/nam-model-library-ui.js`, and `native-android/MG30MidiPlugin.java`.
- TONE3000 functions are module-private; AI Tone Studio currently has no reusable TONE3000 bridge. The later implementation must add a narrow facade owned by `tone3000.js`, not duplicate OAuth/API logic in AI.
- Current Select OAuth flow hardcodes `gears=amp-cab`. Official TONE3000 API docs support both `amp` and `amp-cab`; AI can pass the user's choice through the existing flow.
- OAuth access/refresh tokens currently live in WebView localStorage. The existing Android Keystore secure-storage plugin is not yet used for TONE3000 tokens. Add a backward-compatible migration before expanding AI token use; Publishable Key remains the one public `client_id`.
- Current MG-30 transfer path validates only A2-Lite WaveNet with exactly 1,871 weights (or the supported native `.namb` equivalent). Every AI candidate must pass `extractMG30A2LiteWeights()`; architecture 2 alone is not sufficient.
- Existing transfer builder accepts slots 1–10 and can be reused for AI slot 10. Slot 10 is not currently reserved for AI; manual import target behavior must remain unchanged. AI must read names and ask before overwrite.
- Existing `/tones/search` is not used by the app. TONE3000 recommends Select for catalog browsing/search, and unrestricted search is rate-limited / subject to API tier terms. Initial AI workflow should filter the official Select experience by Amp or Amp + Cab; autonomous global search requires confirmation of permitted API access.
- No application source, TONE3000 OAuth, NAM transfer, IR transfer, MIDI mapping, or Community .32 release code was changed during this audit.

## TONE3000 / AI NAM integration implementation — 2026-11-13

**Implementation branch:** `feature/ai-live-tone-studio`  
**Build commit:** `f98a5566a6dfc4db4af62807b950206352aa5de1`  
**Workflow:** [run 43406308926 / build #755](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43406308926)

### Implemented

- Reused the existing TONE3000 OAuth Authorization Code + PKCE flow and Publishable Key. No second TONE3000 credential field or OAuth session was added.
- Extended the existing `MG30SecureStorePlugin` namespace to accept `tone3000`. TONE3000 access token, refresh token, expiry, PKCE verifier, state, and redirect URI are now stored as one encrypted bundle using the existing Android Keystore AES-GCM key.
- Added one-time backward-compatible migration from the old `mg30-t3k-*` localStorage token/PKCE keys. Plaintext keys are removed only after encrypted storage reads successfully or migration is saved. The Publishable Key/client_id remains in its existing public client-side setting.
- Added the AI source-choice wizard: **Built-in MG-30 Amp** or **TONE3000 NAM**. The existing built-in AI Tone Plan catalog continues to exclude NAM slot models via `AMP_STANDARD_MODEL_COUNT`.
- Added the capture-type choice **Amp Only** (`gears=amp`) or **Amp + Cab** (`gears=amp-cab`) to the existing TONE3000 Select flow. The flow still requests `format=nam` and `architecture=2`.
- Exposed a narrow `window.NUXTONE3000Bridge` from `tone3000.js`. AI does not contain a duplicate OAuth implementation and does not receive access/refresh tokens.
- After a tone is selected and its A2 model list has loaded, the bridge publishes candidate metadata to the AI UI. Candidates with no model download URL are disabled.
- AI import is fixed to **MG-30 NAM Slot 10**. Before downloading or writing, it connects and runs the existing two-pass slot metadata/name read. If slot 10 metadata is not successfully readable, the write is blocked. When readable, the confirmation dialog identifies its current device label and the candidate model before any overwrite.
- A candidate file is downloaded and validated through the existing `extractMG30A2LiteWeights()` A2-Lite validator before being saved to NAM Library or transferred. The same `buildMG30A2LiteTransferPlan()` and `sendMG30A2LiteTransfer()` functions perform the device transfer.
- Successful AI import keeps the downloaded file in the persistent NAM Library and closes the candidate list to prevent accidental repeated imports.
- The manual NAM/TONE3000 target-slot selector remains independent and continues to use the user's selected slot; only the AI bridge enforces slot 10.

### Files changed

- `www/tone3000.js`
- `www/ai-tone-studio.js`
- `native-android/MG30SecureStorePlugin.java`
- `tests/tone3000-ai-nam.test.js`

No changes were made to:
- `www/nam-transfer.js` (the verified original Gen 2 transfer codec)
- `www/nam-model-library-ui.js` (manual NAM Library workflow)
- `www/ir-transfer.js` or IR User / Third Party / Collection mapping
- Existing NUX MIDI mappings or native MIDI communication
- The live AI tone-block editor MIDI bridge/Undo behavior
- Community .32 release branch

### Automated build result

- GitHub Actions run: **43406308926**, build #755, conclusion **success**.
- Regression test suite: **434 passed, 0 failed**.
- Capacitor Android generation and native plugin registration: **passed**.
- Gradle `assembleDebug`: **passed**.
- APK upload: **passed**, artifact ID `14027322527`.
- Artifact ZIP size: **4,298,128 bytes**; SHA-256 `3578b851d357aa0875e13b0547230aed1d4ddb632479efd8f8b9664a5565841c`.
- Extracted APK size: **4,676,400 bytes**; SHA-256 `7104746493f907770f3accfa9bf4d8c8c52fc579f9699457c44d27e767bf2bda`.
- The APK ZIP archive passed integrity testing, and the packaged JS bundle contains `NUXTONE3000Bridge`, the two capture types, and slot-10 import UI.

### Known scope limits / pending verification

- This first integration uses the official TONE3000 **Select** catalog flow: the user still browses/selects a tone inside TONE3000. The app then displays the A2 models from that selected tone. Autonomous AI-driven search across the entire TONE3000 catalog by prompt is not implemented; the API documentation recommends Select for browse/search and places extra rate-limit/API-tier conditions on direct search.
- A TONE3000 model tagged architecture A2 is only a catalog candidate. File-level A2-Lite validation remains mandatory and can reject a candidate before transfer.
- The device protocol confirms write ACK frames and two-pass slot-name/metadata readback. It does **not** read back model weights, so a successful status is not a byte-for-byte weight verification.
- No physical MG-30 transfer or audio audition was performed by CI. Install this APK on Android, reconnect the original MG-30 Gen 2 firmware 6.0.x, run one controlled import to slot 10, confirm a pre-existing slot-10 name triggers an overwrite prompt, then audition the result. Do not use the MKII for acceptance.


## 2026-11-13 — AI Studio Full TONE3000 Catalog Search + Dynamic Conversation Window

### Implementation
- AI Studio now searches the authenticated TONE3000 REST catalog directly through `GET /api/v1/tones/search`; it no longer opens the TONE3000 Select browser when searching from the AI panel.
- Search reuses the stored OAuth session and sends `format=nam`, `architecture=2`, the selected `gears=amp` or `gears=amp-cab`, `page=1`, `page_size=12`, and best-match ordering.
- Search results are displayed inside AI Studio. Selecting a tone loads its detail and A2 model candidates via the existing TONE3000 endpoints; candidate downloads continue to use the authenticated `model_url`.
- Identical searches are cached in memory for 60 seconds. HTTP 429 produces a clear rate-limit status; no pedal write occurs from a search failure.
- Candidate transfer retains the existing slot-10 metadata read, explicit overwrite confirmation, A2-Lite 1,871-weight validation, NAM Library save, and existing MG-30 transfer codec.
- After a successful slot-10 transfer, AI Studio automatically generates the requested Tone Plan when a prompt is present.
- The original TONE3000 Select flow, manual NAM import UI, and normal NAM slot target selection remain intact.

### NAM safety boundary
- The AI editor catalog exposes only NAM slot 10 as an AMP model, marked selection-only with an empty parameter list.
- AI may switch the AMP block to slot 10. AI may not modify the NAM capture's internal gain/bass/middle/treble/master controls or slots 1–9.
- Undo restores AMP model selection; when the previous AMP model is a NAM slot, rollback sends only its model-selection CC and does not send NAM internal parameters.
- IR collection/user paths, NAM Library logic, and MIDI mappings are not changed.

### Conversation window sizing
- The AI sheet is now content-sized and has a viewport maximum rather than a fixed near-full-screen height.
- The message area grows with the conversation, then caps at 30dvh and scrolls internally. The prompt composer starts at 62px and may grow up to 120px.
- On mobile the sheet remains capped at 91dvh to preserve room for Android navigation and keyboard behavior.

### Validation caveats
- Automated tests and Android build must pass before distribution.
- TONE3000 documents the Search Tones endpoint as heavily rate-limited by default and lists a default global rate limit of 100 requests/minute. Contact TONE3000 for production rate-limit approval; local caching does not replace approval.
- Physical-device verification is required for AMP slot-10 selection after import, automatic preset generation, Undo, and disconnect handling. The pedal protocol confirms write ACKs and slot metadata/name, but does not read back model weights byte-for-byte.


## 2026-11-13 — Mandatory AMP NAM Slot-10 Enforcement

- User testing showed that AI could still produce a built-in AMP model after the NAM import flow. Prompt instructions alone were not sufficient.
- AI Studio now deterministically replaces the proposed AMP block with the exact verified selection-only NAM slot-10 catalog model after a successful import, with `parameters:{}`.
- This is applied immediately before validation/MIDI send; no provider output can silently substitute a built-in amp once the imported-NAM context is active.
- If the imported model is not present in the live AMP catalog as the verified slot-10 model, the operation aborts before any preset MIDI writes.
- NAM internal parameters remain locked. Other allowed blocks are preserved from the AI plan. Undo remains available through the existing block transaction.


## 2026-11-13 — Prompt-Driven TONE3000 NAM Automation

- Choosing TONE3000 NAM and Amp Only/Amp + Cab configures the mode only. The next Send starts the full process.
- AI derives concise amplifier search terms, queries TONE3000 using `format=nam`, `architecture=2`, `sizes=lite`, and the selected gear, then selects a matching tone pack and model.
- The model downloads in the background and is validated by the MG-30 Gen-2 A2-Lite 1,871-weight validator and transfer-plan builder before slot metadata is read or overwrite confirmation is displayed.
- The exact validated bytes are cached and reused for transfer; a library copy is retained.
- After transfer succeeds, AI creates the Tone Plan and the app forces AMP to slot 10. Any failed search, validation, slot scan, confirmation, or transfer stops the preset stage.
- AI snapshots omit NAM internals. Slot 10 is selection-only; NAM internals, slots 1–9, IR paths, and MIDI mappings remain protected.
- TONE3000 Search Tones is heavily rate-limited. Their Commercial Terms reserve full search API for commercial-tier integrations; obtain approval before publicly distributing this full-search feature. Official documentation: https://www.tone3000.com/api.


## Follow-up implementation — TONE3000 authentication, NAM preflight staging and provider selection

- Work remains isolated to `feature/ai-live-tone-studio`; target remains original MG-30 Gen 2 firmware 6.0.x.
- Device → TONE3000 Settings adds a **Connect TONE3000 Account** action. The Publishable Key is only the OAuth client_id and does not itself authorize the user's TONE3000 account. Connect-only sign-in reuses Authorization Code + PKCE and the existing encrypted session bundle without opening the Select tone picker.
- OAuth callback distinguishes connect-only completion from a selected-tone callback. Session checks refresh the access token before declaring a connection. A 403 from `/tones/search` is reported as an API access-tier/endpoint-permission issue, not an invalid login; service restrictions are not bypassed.
- AI NAM catalog search, tone/model ranking, download and A2-Lite preflight can complete before USB-MIDI is connected. A validated candidate is retained for the same prompt and capture type. USB-MIDI remains mandatory before slot-10 metadata read, overwrite confirmation, NAM transfer and live preset writes.
- Gemini is the default provider. GPT/OpenAI, Gemini, Groq and OpenRouter model lists are fetched into dropdowns from the provider model-list APIs. Groq and OpenRouter credentials use the existing Android Keystore AES-GCM implementation; only the provider allow-list is extended.
- Automatic fallback order is Gemini → Groq → OpenRouter → GPT. It retries temporary capacity/rate-limit, network, timeout and server failures only; invalid credentials and malformed requests do not trigger failover. GPT + Gemini collaboration remains separate.
- OpenRouter dropdown is filtered to zero-priced text models and includes `openrouter/free`; free-tier quotas and model availability still apply.
- No modifications to manual NAM import target selection, `www/nam-transfer.js` codec/ACK/retry/readback, IR User/Third Party/Collection or MIDI mappings, or Community .32.
- Added tests for provider dropdown options, fallback order/error classification, connect-only OAuth, search-before-USB staging and secure provider namespaces.
- CI and physical-device checks remain required. Hardware acceptance must confirm TONE3000 sign-in, catalog search, a compatible download, slot-10 overwrite prompt/ACK/name readback, and audio audition on original MG-30 Gen 2.


- CI correction follow-up: fixed the Gemini request JSON object closure detected by the first regression run; rerun is required before treating this branch as build-verified.


- CI test maintenance: existing source-string regression expectations updated for the connect-only OAuth field and staged NAM preflight/transfer path. Hardware verification remains pending.


## Follow-up from Android field report — TONE3000 search, Groq JSON and compact AI selectors

- User confirmed TONE3000 account connection succeeds on the installed APK. Search still returned zero rows for AI-derived query “Fender Deluxe” using Amp + Cab / NAM A2 Lite. This is an API success-with-no-rows symptom, not an OAuth failure; field re-test is still needed after the code change.
- Catalog search no longer forces `sizes=lite` before a tone is selected. It requests selected gear + NAM + A2, tries the full AI-derived phrase, then one shorter final keyword. A2-Lite compatibility remains checked on the actual model metadata and downloaded file before pedal writes. Search diagnostics retain attempted terms, page total and rows returned.
- Groq/OpenRouter chat-completions now explicitly append “Return a valid JSON object only. The response must be JSON.” to the system message whenever `response_format: json_object` is used, including Test Groq/Test OpenRouter.
- Large provider buttons and four simultaneous model dropdowns are replaced by two compact dropdowns: provider and active model. Saved IDs for each provider remain available to the automatic fallback path; GPT + Gemini collaboration remains supported.
- No changes to original MG-30 Gen 2 A2-Lite transfer codec, slot-10-only automatic destination, manual NAM import target, NAM Library storage, IR User/Collection protocol or MIDI mappings.
- Regression tests cover the JSON instruction, compact dropdown UI, relaxed A2 catalogue search, and zero-result diagnostics. CI and hardware validation are pending.


- CI follow-up: aligned TONE3000 search parameter source formatting with the existing static regression assertion; behavior unchanged.


## Build verification — AI provider dropdown + TONE3000 catalogue search follow-up

- Source commit built: `8295f8dff2f76e75ed116080c37b4ffe4711aea0` on `feature/ai-live-tone-studio`.
- GitHub Actions run #770: success. Protocol regression suite: **451 passed, 0 failed**. Android `assembleDebug` and artifact upload: success.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `14049073273`, APK size 4,686,024 bytes; archive SHA-256 `16828044dc61fadf5e1659ec372ecc0525ea7a68ceeb63a2646dcb85ae49fda4`; APK SHA-256 `0a97f21da1538d526b68a6b7a44e0af8328fe04814b0e2f071bbe09ae3afc707`.
- Verified delivery file is an Android APK extracted from the current Actions artifact. This is a debug build, not a signed Community release.
- On-device verification is still required for Groq Test, actual TONE3000 query results, model download/preflight, slot-10 transfer ACK/name readback, and guitar audio. No hardware NAM import is claimed.


## User device test follow-up — NAM tone ID, file extraction and automatic AI provider — 2026-11-13

- Screenshot showed TONE3000 search and AI ranking succeeded: a real tone pack (“Dumble Steel (OVER 2)”) was selected. The subsequent loader rejected its numeric ID before requesting tone details. Root cause: `loadTone3000ForAI()` had a double-escaped digit regex (`/^\\\\d+$/`) that matched a literal backslash-d rather than digits. Corrected to the normal numeric regex used by `loadSelectedTone()`.
- A2 catalogue candidates are no longer rejected by the API's `size` label. Downloadable A2 candidates are tried; the existing file extractor chooses the 1,871-weight WaveNet submodel from a SlimmableContainer, or validates the native NAMB payload, then the unchanged Gen-2 transfer plan checks exact weight-byte length. This preserves required device transfer format; it does not rewrite/convert the NAM source file or change transfer codec.
- User clarification: don't describe catalog candidates as “A2-Lite” before the file has been downloaded and inspected. UI/error copy now describes A2 NAM discovery and Gen-2 preparation; actual byte-level validation remains mandatory before slot-10 metadata read or any device write.
- Screenshot showed Gemini's exact temporary error “This model is currently experiencing high demand. Spikes in demand are usually temporary.” The retry classifier previously did not recognize “high demand”; it now treats high demand/demand spike as temporary-capacity failure so checked fallback can advance.
- User requests hands-off selection of the fastest available provider/model. Default provider is now **Auto · fastest available**. It refreshes saved providers' model catalogs, performs small parallel JSON health probes (12-second cap), sorts successful providers by measured response time, chooses that provider/model for the task, caches the order for 45 seconds, and tries the next healthy providers on temporary failure. Manual Gemini/Groq/OpenRouter/GPT and GPT+Gemini modes remain available. Probe requests use a minimal status prompt and are additional small provider requests; provider usage/quotas still apply.
- Fallback remains temporary-error-only; invalid keys and malformed requests are not treated as temporary. No edits to original MG-30 Gen 2 NAM transfer codec, slot-10-only AI import destination, manual NAM import target selector, NAM Library persistence, IR User/Third Party/Collection, or MIDI mappings.
- Regression tests added for numeric tone ID validation, no early size-label rejection, high-demand fallback classification, and automatic provider/model selection. CI and physical MG-30 testing are pending.


- CI follow-up: updated the pre-existing provider-default assertion from Gemini to the newly requested Auto fastest-ready default; the initial CI run showed only this stale expectation (455/456 passed), not a runtime or syntax failure.


## User field report follow-up — Groq TPM, automatic model selection and artist-specific tone planning — 2026-11-13

- Groq reported TPM limit 8,000 versus 12,508 requested tokens. AI context is compacted to model names, parameter keys/discrete choices and current values; TPM/request-too-large errors are fallback eligible. No pedal writes occur on a rejected request.
- Model selection defaults to Auto · fastest available for each provider, including manually selected Gemini/Groq/OpenRouter/GPT. Up to three candidate models are probed with short requests; the fastest successful model is cached 45 seconds. Selecting a concrete dropdown model is an explicit manual override. Auto provider mode ranks providers using their fastest-ready model.
- Artist-specific guidance differentiates Mayer clean/edge-of-breakup, Petrucci tight high-gain, and Satriani singing saturated melodic-rock lead. These are stylistic targets, not claims about exact artist studio rigs. Prompt instructs AI to choose catalog-supported models/effects rather than repeat one generic chain.
- Compact context preserves validator schema and discrete choices. NAM transfer, slot 10, manual NAM target, IR User/Third Party/Collection and MIDI mappings are untouched. CI and hardware verification pending.

- Follow-up test maintenance: automatic-model dropdown and probe timeout assertions updated to the per-provider Auto model implementation. GPT + Gemini collaboration now also resolves the fastest ready model independently for both providers.

- CI #774 stale test expectations corrected: English summary assertion follows updated concise wording, and short-probe timeout assertion now matches row.id,10000.
