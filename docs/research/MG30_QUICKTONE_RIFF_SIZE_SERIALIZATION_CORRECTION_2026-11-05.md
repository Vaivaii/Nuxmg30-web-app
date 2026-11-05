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
