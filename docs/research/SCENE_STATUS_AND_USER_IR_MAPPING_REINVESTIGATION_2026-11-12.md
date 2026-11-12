# MG-30 Gen 2 Scene Status Parser Correction and User IR Cut Reinvestigation

Date: 2026-11-12  
Target: Original NUX MG-30 Gen 2 firmware 6.0.x (not MKII)  
Branch: `fix/ir-user-cut-scene-sync`

## User feedback that invalidated Build #702

The user reported that the previous APK made no perceptible change. Build #702 is therefore not accepted as a fix. This follow-up re-opened the executable reverse-engineering and removed the unsupported IR parameter-index swap.

## Confirmed root cause: active Scene byte was off by one

QuickTone 2.6.7.16 status query:
- Request builder at VA `0x4A5E10` prepares `F0 43 58 70 15 00 F7`.
- Reply callback at VA `0x4A5F30` validates command bytes at raw frame offsets 4 and 5 (`15 02`).
- It then copies five response fields from raw frame offsets 6, 7, 8, 9, and 10, and sends each to the five UserDataMG30 setters.

The relevant UserDataMG30 setters were disassembled:
- `0x4B1FD0` stores the first response field at UserData offset `+0x1c+0`.
- `0x4B1FE0` stores the second at `+0x1c+1`.
- `0x4B1FF0` stores the third at `+0x1c+2`.
- `0x4B2000` stores the fourth at `+0x1c+3`, then changes the active-scene data pointer: scene 0 → base, scene 1 → base + `0x8e`, scene 2 → base + `0x11c`.
- `0x4B2060` stores the fifth at `+0x1c+4`.
- Getter `0x4B21A0` returns the fourth field (`+0x1c+3`) as the current Scene.

MG30 Studio's `waitForSysEx()` strips the outer `F0` and `F7` before resolving the response. Therefore the five QuickTone fields become body indexes 5 through 9, and the active Scene (field 3, the fourth field) is **body[8]**. The existing app parser used `reply[9]`, which is field 4, not the Scene. This is a definitive off-by-one parser bug.

The parser is now isolated in `www/mg30-scene-status.js` and imported by the live `readActiveProgramScene()` path. The same pure function is imported by unit tests. A fixture with field3=2 and field4=0 returns Scene 3; the prior parser would have returned Scene 1. Program remains body[5].

## Confirmed correction: inbound CC80 is not the active Scene status

QuickTone's Copy Scene wire path writes scene parts using `0C 01`, waits for `0C 03`, then sends CC80 to select the destination scene. This command path does not establish that an incoming CC80 value is a status report.

The old app handler directly assigned `activeSceneIndex=value` from any incoming CC80. That is unsafe: the incoming CC80 can be an echoed/issued scene-selection command, not a verified hardware status. It was removed. Incoming CC80 now increments the scene revision and schedules a response-gated `15 00` status query; only the matching `15 02` response can update the active scene. A refresh waits until any in-flight buffer/status read has settled. Stale poll and stale scene-buffer revision guards remain.

## IR User High Cut / Low Cut: unresolved, do not guess

The preceding patch swapped Third-party Low Cut and High Cut parameter indexes without independent wire-level proof. The user reported no change. That swap and its speculative legacy-draft remapping have been removed, restoring the original shared descriptor behavior.

What is established:
- QuickTone's original MG-30 parameter panel code at VA `0x56826D` constructs a control labeled “Low Cut”; VA `0x568418` constructs the “High Cut” control. The Third-party panel has separate Low Cut / High Cut controls.
- QuickTone has a three-parameter change handler at VA `0x588270`. It selects one of three parameter identifiers stored in object bytes `+0x44`, `+0x45`, or `+0x46`, and forwards the selected identifier/value through its controller send routine.
- The supplied pcapng files in this project capture IR User / Third-party resource transfer (10/09/11) and Collection transfer (6A/6B/6C). They do **not** contain a controlled Low Cut-only and High Cut-only knob movement trace.
- Thus, these files cannot establish which of the three Third-party control IDs belongs to Low Cut and High Cut. The static UI labels and the current app's global MIDI/CC table are not enough to assert a reversed or shifted mapping.
- The global CC mapping and packed-scene parameter slot tables must remain untouched until the per-control IDs are established.

