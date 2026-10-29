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

The UI reads the 24 Collection entries and their names/CRC from the device. The user has also confirmed that **Gunakan di User** can make a device-resident Collection item become active in Third Party/User without a local WAV source; the direct operation is the captured `6E 01` request and `6E 02` response, rather than the app's fallback WAV re-transfer. If a local WAV mirror exists, the button still uses the known-good User transfer route.

## Merged NAM & IR UI and behavior

The separate IR Import navigation item is removed. The IR manager is placed below the NAM tools in the combined **NAM & IR** tab.

- **Third Party / User** has one WAV upload action. Choosing a file automatically validates it and, after one confirmation, transfers the 75-message User transaction using the hardware-tested parameter 71 and command family `10/09/11`.
- **Collection** displays slots 01–24 with a hide/show control. Importing a WAV from a specific slot automatically uses `parameter = displayed_slot - 1`, validates the `6A/6C/6B` packet family, asks once for confirmation, and transfers. No manual parameter field or separate Validate/Send buttons are shown.
- This mapping is hardware-confirmed for the tested examples: parameter 1 → displayed slot 02 and parameter 4 → displayed slot 05. Thus slot 01 uses index 0 by extrapolation; that exact slot has not been tested separately.
- The 24-slot list is device-backed: slot names, occupancy, and CRC are read from MG-30, twice for a stability check. IndexedDB remains a local WAV-source mirror/fallback and does not override device-reported labels or occupancy.
- **Gunakan di User** prefers the captured direct `6E/01` operation for a stable, device-resident Collection item. It waits for the matching `6E/02` frame; when a local WAV mirror exists the known-good User `10/09/11` transfer remains available.

## Cabinet name synchronization

After successful User IR upload or successful direct Collection Use, MG30 Studio stores the name under local key `mg30-user-ir-name` and dispatches `mg30-user-ir-name-changed`; the editor then selects `Third-party` and renders the readback/app-transferred name on the cabinet. The latest implementation also reads the active User IR's CRC/name on USB connect using the original MG-30 QuickTone `getIRCrcAndNameCheck` query shape: `F0 43 58 70 09 01 47` plus the packed 36-byte body (`uint32 1` followed by zeros), expecting a matching `09 02 47` metadata response. This query is separated from both Collection `6C` metadata and User waveform/name/curve writes. If the device does not reply, the app reports the readback failure and does not fabricate a new device name. The readback query has passed build/syntax validation but still needs physical hardware validation on connect.

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

## Collection metadata sync — corrected protocol analysis

The first reader implementation was incorrect: it attempted to use `09 01` and expected `09 02` as a Collection read. Capture parsing confirms `09 01` is the **User IR name/CRC write** packet family, not a Collection-list query. That path must not be used to read Collection names.

The successful NAM reader provides the reusable synchronization architecture: register a response listener before each request, send one read request, match the reply by protocol family and slot index, make two full readback rounds, then compare complete raw metadata before marking a slot stable. Collection now uses this same two-pass architecture instead of the earlier per-slot `09/01` request.

Collection write captures prove that name/CRC metadata is carried by `6C 01 [index] [54-byte packed payload]` and gets a `6C 03` acknowledgement; decoded payload is 36 raw bytes (4 CRC bytes plus a 32-byte name). Based on the same request/response convention used by the proven NAM transaction (`00` read request, `02` data response, `03` write ACK), the new reader probes read-only `6C 00` requests and matches `6C 02 [index] [54-byte packed payload]`. It tries the compact fixed-size request first, then a zero-filled 36-byte metadata request if the device does not reply.

**Important:** `6C 00` is a protocol-derived read-query candidate; it is not yet confirmed by a physical-device response in the submitted captures. The short Collection dialog captures do not contain the list-population transaction. The app now displays a per-round/per-slot progress state, records each timeout on the affected slot, and compares the complete 36-byte metadata between two rounds; the user must confirm that the new build actually receives `6C 02` records on the original MG-30 Gen 2 firmware 6.0.x.

## Active User IR name readback build (2026-10-29)

- Workflow run #27 succeeded: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40819031856
- Commit: `67e079abc8f7eb9fb59b972f93624edfa25b5838`
- Extracted APK SHA-256: `947bf68f97da5fdf319b7eb2fb50bea8e523bb2d7a29073f2be12035a072fc83`
- Sequence at connect: read active preset buffer, attempt User IR CRC/name query, update the Third-party cabinet label if a valid 09/02 metadata reply returns, then start NAM/Collection metadata synchronization.
- This build is not yet hardware-validated for the new 09/01 readback transaction. Verify actual name from pedal on first connect; a successful JS/Android build alone does not prove the firmware replied to the query.

## Required hardware validation before merge

1. Install only a build from `android/ir-collection-experiment`; retain the known-good User APK and/or `android/ir-user-validated` branch as rollback.
2. Use a disposable/test IR entry, not a valuable Collection entry.
3. Select **Collection**, confirm the parameter is 1 for comparison with the capture, validate the WAV, and inspect the pre-send protocol label `6A/6C/6B`.
4. Send once and verify the entry appears in the displayed slot `parameter + 1` (tested: 1→02 and 4→05). Inspect the response graph/audio; a visible entry does not yet prove correct payload.
5. Use QuickTone's item select/load action to move the stored Collection IR into Third Party/User, then verify it can be selected by amp/cab.
6. Re-test a known-good User IR immediately after Collection to confirm the User path is still functional; then compare a fresh USB capture with QuickTone Collection capture.

Do not merge to `main`, change NAM, or change MIDI mappings on the basis of ACKs alone.
