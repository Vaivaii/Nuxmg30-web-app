# MG30 Studio — Timeline ruler artefact investigation

**Date:** 2 November 2026  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-mockup-alignment-undo`  
**Validated source commit:** `4056b22f11df811bc60974c6208b6aeeea81e818`

## User-observed issue

After installing Build #333, the user sent a phone screenshot showing a small white/gray block-like artefact at the start of the Timeline ruler, just to the right of the vertical playhead line. The previous CSS had already suppressed the playhead `::before` triangle and the hit-button `::before`, so merely repeating those rules did not remove the observed artefact.

## Source diagnosis and confidence

The ruler/playhead markup contains an empty native HTML button:

`#dawPlayheadHit` is a child of `#dawGlobalPlayhead`, with a 32px-wide pointer hit area used for touch dragging. Existing CSS made it transparent and removed its border, but did not disable the browser/Android WebView native button appearance, WebKit focus-inner decoration, focus paint, or both pseudo-elements.

This is the strongest source-level explanation for a small platform-rendered glyph remaining after the CSS triangle was hidden. It is a source diagnosis, not proof of the exact Android renderer pixel cause; physical screenshot confirmation after Build #337 installation is still required.

## Fix in Build #337

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

## Protected scope

Only `www/studio-daw.css` and `tests/studio-daw-ui.test.js` changed for this fix. NAM import/transfer, IR User/Third Party, IR Collection, MIDI mapping, USB-MIDI protocol, preset transfer, Signal Chain, Editor and Studio audio logic were not changed.

## Remaining physical check

Install Build #337 on the Android phone and confirm the block-like ruler artefact is gone. Also verify that the playhead line remains visible, can still be dragged, and transport still works. CI and package inspection do not prove the precise visual result on the user's handset. Do not mark this visual defect hardware-confirmed until the user sends the post-install screenshot.
