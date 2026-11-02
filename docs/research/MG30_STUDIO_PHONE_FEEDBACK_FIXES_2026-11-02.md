# MG30 Studio — Phone Feedback Fixes

**Date:** 2 November 2026  
**Scope:** Studio tab only  
**Working branch:** `feature/studio-mockup-alignment-undo`  
**Validated source commit:** `c093134c3938a9bda9e6bee2a6e5e3b037b8fe9d`

## User-reported issues from phone screenshots

1. Mixer opened downward and forced the user to scroll; transport should remain sticky and the mixer should open upward.
2. Jam and Record showed the DAW toolbar/timeline beneath their own panel.
3. White timeline playhead could not reliably be dragged.
4. Track name/control rail looked like a narrow floating sticker and did not fill the column.
5. Backing had no usable Arm action and its Import action was not visible/reachable; every track should support file import.
6. Mixer channel strip's CENTER label overlapped the fader.

## Fixes applied

### Mixer and transport
- Transport row is now sticky above the app bottom navigation.
- The Mixer disclosure header stays in place; its contents use an upward-opening absolute overlay rather than normal document flow.
- Mixer panel has a bounded height and its own vertical scrolling, so opening it does not lengthen the Studio page.
- Sticky transport has a higher stacking layer than the mixer overlay, preserving access to Play / Stop / Record while mixer controls are open.

### Studio mode isolation
- Mode switching is scoped to the direct mode panels under `#page-studio`.
- The DAW workspace receives an explicit display state in JavaScript and a high-specificity `[hidden]` CSS rule. This prevents the later `display:grid!important` workspace rule from leaking into Jam or Record.
- Leaving DAW pauses playback and stops an active DAW overdub safely.

### Playhead
- Pointer handling moved to the global playhead element.
- The transparent hit target now spans the full track height and is 28px wide, while the visible marker remains a narrow white line.
- Pointer events use capture and touch-action suppression so dragging is usable on a touch screen.

### Track rail and import / arm
- The old mobile 88px track-head width is overridden; each track header now fills the full left rail column and joins visually to its lane.
- Action buttons are sized to keep Arm, Mute, Solo and Import visible together on mobile.
- Backing now has the same Arm action as Guitar, Bass and Vocals.
- The Backing-only arm/record restrictions were removed. Recording still uses the existing MG-30 USB recorder path and one armed track at a time; this does not create separate physical USB inputs per track.
- The per-track Import button continues to use the existing Android file input / file-picker flow and targets the selected track.

### Mixer strip layout
- Corrected the grid to seven rows matching the seven rendered children: track number, title, meter, pan control, fader, pan readout, and M/S controls.
- CENTER now has its own fixed readout row below the fader, rather than sharing/overlapping a grid row.

## Regression tests and build

- GitHub Actions Build #288, run ID `41429188391`: **success**.
- Automated test suite: **68 passed, 0 failed, 0 skipped**.
- Capacitor Android generation: success.
- Gradle `assembleDebug`: success.
- APK artifact uploaded successfully: artifact ID `13134325003`.
- Artifact ZIP: `MG30-Studio-debug-APK`, 4,106,244 bytes, SHA-256 `9a9944536c89892cefff6df33039b878face41410da844c70a1bf728fd294694`.
- APK: `app-debug.apk`, 4,484,120 bytes, SHA-256 `010fafb0baf8e34e9fe3b2308565fe6ccee267bb8a0af760edf8b4a396285553`.
- Both ZIP integrity checks passed.
- The build is a debug APK, not release-signed.

## Non-regression boundary

No source files for NAM, IR User/Third Party, IR Collection, MIDI mapping, USB-MIDI protocol, Presets, Editor/Signal Chain, or Device were modified. The source-code changes for this feedback pass are limited to:
- `www/studio-daw.js`
- `www/studio-daw.css`
- `tests/studio-daw-ui.test.js`

The app header and bottom navigation are unchanged.

## Remaining physical-device validation

CI and archive checks do not prove actual touch behavior on the user's phone or MG-30 hardware behavior. After installing this APK, verify:
- Mixer opens upward and transport remains visible while using the mixer.
- Jam and Record no longer show DAW controls/timeline.
- White playhead drags smoothly along its full-height hit target.
- Track rail fills its column with all four Arm / Mute / Solo / Import actions visible.
- File picker opens for each track and the imported clip lands on the requested track.
- Backing can be armed and records via the same verified MG-30 USB input.
- CENTER text remains separated below the pan/fader controls.

Do not merge to `main` or modify other tabs without explicit user direction.
