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
