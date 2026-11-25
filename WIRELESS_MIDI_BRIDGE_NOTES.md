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

## Critical packaging correction — live Device page source

- The actual Capacitor app does **not** package the repository-root `index.html`.
- `vite.config.js` sets `root: 'www'`, and `capacitor.config.ts` sets `webDir: 'dist'`. Therefore, the live Android UI is built from `www/index.html` and its modules.
- The initial Device submenu pass was mistakenly applied to the unused root `index.html`. The successful Run #10 APK therefore did not contain the visible Device tabs shown in the agreed wireframe. The user's screenshot correctly exposed that packaging/source mistake. Do not use Run #10 as the Device submenu delivery.
- Corrected implementation is now in the live app sources:
  - `www/index.html`: two horizontal Device tabs, Overview and MIDI; MIDI Center tiles; distinct USB MIDI, Bluetooth MIDI, Routing, and Mapping subpages.
  - `www/chatgpt-account.js` and `www/cloud-account.js`: account cards mount inside Overview so they no longer appear above/replace the tab navigation. ChatGPT panel remains before Cloud panel.
  - `www/native-midi-bridge.js` + `www/native-midi-routing.js`: BLE-MIDI controller input routes to the existing `window.NUXNativeMidi` USB output; USB MIDI input can feed back to BLE when enabled. Custom CC mapping is saved separately under `mg30-wireless-midi-bridge`.
  - `www/main.js`: imports the BLE bridge into the actual mobile build.
  - `native-android/MG30BluetoothMidiPlugin.java`: adds user-consented `BluetoothAdapter.ACTION_REQUEST_ENABLE` flow using Capacitor Activity Result callback.
  - `.github/workflows/wireless-midi-bridge-ci.yml`: CI path filter now includes `www/**`.
- Device Overview keeps ChatGPT, Cloud, USB Audio, YouTube Cloud configuration, NAM device reader, and backup access. USB MIDI connection actions now live under MIDI → USB MIDI.
- MIDI Routing contains the existing passthrough and feedback toggles. MIDI Mapping contains only the bridge Custom CC controls and a protected Original MIDI information section.
- Live HTML audit: 353 source IDs, **0 duplicates**. The account modules target `deviceOverviewView`.
- No changes were made to NAM processing/import, User/Third Party IR, IR Collection import/transfer, preset SysEx transfer, or existing editor MIDI mapping tables.

### Correct live-app build — Run #16

- Workflow: [45621993912](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/45621993912) — **success**.
- Built source commit: `87232efe2dc58679252970f0e176a61b850d41a2`.
- Regression suite: **718 passed, 0 failed**.
- JavaScript and Android generator syntax checks: success.
- Vite production build: success from `www/` into `dist/`.
- Android Gradle: `BUILD SUCCESSFUL in 1m 33s`; `assembleDebug`.
- Artifact ID: `15025112002`; ZIP `MG30-Studio-Live-Device-MIDI-Submenu.zip` (4,413,001 bytes).
- Extracted APK: `MG30-Studio-Live-Device-MIDI-Submenu.apk` (4,791,340 bytes).
- APK SHA-256: `d72c457665fd833a886b282e3fcfb38228c2d408410d97bae83563bc65f38226`.
- APK archive inspection confirms the packaged `assets/public/index.html` contains `deviceTabOverview`, `deviceTabMidi`, `midiCenterHome`, and `midiBluetoothPage`; its JS bundle contains `MG30BluetoothMidi`, `bleMidiDeviceFound`, and `requestEnableBluetooth`.
- This verifies the proper live UI and plugin are packaged. It does not verify the app installed on the user's phone, Bluetooth consent UI behavior, physical BLE discovery, or two-way routing on Chocolate Plus + original MG-30 hardware. Those remain physical-device QA tasks.

## Bluetooth activation + BLE scan correction — Run #25

User screenshot showed Device → MIDI → Bluetooth MIDI rendering, but tapping Enable Bluetooth did not visibly update status or open a system prompt, and Scan MIDI Devices did not produce usable feedback. The status bar in the screenshot showed a Bluetooth icon, so the adapter may already have been ON; Android's `ACTION_REQUEST_ENABLE` correctly does not show an enable dialog when Bluetooth is already enabled.

Implemented on the live Android sources:

