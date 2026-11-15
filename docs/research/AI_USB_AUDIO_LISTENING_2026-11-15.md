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
- Automated unit/integration tests and APK build are pending CI.
- Physical USB input selection, concurrent USB-MIDI operation, Android permission behavior, monitoring, and MG-30 firmware 6.0.x hardware testing remain to be verified on the actual phone/pedal.
