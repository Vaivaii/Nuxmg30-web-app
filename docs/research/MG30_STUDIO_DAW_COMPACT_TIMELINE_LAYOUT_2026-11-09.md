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

### Community .25 first CI attempt — test-only correction
- First push workflow: [Run 42652251912](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42652251912).
- Result: 362 passed, 1 failed. The failing test was an older second assertion in `tests/studio-daw-arrangement.test.js` that still expected Undo/Redo/Start/End inside More, although the implementation and the other UI test had already been updated.
- Updated that stale assertion to require all six Undo/Redo/Start/End/Nudge controls in the inline toolbar beside the clock and absent from More; Snap/Zoom and Clip actions remain in their original menus.
- No application runtime source, toolbar layout or action handlers changed in this correction. Release signing/build was skipped by the regression gate as intended.

### Community .25 final validation — 9 November 2026
- Corrected commit: `ae337ec11137f0a2dd02895522bc6251e2e6b26c`.
- GitHub Actions run [42652467996](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42652467996) completed successfully.
- Regression suite: 363 tests passed, 0 failed.
- Android project generation and release signing configuration succeeded.
- Signed APK build succeeded. APK verification step succeeded (package identity, signature and checksum).
- Package: `com.vaivaii.mg30studio`; version `1.0.0-community.25`; versionCode `25`.
- APK: `MG30-Studio-Community.apk`, size 3,572,990 bytes.
- SHA-256: `4bd7fa0bc44459eb055640e37cca216f9382c33979e36b34d13fbb89bbaa2c96`. Independently rechecked against the packaged `.sha256` file after extracting the workflow artifact; checksum matches.
- APK signature: verified with APK Signature Scheme v2; one signer, RSA 4096-bit. Package metadata and signature report were included in the audit artifact.
- Workflow artifact: `MG30-Studio-Community-Signed-Candidate` (artifact ID `13689777725`).
- Scope remains limited to Studio DAW Timeline toolbar and More menu. No NAM, IR import/collection, MIDI mapping, NUX protocol, transport dock or bottom toolbar padding changes.
- Remaining manual validation: install on the target Android phone and visually/touch-test the toolbar at the device's exact width, including opening More while the transport dock is visible. CI cannot replace this physical-device confirmation.

## Community .26 — Studio Timeline toolbar touch targets and Section dropdown anchor (9 November 2026)

### User screenshot findings
- Community .25 placed Undo/Redo, cursor Start/End and Nudge left/right beside the clock correctly, but the controls were too small and too tightly spaced for convenient touch use.
- Section dropdown opened from its left edge and extended beyond the right side of the phone screen, clipping Loop section and In/Out/Clear controls.

### Implementation
- Increased the six inline history/navigation/nudge controls from 22x28px to 32x34px, increased spacing from 2px to 5px, and slightly enlarged glyphs.
- On very narrow devices (<=380px), controls use 28x32px and 3px spacing so the six controls remain compact without returning to the prior tiny target.
- Re-anchored the Section menu to the right edge of its trigger (left:auto/right:0), with a viewport-bounded width and border-box sizing, so the panel opens leftward into available screen space.
- Static stylesheet and runtime-injected Android styles are kept in sync. Stylesheet cache token advanced to `compact-daw-3`.
- No changes to toolbar's 7px padding, two-row layout, timeline height, track/lane dimensions, transport dock, bottom padding, audio engine, project persistence, NAM, IR, MIDI mapping or device protocol.

### Regression protection
- Added UI regression checks for 32x34px standard touch targets, 28x32px narrow-screen targets, 5px/3px spacing, right-anchored viewport-bounded Section panel and unchanged 7px toolbar padding.
- Existing menu action IDs and all click handlers remain untouched.

### Validation
- Source commit: pending.
- Regression tests: pending.
- Signed Android Release / APK package, signature and checksum verification: pending.
- Physical Android confirmation remains required: ensure toolbar buttons are comfortably tappable and all Section menu controls are visible and usable on the device.

### Community .26 first CI attempt — cache-token assertion correction
- First run: [42654283987](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42654283987).
- Regression gate stopped with 1 failure: an existing Community .25 toolbar test still expected stylesheet cache token `compact-daw-2` after the implementation correctly advanced it to `compact-daw-3`.
- Corrected the test expectation only. No application source/layout/toolbar changes were made by this follow-up.
- The failed gate correctly skipped APK signing/build. A new full CI run will validate the updated assertion and source.

### Community .26 final validation
- GitHub Actions run [42654429292](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42654429292) — success.
- Regression tests, Android generation, release signing, Gradle Release, APK package/signature/checksum verification and artifact upload all passed.
- Version: `1.0.0-community.26`; versionCode: `26`; package `com.vaivaii.mg30studio`.
- Audit artifact ID: `13691107785`.
- Owner's device screenshot after installing this build showed the six 32px inline controls still occupied too much horizontal space; the right Nudge control collided with the Section trigger. This is a physical UI finding and overrides the earlier expectation that 32x34 targets fit.

## Community .27 — compact inline controls to prevent collision with Section/Clip (9 November 2026)

