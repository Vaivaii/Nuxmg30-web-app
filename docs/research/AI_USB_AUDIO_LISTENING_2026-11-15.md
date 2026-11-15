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


## UI and provider refinements — 2026-11-15
- Reorganized AI Live Tone Assistant into a bounded, adaptive workspace: only conversation history scrolls; USB Audio Listening and the composer remain pinned and visible.
- Moved provider/model selectors and TONE3000 NAM search into the Settings overlay. The existing NAM recommendation and dropdown flow is retained.
- Added a temporary in-chat activity row for AI processing. It is removed when success/error completes; the old status node remains visually hidden for accessibility.
- AI response language defaults to Bahasa Indonesia. A clearly different language in the latest user request is followed.
- Gemini automatic selection now requires a catalogue entry identified as Gemini 3.1 Flash Lite. An explicitly manual model selection remains respected. Saved automatic Gemini choices no longer override the default.
- Added regression tests for responsive layout structure, activity lifecycle, language policy and Gemini default selection.


## AI conversation and standalone NAM search — 2026-11-15
- Added intent routing for consultation, audio analysis, tone refinement, preset creation and standalone TONE3000 NAM profile search.
- Consultation requests use a conversational reply schema and never create a Tone Plan or send MIDI. Recent user/assistant dialogue is bounded to the current AI Studio session and passed into follow-up questions, NAM recommendations, audio diagnosis and tone plans.
- Explicit requests to find an amp/NAM/capture can search TONE3000 independently of preset creation. AI ranks matching tone packs; the user opens A2 model candidates and manually chooses Import. Search itself does not import or change the preset.
- Manual NAM import no longer auto-generates a preset from the search sentence. The installed slot-10 NAM can be used later by an explicit create/refine request.
- Existing automatic NAM import for tone creation retains A2 validation and slot-10 installation. No Cloudflare Worker/API, USB-MIDI mapping, MIDI CC, IR import or preset-transfer code changed.


## Fix: repeated NAM reuse, direct Indonesian search and waveform header — 2026-11-16
- The intent classifier now recognizes Indonesian variants such as "Cari ampnya di Tone3000", "Carikan amp-nya", and "cariin amplifier" as a direct NAM search request instead of a generic AI conversation.
- A new preset request while TONE3000 NAM mode is ON always begins a fresh TONE3000 search, even when an earlier preset already left a NAM installed in slot 10. The pending capture is preserved only when resuming the exact same request after capture selection/USB connection.
- A tone refinement continues to reuse the already-installed slot-10 NAM. If NAM mode is ON but no verified NAM context is installed, the app runs the NAM search before applying the refinement.
- A new preset clears the previous Tone Architect intent/provider/source prompt so an artist reference from the previous preset cannot leak into a later preset request.
- When a NAM is the authoritative amp source, system instructions and the final response explicitly identify the installed slot-10 capture rather than claiming that an unrelated built-in amp such as SLO-100 was applied.
- Replaced the Audio Listening music-note glyph with a waveform SVG and normalized Audio, Settings and Close header buttons to the same 56×56 CSS-pixel frame.
- No Cloudflare Worker/API, MIDI CC mapping, IR collection import, NAM codec or slot-10 transfer protocol was changed.

- Added an explicit latest-request precedence rule to Tone Architect, NAM query derivation, tone-pack ranking, capture ranking and Lead AI. A newly named artist/model always overrides old artist references in recent conversation history.


## AI Token Efficiency and Compact Header Update — 2026-11-16

**Scope:** Original NUX MG-30 Gen 2 firmware 6.0.x. This change improves AI call routing, prompt payload size, output budgets and header controls. It does not change the device codec, MIDI mapping or pedal transfer protocol.

### Architecture
- The in-session AI dialogue memory is now a four-message sliding window. Each stored user/assistant turn is capped at 1,400 characters. The visible transcript remains intact and is not used as a full model prompt.
- Tone Architect receives the current user request and, only when present, locally measured USB Audio metrics. It does not receive the preceding chat transcript.
- In Multi-AI mode, Lead AI receives one minified MG30_TONE_INTENT_V1 JSON object from Tone Architect plus task-specific instructions and the compact MG-30 catalogue/current state. It no longer receives the full conversation, duplicate intent payloads or duplicate raw audio measurements.
- Auto mode uses one provider for ordinary tone creation and for all routine conversation/audio/tweak work. Multi-AI is selected for complex new-tone prompts (multi-amp, multi-scene, layered or similarly coupled designs). The explicit Collab setting still opts into Multi-AI. Focused same-tone refinements are single-agent even when Collab is selected.
- Correction and Critical Reviewer each receive minified state and only the affected block catalogue/snapshot. An execution is capped at three provider hops: Architect → Lead → either one catalog correction OR one conditional Reviewer. A Reviewer is skipped if a validation correction already consumed hop three.
- Same-tone refinements include an explicit Delta Patch contract: return only changed blocks and changed parameter keys, retain current model unless the user explicitly asks for a model change, and preserve unaffected blocks. The existing MG-30 catalogue validator remains authoritative.

### Token limits and usage
| Stage | Output-token ceiling |
|---|---:|
| NAM search query / pack / capture selection | 180 |
| Tone Architect | 260 |
| Tone discussion | 520 |
| USB Audio diagnosis | 520 |
| Tone Plan generator | 1,350 |
| Catalog correction / Critical Reviewer | 850 |
| Provider test | 64 |

- Frontend sends maxOutputTokens with each request. Cloud Worker clamps it to 96–2,048 and uses the same ceiling for any JSON-format retry; a format retry does not silently raise the output allowance.
- Worker normalizes Gemini usageMetadata, OpenAI Responses usage, and OpenAI-compatible usage into prompt_tokens, completion_tokens, and total_tokens.
- The app emits one [MG30 AI TOKEN USAGE] console record per model call, without logging prompt text. If the Worker response contains actual provider usage, usage_source is provider; otherwise it is estimated_chars_div_4. Character-based estimates are not billable token measurements.
- **Deployment boundary:** Cloud Worker source and tests have been updated, but no Cloudflare Worker deployment was performed. The production Worker must be deployed separately before the live endpoint honours maxOutputTokens or returns actual provider usage. Until then, the app logs estimates only and the existing production output ceiling remains unchanged.

### Provider fallback and protected paths
- HTTP 429/503 and temporary provider failures trigger a 60-second client-side provider cooldown, preventing repeated calls to the same provider across subsequent agent stages. Authentication errors and generic Worker-route 404s do not cause cooldown.
- Gemini gemini-3.1-flash-lite-preview default is unchanged. GPT remains manual-only. No model latency probes were added.
- TONE3000 search, A2 validation, NAM slot 10 import, NAM library retention, IR User/Third Party/Collection mapping, MIDI CC mappings, live USB-MIDI parameter writes, USB Audio capture and local audio analysis are unchanged.
- The current branch remains feature/multi-ai-free-tone-architect. CI and APK build results must be recorded separately; a successful Android build is not a Worker deployment or physical MG-30 verification.
