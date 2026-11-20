# TIE-03 --- Tone Comparison & A/B Analysis Specification

**Project:** MG30 Studio · **Module:** Compare\
**Version:** 1.0 · **Status:** Technical design baseline

## 1. Purpose

Provide repeatable comparisons between recordings and, where valid data
is available, presets, NAM captures, IRs and signal-chain variants.
Compare should describe measurable differences without declaring one
tone objectively better.

## 2. Supported comparison modes

1.  Recording A vs Recording B.
2.  Before vs after processing/EQ.
3.  Two takes of the same performance.
4.  Two presets or signal chains rendered to audio.
5.  NAM/IR comparisons using controlled audio renders.
6.  Live PA-oriented reference comparison using recordings made under
    documented conditions.

A preset file or IR file alone is not an audio recording. To compare
audible results, render both through a valid, equivalent signal path or
compare their metadata with an explicit limitation.

## 3. Comparison data model

``` ts
interface ComparisonSource {
  id: string;
  kind: "recording" | "render" | "preset" | "nam" | "ir" | "track";
  label: string;
  audioRef?: string;
  metadata: AudioMetadata;
  chainSnapshot?: unknown;
}

interface ComparisonSettings {
  alignment: "manual" | "transient" | "cross-correlation" | "none";
  levelMatch: "off" | "rms" | "integrated-loudness";
  analysisWindow: "whole" | "selection";
  channelMode: "left" | "right" | "mono-average" | "separate";
}
```

Use a typed, versioned schema in the implementation. `unknown` is
intentional here: actual preset/chain schema must come from repository
audit, not be invented in this document.

## 4. Fair comparison workflow

1.  Select A and B.
2.  Validate duration, sample rate, channel count and source provenance.
3.  Choose full take or matched selection.
4.  Align the material where appropriate.
5.  Optionally level-match using a clearly labeled method.
6.  Audition A/B with matched playback conditions.
7.  Compute metrics and visual overlays.
8.  Present differences, caveats and interpretation.

## 5. Alignment

Offer manual alignment first. Automatic transient or cross-correlation
alignment may be added after testing. Alignment must operate on analysis
copies and never alter original recordings.

Show the alignment offset and method. If alignment confidence is low,
ask the user to align manually or mark the comparison as unaligned. Do
not time-align unrelated performances and imply a controlled test.

## 6. Level matching

### RMS matching

Calculate RMS over the selected comparable interval and apply gain to an
analysis/playback copy. Display the gain applied to A and B. Avoid
boosting beyond a safe ceiling; report if limiting or clipping
prevention changes the result.

### Integrated loudness

Only offer if a standards-based loudness implementation is available and
validated for the content type. State the standard/method used. Do not
call RMS matching "LUFS matching".

Peak matching alone is not loudness matching. Never normalize source
files destructively. Preserve the original playback gain and show
whether matching is enabled.

## 7. Visual comparisons

-   Spectrum overlay with same FFT/window/channel settings.
-   Difference curve in dB with defined subtraction direction.
-   Spectrogram comparison when time alignment is meaningful.
-   RMS/peak/crest-factor comparison.
-   Band-energy table using documented frequency bands.
-   Harmonic comparison only when fundamental detection is valid.
-   Optional phase/correlation view only when channels and alignment
    support it.

Keep axes, scales and smoothing identical for A and B. If settings
differ, normalize the settings or clearly label the mismatch.

## 8. Audition controls

Provide A, B, A/B toggle and optional blind switching. Avoid playback
gaps or clicks when switching; use short crossfade only if it does not
obscure transients and is clearly documented. Do not alter the user's
DAW transport state unexpectedly.

## 9. Interpretation rules

-   A brighter spectrum is not automatically better.
-   Higher RMS is not automatically fuller or better.
-   More harmonic energy is not automatically more pleasing.
-   A comparison of different performances includes playing variation.
-   Pickup position, guitar, strings, input level, room, microphone,
    monitoring and playback level affect results.
-   "Fizz", "harshness", "mud", "punch" and "feel" are partly perceptual
    terms; measurements can support hypotheses, not prove them alone.

AI output must separate measured deltas from hypotheses and listening
recommendations.

## 10. Report format

A comparison report should include: - Source labels and provenance. -
Date/time and analysis version. - Alignment method and offset. -
Level-match method and gain applied. - Analysis settings. - Measured
differences. - Limitations/confounders. - Listening notes
(user-entered). - AI interpretation, clearly labeled as generated.

## 11. Acceptance criteria

-   A/B playback is stable and repeatable.
-   Level matching reports exact method and gain.
-   No destructive source modification occurs.
-   Spectra use identical analysis settings.
-   Alignment can be disabled and its offset is visible.
-   Comparison handles unequal lengths and channel counts safely.
-   Results do not claim objective tone quality from isolated metrics.
-   Existing DAW playback/recording remains unaffected.


## 12. Proposed Preset & Scene Level Matching — Planning Only

This section is a future extension proposal, not an implementation authorization. Detailed planning is in `TIE-INTELLIGENCE-EXPANSION-SPEC.md` §3.

- Compare a named reference preset/scene and candidate preset/scene using the same DI/reference performance and repeatable capture route. Unrelated performances are not proof of preset-level difference.
- Reuse the existing audio source adapters, DSP results, comparison plan/report and A/B audition. Do not add a second FFT, RMS or playback engine.
- Preserve metric identity and units:
  - Sample peak: dBFS, maximum decoded sample.
  - RMS: dBFS over an explicitly recorded interval/channel policy.
  - True peak: dBTP only after a separately validated oversampling estimator.
  - Integrated loudness: LUFS/LKFS only after conformance to a stated ITU-R BS.1770 revision and corresponding test vectors. Never relabel RMS or peak as loudness.
- The currently implemented Phase 2/3 DSP output does not establish compliant integrated loudness or true peak. Those descriptors remain unavailable until a separately approved estimator and test suite exist.
- Level compensation must target only a proven original MG-30 Gen 2 output Level/Volume parameter that is supported in the relevant preset/scene serialization. Never adjust amp gain, drive, EQ, dynamics, NAM or IR to make levels appear equal.
- If the Gen 2 database cannot prove a safe per-preset/per-scene output control, the feature must remain recommendation-only and must not write to the pedal.
- Preview must show measured before/after result, delta, exact parameter and quantized proposed value. Reuse this specification's existing A/B source/provenance rules.
- Require explicit user confirmation, backup/undo and device-state verification before any device write.

Standards planning references: ITU-R BS.1770-5 (11/2023), listed by ITU as the in-force main revision, specifies programme loudness and true-peak algorithms; EBU R 128 v5.0 (11/2023) references compliant loudness measurement. These standards do not set a guitar-preset target or validate a particular MG-30 capture path. See https://www.itu.int/rec/R-REC-BS.1770/en and https://tech.ebu.ch/publications/r128.

