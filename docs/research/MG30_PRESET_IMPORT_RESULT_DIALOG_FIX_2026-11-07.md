# MG-30 Import Result Dialog and English Button Fix — 2026-11-07

## Target

Original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.

## User's latest screenshot / request

- The Import All action button still displayed Indonesian text: “Mulai Import All · 128 Preset”.
- The user reports that Import All status text can remain under the action after completion and wants this feedback as a popup, consistent with the confirmation dialog.
- The amber bordered action must use English.
- The user expects a full regression test and signed Android Release build before receiving another APK.

## Changes

- Change action label to “Start Import All · 128 Presets”.
- Hide the legacy `presetImportStatus` node and suppress its CSS banner permanently.
- Route warning/validation feedback through a modal alert instead of an inline status banner.
- Keep loading feedback in the existing progress modal.
- Add a “Done” button to the shared progress modal. It is hidden during the transfer and appears when Import has a success/failure result.
- Successful Import result remains visible for 5 seconds; the user can dismiss immediately using Done or Android Back once the write has finished.
- Keep failure detail in the result dialog.
- Preserve Export's use of the shared progress modal: Done stays hidden unless the Import module completes.
- Do not change SysEx bytes, transfer step ordering, frame totals, ACK matching, MIDI queue timing, readback comparison, NAM, IR routing, or MIDI mappings.

## Validation

Record fresh test/build/signature results for the commit after CI finishes. CI success does not replace physical MG-30 testing.

## First CI iteration

- Run `42359248001` stopped in regression tests before the APK build. The failures were test-only: the existing dynamic test still expected the previous 1.8-second result timer, and the newly added HTML assertions contained malformed escaping in regular expressions. The UI/runtime implementation was not changed for these test corrections. Updated assertions now expect 5 seconds and use literal string checks. Re-run pending.
