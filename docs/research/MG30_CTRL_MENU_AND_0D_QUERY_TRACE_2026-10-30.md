# MG-30 CTRL Editor Menu and 0D Query Trace

Date: 2026-10-30  
Target: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
QuickTone: Windows v2.6.7.16  
Binary SHA-256: `0d64728f8f0e013114c228c8e6f9a8f3c648a5f82ff54ff03081c930ebd771d6`

## Executive result

Static disassembly of the original-MG30 `NuxPedalSettingPanelMG30` UI closes an important state-layout gap. The first three setting bytes serialized by the `13 01` write and restored by the `13 02` readback correspond to three independent UI selectors:

- state `+0x7A` — Multi EFX CTRL assignment family (UI selector 6; with a further selector 7 for a dependent/mode choice in limited cases).
- state `+0x7B` — external footswitch T contact assignment (UI selector 4).
- state `+0x7C` — external footswitch R contact assignment (UI selector 5).

The next two packed bytes remain independent EXP assignment records:

- state `+0x7D` — CTRL1 / built-in expression assignment: low nibble function, high nibble dependent-choice index.
- state `+0x7E` — CTRL2 / additional expression assignment: low nibble function, high nibble dependent-choice index.

This mapping is derived from QuickTone's own selectors and state writes, and aligns with the previously recovered SysEx serializer/parser. It does not repurpose CTRL2 as the external footswitch.

## 1. Shared popup builder and the correction to earlier notes

Function VA `0x005C48F0` is a shared popup/menu builder, not a dependent-choice-only function. The selector argument at `[ebp+8]` is stored in the menu object at `this+0x9C`. It has multiple branches for different control families:

| UI selector argument | Menu/control family | Data source |
|---:|---|---|
| 0 | CTRL1 expression function | fixed 7-item category list |
| 1 | CTRL2 additional expression function | same fixed 7-item category list |
| 2 | CTRL1 dependent choice | model/category lookup, choice index 0/1 |
| 3 | CTRL2 dependent choice | model/category lookup, choice index 0/1 |
| 4 | External footswitch T contact | fixed T-prefixed list |
| 5 | External footswitch R contact | fixed R-prefixed list |
| 6 | Multi EFX CTRL function | fixed 13-item list |
| 7 | Multi EFX CTRL dependent/mode choice | special handling for selected DLY or SCENE function |

This corrects a previous statement in the technical log that `0x005C48F0` only constructs dependent-choice menus. It handles the first-column function list as well as the dependent-choice and other control-family lists.

## 2. CTRL1 / CTRL2 expression function mapping

For selector 0 or 1, `0x005C48F0` builds the visible list from string pointers at `0x00D313E0`, `0x00D313E8`, `0x00D313EC`, `0x00D313F0`, `0x00D313F4`, `0x00D313F8`, and `0x00D313FC`.

The exact ordered list is:

| Selected row index | Display label | Stored function code |
|---:|---|---:|
| 0 | `----` | 0 |
| 1 | `WAH` | 1 |
| 2 | `EFX` | 2 |
| 3 | `AMP` | 3 |
| 4 | `MOD` | 4 |
| 5 | `DLY` | 5 |
| 6 | `RVB` | 6 |

The event handler at `0x005C4610` stores the selected row index, masked to its low nibble:
- selector 0 writes state `+0x7D` (CTRL1 function).
- selector 1 writes state `+0x7E` (CTRL2 function).

For selectors 2 and 3, the same popup builder resolves the active function's two dependent choices through `0x005C2070` and label resolver `0x005C2030`. The selected dependent row is stored in the high nibble of the corresponding packed byte:
- selector 2 updates the high nibble of `+0x7D`.
- selector 3 updates the high nibble of `+0x7E`.

The handler then invokes the `13 01` serializer `0x004A7FE0`. Thus the UI list index and the packed protocol field agree directly. The screenshot's disabled/greyed state for some entries is a separate availability rule; this trace proves the list order and stored indices, not every per-preset enable/disable condition.

## 3. External footswitch T/R mapping

For selector 4, the popup builder uses the string sequence at `0x00D31400` onward. For selector 5, it uses the corresponding `R:` list beginning at `0x00D3147C`.

Both lists have these ordered entries:

| Row index | T contact label | R contact label |
|---:|---|---|
| 0 | `T:----` | `R:----` |
| 1 | `T:TAP` | `R:TAP` |
| 2 | `T:CMP` | `R:CMP` |
| 3 | `T:GATE` | `R:GATE` |
| 4 | `T:EFX` | `R:EFX` |
| 5 | `T:EQ` | `R:EQ` |
| 6 | `T:SR` | `R:SR` |
| 7 | `T:MOD` | `R:MOD` |
| 8 | `T:DLY` | `R:DLY` |
| 9 | `T:RVB` | `R:RVB` |
| 10 | `T:SCENE` | `R:SCENE` |
| 11 | `T:RVB HF` | `R:RVB HF` |
| 12 | `T:WAH` | `R:WAH` |
| 13 | `T:S.UP` | `R:S.UP` |
| 14 | `T:S.DN` | `R:S.DN` |

The UI event handler at `0x005C4610` maps:
- selector 4 directly to state byte `+0x7B` (T contact).
- selector 5 directly to state byte `+0x7C` (R contact).

There is also a coupled update when row 13 or 14 is chosen: selecting Scene Up or Scene Down on one contact writes the complementary code (14 or 13) into the opposite contact byte. This is native QuickTone behavior; it means the T/R pair is not always two fully independent values for the two scene-direction choices.

This is consistent with the user's direct explanation that the external NUX footswitch has T/R contacts and separate assignments. The static string list contains additional labels, including TAP and several block names. Whether each one is enabled/usable in every firmware/preset/context is not proven by the list alone; preserve the UI's capability/disabled state rather than assuming every label is always selectable.

## 4. Multi EFX CTRL function mapping

Selector 6 builds a separate fixed function list from string pointers in the `.rdata` area. The 13 entries and stored row ordinals are:

| Row index | Display label |
|---:|---|
| 0 | `----` |
| 1 | `TAP` |
| 2 | `CMP` |
| 3 | `GATE` |
| 4 | `EFX` |
| 5 | `EQ` |
| 6 | `SR` |
| 7 | `MOD` |
| 8 | `DLY` |
| 9 | `RVB` |
| 10 | `SCENE` |
| 11 | `RVB HF` |
| 12 | `WAH` |

The event handler stores selector 6's selected row in state byte `+0x7A`. This is a separate byte from the packed CTRL1/CTRL2 expression assignments and separate from the external footswitch T/R bytes. The option families align with the user's callout-4 description (Delay TAP, block toggle and scene behavior), but the additional behavior for special DLY/SCENE modes is not fully interpreted yet.

Selector 7 is only populated by the builder for certain current `+0x7A` function codes:
- current code 8 (DLY): it resolves two entries using internal label keys `0x6B` and `0x6C`.
- current code 10 (SCENE): it resolves two entries using keys `0x74` and `0x75`.

The selector-7 event handler modifies bit `0x20` in state `+0x7A`; it does not write another independent byte. The actual user-facing meaning/order of these two options is not yet established from the resolved labels. Do not guess whether the bit means a specific scene, mode, or direction.

## 5. Full opening-byte layout now aligned with SysEx

Previously recovered serializer `0x004A7FE0` places state bytes `+0x7A`, `+0x7B`, and `+0x7C` directly at SysEx offsets 6, 7, and 8. Incoming parser `0x004A8340` restores those same three state bytes. The popup builder/event handler now gives the following functional layout:

| SysEx offset | Native state offset | QuickTone selector | Meaning |
|---:|---:|---:|---|
| 6 | `+0x7A` | 6 (and 7 dependent mode) | Multi EFX CTRL |
| 7 | `+0x7B` | 4 | External footswitch T |
| 8 | `+0x7C` | 5 | External footswitch R |
| 9 | `+0x7D` low nibble | 0 | CTRL1 / built-in expression function |
| 10 | `+0x7D` high nibble | 2 | CTRL1 dependent choice |
| 11 | `+0x7E` low nibble | 1 | CTRL2 / additional expression function |
| 12 | `+0x7E` high nibble | 3 | CTRL2 dependent choice |
| 13 | — | — | Reserved/unassigned in current serializer |
| 14–17 | `+0x7F..+0x82` | Set-value panel | Two value pairs (semantic labels pending) |

