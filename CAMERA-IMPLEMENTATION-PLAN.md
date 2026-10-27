# MG30 Studio Camera — Implementation Plan

Branch: `android/mg30-studio-apk`

## Scope and safety boundaries

This document is a design plan only; it does not add or modify runtime code.

- Keep all work on `android/mg30-studio-apk`.
- Do not push to `main`.
- Do not edit preset editor behavior, preset data structures, MIDI mappings, SysEx functions, or USB preset protocol.
- Preserve the existing USB audio recording path and current Studio backing-track player.
- Add Camera as a separate bottom-navigation tab. Studio and Camera must remain independently usable.

## Product behavior

### Camera tab

A compact, charcoal/lime video-recording workspace with:

- Live camera preview.
- Front/back camera switch, with graceful handling if either lens is unavailable.
- Portrait/landscape support based on device orientation.
- Record / Stop controls and an elapsed-time indicator.
- Recording permission and storage error states.
- A session list showing video takes and links to related audio files.
- No always-on recording, no background camera use, and no upload by default.

### Three deliverables per session

1. **Video-only source**: MP4 from the selected camera, without microphone audio.
2. **Guitar source**: WAV captured through the existing NUX MG-30 USB audio route, targeting the currently verified PCM 24-bit / 48 kHz path. Actual format must be read from the produced WAV header; do not merely label a file 24-bit if the native capture data is another format.
3. **Backing source**: retain the selected local audio file where possible, or copy it into the session folder so it remains available. Do not extract or download audio from YouTube.

Additionally, produce a **final performance video** with the mixed guitar + backing audio muxed into the MP4. Keep the three source assets untouched so the user can remix them later.

## Per-track volume

- Backing gain: independent 0–100% control.
- Guitar gain: independent 0–100% control.
- Apply gains non-destructively during mix/export; never rewrite the original backing file or guitar WAV.
- The source guitar WAV should remain the raw USB capture at its captured bit depth and sample rate.
- The final video audio track will usually be AAC for MP4 compatibility. This does not replace or downsample the retained source WAV.
- Use headroom / clipping protection in the mix stage. Do not silently normalize the source takes.

## Proposed Android architecture

### Camera capture

Use Android CameraX in a small native Capacitor plugin (e.g. `MG30CameraPlugin`) for reliable camera preview, lens switching, lifecycle handling, and video-only MP4 capture. Avoid depending solely on `getUserMedia()` in WebView for a native APK feature that needs robust lifecycle and file management.

- CameraX video capture should have microphone audio disabled.
- Request camera permission only when the Camera tab is opened and the user starts camera setup.
- Save the MP4 into an app-specific session directory and return a stable file path plus metadata.
- Ensure preview stops/releases camera resources when leaving the Camera tab or backgrounding the app.

### Audio capture and mixing

- Reuse the current `MG30AudioPlugin` USB audio recorder; do not create a second competing USB capture route.
- Start the video and USB guitar recording from one coordinated session controller, record timestamps, and stop both safely.
- Copy or reference the selected backing file in the session directory.
- Mix guitar and backing into a new session mix file using a native audio pipeline. Keep the original WAV and backing file unchanged.
- Check for Android audio input contention and USB device detach. If camera or USB capture fails, stop the session cleanly and keep any completed source files.

### Final video mux

- Mux the video-only MP4 and the final mixed audio into a new MP4 using a maintained Android media pipeline (evaluate AndroidX Media3 Transformer / MediaMuxer and any required audio encoding stage against the project's current Android SDK).
- Keep the final mix WAV as an additional deliverable if storage permits.
- Align the start offset and duration, trim only the exported mix to the video duration, and report any offset/short-track issue rather than silently shifting content.
- Do not claim the final MP4 is lossless: the retained guitar WAV is the high-quality source; MP4 audio will likely be AAC.

## Session data model

Each session should contain a stable ID and paths/metadata similar to:

- `videoPath` — camera-only MP4
- `guitarWavPath` — original USB capture WAV
- `backingPath` — local backing source or session copy
- `mixedWavPath` — optional final audio mix
- `finalVideoPath` — final MP4 with mixed audio
- `guitarGain`, `backingGain`
- `sampleRate`, `bitDepth`, `channels`, `durationMs`
- `createdAt`, `status`, `errorMessage`

Persist the session manifest locally so a process interruption does not make completed source files disappear from the app's session list. Validate all file paths against the app's own session directory before rename/delete/export operations.

## Proposed delivery phases

### Phase 0 — compatibility audit

1. Inspect current Capacitor, Android Gradle, SDK, plugin registration, and existing USB capture code.
2. Confirm which Android versions and devices are supported by the project's build configuration.
3. Check camera permission/lifecycle behavior and whether CameraX dependencies can be added without upgrading unrelated components.
4. Test whether camera video capture and the current USB audio capture can run concurrently on the target phone.
5. Confirm the current USB WAV header and channel layout using a real test take.

**Exit criteria:** a camera-only test video and a USB-only test WAV are both valid, and a combined capture can run without either path silently switching to the phone microphone.

### Phase 1 — Camera tab, no final mux yet

- Add a separate Camera tab and preview.
- Add lens switching, orientation handling, recording timer, and video-only MP4 save.
- Keep existing Studio behavior untouched.
- Verify permissions, app background/resume, storage, and repeated recordings.

### Phase 2 — coordinated source recording

- Add a session controller to start/stop CameraX and the existing USB capture together.
- Save source files and session manifest.
- Add independent guitar and backing volume controls for the later mix.
- Verify duration and synchronization across multiple test lengths.

### Phase 3 — mix and final video

- Render a new mixed audio file using the independent gains.
- Mux the mix into a copy of the video to create the final performance MP4.
- Retain source video, source WAV, backing source, mix, and final MP4.
- Add playback, rename, export/share, and clear error reporting.

## Test matrix

- Front and rear cameras, portrait and landscape.
- Camera permission denied, then granted.
- USB MG-30 connected before recording; detached during recording.
- Backing MP3 and WAV; unsupported audio format error.
- Backing gain 0%, 50%, 100%; guitar gain 0%, 50%, 100%.
- 30-second, 3-minute, and 10-minute sessions.
- Start/stop repeated sessions; app background/resume.
- Validate WAV headers and durations; check final video audio sync at start, middle, and end.
- Confirm no preset editor or SysEx files changed in the diff.

## Known technical constraints

- CameraX preview/capture and USB audio capture concurrency must be tested on the actual Android device; it is not guaranteed by the UI alone.
- YouTube search/playback is not a source-audio extraction method. The backing source must be a local audio file the user owns or is authorized to use.
- The final video audio track may be AAC, while the separate guitar source WAV retains the captured PCM format.
- No implementation or compatibility claim should be made until the native APK is built and exercised on hardware.
