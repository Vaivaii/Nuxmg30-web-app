# NAM transfer + TONE3000 integration notes

Target device: original NUX MG-30 Gen 2 running firmware 6.0.5. This is not the MG-30 MKII.

## What the supplied capture proves

The USBPcap capture `nam import.pcapng` has 354 packets. On host-to-device MIDI endpoint 0x02, the import-like sequence contains 63 SysEx writes with command byte 0x01. The device replies on endpoint 0x82 with 63 command-0x03 acknowledgements. A 167-byte setup message uses selector 0x0E / field 0x0C; the following messages use selector 0x0E / field 0x04 / subfield 0x18. The data messages are mostly 177 bytes, with a 58-byte final message. A chunk at the first counter value is repeated identically.

After those writes, QuickTone issues two readback rounds over selectors 0x00, 0x02, ... 0x12. There are 20 requests and 20 replies. The capture also contains MIDI CC messages at the end.

## What remains unknown

The capture does **not** yet prove the exact NAM payload serialization, the counter's units, setup fields, transfer completion condition, or full mapping from this import sequence to the intended slot. The input `.nam` is JSON with two nested WaveNet submodels, but its source JSON is not simply copied as readable text into the captured SysEx messages. Do not build a live sender from guessed headers or inferred offsets.

The branch includes a native Android MIDI adapter using Android's MIDI service and a protocol-analysis landing point. It is not yet proof that the adapter connects successfully to the user's MG-30 on hardware. On-device tests are still required.

## TONE3000 integration status

The UI starts from TONE3000's official OAuth Select flow using PKCE, filters the selection UI to NAM format and architecture 2, retrieves the chosen tone metadata and model list, and saves/downloads a user-selected model. It stores only a publishable key in the key field; never put a TONE3000 client secret in the app.

Native Android callback URI configured in the generated manifest: `mg30studio://oauth/callback`. This exact URI must be registered in the TONE3000 developer settings. Web builds use the current page URL, which must also be registered if using the web version.

TONE3000 architecture 2 is **not by itself proof** that a model satisfies the MG-30 Gen 2's A2-Lite compatibility constraints. Keep the direct-send button disabled until payload conversion and the device's transfer/finalization behavior are verified.

## Next validation steps

1. Build the APK on this branch and fix compile/build issues.
2. Test Android USB-MIDI connection/readback on the physical original MG-30 with firmware 6.0.5.
3. Obtain or compare an additional capture of a transfer to a safe/empty slot, or inspect QuickTone's `loadNamFile` / `load_and_validate_nam_model` implementation in the original MG-30 path.
4. Confirm payload conversion, target slot field, chunk counter semantics, ACK acceptance, and finalization before enabling model writes.
5. Test TONE3000 OAuth on Android after the publishable key and callback URI are registered.

This work is on `android/nam-transfer-tone3000`; it does not modify `main` or the existing working MIDI mapping.
