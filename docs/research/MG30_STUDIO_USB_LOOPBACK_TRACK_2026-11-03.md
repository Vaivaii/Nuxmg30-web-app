# MG-30 Studio — Separate USB Loopback Track

## User-directed correction — keep four tracks, route Loopback per track (3 November 2026)

The user rejected the dedicated fifth Loopback lane because the DAW's Timeline layout only presents four complete track rows; the fifth strip wraps below the mixer and the fifth timeline lane is not a good visible workflow. This decision supersedes the earlier five-lane design described in the historical sections below.

**Current product decision: the DAW always has four visible tracks: Backing, Guitar, Bass and Vocals. There is no dedicated Loopback track.** Each track has its own persisted input route in Track Settings:

- Audio file / Import.
- MG-30 USB input 1 as mono.
- MG-30 USB inputs 1–2 as stereo.
- MG-30 USB Loopback inputs 3–4 as stereo.

The Loopback 3–4 source can be selected on any of the four tracks. The user arms the destination track and records; the resulting clip is inserted into that same track. Existing clips are not rerouted when a user changes the track's input setting; the selection applies to the next recording.

When migrating an older five-track project, the old fifth lane is removed from the visible DAW but its clips are preserved in the project-level `legacyLoopbackClips` archive with their media IDs and channel metadata. They are not silently deleted and are not rendered as a hidden fifth lane. They can be reassigned/imported into one of the four visible tracks in a later recovery workflow.

### Capture and channel isolation

The Android recorder is requested in multichannel mode with the selected track's channel-index mask. It selects an MG-30 USB endpoint layout that contains the requested mask; a larger advertised endpoint mask may be used when it includes the requested channel(s). It rejects an unavailable selection instead of silently recording unrelated channels. The raw multichannel take is retained in the Quick Takes list.

Before a take becomes a DAW clip, the app maps the requested channel(s) from the actual captured channel-index mask, duplicates mono to left/right where needed, and writes a two-channel WAV source containing only the selected mono/stereo material. The clip and project persist both the actual capture mask and the selected per-track input route/mask. This keeps Loopback 3–4 out of tracks that did not select it and allows the Loopback pair to be assigned to Backing, Guitar, Bass or Vocals.

Input channel names are the user's requested routing convention for this app. Android channel-index masks describe positions in the USB stream; they do not independently prove the MG-30's semantic signal labels. Physical capture/audio verification on the original MG-30 Gen 2 is still required.

### Protected paths and boundaries

The dedicated fifth lane and its single-purpose Loopback button have been removed from the active DAW UI/model. Normal Guitar Quick Record retains its previous stereo/mono logic and generic USB fallback; the new multichannel mode is requested only by a DAW track using a USB route. Reamp remains canceled. NAM, custom IR User/Third Party, IR Collection and MIDI mapping implementations are outside this change.

Regression tests now assert exactly four DAW tracks, the four input-route choices, per-track USB channel assignment, mask-compatible endpoint selection, mono/stereo channel extraction and isolation from Guitar Quick Record.

---

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


## Final Loopback APK refresh (3 November 2026)

This later build supersedes the earlier artifact record above. It includes the final app source plus the final Loopback regression assertions.

- Workflow run: [Build USB Loopback debug APK — final refresh](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41590802171), run ID `41590802171`, conclusion **success**.
- Source commit: `9f10f2cd6ceb95a8262370c7fd975b392e3a2aaf`.
- Regression suite: **157 passed, 0 failed**.
- Android initializer syntax: passed.
- Capacitor Android generation/plugin registration: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL in 1m 31s**.
- Workflow artifact ID: `13210027536`, ZIP size 4,129,160 bytes, SHA-256 `1ba02e30bf94c0fd2fb5ef61cdaffe491a8d2b9a74810fb4e4af09549d5c0169`.
- Extracted APK size: **4,505,700 bytes**, SHA-256 `388672ffff2074c96a1089aa6e5f0fb4a44612941cb75d52658e482852260689`.
- Final package inspection found the Loopback capture filename prefix, Android `setChannelIndexMask` path and channel-index diagnostics in the native/web bundle. No Reamp native session entry points were found in the APK.
- Physical USB Loopback playback/return remains unverified until the user tests this APK with the original MG-30 and listens to the captured track.


