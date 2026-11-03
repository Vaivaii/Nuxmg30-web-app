# MG-30 Studio — Separate USB Loopback Track

Date: 3 November 2026  
Active branch: `feature/studio-usb-loopback`  
Target: original NUX MG-30 Gen 2 firmware 6.0.x (not MKII).

## User-directed feature change

The user canceled Reamp. The active feature is now **USB Loopback only**. The user has already enabled USB ROUTING MODE = LOOPBACK on the pedal.

The intended signal flow is:

`Phone / DAW Backing playback → MG-30 USB playback → MG-30 USB Loopback return → dedicated DAW Loopback track`

The return must be a separate track. It must not be added to the Backing or Guitar track, and the app must not merge the returned input with the original song.

The application does not set or change the pedal's USB routing mode. It expects the user-selected LOOPBACK mode to remain active.

## Implementation in the active source branch

### 1. A fifth independent DAW lane

`www/studio-daw-core.js` now defines a fifth lane:

- Backing
- Guitar
- Bass
- Vocals
- Loopback

The Loopback lane is not armed by default. Guitar remains the normal default armed lane. Existing four-track project files normalize to five lanes; their existing Backing, Guitar, Bass, and Vocals clips are preserved, and the newly added Loopback lane starts empty.

Loopback clips retain:
- the captured channel count,
- capture mode (`loopback`),
- the Android USB channel-index mask,
- sample rate and normal clip timing metadata.

### 2. Dedicated Loopback capture UI

In Studio → DAW → Track Settings, the new panel provides:

- `START USB LOOPBACK CAPTURE`
- `STOP USB LOOPBACK CAPTURE`

Start automatically arms the Loopback lane and calls the existing native USB recorder with `captureMode: "loopback"`. Stop finalizes the WAV and imports it as a clip into that same Loopback lane. It does not insert the file into Backing or Guitar.

The panel reminds the user that the pedal must already be set to LOOPBACK. The app does not alter pedal mode.

### 3. Preserve multichannel USB input rather than guessing the channel pair

The pre-existing input recorder normally tries two-channel stereo and then mono. That is retained for normal Guitar/Quick Record capture.

Loopback mode is separate:
- Reads advertised input channel counts, channel masks, and channel-index masks from Android's USB endpoint information.
- Uses the exact channel-index masks advertised by the input endpoint, ordered by channel count (widest first). This includes non-contiguous masks such as `0xC` (endpoint channels 3 and 4) as well as `0xF` (endpoint channels 1 through 4).
- Uses `AudioFormat.Builder.setChannelIndexMask` when Loopback capture mode is requested and the Android API supports it.
- Does not pass an endpoint index mask to `AudioRecord.getMinBufferSize`, which expects a channel-position mask; Loopback buffer sizing is derived from sample rate, channel count, and sample format.
- Stops with an explicit error instead of guessing when Android advertises channel-index masks but none is compatible with the exposed channel counts.
- In Loopback mode, requires the selected USB input product name to match NUX/MG-30; unlike normal Guitar capture, it does not fall back to a generic USB input.
- Verifies the actual AudioRecord route still matches a USB NUX/MG-30 input before accepting the stream.
- Writes all selected interleaved input samples to the WAV, retaining the actual channel count.
- Aligns each capture read block to a complete interleaved frame, including 3- and 4-channel formats.
- Returns the channel count, channel-index mask and capture mode to the DAW; the DAW persists those values with the clip.

A four-channel endpoint is therefore captured as four channels where that configuration initializes and routes successfully; it is not silently collapsed to stereo by this Loopback-specific selection path.

**Important evidence boundary:** Android channel indexes identify channel positions in the exposed USB stream; they do not tell us which index is the pedal's semantic Loopback program or which pair should be called left/right/wet. The current UI deliberately does not label any channel as processed/wet. Inspect and audition the physical capture before assigning channel meaning.

### 4. DAW waveform and playback

Waveform peak display now aggregates across all captured channel pairs rather than reading only channels 1 and 2. This prevents a multichannel Loopback take that has signal on later channels from appearing silent in the track view.

Normal DAW playback and the existing MG-30 USB recorder are reused. No Reamp AudioTrack session engine or Reamp controls remain in the active branch.

## How to use

1. Keep the MG-30 USB ROUTING MODE set to LOOPBACK (already set by the user).
2. Connect the MG-30 to the Android phone by USB.
3. In Studio → DAW, import the song file to the Backing lane, or use a phone music player if Android routes it to the MG-30 USB output.
4. Open Track Settings and press `START USB LOOPBACK CAPTURE`.
5. Start the song playback. The capture is written to the dedicated Loopback lane.
6. Press `STOP USB LOOPBACK CAPTURE`. The captured clip appears on Loopback separately from Backing/Guitar.

For a first controlled test, prefer the DAW Backing lane and DAW Play while the app remains foregrounded. Android may stop or restrict microphone/USB capture if the app is backgrounded; the app's existing visibility lifecycle also stops a DAW recording when the page is hidden. For Loopback-only capture, the app does not create or resume its Web Audio playback context, and suspends an idle context so it does not take audio focus from a separate phone music player. An external music-player can therefore be tested while MG30 Studio remains visible (for example in split-screen); leaving the app or hiding its page still stops capture. This behavior must be confirmed on the actual handset.

