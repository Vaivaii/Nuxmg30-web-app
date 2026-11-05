# QuickTone MG-30 Gen2 — RIFF size trace and descriptor correction

Target: original MG-30 Gen2 / QuickTone 2.6.7.16, not MKII.

## Critical correction

The earlier interpretation that the 32 bytes decoded from 09/02 supply WAVE header metadata was incorrect.

- 0x004A9720 decodes a 36-byte 09/02 payload.
- 0x004B3E80 stores it as a DWORD status/presence field at resource object +0x00 followed by a 32-byte name at +0x04.
- In 0x004AB090, the two 16-byte copies from object +0x04 and +0x14 are placed immediately before the local WAVE structure, not inside its WAVEFORMAT fields.
- This matches the All Preset record: 32-byte name at record +0x1B2 and RIFF/WAVE header at +0x1D2.

The prior descriptor-to-WAVE-header mapping is superseded and must not be implemented.

## Live readback default WAVE header

0x004AB090 calls initializer 0x0084E110. It explicitly writes:
- RIFF size +0x04 = 0x1824
- PCM format +0x16 = 1
- sample rate +0x18 = 48000
- byte rate +0x1C = 144000 (0x23280)
- block align +0x20 = 3
- bits/sample +0x22 = 24
- data size +0x28 = 0x1800

The finalizer copies 0x2000 bytes from the internal float32 waveform buffer into its data buffer, while the default WAVE header declares 0x1800 bytes. Do not confuse internal buffer capacity with the WAVE data-chunk size.

## All-file parser preserves existing header

0x004B5180 reads the WAVE header directly from each record:
- name at +0x1B2
- WAVE header at +0x1D2, copied in chunks including the final DWORD at +0x1FA
- waveform at +0x1FE, length 0x2000
- curve at +0x21FE, 600 WORD values
It passes the reconstructed resource structure to 0x004B50A0. Thus All-file loading preserves existing per-record WAVE header fields rather than forcing them through the live-readback 24-bit initializer.

## Correct record header offsets

Relative to WAVE header base record +0x1D2:
- RIFF size: +0x04 (record +0x1D6)
- audio format: +0x16 (record +0x1E8)
- channels: +0x14 (record +0x1E6)
- sample rate: +0x18 (record +0x1EA)
- byte rate: +0x1C (record +0x1EE)
- block align: +0x20 (record +0x1F2)
- bits/sample: +0x22 (record +0x1F4)
- data size: +0x28 (record +0x1FA)

## Supplied All Preset empirical validation

Among 27 resource-bearing records:
- 15 use 24-bit fields: RIFF 0x1824, 48 kHz, byte rate 144000, align 3, bits 24, data 0x1800.
- 11 use 32-bit fields: RIFF 0x2024, 48 kHz, byte rate 192000 (0x2EE00), align 4, bits 32, data 0x2000.
- Ordinal 91 has a nonstandard/overwritten RIFF/WAVE signature region and remains exceptional.
- 32-bit ordinals: 3, 6, 9, 80, 81, 82, 83, 109, 110, 111, 115.

## Safe implementation decision

1. Keep current live Single Export behavior unchanged.
2. All-file parsing/serialization must preserve each raw 44-byte WAVE header.
3. Live readback via 09/02 + 10/02 + 11/02 is evidenced to build a 24-bit header in QuickTone's finalizer. Do not synthesize 32-bit headers from name or waveform size.
4. A mixed-variant All record model needs an explicit raw-header field sourced from the source file or another validated metadata path, not from 09/02.
5. No app code/APK, NAM, User/Third Party, Collection, Import All or MIDI mapping was changed.


## Follow-up: direct comparison of live sync and All-file resource construction

Target remains original MG-30 Gen2 / QuickTone 2.6.7.16.

### Live sync

- 09/02 handler 0x004A9720 decodes 36 bytes.
- Manager setter 0x004B3E80 stores the first DWORD at resource object +0x00 and the remaining 32 bytes at +0x04..+0x23. These 32 bytes are the resource name, not WAVE metadata.
- Presence test 0x004B3FD0 checks the DWORD at object +0x00.
- 10/02 fills 2,048 float32 samples at resource object +0x60.
- 11/02 fills 600 uint16 curve values at +0x2060.
- Finalizer 0x004AB090 copies the name from +0x04 and +0x14 into the name region preceding the WAVE structure, copies 0x2000 waveform bytes and 600 curve values, and calls 0x004B50A0.
- Before finalization, it calls initializer 0x0084E110, which explicitly writes PCM format 1, 48 kHz, byte rate 144000, block align 3, 24 bits/sample, RIFF size 0x1824 and data size 0x1800.

### All Preset file loading

The per-record processing block at 0x004ABFxx branches on the marker at record +0x1AE. For a resource-bearing record it processes:
- name at +0x1B2;
- waveform at +0x1FE, length 0x2000;
- curve at +0x21FE;
- scenes at +0x004;
- resource record through 0x004B5180.