## Final four-track input-routing APK build (3 November 2026)

This build supersedes the earlier five-lane Loopback APKs and represents the user-directed four-track design with independently selectable input routing.

- Workflow: [Build four-track USB input-routing debug APK](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41595251345), run ID `41595251345`, conclusion **success**.
- App source commit: `eefa28240b60045f8911ed4bcee23bc3d9d2b291`. The later documentation-only commit does not change the APK source.
- Regression suite: **157 passed, 0 failed**.
- Android initializer syntax: passed.
- Capacitor Android project generation and native USB audio plugin registration: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL in 1m 30s**.
- Workflow artifact ID: `13212750040`, archive `MG30-Studio-4Track-InputRouting-debug.zip`, ZIP size **4,130,268 bytes**, SHA-256 `07884dbea2e8ebd86b3a804fa2a1e44200a6d6c93a18063ffe9232a7baf65db6`.
- Extracted `app-debug.apk` size **4,506,848 bytes**, SHA-256 `cc8846caae38ab97452b77efa4b8d51716d6e4f3f85cf13fdba6e1fb8088f45e`.
- APK bundle inspection found the Track Input Routing UI and labels for Input 1 mono, Input 1–2 stereo, and Loopback 3–4. DEX inspection found the native channel-index mask and multichannel-take strings; the Reamp output session entry points are absent.
- The APK contains four DAW track model entries. The old fifth-lane clips are held in the project-level `legacyLoopbackClips` archive during migration; they are not rendered into a hidden lane.
- These checks establish source/test/build/package integrity, not acoustic proof of the MG-30 channel meanings. Test with the original MG-30 Gen 2 and listen to the captured Loopback 3–4 result before treating that physical signal mapping as confirmed.



## First user handset test — take saved but signal appears silent (3 November 2026)

The user tested the four-track APK by playing a song and recording with Backing armed. Screenshot observation:
- DAW has four visible tracks as intended.
- A take named with prefix `MG30_USB_Input_Take_...` was saved/imported as a clip on Backing; this indicates the native multichannel capture start/stop and take import path ran.
- The displayed clip waveform is almost a flat line. No audible signal has yet been confirmed.
- The screenshot is the Timeline page and does not show which Backing input route was selected in Track Settings. The take prefix is generic to the per-track multichannel capture and does not identify whether mask 0x1, 0x3 or 0xC was requested.

Do not mark USB Loopback as physically verified. Next diagnosis must obtain:
1. Backing's selected Track Settings route, especially whether it is `MG-30 USB · Loopback 3–4 (Stereo)` rather than Input 1 mono or Input 1–2 stereo.
2. Whether the song is actually audible from the MG-30 headphone/output while being played on the phone.
3. If the selected route is confirmed as Loopback 3–4 and the capture is still silent, obtain the original raw `MG30_USB_Input_Take_...` WAV from Quick Takes/Record export and analyze per-channel peak/RMS before changing native capture code. The raw take retains the selected AudioRecord channels and channel-index mask.

Initial diagnostic interpretation: WAV creation succeeded, but the near-flat waveform is consistent with silence or extremely low level in the selected channel(s). It does not by itself establish whether the problem is phone USB playback routing, the MG-30 Loopback input channel assignment, Android's exposed channel-index mask, or sample conversion. Preserve the current four-track routing and protected NAM/IR/MIDI paths while diagnosing.



## User confirmation — Backing is explicitly set to Loopback 3–4 (3 November 2026)

The next screenshot explicitly shows the Backing route selected as "MG-30 USB · Loopback 3–4 (Stereo)". The prior assumption that Backing might still be set to File/Import, Input 1, or Input 1–2 is therefore ruled out. Do not ask the user to repeat this route-selection check.

The screenshot also shows the saved clip name "MG30_USB_Input_Take_20261103_150952.wav" in Track Settings/clip inspector. Thus the native recording start/stop and file import path produced a take, but the displayed Timeline waveform from the preceding screenshot was nearly flat. No acoustic input signal has been confirmed yet.

