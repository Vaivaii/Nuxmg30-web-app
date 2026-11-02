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


## Follow-up: sticky dock and compact mockup proportions (Build #294)

**Date:** 2 November 2026  
**Validated commit:** `fea8a59224eb26dffb261ef25fdfeac133c973a7`  
**GitHub Actions:** run `41431843644`, conclusion `success`.

### Additional corrections

- Wrapped the transport row and Mixer disclosure header in a single `#dawStudioDock` sticky dock above the unchanged bottom navigation.
- Transport now remains in the dock rather than sticking independently over the four track lanes.
- Mixer opens upward from its disclosure header into the timeline area while the transport controls remain visible beneath it.
- Removed internal vertical scrolling from the Mixer overlay; the four channel strips use fixed dimensions.
- Set Mixer channel strip height to 136 CSS px and fader height to 46 CSS px. The CENTER readout remains in its own row.
- Reduced each of the four track lanes and fixed labels to 38 CSS px; clips are 30 CSS px high, bringing the timeline closer to the supplied mockup's proportions.
- Removed the 4px rail spacer gap below the ruler so the first fixed track label begins on the same row as the first timeline lane.

### Validation

- Automated tests: **73 passed, 0 failed, 0 skipped**.
- Capacitor Android generation: success.
- Gradle `assembleDebug`: success.
- APK artifact upload: success.
- Artifact ZIP: 4,107,603 bytes, SHA-256 `d40d658ce18d5f73620cdcc9378d67ef1cb34760e2a3ff77f26f52e05ea1a4e4`.
- Extracted `app-debug.apk`: 4,485,476 bytes, SHA-256 `cf74aa8016d1136196e5fd274af6f0bd266ee9354b24ec29d59b02d3388e662b`.
- Artifact ZIP and APK archive both passed integrity tests.

### Source boundary

Compared with Build #288, only the following paths changed:
- `www/index.html` — wraps Studio transport and Mixer in the dock
- `www/studio-daw.css` — Studio-only dock and compact dimensions
- `tests/studio-daw-ui.test.js` — regression tests
- This research note

No NAM, IR, MIDI, Presets, Editor, Device, or global bottom-navigation module was changed.

Physical phone interaction remains to be verified. The debug APK has not been tested directly on the user's phone in this session.


## Follow-up: low fixed dock and live draggable playhead (Build #297)

**Date:** 2 November 2026  
**Validated source commit:** `41abee8fb5835ac445f2111834e8a1b8b2076784`  
**GitHub Actions:** run `41433313054`, conclusion `success`.

### Problems identified from the user's Build #294 screenshot

- The transport/Mixer dock still occupied normal document flow despite sticky positioning, taking vertical space away from the timeline.
- JavaScript updated `element.style.left`, but the final CSS rule `left:0!important` overrode it. As a result, the time readout advanced while the visible white marker remained fixed.
- Drag coordinates were computed against the canvas rectangle without explicitly accounting for the shared scroller offset, making manual seeking unreliable after horizontal scrolling.

### Corrections

- The Studio dock is now `position:fixed` and anchored lower in the viewport above the app navigation. It is removed from normal layout flow, so it no longer reserves timeline height.
- Dock width is constrained to the viewport/app content width and horizontally centered; the existing bottom navigation remains untouched.
- `renderPlayhead()` writes `--daw-playhead-x` from the same `playheadSeconds` value updated by the playback animation frame.
- The playhead CSS reads that variable, removing the conflict with the old fixed `left:0!important` rule.
- Drag seeking calculates content coordinates using the timeline scroller's viewport rectangle plus `scrollLeft`.
- During a drag, reaching either horizontal edge auto-scrolls the shared timeline while the pointer continues to seek.
- The transparent touch target remains 32px wide around the visible 2px line; pointer capture is retained for touch/mouse dragging.

### Validation

- Automated tests: **76 passed, 0 failed, 0 skipped**.
- Capacitor Android project generation: success.
- Gradle `assembleDebug`: success.
- APK artifact upload: success.
- Artifact ZIP: 4,108,036 bytes, SHA-256 `1e2ebe4cfaaead03eedb17d6c454bf03c3c37f9d9ad253093c3ab255a57c7bc1`.
- Extracted `app-debug.apk`: 4,485,812 bytes, SHA-256 `42cff3c15e88bb1fc91bd0c1adef228ea2cc8d39619f9588a2286b69a0fd3c2a`.
- Both ZIP archive integrity checks passed.

