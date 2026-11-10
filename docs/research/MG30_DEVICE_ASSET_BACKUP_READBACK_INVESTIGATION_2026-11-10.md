# MG-30 Device Asset Backup / Slot Restore Investigation

Date: 2026-11-10
Target: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII).
Working branch: `feature/full-backup-selective-restore`.
Baseline before this note: `17645d8d67a604a3bc0703d1caa417896bdd3d10` (Community .31 docs/signature verification).

## User goal

Full Backup must preserve the actual contents of the pedal, not just app caches:
- All NAM models resident in the MG-30's 10 device slots, with original slot identity.
- All IR Collection entries resident in the MG-30's 24 Collection slots, including entries not referenced by any preset.
- Restore must write each asset back to its original device slot and verify it.
- Existing 128 presets / 384 scenes remain part of backup.
- Local NAM Library, local IR Collection mirror, drafts and safe settings may remain as additional independent sections.

## New user requirements: selectable backup and visible progress

The user explicitly requests the Backup flow to have independent checkboxes, analogous to Selective Restore. The user must be able to choose which sections are included before starting a backup. The selection must be explicit and clear; do not force every section to be included. Suggested sections should distinguish hardware-resident content from app-local content:
- Hardware Preset Bank (128 presets / 384 scenes).
- Device NAM Slots (actual model payloads, only when readback is proven).
- Device IR Collection Slots (actual waveform/curve payloads, only when readback is proven).
- Local NAM Library.
- Local IR Collection mirror.
- Local Preset Drafts / snapshots.
- Safe App Settings.

Backup UI requirements:
- Show a checklist with section names, concise source/contents descriptions, and available item counts when known.
- If a hardware section cannot yet be read back, show it as unavailable/not yet supported rather than silently substituting app cache data.
- Do not silently include app-local NAM or IR files as if they were device-resident slots.
- Show the selected section count and a clear start-backup action.
- Preserve the current ZIP manifest, validation, CRC32 and Android document-picker verification behavior.

The user also requests a visible progress popup/modal for BOTH backup and restore. Current restore behavior provides no visible indication while work is running, leaving the user unable to tell whether the operation is active. Implement a shared operation-progress UI with:
- A clear operation title (Backup or Restore) and current stage, such as scanning, reading hardware presets, reading NAM slots, reading IR Collection, validating archive, writing selected section, verifying, and saving ZIP.
- Progress indicator and useful progress text (completed/total items or bytes where measurable); use indeterminate progress only when the underlying operation cannot report a meaningful fraction.
- Section/item-level progress for long hardware and file operations where possible.
- Visible success or failure completion state, including the failed stage and actionable error detail.
- Prevent duplicate starts while an operation is active.
- Do not dismiss the dialog or claim completion before the underlying operation actually completes.
- Cancellation must only be offered where the underlying operation can stop safely; never imply that cancelling rolls back already-written hardware slots.
- Keep progress updates responsive during chunked native/USB work; avoid blocking the UI thread.

These are product requirements to implement and test; they are not claims that the current .31 build already supports them.

## Guardrails

- Keep original MG-30 Gen 2 6.0.x protocol only; do not substitute MKII.
- Do not modify the working NAM A2-Lite import transaction while investigating readback.
- Do not change IR User/Third Party `10/09/11` or Collection `6A/6C/6B` write paths without new evidence.
- Do not change MIDI mapping, preset manager protocol, or existing preset transfer.
- Never infer that metadata/name readback proves the NAM model weights or IR waveform have been read.
- Readback research should be read-only first. Do not send experimental writes to valuable slots.

## Current branch baseline (verified)

Branch HEAD at start of investigation: `17645d8d67a604a3bc0703d1caa417896bdd3d10`.
Community .31 Full Backup currently reads:
- 128 hardware presets through existing preset export.
- NAM files from app-private `nam-models` storage only.
- IR WAV records from MG30 Studio's local IndexedDB `mg30-studio-ir-collection-v1 / slots` only.
It does not currently back up device NAM model weights or device Collection WAVs, and restore puts NAM/IR back into app-local libraries only.

