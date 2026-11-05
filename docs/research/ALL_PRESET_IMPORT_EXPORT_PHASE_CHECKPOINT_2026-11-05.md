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

Implemented on `feature/all-preset-import-export` after auditing the difference between QuickTone's pre-populated manager and MG30 Studio's on-demand readback.

### Cache model

- Added `www/mg30-preset-manager-cache.js`, a session-scoped 128-slot cache. It accepts only a complete readback: three correctly indexed 0C/02 scene replies, plus either an explicit marker-0/no-resource state or a marker-1 resource with a name, 2,048 finite Float32 samples and 600 in-range UInt16 curve values.
- Entries are marked `fresh` or `stale`. The manager reports fresh/stale/missing counts, returns an ordered full bank only when all 128 slots are fresh, and deep-copies typed arrays on storage and retrieval.
- Cache is memory-only and scoped to the current USB-MIDI connection session. A new session/disconnect clears the entries; no prior-session data can silently be exported.
- This is a read-through cache, not yet a byte-for-byte clone of QuickTone's complete background connection manager. The recovered QuickTone scheduler's upstream 0B/02 trigger/pacing and all accompanying metadata/resource acquisition must be proven before automatically scanning all slots on connection.

### Export behavior

- Export Single now prefers a fresh cached slot. On a cache miss/stale slot it uses the existing proven `MG30PresetExportBridge.readSingle()` path, then stores the complete readback. A slot without IR remains ineligible for Export Single, as before.
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

- Static search found `writeHardwarePreset()` sends its captured `0B/01` scene frames and final `07/01` command directly through `midiOutput.send()`, outside the central `midiSend()` queue.
- The cache invalidation helper is now called with the exact frame immediately after each of those existing sends. Frame bytes, order, ACK handling and readback verification are unchanged; the affected preset entry is only marked stale.
- Export Single explicitly rejects a cached marker-0/no-resource entry with a clear User IR resource message before invoking the existing serializer. The resource-bearing Single Export path and device readback implementation remain unchanged.
- Added an integration assertion for invalidation in the direct Save-to-device path. This correction changes no NAM, User/Third Party transfer packet, Collection command, MIDI/CC mapping, or USB-MIDI transport behavior.


### Follow-up freshness correction — direct User IR transfer path (2026-11-05)

- The verified User / Third Party IR uploader in `www/ir-transfer.js` sends its 75 frames through `conn.output.send()`, not the editor's central `midiSend()` function. Therefore the previously added outgoing-09/10/11 invalidation hook did not observe that separate path.
- After all 75 ACKs succeed for `plan.target === 'user'`, the uploader now emits an internal `mg30-user-ir-write-complete` event. The preset cache listens and conservatively marks every cached preset slot stale.
- Collection transfers (6A/6C/6B) do not emit this User event and do not invalidate preset snapshots through this new hook. Packet bytes, ACK expectations, request order and the existing User/Collection transfer implementation remain unchanged.
- Added an integration assertion for the User-versus-Collection event distinction. This is cache-freshness bookkeeping only; it does not change either IR protocol path or the Collection slot mapping.

## Read-through preset manager cache — Build #551 passed (5 November 2026)

### Source and CI

- Working branch: `feature/all-preset-import-export`.
- Application source commit: `9d8c12ea79082a27fb9c3cc5f8939ca3dfecc8e9`.
- GitHub Actions run **#551**: `42027102597`; conclusion **success**.
- Protocol regression suite: **253/253 passed, 0 failed**.
- Android initializer syntax validation: passed.
- Capacitor Android project generation / USB audio plugin registration: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL** (1m 28s).
- Artifact upload: passed.

### APK artifact verification

