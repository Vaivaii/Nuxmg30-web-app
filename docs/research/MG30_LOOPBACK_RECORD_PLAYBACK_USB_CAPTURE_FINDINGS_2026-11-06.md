# NUX MG-30 Gen 2 — Loop Back, Record Level, Playback Level USB Capture Findings

**Date:** 2026-11-06  
**Target:** Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
**Capture files:** `loopoffon.pcapng`, `loopbackonoff2.pcapng`, `reclevel.pcapng`, `playlevel.pcapng`

## Summary

All four captures contain USB-MIDI SysEx traffic using the same vendor message family. Each host-to-device update is a 46-byte SysEx message with command `14 01`, followed by a 15-byte device response with command `14 03`.

- Host → device: `F0 43 58 70 14 01 ... F7`
- Device → host ACK/response: `F0 43 58 70 14 03 00 00 00 00 00 00 00 00 F7`

The captured update frames have identical structure apart from the control field that changes in each test. USB endpoints observed: host OUT `0x02`; device IN `0x82`.

## Captured field deltas

Byte offsets below are zero-based offsets in the reconstructed SysEx message, counting `F0` as offset 0.

| Capture / control | Changed byte offset | Observed values (hex) | Decimal values |
|---|---:|---|---|
| `loopbackonoff2.pcapng` / Loop Back | `0x20` (32) | `11 → 01` | 17 → 1 |
| `loopoffon.pcapng` / Loop Back | `0x20` (32) | `01` | 1 |
| `playlevel.pcapng` / Playback Level | `0x1F` (31) | `68, 70, 76, 7A, 7A` | 104, 112, 118, 122, 122 |
| `reclevel.pcapng` / Record Level | `0x1D` (29) | `34, 37, 3A, 3C, 3C` | 52, 55, 58, 60, 60 |

Across the slider captures, only the corresponding value byte changes between otherwise matching 46-byte host messages. Each update has a matching `14 03` device response in the capture. Counts: Loop Back capture `loopoffon` = 1 update/1 response; `loopbackonoff2` = 2/2; Playback Level = 5/5; Record Level = 5/5.

## Loop Back interpretation

In `loopbackonoff2.pcapng`, the control byte at offset `0x20` changes from `0x11` to `0x01`. XOR difference is `0x10`, so bit `0x10` is the observed state bit while the low nibble remains `0x01`. The capture filename and event order are consistent with ON (`0x11`) followed by OFF (`0x01`), but this polarity should be confirmed on the physical MG-30 before hard-coding the UI state mapping. `loopoffon.pcapng` also contains a `0x01` update.

## Slider interpretation

- Record Level is directly represented in the captured frame by the value at offset `0x1D`.
- Playback Level is directly represented in the captured frame by the value at offset `0x1F`.
- Values above are raw 7-bit SysEx field values observed on the wire. The capture set does **not** establish the UI scaling, units (such as dB), or minimum/maximum range. Do not convert these to a UI percentage or dB scale without further endpoint captures or a controlled full-range sweep.

## Safe implementation guidance

1. Reuse the observed `14 01` message family and `14 03` response handling for these controls; do not replace them with guessed MIDI CC messages.
2. When changing Loop Back, preserve all bytes in the 46-byte frame and change only offset `0x20`, using the ON/OFF polarity only after device-side confirmation.
3. When changing Record Level, preserve the frame and change only offset `0x1D`.
4. When changing Playback Level, preserve the frame and change only offset `0x1F`.
5. Keep slider values in the observed raw domain until the UI scale is independently established.
6. This analysis is additive and does not justify changes to NAM transfer, IR User/Third Party or Collection transfer, or MIDI CC mappings.

## What remains unproven

- Exact semantic meaning of every other field in the 46-byte message.
- UI value-to-wire scaling, range, and unit for Record Level and Playback Level.
- Definitive ON/OFF polarity from the packet data alone; current interpretation follows the capture name/order and should be checked against the device.
- Whether all firmware 6.0.x builds use identical field offsets; this is observed for the supplied device/session only.

## Decoder method

USBPcap pcapng Enhanced Packet Blocks were decoded, USB-MIDI event packets on endpoints `0x02` and `0x82` were reconstructed using their CIN lengths, then SysEx messages were compared byte-by-byte. This is a passive analysis of the supplied captures; no device writes were sent during analysis.
