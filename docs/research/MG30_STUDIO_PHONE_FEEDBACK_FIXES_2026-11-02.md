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


## Follow-up: dock-to-navigation alignment, pinned Studio modes and editable track names (Build #315)

**Date:** 2 November 2026  
**Validated source commit:** `bae179e9260b50b1c57a8a8d2961a4e2efcbc5bd`  
**GitHub Actions:** run `41443250106`, conclusion `success`.

### Changes based on the latest Android screenshots

#### Transport + DAW sub-navigation dock
- The dock bottom offset is no longer a hard-coded phone-specific number.
- `syncStudioPinnedControls()` measures the actual `.nav` bounding rectangle. When the app navigation is at the bottom of the viewport, the dock's bottom position is set to 8px above the navigation's top edge.
- The dock width and horizontal center are measured against the visible Studio page content when Studio is selected.
- The geometry is recalculated on app resize and on the Studio page navigation click (after the page is made visible), avoiding stale measurements taken while Studio was hidden.
- The app's main navigation is read for geometry only; its markup and behavior are unchanged.

#### Jam / Record / DAW mode tabs
- The mode selector remains sticky while Track Settings is scrolled.
- Its sticky top offset is calculated from the application header's live bottom edge plus an 8px separation, so the three mode buttons remain below the app header rather than covering it.
- The mode tabs remain scoped to the Studio page and do not alter navigation behavior in other tabs.

#### Track names
- Each Mixer channel now displays its editable track name underneath the numbered channel badge.
- Track Settings now exposes a `Track name` text field for the currently selected track (up to 32 characters).
- Renaming a track updates its Timeline label, Mixer label, accessible channel names and selected-track summary, then schedules project persistence.
- The redundant `DAW · CONFIGURATION`, `Track Settings`, descriptive heading and `Selected Track` subheading were removed from the Track Settings content. Project Settings remains as its own section.

### Validation

- Automated tests: **95 passed, 0 failed, 0 skipped**.
- Capacitor Android project generation: success.
- Gradle `assembleDebug`: success.
- APK artifact upload: success.
- Artifact ZIP: 4,114,389 bytes, SHA-256 `1824f3e82ddfc9cb29221cb658999bb496c619d0a57a8f20835e5ef472f7b6f7`.
- Extracted `app-debug.apk`: 4,491,080 bytes, SHA-256 `daea04faaad652060be614cea137c3d1471c5a61fde57efdceb6d11063395c4d`.
- Artifact ZIP and APK internal ZIP structure both passed integrity tests.

### Source boundary

Compared with Build #308, the only source and test files changed are:
- `www/index.html` — redundant Track Settings heading removal only
- `www/studio-daw.js` — dock geometry measurement, Studio nav/resize recalculation and track rename persistence
- `www/studio-daw.css` — dock alignment, sticky mode selector, Mixer channel name and rename-field styling
- `tests/studio-daw-ui.test.js`
- This research note

No NAM, IR User/Third Party, IR Collection, MIDI, Presets, Editor/Signal Chain, Device, or main navigation source was changed.

### Physical-device validation still required

- Confirm the dock's lower edge stops just above the app's main navigation on the actual phone.
- Scroll Track Settings and confirm Jam / Record / DAW stays below the app header without covering it.
- Rename each of the four tracks in Track Settings; verify the name persists after saving/reopening the project and appears under the matching Mixer channel number.
- Reconfirm playback, gain/pan/mute/solo, per-track VU activity, import, export and original MG-30 Gen 2 USB overdub behavior.

CI confirms automated regression tests and successful APK packaging; it does not emulate the user's Android touch or USB-audio hardware. Do not merge to `main` or modify other tabs without explicit user direction.


## Follow-up: restore proportional dock, sticky Studio mode selector and Mixer fader grid (Build #320)

**Date:** 2 November 2026  
**Validated source commit:** `31b5d546a596c18e2bf4fdab4665fd361de6cf8b`  
**GitHub Actions:** run `41445448490`, conclusion `success`.

### Regressions reported from Build #315

The user's phone screenshots showed:
- The transport + sub-navigation dock had an inconsistent/narrow horizontal width.
- The Jam / Record / DAW selector used a sticky top offset calculated from the application header even though `#page-studio` is already its own scrolling region. That made the selector sit too far down and overlap Studio content.
- Mixer faders collapsed/disappeared. The Mixer channel markup has six direct children, but the CSS grid defined only five rows. The fader/control row was therefore pushed into an implicit row with no reliable height.
- The channel-name element was also changed from `strong` to a dedicated `span` to avoid legacy rules that intentionally hide direct-child `strong` channel headings.

### Corrections

