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

## User correction — follow QuickTone name handling, remove alias prompt (31 Oct 2026)

The user tested the alias prompt on Android. For the built-in IR name `YA DXVB 112 Mix 10` (18 bytes), confirming the dialog with OK failed. The user explicitly rejected a manual alias workflow and requested that MG30 Studio behave like QuickTone, which truncates some long names and is acceptable to the user.

The alias prompt implementation was therefore removed. The current export path now:
- reads and retains the full original IR metadata name during hardware readback;
- writes only the first 16 printable ASCII bytes into the validated `.mg30patch` resource-name field, trimming any trailing whitespace left at the 16-byte boundary;
- does not ask the user to type or confirm an alias;
- does not alter the original IR name on the pedal, waveform samples, curve data, three scene records, importer, Collection workflow, NAM transfer, or MIDI mappings;
- reports when the file name was shortened, showing both the stored name and the full device name.

This matches the user's observed QuickTone behavior and the 16-byte file field supported by the supplied single-preset sample. It is an evidence-led compatibility behavior based on the user's direct QuickTone comparison; exact internal implementation of QuickTone's string-copy routine was not independently proven by disassembly.

Regression tests now use `YA DXVB 112 Mix 10` and verify the serialized/imported name becomes `YA DXVB 112 Mix` without a prompt, plus exact 16-byte boundary and unsupported-character behavior.

Commits:
- `110fa30e88d891b5be18bf11e1793f956df54936` — QuickTone name fitter.
- `3ff07539f750fcd918b66ab677727dbf968182cd` — remove manual alias prompt.
- `dc529d6c5ec00d0ac4dd226d2676695b808d8343` — regression tests.
- `10bd2a3b29ce7e4e1c58816c6bb6810139737a0a` — update readback comment.


## Critical correction — file stores a 32-byte IR name, not 16 (31 Oct 2026)

The preceding 16-byte assumption and the first-16-byte truncation implementation were incorrect. The 16-byte name in the supplied test file was simply short; the adjacent 16 bytes were zero because that sample's name did not need the full field.

Disassembly of QuickTone v2.6.7.16 was repeated directly from the supplied executable:

- At VA 0x004B5180, QuickTone copies a 16-byte chunk from internal-record offset 0x1B2, then copies a second 16-byte chunk from offset 0x1C2 into the same contiguous name buffer.
- Offset 0x1D2 is where the RIFF/WAVE area begins. Therefore 0x1B2..0x1D1 is a 32-byte IR name field; 0x1C2..0x1D1 is the second half, not padding.
- The preset import 09/01 builder already transports a 32-byte name field. Metadata reply 09/02 also provides 32 name bytes after the 4-byte CRC.

The app has now been corrected to:
- read all 32 bytes from offset 0x1B2 when parsing the .mg30patch file;
- serialize the name across offsets 0x1B2..0x1D1;
- accept up to 32 printable ASCII bytes in the preset Import 09/01 name frame;
- preserve the complete 18-byte user example `YA DXVB 112 Mix 10` without any alias prompt or truncation;
- limit only names longer than 32 printable ASCII bytes to their first 32 bytes, matching the fixed-width QuickTone field;
- leave the independent standalone IR WAV uploader (whose UI currently has a 20-character cap), NAM transfer, Collection workflow, and MIDI mapping unchanged.

The earlier commits that implemented a manual alias dialog and then 16-byte truncation are superseded by this correction. Do not reintroduce either behavior.

Regression tests now cover an exact 32-byte name, the user's 18-byte built-in IR name, a 36-byte name clipped to 32 bytes, and the 32-byte name payload passed through the preset import plan.

Code commits:
- `ccd3379b85c7a5ae401df3b7d4d91dbe5cf187a9` — read/write full 32-byte preset name.
- `a9b674d877cf31680b4d50442d2811c04771935b` — test 32-byte field and 18-byte user name.
- `d75d55942ad57562b8b27018d4cda9933e237476` — update Export status to mention 32-byte limit.

The updated APK build and physical export/import validation are still required before considering this complete.
