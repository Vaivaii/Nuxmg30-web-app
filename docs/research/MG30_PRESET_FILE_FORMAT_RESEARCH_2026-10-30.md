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


### Additional parameter and ACK details from the same capture

The command fields reinforce a possible resource-handle relationship, while leaving its semantics open:

- In standalone `ir user import.pcapng`, the `09/01` message's first field after the command is `0x01`; the waveform/curve messages carry `0x02) in their corresponding header parameter field.
- In `presetimport.pcapng`, the equivalent `09/01` field is `0x3C` (matching the preset program byte used by all three `0B/01` scene writes); the `10/01` and `11/01` messages carry `0x78`.
- Arithmetic: `0x78 = 2 × 0x3C`, just as `0x02 = 2 × 0x01` in the standalone User import. This may be a derived resource handle/address associated with the first `09/01` parameter, but that meaning is not proven. Do not treat `0x78` as a universal constant or as a confirmed physical IR slot number.
- The preset-import `09/01` frame is 62 SysEx bytes, same shape/length as standalone User import's name frame. Its parameter changes from `0x01` to `0x3C`; the following 64 waveform and 10 curve frames use the derived `0x78` header parameter.
- ACK status values follow the same phase completion pattern as the standalone IR User capture: `09/03` status 0; `10/03` status 2 for 63 intermediate frames and 3 for the final frame; `11/03` status 2 for 9 intermediate frames and 3 for the final frame. The three `0B/03` replies echo program/part and report status byte 1.
- The 64 waveform messages retain the known 32-sample address progression from 0 through 2016; the 10 companion/curve messages retain the known address progression from 0 through 576. This supports reuse of the validated User-family packet builder only after its target/handle parameter is exposed and validated.

These observations strengthen the interpretation that QuickTone binds the User-family IR resource address to the preset destination, but they do not reveal the exact function of the doubled handle field.


## Final single-preset byte mapping and capture cross-validation (2026-10-31)

This section supersedes the earlier provisional interpretations of the WAVE region and the 0x78 parameter.

### Corrected interpretation of the IR target parameter

- The `09/01` name frame in the supplied import capture carries destination program byte `0x3C`.
- The `10/01` and `11/01` frames encode the same integer program value 0x003C via the established 16-bit-to-three-7-bit-byte encoding: `encodeWord16(0x003C) = [0x00, 0x78, 0x00]`.
- Therefore `0x78` is the middle packed byte of the encoded destination value `0x3C`, **not** a separate doubled/derived handle. This corrects the earlier hypothesis in the first capture note. The field represents the same destination preset program parameter; do not call it a physical IR slot number.

### Corrected interpretation of RIFF/WAVE region

The record's WAVE header declares PCM24, mono, 48 kHz, but QuickTone's import payload is raw IEEE float32, not decoded PCM24:

- First 1,536 float32 values (6,144 bytes) occupy the apparent RIFF `data` region at file offset `0x1FE` through `0x19FD`.
- The next 512 float32 values (2,048 bytes) immediately follow the RIFF end at `0x19FE` through `0x21FD`.
- The contiguous result is exactly 2,048 float32 samples (8,192 bytes). Encoding the float bytes as 64 packets of `10/01` produces an exact match to all 64 captured waveform frame payloads.
- Do not feed this peculiar WAVE-shaped resource through a generic PCM24 decoder. The parser deliberately reconstructs the contiguous raw float32 block from the two file ranges.

### Confirmed complete single-record layout

| File offset | Length | Meaning / verified mapping |
|---|---:|---|
| `0x0000` | 4 | Little-endian source record ordinal (sample = 1; not destination slot) |
| `0x0004` | 426 | Three scene records, 142 bytes each; each contains 71 little-endian uint16 values |
| `0x01AE` | 4 | Resource marker; sample value = 1 |
| `0x01B2` | 16 | ASCII IR resource name; sample = `c414_cap_45_dc` |
| `0x01C2` | 16 | Padding in supplied sample |
| `0x01D2` | 0x182C | WAVE-shaped header and first 1,536 raw float32 values |
| `0x19FE` | 0x800 | Remaining 512 float32 values, just outside RIFF |
| `0x21FE` | 0x4B0 | 600 little-endian uint16 curve values (0..305 in the tested sample) |

The record ends at `0x26AE` (9,902 bytes). The three scene blocks encode to 213 bytes each with the captured uint16-to-three-7bit-byte mapping; all three scene write payloads match the capture exactly (213/213 bytes per scene).

The resource name encodes to the `09/01` name payload exactly. The 2,048 float32 values encode to all 64 `10/01` packets exactly. The 600 stored curve words match the 600 meaningful curve words decoded from the ten `11/01` packets. QuickTone's last curve packet contains eight nonzero words in the forty transmitted tail words beyond the 600-value file table; those bytes are not stored in the record and appear to be transient/stale data. The MG30 Studio builder deterministically zero-fills that unused tail and does not replicate memory residue.

### Final capture order and ACK behavior

Single-preset QuickTone import uses 78 OUT frames in this exact order:
1. `09/01` name once; ACK `09/03` status 0.
2. `10/01` waveform 64 times; ACK `10/03` status 2 for 63 frames and status 3 for the final frame.
3. `11/01` curve 10 times; ACK `11/03` status 2 for nine frames and status 3 for the final frame.
4. `0B/01` scenes 0, 1, 2; each ACK `0B/03` echoes the target program and part and has status 1.

Target program is the destination slot chosen in QuickTone (capture = 0x3C). The source record ordinal from the file is not used as the destination; the destination is supplied to all resource and scene frames.

No `07/01` finalization or `07/03` response appears in the QuickTone import capture. This is why the new importer has a separate QuickTone-compatible three-scene writer and deliberately does not call the existing Save-to-device `writeHardwarePreset()` helper (which retains its own 07/01 finalization and read-back contract). Existing Save-to-device remains unchanged.

### Implemented software path

- Added `www/mg30-preset-format.js`: strict parser for one 0x26AE record and builder for the exact 78-message QuickTone import plan. It rejects 128-preset batch files and unknown lengths/markers/WAVE metadata rather than guessing.
- Added `www/mg30-preset-import.js`: Preset-page UI for selecting, validating and importing a single .mg30patch into the currently selected hardware program.
- Updated `www/index.html`: isolated `MG30PresetImportBridge` uses the existing MIDI queue and ACK listener, sends 09 → 10×64 → 11×10 → 0B×3, validates each observed phase status, and never sends 07/01. It locks polling, preset selection, Save, scene switching, Copy Scene, parameter CC changes, signal-chain reorder, and CTRL/EXP while the operation is active.
- After the 3 preset write ACKs, the app performs a separate read-only `0B/00` readback and checks target program, part index, and all scene payload bytes. This is an MG30 Studio safety verification added after the captured QuickTone transaction; it is not claimed to be part of QuickTone's import sequence.
- IR resource delivery is addressed with the selected destination program parameter. The app preserves the exact User/Third Party `09/10/11` command family; Collection `6A/6B/6C` and NAM `58` code paths are untouched.
- Parser/frame fixture comparison (supplied `1B DELUX DIST.mg30patch` vs `presetimport.pcapng`): name frame matches; waveform 64/64; curve meaningful words 600/600 (nine full packets byte-exact and the final packet differs only in eight non-recorded stale tail words); preset scene payloads 3/3 byte-exact.
- At the time this implementation paragraph was written, validation was offline/file-and-capture only. The user subsequently reported that the single-preset import was physically tested and succeeded on the original MG-30 Gen2. The user did not separately report IR list visibility or an audio audition; do not infer those checks. Detailed recovery/retry behavior after an interrupted partial transfer remains pending.
- The 128-record file remains intentionally unsupported by the UI. Batch destination mapping and a matching batch-import capture are still required.
- Earlier QuickTone static-reader helper size expectations (`0x2590` / `0x12C800`) still conflict with the actual single/all export samples (`0x26AE` / `0x135700`). This disassembly/callback discrepancy remains unresolved; no trimming or padding is performed.

