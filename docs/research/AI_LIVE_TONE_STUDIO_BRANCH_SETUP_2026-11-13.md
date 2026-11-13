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
- Rebuild and regression test verification for this refinement is pending in GitHub Actions. Physical device check of the updated visual layout is also pending.
