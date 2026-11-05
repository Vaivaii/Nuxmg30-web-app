# MG-30 CTRL Panel Open Capture — Hardware Readback Validation

Date: 2026-10-30  
Target: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
QuickTone: Windows v2.6.7.16  
Capture: `ctrlpanel.pcapng` (3,160 bytes)  
SHA-256: `3523dcb7ef6a77b3500bdd699b995002bad11a1842fe798d9b1bf307184b8abc`

## Purpose

Validate the statically recovered QuickTone EXP & Pedal panel-open read transaction on the original MG-30: request `13 00` and response `13 02`. This capture was supplied for the panel-open/no-setting-change experiment.

## Capture structure

- Pcapng interface link type: 249 (USBPcap), interface name `USBPcap1`.
- The application MIDI traffic uses USB endpoint OUT `0x02` and IN `0x82`.
- USB enumeration and descriptor requests at the beginning are setup traffic, not MG-30 setting messages.
- USB-MIDI event packets have been reassembled into complete MIDI/SysEx messages below.

## Confirmed panel-open read transaction

| Packet | Timestamp (pcap clock, µs) | Direction | Observation |
|---|---:|---|---|
| 18 | 1793346778189878 | PC → MG-30, OUT `0x02` | SysEx read request |
| 19 | 1793346778189992 | OUT completion | Request transfer completed |
| 20 | 1793346778192029 | MG-30 → PC, IN `0x82` | SysEx read response |
| 21 | 1793346778192078 | IN completion | Response transfer completed |

Request:

```
F0 43 58 70 13 00 F7
```

Response, reassembled from USB-MIDI event packets:

```
F0 43 58 70 13 02 0A 07 04 03 00 01 00 01 00 64 00 64 00 00 F7
```

Timing:
- Request OUT submit → response IN data: 2,151 µs (2.151 ms).
- OUT transfer completion → response IN data: 2,037 µs (2.037 ms).

This confirms on the actual device that opening the panel triggers `13 00 OUT → 13 02 IN`, matching the statically traced read request and callback. The `13 02` response is a state-bearing readback, not the write ACK.

## Readback field interpretation

Using the original-MG30 parser and selector mapping already documented in `CTRL_EXPRESSION_QUICKTONE_REVERSE_ENGINEERING_2026-10-30.md`:

| SysEx offset | Captured byte | Existing mapping |
|---:|---:|---|
| 6 | `0A` | State byte mapped to record `+0x7A` |
| 7 | `07` | State byte mapped to record `+0x7B` |
| 8 | `04` | State byte mapped to record `+0x7C` |
| 9 | `03` | CTRL1 function code = AMP |
| 10 | `00` | CTRL1 dependent choice = 0 |
| 11 | `01` | CTRL2 function code = WAH |
| 12 | `00` | CTRL2 dependent choice = 0 |
| 13 | `01` | Not assigned a meaning by the current parser map |
| 14–17 | `00 64 00 64` | Two restored value pairs: 100 and 100 (decimal) |
| 18–19 | `00 00` | Not assigned a meaning by the current parser map |

The function labels above follow the previously decoded original-MG30 function selector table. They identify the stored function codes only; they do not establish CTRL2's physical destination or equate it with an external footswitch. Keep CTRL2 as the additional expression-related assignment per the user's project clarification.

Offsets 13 and 18–19 are deliberately left uninterpreted. Do not infer reserved status or semantics without further disassembly/capture evidence.

## Additional MIDI event

At packet 22, approximately 1.258375 seconds after the readback data, the PC sends one USB-MIDI Control Change event to endpoint OUT `0x02`:

```
B0 4D 37
```

Decoded MIDI fields:
- Status `B0`: Control Change, MIDI channel 1.
- Controller `4D`: CC 77.
- Value `37`: 55 decimal.

This event is separate from the `13 02` response and is not a SysEx `0D` message. Its purpose is unknown. Do not reproduce it in MG30 Studio until separately identified. It resembles the CC77/value55 event seen in an earlier capture, but this capture alone does not establish its purpose or trigger.

## What this capture does and does not prove

**Confirmed:**
- EXP & Pedal panel open/reopen invokes the native read query `13 00`.
- The original MG-30 replies with `13 02` on endpoint IN `0x82`.
- The response carries the packed CTRL1/CTRL2 function/choice state and two value pairs restored by the native parser.
- The request/response is distinct from the write path `13 01 OUT → 13 03 IN`.

**Not observed / not proven:**
- No `13 01` write or `13 03` write ACK appears in this capture.
- No `0D 00` query or `0D 02` response appears. The 0D path remains separate and needs its own trace.
- The meanings of the extra response bytes at offsets 13, 18 and 19 remain unknown.
- The purpose of CC77/value55 remains unknown.
- This capture does not establish CTRL2's physical destination.

## Next reverse-engineering work

1. Treat the hardware readback request/callback as confirmed; remove the panel-open readback item from the pending list.
2. Continue static tracing of the first-column function dropdown item IDs and the consumer of the `13 02` state.
3. Continue the separate `0D 00 → 0D 02` trace through `NuxPedalSetValuePanelMG30`; do not conflate it with this readback or label its fields MIN/MAX prematurely.
4. Identify the CC77 sender/call site before considering whether it belongs in the app protocol.
5. Keep implementation deferred until remaining per-control write payloads and slider semantics are adequately mapped.

## Project safety

Analysis/documentation only. No MG30 Studio source files were changed and no APK was built. NAM import, IR User/Collection, MIDI mappings, preset sync and completed Copy Scene behavior remain untouched.
