# MG30 Preset Import/Export feedback dialog fix — 2026-11-06

Target: original NUX MG-30 Gen 2 firmware 6.0.x (not MG-30 MKII).
Branch: `feature/all-preset-import-export`
Baseline source: Build #596, `939d281c75954bb6403b01eddad889f85fa27fe2`.

## User report

- The Export All confirmation prompt should be displayed in English.
- An Export failure dialog remained open indefinitely.
- Android Back could not dismiss the failure dialog. The shared dialog's Import-side `cancel` handler always prevented the browser dialog cancel event, including after a transfer had already failed.
- Import failure feedback must also dismiss automatically and permit Back/Escape once the operation is no longer active.

## Changes

- Rewrote only the Export All confirmation copy in `www/mg30-preset-export.js`; the description still accurately says 128 presets / 3 scenes, conditional IR waveform/curve reads, output file size, and read-only USB-MIDI/SysEx behavior.
- Export failure feedback in `www/preset-library-ui.js` retains the actual error detail and now auto-closes after 6.5 seconds.
- Import Single and Import All failure feedback in `www/mg30-preset-import.js` now use a consistent 5-second auto-close.
- Shared progress-dialog cancellation is blocked only while Import or Export is actively loading. Once a success/error/cancel result is shown, browser Escape / dialog cancel may close it.
- Added a scoped Capacitor Android `App.addListener('backButton')` handler while the shared feedback dialog is open. It dismisses terminal feedback immediately, leaves active transfer dialogs protected, and unregisters when the dialog closes so ordinary app Back handling remains unchanged.
- Added regression tests for the English confirmation, failure auto-close timers, terminal-state dismissibility, and the scoped Android Back listener.

## Protected behavior

No transfer or device protocol was changed. No changes to Import All frame order/plan, Export All readback/cache/pacing, Export Single, NAM, User/Third Party IR, IR Collection 6A/6B/6C, MIDI/CC mappings, USB-MIDI selection, preset synchronization, Save-to-device, Copy Scene, Signal Chain, or CTRL/EXP.

## Validation

## Build #598 verification

- Final source commit: `cb556f014ef2d9e27c5ef8b5d87a45eacff0fa78` on `feature/all-preset-import-export`.
- GitHub Actions run #598: `42083190120`, conclusion **success**: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42083190120
- Regression tests: **272 passed, 0 failed**.
- Android initializer syntax check and Capacitor Android/plugin generation passed.
- Gradle `assembleDebug`: **success**.
- Artifact ID: `13441402404`; ZIP size **4,214,691 bytes**; ZIP SHA-256 `4c6e6886ed02b4b640840e2e224be29ab78e6efc39ccbb9f63c06d07a9f5cd5a`.
- Extracted APK size **4,592,340 bytes**; APK SHA-256 `f9b6f76e2630bf4f27aed6ff073d985c30427252dbe7f564b057a246691554e6`.
- ZIP and APK integrity checks passed. Packaged JavaScript was inspected: it contains the English Export All prompt, the Android `backButton` listener, 6.5-second Export failure timeout, and 5-second Import failure timeout.
- The first CI attempt (#597) stopped at the regression-test step because of an invalid regular-expression literal in the new test file. The test was rewritten with literal string assertions; the final Build #598 includes that correction and passed all 272 tests.

## Remaining physical-device confirmation

Install the Build #598 APK on the original MG-30 Gen2 firmware 6.0.x and confirm:
1. Export All confirmation appears in English.
2. On an Export failure, the error dialog closes automatically after about 6.5 seconds; Android Back closes it immediately.
3. On Import Single / Import All failure, the result dialog closes automatically after about 5 seconds; Android Back closes it immediately.
4. Pressing Android Back during an active Import/Export does not dismiss the active-transfer dialog or terminate the app.
5. After a result dialog closes, ordinary Android Back behavior on the rest of the app remains unchanged.

No MG-30 transfer sequence or physical preset/IR data was changed by this UI fix.
