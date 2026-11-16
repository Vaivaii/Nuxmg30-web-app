# AI Tone Architect Reliability Roadmap
Date: 2026-11-16
Branch: `feature/multi-ai-free-tone-architect`
Target device: Original NUX MG-30 Gen 2 firmware 6.0.x (not MKII)

## Purpose
Improve the reliability of turning a multi-turn guitar-tone discussion into a catalog-valid MG-30 Tone Plan, while preserving the existing live editor and device-transfer architecture.

This roadmap records the agreed work before implementation. It is a plan and a validation contract; items are not marked complete until code and tests pass.

## Observed failure modes
1. A conversation can establish an artist/style and tonal direction, but a short follow-up such as "oke, buatkan sekarang" may be classified from the latest message alone and routed to consultation rather than Tone Plan creation.
2. Tone Plan responses can invent parameter keys that do not exist on the selected MG-30 effect model. Observed examples:
   - `DLY / Analog Delay`: unsupported `level`
   - `RVB / Hall`: unsupported `mix`
3. The application correctly blocks invalid plans before MIDI is sent, but the current single focused AI correction attempt may repeat the same schema error.
4. Multi-AI and Tone Architect must retain the musical intent from prior discussion without carrying an old artist/target into a new, explicit request.

## Workstreams and acceptance criteria

### 1. Conversation-to-Tone Intent (highest priority)
- Extend intent classification to consider the latest user message plus a bounded recent conversation context.
- Detect unambiguous tone-creation continuations (e.g. "oke, buatkan sekarang", "terapkan rekomendasi tadi", "go ahead and build it") when the recent context is a tone discussion.
- Preserve consultation, audio analysis, NAM search and tone-refinement routes; a question about tone must not become a device write.
- A newly named artist/target in the current message always overrides earlier conversation context.
- Keep the classifier deterministic and test it with Indonesian and English follow-ups.

Acceptance: a discussion followed by a short creation command enters `tone_create`; ordinary questions remain `consultation`; explicit edits remain `tone_refine`.

### 2. Conversation Memory and Tone Context
- Pass recent relevant conversation into Tone Architect as well as the Lead AI, not only the final short command.
- Maintain a bounded context window and preserve the distinction between current request and prior context.
- Reuse an existing structured `tone_intent` for a true continuation when valid, but clear stale intent for a new artist/style/target.
- Never let a previous artist reference override a new target in the latest request.

Acceptance: the Tone Architect and Lead AI receive the latest command and the context that explains what "it/that/now" refers to.

### 3. Catalog-grounded Tone Plan Compiler / Validator (highest priority)
- Treat `bridge.getCatalog()` as the sole technical authority for block IDs, exact model names, parameter keys, value ranges, and discrete choices.
- Keep validation deterministic and local. Do not send MIDI or apply a plan until every block passes validation.
- Add deterministic repair only for a proven, unambiguous model-specific alias backed by actual catalogue metadata. Do not guess that `level` means another control or that `mix` exists on every effect.
- For unsupported/ambiguous keys, reject the plan with a useful error that identifies the block/model and allowed keys, then request one focused correction using only the affected model's exact catalog schema.
- When changing a model, continue requiring every writable parameter for that model; when retaining a model, send only changed parameters.
- Preserve unaffected blocks.

Acceptance: known invalid aliases are either corrected by a tested exact mapping or rejected with the available parameter keys; no fabricated key reaches the dispatcher.

### 4. Multi-AI Orchestration
- Keep the existing free-first provider policy, bounded sequential fallback, Tone Architect, Lead AI, and conditional Critical Reviewer.
- Give each role the same authoritative catalog constraints and the same resolved conversation intent.
- Avoid extra provider calls for simple requests; retain bounded call count and existing token protections.
- A reviewer may improve coherence but cannot bypass local validation.

Acceptance: provider failure falls back according to existing settings; all final plans still pass the local validator.

### 5. Artist Tone Intelligence
- Improve artist/style-specific guidance only after conversation intent and catalog grounding are reliable.
- Preserve the distinction between an inspired tone and a claim of reproducing an exact artist rig.
- Use TONE3000 metadata as supporting evidence only; do not infer undocumented boost/overdrive inclusion.
- Keep artist/style requests from collapsing into a generic effect chain.

Acceptance: tone intent describes gain character, playing feel, tonal balance, ambience, focus and avoid-list without inventing device IDs or controls.

### 6. MG-30 Compatibility and MIDI Safety (protected)
- Keep the existing `validateAiTonePlan → MG30AIToneBridge.applyPlan → existing serialized MIDI dispatcher` flow.
- Invalid plans must stop before `applyPlan`; never send partial or guessed writes.
- Do not alter MIDI CC/parameter mapping, dispatcher sequencing, snapshot/Undo behavior, preset serialization, USB-MIDI live update, or firmware handling.
- Do not alter NAM Slot 10 import/selection behavior or NAM internals.
- Do not alter IR User / Third Party / Collection routing or import behavior.
- Keep original MG-30 Gen 2 firmware 6.0.x as the target; no MKII assumptions.

Acceptance: regression tests prove invalid plans produce no apply call and protected transfer/mapping paths are unchanged.

### 7. Regression Tests and Release Verification
Required test groups:
- Contextual creation after a discussion in Bahasa Indonesia and English.
- A normal question remains consultation.
- Explicit new artist overrides earlier context.
- Refinement remains a delta update.
- Tone Architect receives conversation context for a continuation.
- Unsupported parameter key is rejected or deterministically repaired from exact catalogue metadata.
- Invalid plan does not reach MIDI/apply.
- Existing NAM, IR, MIDI mapping, Undo, USB Audio and provider-fallback tests remain green.

Release gate:
1. JavaScript syntax validation passes.
2. Full protocol/regression test suite passes.
3. Capacitor Android project generation succeeds.
4. Gradle debug APK build succeeds.
5. Latest branch commit has a downloadable APK artifact.
6. Physical Android + connected original MG-30 Gen 2 test is still required for hardware confidence; CI is not a substitute for pedal testing.

## Implementation order
1. Implement workstreams 1 and 2 together (intent classification + bounded conversation context).
2. Implement workstream 3 from actual MG-30 catalogue descriptors; do not create aliases until the exact catalogue definition proves the mapping.
3. Verify workstream 4 remains intact; improve workstream 5 only where tests identify a concrete gap.
4. Run the complete regression suite and the release gate.
5. Record changes and results in a follow-up implementation note.

## Explicit non-goals / do-not-touch list
- No rewrite of the Multi-AI architecture.
- No change to `www/cloud-api.js` endpoints/authentication unless independently proven necessary.
- No change to the frozen MG-30 editor/device bridge.
- No change to MIDI mappings, signal-chain order, dispatcher sequencing, preset serialization or USB-MIDI behavior.
- No change to NAM import, Third Party/User/Collection mapping, slot-10 behavior or NAM internal parameters.
- No change to IR User / Third Party / Collection mapping or import.
- No change to Audio Listening, composer or Settings UI as part of this reliability task.

## Status at roadmap creation
- Roadmap documented before implementation.
- Workstreams 1–3 are the immediate engineering focus.
- No implementation item is considered complete until its regression test and CI result are recorded.
