# AI Live Tone Assistant — Pre-Implementation Audit

Date: 2026-11-21  
Repository: Vaivaii/Nuxmg30-web-app  
Audited branch: feature/tone-intelligence-engine  
Audited HEAD: f1d989e7ad3b614cc7b89dfc1a4fd7baea6ced7a  
Scope: read-only repository and architecture audit. This document does not authorize or describe a TIE restart.

## 1. Decision and safe source baseline

- TIE remains CANCELLED / DEFERRED. Do not restore or reuse the TIE runtime modules.
- The branch name feature/tone-intelligence-engine is historical and misleading: at the audited HEAD, the recursive source tree contains no www/tie-*.js runtime modules. Old TIE specifications and research notes remain as archived documentation.
- recovery/pre-tie-rollback-2026-11-21 is the preserved pre-rollback snapshot and still contains the older TIE implementation. It is not the working source for this task.
- main is not the active application source baseline.
- The safe candidate baseline for a future feature branch is the audited HEAD f1d989e7..., because it contains the completed pre-TIE rollback and the subsequent Editor category-colour preservation/fix.
- The rollback report records CI #1223 at commit 9db49448...: JavaScript syntax passed, 686 tests passed / 0 failed, Capacitor Android project generation and USB Audio plugin installation passed, and Gradle assembleDebug succeeded. That CI record does not establish physical-device behavior. The audited HEAD is later than that CI commit; its current GitHub status/check-run query returned no checks. Re-run the full baseline suite on the exact future branch before implementation.

Relevant records:
- docs/research/PRE_TIE_ROLLBACK_REPORT_2026-11-21.md
- DEVELOPMENT/CHECKPOINT.md

## 2. Current AI Live Tone Assistant

Main files:
- www/ai-tone-studio.js
- www/ai-audio-analysis.js
- www/main.js
- native-android/MG30AudioPlugin.java
- tests/ai-tone-studio.test.js

The original AI Live Tone Assistant is present. The existing implementation has:
- Existing AI provider/model integration and its current conversation/Tone Plan flows.
- Analyze Once and Live Listening controls.
- A native MG-30 USB Audio capture route.
- Local PCM/WAV decoding and a local audio-analysis function.
- AI diagnosis that receives formatted measurements, not raw PCM.
- Conversation input and an Undo AI Changes action.

The audio-diagnosis prompt explicitly says the PCM was analyzed locally, raw audio is not sent, evidence must be interpreted cautiously, and no device changes are allowed during diagnosis.

Current AI analysis output is inserted as ordinary chat messages: one measurements message followed by a separate AI diagnosis message. The conversation renderer has a structured card renderer for NAM cards, but no structured DSP-analysis result-card type matching the selected master design. The in-memory conversation list is capped at 60 messages; it is not a durable analysis archive across application restarts.

## 3. Audio capture: what is actually implemented

The capture path is distinct from USB-MIDI:

1. www/main.js registers the native MG30Audio plugin and exposes window.NUXStudioRecorder.
2. AI Live Tone Assistant calls inspectToneAnalysisInput(), then startToneAnalysis().
3. native-android/MG30AudioPlugin.java uses Android AudioManager device enumeration and AudioRecord.
4. The capture request uses captureMode=multichannel and channelIndexMask=0x3 (USB input positions 1–2).
5. The native code requests the NUX / MG-30 USB input, sets it as the preferred input device, starts AudioRecord, and checks getRoutedDevice(). For this multichannel path it rejects capture unless Android reports a USB route matching MG-30 / NUX. It does not deliberately fall back to the handset microphone.
6. The native capture is written to a local WAV file. The exposed WAV is integer PCM 24-bit; depending on Android/device support, the source AudioRecord format may be PCM 32-bit integer, float, or PCM 16-bit before conversion.
7. The web layer decodes that WAV locally with AudioContext.decodeAudioData(), selects the requested channels, and runs the JavaScript DSP helper.

Important distinctions:
- USB endpoint enumeration is only a capability/discovery check. The native AudioRecord routing check happens when capture starts.
- Android's RECORD_AUDIO permission is requested under the permission alias "microphone". The app must explain that this Android permission is required for recording access; it must not imply that the handset microphone is the intended signal source.
- The AI capture route is USB Audio, not USB-MIDI.
- The existing code selects USB channel mask 0x3. The current analysis note itself cautions that the captured channels may include a host-loopback mix and that measurements describe the captured performance, not a calibrated amp-only response.
- The repository rollback CI confirms that the native plugin is included in Android generation/build. No physical Android handset + original NUX MG-30 Gen 2 firmware 6.0.x test was recorded in the rollback verification. Actual device-side capture behavior therefore remains to be revalidated on hardware.

## 4. Current DSP capability

Implemented in www/ai-audio-analysis.js through analyzeToneAudioSamples():

Measured/derived from the captured sample stream:
- RMS level (dBFS).
- Sample peak level (dBFS), subject to the long-capture sampling behavior below.
- Crest factor (peak minus RMS).
- FFT-based spectral centroid.
- 85% spectral roll-off.
- Relative frequency-band energy percentages for sub-bass, low, low-mid, mid, high-mid, and high.
- Frame-RMS percentile spread, currently reported as performance level variation from the 10th to 95th percentile.

