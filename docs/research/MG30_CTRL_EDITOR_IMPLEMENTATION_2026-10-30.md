# MG30 Studio CTRL / EXP Editor Implementation

Date: 2026-10-30  
Target: original NUX MG-30 Gen 2 firmware 6.0.x (not MKII)  
Branch: `android/ui-polish-pass-1`

## UI placement and scope

A new `CTRL / EXP` button is placed directly beside `Simpan ke pedal` at the top of the Tone Editor. It opens a modal editor with four sections:

1. Multi EFX CTRL.
2. External footswitch T and R contacts.
3. CTRL1 — built-in expression pedal.
4. CTRL2 — additional expression assignment.

The panel reads live controller state from the device when opened. It does not treat CTRL2 as the external footswitch. WAH model context is read from the existing WAH Signal Chain block; its two range values are exposed as MIN/MAX sliders. For other expression functions, the panel exposes the model-specific parameter choice only when the original-MG30 QuickTone table contains a known pair. An unmapped model keeps the dependent choice disabled rather than guessing an enum.

## Protocol integration

The panel reuses the existing Tone Editor MIDI queue and SysEx helpers from `www/index.html`; it does not call the Android MIDI plugin directly and does not create a second queue.

Read:
- Sends `F0 43 58 70 13 00 F7`.
- Waits for `13 02`.
- Reads SysEx offsets 6–17 into the 12-byte known controller payload.

Write:
- Sends `F0 43 58 70 13 01 [12 payload bytes] F7`.
- Waits for `13 03`.
- Sends a new `13 00) query and waits for `13 02).
- Compares all mapped payload bytes against readback. The byte at SysEx offset 13 is fixed zero in QuickTone's serializer and is ignored during comparison because the original MG-30 response can return a nonzero value there while the native parser does not restore it as state.

The UI prevents controller operations from overlapping preset/scene sync, Copy Scene, or hardware buffer reads. The existing periodic poll also pauses while the controller panel is using the MIDI connection.

## Mapped payload

| SysEx offset | Meaning | UI |
|---:|---|---|
| 6 | Multi EFX CTRL function + optional bit 0x20 | 13-item function list; conditional DLY/SCENE option |
| 7 | External footswitch T selection | QuickTone T list |
| 8 | External footswitch R selection | QuickTone R list |
| 9 | CTRL1 function | ---- / WAH / EFX / AMP / MOD / DLY / RVB |
| 10 | CTRL1 dependent choice, 0 or 1 | Original-MG30 model parameter pair |
| 11 | CTRL2 function | same seven expression categories |
| 12 | CTRL2 dependent choice, 0 or 1 | Original-MG30 model parameter pair |
| 13 | Serializer constant zero | Not user editable |
| 14–15 | CTRL1 range pair | WAH MIN / MAX |
| 16–17 | CTRL2 range pair | WAH MIN / MAX |

Multi EFX selector-7 mapping:
- DLY row 0 S.TAP ON encodes bit 0x20 set; row 1 S.TAP OFF clears the bit.
- SCENE row 0 S3 ON clears bit 0x20; row 1 S3 OFF sets it.
- This opposite polarity is implemented explicitly.

External footswitch Scene Up/Down selections preserve QuickTone's complementary T/R behavior.

## Source files changed

- `www/index.html`: button, dialog markup, MIDI bridge and mutual-exclusion guard.
- `www/ctrl-editor.js`: editor state, read/write orchestration, option mapping, ranges and readback verification.
- `www/ctrl-editor.css`: responsive panel styling.
- `.github/workflows/build-apk.yml`: enabled the active implementation branch for automatic debug APK build.

Not changed:
- `www/nam-transfer.js)
- `www/ir-transfer.js)
- `native-android/MG30MidiPlugin.java)
- NAM import and reader.
- IR User/Third Party and Collection transfer.
- Preset editor serialization, preset sync and MIDI block/parameter mappings.
- Copy Scene implementation.

No CC77 message or 0D query is sent by this panel.

## Validation and remaining hardware test

- The existing shared MIDI queue and SysEx wait helpers are reused.
- Source-level checks verified the read request, write command, ACK check, readback, reserved-byte comparison rule and busy guards.
- CI APK build for the initial integration commit `473c5f648cc6054cc9e4bd128d8fe361cb226ae7` completed successfully.
- Follow-up builds are running for the later reserved-byte and model-alias corrections. The final APK must correspond to the newest branch head before release.
- No physical MG-30 write test has been performed from the new panel yet.

Recommended first device test:
1. Connect MG-30 original Gen 2, open CTRL / EXP, and compare displayed values with QuickTone readback.
2. Change only one harmless expression dependent choice, save, and confirm ACK plus matching readback.
3. Test one T/R assignment, then inspect the hardware behavior.
4. Test Multi EFX function / DLY / SCENE only after backing up the current preset.
5. Avoid treating a successful ACK alone as proof of the physical function; the panel confirms stored bytes through readback.

Any mismatch or timeout should be captured before repeating a write. Keep NAM, IR User/Collection, MIDI mapping, preset sync and Copy Scene protected.


## Final build result — 2026-10-30

- Final source commit used by the APK: `249e6ada74444a7c6f62c79066568df8cfabc5ad`.
- GitHub Actions run: [41027171814](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41027171814) — conclusion: success.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `12964162270`.
- Extracted APK: `MG30-Studio-CTRL-Editor-debug.apk`, 4,378,432 bytes.
- APK SHA-256: `2fb982240a318ca86fdcfc85b2343a8a72c509f8d1462f99a83d9baee27169f5`.
- This confirms the Android build completed; it does not substitute for the first on-pedal read/write and physical control tests.
