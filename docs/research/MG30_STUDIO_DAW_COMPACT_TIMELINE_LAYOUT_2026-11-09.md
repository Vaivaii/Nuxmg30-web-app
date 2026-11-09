# MG30 Studio — Compact DAW Toolbar / Timeline Layout

Date: 9 November 2026  
Target: NUX MG-30 original Gen 2, firmware 6.0.x  
Repository: `Vaivaii/Nuxmg30-web-app`  
Branch: `feature/editor-reference-one-screen`

## User requirement

The Studio Timeline's fourth track (Vocals) was being covered by the fixed transport dock. The user explicitly rejected adding vertical scrolling or reducing the track/lane dimensions. The chosen solution was to save vertical space in the upper DAW toolbar and return that space to the visible Timeline.

## Implementation

- Replaced the three visible toolbar bands with two:
  1. Tempo, time signature, metronome and More.
  2. Playback position plus Section, Clip and Track menu triggers.
- Moved secondary commands into existing dropdowns while keeping their original IDs: Undo, Redo, cursor start/end, Copy, Paste, Duplicate, loop toggle/In/Out/Clear, trim, split, delete clip, delete track, Snap, Zoom, Nudge and clip fades.
- Existing event binding by element ID was retained; no audio/transport handler logic was modified.
- Compact toolbar padding/gaps were reduced and runtime-injected CSS was made consistent with the static stylesheet. CSS cache token: `studio-daw.css?v=compact-daw-1`.
- Four track row sizing, ruler alignment, lane minimum sizing and the fixed transport dock were retained. The horizontal timeline still uses vertical overflow hidden. No vertical scrolling was added.

## Protected behavior

No changes to audio input/output routing, native AudioRecord/AudioTrack, recording/playback engine, waveform rendering, clip edit functions, project persistence, Mixer, Track Settings, USB routing, NAM, IR, Preset, MIDI or device protocols.

## Regression / release verification

- GitHub Actions: [Run 42636440386](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42636440386) — success.
- Source checkout: `f42ae0273f30a86bc1e65cc6414d9db915e5fa1d`.
- Regression tests: 363 passed, 0 failed.
- Gradle Release: BUILD SUCCESSFUL.
- Package: `com.vaivaii.mg30studio`.
- Version Name: `1.0.0-community.24`.
- Version Code: `24`.
- APK Signature Scheme v2: verified true.
- APK SHA-256: `b93e07e4e0bafed9f25a765655a7dfd9fe1794ec24d23aa16898fce84434fce0`.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Audit artifact ID: `13683626227`.
- Audit ZIP SHA-256: `a8f2c94e2f607c6a48317ab68d8ea2379f7f00a9090528aedeb9e0bba66d74b0`.
- Extracted APK SHA-256 matched the artifact checksum file.

## Physical acceptance still required

Install Community .24 on the target Android phone. Confirm:
- All four tracks, including Vocals, are fully visible above the fixed transport dock.
- Track lane size remains comparable to the previously accepted version.
- The page has no vertical scrolling; horizontal timeline navigation and pinch zoom remain usable.
- More, Section, Clip and Track menus still expose their respective actions.
- Playback, recording, input/output routing and project save/load remain functional.

CI success is not equivalent to physical Android visual/audio acceptance.

## Community .25 — Studio Timeline history/navigation toolbar and compact More menu (9 November 2026)

### User request and screenshot findings
- Studio > DAW Timeline was already functioning; the defect was only that the More dropdown extended behind / was obscured by the fixed transport dock.
- The toolbar's second row had unused space between the playback clock and Section/Clip menu triggers.
- User requested Undo, Redo, cursor Start/End and Nudge controls in that space, plus a slightly smaller dropdown.
- Preserve the existing timeline/track sizing, four visible lanes, transport dock position and all bottom padding.

### Implementation
- Moved the existing button elements (same IDs) for Undo, Redo, cursor Start, cursor End, Nudge Left and Nudge Right from More into a compact icon toolbar directly beside the playback clock.
- Kept all original event bindings and behavior in `www/studio-daw.js`; no new action implementations or duplicate element IDs.
- More now retains only Clip Fades, Snap and Zoom controls. Its maximum width is reduced from 310px to 280px; max-height from 560px to 460px; padding/gap are tightened. Fade controls remain side-by-side on phones to reduce panel height.
- The toolbar's existing 7px padding is intentionally unchanged. No transport dock, timeline viewport, lane sizing, audio, recording, project persistence or device protocol logic was modified.
- Bumped WebView stylesheet cache token to `compact-daw-2`.
- Updated the signed release workflow to Community .25 / versionCode 25.

### Regression protection
- Updated DAW arrangement/UI tests to verify all six actions occur exactly once in the inline clock toolbar, are absent from More, and remain bound to their original handlers.
- Added checks for the smaller More dimensions, compact mobile fade layout, stylesheet cache token, and unchanged 7px toolbar padding.

### Validation
- Source commit: pending.
- Full regression tests: pending.
- Signed Android Release and APK signature/package/checksum verification: pending.
- Physical Android visual/touch confirmation: pending installation. Verify all six toolbar controls fit between the clock and Section/Clip triggers at the user's screen width; open More and confirm it no longer extends beneath the transport dock. Verify buttons and nudge retain their existing enabled/disabled behavior.
