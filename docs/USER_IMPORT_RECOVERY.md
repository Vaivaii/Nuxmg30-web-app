# User IR import recovery

This branch is restored from commit `6cc35f94277b5809f5d5c1a284bd9904061de614` — the last known User/Collection build before the experimental active-User-IR name readback was introduced in run #24.

## Scope

- Restore the full pre-name-readback `www/index.html` and `www/ir-transfer.js`, rather than patching individual parameters.
- User WAV import explicitly passes parameter `71` and retains the 75-frame `10/09/11` transfer family.
- Remove the experimental User-name readback query and its connect/preset/scene calls from this baseline.
- Leave NAM and existing MIDI mapping as they were in the restored snapshot.
- Preserve the Collection manager and its independent `6A/6C/6B` command family.

## Validation

The two inline scripts in `www/index.html` passed syntax checks after restore. The native Android build is triggered through the isolated workflow. A successful build proves packaging only; the User import must be tested once on the physical original NUX MG-30 Gen 2 firmware 6.0.x before calling the recovery hardware-verified.

Do not merge this recovery branch to `main` until the physical test confirms that import works again.
