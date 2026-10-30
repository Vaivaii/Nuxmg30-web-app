# MG-30 Gen2 Preset Import/Export — Reverse-Engineering Notes
Date: 2026-10-30
Target: original NUX MG-30 Gen2, QuickTone Windows v2.6.7.16. This note does not apply the MKII implementation.

## Confirmed from the QuickTone executable

The supplied `NUX_QuickTone_V2.6.7.16_Windows.zip` contains a Windows QuickTone 2.6.7.16 executable. Static string/RTTI inspection establishes:

- The original MG-30 uses the preset file extension `.mg30patch`.
- The export dialog's filter is `*.mg30patch`, with title `Export the Preset data.`
- The import dialog uses the same `*.mg30patch` filter, with title `Import the Preset data.`
- The export dialog contains the suggested filename `MG30AllPatch.mg30patch`.
- The executable contains separate model-specific UI classes `NuxPresetExportPanelMG30` and `NuxPresetImportPanelMG30`, distinct from the corresponding `...MG30MK2` classes.
- MG-30 transmission code has separate `exportPresetLogic` and `exportAllPresetLogic` entry points. This is evidence that QuickTone distinguishes a single-preset export path from an all-presets export path.

Useful PE string offsets (for reproducible follow-up analysis): `MG30AllPatch.mg30patch` at file offset `0x8a7458`; `.mg30patch` at `0x8a7470`; export filter/title around `0x932700`; import filter/title around `0x952cc4`.

## What is not established yet

The executable strings and file dialogs do **not** by themselves reveal the on-disk binary schema. We have not confirmed:

- the byte layout and record length of one original-MG30 preset file;
- whether the file is a raw SysEx dump, a wrapped representation, or a model-specific container;
- headers, magic bytes, record IDs, preset-slot encoding, version fields, checksums, or integrity rules;
- the exact relationship between the single-preset file and `MG30AllPatch.mg30patch`.

Do not implement a guessed `.mg30patch` serializer/parser from the extension or filename alone.

## Capture review

The available `deluxecapt.pcapng` is a short USBPcap capture (24 Enhanced Packet Blocks). It shows USB MIDI interface enumeration/configuration and a few MIDI Control Change messages, but no complete preset-export/import SysEx transaction and no file payload. It is therefore not the missing preset export capture.

The other available captures are already categorized as IR User/Collection or NAM transfers. They must remain separate: do not reuse IR `6A/6B/6C` or NAM `58` transfer framing as a preset format.

## Existing MG30 Studio hardware path (retain unchanged)

`www/index.html` already contains the live preset-buffer and hardware-write primitives:

- `readPresetParts(0x0C, program)` reads all three scene parts from the active MG-30 Gen2 preset path.
- `writeHardwarePreset(program, parts)` writes three parts using `0B/01`, waits for per-part `0B/03` ACKs, sends the `07/01` finalization command, waits for `07/03`, then reads back using `0B/00` and compares each payload byte.
- `saveToDevice()` uses this existing write path. Copy Scene has its own verified `0C/01` → `0C/03` path and payload read-back; do not merge or alter it during preset-file work.

The Backup & Restore page still exports/imports local draft JSON only. It explicitly labels this as not a hardware dump. Do not present this local draft JSON as a QuickTone preset file or a pedal backup.

## Next evidence required

To complete the QuickTone-compatible file-format milestone without guessing, obtain:
1. One file exported by QuickTone v2.6.7.16 for the original MG-30 Gen2 (`.mg30patch`; ideally first export one preset, then export all presets if QuickTone offers both).
2. A USBPcap capture beginning before pressing QuickTone Export and ending after the file is saved; for import, a second capture around the import and destination-slot confirmation is useful.
3. Record whether the source pedal is original MG-30 Gen2 firmware 6.0.x, not MKII.

Once a real sample is available, inspect its length, byte distribution, recurring record boundaries, candidate headers/checksums, and correlate those records with the matching SysEx transfer. Then implement a parser with strict size/header/slot validation and use the existing ACK/read-back guarded hardware write path.

## Status

Goal 3 is active. The QuickTone extension, default all-preset filename, model-specific import/export panels, and separate export entry points are confirmed. Binary structure and wire-level transfer remain unverified. No preset import/export source code was changed in this research step.

## Additional static disassembly findings (2026-10-30)

These are code-path observations from the original-MG30 implementation in QuickTone v2.6.7.16. Function addresses below are PE virtual addresses, not file offsets. They narrow the format, but do not yet establish a safe round-trip schema.

