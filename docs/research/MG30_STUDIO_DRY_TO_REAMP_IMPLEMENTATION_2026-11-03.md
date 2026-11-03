# MG-30 Studio — Dry Track to USB Reamp / Return Implementation

Date: 3 November 2026  
Branch: `feature/studio-usb-reamp-loopback`  
Target: original NUX MG-30 Gen 2 firmware 6.0.x (not MKII).

## Implemented in source

### Isolated native USB output playback

Extended `native-android/MG30AudioOutputPlugin.java` with a file-backed playback session. This is separate from the existing `MG30AudioPlugin.java` AudioRecord implementation.

- Verifies the selected endpoint is a USB output whose product name matches MG-30 / NUX.
- Supports the first controlled path only: stereo PCM_FLOAT32 little-endian, 48 kHz.
- Transfers rendered track audio in bounded Base64 chunks into an app-cache PCM file.
- Starts AudioTrack, requests the selected device, and verifies `getRoutedDevice()` matches the selected MG-30 device before starting the worker that writes any DI frames.
- Rechecks the output route while streaming and stops when the route changes.
- Exposes begin, append, start, status, stop, and release methods.
- Limits a playback file to 30 minutes; each bridge chunk is capped at 192 KiB after decoding.

### DAW controls

Added a dedicated panel to Studio > DAW > Track Settings:

- MG-30 USB output selector / refresh.
- Dry source track selector.
- Separate USB return track selector.
- Play Dry to MG-30.
- Reamp + Record Return.
- Stop Reamp.

The source track is rendered from the current playhead to its end using the DAW's existing clip timing, fades, track gain, and pan. The render is converted to stereo PCM_FLOAT32 and transferred in chunks.

The paired record control arms the selected return track and uses the existing `NUXStudioRecorder` / AudioRecord route. Recording starts before native playback and is stopped automatically when the playback session completes. The global Stop control and app visibility lifecycle also stop the Reamp session.

## Required user setup

1. Connect the original MG-30 Gen 2 to the Android device over USB.
2. On MG-30, set USB ROUTING MODE to REAMP and raise PLAY LEVEL enough to hear the signal.
3. In Studio > DAW > Track Settings, refresh and select the MG-30 output.
4. Select a source track that contains a **known dry DI recording**.
5. Select a different return track.
6. Use Play Dry to MG-30 to verify output first.
7. Use Reamp + Record Return to capture the USB input to the return track.
8. Listen back to the return clip and compare it against the input DI and the MG-30's processed sound.

## Evidence boundaries / not yet confirmed

- User has confirmed audible Android app output when the pedal was set to REAMP and PLAY LEVEL was raised.
- User has confirmed the existing app Record operation captured audio in that configuration.
- The current MG-30 USB input channel pair and its semantic mapping (dry versus processed/wet) have **not** been resolved from an independent USB audio capture. The app therefore does not claim that the captured USB return is definitely wet/processed. Listen to and inspect a take before treating it as a final wet track.
- The app's current AudioRecord input route is preserved, not reimplemented. No assumed channel selection has been added.
- AudioTrack full-duplex operation, long-file stability, latency, drift, underruns, and physical processed-return capture still require testing on the user's phone and MG-30.
- The native output path currently supports PCM_FLOAT32 little-endian stereo at 48 kHz only. This was selected to match the 48 kHz float AudioTrack format used in the previous audible output test; physical Reamp streaming remains to be verified. No 24-bit/float USB OUT negotiation is claimed.
- No USB routing mode is changed by the app; the user sets REAMP on the pedal.
- This source change does not modify NAM transfer, User/Third Party or Collection IR command families, MIDI mapping/framing, preset I/O, or the existing USB AudioRecord plugin.

## Regression coverage

Added `tests/studio-reamp-playback.test.js` for:
- DAW script syntax,
- PCM_FLOAT32/48 kHz output format,
- route verification before audio streaming,
- playback session lifecycle,
- distinct source and return tracks,
- reuse and isolation of the existing AudioRecord recorder,
- explicit non-assertion of unverified dry/wet channel numbers.

CI and APK build status should be recorded separately after the workflow for the latest commit completes. Physical-device behavior is not inferred from CI success.


## Format alignment update

The Reamp file stream uses interleaved little-endian Float32 samples (L, R), 8 bytes per stereo frame, and Android `AudioFormat.ENCODING_PCM_FLOAT`. This matches the 48 kHz PCM_FLOAT AudioTrack encoding used by the prior audible output test and advertised by the user's Android endpoint. This is a compatibility choice based on the user's successful output-test configuration, not proof that all USB Reamp input/output directions accept the same format. The app still validates advertised float support where Android exposes it and verifies the selected routed endpoint before sending samples.