#### Dock geometry
- Removed dynamic left and width values derived from the page content rectangle.
- Dock is now centered to the viewport with `width:min(calc(100vw - 20px),1172px)`, keeping proportional horizontal margins on mobile and a bounded desktop width.
- Bottom position is still measured against the actual fixed main navigation: `viewportHeight - navRect.top + 8px`. This aligns the dock bottom 8px above the main nav top.
- The dock geometry is refreshed after selecting Studio from the main app navigation and on viewport resize.
- Transport buttons and the stereo meter now use an explicit proportional two-column grid; the sub-navigation takes the full dock width beneath it.

#### Studio mode selector
- Removed the calculated `headerRect.bottom` top offset, which was being applied twice inside the Studio scrolling region.
- The Studio hero now scrolls normally; only Jam / Record / DAW stays sticky at `top:0` inside `#page-studio`.
- The application header remains outside the Studio scroll region and retains its existing behavior.
- The mode selector no longer overlaps the transport content or DAW sub-navigation.

#### Mixer faders
- Mixer strip CSS now declares six explicit rows matching the six direct children: channel number, track name, pan dial, pan readout, fader/VU control row and M/S buttons.
- Fader/VU row has a minimum height of 150px; both the fader wrapper and slider have explicit height/min-height rules.
- Track name is a dedicated `span.daw-mixer-track-name`, not a hidden legacy `strong`.
- Channel name, per-channel LED VU, pan, fader, Mute and Solo remain present.

### Validation

- Automated tests: **99 passed, 0 failed, 0 skipped**.
- Capacitor Android generation: success.
- Gradle `assembleDebug`: success.
- APK artifact upload: success.
- Artifact ZIP: 4,114,862 bytes, SHA-256 `6c019ae9929ea60e007a6684d6072ea81d18719a8bfb8d0eaf4356962229b790`.
- Extracted `app-debug.apk`: 4,491,852 bytes, SHA-256 `1564ab761b1ab8b39efc2f759c5143853beede61697c3bc3acb611b276944795`.
- Artifact ZIP integrity and embedded APK ZIP integrity both passed.

### Source boundary

Compared with Build #315, source changes are limited to:
- `www/studio-daw.js` — dock geometry helper and Mixer name element
- `www/studio-daw.css` — final Studio dock, sticky mode selector and six-row Mixer channel overrides
- `tests/studio-daw-ui.test.js`
- This research note

The following remain unchanged: `www/index.html`, `www/ui-redesign.css`, global bottom navigation, NAM, IR User/Third Party, IR Collection, MIDI, Presets, Editor/Signal Chain and Device.

### Physical-device validation still required

Install Build #320 and confirm on the target phone:
- Dock left/right margins are visually equal and the dock bottom sits just above the fixed main navigation.
- Jam / Record / DAW remains below the app header, with no overlap against the quick toolbar or DAW sub-tabs while Track Settings scrolls.
- All four Mixer faders appear at full vertical length with independent LED VU ladders; no Mixer page vertical scrolling occurs.
- Track names remain visible and editable; project rename persistence still works.
- Playback, playhead, import, clip editing, save/load/export and original MG-30 Gen 2 USB overdub remain intact.

CI verifies 99 automated tests and successful APK packaging. It does not emulate the user's Android screen geometry, physical fader touch, playback VU response or MG-30 USB audio hardware. Do not merge to `main` or modify other tabs without explicit user direction.


## Follow-up: real clip waveforms and horizontally centered Mixer faders (Build #326)

**Date:** 2 November 2026  
**Validated source commit:** `658917824eed6009754206a6acfcad52cfb0f3df`  
**GitHub Actions:** run `41451292714`, conclusion `success`.

### Screenshot/video findings

- Imported clips were rendered as solid-looking colored blocks; although a 72-bin peak array was already stored on import, old saved projects could retain empty waveform arrays and the HTML-bar presentation had insufficient contrast to resemble a DAW waveform.
- Mixer fader controls were horizontally offset because the fader wrapper and the VU ladder shared a flex row. The ladder consumed horizontal width, so the slider's apparent center did not align with the center of the channel strip.
- The user asked for a conventional DAW waveform and the four faders centered within their channel strips.

### Waveform implementation

