# MG30 Studio — Timeline ruler artefact investigation and correction

**Date:** 2 November 2026  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-mockup-alignment-undo`  
**Validated source commit:** `4056b22f11df811bc60974c6208b6aeeea81e818`

## User-observed issue

After installing Build #333, the user sent a phone screenshot showing a small white/gray block-like artefact at the start of the Timeline ruler, just to the right of the vertical playhead line. The previous CSS had already suppressed the playhead `::before` triangle and the hit-button `::before`, so merely repeating those rules did not remove the observed artefact.

## Root cause — confirmed from the Build #337 handset screenshot

The earlier Build #337 diagnosis focused on the transparent native button `#dawPlayheadHit`. The user then installed Build #337 and reported that the artefact remained. That physical result disproved the earlier button-chrome hypothesis as the root cause.

The actual cause is a stale CSS override on the ruler labels:

```css
#page-studio #dawTimelinePage .daw-ruler-mark {
  left: calc(var(--ruler-mark-x, 0px)) !important;
}
```

The runtime `renderRuler()` in `www/studio-daw.js` generates each bar label with its own inline position:

```js
style="left:" + (index * project.zoom) + "px"
```

But the CSS `!important` rule overrides every inline `left` value. No Studio JavaScript sets `--ruler-mark-x`, so its fallback is `0px` for every label. Every ruler number is therefore painted at the same origin and the stacked glyphs form the small white block/icon visible beside the playhead in the user's screenshots.

This diagnosis is supported by:
- Source inspection of all Studio ruler markup, ruler generation, playhead markup and the relevant Studio CSS rules.
- A repository/package search: `--ruler-mark-x` existed only in that stale CSS rule in Build #337; no runtime assignment existed.
- A before/after Chromium simulation using the CSS extracted from Build #337. With the rule present, labels collapse into one glyph; after removing it, bar numbers `1`, `2`, etc. appear at the expected zoom-based intervals.
- A second Chromium simulation using the actual CSS extracted from Build #338 at a 691×1536 viewport. The ruler labels remain separated and the stacked glyph is absent.

The source-level root cause is now identified and corrected. The final real-device visual confirmation still requires the user to install Build #338 and send a screenshot.

## Earlier attempt in Build #337 — not the root fix

Added a narrowly scoped reset to `#page-studio #dawTimelinePage #dawPlayheadHit`:

- `appearance:none` and `-webkit-appearance:none`.
- Explicit transparent background, zero border/radius, no shadow or outline, zero padding/margin, transparent text/font, no text shadow and no tap highlight.
- Removed the WebKit focus-inner border/padding.
- Removed focus and focus-visible outline/shadow.
- Removed both `::before` and `::after` pseudo content.

Preserved the existing 32px drag hit target, pointer events, touch-action and pointer event handler on `#dawGlobalPlayhead`. The visible vertical playhead line remains on the separate `.daw-global-playhead:after`. The existing arrow suppression remains. No changes to the ruler bar generation or time mapping were made.

## Regression / simulation validation

- Added two targeted tests in `tests/studio-daw-ui.test.js` for native appearance/focus reset and pseudo-element suppression, including a check that the draggable hit target and existing event handler remain.
- A failed intermediate Build #334 exposed an old Build #333 test whose CSS slice accidentally included the next CSS section; the test scope was corrected.
- A failed intermediate Build #336 exposed an incorrect expected count for a combined CSS selector; the assertion was corrected to match the single combined reset rule.
- Final authoritative Build #337: run ID `41487170159`, source commit `4056b22f11df811bc60974c6208b6aeeea81e818`, conclusion **success**. [GitHub Actions](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41487170159).
- `npm test`: **121/121 passed, 0 failed**.
- `npm run build` / Vite 7.3.7 production build: **passed** (782 ms).
- Capacitor Android generation and USB audio plugin registration: **passed**.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL**.
- APK artifact upload: **passed**; artifact ID `13162163169`.

## Artifact verification

- Artifact ZIP: **4,116,108 bytes**, SHA-256 `08b71d38af28ff6f6f8223534410ac7e08ac253739e76a96996e068885de947f`.
- Extracted `app-debug.apk`: **4,493,716 bytes**, SHA-256 `6564256d22f7e0746f65170a0dc68269e166cb57cb7501567aaa023ee2e2bfe5`.
- ZIP and APK archive integrity checks: **passed**.
- Packaged Vite CSS inspection: confirmed Android/WebView appearance reset, WebKit focus-inner reset, focus-visible reset, button before/after suppression, global playhead arrow suppression, 32px hit area with pointer-events preserved, visible playhead line preserved, and square track-head radius preserved.


## Root-cause correction in Build #338

- Removed the stale `#page-studio #dawTimelinePage .daw-ruler-mark { left: calc(var(--ruler-mark-x, 0px)) !important; }` override from `www/studio-daw.css`.
- Kept the existing per-bar inline `left: index * project.zoom` generated by `renderRuler()`. No JS timing, zoom calculation, grid origin, playhead position or pointer behavior was changed.
- Added a regression test that requires the per-bar inline position in `renderRuler()` and fails if `--ruler-mark-x` returns to the Studio CSS.
- Authoritative Build #338: run ID `41490334484`, source commit `c506c0d590492947d0766e0333a812ea8001795e`, conclusion **success**. [GitHub Actions](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41490334484).
- `npm test`: **122/122 passed, 0 failed**.
- Vite 7.3.7 production build: **passed** (584 ms).
- Capacitor Android generation and USB audio plugin registration: **passed**.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL**.
- APK artifact upload: **passed**; artifact ID `13163093795`.
- Artifact ZIP: **4,116,068 bytes**, SHA-256 `8d9ec6b71b06647979c86d0192aa54a95732abbeb9b79f855274c4a3b708540f`.
- Extracted APK: **4,493,664 bytes**, SHA-256 `42e41c399dbd790445b8bb199075adecc55c0590fe61cce1604e8fa80c5e98de`.
- Downloaded ZIP and APK archive integrity tests: **passed**.
- Packaged APK CSS inspection: `--ruler-mark-x` is absent; the per-bar inline JavaScript positions remain in the bundled Studio runtime.
- Packaged-CSS Chromium simulation at 691×1536: bar labels render at separate zoom-based positions; the stacked ruler glyph is absent. This is a browser simulation using the actual packaged CSS, not a substitute for the user's physical Android screenshot.


## Protected scope

Only `www/studio-daw.css` and `tests/studio-daw-ui.test.js` changed for this fix. NAM import/transfer, IR User/Third Party, IR Collection, MIDI mapping, USB-MIDI protocol, preset transfer, Signal Chain, Editor and Studio audio logic were not changed.

## Remaining physical check

Install Build #338 on the Android phone and confirm the block-like ruler artefact is gone. The actual packaged CSS simulation now shows the first bar numbers separated correctly. Also verify that the playhead line remains visible, can still be dragged, and transport still works. CI and package inspection do not prove the precise visual result on the user's handset. Do not mark this visual defect hardware-confirmed until the user sends the post-install screenshot.