## NAM: evidence and unresolved question

### Confirmed from existing project notes/source
- QuickTone import capture has a metadata/name write and A2-Lite weight-data writes.
- Native A2-Lite model data consists of 1,871 float32 weights (7,484 bytes), placed in an 8,192-byte transfer buffer and sent in 136-byte chunks.
- Existing `www/nam-transfer.js` implements the write transaction and then reads ten 128-byte slot metadata records twice.
- The readback query uses outer command `00`, field2=4; replies use outer command `02`, field2=4, and contain 128-byte metadata.
- The code explicitly documents: this query reads NAME/metadata only; it does NOT read model weights.
- Two metadata rounds are compared for stability. This is not model-content verification.

### Not confirmed
- No evidence in the current NAM import capture or current branch implementation establishes a command that reads back the 7,484-byte A2-Lite weight payload from the pedal.
- Therefore a device-resident NAM cannot yet be exported/restored byte-faithfully based on the currently proven transaction.
- Slot selectors are zero-based in the observed import/readback transaction; retain this protocol fact without overclaiming UI semantics outside the tested mapping.

### NAM investigation priority
1. Inspect the original MG-30 QuickTone 2.6.7.16 code path around NAM slot listing/sync and the corresponding incoming MIDI handler, not just the import routine.
2. Determine whether the 128-byte slot metadata record contains a device-side model handle/reference that can be used to request weights, or whether another command family handles model readback.
3. Compare captures for: opening NAM slot list; selecting a populated slot; selecting an empty slot; reading/syncing NAM metadata; and any explicit export/save action if one exists.
4. If no readback command exists, document the limitation honestly. A backup of source files in app storage or a metadata-only slot manifest is not a backup of device NAM weights.
5. Keep any future device NAM restore as a separate stage using the existing verified A2-Lite write path, with explicit slot mapping and post-write metadata verification. Do not call it fully verified until actual model readback or an independently reliable device validation exists.

## IR Collection: evidence and unresolved question

### Confirmed from existing capture analysis
- Collection write uses a separate command family: `6A 01` waveform, `6C 01` name/CRC metadata, `6B 01` curve; ACKs use `6A/6C/6B 03`.
- Collection write capture uses an index-like parameter; observed tested mapping includes parameter 1 -> displayed slot 02 and parameter 4 -> displayed slot 05. Slot 01 mapping is extrapolated, not independently tested.
- Collection item selection is seen as CC 66 (0x42) with the selected index value.
- Collection item's Use action has an observed request/response pair `6E 01` / `6E 02` for the selected index, followed by control reset events. Exact semantics are not fully decoded.
- QuickTone 2.6.7.16 has original-MG-30 symbols including `getIRCrcAndNameCheck`, `setIRCrcAndName`, and `deleteCollectionIRCheck`. These are strong static-analysis leads, not proof of exact packet formats.
- Existing app IndexedDB is only a local mirror of WAVs imported through MG30 Studio. It does not enumerate items created externally in QuickTone PC.
- Existing Collection captures still do NOT show the `6C 00` / `6C 02` readback exchange. The request/response is now confirmed in the original QuickTone 2.6.7.16 MG30 code by static disassembly (see the new static-code section below), but an actual device response has not yet been captured.
- The submitted Collection dialog/list captures do not include the actual initial list/name readback exchange. This is a capture-content limitation; it does not prove Collection is local.

