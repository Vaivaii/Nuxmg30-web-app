# Switch UI cleanup — 2026-11-04

## Request

Remove debug-style captions from all discrete switch controls on effect pedals and AMP.

## Implementation

The common discrete-switch renderer in `www/index.html` is shared by AMP and effect pedals. Removed the visible captions:
- `Hardware raw value: ...`
- `Default ... · MIDI ... · awaiting pedal readback`
- `Selected MIDI value: ...`
- `Posisi awal hanya tampilan; tidak mengirim MIDI sampai tombol dipilih.`

Also removed the CSS rules used only by those captions.

## Behavior preserved

- Switch position labels and choice labels remain visible.
- Active button highlighting and aria-pressed updates remain in place on user selection and hardware readback.
- Default display selection remains visual only; opening the editor does not send MIDI.
- Raw enum values, parameter indices, CC maps, readback validation, and write paths are unchanged.
- Previously physically verified switch maps remain unchanged: KATANA and SCF.
- The four corrected maps remain unchanged: Octave-Shift, Touch Wah, Harmonist, U-Vibe.
- AMP switch mappings, NAM, IR User/Third Party, IR Collection import, preset transfer, and unrelated MIDI mappings are untouched.

## Regression coverage

Added assertions that the AMP/effect shared renderer retains position and choice labels but emits no debug captions. Updated the existing default-display/no-auto-write test to assert the diagnostics are absent while the MIDI write handler remains present.
