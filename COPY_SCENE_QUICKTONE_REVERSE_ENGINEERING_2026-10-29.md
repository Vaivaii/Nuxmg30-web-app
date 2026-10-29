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

## 5. Capture validation — three Copy Scene traces (2026-10-30)

The user supplied three USBPcap/pcapng files named for the UI operation:
- `copyscene1to2.pcapng` — SHA-256 `1fdf71f90c14941f43d680ec85a42b615dd3f35fc0056994193b4e3b0a425fb0`.
- `copyscene2to3.pcapng` — SHA-256 `882e63a0fe4020930e0b157ba81cdc6258a96532146222696fdf9fa3694a1d4c`.
- `copyscene3to1.pcapng` — SHA-256 `ed9e73ef65ca20236476a3e9c0c86f05326affb326cc610220a19cd0bf8752a8`.

The captures were decoded as USBPcap link type 249 containing USB-MIDI 4-byte event packets. The outgoing write header places `0x76` immediately after the `0C 01` command, followed by a per-message scene/part byte `00`, `01`, or `02`. In MG30 Studio's known read header shape (`F0 43 58 70 0C 00 [program] [part] …`), the same `0x76` position is the program slot byte; if that convention applies to this trace, decimal 118 maps to preset slot **30C** (zero-based indexing). Confirm the displayed preset at capture time before treating 30C as proven.

The operation portion in every trace has the same broad sequence:

1. Three outgoing 222-byte SysEx messages whose starts are:
   - `F0 43 58 70 0C 01 76 00 01 … F7`
   - `F0 43 58 70 0C 01 76 01 01 … F7`
   - `F0 43 58 70 0C 01 76 02 01 … F7`
2. Three 15-byte incoming responses with prefix `F0 43 58 70 0C 03 76 … F7`.
3. A MIDI CC80 event selecting the requested destination scene:
   - Copy Scene 1 → Scene 2: `B0 50 01`.
   - Copy Scene 2 → Scene 3: `B0 50 02`.
   - Copy Scene 3 → Scene 1: `B0 50 00`.

The CC80 destination values match zero-based scene indices and agree with the selected destination in all three filenames. In the Scene 2 → Scene 3 capture there is an additional later CC event `B0 4D 43`; it is not present in the other two traces, so do not treat it as a required Copy Scene command without another controlled capture.

### Important discrepancy with the static disassembly hypothesis

- None of these three captures contains an outgoing SysEx command `F0 43 58 70 15 01 … F7`, nor a reply `F0 43 58 70 15 02 … F7`.
- Therefore the earlier `0x4a5fd0` interpretation is not corroborated by the observed on-wire Copy Scene flow. It may be another code path, a conditional/alternate action, or an interpretation that needs revisiting. Do not implement the 15/01 request based on static disassembly alone.
- The captures instead visibly show the `0C 01` data-write sequence, `0C 03` responses, and then CC80 target-scene selection.

### Interpreting repeated payloads and reply indices

The user clarified that all three scenes already contained the same data during these captures. Therefore, identical data bodies in the three outgoing messages are expected and are not evidence of a failed copy or an anomalous serialization pattern. Do not ask the user to create different scene contents solely to explain the identical payloads.

The user further clarified the QuickTone UI workflow: the Copy Scene dropdown always lists the two scenes other than the current source. When copying Scene 1, the choices are Scene 2 and Scene 3; from Scene 2, choices are Scene 1 and Scene 3; from Scene 3, choices are Scene 1 and Scene 2. This confirms that the menu selection is the destination scene, while the current scene is the source. It does not by itself establish whether the three `0C 01` writes are the copy operation or associated scene-data synchronization.

- Within each capture, the three outgoing 222-byte `0C 01 76 [scene-index] 01 …` messages differ at the scene/part index byte (00, 01, 02), while their payload bodies are the same because the scenes were already the same.
- Between the Scene 1 → 2 trace and the other two traces, serialized write-body offsets 192 and 196 differ: `02/01` in the first trace and `04/04` in the other two. Their semantic fields are not yet decoded. Since scene contents were the same, treat this as a capture/preset/context difference to investigate, not proof of a scene-content difference.
- The three reply index sequences are:
  - Scene 1 → 2: `00, 01, 00`
  - Scene 2 → 3: `00, 01, 01`
  - Scene 3 → 1: `00, 01, 02`
  These remain worth decoding before implementing a strict per-message ACK check. They do not invalidate the observed overall sequence.

### Best next validation step

The three captures already establish the broad Copy Scene traffic sequence for the user's normal use case: three `0C 01` scene-part writes, three `0C 03` replies, then CC80 selecting the destination. The next step is to reconcile that wire-level sequence with the static QuickTone function that constructs `15 01`, because that command did not appear in these captures. Review surrounding callers/callbacks and, if needed, capture a no-copy control session to determine whether the three writes are Copy Scene itself or associated synchronization traffic. Only implement after the active wire-level command path and its success/readback semantics are understood.

## 6. Safety and scope

- No MG30 Studio source code has been modified for Copy Scene.
- No APK has been built for Copy Scene.
- Preserve working NAM transfer, IR Collection transfer, existing MIDI mappings, signal-chain ordering, and current Gen2 protocol behavior.


## 7. Follow-up disassembly correction (2026-10-30)

A closer re-read of the actual instructions corrects an earlier function-role attribution in Sections 1–3:

- VA `0x4a87b0` is **not** the Copy Scene menu-selection callback. It is a MIDI/SysEx response handler that first checks incoming bytes at offsets 4–5 for command `06 03`, reads byte 7, reads the current scene via `UserDataMG30`, and then calls `0x4a5fd0`.
- VA `0x4a5fd0` really does construct `F0 43 58 70 15 01 [arg1] [arg2] 00 00 00 00 00 00 F7` and installs callback `0x4a6100`, which checks for response command `15 02`. However, the path into `0x4a5fd0` from `0x4a87b0` is downstream of an incoming `06 03` response; it is not yet proven to be the user's dropdown-selection path.
- VA `0x4a7738` is another caller that passes `0x7F` plus a current-scene value to `0x4a5fd0`, consistent with a general scene/state synchronization path.
- The Copy Scene menu is built in `NuxInstrumentPanelMG30::mouseUp` around `0x5b13ae–0x5b157f`. The callback object is initialized around `0x5b1505` with vtable at `0xD30648`; its method targets begin at `0x5B9960`, `0x5B9980`, `0x5B99A0`, `0x5B99C0`, `0x5B99E0`, etc. This is the next concrete route to trace to identify the actual menu-result handler and distinguish it from the `06 03 → 15 01` callback path.

### Revised conclusion

The `15 01` command builder is confirmed in the executable, but its relationship to the Copy Scene dropdown is **not confirmed**. The three supplied captures still show only `0C 01` scene-data writes, `0C 03` replies, then CC80 selecting the destination. Next analysis should trace the callback object/vtable constructed at `0x5B1505` and inspect its method targets before implementing anything. No app source changes or APK builds have been made.