- `native-android/MG30BluetoothMidiPlugin.java`
  - Added `getBluetoothState` to report adapter availability, enabled state, BLE scanner, Android MIDI service, SDK version, runtime permission state, and legacy Location Services state.
  - Added `openBluetoothSettings` using Android `Settings.ACTION_BLUETOOTH_SETTINGS`.
  - Added `openAppPermissionSettings` using Android app details settings so a user can grant Nearby devices permissions after a denial.
  - Kept `BluetoothAdapter.ACTION_REQUEST_ENABLE` with the Capacitor Activity Result callback and runtime `BLUETOOTH_CONNECT` permission.
  - Hardened BLE scan startup so adapter/scanner/location/permission failures return visible errors rather than escaping before the plugin call resolves.
  - On Android 11 and below, explicitly requires Location Services to be enabled for BLE scanning.
- `www/native-midi-bridge.js`
  - Added Android state refresh on page entry, visibility return, and focus.
  - Added robust delegated click handling for Enable Bluetooth, Open Bluetooth Settings, App Permissions, and Scan MIDI Devices.
  - When adapter status cannot be read due to missing `BLUETOOTH_CONNECT`, scan still invokes the native scan path so the plugin can request runtime `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` instead of incorrectly short-circuiting.
  - Added direct, visible scan/error messages and a no-device-found hint.
- `www/index.html`
  - Added visible `Open Bluetooth Settings` and `App Permissions` controls plus a live status/error region.
  - Refreshes Android Bluetooth state whenever the Bluetooth MIDI subpage is opened.
- `tests/device-midi-navigation.test.js` and CI syntax checks cover the new UI, native methods, and permission-recovery path.

