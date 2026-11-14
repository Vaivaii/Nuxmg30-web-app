# Multi-AI Real-Time Tone Studio — Architecture Decision
Date: 2026-11-15
Branch: feature/ai-live-tone-studio
Status: **Architecture decision recorded; implementation not started**

## User-approved decisions

- Collaboration strategy: **Adaptive Collaboration**.
- Final synthesis authority: **Lead AI**.
- Product intent: AI Live Tone Studio remains a real-time, conversational preset-design system for the original NUX MG-30 Gen 2 running firmware 6.0.x. Multi-AI collaboration extends this existing workflow; it does not turn the feature into a one-shot prompt-to-tone generator.

## Product behavior

The user gives a musical goal (for example, a John Mayer-style lead tone). Multiple AI providers/models work as a coordinated team with distinct, configurable responsibilities. They share the current preset context, can inspect relevant contributions from other agents, critique or revise proposals when useful, and continue collaborating throughout the live session as the user gives feedback.

The collaboration is adaptive rather than continuously forcing every agent to run on every turn:
1. Dispatch independent analysis tasks in parallel where useful.
2. Collect structured proposals against the same preset/session snapshot.
3. Trigger cross-agent critique when proposals conflict, confidence is weak, or a requested change materially affects another part of the tone.
4. Ask the Lead AI to resolve trade-offs and synthesize a coherent Tone Plan.
5. Re-evaluate only affected components on subsequent user feedback; preserve unaffected preset sections.
6. Keep the conversation open for repeated real-time refinement until the user is satisfied.

## Agent responsibilities (logical roles, not fixed provider bindings)

- **Tone Architect:** interprets the musical target, references, playing feel, dynamics, and desired tonal character.
- **Gear Specialist:** selects compatible MG-30 amp, cabinet, IR, and effect choices using the device catalogue/context available to the application.
- **Parameter Engineer:** proposes concrete parameter values and signal-chain settings.
- **Critical Reviewer:** checks coherence, identifies conflicts and likely tonal trade-offs, and challenges weak proposals.
- **Lead AI / Preset Composer:** coordinates the workflow, resolves disagreements, and produces the final structured Tone Plan.

Provider/model assignment must remain configurable. OpenAI, Gemini, Groq, OpenRouter, or other available providers are examples, not hard-coded role assignments. The Lead AI is a logical role and may be assigned to a selected available model.

## Authority and validation boundaries

- The **Lead AI** owns final AI synthesis and produces the final proposed Tone Plan.
- The **MG-30 Tone Validator** remains the technical authority for device compatibility: catalogue IDs, available blocks/effects, parameter names, ranges, ordering, and supported firmware/device constraints.
- The **user** retains control of auditioning, accepting revisions, and explicitly sending a preset to the pedal.
- No agent may bypass the validator or directly issue pedal commands.

## Shared session context

The orchestrator should maintain a versioned shared tone context containing, at minimum:
- user request and musical intent;
- connected device identity/firmware context where available;
- current preset/Tone Plan and its version;
- relevant catalogue/parameter constraints;
- agent assignments and structured proposals;
- review findings, unresolved disagreements, and synthesis decisions;
- user feedback and accepted/rejected revisions.

Agents should receive the minimum relevant context for their task, but all must reason against the same authoritative preset snapshot/version. Stale proposals must not silently overwrite newer user changes.

## Structured outputs

Agents should return machine-readable proposals rather than unconstrained prose alone. Proposals should identify the target preset component, proposed value/change, rationale, assumptions, confidence/uncertainty, and dependencies. The Lead AI should produce a single versioned Tone Plan. Validation errors must be surfaced and corrected before a plan is eligible for pedal transfer.

## Adaptive orchestration principles

- Parallelize independent work to reduce latency.
- Avoid invoking every model for every minor parameter edit.
- Use targeted re-analysis for local changes; escalate to broader review when dependencies or tonal balance may be affected.
- Bound critique/revision rounds, latency, token use, and API cost.
- Handle provider timeouts/failures without losing the current session or accepted preset state.
- Make agent activity, decisions, and material trade-offs visible to the user.

