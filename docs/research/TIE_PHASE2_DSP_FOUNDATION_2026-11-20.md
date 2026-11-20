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

## CI Verification

Final workflow run #1133 (run ID `44691252885`) completed successfully on source commit `4a3b8da6015bb1b13130657c02bf1ca2c4f6839e`:
- **708 tests passed, 0 failed** (including the 25 Phase 2 tests).
- JavaScript syntax validation passed.
- Capacitor Android generation passed.
- Gradle `assembleDebug` passed.
- APK artifact upload passed; artifact ID `14608428105`.

Extracted APK size: 4,780,817 bytes.  
SHA-256: `2d2898a3546f5e03f814545b69485b28947465362c3ef797507d439f53819db5`.

Android device validation is still pending; CI success is not hardware validation.


## Source Metadata Provenance Follow-up

The Analyzer source adapter was extended to separate encoded-source metadata from decoded analysis PCM:

- RIFF/WAVE `fmt ` metadata is read before Web Audio decode when the input is a supported RIFF/WAVE container.
- Original source sample rate, channel count, bit depth and encoding are preserved separately from the decoded AudioBuffer sample rate/channel count.
- The UI explicitly labels Source rate vs Analysis rate and Source channels vs Analysis channels. Resampling/channel-count change is stated only when source metadata supports the comparison; unknown remains unknown.
- Quick Record metadata is used as a fallback hint when a file header is unavailable.
- Automated source tests cover 44.1 kHz mono WAV decoded as 48 kHz stereo PCM, Quick Record metadata fallback and malformed headers.

## Updated CI Verification — run #1144

The later CI run supersedes the earlier #1133 result for the tested code at commit `f7a6950d642cb9f6b9311067bbb017121910c1c4`:

- Workflow run: #1144, run ID `44704232844`, event `push`, branch `feature/tone-intelligence-engine`.
- Test suite: **720 passed, 0 failed, 0 skipped**.
- JavaScript syntax checks: passed.
- Capacitor Android generation: passed.
- Gradle `assembleDebug`: passed (`BUILD SUCCESSFUL`).
- APK artifact: `MG30-Studio-debug-APK`, artifact ID `14614795387`.
- Extracted APK size: 4,781,645 bytes.
- Extracted APK SHA-256: `a6ded1f15914b921e3ee1ef1dde9b2e73213fd445d30d4ce4cccf1808a4c2841`.
- Artifact ZIP SHA-256: `172398784f627e5fdf7f1ba104695eaad5644efa99fdf12e5e535f9310e62aae`.
- Artifact was downloaded and the archive contents verified to contain `app-debug.apk`; packaged assets include the TIE DSP worker bundle.
- The latest branch HEAD is a documentation-only descendant of the tested source commit; no application source or test files changed after the CI-tested commit.

This CI result verifies the full automated repository test suite and APK build for the tested source commit. It does **not** verify APK installation, WebView/Android runtime behavior, USB audio routing, long-file memory behavior or actual imported/Quick Record use on the owner's target device.
