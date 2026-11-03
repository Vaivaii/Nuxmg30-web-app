# MG-30 USB Output and App Recording Confirmed — 2026-11-03

## User-reported result

After changing settings on the physical NUX MG-30 device:
- **ROUTING MODE was changed to REAMP.**
- **PLAY LEVEL was raised** until the sound became audible.
- The previously silent application/test audio then became audible.
- Pressing **Record** in the app also captured the sound.

This supersedes the earlier physical observation that the 440 Hz test tone was routed to the MG-30 but inaudible. The latest user report confirms audible audio with REAMP selected and PLAY LEVEL raised, and confirms that the app's Record operation captured sound in that test.

## Correct intended Reamp workflow

The user's intended DAW workflow is the standard reamp process:
1. Record a clean/dry guitar performance into a DAW track.
2. Route that dry track's output to the MG-30 over USB while the device is in REAMP mode.
3. Play the dry performance repeatedly; the MG-30 processes it through the current amp/cab/effects/IR chain.
4. Record the MG-30's processed/wet return to a separate DAW track.
5. Adjust the MG-30 tone and repeat the pass as needed without replaying the guitar performance live.

A published MG-30 workflow description specifically describes REAMP mode as allowing dry recording while monitoring wet sound, then soloing the dry track, routing its output to MG-30, and recording the processed result on another track. See: https://www.soundhouse.co.jp/en/contents/column/index?post=3543

## What is confirmed

1. The user reports audible audio after selecting REAMP on the MG-30.
2. The user reports raising PLAY LEVEL until the sound was audible.
3. The app's Record operation captured sound during the same test.
4. Device-side USB routing and playback level settings affect the audible result; Android route verification alone was insufficient to establish audible playback.

## What remains unknown

- The exact numeric PLAY LEVEL value (not provided).
- Whether the app's current Record control records the MG-30 processed USB return, the dry USB input, or another selected input path. The user's report that sound was captured does not yet establish which USB channel pair was recorded.
- Whether the complete DAW-like dry-track playback -> MG-30 processing -> separate wet-return recording workflow has been validated end-to-end in MG30 Studio.
- Whether USB Loopback and NORMAL have each been independently tested.

Do not infer the numeric level or USB channel mapping from the report.

## Engineering implications and constraints

- Treat **REAMP + raised PLAY LEVEL** as the currently user-confirmed audible configuration.
- Preserve the current known-good AudioRecord/input path. Do not refactor or replace it based only on this result.
- Next, explicitly identify USB input channel pairs and distinguish dry capture from processed return capture before adding automatic DAW routing.
- Implement/test the reamp workflow as two distinct tracks/paths: dry source playback to MG-30 USB output, and processed MG-30 USB input recorded to a separate wet track.
- Provide transport controls (play/stop/record/monitor) and clear source/destination channel selection; avoid feeding the wet return back into the dry playback path, which could create a feedback loop.
- Do not claim full end-to-end Reamp processing is confirmed until a known dry signal is played from the app into MG-30 and the processed return is captured separately and verified.
- Keep Android route detection and acoustic output confirmation as separate statuses in the UI/logs.
- Preserve original NUX MG-30 Gen 2 firmware 6.0.x targeting (not MKII).
- Do not alter working NAM transfer, User/Third Party versus Collection IR command families, or established MIDI mappings.

## Suggested next validation

1. Keep the currently working REAMP mode and PLAY LEVEL unchanged.
2. In MG30 Studio, play a known dry test clip/file through the USB output and confirm it is heard after the MG-30 processing.
3. Record the MG-30 USB return to a separate wet recording, stop, and play it back to verify it contains the processed tone.
4. Inspect/confirm which USB input channels contain the dry signal versus the processed return; do not guess channel mapping.
5. Only after the above works, build the full DAW workflow and add level meters/monitoring.
6. Test NORMAL and USB Loopback only as separate controlled cases, documenting each result without changing the known-good REAMP setup.
