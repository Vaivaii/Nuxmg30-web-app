# MG-30 Studio — restore Editor AMP / Speaker Cabinet captions

Date: 6 November 2026  
Target: Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
Branch: `fix/editor-model-caption-visibility`  
Base: Build #647 source commit `efd10044824b40a934ad5d0a79471dbfeb602304`

## User-reported defect

After installing Build #647:
- AMP artwork was visible, but the "Based on" caption below it was missing.
- Selecting the IR block showed the cabinet artwork but did not show the "SPEAKER CABINET" category or its "Based on" caption.
- Signal Chain, artwork and Scene cards continued to render.

## Root cause

Inspection of the actual Build #647 APK showed that Vite places the linked/bundled `index-*.css` stylesheet after the inline styles from `index.html` in the generated APK. Build #647 kept the fixed 198px/182px model frame and 56px caption rail only in an inline `<style>` element. Later rules in `ui-redesign.css` therefore regained precedence in the packaged WebView, including the short-height rule that constrained `#modelVisual` to 92–118px with `overflow:hidden`. The caption rail was clipped even though the source inline block appeared to reserve enough space.

This was verified by inspecting `assets/public/index.html` and the hashed production CSS extracted from the Build #647 APK.

## Change

- Move the canonical mobile frame/caption/Scene rules to the end of `www/ui-redesign.css`, after the late short-height rules.
- Keep the shared 198px model unit (142px artwork + 56px caption) and short-screen 182px model unit (126px artwork + 56px caption).
- Explicitly preserve visibility for category labels and the Based on label/value; allow the Based on line to wrap instead of clipping it at a fixed 19px.
- Keep optional origin information within its own compact line.
- Keep Scene cards bottom-anchored and 64px tall.
- Remove the now-duplicated inline fixed-frame block from `www/index.html`; bump the stylesheet cache token to `stable-ui-2`.

## Protected scope

No changes to NAM, IR User/Third Party, IR Collection, Import/Export Presets, Signal Chain protocol, MIDI/CC mapping, USB-MIDI transport, or native Android hardware bridges.

## Validation

Build #652 / run `42250261456` passed the complete CI pipeline and packaged asset inspection. The physical device must still be checked after installation for the complete Scene row, artwork scale and caption spacing.


## Follow-up layout fit — user screenshot after caption repair (6 November 2026)

The user confirmed category and Based on captions are visible, then reported:
- Scene cards are clipped at the bottom of the fixed Editor card.
- Non-AMP artwork should be slightly larger.
- Category caption is too close to the artwork frame.

Adjustment:
- Normal mobile model visual unit: 168px total = 112px artwork + 56px caption.
- Short mobile unit (viewport height ≤780px): 154px total = 98px artwork + 56px caption.
- Caption rail gains 6px top inset; caption height and visibility remain unchanged.
- Non-AMP width bounds increase: pedal 36%, cabinet 60%, expression 40%, FX loop 46%. AMP remains 62%.
- Scene cards retain their full 64px touch target and bottom anchoring; separator spacing is tightened modestly.
- CSS cache token changes from `stable-ui-2` to `stable-ui-3`.

The caption repair commit `0c13c36178b7bcbd421af14478f1ccade7a6985e` passed 305 tests and the Android build. This layout follow-up must independently pass the complete suite/build and packaged APK inspection before distribution.


## Build #652 verification — Editor card layout fit

- Source commit: `6cbc499fe208ae03e31d3bebae4fc69bede7f972`.
- GitHub Actions run `42250261456`: **success**; 305 tests passed, 0 failed; Vite production build, Android initializer, Capacitor generation, Gradle `assembleDebug` and artifact upload passed.
- Artifact ID `13521260234`; ZIP size 4,225,778 bytes; ZIP SHA-256 `3b569ffb607546316a8e6be39a9d0c494abf88a6b7d6e8c74cb1cb53df73e93b`.
- APK size 4,602,740 bytes; APK SHA-256 `6072daca080046fb1fc9cacafe7b394a51250b2e11a61de25a951c10565d08f2`.
- ZIP and APK integrity tests passed.
- Packaged HTML/CSS inspection passed for the hashed Vite stylesheet reference, short/regular frame and artwork dimensions, fixed caption rail and inset, category-specific SVG widths, visible AMP/Speaker Cabinet/Based on markup, and bottom-anchored full-height Scene buttons.
- The original source stylesheet query token is replaced by Vite with a hashed production CSS asset; the built HTML correctly references that single hashed asset.
- This is CI and packaged-asset verification. Final visual confirmation on the actual Android phone remains pending.
