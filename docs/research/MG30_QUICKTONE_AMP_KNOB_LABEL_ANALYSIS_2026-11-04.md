# NUX MG-30 QuickTone Amp Knob Label Analysis
Date: 4 November 2026
Status: analysis only — no application code changed

## Scope
The user asked whether amp knob labels can be analysed automatically from QuickTone so they do not have to document each amplifier manually. This note records a preliminary extraction from the supplied Windows QuickTone 2.6.7.16 executable.

Target remains the **original NUX MG-30 Gen 2, firmware 6.0.x**, not MG-30 MKII. This is an analysis record only. Do not change the app's amp mapping, MIDI/CC handling, or UI until the model/profile association is fully verified and the user explicitly asks for implementation.

## Source inspected
- Archive: `NUX_QuickTone_V2.6.7.16_Windows.zip`
- Archive SHA-256: `95990e1e57079439c89b13e16d19f17c1769ec0c60336b546bc7f43b4ee91f2a`
- Embedded executable: `QuickTone.exe` (PE32 Windows executable; 190,296,504 bytes)
- Executable SHA-256: `0d64728f8f0e013114c228c8e6f9a8f3c648a5f82ff54ff03081c930ebd771d6`
- QuickTone identifies itself as version `2.6.7.16`.

## Extraction method and evidence
The executable contains embedded readable JSON-like UI configuration blocks. A panel entry has an `array` of controls. The knob entries carry fields including:
- `elementType`: control type; rotary knob entries in the extracted amp panels use value `2`.
- `languageKey`: the semantic label key for the knob, e.g. `AMP_GAIN`, `AMP_TONE`, `AMP_CUT`, `AMP_PRES`.
- `midiCC`: the control slot / CC index QuickTone associates with that element.
- `elementImage1`: knob artwork asset.
- `elementX` / `elementY`, width, height and angles: panel layout/geometry.
- `parameter1`, `parameter2`, `parameter3`: additional parameter metadata. Their exact semantics should be cross-checked before being used; this report does not assume what parameter3 means.

The first candidate amp-panel data block begins at file offset `0x6897190`. It contains 109 panel entries, including 38 numbered built-in amp entries with rotary controls and a separate NAM entry. A second nearby panel block begins at `0x6906960`; the checked amp examples have the same label-to-CC assignments. This demonstrates that the labels can be extracted programmatically, rather than transcribed by hand.

QuickTone also contains multiple supported product profiles. Its embedded strings include both `*.mg30patch` and `*.mg30mk2patch`, and distinct product labels `NUX MG-30` and `NUX MG-30 MKII`. Other model databases are embedded as well. Therefore, do not indiscriminately merge every amp panel found in the executable. Final implementation must bind the extracted table to the original MG-30 profile and exclude MKII-specific entries.

## Preliminary 38-model amp control table
Labels below are the English strings represented by QuickTone's `languageKey` values. CC numbers are preserved from the same knob elements; gaps are intentional and must not be renumbered.

