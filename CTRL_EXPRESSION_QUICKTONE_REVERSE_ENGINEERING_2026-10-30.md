# NUX MG-30 CTRL / Expression — QuickTone Reverse Engineering

Date: 2026-10-30  
Target: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
QuickTone: Windows v2.6.7.16

## User-provided evidence

- Screenshot file: `1001006927.png`, SHA-256 `1fc1eb85f3347875f72490c459d4a3aa62ad277868b214a4162cd115aafa8eb6`.
- `ctrl1efx.pcapng`, 3,868 bytes, SHA-256 `a0a9a926b72151d0aebeb16a2f49b23d76e7be2a35564967e2b1e9964d5cf976`.
- `ctrl2wah.pcapng`, 3,044 bytes, SHA-256 `e86e8b4e8549b9a6a3f6ef9cc862958c776ab76398ff7c1d74e4a75480fbca1e`.

User describes the intended assignments represented by the capture names as CTRL1 = EFX and CTRL2 = WAH. The screenshot shows a QuickTone control-assignment dialog with rows numbered 1–4, choices including WAH, CLYDE, T:EFX, R:DLY and TAP, and a device diagram with matching numbered callouts. Do not yet assume a direct one-to-one correspondence between screenshot row numbers, CTRL1/CTRL2, and packet fields.

## Wire evidence from USBPcap

Both files are pcapng with interface link type 249 (USBPcap). The actual application traffic is on bulk endpoint OUT `0x02` and IN `0x82` (USBPcap transfer field 3). USB-MIDI event packets were reassembled into MIDI messages before comparison; USB enumeration/descriptor requests at the start of each file are unrelated background traffic.

### Outgoing SysEx command

Every captured setting-related OUT SysEx has the 19-byte form:

```
F0 43 58 70 13 01 01 04 08 02 aa bb cc 00 00 64 00 64 F7
```

Here `aa bb cc` are written as placeholders for the three varying bytes at absolute SysEx offsets 10, 11, and 12 (counting F0 as offset 0). The placeholders are not yet semantically identified.

Captured values:

| Capture / message order | Bytes at offsets 10–12 | Notes |
|---|---|---|
| ctrl1efx #1 | `00 00 01` | First OUT frame |
| ctrl1efx #2 | `01 00 01` | Second OUT frame, about 14 ms after #1 |
| ctrl1efx #3 | `00 00 01` | Repeated OUT frame, about 22 ms after #1 |
| ctrl2wah #1 | `00 01 00` | One OUT frame |

All other bytes in these four captured write frames are identical.

### Incoming response

Each OUT SysEx is followed by an IN SysEx with the same 15-byte content:

```
F0 43 58 70 13 03 00 00 00 00 00 00 00 00 F7
```

The response is observed approximately 1 ms after the corresponding OUT frame in these captures. This is strong wire evidence for a request/response pair. It is reasonable to label it an ACK-like response for analysis, but its detailed success semantics and whether it echoes/stores the new setting still need readback confirmation.

### Additional MIDI events

In `ctrl1efx.pcapng`, two additional USB-MIDI events occur after the second and third SysEx transactions:

```
B0 4D 37
```

This is MIDI channel 1 Control Change 77, value 55 (decimal). It is **not** present in `ctrl2wah.pcapng`. Its purpose is unknown; do not treat it as part of the confirmed SysEx payload or reproduce it without further evidence.

## Static QuickTone executable evidence

The supplied `NUX_QuickTone_V2.6.7.16_Windows.zip` contains a 32-bit PE executable `QuickTone.exe`. Static string/RTTI inspection confirms the original-MG30-specific class family, separate from MKII:

- `NuxPedalPopupMenuMG30`
- `NuxPedalSettingPanelMG30`
- `NuxPedalSetValuePanelMG30`
- A callback lambda associated with `NuxPedalSetValuePanelMG30` construction.
- `NuxMidiTransmissionMG30::getPedalSetCheck` response-check callback (a separate MKII variant also exists).

