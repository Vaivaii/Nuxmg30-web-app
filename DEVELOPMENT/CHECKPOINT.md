# TIE Development Checkpoint

## Project

MG30 Studio — Tone Intelligence Engine (TIE)

## Current Branch and Repository

- Repository: `Vaivaii/Nuxmg30-web-app`
- Branch: `feature/tone-intelligence-engine`
- Audit HEAD before documentation update: `b1c143f4ec8c9fb6e75085331ccfafa0547b616b`
- Audit report commit: `3d10551c2392cfe6d5c7f0c867f9eec79f06ac5d`
- Working tree: **NOT VERIFIED** — audit used GitHub remote source view; no local checkout/index access was available. Do not interpret this as a clean local working tree.

## Current Phase

**Phase 2 — DSP Foundation: implementation and CI build validated. Run #1133 passed 708/708 tests and produced the debug APK; Android source-import testing remains pending.**

The audit report is `docs/research/TIE_PHASE0_REPOSITORY_AUDIT_2026-11-20.md`. It records evidence, reusable modules, gaps, risks, likely files and recommended order. Read it before starting Phase 1.

## Documentation Reviewed

- `MG30-Studio-Master-Roadmap-TIE-v1.0.md` — read in full (775 lines). The exact requested `MASTER-ROADMAP.md` path does not exist; this file is the roadmap present in the repository.
- `SPECIFICATIONS/TIE-DSP-ENGINE-SPEC.md` — read in full.
- `SPECIFICATIONS/TIE-AUDIO-ENGINE-SPEC.md` — read in full.
- `SPECIFICATIONS/TIE-COMPARISON-SPEC.md` — read in full.
- `SPECIFICATIONS/TIE-AI-INTEGRATION-SPEC.md` — read in full.
- `SPECIFICATIONS/TIE-KNOWLEDGE-BASE-SPEC.md` — read in full.
- `SPECIFICATIONS/TIE-TESTING-SPEC.md` — read in full.
- `DEVELOPMENT/CHECKPOINT.md` — read in full before this update.

## Completed

- [x] Verify repository and remote branch.
- [x] Verify remote HEAD and compare against the original TIE branch base.
- [x] Read the full roadmap and all six TIE specification documents.
- [x] Audit framework, language, build system, app structure and five-tab navigation.
- [x] Audit Studio DAW, IndexedDB, Web Audio playback, Quick Record integration and audio routes.
- [x] Verify native USB PCM input capture uses Android AudioRecord.
- [x] Distinguish PCM USB audio capture from the separate USB-MIDI control path.
- [x] Audit existing local FFT/metrics module and DSP gaps.
- [x] Audit AI orchestration, provider manager/Worker fallback, Cloud API and ChatGPT native bridge.
- [x] Audit preset codec, runtime model/parameter catalogue, MIDI mapping, NAM and IR boundaries.
- [x] Produce Phase 0 architecture map, gap analysis, risks, candidate file map and recommended sequence.

## Important Verified Findings

1. Native USB PCM capture exists in `native-android/MG30AudioPlugin.java` via Android `AudioRecord`; it is separate from `native-android/MG30MidiPlugin.java` and USB-MIDI.
2. Studio DAW media/project storage uses IndexedDB database `mg30-studio-daw`; Web Audio decodes media to AudioBuffer. Quick Record WAV takes can be imported into the DAW via `window.NUXStudioRecorder.pathToUrl`.
3. `www/ai-audio-analysis.js` already implements local FFT and RMS/peak/crest/centroid/rolloff/band-energy metrics. It is partial DSP, not a complete TIE engine.
4. Existing AI infrastructure is in `www/ai-tone-studio.js`, `www/cloud-api.js`, `cloud-worker/worker.js` and ChatGPT native SIWC bridge. TIE must reuse it; do not create a second provider/orchestration engine.
5. Device model/parameter whitelist and MIDI CC mapping are in `www/index.html`; `model-assets.js` is reference artwork/labels, not the authoritative writable catalogue.
6. Five main navigation pages remain Editor, NAM & IR, Presets, Studio and Device. TIE navigation belongs inside Studio.
7. Exact path `MASTER-ROADMAP.md` is missing; actual roadmap is `MG30-Studio-Master-Roadmap-TIE-v1.0.md`.
8. No service-worker registration, PWA manifest, dedicated TIE DSP Worker/AudioWorklet, full spectrogram/compare engine, versioned analysis repository or TIE knowledge retrieval module was found in the audited tree.

## Files Updated in This Audit

- `docs/research/TIE_PHASE0_REPOSITORY_AUDIT_2026-11-20.md` — new full audit report.
- `DEVELOPMENT/CHECKPOINT.md` — updated status, findings, limitations and next action.

No application source, UI, configuration, audio engine, DSP, AI provider, Worker, API key, MIDI, firmware communication, preset, NAM, IR or dependency files were modified. No build or test was run.

## Phase 1 — Studio Workspace Shell

