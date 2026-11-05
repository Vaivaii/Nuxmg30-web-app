# NUX MG-30 Studio — All Preset Import/Export Phase Checkpoint

Date: 5 November 2026
Target: **Original NUX MG-30 Gen 2, firmware 6.0.x** (not MG-30 MKII)
Repository: `Vaivaii/Nuxmg30-web-app`
Working branch: `feature/all-preset-import-export`
Branch base: `cb67623cd275640fc891768ec3dc64c4cfa9758a` (`feature/amp-knob-label-correction-artwork`)

## User-confirmed installation state

- User confirms APK Build #508 has now been installed on their Android phone.
- Build #508 was built from application source commit `a59e389baf147f0cae0c265796c8e912016b6bdc`; GitHub Actions run `41870207106` succeeded.
- This is the latest APK confirmed installed by the user at this checkpoint.
- Installation confirmation is not equivalent to a physical MG-30 test of every feature. Do not claim import/export-all is hardware-validated.

## Existing preset functionality and evidence

### Single-preset import

- Original Gen2 QuickTone `.mg30patch` single-record format is 0x26AE bytes (9,902 bytes).
- The strict single-preset parser and 78-message import plan are implemented in `www/mg30-preset-format.js` and `www/mg30-preset-import.js`.
- Captured QuickTone order: `09/01` IR name, 64 `10/01` waveform frames, 10 `11/01` curve frames, then three `0B/01` scene writes; ACKs are checked.
- The app's import bridge uses the isolated QuickTone-compatible write path and performs a read-only three-scene verification afterward. It deliberately does not call the existing Save-to-device `07/01` finalization path.
- Prior user report says single-preset import succeeded on original MG-30 Gen2. Treat that tested single-file case as complete unless contradictory new evidence appears.
- Do not rewrite the known-good single-preset importer.

### Single-preset export

- The source contains the read-only IR read parser (`09/00`, `10/00`, `11/00`), scene readback, serializer, Export UI, and diagnostic instrumentation.
- The export path is read-only and must never generate a partial file on missing/mismatched responses.
- Earlier physical export testing on slot 04A reported a `10/02` reply with opaque tag 0 / offset 0 that did not match the awaited offset; export safely aborted and reported no writes to the pedal.
- User has now explicitly confirmed that **single-preset export succeeds on the installed app/device**. Treat physical single-preset export as validated and complete; do not ask the user to repeat it.
- The offline serializer also reproduced the supplied 9,902-byte single-preset sample byte-for-byte. Preserve this path as the known-good baseline; avoid unnecessary changes while implementing batch export.

### All-preset file format

- QuickTone original MG-30 uses `MG30AllPatch.mg30patch` for the 128-record all-preset file.
- Confirmed sample size: 0x135700 = 128 × 0x26AE = 1,267,456 bytes.
- Records are fixed-stride 0x26AE bytes; first uint32 LE is source record ordinal 0–127.
- Inventory of the supplied all-file: 101 records have resource marker 0; 27 have marker 1. Of those 27, 26 have a standard RIFF/WAVE header; ordinal 91 is anomalous (marker 1 but no standard RIFF/WAVE header at the expected offset).
- The 26 standard WAVE records have two variants: 15 with 24-bit/0x1800 data and 11 with 32-bit/0x2000 data. The current strict single-record parser only accepts the tested single-preset 24-bit-header/raw-float32 representation; do not force batch variants through it.
- The all-file parser/importer is intentionally disabled. Source record ordinal is not yet proven to be destination slot mapping.

## Current scope gaps

1. **All-preset import:** no dedicated QuickTone USBPcap capture of importing `MG30AllPatch.mg30patch` is present in the current Project attachments. Need capture of the full batch import to establish whether all 128 records are processed, how empty/resource records are handled, destination mapping, transaction ordering, progress and failure behavior.
2. **All-preset export:** no validated 128-record hardware readback/export workflow has been completed. Need determine QuickTone's batch export/cache behavior and safely generalize readback/serialization without assuming that one record's resource layout covers every record variant.
3. **Single-preset export:** complete and user-confirmed successful. No further test is needed unless a regression appears. Keep its implementation isolated from the new batch workflow.

## Next evidence request / controlled test

Use QuickTone Windows 2.6.7.16 and the original MG-30 Gen2 firmware 6.0.x:

- Preserve a backup of the current pedal state before any batch write.
- For protocol discovery, capture USBPcap from before launching QuickTone until after selecting the all-preset import operation completes. Include the MG-30 USB MIDI interface endpoints 0x02 OUT and 0x82 IN; do not apply a narrow capture filter.
- Use a disposable/fully backed-up test state and record any destination range or confirmation selected in QuickTone.
- Supply the resulting `.pcapng` and the exact `MG30AllPatch.mg30patch` file used. Do not test destructive writes against valuable user presets merely to obtain a capture.
- Until the capture is decoded and mapping validated, do not enable the 128-record importer or send batch writes.

## Protected functionality