## Protected areas

The Loopback work is isolated to the DAW project model/UI, the optional Loopback-specific mode in the existing Android recorder, and regression tests.

It does not modify:
- NAM import/transfer.
- Custom IR User / Third Party commands and import.
- IR Collection commands and import.
- USB-MIDI framing or MIDI mappings.
- Preset import/export.
- Signal Chain, CTRL/EXP or device parameter editors.
- The normal Guitar recorder's stereo/mono channel selection logic and its pre-existing generic USB fallback.

## Validation plan and evidence

Source tests cover:
- project migration to the fifth Loopback lane,
- independent Loopback clip metadata,
- USB endpoint channel count and channel-index-mask discovery,
- widest-advertised channel-index selection in Loopback mode,
- routing verification,
- DAW capture mode handoff,
- separate lane insertion,
- absence of the Reamp session engine in active app code.

Official NUX documentation confirms that original MG-30 firmware V5 added a USB ROUTING LOOPBACK option. It does not specify USB input channel ordering or the semantic mapping of channel indexes.

Android's official API documents channel-index masks for multichannel recording, including USB devices. The API describes non-contiguous masks: `0xC` selects endpoint channels 3 and 4, while `0xF` selects channels 1–4. This supports preserving the exact multichannel layout exposed by the endpoint; it does not decode the MG-30's channel meanings.

Physical confirmation still required:
- confirm Android exposes the MG-30 USB input when Loopback mode is active,
- confirm the widest selected AudioRecord format initializes and stays routed,
- play known audio from the phone/DAW and capture it to the Loopback lane,
- check the actual WAV channel count and listen to each channel or channel pair,
- determine which channels contain the intended loopback signal,
- confirm playback and capture run simultaneously without dropouts.

Do not infer physical Loopback success from CI alone.


## Android channel-index and input-device safeguards

- The Loopback path uses the endpoint's exact advertised channel-index masks. Non-contiguous masks are retained as advertised (for example `0xC` for endpoint indexes 3 and 4); masks are ordered by channel count, widest first.
- If the endpoint advertises an index-mask list but none is compatible with its channel-count list, Loopback fails explicitly rather than inventing a mask.
- The Loopback branch does not pass channel-index masks to `AudioRecord.getMinBufferSize`, because that API parameter is a channel-position mask. The Loopback buffer request is calculated from sample rate, channel count, and sample width.
- A Loopback recording is rejected if no NUX/MG-30-named USB input is present or the active route changes to another USB device. The normal Guitar capture's prior generic USB fallback remains unchanged.


## Reference links

- NUX MG-30 Global product page (USB routing and firmware update notes): https://nuxaudio.com/product/mg30/
- NUX MG-30 / QuickTone USB routing modes: https://www.nux.us/products/mg-30
- Android `AudioFormat.Builder.setChannelIndexMask` API reference: https://developer.android.com/reference/android/media/AudioFormat.Builder#setChannelIndexMask(int)
- Android `AudioRecord` API reference: https://developer.android.com/reference/android/media/AudioRecord

The official Android API explains that input channel-index masks map endpoint channel indexes to the samples returned by AudioRecord. For example, `0xC` selects endpoint channels 3 and 4, and `0xF` selects channels 1 through 4. This is channel-index documentation, not MG-30-specific routing documentation.


## Latest APK build and package verification (3 November 2026)

- APK build workflow: [Build USB Loopback debug APK](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41590787839), run ID `41590787839`, conclusion **success**.
- Source commit used by that APK: `e9b01d38873529f5e73a7a04b3b6c6c6fca1dc28`. Subsequent changes through the current branch head were test/documentation-only; the compiled application source is unchanged.
- `node --check scripts/init-android.mjs`: passed.
- Test suite: **157 passed, 0 failed**.
- Capacitor Android project generation and native plugin registration: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL in 1m 7s**.
- Workflow artifact ID: `13209997595`, archive `MG30-Studio-debug-APK`, ZIP size 4,129,157 bytes, SHA-256 `86d191ba88b5713c4952cffbb62994a03a17867b5b31a5a6c210d0abe12035b6`.
- Extracted APK size: **4,505,700 bytes**; SHA-256 `3002198baec6020bc6a843348e07e39459499700c8f9c7032cc322d4082ca65a`.
- Package inspection verified `MG30AudioPlugin`, `MG30_Loopback_Take_`, `setChannelIndexMask`, `channelIndexMasks`, the Loopback DAW panel and Loopback start/stop controls in the APK bundle.
- Package inspection did not find `beginReampPlayback` or `startReampPlayback` native methods. The active application package contains the Loopback path, not the Reamp session engine.
- These are CI and package checks, not physical signal-flow verification. Test the actual MG-30 / handset combination before declaring the USB Loopback capture path acoustically confirmed.