The executable also contains UI strings/options:
- `T:----`, `T:TAP`, `T:CMP`, `T:GATE`, `T:EFX`, `T:EQ`, `T:SR`, `T:MOD`, `T:DLY`, `T:RVB`, `T:SCENE`, `T:RVB HF`, `T:WAH`, `T:S.UP`, `T:S.DN`.
- A parallel `R:` list, including `R:EFX`, `R:DLY`, `R:WAH`, and similar functions.
- WAH model choices include CLYDE and other pedal models.

These are **static-code/UI evidence** of configurable functions and distinct T/R option lists. T/R may refer to Tip/Ring contacts, but that interpretation is not wire-confirmed yet. The disassembly work has identified the check callback name but has not yet established the full callback call graph or exact semantic mapping of the three changing bytes.

## Current evidence assessment

- **Wire-confirmed:** SysEx OUT command `13 01`, common payload shape, three varying data bytes, immediate `13 03` IN response, and two additional CC77/value55 events in the first capture.
- **Static-code evidence:** Original MG-30 pedal-setting UI and transmission-check classes exist; UI has multiple T:/R: assignable function lists.
- **User-reported state:** CTRL1 was assigned EFX and CTRL2 WAH for the provided captures.
- **Not established:** Which of offsets 10–12 encodes CTRL1/CTRL2, how the UI choices map to numeric values, whether command is a write or a read/set combination, whether values are preset-specific/global, meaning of CC77, and device-side readback semantics.
- **No MG30 Studio application source changes have been made.** NAM import, IR User/Collection, MIDI mapping, preset sync and Copy Scene are untouched. No APK build is appropriate for this analysis-only checkpoint.

## Next isolated captures needed

Please capture each operation separately with the same original MG-30 Gen2 and QuickTone v2.6.7.16:

1. Open the EXP & Pedal / assignment dialog and do not touch any setting; capture only panel open and any automatic device query.
2. Change only CTRL1 from EFX to WAH (or another clearly identifiable different choice), apply/save, and capture.
3. Restore CTRL1, then change only CTRL2 from WAH to EFX, apply/save, and capture.
4. Reopen the dialog and capture whether QuickTone reads settings back from the pedal.

Keep the selected preset unchanged during these captures. Note the exact before/after UI choice for each file. These differential captures should let us isolate the field for each control and determine if opening the panel triggers a separate read operation. Preserve the raw pcapng files.

Do not send guessed MIDI/SysEx messages to the pedal. Implement only after the variable fields, option enums, response and readback behavior are supported by evidence.


## User clarification — dependent control columns and WAH range (2026-10-30)

The user supplied two additional photographs and clarified the intended meaning of the dialog:

- CTRL1 is assigned to EFX. Its row displays three dependent choices: function `EFX`, effect model `DIST UNO`, and a parameter selector `LEVEL`.
- CTRL2 is assigned to WAH. Its row displays function `WAH`, pedal model `CLYDE`, and WAH-specific range controls; the user identifies this third-column setting as volume MIN/MAX.
- The third-column options are model-dependent for EFX: different effects expose different controllable parameters (for example LEVEL or DRIVE). Do not hardcode a universal effect parameter list.
- The WAH popup photo shows two sliders labeled MIN and MAX. The pictured values are MIN ending at 50 and MAX starting at 51, with the slider handles at approximately 0 and 100 respectively. Treat these as values shown in this example only, not universal defaults or device limits until confirmed from capture/code.
- The extra rows/options shown in the dialog (including T:MOD, R:EFX and TAP in the supplied photo) appear to be other assignment/control rows. Their exact relationship to the numbered hardware callouts and the SysEx byte fields still needs to be established.

### Updated UI/data model hypothesis

The control editor likely needs a dependent configuration model rather than three generic fixed dropdowns:
1. Control/function assignment (e.g. EFX or WAH).
2. Model selection when that function supports models (e.g. DIST UNO or CLYDE).
3. Function/model-specific parameter mapping (e.g. EFX LEVEL/DRIVE) or a range editor (e.g. WAH MIN/MAX).

