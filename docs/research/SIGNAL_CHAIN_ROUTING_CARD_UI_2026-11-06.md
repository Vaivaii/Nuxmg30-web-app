# Signal Chain routing card sizing and live icon fix — 6 November 2026

Target: original NUX MG-30 Gen 2 firmware 6.0.x, not MG-30 MKII.
Branch: `feature/post-effects-parallel-routing`
Base commit: `09a58763a400d82cd206b86afb3062a5b4a8aa80`.

## User feedback

- The two routing cards inserted after MOD and DLY appeared much larger than the normal Signal Chain effect cards.
- The visible relation title, SERIAL/PARALLEL caption and "Tap untuk ubah" copy were unnecessary.
- The SVG path icon stayed visually unchanged when switching mode because only the card class and text were updated by `renderSignalChainRoutingControls()`; the SVG was only generated once in `renderChain()`.
- The icon should follow the current Serial/Parallel state and resemble the MG-30's signal-path topology rather than a generic arrow.

## Changes

- Routing cards now use the same responsive footprint as compact effect cards:
  - desktop: 68 × 78 CSS px;
  - mobile: 62 × 73 CSS px;
  - narrow phones (≤390 px): 59 × 70 CSS px.
- Removed all visible text from routing cards. The card is now icon-only; the relation and mode remain in the accessible `aria-label` and `title` tooltip.
- Added separate serial and parallel SVG topologies inspired by the MG-30 / QuickTone signal-flow diagrams:
  - Serial: two effect blocks in one continuous path.
  - Parallel: input split into two paths with effect blocks, then merged.
- `renderSignalChainRoutingControls()` now replaces the symbol SVG whenever a fresh `0D/02` read or a verified write ACK updates the current mode, so the image follows the same state that controls the device.
- Preserved the two independent routing bits, 0D/00 read request, 0D/01 write payload, complete 0D/02 ACK comparison, existing card placement, and reorder anchoring.

## Protected behavior

No changes to preset import/export, NAM, User/Third Party IR, IR Collection, MIDI/CC mappings, USB-MIDI bridge, preset selection, scene logic, effect block order, or the 0D routing packet format.

## Validation

- Added source regression tests for compact breakpoints, icon-only markup, distinct serial/parallel diagrams, live SVG refresh, and unchanged 0D command/ACK behavior.
## Build #607 verification

- Final application source commit: `8959e5374fd7254626636eddfd9ddf1438e42642` on `feature/post-effects-parallel-routing`.
- GitHub Actions run #607: `42095439332`, conclusion **success**: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42095439332
- Regression tests: **278 passed, 0 failed**.
- Android initializer syntax validation and Capacitor Android/plugin generation passed.
- Gradle `assembleDebug`: **success**.
- Artifact ID: `13447342403`; ZIP size **4,216,512 bytes**; ZIP SHA-256 `b797849ccf727abfffc3b5274b5d81441a45cca58b49e1b55d534811baa2395c`.
- Extracted APK: **4,594,912 bytes**; SHA-256 `8941fd9dcb795de1673d408e33d5cf75374699993e4fe1bb2d22f3e6950f2c77`.
- ZIP integrity test passed; APK archive structure was inspected. The packaged `assets/public/index.html` contains the compact responsive routing-card rules and live SVG refresh function, with the old visible routing captions absent.

## Remaining physical-device check

Install Build #607 on the original MG-30 Gen2 firmware 6.0.x and confirm:
1. MOD–DELAY and DELAY–REVERB routing cards have the same compact footprint as the effect cards on the phone.
2. The cards display only the routing icon (no visible relation title, SERIAL/PARALLEL text, or helper text).
3. Toggling Serial ↔ Parallel updates the matching icon after the device ACK; the other pair retains its independent state.
4. Existing block reorder still keeps each routing icon attached to the corresponding pair.

No physical pedal test has been performed in this build session. The verified source/build is complete; the on-device visual and mode-switch confirmation remains pending.

## User confirmation — physical install/test successful (6 November 2026)

- User confirmed: **"Sudah berhasil"** after installing/testing Build #607.
- Treat the compact Signal Chain routing-card fix as accepted by the user.
- The user confirmation closes the previously pending physical-device check for this UI change.
- No new protocol claims beyond the user's success confirmation; retain the verified scope: compact responsive cards, icon-only display, and Serial/Parallel SVG refresh from device mode state.
