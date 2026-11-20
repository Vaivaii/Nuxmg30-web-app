# TIE-07 — Intelligence Expansion Specification

**Project:** MG30 Studio  
**Target device:** Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)  
**Status:** Proposed product/design specification — documentation only  
**Implementation authorization:** Not granted  
**Roadmap gate:** Requires explicit owner approval after the current Studio UI refinement milestone and the existing TIE Phase 2/3 acceptance gates.

This specification records three future Intelligence capabilities. It does not authorize implementation, change the currently approved phase sequence, or start Phase 4. It is a product and technical planning document only.

## 1. Scope and non-negotiable boundaries

The proposed capabilities are:

1. Preset & Scene Level Matching.
2. Artist Tone Matching.
3. AI Tone Reconstruction.

They must extend the current Tone Intelligence Engine and existing MG30 Studio architecture. They must not create a second DSP engine, audio transport, AI/provider manager, effect database, preset manager, or device communication stack.

All device-specific behavior must target the original MG-30 Gen 2 firmware family and be based on verified capabilities, parameter descriptors, preset structure and read/write behavior. Do not carry assumptions from MG-30 MKII to Gen 2.

The following are protected:

- Phase 2 DSP definitions and processing.
- Phase 3 Tone Comparison processing, alignment and RMS-match contract.
- Existing audio source adapters, Audio Engine and worker lifecycle.
- Shared AI Engine, provider order/fallback, authentication and secret handling.
- Existing preset codec, validation, import/export and user confirmation flows.
- Original Gen 2 SysEx/MIDI protocol, MIDI CC mapping and firmware mappings.
- NAM and IR libraries, including collection/import mapping.
- Jamm, Record, Quick Record, Mini DAW 4 Track, Timeline, Mixer, playback, USB Loopback and Input Gain.

No future feature may write to the device merely because an AI suggestion exists. Every proposed device mutation must pass existing parameter validation and an explicit user confirmation. Read-back or other available verification must follow a write.

## 2. Evidence and data vocabulary

Every result, recommendation and UI statement must identify its evidence class.

| Evidence class | Meaning | Allowed presentation |
|---|---|---|
| Measured | Calculated from a known, decoded audio source or a verified device read | Numeric result with source, method, settings and time |
| Device-documented | Read from the verified MG-30 Gen 2 model/parameter/preset schema or device state | Exact device identity, parameter identifier and read provenance |
| Source-documented | Supported by an attributed, verifiable artist, manufacturer, interview, recording-credit or other primary/credible reference | Citation/provenance, date and claim scope |
| Estimated | Inference derived from measured or source-documented evidence | Clearly labelled estimate, confidence and alternatives |
| Recommended | A proposed action, not a measured fact | Rationale, expected effect, risk and user approval state |
| Unknown / unavailable | The necessary evidence is absent or unreliable | Say it is unknown; do not fill the gap with a plausible value |

Do not convert an estimate into a fact by repeating it in an AI response. Confidence is not a substitute for provenance.

## 3. Feature A — Preset & Scene Level Matching

### 3.1 User problem and outcomes

Help a guitarist reduce unexpected perceived level jumps when changing between MG-30 presets or scenes. The intended output is a measured comparison and a safe compensation recommendation, with optional application to verified device Level/Volume controls.

The tool must preserve the intended tone. It must not achieve level equality by silently changing preamp gain, drive, EQ, compression, amp model, cabinet, NAM or IR.

### 3.2 Source capture and comparison validity

A valid comparison requires a repeatable input stimulus and comparable signal path:

- Prefer one known DI/reference performance replayed through each target preset/scene under a documented, repeatable capture route.
- Keep guitar/input, pickup, input gain, source file, sample rate, channel selection, capture gain, output path and analysis window constant.
- Store source identity and capture provenance per measurement.
- Use the same analysis region, or a documented common region with matched start/end boundaries.
- A pair of unrelated user performances is not an acceptable basis for claiming that the preset itself is louder; playing dynamics and source content confound the result.
- Do not assume USB-MIDI is USB Audio. Use only an existing verified capture path or a user-imported recording. Direct device loopback/re-amping is not implied by a connected USB-MIDI device.
- If a stable controlled capture path is unavailable, offer a manual recording/import workflow and clearly state that the result describes those recordings, not an isolated device parameter difference.

