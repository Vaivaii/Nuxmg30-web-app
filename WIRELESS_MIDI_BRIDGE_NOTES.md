# Wireless MIDI Bridge — Development Notes

Date: 2026-11-25
Repository: `Vaivaii/Nuxmg30-web-app`
Working branch: `feature/wireless-midi-bridge-2026-11-25`
Base branch: `feature/ai-live-tone-dsp-interpreter-2026-11-21`
Base commit: `f37024b5b51ce1bba0ecbb4dc4bd19e05a53db58`

## Compatibility and protected behavior

- Hardware target remains the original NUX MG-30 Gen 2 with firmware 6.0.x.
- This work is not for MG-30 MKII.
- Do not change the existing NAM workflow, User/Third Party IR import, IR Collection import, existing MIDI/CC mapping tables, or preset-transfer protocols as part of this bridge.
- Existing USB MIDI implementation in `native-android/MG30MidiPlugin.java` is retained. Wireless MIDI is implemented as an additional transport.

## Implemented in this branch

1. Added `native-android/MG30BluetoothMidiPlugin.java`.
   - Uses Android `BluetoothLeScanner` for nearby BLE device discovery.
   - Uses `MidiManager.openBluetoothDevice()` to open the BLE-MIDI device.
   - Opens MIDI input/output ports and exposes scan, connect, disconnect, send, and event callbacks to the Capacitor layer.
   - Requests Android 12+ `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` permissions; pre-Android 12 scan requests location permission.
2. Updated `scripts/init-android.mjs`.
   - Copies the new BLE plugin into the generated Android source tree.
   - Registers `MG30BluetoothMidiPlugin` in `MainActivity`.
   - Adds optional BLE hardware feature declaration and the required Bluetooth permissions.
3. Added `native-midi-bridge.js`.
   - Registers the existing `MG30Midi` USB plugin and the new `MG30BluetoothMidi` plugin.
   - Provides a Web-MIDI-shaped input/output adapter so existing editor logic can use native Android USB MIDI without rewriting preset/SysEx operations.
   - Routes Chocolate Plus BLE MIDI input to MG-30 USB MIDI.
   - Routes MG-30 USB MIDI feedback back to the BLE controller when feedback is enabled.
4. Added a separate CC routing helper in `native-midi-routing.js`.
   - Default passthrough forwards unmodified MIDI.
   - A configured source CC is translated to a target CC while preserving MIDI channel and value.
   - Unmapped messages continue through the passthrough setting.
5. Added Wireless MIDI Bridge controls to Device & Settings in `index.html`.
   - Scan/select nearby BLE MIDI devices.
   - Connect/disconnect BLE MIDI.
   - Enable/disable original passthrough.
   - Enable/disable two-way feedback.
   - Configure one source-CC to target-CC mapping.
   - Save bridge settings locally, separate from the editor's existing MG-30 CC maps.

## Validation completed

- Added `.github/workflows/wireless-midi-bridge-ci.yml` to run the repository regression suite and an Android debug APK build on pushes to this feature branch and pull requests targeting it. A workflow definition is present; its first hosted run has not yet been observed.
- Added `tests/midi-bridge-routing.test.js` with 5 Node tests.
- The 5 routing tests passed in an isolated Node.js 22.16.0 test run:
  - default passthrough
  - channel/value-preserving CC remap
  - passthrough of non-mapped messages
  - custom-only routing behavior
  - rejection of out-of-range byte values
- JavaScript syntax checks passed for the bridge module and pure routing helper in the isolated local check.

## Latest build verification — Run #3

- Commit: `2394dcead4d2f50a785604f438392ff788340baf`
- GitHub Actions run: [45617496295](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/45617496295) — **success**
- Root cause fixed: `MidiDevice.close()` in the exception handler could throw checked `IOException`; the exception handler now closes the device inside its own guarded try/catch and preserves close failures as suppressed exceptions.
- Full repository test suite: **710 passed, 0 failed**.
- Android debug build: `BUILD SUCCESSFUL`, `assembleDebug`.
- Uploaded artifact: `MG30-Studio-Wireless-MIDI-Bridge-Debug.zip` (4,408,086 bytes; artifact ID `15023376578`).
- Extracted debug APK: `MG30-Studio-Wireless-MIDI-Bridge-Debug.apk` (4,784,552 bytes).
- Extracted APK SHA-256: `71c0f0f4116857a2641ec54baa14401b7342eed717035ba2d030ea83ec5fb694`.
- This is a **debug APK** built by CI. It is not a signed public-release APK and has not been installed or physically tested against Chocolate Plus and the MG-30.

## Not yet validated

