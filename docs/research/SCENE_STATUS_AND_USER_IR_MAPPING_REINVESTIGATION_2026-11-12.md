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