- Artifact ID: `13414237907`.
- ZIP size: **4,211,213 bytes**.
- ZIP SHA-256: `cebcd7d07973bfd75f23c65f64c2064cdd7a18b16b7705652dede76c6993aa5b`.
- Extracted APK: **4,587,704 bytes**.
- APK SHA-256: `666feea50d665fd16eaaf626f61d9573cd5331cbaebdf3db198ba99412dd482e`.
- Downloaded artifact ZIP and extracted APK both pass ZIP integrity testing.
- Packaged Android web bundle inspection confirms the cache manager and User IR completion event are present (`MG30PresetManagerCache`, `cacheHits`, `mg30-user-ir-write-complete`, and the marker-0/no-resource guard).

### Manual device validation still required

This build is CI- and package-verified only. It has not been confirmed installed or tested on the user's original MG-30 Gen2 FW 6.0.x.

- Install Build #551 and connect the pedal.
- Export one resource-bearing slot twice in the same app/USB session. The first export should populate the cache through the existing readback; the second should show the session-cache status and avoid another readback.
- Run Export All. On the first run it reads missing/stale slots and warms the 128-slot cache. Run Export All again without changing presets or uploading User IR: it should report 128 cache hits and should not cycle the pedal through Program Changes.
- Change a preset parameter or save a preset to the pedal, then export that slot again; the stale entry must be read back again.
- Complete a User / Third Party IR upload, then export again; the cache must be re-read. Collection IR import/use must remain on its separate path and must not emit the User-IR cache invalidation event.
- Disconnect/reconnect USB-MIDI or restart the app. The session cache must be empty again; no prior-session snapshot may be reused.

### Scope / safety boundary

- The cache is intentionally a read-through session manager, not yet a full reproduction of QuickTone's automatic connection-time manager synchronization. No automatic 128-slot preset switching/readback is started when connecting.
- First Export All in a fresh session may still read all slots that have not already been cached by Export Single. Later Export All can serialize from the 128 fresh cached records.
- No NAM protocol, User/Third Party IR frame bytes, IR Collection packet mapping, MIDI/CC mapping, Signal Chain protocol, preset import packet ordering, or native USB-MIDI transport behavior was changed. The only IR-uploader addition emits an internal completion event after all 75 User-path ACKs succeed; Collection does not emit that event.
- Do not describe cache speed or hardware behavior as physically validated until the user's on-device test above is completed.


## Export All native transfer — chunked staging revision (5 November 2026)

User re-tested the prior build and reported the same result: the pedal was scanned preset-by-preset, but the saved All Preset file still showed 0 bytes. The prior SAF verification path was not confirmed to fix the user's device.

Source review separated two behaviors:
- The first Export All still reads each uncached slot from the MG-30. That is currently expected: the session cache is populated by readback and does not yet reproduce QuickTone's connection-time synchronization.
- After all 128 records pass validation, JavaScript serializes a Uint8Array of exactly 0x135700 bytes. The Android native path previously passed the entire approximately 1.7 MB Base64 string as one Capacitor plugin-call payload before staging it.
- Capacitor / Android documentation warns that large payloads across the WebView/native bridge can cause memory and transfer issues. This makes the single large plugin call a plausible failure boundary, but the user's new report alone does not prove it was the root cause.

Revision on feature/all-preset-import-export:
- www/mg30-preset-export.js now passes the binary Uint8Array to the local native wrapper instead of constructing and sending a full-file Base64 string.
- www/native-midi.js sends the file in sequential 48 KiB raw chunks. Every chunk is Base64-encoded separately, awaited, and checked against the native ACK offset/byte count.
- native-android/MG30MidiPlugin.java adds beginPatchExport, writePatchExportChunk, finishPatchExport, and abortPatchExport. It validates allowed total sizes, exact sequential offsets, 64 KiB maximum native chunk size, cumulative received bytes, staged file length and final file sync before opening ACTION_CREATE_DOCUMENT.
- The final staged file is renamed to the existing callback-ID-derived persistent path. The existing SAF copy, destination readback byte-count verification and CRC32 check remain in place.
- Existing savePatch method remains for compatibility; NAM/model saving and MIDI transfer methods are unchanged.
- Added tests/native-patch-export-chunks.test.js for the chunk transfer contract.