No User IR cut mapping change is shipped in this correction. The current app keeps the existing visible parameter order and shared index mapping while the QuickTone parameter-ID assignment is investigated. Do not describe this IR issue as fixed yet.

## Regression and validation added in this revision

- `tests/mg30-scene-status.test.js` imports the exact parser used by the app and tests Scene 1, Scene 2, Scene 3, a Scene 3 / field4=0 regression fixture, short replies, wrong headers, non-7-bit data, and invalid scene values.
- `tests/ir-user-cut-scene-sync.test.js` now verifies the exact parser is used, CC80 does not directly set the scene, scene refresh waits for concurrent reads, stale read guards remain, and the speculative IR index swap is absent.
- Android build validation will be recorded only after the current branch head passes the full CI test suite and Gradle build.
- Even a passing build does not replace physical MG-30 validation.

## Physical validation required after the new APK is approved

1. Connect while hardware is active on Scene 2; app must show Scene 2 immediately after status readback.
2. Connect while hardware is active on Scene 3; app must show Scene 3.
3. Use external pedal Scene 1 → 2 → 3 → 1; app must follow after the authoritative 15/02 status response, not from CC80's value.
4. Confirm the app no longer snaps to Scene 1 after the next 1.5-second poll.
5. For IR User cut controls, do not claim success until each control's outgoing MIDI CC has been captured separately from QuickTone with a known baseline: move Low Cut only, restore, move High Cut only, and compare exact event bytes. Then add an executable fixture for the proven mapping.


## Further QuickTone disassembly pass (after reconnect)

The full executable disassembly was rebuilt locally from the supplied QuickTone executable. The Low/High Cut control creation path was followed further:

- The UI constructor at VA `0x56826D` passes the exact UTF-8 label string `Low Cut`; the constructor at VA `0x568418` passes `High Cut`.
- The associated label/default strings at `0xD2CFCC`, `0xD2CFE4`, `0xD2CFD4`, and `0xD2CFF0` were mapped through the PE `.rdata` section and confirmed as `Low Cut`, `High Cut`, `Low Cut`, and `High Cut`. The third string in each control setup is `Regular`.
- QuickTone's event callback at VA `0x588270` compares the event's control pointer against three separate object members at `+0x54`, `+0x58`, and `+0x5C`. It selects the matching parameter ID from byte offsets `+0x44`, `+0x45`, and `+0x46`, respectively, then calls `0x4B2410` with that ID and the new value.
- Function `0x4B2410` matches the supplied ID against parameter IDs in the device's parameter buffer and updates the matching packed parameter value. This confirms those bytes are actual parameter identifiers, not UI indexes or labels.
- The widget constructor at `0x90B450` only wraps/copies the provided string; it does not assign the MIDI parameter ID. The ID source is part of the parent Third-party IR model descriptor/configuration object and is copied into the event owner by the model/controller setup path.
- The remaining reverse-engineering target is now precise: trace the parent Third-party IR descriptor initialization and its three ID bytes, then correlate the descriptor's control-pointer ordering with Low Cut / High Cut / Level. The static captures still contain no controlled cut-knob movement, so no numeric ID is yet proven for either cut.

## Build #706 artifact verification