- [x] Add internal Jamm & Record / Tone Analysis workspace selector inside Studio.
- [x] Keep Jam, Record and DAW content in its original DOM location; workspace switching changes visibility only and does not invoke the existing mode-switch handler.
- [x] Add five TIE sub-pages: Analyzer, Compare, Signal Chain, Intelligence and AI Consultant. Each is an explicit empty state, not a simulated analysis result.
- [x] Persist the chosen Studio workspace and TIE sub-page locally.
- [x] Preserve the five main application navigation tabs.
- [x] Add the TIE branch to the existing Android build workflow push filter.
- [x] Add static UI regression coverage for both workspaces and all five TIE sections.
- [x] CI run #1120: 682/682 tests passed; Capacitor generation and Gradle `assembleDebug` succeeded; APK artifact uploaded (run SHA `c567dbbf02b539320d2a1afe50ac0f308ae3e9e8`).
- [x] Final TIE UI regression test passed in CI run #1121 (test 523).
- [ ] Validate Android runtime and switching while audio capture/playback is active.

Files changed: `www/index.html`, `www/studio-daw.js`, `www/studio-daw.css`, `tests/studio-daw-ui.test.js`, `.github/workflows/build-apk.yml`, plus this checkpoint and `docs/research/TIE_PHASE1_STUDIO_WORKSPACE_SHELL_2026-11-20.md`.

No native PCM capture/output, DAW engine, storage schema, DSP, AI provider/orchestration, Worker, MIDI, firmware protocol, preset codec, NAM or IR transfer code, or dependency was changed. Local working tree is not accessible through the remote GitHub interface and remains NOT VERIFIED.

## Phase 2 — DSP Foundation (in progress)

Roadmap scope is implemented initially for the two source paths that can be verified without changing device routing:

- [x] Imported audio files: file picker, codec decode through Web Audio, original-format metadata retained.
- [x] Saved Quick Record takes: read-only adapter using the existing `NUXStudioRecorder.listTakes()` and `pathToUrl()` API.
- [x] Versioned Float32 PCM metadata contract and validation.
- [x] Local FFT spectrum using Hann window and one-sided amplitude normalization.
- [x] RMS, sample peak, crest factor, spectral centroid, 85% spectral rolloff, relative band energy and sample clipping count.
- [x] STFT spectrogram frames, bounded to 256 rows.
- [x] Chunked transfer to a Web Worker; source audio is not sent to an AI provider and is not mutated.
- [x] Typed errors for unsupported/invalid audio sources and short PCM.
- [x] Noise floor remains explicitly unavailable without a quiet-region estimator; true peak and THD are not reported.
- [x] Initial deterministic DSP, source-adapter and UI contract tests added.
- [x] Final CI test/build verification: run #1133 passed 708/708 tests, Capacitor generation and Gradle APK build.
- [ ] Manual Android APK test with an imported WAV and an actual saved Quick Record take.
- [ ] Memory/long-file test on target Android device.
- [ ] DAW-track source adapter is not included; internal DAW media buffers do not yet expose a reviewed read-only public contract.
- [ ] Direct USB/live input and USB Loopback are not included; their runtime/source semantics remain hardware-gated.

### Phase 2 files added/changed

- Added `www/tie-audio-source.js`.
- Added `www/tie-dsp-engine.js`.
- Added `www/tie-dsp.worker.js`.
- Added `www/tie-analyzer-ui.js`.
- Updated `www/index.html` and `www/studio-daw.css` for the Analyzer UI.
- Added `tests/tie-dsp-engine.test.js`, `tests/tie-audio-source.test.js`, and `tests/tie-analyzer-ui.test.js`.

No changes to native audio plugins, DAW engine or project schema, MIDI, firmware protocol, AI provider/Worker, NAM, IR, preset codec or package dependencies.

## Pending / Not Verified

- Local working tree and local uncommitted changes: not accessible through GitHub remote tools.
- Live Android/WebView runtime version, permissions, USB route changes, full-duplex behavior and lifecycle: not tested in this audit.
- Codec support matrix and direct Analyzer adapters for Quick Record/DAW/import: not fully verified.
- DSP numerical correctness/performance, memory and battery baseline: not measured.
- Phase 1 implements the internal Studio workspace shell and five empty-state TIE pages; no DSP or AI integration has started.

## Risks / Blockers

- DAW capture/playback lifecycle could be disrupted if the Studio workspace remounts or owns a competing audio graph.
- PCM buffers can be large; avoid copying full recordings and profile Android memory.
- USB input/output routes are separate; endpoint discovery alone does not prove full-duplex behavior.
- Existing USB-MIDI is not an audio source.
- Current FFT metrics cannot be promoted to calibrated frequency response, THD or definitive fizz/noise diagnosis without methods and fixtures.
- Editor and Studio must use one shared AI infrastructure while isolating task context and freshness.
- Provider fallback priorities differ by task; preserve existing routing.
- Local working-tree safety must be confirmed in the user's actual checkout before local operations.

## Build and Test Results

