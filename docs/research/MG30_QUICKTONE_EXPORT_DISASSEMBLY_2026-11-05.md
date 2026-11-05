# QuickTone MG-30 Gen2 Export Disassembly — 2026-11-05

Target: QuickTone Windows 2.6.7.16, original NUX MG-30 Gen2. This analysis is not for MG-30 MKII.

## Summary

Disassembly of the MG-30 all-export path confirms that the Export All click handler serializes an already-populated in-memory preset manager. The handler does not issue MIDI/SysEx requests in the inspected routine. This matches the user's repeated observation that QuickTone Single Export and Export All do not generate new MIDI traffic when the export action is pressed.

This does not prove how/when the manager is populated. It may be populated by device synchronization or earlier reads; that upstream path still needs separate analysis.

## Confirmed code path and addresses

### All-preset export routine — VA 0x004AB710

Relevant instructions:

- Allocates and zeroes an output buffer of 0x135700 bytes.
- Reads a global manager pointer at VA 0x0B8D9718.
- If absent, allocates/constructs a manager object (constructor VA 0x004B1500) and stores it globally.
- Reads manager count from object offset +0x640.
- Iterates index 0 through count-1.
- For each index:
  - Calls manager accessor VA 0x004B4C40 to retrieve the indexed preset object from manager vector at +0x34, bounded by count at +0x3C.
  - Calls VA 0x004B4F80 to serialize/copy the preset object into a temporary 0x26AE-byte record.
  - Copies exactly 0x26AE bytes into the all-file output buffer.
  - Advances destination by 0x26AE and increments the index.
- After the loop, invokes a file-buffer helper at VA 0x004B56A0 with the complete 0x135700-byte buffer and the save-dialog path.
- Releases the temporary output allocation.

This establishes that Export All's direct source is the QuickTone in-memory manager, not a fresh per-slot MIDI read in this click handler. The routine's manager count is dynamic; the supplied MG30AllPatch file and earlier analysis show the original MG-30 all-bank case has 128 records.

### Manager indexed accessor — VA 0x004B4C40

Returns null when requested index is >= manager count at object offset +0x3C; otherwise returns vector element from pointer array at +0x34. This is a simple in-memory indexed lookup.

### Per-preset serializer — VA 0x004B4F80

- Receives a manager preset object and a destination pointer.
- Calls helper VA 0x004B5480 with the record's byte-sized ID/index and temporary storage.
- Copies/normalizes a 0x2504-byte structure into a 0x26AE-byte destination record.
- The exact semantic field map of every copied region is not fully named, but this routine is a per-record memory serializer, not a device transport routine.

### All-file reader/import helper — VA 0x004B5A20

This is a distinct inverse/conversion path and must not be confused with Export All:

- Requires input length exactly 0x12C800 (128 × 0x2590).
- Allocates an intermediate buffer of 0x12C800.
- Iterates 128 source records at stride 0x2590 and writes WAVE header fields into the per-record audio region.
- Allocates output of 0x135700 and converts each record into an internal 0x26AE record, with 3 scene conversions via helper VA 0x004B5EC0.
- The 0x12C800 input stride and 0x135700 output stride belong to this conversion helper. They do not override the all-export output size.

### File write helper — VA 0x004B56A0

Uses the file stream/buffer helper stack. When the stream is valid, passes the supplied buffer pointer and exact size 0x135700 into helper VA 0x0092C0C0 and finalizes the file stream. This confirms the export routine's output byte count.

## Correct interpretation of the previously confusing sizes

- All Export output: 0x135700 = 128 × 0x26AE.
- All Import reader input: 0x12C800 = 128 × 0x2590.
- The 0x11E-byte per-record difference is not evidence that the all-export output should be trimmed. The two lengths are used by different code paths and represent different intermediate/file forms.
- The user-provided original MG30AllPatch.mg30patch is 1,267,456 bytes = 0x135700, matching the all-export routine exactly.
- The exact binary sample SHA-256 already validated in the project is ea502ba24001d363c21950ed676bf77271026ac30ced4d10241168e10fe0b22a.

