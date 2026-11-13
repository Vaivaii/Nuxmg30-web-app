# Effect switch physical validation — 2026-11-04

## Device and scope

- Target: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII).
- Evidence source: user's physical test of MG30 Studio Build 502.
- Scope is limited to discrete effect-switch raw enum orientation.

## Physical observations from Build 502

- **S.C.F:** correct. TOP / MIDDLE / BOTTOM behaved as expected.
- **KATANA:** correct. ON/OFF behaved as expected.
- **Octave-Shift:** reversed. Selecting the app's upper position activated the device's lower position and vice versa.
- **Touch Wah:** reversed in the same way.
- **Harmonist:** reversed in the same way.
- **U-Vibe:** reversed in the same way.

## Targeted source correction

Keep the existing parameter names, parameter indexes, and MIDI CC assignments unchanged. Reverse only the raw enum values for the four physically reversed controls:

| Pedal | Existing parameter | Existing CC | App top / first choice | App bottom / second choice |
|---|---|---:|---:|---:|
| Octave-Shift | `updown` | 12 | UP = 1 | DOWN = 0 |
| Touch Wah | `updown` | 21 | UP = 1 | DOWN = 0 |
| Harmonist | `minor` | 49 | MINOR = 1 | MAJOR = 0 |
| U-Vibe | `chvib` | 51 | CHORUS = 1 | VIBRATO = 0 |

The first-choice visual defaults are set to raw value 1 for these four switches. This default is display-only; opening the editor does not send MIDI.

## Controls intentionally preserved

- KATANA: OFF = 0 / ON = 1, existing CC18.
- S.C.F: TOP = 0 / MIDDLE = 1 / BOTTOM = 2, existing CC50.
- AMP switch mappings and CC positions are untouched.
- NAM, IR User/Third Party, IR Collection import, preset transfer, and all unrelated MIDI mappings are untouched.

## Validation status

- User physical observations are confirmed for the Build 502 version as listed above.
- This source correction is based on those observations; the corrected four switches still require a new automated CI run and physical retest on the original MG-30.
- Do not treat the new four mappings as physically re-confirmed until the user tests the rebuilt APK.