Not currently produced as a valid metric:
- Noise Floor: no dedicated noise-only measurement or reliable estimator is implemented.
- Latency: no capture/input latency or end-to-end audio latency measurement is implemented. A UI polling interval is not audio latency.
- Dynamic Range: the current 10th–95th percentile frame-RMS spread is performance level variation, not a validated Dynamic Range measurement. Do not relabel it.
- True Peak: not implemented.
- Clipping detection/count: no explicit clipping detector/result is returned.
- Frequency Balance status such as "Normal": no calibrated threshold classifier is returned.
- Spectrum chart data: FFT power is accumulated internally, but the returned result contains summary statistics and band percentages rather than a frequency-bin array suitable for rendering the master-design spectrum plot.

Additional correctness/performance caveats:
- For captures longer than roughly 500,000 frames per channel, the RMS/peak loop uses a stride greater than one. At 48 kHz this begins above about 10.4 seconds; long Live Listening captures can therefore miss transient sample peaks and the reported level metrics are sampled approximations, although the current UI does not expose that provenance.
- Samples are clamped to [-1, 1] and non-finite values are replaced with zero by finiteSample(). A future validation layer should reject malformed data or explicitly account for sanitized samples.
- FFT size is limited to 512–4096 points in this helper; the spectrum resolution and usable frequency extent depend on the decoded sample rate and chosen frame size.
- The FFT spectrum is not documented as a calibrated frequency response. Pickups, playing technique, guitar volume, gain staging, and signal routing affect results.

Use explicit provenance on every displayed field: measured, estimated, unavailable, or not measured. Never substitute a placeholder or inferred number for missing measurement.

## 5. Analyze Once and Live Listening today

Analyze Once:
- Starts a seven-second MG-30 USB Audio capture.
- Stops the recorder, decodes the WAV, and runs analyzeToneAudioSamples() once on the completed buffer.
- Sends the measurement summary to the AI diagnosis function.

Live Listening:
- Captures continuously, polls native channel waveform peak buckets approximately every 220 ms, and updates the status/meter UI.
- The native stats response contains duration and channel waveform peaks; it does not provide continuous FFT/DSP measurements.
- The final DSP analysis is still performed once after capture stops.
- A 120-second timeout also stops the capture automatically.
- Thus Live Listening is currently continuous recording plus a live level/waveform preview, followed by one end-of-session DSP analysis. It is not continuous spectrum/DSP monitoring yet.

Both modes do call the same existing local analysis function after capture ends. However, the current function is a whole-buffer analyser, not a streaming accumulator. A true shared streaming engine is needed so Analyze Once and Live Listening use the same DSP math with different capture/session policies.

Current completion behavior:
- finishAudioListening() leaves the Audio Listening panel expanded; it does not automatically collapse it after analysis.
- It inserts a text measurements message and then a separate text diagnosis message.
- The temporary WAV take is deleted after analysis; the computed metrics remain in memory as lastAudioMetrics for a limited follow-up window.
- The current sequence therefore does not meet the requested "panel disappears, then one complete analysis card enters conversation history" behavior.

## 6. Existing AI provider and Editor/MIDI integration

AI:
- Audio diagnosis calls the existing askNamAIJson() helper inside www/ai-tone-studio.js, rather than defining a separate AI provider stack.
- That helper uses the existing provider/model resolution and invokeProvider pipeline. The app also has provider fallback helpers.
- Important current-state caveat: mode defaults to chatgpt, and setMode() pins the mode to chatgpt in the current UI path. In that state askNamAIJson() selects ChatGPT rather than walking a multi-provider fallback chain. Preserve the shared architecture, but explicitly define and test the intended fallback policy for DSP interpretation before relying on fallback behavior.
- The audio prompt receives formatted measurement text, not a typed schema object. A future AI request should receive a versioned structured DSP report plus provenance and limitations; raw audio must remain local unless the user separately approves a different flow.

Editor/MIDI:
- The read-only audio diagnosis path itself does not call bridge.applyPlan() and its system prompt prohibits device changes.
- The existing focused tone-refinement workflow already creates a delta proposal, shows current-to-proposed values, waits for explicit SETUJU / TERAPKAN, checks the current preset snapshot and catalog signatures again, then uses the existing Editor bridge. It records before/after state for Undo.
- Undo uses the existing bridge restore path and skips blocks that were manually changed after the AI apply.
- Existing full preset creation has a separate legacy path that can apply a validated Tone Plan when the user explicitly asks to build a preset and USB-MIDI is connected. Do not let a DSP-analysis recommendation accidentally route into that path. DSP-derived recommendations should use the explicit proposal/approval path.
- Keep the exact original MG-30 Gen 2 catalogue and existing MIDI bridge. No change is authorized to MIDI mappings, preset serialization, NAM, IR User/Third Party, or IR Collection.

## 7. Master UI audit

