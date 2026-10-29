# MG-30 Gen2 QuickTone Copy Scene — static reverse-engineering notes

Date: 2026-10-29
Target application: NUX QuickTone Windows 2.6.7.16
Device target: original NUX MG-30 Gen2, firmware 6.0.x (not MKII)
Status: code path found by static disassembly; no MG30 Studio application source changes have been made for Copy Scene, and no APK build was triggered for this investigation.

## 1. UI path that opens Copy Scene

QuickTone has visible strings `Copy Scene Tip`, `Scene 1`, `Scene 2`, `Scene 3`, and menu labels `Scene:1`, `Scene:2`, `Scene:3`. It also includes an image asset `Scene_Button_Copy_N.png`.

In the `NuxInstrumentPanelMG30::mouseUp` handler, around VA `0x5b13ae–0x5b157f`, the code checks whether the clicked component matches the instance field at `[this+0x1bc]` (the Copy Scene button area). It reads the current Scene index through the UserDataMG30 singleton (`0x4b1110` followed by getter `0x4b21a0`) and creates a menu excluding the current source scene:
- Source/current Scene index 0: labels `Scene:2` and `Scene:3`.
- Source/current Scene index 1: labels `Scene:1` and `Scene:3`.
- Source/current Scene index 2: labels `Scene:1` and `Scene:2`.

The menu is opened through helper `0x5c7070`. The associated selection callback is at VA `0x4a87b0`. It reads the chosen menu result (byte at the returned item/result structure offset +7), reads the current scene again, and calls `0x4a5fd0` with the chosen value first and current scene index second. This call chain connects the Copy Scene menu choice to a device command; this is not just a decorative UI label.

## 2. Device command assembled by the selection handler

VA `0x4a5fd0` constructs a 15-byte SysEx request in a stack buffer and submits it through QuickTone's asynchronous MIDI/SysEx send helper `0xb0e360`. The byte writes are visible in the disassembly:

- `[ebp-0x20..-0x1d]`: `F0 43 58 70`
- `[ebp-0x1c..-0x1b]`: `15 01`
- `[ebp-0x1a]`: first argument, the chosen scene/menu value
- `[ebp-0x19]`: second argument, the current/source scene index returned by UserDataMG30
- `[ebp-0x18..-0x13]`: six zero bytes
- `[ebp-0x12]`: `F7`

Thus the request shape from static code is:

```
F0 43 58 70 15 01 [chosen-scene-value] [current-scene-index] 00 00 00 00 00 00 F7
```

The ordering strongly indicates chosen/destination scene value first and current/source scene index second because the selection callback passes the chosen menu value as argument 1 and current scene as argument 2. The exact numeric encoding of the menu result (and whether it maps directly to zero-based Scene indices) still needs to be confirmed from the returned menu item representation and/or an actual USB capture. Do not hardcode this field mapping into the MG30 Studio app until validated.

## 3. Reply / acknowledgement path in QuickTone

The callback used by `0x4a5fd0` is at VA `0x4a6100`. It checks for a reply with the MG-30 header and command prefix `43 58 70 15 02`, reads response bytes at offsets 6 and 7, updates the UserDataMG30 state through calls at `0x4b1fe0` and `0x4b2280`, and schedules a UI/state update. This is evidence of a specific reply path associated with the `15/01` request, not just the general active-scene query.

Important distinction: MG30 Studio's existing `readActiveProgramScene()` request is `43 58 70 15 00`, which is the status/query form. That existing query must not be mistaken for the Copy Scene command `15 01`.

The same helper `0x4a5fd0` has another caller that passes a `0x7F` value, so the helper may serve a broader scene/preset sync use too. The Copy Scene callback at `0x4a87b0` is nevertheless a direct, statically confirmed caller with a selected menu value plus the current scene index.

## 4. What is established vs. still unverified

Established by executable disassembly:
- The actual Copy Scene click branch in `NuxInstrumentPanelMG30::mouseUp`.
- The target scene menu excludes the active/source scene.
- The menu result flows into `0x4a5fd0`.
- The function builds a SysEx request with command bytes `15 01`, two scene-related bytes, six zero bytes, and `F7`.
- The callback expects the reply prefix `15 02` and updates QuickTone's scene/preset state.

Not yet established by a Copy Scene USB capture:
- The actual on-wire bytes for each UI selection.
- The exact numeric mapping from `Scene:1/2/3` to the chosen-scene byte.
- Whether additional preset/current-scene context or subsequent commands are sent by a secondary callback path.
- Whether MG30 Studio should update local state, request readback, or wait for a specific ACK before showing success.

## 5. Next safe validation step

Capture only a Copy Scene operation in QuickTone for the original MG-30 Gen2: start on Scene 1, open Copy Scene, choose Scene 2, and preserve both outgoing and incoming SysEx. Repeat a second case with a different source/destination pair. Compare the trace to the statically observed request shape `F0 43 58 70 15 01 … F7` and reply prefix `F0 43 58 70 15 02 … F7`. This verifies the numeric scene indices and acknowledgement before implementation.

## Safety and scope

- No source code in MG30 Studio has been modified for this feature.
- No APK has been built for Copy Scene.
- Preserve the working NAM transfer, IR Collection transfer, existing MIDI mappings, signal-chain ordering, and existing Gen2 protocol code while implementing after validation.