## Protected existing functionality

This architecture must not regress or alter unrelated working functionality:
- existing AI Tone Studio generation and Send-to-Pedal path;
- original NUX MG-30 Gen 2 firmware 6.0.x targeting (not MG-30 MKII);
- NAM functionality already working;
- IR import and User/Collection mapping;
- existing MIDI mappings and parameter/CC mappings;
- preset codec and firmware-specific transfer behavior.

Multi-AI agents must work through the existing Tone Plan/validation boundary and must not invent or bypass device transfer protocols.

## Non-goals for this decision

- No code changes, API/Worker changes, database changes, UI changes, branch changes, builds, or deployments are authorized by this decision.
- No fixed provider-to-role mapping is approved.
- No claim is made that subjective tone quality can be objectively guaranteed from model reasoning alone; audio/user feedback may be needed for reliable audition-based refinement.

## Next design work (not implementation authorization)

1. Map the current AI Tone Studio request → Worker → provider → Tone Plan → validator → pedal flow.
2. Define agent task contracts and the shared session/Tone Plan schema.
3. Design adaptive orchestration triggers, bounded review rounds, cancellation, and provider-failure behavior.
4. Design the live collaboration UI and user controls.
5. Define regression tests proving NAM, IR, MIDI, preset, and Send-to-Pedal behavior remains unchanged.

**Decision summary:** Adaptive Collaboration + Lead AI final synthesis, with mandatory MG-30 validation and explicit user control over sending the resulting preset.


## Free-API-first provider policy (user clarification, 2026-11-15)

Current app/provider situation confirmed by the user:
- Gemini: active; user is using the free API tier.
- Groq: active; user is using the free API tier.
- OpenRouter: active; user is using free API/model access.
- OpenAI/GPT: integration is present, but the user does not currently use it because API access requires paid usage for their setup.

Architecture implications:
1. **Free-first by default.** Multi-AI collaboration must be designed around the currently active free Gemini, Groq, and OpenRouter access. Paid GPT must not be a required dependency or silently selected.
2. **Optional paid providers.** Paid models/providers may be offered only when the user explicitly configures/enables them; do not assume paid billing or route requests to paid models by fallback.
3. **Quota-aware orchestration.** Track provider/model request and token limits where exposed; honor rate-limit headers and retry-after signals; handle HTTP 429, 5xx, timeouts, and model unavailability with bounded backoff and graceful degradation.
4. **Adaptive call budget.** Do not call all agents for every user message. Parallelize only independent, high-value tasks; use targeted agents for local edits; invoke Critical Reviewer only for conflicts, uncertainty, or materially coupled changes; cap critique rounds and output tokens.
5. **Role flexibility.** Keep logical agent roles separate from provider identity. Assign roles dynamically among the active free models based on availability, task suitability, and current quota. Do not hard-code Gemini/Groq/OpenRouter to fixed roles.
6. **Graceful reduced-team operation.** If one provider reaches quota or is unavailable, continue with remaining active providers and tell the user which roles were skipped or reassigned. Never silently claim that all providers participated.
7. **Transparent cost guard.** Show which providers/models will be called and whether a selected model is marked free or paid before any paid route is used. Default behavior must never incur a charge.
8. **Current catalogue is dynamic.** Free model availability, limits, and eligibility change. Discover/refresh model catalogues and price/free status rather than hard-coding a permanent list.

External documentation checked for design context (limits are dynamic and account/model-specific):
- Gemini documents free-tier model availability and per-model RPM/TPM/RPD limits.
- Groq documents per-model RPM/RPD/TPM/TPD limits and rate-limit response headers.
- OpenRouter documents free model variants and rate limits; its free catalogue and limits can change.
These references inform quota-aware design only; they do not establish the user's exact account quota.

**Updated decision:** Adaptive Collaboration + Lead AI final synthesis remains unchanged, with a **free-API-first, no-surprise-billing** operating policy.
