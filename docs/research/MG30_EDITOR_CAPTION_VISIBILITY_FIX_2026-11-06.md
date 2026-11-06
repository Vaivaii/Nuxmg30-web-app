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


## User-requested final cleanup — IMAGE captions and toast scope (6 November 2026)

- User confirmed Build #652 on the physical Android device: all three Scene cards are visible, artwork sizing/layout is good, USB-MIDI connected, and preset name readback is working.
- New screenshot issue: IMAGE-based AMP and EFX/pedal show overlapping descriptive text. Keep the category label and IMAGE badge on the artwork; suppress the caption-rail origin chip, Based on row and IMAGE disclaimer only when `origin === "IMAGE"` and block is AMP or EFX. Do not suppress captions for other block types or GEN2/NAM/IR.
- Toast policy: default `toast(...)` calls are now no-ops. Toast is rendered only when explicitly scoped to `preset`, `nam`, or `ir`, representing device synchronization/readback/import operations. Local draft actions, scene changes/copy, signal-chain edits, connection prompts, validation hints, clipboard, favorites, and other incidental feedback no longer open a toast. IR Collection synchronization explicitly uses scope `ir`.
- Preserve status-panel messages and native progress dialogs; this change only gates the floating toast.
- Keep original MG-30 GEN2 6.0.x protocol behavior, NAM transfer, IR User/Third Party and Collection transfer, preset import/export, USB-MIDI, and MIDI/CC mappings unchanged.
- Required verification: full regression suite, Vite build, Capacitor generation, Gradle APK build, then inspect packaged JS/CSS to ensure IMAGE captions are suppressed and toast scope gate is bundled.


### Build #653 — IMAGE caption cleanup and sync-only toast — 6 November 2026

- Final source commit used by CI: `0f09fde434befeb24e0717cecf5a86ccf33b0949`.
- GitHub Actions run `42253122488` completed **success**: 307 tests passed, 0 failed; Android initializer syntax, Vite production build, Capacitor Android generation, Gradle `assembleDebug`, and artifact upload passed.
- Artifact ID: `13519999498`; ZIP size 4,225,993 bytes; ZIP SHA-256 `e2cd03a343074292a795829a204c2eb3a9dc4723427db160c4855f0fe391fa98`.
- APK size 4,602,868 bytes; APK SHA-256 `8d6f57fd1b816002ffe567492acaa64eaef0bd6c8f2a5e38b4bf53ee82bab12a`.
- ZIP and APK integrity checks passed. Packaged HTML inspection confirmed IMAGE-based AMP/EFX caption conditional, removal of Based on row and IMAGE origin note in those cases, and toast allowlist. Packaged JS inspection confirmed IR Collection toast calls use the `ir` scope.
- Default toast calls now return without displaying. Only explicit `preset`, `nam`, and `ir` synchronization calls display.
- No changes to original MG-30 Gen 2 6.0.x hardware protocol, NAM/IR transfer data, preset payloads, signal chain/MIDI/CC mappings, or USB-MIDI behavior.
- User should install Build #653 and visually confirm IMAGE-based AMP and EFX caption rails are clean and that only preset/NAM/IR sync notifications appear.


## Clarification correction — retain Based on for IMAGE AMP/EFX — 6 November 2026

- User clarified that only the long IMAGE disclaimer should be removed from IMAGE-based AMP and EFX/pedal cards. The Based on line must remain visible.
- Restore the Based on row unconditionally and restore the IMAGE origin chip beside the category label. Keep the existing IMAGE badge on the artwork.
- Suppress only the verbose `.model-origin-note` disclaimer when `origin === "IMAGE"` and block is AMP or EFX. All other blocks, including IR, and GEN2 origin notes retain their previous behavior.
- Toast behavior is already accepted by the user and is unchanged: default/no-scope toast is suppressed; only explicit preset, NAM and IR sync scopes remain active.
- This is a markup conditional only. No protocols, transfer payloads, hardware state, layout dimensions, Signal Chain, preset data, NAM/IR paths, USB-MIDI or MIDI mapping are changed.
- Regression/build validation for this correction is pending.


## Verified correction — remove IMAGE disclaimer only, retain Based on — Run #660 — 6 November 2026

