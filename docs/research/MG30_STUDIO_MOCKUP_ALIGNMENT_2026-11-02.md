# MG30 Studio — Mockup Alignment & Timeline Behavior

**Date:** 2 November 2026  
**Scope:** Studio tab only  
**Baseline:** `cf465171314450445182ed7604fc7db12955825e` (Build #266 app source)  
**Working branch:** `feature/studio-mockup-alignment-undo`

## User-approved visual contract

The tall portrait Studio mockup provided by the user is the exact visual target. It is not a suggestion for a new design. Keep the existing global app header and **do not change the existing bottom navigation** (Editor, NAM & IR, Presets, Studio, Device).

The Studio workspace should follow the mockup hierarchy:
1. "STUDIO / Jamm & Record" heading with "Mini DAW – 4 Track" badge.
2. One three-way Jam / Record / DAW selector.
3. Compact tempo, meter, metronome, options, loop, position, grid/snap and zoom controls.
4. Four stacked track lanes (Backing, Guitar, Bass, Vocals), fixed left track-control rail, common horizontal timeline and bar ruler.
5. Record / Stop / Play / previous / next transport plus stereo L/R meters.
6. Four-channel mixer on the Studio page. The chevron on the Mixer header collapses/expands it.
7. Collapsed Track Settings and Project rows below the mixer.
8. Existing app bottom navigation unchanged.

## Implementation changes

- Reworked only the Studio section of `www/index.html`; global header, navigation/footer and non-Studio page markup were not intentionally edited.
- Replaced independently scrolling ruler/track lanes with one `#dawTimelineScroll` and one `#dawTimelineCanvas`. The track-control rail is separate and stays fixed while the shared timeline scrolls.
- The ruler, beat/bar grid, all four lanes, waveform clips and global playhead now share the same horizontal coordinate space. Track lanes share equal 76px heights and 4px row gaps so the grid does not drift between rows.
- The white playhead is at x=0 for project start, can be dragged for free (unsnapped) seeking, and updates the time/bar-beat readout. Clicking the timeline/ruler also seeks without clip-grid quantization.
- During playback/recording the shared timeline auto-follows the playhead while the left track rail remains fixed.
- Mixer is inline and collapsible; four mixer strips include per-track gain fader, pan control, mute and solo.
- Track Settings and Project remain collapsible; project title is mirrored in the collapsed row.
- Undo/Redo uses project snapshots (up to 100 states), with buttons inside the mockup's three-dot options control and Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y shortcuts. Imported audio and Quick Record take imports are included in history. History is reset on project create/load.
- Existing playback engine, audio capture route, IndexedDB persistence, clip model, trim/split/fade logic, stem ZIP export and Full Mix WAV export are retained.

## Strict non-regression boundary

No source modules for NAM, IR User/Third Party, IR Collection, MIDI mapping, USB-MIDI protocol, Presets, Editor/Signal Chain, or Device were changed. Compare against baseline `cf465171314450445182ed7604fc7db12955825e` reports only these changed paths:
- `.github/workflows/build-apk.yml` (adds this feature branch to APK build trigger)
- `tests/studio-daw-ui.test.js`
- `www/index.html`
- `www/studio-daw.css`
- `www/studio-daw.js`

## Test/build status

- Earlier code checkpoint `ea5b46fe9bd05e4363f00b6952d5a8f011dcb47e` passed the complete GitHub Actions workflow, including protocol regression tests, Capacitor generation and Gradle debug APK build (Build #272, run ID `41424044769`). This checkpoint did **not yet** contain the later playhead auto-follow / import-history / three-dot-menu refinements.
- Latest intended code checkpoint at time of writing: `76fd9512bec53ea29f826709d307df8cf8d367d8`. Newer runs are in progress; do not mark this checkpoint as build-approved until its own complete test + Gradle + artifact-upload workflow succeeds.
- CI cannot verify physical MG-30 USB audio behavior or touch behavior on the user's exact Android handset. Those remain required device checks after APK installation.

## Next validation steps

- Confirm the latest workflow run passes the complete Node test suite and Gradle build.
- Verify APK ZIP and APK archive integrity and record SHA-256 values.
- Check the Studio UI in portrait mode at the same viewport dimensions as the approved mockup.
- On the phone, test timeline horizontal drag with fixed track rail, aligned ruler/grid, draggable playhead, playhead auto-follow during playback, Mixer collapse/expand, Undo/Redo after import and clip edits, and preserve existing Jam / Quick Record USB route.
- Do not merge to `main` or change non-Studio modules without explicit user direction.
