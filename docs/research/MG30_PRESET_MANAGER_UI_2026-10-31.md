# MG-30 Studio Preset Manager UI

Date: 31 October 2026
Target: original NUX MG-30 Gen 2 firmware 6.0.x (not MKII)
Branch: android/ui-polish-pass-1

## User request

Replace the disorganized Preset Library page with a compact Preset Manager inspired by the hardware's own scrolling preset screen. User provided a photo of the physical MG-30 display showing 28A TT Clean Single, 28B NAM TES, 28C TT DJENTE, 28D TT TV, 29A R.ACOUSTIC, 29B MK Shim Diy.

Requested layout:
- Page title must read Preset Manager; remove the explanatory subtitle.
- Import and Export actions belong in the title/header row.
- Hardware slots must be a scrollable list of all 128 slots, showing slot label and hardware preset name, not only slot number.
- Keep the page compact and visually coherent; retain local drafts under a collapsible section.

## UI implementation

- Replaced the Preset Library page markup with a Preset Manager header, compact Import and Export buttons, selected-slot area, search, refresh button, 128-row scrolling list, sync-to-editor action, status area, compact transfer status panels, and collapsible local drafts.
- Added responsive styles in www/ui-redesign.css. The list scrolls independently and highlights the selected hardware slot; favorite slots remain visually indicated.
- Kept existing IDs used by preset Import/Export scripts and legacy slot controls, so hardware transaction entry points remain connected.
- Import/Export actions use the existing protocol paths, but are surfaced in the header. Export button has a compact fixed label.

## Hardware preset name source and behavior

- The new list is populated from a local cache in localStorage key mg30-hardware-preset-names.
- Unknown names are shown as 'Nama belum dibaca' until a scan is requested.
- User taps the refresh (↻) button to read names. This is explicit rather than automatic on page entry to avoid racing the existing automatic NAM and IR Collection metadata sync at USB connect.
- Scan reads each of the 128 stored presets using the already-used read-only stored-slot scene read: command 0B/00, program index 0..127, part 0. It waits for matching 0B/02 reply, reads preset name from bit slots 106..121, and does not send Program Change. Thus it should not switch the pedal's active preset while collecting labels.
- Cache is saved incrementally every four slots, so a timeout can be resumed without losing successfully read names.
- Search supports slot labels and preset names. Selecting a row calls existing selectHardwareSlot(program,false), preserving the existing Program Change + buffer sync behavior.
- Names are refreshed from active preset read, verified Save-to-device, and verified single-preset Import readback.

## Concurrency protection / feature preservation

- Scan sets window.MG30PresetNameScanBusy and stops hardware polling while reading; blocks preset buffer reads, slot switches, scene changes, Save, Copy Scene, Import, Export, standalone IR transfer, Collection sync/use, and NAM metadata read / NAM model transfer until complete.
- IR Collection sync/use has separate temporary window.MG30CollectionSyncBusy / window.MG30CollectionUseBusy flags.
- No MIDI parameter mapping, NAM packet data, IR User/Third Party or Collection packet payload, Import/Export record format, Save-to-device writer, scene payload, or Copy Scene protocol was intentionally changed.
- The scan is read-only and uses existing 0B/00 readback framing already employed by Save-to-device verification.

## Validation and remaining hardware test

- GitHub Actions tests/build are run for the current source. Record exact run/artifact details in this document after CI finishes.
- No physical 128-slot name-scan test has yet been performed. User should connect the original MG-30 Gen 2, open Preset Manager, tap ↻, confirm recognizable names from the pedal screen populate (especially 28A–29B), then select a row and confirm the existing slot sync still works.
- Re-test Import/Export buttons and existing NAM, IR User, Collection, Save, Copy Scene, and MIDI mapping workflows after the UI build.
- If 0B/00 stored preset name reads fail on some firmware state, keep successful cached names and use the progress/error text; do not infer missing names or fabricate model names.

Do not claim hardware validation until the user has tested the new APK on the actual pedal.

## CI / APK result (2026-10-31)

- GitHub Actions run #175 succeeded: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41210771577
- Built source commit: `b4c26c9202e435b14ce7bcf03d6ce7a6b9cda0a3`.
- Regression tests: 9 passed, 0 failed.
- Android debug build and artifact upload completed successfully.
- Artifact ID: `13046282191`, name `MG30-Studio-debug-APK`.
- APK size: 4,400,228 bytes.
- APK SHA-256: `7d96bba63a0dcdcbd36ce46e9738166d7f4a99dbf93bc0d713722c278621f64d`.
- Physical validation of the 128 stored-slot name scan remains pending on the original MG-30 Gen2 FW 6.0.x.
