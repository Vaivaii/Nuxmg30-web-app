# NUX MG-30 Studio — Preset Rename & Save As implementation checkpoint

Date: 2 November 2026  
Target hardware: **Original NUX MG-30 Gen 2, firmware 6.0.x** (not MKII)  
Working branch: `feature/preset-rename-save-as`  
Base branch/commit: `feature/dark-performance-ui-polish` at `30866b9769645622024847d74a796d5b0039a04`

## Scope

This is a Preset Library-only implementation. It adds Rename and Save As controls without editing the shared `www/index.html` host, main Editor implementation, USB-MIDI/native bridge, Import/Export modules, NAM or IR transfer, IR Collection, or MIDI mappings.

The module calls the existing classic-script global functions that are already used by the Editor and Preset Library:
- `readActiveProgramScene()`
- `readPresetParts(command, program)`
- `writeHardwarePreset(program, parts)`
- `stopHardwareStatePolling()` / `startHardwareStatePolling()`

No new SysEx packet family, MIDI command, slot arithmetic, or transfer protocol was invented.

## Rename behavior

1. Resolve the selected hardware slot from the existing Preset Library slot label.
2. Confirm the pedal currently reports that slot.
3. Read all three stored scene parts through the existing `0B/00 → 0B/02` read path and validate command, slot and part headers.
4. Decode the preset name from the packed name field at bit slots 106–121.
5. Require a printable ASCII name of 1–16 characters.
6. Ask for explicit confirmation, then preserve a raw snapshot of all three original scene replies in app-local storage.
7. Update only the name field in scene part 1 and pass the three parts to the existing `writeHardwarePreset()` path.
8. Report success only when the existing stored-preset read-back compares all three payloads successfully.

No independent rename command has been identified from a hardware capture. This implementation treats rename as a rewrite of the stored preset's three existing parts with only the name field changed. The unchanged payload is checked by read-back; physical firmware behavior still needs confirmation.

## Save As behavior

1. Treat the currently active Editor edit buffer as the source, matching the existing Save-to-pedal path.
2. Read all three edit-buffer parts through the existing `0C/00 → 0C/02` path.
3. Read all three parts from the selected destination slot through the stored-preset read path. The destination name is shown in the overwrite confirmation.
4. If the destination name is blank/unavailable, still warn that its data will be overwritten; blank name is not taken as proof the slot is empty.
5. Require explicit user confirmation. Cancel sends no write frames; the reads performed before the prompt are read-only.
6. Store the destination's three raw readback parts under `mg30-preset-slot-backup-v1-<program>`, keeping the latest three snapshots for that slot. If this local backup cannot be stored, abort before writing.
7. Apply the new name to bit slots 106–121 and the visible Signal Chain order to bit slots 94–105 of the currently selected scene, matching the existing Save-to-pedal behavior.
8. Write to the chosen destination using `writeHardwarePreset(destinationProgram, parts)`. This path writes stored preset parts and invokes the existing commit/read-back routine. It does **not** send Program Change or change the active source slot.
9. Update the Preset Library name cache only after successful read-back.

The raw backup is a local snapshot for preservation/inspection; the app does not yet provide an in-app restore/import flow for this raw backup. Before overwriting a valuable slot, the user should still export a normal `.mg30patch` backup separately.

## Name and data layout

- Preset name: packed bit slots 106–121, first stored in part 1.
- Signal Chain order: 12 IDs in bit slots 94–105 of the selected scene.
- Preset slot address: explicit 0–127 program passed to the existing write helper.
- Name constraint: printable ASCII, 1–16 characters. No Unicode transliteration/truncation is performed silently.

## UI

- Two new page-scoped actions appear under the Preset Manager header: **Rename** and **Save As**.
- Save As presents all 128 slot labels and cached names; destination slot is then read from the pedal before the overwrite prompt.
- The new dialog and status styling are scoped to `#page-presets`.
- The currently active slot remains selected after Save As.

## Change commits

- `1bf9395dc5be4ab4cd9b412479127d032d974775` — add isolated packed-name, slot-readback, Save As and backup helpers.
- `21d28a910cfaf33f151ed0728807b84fc69ed739` — add helper regression tests.
- `b6ff5d820c0d726c09280c8fbcdca659d977c9e6` — add Preset Library Rename and Save As UI/actions.
- `32dfd673847d71026e0037aa39ccb74c4601b581` — correct source immutability assertion in tests.
- `f7eab67bc0513edc9eb84ace8d2bb859dae44ca3` — add page-scoped modal/action styling.
- `fc91b5446e9c414b2e103e4dea0b7b9fe952ed1c` — recheck active slot immediately before a write.
- `1cc400a3189f4f947ed0445df499825335bfca60` — position action buttons under Preset Manager header.
- `ad9ce89fedac8218627fa4452076b6b03cfacdad` — serialize against Editor, scene, navigation and connection controls.
- `6521bef2bbdc3ac46c797796700b46636090cb4d` — prevent Rename/Save As from starting during preset-name scan.

## Validation boundary

- The isolated helper tests were executed locally against a temporary copy of the helper/test logic: **7/7 passed**.
- The repository-wide `npm test` suite was not run.
- No Vite/Gradle/APK build and no GitHub Actions run was started.
- No physical MG-30 transfer test has been performed. The implementation is not yet considered hardware-validated.
- The new branch is not in the push-trigger branch list for `.github/workflows/build-apk.yml`; a build must remain opt-in via the project's explicit Build approval.

## Physical validation plan

Use only the original MG-30 Gen 2 FW 6.0.x. Start on a disposable/test slot:
1. Rename a test preset; confirm the name survives a reconnect/restart and all three scenes and parameters remain unchanged.
2. Save As to a verified empty/test destination; confirm the source slot remains active and unchanged, destination name/three scenes/chain order match the source edit buffer after a fresh read.
3. Open Save As for an occupied disposable slot, cancel at confirmation, and verify no write frames were sent.
4. Test overwrite on that disposable slot; inspect destination read-back and confirm the original destination snapshot is recorded locally.
5. Recheck Editor, USB-MIDI, NAM, IR User/Third Party, IR Collection, MIDI mappings, Import/Export and Signal Chain.

Do not test overwrite on a valuable user preset. Keep the NAM/IR paths and MIDI mapping untouched.
