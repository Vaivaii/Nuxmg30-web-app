# MG-30 Hardware Level Controls Scaffold — 2026-11-06

## Changes
- Added a dedicated **MG-30 Hardware Levels** section to Studio → Track Settings.
- Added UI placeholders for USB Loopback, Record Level, and Playback Level.
- Added scoped styling in `www/studio-daw.css`.

## Safety boundary
The controls are intentionally disabled. The supplied USBPcap captures establish a read/request exchange for command `14 01` and response `14 03`, but do not establish a verified write frame or a confirmed byte-to-control mapping for all three controls. The separate `0D 01` capture is not treated as loopback evidence because its meaning may be signal-chain ordering.

No guessed SysEx is sent. No changes were made to MIDI mappings, NAM, IR import/Collection/User paths, or preset transfer logic.

## Next verification needed
Capture a known-good QuickTone change for each of:
1. USB Loopback OFF → ON and ON → OFF.
2. Record Level at two distinct values.
3. Playback Level at two distinct values.

For each operation, capture both USB OUT and IN traffic and verify the resulting state by changing it back and reading it again. Only then should the disabled controls be wired to a write bridge with ACK/readback validation.

## Commits
- `7daa192a17e853e0b40eb00da737963ad127f6f3` — safe controls scaffold in `www/studio-daw.js`.
- `ae5e01d1e0780642ca58a3048f41c9e0d5164c4d` — styles in `www/studio-daw.css`.
