# MG30 Studio — Mini DAW 4-track mockup

**Date:** 2 November 2026  
**Branch:** feature/studio-mini-daw-4-track-mockup  
**Base:** 7da21717a0965f44b9491fcc8a76384688d14f84 (Build #261 documentation checkpoint)  
**Scope:** UI concept / design only. No production Studio or audio-engine code changed.

## Goal

Evolve the existing Studio page into a compact four-track DAW while retaining the app's NUX MG-30 visual language and all currently working Jam, YouTube-reference, USB recording, take management, and export behavior. This checkpoint is a visual mockup and interaction/layout brief, not a claim that multitrack audio is already implemented.

## Visual layout

1. **Studio header and mode switch** — keep the NUX MG-30 header and USB-MIDI connection indicator. Within Studio, provide Jam / Record / DAW modes, with DAW selected when opening the four-track workspace. Existing Jam and single-track Record capabilities remain accessible rather than being discarded.
2. **Project / timeline toolbar** — project name, tempo (BPM), time signature, metronome, loop, snap/grid, zoom, and a clear elapsed-time / bars-beats position display.
3. **Four horizontal track lanes** — Backing, Guitar, Bass, and Vocals. Each lane has a fixed track header and a horizontally scrollable timeline with waveform clips and a playhead. Track header controls: input/source, arm, mute, solo, monitor, and a track menu. Distinguish lanes consistently with restrained colors.
4. **Global transport** — Record, Stop, Play/Pause, previous/rewind, next/forward, loop, metronome, position display, and stereo master meters. The transport should remain easy to reach on a phone.
5. **Selected-track inspector** — input source, monitor state, track gain, pan, and future clip/track options. Keep controls contextual to the selected lane.
6. **Four-channel mixer** — one strip per track with level, pan, mute, solo, and channel meter, plus a master meter/output section.
7. **Project actions** — New, Open, Save, and Export Mix (WAV). The project name and recording format are visible without crowding the transport.
8. **Existing bottom navigation** — Editor, NAM & IR, Presets, Studio, Device remains unchanged; Studio stays selected.

## Mobile behavior

- Treat the track-header column as a stable left rail and the waveform/time ruler as a horizontally scrollable area. Users can pan through bars without losing track identity.
- Stack tracks vertically and keep all four lanes independently visible/scrollable.
- Use compact secondary panels or a Track / Mixer / Project subview for the inspector and mixer on narrow phones; avoid shrinking the timeline until waveform controls become unusable.
- Keep global transport fixed or quickly reachable above the app's existing bottom navigation; account for Android safe areas.
- Avoid heavy animation and large waveform rendering work on the UI thread.

## Existing behavior that must be preserved

- **Backing / Jam:** #backingFileInput, #backingAudio, seek, playback, volume, status, and the YouTube search/reference flow in www/index.html + www/main.js.
- **Guitar USB recording:** #guitarRecordBtn, #guitarPlayBtn, #guitarStopBtn, status/meter, saved-take list, rename, and export. Keep the MG-30 USB route verification and current WAV capture behavior.
- **Native audio path:** native-android/MG30AudioPlugin.java currently has one AudioRecord instance/recording state. Its input selection and routing checks are important; do not replace them with a phone-microphone fallback.
- **Unrelated features:** do not change NAM import/library, USER IR / Third Party import, IR Collection, USB-MIDI framing, MIDI mappings, preset transfer, Editor/Signal Chain, CTRL/EXP, or Device settings as part of the Studio redesign.

## Technical boundary / assumptions to verify

The mockup draws four lanes and four mixer channels, but it does **not** establish four independent simultaneous capture sources. The current native recorder is based on a single AudioRecord capture path. The first feasible implementation may therefore need to support imported audio plus sequential overdubbing onto one armed track at a time. Whether Bass and Vocals are recorded through the MG-30 USB input in separate takes, imported as audio, or routed through another supported interface must be resolved through device tests and an explicit routing design. Do not label phone mic capture, multi-channel capture, or simultaneous four-track recording as supported until proven.

Also verify playback synchronization, independent clip timing, offline local project storage, mixdown performance, audio sample-rate conversion, and whether the Android WebView/native layer can mix four tracks without dropouts. These are engineering tasks, not assumptions supplied by the visual mockup.

## Suggested implementation stages after mockup approval

- **Stage 1 — UI prototype:** build only the DAW workspace and responsive track/mixer views. Keep the Jam and existing Record functions available; controls that have no backend must be clearly marked as prototype-only.
- **Stage 2 — project model:** define a versioned local project format for four tracks, clips, source files, tempo, time signature, gain, pan, mute/solo, and track input metadata. Add safe migration and backup behavior.
- **Stage 3 — playback and mixer:** implement synchronized multi-clip playback, per-track gain/pan, mute/solo, master meter, loop and transport; test CPU, latency, and dropout behavior on the target Android device.
- **Stage 4 — recording / overdub:** arm one track at a time and route the verified MG-30 USB stream into a new clip/take. Retain the existing route validation, WAV bit-depth handling, take persistence, and failure recovery.
- **Stage 5 — editing and export:** clip move/trim/split, project save/open, stereo mixdown export, and interrupted-write recovery.
- **Stage 6 — hardware validation:** test on the user's phone and original NUX MG-30 Gen 2 firmware 6.0.x. Validate playback/record alignment, repeated overdubs, file integrity, and that all existing NAM/IR/MIDI/preset workflows remain intact.

## Acceptance criteria for the mockup checkpoint

- Four lanes and four mixer strips are clearly understandable on a phone.
- The track timeline can be horizontally navigated while track headers remain identifiable.
- The Jam/YouTube and current MG-30 USB recording experiences have a clear place in the proposed workflow.
- No UI control falsely promises unsupported recording inputs or simultaneous recording.
- No production audio, MIDI, NAM, IR, preset, or signal-chain path is changed until the design is reviewed.

## Decision pending

This is the first visual direction only. Review the generated mockup image in the conversation before implementing the interactive Studio UI or audio engine.

## Smartphone portrait mockup revision

The desktop-like first concept was revised at the user's request to a true tall smartphone composition. The second visual uses a narrow portrait viewport rather than a wide dashboard. Its arrangement is: Studio title and Jam/Record/DAW mode tabs; compact project/timeline controls and bar/beat position; four stacked Backing/Guitar/Bass/Vocals lanes with their own mute/solo/arm controls; global transport and L/R meters; four condensed mixer strips; collapsed Track Settings and Project rows; the original bottom navigation. Keep this narrow-screen information hierarchy as the primary implementation target. The visual remains a mockup: no multi-track capture or audio mixing capability is claimed by the image.
