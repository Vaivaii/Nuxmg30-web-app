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

- **Final validated app source:** `3dead361ef69a652d4981002804826c6d2914716` (Build #282). The later branch-head commit `32faa8c3ab0f0245c5d844b588fcb86e2b6b92bf` adds only an explanatory JavaScript comment; it does not change executable behavior.
- **GitHub Actions Build #282:** run ID `41425250987`, conclusion `success`: protocol regression tests, Capacitor Android generation, Gradle `assembleDebug`, and APK artifact upload all succeeded.
- **Automated tests:** 62 passed, 0 failed, 0 skipped.
- **Artifact:** `MG30-Studio-debug-APK`, artifact ID `13131731884`, ZIP size 4,105,289 bytes, SHA-256 `03247392c08a7afdfc4808a3c313cc96ae99c47cdb7f1969601694c038c73427`.
- **APK:** `app-debug.apk`, 4,483,364 bytes, SHA-256 `83540a501f942b017f6b380b15879cf612b11e128b80742f7719631d51509c19`. Both the artifact ZIP and APK ZIP structure passed integrity checks.
- The validated APK is a **debug APK**, not a production/release-signed package.
- CI cannot verify physical MG-30 USB audio behavior or touch behavior on the user's exact Android handset. Those remain required device checks after APK installation. No claim is made that hardware verification was performed.

## Next validation steps

- Install Build #282 on the target Android phone and compare the Studio portrait screen against the approved mockup.
- Test horizontal timeline movement with the track rail fixed; confirm all bar/beat lines remain aligned across ruler and four lanes.
- Drag the white playhead freely, start/stop playback, and confirm the timeline auto-follows during playback and long overdubs.
- Collapse/expand Mixer; test Undo/Redo after clip import, Quick Record take import, clip edits, mute/solo and mixer changes.
- Re-test Jam and existing USB Quick Record route on the phone and original MG-30 Gen 2 firmware 6.0.x.
- Do not merge to `main` or change non-Studio modules without explicit user direction.
