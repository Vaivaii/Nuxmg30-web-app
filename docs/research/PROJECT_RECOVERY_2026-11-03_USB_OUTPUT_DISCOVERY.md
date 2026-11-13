# Project Recovery — USB Output Discovery Verified (2026-11-03)

## Project target and preservation rules
- Target hardware: original NUX MG-30 Gen 2, firmware 6.0.x. Not MG-30 MKII.
- Preserve working NAM import/transfer, custom IR User/Third Party and Collection paths, MIDI mappings/USB-MIDI framing, signal-chain operations, and preset operations.
- Do not merge the distinct IR User/Third Party and IR Collection protocol families.
- This checkpoint supplements `PROJECT_RECOVERY_2026-11-03.md`.

## Current branch and source
- Repository: `Vaivaii/Nuxmg30-web-app`
- Branch: `feature/studio-usb-reamp-loopback`
- Source commit used for Build #352: `093bad9b8ceec9a583ba3b9ff02f19a10b107354`
- Changes before this build:
  - Fixed invalid multiline string syntax in `scripts/init-android.mjs` by making plugin registration statements separate array entries.
  - Added a regression test that runs `node --check scripts/init-android.mjs`.
  - Added this feature branch to the Android APK workflow push trigger.
  - The Android USB Output Discovery implementation is read-only endpoint enumeration. It does not yet send an audio stream.

## Build #352 result
- Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41579657826
- Run ID: `41579657826`; conclusion: `success`.
- Job: Build debug APK; all steps completed successfully.
- Regression tests: 148 passed, 0 failed.
- Vite production build: passed.
- Capacitor Android project initialization/plugin registration: passed.
- Gradle: `BUILD SUCCESSFUL`, 183 actionable tasks executed.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `13204194446`, size 4,119,222 bytes; retained until 2026-11-17.
- Artifact ZIP SHA-256: `7ebac3877b96e34a5f4e8754bb28410ddcbbc30318e6dc96b2ddaa209aa3467c`.
- Extracted APK SHA-256: `7e55987f01eab8b40ca6387a2692d6a242f5de4903bd0022901cea7b64fbfef8`.
- APK archive inspection confirmed:
  - Native class `com.vaivaii.mg30studio.MG30AudioOutputPlugin` is packaged in DEX.
  - Compiled UI bundle includes `MG-30 USB Playback`, `PERIKSA USB OUT`, and `inspectOutputDevices`.
- APK compilation/package check passed. No claim is made that this APK has been installed or physically audio-tested on the user's phone.

## Field observation from user's screenshot (2026-11-03; app build not identified)
In Studio > DAW > Track Settings > USB Audio · Output Discovery, Android listed:
- `USB-Audio - NUX MG-30` as a USB device output.
- Reported sample rate: 48,000 Hz.
- Reported channel counts: 2 / 3 / 4.
- Reported encodings: 4 and 22.
Other listed output endpoints were named `2201117TY` (including the built-in speaker entry). Do not infer their exact role beyond what the UI labels show.

### Evidence boundary
This is strong confirmation that Android's audio device enumeration can see the MG-30 USB output endpoint by name and exposes its reported format capabilities. It does **not** establish that an AudioTrack stream can be opened, pinned to that endpoint, or heard from the MG-30. It also does not establish the USB input/capture route, DAW playback, Reamp, or Loopback.

## Next engineering step
1. Implement a separate, opt-in USB playback probe (do not replace or alter the existing input recorder).
2. Start with a low-level, low-amplitude test signal at 48 kHz using a conservative stereo PCM format; try routing an Android AudioTrack specifically to the enumerated NUX output device.
3. Report requested device, actual routed device, playback initialization/write errors, sample rate/channel/encoding and stop state in the UI. A fallback route to the phone speaker must be reported as failure to route to MG-30, not as success.
4. Have the user verify whether the test signal is heard from the MG-30 and which physical output carries it. Only then proceed to DAW track playback and Reamp/Loopback.
5. Keep endpoint discovery read-only and isolate new output-stream code from the established AudioRecord/input, NAM, IR, MIDI, and preset code paths.

## Safety/regression guardrails
- Use a quiet test tone or short low-level pulse, never a full-scale signal.
- Explicit stop/release path and handle USB detach/device changes.
- Do not modify QuickTone device mode or IR routing as a side effect of audio playback tests.
- Do not claim successful Reamp/Loopback based only on output-device enumeration.