### Not confirmed (after static-code discovery)
- Whether the physical MG-30 firmware 6.0.x unit responds successfully to these QuickTone read requests in every slot state. Current submitted captures do not include the read transactions or replies.
- Whether firmware 6.0.x actually exposes all 24 initialized Collection indices as independent readable entries, including empty slots, and how the index 0–23 values map to the QuickTone UI's displayed slot numbers.
- The exact semantic layout and byte order of the 36-byte `6C 02` record (name/CRC split remains to be verified against a response and the write-side layout).
- Whether the 6A waveform payload and 6B curve payload together form the complete exportable WAV representation, and the exact conversion/normalization rules.
- A fully verified device Collection restore transaction with exact original slot placement and content readback comparison.

### IR Collection investigation priority
1. Analyze the original MG-30 QuickTone 2.6.7.16 implementation around `getIRCrcAndNameCheck`, `setIRCrcAndName`, `deleteCollectionIRCheck`, and incoming MIDI handler.
2. Establish the exact Collection list/name read request and response. Test the existing `6C 00` candidate only as a read-only hypothesis; do not label it confirmed until a real MG-30 reply is captured and decoded.
3. Determine whether a second request retrieves waveform/curve bytes from Collection storage. Metadata alone is insufficient for a full backup.
4. If the pedal does not expose Collection WAV readback, evaluate a supported PC-side acquisition/import path as an additional source, but do not substitute the phone's IndexedDB cache for device contents.
5. Once readback is established, back up all 24 slots (including unreferenced entries), preserving slot index, CRC, name, waveform and curve. Restore to the same slots, then read back and compare metadata and content where protocol permits.

## Capture inventory already supplied

Do not ask the user to repeat captures already present:
- `nam import.pcapng`
- `ircolectionmenu.pcapng`
- `ircolectionmenu dialog.pcapng`
- `ircolectionmenu dialog dan import.pcapng`
- `capkoleksi.pcapng`
- `ir user import.pcapng`
- `iruser.pcapng`
- `deluxecapt.pcapng`

Existing analysis reports:
- `MG30_IR_User_vs_Collection_Capture_Analysis.md`
- `MG30_IR_Second_Capture_Validation.md`
- `IR_COLLECTION_EXPERIMENT.md`
- `docs/nam-transfer-gen2-6.0.5.md`
- `docs/NAM-TRANSFER-TONE3000.md`

## Acceptance criteria for calling this complete

- NAM: every populated device slot's actual model data is captured, associated with its original slot, and restored to that slot. Metadata/name-only readback does not pass.
- IR Collection: every populated Collection slot's actual WAV-equivalent waveform/curve data is captured, associated with its original slot, and restored to that slot. Name/CRC-only readback does not pass.
- Backup checklist: user can independently select backup sections; hardware and app-local sources are visibly distinguished; unsupported hardware readback is never silently represented by local cache.
- Progress UX: both backup and restore show live operation title, stage, progress, and terminal success/failure; no silent long-running restore.
- Tests cover empty slots, populated slots, slot identity, duplicate names, partial failure, cancellation/retry safety, progress event sequencing, and readback verification.
- Existing User IR, NAM import, preset transfer, MIDI mapping, and Full Backup local-library behavior all pass regression tests.
- Physical acceptance is performed on original MG-30 Gen 2 firmware 6.0.x. CI alone is not hardware acceptance.


## New discovery: QuickTone 2.6.7.16 contains original-MG30 Collection readback implementation (static disassembly)

Inspection target:
- Archive: `NUX_QuickTone_V2.6.7.16_Windows.zip`
- Archive SHA-256: `95990e1e57079439c89b13e16d19f17c1769ec0c60336b546bc7f43b4ee91f2a`
- Extracted executable: `QuickTone.exe`
- Executable SHA-256: `0d64728f8f0e013114c228c8e6f9a8f3c648a5f82ff54ff03081c930ebd771d6`
- PE32 i386, vendor/version resources identify Cherub Technology / QuickTone 2.6.7.16.
- The binary contains distinct original-MG30 and MG30MK2 transmission classes. Findings below are from the original `NuxMidiTransmissionMG30` code region, not the MK2 path.
- Addresses below are virtual addresses from the executable's `.text` section; they are static reverse-engineering evidence, not a physical capture.

