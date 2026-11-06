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


## Build #627 — shared 0–100 slider range (2026-11-06)

- Source commit: `f2e8c6b4695873dfaae3be3cb14de6e96bde5456`.
- GitHub Actions run #627: [42172104155](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42172104155) — **completed / success**.
- Protocol regression tests: **285 passed, 0 failed**.
- Android initializer syntax validation passed.
- Capacitor Android generation and USB audio plugin installation passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL**.
- APK artifact: `MG30-Studio-debug-APK`, artifact ID `13481806990`.
- Artifact ZIP: 4,217,600 bytes; SHA-256 `9fa35836cbed355ef3e880bb1bb99f9232aea436fd13989ffe6bb0bfe314b269`.
- Extracted APK: `app-debug.apk`, 4,596,160 bytes; SHA-256 `505a88ad2d6ff8ce41677e661a4c4fb40fa4bb76a49cc76e1e5de0dc2ab6962`.
- ZIP integrity check passed; archive contains exactly one `app-debug.apk`. APK file type recognized as Android package. Packaged web assets were inspected: both dynamically-created sliders show `min=0`, `max=100`, `step=1`, `value=50`; readouts show `50 / 100` and update against `/ 100`. The packaged 46-byte hardware frame has raw 50 at offsets `0x1D` and `0x1F`. The packaged sender clamps direct raw slider values to 0–100.
- Physical-device test of the new Playback Level default/maximum and Record Level cap remains required. CI/packaged APK inspection does not emulate the pedal's analog level response.


## Playback Level default/range correction after Build #627 feedback (2026-11-06)

- User corrected the previous assumption: Playback Level default must be 100; Record Level remains correct at default 50 / maximum 100.
- Playback UI now uses min 0, max 150, step 1, default 100, with a /150 readout. Record UI remains 0–100 / default 50 / /100.
- The captured 14/01 message uses 7-bit MIDI data bytes. Playback UI values 0–100 map directly to raw 0–100; UI values 100–150 map to raw 100–127. UI 100 therefore sends the captured raw default 100, and UI 150 sends raw 127. This is an app UI scaling convention, not a dB calibration claim.
- The full 46-byte frame template retains Record raw 50 at offset 0x1D and Playback raw 100 at offset 0x1F.
- Playback writes only offset 0x1F; Record writes only offset 0x1D; Loopback offset 0x20, complete-frame validation, serialized write queue, and 14/03 acknowledgement remain unchanged.
- Added regression coverage for the asymmetric ranges and Playback conversion endpoints. Hardware audible/dB response still requires confirmation on original MG-30 Gen 2 firmware 6.0.x.
- No NAM, IR User/Third Party/Collection, preset, MIDI/CC mapping, Signal Chain, or DAW audio protocol code changed.


## Build #628 — Playback Level default 100 / maximum 150 (2026-11-06)

- Source commit: `00e603ee074ac921e34d4eed08490885ce3a042c`.
- GitHub Actions run #628: [42173992569](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42173992569) — **completed / success**.
- Protocol regression tests: **286 passed, 0 failed**.
- Android initializer syntax validation passed.
- Capacitor Android project generation and USB audio plugin installation passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL in 1m 31s**.
- Artifact: `MG30-Studio-debug-APK`, ID `13482471528`.
- Artifact ZIP: 4,217,762 bytes; SHA-256 `b64dadbcb5a628334917e4e25aed31220402488df512fb0bbafb54d7249ecedf`.
- Extracted APK: `app-debug.apk`, 4,596,328 bytes; SHA-256 `c757d6222fb5dd17ad75e7d4a6a3818db908bd26ffc90486d01ca92a763e0156`.
- ZIP integrity passed. The packaged APK was inspected: Record slider 0–100/default 50/readout /100; Playback slider 0–150/default 100/readout /150; full 46-byte `14/01` template retains raw 50 at offset `0x1D` and raw 100 at `0x1F`; Playback uses the 7-bit mapping UI 100–150 → raw 100–127; `14/03` ACK handling remains packaged.
- The APK passed package/file and embedded asset checks. Physical-device output-level verification is still required; this CI inspection cannot verify the analog dB response.


## Physical Playback Level report and protocol re-evaluation (after Build #628)

