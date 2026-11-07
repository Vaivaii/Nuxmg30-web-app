# MG-30 Preset Import English Feedback Fix — 2026-11-07

## Target and guardrails

- Target: original NUX MG-30 Gen 2, firmware 6.0.x; not MKII.
- Preserve current Single/All SysEx sequences, ACK matching, MIDI queue pacing, preset serialization, NAM, IR transfer, and MIDI/CC mappings.
- This patch changes import UI copy, terminal feedback, stale status cleanup, and readback-stage diagnostics only.

## User-reported screenshots

- Import All and Single confirmation dialogs still used Indonesian or mixed-language text.
- Progress title, IR phase names, and acknowledged-frame notes were in Indonesian.
- Import All left a persistent status line below its action button.
- Single Import confirmation incorrectly claimed batch Import All was unsupported.
- Screenshot 3 recorded 2,412/2,412 ACKs, followed by a readback mismatch at program 72, scene 0. All frames being acknowledged is not equivalent to all scenes passing readback.

## Changes in this revision

- Rewrote Import All and Single confirmations in concise English.
- Removed the obsolete batch-import-not-supported claim.
- Route Import status and parser error messages through the existing English UI translator.
- Changed import progress titles, safety note, verification count, phase labels, frame counts, and number formatting to English.
- Standardized success dialogs to “Import Complete” and “Import All Complete”.
- Clear the persistent preset-import status line on both success and failure; use the result dialog instead.
- Display the actual import/readback error in the failure dialog.
- Reset the stale transfer step before readback verification, so a readback mismatch is not attributed to the final all-import-close frame.
- Clear transient device operation status after the import reaches a terminal state.
- Add regression tests for English UI, concise confirmations, stale status cleanup, and dynamic Import All progress.
- Enable signed candidate CI on pushes to this release-preparation branch. Candidate tag fallback is 1.0.0-community.2 and Android versionCode is 2, retaining compatibility with upgrades from signed candidate .1 using the same key.

## Scope explicitly not changed

No SysEx command bytes, payload layouts, transaction order, ACK matching rules, MIDI transfer pacing, readback comparison algorithm, NAM implementation, standalone IR import destination, MIDI/CC mappings, or USB audio paths were intentionally changed.

## Validation status

Record CI test/build/signature results after the workflow completes. Successful CI does not replace physical MG-30 verification. If Import All still reports a readback mismatch at program 72, scene 0, treat it as an outstanding preset data verification issue; do not label that operation as successful.

## CI iteration note

- First workflow run on commit `6dc117de33f48650318c802d4b6f048ef4a7491e` stopped at regression tests before the Android build. 310 tests passed and two assertions failed because the existing tests still expected the previous Indonesian toast text and looked for a native progress-phase string in the separate UI module rather than the HTML bridge.
- Updated those test assertions to match the English toast and check the phase labels in the bridge. No application protocol/runtime code was changed for this test-only correction. Re-run results pending.

- The second CI retry revealed the phase-label assertion used `phase:` although the source declares `const phase = ...`; corrected the test to match the declaration. The other stale assertion (success toast) was already corrected in the previous test-only commit. Re-run pending.

## Successful CI result — Run #12

- Workflow run: [42357238084](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42357238084)
- Tested commit: `671413ba9ad04234d8bf5c74916dda1953c0df12`
- Result: success; all workflow steps completed except the optional draft-release step, which was intentionally skipped.
- Regression suite: **312 tests passed, 0 failed**.
- Android Release: `BUILD SUCCESSFUL`; 244 actionable Gradle tasks executed.
- APK V2 signature verification: passed; one signer.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Package: `com.vaivaii.mg30studio`.
- Version: `1.0.0-community.2`, versionCode `2`.
- APK SHA-256 sidecar generated and `sha256sum --check` passed.
- Uploaded artifact: `MG30-Studio-Community-Signed-Candidate`, artifact ID `13567824108`, 3,237,646 bytes, expires 2027-02-05.
- Artifact ZIP digest: `7c2c5fde36d4badf610282303a4c7d83e2b28f9f43ca01936a55fbfa4aada2d5`.
- No public/draft GitHub Release was created.
- Physical Android installation and MG-30 hardware validation are still pending. In particular, retest the previously observed Import All readback mismatch at program 72 / scene 0. Do not claim the device-side import issue is resolved based on CI alone.
