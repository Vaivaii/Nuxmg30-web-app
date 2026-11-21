# AI Live Tone Assistant — DSP Implementation Checkpoint

Date: 2026-11-21  
Repository: Vaivaii/Nuxmg30-web-app  
Feature branch: feature/ai-live-tone-dsp-interpreter-2026-11-21  
Baseline: 48765fcc91be2a00c626eae0d7f0105d10b86521  
Checkpoint source HEAD: a437116bb8ed150901b58ffb5285ada899ddf48d

## Scope

Implement local DSP analysis for the already-working NUX MG-30 USB Audio capture path. The DSP engine measures audio locally; the existing AI provider pipeline receives only a compact, structured DSP report and interprets it. This is not a restart of Tone Intelligence Engine (TIE).

## Protected paths

- The existing native AudioRecord capture selection, permission request, USB endpoint selection/routing verification, PCM packing, WAV writer, stop and delete paths were not altered.
- An additive native readToneAnalysisPcmChunk method reads a bounded region of the active capture WAV for continuous JavaScript DSP. It is read-only and only works for the current multichannel capture.
- The existing USB-MIDI/Editor bridge, MIDI mappings, preset handling, NAM transfer, IR User/Third Party and IR Collection paths were not edited.
- The existing provider helper askNamAIJson() and shared provider/model/fallback implementation are reused. No second provider architecture was added.

## Implementation

### Shared local DSP

New file: www/ai-live-tone-dsp.js

Exports:
- createToneDspSession(metadata, settings)
- processToneDspChunk(session, channels)
- getToneDspLiveSummary(session)
- finalizeToneDspSession(session)
- analyzeToneAudioSamples(channels, sampleRate, settings)
- toAiToneDspPayload(report, maxSpectrumBins)

Analyze Once final analysis and Live Listening streaming use the same chunk-processing and FFT implementation. The legacy analyzeToneAudioSamples() API in www/ai-audio-analysis.js now delegates to the shared engine.

Measured outputs:
- RMS dBFS
- Sample Peak dBFS
- Crest Factor
- Hann-window FFT spectrum bins and bin-width/Nyquist metadata
- Spectral centroid
- 85% spectral roll-off
- Relative energy percentages in six frequency bands
- Sample clipping count using a documented 0.999 threshold
- 10th-to-95th percentile frame RMS level variation (reported as level variation, NOT Dynamic Range)

Explicitly not measured:
- Noise Floor: unavailable because no noise-only interval or validated estimator exists.
- Dynamic Range: not measured; level variation is not relabelled as Dynamic Range.
- Latency: not measured; no loopback latency test is implemented.
- True Peak: not measured; no inter-sample oversampling detector exists.

The report contains schemaVersion, source/PCM provenance, sample rate, channel count/masks, sample/frame counts, FFT settings, field statuses and limitations. Malformed or non-finite/out-of-range PCM is rejected rather than silently clamped. AI payload is compacted to at most 96 FFT bins and never contains raw audio PCM.

### Live PCM bridge

Files:
- native-android/MG30AudioPlugin.java
- www/main.js

readToneAnalysisPcmChunk returns a bounded Base64 PCM24 chunk with offset, next offset, capture format, sample rate, channel count and channel-index mask. The existing native capture method remains unchanged. JavaScript decodes PCM24 to normalized floating-point channel arrays, preserves the selected USB input positions, and feeds the DSP session continuously.

### AI Live Tone Assistant

File: www/ai-tone-studio.js

- Live Listening processes streamed PCM chunks and displays live RMS, sample peak, FFT-frame count and spectral centroid in the listening panel.
- Analyze Once still uses a bounded 7-second capture; Live Listening keeps its existing maximum session timeout.
- On stop, the final WAV is decoded and analyzed by the same shared DSP engine, ensuring both modes produce the same report math for identical PCM.
- The listening panel is collapsed before the final result card is added to conversation history.
- One audio-analysis card contains Key Measurements, measured FFT Spectrum, AI Interpretation, Recommendations and limitations.
- The DSP report is preserved in lastAudioMetrics for follow-up chat; discussion turns include the latest structured report when it is recent.
- The AI prompt explicitly prohibits AI from calculating, modifying or inventing DSP values and prohibits device writes. AI recommendations are tied to supplied measurement evidence.
- Existing provider helper, conversation composer, Editor integration, proposal/approval path and Undo mechanism remain in place.

### Tests