### Remaining fault domains

1. USB playback/output route: the DAW captures the MG-30 USB input endpoint with AudioRecord, but that operation does not prove Android sent the phone/DAW music to the MG-30 USB output endpoint. The separate native output plugin only enumerates USB outputs and has an isolated low-level test-tone probe; it is not currently integrated as a verification of the phone player's media route in the DAW.
2. MG-30 stream channel mapping: the app requests the selected index mask and preserves channel metadata, but NUX's public product information only confirms existence of USB Loopback mode, not the semantic signal assigned to each MG-30 USB capture channel.
3. Capture payload: a successful WAV file and AudioRecord routed-device match prove that a stream was opened and a file written, not that its samples contain the phone song.

### Required next evidence

Obtain the original raw Quick Take WAV "MG30_USB_Input_Take_20261103_150952.wav" (export from Record/Quick Takes, not the decoded/stereo DAW clip). Analyze RIFF channel count, sample rate, bit depth, data length, and per-channel peak/RMS/DC offset. If four channels are present, compare all four channel energies and listen to each pair before altering the channel-index selection. If only two are present, inspect the persisted channelIndexMask metadata to confirm whether Android really opened mask 0xC.

Next diagnostic UI should expose, per take: selected endpoint, AudioRecord routed endpoint, sample format, actual channel count, actual channel-index mask, bytes written, capture errors, and per-channel peak/RMS. It should separately indicate whether the MG-30 USB output endpoint is present; do not conflate USB MIDI connectivity with USB Audio output routing.



## Uploaded test WAV identity needs confirmation (3 November 2026)

The uploaded file `Tes- ush-Fu---Mix.wav` is 9.6 s, 48 kHz, stereo, 24-bit PCM. Both channels contain only zero-valued samples (peak 0, RMS 0, nonzero samples 0). Its filename is not the native Quick Take prefix `MG30_USB_Input_Take_...`, so do not assume this file is the MG-30 capture; it may instead be the source song supplied for playback. Ask whether it is the source song or a recording/export. If source, retry with a known audible WAV. If capture, request the raw native Quick Take export to diagnose the USB input channels.


## Critical routing correction from original QuickTone 2.6.7.16 and original USB descriptors (3 November 2026)

This corrects the earlier assumption that the user's "USB ROUTING MODE = LOOPBACK" is equivalent to selecting USB input channels 3–4. These are not established as the same thing.

### QuickTone original — distinct Loopback concepts

The supplied QuickTone Windows 2.6.7.16 executable was partially recovered from the uploaded ZIP. The archive itself is truncated (its ZIP central directory and final ~36 MB of the declared compressed entry are missing), but the complete PE .text section and the relevant early .rdata strings were recovered. The original resource strings include:
- UI controls: "Recording Level", "Playback Level", "Routing Mode".
- Routing values: "Normal", "Reamp", "Dry Out".
- Separate option/label: "Loopback".
- Other USB routing labels: "Wet Sync in Input 3/4", "Input 1/2 - Output 1/2", and "Input 1/2 - Output 3/4".

A QuickTone/MG-30 technical guide from Monk Custom (27 June 2021, firmware v2.3) explicitly distinguishes the two relevant operations:
1. In **Normal mode**, enable the **Loopback** option to include audio playback from the computer/host in the recording.
2. In **Loopback mode**, the MG-30's built-in drum machine and phrase looper can be recorded.
3. In **Dry Out** mode, Input 1/2 carries the dry guitar signal; the separate "Wet Sync in Input 3/4" option can send the processed/wet guitar signal to Input 3/4.
4. "Input 1/2 - Output 3/4" is a distinct Re-Amp route: a dry track can be sent from the host on USB output 3/4 while backing continues on USB output 1/2.

NUX's product page independently lists NORMAL, USB Loopback, REAMP and DRY OUT as USB audio routing choices. The app must preserve the distinction between the Normal-mode Loopback enable option and the separate Loopback pedal routing mode. Do not call input mask 0xC "Loopback" merely because it is channels 3–4.

