# QuickTone Effect Pedal Switch Inventory — User-confirmed

Date: 4 November 2026
Target: **NUX MG-30 original Gen 2, firmware 6.0.x — not MKII**
QuickTone: **V2.6.7.16 Windows**

## Scope and authority

This is the current consolidated inventory. User-confirmed physical control positions/functions take precedence over preliminary static-asset guesses. This document supersedes earlier statements that the inventory contained only four pedals, that S.C.F MIDDLE meant Mono, or that TOUCH WAH / OCTAVE-SHIFT were exclusions.

**There are exactly six confirmed effect pedals with switch-style controls:**

| Category | Pedal | Confirmed positions / functions | Control type |
|---|---|---|---|
| OD / Overdrive | **KATANA** | ON = Boost; OFF = Boost off | Two-state |
| Modulation | **S.C.F** | TOP = Chorus; MIDDLE = **P.M. (Pitch Modulation)**; BOTTOM = Flanger | Three-state |
| Modulation | **UNIVIBE** | BOTTOM = Vibrato; TOP = Chorus | Two-state |
| Modulation | **HARMONIST** | BOTTOM = Major; TOP = Minor | Two-state |
| Wah / EFX | **TOUCH WAH** | UP / DOWN; exact function per position pending | Two-state |
| Pitch / Octave | **OCTAVE-SHIFT** | UP / DOWN; exact function per position pending | Two-state |

For UNIVIBE and HARMONIST, retain the BOTTOM/TOP function pairing exactly as supplied by the user.

## S.C.F middle position — corrected meaning

The user identified the middle marking as **P. M.** (the letters P and M printed on either side of the selector) and said the S.C.F model is based on the TC Electronic SCF.

The TC Electronic SCF user's guide identifies its three MODE SELECTOR modes as **CHORUS, PITCH MODULATION (P.M.), and FLANGER**. The guide describes Pitch Modulation as a combination of chorus and pitch/vibrato; it is not Mono.

Therefore the current S.C.F position labels are:
- TOP: Chorus
- MIDDLE: P.M. / Pitch Modulation
- BOTTOM: Flanger

Reference manuals:
- TC Electronic SCF user's guide: https://toneprints.com/media/218428/tc_electronic_scf_stereo_chorus_flanger_manual_english.pdf
- TC Electronic SCF service/user guide: https://service-tcgroup.tcelectronic.com/media/ed9b58609ee74a94bcc0d6bb7d6b7a89.pdf

The manual confirms the meaning of P.M.; the TOP/MIDDLE/BOTTOM orientation above is the user's MG-30/QuickTone observation.

## MIDI mapping status — not yet captured

User expects the MIDI state mapping to follow the same pattern as the already validated three-position AMP switches. Record this only as a **working hypothesis** for S.C.F:
- TOP / Chorus: raw 0
- MIDDLE / P.M.: raw 1
- BOTTOM / Flanger: raw 2

This is not yet a measured S.C.F hardware result. Do not enable or write this mapping based only on the AMP analogy. Confirm with a dedicated QuickTone USB-MIDI capture and MG-30 readback.

For all six pedals, exact hardware CC addresses and raw MIDI values remain pending capture/readback:
1. KATANA: OFF and ON/Boost.
2. S.C.F: TOP/Chorus, MIDDLE/P.M., BOTTOM/Flanger.
3. UNIVIBE: BOTTOM/Vibrato, TOP/Chorus.
4. HARMONIST: BOTTOM/Major, TOP/Minor.
5. TOUCH WAH: UP and DOWN; function labels still unknown.
6. OCTAVE-SHIFT: UP and DOWN; function labels still unknown.

Capture each position separately in QuickTone on the original MG-30 Gen 2. Establish the relationship between the displayed control, parameter index, actual CC, raw value, and physical position; verify pedal readback before proposing implementation.

## QuickTone static-catalogue context

Earlier static analysis of QuickTone V2.6.7.16 found:
- KATANA BOOST toggle (elementType=6, language key EFX_BOOST).
- S.C.F two-frame list/button element.
- HARMONIST toggle graphic.
- Other toggle-looking entries in Touch Wah, Para EQ, and Octave-Shift.
- UNIVIBE was included based on the user's physical confirmation even though the earlier static scan did not identify its control correctly.

The static catalogue's stored midiCC fields are not verified hardware CC numbers. Do not copy them into MG30 Studio mappings without capture and readback.

## Exclusions and non-switch controls

The following are not part of the six confirmed switch controls:
- PARA EQ (no user-confirmed switch in the current inventory).
- S.C.F unrelated rotary controls.
- ALIGN EQ HPF, HORSE WAH RANGE, TOUCH WAH MODE, and HARMONIST HARMO stepped rotary controls.
- Compressor models (Rose Comp, K Comp, Studio Comp).
- Delay models (Analog, Digital, Modulation Delay, Tape Echo, Reverse, Pan Delay, DuoTime, Phi Delay).
- Reverb models (Room, Hall, Plate, Spring, Shimmer, Damp).
- Ordinary status lights and pedal bypass/footswitch graphics.

TOUCH WAH and OCTAVE-SHIFT are explicitly **included** in the switch inventory as two-position UP/DOWN controls; do not reclassify them as false positives.

The earlier AMP candidate list is out of scope here. AMP's already validated switch mapping remains:
- DGLASS LO MIDS FREQ, CC26: TOP=0 / MIDDLE=1 / BOTTOM=2.
- STARLIFT CONTOUR, CC28: TOP=0 / MIDDLE=1 / BOTTOM=2.
- DGLASS HI MIDS FREQ, CC29: TOP=0 / MIDDLE=1 / BOTTOM=2.

## Implementation boundary

**Analysis and inventory only. No application code or UI was changed for these effect controls.** Do not replace rotary knobs, alter effect UI, or send effect-switch MIDI until the missing captures/readbacks are completed and the user approves implementation.

Preserve:
- The confirmed AMP mappings listed above.
- Existing NAM functionality.
- IR User / Third Party and IR Collection import behavior.
- Preset transfer and all unrelated MIDI mappings.
- Target compatibility with original MG-30 Gen 2 firmware 6.0.x only, not MKII.