- User clarified only the long IMAGE disclaimer must disappear on IMAGE-based AMP and EFX/pedal; the Based on line must remain. The correction now leaves the Based on row unconditional, restores the IMAGE origin chip beside category and keeps the IMAGE badge on the artwork.
- Only the `.model-origin-note` disclaimer is empty for IMAGE origin on AMP/EFX. Other categories and GEN2 notices retain their previous behavior.
- Toast logic was not changed in this correction. Its existing scope gate remains: only `preset`, `nam`, `ir` show a floating toast; default/unscoped toast calls remain suppressed.
- Branch: `fix/editor-model-caption-visibility`.
- Source commit built by successful GitHub Actions run #660: `b616beca8b730e11d8604cdca73e0a81692ad1d8`.
- Run ID: `42254827958`; result **success**. Regression suite: 307 passed, 0 failed. Android initializer syntax, Vite, Capacitor, Gradle `assembleDebug`, and artifact upload all passed.
- Artifact ID `13521971775`; ZIP size 4,225,941 bytes; ZIP SHA-256 `143e58d04ee346bdb1b0a059b76214f1b37b3a3890676042951497a0697e122f`.
- APK size 4,602,840 bytes; APK SHA-256 `c31f78888d1f303a8d766b879e6b4163dbc752bda5daf312b95d316371374cd1`.
- ZIP integrity, APK internal ZIP integrity, packaged HTML renderer check, Based on row presence, IMAGE origin chip and artwork badge presence, disclaimer gate, and toast allowlist checks all passed.
- No hardware protocol, NAM/IR data transfer, preset payload, Signal Chain, USB-MIDI, MIDI mapping or layout dimension changes in this correction.
- Physical confirmation of the revised Based on display on the user's MG-30 Studio installation remains pending.


## IMAGE marker cleanup in AMP/EFX editor labels — 6 November 2026

- User verified Build #660 and clarified that the remaining visible word "IMAGE" must also be removed, while retaining only the Based on attribution beneath the artwork.
- For AMP and EFX models whose internal origin is IMAGE, suppress the IMAGE origin chip and IMAGE artwork badge, hide the long disclaimer, and keep category and Based on row.
- Normalize only the rendered model label for AMP/EFX IMAGE variants to the base model name in the Editor selector, signal-chain card, selected-model dock and accessibility label. The underlying `BLOCKS[].models` strings remain unchanged (still carry the internal `· IMAGE` marker), so model indexes, matching, preset state and transfer behavior do not change.
- Other block types, IR, NAM badge, and GEN2 labels remain unchanged.
- Toast policy is untouched and remains sync-only for preset/NAM/IR.
- Required validation: complete test suite, Vite production build, Capacitor, Gradle APK, and packaged JS inspection to confirm no IMAGE markers in rendered AMP/EFX UI while Based on is retained.


### Build #662 — Remove all visible IMAGE markers, retain Based on — 6 November 2026

- User's latest screenshot confirmed the disclaimer had been removed but IMAGE labels still appeared as artwork badge, caption chip, and model-name suffixes. User requested to remove the IMAGE words and leave Based on.
- For AMP/EFX models internally marked `· IMAGE`, the Editor presentation now suppresses both the artwork IMAGE badge and origin chip. The category and Based on row remain.
- `modelDisplayLabel` returns the base model name for AMP/EFX IMAGE variants, so the IMAGE suffix is also omitted from the Editor model selector, quick selector, signal-chain card and selected-model dock. Underlying `BLOCKS[].models` values are unchanged and still retain the marker for internal matching/artwork reference.
- The long IMAGE disclaimer remains suppressed for these same AMP/EFX cases. Other blocks, IR, NAM badge, and GEN2 labels are unchanged.
- Toast implementation/policy was not changed; the previously verified preset/NAM/IR-only scope remains.
- GitHub Actions Run #662: `42256902003`, source commit `472dbe290d468a82ba3f6d4308fcfb90d77b6a61`, **SUCCESS**.
- Tests: 307 passed, 0 failed. Android initializer syntax, Vite production build (1.04s), Capacitor Android generation, Gradle `assembleDebug` (BUILD SUCCESSFUL in 1m 33s), and artifact upload passed.
- Artifact ID `13522852896`; ZIP size 4,225,984 bytes; ZIP SHA-256 `21e50782d8fc08021341f57c745e286e7e00321e8a0bf49be41dcc38ab1b4bc4`.
- Extracted APK size 4,602,872 bytes; APK SHA-256 `d9497fc00aca15b51be7006b6f1c9f05de5331c0dd34d0d8840923474d9183fb`.
- ZIP integrity and APK ZIP integrity passed. Inspection of the APK's packaged `assets/public/index.html` confirmed: AMP/EFX IMAGE gate; suppressed art badge/chip; base name used for visible selector/chain/dock labels; unconditional Based on markup; disclaimer gate; toast scope allowlist.
- No hardware protocol, NAM/IR data transfer, preset payload, signal-chain logic, USB-MIDI, or MIDI/CC mapping changes.