Protected areas not modified:
- No MG-30 SysEx request/reply bytes or Program Change sequencing.
- No NAM transfer path.
- No User / Third Party IR transfer frames.
- No Collection IR 6A/6B/6C behavior or mapping.
- No existing MIDI/CC mappings.
- No preset import/write path and no single-preset serialization format.

Validation status:
- The change has been committed to the working branch and awaits GitHub Actions results.
- No claim of physical Android SAF success is made yet. After CI succeeds, the resulting APK must still be tested on the user's phone; success must report exactly 1,267,456 bytes and a non-empty CRC32. Then import that exact file and verify the All Preset parser sees 128 records.
- If the next device test still yields 0 bytes, capture the complete Export All status/error text. The chunk ACKs and native staging guard will now distinguish payload transfer/staging failure from final SAF destination write/readback failure.


### Chunked native patch export — Build #555 passed (5 November 2026)

- CI source commit: `27c79da61280496907a1326acacfbe733f2b396d` (chunked native transfer plus regression test).
- GitHub Actions run #555: `42033156927`, conclusion **success**.
- Regression tests: **256 passed, 0 failed**.
- Android initializer syntax, Capacitor Android generation, Gradle `assembleDebug`, and APK artifact upload all succeeded. Gradle reported `BUILD SUCCESSFUL`.
- Artifact ID: `13417650787`; ZIP size 4,213,392 bytes; ZIP SHA-256 `c4e9b0dce4b585c8b6041af5c4406a21cdb02ff0c8157df81c80237089019e38`.
- Extracted APK: 4,590,444 bytes; SHA-256 `6d5d1280865ccf6ad4618528efc30d4b3df3749c4594d7150511db02fc0f87e2`.
- Downloaded ZIP passed `unzip -t`; extracted APK exists and matches the build artifact.
- This build result is CI/package validation only. The new chunked file transfer has not yet been physically tested on the user's Android device. Acceptance criteria remain: Export All status reports 1,267,456 bytes, Android's verified file has the same byte count and CRC32, and Import All parses 128 records.


## Import All: remove sample-bank 27-resource limit (5 November 2026)

User tested the chunked Export All build. The export file was recognized by Import All, but the UI rejected starting the transfer with: `Capture QuickTone menunjukkan 27 preset dengan resource IR; file ini memiliki 128. Batch ditolak sebelum perangkat disentuh.` The UI simultaneously displayed `128 preset siap diimpor · 27 preset membawa resource IR`; that displayed 27 was hard-coded and not the parsed count.

Source audit confirmed three fixed sample-bank assumptions:
- `www/mg30-preset-all-import.js` rejected resource counts other than 27, even though `parseMG30AllPresetPatch()` already records actual resource markers and its comment describes the count as bank-dependent.
- `www/index.html` native `importAll()` independently required exactly 2,412 steps and 27 resource groups.
- `www/mg30-preset-import.js` displayed a fixed 27-resource label and a fixed 2,412-frame progress total.

Changes:
- Import-plan frame count is now computed as `387 + 75 × actual resource-program count`: 3 session open/finish/close frames, one 75-frame 09/10/11 transaction for each resource-marked preset, and 384 scene writes.
- The sample bank with 27 resources remains exactly 2,412 frames; the user's reported 128-resource count plans for 9,987 frames.
- Native bridge validation now checks the actual resource index list (unique, sorted, 0–127), matching 09/01 count, 64 waveform frames and 10 curve frames per resource, exactly 384 scene writes, expected total length, and first/last transaction markers. It no longer assumes 27 groups or 2,412 frames.
- Progress/error denominators and completion ACK messages now use the computed plan total.
- The UI reports `parsedAll.resourcePrograms.length` rather than a literal 27 and uses the actual plan length for the progress dialog.
- Tests retain the original 27-resource capture fixture and add 26-, 0-, and 128-resource plan checks, plus native bridge/UI dynamic accounting assertions.

