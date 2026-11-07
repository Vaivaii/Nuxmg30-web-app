# MG-30 Import All Ready Summary Popup — 2026-11-07

## Target and safety boundaries

- Original NUX MG-30 Gen 2 firmware 6.0.x; not MKII.
- Do not alter the tested Import All / Single SysEx transaction data, ACK matching, MIDI pacing, readback algorithm, NAM, IR routing, or MIDI mappings.
- This change is limited to Import All selection/confirmation UX and cleanup of file-summary UI state.

## Latest user screenshot / request

After an Import All attempt, the user still saw:
- The green line: “128 presets ready to import · 27 presets include embedded IR resources.”
- The amber action button: “Start Import All · 128 Presets”.

Those items were a persistent selected-file summary and action button. The previous patch only cleared them on the resolved-success path; when Import All stopped on a readback/transfer failure, the dialog could auto-close while the selected file, summary, and button remained on the page.

## Changes

- Remove the persistent Import All action button from Preset Manager.
- Do not put the 128-preset / embedded-IR count in the persistent import bar.
- After parsing an All Preset file, display the preset count, IR-resource count, filename, overwrite warning, and “Start Import All” choice together in one confirmation popup.
- If the user cancels, clear the selected All Preset file and all inline metadata.
- If the import succeeds or fails, clear the selected file, inline summary, and import bar in a shared `finally` path.
- Keep progress and terminal success/failure results in the existing modal progress dialog. The success result only appears after Import All resolves after full readback verification.
- On readback or transfer failure, preserve the real error in the failure dialog; do not show success.
- Single-preset import flow is unchanged.

## Validation

CI regression/build/signature results for this exact commit must be recorded after the workflow finishes. Device hardware verification remains separate from CI.

## CI iteration note

- Run `42361583573` stopped at two stale regression assertions; Android build steps were correctly skipped. One assertion expected a literal backslash-n rather than a newline in the finally cleanup block, and another expected the old “IMPORT ALL PRESETS?” confirmation copy. Updated both tests to validate the new single confirmation containing the dynamic preset and embedded-IR counts. No device protocol code was changed as part of this test-only correction. Re-run pending.


## Successful CI result

- Exact tested commit: `718b4a202b1982149a80366d92c37bf5de8f855b`
- GitHub Actions run: [42361691741](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42361691741)
- Regression suite: **314 passed, 0 failed**.
- Android Release build: `BUILD SUCCESSFUL`.
- APK V2 signature verification: passed.
- APK checksum verification: passed (`MG30-Studio-Community.apk: OK`).
- Package ID: `com.vaivaii.mg30studio`.
- Version name: `1.0.0-community.2`; versionCode: `2`.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13569079803`.
- Artifact ZIP SHA-256: `bf8af88c10879c55fd4409f2a39b7d55cfb91b905b8cfd04ae413a837deb2ef7`.
- Artifact expiration: 2027-02-05.
- This remains a release candidate until physical Import All validation is completed on the original Gen 2 MG-30 firmware 6.0.x.


## Candidate version increment

- The next package is intentionally bumped to `1.0.0-community.3` / Android `versionCode 3` so it can install as an update over the previous `.2` candidate signed with the same community key.
- The workflow manual-dispatch default and push fallback tag were updated to `v1.0.0-community.3`.
- Re-run the complete CI on this versioned workflow commit; only the resulting artifact is the one to install.


## Final versioned candidate CI — successful

- Tested source/workflow commit: `5730430c7b60519b4304f0dcef56bc707f879ddb`
- GitHub Actions run: [42361957883](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42361957883)
- Regression tests: **314 passed, 0 failed**.
- Android Release: `BUILD SUCCESSFUL`.
- APK V2 signature verification: passed.
- APK checksum verification: passed.
- Package ID: `com.vaivaii.mg30studio`.
- Version: `1.0.0-community.3`, Android `versionCode 3`.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13569209485`.
- Artifact ZIP SHA-256: `9d48d116058cfc5d0a4db552dbcfe16eeaafd9c76bdfd522ef2b8c5fcbbae0cd`.
- Artifact expires: 2027-02-05.
- This candidate is built and signed, but the Import All confirmation/cleanup behavior still needs final visual confirmation on the user's physical Android phone and original Gen 2 MG-30 firmware 6.0.x.


## Follow-up: fix visible backslash-n in confirmation popup — 2026-11-07

The user installed candidate .3 and sent a screenshot showing literal `\\n\\n` characters inside the Import All confirmation. The popup source had double-escaped newline sequences, so Android rendered them as ordinary characters.

- Replaced double escapes with single JavaScript newline escapes in the Import All confirmation and Import All failure note.
- Added regression tests asserting the confirmation source contains newline escapes and no double-escaped sequences.
- Candidate version incremented to `1.0.0-community.4`, Android `versionCode 4`, to allow an in-place update over installed .3 using the same signing key.
- Physical MG-30 verification is still required after installation.