Do not modify or regress:
- NAM import/TONE3000 path and its working behavior.
- User / Third Party IR upload command family `09/10/11`.
- IR Collection command family `6A/6B/6C` and its mapping.
- Existing MIDI/CC mappings.
- USB-MIDI/native Android bridge.
- Existing preset synchronization, Copy Scene and Save-to-device writer (including its `07/01` finalization/readback contract).
- Signal Chain and CTRL/EXP behavior.
- The known-good single-preset importer and user-confirmed successful single-preset exporter.

## Work status

- No application source code has been changed for this phase checkpoint.
- A dedicated branch has been created from the latest accepted artwork branch to isolate all-preset work.
- Next implementation must follow evidence from the batch import/export captures; no guessed slot mapping, resource-marker interpretation, record padding/truncation, or MKII protocol is permitted.


## Correction: the all-preset sample was already supplied (2026-10-30)

The user is correct: the exact original-MG30 MG30AllPatch.mg30patch sample was previously supplied and analyzed. The earlier sample analysis is retained in docs/research/MG30_PRESET_FILE_FORMAT_RESEARCH_2026-10-30.md; do **not** ask the user to upload the same file again as a prerequisite.

Recorded sample facts:
- Size: 1,267,456 bytes (0x135700).
- SHA-256: ea502ba24001d363c21950ed676bf77271026ac30ced4d10241168e10fe0b22a.
- 128 fixed-stride records, each 0x26AE bytes; record ordinal 0–127 at offset 0 as uint32 LE.
- Record 1 matches the known 1B DELUX DIST.mg30patch sample in its first 0x1B2 bytes.
- Resource marker inventory: 101 marker-0 records, 27 marker-1 records; 26 of the latter contain standard RIFF/WAVE at the expected offset; ordinal 91 is the anomalous marker-1 record without the expected standard RIFF/WAVE header.
- Of the 26 standard WAVE records, 15 use the 24-bit/0x1800 data variant and 11 use the 32-bit/0x2000 data variant.
- The single-preset parser is intentionally stricter and must not be reused to force-parse these all-file variants.

Important distinction:
- The sample bytes are documented and analyzed, but the raw binary is not currently listed among this Project conversation's mounted attachments. The existing analysis is enough to continue format/protocol work; if a future byte-for-byte fixture test requires the original binary bytes and no archived artifact is accessible, ask only then—not now.
- The missing critical evidence is the QuickTone all-preset import USBPcap capture and the corresponding full transaction/mapping, not the all-preset file itself.
- No all-preset writes are allowed until record-to-destination mapping, marker-0 behavior, marker-1 WAVE variants, ordinal 91, transaction ordering and rollback/failure behavior are validated.


## User correction and Export All implementation update (2026-11-05, resumed)

The user explicitly clarified that **QuickTone Export All does not send MIDI/SysEx to the pedal**. Export All must serialize the 128-record local All Patch/memory only. Do not investigate export-time USB-MIDI traffic or call any device readback routine as part of Export All.

The supplied local fixture `MG30AllPatch.mg30patch` was materialized and confirmed at exactly `0x135700` bytes (1,267,456), containing 128 records of `0x26AE` bytes. Its record inventory includes the known 27 resource-bearing records, 26 standard RIFF/WAVE headers and the anomalous record 91. The byte offsets are represented in the serializer as a resource section at `0x1AA`: name at record offset `0x1B2` (32 bytes), RIFF/WAVE header at `0x1D2` (44 bytes), Float32 waveform at `0x1FE` (2,048 samples / 8,192 bytes), and curve at `0x21FE` (600 uint16 / 1,200 bytes).

Current app boundary: the editor's active state is a single editable draft, not a complete 128-preset binary bank. The app therefore keeps the validated All Patch selected through the Import All file picker in `window.MG30AllPresetMemory` / module memory. Export All uses that local 128-record source; it does not synthesize 128 records from the one active editor draft.

Code update:
- Commit `36cd504fc17c4fd9c6c49ec665666ab92b65c127` hardens `exportAllPresets()` in `www/mg30-preset-export.js`.
- The function explicitly validates 128 sequential local records and 3 scenes per record, serializes via `buildMG30AllPresetPatch()`, checks output size `0x135700`, reparses the result and verifies 128 records / 27 resource records before saving.
- The function contains no call to `readSingle()`, MIDI bridge, SysEx, live sync, or pedal access. Single-preset Export remains a separate unchanged path.
- Serializer behavior preserves each parsed record's `rawRecord`, including original RIFF header variants and opaque bytes; resource names are zero-padded and fresh resource records receive the standard RIFF/WAVE header. Non-resource records have their resource section zero-filled.

No import, live sync, NAM, User/Third Party IR, Collection IR, MIDI mapping, or native USB-MIDI code was changed. No APK build or physical-device Export All test has been performed in this update. Next step is to run the repository test/build workflow and then test local-file Export All without a connected pedal.


## Build and automated verification (2026-11-05)

