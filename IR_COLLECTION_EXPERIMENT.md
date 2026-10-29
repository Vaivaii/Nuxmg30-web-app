# NUX MG-30 Gen 2 — Isolated IR Collection experiment

## Protected working baseline

- `android/ir-user-validated` is a snapshot branch created from the last User-IR-tested state before Collection changes.
- `android/ir-import-test` is also left unchanged.
- Collection work lives only on `android/ir-collection-experiment`. Do not merge this branch into `main` or either User baseline until Collection is hardware-verified.
- Target remains the original NUX MG-30 Gen 2 firmware 6.0.x, not MG-30 MKII.

## Hardware-verified behavior

The user tested the app on the physical MG-30 Gen 2 and reports that multiple WAV files transfer successfully into the dedicated Third Party / User IR path. Preserve this route as the known-good behavior.

- User command family: waveform `10 01`, name `09 01`, curve `11 01`.
- The current tested APK used User parameter 71 and returned responses for the complete 75-message transaction.
- User-side transfer is not to be rewritten to use Collection commands.
- NAM transfer/import code and existing MIDI mapping are out of scope and must remain unchanged.

## Collection capture evidence

The capture named `ircolectionmenu dialog dan import.pcapng` contains a Collection transfer with a different command family:

- 64 waveform messages: `6A 01`, followed by `6A 03` replies.
- 1 name message: `6C 01`, followed by a `6C 03` reply.
- 10 curve messages: `6B 01`, followed by `6B 03` replies.
- The observed Collection capture uses parameter 1; this is a capture reference only, not a universal parameter or a proven physical slot number.
- Expected response statuses from that capture are 2 for intermediate waveform/curve frames, 3 for their final frames, and 0 for the name frame.

The two short Collection-menu captures do not contain a complete list/readback transaction. This patch only separates the observed Collection transfer family from the User family; it does not claim to have decoded Collection list/readback or slot-selection behavior.

## Experimental UI behavior

The IR page now has a target selector with **Third Party / User** as the default and **Collection** as a separate experimental target. Each target retains its own parameter field value: User starts at 71 because that exact path has been hardware-tested; Collection starts at 1 because that value is present in the observed Collection capture.

The payload is still produced by the shared WAV-to-IR generator and the command byte family is selected by target. This is a protocol-level experiment: a Collection transaction that receives all acknowledgements is **not** proof that the IR has been saved or appears in the Collection menu.

## Required hardware validation before merge

1. Install only a build from `android/ir-collection-experiment`; retain the known-good User APK and/or `android/ir-user-validated` branch as rollback.
2. Use a disposable/test IR entry, not a valuable Collection entry.
3. Select **Collection**, confirm the parameter is 1 for comparison with the capture, validate the WAV, and inspect the pre-send protocol label `6A/6C/6B`.
4. Send once, record ACK/status and any failure, then open QuickTone/device Collection and verify whether the name and usable IR are present.
5. Re-test a known-good User IR immediately after the Collection experiment to confirm the User path is still functional.
6. Compare a fresh USB capture from the app with QuickTone Collection capture before treating Collection as confirmed.

Do not merge to `main`, change NAM, or change MIDI mappings on the basis of ACKs alone.
