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
- GitHub Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43381833858 (success, 2026-11-13).
- Automated regression suite: 417 passed, 0 failed.
- Capacitor Android initialization: passed.
- Gradle `assembleDebug`: passed.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `14016657843`, 4,280,565-byte ZIP.
- APK: `MG30-Studio-AI-debug.apk`, 4,658,284 bytes, SHA-256 `bc0f92e69df7e8b42b373ef54475fe492061285210431dc926aa201ee30c00d5`.
- APK Android manifest package verified as `com.vaivaii.mg30studio.ai`.
- APK signing block v2 present; signer certificate subject is `C=US, O=Android, CN=Android Debug`, SHA-256 fingerprint `9ef79cc2eab0cf88074ce2c6e5d0f0a9bea43b00aa867604d826ce6e75801976`. This differs from the Community release signing identity. It is a CI debug certificate; future CI builds may use a newly generated debug certificate, so seamless in-place updates between AI debug builds are not guaranteed unless a persistent dedicated AI keystore is configured.
- The APK has been built and its package/signing metadata inspected. Physical installation on the user's phone and physical MG-30 hardware regression have not been performed here.
- Next: begin AI catalog/interface-contract phase without modifying verified device communication paths.
