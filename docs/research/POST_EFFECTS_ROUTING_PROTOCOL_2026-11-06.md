# NUX MG-30 Gen 2 — Post-EFX Serial / Parallel Routing

Date: 2026-11-06
Target: original NUX MG-30 Gen 2 firmware 6.0.x (not MKII)

## Capture decoding correction

The USBPcap transfer data contains USB-MIDI event packet CIN bytes between groups of MIDI data. Decode the event packets before interpreting SysEx. The earlier interpretation of the raw byte stream as if every byte were SysEx data was incorrect.

## Confirmed protocol shape

- Read routing / chain status: SysEx `43 58 70 0D 00`.
- Device response: SysEx `43 58 70 0D 02`, containing 12 block-order bytes followed by one routing-mode byte.
- Write chain/routing state: SysEx `43 58 70 0D 01 <12 block IDs> <routing mode>`.
- Write acknowledgement: `43 58 70 0D 02`; verify all 12 echoed IDs and the final routing-mode byte.

The latest isolated captures are read-only polling sequences after physical knob interactions; they do not contain a standalone write command. The write frame shape is corroborated by the earlier 0D/01 reorder captures. Do not invent a different command family.

## Routing mode bitmask inferred from isolated toggles

The two links are independent:

| Bit | Link | 0 | 1 |
|---|---|---|---|
| 0x01 | MOD–DELAY | Serial | Parallel |
| 0x02 | DELAY–REVERB | Serial | Parallel |

Combined values:
- `0x00`: both Serial
- `0x01`: MOD–DELAY Parallel, DELAY–REVERB Serial
- `0x02`: MOD–DELAY Serial, DELAY–REVERB Parallel
- `0x03`: both Parallel

Evidence:
- `modseripararel.pcapng`: after the first knob interaction, 0D/02 reports final mode byte `0x01`; after the second interaction it reports `0x00`.
- `delayseripararel.pcapng`: first interaction reports `0x02`; second reports `0x00`.
- `pararelchain.pcapng`: 0D/01 write and 0D/02 ACK both carry `0x03`.
- `pararel-serialmodulasi.pcapng`: mode changes `0x03` to `0x02`, consistent with MOD–DELAY returning to Serial while DELAY–REVERB stays Parallel.
- `pararel-serialdelay.pcapng`: mode values `0x00` and `0x02`, consistent with the DELAY–REVERB bit changing independently.

The two newly supplied files use the same 12 block IDs in both status replies; only the final routing byte changes. This is the key distinction: the last byte is routing state, not a block ID.

## Implementation in this branch

- Added two independent routing controls in the Signal Chain panel.
- Read current state with 0D/00 before toggling.
- Write current device block order plus the updated two-bit routing mask using 0D/01.
- Require 0D/02 acknowledgement to echo the full order and exact routing mask before reporting success.
- Signal Chain reorder now reads and preserves the current routing mask instead of deriving a hard-coded trailer from movedBlockId. This prevents reorder from overwriting the routing state.
- The controls use the live order read from the pedal when writing routing changes.
- NAM, IR User/Third Party, IR Collection and MIDI mapping code paths were not modified.

## Safety / verification status

- No command was sent to a physical pedal during this analysis.
- Firmware behavior and bitmask mapping are capture-derived; the new write UI still requires physical-device verification on original Gen 2 firmware 6.0.x.
- APK CI status is pending. Do not treat the feature as physically validated until both links can be toggled from the app and read back correctly.

## Signal Chain UI layout update

- The two toggles are rendered as fixed routing cards inside the Signal Chain horizontal row.
- MOD–DELAY card is anchored immediately after MOD (block ID 6); DELAY–REVERB card is anchored immediately after DELAY (block ID 7).
- Cards have no block ID, are not selectable/editable, and are excluded from persisted chain order.
- During drag preview, CSS ordering keeps each card immediately after its anchor effect; hit-testing over a routing card resolves to the nearest real effect block, allowing the drag to pass across the card.
- Each card displays a serial/parallel path icon and current mode. Tapping toggles only its corresponding routing bit.