### 3.3 Measurement contract — peak, RMS and loudness remain distinct

The UI and data model must preserve distinct measurements and units:

| Measurement | Required label | Meaning and use |
|---|---|---|
| Sample peak | dBFS | Maximum decoded sample magnitude. Useful for digital sample headroom; it is not true peak. |
| True peak (future optional metric) | dBTP | Estimated inter-sample peak using a verified oversampling/filter method. Do not expose until the estimator and tolerances are tested. |
| RMS level | dBFS | Energy-based level over the stated analysis interval and channel policy. The window, channel aggregation and silence behavior must be recorded. |
| Integrated programme loudness (future optional metric) | LUFS or LKFS | Only when a complete implementation compliant with the stated revision of ITU-R BS.1770 is validated, including the required channel weighting and gating. It must not be inferred from RMS or a peak value. |
| Loudness range / short-term / momentary descriptors (future optional) | LU | Only when the applicable measurement method is implemented and validated; do not substitute RMS envelopes. |

The current Phase 2 DSP results do not, by themselves, establish BS.1770 integrated loudness, true peak or loudness range. These metrics remain unavailable until separately implemented and tested.

Standards references for future implementation and verification:

- ITU-R Recommendation BS.1770-5 (November 2023), the current in-force revision identified by ITU for programme loudness and true-peak measurement: https://www.itu.int/rec/R-REC-BS.1770/en
- EBU R 128 Version 5.0 (November 2023), a loudness-normalisation recommendation that refers to BS.1770-compliant measurement: https://tech.ebu.ch/publications/r128

These standards define measurement methods and descriptors; they do not automatically define a suitable target level for guitar preset switching. The MG-30 Studio product must choose and document a guitar-specific matching target and method rather than copying a broadcast target.

### 3.4 Matching and compensation behavior

For each compared preset/scene, record the selected metric, analysis interval, capture route, channel policy, sample rate, source hash/identity, preset/scene identity and measurement version.

- Compare each candidate against an explicitly selected reference preset/scene.
- Calculate and display the level difference in dB, with sign convention and formula shown.
- Show the proposed compensation amount and which verified device parameter would receive it.
- Prefer a post-chain output Level/Volume parameter with a verified device descriptor, not a parameter that changes preamp gain or tone.
- The feature must first audit the actual Gen 2 parameter database, parameter ranges, resolution/quantization, block availability, scene assignment behavior and whether that control is serialized in the preset.
- If no suitable per-preset/per-scene output-level control is verified, provide a recommendation-only result. Do not write a guessed parameter or alter an unrelated control.
- Apply device parameter min/max bounds, step quantization, clipping/headroom constraints and any known scene/preset constraints before producing an actionable proposal.
- Never silently boost a signal beyond the documented safe ceiling. If the proposed correction is outside the device range or headroom policy, report the residual difference and ask the user to choose a safe alternative.
- Distinguish “match using RMS” from “match using integrated loudness”; neither may be renamed to the other.
- Preserve the exact unmodified preset and scene as a reversible source state.

### 3.5 Preview, A/B and write workflow

Required UI flow:

1. Select reference and target preset/scene.
2. Capture or select valid comparable source audio.
3. Analyze and show measured metrics and provenance.
4. Show before/after predicted gain/level delta, the exact target device parameter, quantized device value and any residual mismatch.
5. Preview the unmodified versus compensated audio using the existing Tone Comparison playback/comparison infrastructure when compatible source audio exists.
6. Explain that offline audio preview is not proof of the physical MG-30 output unless it was captured from the verified device route.
7. Require explicit confirmation before modifying a device-bound preset/scene.
8. Use the existing preset and device communication paths; do not build a parallel writer.
9. Preserve/offer a backup or undo path using existing preset mechanisms.
10. Read back or otherwise verify the target state where supported and report success/failure truthfully.