- Added a pure helper `analyzeWaveformPeaks(firstChannel, secondChannel, count)` to `studio-daw-core.js`. It computes 128 mono/stereo bins from decoded PCM samples, combining peak amplitude (to preserve transients) and RMS (to keep sustained/quiet content visible). Output is bounded to 3–100.
- `studio-daw.js` now uses the tested helper for imported audio and renders a symmetric SVG waveform envelope inside each clip. The SVG uses a centered baseline and 128 filled peak bars, scaled to the clip width.
- Increased visual contrast between waveform peaks and the clip background, while retaining the track color as the waveform accent.
- When loading an older saved project, the app decodes each clip's media blob from IndexedDB. Clips whose waveform array is absent or not 128 bins are reanalyzed, then the updated project is saved locally. Existing clips therefore gain a true waveform without asking the user to re-import audio.
- The old deterministic pseudo-waveform fallback was removed; the rendered waveform now comes from the real source audio. If audio data is unavailable, the clip shows only a subtle center baseline rather than fabricated peaks.

### Mixer fader alignment

- `.daw-mixer-control-row` is now a positioning context rather than a flex row.
- The fader wrapper is absolutely centered at 50% with a translateX(-50%), so the physical slider axis is centered in the channel regardless of the VU meter.
- The LED VU ladder is positioned independently at the right edge of its channel strip.
- The current vertical fader orientation, gain mapping, pan, Mute, Solo and independent VU analyzer path are retained.

### Validation

- Automated tests: **104 passed, 0 failed, 0 skipped**.
- Added deterministic mono/stereo waveform unit tests:
  - A known mono signal with quiet/loud/medium/quiet sections yields higher bins in the loud section.
  - A stereo signal is analyzed using both channels.
  - Silence returns a safe non-empty floor; empty input returns an empty array.
- Studio UI regression tests confirm SVG waveform rendering, old-project waveform regeneration, and fader centering independent of the VU ladder.
- Capacitor Android generation: success.
- Gradle `assembleDebug`: success.
- APK artifact upload: success.
- Artifact ZIP: 4,115,559 bytes, SHA-256 `e1ec3a3e4e38ed91ab6717e1bad0bb4b4d7d66275fc043fc42b56b5fe458c2fd`.
- Extracted `app-debug.apk`: 4,492,784 bytes, SHA-256 `aac1605f5993a8b0ffed5a70591c93ac6cdab2a6d3b9bfae5556da12a6b4558d`.
- ZIP archive integrity and embedded APK archive integrity both passed.

### Source boundary

The app/test changes are limited to:
- `www/studio-daw-core.js` — pure PCM waveform peak analysis helper
- `www/studio-daw.js` — real waveform creation, SVG markup and old-project waveform migration
- `www/studio-daw.css` — waveform contrast/placement and centered fader/VU positioning
- `tests/studio-daw-core.test.js` — mono/stereo signal tests
- `tests/studio-daw-ui.test.js` — waveform and fader regression assertions
- This research note

No main navigation, Jam/Record mode logic, MG-30 USB audio routing, NAM, IR, MIDI, Presets, Editor/Signal Chain or Device code was modified.

### Physical-device validation still required

Install Build #326 and confirm:
- The previously imported blue clips now display a real waveform even when loaded from an older saved project.
- Quiet sections, transients and pauses have visible relative amplitude differences, resembling a conventional DAW clip.
- All four fader axes align with the horizontal center of their channel strips; VU ladders remain independently at the right.
- Dragging the faders still updates track gain and playback level.
- Existing project save/load, clip trim/split/fades, undo/redo, export, per-track VU and the original MG-30 Gen 2 USB overdub path still work.

Automated source tests and APK packaging are verified; waveform appearance and touch alignment still require physical Android testing. Do not change non-Studio tabs or merge to `main` without explicit direction.


## Follow-up: pin the entire Studio header (title + Jam / Record / DAW) (Build #328)

**Date:** 2 November 2026  
**Validated app source commit:** `67c0b83934865ee77cc92464ff09796a16fc028b`  
**GitHub Actions:** run `41467199554`, conclusion `success`.

### Screenshot feedback and root cause

The user's latest screenshot confirmed that the Studio page title (`STUDIO / Jamm & Record`) and Jam / Record / DAW selector still moved as the Track Settings content was scrolled.

Root cause:
- The main mobile app uses each visible `section[id^="page-"]` as its own vertical scroll container.
- Earlier Studio-only CSS overrode the original hero sticky behavior with `position:relative`, while the mode tabs were sticky as a separate element. That left the title outside the pinned tab group and allowed the title to leave the viewport.
- Two independently sticky elements were not the correct layout for the requested behavior.

### Structural correction

- Wrapped the Studio hero and Jam / Record / DAW selector together in one new direct child: `#page-studio > .studio-fixed-header`.
- The entire wrapper is now one sticky header at `top:0` within the Studio scroll container, with its own opaque background and higher stacking order.
- The hero and mode selector are normal-flow children inside the wrapper, not separate sticky elements.
- Jam, Record and DAW mode panels remain direct children of `#page-studio`, so the existing `setStudioMode()` visibility selection remains unchanged.
- Only the area below the pinned wrapper scrolls. The app title at the top of the global shell, global bottom navigation and fixed transport/sub-tab dock are unchanged.
- Dock positioning, waveform SVG generation/migration, centered faders, per-track VU and all playback functions are unchanged from Build #326.

