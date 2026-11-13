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

## Current work status
- Branch created from the Community .32 release branch.
- Parallel-install application ID and app display name configured in the Android initializer/config.
- Build workflow branch trigger added.
- No AI feature code has been implemented yet.
- No APK build or installation test has been run yet.
- Next: inspect and verify generated Gradle applicationId, run npm tests and Android build, verify APK package ID and signing certificate, then begin AI catalog/interface-contract phase.
