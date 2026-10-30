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
