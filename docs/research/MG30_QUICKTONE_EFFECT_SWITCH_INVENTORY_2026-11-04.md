# QuickTone Effect Pedal Switch Inventory — Confirmed by user

Date: 4 November 2026
Target: **NUX MG-30 original Gen 2, firmware 6.0.x — not MKII**
QuickTone: **V2.6.7.16 Windows**

## Scope and authority

This document supersedes the preliminary static-asset candidate list. The final inventory below is based on the user's direct confirmation of the physical QuickTone/MG-30 controls. It is the definitive scope for future UI consideration.

**There are exactly four confirmed effect pedals with switch-style controls:**

| Category | Pedal | Switch positions / functions | Confirmed control behavior |
|---|---|---|---|
| OD / Overdrive | **KATANA** | ON = Boost; OFF = Boost off | Two-state ON/OFF |
| Modulation | **S.C.F** | TOP = Chorus; MIDDLE = Mono; BOTTOM = Flange | Three-state |
| Modulation | **UNIVIBE** | BOTTOM = Vibrato; TOP = Chorus | Two-state |
| Modulation | **HARMONIST** | BOTTOM = Major; TOP = Minor | Two-state |

For UNIVIBE and HARMONIST, the BOTTOM/TOP function pairing follows the order the user supplied. Retain this exact orientation unless the user later corrects it.

## Explicit exclusions

The following were false positives or are outside the confirmed switch inventory and must not be converted based only on the earlier static scan:

- TOUCH WAH
- PARA EQ
- OCTAVE-SHIFT
- S.C.F's unrelated rotary controls
- ALIGN EQ HPF, HORSE WAH RANGE, TOUCH WAH MODE, HARMONIST HARMO stepped rotary controls
- Compressor models (Rose Comp, K Comp, Studio Comp)
- Delay models (Analog, Digital, Modulation Delay, Tape Echo, Reverse, Pan Delay, DuoTime, Phi Delay)
- Reverb models (Room, Hall, Plate, Spring, Shimmer, Damp)
- Ordinary status lights and pedal bypass/footswitch graphics

The earlier AMP candidate list is also out of scope here. AMP's confirmed switch inventory remains only DGLASS LO MIDS FREQ, DGLASS HI MIDS FREQ, and STARLIFT CONTOUR.

## QuickTone static-catalogue context

The user-provided archive contains QuickTone V2.6.7.16 and its embedded control catalogue. Earlier static analysis found:
- KATANA BOOST toggle (elementType=6, language key EFX_BOOST).
- S.C.F two-frame list/button element.
- HARMONIST toggle graphic.
- Other toggle-looking entries in Touch Wah, Para EQ, and Octave-Shift; the user's hardware confirmation excludes these from the required inventory.
- UNIVIBE is included by the user's physical confirmation even though the earlier static scan did not identify its control correctly.

Catalogue midiCC properties are not treated as verified hardware CC numbers. Do not copy them into MG30 Studio mappings without a QuickTone USB-MIDI capture and pedal readback.

## Values and mappings still to measure

The physical function labels and positions above are confirmed, but exact raw MIDI values / CC addresses for these four effects have not yet been captured and confirmed in this inventory. They remain pending analysis:

1. KATANA: OFF and ON/Boost.
2. S.C.F: TOP/Chorus, MIDDLE/Mono, BOTTOM/Flange.
3. UNIVIBE: BOTTOM/Vibrato, TOP/Chorus.
4. HARMONIST: BOTTOM/Major, TOP/Minor.

Capture each position separately in QuickTone on the original MG-30 Gen 2 and verify the pedal's response/readback. Establish the relation between displayed control, parameter index, actual CC, raw value, and physical position before proposing an implementation.

## Implementation boundary

**Analysis and inventory only. No application code or UI was changed for these effect controls.** Do not replace rotary knobs or alter effect mappings until the above MIDI captures/readbacks are completed and the user approves the final inventory.

Preserve:
- Confirmed AMP mapping TOP=0 / MIDDLE=1 / BOTTOM=2 for DGLASS and STARLIFT.
- Existing NAM functionality.
- IR User / Third Party and IR Collection import behavior.
- Preset transfer and all unrelated MIDI mappings.
