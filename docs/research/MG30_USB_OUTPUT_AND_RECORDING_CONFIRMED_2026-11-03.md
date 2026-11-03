# MG-30 USB Output and App Recording Confirmed — 2026-11-03

## User-reported result

After changing settings on the physical NUX MG-30 device:
- **ROUTING MODE was changed to REAMP.**
- **PLAY LEVEL was raised** until the sound became audible.
- The previously silent application/test audio then became audible.
- Pressing **Record** in the app also captured the sound.

This supersedes the earlier physical observation that the 440 Hz test tone was routed to the MG-30 but inaudible. The latest user report confirms audible output with REAMP selected and PLAY LEVEL raised, and confirms that the app's Record operation captured sound in that test.

## What is confirmed

1. The user reports audible audio after selecting REAMP on the MG-30.
2. The user reports raising PLAY LEVEL until the sound was audible.
3. The app's Record operation captured the sound during the same test.
4. Device-side USB routing and playback level settings affect the audible result; Android route verification alone was insufficient to establish audible playback.

## What remains unknown

- The exact numeric PLAY LEVEL value (not provided).
- Whether the recorded sound was captured through the app's USB input/AudioRecord path, and whether the user played back the resulting recording for verification.
- Whether the MG-30's REAMP behavior has been independently validated end-to-end with a known dry signal and recorded/returned processed signal.
- Whether USB Loopback and NORMAL have each been independently tested.

Do not infer the numeric level from the report. Ask for it only if needed to reproduce the working state.

## Engineering implications and constraints

- Treat **REAMP + raised PLAY LEVEL** as the currently user-confirmed audible configuration.
- Retain the current known-good AudioRecord/input path. Do not refactor or replace it based only on this result.
- Do not claim USB Loopback or full end-to-end Reamp processing is confirmed until each is tested explicitly. Audible application audio in REAMP mode is a positive test result, but not by itself proof of the complete dry-in/processed-return workflow.
- Keep Android route detection and acoustic output confirmation as separate statuses in the UI/logs.
- Preserve original NUX MG-30 Gen 2 firmware 6.0.x targeting (not MKII).
- Do not alter working NAM transfer, User/Third Party versus Collection IR command families, or established MIDI mappings.

## Suggested next validation

1. Keep the currently working REAMP mode and PLAY LEVEL unchanged while testing.
2. Make a short app recording, stop it, and play back the saved recording to verify the captured file independently.
3. If testing the full Reamp workflow, send a known dry signal and verify the processed return separately.
4. Test NORMAL and USB Loopback only as separate controlled cases, documenting each result without changing the known-good REAMP setup.