The loader 0x004B5180 copies the WAVE header directly from the record in chunks:
- 16 bytes from +0x1D2;
- 16 bytes from +0x1E2;
- 8 bytes from +0x1F2 (including the DWORD at +0x1FA).
It separately copies the 32-byte name, 0x2000 waveform bytes, and 600 curve WORDs, then passes the assembled structure to 0x004B50A0.

### Resolution

0x004B50A0 is shared, but its input structures differ:
- live sync passes a WAVE object created by the fixed 24-bit initializer;
- All-file loading passes a WAVE header copied from the original record.

This directly explains how All-file loading can retain mixed 24-bit/32-bit headers without the live readback finalizer generating those variants.

### Implementation boundary

- Keep live Single Export unchanged.
- Treat 09/02 as presence + 32-byte name, not WAVE metadata. Supersedes the earlier incorrect descriptor-to-WAVE mapping.
- For All-file import/export, preserve each record's raw 44-byte WAVE header.
- Do not infer 32-bit live readback from the name, preset number, sample buffer size or waveform values.
- The original source/provenance of the 32-bit records before All-file loading remains unresolved.
- No app code/APK, NAM, User/Third Party, Collection, Import All or MIDI mappings changed.


## Follow-up: legacy All Preset converter discovered — VA 0x004B5A20

A separate QuickTone path accepts a legacy all-bank buffer and converts it into the modern manager/export record representation.

### Input and output sizes

- Input must be exactly 0x12C800 bytes = 128 × 0x2590.
- Output allocation is 0x135700 bytes = 128 × 0x26AE.
- The converter loops exactly 128 records.
- Source record stride is 0x2590; destination record stride is 0x26AE.

### Conversion behavior

The converter allocates/clears a 0x12C800 intermediate buffer. For each source record it:
- initializes scene conversion state using helper 0x004B7620 and converts three scenes through 0x004B5EC0;
- writes RIFF, WAVE, fmt and data identifiers into the intermediate audio structure;
- writes fmt chunk length 0x10 and PCM format tag 1;
- copies source audio payload (0x2000 bytes) into the destination record's waveform region;
- copies 600 WORD curve values into the destination curve region;
- writes three converted scenes and advances by source stride 0x2590 and destination stride 0x26AE.

The resulting 0x135700 buffer is then passed into the modern All Preset manager-loading path.

### What this does and does not prove

- Confirmed: QuickTone has a legacy all-bank conversion path distinct from the modern 0x26AE record loader and from live device readback.
- Confirmed: this converter writes WAVE container identifiers and the PCM format tag while constructing intermediate records.
- Not yet proven: whether this legacy converter can create the 32-bit headers observed in the modern All Preset file. The inspected instructions do not yet establish every WAVE numeric field written or copied into the intermediate structure.
- Therefore do not attribute the 11 observed 32-bit records to this converter without further tracing.

### Current provenance model

There are now three confirmed construction paths:
1. Live device sync: 09/02 name/presence + 10/02 samples + 11/02 curve; finalizer uses fixed 24-bit WAVE initializer.
2. Modern All Preset load: copies each record's raw WAVE header into the manager resource object, preserving mixed variants.
3. Legacy All Preset conversion: converts 128 × 0x2590 input records into 128 × 0x26AE modern records, writing WAVE structural identifiers and PCM format tag during conversion; exact bit-depth provenance remains unresolved.

No app source/APK, NAM, User/Third Party, Collection, Import All, or MIDI mapping was changed.


## Follow-up: legacy converter numeric WAVE fields do not explain 32-bit records

A direct instruction-level recheck of 0x004B5A20 and its header initializer 0x004B0230 narrows the legacy conversion path further.

### Header initialization performed by 0x004B0230

For each of 128 output records, 0x004B0230:
- calls helper 0x004B02F0 to initialize the three scene structures;
- writes RIFF at record +0x1D2;
- writes WAVE at +0x1DA;
- writes fmt at +0x1DE;
- writes fmt chunk length 0x10 at +0x1E2;
- writes PCM format tag 1 at +0x1E6;
- writes data at +0x1F6.

It does not write the numeric WAVE fields: RIFF size, channel count, sample rate, byte rate, block align, bits/sample or data size.

### Legacy converter buffer behavior

At 0x004B5A20:
- allocates 0x12C800 bytes and clears the entire intermediate buffer;
- initializes 128 WAVE structures using the marker-only initializer above;
- allocates and clears the 0x135700-byte output;
- converts the three scenes and copies 0x2000 waveform bytes and 600 curve WORDs per record;
- advances source by 0x2590 and destination by 0x26AE.

Because the output is cleared before marker initialization and the converter does not populate the numeric WAVE fields, this inspected legacy conversion route does not supply the 24-bit or 32-bit numeric header values seen in the modern All Preset sample. The 32-bit records therefore cannot be attributed to this converter based on the recovered code.

### Consequence

