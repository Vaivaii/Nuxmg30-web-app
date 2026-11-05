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

The offline script docs/research/quicktone-mg30-codec-analysis.py validates A2-Lite weight data and generates matching data frames. The transaction-level companion validator is docs/research/quicktone-mg30-transaction-analysis.py. Both are offline-only: they do not send MIDI or execute QuickTone.

For both Friedman/slot 9 and Mesa/slot 10, the test regenerated all outgoing messages:
- Metadata/name write: exact byte-for-byte match after replacing the first 32 payload bytes with the captured slot label and using the matching 96-byte metadata template.
- All 62 weight frames, including the repeated offset-zero frame and the final 32-byte frame: exact byte-for-byte match from the source A2-Lite weights plus 708 zero bytes.
- All 20 slot metadata queries: exact byte-for-byte match.
- Reconstructed 8,192-byte buffer: zero mismatches.
- All 63 ACK descriptors match the sent metadata/data descriptors, and the 20 readback replies have the same shape and are byte-identical across the two rounds.

This resolves the A2-Lite weight packing. The remaining risk is not the encoding: it is safely reproducing the full native transaction in the Android application, including ACK wait/retry timing, metadata template policy for downloaded TONE3000 models, error/cancel handling, and confirming on hardware that slot contents/name are correct. QuickTone's duplicate offset-zero behavior also still needs a deliberate implementation/test decision.

## Current app implementation on the isolated branch

The following implementation has now been added to this branch:
- www/nam-transfer.js contains the NAM/.namb A2-Lite extraction, frame builder, ACK matching, retry/timeout handling, two-round metadata readback, and slot-name check.
- www/tone3000.js adds a native-only “Kirim ke MG-30” action with a required slot choice and explicit overwrite confirmation. It downloads and keeps the original selected model file in app-private storage before attempting transfer.
- www/native-midi.js reuses an already-open USB-MIDI connection instead of reopening ports when the TONE3000 panel initiates the send.

The send button is now enabled in the native Android app as an **experimental transfer action**, but the app has not yet been tested against a physical MG-30 with this implementation. The two captures validate the codec and transaction shape offline; they do not prove that Android's MIDI transport timing or the hardcoded 96-byte metadata tail will behave identically on a real device. A failed transfer may leave a partially written target slot.

The success status specifically verifies every write ACK plus stable slot metadata and matching slot name across two readback rounds. Since the device protocol does not read the model weights back, success must not be described as byte-verified model storage. The user should audition the new slot before relying on it.

## Remaining hardware validation

1. Build the APK from android/nam-transfer-tone3000 and install it on the Android device connected to the original MG-30 Gen 2.
2. Back up or choose a disposable target slot; explicitly confirm the selected slot in the UI.
3. Transfer one known A2-Lite model and observe ACK progress, completion, and the slot label on the device/QuickTone.
4. Audition the slot. Only after this end-to-end test should the action be treated as stable.

## References

- TONE3000 compact NAM binary format: https://github.com/tone-3000/nam-binary-loader
- TONE3000 A2 embedded runtime: https://github.com/tone-3000/embedded
- NUX distinction between native A2-Lite and legacy A1 conversion: https://www.nux.us/es/pages/nam-a2-native

The existing TONE3000 integration in www/tone3000.js remains intact; transfer capability was added around it rather than replacing it. “Kirim ke MG-30” is currently exposed as an experimental native-only action with explicit slot selection/overwrite confirmation, ACK handling, retry/timeout, and metadata readback. The 96-byte metadata tail was compared byte-for-byte with both supplied captures. It still has not been hardware-tested on the user's physical MG-30, so a first test should use a backed-up/disposable slot and the user should audition the result. Do not execute QuickTone.exe in this workflow.
