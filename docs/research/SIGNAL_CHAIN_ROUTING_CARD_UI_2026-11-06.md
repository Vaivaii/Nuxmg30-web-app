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
- GitHub Actions / Android build result: pending.
- Physical MG-30 visual check is still required after APK installation.
