# Global English UI and Android Back Fix — 2026-11-07

## Scope and baseline

- Target: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII).
- Source baseline: `fix/editor-model-caption-visibility` at `9d0cd8b6799e506d9b2a16ef0c38ad8ab5091dd6`, following verified Android Build #663 (`b989727c3bfbe7700e4e3a617cd7143056688e58`).
- This work is limited to user-interface copy, preset-selection feedback, Android Back handling, tests, and build workflow wiring.

## Changes

1. Removed the success toast emitted after selecting and reading a hardware preset. Status text remains in the existing status area; synchronization and program-change behavior are unchanged.
2. Expanded the central English translation dictionary for remaining visible NAM/WAV format instructions, accessibility labels, and Import All feedback messages. App chrome is English; user-created preset names and hardware model names remain user data and are not rewritten.
3. Replaced the temporary feedback-dialog-only Back listener with one app-wide Capacitor Back listener. It closes a non-busy dialog first, refuses to dismiss an active import/export/IR transfer dialog, and calls `App.exitApp()` when there is no dialog to dismiss.
4. Added regression assertions for the removed toast, English copy, and Android Back behavior.

## Protected areas

No changes are made to NAM transfer/protocol code, IR transfer/import paths or Collection slot handling, MIDI mappings/CC tables, USB-MIDI SysEx implementation, or signal-chain serialization. Preset slot selection continues through the existing `selectHardwareSlot` path.

## Validation

- Automated checks: `npm test` (executed by the Android Build workflow).
- Android build: `npm run android:init` followed by `./gradlew --no-daemon assembleDebug` (executed by the Android Build workflow).
- A successful CI build validates compilation and automated tests; physical Android Back-button behavior still requires verification on a handset before public release.

## Follow-up copy audit

- Extended central English dictionary coverage to dynamic IR transfer errors, Collection status labels, preset readback feedback, Export All/Single status, IR name metadata, and NAM model validation errors.
- Corrected the dynamic IR Collection error prefix handling so the translated message retains the complete original error detail.
- Added regression cases for these dynamic messages.