## Implications for MG30 Studio Export All

1. Do not ask the user to repeat USB-MIDI captures merely around the QuickTone Export button. The observed QuickTone export click handler serializes an in-memory manager.
2. The missing reverse-engineering target is upstream manager population/synchronization: identify how QuickTone obtains and refreshes all preset objects and associated IR/resource data before export is invoked.
3. For MG30 Studio, Export All can be built on the app's own independently validated hardware readback path, then serialize 128 validated single records into 0x135700 bytes. Do not imitate a nonexistent QuickTone MIDI transaction at the file-save click.
4. Before implementation, verify the app's current Single Export against hardware and understand the observed Import All readback mismatch at program 72 scene 0. These are separate checks.
5. Preserve NAM transfer, IR User/Third Party, IR Collection, MIDI mappings, existing Single Import/Export, and Import All.

## Outstanding questions

- What exact QuickTone synchronization path populates the manager object at global VA 0x0B8D9718?
- Does QuickTone update that manager from live device reads, an internal cache, or both?
- How are resource-bearing preset objects and 24-/32-bit WAVE data populated before serialization?
- What is the precise mapping between the internal manager object and the 0x2504 temporary serialization structure?
- Why did MG30 Studio Import All receive 2,412/2,412 ACKs but report a byte mismatch at program 72 scene 0 during readback? ACK completion and data verification must remain separate.

No application source code was changed in this disassembly step.

## Follow-up: inbound preset readback populates the export manager (2026-11-05)

A cross-reference search for the global manager pointer at VA 0x0B8D9718 found the inbound SysEx dispatcher and a concrete scene-readback ingestion path. This narrows the upstream question: the export manager is not merely an unexplained static cache; at least its scene portion is populated/refreshed by received Gen2 preset readback messages.

### Inbound dispatcher — VA 0x004A4E70 (message handling region)

- The dispatcher branches on the decoded SysEx command byte and handles several MG-30 Gen2 response families.
- In the 0B/02 branch, it ensures the global manager at 0x0B8D9718 exists (constructing via 0x004B1500 if needed), then invokes manager method VA 0x004B2060 with argument 0 before dispatching the update callback. The exact semantic meaning of this 0B/02 branch and method argument remains unresolved.
- In the 0C/02 branch, it reads scene/program fields from the response and dispatches the data into the manager path. The dedicated handler is VA 0x004A6EF0.

### Scene response handler — VA 0x004A6EF0

- Accepts only response command 0C/02 in the inspected branch.
- Reads the scene index from response byte offset +7.
- Calls VA 0x004B0410 to prepare a scene object, then VA 0x004A4970 to decode/copy exactly 0x8E (142) bytes from the response payload.
- Stores the 142-byte scene at manager object offset +0x54 + sceneIndex * 0x8E.
- When scene index is 2, invokes additional manager/cache update helpers (including VA 0x004B1110 and VA 0x004B2250) and a callback. This suggests the third scene closes or refreshes a complete three-scene preset object; the precise side effects still need to be named.

### Implication and limits

1. QuickTone's export manager scene content is fed by inbound 0C/02 preset-readback messages. This is direct static-code evidence of a readback-to-manager path.
2. The handler inspected here establishes scene storage only. It does not yet prove the exact request scheduling for all 128 slots, nor how IR metadata, waveform, curve and the 24-/32-bit resource variants are attached to each manager preset object.
3. The all-export routine reads manager count at +0x640, and each indexed object is serialized through 0x004B4F80. The manager's scene storage offset +0x54 is consistent with a manager-owned per-preset object, but a complete object layout has not been recovered.
4. This strengthens the design direction for MG30 Studio: batch export should perform read-only hardware readback for each slot, validate all three 0C/02 scenes, and separately read associated IR data only where a resource marker is positively established. Do not synthesize resource data for marker-0 presets.
5. No app code, import transaction, NAM path, Collection path, or MIDI mapping was changed by this analysis.

