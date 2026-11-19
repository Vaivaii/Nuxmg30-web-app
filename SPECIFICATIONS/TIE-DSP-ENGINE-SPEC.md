# TIE-01 --- DSP Engine Technical Specification

**Project:** MG30 Studio · **Module:** Tone Intelligence Engine\
**Version:** 1.0 · **Status:** Technical design baseline\
**Depends on:** `MASTER-ROADMAP.md`

## 1. Purpose and boundaries

Define a local-first DSP layer that measures audio supplied by a
verified source and exposes reproducible analysis results to the
Analyzer, Compare, Signal Chain and AI Consultant workspaces.

The DSP layer does not control the NUX MG-30 directly. Device control
remains in the existing Editor/MIDI implementation. DSP must not assume
that USB MIDI provides an audio stream.

## 2. Design principles

-   Analyze actual PCM samples only; never substitute demo values in a
    real result view.
-   Keep capture, processing, presentation and AI interpretation
    separate.
-   Preserve source metadata and analysis settings with every result.
-   Prefer local processing. Sending audio to an AI provider is opt-in
    and only when technically supported.
-   Use typed, versioned interfaces. Do not couple DSP calculations to
    UI components.
-   Every metric must document its definition, units, windowing and
    limitations.

## 3. Proposed module boundaries

Suggested logical modules; adapt names to the repository after Phase 0
audit.

``` text
audio/
  AudioSourceRegistry
  AudioSourceAdapter
  AudioSession
  AudioBufferStore
dsp/
  DspEngine
  WindowFunctions
  FftAnalyzer
  SpectrumAnalyzer
  SpectrogramAnalyzer
  LevelMeter
  HarmonicAnalyzer
  NoiseEstimator
  MetricDefinitions
analysis/
  AnalysisJob
  AnalysisResult
  AnalysisSettings
  AnalysisRepository
workers/
  dsp.worker
```

`AudioSourceAdapter` is the only layer that knows how a particular
source is acquired. `DspEngine` receives normalized PCM and metadata,
not device-specific objects.

## 4. Canonical audio data contract

Use Float32 PCM internally, normalized to the range \[-1, +1\] where
possible. Preserve original encoding and scale metadata if the source is
integer PCM or otherwise not normalized.

``` ts
type AudioSourceKind =
  | "imported-file"
  | "quick-record"
  | "daw-track"
  | "live-input"
  | "usb-loopback"
  | "unknown";

interface AudioMetadata {
  sourceId: string;
  sourceKind: AudioSourceKind;
  sampleRateHz: number;
  channelCount: number;
  frameCount: number;
  durationSeconds: number;
  sampleFormat: string;
  capturedAt?: string;
  label?: string;
}

interface PcmAudio {
  metadata: AudioMetadata;
  channels: Float32Array[];
}

interface AnalysisSettings {
  fftSize: 1024 | 2048 | 4096 | 8192 | 16384;
  hopSize: number;
  window: "hann" | "hamming" | "blackman" | "rectangular";
  spectrumScale: "linear" | "dbfs";
  smoothing: "none" | "1-3-octave" | "1-6-octave" | "1-12-octave";
  channelMode: "left" | "right" | "mono-average" | "separate";
}
```

Validate finite sample values, sample rate, channel count and buffer
length before processing. Reject malformed input with a typed error; do
not silently repair it.

## 5. Analysis pipeline

1.  Resolve selected source and verify availability.
2.  Acquire or load audio without mutating the original.
3.  Validate metadata and PCM.
4.  Select channel strategy.
5.  Apply window function to each analysis frame.
6.  Compute FFT and magnitude/power spectrum.
7.  Convert to the selected scale with documented normalization.
8.  Compute time-domain and spectral metrics.
9.  Aggregate frames into a result object.
10. Persist result and settings; publish to UI.

For streaming analysis, use bounded ring buffers and a throttled UI
update cadence. Do not run a full-history FFT on every audio callback.

## 6. FFT and spectrum requirements

-   Use a vetted FFT implementation or a tested in-house implementation.
-   FFT size determines bin spacing:
    `binWidthHz = sampleRateHz / fftSize`.
-   Apply a documented window and account for its coherent gain when
    reporting amplitude.
-   Distinguish magnitude spectrum from power spectrum.
-   Define whether displayed values are peak amplitude, RMS amplitude,
    dBFS or relative normalized values.
-   Do not label a relative spectrum as calibrated SPL or frequency
    response.
-   Frequency response requires a known excitation/reference and a valid
    measurement method; a guitar recording spectrum is not a
    frequency-response measurement.

Spectrum display should include sample rate, FFT size, window,
averaging/smoothing and channel selection in details.

## 7. Spectrogram requirements

