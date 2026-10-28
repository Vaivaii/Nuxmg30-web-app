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

The import starts with a 167-byte setup message, followed by 61 unique transfer offsets plus a duplicate of the first 177-byte transfer message. A 58-byte shorter message ends the transfer sequence. Each transfer message is acknowledged. Offset-like fields advance through values such as `00 00, 11 00, 22 00, ...`; they are 7-bit/base-128 encoded counters, not yet a confirmed byte address.

## Source model structure and device target

Both uploaded models are NAM version `0.7.0`, architecture `SlimmableContainer`, with two nested `WaveNet` submodels. The first submodel has `max_value: 0.5` and 1,871 float weights; the second has `max_value: 1.0` and 12,146 float weights. The uploaded files therefore provide a useful pair of same-shape A2-Lite models with different weights, while also carrying the A2-Full submodel.

The target device behavior specified by the user is that the original MG-30 uses NAM A2-Lite; NAM A1 models are converted for the device. Reverse engineering should therefore focus on extracting/converting the A2-Lite submodel, not sending the A2-Full submodel.

## NAMB conversion hypothesis

`.namb` is a real compact binary NAM format documented by TONE3000's `nam-binary-loader`. Its `nam2namb` converter explicitly supports `SlimmableContainer` input using `--slim <factor>` to select a submodel. The TONE3000 embedded documentation identifies A2-Lite as 1,871 float weights and gives 7,980 bytes as the representative size of an A2-Lite `.namb` file. References:

- https://github.com/tone-3000/nam-binary-loader
- https://github.com/tone-3000/embedded

This makes a conversion-to-`.namb` step a strong candidate to investigate. It is **not yet proven** that QuickTone/MG-30 transfer sends an entire standard `.namb` file as-is. The transfer could extract only the weight section, add the protocol's own framing, repack/reorder weights, or apply a device-specific conversion after generating an intermediate file.

A first-pass attempt to decode the USB-MIDI payload as a simple standard 7-bit stream did not reveal a leading `NAMB` magic value or the source model's raw ordered float32 weight sequence. Do not treat that as ruling out `.namb`: correct per-message header/trailer removal, block boundaries, and possible repacking have not yet been fully established.

## Confirmed transfer flow

- All messages use vendor prefix `F0 43 58 70 58 ... F7`.
- Data transfer command byte is `01`; the paired ACK uses command byte `03`.
- The initial 167-byte message uses command byte `01` and subcommand `0C`.
- Data transfer messages use command byte `01` and subcommand `04`, with the same offset-counter sequence across the Friedman and Mesa imports.
- After transfer, QuickTone performs two rounds of ten slot readback requests/selectors (`00, 02, 04, ... 12`) and receives ten 167-byte replies per round. Each pair of corresponding replies matches byte-for-byte between the rounds.
- Two trailing MIDI CC events are `B0 4E 03` and `B0 03 3D`; their exact role remains unknown.

## Next reverse-engineering steps

1. Generate canonical `.namb` candidates from each source using the converter's A2-Lite selection (`nam2namb --slim 0.0`) and record output sizes, header, weight offset, and CRC.
2. Compare the candidate A2-Lite weight bytes (and any converted representation) against the captured variable transfer region, allowing for USB-MIDI framing, 7-bit encoding, packet-local headers, and the protocol's offset counter.
3. If weights do not match, test the model converter used for NAM A1 and isolate any additional MG-30-specific transformation.
4. Identify the exact transfer completion/commit behavior and any checksum or validation fields.
5. Only after the byte conversion is validated, implement the native Android USB-MIDI transfer path and test a known safe model on the physical MG-30.

## TONE3000 integration

The existing integration in `www/tone3000.js` already supports the API selection flow and saving downloaded model files inside the native app. The “Kirim ke MG-30” action remains deliberately disabled until the conversion and transfer path are validated. Do not rebuild or replace the TONE3000 integration; extend it only after the transfer protocol is understood.