### User screenshot finding
- The 32x34px buttons from Community .26 still caused the six-button group to extend into the Section control on the owner's phone.
- The issue is horizontal fit in the playback clock row, not control logic.

### Implementation
- Reduced standard inline buttons to 26x34px with 3px spacing (from 32x34px / 5px).
- For very narrow screens (<=380px), use 24x32px and 2px spacing, with slightly narrower clock/menu spacing.
- Reduced Section/Clip trigger horizontal padding from 8px to 6px (and to 4px on <=380px devices).
- Kept all six controls on the clock row and retained existing IDs, disabled states and event handlers.
- Preserved 7px outer toolbar padding, 34px regular tap height, fixed transport dock, bottom padding, timeline/track dimensions and Section panel right anchoring.
- Updated CSS cache token to `compact-daw-4` and release workflow to Community .27/versionCode 27.

### Regression protection
- Updated tests to assert the new standard and narrow-screen dimensions, 3px/2px spacing, compact Section/Clip triggers, exactly six unique toolbar IDs, and unchanged outer toolbar padding.

### Validation
- Source commit: pending.
- Full regression suite: pending.
- Signed Android Release and APK package/signature/checksum verification: pending.
- Physical-device acceptance remains pending: install Community .27 and confirm all six controls are completely visible and individually tappable without overlap with Section/Clip.

### Community .27 first CI attempt — stale stylesheet cache assertion
- Run [42658502043](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42658502043) stopped at regression tests with one stale assertion: test still expected `compact-daw-3` although HTML correctly uses `compact-daw-4`.
- Updated the assertion to the current cache token. No runtime source, sizing, toolbar, or menu CSS changed in this test-only correction.
- Android signing/build was skipped by the test gate; a new run checks the corrected suite and full release.

## Community .28 — adaptive Studio layout for Android gesture and 3-button navigation (10 November 2026)

### User request / screenshot comparison
- The two Studio Timeline screenshots use different Android system navigation modes: gesture navigation and the native three-button navigation bar.
- The available WebView height is different between modes. The Studio layout must use the actual safe WebView viewport instead of assuming the full display height.
- Keep one responsive design, all four tracks, the transport dock above the app navigation, and safe vertical scrolling when a compact viewport cannot fit the minimum track height.

### Existing Android inset behavior retained
- `scripts/init-android.mjs` already generates a MainActivity that applies `WindowInsetsCompat.Type.systemBars() | displayCutout()` to the native content view and consumes them before WebView layout.
- No Android WindowInsets implementation, manifest, audio/MIDI plugin, or device protocol code was changed.
- Studio now reads `document.documentElement.clientHeight` as the inset-adjusted WebView viewport, matching the existing Editor viewport-fit convention.

### Implementation
- Added `www/studio-viewport-fit.js` as a pure geometry helper. It uses viewport height, measured application-nav top, measured dock height, Studio scroll position and the Timeline panel's unscrolled top.
- Reworked `syncStudioPinnedControls()` to measure the actual nav and transport dock. The Timeline panel height is set from the space between its true top and the dock's true top, with a 320px minimum and 720px maximum.
- The calculation restores the panel's unscrolled layout coordinate, so scrolling Studio does not cause the panel height to jump.
- The workspace reserves the exact area behind the fixed dock + application navigation. If a short viewport cannot fit the 320px four-track minimum, the Studio page can scroll the complete Timeline above the dock rather than clipping the tracks.
- Recalculate on window resize, orientation change, page show, visual viewport resize, visibility change, Studio navigation, and DAW subpage changes.
- Replaced fixed `100dvh` constants in final Studio sizing rules with measured `--studio-viewport-height`; cache token advanced to `compact-daw-5`.
- Release metadata updated to Community .28 / versionCode 28.

### Protected behavior
- Track lane/ruler structure and four-track model remain unchanged.
- Transport/audio/recording functions, project persistence, mixer, Track Settings, USB routing, NAM, IR User/Collection, preset workflows, MIDI mapping and NUX device protocols are untouched.
- Gesture and three-button modes use the same Studio DOM and controls.

### Regression coverage
- Added pure geometry tests for gesture viewport, three-button viewport, compact-height overflow and scroll-position invariance.
- Added UI checks that Studio uses the inset-adjusted WebView viewport, measured dock/nav geometry, visualViewport resize and responsive CSS variables.

### Validation
- Source commit: pending.
- Full Node regression suite: pending.
- Android Release build, package identity, signature and checksum: pending.
- Physical-device acceptance: install Community .28 and compare both gesture and three-button navigation. Confirm dock stays above app navigation and all four track lanes remain accessible in both modes.

### Community .28 first CI attempt — legacy assertion alignment
- Run [42678706851](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42678706851) stopped in the existing DAW UI test file. The new gesture/three-button geometry helper tests passed.
- Remaining failures were stale assertions: two legacy tests searched for the previous inline dock arithmetic, and two toolbar tests still expected cache token `compact-daw-4`.
- Kept the prior explicit measured `navRect.top` expression in the fixed-nav branch (same behavior) and updated the cache assertions to `compact-daw-5`.
- No responsive calculations, CSS sizing, Android Insets handling or device/DAW behavior changed in this correction. The signed build was skipped by the regression gate.
