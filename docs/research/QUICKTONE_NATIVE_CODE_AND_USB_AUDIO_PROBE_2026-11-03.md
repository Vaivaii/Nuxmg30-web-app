# QuickTone Native Binary Analysis and MG-30 USB Output Probe — 2026-11-03

## Scope and hardware target

This analysis is for the **original NUX MG-30 Gen 2, firmware 6.0.x**. It is not an MG-30 MKII analysis.

Preservation constraints:
- Do not replace or disturb the working NAM transfer implementation.
- Preserve the separate custom IR User / Third Party and IR Collection workflows.
- Preserve known-good USB-MIDI framing, MIDI mappings, preset operations, and Signal Chain operations.
- Do not interpret Windows QuickTone's local Collection folder names as proof of pedal-side slot addresses or SysEx protocol semantics.

## Current application source and CI

Repository: `Vaivaii/Nuxmg30-web-app`  
Branch: `feature/studio-usb-reamp-loopback`

Source commit used for Build #354:
`ff6ee4b7d7eb2727d2dd6ae99780a2c5fda0c750`

Build #354:
- Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41581617961
- Run ID: `41581617961`; conclusion: `success`.
- Regression tests: **149 passed, 0 failed**.
- Vite production build: passed.
- Android initializer syntax and Capacitor plugin registration: passed.
- Gradle: `BUILD SUCCESSFUL in 1m 36s`.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `13206097872`.
- Artifact ZIP size: 4,123,412 bytes.
- Artifact ZIP SHA-256: `f0a41e4fc6cd6fc1f55a6ca8baf7ad5c9458152c9376f8ef00f5cbb841ff6f34`.
- Extracted APK size: 4,501,228 bytes.
- Extracted APK SHA-256: `ee2cdf8a112043f24e81dde594cdbeb78c7d646940e2b486381f265e63866238`.
- The extracted APK contains the native `MG30AudioOutputPlugin` and the compiled UI for `OUTPUT ROUTING TEST`; DEX inspection located the playback methods in `classes9.dex`.
- This confirms the artifact was built and packaged. It does not, by itself, establish which build was installed on the user's phone or that the test tone was acoustically heard.

Build #353 failed because one regression test searched for a comment string that did not match the code wording. The test was corrected in commit `ff6ee4b7...`; Build #354 then passed all 149 tests.

## User's MG-30 USB output test observation

The user's screenshot shows:
- Selected endpoint name: `USB-Audio - NUX MG-30`.
- Android-reported endpoint ID: `129438`.
- Sample rate: `48000 Hz`.
- Reported channel counts: `2 / 3 / 4`.
- Reported encodings: `4, 22`.
- UI result: `Nada tes 440 Hz level rendah berhasil ditulis saat AudioTrack ter-route to the MG-30`.
- Reported actual route: `USB-Audio - NUX MG-30 (ID 129438)`.

Interpretation:
1. This is stronger than endpoint discovery alone. The UI says the application successfully started a stream, verified `AudioTrack.getRoutedDevice()` against the selected MG-30 endpoint ID, and wrote the 440 Hz test signal while the route matched.
2. The test is a short 1.2-second, stereo, low-amplitude signal (amplitude 0.025, approximately -32 dBFS), at 48 kHz using PCM_FLOAT.
3. The Android route result is evidence that the stream is routed to the MG-30 device endpoint from Android's perspective.
4. **Acoustic confirmation is still pending**: the screenshot asks the user to listen. It does not establish whether the tone was actually audible at the MG-30's physical output.
5. This is not yet evidence of DAW playback, USB input capture, simultaneous full-duplex operation, Reamp, or Loopback.

## Playback-probe implementation and guardrails

Files on the source commit:
- `native-android/MG30AudioOutputPlugin.java`
- `www/studio-usb-output.js`
- `tests/studio-usb-output.test.js`

Implementation:
- Output-device enumeration remains a separate Android plugin from `MG30AudioPlugin`, which owns the established AudioRecord/input recorder path.
- `playTestTone({ deviceId })` resolves the selected output endpoint again and checks that it is still a USB endpoint whose reported product name matches NUX / MG-30.
- It checks the endpoint's reported 48 kHz sample rate and stereo channel count before trying the test.
- It creates an AudioTrack configured for 48 kHz, stereo PCM_FLOAT.
- It calls `setPreferredDevice(target)`, starts an initially empty stream, then checks `getRoutedDevice()` before writing non-zero samples.
- It writes the sine-wave samples only when the actual routed device ID equals the requested MG-30 ID. The route is checked again during playback; a route change stops the write loop.
- The AudioTrack is stopped/released in the cleanup path.
- The UI reports the requested and actual endpoint and does not count a phone-speaker fallback as MG-30 success.

