# QuickTone Effect Pedal Switch Inventory — 4 November 2026

Target: **NUX MG-30 original Gen 2, firmware 6.0.x — not MKII**  
QuickTone source: user-provided `NUX_QuickTone_V2.6.7.16_Windows.zip`  
Executable extracted: `QuickTone.exe` (190,296,504 bytes; PE32 Windows GUI executable)

## Scope correction

The previous preliminary inventory mistakenly examined AMP models. That does not answer the user's request. The present inventory excludes AMP entirely and focuses on stomp/FX model panels: EFX/drive, modulation, delay, compressor, EQ, reverb, wah/pitch, and related effects.

## Method

- Parsed the embedded QuickTone panel catalogue containing model keys and per-panel `array` entries.
- Inspected each effect control's `elementType`, `elementImage1/2`, `languageKey`, `midiCC`, and `parameter1/2/3`.
- Classified explicit `Toggle_Open/Close` and `Switch_Open/Close` image pairs separately from `Light_Open/Close` status indicators and `Nail_Normal/Press` pedal footswitch/bypass graphics.
- Compared a second near-duplicate panel catalogue; the six effect candidates below are repeated there with the same names, control image pairs, and stored `midiCC` fields.
- The QuickTone `midiCC` field is recorded exactly as embedded. It must not automatically be treated as a verified physical MIDI CC or converted to a hardware CC without capture/readback confirmation.

## A. Explicit switch/toggle image controls found in the MG-30 effect catalogue

These are the strongest candidates because their panel-control records use explicit two-image switch/toggle assets rather than rotary-knob assets.

| Effect family | QuickTone model | Switch evidence | Stored `midiCC` | `languageKey` / label evidence | Initial interpretation |
|---|---|---|---:|---|---|
| EFX / Boost | **12. KATANA** | `elementType=6`; `AmpParts__Toggle5_Open_png` / `AmpParts__Toggle5_Close_png` | 0 | `EFX_BOOST` resolves to **BOOST** | Explicit Boost toggle |
| Modulation / pitch | **13. HARMONIST** | `elementType=6`; `AmpParts__Toggle1_Open_png` / `AmpParts__Toggle1_Close_png` | 1 | No `languageKey` on this element | Toggle exists; function/label unresolved |
| EFX / filter | **15. TOUCH WAH** | `elementType=6`; `__Switch_1_Open_png` / `__Switch_1_Close_png` | 3 | No `languageKey` on this element | Explicit switch exists; function/label unresolved |
| EQ | **4. PARA EQ** | `elementType=6`; `AmpParts__Toggle6_Open_png` / `AmpParts__Toggle6_Close_png` | 54 | No `languageKey` on this element | Toggle graphic exists; function/label unresolved |
| Wah / pitch | **5. OCTAVE-SHIFT** | `elementType=6`; `AmpParts__Toggle1_Open_png` / `AmpParts__Toggle1_Close_png` | 0 | No `languageKey` on this element | Toggle graphic exists; function/label unresolved |

**Count: 5 model panels with explicit Toggle/Switch image pairs.** The data proves the two-state graphics are present in QuickTone; it does not yet prove the pedal's physical throw, function, raw MIDI values, or whether each should replace an existing knob in MG30 Studio.

## B. Two-frame list/button control (separate from the five toggles)

| Effect family | QuickTone model | Evidence | Stored `midiCC` | Status |
|---|---|---|---:|---|
| Modulation / chorus-flanger | **9. S.C.F** | `elementType=5`; `_Plist_Button_Frame_1_png` / `_Plist_Button_Frame_2_png` | 2 | Possible two-state/list selector; not yet confirmed as a physical switch |

Do not merge S.C.F into the five explicit toggle candidates until the control's exact behavior is established.

## C. Rotary knobs with small numeric ranges — selector candidates, not confirmed switches

These controls are still represented by `Knob_*.png` and `elementType=2` in QuickTone. Their short ranges suggest stepped/discrete settings, but the source does not establish that the physical MG-30 control is a switch. Keep them separate from section A.

| Family | Model | Parameter key | Stored `midiCC` | Range | Embedded default |
|---|---|---|---:|---:|---:|
| EQ | **2. ALIGN EQ** | `EQ_HPF` | 0 | 0–2 (3 values) | 1 |
| Wah | **4. HORSE WAH** | `WAH_RANGE` | 1 | 0–5 (6 values) | 3 |
| EFX / filter | **15. TOUCH WAH** | `EFX_MODE` | 0 | 0–3 (4 values) | 0 |
| Modulation / pitch | **13. HARMONIST** | `MOD_HARMO` | 2 | 0–9 (10 values) | 0 |

Touch Wah and Harmonist therefore each have both an explicit switch/toggle graphic and a separate stepped rotary parameter in the same panel.

## D. Categories with no additional explicit switch pair found in this pass

- **Compressor:** Rose Comp, K Comp, Studio Comp — rotary controls plus the common pedal press/bypass and status-light elements; no separate switch/toggle image pair found.
- **Delay:** Analog Delay, Digital Delay, Modulation (delay), Tape Echo, Reverse, Pan Delay, DuoTime, Phi Delay — no separate switch/toggle image pair found.
- **Reverb:** Room, Hall, Plate, Spring, Shimmer, Damp — no separate switch/toggle image pair found.
- **General modulation:** CE-1, CE-2, ST.Chorus, Vibrator, Detune, Flanger, Phase 90, Phase 100, U-Vibe, Tremolo, Rotary Speaker, SCH-1 — no separate switch/toggle pair found, except Harmonist; S.C.F has the separate Plist button described in section B.
- **EQ:** 6-Band EQ and 10-Band EQ are fader layouts; Align EQ has a three-value HPF rotary candidate; Para EQ has the explicit Toggle6 image pair.
- Common `__Light_Open/Close` pairs were treated as status/indicator graphics, not user-adjustable switches. Common `__Nail_Normal/Press` pairs were treated as pedal footswitch/bypass graphics, not parameter selectors.

This is a static catalogue observation; it does not prove that no other hardware switch exists if a model's panel uses an unlabelled/background image rather than a separate switch asset.

## Initial candidate list to discuss with the user

1. KATANA — Boost toggle (label positively identified).
2. HARMONIST — unlabeled toggle; also has a 10-step Harmony knob.
3. TOUCH WAH — unlabeled toggle; also has a 4-step Mode knob.
4. PARA EQ — unlabeled Toggle6 graphic.
5. OCTAVE-SHIFT — unlabeled Toggle1 graphic.
6. S.C.F — two-frame Plist control; keep as a lower-confidence selector candidate.
7. ALIGN EQ / HORSE WAH — stepped rotary controls only; do not call them switches based on this file alone.

## Required next validation before any UI change

1. Inspect the actual QuickTone pedal panel artwork around each candidate switch and resolve the printed function/position labels.
2. For each candidate, use original MG-30 Gen 2 QuickTone interaction/capture to record both or all positions and actual USB-MIDI values.
3. Compare readback from the physical pedal to QuickTone output; the embedded `parameter1/2` range is not sufficient evidence of raw MIDI values.
4. Decide which existing MG30 Studio knob control, if any, represents each switch; preserve unrelated parameter controls and the current confirmed AMP mapping.
5. Present the complete verified candidate list to the user before implementation.

## Implementation boundary

**Analysis only.** No application source, control rendering, MIDI mapping, NAM, IR User/Collection, preset transfer, or hardware-write behavior was changed as part of this inventory. The existing DGLASS/STARLIFT AMP mapping TOP=0 / MIDDLE=1 / BOTTOM=2 remains untouched.