New file: tests/ai-live-tone-dsp.test.js

8 deterministic DSP tests cover:
- RMS, sample peak and crest factor
- FFT peak location and amplitude
- Chunked versus complete-buffer equivalence
- Stereo channel and source metadata
- Clipping count
- Invalid PCM rejection
- Compact structured AI payload without audio samples
- Too-short/silent capture handling

The existing assistant test was updated to assert the strict DSP/AI boundary. The USB Audio bridge test now includes the new PCM chunk method.

## Verification status

- Branch source tree was compared against the audited baseline: 21 commits ahead, 0 behind.
- GitHub Actions run #44927684672 on source SHA 82b8891dc71b585f87ce2b6bef1c8bfb9849aa8b reached JavaScript syntax validation successfully and ran 695 tests: 693 passed, 2 failed.
- All 8 new DSP numerical tests passed in that run.
- The two reported failures were stale assertions:
  1. An AI diagnosis test still expected the old "Audio analysis complete/failed" status strings after the new "AI interpretation complete/failed" contract.
  2. The USB capture bridge test still expected the old NUXStudioRecorder method list without readToneAnalysisPcmChunk.
- Both test expectations were updated in later commits (82b8891... and 69f3fe5... respectively). The current head is later than the failed CI run. A fresh Actions run for the final head was not visible through the available GitHub Actions read interface at this checkpoint.
- Because the test step failed in that earlier run, Capacitor Android generation and Gradle assembleDebug were skipped. No new APK is claimed or attached.
- The additional read-only native Java method was added after that failed run and has not yet been compile-verified in a fresh Android build.
- No physical Android handset / MG-30 hardware regression test has been run against an APK containing this new bridge method. The user's already-working capture implementation remains the protected baseline; this follow-up test should confirm the additive chunk reader without changing capture behaviour.

## Next verification actions

1. Run npm test on this exact branch HEAD and confirm all regression tests pass.
2. Run npm run android:init and cd android && ./gradlew --no-daemon assembleDebug; inspect build logs, not only the final build status.
3. Install the resulting APK and verify Analyze Once and Live Listening on the user's working MG-30 capture setup.
4. During Live Listening, confirm PCM offsets advance without gaps/backlog, DSP frame count increases, and the final card matches the complete WAV analysis.
5. Confirm the Audio Listening panel collapses before card insertion, exactly one card is created per session, AI receives only the structured report, no DSP analysis writes MIDI, and existing Editor/MIDI/Undo/NAM/IR/Preset/DAW/provider regressions remain absent.

## Current status

- DSP implementation: committed to feature branch.
- AI structured interpreter: integrated through existing provider pipeline.
- Master-style conversation result card: implemented.
- Native read-only PCM chunk bridge: implemented as additive method.
- Fresh full regression CI: pending.
- Android APK build: pending.
- Physical-device verification of new bridge: pending.
- Production-ready / complete: NOT CLAIMED.


## Final CI and APK verification — 2026-11-21

Final verified source commit: `794872a439bb3bc664c7109657211e135f06cbc6`
GitHub Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44928336429

- Workflow conclusion: SUCCESS.
- JavaScript syntax validation: PASS.
- Full Node regression suite: **695 passed, 0 failed**.
- Capacitor Android project generation + native plugin installation: PASS.
- Gradle assembleDebug: PASS.
- APK upload: PASS.
- Artifact: MG30-Studio-debug-APK, artifact ID `14716831233`, archive size 4,397,251 bytes.
- Extracted APK: `app-debug.apk`, size 4,775,608 bytes.
- Extracted APK SHA-256: `ffc3deaca30042493ffefaa06461708ab8cfa430083f2bf6f0566368773ff31c`.
- The APK artifact was downloaded and its archive listing checked. It contains exactly one file, `app-debug.apk`.

The CI build proves source compilation, regression tests, Android project generation and packaging. It does not prove the new live PCM chunk reader on the user's physical MG-30 Android setup. Physical-device verification remains required for:
- PCM reader offsets advancing without growing backlog on the actual USB input.
- Live DSP spectrum updates while playing.
- final report equivalence between Analyze Once and Live Listening for the same PCM.
- Existing USB Audio capture route remaining functional after APK installation.
- No regressions in MIDI, Undo, NAM, IR, presets, DAW or Editor interactions.

Current state: source tests and Android APK build are green; physical hardware confirmation is pending. Do not label the feature physically hardware-verified until that test is completed.
