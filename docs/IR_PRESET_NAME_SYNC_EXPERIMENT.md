# User IR name sync — readback rolled back to protect import

Target: original NUX MG-30 Gen 2, firmware 6.0.x. This branch remains isolated from `main` and the known User-IR baseline.

## Hardware report

The user tested Run #34 on the physical unit. It showed the generic `Third-party` label after USB connection, and User IR import no longer worked. The pedal's display showed `TONE KING MAIN OD R`, while the app had previously shown `i5_cap_45_dc`.

## Why the experiment is rolled back

The readback path guessed that `09/00` would return User metadata as `09/02`. That request was not validated against a firmware 6.0.x capture. It also ran repeatedly during connect, preset selection, Scene changes and manual buffer reads. The read command and target byte are still hypotheses; it is not acceptable to leave this query active if it can interfere with the known-good User transfer or clear the local IR name.

The unverified User metadata query and all calls to it have now been removed from the app. This returns USB connection/preset synchronization to the existing behavior and stops the app from deleting the locally cached label when speculative readback times out.

## Protected User import behavior

- User import explicitly uses parameter **71**.
- The default of `buildMG30IRTransferPlan` is also now **71**.
- The User transfer remains 75 SysEx frames with command families `10/01` waveform, `09/01` name, and `11/01` curve.
- Collection remains separated on `6A/6C/6B` with its independent slot-based parameter.
- NAM code and the existing MIDI CC mapping are unchanged.

## Cabinet name behavior

On a successful User import, the app can continue to display the uploaded/imported name from local app metadata. On connect, the app will no longer claim that it read the active cabinet name from the pedal until the actual read/check transaction is captured and verified. The device-side label `Third-party` and the custom file name are distinct pieces of data and must not be conflated.

## Validation

- Inline JavaScript syntax was checked before this rollback.
- A new Android debug APK build is triggered for this rollback.
- Firmware-level name readback remains unsolved; do not attempt another `09/00` query until we capture or disassemble the original MG-30 Gen 2 QuickTone `getIRCrcAndNameCheck` path.
- Do not merge this experimental branch into `main` until the User import has been tested again on hardware.