- Phase 0 audit: no build/test commands executed; existing tests were inventoried only.
- Phase 1 final CI run #1121: 683 tests passed, 0 failed; Android APK build and artifact upload passed.
- Phase 2 final CI run #1133 (`44691252885`): **708 tests passed, 0 failed**; syntax checks, Capacitor project generation, Gradle `assembleDebug`, and APK artifact upload all passed.
- Phase 2 artifact: `MG30-Studio-debug-APK`, artifact ID `14608428105`, extracted APK size 4,780,817 bytes; SHA-256 `2d2898a3546f5e03f814545b69485b28947465362c3ef797507d439f53819db5`.
- Phase 2 source commit tested: `4a3b8da6015bb1b13130657c02bf1ca2c4f6839e`; latest branch HEAD contains only subsequent checkpoint/worklog documentation changes, no application source changes.
- Artifact: `MG30-Studio-debug-APK`, run ID `44688873547`, artifact ID `14606999111`.
- Extracted APK size: 4,769,296 bytes. SHA-256: `2120c56678e47999d77bf340c05832265b3b8a23c723689ec4f8e63e0439d409`.
- Live Android device/runtime testing, including workspace switching during recording/playback, remains pending.

## Decisions and Constraints

- Target remains original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.
- Preserve editor, preset management, NAM, IR, MIDI CC mapping and device protocol.
- Preserve AI Live Tone Assistant and all provider/fallback behavior.
- Preserve Jamm, Quick Record, 4-track DAW, timeline, mixer, playback, USB Loopback, Input Gain and Device management.
- Keep five bottom navigation tabs; Studio may contain internal workspaces.
- One shared AI engine, two access points (Editor and Studio).
- Local DSP first; only analyze real PCM and never display mock metrics as measured results.
- Do not modify firmware protocol or MIDI implementation without evidence and explicit review.
- No dependency addition without demonstrated need.
- Do not begin the next TIE integration phase until the owner reviews Phase 1 and its final CI/device validation.

## Next Action

Install the Phase 2 APK and manually test (1) importing a known PCM WAV and (2) analyzing an actual saved Quick Record WAV. Record the displayed sample rate, channel count, duration, FFT settings, measured results and any decode/memory errors. Only after these pass should Phase 2 be closed and the next roadmap phase be started. Direct USB/live capture and DAW-track analysis remain separately gated.

## Last Updated

2026-11-20


## Phase 1 Final CI Verification — 2026-11-20

This section is authoritative for Phase 1 and supersedes the earlier pending CI notes above.

- CI run: #1121, run ID `44688873547`, conclusion `success`.
- Source commit tested: `169dcb5090d75c9fdea9da995146c5240cc86872`.
- JavaScript syntax validation: passed.
- Test suite: **683 passed, 0 failed**. TIE workspace shell test passed as test 523.
- Capacitor Android project generation: passed.
- Android Gradle `assembleDebug`: passed.
- APK artifact upload: passed; artifact ID `14606999111`.
- Extracted APK: 4,769,296 bytes.
- APK SHA-256: `2120c56678e47999d77bf340c05832265b3b8a23c723689ec4f8e63e0439d409`.
- Live Android device/runtime testing is still pending. Do not claim active-recording workspace switching was hardware tested.


## Phase 2 Final CI Verification — 2026-11-20

- Workflow: #1133, run ID `44691252885`, conclusion `success`.
- Tested application source commit: `4a3b8da6015bb1b13130657c02bf1ca2c4f6839e`.
- Test suite: **708 passed, 0 failed** (25 new tests beyond the 683-test Phase 1 baseline).
- JavaScript syntax validation: passed.
- Capacitor Android project generation: passed.
- Android Gradle `assembleDebug`: passed.
- APK artifact: `MG30-Studio-debug-APK`, artifact ID `14608428105`.
- Extracted APK size: 4,780,817 bytes.
- SHA-256: `2d2898a3546f5e03f814545b69485b28947465362c3ef797507d439f53819db5`.
- Latest branch HEAD after this build contains only the two Phase 2 documentation updates; no application source changed after the tested commit.
- Manual Android test of imported audio and saved Quick Record WAV is still pending. Do not mark live USB, DAW-track analysis or hardware lifecycle as tested.


## Phase 2 DSP Validation Follow-up — 2026-11-20

### Remote source changes

- Updated `www/tie-dsp-engine.js` to validate that every chunk includes the required FFT overlap and does not exceed the remaining source frames.
- Added a finalization invariant: the number of processed STFT frames must equal the expected frame count. Incomplete chunk overlap now fails with `INVALID_PCM` rather than silently returning a partial spectrum.
- Expanded `tests/tie-dsp-engine.test.js` with seven deterministic cases:
  - 440 Hz sine amplitude recovery.
  - 1 kHz full-scale sine (amplitude 1.0) RMS/peak/crest validation.
  - Dual-tone spectral component retention.
  - Seeded white-noise RMS and finite-spectrum validation.
  - 100 Hz–10 kHz frequency sweep band/spectrogram validation.
  - Clipped sine sample-peak/clipping validation.
  - Rejection of an intermediate chunk without FFT overlap.
