# MG30 Studio — NAM tab layout expansion after animation

Date: 2026-11-03 (Asia/Jakarta)
Status: Observed from user screenshot; root cause not yet confirmed.

## User observation

On the `NAM / PROFILE LAB` screen, after an animation/transition runs, the contents of the active **NAM** view expand horizontally and the layout looks stretched. Selecting **TONE3000** returns to a normal-looking layout. The screenshot also shows the downloaded/available NAM list and the IR Collection area below.

## Scope and guardrails

- Treat this as a UI/layout regression, not an IR/NAM wire-protocol finding.
- Keep the existing NAM import/readback behavior intact.
- Do not change NAM transfer framing, ACK handling, or slot-selection behavior as part of a visual fix.
- Do not change the IR User/Third Party or Collection transfer paths.
- Do not change any established MIDI mappings, preset synchronization, or signal-chain behavior.
- Target remains the original NUX MG-30 Gen 2, firmware 6.0.x (not MKII).

## Repository inspection

Inspected the application repository `Vaivaii/Nuxmg30-web-app`, branch `android/ui-polish-pass-1`, head commit `c5a2ba998777dd8cb8601a7a7bd629ef97902f08` (the checklist-only Build #184 checkpoint).

In that inspected source:
- `www/index.html` has the `#page-nam` page and `#namImportTransferPanel`, but the static markup does not contain the NAM/TONE3000 segmented controls visible in the screenshot.
- `www/tone3000.js` creates `#tone3000Panel` and inserts it after `#namImportTransferPanel`; it does not implement the segmented toggle shown in the screenshot.
- Therefore the screenshot's exact UI implementation is not identified from this branch snapshot. Do not apply selectors or edits to this source until the installed build/source is matched.

## Working hypothesis — unconfirmed

The animation may be leaving or applying a width-related layout state to the NAM content wrapper (for example, an inline width, flex-basis, min-content sizing, or transform), or the NAM panel may be measured before its transition finishes. The fact that TONE3000 renders normally narrows the symptom to the NAM active view or its mode-switching wrapper, but it does not establish the exact CSS/JS cause.

## Safe fix direction once the matching source is identified

1. Keep animation on the active tab indicator/button only; do not animate the content pane's width or scale.
2. Constrain the NAM content wrapper and its children with `box-sizing:border-box`, `width:100%`, `max-width:100%`, and `min-width:0` where appropriate.
3. Use `minmax(0, 1fr)` for grid tracks and allow flex children to shrink; avoid nested `100vw` widths.
4. Clear temporary inline width/transform styles at transition end, if the matched implementation sets them.
5. Make the smallest UI-only change. Leave NAM/TONE3000 data and device-transfer handlers unchanged.

## Verification checklist

- On a portrait phone, select NAM, let the animation finish, and confirm the panel does not expand beyond the viewport.
- Switch NAM → TONE3000 → NAM several times and confirm widths stay stable.
- Confirm no horizontal page overflow after each transition.
- Check file picker, target-slot selector, send button, downloaded NAM cards, and IR Collection cards remain within the viewport.
- Separately run a regression check that NAM import/readback, IR Collection, IR User/Third Party, and MIDI mappings still work. A visual check alone does not prove hardware transfer behavior.

## Next required evidence

Match the running APK/web build to its source branch/commit, or obtain the exact HTML/CSS/JS bundle that produced the screenshot. Until then, the root cause remains unconfirmed and no application source code has been changed.