| No. | QuickTone amp model | Knobs in CC order |
|---:|---|---|
| 01 | JAZZ CLEAN | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), LEVEL (CC 6) |
| 02 | DELXUE RVB | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), BIAS (CC 5), LEVEL (CC 6) |
| 03 | BASSMATE | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 04 | TWEEDY | GAIN (CC 0), TONE (CC 1), MASTER (CC 2), LEVEL (CC 3) |
| 05 | TWIN RVB | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), BIAS (CC 6), LEVEL (CC 7) |
| 06 | HIWIRE | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 07 | CALI CRUNCH | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 08 | CLASS A15 | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 09 | CLASS A30 | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 10 | PLEXI 100 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 11 | PLEXI 45 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 12 | BRIT 800 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 13 | 1987 X 50 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 14 | SLO 100 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 15 | FIREMAN HBE | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 16 | DUAL RECT | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 17 | DIE VH4 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 18 | VIB KING | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 19 | BUDDA | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), MIDDLE (CC 4), TREB (CC 5), LEVEL (CC 6) |
| 20 | MR.Z 38 | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), MIDDLE (CC 4), TREB (CC 5), LEVEL (CC 6) |
| 21 | SUPER RVB | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), BIAS (CC 6), LEVEL (CC 7) |
| 22 | BRIT BLUES | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 23 | MATCH | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 24 | BRIT 2000 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 25 | UBER | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 26 | AGL | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), M.FREQ (CC 4), TREB (CC 5), LEVEL (CC 6) |
| 27 | BASSGUY | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), LEVEL (CC 6) |
| 28 | MLD | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), M.FREQ (CC 4), TREB (CC 5), LEVEL (CC 6) |
| 29 | OPTIMA AIR | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 30 | STAGEMAN | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 31 | DGLASS | MASTER (CC 0), BASS (CC 1), LO MIDS (CC 3), HI MIDS (CC 4), TREB (CC 6), LEVEL (CC 7) |
| 32 | STARLIFT | BASS (CC 0), MID (CC 1), MID FREQ (CC 2), TREB (CC 3), VOLUME (CC 5), LEVEL (CC 6) |
| 33 | VIVO | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 34 | PRINCETONE | VOLUME (CC 0), TREB (CC 1), BASS (CC 2), BIAS (CC 3), LEVEL (CC 4) |
| 35 | L STAR | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 36 | DELUXE RVB | GAIN (CC 0), VOLUME (CC 1), BASS (CC 2), TREB (CC 3) |
| 37 | CLASS A30 | GAIN (CC 0), VOLUME (CC 1), BASS (CC 2), TREB (CC 3) |
| 38 | FIREMAN HBE | GAIN (CC 0), VOLUME (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4) |

## Direct findings relevant to the reported UI-label issue
These are not assumptions based on real-world amp brands; they are labels extracted from QuickTone's panel configuration:
- **TWEEDY** uses GAIN, TONE, MASTER, LEVEL. It does not use the generic BASS/MIDDLE/TREB set in this panel definition.
- **CLASS A15** and **CLASS A30** use GAIN, MASTER, CUT, BASS, TREB, LEVEL. Their control set differs from a generic three-band amp.
- **BUDDA**, **MR.Z 38** and **MATCH** contain a dedicated CUT control.
- **AGL** and **MLD** contain M.FREQ.
- **DGLASS** has LO MIDS and HI MIDS and its mapped CCs are non-contiguous.
- **STARLIFT** uses BASS, MID, MID FREQ, TREB, VOLUME, LEVEL.
- **PRINCETONE** uses VOLUME, TREB, BASS, BIAS, LEVEL.
- Later amp entries such as **DELUXE RVB**, **CLASS A30** (entry 37), and **FIREMAN HBE** (entry 38) use VOLUME in place of MASTER.

The same amp display name can occur more than once in the embedded multi-product database. Always identify the panel by both model/product profile and amp slot; do not key solely on a text name such as `CLASS A30`.

## What can be automated for the later UI correction
A parser can produce a model-indexed table with:
1. product/profile identifier,
2. amp slot and QuickTone model name,
3. each knob's `midiCC`,
4. English label resolved from `languageKey`,
5. optional image asset and geometry for visual comparison,
6. parameter metadata kept as raw values until semantics are confirmed.

This should let the later UI correction update labels automatically from data. It should not change the working knob CC mapping. The eventual implementation can be label-only: current working parameter/CC bindings stay intact while the caption for each knob is supplied from the verified per-amp table.

## Remaining analysis gate before implementation
1. Explicitly bind the candidate 38-model configuration block to the **original MG-30 Gen 2 / `.mg30patch`** profile. QuickTone 2.6.7.16 also contains a distinct **MG-30 MKII / `.mg30mk2patch`** profile and other device profiles; keep these separate.
2. Compare the candidate list/order against the app's original MG-30 Gen 2 amp catalogue and, where practical, QuickTone panel screenshots.
3. Check any duplicate amp display names by model slot/profile.
4. Resolve whether `parameter3` is a default/current value before using it; it is not needed for the label-only correction.

## Change boundary
- No app source, UI, amp mapping, MIDI/CC code, firmware, NAM, or IR paths were changed for this analysis.
- When implementation is requested later, modify only the amp knob label metadata; preserve the existing working parameter mapping and target original MG-30 Gen 2 FW 6.0.x.
