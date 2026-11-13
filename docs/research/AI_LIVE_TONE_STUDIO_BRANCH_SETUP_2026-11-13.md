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
