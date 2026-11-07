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