Limitations still to test on the physical device:
- User must confirm audible output and identify which physical MG-30 output carries it.
- Verify behavior on unplug/replug and route changes.
- Verify whether Android's exposed output channel configuration maps as expected to the MG-30 USB playback channels.
- Only after those checks should implementation advance to DAW backing-track output and full-duplex Reamp / Loopback.

## QuickTone V2.6.7.16 file supplied by the user

Uploaded archive: `NUX_QuickTone_V2.6.7.16_Windows.zip`

- ZIP SHA-256: `95990e1e57079439c89b13e16d19f17c1769ec0c60336b546bc7f43b4ee91f2a`.
- The archive contains one file: `QuickTone.exe` (190,296,504 bytes).
- EXE SHA-256: `0d64728f8f0e013114c228c8e6f9a8f3c648a5f82ff54ff03081c930ebd771d6`.
- Binary format: PE32, Intel 386, Windows GUI, MSVC-linked native binary; no CLR/.NET runtime header was found.
- Embedded product/vendor/version strings include `Cherub Technology`, `NUX MG-30`, and `2.6.7.16`.

Important qualification: the upload contains a compiled EXE, not the original C/C++ source files. Findings below are from static binary inspection and disassembly. They are not a source-code listing and should be treated as implementation evidence with the corresponding static-analysis limitations.

### A. QuickTone's device communication API

The PE import table contains `WINMM.dll` and these WinMM MIDI functions:
- Output: `midiOutGetNumDevs`, `midiOutGetDevCapsW`, `midiOutOpen`, `midiOutClose`, `midiOutPrepareHeader`, `midiOutUnprepareHeader`, `midiOutShortMsg`, `midiOutLongMsg`, `midiOutMessage`.
- Input: `midiInGetNumDevs`, `midiInGetDevCapsW`, `midiInOpen`, `midiInClose`, `midiInPrepareHeader`, `midiInAddBuffer`, `midiInMessage`, `midiInReset`, `midiInStop`, `midiInStart`, `midiInUnprepareHeader`.

Static inspection of relevant functions found:
- Around VA `0x893E48`: opens a numbered MIDI output device using `midiOutOpen`; the surrounding routine retries when the system reports the device is allocated.
- Around VA `0x89C050–0x89C160`: MIDI output sender distinguishes short packets from long SysEx messages.
- Short messages use `midiOutShortMsg`; when MIDI reports not-ready, the sender retries (up to 50 attempts in the inspected loop).
- Long SysEx messages follow the WinMM lifecycle: populate a `MIDIHDR`, call `midiOutPrepareHeader`, call `midiOutLongMsg`, wait for the `MHDR_DONE` completion flag, then call `midiOutUnprepareHeader` with retry while the system says the header is still playing.
- Around VA `0x898B86`: opens MIDI input with a callback function (`midiInOpen`, `CALLBACK_FUNCTION`).
- Around VA `0x89CB46–0x89CC16`: prepares and queues 32 input buffers, each with 256-byte payload capacity, using `midiInPrepareHeader` and `midiInAddBuffer`; the input stream is started with `midiInStart`.
- Around VA `0x899B20`: callback processing distinguishes `MIM_DATA` and `MIM_LONGDATA`, handles incoming MIDI/SysEx data and returns buffers to the queue.

Engineering implication:
- QuickTone does not treat a SysEx send as a fire-and-forget write. Its Windows implementation has a prepare → send → wait-for-completion → unprepare lifecycle, while inbound data is callback-driven with pre-queued receive buffers.
- This is a useful **behavioral architecture reference** for MG30 Studio's native MIDI transport and ACK handling. Do not port WinMM APIs or Windows structures literally to Android; implement the equivalent lifecycle with Android USB-MIDI APIs and the app's existing native bridge.
- The presence of `WINMM.dll` is direct static evidence for the MIDI API imports. The absence of explicit WinUSB/libusb/HID imports in the normal import table does not rule out runtime dynamic loading or code inside dependencies.