### 1. Collection metadata enumeration: `6C 00` → `6C 02`

- At `0x4ACCCB–0x4ACCE4`, QuickTone builds a 15-byte SysEx request:
  `F0 43 58 70 6C 00 <index> 00 00 00 00 00 00 00 F7`.
- The request loop begins with index 0 and increments the index by one. Its loop condition compares the index against a Collection-manager field at object offset `0x64C`. The original-MG30 manager constructor at `0x4B1500` initializes that field to `0x18` (24) at `0x4B1634`; therefore the original QuickTone implementation enumerates 24 Collection indices (0–23). The UI's displayed numbering / exact zero-based-to-one-based mapping still needs to be checked against a physical reply.
- The send call at `0x4ACD41–0x4ACD5A` passes `0x3E8` (1000 ms), retry/flag value `1`, and a frame length of `0x0F` (15 bytes).
- The response handler at `0x4ACF00`, specifically `0x4ACF3A–0x4ACF77`, matches command bytes `6C 02`, reads the index at message offset 6, then invokes the common 7-bit decoder for exactly `0x24` (36) raw bytes. The decoder skips a two-byte preamble, so the 36 raw bytes are encoded after message offsets 7–8 (the encoded bytes begin at message offset 9), not copied literally from offset 7.
- This establishes that QuickTone expects a 36-byte decoded per-index metadata record. It does NOT by itself establish the record's exact field layout; interpreting it as 32-byte name plus 4-byte CRC remains a hypothesis until matched to actual reply bytes and the write-side encoder.

### 2. Metadata response dispatches reads for the same Collection index

- In the `6C 02` handler at `0x4AD00D–0x4AD0A9`, after the record is parsed and a conditional check succeeds, QuickTone invokes both:
  - `0x4AD7D0` with the same index (the `6A` read path).
  - `0x4AD330` with the same index (the `6B` read path).
- This connects metadata enumeration to per-index payload acquisition in the original QuickTone implementation; it is not merely three unrelated packet families.
- The static branch condition and the complete UI call chain should still be traced before assuming that every metadata record (including an empty slot) will trigger both reads.

### 3. IR waveform/data-block acquisition: `6A 00` → `6A 02`

- Function region `0x4AD7D0–0x4AD926` builds repeated `6A 00` requests for a selected index.
- The request carries a 16-bit block offset. The offset begins at 0 and increments by `0x20` (32) until it reaches `0x800` (2048); this yields 64 block requests for a complete 0x800-byte region.
- Each request is sent as a 15-byte SysEx frame with the same 1000 ms timeout / flag arguments observed in the Collection metadata path.
- The callback at `0x4AD9A0` explicitly matches `6A 02` and invokes the common 7-bit decoder for `0x84` (132) raw bytes after a two-byte preamble. In the decoded buffer, bytes 0–1 are not yet semantically identified, bytes 2–3 are read as the block offset, and bytes 4–131 (128 bytes) are copied into the corresponding accumulation buffer region.
- The completion comparison checks the last block offset `0x7E0` (2016), consistent with a final 128-byte block in a 2048-byte transfer.
- This is strong static evidence that QuickTone requests and assembles a per-index IR data payload from Collection storage. It is not yet a measured MG-30 response, and the exact payload encoding/meaning still needs validation against a captured exchange.

### 4. IR curve acquisition: `6B 00` → `6B 02`

