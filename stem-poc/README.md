# Android SCNet Stem Splitter POC — isolated implementation

Status: POC-1 Android model acquisition/session-inspection code is committed; Android compile and device execution are not yet verified.

## Scope
This branch is intentionally isolated from the MG-30 device feature paths. It adds a standalone Android POC contract and testable validation utilities. It does not alter NAM, IR, preset, MIDI, USB audio, Jam, Record, DAW or current Studio navigation.

## Target
- Redmi Note 11 4G, 6 GB RAM (user-confirmed).
- Exact SoC, Android version and ABI must be read from the handset before acceleration decisions.
- Four outputs: vocals, drums, bass, other.
- Offline inference after the model has been obtained locally. First-run model acquisition may require network unless the model is bundled.

## Model pin
- Candidate: audiojs/scnet INT8 ONNX.
- Expected artifact size: 12,900,277 bytes.
- Expected SHA-256: 98228931494151762a1c4ab1ec7899a894b1f81fd4a509921a9d2f9bacc50845.
- Upstream: https://huggingface.co/audiojs/scnet
- License/attribution review: https://github.com/starrytong/SCNet/issues/35
- Model is not a raw PCM interface. Reference preprocessing and postprocessing must be ported and parity-tested before audio inference is enabled.

## POC phases
1. Model acquisition and cryptographic verification.
2. ONNX Runtime Android load/session smoke test; enumerate graph input/output metadata.
3. Implement exact reference STFT feature extraction and segment padding.
4. Run one deterministic segment and compare ONNX outputs to reference.
5. Implement complex iSTFT and overlap-add reconstruction; verify four aligned WAVs.
6. Benchmark 30s, 3m and 5m audio on physical Redmi.
7. Only then decide whether to integrate into Studio > AI.

## Hard safety boundaries
- No hardware MG-30 SysEx or MIDI operations from this POC.
- No changes to existing MG-30 code paths.
- No UI claims that separation is working until all four output WAVs are generated and validated.
- Model file size is not a RAM estimate.
- No NNAPI/XNNPACK promise until provider compatibility and device measurements exist.
- Keep source attribution and exact model checksum with the artifact.

## Validation gates
- Artifact byte count and SHA-256 exactly match pin.
- Runtime session loads on arm64-v8a.
- Input/output tensor metadata matches the pinned model card.
- Deterministic reference parity for preprocessing and inference.
- Four WAV outputs have equal duration, sample rate and channel layout; no NaN/Inf, clipping or chunk seams.
- 5-minute stereo run completes without OOM or crash and memory use is bounded.
- CPU is baseline; accelerators are optional experiments.

## POC-1 implementation notes
- `native-android/MG30StemPocPlugin.java` downloads the pinned ONNX artifact to app-private storage, checks exact byte count and SHA-256 while streaming, and only installs a verified file.
- `inspectModel()` creates an ONNX Runtime session and reports graph input/output metadata without allocating the large inference tensor.
- `scripts/init-android.mjs` copies and registers the isolated plugin and pins `com.microsoft.onnxruntime:onnxruntime-android:1.31.1` in the generated Android app module.
- `www/stem-poc-bridge.js` exposes the two native methods but is not imported by the production UI.
- This is code implementation only. Build, model download, ONNX session load and physical handset validation remain pending.

## Current implementation status
- [x] Isolated branch created from feature/full-backup-selective-restore.
- [x] POC scope, model pin, boundaries and gates documented.
- [x] Native Android ONNX Runtime session-inspection implementation (compile/runtime verification pending).
- [ ] Reference preprocessing / postprocessing.
- [ ] Four-stem audio inference.
- [ ] Physical device benchmark.