This is the best current mapping for the five QuickTone assignment families. It uses explicit names instead of ambiguous CTRL numbers:
- `multiEfxCtrl`
- `externalFootswitchT`
- `externalFootswitchR`
- `builtinExpression` (CTRL1)
- `additionalExpression` (CTRL2)

It does not assign CTRL2 to the external footswitch.

## 6. Set-value panel and the two slider pairs

The original-MG30 RTTI/vtable for constructor `0x005C5290` identifies `NuxPedalSetValuePanelMG30`. Its caller at `0x005C1DA4` creates this panel only for one of two control objects referenced by the parent panel at offsets `+0xA38` or `+0xA44`.

The constructor creates two slider widgets at object offsets `+0x134` and `+0x138`. The slider handler `0x005C5D60` reads both widget values, maps their screen positions onto a configured numeric range, and stores them in one of two controller value pairs:
- one path writes `+0x7F/+0x80`;
- the other path writes `+0x81/+0x82`.

It then calls the `13 01` serializer. These four values are the same bytes restored by `13 02` (offsets 14–17).

This proves the two-pair slider/value path belongs to the `13 01/13 02` CTRL setting record. It does **not** yet prove the visible labels for the two sliders or prove that either pair is literally WAH MIN/MAX. Resource IDs used for captions are passed through a localization lookup, but their text has not yet been reliably tied to the slider widgets. Keep the terms “pair A” and “pair B” until the labels/caller are proven.

## 7. 0D 00 / 0D 02 path — separate extended-data lookup

The 0D request sender `0x004A7D40` emits `F0 43 58 70 0D 00 F7`; callback `0x004A7E60` accepts `0D 02`. It uses response byte at offset `0x12` as the copied payload count and copies bytes starting at response offset 6 into a separate MG30 singleton/cache buffer beginning at object offset `+0x5E`. A companion helper writes the supplied metadata byte at `+0x5D`; other helper paths also use bits in `+0x5D`, so do not describe it simply as a pure length field.

Additional caller evidence:
- `0x004B0AF0` is reached from `0x004AF053`. It extracts a type byte from the high byte of a key, checks it against a 12-entry table returned by `0x004B4DF0`, and for certain type values (1, 2, 6, 8) issues the 0D query when the table lookup does not match.
- A separate dispatcher branch at `0x004A4FF3` calls the same 0D sender when an incoming record has subcommand `0D` and its status/flag byte at offset 7 is zero.

This is evidence that 0D is part of a separate extended/model/type data refresh path. It is **not** the panel-open CTRL readback, and the current trace does not connect it specifically to WAH MIN/MAX. No `0D 00` or `0D 02` appeared in the user's `ctrlpanel.pcapng`.

## 8. CC77 / value55 remains unresolved

The panel-open capture contains a separate short MIDI message `B0 4D 37` (channel 1, CC77, value55), sent by QuickTone after the `13 02` readback. Earlier capture notes also record this event in some CTRL1 write sequences but not in the CTRL2 WAH capture.

Static inspection has not located a reliable executable-code cross-reference to the exact CC77/value55 message. Occurrences of the byte sequence in the large `.rdata` image are not enough to identify a live call site. The purpose and trigger remain unresolved. Do not reproduce this short MIDI message in MG30 Studio until its sender and intended effect are established.

## 9. Remaining work and safety boundary

**Newly established:**
- [x] Original-MG30 first-column CTRL1/CTRL2 function menu order and stored ordinals.
- [x] External footswitch T/R menu lists and mapping to state `+0x7B/+0x7C`.
- [x] Multi EFX CTRL function list and mapping to state `+0x7A`.
- [x] State bytes `+0x7A..+0x7E` aligned with the existing `13 01` serializer and `13 02` parser.
- [x] Scene Up/Down complementary T/R pair update behavior.

**Still unresolved:**
- [ ] Exact user-facing labels for the two SetValue slider pairs `+0x7F/+0x80` and `+0x81/+0x82`.
- [ ] Selector-7 DLY/SCENE option labels and the exact meaning of bit `0x20`.
- [ ] Per-preset/context enablement rules for function-list entries.
- [ ] Purpose/source of CC77/value55.
- [ ] The semantic content of 0D extended data; do not infer WAH MIN/MAX.

No MG30 Studio source changes were made and no APK was built in this reverse-engineering checkpoint. Preserve NAM import, IR User/Collection, MIDI mappings, preset sync and completed Copy Scene.


