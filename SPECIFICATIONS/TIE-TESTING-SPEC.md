# TIE-06 --- Testing, Validation & Release Specification

**Project:** MG30 Studio · **Module:** Quality gates for TIE\
**Version:** 1.0 · **Status:** Technical design baseline

## 1. Purpose

Define measurable verification gates for TIE and protect existing MG30
Studio functionality. A feature is not complete because its UI renders;
it is complete only when its behavior, data provenance, failure states
and regressions have been tested.

## 2. Test layers

-   Static checks: lint, type checks, formatting and dependency audit.
-   Unit tests: DSP math, metric definitions, adapters and validators.
-   Integration tests: audio source → PCM → DSP → result storage → UI.
-   Contract tests: AI context/response normalization and provider
    adapters.
-   Device tests: Android runtime, USB OTG, NUX MG-30 Gen 2.
-   Regression tests: Editor, MIDI, NAM/IR, presets, DAW and device
    workflows.
-   Manual listening tests: controlled A/B and live PA checks.

## 3. DSP correctness fixtures

Generate deterministic fixtures: - Silence. - 1 kHz sine at known
amplitude. - Two-tone signal with known frequencies. - Harmonic series
with known amplitudes. - Impulse. - White/pink-noise-like deterministic
fixture. - Near-full-scale and clipped samples. - Stereo in-phase and
out-of-phase signals. - Short, empty, malformed and unsupported files.

For every fixture, define expected values, tolerance, sample rate,
channels and analysis settings. Do not use screenshots as the only
evidence of numerical correctness.

## 4. Suggested numerical checks

-   FFT: expected peak bin within one bin for bin-centered test tones.
-   Bin spacing: matches sampleRate / fftSize.
-   RMS: matches analytical value within a documented tolerance.
-   Sample peak: exact for known sample fixture.
-   Crest factor: matches the defined peak/RMS calculation.
-   Spectral centroid/rolloff: within fixture-specific tolerance.
-   Silence: no NaN/Infinity; noise estimate follows documented
    unavailable/near-floor behavior.
-   Clipping: known clipped samples are detected at configured
    threshold.
-   True peak/THD: tests required before these metrics can be exposed.

Tolerances must be chosen based on implementation, window and
normalization, and recorded with the test---not guessed at release time.

## 5. Audio source and lifecycle tests

Test each source independently: - Permission granted/denied. - Start
twice. - Stop twice. - Source disconnect during capture. - App
background/foreground. - Route change/headphone unplug. - Buffer
overrun/analysis lag. - Navigation away during processing. - Cancel job
and start a new one. - Unsupported sample rate/codec. - Long recording
and low-memory behavior.

Verify tracks, nodes, workers and object URLs are released.

## 6. Compare tests

-   Same audio compared to itself yields zero/near-zero difference
    within numeric tolerance.
-   Known gain offset is correctly reported by RMS matching.
-   Peak-only normalization is never labeled loudness matching.
-   Alignment offset is correct on synthetic delayed fixtures.
-   Different lengths/channels are handled explicitly.
-   Source files remain unchanged.
-   A/B switching does not corrupt DAW transport state.

## 7. AI integration tests

-   Editor and Studio use the same shared provider orchestration.
-   Provider fallback sequence matches the audited configuration.
-   Auth/rate-limit/timeout/invalid-response errors are handled.
-   No API key/token appears in logs, payload snapshots or committed
    files.
-   Stale responses cannot overwrite newer state.
-   Studio context includes the selected analysis and correct timestamp.
-   Editor context does not receive stale Studio-only context.
-   AI cannot bypass parameter validation or user confirmation.
-   Plain-text response fallback remains safe.

Use mocked provider adapters for deterministic tests, but clearly
separate mocked tests from live-provider verification.

## 8. Existing-feature regression matrix

At minimum test: - NUX MG-30 Gen 2 connection and disconnect. - USB MIDI
communication and MIDI CC mapping. - Effect parameter read/write. -
Preset load/save/import/export if present. - NAM loading and
selection. - IR loading and selection. - AI Live Tone Assistant. -
Provider fallback. - Jamm. - Quick Record. - Four-track DAW. - Timeline
and mixer. - Playback controls. - USB Loopback. - Input Gain. -
Navigation between all five main tabs. - Android back navigation and app
lifecycle.

Only mark a test pass when it was actually run on the stated
environment.

## 9. Performance targets

Set numeric budgets after baseline profiling on representative Android
hardware. Record: - FFT processing time per frame/job. - UI frame rate
during live analysis. - Audio underruns/dropouts. - Memory growth during
a defined test duration. - Battery/CPU impact. - Worker startup and
cancellation latency.

Do not invent universal performance thresholds before measuring the
current app and target devices. Establish baseline, propose target, then
approve it.

## 10. Release gates

A release candidate must have: - Build and static checks passing. - Unit
and integration test results recorded. - Critical regression matrix
completed. - No known blocker affecting device control, recording or
playback. - Android device test notes. - Known limitations documented. -
Checkpoint and changelog updated. - Commit hash recorded.

## 11. Test report template

``` text
BUILD / COMMIT:
BRANCH:
ENVIRONMENT:
DEVICE / ANDROID / WEBVIEW:
TEST DATE:
TEST SUITE:
TEST CASE:
EXPECTED:
ACTUAL:
RESULT: PASS / FAIL / BLOCKED / NOT RUN
EVIDENCE:
KNOWN LIMITATIONS:
FOLLOW-UP:
```

## 12. Definition of done

A task is done only when: 1. Implementation matches the accepted scope.
2. Relevant tests are run and results recorded. 3. Error/empty/loading
states are handled. 4. Existing impacted workflows pass regression
checks. 5. No mock result is represented as real measurement. 6.
Documentation and checkpoint are updated. 7. The actual commit/build
state is verified.
