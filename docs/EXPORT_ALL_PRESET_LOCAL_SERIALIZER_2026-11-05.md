# Export All Preset — local serializer (2026-11-05)

Scope: original NUX MG-30 Gen 2 firmware 6.0.x. Not MG-30 MKII.

## Export All rule

Export All is a local file/memory operation. The `exportAllPresets()` path must not call
`MG30PresetExportBridge.readSingle()`, send MIDI/SysEx, require an active USB-MIDI
connection, or touch the pedal. Single-preset Export remains a separate feature and is
not used by Export All.

## Binary container

- Total file: `0x135700` bytes.
- Record count: 128.
- Record stride: `0x26AE` bytes.
- Each record contains 3 scenes × 142 bytes at `0x04..0x1AD`.
- Resource section base: `0x1AA`.
- Resource marker: record offset `0x1AE` (section + `0x04`).
- Resource name: `0x1B2..0x1D1` (section + `0x08`), 32 bytes, zero-padded.
- RIFF/WAVE header: `0x1D2..0x1FD` (section + `0x28`), 44 bytes.
- Float32 waveform: `0x1FE..0x21FD` (section + `0x54`), 2,048 little-endian float32 values (8,192 bytes).
- Curve: `0x21FE..0x26AD` (section + `0x2054`), 600 little-endian uint16 values (1,200 bytes).

## Implementation

- `buildMG30AllPresetPatch(records)` serializes the 128 ordered records to one
  `Uint8Array(0x135700)`.
- `parseMG30AllPresetPatch` keeps a `rawRecord` copy on each parsed record. The
  serializer starts from that raw record so opaque bytes and the observed mixed RIFF
  header variants are retained. A freshly constructed resource record without a raw
  header uses the standard 24-bit header already used by the single-record serializer.
- For records without a resource marker, the resource section is zero-filled.
- Export All validates the generated file again before saving it through the existing
  browser/native file-save helper.

## Local source / current app boundary

The current editor stores one active draft and user-saved editor drafts; it does not
currently maintain a complete 128-record binary bank with all 27 IR resources. Therefore
the present Export All UI caches a validated 128-record `.mg30patch` selected from the
local Import All file picker and exports from that in-memory representation. This is
explicitly not a claim that 128 complete records can be reconstructed from the single
active editor state. The cache is module memory and remains available after the importer
clears the input control.

## Regression safeguards

- Do not change single-preset import, Import All transaction planning, live state sync,
  NAM transfer, User/Third Party IR, Collection IR, or MIDI control mappings as part
  of this Export All work.
- Keep the 27-resource All Preset validation and preserve raw record headers/padding
  whenever source raw records exist.
- Unit tests cover exact output size, 128 sequential records, scene/resource offsets,
  zero-filled non-resource records, and round-trip preservation of mixed RIFF headers
  and opaque record bytes.