- GitHub Actions run: `41982880283` (run #525), branch `feature/all-preset-import-export`, source commit `36cd504fc17c4fd9c6c49ec665666ab92b65c127`.
- Workflow result: **success**. All steps completed: dependency installation, Android initializer syntax check, `npm test`, Capacitor Android initialization, Gradle `assembleDebug`, and artifact upload.
- Gradle output: `BUILD SUCCESSFUL`; 183 actionable tasks executed.
- Downloaded build artifact: `MG30-Studio-debug-APK`, artifact ID `13394567976`, archive size 4,203,537 bytes; SHA-256 `0ad14040000df9b8508ae7bb534796bdca8e0ea05f3f37b76a3f8e2d606cf4df`.
- APK extracted from that exact artifact: `MG30-Studio-Export-All-debug.apk`, size 4,581,560 bytes; SHA-256 `18ac30d404c7542373678fb9ded7aad41006cf62e9f1c2aa4e5db41d52574b37`.
- This verifies automated protocol regression tests and Android packaging for this commit. It does **not** establish a physical MG-30 / Android device test of the Export All button. The device-side test remains: select a valid local 128-record All Patch file, run Export All with pedal disconnected, and verify the downloaded file is exactly 1,267,456 bytes and reparses to 128 records.
- No changes were made to importer, live sync, NAM, User/Third Party IR, Collection IR, MIDI mappings, or USB-MIDI bridge during the build verification.


## Export All Android save-dialog overlay fix (2026-11-05)

User reported that Export All appeared stuck on the shared modal titled "Export in progress" with a USB disconnect warning. Root cause was identified in the status observer in `www/preset-library-ui.js`: it deliberately closes the shared progress dialog before opening Android's native Documents picker only when status contains "memilih lokasi penyimpanan" or "file manager android". Export All previously set only a generic "Menyimpan … byte" status, so the observer misclassified the local-only serialization/save hand-off as an active USB transfer and left the overlay open.

Fix:
- Commit `c8b13a615efa70b2fe5d6d860d6fa14aa9710826` changes only `www/mg30-preset-export.js`.
- Export All now sets the same native-picker hand-off status phrase used by the known single-preset export path: it says the 128-record local file is ready and Android File Manager is opening.
- This causes the existing observer to close the web progress overlay before the native save picker. It does not add USB, MIDI, SysEx, readback, or pedal calls.
- No change to `preset-library-ui.js`, importer, NAM, either IR path, MIDI mapping, or live sync.
- A fresh Android build and regression test run is required for this follow-up commit. Device validation of the save picker remains pending.


### Overlay fix build result (2026-11-05)

- GitHub Actions run #526: `41992369598`, source commit `c8b13a615efa70b2fe5d6d860d6fa14aa9710826`, conclusion **success**.
- `npm test`, initializer syntax validation, Capacitor Android initialization, Gradle `assembleDebug`, and artifact upload all passed.
- Artifact `MG30-Studio-debug-APK`, ID `13398672524`, archive size 4,203,524 bytes, SHA-256 `e2be729b9f4713e06cb68bfe321154d269c84bfb52c47ed96ad014dd824c931f`.
- Extracted `app-debug.apk` size 4,581,548 bytes, SHA-256 `02b438b0a1c65352131aea75ac3e7c22183a7863bd687c7cc2636268a5954844`.
- The user-facing overlay root cause and fix are documented above. This build has not yet been confirmed installed or exercised on the user's Android phone. The remaining verification is to install this APK, repeat Export All, confirm the native File Manager save picker appears, then verify the saved output is exactly 1,267,456 bytes / 128 records.


## Follow-up: Export All confirmation and progress-overlay suppression (2026-11-05)

User clarified the observed behavior: Export All did not show the native confirmation dialog that Single Export shows before launching Android File Manager; after a delay it displayed the generic "Export in progress" modal with the USB disconnect warning.

Investigation:
- The modal is produced by `reflectExportStatus()` in `www/preset-library-ui.js`, using a MutationObserver on `#presetExportStatus`; it is not evidence of active MIDI traffic.
- The Android save operation is `NUXNativeMidi.savePatch()`, mapped to native `ACTION_CREATE_DOCUMENT` in `native-android/MG30MidiPlugin.java`, just like the Single Export save path.
- The previous text-only hand-off signal was insufficient, so it was replaced with an explicit local-export state flag.

Code changes:
- Commit `6d7f3321979ec6b43e4b47a4693ca9aec4760b1f` adds a confirmation prompt before building/saving Export All. The prompt identifies the source file, 128 presets (01A–32D), 3 scenes each, output filename and size, and explicitly states there is no USB-MIDI/SysEx communication or pedal write.
- Commit `64fec17dca3938eedbc889ed39d5b8508948a067` makes `preset-library-ui.js` suppress the shared USB-transfer overlay while `window.MG30LocalPresetExportActive` is true. The state spans confirmation, local serialization, and native save picker; it does not close or override an Import-owned progress dialog.
- Export All remains strictly local. No MIDI/SysEx/readback calls were introduced. Single Export code remains separate. No importer, NAM, User/Third Party IR, Collection IR, MIDI mapping, or USB bridge code was modified.

Build verification:
- GitHub Actions run #528: `41993885630`, source commit `64fec17dca3938eedbc889ed39d5b8508948a067`, conclusion **success**.
- `npm test`, Android initializer syntax check, Capacitor Android initialization, Gradle `assembleDebug`, and artifact upload all passed.
- Artifact: `MG30-Studio-debug-APK`, ID `13399187356`, ZIP size 4,203,797 bytes; SHA-256 `b0a894078018f510b1726db3236af26213d57b04b669a9b3a8970d696c5fac22`.
- Extracted APK: `MG30-Studio-Export-All-Confirm-Fix.apk`, size 4,581,768 bytes; SHA-256 `81888c6bd2da2b841c4b522a7c9ecbae8a776126b399fe077d4d80a04260cd74`.
- User still needs to install this latest APK and confirm: (1) confirmation appears first, (2) tapping OK opens Android File Manager without the USB progress overlay, (3) saved file is 1,267,456 bytes and reparses to 128 records. This last device-side validation remains pending.


## Critical correction: QuickTone memory source vs Import All file input (2026-11-05)

The user's distinction is correct. "Local/in-memory" in QuickTone's Export All routine means its **live preset manager/cache**, which is populated from device synchronization; it does not mean asking the user to choose an existing All Patch file in the Import All file picker and then saving that same file again.

Evidence from `docs/research/MG30_QUICKTONE_EXPORT_DISASSEMBLY_2026-11-05.md`:
- Export All click routine VA `0x004AB710` reads the already-populated manager at global `0x0B8D9718`, serializes each manager object as a `0x26AE` record, concatenates 128 records, and writes `0x135700` bytes. No new read request is issued inside that click handler.
- Separate upstream connection/synchronization routines populate the manager. Recovered code includes per-preset scene readback (`0C/02` responses), per-index `09/00 -> 09/02` resource descriptor reads, and conditional `10/00 -> 10/02` waveform plus `11/00 -> 11/02` curve readback when the resource is present.
- These are Gen2 SysEx/MIDI read transactions carried over the device's USB-MIDI transport during synchronization. The evidence does not support a USB mass-storage/file-copy transfer from the pedal. The file-save helper is a separate local Windows file writer.
- Therefore "no MIDI when pressing Export All" is true for the final serialization click, but does not mean the complete data acquisition workflow never uses MIDI/SysEx.

MG30 Studio distinction:
- Existing **Export Single** is on-demand and explicitly sends read-only SysEx requests when tapped: `0C/00` for 3 scenes, `09/00` for resource metadata, and conditionally `10/00` / `11/00` reads for waveform/curve. It then serializes one `0x26AE` record and invokes Android `ACTION_CREATE_DOCUMENT` to save the file.
- Android `savePatch()` / `ACTION_CREATE_DOCUMENT` is a phone storage picker and ContentResolver write, not USB transfer to the MG-30.
- The current attempted Export All implementation incorrectly uses the All Patch file selected through the Import All picker as its source. That only reserializes a chosen file; it does not collect the connected pedal's current 128-preset manager. Do not describe it as a completed live bank export.
- Correct target architecture: obtain/refresh all 128 preset records and only read resource waveform/curve for records positively identified as resource-bearing; validate the whole bank; then serialize to `0x135700` and save using Android's native file picker. Ideally acquisition is a pre-populated manager/sync step, matching QuickTone's boundary. The app currently has a working on-demand Single Export path but not yet a validated full-bank readback manager.
- Do not blindly loop the current Single Export 128 times: its current metadata parser requires a non-empty IR resource name and its serializer is resource-bearing; original All Patch has 101 marker-0 records and 27 marker-1 records. Batch readback must support marker-0 records and preserve resource header variants/opaque fields. Current complete QuickTone `10/02` / `11/02` payload capture and byte-for-byte batch comparison are still outstanding.

## Android save bridge size gate fix (2026-11-05)

The user reported no visible response from Export All. Inspection found an independent hard blocker in `native-android/MG30MidiPlugin.java`:
- Native `savePatch()` capped Base64 at 1 MiB and accepted only exactly `0x26AE` bytes.
- `savePatchResult()` repeated the same single-record-only size check.
- An All Patch output is `0x135700` bytes and approximately 1.69 MiB Base64, so native Android rejected the request before `ACTION_CREATE_DOCUMENT` could open.

Fix:
- Commit `aa93feb465f5506392e0408d6899107ae315e1d2` adds a shared exact-size gate accepting only `0x26AE` (single) or `0x135700` (all bank), and raises the bounded Base64 input ceiling to 2 MiB.
- Commit `d5f9fecaf20b3117bee0a3d27eff0a8e26238e75` ensures final Export All success/error/cancel statuses are not swallowed by the local-export overlay suppression. Intermediate local statuses still do not display the USB-transfer warning.
- Commit `8f6acd556e9cb43f06ae4f635dcef65ca3a78b72` fixes confirmation prompt line breaks.
- This fixes the Android file-save size gate and makes terminal UI feedback visible. It does **not** solve the larger live 128-preset acquisition/source-manager gap above.
- Protected features remain untouched: existing single Export logic, import, NAM, User/Third Party IR, Collection IR, MIDI mappings and device write paths.


## Live bank Export All readback implementation (2026-11-05)

The previous local-file cache approach has been superseded. Export All now uses the live MG-30 read-only readback path rather than re-saving a file selected in Import All.

Implementation:
- Commit `cc9317b7897f9a6f0df5e86050594b23f68b6098` changes Export All to prompt immediately, enumerate program indices 0–127 (01A–32D), and call the existing `MG30PresetExportBridge.readSingle()` readback core for each program with an explicit `programOverride`.
- The readback core still issues only read requests: three `0C/00` scene reads, one `09/00` resource metadata query, and—only when the returned resource name is non-empty—64 `10/00` waveform reads and 10 `11/00` curve reads. No preset/IR write command is used.
- The reader now accepts an explicit `allowMissingResource` option for bank enumeration. Empty `09/02` resource names are treated as marker-0 records and do not trigger waveform/curve reads; this leaves the resource portion zero-filled.
- `decodeMG30PresetSceneReply` converts all three scene responses to the 142-byte record representation. The 128 records are serialized by `buildMG30AllPresetPatch()` into exactly `0x135700` bytes, reparsed, and only then passed to native Android `savePatch()`.
- The batch disables hardware-state polling restarts between individual records and resumes polling after the batch ends. Existing Export Single default behavior is unchanged.
- Commit `0cad63520e108d8bb7476d580be135b98c3e4ba1` adds explicit parser support for empty resource names only when requested by the bank reader.
- Commit `4e9917c2056ba4e746da02b3e5631a269538661b` removes the sample-specific fixed count of 27 resource records from generic All Patch parse/serialize. The supplied fixture still tests 27, but a live bank may contain a different count.
- Tests added: empty 09/02 metadata/no-resource parsing; All Patch serialization with one resource and zero resources. Existing fixture tests still validate the 128-record / 27-resource example and preserve original RIFF variants when raw records are available.
- Import All file selection no longer supplies the Export All source. The export now requires the connected MG-30 and reads the current bank.

Remaining hardware validation and caveats:
- No physical MG-30 Gen2 FW 6.0.x run of this 128-slot live export has been performed yet. The new assumption that an empty name field in a valid 09/02 reply means marker 0 must be checked on an actual resource-free preset. If the device returns another descriptor form, the operation fails closed before saving rather than inventing resource data.
- Fresh live-read resource records currently use the same standard 24-bit RIFF/WAVE header as the existing working Single Export serializer. The supplied All Patch fixture includes both 24-bit and 32-bit header variants; byte-for-byte preservation of those variants from live hardware remains unproven. Original parsed raw records still preserve their exact RIFF variants.
- The batch is read-only, but it is a long 128-slot operation. Keep USB connected and the app open until completion. It must never be confused with Import All or send the existing 10/01, 09/01, 11/01 writer sequence.
- All protected paths remain untouched: Import Single/All, NAM, User/Third Party IR write, Collection IR (6A/6B/6C), MIDI mappings, and the preset write/save pipeline.

Build:
- GitHub Actions run #538: `41999978561`, source commit `8337cc4a91d8ad23e94d712a30dbee508a95a92d`, conclusion **success**.
- `npm test`, Android initializer syntax check, Capacitor Android initialization, Gradle `assembleDebug`, and artifact upload all passed.
- Artifact `MG30-Studio-debug-APK`, ID `13402311452`, ZIP size 4,204,122 bytes; SHA-256 `174b52e6733e345ecc7c34f2c10a170cc185095d887515e741c1848ac309f940`.
- Extracted APK: `MG30-Studio-Live-Export-All-debug.apk`, size 4,582,016 bytes; SHA-256 `9e6a37d2263d80732b6563bef0da89e08172cf0493eba7e23ce6a153fdbb80e1`.


## User device test failure and error visibility fix (2026-11-05)

User installed the live Export All build and reported it fails immediately. Screenshot shows only a generic "Export failed" modal with an empty progress track; no actual failure text is visible.

Inspection:
- `reflectExportStatus()` in `www/preset-library-ui.js` intentionally passed an empty note to `showExportFeedback()` for every error. The detailed error remained in `#presetExportStatus` behind the modal, so the UI hid the only useful diagnosis.
- The screenshot alone does not identify whether failure is at the initial connection/busy gate, first 0C/00 scene, 09/00 metadata response, IR waveform/curve, or final serialization. Do not claim root cause is confirmed yet.

Fix:
- Commit `2e1148690f250040a9663140e998d846a798e222` changes the error modal to show the actual status text in its note and remain visible until acknowledged/closed. This should expose exact slot, phase, timeout, or parser error on the next run.
- Build #539 is pending at checkpoint creation.
- Next hardware test: capture the exact full error note. If it says an operation is already active, investigate bridge busy flags; if it identifies 0C/00 or 09/02, compare raw reply shape against the existing working Single Export trace; if it identifies 10/02 or 11/02, compare data block offsets and response tags. Do not alter MIDI mapping, NAM, User/Third Party IR, Collection IR, or import/write paths.


## Follow-up: Export All SysEx timeout and slot-selection correction (2026-11-05)

User supplied the diagnostic screenshot. The exact message is: `Export All gagal: No response SysEx dari MG-30`. This proves the export aborts while waiting for a matching device response, before bank serialization or Android file save. It does not identify the exact first request because the generic `waitForSysEx` error discarded the request label.

Code review found a concrete difference from QuickTone's recovered sync sequence:
- QuickTone's manager synchronization does not simply issue `0C/00` for arbitrary program numbers. The recovered sequence receives/establishes the selected preset index through `0B/02`, then sends three sequential `0C/00` scene reads for that selected preset. See the disassembly note section "preset-wide 09/00 name scan and sync order".
- The first live Export All implementation looped `readSingle(programOverride=N)` without first selecting N on the pedal. Export Single uses the currently selected hardware preset, so this did not faithfully reproduce the selection boundary. A mismatch can cause the `0C/02` matcher to wait forever.
- Added `MG30PresetExportBridge.selectProgramForRead(program)`: sends read-only MIDI Program Change `0xC0, program`, flushes the queue, and waits 360 ms, matching the app's existing `selectHardwareSlot()` settling delay.
- Export All now selects each slot before invoking the unchanged Single Export readback routine; after success or failure, it attempts to restore the originally selected program. This changes only the active program selection, not stored preset contents. It does not use any preset/IR write SysEx.
- Commits: `984b1b9feed515d4ddd8a19e2f3e13c925406270` (bridge selection method), `299086e6b37397fda3b2a2b2a2c4ea9c3e4929b2` (select each slot before readback and restore).
- Build #541 is in progress at checkpoint creation. This is a reasoned correction from the protocol/disassembly evidence, not yet confirmed on physical hardware. If the next device run still times out, next change must expose request label + slot and compare exact response matcher to a known-good Single Export trace; do not loosen response validation or change MIDI mappings.


## User report: Export All scan finishes but saved file is 0 bytes (2026-11-05)

User tested the live-bank Export All build. The pedal visibly stepped through presets one by one, then the process ended. The user selected `MG30_All_Preset.mg30patch` for Import All and the app rejected it with: `Ukuran All Preset .mg30patch harus tepat 1267456 byte; diterima 0.` Screenshot also showed USB-MIDI disconnected after the attempt. This is consistent with an empty destination document; it does not prove the readback records themselves were valid or invalid.

Native save inspection:
- `savePatch()` decoded and validated the 1,267,456-byte Base64 payload before opening `ACTION_CREATE_DOCUMENT`.
- The callback `savePatchResult()` re-read the large Base64 string from `PluginCall` after the system document picker had been open, then wrote it to the URI. Although it should work in a normal callback lifecycle, this leaves the large payload dependent on the retained PluginCall across an Android activity transition and did not verify destination contents.
- The old callback reported `bytes.length` as saved without opening the target URI to read it back. The app could therefore report success based on the in-memory buffer rather than a verified physical document.

Changes:
- Commit `6ef5838e09956ebd7630fb554619578728788ae7` stages decoded preset bytes to an app-cache temporary file before opening Android's document picker and writes from that staging file in the activity callback. It then reopens the destination URI, counts bytes and computes CRC32 against staging before returning success. Cancellation/failure removes the temporary file.
- Commit `ad705f8afeb61ebcc62e862c5ced5d26005ac15b` fixes Java multi-catch compile hierarchy in the staging path.
- Commit `fa08c88dbce358bc08464a865c29855817db7a76` makes the JS save bridge reject success unless Android confirms exactly the expected byte count.
- No changes to Import All parser, single-export readback protocol, import/write commands, NAM, User/Third Party IR, Collection IR, or MIDI mappings.
- Build #544 is pending at time of note creation. Required verification: Android compile; install latest APK; run Export All; verify successful status reports 1,267,456 bytes and CRC32; then choose that file in Import All and confirm parser receives 1,267,456 bytes / 128 records. Device-side confirmation remains pending.


Build follow-up:
- Initial build #544 failed only at Java compilation because the refactored Activity callback used `safeName` without declaring it in callback scope.
- Commit `bf92ce7eaac6cddb5b2c1d76335a2eff1b9166db` restores filename sanitization/declaration within `savePatchResult()`.
- Build #545 for that correction is queued. No APK from the failed #544 run is valid or should be delivered.


### Zero-byte save verification build result (2026-11-05)

- Build #545 GitHub Actions run: `42017030301`, commit `bf92ce7eaac6cddb5b2c1d76335a2eff1b9166db`, conclusion **success**.
- Regression tests, Android initializer syntax, Capacitor generation, Gradle `assembleDebug`, and artifact upload all succeeded.
- Artifact ID `13410450214`, ZIP size 4,207,198 bytes, SHA-256 `86464a681dabf8dc614639609e3ec8349b37f90d2b551007240e42899449931e`.
- Extracted APK path `MG30-Studio-ZeroByte-Guard.apk`, size 4,584,696 bytes, SHA-256 `9f05bd330f16149125e21ca897ebec29776dc39fa2373a2d498068f5a04dba9a`.
- This verifies build and automated test only. Physical Android SAF write/readback verification and MG-30 all-bank export/import round-trip are still pending user device testing.


## Continued report: generated All Patch still has 0 bytes; persistent SAF staging revision (2026-11-05)

User reports that after installing the ZeroByte Guard build and repeating export, the output file still remains 0 bytes. This means the previous cache staging + post-write verification change did not resolve the physical Android storage handoff on the user's device.

New revision:
- Commit `ab6d31a7a13c95d90397a4a949d77a3f413cd09b` moves staging from the reclaimable cache directory to persistent app-private `files/mg30-patch-export/`.
- The staging path is derived from the PluginCall callback ID, so the ActivityCallback can reconstruct it if the plugin's in-memory map is lost while Android's Documents UI is foregrounded. The existing map remains a fast path.
- The SAF output mode is standardized to `"w"`.
- If copying/verifying the SAF destination fails after ACTION_CREATE_DOCUMENT created a document, the callback attempts `DocumentsContract.deleteDocument()` to remove the empty/partial file, then rejects the plugin call.
- Destination readback byte count + CRC32 check remains mandatory; JS only accepts an explicit matching byte count.

Do not yet claim this has fixed the user's device: no physical device test after this revision exists. Regression tests and syntax checks passed in Actions run #546; Android Gradle build is still running at note creation. Next: complete build, install this revision, export once, and report the exact native storage error or verified 1,267,456-byte output.


### Persistent SAF staging build result (2026-11-05)

- GitHub Actions run #546: `42019264487`, source commit `ab6d31a7a13c95d90397a4a949d77a3f413cd09b`, conclusion **success**.
- Dependencies, Android initializer syntax validation, protocol regression tests, Capacitor Android generation, Gradle `assembleDebug`, and artifact upload all succeeded.
- Artifact ID `13410972032`, archive size 4,207,501 bytes, SHA-256 `5ef48cedda79a5928b469ec3afc083d43fab89d3686e3611c1af7262adf61fb0`.
- Extracted APK size 4,584,908 bytes, SHA-256 `1b28477e4d23a924200e96f60514defbbc1a5c3b6c0fc586be64a5b5d07cb6e2`.
- This only confirms packaging and automated checks. It does not yet prove the SAF callback works on the user's Android device. The user must repeat export with this exact APK and verify saved document imports as 1,267,456 bytes / 128 records. If it still fails, capture the new native error text; current code should reject and attempt to delete an empty destination instead of reporting a false success.

## Source audit: MG30 Studio Export Single versus QuickTone manager cache (2026-11-05)

The user observed that Export Single appears fast and may also be wrapping already-available preset data. The current source was checked directly before drawing a conclusion.

### Confirmed MG30 Studio Export Single behavior on this branch

- The Export Single button in `www/mg30-preset-export.js` calls `api.readSingle()` when the user starts the export. Only after that promise returns does it call `buildMG30SinglePresetPatchFromReplies()` and `savePatch()`.
- The `MG30PresetExportBridge.readSingle()` implementation is embedded in `www/index.html`. It performs fresh device read requests during the export operation:
  1. Three sequential `0C/00` scene reads, matched to `0C/02` replies.
  2. One `09/00` resource metadata request, matched to `09/02`.
  3. For a resource-bearing preset, 64 `10/00` waveform requests and 10 `11/00` curve requests, matched by returned offsets in `10/02` and `11/02`.
  4. It assembles the live replies, returns the scene/resource data, and only then does the Export UI serialize a 0x26AE-byte single record and open the Android save flow.
- The single-export path therefore is **not currently a cache-only export**. The fast user-visible completion is not evidence by itself that the readback is omitted; the code explicitly issues the read requests on each Export Single action.
- Export Single requires an attached IR resource; the optional empty-resource handling is enabled specifically by the Export All bank reader, not by the normal single-export button.

### Difference from QuickTone

- Recovered QuickTone Export All click routine serializes its already-populated preset manager; its export-button handler does not itself initiate device reads.
- QuickTone's manager is populated earlier by the connection/synchronization path. The recovered per-preset readback and resource-presence scan are upstream from the Export All click.
- MG30 Studio currently starts its single-preset readback on demand from the Export button. Its current Export All then loops this same readback primitive across 128 slots.
- Both flows share the Gen2 record format/serialization model, but **the source/lifecycle of their data differs**: QuickTone manager cache versus MG30 Studio on-demand device readback.

### Engineering decision / next direction

- Do not infer a cache hit from export speed alone. If desired, time-stamp request dispatch and replies during a successful Export Single run; the existing `MG30PresetExportLastDiagnostics` trace records per-request and total elapsed timing.
- A future QuickTone-like implementation should investigate a deliberate preset-manager/cache populated during connection synchronization, track completeness and freshness per slot, and serialize from that verified cache when Export is requested.
- Keep the known-good Export Single readback path intact while designing/testing the cache path. A safe migration can add cache-backed export only after the cache is proven complete and fresh, with the current live readback retained as fallback.
- This is a documentation/research update only. No source code, protocol command, NAM, User/Third Party IR, Collection IR, MIDI mapping, preset write/import path, or APK was changed by this audit.

## Read-through preset manager cache — implementation checkpoint (2026-11-05)

Implemented on \`feature/all-preset-import-export\` after auditing the difference between QuickTone's pre-populated manager and MG30 Studio's on-demand readback.

### Cache model

- Added \`www/mg30-preset-manager-cache.js\`, a session-scoped 128-slot cache. It accepts only a complete readback: three correctly indexed 0C/02 scene replies, plus either an explicit marker-0/no-resource state or a marker-1 resource with a name, 2,048 finite Float32 samples and 600 in-range UInt16 curve values.
- Entries are marked \`fresh\` or \`stale\`. The manager reports fresh/stale/missing counts, returns an ordered full bank only when all 128 slots are fresh, and deep-copies typed arrays on storage and retrieval.
- Cache is memory-only and scoped to the current USB-MIDI connection session. A new session/disconnect clears the entries; no prior-session data can silently be exported.
- This is a read-through cache, not yet a byte-for-byte clone of QuickTone's complete background connection manager. The recovered QuickTone scheduler's upstream 0B/02 trigger/pacing and all accompanying metadata/resource acquisition must be proven before automatically scanning all slots on connection.

### Export behavior

- Export Single now prefers a fresh cached slot. On a cache miss/stale slot it uses the existing proven \`MG30PresetExportBridge.readSingle()\` path, then stores the complete readback. A slot without IR remains ineligible for Export Single, as before.
- Export All reuses every fresh entry and reads only missing/stale slots through the existing read-only bridge. Successful slots are cached immediately, so an interrupted first scan can resume from previously completed slots on the next attempt.
- Export All switches the pedal program only for cache misses and restores the original program only if it needed to switch. If all 128 slots are fresh, it does not cycle the pedal through its programs.
- Final bank serialization, the 128-record/0x135700 size gate, parser validation and Android SAF file verification remain unchanged.

### Freshness invalidation

- Outgoing non-scene-select CC parameter/block changes stale the active slot; CC80 scene selection does not because the cache contains all three scenes.
- Preset scene writes (0B/01, 0C/01, 07/01) and Signal Chain/CTRL writes (0D/01, 13/01) stale the affected active/target slot.
- User IR resource writes (09/01, 10/01, 11/01) conservatively invalidate the whole cache because the exact resource-to-preset association is not assumed. NAM command family 58 and Collection families 6A/6B/6C are not included in the preset-cache invalidation helper.
- Physical block/parameter feedback invalidates the active slot. Web MIDI and native Android disconnect state clears the session cache.
- No MIDI/CC identifiers, SysEx packet builders, NAM transfer commands, Collection mapping, or USB-MIDI device-selection code was changed.

### Automated tests and remaining validation

- Added unit tests for 128-slot completeness, marker-0 records, resource-bearing records, scene/header validation, deep-copy isolation, targeted/bank invalidation and session reset.
- Added integration assertions that Export Single/All use the cache-first path and connection/write invalidation hooks remain connected.
- No automatic 128-slot scan is started on connect. The first Export All still reads uncached slots and warms the cache incrementally. Reproducing QuickTone's connection-time manager population without an unproven trigger or disruptive Program Changes remains a separate research item.
- No physical-device/export-speed claim is made until the new APK is installed and exercised on original MG-30 Gen2 FW 6.0.x.


### Follow-up safety correction — legacy direct Save-to-device path (2026-11-05)

- Static search found \`writeHardwarePreset()\` sends its captured \`0B/01\` scene frames and final \`07/01\` command directly through \`midiOutput.send()\`, outside the central \`midiSend()\` queue.
- The cache invalidation helper is now called with the exact frame immediately after each of those existing sends. Frame bytes, order, ACK handling and readback verification are unchanged; the affected preset entry is only marked stale.
- Export Single explicitly rejects a cached marker-0/no-resource entry with a clear User IR resource message before invoking the existing serializer. The resource-bearing Single Export path and device readback implementation remain unchanged.
- Added an integration assertion for invalidation in the direct Save-to-device path. This correction changes no NAM, User/Third Party transfer packet, Collection command, MIDI/CC mapping, or USB-MIDI transport behavior.


### Follow-up freshness correction — direct User IR transfer path (2026-11-05)

- The verified User / Third Party IR uploader in \`www/ir-transfer.js\` sends its 75 frames through \`conn.output.send()\`, not the editor's central \`midiSend()\` function. Therefore the previously added outgoing-09/10/11 invalidation hook did not observe that separate path.
- After all 75 ACKs succeed for \`plan.target === 'user'\`, the uploader now emits an internal \`mg30-user-ir-write-complete\` event. The preset cache listens and conservatively marks every cached preset slot stale.
- Collection transfers (6A/6C/6B) do not emit this User event and do not invalidate preset snapshots through this new hook. Packet bytes, ACK expectations, request order and the existing User/Collection transfer implementation remain unchanged.
- Added an integration assertion for the User-versus-Collection event distinction. This is cache-freshness bookkeeping only; it does not change either IR protocol path or the Collection slot mapping.