- The block at VA 0x004AB710 is associated with the all-preset export dialog path (it references MG30AllPatch.mg30patch). It allocates a 0x135700-byte output buffer, iterates a manager count field at object offset +0x640, and advances the output record pointer by 0x26AE for each item. Its write helper at VA 0x004B56A0 passes 0x135700 as the byte count to the file buffer.
- The value 0x135700 equals 128 × 0x26AE (1,267,456 bytes). This strongly suggests 128 fixed-stride internal/export records, each 0x26AE bytes, for that all-export path; treat the count/record interpretation as a static-code inference pending a real exported sample.
- The single-file reader helper at VA 0x004B5750 checks for an input length of exactly 0x2590 (9,616 bytes), then constructs an internal 0x26AE-byte record and populates its scene/audio-related fields.
- The all-file reader helper at VA 0x004B5A20 checks for an input length of exactly 0x12C800 (1,236,992 bytes), loops 128 times with a source stride of 0x2590, and constructs an internal output buffer of 0x135700 bytes with destination stride 0x26AE.
- Arithmetic: 0x12C800 = 128 × 0x2590; 0x135700 = 128 × 0x26AE; the per-record difference is 0x11E bytes (total 0x8F00 bytes).

### Unresolved discrepancy — do not code around it

The all-export dialog path writes a 0x135700-byte buffer, while the all-file reader helper validates an input length of 0x12C800. The single-file reader expects 0x2590. It is not yet proven whether the all-export code block, helper pairing, conversion stage, or the exact panel callback has been interpreted completely. These differing lengths must be reconciled against a real .mg30patch sample before treating either stride as the on-disk format. Do not trim 0x11E bytes per record, add/remove WAV headers, or accept multiple sizes speculatively.

### What this disassembly adds

- Preset data is not simply an opaque copy of the three existing 0C scene read responses: QuickTone builds per-record structures and includes a separate audio/WAVE-related region in the internal representation.
- A potential 128-entry organization and candidate record strides now exist for comparison with a sample file, but header fields, slot numbering, version markers, checksums, and exact scene/audio offsets have not been validated.
- The exact wire transaction that exports/imports these preset structures is still not matched to a USBPcap trace.

Next action remains: compare an actual original-MG30 .mg30patch exported by QuickTone with the observed candidate lengths/layout, then correlate with a capture of the same export/import.

## Real .mg30patch samples received and compared (2026-10-30)

User supplied two original-MG30-format sample files for analysis:

- `1B DELUX DIST.mg30patch`: 9,902 bytes = `0x26AE`; SHA-256 `0b8f9fecb5150bfe5a96dfcf66f3a777b910cef2910bcaa3100f0fa990aaa67a`.
- `MG30AllPatch.mg30patch`: 1,267,456 bytes = `0x135700`; SHA-256 `ea502ba24001d363c21950ed676bf77271026ac30ced4d10241168e10fe0b22a`.

### Direct observations from the files

