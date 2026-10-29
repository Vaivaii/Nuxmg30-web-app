# User IR name sync on preset/scene changes — isolated experiment

Target: original NUX MG-30 Gen 2, firmware 6.0.x. This branch is isolated from the known User-IR baseline and from `main`.

## Diagnosis

The editor renders the custom cabinet label from the local key `mg30-user-ir-name`. The active preset readback already refreshes the IR block model, but User IR name/CRC metadata was only queried on initial connection (plus the local import/Collection-use events). Switching hardware presets could therefore leave the previously cached label visible.

## Change in this experiment

After a successful preset readback, scene readback, or manual “Baca buffer aktif” operation, the app also calls the existing read-only `syncActiveUserIRNameFromDevice` helper. This helper uses the current `www/ir-transfer.js` metadata reader, requests `09/00` for target `0x47` (71), requires a matching `09/02` response, reads twice, and only displays a stable device-backed name. If readback fails, the UI falls back to generic `Third-party` rather than presenting an older local label as confirmed device state.

The experiment does not change the User import `10/01, 09/01, 11/01` command family, the Collection `6A/6C/6B` path, NAM transfer/readback, or the existing MIDI CC map. It adds readback requests only.

## Validation status

- JavaScript syntax check of both inline scripts passed after the changes.
- GitHub Actions Android build is being run for this branch.
- **Physical hardware validation is still required.** In particular, `09/00 → 09/02` User IR name readback has not been independently confirmed against a fresh USBPcap capture on firmware 6.0.x.

## Hardware test checklist

1. Connect with User IR name A currently active; confirm the app shows A after the two-pass readback.
2. Change to another preset that uses Third-party/User IR, where the device metadata should differ if the device stores a different active User IR; verify whether the app updates rather than retaining A.
3. Trigger a Scene change and use “Baca buffer aktif”; confirm the label is refreshed by device readback.
4. Switch to a built-in cabinet and back to Third-party; verify model selection follows the active preset, not the cached display label.
5. If the query times out or returns unstable/different records, save a USBPcap trace of these read-only requests and responses. Do not treat the build succeeding as proof that the pedal returned correct metadata.

Do not merge this branch into `main` or the known-good User-IR baseline until the device readback is verified.
