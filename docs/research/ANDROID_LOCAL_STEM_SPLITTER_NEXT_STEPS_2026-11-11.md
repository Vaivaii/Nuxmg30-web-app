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


### Redmi Note 11 RAM confirmation — 2026-11-11
- User confirmed the current Redmi Note 11 has 6 GB RAM.
- Exact 4G/5G variant and chipset are still unconfirmed; do not assume Snapdragon 680 or Dimensity 810 until the variant is confirmed.
- Use 6 GB RAM as the initial device memory constraint, while accounting for Android/system memory and concurrent app usage; do not assume all 6 GB is available to the model.


### Redmi Note 11 variant confirmation — 2026-11-11
- User confirmed the device is Redmi Note 11 **4G**, with **6 GB RAM**.
- This identifies the 4G family, but exact chipset / regional hardware variant is still to be verified from device settings or Android build properties before fixing acceleration assumptions.
- Initial benchmark target: Redmi Note 11 4G, 6 GB RAM. New phone planned next month remains the future primary performance target.

## Model audit: local Android four-stem candidates — 2026-11-11

### Executive decision
- Recommended first proof-of-concept candidate: SCNet INT8 ONNX (audiojs/scnet).
- This is a candidate selection for an isolated POC, not an implementation or a claim that it already runs acceptably on Redmi Note 11.
- Reason: published artifact is approximately 12.9 MB, explicitly produces drums, bass, other and vocals, and the model author publicly confirmed MIT licensing for released pretrained SCNet/SCNet-large weights and redistribution of converted ONNX exports with attribution.
- Do not integrate into the production Studio flow until Android ARM64 inference, memory, runtime, quality, thermal and export tests pass.

### Candidate comparison

| Candidate | Four stems | Model / deployment evidence | License / caveat | Decision |
|---|---|---|---|---|
| SCNet INT8 ONNX (audiojs/scnet) | Yes | Published ONNX file 12,900,277 bytes (~12.9 MB); 10.1M parameters; float32 source export 42.8 MB; float16 weights 23.2 MB. Graph expects complex STFT features; documented input [1,4,2049,476], output [1,16,2049,476] for an 11-second segment. | SCNet author explicitly confirmed MIT for released pretrained weights and converted ONNX distributions with attribution. Training dataset MUSDB18-HQ has an educational-use license; dataset redistribution implications should be separately reviewed. | First POC |
| Demucs ONNX | Yes (htdemucs; htdemucs_6s additionally guitar/piano) | Community implementation exports multiple Demucs checkpoints to ONNX and supports Java among several language ports. Public benchmark cited is a 32-thread laptop with RTX 4080, not an Android phone. | Audit exact checkpoint weights and redistribution terms independently; ONNX conversion does not resolve model-weight licensing. No Redmi benchmark. | Secondary quality comparison |
| UVR / MDX-Net ONNX | Often vocals/instrumental or specialist tasks; not established as one single general-purpose four-stem model in the audited sources | Example UVR_MDXNET_KARA_2.onnx is 52,786,726 bytes (~52.8 MB), 13.19M parameters, designed for karaoke/vocal-oriented separation. | The cited example traces to UVR-team weights with MIT attribution, but provenance must be checked for each selected file. | Not primary four-stem candidate |
| Open-Unmix | Four-stem family exists in research/ecosystem | No verified Android-ready ONNX artifact, exact model size, and mobile benchmark established in this audit. | Need checkpoint-specific terms and export/operator validation. | Research fallback |

### SCNet technical notes
- SCNet paper: Sparse Compression Network for Music Source Separation (ICASSP 2024, arXiv:2401.13276).
- Published ONNX INT8 model: 12.9 MB; SHA-256 98228931494151762a1c4ab1ec7899a894b1f81fd4a509921a9d2f9bacc50845.
- Model card documents four sources: drums, bass, other, vocals.
- The graph is not a raw-waveform model. It expects preprocessed complex STFT features and outputs complex stem spectrograms. Android must faithfully implement the exact STFT/iSTFT, channel ordering, scaling, centering/padding, chunk segmentation, overlap/fades and normalization used by the reference implementation. Do not feed PCM directly to the ONNX graph.
- Model card describes 11-second segments at 44.1 kHz, input [1,4,2049,476] and output [1,16,2049,476]. Segment overlap and reconstruction are part of the algorithm; naïve concatenation will create artifacts.
- INT8 refers to the quantized weights/model artifact size; it does not prove that all activations are INT8 or that peak runtime memory is only 12.9 MB.
- Source lineage: starrytong/SCNet model/code, checkpoint distributed through ZFTurbo/Music-Source-Separation-Training, ONNX export/compaction by audiojs.
- Attribution and license notices must be included if this artifact is bundled or downloaded by the app.

### Android runtime strategy
- Use official onnxruntime-android ARM64 package for the isolated POC. ONNX Runtime mobile guidance lists CPU as default and supports Android NNAPI and XNNPACK.
- For a quantized model, begin with CPU Execution Provider as recommended by ONNX Runtime. Compare XNNPACK only after confirming quantized operator compatibility and correctness; do not assume it accelerates every graph.
- Test NNAPI only as an optional device-specific experiment. Unsupported operators can partition the graph and reduce performance; do not make NNAPI a hard dependency.
- Keep preprocessing and overlap-add/iSTFT in native Kotlin/Java or a tested native DSP module; profile them separately from ONNX inference.
- Run the job off the UI thread. Stream/chunk audio and write stems incrementally; avoid holding the full decoded song, all intermediate tensors and all four full PCM outputs simultaneously.
- Preserve original audio sample rate metadata and define an explicit resampling policy. Validate stereo handling and clipping/normalization.