### B. QuickTone's MG-30 Collection local storage clues

Strings in the original MG-30 model block include:
- `MG30AllPatch.mg30patch`
- `collection ir index:`
- `NUX/MG30/IRCollection`
- `temp.wav`
- `QuickTone Config`
- `NUX/MG30`
- `Save As IR File`
- `COLLECTION EXPORT`
- `Import To Device`
- `Export To Device`

A separate model-specific block contains:
- `MG30AllPatch.mg30mk2patch`
- `NUX/MG30MK2/IRCollection`
- `NUX/MG30MK2`

This is direct binary evidence that QuickTone keeps distinct local model-specific storage/configuration paths for MG-30 and MG-30MK2. For this project, use the original MG-30 names/paths as the relevant reference. Never infer that the MK2 path applies to the original Gen 2 MG-30.

A disassembled routine referencing the original `NUX/MG30/IRCollection` path constructs a temporary `temp.wav` file and writes a RIFF/WAVE structure. The sample loop processes `0x800` (2,048) samples from an internal float buffer, scales and clamps to signed 24-bit range (`-0x800000` through `+0x7fffff`), and emits three bytes per sample. This supports the conclusion that this particular local temporary WAV writer produces 2,048-sample signed PCM24 data.

**Do not overinterpret this finding:** it establishes a local temporary-file routine associated with the Collection path. It does not prove that `temp.wav` is the exact USB transfer payload, that 2,048 samples equal the final pedal slot data, or that the folder name exposes the pedal's internal slot address. The string `collection ir index:` is evidence of a stored Collection index field, but its wire/protocol meaning is not decoded here.

### C. Relevance to the existing IR captures

The supplied capture analysis remains the primary evidence for pedal communication:

**User / Third Party path**
- Waveform: `10 01`, 64 frames.
- Name: `09 01`, 1 frame.
- Curve: `11 01`, 10 frames.
- Replies: `10 03`, `09 03`, `11 03`.

**Collection path**
- Waveform: `6A 01`, 64 frames.
- Name: `6C 01`, 1 frame.
- Curve: `6B 01`, 10 frames.
- Replies: `6A 03`, `6C 03`, `6B 03`.

Keep these command families separate. The capture report shows matching high-level phase counts but substantial waveform and curve payload differences between User and Collection captures. The displayed name and parameter value are not enough to conclude the payloads are identical or that the workflows have the same destination.

The second IR capture report independently validates the offline User builder against another capture:
- 64/64 waveform frames byte-identical.
- 1/1 name frame byte-identical.
- 600/600 meaningful curve values identical.
- The final curve frame has 40 additional words beyond the 600 meaningful values; zero-fill behavior remains a separate physical-pedal acceptance question.
- Transfer parameter values differ between captures; their semantics remain unconfirmed and must not be treated as a hardcoded physical slot number.

QuickTone's local Collection path and the User/Collection SysEx capture families are complementary evidence, not substitutes. A Windows local folder or temporary WAV is not itself a decoded pedal-side protocol transaction.

## Next controlled tests

1. Obtain the user's audible confirmation of the 440 Hz test tone from the MG-30 and identify the physical output path used.
2. If audible, make a separate test for the actual Android/DAW backing-track stream. Keep it isolated from the recorder and MIDI control path.
3. Establish full-duplex behavior before claiming Reamp or Loopback. Test playback and input capture together, report each actual Android route/device, and verify the signal recorded from the pedal.
4. In parallel, reverse-engineer QuickTone's model-specific Collection routines further, especially how `collection ir index:`, the local `.bin` data, and the MIDI transaction connect. Correlate disassembly with a fresh, focused Collection capture rather than assuming a local path is the pedal slot.
5. Preserve working NAM, User/Third Party import, Collection import, MIDI mapping, presets, and Signal Chain operations throughout.

## Evidence files

- `NUX_QuickTone_V2.6.7.16_Windows.zip` — supplied QuickTone binary.
- `MG30_IR_User_vs_Collection_Capture_Analysis.md` — User/Third Party versus Collection command-family comparison.
- `MG30_IR_Second_Capture_Validation.md` — independent validation of the offline User IR waveform/name/curve builder.
- `PROJECT_RECOVERY_2026-11-03_USB_OUTPUT_DISCOVERY.md` — previous USB output discovery checkpoint.