- Function region `0x4AD330–0x4AD4FB` builds repeated `6B 00` requests for the same selected Collection index.
- The 16-bit request offset advances by `0x40` (64); the loop limit is read from a manager field at offset `0x670`. The original-MG30 manager constructor initializes this field to `0x258` (600) at `0x4B168E`. The request sequence therefore starts at offsets 0, 64, ..., 576; the final 64-point block extends beyond the 600-point meaningful count and must be checked for padding/trim behavior.
- The callback at `0x4AD520` matches `6B 02` and invokes the common 7-bit decoder for `0x84` (132) raw bytes after a two-byte preamble. In the decoded buffer, bytes 0–1 remain unidentified, bytes 2–3 hold the 16-bit block offset, and bytes 4–131 carry the 128-byte data block.
- The callback treats offset `0x0240` (576) as the final block offset. Subsequent code builds a RIFF/WAVE header (`RIFF`, `WAVE`, `fmt `, `data`) and copies `0x12C` (300) 32-bit words = 1200 bytes from the accumulation buffer into its output buffer before calling a file-writing routine.
- This confirms a separate curve/data acquisition and WAV-formatted output path in QuickTone. The precise semantics of this generated WAV data (and how it relates to the 6A payload) should not be assumed until the full export path and an actual export file are compared.

### 5. Implications for the project

- The earlier conclusion that no Collection readback implementation was evident must be revised: original QuickTone 2.6.7.16 contains static readback request/response handlers for metadata, 6A data, and 6B curve.
- Device-side Collection acquisition now appears technically plausible through the same protocol family QuickTone uses. The next task is to capture a real read/export session and compare each request/reply against these disassembly-derived structures.
- Do NOT implement these requests in MG30 Studio yet. First establish that the original MG-30 Gen 2 6.0.x pedal responds, determine error/empty-slot behavior, discover the true slot count and index mapping, and validate exact bytes/CRC/content.
- The existing Collection write paths `6A 01`, `6C 01`, and `6B 01` remain untouched. No User/Third Party `10/09/11`, NAM import, MIDI, or preset code has been modified.
- This discovery does not yet close the device Collection backup acceptance criteria: no physical readback capture or byte-identical restore comparison exists yet.


### 6. Static constants in the original-MG30 Collection manager

- Constructor/disassembly at `0x4B1500–0x4B1698` initializes the Collection count field at object offset `0x64C` to decimal 24 (`0x18`) at `0x4B1634`. This is the same field used by the `6C 00` per-index enumeration loop.
- The same constructor initializes object field `0x670` to decimal 600 (`0x258`) at `0x4B168E`. The `6B` reader uses this field as its curve-point count.
- An adjacent field at offset `0x650` is initialized to decimal 10 at `0x4B163E`; its meaning has not yet been identified and should not be labeled NAM slots without further cross-reference.
- These constants provide static evidence for 24 Collection indices and a 600-point curve buffer in the original-MG30 QuickTone class. They do not prove that all 24 device slots are populated.


## Follow-up static-code detail: shared MIDI 7-bit codec and response framing

- The common helper at `0x4A4910` packs a 16-bit value into three 7-bit-safe MIDI bytes: high two bits (`value >> 14`), middle seven bits (`(value >> 7) & 0x7F`), then low seven bits (`value & 0x7F`). This explains the compact encoding used for index/offset fields in the read path.
- The inverse helper at `0x4A4970` skips a two-byte preamble in its input pointer and reconstructs pairs of raw bytes from groups of three 7-bit bytes.
- Therefore a decoded 132-byte `6A 02` / `6B 02` response should be treated as a 132-byte raw structure: 2 leading bytes with semantics not yet identified, 2-byte block offset, and 128-byte data block. Do not parse the raw MIDI payload as though the offset is at the start of the encoded payload.
- For `6C 02`, the decoded 36-byte record follows a two-byte preamble after the per-index header; the encoded message has 54 bytes for the 36 decoded bytes. Keep the possible name/CRC split as an explicit hypothesis only.

## Full supplied-capture audit against the newly discovered read commands

All available submitted PCAPNG files were parsed as USBPcap endpoint traffic and unpacked into USB-MIDI SysEx messages using the NUX USB-MIDI packet grouping (three MIDI data bytes plus the CIN/status byte per USB event packet). This pass specifically searched for Collection read requests/replies `6C 00/02`, `6A 00/02`, and `6B 00/02`.

