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
- Existing `6C 00` / `6C 02` two-pass readback was proposed in the Collection experiment notes as a protocol-derived candidate, but it has NOT been confirmed by a physical-device response in the submitted captures.
- The submitted Collection dialog/list captures do not include the actual initial list/name readback exchange. This is a capture-content limitation; it does not prove Collection is local.

### Not confirmed
- The actual device Collection list enumeration/readback transaction.
- Whether a readback response can provide each item's 36-byte CRC/name metadata only, or the complete IR waveform/curve data.
- Whether Collection WAV bytes can be requested from the device by slot.
- A fully verified device Collection restore transaction with exact original slot placement.

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
- Tests cover empty slots, populated slots, slot identity, duplicate names, partial failure, cancellation/retry safety, and readback verification.
- Existing User IR, NAM import, preset transfer, MIDI mapping, and Full Backup local-library behavior all pass regression tests.
- Physical acceptance is performed on original MG-30 Gen 2 firmware 6.0.x. CI alone is not hardware acceptance.