Protocol interpretation / caution:
- The supplied QuickTone Import All capture demonstrates one 75-frame resource group (09/01 + 64 × 10/01 + 10 × 11/01) repeated for each of the 27 resource-marked records, followed by all 384 scene writes and the final control frames. The updated implementation generalizes that same captured per-resource group sequence to the actual number of records parsed from the file; it does not change any frame bytes or reorder the phases.
- The 128-resource extension is logically consistent with the parser's 0–127 resource index range, but it has not yet been physically validated against original MG-30 Gen2 FW 6.0.x. A run with 128 IR groups is significantly longer and writes all 128 User/Third Party resource indices as well as all 384 scenes. The user must ensure a full backup and confirm the device firmware before proceeding. Do not test this against a valuable bank without a restorable backup.
- No NAM path, Collection 6A/6B/6C mapping, existing MIDI/CC mapping, single-preset import, or User/Third Party IR packet bytes were modified.

Validation status:
- Source changes and regression tests have been committed to `feature/all-preset-import-export`; the latest Actions build outcome is still pending at the time of this checkpoint.
- Physical Import All has not yet been tested after this change. Do not claim success until all ACKs and 128 × 3 scene readbacks pass on the original Gen2 pedal.


### Dynamic Import All — Build #561 passed (5 November 2026)

- GitHub Actions run #561: `42038396891`, source commit `0ddf7b92dd91a0d4b81adf0c64eb8a24dec0d7d8`, conclusion **success**.
- Regression tests: **259 passed, 0 failed**.
- Android initializer validation and Capacitor generation passed; Gradle `assembleDebug` reported `BUILD SUCCESSFUL` in 1m 49s; artifact upload succeeded.
- Artifact ID `13419318026`; ZIP size 4,213,753 bytes; SHA-256 `f63e52bcd373a8ff6be5c05a2152ebca71a3d06c29e05673039250ddebde8645`.
- Extracted APK size 4,590,868 bytes; SHA-256 `7dc9c7c1fd1a20ef1476f46a0fe7ee0eab01779031f8d13cf2d806842c26421d`.
- Downloaded ZIP passed `unzip -t`. APK bundle inspection confirms the compiled Web assets contain the dynamic resource count and `387 + 75 × N` plan calculation.
- This is CI/package verification only. No physical Import All transfer has yet been tested after removal of the 27-resource/2,412-frame gate.


## Physical report: frame-count mismatch between MG30 Studio and QuickTone Import All (5 November 2026)

User supplied two screenshots of Import All in progress:
- MG30 Studio screenshot: `Waveform IR · 230/9.987 frame diakui perangkat.`
- QuickTone screenshot: `Waveform IR · 38/2.412 frame diakui perangkat.`

The frame totals exactly match the two transaction shapes:
- `2,412 = 387 + 27 × 75`: the captured QuickTone bank with 27 resource-bearing presets, 384 scene writes and 3 control frames.
- `9,987 = 387 + 128 × 75`: the newly generalized app transaction treats all 128 records as resource-bearing.

This proves the app and QuickTone are planning different resource-group counts. It does not by itself prove the screenshots imported the same exact `.mg30patch` binary or the same bank. If the same file was selected in both, the difference is a serious discrepancy requiring binary comparison before another destructive import attempt.

Important evidence:
- `docs/research/MG30_IMPORT_ALL_PRESET_USB_CAPTURE_2026-11-05.md` shows the captured Import All sends exactly 27 `09/01` records at program indices `0,1,2,3,6,7,8,9,10,11,12,13,14,15,17,22,27,31,80,81,82,83,91,109,110,111,115`, then 64 waveform + 10 curve frames per resource, followed by 384 scene writes.
- The supplied original QuickTone All Preset fixture was validated as 128 records with marker distribution 101 = 0 and 27 = 1.
- QuickTone disassembly section `preset-wide 09/00 name scan and sync order` confirms a 09/02 response is followed by a manager resource-presence test; only when that test succeeds does QuickTone start 10/00 and 11/00 reads. Thus the app's current simpler rule (non-empty parsed 09/02 name => resource marker 1) is not yet proven equivalent to QuickTone's presence test.
- The dynamic 128-resource planner was added to remove a hard-coded fixture limit, but this physical result now shows its input resource count must itself be validated. Do not treat all 128 markers as correct merely because the parser and planner can process them.