- `capkoleksi.pcapng`: 150 messages; OUT has 64 `6A 01`, 1 `6C 01`, 10 `6B 01`; IN has 64 `6A 03`, 1 `6C 03`, 10 `6B 03`. No Collection read request/reply frames.
- `ircolectionmenu dialog dan import.pcapng`: same 150-message write/ACK profile; no Collection read request/reply frames.
- `nam import.pcapng`: 166 messages; 63 `58 01` write frames / 63 `58 03` ACK frames, plus 20 `58 00` metadata requests / 20 `58 02` metadata replies. No Collection read request/reply frames.
- `ir user import.pcapng`: 150 messages; 64 `10 01` / 64 `10 03`, one `09 01` / `09 03`, and ten `11 01` / `11 03`; this is the separate User/Third Party write family, not Collection.
- The remaining supplied IR Collection menu/list and IR User captures show UI/control activity but no `6C 00/02`, `6A 00/02`, or `6B 00/02` readback frames.
- Thus the existing PCAPNG set still does not contain a physical Collection read/export exchange. This is a limitation of what was captured, not evidence that the MG-30 firmware lacks readback; QuickTone's original-MG30 code does implement such a read path.

## NAM QuickTone static-analysis checkpoint

- Original QuickTone 2.6.7.16 contains NAM-related file/loader strings including `loadNamFile`, `load_and_validate_nam_model`, `setLoadNamEndCallBack`, `setNamInfoCallBack`, and `NamFileThread`, plus native NAM DSP/model loader symbols.
- The original-MG30 MIDI transmission class exposes many named methods around preset/IR/device state handling, but the currently identified symbol/type strings do not establish a NAM device-slot read/export method or model-weight response handler.
- The local NAM loader/file-thread symbols prove QuickTone has a NAM file loading subsystem; they do not prove device-to-PC NAM export.
- An adjacent original-MG30 Collection-manager field at object offset `0x650` is initialized to 10, but its semantic role has not been established. Do not equate this field with the ten device NAM slots without further cross-reference.
- Current evidence therefore remains: MG-30 NAM write/import is implemented and the project reads slot metadata only; no actual device NAM weight readback has yet been identified or proven. This is an open investigation, not proof that such a command cannot exist.


## Deeper block layout recovered from the original-MG30 response handlers

### 6A waveform/data path

- Request function `0x4AD7D0` creates a `6A 00` frame for the requested Collection index and a 16-bit block offset.
- It starts at offset 0, advances by `0x20` per request, and stops after offset `0x7E0` (2016). There are exactly 64 requests.
- The common encoder `0x4A4910` serializes the two 16-bit values (index and offset) as two 3-byte 7-bit groups. The generated 15-byte SysEx frame includes the `F0 43 58 70 6A 00` prefix, two zero preamble bytes, six encoded bytes and `F7`.
- Each `6A 02` response is decoded to 132 raw bytes. The callback obtains the block offset from decoded bytes 2–3 and copies 128 bytes (32 x 32-bit words) into the per-Collection-item accumulation region.
- 64 blocks x 128 bytes = 8,192 bytes (`0x2000`) for one indexed item. The callback recognizes final block offset `0x7E0`; this is the strongest static indication that the 6A read returns an 8 KiB waveform/data resource.
- The final consumer/file serialization path after the 6A accumulation is not fully resolved yet. Do not assume these 8 KiB are a standard WAV file until the downstream serializer is traced.

### 6B curve path and export serialization