### Redmi Note 11 4G, 6 GB RAM benchmark plan
- Device target confirmed by user: Redmi Note 11 4G, 6 GB RAM. Exact chipset/region/build remains unverified; do not hardcode Snapdragon 680 or a specific NNAPI capability without checking the actual device.
- Establish baseline with free storage, Android version, ABI (arm64-v8a), SoC, sustained CPU clocks/thermal state, background memory and battery.
- Test identical reference WAVs at 30 seconds, 3 minutes and 5 minutes; add longer tracks only after stability.
- Record separately: model load, preprocessing, inference, reconstruction/export time, peak app PSS/RSS, Java/native heap, temperature/thermal throttling, battery delta, output duration, sample rate, channel count, peak level and clipping.
- Report real-time factor (pipeline seconds / input audio seconds); below 1.0 is faster than real time. Offline processing may be slower than real time if UX and thermal limits remain acceptable.
- Compare CPU baseline, then XNNPACK if valid, then NNAPI as optional. Repeat after cool-down to distinguish thermal drift.
- Provisional acceptance gates: no OOM/crash on 5-minute stereo input; all four stems same duration/sample rate/channel alignment; no NaN/Inf; no reconstruction clipping; no obvious chunk-boundary discontinuities; safe cancellation between chunks; responsive app; memory bounded rather than growing with track duration.
- Do not promise processing speed until the physical device test is completed.

### POC sequence (no production changes yet)
1. Obtain pinned SCNet INT8 ONNX artifact and reference preprocessing/postprocessing implementation; record upstream revision and SHA-256.
2. Verify model input/output names, types, dimensions, quantization operators and required ONNX operators with model inspection.
3. Create a separate Android ARM64 sample/POC module or branch; do not touch NAM, IR, preset, MIDI, audio routing, Jam, Record or DAW flows.
4. Match reference output on a short deterministic WAV using identical preprocessing, chunking and reconstruction; compare numerical tolerance and listening results.
5. Run physical Redmi Note 11 4G benchmarks using the plan above.
6. If SCNet fails quality/runtime/memory gates, compare Demucs ONNX and other candidates before changing model choice.
7. Only after POC passes, propose integration under Studio > AI > Stem Splitter, preserving Jam / Record / DAW and all existing MG-30 features.

### Evidence and sources checked
- ONNX Runtime mobile deployment guidance: https://onnxruntime.ai/docs/tutorials/mobile/
- SCNet INT8 ONNX model card and graph details: https://huggingface.co/audiojs/scnet
- SCNet author weight-license confirmation (issue #35): https://github.com/starrytong/SCNet/issues/35
- Demucs ONNX implementation and published non-Android benchmark context: https://github.com/HRSadeghi/demucs-onnx
- Demucs ONNX model comparison/quality notes: https://stemsplit.github.io/demucs-onnx/models/
- UVR MDX-Net example model card: https://huggingface.co/musetric/uvr-mdxnet-kara2-onnx

### Explicit unknowns / no claims
- No model has yet been executed in the Android app or on the user's Redmi Note 11.
- No measured Redmi runtime, RAM peak, battery use, temperature or output quality exists yet.
- Exact Redmi 4G SoC and Android build are not yet confirmed.
- SCNet preprocessing/postprocessing parity and Android operator compatibility still require POC tests.
- This audit does not modify application code, APK, NAM, IR, MIDI mapping, preset data or existing Studio modes.


---

## Progress 2026-11-11 — Android SCNet POC-1 implementation

Work continued only on `feature/android-scnet-stem-poc`; production branch and existing MG-30 device features were not changed.

Implemented:
- Added isolated native Capacitor plugin `native-android/MG30StemPocPlugin.java`.
- Added app-private first-run model acquisition from the pinned Hugging Face SCNet INT8 ONNX artifact.
- Download streams to a temporary `.part` file, checks exact size (12,900,277 bytes) and SHA-256 (`98228931494151762a1c4ab1ec7899a894b1f81fd4a509921a9d2f9bacc50845`), then atomically renames the verified artifact. Existing valid cached model is reused.
- Added metadata-only `inspectModel()` that creates an ONNX Runtime session and returns input/output names, tensor types and shapes. It deliberately does not allocate the large inference tensor.
- Pinned Android dependency `com.microsoft.onnxruntime:onnxruntime-android:1.31.1` in the generated app module via `scripts/init-android.mjs`.
- Registered and copied the plugin through the existing Android initialization script.
- Added isolated JS bridge `www/stem-poc-bridge.js`; it is not imported by the production UI.
- Corrected the artifact filename in the model contract to `scnet.int8.onnx`.

Safety/scope:
- No edits to NAM, IR User/Third Party, IR Collection, preset, MIDI mapping, USB audio, Loopback, Jam, Record, DAW or Studio navigation.
- No model inference tensor allocation yet because graph input/output tensors are large and handset memory headroom must be assessed first.
- No claim of successful Android compilation, model download, ONNX session creation, or physical-device test has been made.

Next verification gates:
1. Run Node regression tests and inspect initializer idempotence/syntax.
2. Run Android Gradle build on CI and resolve any Java/Gradle API issues.
3. Install on Redmi Note 11 4G; download and checksum the model; call `inspectModel()`; record actual ABI and graph metadata.
4. Only after session load passes, implement reference STFT/segment preprocessing and one-segment inference parity.
5. Continue to keep this POC isolated until audio output and resource benchmarks pass.

Commits added in this progress:
- `fe116d08da226c5097d326728719469af7282ee6` — native plugin registration and ORT dependency wiring
- `ec9f787b5cf2f1384c437cefbeaf83e3b1720d88` — initializer duplicate-write correction
- `9988834279e2234a4b61f0042e06ab3a9a97e467` — model filename alignment
- `d6f18767a1afdb0660b61515c0320990a3b69ccc` — POC-1 status notes