### Remaining static-analysis targets

- Identify the outbound QuickTone request path paired with the inbound 0C/02 response, including slot iteration and request pacing.
- Trace manager resource fields and their inbound response handlers (resource name, waveform, curve), including the 27 resource-bearing slots.
- Decode the 0B/02 and 0C/02 manager refresh callbacks sufficiently to determine whether a complete slot is considered valid only after all three scenes.
- Reconcile the app's successful single-preset export readback contract with this QuickTone manager ingestion path without modifying the known-good app exporter.

## Follow-up: QuickTone scene-read request scheduler and resource metadata ingestion (2026-11-05)

Further disassembly of the same original-MG30 Gen2 dispatcher resolved the immediate request/response pairing for scene data and clarified the role of the 0B/02 response.

### 0B/02 response selects the current preset and starts scene reads

In dispatcher VA 0x004A4E70, the 0B branch accepts response subcommand byte +7 equal to 0 or 2. It reads the preset/program index from response byte +8 and stores it in the transport/controller object at +0x30. It then ensures the manager at global VA 0x0B8D9718 exists, calls manager method VA 0x004B2060 with argument 0, and schedules callback VA 0x004A6DB0.

This is stronger than the earlier observation that 0B/02 merely refreshes the manager: the response's +8 byte is used as the current preset index, and the callback starts three scene reads for that selected preset. The exact distinction between 0B/02 response values 0 and 2 is not yet resolved; both enter the same scene-read callback path.

### Scene-read callback — VA 0x004A6DB0

The callback loops a local scene counter from 0 through 2. For each iteration it:

- Builds an MG-30 Gen2 SysEx request with command bytes 0C/00.
- Places the loop counter (scene index) in the request's scene field.
- Sends the request through the transport object at +0x74 using helper VA 0x00B0E360.
- Supplies a 1,000 ms timeout and waits through the transport helper before advancing to the next scene.

The matching inbound response handler is VA 0x004A6EF0, which accepts 0C/02 and stores the returned 142-byte scene at manager object +0x54 + sceneIndex * 0x8E. Therefore the paired sequence is:

1. Receive 0B/02 with preset index at response byte +8.
2. Set that preset as current manager/transport selection.
3. Send 0C/00 scene request for scene 0, then scene 1, then scene 2.
4. Receive corresponding 0C/02 responses and store each 142-byte scene.
5. On scene 2, invoke manager/cache update helpers and callback.

The code establishes the three-scene request order and the one-second timeout argument passed to the transport helper. It does not establish the exact retry policy or whether every wait consumes the full timeout.

### 19/03 and 18/03 inbound fields

The dispatcher also accepts response families 19/03 and 18/03 when response byte +7 equals 3:

- 19/03 obtains a manager-owned small record through VA 0x004B4E20 and copies response bytes +8 through +12 into record offsets +3 through +7 (five bytes).
- 18/03 obtains a manager-owned small record through VA 0x004B4E50 and copies response bytes +8 through +11 into record offsets +0 through +3 (four bytes).

These are confirmed manager-field updates, but their semantic labels (resource name, resource type, format, slot mapping, or other metadata) are not yet established. Do not map them to IR name/type fields in application code based only on their lengths.

### 6C/00 response path — what is and is not established

When command byte 6C is received with subcommand 00 and byte +7 equals 0, the dispatcher obtains several manager values through helpers VA 0x004B2180, 0x004B4830, 0x004B3E80, and 0x004B4000; serializes the manager object using VA 0x004B4F80; copies 0x2504 bytes into a temporary record; writes the current program index into the record's first four bytes; and calls VA 0x004B50A0.

This is a manager/resource processing and record-refresh path, but its relationship to IR waveform/curve acquisition is still unresolved. It is not enough to call 6C/00 an IR read request or to equate it with Collection's 6C/01 import command.

### Current evidence boundary