This is a UI/data-model hypothesis grounded in the user's screenshots and explanation; exact wire-field mapping remains unproven. Keep function list, model list, parameter list, and range schema separate so later protocol evidence can bind each value without conflating them.

### Revised next captures

The next capture should focus on changing **one dependent field at a time** while keeping the preset and all other assignment fields unchanged:
- EFX model: DIST UNO → another EFX model.
- EFX parameter: LEVEL → DRIVE (or another available parameter for that model).
- WAH range: change only MIN while keeping MAX fixed, then separately change only MAX.
- If possible, open each selector/popup without changing values to identify read/query behavior.

Record the UI before/after value for each pcap. This should help identify whether the existing three changing SysEx bytes represent a control slot, a function/model enum, a parameter enum, or range data. Do not assign semantics to offsets 10–12 until these differential captures or disassembly support them.


## Authoritative user correction — built-in EXP and Signal Chain dependency (2026-10-30)

This section supersedes the earlier hypothesis above that the second column is a freely selectable model field for CTRL1.

The user clarified the exact CTRL1 behavior:

- The hardware callout/row **1** is the MG-30's built-in NUX expression pedal. It is not an external footswitch.
- For CTRL1 row 1, the first column selects the function assigned to the built-in expression pedal (example: `EFX`).
- When the function is `EFX`, the second column is **static/read-only context**, automatically reflecting the EFX block/model currently present in the Signal Chain. In the user's current preset, the Signal Chain EFX is distortion, so QuickTone displays `DIST UNO`. That model name cannot be changed from this CTRL dialog.
- The third column chooses which parameter of that already-present Signal Chain effect the built-in expression pedal controls. Examples include `DRIVE` or `LEVEL`. The available parameter choices depend on the actual effect model in the Signal Chain.
- Therefore, changing the Signal Chain EFX model can change the second-column display and may change the valid third-column parameter choices. The CTRL1 dialog does not independently select/replace the EFX model.

The separate WAH example previously shown (function `WAH`, model `CLYDE`, and MIN/MAX volume range) remains a distinct observed configuration path. Do not conflate that WAH-specific model/range editor with the CTRL1/EFX second column. The precise relationship of that WAH row to the other hardware control callouts should be checked against the UI/device diagram and captures rather than assumed.

### Corrected data-model view

For built-in expression pedal row 1 when assigned to EFX:
1. Assignment/function: `EFX`.
2. Effect identity: read-only reference to the currently active EFX block/model in the Signal Chain (e.g. `DIST UNO`), not a user-editable CTRL field.
3. Controlled parameter: user-selectable parameter supported by that current EFX block (e.g. `DRIVE`, `LEVEL`).

For a WAH assignment:
- The screenshots show a WAH model such as `CLYDE` and a dedicated MIN/MAX range popup. Keep this schema separate until more evidence confirms whether those values refer to built-in EXP travel calibration, WAH volume range, or a different assignment row.

### Impact on reverse-engineering plan

- Do **not** run a capture that attempts to change CTRL1's second column from DIST UNO to another model; the user confirms this field cannot be edited in the CTRL dialog.
- To isolate the third-column parameter enum, keep the same Signal Chain EFX model and change only the parameter (e.g. `LEVEL` → `DRIVE`).
- To investigate second-column behavior, change the actual EFX block/model in the Signal Chain in a separate controlled session, then reopen the CTRL dialog and observe whether the displayed model/available parameters follow automatically. This tests the binding, not a CTRL second-column write.
- Keep the selected preset unchanged within each comparison; record the actual Signal Chain block before/after.
- Continue to treat the three changing SysEx bytes at offsets 10–12 as unmapped until differential captures establish their meanings.


## Additional screenshot — selectable assignment function list (2026-10-30)

User supplied another photograph showing the function dropdown opened below the first-column assignment currently set to `EFX`. Visible entries in the photographed dropdown are:
- `WAH`
- `EFX` (greyed/light in this photo)
- `AMP` (greyed/light in this photo)
- `MOD`
- `DLY`
- `RVB`

