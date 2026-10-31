# MG-30 Preset Export — Long IR Name Handling

Date: 31 October 2026  
Target: original NUX MG-30 Gen 2, firmware 6.0.x  
Repository branch: android/ui-polish-pass-1

## User-reported failure

The export diagnostic for preset slot 03B / resource index 9 (31 Oct 2026, 12:54:35Z) completed all readback requests successfully:

- 10/00 waveform: 64/64 replies matched returned offsets 0 through 2016.
- 11/00 curve: 10/10 replies matched returned offsets 0 through 576.
- replyTag was 9 throughout; returned offsets matched the requested offsets.
- No missing response or transport failure was reported (failure: null).

Only after all data had been collected did the serializer guard stop export with the message that the IR name was 18 characters while the single-preset format field was 16 bytes. This is not evidence of a NAM or Third Party transfer failure. The device readback path reached completion.

## Confirmed source of the mismatch

The current code has two distinct name widths:

1. Device IR metadata readback (09/02) decodes a 36-byte metadata payload: 4 bytes CRC followed by a 32-byte name field. The read parser strips at NUL and accepts printable ASCII; it does not impose a 16-byte limit.
2. The reconstructed Gen2 single-preset .mg30patch record has a 16-byte resource-name field at offset 0x1B2. The inspected QuickTone sample contains c414_cap_45_dc in this field. Bytes 0x1C2..0x1D1 are padding in the supplied sample; their use as name extension is not established.
3. The protocol import name packet 09/01 itself carries a 32-byte name field. The separate IR WAV upload UI currently constrains its input to 20 characters. These widths must not be conflated with the 16-byte field in the single-preset file.

## Code change

- Removed the 16-character hard stop from the end of the preset IR readback function. The readback can now return a valid device resource name even when longer than the file field.
- Added an explicit export-time alias prompt when the source IR name exceeds 16 encoded bytes.
- The suggested default is the first 16 characters, but the user must confirm or edit it. The app never silently truncates the resource name.
- Alias validation requires 1–16 printable ASCII bytes. Canceling the prompt cancels file export; it does not write to the pedal.
- The .mg30patch serializer remains strict at 16 bytes. No bytes in the 16-byte padding region are repurposed.
- Export status distinguishes the original device name from the alias stored in the file. On subsequent import, the alias becomes the User/Third Party IR name; waveform and curve data remain those read from the device.
- No change was made to the IR User/Third Party uploader, Collection workflow, NAM transfer, MIDI mappings, scene writes, or preset importer.

## Tests added

tests/mg30-preset-format.test.js checks:
- a 16-byte alias serializes/parses and is retained in the 78-step import plan;
- an 18-byte original name remains rejected by the strict file serializer until an alias is supplied;
- the resulting alias is the name encoded by the import plan.

GitHub Actions run for the current branch must pass npm test and the Android debug build before the APK is considered ready for user testing.

## Hardware validation still required

After installing the new APK on the original MG-30 Gen 2:

1. Export slot 03B again.
2. When prompted, select a recognizable alias of at most 16 ASCII characters.
3. Confirm the saved file size is 9,902 bytes.
4. Import that file to a safe test slot and confirm all three scenes, the IR waveform/curve transfer ACKs, and the resulting alias in User/Third Party.
5. Verify the IR sounds/behaves as expected. Existing importer status confirms ACK completion but does not independently read back the transferred IR.
6. Also retest a preset whose IR name is 16 bytes or fewer; it should export without a prompt.

This is a compatibility workaround for the currently reconstructed single-preset file layout, not proof that QuickTone itself aliases names this way. Full-name storage beyond 16 bytes remains unresolved. Do not extend the field into padding unless a matching QuickTone file/capture proves that representation.

## Commits

- 2031e99448b8219361a4b2503364431e6977f35b — allow completed long-name metadata readback.
- 7d32128470b34da5df3e8d45630aa7559c1c5f9f — add explicit export alias prompt.
- b879597461a970e1ba366e2628dd5a3b9003c5d0 — add format/alias tests.
- 61cce3e0f971675e03183b948a2598911c87ac99 — use a 16-byte alias in the boundary test.