## SetValue sub-editor trace — slider rows and WAH range evidence (2026-10-30)

This adds a more exact link between the SetValue panel and the two CTRL dependent-configuration rows. It does not change the wire map or assign new meanings to the 0D packet family.

### Parent UI selection and panel creation

In parent panel click handler VA `0x005C1BA0`, child-object identity selects the popup selector argument:
- child `+0xA30` → selector 0 (CTRL1 function);
- child `+0xA3C` → selector 1 (CTRL2 function);
- child `+0xA38` → selector 2 (CTRL1 dependent configuration);
- child `+0xA44` → selector 3 (CTRL2 dependent configuration);
- child `+0xA48` → selector 4 (external footswitch T);
- child `+0xA4C` → selector 5 (external footswitch R);
- child `+0xA50` → selector 6 (Multi EFX CTRL function);
- child `+0xA5C` → selector 7 (Multi EFX dependent/mode choice).

The SetValue panel is created only for the `+0xA38` and `+0xA44` child objects (selectors 2 and 3). The parent passes a boolean flag that is true for selector 2 / CTRL1 and false for selector 3 / CTRL2. This structurally confirms that the two slider-pair editors are the dependent-configuration sub-editors for CTRL1 and CTRL2; they are not the external T/R or Multi EFX controls.

### SetValue constructor and slider write

Original-MG30 SetValue panel constructor: `0x005C5290`.
- It creates three caption widgets at object offsets `+0x84`, `+0x88`, and `+0x8C`.
- Those captions are populated through localization lookup `0x009A5350` using identifiers `0x155B`, `0x1517`, and `0x15ED`, respectively.
- It creates the two slider widgets at `+0x134` and `+0x138`.
- The resource strings embedded in QuickTone include `WAH_RANGE = RANGE`, `VOL_MIN = MIN`, and `VOL_MAX = MAX`. The user's WAH editor screenshot independently shows the Range / MIN / MAX layout.

The exact join from numeric caption IDs `0x155B/0x1517/0x15ED` to the resource keys has not been recovered, so the title/MIN/MAX text association is still classed as a strong inference rather than a fully proven ID-to-key mapping. However, the panel is structurally restricted to the CTRL1/CTRL2 dependent-configuration rows, and the user-provided WAH screenshot matches the three-caption/two-slider shape. Do not hard-code the inferred labels for every function without checking the selected function/model context.

Slider handler VA `0x005C5D60`:
- converts each slider widget position using the configured min/max range stored in the panel object;
- reads the two controls at `+0x134/+0x138`;
- if the parent flag at `+0x128` is true (selector 2 / CTRL1), writes the values to device state `+0x7F/+0x80`;
- if false (selector 3 / CTRL2), writes to `+0x81/+0x82`;
- then invokes the existing `13 01` serializer at `0x004A7FE0`.

This confirms the value pairs are edited and written as part of the CTRL assignment record through `13 01`, and restored by the same `13 02` parser already verified in the hardware panel-open capture. Do not route these values through the separate `0D 00/0D 02` query family.

### Consequence for 0D interpretation

The WAH range editor is now structurally tied to the CTRL1/CTRL2 SetValue sub-editor and its direct `13 01` write path. The separate `0D 00 → 0D 02` path remains an extended/type-data refresh/cache mechanism whose user-visible payload has not been identified. No evidence currently connects the 0D payload to WAH MIN/MAX. Previous wording that left open a possible 0D-to-WAH-range association should be read as a hypothesis only; the current best-supported model is that WAH range slider edits use the `13 01` record's value bytes 14–17.

### Evidence boundary

**Confirmed by static code:**
- SetValue editor invocation only for CTRL1 dependent row (selector 2) and CTRL2 dependent row (selector 3).
- Two sliders map to separate pairs `+0x7F/+0x80` and `+0x81/+0x82`.
- Slider change sends `13 01`.
- The readback parser `13 02` restores these same four bytes.

**Strong inference from user screenshot + QuickTone language resource:**
- The WAH configuration presents the two sliders as MIN and MAX under a RANGE title.

**Still unresolved:**
- Exact numeric localization-ID → language-key mapping for the three captions.
- Whether the same caption strings and slider semantics apply unchanged to every function/model context.
- Actual meaning/consumer of separate `0D 02` extended data.
