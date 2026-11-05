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