Safety / next steps:
- Do not initiate another Import All until the app-exported `.mg30patch` is inspected. Import All is destructive and the 9,987-frame plan would write 128 User/Third Party IR resource indices as well as all 384 scenes.
- Do not abruptly unplug USB during an active transaction; let the current device operation become stable before making another change.
- Request the exact MG30 Studio-exported `.mg30patch` file. Ideally also obtain the QuickTone-exported All Preset file from the same unchanged pedal bank, or confirm whether the two screenshots selected the exact same binary. Compare all 128 record markers, resource names, scene bytes and file hashes.
- Only after correlating the app's markers with the QuickTone 27-index fixture and the resource-presence predicate should Export All detection be corrected. Keep the dynamic planner, but gate it on a verified marker list; don't replace the 27 constant with an unconditional 128 interpretation.
- No source or APK change was made in response to these screenshots. NAM, User/Third Party IR transfer, Collection 6A/6B/6C mapping, and existing MIDI/CC mappings remain untouched.


## Direct binary comparison: MG30 Studio export vs QuickTone All Patch (5 November 2026)

User supplied two files and identified their order:
1. Studio: `MG30_All_Preset (1).mg30patch`, size 1,267,456 bytes, SHA-256 `a37e87028a75da1a2dd2ef1f4042d8e72c881fec963e63d2f1366a2ef55ac463`.
2. QuickTone: `MG30AllPatch.mg30patch`, size 1,267,456 bytes, SHA-256 `ea502ba24001d363c21950ed676bf77271026ac30ced4d10241168e10fe0b22a`.

Both files have the expected 128 × 0x26AE record size and sequential ordinals. Direct byte inspection used marker offset +0x1AE, 32-byte IR name +0x1B2, 2,048 Float32 samples +0x1FE and 600 UInt16 curve values +0x21FE.

### Studio file marker / resource analysis

- Studio's resource marker is incorrectly `1` for all 128 records.
- Exactly 87 of those 128 records contain the literal 8-byte name `--------`.
- Every one of those 87 placeholder records has the same non-resource readback pattern: 2,047 waveform samples are zero, the final sample is 1.0, and all 600 curve values are 152. This is not a meaningful attached IR payload. The exporter had mistaken the non-empty placeholder string for a real resource name, then issued unnecessary 10/00 and 11/00 reads and serialized marker 1.
- The other 41 Studio records have real printable resource names, 2,048 finite Float32 samples, and 600 curve values in the valid 0–305 range. These must be preserved as resource-bearing records unless a separate bank comparison disproves them.
- The 41 actual resource indices are: `0,1,2,3,6,7,8,9,10,11,12,13,14,15,17,22,25,27,31,54,55,57,58,60,70,71,75,80,81,82,83,91,108,109,110,111,112,114,115,118,122`.
- The 14 real, valid resource entries present in Studio but absent from the supplied QuickTone file are `25,54,55,57,58,60,70,71,75,108,112,114,118,122`. They contain nonzero, finite waveform data and valid curves. Do not discard these 14 merely to force the old QuickTone sample count of 27; the files may represent different pedal-bank states.

### Exact common-data comparison

- The 27 QuickTone marker-1 resource records have exactly matching resource names, waveform bytes and curve bytes in the Studio file: **27/27 exact**.
- Their scene bytes match at 26/27 indices; the only exception is program 82.
- Across all 128 records, scene bytes differ only at indices 72, 73, 74, 75 and 82. Each of those five records has exactly three differing bytes total: one differing byte in each of its three scene payloads.
- These 5 scene deltas and the 14 added resources show that the two files are not byte-identical bank snapshots. The exact date/state difference is not established. Keep the 14 valid Studio resources.

### Root cause and code correction

