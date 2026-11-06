# Editor layout and fluid navigation refinement — 6 November 2026

## User feedback and screenshots
The user installed Build #637 and sent two screenshots:
1. Editor idle screen, showing AMP artwork, Scenes and the fixed Editor model dock.
2. Expanded parameter sheet, showing that the sheet appears in front of the dock and bottom navigation.

Requested changes:
- Move the Scenes section lower within the Editor card so the unused lower gap is reduced and more of the amp head/artwork can be shown.
- Slightly reduce all AMP, pedal and other gear illustrations so the editor does not feel visually crowded.
- Make the parameter sheet expand from behind the fixed model dock; keep the dock header and bottom navigation above it.
- Change bottom-navigation app tabs to horizontal slides.
- Apply the same fluid horizontal motion to Studio Jam / Record / DAW and DAW Timeline / Mixer / Track Settings.
- Keep motion smooth on a 60 Hz screen.

## Implementation
- Work branch: `feature/editor-fluid-motion-polish`.
- Base source: Build #637 HEAD `aa0dcd9d1f5e31ee3a501bb518038bfbf09c023d`.
- Editor artwork stage is increased within the mobile Editor card, with a short-screen breakpoint. All gear SVGs are reduced to 92% scale. The Scenes section uses an automatic top margin to anchor it at the bottom of the existing card and consume the unused lower gap.
- Layering: backdrop 58, parameter dock 59, bottom nav 60. Parameter sheet 1 and model dock header 2 inside the dock's isolated stacking context.
- Navigation uses the Web Animations API to animate transform and opacity only (240 ms, `cubic-bezier(.22,1,.36,1)`). The direction is derived from the current and selected page/mode index. The shared helper respects reduced-motion preferences.
- `#page-studio` is intentionally not transformed because it owns the fixed DAW dock. Only its fixed header and active mode panel are animated. The DAW workspace's Timeline, Mixer and Track Settings panels animate individually; the transport dock is its sibling and remains viewport-pinned.
- CSS cache token is bumped to `editor-fluid-1`.
- No changes are made to device communication, NAM, User/Third Party IR, Collection IR, presets, Signal Chain, hardware parameter IDs, or MIDI/CC mappings.

## Validation
- Automated regression and GitHub Actions Build #638: pending.
- Device test: pending. Verify the amp/cabinet head is fully visible, other gear artwork has breathing room, Scenes sit lower without clipping, parameter sheet travels behind the dock header, bottom navigation remains above the sheet, and all requested tab transitions remain smooth while the DAW dock stays fixed.

## First CI attempt correction
- Build #638 reached the Node test suite and reported 2 failures out of 299: an older NAM/TONE3000 cache-bust assertion still expected `motion-lite-3`, and the previous app-wide motion test still required the old fade animation.
- Corrected the tests only: update the expected shared stylesheet token to `editor-fluid-1` and assert the current horizontal navigation motion layer instead of the retired fade-only rule.
- No application protocol or NAM/IR logic was changed to address these test failures. Corrected CI rerun is Build #639.

## Build #639 validation — 6 November 2026
- Corrected CI run: GitHub Actions run `42216720607`, Build #639, commit `a3ae0fee6a25def0bcded151cf741042ee2ee2d7`, completed successfully.
- Protocol regression suite: **299 tests passed, 0 failed**. Android initializer syntax check passed; Capacitor Android generation passed; Gradle `assembleDebug` completed with `BUILD SUCCESSFUL`; APK artifact upload completed.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `13500933742`, ZIP size 4,224,252 bytes. ZIP SHA-256: `b8dad56ef2f7a9b4b9a99cf27599bb6d30d4b2900e8f3bc6385434a136530221`.
- Extracted APK: `MG30-Studio-Build-639.apk`, 4,601,520 bytes. APK SHA-256: `f7e71769ff2cd29356426523a3859f330f2c5cd82e1e41598387142e37a2dbc5`. ZIP integrity and APK ZIP structure checks passed.
- Inspected the APK payload: main-tab WAAPI helper is present in the packaged HTML; gear-stage responsive sizing, 92% gear scale, bottom-anchored Scenes and parameter dock z-index are present in packaged CSS; Studio/DAW horizontal motion helper is present in packaged JS.
- This is a successful CI build and packaged-payload inspection, not a physical-device screenshot/60 Hz frame-time test. User should verify the visual composition and perceived smoothness on the phone.
- No NAM, IR User/Third Party, IR Collection, preset, signal-chain, device communication, or MIDI/CC mapping code was changed.
