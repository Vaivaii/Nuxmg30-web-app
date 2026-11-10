# Persistent NAM Library — implementation notes

Target: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII).

## User-approved behavior

- The NAM tab is the local NAM Library.
- The TONE3000 tab remains the catalogue/search/download workspace.
- Each saved NAM card shows its file name, file size/date, a lime Import action, and its own explicit MG-30 target-slot selector.
- Importing a saved file never removes it from the Library.
- Users can add a local .nam/.namb file to the Library and delete individual saved files.
- Download Only saves to the persistent app-private NAM directory.
- Download & Import continues using the already validated native A2-Lite transfer flow and also keeps a local copy.

## Storage behavior

Native Android storage is under the app's internal files directory: `files/nam-models`.
It survives app restarts and is private to MG30 Studio. It is removed if the app is uninstalled or its app data is cleared.

The native MG30Midi plugin now exposes:
- `listModels()`: enumerate saved .nam/.namb/.image files with size and modification time.
- `readModel({ fileName })`: read a selected file as Base64 for validation and import.
- `deleteModel({ fileName })`: remove one selected library file.
- `saveModel({ fileName, base64 })`: save a file, choosing a numbered suffix when the same filename already exists instead of overwriting it.

File operations constrain paths to the NAM Library directory. Save/read size is capped at 20 MB.

## Transfer safety

The Library Import action reuses `extractMG30A2LiteWeights`, `buildMG30A2LiteTransferPlan`, and `sendMG30A2LiteTransfer` from the validated Gen 2 transfer module. It requires an explicit slot selection and confirmation because the selected MG-30 slot is overwritten. The source file remains untouched. On success, the existing two-pass slot-name readback event is dispatched.

No changes are made to NAM transfer framing, MIDI mapping, IR User/Collection routing, or Studio functionality.

## TONE3000 status copy

Removed the obsolete statement that direct transfer would only be enabled after protocol validation. Download Only now reports that the file is saved in NAM Library and can be imported again. Both Download Only and Download & Import dispatch a library-refresh event after saving.

## Validation

Automated tests are added in `tests/nam-model-library-ui.test.js` for the UI contract, storage operations, collision-safe filenames, reuse of the verified transfer flow, and updated TONE3000 status copy.

A GitHub Actions Android build is configured for this branch. Physical Android installation and a real MG-30 import remain required before hardware acceptance.


## CI and signed APK verification

- Debug APK workflow: [run 42761139655](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42761139655) — 369 tests passed, 0 failed; Capacitor Android generation succeeded; Gradle `BUILD SUCCESSFUL`.
- Signed Community candidate workflow: [run 42761435635](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42761435635) — all jobs succeeded, including release keystore validation, signed APK build, APK signature/package/checksum verification, and artifact upload.
- Signed build source commit: `1bda82f574594e547b821fae6429ed80e969fa80`.
- Artifact ID: `13738325623`; name: `MG30-Studio-Community-Signed-Candidate`.
- Package: `com.vaivaii.mg30studio`; version: `1.0.0-community.29`; versionCode: `29`.
- APK size: `3,575,190 bytes`.
- APK SHA-256: `068070f6301f5da4e41ed5f688aec77930ca9b70721d64a6320361e2aa87f3d5`.
- APK signature: V2 valid, one RSA-4096 signer. Certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b` (same certificate used for Community .28).
- Artifact ZIP SHA-256: `2de878ff0ca15d395496e072c042acced2a2f8a3a090c3838b30fbdc19423fb6`.

The .29 package is signed with the same certificate as .28 and has a higher versionCode, so it can be installed as an in-place update without uninstalling the previous app. This preserves app-private NAM Library files. Do not uninstall or clear app data when updating.

Physical installation and MG-30 hardware acceptance remain pending. Verify that pre-existing saved NAM files appear in NAM Library after updating, add a second Tone3000 model, restart the app, and import one saved model to a selected test slot.
