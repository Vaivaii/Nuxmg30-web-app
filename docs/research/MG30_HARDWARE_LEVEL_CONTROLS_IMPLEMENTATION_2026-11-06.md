# MG-30 Studio — Hardware Level Controls Implementation

**Target:** Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-hardware-level-controls`  
**Date:** 2026-11-06

## Implementation

The Track Settings panel now exposes three active controls:
- USB Loopback checkbox
- Record Level slider
- Playback Level slider

The UI calls the existing `window.setLoopback`, `window.setRecLevel`, and `window.setPlayLevel` bridge functions. It reports success only after receiving the matching device acknowledgement, and reports errors in the panel status line.

## Protocol basis

The four supplied USBPcap captures were decoded into complete SysEx messages. Host writes are 46 bytes:

```
F0 43 58 70 14 01 ... F7
```

The matching device response is 15 bytes:

```
F0 43 58 70 14 03 00 00 00 00 00 00 00 00 F7
```

The implementation uses the complete captured 46-byte template and modifies only the target field:
- Loopback: offset `0x20`; capture order shows `0x11` then `0x01` (ON then OFF).
- Record Level: offset `0x1D`; raw samples `0x34, 0x37, 0x3A, 0x3C`.
- Playback Level: offset `0x1F`; raw samples `0x68, 0x70, 0x76, 0x7A`.

All other frame bytes are preserved. Writes are serialized through a dedicated hardware-write queue and each write waits for the `14 03` acknowledgement. The USB-MIDI transport still uses the app's existing MIDI send queue.

## Slider scaling qualification

The UI slider uses a 0–100 normalized value. The wire conversion maps that normalized value linearly across the minimum and maximum raw values observed in the supplied capture samples:
- Record Level: `0x34..0x3C`
- Playback Level: `0x68..0x7A`

**Important:** these captures show representative slider values, not a proven physical minimum/maximum sweep. Therefore this mapping is an initial usable interpolation across the observed span, not a verified full hardware range or dB calibration. Confirm actual audible range on the physical MG-30 before treating endpoints as absolute min/max.

## Safety boundaries

- No NAM transfer code was changed.
- No IR User/Third Party/Collection transfer code was changed.
- No MIDI CC mapping was changed.
- The implementation does not issue any write until the user operates one of the controls.
- The code keeps the complete known 14/01 frame and edits only one captured field per control.

## Validation

Automated regression test: `tests/studio-hardware-level-controls.test.js`.
Android APK build is run by GitHub Actions on this branch. Physical device acknowledgement and audible level response still require testing with the user's MG-30 connected; CI cannot emulate the pedal.
