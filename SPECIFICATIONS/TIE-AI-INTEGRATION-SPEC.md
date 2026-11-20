# TIE-04 --- Shared AI Integration Specification

**Project:** MG30 Studio · **Module:** AI orchestration and context\
**Version:** 1.0 · **Status:** Technical design baseline

## 1. Core rule

MG30 Studio has one shared AI orchestration/provider/fallback
infrastructure and two access points: - Editor AI: tone creation, effect
parameters and device-control assistance. - Studio AI: analysis
interpretation, comparison, signal-chain diagnostics and audio
engineering consultation.

This is not permission to create a second AI engine. Audit and reuse the
actual provider manager, worker, fallback sequence, API-key handling and
authenticated flows already in the repository.

## 2. Existing architecture audit

Before changing code, document: - All providers and model identifiers. -
Which providers run in the worker and which are configured in the app. -
Fallback order and retry policy. - API key storage and transport. -
Login/OAuth flow, if any. - Request/response schema. - Rate-limit and
error handling. - Conversation persistence. - Streaming behavior. -
Existing Editor Live Tone Assistant and parameter validation path.

Do not assume provider count or fallback order from an old note; inspect
current code.

## 3. Shared orchestration boundary

Suggested conceptual flow:

``` text
Editor UI ── EditorContextAdapter ─┐
                                  ├─ Shared AI Orchestrator
Studio UI ── StudioContextAdapter ┘       │
                                  Provider Manager / Fallback
                                           │
                                     Provider Adapter(s)
```

The orchestrator owns common request lifecycle, cancellation, retries,
telemetry-safe logging and normalized errors. Provider adapters own
provider-specific request/response mapping.

## 4. Context envelope

Use a versioned, size-bounded envelope. Adapt field names to repository
conventions.

``` ts
interface AiContextEnvelope {
  schemaVersion: 1;
  entryPoint: "editor" | "studio";
  task:
    | "tone-design"
    | "parameter-help"
    | "audio-analysis"
    | "tone-comparison"
    | "signal-chain-review"
    | "audio-engineering";
  locale?: string;
  userQuestion: string;
  editorContext?: {
    activePresetSummary?: unknown;
    effectChainSummary?: unknown;
    namSummary?: unknown;
    irSummary?: unknown;
    deviceStateSummary?: unknown;
  };
  studioContext?: {
    sourceSummary?: unknown;
    analysisSummary?: unknown;
    comparisonSummary?: unknown;
    recordingMetadata?: unknown;
  };
}
```

Use actual application types once audited. Never serialize large PCM
buffers, secrets, full file contents or irrelevant device data into
routine prompts.

## 5. Context isolation

-   Editor requests should not accidentally inherit stale Studio
    analysis.
-   Studio requests should identify the active source and analysis
    timestamp.
-   Shared history may be retained, but each message must carry its
    entry point/task context.
-   When switching tasks, either create a clearly scoped thread or
    explicitly summarize relevant prior context.
-   Do not silently reuse a stale preset or analysis result.

## 6. Response contract

Normalize provider output into a structured internal result:

``` ts
interface AiAdvice {
  summary: string;
  measuredFacts: Array<{ label: string; value: string; source: string }>;
  interpretation: string[];
  hypotheses: Array<{ claim: string; confidence?: "low" | "medium" | "high" }>;
  recommendations: Array<{
    title: string;
    rationale: string;
    steps: string[];
    proposedChanges?: unknown;
    requiresUserApproval: boolean;
  }>;
  limitations: string[];
}
```

The app must tolerate plain-text provider responses where structured
output is unavailable. Do not parse untrusted model output as executable
code.

## 7. Safe parameter application

AI recommendations must never directly write MIDI or mutate device state
without the existing validation and user-confirmation path.

Required flow: 1. AI proposes a change. 2. App validates effect
identity, parameter name, range, type and device compatibility against
actual schema. 3. UI previews before/after values. 4. User confirms. 5.
Existing Editor action applies the change. 6. Device response/state is
verified where possible. 7. Failure is reported without pretending the
change succeeded.

Reject unknown parameters, invalid ranges and unsupported blocks. Do not
let AI invent device capabilities.

## 8. Provider fallback and reliability

Preserve existing fallback behavior unless audit proves a defect. Define
retryable vs non-retryable failures. Avoid retrying invalid requests or
authentication failures indefinitely. Prevent duplicate user messages
when a fallback is attempted. Add cancellation and request IDs so late
responses cannot overwrite a newer conversation state.

Log provider/model, latency and normalized error code where appropriate,
but never log API keys, tokens, raw secrets or private audio content.

## 9. Cost and privacy controls

-   DSP summaries should be sent before considering raw audio.
-   Audio upload requires explicit user action and provider capability.
-   Show when a request may incur API charges if the existing product
    model requires it.
-   Respect provider-specific limits and data policies.
-   Allow cancellation.
-   Bound context size and summarize long histories.
-   Do not embed user API keys in source control or public client
    bundles.

## 10. UI behavior

Editor AI retains its existing interaction and Live Tone Assistant
behavior. Studio AI opens the AI Consultant with current analysis
context. Both use shared loading, error, retry, history and provider
status components where appropriate.

## 11. Acceptance criteria

-   Only one provider manager/orchestration path exists.
-   Existing Editor AI and fallback behavior pass regression tests.
-   Studio context is correct and isolated.
-   Context payload is versioned, bounded and secret-free.
-   Recommendations cannot bypass parameter validation.
-   Cancellation and late-response handling are tested.
-   Provider errors are normalized and user-readable.
-   No false claims about audio analysis or device changes are produced.


## 12. Proposed AI Tone Reconstruction contract — Planning Only

AI Tone Reconstruction is a future constrained preset-authoring flow, not an implementation authorization. Detailed requirements are in `TIE-INTELLIGENCE-EXPANSION-SPEC.md` §5–6.

- It must use this existing shared AI orchestration and provider fallback. Do not create another AI engine, model router, credential store or provider manager.
- AI output is an untrusted candidate plan. Deterministic validators remain authoritative for the original MG-30 Gen 2 model/firmware, block identifiers, order/slot constraints, parameter identifiers, value types, ranges, steps, enums, scene rules and preset schema.
- Only device blocks/models and parameter descriptors in the verified Gen 2 capability database may be emitted. Only actual available NAM and IR library entries may be referenced.
- AI must not author raw SysEx, firmware commands, undocumented controls or a guessed preset binary. Route all changes through the existing validated parameter mapping, preset codec and device communication path.
- If a requested amp/effect/cab/parameter is unavailable, offer an explicitly labelled closest supported alternative or report that it cannot be reconstructed. Never fabricate an effect or asset.
- Output must include source Artist Tone Matching evidence, measurements, estimated attributes, confidence, alternatives, unsupported aspects and the capability database/version used.
- Preview is a draft state, not a device write. Reuse existing Editor controls, Tone Comparison and preset manager for preview/A/B/revision/save/export.
- Require explicit confirmation before device transfer or overwrite, use existing backup/undo and verify read-back when supported.
- Preserve the original active preset and scene until user confirmation. An offline preview may not be represented as actual pedal output unless it was recorded from the verified MG-30 route.

Acceptance requires valid Gen 2 preset/scene round-trips, zero unsupported block/parameter output, validated before/after A/B with real audio, user-confirmed device writes, and regression coverage for the existing shared AI fallback, Editor, NAM/IR, preset and MIDI paths.