- Confirmed: QuickTone uses 0B/02 to select a preset and initiate the three sequential 0C/00 scene reads; 0C/02 fills the three 142-byte scene slots.
- Confirmed: 19/03 and 18/03 update small manager-owned metadata records, but field meanings remain unknown.
- Confirmed: 6C/00 invokes manager/resource helpers and refreshes a serialized record, but its underlying resource acquisition trigger is not yet identified.
- Not confirmed: the outbound request commands and payloads that cause the 19/03 and 18/03 replies; whether 6C/00 is a completion signal or a readback trigger; how 10/11 waveform/curve data is obtained in this QuickTone path; and how the manager's resource-presence flag is set.
- No application source code, firmware communication, NAM transfer, IR User/Third Party import, IR Collection logic, MIDI mapping, or Import All transaction was changed in this analysis.


## Follow-up: resource-metadata query frame 12/01 and packed 13/02 response (2026-11-05)

Additional disassembly around the response callbacks found a concrete manager metadata query that had not been documented:

### 12/01 query builder — VA 0x004A8410

- Builds a Gen2 SysEx frame with command bytes 12/01 (word 0x0112 in the little-endian immediate).
- Reads the current manager/controller byte through helper VA 0x004B2180 and places it in the query payload.
- Reads the manager field at object offset +0x644, adds 8, and passes that value as the request's indexed/length argument to transport helper VA 0x00B0E360.
- Uses the manager global at 0x0B8D9718 and the transport object at +0x74.
- The callback at VA 0x004A8650 accepts response 12/03. This confirms the request/response pair is 12/01 -> 12/03, not a 19/03 or 18/03 pair.

The exact meaning of the +0x644 field and the helper's indexed/length argument remains unresolved. This query is associated with the manager's per-slot metadata state, but should not yet be named an IR waveform or curve request.

### Packed descriptor response 13/02 — VA 0x004A8340

A separate callback at VA 0x004A8340 accepts response command 13/02 and writes response bytes into a manager-owned descriptor at offsets +0x7A through +0x82:

- Response bytes +6, +7, +8 are copied directly to +0x7A, +0x7B, +0x7C.
- Bytes +9 and +10 are combined into a packed nibble/flag field at +0x7D.
- Bytes +11 and +12 are combined similarly into +0x7E.
- Bytes +13, +14, +15, +16, +17 are copied to +0x7F through +0x82.
- It then calls manager helpers VA 0x004B3B40 and a callback.

This is a packed descriptor/metadata response, not direct evidence of sample payload. It may be relevant to resource-format/type selection, but the semantic mapping of these bytes is still unproven.

### Correction to command-family interpretation

The response handler at VA 0x004A8340 explicitly checks 13/02. Do not associate it with the 19/03 dispatcher branch simply because the earlier branch was adjacent in the same dispatcher. The request builder at VA 0x004A8410 is 12/01 and its paired response validator at VA 0x004A8650 checks 12/03. These are separate command families.

### Updated boundary

We now have one confirmed additional manager query pair (12/01 -> 12/03) and one confirmed packed descriptor response handler (13/02). The 19/03 and 18/03 branches still update manager records, but their request builders and exact field semantics have not been identified. No waveform/curve payload acquisition routine has yet been proven in this QuickTone export-manager path. No application code or device communication was changed.


## Follow-up: outbound 18/19 metadata writes and 61/01 block transfer (2026-11-05)

The adjacent request builders and ACK validators resolve the outbound side of two previously observed response families and expose a generic block-transfer routine.

### 18/01 -> 18/03 metadata exchange

- Request builder VA 0x004A8AF0 obtains a four-byte manager record through VA 0x004B4E50.
- It constructs command 18/01 and copies those four bytes into the request payload.
- It sends through the transport object at global 0x0B8D9714, using transport helper 0x00B0E360 with timeout argument 1,000 ms.
- Its response validator VA 0x004A8C70 accepts 18/03.
- The inbound dispatcher branch 18/03 copies response bytes +8..+11 back into the same four-byte manager record.

