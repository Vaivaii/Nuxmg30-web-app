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


## 8. Confirmed menu callback and wire-level Copy Scene path (2026-10-30)

Further disassembly completed the path from UI menu selection to the captured USB-MIDI packets:

- The scene-menu callback dispatches through the Copy Scene callback object's vtable to `0x5BA430`. Its argument is the menu option index (0 or 1), **not** the destination scene index directly.
- `0x5BA430` maps that option against the active/source scene and copies the selected source's `0x8E`-byte (142-byte) scene-data block into the destination scene's block. It then calls `0x4A6AC0` with the updated scene-data structure and sends the destination through the helper that emits CC80.
- `0x4A6AC0` serializes and writes all three scene parts in index order 0, 1, 2. Its SysEx command is `0C 01`, sent through the asynchronous MIDI helper at `0xB0E360`; the callback at `0x4A6CC0` handles `0C 03` acknowledgements. Once all three writes have completed, the target scene is selected with CC80.
- This sequence directly explains the supplied capture order: three `0C 01` messages, three `0C 03` replies, and then CC80 for the destination. The earlier `15 01` path is a different scene/state-sync path and is not used as the Copy Scene implementation.

### MG30 Studio implementation begun

Commit `2167ec51be6335c113717f746ee0c40eaa7f9927` adds the Copy Scene UI and a hardware copy routine in `www/index.html`; commit `0f24d9846b67d25b7385a1ef4d7047301cec68f7` styles the menu in `www/ui-redesign.css`.

Implemented flow:
1. Offer only the other two scene destinations based on the active scene.
2. Read the current preset/scene status; abort if the device's preset differs from the app's selected slot.
3. Ask for confirmation because the destination scene is overwritten.
4. Read all three scene parts and validate their expected response lengths and header indices.
5. Copy the source scene's packed payload to the target part, then send the three `0C 01` packets in order and wait for each matching `0C 03` acknowledgement.
6. Send CC80 for the destination scene, confirm scene/preset status, and read the destination part back for byte-for-byte payload verification before showing success.

Syntax parsing passed for both inline scripts in `www/index.html`; presence checks confirmed the menu, ACK validation, CC80 target selection, and read-back checks. **The implementation has not yet been tested on a physical MG-30; a passing APK build does not prove hardware behavior.** Build status and artifact checksum are to be appended after the build completes.


## 9. APK build record — Copy Scene implementation (2026-10-30)

