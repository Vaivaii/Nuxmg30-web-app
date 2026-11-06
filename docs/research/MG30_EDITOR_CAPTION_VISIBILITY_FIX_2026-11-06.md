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

Pending: full Node regression suite, Android initializer syntax, Vite production build, Capacitor generation, Gradle `assembleDebug`, and inspection of the packaged CSS/HTML inside the resulting APK. The physical device must be checked for both AMP and IR category/Based on captions after installation.
