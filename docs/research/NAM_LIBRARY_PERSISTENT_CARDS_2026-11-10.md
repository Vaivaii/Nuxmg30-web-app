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
