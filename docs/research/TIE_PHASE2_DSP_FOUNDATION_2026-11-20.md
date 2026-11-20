# TIE Phase 2 — DSP Foundation (initial implementation)

**Date:** 2026-11-20  
**Repository:** `Vaivaii/Nuxmg30-web-app`  
**Branch:** `feature/tone-intelligence-engine`

## Roadmap alignment

Phase 2 is the next implementation stage after the Studio UI foundation. This initial increment is capability-gated to two source types that can be read without changing device/audio routing:

1. Imported audio files, decoded by the existing Android WebView Web Audio implementation.
2. Saved Quick Record WAV takes, read through the existing `NUXStudioRecorder.listTakes()` and `pathToUrl()` interface.

Direct USB/live capture, USB Loopback and internal DAW-track buffers are deliberately not offered. They need separate runtime/device verification or a reviewed read-only data contract.

## Implemented

- Audio source adapter with validated metadata: source ID/kind, sample rate, channel count, frame count, duration, sample format and original source format.
- Decoded Web Audio PCM represented as Float32 channels; the source AudioBuffer remains the source of truth and is not modified.
- 128 MB file and decoded-PCM memory guardrails.
- Local DSP engine with validated FFT sizes (1024/2048/4096/8192/16384), Hann window and one-sided amplitude normalization.
- Metrics: RMS dBFS, sample peak dBFS, crest factor, spectral centroid, 85% spectral rolloff, relative band-energy percentages and sample clipping count.
- STFT spectrogram sampling capped at 256 rows.
- Chunked PCM transfer to a module Web Worker. At most about two seconds of source-channel data plus the FFT overlap is copied for each worker message; there is no full-recording transfer to the worker.
- Analyzer UI with source selector/import, channel selector, FFT-size selector, progress/cancel, source metadata, metrics, spectrum, spectrogram, band energy and limitations.
- No audio upload, no AI request, no device writes, no MIDI changes and no alteration to the DAW recording/playback engine.
- Typed validation/source/processing failures; original audio remains unchanged.

## Measurement limitations

- Spectrum is a one-sided Hann-window amplitude spectrum in dBFS. It is not calibrated frequency response or SPL.
- Peak is sample peak, not true peak.
- Noise floor is marked unavailable unless a valid quiet segment or estimator is used.
- THD is not calculated for arbitrary guitar performance audio.
- High-frequency energy is descriptive; it does not by itself establish digital fizz or tone quality.
- The current analyzer measures one selected channel at a time. It does not silently average stereo channels.

## Tests added

- Deterministic DSP fixtures for 1 kHz sine, RMS/peak/crest, FFT bin placement, silence, clipping, chunk continuity, supported FFT sizes, invalid PCM/settings and too-short input.
- Source-adapter tests for saved Quick Record, imported audio decode, unsupported/empty/oversized sources, decoded-PCM memory guard and source errors.
- UI contract tests ensuring only supported source paths are exposed and no AI/MIDI/device route is called.

Build/test status is intentionally left pending in this implementation note until the latest CI run completes. Android device validation is also pending; CI success is not hardware validation.
