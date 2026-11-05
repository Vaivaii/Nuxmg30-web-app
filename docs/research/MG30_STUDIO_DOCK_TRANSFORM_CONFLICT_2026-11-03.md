# MG30 Studio — Restore viewport-fixed DAW dock after motion effects

**Date:** 3 November 2026 (Asia/Jakarta)  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-mockup-alignment-undo`  
**Source commit validated by Build #343:** `6412ff109cb8b087160243f2d82d0afc70832109`

## User-observed regression

After installing Build #341 (app-wide micro-interactions), the user sent a screenshot showing the Studio DAW transport/sub-navigation dock moved upward into the timeline and covered track rows. Previously the dock was anchored above the fixed bottom app navigation.

## Root cause

Build #341 added the `mg30-content-enter` keyframe to both:
- `#page-studio [data-studio-mode-panel]:not(.hidden)`
- `#page-studio [data-daw-page-panel]:not(.hidden)`

That keyframe animates `transform: translate3d(0,5px,0)` to `translate3d(0,0,0)` and uses `animation-fill-mode: both`. The Studio workspace element `#studio-daw-workspace` is a `data-studio-mode-panel` ancestor of `#dawStudioDock`. The dock is intentionally styled `position:fixed` and uses a dynamically measured `--studio-dock-bottom` offset to sit above the app's fixed bottom navigation.

A non-none transform on an ancestor establishes the containing block for fixed-position descendants in Chromium/WebView. As a result, WebView positioned the dock against the animated Studio workspace rather than the viewport. The observed dock moved into the timeline and obscured tracks. This was a side effect of the new motion layer; the existing dock CSS and JS offset calculation were not the source of the defect.

## Correction

- Added `@keyframes mg30-studio-panel-fade` with opacity only (no transform).
- Changed both Studio mode panels and DAW subpage panels to use this opacity-only animation for their entrance.
- Kept the short translated `mg30-content-enter` animation for the NAM internal pane, which does not contain the fixed Studio dock.
- Kept the app-wide main tab fade, all dialog/backdrop animations, button/field/card micro-interactions, menu/popover/disclosure entrances and toast animation.
- Kept the existing `#dawStudioDock` `position:fixed`, dynamic bottom offset, transform centering, dimensions, z-index and spacing untouched.
- Added a regression test proving Studio mode/DAW page ancestors use opacity-only motion and reading the fixed-dock declarations from `www/studio-daw.css`.
- The new motion test initially read the dock selector from the wrong stylesheet (it is in `studio-daw.css`, not `ui-redesign.css`). Build #342 therefore failed in the test step before Android/Gradle. The test fixture was corrected to read the correct file. Build #343 is the authoritative build.

## Build #343 validation

- GitHub Actions run: [Build #343](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41494977902)
- Run ID: `41494977902`
- Tested source HEAD: `6412ff109cb8b087160243f2d82d0afc70832109`
- Conclusion: **success**.
- `npm test`: **128/128 passed, 0 failed**.
- Vite 7.3.7 production build: **passed** (751 ms).
- Capacitor Android generation and USB audio plugin registration: **passed**.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL** (1m 37s).
- APK artifact upload: **passed**, artifact ID `13166356204`.

## Artifact verification

- Artifact ZIP: **4,116,670 bytes**, SHA-256 `2d51e817dda4365bec45cb6228bb5930e905e5f77a336547ea07447cc1ab0835`.
- Extracted `app-debug.apk`: **4,494,444 bytes**, SHA-256 `83a2287323b5a28bd293e12bc890395f4f3b06f7961e664f36ca2b77806fb5e6`.
- ZIP and APK archive integrity checks: **passed**.
- Packaged CSS was extracted and inspected. It contains the opacity-only `mg30-studio-panel-fade` rules on both Studio ancestor selectors; it retains `#page-studio #dawStudioDock { position:fixed!important; }`. Existing dialog/toast animation and `prefers-reduced-motion` styles remain present.

## Protected scope

App source/test files changed:
- `www/ui-redesign.css`
- `tests/ui-motion.test.js`

No changes were made to `www/studio-daw.css`, `www/studio-daw.js`, Studio dock geometry/JS offset measurement, NAM, IR User/Third Party, IR Collection, MIDI mapping, USB-MIDI protocol, preset transfer, Signal Chain, native Android audio/USB audio plugins, or MG-30 communication.

## Physical-device verification still required

Install Build #343 and verify:
- The transport + Timeline/Mixer/Track Settings dock is again anchored above the bottom navigation, as in the pre-Build #341 screenshot.
- The dock no longer covers any of the four track lanes.
- Jam/Record/DAW tabs and other app-wide animations still appear.
- Studio dialog/menu animations remain smooth.
- Playhead dragging and transport work normally.
- No change to NAM/IR/MIDI/preset/device behavior.

The package and CSS layout have been verified, but visual confirmation on the user's Android handset is still required before marking the dock regression physically resolved.