- A full repository `npm test` and Vite build have not been run from a checked-out working tree in this environment.
- Android Gradle/APK build has not been run because an Android SDK is not installed in this environment.
- No physical Chocolate Plus or MG-30 device is connected here. BLE scan, physical connection, MIDI timing, feedback/display behavior, and reconnection remain hardware QA tasks.
- Manifest permission insertion now compares exact `android:name` attributes so `BLUETOOTH_SCAN` cannot accidentally mask the legacy `BLUETOOTH` entry.
- Android API behavior and permissions must still be confirmed on the target phone/Android version.
- This work does not claim that the bridge has passed physical pedal QA or that an APK is ready to install.

## Suggested hardware QA sequence

1. Install a build produced from this branch on Android and approve Nearby devices permission when prompted.
2. Connect the original MG-30 Gen 2 to the phone by USB OTG; use the app's existing Connect MG-30 action.
3. Turn on Chocolate Plus in BLE-MIDI mode, open Device & Settings, scan, and select the discovered Chocolate Plus entry.
4. Start with original passthrough enabled and feedback enabled. Test one footswitch at a time with harmless CC/Program Change assignments.
5. Confirm that a controller CC reaches the MG-30, and that MG-30 feedback is received by Chocolate Plus.
6. Test a single source-CC to target-CC mapping after recording the original CC value. Confirm unmapped messages still pass unchanged.
7. Reconnect both transports after disconnecting Bluetooth and USB separately.
8. Run regression checks for NAM, Third Party/User IR, IR Collection, existing MIDI/CC mapping, preset import/export, and other protected features.

## Current safety note

No IR, NAM, preset, or device SysEx write sequence was modified by this branch's MIDI bridge work. Keep hardware tests limited to safe MIDI controls until routing and feedback are confirmed. Back up pedal presets before testing any unrelated write/import operation.

## Device & MIDI submenu implementation — 2026-11-25

- Implemented on the isolated wireless branch `feature/wireless-midi-bridge-2026-11-25`; the base/working branch was not edited.
- Reworked Device & Settings into two horizontal tabs: `Overview` and `MIDI`.
- Overview retains the connection summary, compatibility notice, and Backup & Restore entry. USB connection actions are placed only in the USB MIDI detail page.
- MIDI Center now opens four distinct detail pages: USB MIDI, Bluetooth MIDI, MIDI Routing, and MIDI Mapping.
- Moved original MIDI passthrough and two-way feedback toggles to MIDI Routing.
- Moved source-CC/target-CC configuration to the separate MIDI Mapping page. It continues using the existing `mg30-wireless-midi-bridge` local-storage key and the bridge's existing configuration method. Existing editor MIDI mapping tables were not edited.
- Added an Android Bluetooth activation button. The native plugin requests the Android `BLUETOOTH_CONNECT` permission when required and launches `BluetoothAdapter.ACTION_REQUEST_ENABLE` through Capacitor's Activity Result callback. User approval remains required; scanning is still a separate explicit action.
- Added `tests/device-midi-navigation.test.js` to cover tabs, the four detail pages, unique action IDs, legacy bridge controls, the Bluetooth activation intent, and mapping separation.
- Static source audit: 92 HTML IDs found, no duplicate IDs, and all `$('...')` references resolve to an element.
- GitHub Actions run #10 for code commit `9244890714eb54366661ac61a916e76940af3e29`: **success**. JS/Android-generator syntax, Vite build, regression suite, Android debug build, and artifact upload all passed.

### Protected areas

No changes were made to NAM import/processing, User/Third Party IR import, IR Collection import, preset SysEx transfer, or the existing editor MIDI mapping tables. This is a Device UI/navigation change plus an additive Android Bluetooth permission/activation method; it is not physical hardware validation.

### Final build and artifact — Run #10

- Workflow run: [45619413468](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/45619413468) — **success**.
- Built code commit: `9244890714eb54366661ac61a916e76940af3e29`.
- Regression suite: **717 passed, 0 failed**.
- Vite production build: successful.
- Android Gradle: `BUILD SUCCESSFUL in 1m 32s`; task `assembleDebug`.
- GitHub Actions artifact ID: `15024037893`; archive `MG30-Studio-Device-MIDI-Submenu-Debug.zip` (4,408,603 bytes).
- Extracted APK: `MG30-Studio-Device-MIDI-Submenu-Debug.apk` (4,785,088 bytes).
- APK SHA-256: `2781f330ecbb297bd40089acf6f5e36163433fc8267694cdfa9f76c59119326a`.
- The APK is a debug build. This confirms compilation and packaging only; the Android consent dialog, BLE discovery, Chocolate Plus routing, and physical MG-30 behavior still require testing on the target phone/controller/pedal.

