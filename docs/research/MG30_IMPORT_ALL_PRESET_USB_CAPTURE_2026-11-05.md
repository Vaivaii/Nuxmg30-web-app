# NUX MG-30 Import All Preset USB Capture Analysis — 2026-11-05

## Scope and source

- Target: original NUX MG-30 Gen 2, firmware family 6.0.x (not MG-30 MKII).
- Capture: `importallpreset.pcapng`, supplied by the user on 2026-11-05.
- File size: 1,295,156 bytes.
- SHA-256: `7d5700db54aba827ba36d428e0bb94b45df4150df009c3c4b4e9a1ff5b875005`.
- Parsed manually as pcapng Enhanced Packet Blocks and USBPcap records. 9,666 USB records; observed bulk endpoint OUT `0x02` and IN `0x82` on USB bus 1/device 2.
- This is a packet-level capture observation, not yet a physical replay/import implementation or a firmware-wide guarantee.

## High-confidence findings

The capture contains a complete-looking QuickTone All Preset import transaction with request/response traffic:

| SysEx command | Direction | Count | USB payload length | Interpretation |
|---|---:|---:|---:|---|
| `75/01` | OUT | 2 | 20 | transaction/setup control; exact sub-step meaning still unknown |
| `75/02` | IN | 2 | 20 | corresponding device responses |
| `09/01` | OUT | 27 | 84 | per-preset resource/IR metadata records |
| `09/03` | IN | 27 | 20 | acknowledgements |
| `10/01` | OUT | 1,728 | 276 | waveform data |
| `10/03` | IN | 1,728 | 20 | acknowledgements |
| `11/01` | OUT | 270 | 276 | curve data |
| `11/03` | IN | 270 | 12 | acknowledgements |
| `0B/01` | OUT | 384 | 296 | preset scene/parameter writes |
| `0B/03` | IN | 384 | 20 | acknowledgements |
| `15/01` | OUT | 1 | 20 | final transaction/control frame |
| `15/02` | IN | 1 | 20 | final response |

The capture has 2,412 non-empty OUT packets and 2,412 non-empty IN packets in the bulk stream. Every listed data write has a corresponding response packet in the capture. The transaction spans approximately 107.4 seconds of capture timestamps.

### Preset and IR structure

- `0B/01` appears exactly 384 times. The first two index bytes in the payload enumerate preset indices 0–127, each with scene indices 0, 1, and 2: **128 presets × 3 scenes = 384 writes**.
- `09/01` appears 27 times. Its first two index bytes identify these preset indices:
  `0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 22, 27, 31, 80, 81, 82, 83, 91, 109, 110, 111, 115`.
- `10/01` count is exactly 1,728 = 27 × 64.
- `11/01` count is exactly 270 = 27 × 10.
- The matching 27 metadata records, 64 waveform frames per record, and 10 curve frames per record strongly indicate that the all-preset transfer sends IR resources only for the 27 indexed presets that carry IR/resource data. This aligns with the previously analyzed all-preset file, which has 27 records marked as containing the IR/resource marker. Treat the association as high-confidence, but verify payload-to-record byte mapping before implementing the serializer.

### Order observed

The packet stream shows the initial `75` control exchange, then the IR/resource metadata and data transfer groups (`09`, `10`, `11`) with request/response acknowledgements, followed by the 384 scene writes (`0B`) and the final `15` control exchange. Confirm exact interleaving/group boundaries from packet order when implementing; do not flatten or reorder the frames.

## Important distinction from existing single-preset import

The existing single-preset capture used a different header parameter family (notably `0x3C` for metadata and `0x78` for waveform/curve, as previously documented). This All Preset capture uses the `0x70` family visible in the `F0 43 58 04 70 ...` SysEx prefix. Do not reuse the single-preset frame builder unchanged or assume its transfer header/offset rules apply.

The All Preset capture also includes a `75` setup exchange and a `15` final exchange absent from the previously analyzed single-preset QuickTone import capture. Preserve these as distinct phases in the implementation model until their semantics are fully validated.

## Implementation guidance / safety constraints

1. Build a separate All Preset import planner/transport path based on this capture. Do not replace or mutate the working single-preset import path.
2. Keep the 128 × 3 `0B/01` scene writes separate from the 27 IR resource groups (`09/01`, `10/01`, `11/01`).
3. Preserve the original per-frame order, index bytes, payload sizes, and request/response pacing. Do not synthesize missing frames or omit acknowledgements.
4. Do not route this data through the IR Collection protocol (`6A/6B/6C`). This capture documents the preset All Import path; it does not establish the Collection import protocol.
5. Do not touch NAM transfer (`58`), MIDI mappings, existing IR User/Third Party behavior, or the Collection browser/import work.
6. Do not use `writeHardwarePreset()` blindly: its known extra `07/01` behavior differs from the captured QuickTone import path.
7. Before physical testing, back up all pedal presets. All Preset import can overwrite the full 128-preset bank. Never test on a device containing unbacked-up user presets.