### Source boundary

Compared with Build #294, the changes are limited to:
- `www/studio-daw.js` — dynamic playhead position and scroller-aware drag/edge scroll
- `www/studio-daw.css` — fixed lower dock and dynamic playhead position
- `tests/studio-daw-ui.test.js` — regression assertions
- This research note

No `www/index.html`, global navigation, NAM, IR, MIDI, Presets, Editor, or Device source was changed in this follow-up.

Physical touch behavior still needs confirmation on the user's handset. The build was CI-verified; it was not directly run on the user's phone in this session.


## Follow-up: separate Timeline / Mixer / Track Settings pages (Build #303)

**Date:** 2 November 2026  
**Validated source commit:** `2e58a2fdfa649e2ebb126d2c6f76e6e1601ea10d`  
**GitHub Actions:** run `41437440594`, conclusion `success`.

### User-approved DAW navigation model

The Jam / Record / DAW mode selector remains unchanged. When DAW is active, a second navigation row appears at the bottom of the Studio workspace with three independent pages:
1. **Timeline** — tempo/meter and DAW timeline controls, ruler, four aligned tracks and clip editing.
2. **Mixer** — only the four channel strips (gain, pan, mute and solo).
3. **Track Settings** — selected-track controls and Project Settings in the same page, including project name, save/new, saved project selection, WAV mix export, stems ZIP export and Quick Record import.

The fixed transport (Record / Stop / Play / Rewind / Forward plus L/R master meter) sits immediately above the three DAW page tabs. These two rows form a single fixed dock above the unchanged app navigation. The DAW sub-navigation is inside the DAW mode panel and is therefore hidden automatically in Jam and Record modes.

### Implementation

- Replaced the old inline Mixer accordion and separate Track Settings / Project accordions with three mutually exclusive `data-daw-page-panel` page sections.
- Added the Timeline / Mixer / Track Settings sub-navigation with `setDawPage()`; each selection hides the two inactive pages instead of stacking or overlaying them.
- Stored DAW page selection independently from Jam / Record / DAW mode selection using local storage key `mg30-studio-daw-page`.
- Moved the existing `dawMixer` render target into the Mixer page without changing its track/mix state model or event delegation.
- Moved `dawTrackInspector` and all Project Settings controls into the Track Settings page. Project summary/meta IDs remain available to the existing toolbar update code.
- Kept the existing transport IDs and event handlers in one fixed bottom dock, with the new DAW sub-navigation immediately below.
- Timeline is now the only content page containing timeline controls; its panel expands within the available content area. Mixer and Track Settings no longer take vertical space while Timeline is active.
- Restored flexible tall track rows on the Timeline page rather than the earlier compact 38px rows. The fixed left track rail and scrollable right lanes share equal row heights.

### Validation

- Automated tests: **83 passed, 0 failed, 0 skipped**.
- Capacitor Android generation: success.
- Gradle `assembleDebug`: success.
- APK artifact upload: success.
- Artifact ZIP: 4,111,726 bytes, SHA-256 `fdf2e72f5a97c58740ba455168470e83c6fa88731fbae8c453a64692b055b91a`.
- Extracted `app-debug.apk`: 4,488,496 bytes, SHA-256 `cc4dea9e257bd7c768ae5611cafb4ad0f98851c0cdc98416ee5e33b79fd139dd`.
- Both the artifact ZIP and embedded APK archive passed integrity checks.

### Source boundary

Compared with Build #297, the source changes are limited to:
- `www/index.html` — DAW page markup only
- `www/studio-daw.js` — sub-page state and page-selection event handling
- `www/studio-daw.css` — page layout and fixed transport/sub-navigation dock, scoped to `#page-studio`
- `tests/studio-daw-ui.test.js`
- This research note

The global app navigation and NAM, IR User/Third Party, IR Collection, MIDI, Presets, Editor/Signal Chain, and Device source remain unchanged.

