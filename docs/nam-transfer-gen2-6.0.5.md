# NUX MG-30 Gen 2 NAM transfer — QuickTone 2.6.7.16

Scope: original NUX MG-30 Gen 2, firmware 6.0.5; not MG-30 MKII. Investigation branch: android/nam-transfer-tone3000. QuickTone.exe was inspected statically; it was not executed. Do not modify main or the other Android branches.

## Confirmed source and model parsing

The uploaded QuickTone.exe identifies as QuickTone 2.6.7.16 by Cherub Technology. Its file chooser accepts .nam and .namb inputs. Static analysis identified separate parser paths for NAM JSON and NAMB binary, including SlimmableContainer handling, WaveNet model checks, and weight-array extraction.

For the two supplied imports:
- namimport1.pcapng was Friedman DS40.nam in UI slot 9.
- namimport2.pcapng was Mesa Boogie Mark V Rythm Amp Only.nam in UI slot 10.
- Both files are SlimmableContainer models whose first submodel has 1,871 A2-Lite float weights; the second submodel is the larger A2-Full model.
- The transfer data on the wire is exactly the first A2-Lite submodel's 1,871 little-endian IEEE-754 float32 weights. No extra model metadata or NAMB file header is transmitted in this data region.

## Exact payload layout recovered from QuickTone.exe

Static disassembly found the packet-building path:
- VA 0x4AE040 constructs the transfer operation and uses a fixed 0x2000-byte (8,192-byte) buffer.
- It walks the buffer in 0x88-byte (136-byte) chunks.
- VA 0x4A4B10 builds each packet; VA 0x4A49E0 is the 8-bit-to-7-bit packer.
- The packer uses a continuous LSB-first bit stream, not the common per-seven-byte high-bit mask scheme.

The 8,192-byte transfer buffer is:
- Bytes 0..7,483: 1,871 A2-Lite float32 weights, exactly as represented in the first submodel's weights array.
- Bytes 7,484..8,191: 708 zero-padding bytes.

Every decoded transfer packet begins with a 12-byte descriptor, followed by the corresponding data chunk:
- byte 0: 0 in both captures; field meaning not yet established
- byte 1: zero-based slot index (8 for UI slot 9; 9 for UI slot 10)
- byte 2: 1
- byte 3: 3 for the captured A2-Lite transfer path; semantic label not yet established
- bytes 4..7: transfer byte offset, unsigned 32-bit little-endian
- bytes 8..11: total buffer size, unsigned 32-bit little-endian (8,192)
- bytes 12 onward: up to 136 bytes from the 8,192-byte transfer buffer

For every frame, QuickTone packs descriptor + data together as continuous LSB-first 8-to-7 bitstream, then wraps it with:
F0 43 58 70 58 01 + packed bytes + F7

For a full chunk, the raw descriptor+payload is 148 bytes; the packed region is 170 bytes, making a 177-byte SysEx message (6-byte prefix + 170 packed bytes + F7). The last chunk starts at offset 8,160 and contains only 32 payload bytes; it becomes a 58-byte SysEx message.

## Byte-for-byte validation against both captures

The offline validator in docs/research/quicktone-mg30-codec-analysis.py reconstructs the same frame format from each NAM source and compares it against the captured USBPcap messages.

Results for both Friedman/slot 9 and Mesa/slot 10:
- 1,871 weights / 7,484 bytes recovered.
- 8,192-byte transfer buffer reconstructed with exactly 708 zero bytes after the weights.
- 61 unique data offsets, from 0 through 8,160 in steps of 136.
- 62 transfer frames observed because offset 0 appears twice (one extra copy; whether caused by retry/timing is still to be confirmed).
- Every decoded payload block matches the source weights + zero padding.
- Every generated full or final-short frame matches the corresponding captured message byte-for-byte, including the duplicate offset-zero copies.
- Reconstructed-buffer mismatch count: zero bytes for both models.

This settles the weight encoding and packet framing. It does not yet establish the complete device-side transaction lifecycle: the initial 167-byte command with subcommand 0C, ACK/retry timing, any slot commit/verification step, and final readback sequence must still be traced and tested before enabling app-to-device transfer.

## References and prior work

- TONE3000 compact NAM binary format: https://github.com/tone-3000/nam-binary-loader
- TONE3000 A2 embedded runtime: https://github.com/tone-3000/embedded
- NUX explanation of native A2-Lite versus legacy A1 conversion: https://www.nux.us/es/pages/nam-a2-native

Existing TONE3000 integration in www/tone3000.js remains intact. “Kirim ke MG-30” stays disabled until the remaining transaction control flow is validated. Do not rebuild or replace that integration, and do not execute transfer against a real device until a complete safe transaction path has been implemented and tested.
