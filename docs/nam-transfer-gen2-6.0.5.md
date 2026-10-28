# NUX MG-30 Gen 2 NAM transfer — QuickTone 2.6.7.16

Scope: original NUX MG-30 Gen 2 firmware 6.0.5; not MG-30 MKII. Investigation branch: android/nam-transfer-tone3000. QuickTone.exe was inspected statically, not executed. Do not modify main or other Android branches.

## Model parsing and data buffer

The supplied QuickTone.exe identifies as version 2.6.7.16 by Cherub Technology. Its file chooser accepts .nam and .namb; static analysis found separate parser paths for NAM JSON and NAMB binary, including SlimmableContainer/WaveNet and weight-array handling.

Known pairs:
- namimport1.pcapng: Friedman DS40.nam, imported into UI slot 9 (zero-based slot index 8).
- namimport2.pcapng: Mesa Boogie  Mark V Rythm Amp Only.nam, imported into UI slot 10 (zero-based slot index 9).

Both models use a SlimmableContainer with A2-Lite as the first submodel (1,871 float32 weights) and A2-Full as the second. The captured native MG-30 A2-Lite transfer sends exactly the first submodel's 1,871 little-endian IEEE-754 float32 weights: 7,484 bytes. QuickTone creates an 8,192-byte transfer buffer with the remaining 708 bytes set to zero. No .nam JSON or .namb header is sent in the weight-data region.

## Exact binary-to-SysEx encoding

Static disassembly of QuickTone.exe identified:
- VA 0x4AE040: 8,192-byte transfer routine; advances transfer offset by 0x88 (136) bytes.
- VA 0x4A4B10: generic descriptor+payload packet builder.
- VA 0x4A49E0: continuous LSB-first 8-bit-to-7-bit packer.

Each SysEx frame contains a five-byte fixed root F0 43 58 70 58, one outer command byte, a packed body, then F7. The 12-byte descriptor is decoded after unpacking the body. All multi-byte descriptor integers are little-endian.

### Metadata/name write — outgoing outer command 01

One 167-byte message is sent before the weights. Its decoded descriptor is:
- byte 0: 0 in both captures; semantic meaning not established
- byte 1: zero-based target slot (8 or 9 in these captures)
- byte 2: 3
- byte 3: 0
- bytes 4..7: offset 0
- bytes 8..11: payload length 128

The following 128-byte payload starts with a 32-byte slot label (UTF-8/ASCII bytes, zero-padded when shorter; the 32-byte Mesa label is truncated at the limit). The remaining 96 bytes are identical across these two captures. Their field semantics have not yet been identified, so treat those bytes as a device metadata template rather than assuming they can be regenerated from arbitrary NAM metadata.

### A2-Lite weight data — outgoing outer command 01

Each data frame has the descriptor:
- byte 0: 0 in both captures; semantic meaning not established
- byte 1: zero-based target slot
- byte 2: 1
- byte 3: 3 for the captured native A2-Lite transfer
- bytes 4..7: byte offset in the 8,192-byte buffer
- bytes 8..11: declared buffer size, 8,192
- bytes 12 onward: up to 136 bytes from the transfer buffer

The 12-byte descriptor is packed together with the data chunk, using the continuous LSB-first 8-to-7 encoder. A full chunk has 148 raw bytes (= 12 descriptor + 136 data) and 170 encoded bytes, giving a 177-byte SysEx frame. The final frame begins at offset 8,160 and carries 32 payload bytes, giving a 58-byte frame. The full-size frame at offset zero appears twice in each capture; both copies have ACKs. The reason for the duplicate remains unconfirmed.

The full transfer has 62 data frames, 61 unique offsets (0, 136, ..., 8,160), and 63 total device ACKs when the preceding metadata write ACK is included.

### Slot metadata readback

After transfer, QuickTone reads metadata from all ten slots twice:
- Outgoing query frames use outer command 00. Decoded descriptor: [0, zero-based slot index, 4, 0, offset 0, declared size 0], followed by 136 zero bytes. These are 177-byte messages.
- Device replies use outer command 02. Descriptor: [0, zero-based slot index, 4, 0, offset 0, payload size 128], followed by a 128-byte metadata record. These are 167-byte messages.
- The two rounds return byte-identical metadata for each corresponding slot.
- Device ACK messages use outer command 03; the 12-byte descriptor echoes the metadata/data write being acknowledged. Captures show one ACK for the metadata/name write and one for each of the 62 data frames.

Thus each capture contains 83 outgoing SysEx messages (1 metadata write + 62 data frames + 20 slot queries) and 83 incoming SysEx messages (63 ACKs + 20 metadata replies). All query/reply slots follow zero-based slot indices 0 through 9, repeated twice.

## Byte-exact validation

The offline script docs/research/quicktone-mg30-codec-analysis.py validates A2-Lite weight data and generates matching data frames. A companion transaction report was generated offline by /mnt/data/quicktone_mg30_transaction_analysis.py; it does not send MIDI or execute QuickTone.

For both Friedman/slot 9 and Mesa/slot 10, the test regenerated all outgoing messages:
- Metadata/name write: exact byte-for-byte match after replacing the first 32 payload bytes with the captured slot label and using the matching 96-byte metadata template.
- All 62 weight frames, including the repeated offset-zero frame and the final 32-byte frame: exact byte-for-byte match from the source A2-Lite weights plus 708 zero bytes.
- All 20 slot metadata queries: exact byte-for-byte match.
- Reconstructed 8,192-byte buffer: zero mismatches.
- All 63 ACK descriptors match the sent metadata/data descriptors, and the 20 readback replies have the same shape and are byte-identical across the two rounds.

This resolves the A2-Lite weight packing. The remaining risk is not the encoding: it is safely reproducing the full native transaction in the Android application, including ACK wait/retry timing, metadata template policy for downloaded TONE3000 models, error/cancel handling, and confirming on hardware that slot contents/name are correct. QuickTone's duplicate offset-zero behavior also still needs a deliberate implementation/test decision.

## Next steps

1. Add the codec/transaction builder in the isolated app branch, with independent tests against both captures before enabling the UI.
2. Implement per-frame ACK matching and timeout/cancel handling; only mark success after all data ACKs and slot readback validation.
3. Decide whether to preserve a known-safe metadata template or identify all metadata fields and their meanings.
4. Perform a physical MG-30 Gen 2 test with a user-selected slot before enabling normal use.

## References

- TONE3000 compact NAM binary format: https://github.com/tone-3000/nam-binary-loader
- TONE3000 A2 embedded runtime: https://github.com/tone-3000/embedded
- NUX distinction between native A2-Lite and legacy A1 conversion: https://www.nux.us/es/pages/nam-a2-native

The existing TONE3000 integration in www/tone3000.js remains intact. “Kirim ke MG-30” remains disabled until the transaction builder, ACK flow, and readback check are implemented and tested. Do not execute QuickTone.exe in this workflow, and do not send to a physical device before transaction safety checks are in place.