- Android build workflow run [#88 / 40928213459](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40928213459) completed successfully on branch `android/ui-polish-pass-1`; `assembleDebug` and artifact upload both passed.
- Build was triggered by temporary workflow enablement commit `8c44e01c8310f7d394bb5c3dd62502ffe6cc1a25`; the push branch filter was subsequently restored by commit `75c19f54aad07becc7a80fee32e842132bdd07da`. The restored workflow blob matches the previous default configuration (`877d83759eba533b56f516fbfa99812d3bead089)); the branch is not enabled for automatic builds by default.
- Artifact: `MG30-Studio-debug-APK`, ID `12922190556`, ZIP size 3,991,519 bytes, ZIP SHA-256 `af08487e85b089b80a9c03becbcab2330d6f22189fdf609775bceca356c58d46`; expires 2026-11-12.
- Extracted APK file `MG30-Studio-Copy-Scene-Gen2.apk`, size 4,369,432 bytes, SHA-256 `d5de8040bbc0387305ccd9bdbdc59911be3d6e7c644e13d4107c0ceb1c335404`.
- Source commit for Copy Scene menu and logic: `2167ec51be6335c113717f746ee0c40eaa7f9927`; CSS styling commit: `0f24d9846b67d25b7385a1ef4d7047301cec68f7`; this protocol/build note commit is after those source changes.
- Static validation: both inline scripts parse successfully; checked presence of menu wiring, per-part ACK check, CC80 destination, and target payload read-back comparison.
- Physical MG-30 run-time validation has **not** been performed in this environment. On-device success still requires testing a source scene with different values from its target, confirming the target changes and source remains untouched, then selecting each of the six valid source/destination pairs. Existing NAM, IR Collection, and MIDI mappings were not modified by this feature.


## 10. Mobile dropdown + Copy Scene verification follow-up (2026-10-30)

User-reported behavior from Android screenshot:
- The Copy Scene popup extended beyond the left edge of the mobile screen, clipping its labels.
- After choosing a target, the app showed the generic “Copy Scene belum sepenuhnya terverifikasi” toast.

Changes made:
- CSS: constrained the Copy Scene popup to min(200px, calc(100vw - 24px)), forced border-box sizing, allowed option labels to wrap, and prevented horizontal overflow.
- Timing: after sending CC80 to select the target scene, the routine now waits 220 ms before querying active scene/preset status, matching the existing scene-switch handler's settling delay.
- Diagnostics: Copy Scene errors now report the stage (status query, scene data read, per-part 0C/03 ACK, CC80, status readback, or payload comparison) and include the concrete error. A console error record includes source, target, preset, ACK count and whether CC80 was sent; the generic toast is replaced by the actual stage/error text.
- Static checks passed for both inline scripts. CSS checks confirm bounded popup width and wrapping; source checks confirm the 220 ms settle delay, ACK checks, and destination read-back check remain enabled.

Build:
- GitHub Actions run [#89 / 40930240411](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40930240411) completed successfully from trigger commit b47bd1327e2e3e9daa2303269ebbb693c60d2ef8; assembleDebug and artifact upload both passed.
- Artifact MG30-Studio-debug-APK, ID 12921304697, ZIP size 3,991,970 bytes, SHA-256 5eb8f1cd4a05459f703d3a7b0a7835d94820618c565617d0fa745d877c1bb127; expires 2026-11-12.
- Extracted APK MG30-Studio-Copy-Scene-Mobile-Fix.apk, size 4,369,816 bytes; SHA-256 67c05ac2e2f96ca981d761d67b18b12dd566e4fc5697f048b212fd09f6dceeed.
- Source commits in this patch: mobile popup CSS ef9af2ad4ecad398e2e80a459f7a659b0e7eea37; detailed stage/error report f8a9f481e86fe7c41316d06989dcfb2bd40b8fd8; settle delay b43a8653210216f6e898ab4516d1e1f20947d326.
- Workflow push filters restored by commit 5d0b3f333f4ecfed9c91bb14784f292048f5b2ae; branch-specific automatic triggering is disabled by default again.
- Still pending: test this APK on original MG-30 Gen2 firmware 6.0.x. If Copy Scene fails again, use the new detailed on-screen stage/error instead of the previous generic toast to isolate the exact failing phase. Do not treat successful compilation as proof of hardware behavior.


## 11. Portal dropdown and safe preset alignment (2026-10-30)

Follow-up based on screenshots showing the Copy Scene menu still clipped by the editor card and a status mismatch: app-selected preset 31B vs status query reporting preset 01D.

Changes:
- Moved `sceneCopyMenu` to `document.body` during initialization. It is displayed as a fixed-position portal; its left/top are computed from the toggle button's bounding box and clamped to the viewport. It repositions on window resize and scroll, preventing ancestor overflow from clipping the choices.
- Kept the preset mismatch safety check. Instead of failing immediately, Copy Scene now asks for explicit confirmation to send MIDI Program Change for the app-selected slot, waits 360 ms, and re-queries status. It proceeds only if the device then reports the expected slot; if it still reports another slot, it stops before writing scene data.
- This does **not** assume the prior 01D response was false. It is a safe resynchronization attempt; the user must confirm the Program Change, and no scene write occurs if readback still disagrees.
- Both inline scripts parse successfully. Static checks confirm the dropdown portal, viewport position calculation, Program Change, second status query and retained target payload read-back guard.

Build:
- GitHub Actions run [#90 / 40932094023](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40932094023) completed successfully; `assembleDebug` and artifact upload passed. Trigger commit: `a38acbbfdf098825a4375de8736cc6c927784ebf`.
- Artifact `MG30-Studio-debug-APK`, ID `12922463144`, ZIP size 3,992,666 bytes, SHA-256 `1a4f3604aca541a968336162090c745fcddfb38fd12eda926241a15e879a3b80`; expires 2026-11-12.
- Extracted APK `MG30-Studio-Copy-Scene-Preset-Alignment.apk`, size 4,370,572 bytes; SHA-256 `edf0244d868989b618b83b9080a7f965ae9d25a40732127a7631707175a5a1db`.
- Source change commit: `2fc91435a9946cdcc3c0a8d3f1b918dad4974e50`. Workflow push branch filters restored by `1371679ebcf760cacd36251f8f508427109e7589`; restored workflow blob matches `877d83759eba533b56f516fbfa99812d3bead089`.
- Hardware validation remains pending. If the MG-30 still reports 01D after the user confirms Program Change to 31B, Copy Scene intentionally aborts safely; that result would need another protocol/status-byte investigation rather than bypassing the guard.


## 12. Active preset index off-by-one diagnosis (2026-10-30)

User reports the physical MG-30 contains preset 02A named R.PLEXI, while the app showed 01D and Copy Scene treated the mismatch as a hardware status error. Root-cause correction in the status parser:

- `readActiveProgramScene()` receives the SysEx body without the leading `F0` byte. In this representation, the program slot field is `reply[5]` (absolute SysEx byte offset 6); `reply[6]` is the following field (absolute offset 7). The old parser used `reply[6]`, shifting the displayed slot from zero-based slot 4 / 02A to slot 3 / 01D in the reported case.
- Changed the program parse to `Number(reply[5])`. Scene parsing remains at `reply[9]` pending independent capture evidence for that field.
- Found a runtime bug in Copy Scene's new mismatch-recovery branch: it declared the first status response with `const status` and later reassigned it after Program Change. Changed that binding to `let status` so the second status read can be processed rather than throwing when the branch is entered.
- Added `lastReportedProgram` alongside `lastReportedSceneStatus`. Hardware polling now notices preset changes independently of scene changes, updates `targetSlot`, the bank/slot indicator, and the hardware preset display, then reloads the buffer from the detected slot. This ensures the program index is not silently stuck when scene remains unchanged.
- Static checks passed for both inline scripts; slot formatting maps zero-based `3 → 01D` and `4 → 02A` as expected. Physical hardware confirmation remains required.


## 13. Active preset sync fix — APK build #91 (2026-10-30)

- GitHub Actions run [#91 / 40934489229](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40934489229) completed successfully; Android `assembleDebug` and artifact upload both succeeded.
- Source commit for the parser/polling fix: `e000d5b5c1a8c5accd1faa542173c0d5731298da`. Build trigger was temporary workflow commit `487f5fc038e7b494465af5e51467267e6db6875b`; push branch filtering was restored by `6bbb0ba6b038762675fd5973b72b5fbccd42e737` and now matches the normal disabled-by-default configuration (`877d83759eba533b56f516fbfa99812d3bead089`).
- Artifact `MG30-Studio-debug-APK`, ID `12923014115`, ZIP size 3,992,913 bytes, SHA-256 `cf75b33199b8ab94b57ce52a61a671ce4d3fc8fbecf5f854dcd472f501c56edf`; expires 2026-11-12.
- Extracted APK `MG30-Studio-Active-Preset-Sync-Fix.apk`, size 4,370,824 bytes, SHA-256 `569a4889d3c832b7ef93261eb5ef40f44f0688d1ef5b32db98d54fc976a65689`.
- Both inline scripts passed parser checks. Static checks confirmed the status slot index correction, mutable Copy Scene status result, and independent program-slot polling. No physical pedal test is available here; user must confirm R.PLEXI reads as 02A after connecting and then test Copy Scene on the correct preset.


## 14. Copy Scene runtime exception: Array.prototype.set (2026-10-30)

User reported a short-lived dialog saying “body set not function” when pressing Copy Scene. This maps directly to the previous source expression `body.set(sourcePayload,7)` in the write-parts builder:

- `readSysExPart()` returns the SysEx body produced by `waitForSysEx()`; that helper uses `Array.from(e.data)` and returns a normal JavaScript Array, not a `Uint8Array`/TypedArray.
- Normal Arrays do not have a `.set()` method, so the exception occurred before the first Copy Scene write was emitted.
- Replaced the call with `sourcePayload.forEach((value,offset)=>{body[7+offset]=value})`, which copies each payload byte into the target part while preserving the regular Array representation and all existing packet-builder/ACK code.
- Copy Scene errors now keep the toast visible for 6.5 seconds and allow up to 120 characters, making the stage/reason easier to capture. The generic toast helper accepts an optional duration; its other existing calls retain the 1.9-second default.
- Both inline scripts parse successfully; static checks confirm the failing `.set()` call is removed and per-byte copy is present. Build is being run under GitHub Actions run #92; append final artifact/checksum once completed.


## 15. Copy Scene Array payload fix — APK build #92 (2026-10-30)

- GitHub Actions run [#92 / 40935784561](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40935784561) completed successfully; Android `assembleDebug` and artifact upload passed.
- Source fix commit: `dc2891a1402f555d940b2a0e7c04322ed9b1e6a9`. Build-trigger workflow commit: `18ba41f41065122eee42bd347cacd91a22f94e46`. Workflow branch filter restored by `64bb487352308415c70539bd2aa050204ed574b8`; restored workflow blob SHA is `877d83759eba533b56f516fbfa99812d3bead089`.
- Artifact `MG30-Studio-debug-APK`, ID `12925280867`, ZIP size 3,992,958 bytes, SHA-256 `fe8b2265450cd460d1653024eca346f59008c53a321baf4313cc785146504960`; expires 2026-11-12.
- Extracted APK `MG30-Studio-Copy-Scene-Array-Fix.apk`, size 4,370,868 bytes; SHA-256 `823b4ed362605cc9a865827c030eec5aeb270930123a2a0b2e9d0825212f59e3`.
- Both inline scripts passed parser checks. Confirmed the `.set()` call is absent, per-byte payload copy is present, and the Copy Scene error toast persists for 6.5 seconds.
- Hardware validation remains pending. Try Copy Scene again using this APK; if it fails, the longer stage/error message should identify the next issue. Do not report success unless 3 ACKs, destination selection and destination read-back all pass.


## 16. Copy Scene source scene selection fix — APK build #93 (2026-10-30)

User's screenshots showed the active scene card in the editor as Scene 2 or Scene 3, but the Copy Scene confirmation still read “Salin Scene 1” and a Scene 2 → Scene 1 attempt was rejected as source and destination being identical. This confirms that Copy Scene was incorrectly trusting the scene field parsed from the `15/00` status reply; on the affected device it remained at index 0 while the app's selected scene changed.

Changes:
- Source scene is now taken from `activeSceneIndex`, the app's current scene selection driven by the scene buttons and CC80 path, instead of `status.scene` from the questionable `15/00` field.
- The first status query and post-Program-Change query still validate the hardware preset number. The source scene remains the current selected UI scene.
- After the copy writes and sends CC80, the routine no longer rejects Scene 2/3 based on the same untrusted `after.scene` field. It still checks that the hardware preset stayed the same and requires destination payload read-back to match the source byte-for-byte before success.
- Both inline scripts passed JavaScript parse checks; static assertions confirmed that the Copy Scene source is `activeSceneIndex`, the false scene-status rejection branch is removed, the preset guard remains, and the ACK + destination read-back validation remain present.

Build:
- GitHub Actions run [#93 / 40938188175](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40938188175) succeeded; `assembleDebug` and artifact upload passed.
- Source commit: `d8a5751a2e09c6205d96c1b011b3853f9ca56f6a`. Temporary build-trigger commit: `e9ddad3798b49eac4efe368f8f15341e47547867`. Workflow branch filters restored by `e8f8218161f16a0bd27c3ec615000eaba005f2e8`; restored workflow blob is `877d83759eba533b56f516fbfa99812d3bead089`, so automatic branch builds remain disabled by default.
- Artifact `MG30-Studio-debug-APK`, ID `12925423351`, ZIP size 3,993,091 bytes, SHA-256 `46c086a644319ed382970c5c8af167eef02f14ef39439172027842c9d553ab11`; expires 2026-11-12.
- Extracted APK `MG30-Studio-Copy-Scene-Source-Scene-Fix.apk`, size 4,370,996 bytes, SHA-256 `bec19f99f65db49d9bc443558dbd43da42e218cb928ecd2400c0de3fd584f2ff`.
- Physical-pedal validation is still pending. Test Scene 2 → 1, Scene 2 → 3 and Scene 3 → 1/2 using different source/target content; confirm the confirmation dialog names the selected source correctly, the source remains unchanged, and target read-back matches. If it still copies the wrong scene, collect the longer stage/error toast before changing further protocol assumptions.


## 17. Compact Copy Scene dropdown — implementation (2026-10-30)

User requested that dropdown choices be simplified to only “Scene 1”, “Scene 2”, and “Scene 3”, because the confirmation dialog already explains the copy operation and overwrite warning.

- Changed the dropdown option text from “Copy to Scene N” plus “Salin dari Scene M” subtitle to a single bold “Scene N” label. The menu still omits the currently selected/source scene.
- Reduced popup maximum width from 200 CSS px to 148 CSS px (still viewport-clamped), menu padding from 6px to 5px, gap from 5px to 4px, option padding from 8px 9px to 7px 8px, and button layout to a single compact row.
- Both inline scripts pass JavaScript syntax checks. Static checks confirm no “Copy to” prefix, no source subtitle, and 148px menu width.
- Source commits: HTML label simplification `28059bb44bec055b7866c157d643b5679e945369`; CSS compaction `dd0760be39c9f0af3cb75622d63a8cafa11d4e0c`.
- APK build [#94 / 40940168961](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40940168961) was triggered; the last checked state had `assembleDebug` still running. Artifact ID/checksum and final outcome will be appended after the run completes.
- Workflow branch filter has already been restored by commit `3a2033630447834db342c3007e4e1350e7a2c4e3`, with default workflow blob SHA `877d83759eba533b56f516fbfa99812d3bead089`; automatic builds on this branch are disabled by default.