### 3.6 Required dependencies

- Phase 2 Audio Engine/source provenance and validated measurements.
- Phase 3 Tone Comparison for controlled A/B preview and matched-region comparison.
- Verified Gen 2 preset/scene parser and writer.
- Verified Gen 2 effect/parameter database including Level/Volume identifiers and ranges.
- Existing Editor state, preset backup/save and USB-MIDI communication.
- A repeatable device audio capture/replay workflow; this may be a blocker if no supported route is available.
- Existing user-confirmation and rollback behavior.

### 3.7 Acceptance gates

- Same input performance and unchanged settings produce repeatable measurements within documented tolerances.
- Known gain/level offsets produce the expected dB delta for each supported metric.
- Peak, RMS, true peak and LUFS/LKFS never share a misleading label.
- No tone-shaping parameter changes as a side effect of matching.
- Out-of-range, unsupported or unverified output-level controls are rejected without device writes.
- Before/after preview is sourced from actual selected audio, not synthetic demo data.
- User confirmation, backup, device write and read-back outcomes are tested.
- Preset switching and scene switching on an original Gen 2 unit are tested across firmware 6.0.x variants declared in the compatibility matrix.

## 4. Feature B — Artist Tone Matching

### 4.1 User problem and outcomes

Allow users to search for guitar tone references by guitarist, song, era, recording, or descriptive tone character. The feature should turn verifiable evidence and, when supplied, user audio into a grounded tone analysis and a set of candidate MG-30 Gen 2 settings.

Example queries include John Mayer, Eric Johnson, Andy Timmons, Steve Vai and Mateus Asato. Artist names are search terms, not evidence that a particular rig or recording chain was used.

### 4.2 Search and reference evidence

Search may cover:

- Artist and band.
- Song, album, recording session and release period/era.
- Live performance, tour or specific rig period.
- Tone descriptors such as clean, edge-of-breakup, crunch, saturated lead, compressed, bright, dark or ambient.
- Equipment and signal-chain claims, only when supported by a source.

Preferred source order:

1. Artist, band, producer, engineer or management statements and official rig breakdowns.
2. Manufacturer artist pages or equipment documentation that identifies the relevant artist and model.
3. Recording credits, session notes, interviews and reputable specialist publications with named sources.
4. Secondary community material only as a lead requiring corroboration, not as sole proof for an exact equipment claim.

Each evidence record should capture source title, publisher/author, URL, publication date, access date, artist/song/era applicability, quotation or concise permitted summary, evidence type, confidence and any conflicts. Do not store full copyrighted recordings, full transcripts or unlicensed tablature/manual text. Honor source terms and attribution.

### 4.3 User-supplied audio analysis

- Accept user-selected recordings through existing local import/audio adapters where supported.
- Record source metadata, sample rate, channels, duration, file hash/identity, analysis settings and selected region.
- Run existing DSP and Tone Comparison rather than creating an alternate FFT/audio-processing pipeline.
- Distinguish whole-mix analysis from guitar-only analysis.
- When the source is a full mix, explicitly state that measured frequency/dynamics include other instruments, vocals, room, mastering and processing.
- Do not claim reliable or perfect guitar stem separation unless a source-separation system is separately selected, licensed, technically validated and tested.
- Any external/cloud stem-separation service must be optional, user-consented, clearly disclosed before upload, and subject to service terms, privacy and cost review.
- Keep raw source audio local by default. Do not upload it to an AI provider merely because the user asked for a tone match.

### 4.4 Analysis output contract

Output must separate four panels or evidence categories:

- **Measured:** actual DSP values from the selected source and analysis interval.
- **Documented:** gear/chain details supported by the cited source.
- **Estimated:** likely amplifier/cab/effect/dynamics/EQ characteristics inferred from available evidence, including alternatives.
- **Recommended:** MG-30-compatible options, with reason, expected impact, confidence and known limitation.

Potential analysis dimensions:

- Amplifier family and operating character.
- Gain/drive and clean-to-breakup behavior.
- Broad EQ balance and frequency regions, bounded by measurements where available.
- Pick attack, sustain, compression and dynamic range estimates.
- Modulation, delay, reverb and ambience.
- Cabinet/speaker/microphone evidence when sources support it.
- Candidate signal-chain topology and ordering.
- Guitar/pickup, tuning, playing style, room, microphone and production effects that may explain differences.

No exact amplifier, effect, setting, NAM, IR, microphone or signal-chain claim may be presented as fact unless a source supports it. If multiple rigs or recording periods are plausible, show alternatives rather than force a single answer.

### 4.5 Confidence and limitations

Confidence should be tied to evidence quality and coverage, not only model certainty:

- High: primary/official source explicitly identifies the relevant rig or setting for the song/era and the claim is not contradicted.
- Medium: multiple credible secondary sources agree or the source documents a broader era rather than the exact recording.
- Low: indirect inference, ambiguous timeframe, incomplete credit, conflicting sources or analysis of a full mix.

Every result should state what evidence is missing. A full-mix spectrum cannot uniquely identify an amplifier, cab or pedal. Similar output spectra can be produced by different guitars, pickups, effects, microphones, room acoustics and post-production.

### 4.6 Required dependencies and external services

- Existing TIE DSP and audio source adapters.
- Existing Tone Comparison for A/B and reference-vs-user audio comparison.
- Versioned TIE Knowledge Base and evidence/provenance schema.
- External web/search API or approved source provider for current artist/rig references, subject to provider access, rate limits, licensing, attribution and cost.
- Optional metadata/recording-credit API if licensed and available.
- Optional source-separation provider only after an explicit architecture/privacy/quality decision; not a required dependency for initial matching.
- Existing shared AI Engine for summarization and interpretation; no separate provider manager.

### 4.7 Acceptance gates

- Every specific gear claim has traceable source provenance and period/recording scope.
- User audio analysis records actual source metadata and DSP settings.
- Full-mix limitations and source-separation limits are visible.
- Facts, estimates and recommendations are visually and structurally distinct.
- Confidence decreases when evidence is indirect, conflicting or incomplete.
- A result can say “unknown” when no suitable reference is found.
- External API errors, no results, rate limits, stale content and licensing limitations are handled.
- Artist search never silently downloads or uploads copyrighted tracks.

## 5. Feature C — AI Tone Reconstruction

### 5.1 User problem and outcomes

Generate a candidate MG-30 Gen 2 preset/scene that approximates a selected Artist Tone Matching result. It is a constrained configuration and preset-authoring assistant, not an unrestricted device programmer.

The output must be a valid candidate derived only from the verified original Gen 2 capability database and existing library content. It must state what it could approximate and what it cannot reproduce.

### 5.2 Generation inputs

A reconstruction request may include:

- An approved Artist Tone Matching result with references and evidence classes.
- Selected artist/song/era/recording context.
- User-provided reference audio and measured DSP report, if available.
- User guitar, pickups, playing style and monitoring context, when supplied.
- Existing MG-30 preset, scene, signal-chain state and device firmware identity when read from the connected device.
- Existing NAM and IR library inventory, including local availability and formats.
- User preferences, constraints and excluded gear/effects.

Reject stale, missing or incompatible device/library context rather than assuming support.

### 5.3 Constrained configuration generation

The shared AI Engine may produce a structured proposed plan; deterministic validation must remain authoritative.

- Build only from a versioned MG-30 Gen 2 effect/model database.
- Validate every block type, model identifier, legal order, slot constraint, parameter identifier, data type, minimum/maximum, step, enum, bypass state, scene assignment and firmware compatibility.
- Use only actual amplifier, cabinet, effects, NAM and IR entries that exist and are supported in the target device/library.
- Do not fabricate NAM captures, IR files, model names, effect blocks, hidden parameter fields or undocumented firmware features.
- If a reference mentions gear not available on MG-30 Gen 2, select the closest verified alternative and disclose the approximation.
- If a requested chain cannot be represented, return a partial plan or explain the unsupported part; do not force it into a different undocumented block.
- Translate parameter values only through existing validated mapping/codec paths. Never let the language model author raw SysEx bytes or bypass validators.
- Store reconstruction input provenance, model/database version, generated candidate, validation outcomes and user revisions as a versioned draft.