This is a manager metadata write/echo-style exchange. It is not evidence of an IR name or audio read operation.

### 19/01 -> 19/03 metadata exchange

- Request builder VA 0x004A8E20 obtains an eight-byte manager record through VA 0x004B4E20.
- It constructs command 19/01 and copies all eight bytes into the request payload.
- It sends through the same transport helper with a 1,000 ms timeout.
- Response validator VA 0x004A8FC0 accepts 19/03.
- The inbound dispatcher branch 19/03 copies response bytes +8..+12 into a five-byte subrange of the manager record at offsets +3..+7. The remaining request bytes are not copied back by this handler.

The outbound 19/01 request and inbound 19/03 response are therefore paired. Exact field semantics remain unknown.

### 13/00 -> 13/02 descriptor exchange (correction/clarification)

- Request builder VA 0x004A8220 constructs command 13/00, with a seven-byte transport payload argument and 1,000 ms timeout.
- Its callback VA 0x004A8340 validates response 13/02 and copies descriptor bytes into manager offsets +0x7A..+0x82, including two packed low-bit flags.
- This is distinct from the 12/01 -> 12/03 exchange described above. Both are real separate query/response pairs.

### Generic 61/01 block sender and 61/03 acknowledgements

Function VA 0x004A8800 accepts a byte buffer and a length, then iterates over it in 0x80-byte (128-byte) blocks:

1. Copies 128 source bytes into a local block.
2. Treats them as 64 little-endian 16-bit words.
3. Converts each 16-bit word into three 7-bit-safe bytes (high two bits, next seven bits, low seven bits), producing 192 packed bytes.
4. Builds a SysEx command 61/01 frame and sends it with transport helper 0x00B0E360, passing 0xCD as the transport payload/frame-length argument and a 1,000 ms timeout.
5. Advances the source offset by 128 bytes and repeats until the caller-supplied length is consumed.

The matching response callback VA 0x004A8A80 accepts 61/03. It advances the transfer object's progress offset by 128 bytes for each accepted response. Response status byte +6 equal to 2 schedules the next block; status 3 schedules the completion callback.

This is a confirmed generic chunked binary upload path with 7-bit packing and per-block ACK pacing. Its exact application-level data type is not yet proven. It could be a resource/sample transfer, but it must not be labeled IR waveform or curve without correlating the caller, source buffer construction, and manager resource object.

### What is now established vs unresolved

- Confirmed metadata exchanges: 18/01 -> 18/03 (4-byte record), 19/01 -> 19/03 (8-byte request record, 5-byte response copy), 12/01 -> 12/03, and 13/00 -> 13/02.
- Confirmed generic bulk sender: 61/01 uses 128-byte source blocks, packs 64 words into 192 7-bit bytes, and waits for 61/03 status 2/3 before continuing/completing.
- Not confirmed: whether the 61/01 caller is used for the 27 IR-bearing preset resources during QuickTone manager population, what data format is supplied, or whether a separate 61/00/61/02 readback path exists.
- The next target is the caller/xref of VA 0x004A8800 and the code that allocates/fills its source buffer. Trace that source to the manager's per-preset object and compare it with the known 0x26AE record's 2,048 float32 samples and 600 curve values.
- No app source code or device communication was changed. Existing Import All, Single Import/Export, NAM, User/Third Party IR, Collection, and MIDI mapping remain untouched.



## Follow-up: 61/01 caller traced to 800×480 image upload, not IR (2026-11-05)

A direct-call xref search for VA 0x004A8800 found one direct call in the inspected executable:

- Caller callsite: VA 0x0056CE55.
- Immediately before the call, the caller loads width from `[ebx]`, height from `[ebx+2]`, multiplies them, doubles the result, and passes the byte count plus source pointer `ebx+4` to 0x004A8800.
- In the same caller routine, the image descriptor is explicitly initialized with `0x01E00320`, which is little-endian width 0x0320 (800) and height 0x01E0 (480).
- The preceding pixel-processing loop runs 0x320 (800) columns for 0x1E0 (480) rows. It reads source pixel components and packs each pixel into a 16-bit value before the buffer is handed to the 61/01 sender.
- Thus the source buffer passed to 0x004A8800 is a 16-bit-per-pixel raster image buffer. For the explicit 800×480 descriptor, its byte count is 800 × 480 × 2 = 768,000 bytes.

### Corrected interpretation

The previously documented 61/01 routine is indeed a generic 128-byte block sender, but its only direct caller found by the xref search is an image/raster path. The caller's dimensions, row/column loops, pixel conversion and 2-byte-per-pixel length calculation identify this particular 61/01 use as an 800×480 image upload, not an IR waveform or curve transfer.

Accordingly:

1. Do not use this 61/01 caller as evidence for IR import/export or for the manager's 27 resource-bearing presets.
2. Remove 61/01 from the active candidate list for the missing IR waveform/curve path unless a distinct indirect caller or separate callsite is later demonstrated.
3. The original 61/01 transfer mechanics remain valid as a generic sender description; the application-level meaning is now resolved for the observed caller.
4. Continue tracing the 12/01, 13/00, 18/01 and 19/01 metadata exchanges and the manager resource fields for the actual 10/11 waveform/curve acquisition path. Do not infer that those metadata pairs carry waveform data.
5. No app source, APK, device communication, NAM path, IR User/Third Party import, Collection logic, Import All, or MIDI mapping was changed.


## Follow-up: actual 10/01 waveform and 11/01 curve senders identified (2026-11-05)

The search for the actual resource transfer path found two separate routines adjacent to the metadata handlers. These are distinct from the generic 61/01 image sender.

### 10/01 sender — VA 0x004AA700

- Builds a SysEx command word 0x0110, i.e. command bytes 10/01.
- Receives a one-byte preset/program index and a pointer to 32-bit source samples.
- Iterates a 0x800-element source range (2,048 samples), advancing the source index by 0x20 (32) for each request.
- For each transfer frame, it gathers eight 32-bit source values into a 32-byte staging block, converts the values into 7-bit-safe packed data, and sends through transport helper VA 0x00B0E360 with the 0xCD frame argument and 1,000 ms timeout pattern.
- The callback validator VA 0x004AAA10 accepts response 10/03.
- The frame carries the current preset index and a block/offset field. Exact header-byte semantics still need comparison against the packet capture.

### 11/01 sender — VA 0x004AAA40

- Builds a SysEx command word 0x0111, i.e. command bytes 11/01.
- Receives a one-byte preset/program index, a pointer to 16-bit source values, and a mode/flag argument.
- Gathers 64 16-bit values per frame and packs them into 7-bit-safe bytes.
- Its callback validator VA 0x004AAA10 accepts response 11/03.
- The caller advances through this source in 0x40-value blocks. The outer loop compares the accumulated value offset with manager object field +0x670, so the total count is manager-controlled. The project capture and known preset record show a 600-value curve, but the static code's exact count source still needs mapping to that field.

### Call-site correlation with the MG30 preset record

Two callsites pass pointers that line up with the recovered record layout:

- VA 0x004ABF3C calls 10/01 with source pointer record + 0x1FE.
- VA 0x004ABF4D calls 11/01 with source pointer record + 0x21FE and mode/flag 1.
- VA 0x004AC29B and VA 0x004AC2AC repeat the same pair with the same record-relative offsets.

The project's established record layout places the 2,048 float32 samples at offset 0x1FE and the 600-value curve at offset 0x21FE. This is a direct address-level match between QuickTone's 10/01 and 11/01 senders and the audio/curve regions in the known preset record.

