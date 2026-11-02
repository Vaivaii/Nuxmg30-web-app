# MG30 Studio — Replace Editor navigation icon with amp head

**Date:** 3 November 2026 (Asia/Jakarta)  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-mockup-alignment-undo`  
**Source commit:** `ce0b64513d11d2c1c8dcfb19e4a06d4bc8918ef4`

## User request

Replace only the Editor tab's bottom-navigation icon with an amplifier head icon because it better represents a multi-effect tone editor. Do not change any behavior or other icons.

## Change

- Replaced only the inline SVG inside the existing `<button class="active" data-page="editor">` in `www/index.html`.
- New outline SVG depicts an amp head enclosure with a top carry handle, four front-panel knobs and a lower grille.
- The icon uses the existing `.nav-icon svg` sizing and stroke styling (22px desktop / 23px mobile, `stroke: currentColor`), so selected and inactive theme colors remain automatic.
- Preserved the same button element, `data-page="editor"`, active class, `aria-hidden`, `viewBox`, and visible `Editor` label.
- The NAM & IR, Presets, Studio and Device navigation icons and labels were not changed.

## Regression coverage

Added `tests/editor-nav-icon.test.js`:
- Confirms the Editor button remains present with target `data-page="editor"` and label `Editor`.
- Checks the new amp-head SVG features (carry handle, front controls and grille).
- Rejects the former three-slider SVG.
- Confirms the other four navigation targets and labels remain present.

## Build #344 validation

- GitHub Actions: [Build #344](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41503605052)
- Run ID: `41503605052`
- Source commit: `ce0b64513d11d2c1c8dcfb19e4a06d4bc8918ef4`
- Conclusion: **success**.
- `npm test`: **130/130 passed, 0 failed**.
- Vite production build: **passed**.
- Capacitor Android generation and USB audio plugin registration: **passed**.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL**.
- APK artifact upload: **passed**, artifact ID `13170960214`.

## Artifact verification

- Artifact ZIP: **4,116,763 bytes**, SHA-256 `a57670c9d609b3686428d0b0d6865c72b1ef473d72d273fd0b949ea01d2b033b`.
- Extracted `app-debug.apk`: **4,494,548 bytes**, SHA-256 `8516638dee93993ca40125374842a6edb08d93c8fbc5f5ff3cf91bd6f9a3f8d3`.
- ZIP and APK archive integrity checks: **passed**.
- APK's embedded `assets/public/index.html` was inspected. It contains the new amp-head SVG on the Editor navigation button; the old slider paths are absent from that button. The existing `data-page="editor"` and `Editor` label remain.
- Commit diff confirms only `www/index.html` and `tests/editor-nav-icon.test.js` changed in application/test source.

## Protected scope

No Editor behavior, navigation handler, event listener, page routing, CSS layout, NAM, IR User/Third Party, IR Collection, MIDI mapping, USB-MIDI, preset operations, Signal Chain, Studio DAW, native Android plugin or device communication code was changed.