- The single-preset sample is exactly one `0x26AE`-byte record.
- The all-preset sample is exactly `128 * 0x26AE = 0x135700`; there is no remainder. It parses cleanly as 128 fixed-stride records.
- Each all-file record begins with a little-endian 32-bit sequential value from 0 through 127. Treat this as a record/slot index candidate; confirm exact pedal slot semantics against a matching import or export capture.
- The record at index 1 contains the preset name `DELUX DIST`, matching the single-preset filename and its first four bytes (`01 00 00 00`).
- The single sample and all-file record 1 share the first `0x1B2` bytes. The short label field at offset `0x1B2` differs: single sample `c414_cap_45_dc`; all-file record 1 `CHPBRIT412`.
- Both contain a `RIFF/WAVE` region beginning at offset `0x1D2`. The inspected sample's WAVE header declares PCM format, mono, 48,000 Hz, 24-bit, and a data size of `0x1800`. The all-file contains RIFF/WAVE regions in 26 of its 128 records; some observed records declare `0x2000` data size.
- The single sample and all-file record 1 are not byte-identical. Apart from the short label field, the WAVE sample data and the `0xCB0)-byte trailing region differ substantially. The meaning of the trailing region is not decoded.
- This establishes a real WAVE/resource-bearing record layout; it does **not** yet prove whether that resource field is an IR, a cab asset, NAM-related data, or another QuickTone audio resource. Keep the field semantically neutral until correlated with an import capture.

### Important correction to the earlier static-reader interpretation

The observed single file is `0x26AE` bytes, and the observed all-preset file is `0x135700` bytes. These samples therefore confirm the export-buffer stride/size inference (`0x26AE`, 128 records), but conflict with the previously traced reader-helper exact lengths (`0x2590` single and `0x12C800` all). This is now a concrete unresolved discrepancy, not merely a lack of sample data. Do not truncate/pad records by `0x11E`, and do not implement against the reader-helper size until its caller/callback pairing and conversion path are revalidated.

### Relation to the existing MG30 Studio preset-save MIDI path

Source review of `www/index.html` confirms the existing write primitive:

1. `readPresetParts(0x0C, program)` obtains three scene-part responses through `readSysExPart`.
2. `writeHardwarePreset(program, parts)` iterates all three parts. For each it clones the source response and changes only header bytes 3–6 to command/action/program/part = `0B 01 program part`; it sends the body as SysEx and waits for the corresponding `0B/03` ACK.
3. It then sends the existing `07/01` preset-finalization frame, waits for `07/03`, reads back the three parts on the existing `0B/00` path, and byte-compares each payload from byte 7 onward.
4. `saveToDevice()` already uses this guarded writer. Copy Scene keeps its separate `0C/01 → 0C/03` transaction and must remain untouched.

**Working hypothesis:** QuickTone import likely parses/converts one `0x26AE) file record into three scene-part buffers and then uses the same or a closely related hardware write transaction (`0B/01` per part, ACKs, `07/01) finalization). Reusing the established hardware transport layer is more likely than inventing a separate bulk-MIDI protocol. However, this is not yet proven: the .mg30patch record has WAVE/resource data and trailing bytes that are not simply the three already-observed scene SysEx payloads. The file-to-three-parts conversion still needs to be identified.

### Next validation

- Capture QuickTone import of the supplied `1B DELUX DIST.mg30patch` into a deliberately selected/ backed-up destination slot, with USBPcap started before opening the Import dialog and stopped after QuickTone reports completion.
- Capture or export a matching single-preset file from the same source slot if needed to cross-check the resource field and slot index.
- Correlate the import SysEx frames with the existing `0B/01 → 0B/03`, `07/01 → 07/03`, and read-back sequence. Record any additional resource/WAVE transfer commands separately.
- Do not change preset writer code, NAM, IR User/Collection, MIDI mappings, preset sync, or Copy Scene until the file conversion and import wire path are evidence-backed. No implementation or APK build was made in this analysis checkpoint.


## IR-resource correlation — stronger hypothesis, not yet proven (2026-10-30)

A cross-check against the existing MG-30 IR capture reports adds an important clue to the RIFF region:

- The sample's RIFF WAVE header is PCM, mono, 48 kHz, 24-bit. Its `data` size is `0x1800` = 6,144 bytes = exactly 2,048 mono 24-bit samples.
- The existing original-MG30 User IR capture uses 64 waveform frames of command `10/01`, with 32-sample address increments from 0 through 2016 (64 × 32 = 2,048 samples), followed by the separate `09/01` name and `11/01` curve phases.
- The separate Collection capture uses `6A/01` waveform, `6C/01` name and `6B/01` curve. Do not collapse these two workflows: User/Third Party and Collection remain distinct.
- The preset record's adjacent 16-byte label (`c414_cap_45_dc` in the single sample; `CHPBRIT412` in all-file record 1) looks like an associated resource name. Together with the matching 2,048-sample count, this **strongly suggests** the embedded WAVE is a cab/IR-like resource belonging to the preset.
- This is still a structural correlation, not proof of byte-for-byte identity or proof of which IR destination/workflow QuickTone uses. The `0xCB0)-byte trailer after the WAVE region remains undecoded. Its size can be factored as `0x800 + 0x4B0`; the `0x4B0) portion equals 600 × 2 bytes, which is an interesting size coincidence with the 600 meaningful curve values in the existing IR transfer analysis, but no offset map has been established.

### Updated import model to test

Do not model preset import as necessarily only three scene writes. The likely high-level workflow now has two data classes:

1. Restore or resolve the preset's associated audio/IR resource using the appropriate QuickTone resource path. Determine from capture whether it uses User/Third Party `10/09/11`, Collection `6A/6C/6B`, a dedicated resource command family, or no separate transfer for some records.
2. Convert the preset's scene/model data into three hardware scene-part buffers and write them through the existing `0B/01` → `0B/03` per-part ACK sequence, then `07/01` → `07/03) finalize and read-back verification—if the import capture confirms this writer path is reused.