### USB descriptor topology from the supplied original QuickTone PCAPs

The USBPcap descriptors in `ir user import.pcapng`, `nam import.pcapng`, and the longer collection captures identify the MG-30 USB device descriptor as VID:PID `1FC9:8260` (the other enumerated device, VID:PID `30C9:000E`, is a separate video-class device and is not the audio interface).

The MG-30 configuration describes:
- USB Audio Class 2.0 interfaces.
- USB Audio IN stream: AudioStreaming interface 1, alternate setting 1, isochronous endpoint `0x83` IN, 4 channels, 24-bit PCM.
- USB Audio OUT stream: AudioStreaming interface 2, alternate setting 1, isochronous endpoint `0x01` OUT, 4 channels, 24-bit PCM, with feedback endpoint `0x81`.
- Separate USB-MIDI interface 4: bulk endpoint `0x02` OUT and `0x82` IN.

The MIDI import PCAPs carry the SysEx transfers on bulk endpoints 0x02/0x82. They contain device/configuration descriptors but do not contain isochronous audio payloads on 0x01/0x83. Thus they prove the four-channel full-duplex USB Audio topology and the separate MIDI path, but they do **not** prove which capture channel numbers contain host-playback Loopback audio.

### Why the previous app build records silence

The app's four-track routing currently labels channel-index mask `0xC` (USB IN channels 3/4) as "MG-30 USB · Loopback 3–4" and captures that pair. That semantic mapping was an assumption based on a prior user description, not something established by QuickTone descriptors or audio traffic. The device's separate Loopback mode can capture internal drum/phrase audio; using that mode to record phone/host playback is inconsistent with the documented Normal-mode Loopback behavior. This is now the leading explanation for the all-zero user take, but the exact host-loopback return channel pair remains unverified.

### Corrected next implementation/test plan

1. Do not ask the user to reselect the same input or imply their prior selection was wrong.
2. For host/phone playback Loopback, distinguish **Normal mode + Loopback enabled** from the separate **Loopback mode** used for internal drum/phrase looper capture. The user should not need to enable Re-Amp or Dry Out.
3. Do not assume host-playback Loopback is USB IN 3/4. The "Wet Sync in Input 3/4" label is tied to Dry Out wet capture in the technical guide; it is not proof that host Loopback appears there.
4. Add a raw four-channel (mask 0xF) diagnostic capture and per-channel peak/RMS report before any extraction. Use it with Normal + Loopback enabled; identify the channel pair that contains host playback. Preserve the original raw multichannel WAV for inspection.
5. Only after the host-loopback pair is measured, expose it as a selectable source for any of the four visible DAW tracks. Keep ordinary Input 1/2 and Wet Sync Input 3/4 labels separate.
6. Verify Android's host playback routing to USB Audio OUT endpoint 0x01, and capture USB Audio IN endpoint 0x83. Do not confuse USB-MIDI connection/status or MIDI endpoints 0x02/0x82 with the audio route.

Evidence references:
- Original QuickTone 2.6.7.16 executable uploaded by the user; recovered file strings and USB descriptor packets from their supplied PCAPs.
- QuickTone/MG-30 guide (firmware v2.3, 27 June 2021): https://monkcustom.blogspot.com/2021/06/NUXMG-30SecretTips.html
- NUX MG-30 product page describing USB audio modes: https://www.nuxaudio.id/products/mg-30
- USB descriptor evidence is from the user's supplied `ir user import.pcapng` and `nam import.pcapng`; no audio streaming data is present in these captures.



## Handoff correction — the pedal's routing mode was the actual mistake (3 November 2026)

This is the authoritative correction to the earlier Loopback implementation notes above. The previous app guidance incorrectly told the user to set the pedal's **USB ROUTING MODE = LOOPBACK** to capture phone/host playback. That is not the documented QuickTone workflow for host playback.

### Original QuickTone behavior (Windows 2.6.7.16)