The same dialog also visibly contains other configured rows/fields including `DIST UNO`, `PLEXI 45`, and `R:EFX`. The screenshot supports that the function assignment list contains multiple categories and that some entries may be disabled/unavailable in the current context (the lighter entries); exact enable/disable rules are not yet established.

Do not assume this list applies identically to all numbered controls. The user's accompanying statement says the available choices differ for controls 3 and 4, but the precise mapping of these dropdown entries to CTRL1/CTRL2 versus hardware callouts 3/4 is not fully unambiguous from the photo alone. Ask the user to clarify which numbered rows/callouts they mean before assigning the options to a control.

### Data-model implication

Represent function choices as per-control capability lists, not one universal enum shared by every CTRL/EXP input. Preserve disabled/unavailable states if QuickTone displays them, and determine whether those states depend on control identity, current Signal Chain blocks, or the current preset.


## Authoritative user clarification — hardware callouts 1, 3 and 4 (2026-10-30)

The user clarified the hardware control diagram and the behavior of the external and built-in controls. This section should be used as the current functional mapping; earlier generic assumptions that all numbered entries are the same type of CTRL should not be used.

### Callout 1 — built-in NUX expression pedal

- This is the expression pedal built into the MG-30.
- Its assignment can include functions such as WAH or EFX (as shown in earlier dialog photos).
- When assigned to EFX, the effect/model column reflects the EFX block currently present in the Signal Chain (e.g. DIST UNO); it is not freely selectable in the expression dialog.
- Its controllable parameter is selected from those supported by that active block (e.g. DRIVE or LEVEL).
- WAH has its own model/range presentation (e.g. CLYDE and MIN/MAX), as observed in the earlier screenshot. Keep semantics tied to the selected function.

### Callout 3 — external footswitch input

- This is the external NUX footswitch shown separately in the QuickTone device diagram.
- QuickTone exposes two contact assignments, `T` and `R`, with two corresponding configuration columns.
- The user confirms its supported functions are limited to:
  - Toggle on/off for a pedal/block that is currently present and active in the Signal Chain.
  - Scene up / scene down.
- Do not present the expression-style continuous parameter mapping (DRIVE/LEVEL or MIN/MAX) for this external footswitch. It is a switch input, not an expression axis.
- The meaning of the two displayed columns should be kept separate from the expression pedal's function/model/parameter columns.

### Callout 4 — CTRL integrated into the built-in Multi EFX

- This is the CTRL control associated with the MG-30's built-in Multi EFX, not the external T/R footswitch and not the built-in expression pedal.
- User-confirmed functions include:
  - Delay TAP.
  - Toggle on/off for a pedal/block.
  - Cycle scenes 1 → 2 → 3 (and repeat as supported by the device/UI).
- Do not conflate this feature with callout 3's external footswitch T/R assignments. The available function list and cycling semantics need their own capture/static-code verification.

### Evidence status and implementation constraints

- **User-confirmed functional mapping:** callout 1 is built-in expression; callout 3 is external footswitch with T/R; callout 4 is Multi EFX CTRL with TAP, block toggle, or scene cycling.
- **Previously wire-confirmed, but semantic mapping still incomplete:** command family `13 01` and response `13 03` in the two supplied `ctrl1efx.pcapng` / `ctrl2wah.pcapng` captures. Do not map these packets to callout 3 or 4 until a capture is explicitly identified with the corresponding control being changed.
- **Important naming caution:** capture filenames `ctrl1efx` and `ctrl2wah` are user labels, but the user's later clarification says physical callout 1 is the built-in expression pedal. In notes and code, use explicit names such as `builtinExpression`, `externalFootswitchT`, `externalFootswitchR`, and `multiEfxCtrl` rather than ambiguous `ctrl1` / `ctrl2` until exact QuickTone row-to-hardware mapping is captured.
- Keep independent schemas for expression assignments, external footswitch T/R, and Multi EFX CTRL. Their option lists and payloads must not be merged into one generic enum.

