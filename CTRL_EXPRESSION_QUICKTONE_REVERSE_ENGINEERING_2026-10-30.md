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
