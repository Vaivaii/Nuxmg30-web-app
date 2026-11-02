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

## Product decision: default DAW project template

The user selected a practical default when creating a new DAW project: create all four lanes immediately, with Track 1 named **Backing** and prepared for imported backing audio, Track 2 named **Guitar** and prepared for the verified MG-30 USB recording input, and Track 3 **Bass** plus Track 4 **Vocals** visible but empty. This is a starter template, not a promise of dedicated Bass/Vocals inputs or simultaneous four-track capture. Jam remains play-along, Record remains quick standalone USB take capture, and DAW is project-based multitrack editing/overdub/mixing. Quick Record WAV files should be importable into a DAW track. YouTube remains a reference/play-along source and must not be automatically captured/imported.

## DAW export requirements: stems and full mix

The user explicitly requires two separate export workflows. **Export Stems** opens a checklist of Backing, Guitar, Bass, and Vocals; any subset can be checked, and each selected track is rendered to its own separate audio file. Unchecked tracks are omitted. Selecting one track exports only that stem; selecting all four exports four distinct stem files. **Export Full Mix** renders the complete project as one combined stereo master file using the DAW mix settings, like a conventional DAW. These must be distinct choices in the Project/Export UI. Preserve project-relative timing in stems so they line up when imported into another DAW; do not independently trim leading silence by default. Track-based filenames are expected. Exact file format, bit depth, sample rate, and whether multiple selected stem files are delivered individually or as a ZIP remain implementation decisions to validate on Android. This is a design/product requirement only; no production code or existing quick-record export was changed.

## Confirmed stem package format: ZIP

Stem export must produce one ZIP archive containing one separate WAV file for each checked track. Use stable, clear names such as 01-Backing.wav, 02-Guitar.wav, 03-Bass.wav, and 04-Vocals.wav; omit unchecked tracks. Keep every stem aligned to the project timeline (including leading silence from project start by default) so the stems line up when imported into another DAW. Full Mix remains a separate export action that creates one combined stereo master WAV file. A small project metadata/manifest file may be included if useful for tempo, sample rate, bit depth and alignment, subject to implementation design. This ZIP choice is confirmed by the user; it does not alter the existing standalone Quick Record export.


## Implementation and CI verification checkpoint (2 November 2026)

The first implementation pass is now in the isolated feature branch. It includes the three Studio modes, four-track project state, IndexedDB media/project persistence, file import, transport/timeline, mixer, Quick Record take import, one-at-a-time overdub via the existing MG-30 USB recorder, 24-bit WAV Full Mix export, selected-track stem rendering, ZIP packaging and the Android Storage Access Framework export bridge. The DAW recording clock was corrected to advance even when no backing clip is loaded. Automated CI validation is being triggered; until the Node suite, Vite, Capacitor and Gradle all pass, this is not an installable/approved APK. Physical USB capture and Android document-picker validation remain a separate device-test gate.


## Studio Mini DAW — Build #263 passed CI and APK package checks (2 November 2026)

- Corrected the minimum timeline duration test after the first simulation: at 120 BPM and 4/4, four minimum bars equal 9.6 seconds. Build #262 was intentionally rejected (36/37 tests); no APK from that run was distributed.
- Corrected DAW overdub clock handling so the timeline advances during USB recording even when the project has no backing clip. The capture still uses the existing MG-30 USB recorder; no phone microphone fallback was added.
- Authoritative CI Build #263: run ID `41402590599`, source commit `9b8512d6a8f2d293a69ad154a2c9a3fc62d47673`, conclusion **success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41402590599
- `npm test`: **37/37 passed, 0 failed**. Capacitor Android generation/plugin registration passed. Gradle `assembleDebug` passed. Artifact upload passed.
- Artifact ID `13122011912`; artifact ZIP `MG30-Studio-Build263.zip`, size **4,091,716 bytes**, SHA-256 `6a48fb04ee092b80ad3ec9899db0e431f7499449a84055ed71cd641bdf606de4`. ZIP integrity check passed.
- Extracted APK `MG30_Studio_Build263.apk`, size **4,469,516 bytes**, SHA-256 `b8289b0d9def64d9dd11621e99b0cec585b42a76686afc6edffd4a502ab7c2a6`. APK ZIP integrity check passed.
- Packaged asset inspection passed for four track names, DAW mode entrypoint, local project persistence, Full Mix WAV path, Stems ZIP path, Android export bridge and explicit no-phone-microphone fallback messaging.
- Temporary push trigger for this feature branch was removed immediately after Build #263 queued. Restoration commit: `ef79ffc6bcf336956c1b50713b7cdaad29e77a5b`. Current workflow retains its prior manual/allowlisted policy.
- Scope comparison from the feature-branch starting checkpoint lists only Studio markup/style/logic, a small Quick Record take interface exposure in `www/main.js`, Android Studio export bridge/registration, focused DAW tests, and project notes. No NAM, IR USER/Third Party, IR Collection, MIDI mapping, Preset, Editor, signal-chain or other-tab feature module was changed.
- **Validation boundary:** CI and packaged APK checks are green, but CI cannot emulate the physical NUX MG-30 USB interface or Android Storage Access Framework picker end-to-end. Do not claim those hardware/OS interactions are physically certified until tested on the user's Android phone with the original MG-30 Gen 2 firmware 6.0.x. This APK is a successful engineering build, not yet a device-verified release.