- User installed/tested Build #628 and reported that moving Playback Level to UI 150 still changes the MG-30 USB Playback Level only to approximately +3 dB.
- This disproves the prior assumption that UI 150 / raw 127 has already been proven to represent the full hardware range. Do not declare +3 dB the hardware maximum.
- Reinspection of `playlevel.pcapng`: the complete 14/01 frames change the byte at absolute frame offset `0x1F` through `0x68`, `0x70`, `0x76`, `0x7A` (104, 112, 118, 122). The immediately preceding byte at offset `0x1E` remains `0x00` in the supplied samples. This capture set never exercises a Playback value greater than 127.
- Reinspection of `reclevel.pcapng`: Record Level changes at offset `0x1D` through `0x34`, `0x37`, `0x3A`, `0x3C`; the surrounding fields remain unchanged. This matches the user's separate physical confirmation that Record 50→100 reaches +12 dB.
- New hypothesis to validate, not implementation evidence: Playback may use a 14-bit value split across SysEx data bytes `0x1E` (MSB/high 7 bits) and `0x1F` (LSB/low 7 bits). Because all supplied Playback samples stay below 128, the high byte remains zero and the existing captures cannot distinguish a 14-bit field from a single-byte field.
- A standard MG-30 owner manual search result documents USB Audio Settings REC Level and PLAY Level as `-12 / +12 dB` (manual is not a firmware-6.0.x-specific protocol appendix). Therefore +3 dB at the app endpoint is a discrepancy to investigate, not an established device ceiling.
- Build #628's current mapping remains a provisional UI convention: UI 0–100 -> raw 0–100; UI 100–150 -> raw 100–127 at offset `0x1F`. Do not extend or change it blindly.
- Required next evidence: a QuickTone 2.6.7.16 USB capture at Playback Level above 127 (ideally the UI maximum), recording the displayed QuickTone value and MG-30 dB readout, while keeping all other settings fixed. Compare offsets `0x1E` and `0x1F`. If both bytes change as a 14-bit pair, update only Playback encoding and tests; otherwise examine the device's returned state/display path before changing the sender.
- No application source changes made in this re-evaluation. Preserve Record Level's confirmed implementation, Loopback, ACK queue, NAM, User/Third Party IR, Collection IR, preset, Signal Chain, and all MIDI mappings.


## User confirmation: Playback Level hardware has +12 dB maximum; Build #628 reaches only +3 dB

- User clarified that the approximately +3 dB result is read on the MG-30 device itself, while the device's actual PLAY LEVEL maximum is +12 dB. Therefore +3 dB is not the hardware ceiling; Build #628's present Playback representation/wire value is insufficient.
- This increases confidence in investigating Playback as a 14-bit / two-7-bit-byte value, but it does not yet prove the parameter encoding or byte order.
- Re-decoded the supplied USBPcap captures directly:
  - `playlevel.pcapng`: five host 14/01 frames; four unique states. At frame offsets `0x1E/0x1F`, observed pairs are `00/68`, `00/70`, `00/76`, `00/7A` (decimal low-byte samples 104, 112, 118, 122). Record offset `0x1D` remains `0x3C`.
  - `reclevel.pcapng`: five host 14/01 frames; four unique states. Record offset `0x1D` changes `0x34`, `0x37`, `0x3A`, `0x3C`; adjacent offsets `0x1E/0x1F` remain `00/64`.
- Because every captured Playback sample has `0x1E=0`, the old captures cannot prove whether `0x1E/0x1F` are a 14-bit pair, nor determine the order/packing. A low-byte-first interpretation is plausible because the changing value sits at `0x1F` and the adjacent `0x1E` could be the upper seven bits; this remains a hypothesis, not an instruction to implement.
- Build #628 currently sends only one raw 7-bit Playback value to offset `0x1F`, and leaves `0x1E=0`. The user's +3 dB device observation is consistent with a truncated/incorrect field width, but does not by itself prove the 14-bit theory.
- Record Level remains confirmed and must not change: UI 0–100, default 50, writes offset `0x1D`; user reports this reaches +12 dB.
- Required discriminating capture: in QuickTone 2.6.7.16, hold all other hardware state fixed and set device PLAY LEVEL at its displayed +12 dB maximum; capture USB OUT and IN for the corresponding `14/01` request and `14/03` ACK. Ideally include one intermediate point as well. Check whether offset `0x1E` becomes nonzero and whether `0x1F` wraps/changes, then infer byte order and scale only from those captured values.
- No application source changed in this investigation. Do not send speculative 14-bit values, and do not touch Record Level, Loopback, NAM, IR User/Third Party, IR Collection, preset, MIDI mapping, Signal Chain, or USB-MIDI transport.
