# AI USB Audio Listening — 2026-11-15

## Target and intent
- Target: original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.
- Add Analyze Once and Live Listening to the existing AI Live Tone Assistant.
- Reuse native Android MG30Audio USB input capture. Audio is captured from MG-30 USB input channels 1–2 (stereo host-loopback mix); the phone microphone is not used.
- Decode and analyze PCM locally on-device; send only compact measurements to the existing AI provider route. Raw PCM/WAV data is not sent to an AI provider.
- Read-only audio diagnosis does not create a Tone Plan and never sends MIDI. A subsequent tone correction can include recent measured USB audio metrics and still uses the existing validated Tone Plan → MG30AIToneBridge.applyPlan() → USB-MIDI route.

## Changes
- Added local FFT/spectral analysis: RMS, peak, crest factor, spectral centroid, 85% rolloff, six relative frequency bands, and frame-level dynamics.
- Added a native recorder bridge for MG-30 input channels 1–2, capture status polling, stop/finalize, and safe deletion of temporary analysis WAVs.
- Added Audio Listening panel, Analyze Once (7-second capture), Live Listening (manual stop, 120-second safety cap), USB endpoint inspection, a live activity meter, and read-only diagnosis through the existing provider-selection path.
- Added optional recent audio context to tone correction prompts; no new Worker route or provider secret handling.
- Added Node tests for DSP metrics and Audio Listening integration/UI strings.

## Protected scope
- No changes to NAM recommendation, dropdown, catalogue, import, slot mapping or capture selection.
- No changes to IR import, User / Third Party / Collection mapping, MIDI CC mapping, MIDI connection protocol, preset codec, firmware transfer or direct editor-to-pedal MIDI path.
- No Cloudflare Worker, API route, secrets or backend deployment changes.
- Automatic provider policy remains free-first (Gemini, Groq, OpenRouter); GPT remains manually selected only.

## Validation status
- GitHub Actions run #845 (ID `43697311104`) completed successfully: JavaScript syntax validation, all 508 Node tests, Capacitor Android generation, Gradle `assembleDebug`, and APK artifact upload.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `14154817995`, created 2026-11-15; ZIP SHA-256 `f83ecc4e241b9d7079e7d14062b0d64282ef6a3f0bbd3c9aeb69f083efef0f08`.
- Extracted debug APK SHA-256: `fe2c7f7c30a8202d2065c32dad4132f163d9e3ac54cfb540114743bcfd91a6ec`.
- Physical USB input selection, concurrent USB-MIDI operation, Android permission behavior, monitoring, and MG-30 firmware 6.0.x hardware testing remain unverified and must be tested on the actual phone/pedal.
