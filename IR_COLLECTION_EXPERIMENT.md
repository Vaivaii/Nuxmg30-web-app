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

The experimental UI implements step 1 (transfer into a chosen Collection slot) and its **Gunakan di User** action has been hardware-tested by the user. That button re-sends the WAV source stored in the app's local IndexedDB mirror through the known-good User path; it does not read/move the existing Collection item directly from device memory. For items added externally in QuickTone that have no local WAV source in MG30 Studio, the app still cannot load them into User by itself.

## Merged NAM & IR UI and behavior

The separate IR Import navigation item is removed. The IR manager is placed below the NAM tools in the combined **NAM & IR** tab.

- **Third Party / User** has one WAV upload action. Choosing a file automatically validates it and, after one confirmation, transfers the 75-message User transaction using the hardware-tested parameter 71 and command family `10/09/11`.
- **Collection** displays slots 01–24 with a hide/show control. Importing a WAV from a specific slot automatically uses `parameter = displayed_slot - 1`, validates the `6A/6C/6B` packet family, asks once for confirmation, and transfers. No manual parameter field or separate Validate/Send buttons are shown.
- This mapping is hardware-confirmed for the tested examples: parameter 1 → displayed slot 02 and parameter 4 → displayed slot 05. Thus slot 01 uses index 0 by extrapolation; that exact slot has not been tested separately.
- The app keeps a local IndexedDB mirror of WAV files imported through this UI so the 24-slot list can show their names and offer **Gunakan di User**. This list is not a device readback: Collection items created directly in QuickTone are not enumerated by MG30 Studio.
- **Gunakan di User** re-sends the saved source WAV from the app's local mirror through the known-good User `10/09/11` route and parameter 71. It does not yet issue a decoded command that reads/moves the existing Collection item directly from the pedal. This is an explicit, honest workaround until the Collection item select/load transaction is reverse-engineered.

## Cabinet name synchronization

After a successful User IR transfer (direct User upload or **Gunakan di User** from an app-managed Collection slot), MG30 Studio stores the name under local key `mg30-user-ir-name` and dispatches `mg30-user-ir-name-changed`. When the cabinet model is set to the existing `Third-party` model, the app uses this stored name in the model label and cabinet illustration. This is a local mirror of the last IR sent through MG30 Studio, not yet a device readback of whatever is currently selected on the pedal. The visual update was added on branch commit `e68b2b6`; build run #9 succeeded.

## New QuickTone capture analysis: select name vs Use (2026-10-29)

Two short captures supplied by the user were decoded as USB-MIDI event packets. Shared USB device-descriptor enumeration packets precede the action; the application MIDI data is at the end of each trace.

### Clicking only a Collection item/name (no Use action)

- The action is a USB-MIDI Control Change event `0B B0 42 04`, which decodes to MIDI channel 1, CC number 66 (`0x42`), value/index `4`.
- This matches the previously hardware-tested index mapping: value/index 4 corresponds to displayed Collection slot 05. Strong evidence that clicking/highlighting an item selects that device Collection index via CC 66.
- This capture starts at the item-click action; it does not contain the earlier dialog-open/list-population transaction.

### Clicking Use on a Collection item

Re-parsing the USBPcap endpoint direction shows a request/response pair, correcting the earlier direction interpretation:

1. App → device SysEx request: `F0 43 58 70 6E 01 04 00 00 00 00 00 00 00 F7`.
2. Device → app SysEx response about 0.122 ms later: `F0 43 58 70 6E 02 04 00 00 00 00 00 00 00 F7`.
3. The same incoming USB-MIDI transfer also includes Control Changes `B0 09 14` (CC 9 = 20), `B0 42 00` (CC 66 = 0), and `B0 43 00` (CC 67 = 0).
4. About 0.019 ms later, another transfer sends `B0 42 00` (CC 66 = 0).

This is direct evidence that the Use action exchanges a Collection-specific `6E 01` request and `6E 02` device response for index 4, followed by MIDI control reset events. The precise semantics and full effect on IR load state are not yet fully decoded. Preserve the already hardware-tested **Gunakan di User** fallback until the direct device action can be tested safely.

The user confirms that QuickTone's Collection list is populated from the device, just as the successful NAM sync reads device metadata. The earlier dialog-only capture was already supplied as `ircolectionmenu dialog.pcapng`; it has 22 USBPcap packets and, after enumeration, records two host-to-device `B0 42 00` events (CC 66 value 0), but no visible SysEx list/name request-response. `ircolectionmenu.pcapng` records CC 78 value 9, CC 9 value 25, the corresponding CC 9/45/46 group, and CC 66 value 0. `capkoleksi.pcapng` records CC 66 values 0, 0, 2 before the Collection `6A/6C/6B` writes begin; those writes start about 35.9 ms into that trace. The two newer click traces begin after names are already displayed and show selection/Use actions, not initial list population. Therefore the files are already accounted for; they do not contain the actual list/name readback exchange in the captured USB transactions. This is a capture-content limitation, not a conclusion that the Collection list is local.

## QuickTone 2.6.7.16 binary-symbol evidence

