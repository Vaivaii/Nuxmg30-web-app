# MG-30 original Gen 2 — CTRL / Expression model parameter lookup

Date: 2026-10-30  
QuickTone: 2.6.7.16  
Target: original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.  
Branch: android/ui-polish-pass-1

## Evidence and object alignment

The table below is recovered from the original-MG30 panel's static initializer and native lookup path. It is not derived from the two embedded model-editor JSON candidate profiles.

- Original panel constructor: VA 0x005BE8D0; RTTI type is NuxPedalSettingPanelMG30.
- Embedded model/key data initializer: VA 0x005C23E0, called with ECX = outer panel object + 0x74.
- Panel refresh path: VA 0x005C13A4. The panel subobject is at outer object + 0x70; its model-name pool is read at subobject + 0x43A, which aligns with initializer offset +0x436.
- Dependent-choice lookup: VA 0x005C2070.
- Key/string resolver: VA 0x005C2030.
- Dependent-choice popup builder: VA 0x005C48F0. It requests choice index 0 and choice index 1 separately, then resolves the returned identifiers into the two menu entries.
- The helper's object-relative lookup offsets are relative to the outer panel object. Since the initializer receives outer+0x74, reconstructing the helper-visible object means reading initializer memory at (helper offset - 0x74). The model/key string pool aligns at initializer offset 0x436, i.e. outer offset 0x4AA. This alignment is validated by known labels such as DIST UNO, PLEXI 45, GAIN, MASTER, RATE, and DRIVE.

The six-byte model record contains a model-label identifier and two dependent-choice identifiers. The two option identifiers are at record byte offsets +3 and +5. The string/key pool stores ten-byte labels addressed by identifier.

## Function enum to lookup selector

The static selector map at VA 0x00D3124C is:

0, 0, 2, 3, 6, 7, 8, 0

For the stored CTRL function values used by the expression assignment:

| Stored function value | UI function | Lookup selector | Table region |
|---:|---|---:|---:|
| 0 | ---- / none | 0 | 0x14A |
| 1 | WAH | 0 | 0x14A |
| 2 | EFX | 2 | 0x168 |
| 3 | AMP | 3 | 0x23A |
| 4 | MOD | 6 | 0x35A |
| 5 | DLY | 7 | 0x42C |
| 6 | RVB | 8 | 0x45C |

This mapping is consistent with the user's original-MG30 UI order and the known capture where EFX is stored as function value 2. The exact first-column popup construction/item-ID code should still be traced before app implementation.

## WAH special table — selector 0

The WAH model rows have no generic dependent parameter pair in this lookup table; both returned labels are ----. WAH MIN/MAX is a separate set-value path and must not be implemented as generic parameter choices.

| Model | Choice 0 | Choice 1 |
|---|---|---|
| CLYDE | ---- | ---- |
| CRYBB | ---- | ---- |
| V847 | ---- | ---- |
| HORSE | ---- | ---- |
| OCTAVE | ---- | ---- |

## EFX table — selector 2

| Model | Choice 0 | Choice 1 |
|---|---|---|
| DIST+ | OUTPUT | OUTPUT |
| RC BOOST | GAIN | VOLUME |
| AC BOOST | GAIN | VOLUME |
| DIST UNO | LEVEL | DRIVE |
| T SCREAM | DRIVE | LEVEL |
| BLUES DRV | LEVEL | GAIN |
| SPUA DRV | VOLUME | DRIVE |
| BLACKDIST | DIST | VOLUME |
| RED DIRT | DRIVE | LEVEL |
| CRUNCH | VOLUME | GAIN |
| MUFFFUZZ | VOLUME | VOLUME |
| KATANA | VOLUME | VOLUME |
| STSIGNER | VOLUME | GAIN |
| RedFuzz | GAIN | OUTPUT |
| T-Wah | DECAY | SENS. |
| FULL-OD | VOLUME | DRIVE |
| HORSEMAN | GAIN | OUTPUT |
| NOB ODR | DRIVE | LEVEL |
| RIV BLUE | LEVEL | GAIN |
| TURBO OD | LEVEL | DRIVE |
| CE-1 | DEPTH | RATE |
| CE-2 | RATE | DEPTH |
| ST.CHORUS | INTEN | RATE |
| VIBRATOR | RATE | DEPTH |
| DETUNE | MIX | MIX |
| FLANGER | LEVEL | RATE |
| PHASE 90 | SPEED | SPEED |
| PHASE 100 | INTEN | SPEED |
| SCF FLG | SPEED | INTEN |
| U-VIBE | SPEED | INTEN |
| TREMOLO | RATE | DEPTH |
| ROTARY | SPEED | SPEED |
| HARMONIST | BLEND | BLEND |
| SCH-1 | RATE | DEPTH |
| MONO OCT | SUB | UP |

The table includes overlapping model rows also present in the MOD lookup family. Preserve the raw rows; do not collapse duplicate model names across function families.

## AMP table — selector 3

The first 30 AMP model rows all resolve to GAIN + MASTER. This directly matches the user's independent inspection of all original-MG30 AMP models and resolves the conflict with the earlier candidate embedded JSON extraction.