### 5.4 Preview and comparison

- Preview the candidate in the existing Editor/Studio UI without writing it to the pedal.
- Reuse the existing Tone Comparison engine and audio playback for A/B when suitable reference and candidate recordings exist.
- An offline preview must be labelled according to its actual render/capture route; it must not be claimed as a measurement of the physical device unless it was captured from that device.
- Explain which characteristics are likely approximated, what differs, and which parts remain unsupported or low-confidence.
- Let the user revise or reject candidate blocks and parameters.
- Preserve the original active preset and scene until explicit user approval.

### 5.5 Save, export and device write

- Save candidate as a draft using existing preset storage.
- Export only through the existing, verified Gen 2 preset format/codec and existing export path.
- Before device write, show the target device/firmware, preset/scene destination, changed blocks/parameters, compatibility validation and any overwrite warning.
- Require explicit user confirmation before transfer or overwrite.
- Reuse existing device communication and preset load/save code.
- Preserve backup/undo behavior and verify the device state where possible.
- Report unsupported or unverified values as errors. Never silently omit/clip them and claim a perfect reconstruction.

### 5.6 Required dependencies

- Completed Artist Tone Matching evidence object.
- Verified MG-30 Gen 2 effect/model and parameter database.
- Verified preset/scene schema, codec and validation path.
- Existing Editor, preset manager, save/export and device transport.
- Existing NAM/IR libraries and metadata.
- Phase 2 DSP and Phase 3 Tone Comparison.
- Signal Chain Intelligence/device snapshot, when actual device context is required.
- Existing shared AI orchestration and provider fallback.
- User approval, backup and read-back verification.

### 5.7 Acceptance gates

- Every generated preset is schema-valid for the stated original Gen 2 firmware target.
- Every block/model and parameter exists in the verified compatibility database.
- Invalid/unsupported outputs are rejected before any device write.
- No raw AI-generated SysEx or bypass path exists.
- User preview and A/B use real selected audio, not dummy measurements.
- User confirmation is mandatory for device transfer and overwrite.
- Export uses the existing tested preset codec and a device round-trip test.
- Reconstruction reports the approximated, unsupported and uncertain aspects.
- NAM/IR selection only references actual local/library inventory and supported formats.

## 6. Shared architecture and data contracts

These features should share:

- **DSP Engine:** measurements and audio descriptors; no feature-specific FFT duplicate.
- **Audio Engine:** current supported audio sources, decode, lifecycle, consent and provenance.
- **Tone Comparison:** A/B playback, source alignment and report methods.
- **Signal Chain Intelligence:** verified current device state, block topology and parameter provenance when implemented and approved.
- **MG-30 Gen 2 capability database:** authoritative block/model/parameter inventory, ranges, order constraints, firmware/version support and preset serialization rules.
- **NAM and IR Library:** inventory, metadata, format validation, ownership/provenance and availability.
- **Shared AI Engine:** one provider orchestration/fallback, bounded structured requests, typed validated outputs and secret-safe logs.
- **Preset system:** existing draft/save/import/export, compatibility validator, confirmation and backup.
- **Knowledge Base:** source metadata, evidence claims, artist/recording association, confidence and deprecation.

Proposed shared records (logical contracts; not committed implementation schemas):

- `LevelMatchMeasurement`: source/capture provenance, preset/scene identity, metric name/unit/method, interval, settings, measured value, headroom and timestamp.
- `LevelMatchProposal`: reference, candidate, selected metric, delta, target parameter identity, pre/post value, quantized result, validation, residual difference, preview reference and confirmation status.
- `ArtistToneReference`: artist/track/era, claim, source/author/date/URL, relevance scope, evidence class, confidence, license/attribution status and conflict notes.
- `ToneAnalysisProfile`: measured descriptors, documented equipment, estimated characteristics, recommendations, source-audio provenance, uncertainty and alternatives.
- `ToneReconstructionDraft`: device/firmware target, source analysis profile, validated block/parameter list, library asset IDs, database version, unsupported items, preview/A-B evidence, validation errors and user confirmation/write status.