Verification — workflow [Run #25](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/45626970541):
- Source commit: `db690a9bc53d5cf18ecdc59ccd9656645c19f80e`.
- Regression tests: **718 passed, 0 failed**.
- JS / Android generator syntax checks: passed.
- Android debug APK: `BUILD SUCCESSFUL in 1m 16s`; artifact upload succeeded.
- Artifact ID: `15029265691`, ZIP size 4,415,537 bytes.
- Extracted APK: `MG30-Studio-Bluetooth-Permission-Fix.apk`, 4,793,860 bytes.
- APK SHA-256: `d5d81c475dc386ea9bf8686959eaf622d240632008a0b8d458b625087f08e9bf`.
- Inspected APK archive: packaged HTML contains `openBluetoothSettings`, `openAppPermissionSettings`, `bleMidiMessage`; bundled JS contains `getBluetoothState`, `requestEnableBluetooth`, and `openAppPermissionSettings`.

Remaining hardware QA:
- The APK build and static regression suite are verified, but this environment cannot operate the user's Android radio or physically scan the user's M-VAVE Chocolate Plus.
- On the phone, verify that Bluetooth status changes to ON/OFF when opening the page; grant Nearby devices permission if Android asks; if permission was denied permanently, use App Permissions and allow Nearby devices; then scan with Chocolate Plus awake and BLE MIDI mode active.
- If scan still returns no devices, capture the visible `bleMidiMessage` and `BLE controller` status. Do not claim physical BLE discovery or two-way MIDI routing until the actual controller and original NUX MG-30 are tested.
- No NAM, IR, preset SysEx, or existing editor MIDI mapping files were changed.

## BLE MIDI input into editor + Bluetooth diagnostics recovery — Run #35

User's latest screenshot still showed "Checking Android Bluetooth state…" and static Bluetooth status/buttons, while the Chocolate Plus could be manually enabled/connected at the OS level but its MIDI messages did not update the editor. Two concrete implementation gaps were identified and corrected.

### Root causes found

1. The native state diagnostic queried Capacitor permission state outside a full exception guard. An exception from the permission state check could leave the PluginCall unresolved, which left the UI on its initial "Checking…" label. Bluetooth methods also needed stronger rejection/timeout handling.
2. The BLE input handler previously forwarded packets only to the MG-30 USB output. It did not inject received BLE packets into the virtual input port consumed by the existing editor's `handleMG30MidiMessage()`. Therefore BLE could connect without the editor receiving PC/CC events.
3. Scanning relied only on live advertisements. A controller already paired manually in Android Bluetooth Settings might not be included in the new advertisement results.

### Changes made

- `native-android/MG30BluetoothMidiPlugin.java`
  - Added safe runtime permission-state helper `hasPermissionStateGranted` (renamed to avoid a method-name collision with Capacitor's inherited `Plugin.hasPermission(String)`).
  - Reworked `getBluetoothState` to always resolve a diagnostic state object, including adapter enabled state, scanner/MIDI-service availability, SDK version, permission state, and diagnostic error details.
  - Wrapped BLE scan permission requests and permission callbacks so errors reject the PluginCall with a useful message instead of leaving the UI pending.
  - Added `publishBondedMidiControllers`, which adds already-paired controller devices whose names contain Chocolate, FootCtrl, FootCtrlPlus, M-VAVE, or MVAVE to the in-app BLE device list before scanning live advertisements.
  - Kept Android `MidiManager.openBluetoothDevice` for the actual BLE-MIDI input/output ports.
- `www/native-midi.js`
  - Added `NUXNativeMidi.injectInput(data, metadata)`, which dispatches external MIDI into the same virtual USB-MIDI input port that the editor already consumes. It does not alter the USB connection or SysEx/preset transfer code.
- `www/native-midi-bridge.js`
  - BLE messages now have two independent paths:
    1. Inject mapped PC/CC and other MIDI bytes into editor input.
    2. Forward messages to MG-30 USB output only when USB is connected and passthrough permits it.
  - Editor input is not blocked when the MG-30 USB output is disconnected.
  - The Editor input counter increments only when `injectInput` confirms the packet was delivered.
  - Added native-call timeouts, exception-safe listener registration, explicit direct click bindings for all Bluetooth buttons, and visible diagnostics when state/permissions/scan calls fail.
- `www/index.html`
  - Added the `Editor MIDI input` status row showing received message count and last PC/CC data.
  - Clarified controller mode: set Chocolate Plus to H mode, power on, pair as FootCtrlPlus/Chocolate Plus if required, then scan/select it inside MG30 Studio.
- `tests/device-midi-navigation.test.js`
  - Added checks for external MIDI injection, the independent BLE→Editor and BLE→USB paths, direct Bluetooth button bindings, timeout/diagnostic handling, and paired FootCtrlPlus fallback.
- No NAM, IR User/Third Party, IR Collection import/transfer, preset SysEx, or existing editor MIDI mapping tables were changed.

### Final verified build — Run #35

- Workflow: [45630312537](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/45630312537) — **success**.
- Code/test commit: `1619183e0762bc51303ab950222df80939740e5f`.
- Regression suite: **721 passed, 0 failed**.
- JavaScript/Android generator syntax: passed.
- Android debug APK: `BUILD SUCCESSFUL in 1m 32s`; `assembleDebug` and artifact upload passed.
- Artifact ID: `15030089034`; ZIP `MG30-Studio-BLE-Editor-Input-Fix.zip` (4,418,380 bytes).
- Extracted APK: `MG30-Studio-BLE-Editor-Input-Fix.apk` (4,796,140 bytes).
- APK SHA-256: `a8e5163e9a8e7696679a2f3770aab38b8fe96c87c339b222eff2d945031850b8`.
- APK inspection confirms:
  - Packaged HTML includes the `Editor MIDI input` status row and Bluetooth/App Permissions controls.
  - Bundled JavaScript includes `injectInput`, `editorDelivered`, and timeout diagnostics.
  - DEX includes `MG30BluetoothMidi`, `publishBondedMidiControllers`, `getBluetoothState`, and `hasPermissionStateGranted`.

### Physical test still required

Build, automated tests, APK contents, and native plugin packaging are verified. The user's phone/controller/pedal cannot be operated from this build environment, so physical Bluetooth scan, BLE connection, and message reception are not yet certified. After installing this APK, verify in order:
1. Device → MIDI → Bluetooth MIDI should replace "Checking…" with Bluetooth ON/OFF or a visible diagnostic.
2. Tap Scan MIDI Devices. If FootCtrlPlus is already paired in Android Settings, it should appear as a paired entry; otherwise a live BLE advertisement should appear.
3. Select FootCtrlPlus/Chocolate Plus. The BLE status must show Connected.
4. Press a footswitch assigned to Program Change or CC. The `Editor MIDI input` row must increment and show the received PC/CC.
5. With USB MG-30 connected, verify the same message is also forwarded to the pedal when passthrough is enabled.

A BLE connection state by itself does not prove MIDI data is flowing; use the editor input counter as the receive-side evidence.