### Physical-device validation still required

CI verifies the app build and automated DOM/CSS/source regression assertions, but does not emulate the user's exact Android touch experience. After installing Build #303, confirm:
- Timeline fills the space down to the fixed transport dock.
- Selecting Mixer replaces Timeline entirely; the four faders and M/S controls fit without changing the Timeline page's height.
- Selecting Track Settings shows both selected-track controls and Project Settings.
- Transport remains fixed above the internal three-tab navigation.
- Switching to Jam or Record hides the internal DAW sub-navigation and dock.
- Playback, playhead drag, clip editing, import, overdub, save/load and export continue to work on the target phone and original MG-30 Gen 2 firmware 6.0.x.

Do not merge to `main` or modify other tabs without explicit user direction.


## Follow-up: Timeline cleanup, no-scroll VU Mixer, sticky mode tabs and aligned grid (Build #308)

**Date:** 2 November 2026  
**Validated source commit:** `35963bd8cff39ed58292e33b499ee53bbef3ae54`  
**GitHub Actions:** run `41439766111`, conclusion `success`.

### Screenshot feedback addressed

- Removed the visible status card beneath Timeline tracks; its `aria-live` status text remains available to assistive technology without reserving layout height.
- Removed the Mixer page's large heading and the visual Backing/Guitar/Bass/Vocals title line inside each mixer strip. Channel numbers and accessible channel names remain.
- Kept the Mixer as a no-scroll page and sized the faders to the available viewport height above the fixed transport + DAW sub-navigation dock.
- Added a 12-segment LED VU ladder beside each fader.
- Made the top Jam / Record / DAW selector sticky while scrolling Studio content.
- Removed independent grid painting from the timeline canvas. Ruler and every track lane now draw their beat/bar lines using the same inherited bar width, beat width, repeat interval and 1px background origin.

### Per-track VU implementation

- Each active playback track now has its own `AnalyserNode` tap between pan and the master bus.
- The per-track analyzer computes RMS and peak from that channel's playback signal and updates only that channel's 12 LED segments.
- Muted or non-playing channels remain dark; stopping playback disconnects per-track analyzers and clears their LED states.
- The master L/R meter remains intact and continues to show the master bus.
- No microphone fallback or new recording input path was introduced.

### Validation

- Automated tests: **89 passed, 0 failed, 0 skipped**.
- Capacitor Android project generation: success.
- Gradle `assembleDebug`: success.
- APK artifact upload: success.
- Artifact ZIP: 4,113,608 bytes, SHA-256 `c15c517c6472b2b57b94fc8249a3acdb62d6e3424a3dc7381d84d6878eab717f`.
- Extracted `app-debug.apk`: 4,490,168 bytes, SHA-256 `444d0bbb19c928101ea070d42fd72dac27de1967bec12c96a59d25b289733309`.
- Both the artifact ZIP and APK archive passed integrity checks.

### Source boundary

Compared with Build #303, only these paths changed:
- `www/index.html` — Studio status accessibility class and Mixer heading
- `www/studio-daw.js` — per-track VU meter markup, independent analyzers and level updates
- `www/studio-daw.css` — Studio-only mode sticky bar, no-scroll Mixer layout, VU LEDs and common ruler/lane grid
- `tests/studio-daw-ui.test.js`
- This research note

The global app navigation and all NAM, IR, MIDI, Presets, Editor/Signal Chain, Device and non-Studio sources remain unchanged.

### Physical-device checks still required

- On the actual Android phone, confirm Mixer fits without vertical scrolling and all four faders plus LED ladders remain above the dock.
- Play a clip on one track at a time and verify only that track's LED ladder responds; then play multiple tracks and verify independent activity.
- Scroll Track Settings and confirm Jam / Record / DAW remains sticky.
- Check ruler and grid boundaries across all four tracks at several zoom levels and after horizontal scrolling.
- Reconfirm audio playback, per-track gain/pan/mute/solo, clip editing, save/load, import, export and original MG-30 Gen 2 USB overdub route.

CI verifies source regression tests and APK packaging; it does not simulate touch/audio on the user's handset. Do not merge to `main` or modify other tabs without explicit user direction.
