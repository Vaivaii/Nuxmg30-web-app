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