- Workflow: [Build #706](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43135844178), source head `c6fb909db714050d8765fc5311f333b51d99729d`.
- Regression suite: **410 passed, 0 failed**.
- Vite production bundle: passed.
- Capacitor Android generation: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL**.
- Artifact ID: `13907168493`; workflow artifact ZIP SHA-256 `ae0e3e195a2ce557f40c5f346593c3451635f8d225d10d20ae933ff04513607f`.
- Downloaded APK extracted from that exact artifact: `4,653,552 bytes`; SHA-256 `f912cf1ceb9a5cd44c620980b51026578acd3547ce406ff03c79809a21746845`.
- ZIP integrity and APK ZIP integrity both passed. The APK's packaged `assets/public/index.html` was inspected and contains the `body[8]` status-field comment plus the parser implementation embedded as a Vite data-URL module. The APK's compiled source therefore includes the corrected parser.
- This is a verified build artifact, not a release candidate for the user's reported IR Cut problem. No hardware test has been performed. Do not send it as a final fix while the IR cut parameter IDs remain unproven and while external pedal scene behavior has not been confirmed on the user's physical Gen 2 unit.



## Descriptor source tracing pass #2 (continued reverse engineering)

A further call-graph pass narrowed the parameter-ID source without guessing a control order:

- `0x4ABE00` obtains the model descriptor via `0x4B5750` before building the model/UI state used by the controller.
- `0x4B5750` parses the supplied model definition into an internal model object, then calls `0x4B5EC0` three times to copy one descriptor template into three scene-specific blocks at destination offsets `+0x04`, `+0x92`, and `+0x120`. The third argument is respectively 0, 1, and 2.
- `0x4B5EC0` copies the model descriptor fields, including parameter-ID bytes `+0x44..+0x46`, into each scene block. It also selects one of three 16-bit source values at offsets `+0x86`, `+0x88`, or `+0x8A` according to the scene index for a separate 12-byte transformation. This supports the interpretation that the IDs originate in the parsed model-definition descriptor and persist through scene-block cloning.
- The UI constructors `0x56826D` / `0x568418` still only establish the visible Low Cut / High Cut controls. The event handler's three IDs are inherited from the model descriptor; this pass did not establish which ID byte/control-pointer member is Low Cut versus High Cut versus Level.
- The current descriptor parsing route is not evidence that any specific numeric ID corresponds to Low Cut or High Cut. No application parameter remap was made. Next step is to identify the exact model-definition source passed into `0x4ABE00` for the Third-party IR entry, or capture isolated knob changes from QuickTone. 

This pass is static disassembly only. It does not supersede the hardware/capture requirements above.

## IR model-specific parameter-slot correction from the supplied USB-MIDI captures

The user clarified that the controls are shifted not only on Third-party/User IR but also on factory IR models that do not expose MIC and MIC POSITION. I re-opened the supplied pcapng files and compared the actual USB-MIDI event packets with the app's shared `parameterControls()` / `MIDI_PARAM_CC` / `KNOB_SLOTS` logic.

### Direct capture evidence

USB-MIDI event packets use the 4-byte USB-MIDI event framing; the captured CC events below are decoded from the packets, not inferred from the screenshot:

- `iruser.pcapng` packet 22 contains `B0 42 00`, `B0 45 27`, and `B0 46 00` — MIDI CC decimal 66 value 0, CC 69 value 39, CC 70 value 0.
- `ircolectionmenu.pcapng` packet 22 contains `B0 42 00`, `B0 45 00`, and `B0 46 64` — CC 66 value 0, CC 69 value 0, CC 70 value 100.
- `deluxecapt.pcapng` packet 22 includes `B0 42 02`, `B0 43 01`, `B0 45 00`, and `B0 46 64` — CC 66, 67, 69, and 70 are present in the factory-cab setup. CC 68 is not present in that particular emitted event batch, so this capture alone does not prove its value.
- The capture packet list contains no isolated user knob-turn experiment. The values above are emitted state/setup batches, so they prove the participating CC identifiers but do not by themselves label each of the three Third-party controls by value.

### Mapping conclusion and scope

- The Third-party capture consistently uses CC 66, 69, and 70 for its three-parameter state batch. The app's previous compact mapping `[0,1,2]` sent/read CC 66, 67, and 68 instead. This is a concrete index mismatch. Third-party controls are now assigned hardware parameter indexes `[0,3,4]`, which route through the existing IR CC list to CC 66/69/70 and through the existing IR packed-slot list to slots 76/79/80.
- Factory IR models 0–7 retain the full five-control order `MIC, POSITION, LEVEL, LOWCUT, HIGHCUT` on indexes `[0,1,2,3,4]`.
- Factory IR models 8 onward that expose only `LEVEL, LOWCUT, HIGHCUT` now use indexes `[2,3,4]`, not compact `[0,1,2]`. This preserves the hardware's MIC/POSITION-reserved positions while hiding those controls in the UI. It routes through existing CC indexes 2/3/4 and packed slots 78/79/80.
- Third-party is model index 19 in the IR list and uses its captured special layout `[0,3,4]`; it is intentionally not treated as a generic factory IR.
- The global `MIDI_PARAM_CC` arrays and `KNOB_SLOTS` tables are unchanged. No NAM, MIDI mapping, IR import, IR Collection, or resource-transfer code was modified.
- `legacyIndex` is now retained separately from the hardware `ccIndex`, so saved local drafts continue to map by their original visible parameter order while device reads/writes use the model-specific hardware slot.

### Validation status

- Added regression tests for Third-party `[0,3,4]`, factory no-MIC/POSITION `[2,3,4]`, and unchanged global CC/packed-slot tables.
- These mappings are grounded in the supplied capture CC IDs and the existing model-specific UI layouts. A controlled one-knob-at-a-time physical QuickTone test is still the strongest final confirmation of each label-to-ID association, especially LEVEL versus the two cut controls.
- CI build and full tests are pending for the new mapping commit. Do not call this correction verified until that workflow succeeds; physical MG-30 Gen 2 testing remains required.

## Build #708 — model-specific IR parameter mapping validation

- Source commit tested: `783843064b31ca976dba8729ea133b7ddf6a38bd` (includes code mapping commit `177061b2cde14f6d2d24816c029f666b9401a4ba` and mapping regression tests).
- Workflow run #708: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43142151022 — conclusion `success`.
- Protocol regression suite: **412 passed, 0 failed**.
- Vite production build: passed; Capacitor Android generation: passed; Gradle `assembleDebug`: **BUILD SUCCESSFUL**.
- Artifact ID `13909857226`; workflow ZIP digest `sha256:a9f61685582071b91f5c54b3bccc9374a8f32c380b9a85824450ce4c15d73e4e`.
- Extracted APK size: `4,655,144` bytes. APK SHA-256: `25b54c139696c782852b8899405de52efd3d17b402a668a502548d4e85133b09`.
- ZIP integrity passed for both workflow artifact and extracted APK.
- Inspected the exact APK's `assets/public/index.html`; it contains the compiled source markers for `modelIndex===19?[0,3,4]`, `modelIndex>=8?[2,3,4]`, and `legacyIndex`.
- This APK is the IR mapping test candidate for the user to validate on an original MG-30 Gen 2 / firmware 6.0.x. CI does not emulate the physical MG-30; real-device confirmation is still pending. In particular, confirm Third-party LEVEL/LOWCUT/HIGHCUT and factory IR models without MIC/POSITION for both knob writes and hardware readback.

## Follow-up: Third-party LEVEL-only correction from physical Build #708 test

The user physically tested Build #708 on the original MG-30 Gen 2 and reported:
- Factory IR models without MIC/POSITION: mapping is correct.
- Third-party LOWCUT and HIGHCUT: both are correct.
- Third-party LEVEL: still incorrect / not responding correctly.

This physical result isolates the remaining defect to the Third-party LEVEL index. The Build #708 mapping `[0,3,4]` had correctly placed LOWCUT and HIGHCUT on hardware indexes 3/4 but incorrectly placed LEVEL at index 0. The correction is now `[2,3,4]` for every IR model without MIC/POSITION, including Third-party:
- LEVEL: hardware index 2 → MIDI CC 68 → packed buffer slot 78.
- LOWCUT: hardware index 3 → MIDI CC 69 → packed buffer slot 79 (unchanged).
- HIGHCUT: hardware index 4 → MIDI CC 70 → packed buffer slot 80 (unchanged).

This supersedes the earlier Build #708 mapping note that assigned Third-party LEVEL to index 0 / CC 66 / packed slot 76. The CC 66 event in the original pcap captures is not sufficient to label that parameter as LEVEL; the user's direct device test is stronger evidence for the actual control semantics. Do not revert the `[2,3,4]` layout for Third-party.

Code change: `www/index.html` now applies `[2,3,4]` uniformly to IR model indexes 8 onward; `legacyIndex` continues preserving old local draft names/order. Regression tests explicitly assert that Third-party LEVEL uses index 2 while LOWCUT/HIGHCUT stay on indexes 3/4, and that the global CC and packed-slot tables are unchanged.

Validation: implementation and regression test commits are now on `fix/ir-user-cut-scene-sync`. CI for this follow-up is pending; no Build #709+ APK is approved until the exact latest commit passes all tests and Android build. The physical test should next verify Third-party LEVEL write and readback, then recheck LOWCUT/HIGHCUT and factory no-MIC models.
