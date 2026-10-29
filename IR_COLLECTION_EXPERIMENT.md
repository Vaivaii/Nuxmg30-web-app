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

## Correct Collection lifecycle

Collection is a staging library/dialog, not a directly usable third-party slot. The workflow reported from QuickTone is:

1. Import the WAV into Collection; it is saved as an item in the Collection contents dialog/list.
2. Choose the stored Collection item using the item's load/select/download-arrow action.
3. QuickTone transfers the selected IR into the device's Third Party / User path, where amp/cab can use it.

The first experimental UI implements only step 1 (transfer into the Collection path). It does not yet enumerate Collection items or automate step 2. After a Collection item is saved, use QuickTone's own item action to load it into Third Party/User until the separate select/load protocol is understood.

## Merged NAM & IR UI and behavior

The separate IR Import navigation item is removed. The IR manager is placed below the NAM tools in the combined **NAM & IR** tab.

- **Third Party / User** has one WAV upload action. Choosing a file automatically validates it and, after one confirmation, transfers the 75-message User transaction using the hardware-tested parameter 71 and command family `10/09/11`.
- **Collection** displays slots 01–24 with a hide/show control. Importing a WAV from a specific slot automatically uses `parameter = displayed_slot - 1`, validates the `6A/6C/6B` packet family, asks once for confirmation, and transfers. No manual parameter field or separate Validate/Send buttons are shown.
- This mapping is hardware-confirmed for the tested examples: parameter 1 → displayed slot 02 and parameter 4 → displayed slot 05. Thus slot 01 uses index 0 by extrapolation; that exact slot has not been tested separately.
- The app keeps a local IndexedDB mirror of WAV files imported through this UI so the 24-slot list can show their names and offer **Gunakan di User**. This list is not a device readback: Collection items created directly in QuickTone are not enumerated by MG30 Studio.
- **Gunakan di User** re-sends the saved source WAV from the app's local mirror through the known-good User `10/09/11` route and parameter 71. It does not yet issue a decoded command that reads/moves the existing Collection item directly from the pedal. This is an explicit, honest workaround until the Collection item select/load transaction is reverse-engineered.

## Collection payload caveat

The current Collection import selects the observed command family `6A/6C/6B` separately from User's `10/09/11`, and the user confirmed that imported items enter the Collection slots. However, a byte comparison of the available captures shows that Collection waveform/curve payloads differ from the User capture beyond command bytes. The reason is not yet established. Verify the resulting IR's response graph and sound on the device; an entry appearing and a full ACK sequence do not alone prove the audio payload is correct.

## Hardware result: Collection slot index mapping (2026-10-29)

The user confirmed on the physical MG-30 Gen 2 that Collection transfer successfully creates entries in the Collection list/dialog. Two tested parameter values establish the following mapping for this Collection transfer path:

- Parameter/index `1` created an entry in displayed Collection slot `02`.
- Parameter/index `4` created an entry in displayed Collection slot `05`.
- The observed mapping is therefore `displayed slot number = parameter + 1`; the parameter is a zero-based Collection slot index.
- This mapping is Collection-specific evidence. Do not reinterpret the User IR parameter 71 as a physical slot index.
- Index `0` → displayed slot `01` follows the observed pattern but has not yet been separately tested.
- Item content/audio quality still needs validation. A completed 75-packet ACK sequence and an entry appearing in Collection do not alone prove that the generated waveform/curve payload sounds correct.

Collection lifecycle confirmed by the user:
1. Import/save WAV as an item in Collection.
2. Choose the saved item in the Collection dialog/list.
3. The selected item is then transferred into Third Party/User for use by amp/cab.

Build pipeline note: runs #1 and #2 failed during Android SDK setup because the workflow requested the retired SDK package `tools`. Run #3 succeeded after the SDK package list was corrected. The next build after this documentation/UI update must also pass before it is described as the newest installable APK.

## Required hardware validation before merge

1. Install only a build from `android/ir-collection-experiment`; retain the known-good User APK and/or `android/ir-user-validated` branch as rollback.
2. Use a disposable/test IR entry, not a valuable Collection entry.
3. Select **Collection**, confirm the parameter is 1 for comparison with the capture, validate the WAV, and inspect the pre-send protocol label `6A/6C/6B`.
4. Send once and verify the entry appears in the displayed slot `parameter + 1` (tested: 1→02 and 4→05). Inspect the response graph/audio; a visible entry does not yet prove correct payload.
5. Use QuickTone's item select/load action to move the stored Collection IR into Third Party/User, then verify it can be selected by amp/cab.
6. Re-test a known-good User IR immediately after Collection to confirm the User path is still functional; then compare a fresh USB capture with QuickTone Collection capture.

Do not merge to `main`, change NAM, or change MIDI mappings on the basis of ACKs alone.
