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
- `npm test`: **119/119 passed, 0 failed, 0 skipped** (confirmed from final Actions log).
- Production frontend build: `npm run build` → Vite 7.3.7 production build completed successfully in 735 ms (invoked by `npm run android:init`).
- Capacitor Android generation and USB audio plugin setup: step completed successfully.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL** (completed 2 November 2026 at 16:44:08 UTC).
- Actions conclusion: **success**, completed 2 November 2026 at 16:44:23 UTC. [Run #333](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41483971689).
- Artifact ID: `13161895873`; ZIP size **4,116,033 bytes**; SHA-256 `f95a8ef37ff59d80cfbedc801783658cc927362bfa6de420efa1e5268ab47641`.
- Extracted `app-debug.apk`: **4,493,584 bytes**; SHA-256 `b62fb89dd22e27e9dea1977ea606253a4619e8445ec01bf699fbac0e8a70004d`.
- Downloaded ZIP and APK both passed archive integrity checks. The APK's packaged CSS was inspected and shows `border-radius:0!important` for normal, selected, and mobile track-head rules.

## Device validation still required

After Build #333 is available and installed, confirm on the phone that each of the four left-side track heads has square corners on all four edges and the selected track remains square. Also confirm row spacing, timeline alignment, playhead drag, and transport remain functional. CI does not verify rendering on the user's handset or physical MG-30 behavior.
