# MG-30 Studio — USB Reamp / Loopback engineering log
Date: 3 November 2026

## Target and safety boundary

- Hardware target: original NUX MG-30 Gen 2, firmware 6.0.x. This work does not target MG-30 MKII.
- Work branch: `feature/studio-usb-reamp-loopback`.
- Parent branch: `feature/studio-mockup-alignment-undo`.
- Keep the existing MG-30 USB AudioRecord capture route intact.
- Do not change NAM transfer, custom IR / Third Party / IR Collection import, USB-MIDI framing, MIDI mappings, preset transfer, Editor, Signal Chain, CTRL/EXP, or Device settings as part of this work.
- Do not infer QuickTone routing commands or SysEx bytes from MG-300 or MG-30 MKII documentation.

## Baseline confirmed from source

- `native-android/MG30AudioPlugin.java` currently owns the validated USB input selection, AudioRecord route verification and WAV capture path.
- Studio playback currently uses the Web Audio engine. There is no native Android USB playback writer in the current recorder plugin.
- The existing input plugin is intentionally not modified in the first output-discovery checkpoint.

## Phase 1 implemented on this branch

- Added an isolated Capacitor plugin, `MG30AudioOutputPlugin`, to enumerate Android playback endpoints using `AudioManager.GET_DEVICES_OUTPUTS`.
- Reports device IDs/names/types, USB endpoint classification, advertised sample rates, channel counts and (where Android exposes them) PCM encodings.
- Added a compact USB output discovery panel to Studio > DAW > Track Settings.
- Registered and copied the output plugin during Android initialization.
- Added source-level regression tests covering endpoint enumeration, plugin registration, UI exposure and isolation from the existing AudioRecord recorder.

## Explicit limits of this checkpoint

This is endpoint discovery only. It does **not** yet:
- instantiate AudioTrack / AAudio / Oboe;
- send a DI WAV to the MG-30;
- capture a simultaneous processed return;
- verify 48 kHz / 24-bit full-duplex operation, buffer drift, latency or dropouts;
- switch MG-30 NORMAL / USB LOOPBACK / REAMP / DRY OUT routing;
- claim a completed Reamp or Loopback function.

Endpoint enumeration is advisory. A USB output may be visible to Android while a real stream still fails to route or negotiate a compatible format.

## Next engineering gates

1. On the target phone and original MG-30 Gen 2 firmware 6.0.x, inspect the USB output endpoint list and record the exact product name, device type, rates, channel counts and formats.
2. Add an explicit, user-triggered, low-level playback route test. Verify AudioTrack preferred-device routing and `getRoutedDevice()`; do not auto-play a test signal on app launch.
3. Only after output routing is confirmed, implement a controlled DI-file playback path with a stop/cancel lifecycle and format negotiation.
4. Add simultaneous output + existing USB input capture without weakening the current input route verification; measure latency, drift and underruns.
5. Reverse engineer MG-30 Gen 2 firmware 6.0.x routing-mode selection separately. Confirm semantics from captures/device behavior before adding controls.
6. Run Node tests, Vite, Capacitor Android generation, Gradle build and packaged APK inspection. Then physically validate on the user's phone and hardware.

## Validation status

- Source tests are added in this checkpoint.
- Physical USB output enumeration has not yet been tested on the user's phone.
- No APK is declared device-verified by this document.

## MG-30-specific endpoint classification

The native result separates any USB playback endpoint (`usbOutputFound`) from a USB endpoint whose product name contains `MG-30` or `NUX` (`mg30OutputFound`). A generic USB DAC is therefore not reported as a confirmed MG-30 endpoint. This name match is still only an identification hint; device behavior must be verified physically.

## Source checkpoint

- Branch comparison against the parent shows changes limited to this research note, the isolated output-discovery plugin, Android plugin bootstrap, the Studio discovery module, the index module reference and its focused test.
- The existing `native-android/MG30AudioPlugin.java` recorder file retains its original blob SHA, so the AudioRecord capture implementation was not changed in this pass.
- GitHub reported no combined status checks for the latest source commit at this checkpoint. The added Node test has **not yet been executed in CI**, and no APK has been built or approved from this branch.

## Build #352 — latest USB-output discovery branch built successfully (3 November 2026)

- Source branch: `feature/studio-usb-reamp-loopback`.
- CI source commit: `093bad9b8ceec9a583ba3b9ff02f19a10b107354`.
- GitHub Actions run: [Build #352](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41579657826), run ID `41579657826`, conclusion **success**.
- Before the build, corrected `scripts/init-android.mjs`: split the malformed multiline single-quoted `registerPlugin(...)` content into two separate Java source-line array items. Added a regression test that invokes `node --check` on the initializer and an explicit workflow syntax-check step.
- Added this branch to the APK workflow push filter so future changes on this isolated branch are tested/built by CI.
- `node --check scripts/init-android.mjs`: passed.
- `npm test`: **148/148 passed, 0 failed, 0 skipped**.
- Vite 7.3.7 production build: passed.
- Capacitor Android project generation and native plugin registration: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL** (1m 28s).
- Artifact upload: passed.
- Artifact ID: `13204194446`, name `MG30-Studio-debug-APK`, ZIP size **4,119,222 bytes**, SHA-256 `7ebac3877b96e34a5f4e8754bb28410ddcbbc30318e6dc96b2ddaa209aa3467c`.
- Extracted `app-debug.apk`: **4,497,820 bytes**, SHA-256 `7e55987f01eab8b40ca6387a2692d6a242f5de4903bd0022901cea7b64fbfef8`.
- ZIP and APK integrity checks: passed.
- APK content inspection found `MG30AudioOutputPlugin`, `MG30AudioOutput`, and `inspectOutputDevices` in DEX, as well as the existing `MG30AudioPlugin` and `startRecording` markers. The packaged web bundle contains `MG-30 USB Playback`, `PERIKSA USB OUT`, `MG30AudioOutput`, and `inspectOutputDevices`.
- The pre-existing `native-android/MG30AudioPlugin.java` AudioRecord source was not modified by this branch's application changes and its compiled class is still in the APK.
- **Physical-device status:** Build #352 is CI-built and package-inspected, not yet confirmed installed or tested by the user. USB endpoint enumeration still needs the user's Android handset and original MG-30 Gen 2 firmware 6.0.x. The feature remains endpoint discovery only; it does not yet play DI audio or provide full-duplex Reamp/Loopback.