## Clarification — keep artwork IMAGE badge, hide only caption IMAGE chip — 7 November 2026

- User clarified the artwork badge labelled IMAGE must remain visible. Only the small IMAGE chip in the caption row directly below the artwork, which overlaps the Based on line, should be hidden.
- Restored the IMAGE badge on the artwork for AMP/EFX IMAGE models.
- Only the caption-row origin chip is suppressed for AMP/EFX IMAGE. The category label and Based on line remain visible.
- The long disclaimer remains suppressed for AMP/EFX IMAGE, consistent with the previous correction.
- Reverted normalization of visible model labels; the original model names (including their internal display suffix where shown in selectors/chain/dock) remain unchanged. Internal `BLOCKS[].models` data has never been changed.
- Toast handling stays exactly as accepted: preset/NAM/IR sync scopes only.
- No hardware protocol, USB-MIDI, NAM/IR transfer, preset payload, Signal Chain, MIDI mapping, or card layout dimensions changed.
- Validation required: full 307+ test regression suite, Vite production, Capacitor generation, Gradle assembleDebug, and packaged APK inspection for badge visible + caption chip hidden + Based on preserved.


### Build #663 — Keep artwork IMAGE badge; hide only overlapping caption chip — 7 November 2026

- User clarified the desired final state: keep the IMAGE badge on top of the AMP/EFX artwork; hide only the small IMAGE text chip in the caption row where it overlaps the Based on attribution. The Based on line must remain visible.
- Implemented only a targeted caption-chip gate for AMP/EFX models whose origin is IMAGE. Restored the artwork badge. Kept the Based on markup unconditional. The long IMAGE disclaimer remains hidden for these AMP/EFX models as agreed in the immediately preceding request.
- Restored normal modelDisplayLabel behavior, so the displayed model name remains the source-defined name; no renaming of the underlying model records.
- Toast behavior is unchanged: only explicit preset, NAM, and IR synchronization scopes are allowed to display floating toast.
- No hardware/protocol logic, NAM/IR transfer payloads, IR User/Third Party/Collection, preset import/export payloads, Signal Chain, USB-MIDI, MIDI/CC mappings, or editor layout dimensions changed.
- Source tested: commit `b989727c3bfbe7700e4e3a617cd7143056688e58` on `fix/editor-model-caption-visibility`.
- GitHub Actions run #663 / `42258403823`: **SUCCESS**. Regression suite: 307 passed, 0 failed. Android initializer syntax, Vite production build (637 ms), Capacitor Android generation, Gradle `assembleDebug` (BUILD SUCCESSFUL in 1m 11s), and artifact upload all passed.
- Artifact ID `13522839411`; ZIP size 4,225,965 bytes; ZIP SHA-256 `c95477872436041a6df33d82b484d8d6685f573b6fe097f834fdf2eb5b67f04d`.
- Extracted APK size 4,602,856 bytes; APK SHA-256 `dc9a63173abc4343a5b093ad41bb97cd08ae6591ac343a7b3337b1cea8928a89`.
- ZIP integrity and APK ZIP integrity passed. Packaged APK inspection confirmed the AMP/EFX caption chip is conditional on `hideImageCaptionChip`, the artwork badge text remains `IMAGE`, the Based on row is unconditional, and the long disclaimer remains hidden for those AMP/EFX IMAGE models.
- This is source/build/package verification; user physical installation verification remains pending.