The legacy converter is a structural/scene/audio/curve conversion route, not a proven origin of the mixed numeric WAVE header variants. The 32-bit record provenance remains unresolved. Keep the earlier safe rule: preserve raw per-record headers for modern All Preset files; do not infer a 32-bit live readback header.

No application source/APK, NAM, User/Third Party, Collection, Import All or MIDI mapping was changed.


## Follow-up: All Preset serializer/deserializer path

Inspected serializer 0x004B4F80, its paired deserializer 0x004B5180, and call sites.

### Serializer 0x004B4F80
- Creates a temporary buffer of exactly 0x2504 bytes and clears it.
- Calls 0x004B5480 to prepare/convert the manager resource object into that temporary representation.
- Wraps the temporary buffer in the application's stream/archive abstraction and copies exactly 0x2504 bytes to the caller's record buffer.
- It does not contain direct writes to RIFF/WAVE numeric fields (sample rate, byte rate, block align, bits/sample, RIFF size, data size).

### Deserializer 0x004B5180
- Reads exactly 0x2504 bytes through the corresponding stream/archive abstraction.
- Calls the inverse object conversion path and copies the decoded object into the manager resource object.
- It is therefore a paired object serializer/deserializer, not a live USB packet handler and not a WAVE-header initializer.

### Call-site confirmation
The serializer is used in several resource-manager flows, including live resource update/readback and All Preset construction. The caller supplies a preset/resource selector and a destination record buffer; the serializer's fixed 0x2504-byte object payload is embedded after the record metadata. This explains why the resource object is preserved as a fixed-size serialized block, but does not identify the origin of the mixed 24-/32-bit WAVE numeric fields.

### Next trace target
The unresolved numeric WAVE fields are likely established inside the object conversion routine 0x004B5480 or in the underlying serialized object implementation it invokes. The routine uses framework string/archive/object helpers rather than obvious direct field stores, so its input/output object layout must be recovered before drawing conclusions. No evidence yet that 32-bit is generated by the live device protocol.

No application source/APK, NAM, User/Third Party, Collection, Import All or MIDI mapping was changed.


## Clarification: MG-30 published 32-bit A/D and D/A converter specification

The user clarified that “32-bit” refers to the MG-30 hardware specification: 32-bit A/D and D/A converters, not merely internal DSP arithmetic.

Official NUX MG-30 product material describes premium 32-bit dual-channel A/D and D/A converters and approximately 110 dB dynamic range. The owner manual lists A/D converter 32-bit, 48 kHz sampling frequency, and 110 dB dynamic range.

### Engineering interpretation (hypothesis, not a file-format requirement)
- Converter word-width specification describes the analog/digital conversion path; it does not establish that custom IR files must be 32-bit PCM.
- A 110 dB dynamic range corresponds to roughly 18.3 ideal quantization bits using 6.02 dB/bit, so “32-bit converter” must not be interpreted as 32 effective noise-free bits or as 32-bit analog headroom.
- Analog headroom depends on analog circuit full-scale voltage and gain structure, not simply the number of bits in a WAV file.
- 32-bit PCM WAVE resources found in the All Preset sample may be an internal or serialization representation, but the hardware converter specification alone cannot prove that.
- The known live IR transfer converts source samples to float32 for waveform payload generation. This is distinct from PCM 32-bit WAVE storage and does not prove a 32-bit IR requirement.

### Consequence for MG30 Studio
Do not force Third Party/User IR to 32-bit PCM or rewrite existing IR headers on the basis of the converter specification. Preserve the verified 09/10/11 User transfer path. Investigate 24-bit and 32-bit WAVE resources independently, and test any compatibility policy with controlled source files and device readback. Do not change NAM, Collection, Import All, or MIDI mappings.

Sources checked 2026-11-05:
- NUX official MG-30 product page: https://nuxaudio.com/product/mg30/
- MG-30 owner manual specification excerpt: A/D Converter 32-bit; sampling frequency 48 kHz; dynamic range 110 dB.


## Correction from user: source IR files are consistently 24-bit

The user clarified that the IR files they use are always 24-bit. Therefore the 11 records with 32-bit WAVE headers in the QuickTone All Preset sample must not be described as evidence that the user's source IRs are 32-bit, nor as a requirement for Third Party/User import.

Updated interpretation:
- Observed fact: 11 All Preset resource records contain 32-bit WAVE headers; 15 contain 24-bit WAVE headers among the 26 standard WAVE records.
- User-provided fact: the user's IR source files are consistently 24-bit.
- Unproven hypotheses: QuickTone or MG-30 may convert 24-bit source IR data into a 32-bit internal/resource representation, or the records may have another provenance. Existing evidence does not distinguish these explanations.
- The 32-bit A/D and D/A converter specification does not imply that source IR WAV files should be 32-bit.

Next investigation should compare a known 24-bit source IR against the exact corresponding resource after QuickTone import/export, then inspect the point at which the record's WAVE header changes. Do not force 32-bit conversion, change the Third Party/User `09/10/11` protocol, or alter NAM, Collection, Import All, or MIDI mappings without evidence.