The supplied executable contains separate USB Settings strings for:
- `Routing Mode`: `Normal`, `Reamp`, `Dry Out`, and `Loopback`.
- A separate `Loopback` control/label.
- `Wet Sync in Input 3/4`.
- `Input 1/2 - Output 1/2` and `Input 1/2 - Output 3/4`.
- `Recording Level` and `Playback Level`.

The string table alone proves the UI labels exist, but not their semantics. The guide "NUX MG-30 Secret Tips (FW: v2.3)" (Monk Custom, 27 June 2021) explicitly explains the distinction:
1. **Normal mode + Loopback enabled**: includes audio playback from the computer/host in the recording/stream.
2. **Loopback routing mode**: makes the MG-30's internal drum machine and phrase looper recordable over USB.
3. **Dry Out mode**: USB Input 1/2 is dry guitar; optional wet guitar is exposed on USB Input 3/4 using "Wet Sync in Input 3/4".
4. **Input 1/2 - Output 3/4** is the distinct Re-Amp routing option described later in the same guide.

NUX's current MG-30 product page lists NORMAL, USB Loopback, REAMP and DRY OUT as distinct USB audio routing modes. The official product page does not describe channel-level mapping.

### Correct setting for the user's phone/host playback goal

For capturing audio played by the connected phone/host, the target configuration is **Routing Mode = NORMAL, with the separate Loopback option enabled**. Do not set the pedal's Routing Mode to LOOPBACK for this goal. The latter is for internal drum machine / phrase-looper audio. Do not enable Reamp or Dry Out for host playback.

The guide refers to computer/host playback. Applying this to Android phone playback over USB is the closest supported interpretation, but actual Android host/USB playback behavior still requires a physical test on the user's setup.

### Correct channel labels and app changes

- USB Input 1/2 remains the normal stereo input route.
- USB Input 3/4 must be labelled **Wet Sync (Dry Out)**, not Loopback.
- The old persisted route ID `usb-loopback-3-4-stereo` is migrated to `usb-wet-sync-3-4-stereo`; no track clips or recorded media are deleted.
- A raw 4-channel diagnostic capture mode (`captureMode: diagnostic`, channel-index mask `0xF`) was added. It preserves the interleaved 4-channel WAV and computes per-channel sample count, peak, RMS, and dBFS. It does not import the diagnostic file to any DAW track.
- This diagnostic identifies which MG-30 USB IN channel(s) contain host playback after the pedal is set to **Normal + Loopback enabled**. The QuickTone guide does not specify the USB IN channel pair, and the USB descriptor PCAPs contain no isochronous audio samples; therefore no channel pair should yet be hardcoded as host Loopback.
- This diagnostic implementation is experimental and must pass CI/build and physical verification before an APK is offered as ready.

### Original USB topology, limits of existing PCAP evidence

The supplied USB descriptors show a four-channel, 24-bit USB Audio IN stream on endpoint `0x83`, and a four-channel, 24-bit USB Audio OUT stream on endpoint `0x01` (with feedback endpoint `0x81`). MIDI uses separate bulk endpoints `0x02` OUT and `0x82` IN. The supplied IR/NAM PCAPs capture MIDI traffic and USB descriptors, not isochronous audio payloads. They cannot establish which channel index carries the host Loopback mix.

### Evidence / source distinction

- **QuickTone executable strings (user-supplied)**: prove the listed USB Settings controls and route labels exist; strings by themselves do not prove their audio semantics.
- **Monk Custom guide**: supports the Normal + Loopback host-playback distinction and Dry Out Input 1/2 vs Wet Sync Input 3/4 distinction.
  https://monkcustom.blogspot.com/2021/06/NUXMG-30SecretTips.html
- **NUX official MG-30 page**: confirms the four routing modes are separate options, without documenting the channel map.
  https://www.nuxaudio.id/products/mg-30
- **User-supplied USB PCAP descriptors**: support the 4-in/4-out UAC topology only; no isochronous audio payload was present.
- **Not yet verified**: the exact USB IN channel(s) containing Android host playback after Normal + Loopback is enabled, and whether the current Android build records that mix on the user's phone/firmware.