The ordering and any resource-address/slot mapping are unknown. Keep all existing IR User/Third Party and Collection command families and their mappings untouched until the import capture establishes the correct destination and sequence. No implementation or APK build was made.


## Hardware import capture decoded — IR User followed by three preset parts (2026-10-30)

User supplied `presetimport.pcapng` (44,352 bytes). The USBPcap/USB-MIDI event packets were reconstructed into complete SysEx messages and correlated with their IN replies.

### Observed ordered transaction

The capture contains 78 SysEx OUT messages and 78 corresponding SysEx IN responses:

| Sequence | OUT | IN response | Count |
|---|---|---|---:|
| 1 | `09/01` | `09/03` | 1 |
| 2 | `10/01` | `10/03` | 64 |
| 3 | `11/01` | `11/03` | 10 |
| 4 | `0B/01` | `0B/03` | 3 |

All observed OUT messages have a matching IN response. The 10/01 group contains 64 fixed-size waveform messages; the 11/01 group contains 10 fixed-size companion-data messages. Their detailed payload fields should continue to be interpreted using the separately validated IR User capture map, not guessed from command names alone.

### Correlation with existing IR captures

- The standalone `ir user import.pcapng` capture has the same IR User command counts: 64 × `10/01`, 1 × `09/01`, 10 × `11/01`, with matching `10/03`, `09/03), and `11/03` replies.
- The order differs: standalone User import observed `10/01` × 64 → `09/01` → `11/01` × 10; preset import observed `09/01` → `10/01` × 64 → `11/01` × 10.
- Preset import does **not** show Collection's `6A/01`, `6C/01`, or `6B/01` command family. It therefore uses the IR User/Third Party family, not the Collection transfer family.
- The preset-import IR packets use a different header parameter from the standalone User capture (for example, the observed byte at message offset 7 is `0x78` in this capture versus `0x02` in the standalone capture). Do not hardcode either value or assume they are interchangeable; decode this field and its relationship to the resource/preset slot separately.

### Preset scene writes at the end of the same import

After all 75 IR-related OUT messages complete, QuickTone sends exactly three preset writes:

- `0B/01` with program byte `0x3C`, part byte `0`, followed by matching `0B/03`.
- `0B/01` with program byte `0x3C`, part byte `1`, followed by matching `0B/03`.
- `0B/01` with program byte `0x3C`, part byte `2`, followed by matching `0B/03`.

Thus the capture directly demonstrates this QuickTone import order: **IR User/Third Party resource transfer first, then all three scene parts for preset program 60 (0x3C)**. The `09/01` metadata message also contains `0x3C`; its exact field semantics remain to be decoded, but it is consistent with the associated resource being addressed in the context of the same destination preset.

### Important difference from MG30 Studio's current save helper

The capture contains no `07/01` finalization frame and no `07/03` response. A raw scan and reconstructed OUT-message list both confirm this command is absent from the supplied capture.

MG30 Studio's existing `writeHardwarePreset()` sends the same three `0B/01` part writes with per-part `0B/03` ACKs, **then additionally sends `07/01` and waits for `07/03`**, followed by read-back verification. Therefore:
- QuickTone and MG30 Studio share the observed three-part `0B/01` write/ACK family and program/part addressing.
- The complete QuickTone import sequence is **not byte-for-byte the same as** the current MG30 Studio helper: the latter's `07/01` step was not observed here.
- Do not remove `07/01` from the existing Save-to-device helper, because that is a separate working app path. Equally, do not blindly reuse that entire helper for QuickTone-compatible import until the role of `07/01` and any post-write readback/commit behavior is understood.

### Consequences for the implementation model

The import workflow is now proven to be a two-phase process:
1. Restore the associated audio resource through the existing IR User/Third Party command family (`09/01`, `10/01`, `11/01`) with all observed ACKs.
2. Write the three preset scene parts using `0B/01) and matching `0B/03) ACKs.

This supports the interpretation that the RIFF/WAVE content embedded in the .mg30patch record is a preset-associated IR/cab-like resource, but the exact mapping from file offsets to the IR messages and the meaning of the `0x78` parameter are not yet decoded. No Collection transfer, NAM `58` transfer, or `07/01` finalization was observed in this capture.

No source/protocol changes or APK build were made. Existing NAM import, IR User/Collection implementation, MIDI mapping, preset sync, and Copy Scene remain untouched.
