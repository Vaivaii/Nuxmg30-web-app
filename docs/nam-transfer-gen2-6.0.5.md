# MG-30 Gen 2 firmware 6.0.5 — NAM transfer investigation

Scope: original NUX MG-30 (Gen 2 firmware 6.0.5), not MG-30 MKII. This work remains isolated on branch android/nam-transfer-tone3000; do not modify main or the Android Capacitor branches.

## Paired captures and slot mapping

Two USBPcap imports were mapped to their source models:

- namimport1.pcapng: Friedman DS40.nam, slot 9, selector 0x10.
- namimport2.pcapng: Mesa Boogie Mark V Rythm Amp Only.nam, slot 10, selector 0x12.

Each capture contains 83 outgoing SysEx messages: one 167-byte setup message, 61 full-size 177-byte transfer messages, one final short 58-byte transfer message, and 20 slot readback requests. The offset-zero full-size transfer message is duplicated, giving 60 unique full-size transfer offsets. The short final frame has offset 8160 and an all-zero data region. All imported messages use vendor prefix F0 43 58 70 58 ... F7. Data messages use command 01, subcommand 04; associated device ACKs use command 03.

The transfer offset fields are 7-bit counters. The values increase by 17, and multiplying each counter by 8 gives the byte offset for a 136-byte data window: 0, 136, 272, ... . The 60 unique transfer windows end at byte offset 8024.

## Source model structure

Both source models are version 0.7.0, architecture SlimmableContainer, with two nested WaveNet submodels:
- first submodel: A2-Lite, max_value: 0.5, 1,871 float weights
- second submodel: A2-Full, max_value: 1.0, 12,146 float weights

Per the target behavior supplied by the user, the original MG-30 Gen 2 uses NAM A2-Lite. The investigation therefore selects the first submodel and does not send the A2-Full weights.

## Weight size and transfer-window correlation

A2-Lite has exactly 1,871 float32 weights, which occupy 7,484 bytes. Both capture streams show model-dependent transfer data in the windows starting at offsets 0 through 7,480 (56 windows). The last of those windows contains four meaningful bytes through offset 7,483; the remaining part is padding. The four later windows starting at offsets 7,616, 7,752, 7,888, and 8,024 have all-zero payloads.

This is strong evidence that the variable transfer region corresponds to an approximately 7,484-byte A2-Lite weight-sized object, rather than the whole source JSON model. It does **not** prove that the wire bytes are the source float32 weights unchanged.

## .namb candidate and validation tests

TONE3000's public nam-binary-loader documents a compact .namb format and a nam2namb converter that can select a SlimmableContainer submodel with --slim. The canonical A2-Lite .namb layout is 7,980 bytes, with its 1,871 float32 weights occupying 7,484 bytes beginning at offset 496. This supports using .namb as a useful intermediate candidate, but does not establish that MG-30 accepts the complete .namb container.

Candidate A2-Lite outputs were generated from both supplied files for offline comparison:
- Friedman: 7,980-byte .namb, 1,871 weights, weight offset 496; CRC32 verified.
- Mesa: 7,980-byte .namb, 1,871 weights, weight offset 496; CRC32 verified.
- Separate raw little-endian float32 weight blobs: 7,484 bytes each.

The following hypotheses were tested against each capture: the usual 7-bit MIDI encoding with a bitmask at the start of each group, the corresponding bitmask-at-end variant, and four continuous 7-bit bitstream bit-order variants. None matched the captured transfer blocks byte-for-byte as a direct encoding of the original ordered weights. A candidate reorder based on TONE3000's public A2-Lite embedded runtime weight-loader order also did not match under the two mask-based encodings.

Therefore, the remaining transformation is not simply “take the .nam weights and apply one common 7-bit encoding.” Possibilities still include NUX/QuickTone-specific serialization, a different packing variant, reordered/transformed values, or another conversion step. Do not infer a successful conversion from the correct byte count alone.

References:
- https://github.com/tone-3000/nam-binary-loader
- https://github.com/tone-3000/embedded
- https://github.com/MilanMarocchi/teensy_nam_pedal/blob/main/docs/MODELS.md (community reference for raw 1,871-float A2-Lite blobs; not an NUX file specification)

## Confirmed flow details still needing interpretation

- Initial setup message: 167 bytes, subcommand 0C.
- Transfer data messages: 177 bytes, subcommand 04, followed by the offset and the 156-byte 7-bit-safe data region.
- Each data packet is acknowledged with a 21-byte device reply; 63 ACK messages were reconstructed in the full capture.
- After transfer, QuickTone sends two rounds of ten slot readback requests (selectors 00, 02, 04, ... 12) and receives ten 167-byte replies per round. Corresponding replies from the two rounds match byte-for-byte.
- Trailing MIDI CC events B0 4E 03 and B0 03 3D remain unexplained.

## Next steps

1. Inspect NUX/QuickTone's exact 8-to-7 serialization or any model-specific conversion, using these two model/capture pairs as test fixtures.
2. Validate any candidate conversion against both Friedman and Mesa; it must reproduce both captures at the right slot selectors and offsets.
3. Identify transfer completion/commit behavior and any checksum or validation fields.
4. Only then implement the native Android USB-MIDI send path and test a known safe model on the physical MG-30.

## TONE3000 integration

The existing integration in www/tone3000.js already supports the API selection flow and saving downloaded model files inside the native app. The “Kirim ke MG-30” action remains deliberately disabled until the conversion and transfer path is validated. Do not rebuild or replace the TONE3000 integration; extend it only after the protocol is understood.