## Physical raw USB input diagnostic — four-channel capture result (3 November 2026, 17:00 WIB)

The user supplied both the Studio diagnostic screenshot and the exact raw WAV written by the diagnostic UI:

- WAV: `MG30_USB_Raw4ch_Diagnostic_20261103_170049.wav`
- Duration: 13.900 s
- Format: 48,000 Hz, 4-channel, signed 24-bit PCM
- File size: 8,006,444 bytes (matches the UI's reported byte count)
- SHA-256: `9202918e9bade3905b7a6e478287024e2b55050d6be0413fdc68557ec6a56f8f`
- UI confirms endpoint `USB-Audio - NUX MG-30`, actual channels = 4, requested mask = `0xF`, actual mask = `0xF`.

Independent analysis of the supplied WAV confirms:

| USB IN channel | Peak | RMS | Nonzero samples |
|---|---:|---:|---:|
| 1 | -0.044 dBFS | -12.347 dBFS | 667,200 |
| 2 | -0.044 dBFS | -11.969 dBFS | 667,200 |
| 3 | -infinity | -infinity | 0 |
| 4 | -infinity | -infinity | 0 |

Channels 3 and 4 are exactly zero for all 667,200 sample frames. Channels 1 and 2 both contain continuous nonzero stereo audio. This independently matches the app's on-screen results (Input 1/2 peak approximately -0.0 dBFS, RMS -12.3/-12.0 dBFS; Input 3/4 silent).

### What this establishes

1. The Android diagnostic successfully opened the named MG-30 USB Audio input stream and captured a true four-channel interleaved WAV with requested and actual channel-index mask `0xF`. The diagnostic capture path is physically working on this handset/device connection.
2. For this tested state, the active stereo signal is on USB IN 1–2; USB IN 3–4 carry no samples. The DAW's ordinary `MG-30 USB · Input 1–2 (Stereo)` route matches the measured active pair. Do not label Input 3–4 as host Loopback based on the earlier assumption.
3. If the stimulus during this take was phone/host playback with guitar and internal drum/phrase-looper sources absent, then this is the first physical evidence that the host playback return is present on USB IN 1–2 under the tested Normal + separate Loopback-enabled configuration. In that case, expose/use Input 1–2 Stereo for the host-playback return; keep Input 3–4 labelled only as Wet Sync (Dry Out).
4. The source stimulus and exact pedal setting are not encoded in the WAV or screenshot. The app was instructed immediately before this test to use Routing Mode = Normal and the separate Loopback option = ON, but the screenshot does not show the pedal's USB settings. Until the user confirms the playback stimulus and pedal setting, record the channel result as measured fact and the host-Loopback semantic as conditional rather than absolute.

### Signal-level note

The largest samples in channels 1/2 reach 0.995 full scale (about -0.044 dBFS), with many samples at that ceiling. The recorded peak is therefore very close to digital full scale. For subsequent tests, lower the host/playback or MG-30 recording level by a few dB if audible distortion or flattened peaks are present. Do not change channel mapping to solve a level issue.

### Implementation impact

- Do not keep a dedicated DAW source labelled `Loopback 3–4` on the basis of the earlier assumption.
- Maintain the four-channel raw diagnostic as an optional test tool; it has now been verified to return mask `0xF` and preserve per-channel activity data on the user's physical setup.
- For the tested active stereo pair, the existing Input 1–2 Stereo source is correct. Any later UI copy should explain that Normal + Loopback may return host playback via the normal stereo USB capture pair; do not confuse it with Wet Sync Input 3–4 or the separate pedal Loopback routing mode.
- Do not alter NAM, IR User/Third Party or Collection import, or MIDI mappings as part of this routing correction.

### Next controlled confirmation

Ask the user only to confirm two test conditions: (a) whether the audio played during this 13.9-second take was phone/host music (rather than guitar, MG-30 drums/phrase looper, or another source), and (b) whether the pedal was in Routing Mode = Normal with the separate Loopback option enabled. If both are yes, mark host playback return on USB IN 1–2 as physically verified for this device/firmware/handset setup. If not, repeat the test with phone/host music only and the stated routing.

