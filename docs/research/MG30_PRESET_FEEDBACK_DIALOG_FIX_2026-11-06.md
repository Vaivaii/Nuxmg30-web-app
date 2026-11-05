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

- Source-level regression tests and GitHub Actions result: pending for the commit that adds this change.
- No physical pedal operation is required to validate dialog dismissal; actual Android Back behavior still needs a brief handset confirmation after installation.
