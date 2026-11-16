# AI Tone Studio — Rounded Dock and Dynamic Settings Polish (2026-11-16)

## Target
- Original NUX MG-30 Gen 2 firmware 6.0.x only; not MKII.
- Branch: `feature/multi-ai-free-tone-architect`.
- Visual refinement requested after the fixed Audio Listening and Settings layout was validated.
- Reference: user-approved mockup for rounded floating dock surfaces and content-sized Settings.

## UI changes
- Audio Listening remains a fixed sibling dock directly above the composer and outside conversation scrolling. Its surface now has rounded 18–20px corners, soft green glass gradient, subtle border/shadow, softer segmented mode buttons, rounded Refresh/Start Listening controls and quieter status styling.
- The composer remains fixed below Audio Listening. Its surface is now a floating rounded panel with a soft gradient, inset border highlight and deeper shadow. Prompt, Undo and Send controls use consistent roundness and spacing.
- Settings remains an independent overlay outside the conversation scroller. The fixed bottom reservation was removed. Its height is now `auto`, capped by the available assistant sheet height, so native `details` open/close state changes the panel's content height instead of leaving a tall empty area.
- Provider and Token Usage cards receive softer rounded surfaces and more generous inner padding. Token details continue to use their existing native `details` disclosure state.

## Preserved behavior
- Audio Listening capture mode, USB Audio capture, refresh, start/stop, local PCM analysis and header collapse/expand handler are unchanged.
- Settings provider/model, token monitor, fallback and TONE3000 NAM controls remain unchanged.
- NAM search/import, A2 validation, slot 10 transfer, conversation rendering, IR routing, MIDI mappings, USB-MIDI live update and preset validation are untouched.
- Original MG-30 Gen 2 only; no MKII behavior introduced.

## Regression coverage
- Assert rounded Audio Listening and composer surfaces.
- Assert Settings uses `height:auto`, `bottom:auto` and a bounded max-height rather than the previous fixed bottom reservation.
- Existing tests continue to assert Audio Listening and Settings remain outside the sole conversation scroller.

## Validation boundary
- GitHub Actions syntax, Node regression tests and Android APK build must complete successfully for the latest commit before CI success is claimed.
- Physical Android WebView checks remain necessary for visual tuning, disclosure behavior and keyboard/safe-area interaction.