### Scope protection

No changes were made to NAM import, IR Collection commands, Collection mapping, MIDI parameter map, preset synchronization read logic, signal-chain mapping, Copy Scene payload/ACK path, or the existing Save-to-device `07/01` writer. The importer sets a temporary busy lock around its own transaction only.


## Goal 3 — single-preset export serializer and batch-file inventory (2026-10-31)

### Single-preset export work completed offline

- [x] Add inverse decoder for hardware scene read replies in www/mg30-preset-format.js: decodeMG30PresetSceneReply() validates the 220-byte 0C/02 body, program byte, part index, and reconstructs 71 packed uint16 words into the 142-byte little-endian scene record.
- [x] Add strict serializer buildMG30SinglePresetPatch() and convenience buildMG30SinglePresetPatchFromReplies(). The serializer writes the 0x26AE-byte Gen2 single-record layout and requires all three scenes, a 1–16 byte printable ASCII IR resource name, 2,048 finite float32 samples, and 600 curve words in range. It refuses to generate a purported QuickTone file when the associated IR resource is missing.
- [x] Expose the export decoder/serializer through the MG30PresetFormat registry.
- [x] Offline reconstruction test against supplied 1B DELUX DIST.mg30patch: reconstructed 9,902-byte output is byte-for-byte identical to the sample; SHA-256 remains 0b8f9fecb5150bfe5a96dfcf66f3a777b910cef2910bcaa3100f0fa990aaa67a. This is a local format/serializer test, not a pedal hardware export test.
- [ ] Do not yet add/enable an Export .mg30patch UI. The current app reads the three preset scene parts but www/ir-transfer.js implements IR uploads and Collection metadata/name reads; no verified readback sequence for User IR waveform samples and curve data is currently available. An export that writes scene data but fills the IR block with zeros or stale cached values would be incomplete and must not be presented as a compatible QuickTone preset.
- [ ] Capture a real QuickTone single-preset export with USBPcap running from before the Export action until the file has been saved. Supply both the resulting .pcapng and the matching exported .mg30patch; select a source preset whose attached IR name/audio resource is known. Use this pair to identify scene-read and IR-resource-read commands, ordering, ACK behavior, and any export-time conversion.
- [ ] After the read protocol is validated, implement the hardware readback bridge, add the UI, compare exported bytes against QuickTone's matching file, then import the exported file into a safe test slot and verify three-scene readback plus resource data. Do not modify the working single-preset importer or the existing Save-to-device writer while adding export.

### Batch .mg30patch file inventory — evidence for the next import phase

- [x] Reinspect supplied MG30AllPatch.mg30patch: file size is 0x135700 (1,267,456 bytes) and divides exactly into 128 fixed-size 0x26AE records. The leading uint32 LE record ordinal runs 0–127.
- [x] Inventory resource marker at 0x1AE: 101 records have marker 0 (no resource marker), 27 have marker 1.
- [x] Of the 27 marker-1 records, 26 contain a RIFF/WAVE header at 0x1D2. The remaining marked record is ordinal 91: it has resource name 412-MRSHLL77-G12 but no standard RIFF/WAVE header at that offset. Do not force it through the single-record parser.
- [x] The 26 standard WAVE records include two structural variants: 15 records use RIFF size 0x1824, PCM format code 1, mono/48 kHz, blockAlign 3, 24 bits, data size 0x1800; 11 records use RIFF size 0x2024, PCM format code 1, mono/48 kHz, blockAlign 4, 32 bits, data size 0x2000. Their binary representation and QuickTone conversion must be handled as separate variants until matching import/export captures prove the float mapping.
- [ ] Batch importer remains disabled. The 128 records' source ordinals are known, but how QuickTone maps source records to device destination slots, how marker-0/marker-1 records are handled, and how the anomalous ordinal-91 record is interpreted are not yet proven.
- [ ] Capture QuickTone batch import of the supplied MG30AllPatch.mg30patch, with USBPcap starting before the Import dialog and ending after completion. Record the destination/slot selections and export resulting device state if practical. The capture must establish whether the app imports all 128 records, skips empty entries, uses separate resource and preset transactions per occupied record, and how it chooses the destination address.
- [ ] Keep the prior static-reader discrepancy open: native QuickTone reader helpers previously appeared to expect 0x2590 per record / 0x12C800 total, while real exported single/all samples are 0x26AE / 0x135700. No truncation, padding, or alternate accepted length has been introduced.

### Scope protection

No change to working NAM import, IR User/Third Party upload packets, Collection 6A/6B/6C commands/mapping, MIDI parameter mapping, preset synchronization, Copy Scene, CTRL/EXP, signal-chain reorder, or Save-to-device 07/01 path. Export serializer is offline-only; it sends no MIDI and performs no hardware write.


### Export serializer verification detail (2026-10-31)

A repeatable offline check was run against the mounted sample after adding the serializer:

- Reconstructed the canonical 0x26AE record using the observed scene bytes, resource name, RIFF/WAVE header, 2,048 contiguous float32 sample bytes, and 600 curve words.
- Result compared byte-for-byte equal to the original supplied file; length 9,902 bytes; SHA-256 0b8f9fecb5150bfe5a96dfcf66f3a777b910cef2910bcaa3100f0fa990aaa67a.
- Each of the three 142-byte scene sections also survived the packed 71-word → 213-byte SysEx word encoding → inverse decode round-trip exactly.
- These checks validate the local serializer and inverse word mapping only. They do not establish the as-yet-unknown hardware readback protocol for IR resource waveform/curve data or prove a live pedal export.


### Build status correction (2026-10-31)

The previously queued importer build was rechecked. GitHub Actions run 41101214040 is completed/success, with artifact MG30-Studio-debug-APK (ID 12998752306; 4,007,697 bytes; SHA-256 80d4b66508bee6f31dc48271730de45061ae5dbeb6c4000dbe4a5135d68e1e7c). It was built from importer commit af71ae32bb342ecff15cc55580d54d5ebac2d0cf, so the newly added export serializer/registry commits are not in that APK. A new APK build is required after export UI/protocol implementation.


## Capture attempt — QuickTone single-preset export (2026-10-31)

