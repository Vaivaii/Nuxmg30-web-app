# TIE-02 --- Audio Engine & Source Integration Specification

**Project:** MG30 Studio · **Module:** Audio acquisition, routing and
lifecycle\
**Version:** 1.0 · **Status:** Technical design baseline

## 1. Purpose

Define how Tone Analysis obtains audio from supported sources while
preserving the existing Jamm & Record workspace. This document is
deliberately capability-gated: the repository and target Android/browser
environment must prove that a source is available before the UI presents
it as ready.

## 2. Source priority and capability matrix

  -----------------------------------------------------------------------
  Source                  Expected integration    Gate
  ----------------------- ----------------------- -----------------------
  Imported WAV/audio file File picker, decode to  Verify supported
                          PCM                     MIME/codec and decode
                                                  path

  Quick Record            Reuse saved recording   Verify format,
                          or recorder buffer      lifecycle and ownership

  DAW track               Read/export selected    Verify DAW internal
                          track buffer            representation
                          non-destructively       

  Live input              Existing input capture  Verify permissions,
                          or browser media API    device route and
                                                  Android support

  USB Loopback            Existing loopback path  Verify it exposes PCM
                                                  audio, not only
                                                  MIDI/control

  MG-30 USB connection    Device-specific audio   Do not assume USB MIDI
                          path                    means USB audio
  -----------------------------------------------------------------------

Show each source as `Available`, `Unavailable`, `Permission required`,
or `Not verified`. Never show a false connected state.

## 3. Audio session abstraction

``` ts
type AudioSessionState =
  | "idle" | "requesting" | "ready" | "capturing"
  | "paused" | "stopping" | "error";

interface AudioSourceCapabilities {
  canCaptureLive: boolean;
  canReadExistingBuffer: boolean;
  canMonitor: boolean;
  supportedSampleRates: number[];
  channelCounts: number[];
  requiresPermission: boolean;
}

interface AudioSession {
  id: string;
  sourceId: string;
  state: AudioSessionState;
  metadata?: AudioMetadata;
  start(): Promise<void>;
  pause?(): Promise<void>;
  resume?(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
}
```

The contract is illustrative; adapt to the actual framework and existing
application patterns. Keep UI state separate from browser/device
objects.

## 4. Lifecycle rules

-   One owner controls each stream/session.
-   Start only after explicit user action and required permission.
-   On stop, route change, source change, navigation teardown or device
    disconnect: stop tracks, disconnect nodes, close ports and release
    buffers.
-   Prevent duplicate sessions from repeated taps.
-   Prevent stale callbacks from updating a newer session.
-   If the user switches workspace during recording, preserve current
    behavior; do not stop recording unless the existing app already
    defines that behavior or the user explicitly stops it.
-   Handle Android app backgrounding and return-to-foreground
    transitions.
-   Explain when another app or OS audio route takes exclusive control.

## 5. Existing DAW coexistence

Tone Analysis must not create competing capture/playback graphs that
interfere with the DAW. Audit whether analysis can subscribe to an
existing recording buffer or use a non-destructive copy. If exclusive
access is required, explain the limitation and offer offline analysis of
a saved take.

Keep separate concepts: - Capture input: audio entering the app. -
Monitor path: audio sent to headphones/speakers. - Record path: audio
written to a take/track. - Analysis tap: read-only PCM supplied to DSP.

Do not silently change input gain, monitoring level, track routing or
playback state when analysis starts.

## 6. Format normalization

Preserve source metadata. Decode supported formats to Float32 PCM for
DSP. If resampling is necessary, use a documented resampler and record
both source and analysis sample rates. Do not relabel a sample rate
without actually resampling.

For stereo-to-mono conversion, provide a defined channel mode. Do not
average channels if phase cancellation would materially affect the
result without warning. Allow separate-channel analysis when useful.

## 7. Buffering and recording

-   Use bounded buffers for live analysis.
-   Prefer chunk-based transfer for long recordings.
-   Do not duplicate full recordings unnecessarily.
-   Use backpressure or drop/skip analysis frames rather than blocking
    audio capture.
-   Separate recording reliability from visualization refresh rate.
-   If analysis falls behind, show that the display is delayed or
    paused.

## 8. Android and browser compatibility audit

Phase 0 must record: - Android version and target API. - WebView/browser
version. - Whether the app is PWA, Capacitor/native wrapper or another
shell. - Permission model. - Audio input devices exposed to the
runtime. - USB host/OTG behavior. - Audio focus and route-change
behavior. - Supported codec/sample-rate/channel combinations. -
Background/foreground behavior.

Do not promise direct USB audio from MG-30 until tested on the actual
device, cable, Android build and application runtime.

## 9. User experience states

Every source selector must support: - Not verified. - Available. -
Permission required. - Connecting/requesting. - Ready. - Capturing. -
Paused. - Disconnected. - Unsupported. - Error with retry path.

When unavailable, provide an alternate path such as import WAV or
analyze an existing recording.

## 10. Security and privacy

Request only permissions needed for the selected action. Do not upload
recordings automatically. Explain when audio leaves the device. Avoid
storing raw audio longer than required; provide clear deletion behavior
consistent with existing app storage.

## 11. Acceptance criteria

-   Each advertised source has been tested on target Android
    hardware/runtime.
-   Source metadata is accurate.
-   Start/stop/dispose is idempotent and leak-free.
-   DAW recording and playback remain functional.
-   Source disconnect and app lifecycle transitions recover safely.
-   No false USB audio capability is displayed.
-   Imported and saved recordings can be analyzed without live capture.
