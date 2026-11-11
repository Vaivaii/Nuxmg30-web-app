# Android Local Stem Splitter — Next Steps

Date: 2026-11-11
Project: NUX MG-30 Studio
Target: Android application only
Status: research/implementation plan; no code, model conversion, APK build, or device test claimed.

## User-confirmed direction
- Stem Splitter is for the Android NUX MG-30 Studio app.
- Personal use, not a commercial service.
- Prefer free/open-source model and local on-device inference.
- Four outputs: Vocals, Drums, Bass, Other.
- Do not redirect work to a Windows desktop app or paid per-song API.
- UI belongs in Studio's AI mode; preserve Jam, Record and DAW.
- Do not alter existing MG-30 device protocols, NAM, IR, preset, MIDI, USB audio or Loopback paths.

## Recommended next sequence

### Step 1 — Confirm test handset and constraints
Record Android version, chipset/SoC, RAM, available storage, and whether 64-bit ARM is supported. Use this as the first performance target; don't assume NNAPI/GPU support from Android version alone.

### Step 2 — Model and license audit
Evaluate at least:
- SCNet: confirm exact checkpoint availability, model architecture, inference preprocessing/postprocessing, checkpoint license and dataset terms.
- Open-Unmix: inspect exact pretrained checkpoint/license, quality and speed.
- Demucs only as a comparison candidate; check repository status and exact checkpoint terms before adopting.
Do not equate open-source inference code with freely licensed pretrained weights.

### Step 3 — Android inference proof of concept, isolated from main app
- Use ONNX Runtime Android as candidate runtime.
- Obtain or convert a supported four-stem checkpoint to ONNX only after confirming architecture and license.
- Validate tensor shapes, sample rate, channel layout, normalization, segment/window size, overlap-add, and output reconstruction against a trusted reference implementation.
- Start with CPU/XNNPACK correctness baseline. Then test NNAPI only if the model's operators and target chipset support it.
- Keep all work in an isolated feature module/branch; do not touch device communication modules.

### Step 4 — Benchmark on actual handset
Use user-provided representative files of 30 sec, 3 min and 5 min. Measure:
- model download size and installed storage;
- peak RAM;
- wall-clock separation time and real-time factor;
- CPU/GPU/NPU utilization where measurable;
- battery and thermal behavior;
- app lifecycle/background behavior;
- output quality and stem alignment.
A successful inference on emulator is not sufficient.

### Step 5 — Build Android UX
- First-run model download with size, checksum, version and license notice.
- Offline state after successful model download.
- Import supported audio formats.
- Foreground/background job with notification/progress and cancellation only at safe chunk boundaries.
- Synchronized four-stem player: play/pause/seek, mute/solo/volume, loop and WAV export.
- Preserve original audio; store stems in app-scoped storage and allow user export/share.
- Clear failure messages for insufficient memory, unsupported model/runtime, corrupt audio and low storage.

### Step 6 — Integrate into Studio AI mode
Add Stem Splitter as a subfeature of Studio's AI mode, retaining Jam, Record and DAW. Keep the feature isolated from the MG-30 USB-MIDI/device core.

### Step 7 — Regression and release
Run existing regression suite and verify NAM import, IR User/Third Party and Collection, preset transfer, MIDI mappings, USB audio and Loopback unchanged. Build/sign/checksum APK only after tests pass.

## Runtime facts from official ONNX Runtime documentation
- ONNX Runtime supports Android Java/C/C++ deployment; model must fit device storage and memory.
- Android has CPU default and supports XNNPACK and NNAPI execution providers.
- Official guidance recommends starting with CPU/XNNPACK for consistent baseline; test NNAPI only when performance merits it because support/performance is model/device-specific.
- NNAPI provider requirements: Android 8.1+; Android 9+ recommended. This does not guarantee acceleration for every phone/model.
References:
- https://onnxruntime.ai/docs/tutorials/mobile/
- https://onnxruntime.ai/docs/execution-providers/NNAPI-ExecutionProvider.html
- https://onnxruntime.ai/docs/build/android.html

## Immediate blocker / one needed user detail
Need the exact Android phone model (and ideally RAM/storage) used to run NUX MG-30 Studio. This determines the first benchmark target. No model is selected as final until checkpoint license, Android conversion, quality and handset performance are verified.


## User device planning update — 2026-11-11

User currently uses a Xiaomi Redmi Note 11 and expects to buy a new phone around next month.
- Treat Redmi Note 11 as the initial compatibility/low-end benchmark, not the final performance target.
- Keep the implementation model/runtime configurable so a stronger future Android handset can benefit from acceleration without changing the feature architecture.
- Do not assume exact Redmi Note 11 chipset or RAM: the product has variants. Confirm the exact model/chipset and RAM before selecting model size or drawing performance conclusions.
- Once the new phone is selected, add it as the primary performance target and rerun the same benchmark corpus.
- Do not block all development until the new phone arrives: model/license audit, Android ONNX proof-of-concept, audio pipeline and UI can proceed independently.
