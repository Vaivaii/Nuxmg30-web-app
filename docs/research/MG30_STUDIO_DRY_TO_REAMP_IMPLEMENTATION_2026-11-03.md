# SUPERSEDED — MG-30 Studio Dry-to-Reamp Implementation

> **Status update (3 November 2026):** The user canceled the Reamp feature and directed the project to use **USB Loopback** instead. Reamp playback controls and the Reamp native session engine have been removed from the active `feature/studio-usb-loopback` branch. This document is retained as a historical engineering record only; do not use it as the current feature specification.

The former Reamp experiment implemented a native AudioTrack path to play a DI track to the MG-30, then captured the USB return. Its source work is preserved in the prior branch `feature/studio-usb-reamp-loopback` for audit/history, but it is no longer part of the target branch.

The active replacement is documented in:
`docs/research/MG30_STUDIO_USB_LOOPBACK_TRACK_2026-11-03.md`

Current direction:
- Hardware target remains original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.
- The pedal is already set by the user to USB ROUTING MODE = LOOPBACK. The app must not change pedal routing modes.
- Phone playback / DAW Backing audio and the returned USB Loopback capture must remain separate DAW lanes.
- A dedicated Loopback track is added to the DAW.
- Loopback capture uses the existing MG30Audio AudioRecord path, with a mode that attempts to preserve the widest advertised USB input channel layout using Android channel-index masks.
- Raw channel identity is preserved as metadata; no channel is labeled processed/wet or loopback until a physical capture confirms that mapping.
- The NAM, IR User/Third Party, IR Collection, MIDI mappings, presets, Signal Chain, and existing USB input recorder behavior for normal Guitar recording remain protected.

This document is not proof that the superseded Reamp implementation was acoustically or physically verified.