The caller at VA 0x004ABF3C occurs in a per-record conversion/processing path that also calls VA 0x004A9940 before sending the two resource regions, then calls VA 0x004A74A0 to process the base/scene region and VA 0x004B5180 to refresh the manager object. A second caller at VA 0x004AC29B follows a closely related path after checking the resource marker at +0x1AE and processing the resource name at +0x1B2. The full higher-level trigger still needs naming, but the resource-bearing record flow is now proven.

### Corrected conclusions

1. The actual QuickTone preset resource upload path is 10/01 for the 2,048-sample waveform and 11/01 for curve values; responses are 10/03 and 11/03.
2. This is separate from 61/01, whose traced direct caller is an 800×480 raster image transfer.
3. The resource offsets passed by QuickTone match the project's known record layout exactly: waveform +0x1FE, curve +0x21FE.
4. Preserve the current single-preset capture-derived 10/01 and 11/01 implementation assumptions; compare exact frame offsets/counts against presetimport.pcapng before changing app code.
5. The 10/01 path uses 32-sample source blocks; the 11/01 path uses 64-value blocks. Do not conflate these block units with packet totals without checking the packed payload layout.
6. No application source code, APK, NAM transfer, IR User/Third Party import, Collection logic, Import All transaction, or MIDI mapping was changed.


## Correction: exact 10/01 block width verified from machine instructions (2026-11-05)

A re-read of the complete machine-code loop at VA 0x004AA700 corrects one detail in the preceding summary: the 10/01 sender does **not** gather only eight float32 samples per frame. It gathers 32 float32 samples (128 source bytes) per frame.

- The source index is a 16-bit counter. The copy loop increments its local word index by 8 and repeats until 0x20 (32), loading eight DWORDs per iteration. This copies 32 DWORD values = 32 float32 samples = 128 bytes.
- The staging block is 0x80 bytes. The packing loop consumes 0x40 (64) little-endian uint16 words and emits 3 bytes for each word, for 192 packed data bytes.
- The frame header is command 10/01, the parameter byte and a 16-bit encoded offset. The offset begins at 0 and advances by 0x20 (32) each frame.
- The outer loop ends when the offset reaches 0x800 (2,048). Therefore 2,048 / 32 = 64 frames. Each complete SysEx frame is 205 bytes, matching the User capture.
- The callback at 0x004AAA10 accepts 10/03.

This is consistent with the app's existing builder: each waveform packet serializes 64 uint16 words from 32 float32 values, uses offset frameIndex × 32, and emits a 205-byte SysEx frame. The apparent difference between 32 float32 samples and 64 uint16 words is expected because each float32 occupies two 16-bit words.

### 11/01 curve packet cross-check

The machine-code loop at VA 0x004AAA40 copies exactly 64 uint16 values from the supplied curve pointer into a 0x80-byte staging buffer, then packs those 64 words into 192 bytes. Its offset/index advances in 0x40-value (64-word) units. Ten 205-byte frames cover 640 transfer words; the known preset record and capture establish 600 meaningful curve values, with 40 trailing transfer words in the final frame. The app builder's 640-word staging array zero-fills those 40 trailing words rather than reproducing QuickTone's stale stack/memory tail. That remains the deliberate safer behavior documented in the second-capture validation; do not change it without device-side acceptance evidence.

### Cross-check against the supplied User capture and current app code

The project capture analysis reports the same externally visible structure: 64 × 10/01 frames (205 bytes), offsets 0..2016 by 32, 10 × 11/01 frames (205 bytes), offsets 0..576 by 64, and corresponding 10/03 and 11/03 acknowledgements. The current `www/mg30-preset-format.js` builder constructs 64 waveform bodies and 10 curve bodies with the same word counts, offset progression and 7-bit packing; the full preset import plan orders name, waveform, curve, then three scene frames (78 total). This is consistent with the earlier QuickTone single-preset capture contract.

Boundary: this confirms the sender's byte/word/block geometry and its match to the already capture-grounded app builder. It does not by itself prove a physical Import All or Export All round-trip, the manager's 12/13/18/19 metadata meanings, or the device acceptance of the zero-filled final curve tail. No application source or APK was changed.