-   Use STFT frames with explicit FFT size, hop size and window.
-   Display time and frequency axes with correct units.
-   Use a stable dB mapping and configurable dynamic range.
-   Avoid excessive redraws; render from cached analysis frames.
-   Provide an empty/unsupported state if the source is too short.

## 8. Metric definitions

  -----------------------------------------------------------------------
  Metric                  Definition / reporting  Important limitation
                          rule                    
  ----------------------- ----------------------- -----------------------
  Sample peak             Maximum absolute sample Does not detect
                          value; report linear    inter-sample peaks
                          and dBFS                

  True peak               Oversampled estimate    Only show when
                          using a documented      oversampling method is
                          reconstruction filter   implemented and tested

  RMS                     Square root of mean     Depends on interval and
                          squared sample values   channel policy
                          over a stated interval  

  Crest factor            Peak-to-RMS ratio,      State whether peak is
                          reported in dB          sample or true peak

  Spectral centroid       Magnitude-weighted mean Descriptive brightness
                          frequency               indicator, not tone
                                                  quality

  Spectral rolloff        Frequency below which a Percentage threshold
                          chosen percentage of    must be shown
                          spectral energy lies    

  Noise floor             Estimate from           Cannot infer noise
                          designated quiet        floor reliably from
                          regions or a stated     arbitrary playing audio
                          statistical method      

  Dynamic range           Must use an explicitly  Do not use as a vague
                          named method and        synonym for crest
                          interval                factor

  Harmonics               Peaks related to a      Polyphonic or distorted
                          detected fundamental,   signals can make
                          with                    fundamental detection
                          confidence/threshold    ambiguous

  THD                     Harmonic energy         Do not report for
                          relative to fundamental arbitrary guitar
                          under valid test        material as
                          conditions              authoritative THD
  -----------------------------------------------------------------------

Each metric result should include value, unit, methodId, time range,
channel, confidence/validity and explanatory note where applicable.

## 9. Clipping, noise and harshness indicators

-   Sample clipping: detect consecutive samples at/near digital full
    scale using configurable threshold and count.
-   Potential inter-sample clipping: only report if true-peak estimation
    exists.
-   Noise: report a measured estimate only when a quiet segment or valid
    estimator is available.
-   High-frequency energy: report band energy and context, not a
    definitive "fizz" diagnosis.
-   "Digital fizz" is a perceptual diagnosis. Present it as a hypothesis
    requiring listening and controlled comparison.

## 10. Worker and performance model

Prefer AudioWorklet for real-time capture/low-latency processing only
after compatibility testing. Use a Web Worker for offline analysis jobs.
Transfer ArrayBuffers where possible to avoid copies; preserve original
data if the UI still needs it.

-   Never block the main thread with large FFT batches.
-   Cancel stale jobs when source/settings change.
-   Bound memory by duration and sample rate; support chunked analysis.
-   Stop streams and disconnect nodes on teardown.
-   Handle backgrounding, route changes and device disconnects.
-   Instrument processing time, dropped frames and memory estimates in
    development builds.

## 11. Persistence

Store metadata and analysis summaries separately from large PCM blobs.
IndexedDB may be used after checking existing persistence conventions.
Version stored records and provide migration handling. Never overwrite
source recordings when producing normalized or aligned analysis copies.

## 12. Error model

Suggested error codes: `SOURCE_UNAVAILABLE`, `PERMISSION_DENIED`,
`UNSUPPORTED_FORMAT`, `INVALID_PCM`, `BUFFER_TOO_SHORT`,
`PROCESSING_FAILED`, `CANCELLED`, `STORAGE_FAILED`,
`DEVICE_DISCONNECTED`.

Every error must have a user-readable message and a diagnostic detail
for logs. Avoid exposing raw stack traces in the UI.

## 13. Acceptance criteria

-   Known test signals (sine, multi-tone, impulse, silence and clipped
    samples) produce expected results within documented tolerances.
-   FFT bin placement and amplitude normalization are verified.
-   Metrics state their methods and units.
-   Unsupported metrics are omitted or marked unavailable, never
    fabricated.
-   Long files are processed without UI freeze.
-   Worker cancellation and resource cleanup are tested.
-   Android lifecycle and source-disconnect behavior are tested.
-   Existing DAW, playback, recording and USB MIDI regression tests
    pass.

## 14. Required test fixtures

Maintain deterministic generated fixtures at several sample rates and
channel counts. Include silence, 1 kHz sine at known amplitude, two-tone
signal, harmonic-rich signal, pink/noise-like signal, impulse, clipping
and short/invalid files. Record expected outputs and tolerance per
fixture.

## 15. Implementation gate

Before coding, inspect existing audio capture, recorder, DAW buffers,
dependencies and build target. Reuse existing PCM paths where safe. Do
not add a second audio engine or new dependency until the audit
demonstrates the need.