- `www/mg30-preset-read.js` previously used `Boolean(resourceName)` after decoding 09/02 metadata. The literal `--------` therefore evaluated as `true` even though it is QuickTone's no-resource placeholder.
- Updated the parser to normalize the exact `--------` sentinel to `resourceName: ''` and `hasResource: false`; ordinary real names remain unchanged. Strict Single Export still rejects resource-free slots; Export All allows them and marks them resourceMarker 0.
- Updated the 09/02 readback branch in `www/index.html` to use the explicit `metadata.hasResource` boolean. For a placeholder/no-resource slot it now returns marker 0 and exits before issuing any 10/00 or 11/00 waveform/curve reads.
- Added parser regression tests for empty metadata, the exact eight-hyphen placeholder, and a different real hyphenated name; added a bridge integration assertion for explicit `hasResource` gating.
- The dynamic Import All planner remains intentionally bank-dependent. For the exact Studio file as uploaded, after correcting the 87 false markers, the proper resource group count is 41 and expected plan length is `387 + 41 × 75 = 3,462` frames. The old QuickTone file remains 27 resources / 2,412 frames. A blanket hard-coded 27 or 128 is incorrect.
- No changes to NAM, User/Third Party IR write packet format, Collection 6A/6B/6C behavior, MIDI/CC mapping, or captured All Import frame encoding/order.

### Validation status

- Parser source and regression tests have been committed to `feature/all-preset-import-export` (commits `86c5c38d57bd3bdf93033a67451d35bfeb1ffee5`, `bdc029e7f0c6a348c060824cd40bc1eb7bb729b9`, `0a15ae047899c24c097cf2d3dd9d3c9f3e0a1955`, and `e110bd6e01eedfadfabdda7d83ea38ebbdf5bf92`).
- Build #563 passed JS/protocol tests but its Gradle step failed on a remote Gradle distribution HTTP 504, unrelated to source compilation. Build #564 is running for the final combined commit.
- No physical device import of the corrected 41-resource file has been verified. The user should not start another Import All until the corrected APK is installed and the device bank is backed up. The expected progress total for this Studio file should be 3,462, not 9,987.


### No-resource placeholder fix — Build #565 passed (5 November 2026)

- GitHub Actions run #565: `42045775697`, source commit `e110bd6e01eedfadfabdda7d83ea38ebbdf5bf92`, conclusion **success**.
- Regression tests: **262 passed, 0 failed**.
- Android initializer syntax validation and Capacitor generation passed; Gradle `assembleDebug` reported `BUILD SUCCESSFUL in 1m 34s`; artifact upload succeeded.
- Artifact ID `13425335342`; ZIP size 4,213,770 bytes; ZIP SHA-256 `8f48a25bb03fe6b9684cdbd5637dbad4e8e7bac140acae2713938cffb770cb4c`.
- Extracted APK size 4,590,892 bytes; SHA-256 `f4d9a02845e568bfec377bb0742f3fd397969bd398e4a086a80a64a25a093c2c`.
- Downloaded artifact passed `unzip -t` and contained exactly `app-debug.apk`; extracted APK exists in `/mnt/data/MG30-Studio-No-IR-Sentinel-Fix.apk`.
- A corrected copy of the user's Studio export was also generated for test reuse: `/mnt/data/MG30_Studio_Export_Corrected_41_IR.mg30patch`, 1,267,456 bytes, SHA-256 `a537ccd806a4671353cf16d337cda85f45a0637138d20f4157af8fada0a8742c`. It changes only the marker and resource section of the 87 exact `--------` placeholders, setting marker 0 and zeroing the resource area. It preserves all 384 scene payloads and all 41 resource-bearing records byte-for-byte.
- The corrected bank contains 41 resource groups and plans 3,462 frames. This is a file-level correction and regression/build validation; no physical pedal import of the corrected 41-resource bank has yet been confirmed.

## QuickTone preset-manager connection synchronization — Build #576 passed (5 November 2026)

User tested the prior Export All build and reported that it still scanned the pedal from the first preset one by one. The user confirmed Import All now succeeds, with the corrected Studio bank showing **3,462 acknowledged frames**.