## Still unresolved

- Exact semantic meaning of `75/01` and `15/01`.
- The inner data encoding and per-frame offset/index interpretation for `10/01` and `11/01`; counts and group cardinality are established, but a byte-accurate payload mapping is still needed.
- Whether the 27 IR resource groups are associated one-to-one with the 27 `09/01` preset indices in exactly the same order; strongly indicated by cardinality and ordering, but must be confirmed by correlating each group to the source all-preset file.
- Whether QuickTone performs any preflight/read/backup exchange outside the captured transaction. This capture only establishes what is visible in this file.

## Conclusion

This capture is sufficient to establish the major All Preset import protocol shape: 128 presets × 3 scene writes, plus 27 per-preset IR/resource metadata groups, each with 64 waveform frames and 10 curve frames, bracketed by `75` and `15` control exchanges. It is not yet sufficient to safely ship a production All Preset importer. Next work should decode the 27 resource groups and frame offsets against the known `MG30AllPatch.mg30patch` binary, then implement a separate planner and add offline golden tests before any pedal write.


## Binary fixture validation — original MG30AllPatch.mg30patch (2026-11-05)

The user re-uploaded the exact all-preset file previously analyzed. The bytes match the prior sample exactly:

- Size: 1,267,456 bytes (0x135700).
- SHA-256: ea502ba24001d363c21950ed676bf77271026ac30ced4d10241168e10fe0b22a.
- 128 records × 0x26AE bytes; no trailing bytes.
- Resource marker distribution: 101 records = 0, 27 records = 1.
- The 27 resource-bearing record ordinals are: 0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 22, 27, 31, 80, 81, 82, 83, 91, 109, 110, 111, 115.
- All 128 ordinals are sequential and each record contains three complete 142-byte scene records.
- All 27 resource names decode as printable ASCII.
- All 27 resource payloads decode to 2,048 finite float32 samples and 600 uint16 curve values; all curve values are within 0–305.
- Ordinal 91 has a nonstandard/zero RIFF signature, but its resource arrays and name remain structurally readable. The All parser intentionally does not require a RIFF signature for marked records.

### Planner ordering correction

Review against the packet sequence showed the planner must not interleave one preset's resource transfer with its scene writes. The observed capture completes all 27 resource groups first (each: 09/01, 64 × 10/01, 10 × 11/01), then writes all 384 scene records in program/scene order, followed by 15/01 and the closing 75/01 exchange.

Commit b63e90c743d84e1e3d8ce68733ae42c29a87adc9 corrects www/mg30-preset-all-import.js to collect the 384 scene steps separately and append them only after all 27 resource groups. Commit 9eed04ab3433ed80a54434289ac61b6aeaaae99f adds regression assertions for the phase boundary and ascending scene order.

The actual binary fixture was validated by direct byte inspection in this session. The repository's complete Node test suite, Android build, and physical hardware import have not yet been run in this session. Do not treat the current branch as ready for a destructive full-bank pedal test until those checks pass.


## Physical Import All test report — user screenshots (2026-11-05)

The user reports the Import All operation completed. The app status shown in the screenshot confirms 2,412/2,412 frames acknowledged, but reports a byte-for-byte scene readback mismatch at program 72, scene 0. Therefore the write transaction received all ACKs, while the post-write readback verification did not pass completely. The second screenshot shows USB MIDI Disconnected after the operation. Do not describe this run as fully verified, do not automatically retry Import All, and do not alter the captured write sequence without investigating program 72 scene 0. Preserve this report for the next session.

## Next phase: Export All Preset

The current implementation supports read-only export of one selected preset (three scenes plus resource metadata/waveform/curve). Export All is not yet implemented. The all-preset import capture does not establish the inverse read protocol or QuickTone's all-export transaction. Next required evidence: a separate USBPcap capture of QuickTone v2.6.7.16 performing Export All on the original MG-30 Gen2 FW 6.0.x. Export is read-only and does not overwrite the pedal. Capture must include the full transaction from before pressing Export All until QuickTone finishes saving the all-preset file. Preserve the capture and exported .mg30patch as paired golden fixtures. Do not assume the import packet sequence can simply be reversed.


## Export All capture attempt — exportallpre.pcapng (2026-11-05)

User supplied `exportallpre.pcapng` for the Export All investigation. The capture is only 2,880 bytes and contains 22 Enhanced Packet Blocks. It shows USB enumeration / descriptor control traffic and does not contain the bulk endpoint data transfer sequence needed to reconstruct the 128-preset export. Treat this as an incomplete/incorrect capture, not evidence that Export All itself failed. No Export All protocol assumptions or code changes should be made from this file. Request a new capture with the correct USBPcap root-hub interface active before pressing Export All, and keep capture running until QuickTone finishes writing the resulting `.mg30patch` file.