- Request function `0x4AD330` creates `6B 00` requests using the same two-16-bit-value / 7-bit encoding shape.
- The offset advances by `0x40` (64) points. The manager's curve count is 600, so requests cover offsets 0, 64, ..., 576 (10 blocks).
- Each `6B 02` reply decodes to a 132-byte raw block with an unidentified 2-byte prefix, 16-bit offset, and 128 bytes of data (64 x 16-bit points).
- The callback stores points into a 600 x 16-bit (1,200-byte) curve buffer. On the last block (offset `0x240` = 576), the code bounds writes by the manager count 600, so only the remaining 24 points of that 64-point block are retained; the trailing 40 points are outside the 600-point curve.
- The callback constructs a RIFF/WAVE structure with `RIFF`, `WAVE`, `fmt `, audio format tag 1 (PCM), and `data`, then copies exactly `0x12C` (300) DWORDs = 1,200 bytes from the 600-point buffer before invoking its file/output writer.
- Thus the 6B collection read is not merely a UI curve preview: it is used in a WAV serialization path. Sample rate/channel fields and whether this WAV is the full deliverable IR or a companion representation still require the full writer/caller analysis.


## Additional executable-string evidence: Collection Export UI and NAM file picker

A separate string-table pass over the same QuickTone.exe found:
- UI text `COLLECTION EXPORT` at multiple localized resource offsets (for example file offsets `0x92CE5C`, `0x936254`, `0x93E8C8`, `0x9467E0`, `0x94C204`).
- UI text `Export the IR File.` at multiple localized resource offsets (for example `0x92D02C`, `0x936424`, `0x93E9D8`, `0x9469B0`, `0x94C314`).
- Export button state resources `UI_Button_Export_D`, `UI_Button_Export_O`, and `UI_Button_Export_N`.
- NAM file chooser filter strings `*.image;*.nam;` and `.namb`, and UI labels `NamLabel`.

Interpretation:
- This corroborates that QuickTone 2.6.7.16 has a user-visible Collection Export feature in its resources, consistent with the `6A`/`6B` read-and-file-output code path.
- The strings alone do not prove which slot selection triggers export, whether export is per-item or batch, nor the exact file extension/content. Those points must be traced through the UI event handler and confirmed with a PCAP plus exported file.
- NAM file chooser strings establish that QuickTone can load/select local `.nam` / `.namb` files. They do not establish a device-to-PC NAM export function.


## Physical validation plan for the newly identified Collection Export path

The existing PCAPNG set cannot validate the readback commands. The next capture should be a dedicated read-only QuickTone Collection export, not another import:

1. Use the original MG-30 Gen 2 on firmware 6.0.x and QuickTone 2.6.7.16. Do not use MKII.
2. Start USBPcap/Wireshark capture before opening the Collection view. Capture both host-to-device and device-to-host USB-MIDI endpoints.
3. Open IR Collection and note the displayed slot number and visible IR name for one known populated slot. Do not press Use, overwrite, delete, or import.
4. Trigger the UI action labelled `COLLECTION EXPORT` / `Export the IR File.` for that one slot only. Save the exported file unchanged.
5. Stop capture after the export dialog reports completion. Preserve the original PCAPNG and exported file; do not trim or re-save the capture.
6. Repeat for one known empty slot only if QuickTone permits selecting/exporting it without any write action. This will reveal empty-slot response behavior; do not create a test IR merely to fill it.

Required evidence to compare:
- `6C 00` request indices and `6C 02` replies, decoded to the expected 36-byte records.
- Whether each metadata reply triggers `6A 00` and `6B 00` reads for the same index.
- 64 `6A` data blocks per item (offsets 0..2016 in steps of 32) and 10 `6B` blocks (offsets 0..576 in steps of 64), including device responses and any retry/timeout behavior.
- Exact zero-based index to UI slot-number mapping.
- Exported file size, RIFF/WAVE header, sample format/rate/channels, and byte relationship to the accumulated `6A` and `6B` buffers.

Safety: this is a read/export-only test. Do not invoke any import, delete, Use, or write action. A missing reply is a failed observation, not permission to try speculative writes. If a capture cannot be performed now, the static-code discovery remains useful but Collection device backup must remain marked as pending hardware validation.