### Next isolated capture plan

1. **Expression / callout 1:** keep the Signal Chain EFX model fixed (e.g. DIST UNO); change only its controlled parameter (e.g. LEVEL → DRIVE). Capture separately from all other control settings.
2. **External footswitch / callout 3:** change only T assignment, then only R assignment. For each, capture one active Signal Chain block toggle and one scene up/down assignment. Note the exact T/R and function shown before/after.
3. **Multi EFX CTRL / callout 4:** capture selection of TAP, block on/off, and scene cycling independently, noting the exact resulting UI setting and pedal behavior.
4. For every group, reopen the panel and capture whether QuickTone queries/readbacks the stored setting.
5. Keep preset and Signal Chain stable except for the one deliberately changed variable in each capture.

Do not send guessed MIDI/SysEx messages. Preserve raw pcapng traces. Implement each control family only after its own command, parameter encoding, response, and readback path are established.


## Important unresolved ambiguity — QuickTone CTRL2 vs diagram callout 2/3 (2026-10-30)

The user explicitly states that the destination/meaning of **CTRL2 is not yet understood**. The NUX/QuickTone diagram is ambiguous:
- The diagram's line/illustration appears to point CTRL2 toward the external footswitch path.
- The diagram separately labels callout 3 as the external footswitch.
- In actual QuickTone external footswitch configuration, the user can only assign the two T/R contacts to (a) toggle a pedal/block currently present in Signal Chain or (b) Scene Up / Scene Down. This observed capability does not match every apparent implication of the diagram.
- Therefore, do **not** assert that CTRL2 is the external footswitch, do not equate CTRL2 with callout 3, and do not invent a separate hardware destination for CTRL2.
- Current confirmed mapping remains: callout 1 = built-in expression pedal; callout 3 = external footswitch T/R; callout 4 = Multi EFX CTRL (per user's direct clarification). **CTRL2's physical destination / relationship to callouts remains unresolved.**

### Evidence needed to resolve CTRL2

1. Capture a baseline with QuickTone open and the pedal connected, then change only the UI item explicitly labeled CTRL2 (not a guessed row/callout) and save.
2. Observe the actual MG-30 hardware response: which physical input/control changes behavior, if any. Test only with harmless assignments and do not infer from diagram artwork alone.
3. Compare the outgoing SysEx and incoming response with captures for callout 1 expression, callout 3 external T/R, and callout 4 Multi EFX CTRL.
4. If possible, inspect QuickTone UI labels/tooltips and MG30-specific handler call graph for CTRL2. Keep UI identifier, diagram callout number, and physical connector as separate identifiers until linked by evidence.

### Naming rule

Until proven, use:
- `quickToneCtrl2Ui` for the UI element called CTRL2,
- `diagramCallout2` for the diagram's number 2,
- `externalFootswitchCallout3` for the known external footswitch,
- `multiEfxCtrlCallout4` for the known Multi EFX CTRL.

Do not collapse these into a shared `ctrl2` field in application data or protocol code.


## Numbering clarification from user (2026-10-30)

The user clarified that their terms CTRL1, CTRL2, etc. refer to the numbered controls as shown in QuickTone and the NUX illustration. They are not proposing two unrelated numbering systems. The unresolved question is the actual physical function/destination of numbered **CTRL2**: the diagram appears to route it toward the external footswitch path, but the user's observed external footswitch T/R configuration only supports active Signal Chain pedal/block on/off and Scene Up/Down. Keep the shared numbered identity (CTRL2 / number 2) while marking its physical destination and semantics as unresolved. Do not rename it as two separate entities merely because the diagram is ambiguous. Resolve by dedicated capture and observed hardware behavior.


## User hypothesis — CTRL2 may be a second expression assignment (2026-10-30)

The user proposes that **CTRL2 may also be an expression-pedal-related control**, rather than the external footswitch, because its configuration columns look the same as CTRL1's. This is a plausible working hypothesis and should now be tested before treating CTRL2 as an external footswitch mapping.

Reasoning grounded in the user's observations:
- CTRL1 and CTRL2 appear to expose the same dependent column structure (function such as WAH/EFX, a related effect/model display, and a function-specific parameter/range control).
- External footswitch callout 3 has a distinct T/R configuration with the observed restricted actions: active Signal Chain block on/off and Scene Up/Down.
- Therefore, the matching CTRL1/CTRL2 editor structure is more consistent with two expression-like assignments than with CTRL2 being the same T/R external footswitch editor.

Status:
- **Working hypothesis:** CTRL2 is expression-related (possibly a second expression assignment/input).
- **Not confirmed:** whether CTRL2 maps to a second physical expression input, an alternate/internal expression controller, or another expression assignment path.
- **Not confirmed:** whether MG-30 hardware exposes two independent expression sources and whether both are simultaneously usable.
- The diagram's apparent line toward the external footswitch remains ambiguous and must not override the matching UI structure or the user's observed external T/R limitations.

### Targeted experiment to test the hypothesis

1. Set CTRL1 to a recognizable expression assignment (e.g. WAH with a distinctive MIN/MAX range).
2. Set CTRL2 to a different recognizable expression assignment (e.g. EFX with a different parameter or WAH with a clearly different range), if QuickTone permits.
3. Capture USBPcap while changing only CTRL2, leaving CTRL1 and external T/R untouched.
4. Observe which physical input/pedal movement changes the parameter on the MG-30. Test the built-in expression pedal and any external expression pedal input independently if available; do not assume either is CTRL2.
5. Reopen the panel and check whether CTRL1 and CTRL2 values are independently read back and retained.
6. Compare CTRL2's SysEx command/response with CTRL1's known `13 01` / `13 03` transaction and with external T/R changes.

If there is no external expression pedal connected, the protocol capture can still reveal whether CTRL2 has a distinct stored assignment, but cannot alone prove the physical input destination. Do not claim the hardware has a second expression input without direct behavior evidence or a reliable QuickTone call graph.

Naming: retain the UI names CTRL1 and CTRL2. Mark CTRL2 as "expression-related hypothesis" in notes/UI planning until verified. Do not merge it into external footswitch T/R.


## User scope decision — prioritize controls 1, 3 and 4; retain CTRL2 (2026-10-30)

The user has clarified the practical scope for this milestone:

- CTRL2 is treated as the assignment for an additional expression pedal. The user does not own that additional expression pedal, so they cannot perform physical response testing for CTRL2.
- We do **not** need to continue investigating or proving CTRL2's physical behavior in the current milestone.
- Keep CTRL2 present and retain its configuration/options in the app; do not remove it, repurpose it as external footswitch, or block the feature work because its physical input cannot be tested.
- Focus implementation and validation on:
  1. **CTRL1 / callout 1:** built-in expression pedal assignments.
  2. **CTRL3 / callout 3:** external footswitch T/R assignments (active Signal Chain block ON/OFF and Scene Up/Down).
  3. **CTRL4 / callout 4:** Multi EFX CTRL actions (Delay TAP, block ON/OFF, scene cycling 1–3).
- For CTRL2, retain the UI/configuration path as supported by QuickTone evidence, but clearly record that physical input response is not hardware-validated because the user lacks the additional expression pedal. Do not claim the second expression input has been physically tested.
- The milestone objective is the ability to change each numbered CTRL assignment in MG30 Studio, prioritizing 1/3/4. CTRL2 remains present as a retained configuration item even if physical operation cannot currently be verified.

### Revised acceptance plan

- CTRL1: verify assignment/function changes and dependent parameter controls using the built-in expression pedal; confirm write ACK and device readback.
- CTRL3: verify T and R assignments independently for block ON/OFF and Scene Up/Down; hardware-check each external footswitch action if available.
- CTRL4: verify TAP, block ON/OFF and scene cycling 1–3 independently; confirm correct physical behavior.
- CTRL2: preserve its configuration UI and protocol path where evidence supports it; defer physical input-response validation. Do not let this missing hardware block CTRL1/3/4.


## Differential capture — CTRL1 EFX parameter LEVEL → DRIVE (2026-10-30)

User supplied `ctrl1leveltodrive.pcapng` for the isolated CTRL1 parameter-selection experiment. The capture label and preceding instruction identify the intended UI change as LEVEL → DRIVE with the Signal Chain EFX model kept fixed. Treat this UI operation as user-reported context; the packet itself does not contain readable labels.

- File size: 3,044 bytes.
- SHA-256: `5edda84a0144e3ec76cc94b65e7ea2ed850aeb90ec4a893748df4d051871dd5d`.
- Capture contains 22 pcapng blocks; USBPcap interface link type 249.
- Application MIDI traffic: one bulk OUT transfer on endpoint `0x02` (USB-MIDI SysEx) and one bulk IN transfer on endpoint `0x82` (USB-MIDI SysEx response). No other setting transaction or MIDI CC is present.

### Exact wire payload

OUT request (19-byte SysEx):

```
F0 43 58 70 13 01 0A 07 04 02 01 03 00 00 00 64 00 64 F7
```

IN response (15-byte SysEx):

```
F0 43 58 70 13 03 00 00 00 00 00 00 00 00 F7
```

The IN response is byte-for-byte identical to the response observed after the earlier `ctrl1efx.pcapng` writes. The response follows the OUT request by 1,424 pcapng timestamp ticks; this interface uses the pcapng default microsecond timestamp resolution, so the observed interval is approximately 1.424 ms.

### Differential comparison with the first CTRL1 EFX write

Comparing this OUT request to `ctrl1efx.pcapng` message #1 (`F0 43 58 70 13 01 01 04 08 02 00 00 01 00 00 64 00 64 F7`), exactly six SysEx byte positions differ (offsets count from `F0` as offset 0):

| SysEx offset | Previous CTRL1 EFX write | LEVEL → DRIVE capture |
|---:|---:|---:|
| 6 | `01` | `0A` |
| 7 | `04` | `07` |
| 8 | `08` | `04` |
| 10 | `00` | `01` |
| 11 | `00` | `03` |
| 12 | `01` | `00` |

All other bytes are identical, including the `13 01` command prefix, offset 9 (`02`), offsets 13–17 (`00 00 64 00 64`), and `F7` terminator.

### Evidence assessment

- **Wire-confirmed:** changing the CTRL1 EFX parameter as captured produces a distinct `13 01` payload; the six differing bytes are at offsets 6, 7, 8, 10, 11 and 12. This is the first differential evidence for the EFX parameter-selection operation rather than merely repeating the earlier CTRL1 assignment frame.
- **Wire-confirmed:** the device returns the same fixed `13 03` response, approximately 1.424 ms later.
- **Wire-confirmed:** this trace contains no `B0 4D 37` / CC77 event and no separate readback payload.
- **Not established:** the semantic meaning of each changed byte, which of them encode the parameter enum versus control/function identifiers, or whether the `13 03` response means accepted, persisted, or read back. Do not yet hardcode `01 03 00` as a DRIVE enum without another differential capture or static-code confirmation.
- **No application source changes:** this remains protocol analysis only. Do not modify CTRL UI/protocol code or build an APK from this capture alone.

### Next evidence needed

1. Reopen the CTRL1/EXP panel after the LEVEL → DRIVE write and capture the panel-open/read operation without changing any field. This is needed to identify whether QuickTone performs device readback and what response carries the selected parameter.
2. If the panel readback is established, capture one other parameter choice on the same fixed Signal Chain EFX model (only if available) to isolate the parameter enum from the control/function bytes.
3. Keep the selected preset and active Signal Chain EFX model fixed; do not alter CTRL2/3/4 during this test.

Preserve this raw pcapng trace as the reference for the CTRL1 parameter-selection operation.