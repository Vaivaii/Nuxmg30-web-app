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
