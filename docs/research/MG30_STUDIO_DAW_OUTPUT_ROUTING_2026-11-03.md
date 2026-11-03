# MG30 Studio — DAW Playback Output Routing (2026-11-03)

## User decision
The user selected **both outputs with a manual choice**:
- Phone speaker / Android's current default output.
- NUX MG-30 USB output.

This is a per-project DAW playback preference. It does not alter the pedal's USB ROUTING MODE, the DAW track input routes, or any device setting.

## Branch isolation
- Repository: `Vaivaii/Nuxmg30-web-app`
- Working branch: `feature/studio-daw-output-routing`
- Base source: `feature/studio-usb-loopback` at `56da4de932fe7fda012836ee76d511d6ca34c130`.
- The previous branch is not modified. No changes are made to `main`.
- Target remains original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.

## Implementation in this increment
1. `www/studio-daw-core.js`
   - Adds a project-level `outputRoute`.
   - Defaults new projects and migrated projects to `speaker`.
   - Only accepts `speaker` or `mg30` during normalization.
2. `www/studio-daw.js`
   - Adds an Audio Output selector to DAW Track Settings.
   - Speaker mode retains the existing Web Audio playback graph.
   - MG-30 mode discovers the named NUX/MG-30 USB output endpoint and asks Android to open a 48 kHz, stereo, PCM 16-bit AudioTrack pinned to that device.
   - The actual routed device ID is checked before playback starts and before every PCM chunk is written.
   - Existing DAW mix rendering is reused in 500 ms offline chunks, encoded to interleaved stereo PCM16 and sent to the native output stream.
   - Playback cancellation uses a generation token; native stream is stopped/released on pause, stop, end-of-timeline, route loss or error.
   - The output route setting is saved with the project. Input route selection remains separate.
3. `native-android/MG30AudioOutputPlugin.java`
   - Adds `startDawPlayback`, `writeDawPlaybackChunk`, and `stopDawPlayback`.
   - Uses a separate AudioTrack state inside the output plugin.
   - Does not instantiate or modify AudioRecord and does not touch `MG30AudioPlugin.java`.
   - Rejects missing/mismatched MG-30 routes rather than silently falling back to the phone speaker.
4. `tests/studio-usb-output.test.js`
   - Adds regression checks for PCM streaming, route verification, output selector and project route persistence.
5. `.github/workflows/build-apk.yml`
   - Adds this isolated feature branch to the existing Android build workflow.

## Important evidence and hardware boundary
- The user previously reported that a test stream became audible after selecting REAMP and raising MG-30 PLAY LEVEL. That report is not proof that this new chunked DAW playback engine works end-to-end.
- A prior diagnostic also showed Android route equality and successful AudioTrack writes while no acoustic output was heard. Therefore UI status deliberately distinguishes Android route confirmation from the user's listening confirmation.
- Do not claim physical playback success until the user hears a DAW clip through the MG-30.
- Speaker output uses the existing Web Audio graph and still needs regression testing on the handset.
- The USB streaming path is currently a first increment: it uses 500 ms PCM chunks. Measure gaps/dropouts, pause/stop responsiveness, synchronization and CPU load on the actual Android phone.
- Current known follow-up items for MG-30 mode: native-output master/track meters, metronome click, loop wrap, monitoring while recording, and full-duplex USB input/output behavior need separate implementation and device validation. Do not claim those are already supported by the new native output path.

## Validation status at checkpoint
- Build #421 was triggered by the first push but failed in the test file due to an invalid regular-expression assertion in the newly added tests. That test was rewritten to use literal assertions.
- Build #422 was then triggered from commit `f700c1d371490248e43dc9d0e3b33c14f3eb1efd`; its result must be checked before any APK is distributed.
- No APK from this feature branch is approved or distributed at this checkpoint.
- No physical test of the new DAW USB PCM stream has been performed.

## Protected feature paths
No source changes are intended in:
- NAM import/transfer.
- Custom IR User / Third Party import.
- IR Collection import.
- MIDI mappings and USB-MIDI framing.
- Preset read/write/import/export.
- Signal Chain, CTRL/EXP, Editor or Device settings.
- Existing USB AudioRecord capture plugin `native-android/MG30AudioPlugin.java`.
- Existing four-track model and its media/project storage, except for the additive `outputRoute` project property.

## Next steps
1. Confirm Build #422 Node tests, Vite production build, Capacitor Android initialization, Gradle assembleDebug and artifact upload.
2. Inspect packaged APK and source SHA before install.
3. Install only after the CI/package checks pass.
4. Test Speaker output with a known backing clip.
5. Test MG-30 USB output with a short known clip while the pedal remains in the already-known audible configuration; do not change pedal routing mode automatically.
6. Report separately: Android route ID, audible result at MG-30 outputs, clip continuity, latency, dropouts, pause/stop and resume/seek behavior.
7. After successful playback, add metronome/loop and output meter support, then test simultaneous USB playback and the existing USB recording path.
8. Continue protecting NAM, both IR protocol families, MIDI mappings, presets and Signal Chain.


## Follow-up guard and CI status (3 November 2026)
- Added a guard so the existing Web Audio metronome does not unexpectedly play through the phone speaker while the selected output is MG-30 USB. Native-output metronome click generation remains a follow-up.
- Build #421 failed only because the first version of the new test file contained an invalid regular-expression assertion. No APK was produced.
- The assertions were rewritten as literal checks. Build #422 then passed the Node test suite, initializer validation and Capacitor Android generation; Gradle APK assembly was still running at the time of the next check.
- Build #423 includes the metronome-output guard. At the latest check its Node test suite, initializer validation and Capacitor Android generation had passed; Gradle `assembleDebug` was still in progress.
- Build #423 run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41658067058
- Build #423 source commit: `7852e117fdc3951c10494b35f676e735987c3d44`.
- Current branch HEAD at this documentation update: `7852e117fdc3951c10494b35f676e735987c3d44` (documentation-only commit may follow).
- No APK from this branch is approved for installation until Gradle, artifact upload and package inspection complete.
