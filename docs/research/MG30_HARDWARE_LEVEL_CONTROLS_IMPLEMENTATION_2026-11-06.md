# MG-30 Studio — Hardware Level Controls Implementation

**Target:** Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-hardware-level-controls`  
**Date:** 2026-11-06

## Implementation

The Track Settings panel now exposes three active controls:
- USB Loopback checkbox
- Record Level slider
- Playback Level slider

The UI calls the existing `window.setLoopback`, `window.setRecLevel`, and `window.setPlayLevel` bridge functions. It reports success only after receiving the matching device acknowledgement, and reports errors in the panel status line.

## Protocol basis

The four supplied USBPcap captures were decoded into complete SysEx messages. Host writes are 46 bytes:

```
F0 43 58 70 14 01 ... F7
```

The matching device response is 15 bytes:

```
F0 43 58 70 14 03 00 00 00 00 00 00 00 00 F7
```

The implementation uses the complete captured 46-byte template and modifies only the target field:
- Loopback: offset `0x20`; capture order shows `0x11` then `0x01` (ON then OFF).
- Record Level: offset `0x1D`; raw samples `0x34, 0x37, 0x3A, 0x3C`.
- Playback Level: offset `0x1F`; raw samples `0x68, 0x70, 0x76, 0x7A`.

All other frame bytes are preserved. Writes are serialized through a dedicated hardware-write queue and each write waits for the `14 03` acknowledgement. The USB-MIDI transport still uses the app's existing MIDI send queue.

## Slider scaling qualification

The UI slider uses a 0–100 normalized value. The wire conversion maps that normalized value linearly across the lowest and highest raw values observed in the supplied capture samples. The on-screen explanatory warning note has been removed; ACK/failure feedback is sent to the existing visually hidden DAW live-status region:
- Record Level: `0x34..0x3C`
- Playback Level: `0x68..0x7A`

**Important:** these captures show representative slider values, not a proven physical minimum/maximum sweep. Therefore this mapping is an initial usable interpolation across the observed span, not a verified full hardware range or dB calibration. Confirm actual audible range on the physical MG-30 before treating endpoints as absolute min/max.

## Safety boundaries

- No NAM transfer code was changed.
- No IR User/Third Party/Collection transfer code was changed.
- No MIDI CC mapping was changed.
- The implementation does not issue any write until the user operates one of the controls.
- The code keeps the complete known 14/01 frame and edits only one captured field per control.

## Validation

Automated regression test: `tests/studio-hardware-level-controls.test.js`.
Android APK build is run by GitHub Actions on this branch. Physical device acknowledgement and audible level response still require testing with the user's MG-30 connected; CI cannot emulate the pedal.


## Follow-up: sliders and UI cleanup (2026-11-06)

- User confirmed USB Loopback works on the physical MG-30. Its existing wire value mapping (`0x11` ON / `0x01` OFF) was preserved.
- Record Level and Playback Level remain separate writes in the same complete 46-byte frame:
  - Record Level edits only offset `0x1D`, mapping the 0–100 UI slider linearly over observed raw values `0x34..0x3C`.
  - Playback Level edits only offset `0x1F`, mapping the 0–100 UI slider linearly over observed raw values `0x68..0x7A`.
- The frame-state copy preserves the most recent Loopback and other slider value in subsequent writes; writes remain serialized and wait for `14 03` ACK.
- Removed the visible amber/red protocol explanation box from Track Settings. ACK/error feedback now goes to the existing visually hidden `dawStatus` live region.
- Set slider step to 1; input changes are debounced by 220 ms so dragging sends the final position instead of flooding the MIDI queue.
- CI run: [42167226773](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42167226773) — **283 tests passed, 0 failed; Android project generation and Gradle APK build succeeded**.
- Built artifact: `MG30-Studio-debug-APK`, run artifact ID `13479985711`.
- APK SHA-256: `ce3842a3d26b15de1c6b32d9a2f76bb448a199604a2d01e09f2b57a4025e81d0`.
- The slider values and audible response still need confirmation on the physical MG-30. The raw samples establish the edited bytes and observed values, but not a dB calibration or proven full hardware range.


## Slider calibration correction after physical test report (2026-11-06)

The previous app build still did not move the physical sliders. Reinspection of the raw packet bytes showed a flaw in the previous application mapping: the code treated the smallest/largest values seen in the short capture as if they were the UI slider endpoints, interpolating 0–100 to `0x34..0x3C` and `0x68..0x7A`. The captures do not establish those endpoints.

The QuickTone baseline frame itself stores Record Level `0x32` (decimal 50) at offset `0x1D` and Playback Level `0x64` (decimal 100) at offset `0x1F`. The captures then show the fields carrying values such as Record `0x34/0x37/0x3A/0x3C` and Playback `0x68/0x70/0x76/0x7A`. These match direct raw numeric values rather than the previous invented interpolation.

**Correction:** the UI sliders now expose the raw 7-bit SysEx data-byte domain `0..127` and send the chosen integer unchanged:
- Record Level: offset `0x1D`, default raw `50 (0x32)`.
- Playback Level: offset `0x1F`, default raw `100 (0x64)`.

Loopback remains unchanged at offset `0x20` (`0x11` ON / `0x01` OFF). The full 46-byte frame, serialized write queue, and `14/03` ACK wait are also unchanged. The visible warning note remains removed.

This fixes the previously unsupported slider scaling assumption. The full physical minimum/maximum semantics and dB calibration are still not established from the available captures; the device must be tested with the new raw-value UI.


## Raw slider build validation (2026-11-06)

- CI run: [42170109676](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42170109676) — **284 tests passed, 0 failed**; Android project generation and Gradle APK build succeeded.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `13480737550`.
- APK copied from the verified artifact to `MG30-Studio-Raw-Level-Slider-Build.apk`.
- SHA-256: `5c7356ca5a1969f650c6e485146de34ef905d35ee3e26e5f0a138fc076c4f33d`.
- Physical test remains required. This build changes slider encoding based on the QuickTone baseline and capture raw values; no code can confirm the analog/digital level response without the MG-30 connected.


## User physical install feedback and shared 0–100 slider correction (2026-11-06)

- User confirmed Build #626 has been installed on the Android phone and supplied a Track Settings screenshot.
- The installed UI showed Record Level at 100/127 and Playback Level at 127/127. User reports Record Level reaches the device's +12 dB ceiling by raw 100, so exposing values through 127 is excessive for that control.
- Playback Level at raw 127 produced only about +3 dB on the user's device. User's working hypothesis is that its default should also be raw 50, with maximum 100. This Playback Level endpoint/default is a user-directed calibration target and still requires another physical check; it is not claimed as a newly proven QuickTone factory default.
- UI correction requested and applied: both sliders now use min 0, max 100, step 1, default 50, and readouts use `/ 100`.
- The wire conversion now clamps the directly-written raw 7-bit value to 0–100. No interpolation/scaling curve has been introduced.
- The complete 46-byte `14/01` frame template now starts both Record and Playback Level at raw 50, matching the requested UI baseline. This intentionally supersedes the earlier captured-frame Playback baseline of raw 100 for the app's retained state template; physical response after this change must be checked.
- Preserved: Record offset `0x1D`, Playback offset `0x1F`, Loopback offset `0x20` and its `0x11` ON / `0x01` OFF mapping, complete-frame validation, serialized hardware-write queue, and matching `14/03` ACK handling.
- No NAM, IR User/Third Party/Collection, preset, signal-chain, USB-MIDI transport, or unrelated MIDI/CC mapping code was changed.
- Added regression coverage for both slider bounds/defaults, dynamic readouts, and the retained frame-template bytes.
- Validation on this commit is pending GitHub Actions. User should physically test Record Level and Playback Level independently on original MG-30 Gen 2 firmware 6.0.x; compare default raw 50 and maximum raw 100, and report actual level/dB response.