### Validation

- Automated tests: **107 passed, 0 failed, 0 skipped**.
- Added UI source tests verify:
  - Studio title and mode selector are enclosed in the same sticky wrapper.
  - The wrapper is pinned to the top of the Studio scroll region.
  - Hero and mode selector are not independently sticky.
  - Jam, Record and DAW panels remain after the wrapper and continue using the existing visibility logic.
- Capacitor Android generation: success.
- Gradle `assembleDebug`: success.
- APK artifact upload: success.
- Artifact ZIP: 4,115,713 bytes, SHA-256 `664fa075608f4f530fbe22e83014c5a313a2e17e0c0b39c4c0126b5656cde237`.
- Extracted `app-debug.apk`: 4,493,048 bytes, SHA-256 `2990dedf439c8c6f3eb4c6fe334156824058b88dc1bc0150a5839add72a1ec9d`.
- ZIP archive and APK internal archive both passed integrity checks.

### Source boundary

The app/test changes for Build #328 are limited to:
- `www/index.html` — wrapper around the existing Studio hero and mode selector
- `www/studio-daw.css` — pinned wrapper layout, normal-flow hero and mode tab children
- `tests/studio-daw-ui.test.js` — pinned Studio header structural regressions
- This research note

No code in Jam/Record panel logic, Studio DAW playback, waveform, mixer, dock, global navigation, NAM, IR User/Third Party, IR Collection, MIDI, Presets, Editor/Signal Chain or Device was changed.

### Physical-device validation still required

Install Build #328 and confirm on the actual phone:
- The full `STUDIO / Jamm & Record` title and Jam / Record / DAW selector remain visible together when scrolling far down Track Settings.
- Neither the title nor the mode selector overlaps the first content card or Project Settings.
- Timeline, Mixer and Track Settings content remain vertically scrollable underneath the pinned header.
- Switching Jam / Record / DAW still switches the appropriate panel, and the dock remains visible only in DAW mode.
- Transport, bottom navigation, dock alignment, waveform and fader position remain correct.

CI verifies 107 automated tests and APK packaging; it does not emulate the exact physical Android scroll gesture. Do not change other tabs or merge to `main` without explicit user direction.


## Studio Timeline cleanup — Build #332 passed (2 November 2026)

- User reviewed Build #331 and reported three remaining visual defects: a small white marker artifact beside the playhead at the ruler, straight horizontal separator lines in the left track-name rail gaps, and a decorative three-dot marker on each track.
- Removed the pseudo-element marker from both `#dawGlobalPlayhead` and its hit target while preserving the vertical playhead line and drag interaction.
- Removed the `•••` span directly from the `renderTrackRows()` track-title template (not only hidden with CSS).
- Converted the left track rail into individual rounded cards: transparent rail-column background, no continuous right border in the rail column, consistent 6px row gaps on left rail and right timeline lanes, and full rounded track-head borders with the existing colored left accent.
- Authoritative Build #332: run ID `41480640764`, source commit `4ec0d9b90937ae1c9600ee6946c508626bfa985e`, conclusion **success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41480640764
- `npm test`: **118/118 passed, 0 failed, 0 skipped**. Capacitor Android generation/plugin registration passed. Gradle `assembleDebug` passed. APK artifact upload passed.
- Artifact ID `13159232373`; ZIP `MG30-Studio-Track-Rail-Cleanup-Build332.zip`, size **4,116,021 bytes**, SHA-256 `24fa528fb486f61906cc28d78941aa2f6c6d252b853c94f938e34bd076007e73`.
- Extracted `app-debug.apk`, size **4,493,560 bytes**, SHA-256 `06b6d2debcc321a0294f912ab4a9d48be15199637c92da8ae0a971f109ebaca4`. ZIP and APK archive integrity checks passed.
- Source comparison from Build #331: only `www/studio-daw.js` and `www/studio-daw.css` changed, along with focused UI tests and this checklist/research note. NAM, IR, MIDI mapping, Presets, Editor, Device, app-wide navigation and Studio playback/USB recorder code remain unchanged.
- Device verification still required: confirm the white artifact is gone, left rail gaps no longer show a continuous horizontal line, all track ellipses are absent, and playhead drag/transport still work on the Android phone. CI verifies source tests and APK packaging; it does not emulate the phone's rendering.