- Commits:
  - `9eb0b81c8fa7c7de1677a183ddf220259562ceff` — DSP overlap/frame validation.
  - `bc7c7321345a30fc29b96620c3411e0893590f01` — deterministic DSP fixtures.

### Verification status after these changes

- Source edits were committed to the remote branch using GitHub's repository interface.
- Automated tests for these new changes have **NOT RUN / NOT VERIFIED** in this session. The available GitHub workflow-run lookup only exposes PR-associated runs and returned no run for the push commit; no local repository checkout or shell working tree is available in this session.
- No new APK build result is claimed. The prior Phase 2 CI result (run #1133, 708/708 tests, APK build success) predates these two commits and does not validate them.
- Local `git status`, local uncommitted changes, and the physical Android device remain inaccessible; working tree remains **NOT VERIFIED**.
- Phase 2 remains **in progress**. Do not start Phase 3 until the updated tests/build are confirmed and the owner completes imported WAV + saved Quick Record testing on Android.
- Protected surfaces remain unchanged by this TIE patch: Editor/MIDI, original Gen 2 firmware protocol, MIDI CC mapping, preset codec, NAM, IR, shared AI infrastructure, DAW/audio plugins and device routing.

### Next action

Run `npm test` and `npm run android:build` on the branch head `bc7c7321345a30fc29b96620c3411e0893590f01` (or its checkpoint-only descendant), capture the actual CI run and APK artifact, then install it and manually test one known PCM WAV plus one actual saved Quick Record WAV on the target Android device. Record measured sample rate, channel count, duration, FFT settings, metrics and errors. Only then decide whether Phase 2 acceptance is met.


## DSP Fixture Execution — 2026-11-20

- Retrieved the committed DSP engine and DSP test logic from the feature branch and ran an isolated Node.js 22 test harness in the available container.
- First run: 17/18 passed. The sweep test's initial assertion expected nonzero *rounded percentage* in the narrow 20–120 Hz sub-bass band; measured energy rounded to 0.0% even though the first STFT frame peaked at 316.4 Hz. This was a test expectation issue, not evidence of a DSP calculation defect.
- Updated the sweep test to check the 120–400 Hz low band plus actual first/last spectrogram peak locations (first <1 kHz, last >6 kHz), while retaining the high-band and centroid checks.
- Second isolated run: **18/18 passed, 0 failed** under Node.js v22. This covers the 11 existing DSP cases plus 7 added cases.
- Test correction commit: `872696fb17f163cfc759c2cd41117d671c08553f`.
- This isolated run is not the complete repository `npm test` suite, not GitHub Actions CI, and not an Android APK build. Those remain NOT RUN / NOT VERIFIED after the patch.
- No Phase 2 closure: actual Android imported-WAV and saved Quick Record tests, memory/long-file profiling, complete repository test suite, and post-change APK build remain outstanding.
- Latest verified code commits: engine fix `9eb0b81c8fa7c7de1677a183ddf220259562ceff`; DSP test fixtures `872696fb17f163cfc759c2cd41117d671c08553f`. (The earlier intermediate test commit `bc7c7321345a30fc29b96620c3411e0893590f01` was superseded by the sweep assertion correction.)


## Phase 2 Source Provenance & Validation Reporting — 2026-11-20

### Remote changes on `feature/tone-intelligence-engine`

- Fixed audio-source metadata provenance in `www/tie-audio-source.js`.
  - Added a bounded RIFF/WAVE `fmt ` metadata reader for source sample rate, source channel count, bit depth and encoding.
  - Original WAV metadata is captured before `decodeAudioData()`; parsed header values take precedence over Quick Record metadata hints.
  - Kept decoded PCM / analysis sample rate and channel count distinct from source metadata.
  - Added explicit `resamplingApplied` and `channelCountChanged` states. Non-WAV source rates remain unknown when no reliable source metadata is available; they are not guessed.
- Updated `www/tie-analyzer-ui.js` to show Source rate, Analysis rate, Source channels, Analysis channels, and whether resampling occurred or could not be established.
- Added source metadata tests in `tests/tie-audio-source.test.js` for RIFF/WAVE parsing, 44.1 kHz mono source decoded as 48 kHz stereo, Quick Record metadata fallback, and malformed headers.
- Extended `tests/tie-analyzer-ui.test.js` to require explicit source-vs-analysis metadata labels.
- Added `tests/tie-dsp-validation-report.test.js`. It emits a machine-readable report row per check with expected, actual, tolerance, error and PASS/FAIL status. Fixtures cover 440 Hz, 1 kHz at amplitudes 0.5 and 1.0, dual-tone, seeded white noise, digital silence, a 100 Hz–10 kHz sweep, and clipped sine.

### Commits

- `be81e0254588bf098761f82506ee9b485f7f4336` — preserve original vs decoded source metadata.
- `53269cfa1b40eda309e2213ace24fb4c06a93f3c` — add source metadata and decoder mismatch tests.
- `3bb45dfef5f5e5000e0c0c3b255ca5816cfbf732` — display source/analysis metadata explicitly in Analyzer.
- `1c15c34942a5872f0f2d67a7acd28d049d7c50c3` — add UI metadata regression assertions.
- `d274439ba3ae524f43acb054f80626316dd9b941` — add DSP validation report test.

### Verification status

- Remote branch head at the time of this checkpoint update: `d274439ba3ae524f43acb054f80626316dd9b941`.
- The branch has source and test changes committed through the GitHub repository interface. The local checkout, local `git status`, and local uncommitted changes remain **NOT VERIFIED** because this session has remote GitHub access but no repository checkout.
- The new automated tests and full repository `npm test` suite have **NOT RUN / NOT VERIFIED in this session**. The earlier CI run #1133 (708/708 and APK build success) predates these latest changes; it is not evidence for the new test files or metadata fix.
- No new APK build is claimed for these commits. No physical Android test has been performed in this session.
- Phase 2 remains **IN PROGRESS — NOT ACCEPTED**. In particular, imported WAV and a real saved Quick Record take still require installation and validation on the target Android device. Memory/long-file profiling and Android lifecycle behavior also remain open.
- Direct USB/live analysis, DAW-track analysis, and USB Loopback source integration remain gated and must not be shown as available. USB-MIDI remains separate from PCM audio.
- No changes were made to MIDI mapping, original Gen 2 firmware protocol, presets, NAM, IR, shared AI orchestration/provider/fallback, DAW audio transport, native capture/output plugins, or the five bottom navigation pages.

### Next action

Run the complete repository `npm test` suite and Android `assembleDebug` against the current branch head, inspect the test report and build logs, then install the resulting APK on the target Android device. Manually analyze (1) a known PCM WAV with a source sample rate/channel layout that can be checked and (2) an actual saved Quick Record WAV. Record source and analysis sample rates/channels, duration, FFT settings, measured values, error states and memory/lifecycle observations. Do not start Phase 3 until the updated automated suite/build and these target-device checks pass.


## Isolated Phase 2 Regression Validation — 2026-11-20 (latest)

### Fixture issue found and corrected

- Running the DSP test cases in a temporary Node.js 22 harness initially exposed one stale test fixture in `tests/tie-dsp-engine.test.js`.
- The old out-of-order test submitted its first 24,000-frame core without the required FFT overlap. The DSP engine correctly rejected that first chunk, so the test never reached the intended second, out-of-order chunk.
- Updated the first chunk to include 1,024 overlap frames while retaining a 24,000-frame core; the second chunk still uses the invalid start frame and is expected to fail with `INVALID_PCM`.
- Correction commit: `401008028d2e69fc7257430c8c14a92d4e12c839`.

### Tighter deterministic fixture tolerances

- The 440 Hz amplitude report now uses FFT 8192 instead of 4096. At FFT 4096 the 440 Hz component fell 0.453 bin from the nearest bin and showed approximately 1.17 dB Hann-window scalloping loss; FFT 8192 reduced the observed loss to approximately 0.049 dB.
- Tightened the 440 Hz amplitude tolerance to ±0.1 dBFS and frequency tolerance to one FFT bin (±5.859 Hz).
- Dual-tone validation now uses FFT 8192, checks combined RMS as well as both component amplitudes, and uses ±0.1 dBFS component tolerance.
- Report refinement commit: `f7a6950d642cb9f6b9311067bbb017121910c1c4`.

### Executed isolated tests

- Runtime: Node.js v22.16.0.
- Harness command: `node --test /tmp/tie-isolated/tie-dsp-engine.test.js /tmp/tie-isolated/tie-audio-source.test.js /tmp/tie-isolated/tie-dsp-validation-report.test.js`.
- Result: **32/32 test cases PASS, 0 FAIL**:
  - DSP engine: 18/18.
  - Audio-source adapter: 13/13.
  - DSP validation report: 1/1 test, producing **23/23 numerical/behavioral rows PASS**.
- The report includes expected value, actual value, tolerance, absolute error and PASS/FAIL for 440 Hz, 1 kHz at amplitudes 0.5 and 1.0, dual-tone, seeded white noise, digital silence, 100 Hz–10 kHz sweep and clipped sine.
- Source metadata tests cover an actual synthetic RIFF/WAVE header for 44.1 kHz mono and a decoded analysis buffer at 48 kHz stereo, plus Quick Record metadata fallback and malformed headers.
- `node --check` passed for the isolated DSP engine, DSP tests, source adapter, source tests and validation-report test files.
- The files were executed in a temporary isolated harness assembled from the remote branch file contents; this was **not** a checked-out repository and did **not** run the project's full `npm test` command or UI static suite.

### Current verification boundary

- Latest code/test commit before this checkpoint update: `f7a6950d642cb9f6b9311067bbb017121910c1c4`.
- Full repository `npm test`: **NOT RUN / NOT VERIFIED** in this session.
- Current branch push-workflow run and its logs: **NOT VERIFIED** by the available GitHub Actions lookup.
- Vite/Capacitor/Gradle APK build after these latest edits: **NOT RUN / NOT VERIFIED**.
- Android install and physical-device tests of imported WAV and an actual saved Quick Record WAV: **NOT RUN / NOT VERIFIED**.
- Memory/long-file profiling and Android Worker/audio lifecycle checks: **NOT PROVEN**.
- Therefore Phase 2 remains **IN PROGRESS — NOT ACCEPTED**. Phase 3 is not started.
- The earlier successful APK CI run #1133 (708/708) predates these latest changes and must not be used as proof of the current branch state.
- Local repository `git status` remains **NOT VERIFIED**: no local working tree was available in this session.

### Next action

Run the entire project suite with `npm test` and build with `npm run android:build` from the current branch head. Confirm the pushed GitHub Actions result and APK artifact. Then install on the target Android device and test one known PCM WAV plus one actual Quick Record recording, recording source/analysis metadata, numerical results, UI responsiveness, memory use and cleanup. Phase 3 remains gated on those results.


## Full Repository CI + APK Build Verified — 2026-11-20

### GitHub Actions run #1144

- Run ID: `44704232844`.
- Event: `push`.
- Branch: `feature/tone-intelligence-engine`.
- Tested source commit: `f7a6950d642cb9f6b9311067bbb017121910c1c4`.
- Conclusion: **success**.
- Test command: `npm test`.
- Result: **720 tests passed, 0 failed, 0 cancelled, 0 skipped**.
- JavaScript syntax checks passed.
- Capacitor Android project generation passed.
- Android build command: `cd android && ./gradlew --no-daemon assembleDebug`.
- Gradle result: **BUILD SUCCESSFUL**.
- APK upload passed.

### APK artifact

- Artifact name: `MG30-Studio-debug-APK`.
- Artifact ID: `14614795387`.
- Artifact ZIP size: 4,404,162 bytes.
- Artifact ZIP SHA-256: `172398784f627e5fdf7f1ba104695eaad5644efa99fdf12e5e535f9310e62aae`.
- Extracted APK: `app-debug.apk`.
- Extracted APK size: 4,781,645 bytes.
- Extracted APK SHA-256: `a6ded1f15914b921e3ee1ef1dde9b2e73213fd445d30d4ce4cccf1808a4c2841`.
- Downloaded artifact ZIP was verified to contain the APK; APK archive contains the built web bundle and TIE DSP worker asset.
- The tested source commit is an ancestor of current branch HEAD. Subsequent commits up to the documentation update contain only checkpoint/research-document updates; no app source or test code changed after the CI-tested source commit.

### What this proves

- The full repository automated test suite passes on the tested source commit (720/720).
- The source syntax checks, Capacitor generation and Android debug APK build pass.
- The generated APK artifact was uploaded, downloaded and its archive/size/hash verified.

### What this does not prove

- No APK has been installed on the owner's physical Android device in this session.
- Imported WAV and actual saved Quick Record playback/decode/analysis have not yet been manually verified on target Android/WebView.
- Android Worker runtime, memory/long-file behavior, background/foreground transition and cancellation/resource cleanup remain not proven on device.
- Direct DAW-track Analyzer source and direct USB/live Analyzer input remain out of scope/not integrated. USB-MIDI is not used as PCM audio.
- No Phase 3 implementation has started. Phase 2 remains **IN PROGRESS — automated CI/build gate passed, hardware acceptance gate pending**.
- Local checkout `git status` remains not verifiable through remote-only access.

### Next action

Install the verified run #1144 APK on the target Android device. Test one known PCM WAV with known source sample rate/channel layout and one real Quick Record WAV. Capture source metadata vs analysis PCM metadata, duration, FFT settings and numeric results. Exercise cancellation and a long-file/memory case; confirm no UI freeze and no DAW recording/playback regression. Record Android/WebView and test evidence here. Only close Phase 2 after those hardware acceptance checks pass.

## Owner Device Confirmation — 2026-11-20

- Owner reports that the run #1144 debug APK has been installed on the target Android device and **the application launches and works**.
- This confirms installation and basic application startup/runtime on the owner's device.
- Owner confirms that TIE Analyzer has been tested on-device with **both imported WAV and saved Quick Record**; FFT spectrum and audio metrics (RMS, Peak, Crest Factor) appear normally with no errors for both paths. Exact device model, Android/WebView version, displayed metadata/numeric values, cancellation, long-file memory behavior, and DAW playback/record regression have not yet been reported; those details remain **NOT VERIFIED**.
- Do not interpret the general "works" confirmation as proof that every Phase 2 hardware acceptance case passed.
- Phase 2 status: **APK install/basic runtime and normal on-device FFT + RMS/Peak/Crest Factor display without errors are confirmed by owner for both imported WAV and saved Quick Record; numerical fixture comparison, stress/lifecycle acceptance remain pending**. Phase 3 remains gated.
- Protected surfaces remain unchanged: original NUX MG-30 Gen 2 firmware 6.0.x (not MKII), MIDI mapping/protocol, NAM, IR collections/import mapping, presets and shared AI engine.

### Next validation

Ask the owner to confirm whether they have analyzed (1) a known PCM WAV through Analyzer and (2) an actual saved Quick Record WAV, and whether source/analysis sample-rate and channel metadata are displayed correctly. Then test cancellation, a longer recording, and DAW recording/playback coexistence before closing Phase 2.
## Phase 3 — Tone Comparison / A-B (implementation under verification) — 2026-11-20

### Scope delivered in the current branch

- [x] Replace the Compare empty state with an operational A/B workspace inside the existing Tone Analysis sub-navigation; the five primary application tabs and Jamm & Record workspace structure remain in place.
- [x] Independent A and B source slots support the same two Phase 2 source adapters only: imported audio files and saved Quick Record WAV takes.
- [x] Independent channel selection per source.
- [x] Explicit matched-overlap handling for unequal recording lengths.
- [x] Manual alignment offset in milliseconds; positive offset means B begins later than A; negative offset means A begins later than B.
- [x] Reject mismatched decoded analysis sample rates explicitly; no silent resampling is performed.
- [x] Optional RMS level matching is attenuation-only and targets the quieter source. Report method and gain applied to both A and B. If either source is digital silence, matching is reported unavailable.
- [x] Reuse the existing TIE DSP module worker for chunked analysis of the aligned region; original source PCM/audio files are not mutated.
- [x] A/B preview uses isolated Web Audio buffer-source/gain nodes and does not change DAW transport state; preview stops on source change, visibility loss, page hide or leaving Compare.
- [x] Results include metric comparison (RMS, sample peak, crest factor, spectral centroid, 85% rolloff), spectrum overlay, B-minus-A spectral difference, 50 ms windowed RMS envelope, provenance, alignment, settings, level-match gains, limitations and optional user listening notes.
- [x] Report separates known source metadata from decoded analysis metadata. Unknown original source sample rate/channel/bit depth values remain null rather than being inferred from decoded PCM.
- [x] Added comparison engine and UI contract tests.

### Deliberate v1 limitations

- Automatic transient and cross-correlation alignment are not implemented; manual alignment is the only active alignment method.
- Integrated loudness / LUFS matching is not implemented. RMS matching is clearly labeled and never called LUFS.
- Source kinds are limited to imported files and saved Quick Record recordings. Preset, NAM and IR assets must first be rendered through a valid equivalent audio path; they are not treated as audio recordings by themselves.
- Different decoded analysis sample rates are rejected; no silent resampling.
- No AI interpretation is produced in Phase 3; Studio AI/context integration belongs to Phase 5.
- No direct USB/live PCM or DAW-track source adapter was added.
- Long-file/memory behavior, Android audio lifecycle, A/B audition listening quality and actual DAW co-existence still require target-device verification.

### CI history / current verification

- Initial Phase 3 CI run #1158 (44706933990) failed at npm test: 735 passed, 1 failed, 736 total. The failing expectation incorrectly treated an unknown original source channel count as 1. The implementation correctly preserves unknown source metadata as null while reporting decoded PCM channel count separately.
- Test correction commit: 055ebc91490ea94a3bcb4cf821f3a2a0eb2aebaa.
- Current verification run #1159 (44707156825) is on the corrected branch HEAD 055ebc91490ea94a3bcb4cf821f3a2a0eb2aebaa.
- Current run #1159 completed successfully: dependency installation and JavaScript syntax validation passed; full npm test reports 736 passed, 0 failed, 0 cancelled, 0 skipped; Capacitor Android project generation passed; Gradle assembleDebug reports BUILD SUCCESSFUL; APK artifact upload passed.
- APK artifact ID: 14615806714. Artifact ZIP size: 4,412,201 bytes. Artifact ZIP SHA-256: 8ee733be7802727aca5763b53c488645f237a493dee91582cfbc390c3246f5af.
- Extracted APK: MG30-Studio-Phase3-run1159.apk. APK size: 4,790,241 bytes. APK SHA-256: cdf796a4e914848f18a8cfea764f59e288849ca5f9613f9a5e25ee88ebb0221d.
- Run #1159 tested application source/test HEAD 055ebc91490ea94a3bcb4cf821f3a2a0eb2aebaa. The latest branch HEAD after appending this checkpoint is a documentation-only descendant (d23612c22c27a474e530247d57862029385acf2e); no application source/test changes were made after the tested commit.
- Therefore Phase 3 is IMPLEMENTED — AUTOMATED TESTS AND ANDROID BUILD PASS; TARGET-DEVICE A/B AND REGRESSION ACCEPTANCE PENDING. Do not label Phase 3 complete until the owner has tested A/B in the app.

### Protected boundaries

- No changes in this phase to NUX MG-30 Gen 2 firmware communication, USB-MIDI protocol or CC mappings.
- No changes to NAM loading/slot operations, IR collection/import mapping, preset codec, shared AI provider/orchestration, native audio capture/output plugins or DAW recording/playback engine.
- Comparison playback uses its own Web Audio audition graph and must be regression-tested against existing DAW recording/playback on device.

### Next actions

1. Confirm run #1159 Gradle assembleDebug and APK artifact upload succeed; record final artifact ID, APK size and SHA-256.
2. Install the current branch APK and test A/B from imported WAV and/or saved Quick Record, including RMS match on/off, positive/negative offset, unequal duration, stereo/channel selection and A/B preview stop.
3. Confirm Compare navigation and audition do not disrupt DAW recording/playback; test cancellation and app background/foreground.
4. Record owner device test outcome before accepting Phase 3.



### Phase 3 Build Artifact — 2026-11-20

- GitHub Actions run #1159: 44707156825 — success.
- Tested application/test commit: 055ebc91490ea94a3bcb4cf821f3a2a0eb2aebaa.
- Full test suite: 736 passed, 0 failed, 0 cancelled, 0 skipped.
- Capacitor Android generation: passed.
- Gradle assembleDebug: BUILD SUCCESSFUL.
- Artifact ID: 14615806714.
- Artifact ZIP size: 4,412,201 bytes; SHA-256: 8ee733be7802727aca5763b53c488645f237a493dee91582cfbc390c3246f5af.
- Extracted APK size: 4,790,241 bytes; SHA-256: cdf796a4e914848f18a8cfea764f59e288849ca5f9613f9a5e25ee88ebb0221d.
- Downloaded artifact archive was extracted and the APK path/size/hash verified in the active session.
- APK file: MG30-Studio-Phase3-run1159.apk.

### Phase 3 owner validation still required

Install the Phase 3 APK and test Compare with actual imported WAV and saved Quick Record sources. Verify independent A/B source/channel selection, same and differing source lengths, manual positive/negative offsets, RMS matching and reported gains, spectrum overlay/difference, dynamic envelope, A/B audition and stop. Confirm Compare navigation does not interrupt DAW playback/recording. Record device/Android/WebView, results and failures before accepting Phase 3.

## Phase 3 Compare DOM/Build Mismatch — 2026-11-20

### Owner-reported Android failure

- On the installed Phase 3 APK, pressing Compare A/B displays: `Cannot set properties of null (setting 'textContent')`.
- The error is consistent with `renderMetrics()` writing report fields to DOM nodes that do not exist in the installed APK's HTML.
- Confirmed release mismatch: APK run #1159 was built from application/test commit `055ebc91490ea94a3bcb4cf821f3a2a0eb2aebaa`; the current branch had advanced by nine commits. Those later commits modified both `www/tie-comparison-ui.js` and `www/index.html` to add report provenance (`tieCompareProvenance`) and listening notes (`tieCompareListeningNotes`). The already-installed run #1159 APK predates this matching HTML/JS change.
- Current branch static HTML contains the report nodes exactly once and the Compare module script is included after the page markup. There is no evidence of a runtime DOM replacement/lifecycle race in the current static page structure. The failure is a stale/incoherent APK artifact, not a reason to add null guards.

### Corrective action

- Do not hide the failure with null checks. Keep the required report nodes mandatory.
- Strengthened `tests/tie-comparison-ui.test.js` to assert that all JS-selected and report-rendered nodes exist exactly once, that the Compare module is included exactly once, and that it is loaded after the complete Compare markup. The pre-existing DOM contract checks remain mandatory.
- New test commit: `636359aa2c48be61e56938dbe63123d7bcc49cad`.
- Rebuild from the current branch head so `www/tie-comparison-ui.js` and `www/index.html` are shipped as one coherent release. Never ask the owner to continue testing the old run #1159 APK for this error.

### Test coverage / evidence boundaries

- Existing engine integration tests use generated but real Float32 PCM waveforms and run them through the production DSP accumulator, then verify measured spectrum, B-minus-A delta, dynamic envelope and RMS attenuation. These are deterministic synthetic audio fixtures, not dummy comparison results in the app.
- Existing UI contract tests require the production source adapters (`loadImportedAudioFile`, `loadQuickRecordTake`) and the production DSP worker path; they do not substitute dummy audio data.
- CI for the corrected current branch and a new Android APK is pending. No claim of successful full UI/device A/B behavior is made until the owner installs and tests the rebuilt artifact.
- Device checks still required: both real imported WAV and saved Quick Record as A/B sources; FFT and overlay; spectral difference; RMS matching/gains; comparison report; Play A, Play B, Stop; and DAW record/playback regression.

### Protected boundaries

- No changes to original NUX MG-30 Gen 2 firmware protocol, USB-MIDI mapping, NAM, IR collection/import mapping, preset handling, shared AI engine or DAW transport.

### Follow-up CI attempt — 2026-11-20

- Run #1167 (44727221902) failed before Android generation because the newly added test assertion had an invalid JavaScript regular-expression literal. This was a test-only syntax defect; no app source files were changed by that attempt.
- Corrected the test to count the exact module tag using string splitting instead of a regex.
- Correction commit: `3ec2dae8c88573e35765d55dc6fa24c56852676b`.
- Run #1168 (44727307912), source/test commit `3ec2dae8c88573e35765d55dc6fa24c56852676b`: dependency install, JS syntax validation, full protocol regression tests and Capacitor Android generation have passed. Gradle `assembleDebug` is still running; no APK artifact has been published yet.
- Do not distribute the old run #1159 APK as the fix. Rebuilt artifact from a coherent HTML/JS commit is required.