All records should be versioned and reproducible. AI prompts and reports should refer to the exact knowledge/database/DSP versions used.

## 7. API, licensing, privacy and operational dependencies

| Dependency | Planning requirement | Gate |
|---|---|---|
| Artist/rig web search | An approved search API or trusted source connector; source URLs, date, attribution and failure handling | Select provider and review terms, quotas and costs |
| Recording metadata/credits | Optional metadata provider with licensed access and accurate recording/period mapping | Do not treat unverified fan entries as facts |
| User audio | Existing local import first; any cloud use requires opt-in disclosure | Privacy and retention review |
| Source separation | Optional, separate decision; API terms, cost, latency and quality evaluation | Not assumed, not a prerequisite for initial matching |
| Loudness processing | Validated BS.1770-5 implementation and test vectors before LUFS/LKFS labels; relevant EBU descriptors only when implemented | Numerical conformance review |
| MG-30 database | Verified Gen 2 block/model/parameter/firmware map | Hardware and codec round-trip tests |
| AI provider | Existing shared AI Engine and fallback only | No second manager/provider stack |
| Preset write/export | Existing validated codec and device transport | Original Gen 2 device confirmation and backup |

API keys must remain in existing secure credential/configuration surfaces or server-side connectors; never commit credentials or put provider secrets into public client bundles. No automatic upload of user recordings. External provider failure must degrade to local measurements, sourced references already available, or an explicit “not available” result.

## 8. Proposed planning sequence (not implementation phases)

This sequence is a dependency proposal only and does not modify the current Phase 0–7 roadmap.

1. Capability and data audit: prove Gen 2 parameter/database/preset coverage; identify missing output-level controls and safe scene semantics.
2. Measurement qualification: define controlled capture/replay, repeatability tests and the strict peak/RMS/loudness method contract.
3. Reference/evidence qualification: select artist search/data providers and source/attribution policies; build an evidence coverage matrix.
4. Level-match prototype design: define comparison, recommendation, user preview, confirmation, backup and read-back contract.
5. Artist-match prototype design: define source search, audio evidence, confidence, full-mix limitation and candidate-chain report.
6. Reconstruction prototype design: define structured candidate schema, deterministic validation, library mapping, preview and preset round-trip tests.
7. Integrated acceptance: verify actual Gen 2 hardware, original presets, NAM/IR, shared AI fallback, DAW/audio paths and all relevant regression gates.

Each step requires a separate approved scope, owner acceptance criteria, risk review, and repository checkpoint. Do not begin any step simply because this document exists.

## 9. Risks and explicit non-goals

- A preset can be perceived louder because of source performance, pickup, input gain, scene state or capture route; uncontrolled recordings must not be labelled as a preset-level property.
- RMS is a signal-energy descriptor, not a universal perceptual-loudness measure. Peak is not loudness. True peak needs a distinct estimator. Integrated loudness needs a standards-conformant measurement path.
- Artist gear lists may refer to a tour, era or live setup rather than a particular studio recording.
- Full-mix audio contains multiple sources. No perfect guitar separation claim is allowed without a dedicated validated source-separation capability.
- A mathematically similar response does not prove identical circuit, speaker, microphone or playing feel.
- AI-generated settings may be syntactically plausible but device-invalid; deterministic capability validation is mandatory.
- Similar preset names/models across MG-30 and MG-30 MKII are not evidence of parameter or codec compatibility.
- No unrestricted preset reverse-engineering, unsupported SysEx writes, firmware patching, or automatic destructive overwrite is in scope.

## 10. Stop and approval condition

This document records ideas, requirements and dependencies only. It does not change the current build, DSP, firmware, MIDI, preset codec, NAM/IR transfer, AI provider architecture or device behavior.

**Implementation of Preset & Scene Level Matching, Artist Tone Matching and AI Tone Reconstruction requires explicit owner approval. Phase 4 Signal Chain Intelligence also remains gated by the existing explicit approval requirement.**
