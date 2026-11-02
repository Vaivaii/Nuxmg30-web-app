# MG30 NAM/TONE3000 mobile width containment after external selection

**Date:** 3 November 2026 (Asia/Jakarta)  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-mockup-alignment-undo`  
**Validated Build:** #351  
**Source HEAD:** `534fb0049f87a9d2a5e6f5eaa3229026ac121ee6`

## User-observed sequence

The user clarified the failure does not occur simply when the app opens NAM mode. It happens after:
1. Selecting a tone in the external TONE3000 flow.
2. Returning to MG30 Studio with the available model catalogue loaded.
3. Tapping the NAM mode button again.

TONE3000 itself looked normal; the NAM form/panel then expanded horizontally.

## Source findings

- TONE3000 OAuth callback calls `loadSelectedTone(toneId, { expand: true })` after Android returns to the app. The selected tone's model list is rendered into `#t3kToneDetails`.
- `nam-model-library-ui.js` observes the TONE3000 pane, moves the existing `#t3kToneDetails` DOM node into `#namModelLibraryContent`, and delegates the Hide/Show click to the original TONE3000 toggle. Event handlers and model-selection state stay with the original node.
- On mobile, the page `#page-nam` is switched to a fixed CSS Grid when `body.ir-collection-manager-active` is active. Before this fix, the layout set only `grid-template-rows`; it did not set an explicit grid column. The sole implicit `auto` column could size from the minimum intrinsic width of the now-populated TONE3000 catalogue subtree.
- Returning from the external app and expanding/populating the catalogue changes the intrinsic content inside the NAM page after the initial layout. The implicit auto track can therefore widen the NAM page/controls beyond the intended viewport. This matches the user's reproduced sequence.
- The Collection fallback switches the page back to block layout, so the same min/max width guard must cover both the normal fixed-grid and fallback modes.

## Correction in Build #351

Added a narrow, mobile-only width-containment block at the end of `www/ui-redesign.css`:

- The active mobile NAM page now uses `grid-template-columns: minmax(0, 1fr) !important`, not an implicit auto-sized track.
- The active page has `min-width: 0`, `max-width: calc(100vw - 20px)` and `box-sizing: border-box`.
- All direct children of the NAM page are constrained with `min-width: 0`, `max-width: 100%`, and `box-sizing: border-box` in both Collection normal and fallback layouts.
- The moved TONE3000 catalogue subtree is explicitly constrained: `#namModelLibrary`, `.nam-model-library-content`, `#t3kToneDetails`, `#t3kModelList`, `.t3k-card`, `.t3k-card-head` and `.t3k-actions`.
- The fallback page itself receives `width: auto`, `min-width: 0`, and the same viewport max width.
- Updated the stylesheet query token from `motion-lite-2` to `motion-lite-3` to ensure Android WebView loads the corrected stylesheet.

No DOM movement, model catalogue state, or event handler has been rewritten.

## Regression test

Added `tests/nam-tone3000-width.test.js`:
- Checks the mobile NAM grid has an explicit shrinkable `minmax(0,1fr)` column.
- Checks the page and each direct child are capped to the viewport.
- Checks the nested TONE3000 catalogue and card subtree is capped in both normal and fallback modes.
- Checks the existing TONE3000 render flow and original DOM move/handler delegation remain present.
- Checks the stylesheet query token changed to `motion-lite-3`.

The existing `tests/ui-motion.test.js` cache-token assertion was also updated to `motion-lite-3`. Build #350 did not produce an APK because that pre-existing assertion still expected `motion-lite-2`; it failed in the test stage before Android generation. The assertion was corrected before Build #351.

## Protected scope

No changes to `www/tone3000.js`, `www/nam-model-library-ui.js`, `www/ir-transfer.js`, `www/nam-transfer.js`, NAM file parsing/transfer/readback, OAuth logic, model selection state, TONE3000 API fetching, IR User/Third Party, IR Collection transfer, MIDI mapping, USB-MIDI protocol, presets or Studio DAW.

Only changed for this issue:
- `www/ui-redesign.css`
- `www/index.html` (stylesheet cache token only)
- `tests/nam-tone3000-width.test.js`
- `tests/ui-motion.test.js` (cache assertion only)

## Build #351 validation

- GitHub Actions: [Build #351](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41517135543)
- Run ID: `41517135543`
- Source HEAD: `534fb0049f87a9d2a5e6f5eaa3229026ac121ee6`
- Conclusion: **success**.
- The protocol regression test step completed successfully.
- Capacitor Android generation and USB audio plugin registration: **passed**.
- Gradle `assembleDebug`: **success**.
- APK artifact upload: **passed**, artifact ID `13176995035`.

## Artifact verification

- Artifact ZIP: **4,116,944 bytes**, SHA-256 `922823f6bd9b382640441c2b4240f467c4117878e07b1740e1687437fe411191`.
- Extracted `app-debug.apk`: **4,494,948 bytes**, SHA-256 `bfd3120ca348abcf9f1cb20309479caa520883d2f7b4182f544bfe7f033f3211`.
- ZIP and APK archive integrity: **passed**.
- APK embedded stylesheet: `assets/public/assets/index-DNyHPIoq.css`.
- Packaged CSS inspected and confirmed presence of: shrinkable one-column grid, viewport max width, direct-child width clamp, TONE3000 list clamp in fallback, and TONE3000 card clamp in active mode.
- Packaged index references the new Vite CSS asset. The application assets are built from the source with the `motion-lite-3` query token.

## Physical-device confirmation still required

Install Build #351 and reproduce the exact user sequence:
1. Open NAM & IR.
2. Tap TONE3000.
3. Choose a tone externally and return to MG30 Studio.
4. Wait for the selected tone/model list to load.
5. Tap NAM.
6. Verify the NAM import panel, Choose NAM File, Target Slot and Send NAM controls all remain within the phone width. Also verify the Downloaded/Available NAM panel and IR Collection remain aligned.

Then switch back to TONE3000 and NAM again to confirm repeatability. CI and packaged CSS inspection do not replace the actual handset check.