The locally available `QuickTone.exe` (QuickTone 2.6.7.16, Cherub Technology) contains original-MG-30-specific native method symbols including:

- `NuxMidiTransmissionMG30::getIRCrcAndNameCheck(juce::MidiMessage const&, NUX_MIDI_IO::SendData const*)`
- `NuxMidiTransmissionMG30::setIRCrcAndName(unsigned char, juce::String const&)`
- `NuxMidiTransmissionMG30::deleteCollectionIRCheck(...)`
- `NuxMidiTransmissionMG30::loadIRCurve_Check(...)`
- `NuxMidiTransmissionMG30::handleIncomingMidiMessage(...)`

This is useful new evidence from the app binary: QuickTone has an explicit MG-30 path for checking IR CRC/name, and a separate setter that accepts an index-like byte plus a string. This is a stronger lead for implementing device-backed two-way synchronization than guessing from the two short USBPcap traces. The names/signatures alone do not reveal the exact SysEx bytes, so the function body/control flow still needs disassembly or a capture that includes the check transaction. Do not confuse the MG-30 symbols with the separate `NuxMidiTransmissionMG30MK2` class; target the original Gen 2 class only.

## Implemented device-side Collection metadata sync

The QuickTone original-MG-30 native handler was disassembled and confirms the metadata query shape:

- Query is `F0 43 58 70 09 01 [index] [54 packed bytes] F7`.
- The raw query payload is 36 bytes: little-endian integer `1` followed by 32 zero bytes. Each two raw bytes are encoded as three 7-bit-safe bytes using `((word >> 14) & 3), ((word >> 7) & 0x7F), (word & 0x7F)`, where `word = (raw[i] << 8) | raw[i+1]`.
- Response handler matches command `09 02` and the requested `[index]`, then decodes the 54-byte body to 36 raw bytes.
- Metadata bytes 0–3 are treated as CRC (all zero means an empty slot); bytes 4–35 are the ASCII name, up to 32 bytes. An acknowledgement `09 03` may be emitted separately; the reader waits for the matching `09 02` record.
- Slot indexes are zero-based (0–23) in this Collection query. The UI shows slot index + 1 as slots 01–24.

The app implementation now has a **Sinkronkan dari MG-30** action and invokes Collection readback after the existing NAM name scan finishes after connect, to avoid interleaving Collection queries with NAM metadata queries. Each Collection slot is read twice and only shown as stable when occupancy/CRC/name match between both reads. The list's names and occupancy are driven by device metadata; IndexedDB is kept only as a local WAV-source mirror for the Use fallback.

After Collection import, the selected slot is read back twice. The **Gunakan di User** button keeps the already-tested local-WAV route when that WAV exists. If the slot is present on the device but there is no local WAV source, the button uses the captured direct QuickTone request `F0 43 58 70 6E 01 [index] 00 00 00 00 00 00 F7` and awaits a matching device response `6E 02 [index] ... F7`. This device-direct use route is based on QuickTone capture and still requires physical hardware validation in the new APK; failure does not delete or rewrite local WAV data.

After a successful User transfer or successful direct device Use, the app persists `mg30-user-ir-name` and updates the editor's Third-party cabinet model to show that active name. This is the last IR loaded through MG30 Studio or the captured direct Use action, not a full audio readback of the active Third Party slot.

## Device-side Collection readback implementation status

The list is now implemented against the decoded QuickTone `getIRCrcAndNameCheck` transaction above, with two-pass stability checks and no modifications to the existing NAM implementation. Hardware validation of the new reader and direct Use path remains required.

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

## Latest build result (2026-10-29)

- Workflow run #16: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40810230417
- Commit: `219a430da0dc51b6d721631aaa713b5e5171b1aa`.
- JavaScript syntax validation (module and inline scripts), Android debug APK build, and artifact upload all succeeded.
- Artifact: `MG30-Studio-IR-Collection-Experiment`, SHA-256 of APK extracted for the user: `8d954e1240ea43db0a08d7e0d70616493fb2174bfdab43f65a644c64c08e9530`.
- The metadata query/direct Use paths are QuickTone-derived and have not yet been exercised on hardware in this specific build. User should verify readback status and that direct Use moves a device-only Collection slot into Third Party/User before treating sync as hardware-validated.
## Required hardware validation before merge

1. Install only a build from `android/ir-collection-experiment`; retain the known-good User APK and/or `android/ir-user-validated` branch as rollback.
2. Use a disposable/test IR entry, not a valuable Collection entry.
3. Select **Collection**, confirm the parameter is 1 for comparison with the capture, validate the WAV, and inspect the pre-send protocol label `6A/6C/6B`.
4. Send once and verify the entry appears in the displayed slot `parameter + 1` (tested: 1→02 and 4→05). Inspect the response graph/audio; a visible entry does not yet prove correct payload.
5. Use QuickTone's item select/load action to move the stored Collection IR into Third Party/User, then verify it can be selected by amp/cab.
6. Re-test a known-good User IR immediately after Collection to confirm the User path is still functional; then compare a fresh USB capture with QuickTone Collection capture.

Do not merge to `main`, change NAM, or change MIDI mappings on the basis of ACKs alone.
