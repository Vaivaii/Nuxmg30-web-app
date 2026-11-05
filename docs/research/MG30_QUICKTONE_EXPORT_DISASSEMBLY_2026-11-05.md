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
