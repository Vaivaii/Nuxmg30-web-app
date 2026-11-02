# MG30 Studio — Square Track Rail Corners

**Date:** 2 November 2026  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-mockup-alignment-undo`  
**Source commit:** `01e75b9cf645a0652b7b19499c96d949d03db93d`

## User feedback

After reviewing Build #332 on the Android phone, the user reported that the left-side track columns/track heads must **not** have rounded corners. Build #332's 11px desktop/default and selected radius, plus 10px mobile radius, did not match the requested appearance.

## Change applied

- Changed the `.daw-track-head` corner radius to `0` for the normal state.
- Changed the `.daw-track-head.selected` radius to `0`.
- Changed the mobile media-query override to `0` as well, so viewport size cannot reintroduce rounded corners.
- Kept the 6px vertical gap between track rows, existing track borders, colored left accent, selected-state styling, and the square timeline lanes.
- Kept the outer timeline/workspace frame unchanged; only the individual track-head/left-rail columns are made square.
- Added regression assertions that fail if 10px or 11px rounded radii are reintroduced and verify all three square-corner declarations.

## Files changed

- `www/studio-daw.css`
- `tests/studio-daw-ui.test.js`

No NAM, IR User/Third Party, IR Collection, MIDI mapping, USB-MIDI, preset transfer, Signal Chain, Editor, Studio audio engine, or native Android audio logic was changed.

## Build #333 validation

- GitHub Actions run: [Build #333](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41483971689)
- Run ID: `41483971689`
- Source commit: `01e75b9cf645a0652b7b19499c96d949d03db93d`
- `npm test`: step completed successfully (exact test count to be recorded from final run logs).
- Capacitor Android generation and USB audio plugin setup: step completed successfully.
- Gradle `assembleDebug`: still running when this note was written.
- APK artifact: not yet available at note creation time. Do not distribute Build #332 as the square-corner correction.

## Device validation still required

After Build #333 is available and installed, confirm on the phone that each of the four left-side track heads has square corners on all four edges and the selected track remains square. Also confirm row spacing, timeline alignment, playhead drag, and transport remain functional. CI does not verify rendering on the user's handset or physical MG-30 behavior.