The uploaded master screenshot remains the design authority:
- Dark charcoal / deep green with lime accents.
- Existing AI Live Tone Assistant header and application navigation.
- A single conversation result card containing Key Measurements, Spectrum Analysis, AI Interpretation, and Recommendations.
- Conversation composer and Undo AI Changes remain available.

Reusable current elements:
- Assistant header and action buttons.
- Audio Listening toggle/panel and its Analyze Once / Live Listening controls.
- Conversation scroll area, composer, message history, status indicators.
- Existing NAM chat-card rendering pattern as a reference for structured message cards.
- Existing Undo control and Editor bridge.

Not yet implemented to match the master:
- One composite DSP result-card renderer.
- Key Measurements grid with truthful provenance states.
- Spectrum chart backed by actual FFT bins.
- Separate AI Interpretation and Recommendation sections inside the same result card.
- Automatic disappearance/collapse of the Audio Listening panel after successful completion.
- A single final summary card for each completed Live Listening session.

Do not redesign the screenshot composition. Adapt the existing assistant frame and implement the missing card/data components to match the supplied master.

## 8. Recommended implementation sequence (no code started)

Phase 0 — Baseline lock
- Start a new feature branch from audited HEAD f1d989e7..., not main and not the stale recovery branch.
- Record source SHA and run the full existing regression suite before touching code.
- Keep the change surface restricted to the AI assistant UI, audio DSP layer, and the minimum native capture bridge changes proven necessary.
- Add a checkpoint note for every later implementation milestone.

Phase 1 — Hardware capture acceptance
- On an Android handset with the original MG-30 Gen 2 firmware 6.0.x, verify device enumeration, permission flow, actual AudioRecord routed device, active channel-index mask, sample rate, encoding conversion, nonzero captured samples, and clean stop/delete behavior.
- Verify no handset-microphone fallback on all failure paths.
- Test no signal, USB disconnect during capture, unsupported masks, another active recorder, and repeated starts/stops.
- Do not begin DSP feature work until this capture contract passes on physical hardware.

Phase 2 — Shared local DSP engine
- Replace/extend the whole-buffer-only helper with a tested local accumulator API: initialize -> process PCM chunks -> finalize.
- Use exactly the same math for Analyze Once and Live Listening. Analyze Once can feed the captured buffer in chunks; Live Listening feeds chunks continuously.
- Return versioned structured data for RMS, sample peak, crest factor, spectrum bins, band energy, and any future supported metrics.
- Record provenance, sample count, channel mask, sample rate, FFT configuration, clipping/sanitization counts, and processing duration.
- Add numerical/unit tests with deterministic PCM fixtures (silence, sine, multi-tone, noise, impulse, clipped signal, stereo channel isolation, malformed input, chunk-boundary equivalence).
- Keep unsupported metrics explicitly unavailable or not measured until their methods are specified and independently validated.

Phase 3 — Session orchestration
- Analyze Once: capture one bounded sample, feed the shared DSP engine, finalize one report.
- Live Listening: keep one monitoring status surface; update DSP state/spectrum without creating repeated chat messages. On stop, finalize one session summary and create exactly one conversation result card.
- Handle timeout, explicit stop, USB disconnect, errors, cancellation, and empty/too-short input without fabricated results.
- Collapse/hide the Audio Listening panel after successful finalization exactly as requested.

Phase 4 — Master result card
- Add a structured audio-analysis chat-history item with one stable report ID.
- Match the supplied master screenshot's layout, spacing, hierarchy, colors, radii, and card composition; do not redesign.
- Display only available measurements with the status labels measured / estimated / unavailable / not measured.
- Render frequency bins only from actual FFT output and limit the chart to the Nyquist-supported range.
- Keep interpretation and recommendations nested in the same card; retain follow-up conversation context.

Phase 5 — AI interpretation and approval-gated Editor proposals
- Send only structured DSP JSON + current user question + relevant conversation context to the existing provider router.
- Keep raw audio local.
- Ask AI to separate observations, evidence, confidence, limitations, and recommendations; do not claim timbre properties unsupported by measurements.
- Any DSP-derived Editor change must first be displayed as a delta proposal against the current live MG-30 snapshot. Require explicit approval, revalidate snapshot/catalog, apply through the existing MIDI bridge, verify readback, and preserve Undo.
- Do not silently change existing preset-creation semantics or any unrelated feature.

Phase 6 — Regression and acceptance
- Run all current tests plus DSP numerical tests, UI tests, and native-plugin tests.
- Build the Android APK.
- Test on physical Android + original NUX MG-30 Gen 2 firmware 6.0.x.
- Acceptance requires both Analyze Once and Live Listening to use identical DSP results for identical PCM, no raw audio upload, no fake metrics, one final card per session, hidden Audio Listening panel after completion, explicit approval before DSP-derived writes, working Undo, and no regression in Editor, MIDI, NAM & IR, Presets, Studio/DAW, Device, or AI providers.

## 9. Current audit status

- Repository audit: complete.
- Audio capture source audit: complete; physical capture verification remains outstanding.
- DSP capability audit: complete.
- UI and Editor/MIDI integration audit: complete.
- Implementation: NOT STARTED.
- Application code changed by this audit: NO.
