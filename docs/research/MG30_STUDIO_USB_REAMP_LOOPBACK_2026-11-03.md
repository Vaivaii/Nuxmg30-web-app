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
