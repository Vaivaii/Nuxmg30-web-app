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
