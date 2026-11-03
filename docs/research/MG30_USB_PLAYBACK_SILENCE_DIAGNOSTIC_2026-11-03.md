# MG-30 USB Playback Silence — Field Result and Next Diagnostic (2026-11-03)

## Field result from Build #354

The user ran the 1.2-second, low-level 440 Hz tone test. The app reported:
- requested/actual endpoint: `USB-Audio - NUX MG-30`
- Android device ID: `129438`
- route equality check passed
- AudioTrack wrote the test signal

The user explicitly reported: **no sound was heard**.

### Correct interpretation
- Android's routing API reports that AudioTrack is routed to the MG-30 USB endpoint and that writes were accepted.
- The physical/acoustic output test failed.
- Do not call this successful MG-30 playback. The UI currently overstates success by saying the tone was successfully written while routed to MG-30; the next UI should distinguish `ANDROID ROUTE VERIFIED / ACOUSTIC OUTPUT UNCONFIRMED`.
- Do not proceed to DAW playback, Reamp, or Loopback until the USB playback path is understood and the user can hear a controlled test.

## Official documentation clues

Official NUX product page says MG-30 supports USB-C routing modes including `NORMAL`, `USB Loopback`, `REAMP`, and `DRY OUT`:
https://nuxaudio.com/product/mg30/

The MG-30 owner manual's USB ROUTING section says the settings include `REC LEVEL`, `PLAY LEVEL`, and `ROUTING MODE`, and that QuickTone can adjust the same settings. The manual screenshot shows `NORMAL` as the routing mode:
https://www.bax-shop.nl/downloads/products/9000-0083-7212/nux_mg-30_user_manual.pdf
Relevant manual lines 320-325 and 706-711 in the retrieved page text.

The manual also says the MG-30 headphone output follows the main OUTPUT path (manual lines 234-240), so acoustic verification should explicitly identify whether the user listens through MG-30 headphone jack or main L/R output.

## Next controlled diagnostic (read before changing)

Ask user to inspect, not immediately change:
1. On MG-30, hold HOME/GLOBAL and open `USB ROUTING`.
2. Report the current `ROUTING MODE` and `PLAY LEVEL` values.
3. Also establish whether listening is from the MG-30 headphone jack or main L/MONO/R output, and whether ordinary guitar/preset audio is audible there.

Do not ask user to enter a different mode until the current values are known. Avoid altering QuickTone or device routing as a blind fix. If mode is not NORMAL, plan a controlled switch to NORMAL and save only after user confirms current state and is comfortable changing it. Keep original Gen2 firmware target; do not use MKII assumptions.

## Engineering next steps after the setting check

1. Update test UI text: route verification is not proof of acoustic output; ask user to listen and report audible/no audible.
2. Record diagnostics from AudioTrack: requested endpoint ID, actual route ID, state, write count, playback head position, underrun count (where supported), channel mask, PCM encoding, buffer size, and endpoint format arrays.
3. Verify MG-30's USB routing mode and PLAY LEVEL before trying alternate formats.
4. The endpoint reports channel counts 2/3/4 and encodings 4/22. The current test uses stereo PCM_FLOAT. After confirming NORMAL mode and adequate PLAY LEVEL, compare a low-level test on supported channel configurations (stereo first, then carefully test multichannel only if Android accepts it and routing remains verified). Do not assume channel ordering without evidence.
5. If USB playback remains silent, make a fresh Windows USBPcap capture of QuickTone while playing a known audio stream in NORMAL mode, then compare USB endpoint isochronous OUT transactions and device configuration with Android's stream. Existing uploaded captures focus on MIDI SysEx and IR operations; they do not prove USB audio sample transfer or channel mapping.
6. Preserve the existing AudioRecord/input plugin, NAM, custom IR User/Collection paths, MIDI mappings, presets, and Signal Chain.

## Current build references
- Build #354 run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41581617961
- Source commit: `ff6ee4b7d7eb2727d2dd6ae99780a2c5fda0c750`
- 149 tests passed, 0 failed; Vite and Gradle build passed.
- APK artifact ID: `13206097872`.