- [x] User attempted to capture USBPcap traffic while invoking QuickTone single-preset Export; user reports the capture remained silent / no packets appeared.
- [ ] The new empty/silent capture file has not yet been uploaded, so it is not yet possible to distinguish: (a) zero USBPcap packets at all, (b) USB enumeration packets only, or (c) USB packets present but no MIDI SysEx export transaction.
- [ ] Ask for the exact silent .pcapng file even if it contains zero packets, the matching output .mg30patch if QuickTone generated one, and whether the packet counter stayed at 0. These establish whether this is a capture-interface issue or a genuinely absent export read transaction.
- [ ] Next controlled capture: close QuickTone; in Wireshark capture all USBPcap root-hub interfaces simultaneously (or use USBPcapCMD's Attached USB Devices view to identify the MG-30 root hub); do not set a capture filter; start capture before launching QuickTone; optionally unplug/reconnect the MG-30 after capture starts to verify enumeration; launch QuickTone, select the source preset, export the file, then stop capture. Do not re-import or write any preset as part of this test.
- [ ] If packets appear on reconnect but none during app/export, capture from before application launch and then inspect whether the app had already populated cached preset state before the capture. Keep the possibility of a read path on another interface or cached state open until packet evidence is available.
- [x] Rechecked older supplied reference captures: nam import.pcapng contains 354 USBPcap packet blocks; presetimport.pcapng 330; ir user import.pcapng 318. The older deluxecapt.pcapng contains 24 blocks dominated by USB descriptor/enumeration traffic and a small number of USB events, but no matching preset/IR SysEx transfer. Do not mistake that older short enumeration/control capture for the new export attempt.
- [ ] No source/protocol code change and no export UI enabled in response to the silent capture report. Working single-preset import, NAM, IR User/Collection, MIDI mapping, preset sync, Copy Scene, CTRL/EXP, signal chain, and Save-to-device remain untouched.


## Forensic review — user-supplied presetexport.pcapng (2026-10-31)

The user-supplied capture has now been inspected directly. It is not an empty file, but it contains only USB enumeration/configuration traffic and no preset-export/MIDI payload.

### Capture structure

- File: presetexport.pcapng
- File size: 2,756 bytes.
- Interface Description Block: one interface named USBPcap1, link type 249 (USBPcap), snap length 65,535.
- Enhanced Packet Blocks: 18 total.
- Captured packets are all USB control-transfer setup/completion traffic (descriptor requests/replies and SET_CONFIGURATION); no Bulk endpoint payloads are present.
- The recording contains descriptor traffic for USB bus 1 device addresses 3, 1, and 2. Device address 3 is the MG-30.
- MG-30 device descriptor: VID:PID 1FC9:8260, bcdDevice 0101; configuration total length 0x0158 (344 bytes), four interfaces. This exact VID:PID/configuration signature matches independent NUX MG-30 descriptor documentation.
- MG-30 interface 4 is USB Audio class (0x01), MIDI Streaming subclass (0x03); it declares Bulk OUT endpoint 0x02 and Bulk IN endpoint 0x82, each with 512-byte max packet size.
- No captured packet uses MG-30 endpoint 0x02 or 0x82. No USB-MIDI event packet, SysEx, preset request, IR-resource read, or other export data transaction appears in this capture.

### Interpretation

- [x] Confirm USBPcap1 successfully recorded the MG-30's device/configuration enumeration. This is not a zero-packet capture.
- [x] Confirm the MG-30 is present in the trace and its MIDI streaming interface/endpoints are described correctly.
- [x] Confirm no USB-MIDI traffic was captured after/beside enumeration, including during the reported Export attempt.
- [ ] Investigate the QuickTone Export call path against the executable/disassembly and surrounding UI state. A plausible explanation is that Export serializes preset/IR data already held in QuickTone's local model/cache, rather than issuing a fresh hardware read during the button click. This remains a hypothesis until the call graph/state source is traced.
- [ ] If QuickTone uses cached state, identify which prior operation populates that cache (connect/sync, selecting a preset, loading a file, or a separate explicit read). Do not assume that the data is current or device-authoritative.
- [ ] Do not ask the user to repeat the same capture with the same steps until the QuickTone export call path is checked. The supplied capture is now a valid negative observation: no USB-MIDI export transaction was generated/captured in this recording.
- [ ] If further capture becomes necessary, capture from before application launch and include the complete app session; but prioritize tracing whether the Export implementation invokes any MIDI read function before requesting another capture.

### Scope protection

No code/protocol behavior changed from this forensic capture analysis. Do not modify the working Gen2 single-preset importer, NAM, IR User/Third Party, IR Collection 6A/6B/6C, MIDI parameter mappings, preset sync, Copy Scene, CTRL/EXP, signal-chain reorder, or Save-to-device 07/01 path.


### Capture integrity marker

- SHA-256 of the exact supplied capture: 024b981b135273819c156a9682aed2d712b79677551137cfc6a9ad2d27770df8.
- All 18 EPB timestamp fields are identical in this file. Treat timing/duration from this capture as unusable; packet content and endpoint mapping remain inspectable.
- The capture's one interface name is USBPcap1. It records device enumeration for three bus-1 device addresses; the MG-30 is address 3 by its 1FC9:8260 descriptor.


## Goal 3 — QuickTone IR resource readback path and initial Export UI (2026-10-31)

### Read-side path identified in QuickTone executable

Further disassembly of QuickTone v2.6.7.16 resolved the missing read commands that populate the IR cache consumed by the preset serializer.

- Function 0x4A95F0 builds a 15-byte SysEx query for IR metadata: full frame F0 43 58 70 09 00 [index] 00 00 00 00 00 00 00 F7. Its response handler 0x4A9720 matches 09/02, reads the raw index at full-frame byte 6, and unpacks 36 metadata bytes from the packed name/metadata field.
- After checking whether a matching resource cache entry is already available, the QuickTone path calls 0x4AB340 for waveform readback and 0x4AAEA0 for curve readback when it needs the resource bytes from the pedal.
- Function 0x4AB340 emits 64 requests using command 10/00. Each request is 15 bytes: F0 43 58 70 10 00 00 00 [packed uint16 resource index] [packed uint16 sample offset] F7. Offsets progress 0, 32, ... 2016 (0x7E0). Its response handler 0x4AB510 accepts 10/02, unpacks 132 bytes, reads the target/offset header, and writes 32 float32 samples per response. Completion is recognized at offset 0x7E0.
- Function 0x4AAEA0 emits 10 requests using command 11/00 with the same 15-byte request shape and packed resource-index/curve-offset fields. Offsets progress 0, 64, ... 576 (0x240). Response handler 0x4AB090 accepts 11/02, unpacks 132 bytes, and writes 64 uint16 curve values per response. The final reply carries 64 words but only 24 fall within the 600-word table; the QuickTone handler bounds writes to its 600-value destination.
- When the final 11/02 frame completes, 0x4AB090 builds the RIFF/WAVE-shaped resource object, copies the 0x2000-byte waveform block and 0x12C (300 dword = 600 word) curve data, then updates the internal resource cache keyed by the returned resource index.
- The surrounding callback path receives 09/02 first, checks the cache entry, and then does waveform 10/00 followed by curve 11/00 when a matching cached asset is unavailable. This explains why a QuickTone Export click can be silent: Export serializes the cache; a separate read/sync operation is responsible for filling it.

### MG30 Studio implementation

- [x] Add www/mg30-preset-read.js with strict request builders for 09/00, 10/00 and 11/00, and response parsers/assemblers for 09/02, 10/02 and 11/02.
- [x] Preserve QuickTone's request layout, including the two zero/reserved bytes before the packed 16-bit index and offset for 10/00 and 11/00 requests.
- [x] Account for receive-envelope handling: the MG30 Studio waitForSysEx helper passes bodies without F0/F7, so 09/02 body length is 60 bytes and 10/02/11/02 body length is 203 bytes. QuickTone disassembly's offsets are relative to the full SysEx frame and were adjusted by one byte when expressed against the MG30 Studio body.
- [x] Add MG30PresetExportBridge in www/index.html. It reads three preset scene parts via 0C/00, one IR metadata reply via 09/00, 64 waveform blocks via 10/00, and 10 curve blocks via 11/00. It validates returned command, index, and per-block offset, assembles 2,048 float32 samples and 600 curve values, and invokes no write commands.
- [x] Add Export .mg30patch UI and downloader in www/mg30-preset-export.js. The UI uses the strict offline serializer already byte-compared to the supplied sample.
- [x] Add a dedicated export busy lock. It suppresses parameter CC changes, hardware polling, preset switching, and signal-chain sends during the read transaction, then resumes polling after completion. Existing import and Save-to-device transaction code is not reused.
- [ ] Hardware test the initial Export UI on the user's original MG-30 Gen2 firmware 6.0.x. Confirm the metadata query returns the expected User/Third Party IR name, 64 waveform replies cover offsets 0..2016, 10 curve replies cover offsets 0..576, and the resulting .mg30patch can be re-imported into a safe test slot with matching scene/resource readback.
- [ ] The initial bridge assumes the IR resource index associated with the exported preset is the selected hardware program index. The single-preset import capture uses the selected program for the 09/01, 10/01 and 11/01 write phases; the readback callback's returned index is checked strictly. If hardware returns a different resource index, export will stop safely rather than silently using the wrong cache entry.
- [ ] No export is considered hardware-validated until the above test succeeds. Batch import remains disabled; no change to NAM, Collection IR, MIDI map, preset sync, Copy Scene, CTRL/EXP, signal chain or Save-to-device writer.

### Read-side transaction safety

The new export path is read-only: it sends 0C/00, 09/00, 10/00 and 11/00 requests only. It never sends 0B/01, 07/01, 09/01, 10/01, 11/01, Collection 6A/6B/6C, or NAM 58 writes. Any timeout, missing block, mismatched target index, mismatched offset, invalid float32 sample, or invalid curve word aborts file generation. No partial .mg30patch file is downloaded.


### Implementation validation and remaining hardware risks (2026-10-31)

- [x] Syntax-checked the new read parser, export UI module, preset serializer module, IR transfer module, and both inline scripts in index.html after the integration changes.
- [x] Executed synthetic end-to-end parser/serializer checks in the development tool: generated 15-byte 09/00, 10/00 and 11/00 requests; decoded a synthetic 09/02 metadata reply; assembled 64 synthetic 10/02 waveform replies into 2,048 float32 samples; assembled 10 synthetic 11/02 replies into 600 curve values; decoded three synthetic 0C/02 scene replies; serialized a 9,902-byte single-preset record. This validates code-level framing/assembly with synthetic replies, not actual MG-30 hardware.
- [x] Added tests/mg30-preset-read.test.js with Node built-in tests and npm test (node --test) script for request lengths/layout, metadata/index validation, waveform/curve index+offset validation, and complete IR assembly. The repository test runner has not been executed in CI/local Node during this session; only the equivalent synthetic runtime checks were executed here.
- [x] Added shared transaction locks between preset import, preset export and IR transfer. IR upload refuses to start during preset import/export; preset import/export refuse to start during an IR upload; parameter CC, hardware polling, preset switching and signal-chain updates are held during export.
- [x] Export now refuses to truncate an IR resource name longer than the 16-byte single-record field.
- [ ] Hardware validation is still required. The first Export UI is explicitly labeled READ ONLY · UJI AWAL. It assumes the User IR resource index equals the selected preset program number because the working single-preset import targets that index; actual readback must confirm this. If the device returns a different index, or any response has a mismatched index/offset, export aborts without downloading a partial file.
- [ ] No APK build for these commits has been confirmed yet. Run a fresh build before the user tests the Export UI on original MG-30 Gen2 FW 6.0.x.
- [ ] Keep batch import disabled until export readback is hardware-tested and batch-import slot mapping/record variants are captured.


### QuickTone binary cross-check for the 128-entry IR index (2026-10-31)

A further direct disassembly check of QuickTone.exe v2.6.7.16 resolves the index-space concern:

- IR manager constructor at 0x4B1500 initializes the metadata-list count/limit field at object offset +0x640 to 0x80 (128 entries).
- The metadata refresh loop at 0x4A9560 iterates indices from 0 up to (but not including) that 0x80 count and calls 0x4A95F0 once per index. The 09/00 query builder in 0x4A95F0 writes the passed index into the request frame and waits for 09/02.
- In the QuickTone receive/transaction dispatcher branch for command 0x0B (around 0x4A5163–0x4A5222), the program byte is copied from the incoming transaction into the manager's current index field, and that same byte is passed to 0x4A95F0 to request the associated IR metadata. This is direct code evidence that the preset program index is used as the IR metadata index on this QuickTone path.
- Therefore the initial MG30 Studio mapping `resourceIndex = selected program slot` is not an arbitrary assumption: it matches the observed QuickTone transaction path and the 128-entry IR metadata table. Still keep the live hardware reply checks; a returned index mismatch must abort the export.
- The 128-entry table also confirms the parser's allowed IR index range 0–127.


- [x] Final concurrency review: Export rechecks preset import/export, IR transfer, CTRL editor, scene switch and Copy Scene locks after waiting for current buffer/status/MIDI work and immediately before claiming the export lock. This closes the race where an IR upload could begin while Export was waiting for the previous read to finish.
- [ ] Build and physical validation still pending; no new APK is claimed ready.


## Goal 3 — correction from first physical export failure (2026-10-31)

- [x] Review the user's two MG30 Studio screenshots: preset 04D (program 15) failed on first waveform reply with decoded words shown as `0/128`; preset 32B (program 125) failed with `256/128`. Both expected offset 0; no hardware write occurred.
- [x] Re-check QuickTone v2.6.7.16 disassembly for waveform response handler `0x4AB510`: it unpacks 132 bytes from the `10/02` body and reads the second decoded uint16 at output offset +2 as the waveform offset. The first decoded uint16 is not read as an echoed resource index by this handler.
- [x] Correct the Studio parser: call the first word an opaque reply tag, not `resourceIndex`; validate the offset word independently. Preserve the requested resource index from the metadata phase as the source index passed into subsequent reads.
- [x] Improve the export bridge matcher so a `10/02` or `11/02` frame with an offset other than the outstanding request is ignored rather than immediately consumed and treated as the reply. If no matching offset arrives, report the ignored tag/offset pairs for diagnosis.
- [ ] The observed offset 128 still needs physical explanation. The matcher change is a safe stale/out-of-order-frame guard, not proof that the device returns the expected offset or that Export now works.
- [ ] Rebuild APK from this branch and repeat a read-only export on original MG-30 Gen2 firmware 6.0.x. Capture USB-MIDI/USBPcap traffic if the first matching offset still does not arrive; include the outgoing first `10/00` request and all incoming `10/02` replies. No import/write operation is involved.
- [x] No change to NAM, IR User/Collection write paths, MIDI mappings, preset import, preset save/finalize, Copy Scene, CTRL/EXP, or signal-chain code.


## Recovery checkpoint — physical importer result and current Export APK (2026-10-31)

### Single-preset importer status

The earlier implementation section already records the user's report that single-preset import was physically tested and succeeded on the original MG-30 Gen2. This remains the confirmed user-reported result and is treated as complete for the tested single-file case. Do not repeat the basic `.mg30patch` format investigation or reopen the import path without new contradictory evidence.

This status does **not** imply that IR list visibility or separate audio audition was independently confirmed. It does not validate 128-record batch import, interrupted-transfer recovery, or the read-only Export path. Batch import remains disabled.

### Latest branch and build verification

- Working branch: `android/ui-polish-pass-1`.
- Latest branch head before this documentation update: `17e19a127077ebd79b1b6b60b769d4eff3e2d302`.
- Successful Android build source commit: `bc10120099acfedd45e17fc023aebe50c78271b9`.
- Comparing the branch head with the successful build commit showed exactly one intervening commit, modifying only `UI_POLISH_CHECKLIST.md`. Therefore the branch app source at that checkpoint matched the APK source.
- GitHub Actions run [#132](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41115756336) completed with conclusion `success` on 2026-10-31. The `npm test` protocol-regression step passed, Android project generation completed, `assembleDebug` passed, and artifact upload succeeded.
- Artifact: `MG30-Studio-debug-APK`; ID `13004389391`; size 4,014,515 bytes; SHA-256 `03076b06387983506817a8db81260a4c2ffeb87ede15bc2e1b4bc4a904f87f9f`.
- This build includes the latest IR read-reply parser correction: the first decoded word is treated as an opaque reply tag, while the second decoded uint16 is validated as the response offset. Unrelated/out-of-order 10/02 and 11/02 replies are ignored until the expected offset is received. This correction remains a safe matching guard; it is not proof that the hardware export transaction now succeeds.

### Next Goal 3 step

The next test is the already implemented **read-only** `.mg30patch` Export UI using the APK from run #132 on the original MG-30 Gen2 firmware 6.0.x. Do not repeat single-preset import merely to reconfirm its already reported success.

1. Select a known preset with a known associated User/Third Party IR resource.
2. Run Export and verify the 09/02 metadata response, 64 waveform replies covering offsets 0, 32, …, 2016, and 10 curve replies covering offsets 0, 64, …, 576. Verify the three scene readbacks and confirm no partial file is generated on any mismatch.
3. Compare the resulting `.mg30patch` with the expected scene/resource information. Only after its readback data is verified should a re-import into a safe test slot be considered for round-trip validation.
4. If the first expected offset is still missing, collect a full USBPcap trace containing the outgoing 10/00 request and every incoming 10/02 reply. Record the opaque first word and decoded offset separately; do not guess the meaning of the opaque word.

No change is authorized to the working NAM path, User/Third Party 10/09/11 upload path, Collection 6A/6B/6C mapping, MIDI parameter map, preset synchronization, Copy Scene, CTRL/EXP, signal-chain behavior, single-preset importer, or Save-to-device 07/01 writer. Keep the 128-record batch importer disabled pending a dedicated QuickTone batch-import capture and destination-mapping evidence.


## Forensic follow-up — Export offset mismatch on slot 04A (2026-10-31)

### User-observed hardware result

The user supplied an Android MG30 Studio screenshot from an Export attempt with source slot **04A**. The status reported that no matching SysEx response was received during the `10/02` waveform read and displayed one ignored reply as `tag 0 / offset 0`. The UI also explicitly reported that no data was written to the MG-30.

The screenshot is not enough to identify the exact failing waveform frame or requested offset: the prior UI only showed the mismatched returned header, not the active request's offset. Therefore, do not conclude from this screenshot alone that the failed request was offset 32, or that the pedal always returns offset 0.

The message itself establishes that the app received a body matching the current 203-byte `10/02` envelope check and decoded its first two words as opaque tag 0 and offset 0. It was ignored because it did not match the offset currently awaited.

### Independent QuickTone binary check

The supplied QuickTone v2.6.7.16 executable was independently re-inspected with x86 disassembly:

- At `0x4AB340`, the User IR waveform reader initializes the request command `10/00`, keeps the requested resource index in a 16-bit variable, initializes sample offset to 0, and increments that offset by `0x20` until it reaches `0x800`. That is 64 pages at sample offsets 0, 32, …, 2016.
- For each request, the function writes the resource index and sample offset as two adjacent little-endian uint16 values in a four-byte local structure.
- Helper `0x4A4910` takes those two uint16 words and encodes each into three 7-bit SysEx bytes. The current MG30 Studio `encodeWord16`/request builder implements the same byte transformation.
- At `0x4AB510`, the `10/02` handler validates the response command/status, calls `0x4A4970` to unpack `0x84` (132) bytes from the payload, then reads the second decoded uint16 at output offset +2. That value is used as the sample offset when placing the 32 float32 values into the waveform buffer.
- Therefore the current request field order, three-byte uint16 packing, 32-sample offset progression, and second-word reply-offset interpretation are consistent with the inspected QuickTone code. This does not prove that the Android host transmitted the intended request on the USB wire, that MG-30 firmware 6.0.x replies identically, or that timing/queue behavior is correct.

For slot 04A (program/index 12), the expected second waveform request at offset 32 is:
`F0 43 58 70 10 00 00 00 00 18 00 00 40 00 F7`.
A regression assertion now locks this exact request into the protocol test suite.

### Instrumentation added

The export bridge now captures, per IR waveform/curve request:
- target resource index and request label (for example waveform 2/64);
- expected sample/curve offset;
- complete 15-byte outgoing request frame as hex;
- elapsed request/reply times;
- matching-command response body length and initial raw bytes;
- decoded opaque reply tag and returned offset;
- all mismatched replies observed while waiting for that request.

The Export page exposes the trace in an expandable, copyable diagnostics panel after failure. This is instrumentation only: it adds no MIDI command and does not alter read/write protocol behavior.

### Next controlled test

Install only the APK from the latest successful diagnostics build. Retry **read-only Export** on slot 04A once, expand “Detail diagnostik readback”, and provide the copied log. The expected offset, actual outgoing request bytes and incoming reply prefix will identify whether the mismatch is in request construction, transmission/transport, firmware response behavior, or reply timing.

Do not accept an offset-mismatched block, do not produce a partial `.mg30patch`, and do not introduce any write operation to work around the failure. Keep the already successful single-preset importer, NAM, User/Third Party upload family `09/10/11`, Collection `6A/6B/6C`, MIDI mappings, preset synchronization, Copy Scene, CTRL/EXP, signal chain and Save-to-device `07/01` path unchanged. Batch import remains disabled.


## Physical Export retry result — offset 0 reply ignored (2026-10-31)

The user supplied a screenshot from the original MG30 Studio Android UI, connected to the MG-30 Gen2 over USB MIDI, with preset slot 04A selected. The read-only Export attempt failed with the visible status:

`Export gagal: Tidak ada balasan SysEx dari MG-30. Balasan 10/02 dengan offset berbeda diabaikan: tag 0/offset 0. Tidak ada data yang ditulis ke MG-30.`

What this establishes:

- The app observed at least one structurally recognizable `10/02` reply (the current matcher requires the expected 10/02 header and a 203-byte body before it records the reply).
- Its decoded first uint16 was opaque reply tag 0; its second decoded uint16 was offset 0.
- That reply did not match the offset outstanding for the request that eventually timed out. The status text alone does not reveal the outstanding offset, so it is not yet safe to conclude whether this was the second waveform page (expected offset 32) or a later page.
- Export aborted. No file was completed and the app explicitly reports that it wrote no data to the MG-30. The path is read-only.
- This result does not invalidate the already successful single-preset import and does not justify changing the User/Third Party upload command family.

### Required next evidence — in-app diagnostic log

Before changing any request bytes or parser logic, obtain the UI's **Detail diagnostik readback · untuk analisis** log. After the failed attempt, expand that details section and use **Salin log diagnostik**. The log records:
- target program/slot;
- each outgoing request's complete SysEx hex (`requestHex`);
- expected offset for the pending request;
- every observed reply's body length and header prefix;
- decoded opaque reply tag and returned offset;
- the exact failure step.

Compare the failed request's `requestHex` with the expected offset and compare all replies' returned offsets. If the outgoing request encodes the wrong offset, fix only the read-request builder after proving the field layout. If it encodes the expected offset but the device returns offset 0 again, investigate response timing/transaction correlation or the read command's actual address semantics using a matching QuickTone read capture/disassembly. Do not infer the cause from the short UI message alone.

No protocol change is made in this checkpoint. Preserve NAM, User/Third Party IR upload, Collection, MIDI mapping, preset import, preset synchronization, Copy Scene, CTRL/EXP, signal chain, and Save-to-device behavior.


## Physical Export diagnostic log — slot 04B, first waveform reply reports offset 128 (2026-10-31)

### User-provided in-app diagnostic

- Target: hardware slot `04B`, program/resource index `13`.
- Operation started: `2026-10-30T20:09:20.960Z`; elapsed time: 3,790 ms.
- First requested data block: `10/00 waveform 1/64`; expected offset `0`.
- Exact 15-byte request recorded by the app: `F0 43 58 70 10 00 00 00 00 1A 00 00 00 00 F7`.
- One matching-command response envelope arrived 51 ms after send (sent at 286 ms, received at 337 ms).
- Response body length: 203 bytes; captured prefix: `43 58 70 10 02 00 00 00 02 00 00 03 1C 21 02 39 3A 02 2C 4C`.
- Under the current unpacker, the first two decoded uint16 values are opaque reply tag `0` and returned offset `128`.
- Since expected offset was `0`, the matcher ignored this frame and timed out at 3,789 ms. No complete .mg30patch was produced and no data was written to the pedal.

### What the bytes establish

The outgoing request is structurally consistent with the documented QuickTone layout: `10/00`, two reserved zero bytes, packed uint16 resource index 13 (`00 1A 00`), packed uint16 offset 0 (`00 00 00`), then F7. This is the app's outgoing buffer, not independent proof of the bytes transmitted on the USB bus.

The response is a recognizable `10/02` body with a 203-byte envelope. The current unpacker interprets the second decoded word as 128. The supplied log contains only the first 20 raw body bytes, not the complete 203-byte body or USB-MIDI packetization.

### Interpretation — unresolved

This is more informative than the earlier 04A screenshot: the 04B log explicitly shows the outstanding request expected offset 0 and observed decoded offset 128.

Possible explanations remain open:
1. The second decoded word has a different meaning or unit in this response variant (for example a byte/count field rather than the requested sample offset).
2. The response belongs to a different or earlier read transaction and was correlated with this request.
3. The response unpacking/word interpretation differs from the actual QuickTone helper despite the current static-analysis interpretation.
4. Device/firmware response semantics differ from the request assumptions.

The value 128 happens to equal 32 float32 samples × 4 bytes, but this numerical coincidence is **not proof** that the field is a byte count. Do not relabel it, scale offsets, accept 128 for the first block, or disable validation without a QuickTone read capture or further binary/USB evidence.

### Next evidence and safe action

- Obtain a full USBPcap trace of this exact read-only operation, including the first `10/00` OUT request and all `10/02` IN data. Preserve USB-MIDI packet boundaries and raw bytes.
- If the in-app trace can be extended safely, record the full 203-byte reply body and any preceding `10/02` messages before the first request.
- Re-inspect QuickTone v2.6.7.16 helper `0x4A4970` and handler `0x4AB510` to establish exactly which unpacked bytes form the offset and how that value is used in the waveform destination pointer.
- Compare the same request/response for a known User IR resource with a matching QuickTone read capture. Do not use Collection as a substitute; Collection remains a distinct 6A/6B/6C family.
- Keep Export fail-closed: reject the mismatched block and do not generate a partial preset.

No source/protocol code was changed based on this diagnostic. Preserve the successful single-preset importer, NAM, User/Third Party upload, Collection, MIDI mappings, preset sync, Copy Scene, CTRL/EXP, signal chain and Save-to-device path.


## Clarification — previously supplied Export USBPcap has no SysEx traffic (2026-10-31)

The user clarified that an Export-time capture had already been supplied and showed no activity. Do not ask the user to repeat the same capture procedure unchanged.

The previously uploaded short captures were inspected in the current project runtime:
- `iruser.pcapng`: 26 USBPcap packet blocks; no complete SysEx messages.
- `deluxecapt.pcapng`: 24 USBPcap packet blocks; no complete SysEx messages.
- `ircolectionmenu.pcapng` and `ircolectionmenu dialog.pcapng`: short descriptor/control captures, no complete SysEx.
- By contrast, `ir user import.pcapng` contains 150 complete SysEx messages for the User import transaction (`10/01`, `09/01`, `11/01` plus ACKs); `ircolectionmenu dialog dan import.pcapng` contains the separate Collection import transaction (`6A/01`, `6C/01`, `6B/01` plus ACKs).

The no-activity Export capture is therefore not evidence of the Export request bytes or of a malformed request; it contains no captured SysEx to inspect. The in-app diagnostic separately proves that the Android app constructed/logged a 15-byte `10/00` request and received a 203-byte `10/02`-shaped body, but its `requestHex` is an application-buffer record, not an independent USB wire capture.

The user has now explicitly confirmed that the Windows PC was connected directly to the MG-30 during the USBPcap capture; the phone was not involved. Therefore, the Android-vs-Windows capture-boundary explanation below is **not applicable to this capture** and is superseded by the corrected conclusion in the next section.

Next action is not to repeat USBPcap. Investigate QuickTone's local resource/preset cache and the call path that fills it before Export. Keep the Android app's read-only diagnostic and fail-closed offset check unchanged until the response field interpretation is proven.


## Confirmed USBPcap topology and QuickTone Export behavior (2026-10-31) — correction

The user clarified that the PC capture was performed with the MG-30 connected directly to the PC, with no phone connected. This resolves the capture topology.

The previously inspected `presetexport.pcapng` is a valid negative observation from the PC↔MG-30 USB connection:
- 18 Enhanced Packet Blocks were recorded.
- USBPcap captured enumeration/configuration traffic, including the MG-30 descriptor (VID:PID `1FC9:8260`) and its USB Audio/MIDI Streaming interface.
- The MG-30 MIDI streaming interface declares Bulk OUT endpoint `0x02` and Bulk IN endpoint `0x82`.
- No captured packet used endpoint `0x02` or `0x82`; there is no USB-MIDI event packet, SysEx request/reply, or preset/IR read transaction in the capture, including during the reported QuickTone Export action.

Therefore, the capture is **not** empty because the pedal was attached to an unrelated host. It confirms the MG-30 was enumerated on the PC USB bus, while QuickTone Export generated no observable MIDI endpoint traffic during the recorded Export action.

This materially strengthens (but does not by itself prove) the hypothesis that QuickTone's Export button serializes data already held in QuickTone's local preset/resource model or cache rather than initiating a fresh read from the pedal at click time. The separate QuickTone IR readback path already identified in disassembly (`09/00` metadata, then cache-miss `10/00` waveform and `11/00` curve reads) must be traced upstream to determine which earlier action populates that cache: device connect/initialization, preset synchronization/selection, IR manager refresh, or another callback.

### Consequence for MG30 Studio

Do not use the silent QuickTone Export capture as evidence that the Android app's `10/00` request bytes are incorrect; the QuickTone Export action did not issue those requests in the PC capture. The Android in-app diagnostic is a separate observation: it logged an app-generated `10/00` request and a recognizable `10/02` response body with decoded offset 128, while expecting 0.

Next engineering work should trace QuickTone's cache-population trigger/call graph and compare that read path with the Android app's manually initiated readback. Do not ask the user to repeat the same silent Export capture. Do not change `10/00` encoding or accept offset 128 without evidence. Preserve the successful single-preset importer and all protected NAM, IR User/Third Party, Collection, MIDI, preset-sync, Copy Scene, CTRL/EXP, signal-chain and Save-to-device behavior.


### Follow-up disassembly — QuickTone IR cache warm-up is part of manager initialization

The bundled QuickTone 2.6.7.16 executable was re-examined after confirming the PC↔MG-30 capture topology.

- Function 0x4A9560 initializes/accesses the IR metadata manager and loops from index 0 to the manager count at object offset +0x640. The manager constructor at 0x4B1500 sets this count to 0x80 (128). For every index, it calls 0x4A95F0.
- Function 0x4A95F0 builds and sends the 15-byte 09/00 metadata request for the supplied index.
- Startup/manager initialization code around 0x841C23–0x841D00 creates/accesses the manager and explicitly calls 0x4A9560 at 0x841D00. Thus a 128-index metadata refresh is part of this initialization path, not the Export button.
- The 09/02 response handler 0x4A9720 checks/updates the resource metadata model and its associated resource cache. When the needed waveform/curve resource data is not already available, the handler path invokes 0x4AB340 (waveform 10/00) followed by 0x4AAEA0 (curve 11/00). The completed curve handler stores the assembled resource in the cache.
- The USBPcap result therefore fits a concrete code path: QuickTone can populate its 128-entry IR/resource model and fetch cache-miss waveform/curve data during initialization/refresh; a later Export action can serialize the already-resident preset/resource data with no additional USB-MIDI traffic.

This is strong evidence for the cache-serialization explanation of the silent Export capture. It does not prove every Export always has a fully current cache, nor does it prove the Android app's 10/02 offset-128 field interpretation. Those remain separate issues.

### Engineering consequence

Do not use QuickTone's silent Export click as the expected time to capture 10/00 reads. The read transaction is associated with the earlier metadata refresh/cache-miss path. The next disassembly target is the exact cache-presence predicate and the events that trigger the manager refresh (startup, device connection, preset selection/0B notification, IR manager opening). Compare that lifecycle with MG30 Studio's current explicit readback sequence.

No protocol or app source was modified. Do not change request encoding, accept offset 128, or touch the successful importer or protected features without new evidence.


## QuickTone request-queue model and Export readback correction (2026-10-31)

### Confirmed queue behavior in QuickTone v2.6.7.16

Further disassembly of the actual User IR waveform reader resolves an important difference between QuickTone and the first MG30 Studio Export implementation:

- In `0x4AB340`, QuickTone loops over all waveform sample offsets `0, 32, …, 2016` in one invocation.
- For each offset it builds a 15-byte `10/00` request and registers response callback `0x4AB510` with timeout `0x3E8` (1,000 ms) through helper `0xB0E360`.
- `0xB0E360` constructs a transaction object and registers it with `0xB0DE60`. `0xB0DE60` appends that object to the transaction manager's pending-request list and starts its dispatcher when the queue transitions from empty. The registration call returns to the caller; the `0x4AB340` loop continues registering subsequent offsets rather than waiting for each callback to finish.
- The response handler `0x4AB510` unpacks the 132-byte data area, reads the second decoded uint16 as the returned sample offset, and writes the 32 float32 sample words into the waveform buffer at that returned offset. It recognizes the final page at returned offset `0x7E0` (2016).
- The analogous curve path `0x4AAEA0` queues offsets `0,64,…,576` using `11/00`; `0x4AB090` places each 64-word response at the returned curve offset and bounds the meaningful table to 600 values.

The key behavioral point is not that all USB frames necessarily appear simultaneously on the wire. QuickTone registers a batch of per-request asynchronous transactions before the read operation completes, and each callback places the received page by its returned offset. This differs from MG30 Studio's previous one-request/one-wait matcher, which rejected any valid page not matching the exact offset currently displayed as pending.

### Reinterpretation of the Android diagnostic at slot 04B

The supplied slot 04B diagnostic shows:
- the first app request had expected offset 0;
- an otherwise correctly shaped 10/02 response body arrived;
- the decoded returned offset was 128.

Offset 128 is a valid waveform page address: it is 4 × 32 samples, within 0…2016, and aligned to the established 32-sample frame size. Under QuickTone's handler model, that page should be placed at sample position 128, not discarded merely because the UI was awaiting page 0.

This does **not** prove whether the offset-128 reply was an out-of-order page, a stale/previous transaction, or a firmware-side response to another outstanding request. But it establishes that offset 128 is not inherently invalid. The app-level diagnostic did not contain enough history to decide the reply's origin.

### MG30 Studio read-only Export change

The Export-only read path has been changed to match QuickTone's observable transaction model more closely:

- Build the complete 64-request waveform set (offsets 0…2016) and register/send the requests while one listener collects matching 10/02 responses.
- Route every valid response by its decoded returned offset, independent of response arrival order.
- Accept one unique page for each expected offset; reject out-of-range/misaligned offsets, duplicates, malformed replies, non-finite samples, and missing pages.
- Apply the same approach to the 10 curve requests and 11/02 responses (offsets 0…576).
- Sort the complete responses into canonical offset order before assembling 2,048 samples and 600 curve values. No .mg30patch is produced unless all pages and all three scene readbacks validate.

Source commits:
- `38f1eab` — add canonical ordering helper for read replies.
- `c117a01` — add regression tests for out-of-order waveform/curve replies, duplicates and missing data.
- `fc68d00` — change the Export-only bridge to batch-register requests and collect replies by returned offset.

This is a focused change to the read-only Export implementation. It does not alter any User IR write transaction, Collection transfer, NAM, preset importer, Save-to-device, or other protected code path. Node regression tests passed in Actions run #138 (source commit `fc68d00e2c48e3a954988bc76c80f200f9212cb4`); final Android build outcome is tracked separately below after Actions completion.

### Remaining physical validation

- [ ] Install the APK built from the offset-keyed batch Export source and repeat read-only Export on original MG-30 Gen2 FW 6.0.x.
- [ ] Confirm the diagnostic records 64 unique waveform offsets and 10 unique curve offsets, irrespective of response ordering.
- [ ] If the device returns only offset 128 and no other pages, preserve the full diagnostic. That would indicate a deeper request dispatch/transaction problem, not a reason to redefine offset semantics.
- [ ] Confirm the three scene readbacks and serialized .mg30patch before attempting any round-trip import.

No change to the successful single-preset importer, NAM, IR User/Third Party upload 10/09/11, Collection 6A/6C/6B, MIDI mapping, preset synchronization, Copy Scene, CTRL/EXP, signal chain, or Save-to-device path.


### Android APK build verification — offset-keyed readback (2026-10-31)

GitHub Actions run [#138](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41123736392) completed successfully from source commit `fc68d00e2c48e3a954988bc76c80f200f9212cb4`.

- Protocol regression tests (`npm test`): passed.
- Capacitor Android generation: passed.
- Gradle `assembleDebug`: passed.
- Artifact upload: passed.
- Artifact: `MG30-Studio-debug-APK`, ID `13008509843`, size 4,016,705 bytes.
- SHA-256: `8f9b1b1fc37cec90521cdfe3e000f754cc6a3c3e190c0b18322d2ae81840c701`.

This APK contains the new Export readback collection behavior that accepts valid responses in any order, assigns them by their returned offset, and only assembles the resource once all 64 waveform and 10 curve offsets are present exactly once. It is still a software/CI-verified build, not yet hardware-validated on the pedal.


## Physical Export diagnostic — slot 04C and request-dispatch instrumentation (2026-10-31)

The user supplied the full read-only Export diagnostic for original MG-30 Gen2, target slot 04C / program 14. The waveform phase failed after 15.873 seconds:

- 64 waveform requests were recorded, offsets 0…2016 in steps of 32.
- Only four unique 10/02 returned offsets were observed: 0, 256, 512 and 768. Each returned offset appeared repeatedly (16 observations per offset in the supplied trace); all other 60 waveform offsets were missing.
- The returned offsets are individually well-formed and aligned to the 32-sample page grid. The first eight observed reply offsets form the sequence 0, 0, 256, 256, 512, 512, 768, 768; later replies repeat those same four values. This does not establish why the device returns those pages, nor whether the repeated bodies are replies to consecutive requests or stale/unsolicited frames.
- The first observed replies for returned offsets 256, 512 and 768 arrived before the corresponding offset 256, 512 and 768 requests were dispatched in this export attempt. The prior diagnostic's sentAtMs field was misleading: it was written before entering midiFrame(), which can wait in the shared 45 ms MIDI send queue. It represented the queue-attempt time, not the actual output dispatch time.
- The supplied log also showed completedAtMs and matchedReply on some records whose final status was not-received. This exposed a status race: a fast response could mark a record matched, then the send loop could overwrite that status with sent; the failure handler later changed it to not-received.

### Safety and diagnostic correction

Commit 14d13eb90358a68a82ccdc9b52964aac4fb489d7 changes only the shared MIDI send helper's optional dispatch callback and the read-only Export diagnostics/collector:

- Record sendQueuedAtMs before queueing, sentAtMs at the exact point immediately before midiOutput.send(), and sendCompletedAtMs after the send promise resolves.
- Preserve matched if a response arrives before the send promise continuation; distinguish not-sent, not-received and send-failed.
- For a returned offset, do not accept the page until the request frame for that same offset has actually been dispatched in the current read. Log earlier pages as ignored with reason 'reply arrived before the matching offset request was dispatched'. This prevents a stale/unrequested page from completing a future offset merely because its address is in range.
- Record the response's offsetRequestSentAtMs and msAfterOffsetRequestSent to make subsequent timing evidence actionable.

The request builder, packed offset decoder, response offset semantics, User IR upload, Collection transfer, NAM, preset importer, MIDI mapping, preset sync, Copy Scene, CTRL/EXP, signal chain and Save-to-device path were not changed. No write operation was introduced. The four-offset pattern remains unexplained; do not redefine the decoded offset or accept partial data. Re-test only after the new APK build succeeds, then inspect the true dispatch timestamps and pre-request ignored replies.

### Remaining physical validation

- [ ] Verify the CI build for source commit 14d13eb and install its APK on original MG-30 Gen2 firmware 6.0.x.
- [ ] Repeat read-only Export on slot 04C (program 14) or another test slot. Check whether pages 256/512/768 were being reported before their matching request was actually sent, and inspect the new dispatch/latency fields.
- [ ] Require all 64 unique waveform offsets, all 10 curve offsets, all three scene readbacks, and a valid serialized file. Never trust or import a partial readback.


### Android APK build verification — dispatch-timing diagnostics (2026-10-31)

GitHub Actions run #139 completed successfully from source commit 14d13eb90358a68a82ccdc9b52964aac4fb489d7: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41156796990

- Protocol regression tests (npm test): passed.
- Capacitor Android generation: passed.
- Gradle assembleDebug: passed.
- Artifact upload: passed.
- Artifact: MG30-Studio-debug-APK, ID 13025326763, size 4,016,974 bytes.

The build verifies the updated dispatch-time diagnostics and pre-request page rejection at source commit 14d13eb. It does not establish that read-only Export now succeeds on the physical pedal. Install the artifact from run #139 and repeat the read-only test; inspect all 64 unique waveform pages, 10 curve pages and three scene replies before trusting any output.
