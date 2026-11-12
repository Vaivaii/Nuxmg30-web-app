# IR User Cut Mapping and Scene Synchronization Fix

**Date:** 2026-11-12  
**Target:** Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `fix/ir-user-cut-scene-sync`  
**Base:** `feature/full-backup-selective-restore`

## User-reported symptoms

1. High Cut and Low Cut controls in IR User / Third-party were mapped to the wrong hardware control.
2. When an external pedal changed scene, the MG-30 changed correctly but the editor scene indicator returned to Scene 1.
3. On first USB-MIDI connection, the editor did not reliably select the scene already active on the MG-30.

## Findings from the current source

### IR User / Third-party

The IR block uses the same parameter descriptor for built-in cab IR models and User/Third-party. The visible descriptor for non-factory models is `level, lowcut, highcut`. The same descriptor index is reused by:
- outgoing parameter CC selection in `sendBlockParam()`;
- incoming parameter synchronization in `syncIncomingParameterCC()`;
- packed scene-bit readback in `readActiveBuffer()`.

Therefore a wrong Low Cut / High Cut parameter index affects both direct CC control and scene/preset buffer interpretation. The fix changes only the `ccIndex` of the two controls returned by `parameterControls()` when the selected IR model resolves to `Third-party`. Visible label order and parameter names remain unchanged. Built-in IR model layouts and global CC/bit-slot tables are not changed.

The legacy local-draft lookup remains tied to the original visible order so existing User IR drafts do not swap their stored `lowcut` and `highcut` values merely because the live device index is corrected.

### External scene selection

The incoming handler receives scene changes as MIDI CC80 values 0–2. Previously it updated the app scene but also cleared `lastSceneCommandAt` to zero. That disabled the existing short stale-status protection. Meanwhile a status query already in flight could return after the pedal's CC80 event and overwrite the newly selected scene.

The fix:
- increments `sceneStateRevision` on an external CC80 event;
- records the event time in `lastSceneCommandAt` instead of clearing it;
- makes `pollHardwareState()` discard a query response if a newer scene event occurred while it was in flight;
- makes `readActiveBuffer()` discard a scene-buffer snapshot if the scene revision changed while its three preset parts were being read;
- uses the recent CC80 scene as the authority during the existing 4-second stale-status guard;
- retains a refresh after the earlier buffer read settles, so the newest selected scene is loaded.

The editor's own scene command increments the same revision, so app-initiated and pedal-initiated transitions follow the same stale-read protection.

### First USB connection / reconnection

The app previously began with `activeSceneIndex = 0`. If the initial status read failed, `readActiveBuffer()` could silently use Scene 1 as its fallback. This made an unknown hardware scene look like a confirmed Scene 1.

The fix:
- clears scene/program confirmation when the USB connection is established or the MIDI port reconnects;
- retries the `15 00` active-program/scene status query up to three times;
- prevents a connected device with unknown scene state from defaulting to Scene 1;
- displays no active scene button / selection while the scene is not yet confirmed;
- allows subsequent hardware polling to establish the current scene if the first connection-time read cannot complete.

The active-scene response parsing fields were not changed in this patch: the existing body indexes for program and scene are retained. The scene response's byte-9 interpretation still needs a direct physical capture if it is ever disputed; this patch addresses synchronization order/races, not a new scene-index protocol discovery.

## Code changes

- `www/index.html`
  - Third-party-only Low Cut / High Cut hardware index swap.
  - Preserve legacy draft parameter lookup.
  - Introduce scene-state revision guard.
  - Discard in-flight stale status and scene-buffer reads.
  - Retry active scene read on connection/poll.
  - Reset unconfirmed scene state on connect/reconnect.
  - Avoid implicitly selecting Scene 1 while device scene is unknown.
- `tests/ir-user-cut-scene-sync.test.js`
  - Regression assertions for User IR remapping, outgoing/incoming CC mapping, packed scene readback, legacy draft mapping, external CC80 event precedence, stale poll/buffer rejection, connection reset and unknown-scene UI.
- `.github/workflows/build-apk.yml`
  - Enable this branch for the Android debug build workflow.

No edits were made to:
- `www/ir-transfer.js` or the User/Third-party 10/09/11 transfer protocol;
- IR Collection 6A/6B/6C protocol;
- NAM transfer or NAM model metadata;
- global MIDI CC tables or preset slot mappings;
- Copy Scene payload/write protocol;
- USB audio, Loopback, Jam, Record, or DAW.

## Validation status

- Static source review confirms the Third-party-only remap flows through the shared control index used by send, receive and packed scene readback.
- All in-source callers of `readActiveBuffer({skipSceneStatus:true})` found during review specify an explicit `sceneIndex`; none relies on an implicit fallback.
- Automated regression test was added; execution in the full repository Node test suite and Android Gradle build are pending GitHub Actions.
- No APK is claimed as built in this record.
- No physical MG-30 test has been performed in this execution. The User IR cut orientation and the two scene-switch scenarios still require confirmation on the original MG-30 Gen 2 hardware.

## Hardware verification checklist

1. Connect MG-30 while Scene 2 or Scene 3 is active; check that the matching scene is selected in the editor without tapping it.
2. Use an external footswitch to move Scene 1 → 2, 2 → 3, and 3 → 1; make sure the app stays on the same scene as the pedal after the initial transition and subsequent status polls.
3. While a scene is loading, switch again from the external pedal; ensure the earlier buffer read is discarded and the newest scene wins.
4. In IR > Third-party, adjust Low Cut only and confirm High Cut does not move; then adjust High Cut only and confirm Low Cut does not move.
5. Confirm both User IR Cut controls still read correctly after switching away from and back to the User IR model.
6. Recheck one built-in factory IR and one NAM model to ensure their existing parameter layouts remain unchanged.

Do not merge into the production branch or call the hardware bugs fully verified until these physical checks pass.
