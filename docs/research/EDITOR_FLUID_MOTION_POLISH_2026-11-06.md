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