| Model | Choice 0 | Choice 1 |
|---|---|---|
| JAZZCLN | GAIN | MASTER |
| DLX VERB | GAIN | MASTER |
| BSMATE | GAIN | MASTER |
| TWEEDY | GAIN | MASTER |
| TWIN VB | GAIN | MASTER |
| HIWIRE | GAIN | MASTER |
| CALI CH | GAIN | MASTER |
| V AC15 | GAIN | MASTER |
| V AC30 | GAIN | MASTER |
| PLEXI 100 | GAIN | MASTER |
| PLEXI 45 | GAIN | MASTER |
| BRIT 800 | GAIN | MASTER |
| 1987X50 | GAIN | MASTER |
| SOLO 100 | GAIN | MASTER |
| FIREMAN | GAIN | MASTER |
| DUORECTO | GAIN | MASTER |
| DIE VH4 | GAIN | MASTER |
| VIB KING | GAIN | MASTER |
| BUDDA | GAIN | MASTER |
| MR.Z38 | GAIN | MASTER |
| SUPER VB | GAIN | MASTER |
| BRITBLUES | GAIN | MASTER |
| MATCH | GAIN | MASTER |
| BRIT2000 | GAIN | MASTER |
| UBER | GAIN | MASTER |
| AGL | GAIN | MASTER |
| BASSGUY | GAIN | MASTER |
| MLD | GAIN | MASTER |
| OPTAIR | GAIN | MASTER |
| STAGE M | GAIN | MASTER |

Additional records in the same static AMP-family array (not promoted into the 30-model canonical list until their runtime row/category context is verified):

| Record label | Choice 0 | Choice 1 |
|---|---|---|
| DGLASS | MASTER | MASTER |
| STARLIFT | VOLUME | VOLUME |
| PV VIVO | GAIN | MASTER |
| F-Ptone | VOLUME | LEVEL |
| CaLStar | GAIN | MASTER |
| DELUXERVB | GAIN | VOLUME |
| ICLASSA30 | GAIN | VOLUME |
| FIREMAN (additional record) | GAIN | VOLUME |
| USER AMP (repeated reserved rows) | GAIN | MASTER |

The user-confirmed all-AMP GAIN + MASTER rule remains authoritative. The extra records above must not be treated as counterexamples until their active selector/model-row context is established.

## MOD table — selector 6

| Model | Choice 0 | Choice 1 |
|---|---|---|
| CE-1 | DEPTH | RATE |
| CE-2 | RATE | DEPTH |
| ST.CHORUS | INTEN | RATE |
| VIBRATOR | RATE | DEPTH |
| DETUNE | MIX | MIX |
| FLANGER | LEVEL | RATE |
| PHASE 90 | SPEED | SPEED |
| PHASE 100 | INTEN | SPEED |
| SCF FLG | SPEED | INTEN |
| U-VIBE | SPEED | INTEN |
| TREMOLO | RATE | DEPTH |
| ROTARY | SPEED | SPEED |
| HARMONIST | BLEND | BLEND |
| SCH-1 | RATE | DEPTH |
| MONO OCT | SUB | UP |

Additional rows in this lookup array repeat the EFX model records. Retain them as raw data until the active model-index selector proves which row is reachable for each block.

## DLY table — selector 7

| Model | Choice 0 | Choice 1 |
|---|---|---|
| ANA-DLY | RATE | INTEN |
| DIGI-DLY | TIME | LEVEL |
| MOD-DLY | TIME | LEVEL |
| TAPEECHO | TIME | LEVEL |
| REVERSE | TIME | MIX |
| PAN-DLY | TIME | LEVEL |
| DUOTIME | LEVEL | TIME |
| PHI-DLY | TIME | MIX |

## RVB table — selector 8

| Model | Choice 0 | Choice 1 |
|---|---|---|
| ROOM | LEVEL | LEVEL |
| HALL | LEVEL | LEVEL |
| PLATE | LEVEL | LEVEL |
| SPRING | LEVEL | LEVEL |
| SHIMMER | MIX | MIX |
| DAMP | MIX | MIX |

The remaining rows in this static array repeat DLY model records; retain them until the active model-index mapping proves whether they are reachable from RVB assignment.

## Cross-validation and evidence labels

- Static resource + code-path evidence: model labels and dependent-choice labels above are recovered from the original MG30 panel initializer, lookup helper and key/string resolver.
- User-confirmed UI observation: all original-MG30 AMP models use GAIN + MASTER. The first 30 AMP records match this exactly.
- User capture cross-check: DIST UNO resolves to LEVEL + DRIVE, matching the known CTRL1 capture experiment. That capture changes additional payload bytes and is corroboration, not a clean one-field differential.
- Wire write evidence: 13 01 OUT followed by 13 03 IN is documented. The serializer and ACK path are statically mapped.
- Not yet hardware-verified: complete 13 02 device readback transaction and the exact request that triggers it.
- Not yet fully traced: first-column function popup construction/item IDs; the active model-index mapping for every duplicated/auxiliary row; WAH MIN/MAX write/read semantics; T/R footswitch and Multi EFX control families.

## Next work before any app code change

1. Trace the first-column function popup and confirm item IDs match stored values 0–6.
2. Trace the active model-index map so the app can select the correct row for the current block/model without guessing.
3. Trace the 13 02 readback trigger and confirm the device returns the CTRL1/CTRL2 state after panel reopen.
4. Trace 0D 00 / 0D 02 against NuxPedalSetValuePanelMG30 and WAH MIN/MAX.
5. Only after those checks, implement Roadmap 2 in isolation and test both CTRL1 and CTRL2. Preserve NAM, IR User/Collection, MIDI mappings, preset sync and Copy Scene.
