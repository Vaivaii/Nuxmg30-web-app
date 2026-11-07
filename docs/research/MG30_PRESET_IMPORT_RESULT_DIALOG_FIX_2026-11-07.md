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


## Final CI result — successful

- Branch: `release/community-prep-v2`
- Tested commit: `ad31bbe10fe6fe16c9900b00f372f663d4b46b62`
- GitHub Actions run: [42359367899](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42359367899)
- Regression suite: **313 passed, 0 failed**.
- Android Release: `BUILD SUCCESSFUL`.
- Release signing keystore and alias validation: passed.
- APK V2 signature verification: passed.
- Package ID: `com.vaivaii.mg30studio`.
- Version name: `1.0.0-community.2`; versionCode: `2`.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Artifact: `MG30-Studio-Community-Signed-Candidate`, artifact ID `13569216047`.
- Artifact ZIP SHA-256: `e9abc00ada7304d88bc6066c2426daf3e376c78ae5c39a66fdc7aa0fa50128b6`.
- Artifact expires: 2027-02-05.
- APK remains a candidate pending clean installation and physical MG-30 hardware smoke test. CI does not prove actual preset-write/readback on the pedal.
