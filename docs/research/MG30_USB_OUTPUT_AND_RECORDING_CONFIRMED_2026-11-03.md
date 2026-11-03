# MG-30 USB Output and App Recording Confirmed — 2026-11-03

## User-reported result

After changing settings on the physical NUX MG-30 device:
- The previously silent test/application audio became audible.
- Pressing **Record** in the app also captured the sound.

This supersedes the earlier physical observation that the 440 Hz test tone was routed to the MG-30 but inaudible. The latest user report confirms audible output after device-side settings were changed, and confirms that the app's Record path captured sound in that test.

## What is confirmed

1. Audio output can be heard from the MG-30 under the newly changed device settings.
2. The app's Record operation captured the sound during the user's test.
3. The device-side settings matter to the audible result; Android route verification alone was insufficient to establish audible playback.

## What remains unknown

- The exact MG-30 settings changed by the user (for example, USB ROUTING MODE, PLAY LEVEL, or another device setting).
- Whether the recorded sound was captured through the app's USB input/AudioRecord path, and whether the user played back the resulting recording for verification.
- Whether USB Loopback, Reamp, and other routing modes have each been independently tested.

Do not infer the exact mode or level from the report. Ask which setting(s) were changed when needed to reproduce the working state.

## Engineering implications and constraints

- Retain the current known-good AudioRecord/input path. Do not refactor or replace it based only on this result.
- Do not claim Reamp or USB Loopback is confirmed until each is tested explicitly.
- Keep Android route detection and acoustic output confirmation as separate statuses in the UI/logs.
- Preserve original NUX MG-30 Gen 2 firmware 6.0.x targeting (not MKII).
- Do not alter working NAM transfer, User/Third Party versus Collection IR command families, or established MIDI mappings.

## Suggested next validation

1. Record the exact working MG-30 device settings (mode and levels) before changing anything else.
2. Repeat the audible output test with the same settings.
3. Make a short app recording, stop it, and play back the saved recording to verify the captured file independently.
4. Test NORMAL, USB Loopback, and Reamp only as separate controlled cases, documenting each result and never treating one mode's result as proof for another.
