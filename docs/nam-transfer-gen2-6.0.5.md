# MG-30 Gen 2 firmware 6.0.5 — NAM transfer investigation

Scope: original NUX MG-30 (Gen 2 firmware 6.0.5), not MG-30 MKII. This work remains isolated on branch `android/nam-transfer-tone3000`; do not modify `main` or the Android Capacitor branches.

## Paired captures and slot mapping

Two newly supplied USBPcap captures were mapped to the matching .nam files:

- `namimport1.pcapng`: `Friedman DS40.nam`, imported into slot 9. The selector byte at SysEx offset 7 is `0x10`.
- `namimport2.pcapng`: `Mesa Boogie Mark V Rythm Amp Only.nam`, imported into slot 10. The selector byte at SysEx offset 7 is `0x12`.

The same import flow later reads back ten slots using selectors `00, 02, 04, ... 12`. This supports (but should still be hardware-verified) the mapping `selector = 2 * (slot - 1)`.

Each capture has 350 USBPcap packet records and the same 166 reassembled complete SysEx messages:
- 63 messages of 21 bytes (ACKs; command byte `03`)
- 21 messages of 167 bytes
- 81 messages of 177 bytes
- 1 message of 58 bytes

The import starts with a 167-byte setup message, followed by 61 unique transfer offsets plus a duplicate of the first 177-byte transfer message. A 58-byte shorter message ends the transfer sequence. Each transfer message is acknowledged. The transfer offsets follow the same sequence for both models, ending at `0x77C`; the precise semantics of the offset field are not yet confirmed.

## Source model structure

Both uploaded models are NAM version `0.7.0`, architecture `SlimmableContainer`, with two nested `WaveNet` submodels. The submodel weight counts match the A2 variants documented by TONE3000's embedded runtime:
- first submodel: 1,871 float weights (A2-Lite)
- second submodel: 12,146 float weights (A2-Full)

The two source files have the same submodel shape/counts but different weight values and metadata. MG-30 Gen 2 is documented as supporting the NAM A2-Lite tier. This strongly suggests the import path selects or derives the first (1,871-weight) submodel rather than sending the entire JSON container, but the exact serialization path still needs proof.

Reference: https://github.com/tone-3000/embedded
Reference binary format for comparison only: https://github.com/tone-3000/nam-binary-loader

## Payload comparison

The captures have identical packet/message counts and matching transfer offset sequences. The model-dependent bytes differ throughout the transfer blocks up to the partial final data block at offset `0x727` (decimal 1831). Starting at offset `0x738` (decimal 1848), the remaining transfer bodies are zero-filled after the fixed message prefix and match between both captures; these appear to be padding/end-of-buffer blocks.

A candidate standard 7-bit-to-8-bit unpacking of the variable transfer body does **not** yield a normal `.namb` file: there is no `NAMB` magic at the start, and the decoded buffer does not contain the source A2-Lite weights as raw ordered IEEE-754 float32 bytes. Therefore, the transfer must not be treated as a direct copy of the .nam JSON or assumed to be a standard .namb file. The remaining unknown is the device-specific conversion/packing, including possible weight reordering, quantization, or per-layer layout.

## Confirmed flow details

- All messages use vendor prefix `F0 43 58 70 58 ... F7`.
- Data transfer command byte is `01`; the paired ACK uses command byte `03`.
- The initial 167-byte message uses command byte `01` and subcommand `0C`.
- Data transfer messages use command byte `01` and subcommand `04`, with the same offset pattern across the Friedman and Mesa imports.
- After transfer, QuickTone performs two rounds of ten slot readback requests/selectors (`00, 02, 04, ... 12`) and receives ten 167-byte replies per round. Each pair of corresponding replies matches byte-for-byte between the rounds.
- Two trailing MIDI CC events are `B0 4E 03` and `B0 03 3D`; their exact role remains unknown.

## Next reverse-engineering steps

1. Normalize the variable model-data region by message offset and determine whether the device-side representation stores float32, a transformed/permuted weight layout, or a quantized representation.
2. Check any proposed conversion against both known models: Friedman (slot 9) and Mesa (slot 10). A candidate that only reproduces one capture is insufficient.
3. Identify the exact transfer completion/commit behavior and any checksum or validation fields.
4. Only after the byte conversion is validated, implement the native Android USB-MIDI transfer path and test a known safe model on the physical MG-30.

## TONE3000 integration

The existing integration in `www/tone3000.js` already supports the API selection flow and saving downloaded model files inside the native app. The “Kirim ke MG-30” action remains deliberately disabled until the conversion and transfer path are validated. Do not rebuild or replace the TONE3000 integration; extend it only after the transfer protocol is understood.