## Smartphone UI refinement after Build #263 screenshots (2 November 2026)

The user reported that the built DAW UI looked less tidy than the approved portrait mockup. The top Project area had an oversized Save row, the session toolbar clipped horizontally, the project/export/quick-take cards consumed excessive vertical space, and the four timeline tracks were not visible early enough. The refinement groups New/Save beside the project name, keeps the saved-project selector compact, wraps session controls into two mobile rows, reduces track/clip/transport/mixer spacing, starts Track Settings and Project & Export collapsed, and nests Quick Record take import inside Project & Export. Audio engine, recording source, mixer logic, project data model and WAV/ZIP render behavior are unchanged. Automated UI regression tests were added; a new build is required to judge the resulting screen.


## Studio Mini DAW — refined mobile UI Build #265 passed (2 November 2026)

- Fixed the first UI refinement CI test issues: track names are defined by `www/studio-daw-core.js`, not hardcoded in static HTML, and selector regression assertions now inspect the actual CSS text.
- Authoritative CI Build #265: run ID `41404284603`, source commit `4f9142d1cb78c9781c7228baa655bd3b2541c63b`, conclusion **success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41404284603
- `npm test`: **42/42 passed, 0 failed**. Capacitor Android generation and native-plugin registration passed. Gradle `assembleDebug` passed. Artifact upload passed.
- APK artifact ID `13122871521`; artifact ZIP `MG30-Studio-UI-Refinement-Build265.zip`, size **4,093,723 bytes**, SHA-256 `3e2c3e4e9ea96eb8decce55e9ccb8e4ee296691a126739a0eddb4f728959348a`. ZIP integrity passed.
- Extracted APK `MG30_Studio_Build265.apk`, size **4,470,920 bytes**, SHA-256 `a54e91892537ddb02610c899769a64177147ee601b9b1b06b8dcfe792f111fb2`. APK ZIP integrity passed; packaged HTML/CSS inspection confirms the compact project row, saved-project selector, two-row mobile toolbar, collapsed panels, and nested Quick Record import are present.
- All UI refinements remain scoped to Studio markup and `www/studio-daw.css`; the new tests read the DAW model and Studio markup. Audio engine, IndexedDB persistence, USB-MG30 recorder interface, mixer, WAV render, ZIP stem render and Android export bridge were not changed in this UI pass.
- Comparison from the feature branch checkpoint shows changes only to Studio UI/assets, Studio logic and Android file-export integration, the Quick Record take interface exposed for Studio, regression tests and documentation. NAM, IR User/Third Party, IR Collection, MIDI mapping, Presets, Editor, signal chain and Device feature source remain untouched.
- Temporary branch push trigger was removed after Build #265 queued; restoration commit `7715b10f6335b9c02705cdf98048c110d523d8e0`. Workflow remains on its prior manual/allowlisted policy.
- Device-validation note remains: install and visually check Build #265 on the Android phone. CI/package inspection does not verify the MG-30 physical USB record route, playback/dropout behavior, or Android File Picker permissions on the user's device.