### Root cause and revised architecture

- The prior cache was a read-through cache only: it began empty on USB connection, and Export All filled it by calling the live Single Export read path for missing slots. This made Export All visibly walk the bank from the first preset.
- QuickTone 2.6.7.16 disassembly shows a separate upstream preset-manager synchronization routine. It fills the in-memory manager by indexed scene/resource reads; the Export All click handler serializes the already-populated manager rather than initiating the bank acquisition itself.
- MG30 Studio now warms its session-scoped 128-slot manager cache after USB connection. The scene request selector is explicitly `0B/00`, expecting indexed `0B/02` replies for each of the three scenes. The existing readback routine then performs resource metadata discovery and only reads waveform/curve for resource-bearing slots. The target slot is carried in the indexed SysEx request; no Program Change loop is used.
- Export All now waits for this manager synchronization and then serializes fresh cached records. If a slot is still missing/stale, it is completed with the same indexed `0B/00` read path, not by selecting the preset on the pedal. Export Single retains its established `0C/00` path.
- The decoder/cache validation now accepts both validated `0B/02` manager replies and `0C/02` Single Export replies, while still checking exact slot index, scene index, response length and all 3 scene records.
- The manager cache remains session-only and is cleared on disconnect. Existing cache invalidation for preset writes, parameter/block changes and successful User/Third Party IR upload remains active.

### Android startup sequencing / protected paths

- Android connection startup also reads NAM slot names and automatically synchronizes the 24 IR Collection slots. Starting 128-preset synchronization concurrently would risk interleaving USB-MIDI requests.
- The Android manager warm-up is therefore gated until the NAM name scan and subsequent Collection sync complete. Export All waits on the same gate if the user taps it during startup.
- The Collection completion signal is internal coordination only; Collection packet bytes, 6A/6B/6C mapping and transfer behavior are unchanged.
- No NAM transfer commands, NAM model mapping, User/Third Party IR frame bytes, Collection transfer mapping, MIDI/CC mapping, preset import write frames, or USB-MIDI selection code were changed. No Program Change is emitted by the new indexed preset-manager read path.
- Original MG-30 Gen2 firmware 6.0.x remains the target; no MKII assumptions are introduced.

### Build #576 verification

- Branch: `feature/all-preset-import-export`
- Source commit: `ad666179ba0df90a17ef173481026c84dfd8cc49`
- GitHub Actions run #576: `42064909061`, conclusion **success**.
- Protocol/regression tests: **265 passed, 0 failed**.
- Android initializer syntax validation and Capacitor Android generation passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL in 1m 40s**.
- Artifact: `MG30-Studio-debug-APK`, ID `13433057079`, ZIP size 4,214,376 bytes, SHA-256 `64d704b4b077fa648dfc1c24686e10709347601c30234be356f0ce5b0585b989`.
- Extracted APK: `MG30-Studio-ExportAll-debug.apk`, size 4,591,856 bytes, SHA-256 `9af87cb57e48f375f798009100f8904857cf65323026f2e7038e98c073194240`. The artifact ZIP passed `unzip -t`.

### Physical test still required

This is automated test/build verification, **not** yet physical-device validation of the new 0B/00 indexed manager synchronization. Install the Build #576 APK and test on the original MG-30 Gen2 FW 6.0.x:
1. Connect USB-MIDI and allow NAM name scan and Collection sync to finish.
2. Confirm the preset-manager status progresses through indexed bank synchronization and reaches 128/128.
3. Tap Export All. It should serialize from the completed manager cache, report 128 cache hits / 0 live readbacks, and should not start another 01A-to-32D scan.
4. Confirm the saved All Preset file is 1,267,456 bytes and reparses as 128 records. Compare the 41-resource bank count where applicable.
5. Verify NAM import, User/Third Party IR import, Collection IR import and existing MIDI/CC controls remain operational.

If the cache warm-up fails or stalls, capture the exact status/error text and diagnostics before retrying. Do not change firmware, MIDI mappings, NAM, or Collection settings during this test.