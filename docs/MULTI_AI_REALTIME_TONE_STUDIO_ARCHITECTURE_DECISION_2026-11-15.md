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

---

## Implementation update — six-agent sequential Tone Architect (2026-11-17)

Status: **Initial implementation committed on isolated feature branch; validation/build still pending. Not released.**

### Chief and specialist roster
- GPT-6 Luna is the sole Chief/orchestrator and final synthesis authority through the existing ChatGPT connection.
- Six distinct specialist roles are declared: Tone Researcher; Amp & Cabinet Specialist; Effects Specialist; Guitar & Input Specialist (conditional); Tone Calibration Specialist; Tone Critic (conditional quality gate).
- The prior four-role delegation contract was replaced by the six-role contract. Tone Researcher must distinguish model knowledge/inference from verified external evidence and never fabricate citations.

### Sequential execution contract
- The orchestrator requests one specialist at a time, receives its result, then decides whether another role is needed.
- Parallel specialist tool calls are rejected.
- Maximum six specialist tasks per user request; duplicate role requests are rejected by the runtime guard.
- Tone Critic and Guitar & Input Specialist remain conditional, not mandatory.
- The Chief evaluates specialist results and owns final synthesis. Specialist outputs are advisory and are not direct pedal commands.

### Free-provider fallback
- Specialist work first uses the existing auto free-provider route (Gemini/Groq/OpenRouter).
- On failure, implementation attempts the existing /api/v1/ai/light-task Cloudflare Workers AI route, configured in the app as Gemma.
- If both routes fail, the handoff is marked failed and the Chief is told not to claim that the specialist completed successfully.
- Important validation finding: the current branch's cloud-worker/src/index.js route table did not show an /api/v1/ai/light-task handler in the inspected source. The fallback is therefore not yet proven end-to-end and must be resolved before release; do not claim Gemma fallback is operational solely because the client call exists.

### Tests added/updated
- Updated tests/ai-tone-studio.test.js to cover six-role registration, sequential one-at-a-time handoffs, conditional-role availability, simple requests skipping agents, rejection of parallel calls, specialist budget enforcement, and failed handoff reporting.
- Test suite has not yet been run. No passing test/build/APK claim is made.
- Existing .github/workflows/build-apk.yml did not include this feature branch in its push branch filter at inspection time, so CI will not automatically run for this branch until its trigger is updated or a supported manual dispatch is used.

### Protected boundaries
- No changes were made intentionally to NAM, IR import/collection mapping, MIDI mappings, preset codec, or pedal transfer protocol.
- No production deployment, merge to main, or APK delivery is authorized by this implementation update.
- This branch remains isolated: feature/tone-architect-six-agent-sequential.

### Next required validation
1. Confirm/fix the Worker Gemma light-task route against the actual Worker binding and configured model; do not guess the Worker default model.
2. Add this branch to the build workflow trigger or use a verified manual workflow dispatch.
3. Run npm test, JavaScript syntax checks, Vite build, and Android Gradle debug build.
4. Resolve every failure and rerun until green.
5. Inspect the final diff to confirm protected NAM/IR/MIDI files remain untouched.
6. Update this document with actual test/build results before considering APK delivery.

---

## Validation and build recovery — 2026-11-17

Status: **Debug APK build passed and artifact verified.** This is a feature-branch debug build, not a release build or production deployment.

### Initial CI failure and correction
- First CI run: `44079143418` failed in `npm test` before Android project generation. The failing cases were six tests whose expectations did not match the six-agent sequential contract, including stale four-role names and an old assumption that specialist tools disappear after the first handoff.
- Only `tests/ai-tone-studio.test.js` was changed during the build recovery. Assertions now verify the six declared roles, structured failed-handoff payload, sequential one-specialist-per-turn behavior, and current usage labels. No application implementation code was modified during this recovery.
- A second run reached 649/650 tests; the last outdated assertion was corrected to permit a subsequent sequential handoff while continuing to prohibit parallel calls.

### Successful verification
- Final CI run: `44079614847`
- Commit: `7bccc03058fe67005635be5bfdab78645da1309d`
- JavaScript syntax validation: passed.
- Protocol regression suite: **650 passed, 0 failed**.
- Capacitor Android project generation and USB audio plugin setup: passed.
- Gradle `assembleDebug`: passed.
- APK artifact upload: passed.
- Artifact: `MG30-Studio-debug-APK` (artifact ID `14326676515`).
- Extracted file: `app-debug.apk`, 4,753,004 bytes (approximately 4.6 MiB).
- APK SHA-256: `0e54ddc565d2ffc67a9308bdd4a98965db2757bc21f9decadd7f77754b4e506c`.
- APK archive integrity check: passed; file recognized as an Android package.

### Scope and remaining release gates
- Build recovery changed tests only; it did not modify NAM behavior, IR import/User/Collection handling, MIDI mapping, preset codec, or pedal transfer code.
- Work remains on `feature/tone-architect-six-agent-sequential`. No merge to main and no production deployment were performed.
- A successful APK build does not prove the Cloudflare Worker Gemma specialist fallback end-to-end. The route/binding verification recorded above remains an independent blocker before claiming that fallback operational or treating the feature as release-ready.
- The delivered binary is a debug APK; it is not a signed production/release package.


---

## Architecture correction — ChatGPT replaces Cloudflare Workers AI (2026-11-18)

Status: **Implementation corrected on the isolated feature branch; validation is running again. Do not deliver an APK until the new commit passes the complete CI suite.**

### User clarification
The Cloudflare Workers AI/Gemma role is no longer part of the active application architecture. The existing connected ChatGPT account now handles ordinary discussion, light AI tasks, TONE3000 search/ranking, and tone creation. GPT-6 Luna is the Chief for Tone Architect requests and uses the connected ChatGPT session for separate role-scoped specialist requests. Gemini, Groq, and OpenRouter remain optional external providers for explicit Multi-AI mode or configured fallback only; they are not the default Chief or a substitute for Luna.

### Routing corrections
- Auto now resolves to ChatGPT as its primary provider; it no longer routes light tasks to Cloudflare Workers AI.
- Auto tone creation follows the ChatGPT GPT-6 Luna path. Artist-specific/complex requests are eligible for the sequential specialist orchestration contract; the Chief must call one relevant specialist, wait, evaluate, and then decide whether another is needed.
- Specialist requests use the existing ChatGPT SIWC/native bridge, not the legacy Worker light-task endpoint and not a Cloudflare Worker model.
- The old Workers AI test button, visible provider option, Gemma-first labels, and active Worker light-task route were removed from the AI settings UI and active routing.
- Legacy saved Cloudflare mode values are migrated to ChatGPT for compatibility; they do not select a live Worker route.
- The explicit external Multi-AI team remains Gemini/Groq/OpenRouter only. Failure of those providers must not silently fall back to Cloudflare/Gemma.
- NAM, IR User/Collection mapping, MIDI mapping, preset codec and pedal transfer behavior remain protected and are not intentionally changed.

### Regression coverage
- Updated provider-routing tests to assert ChatGPT-first Auto behavior, optional external-provider routing, and absence of Cloudflare from the active provider selector.
- Updated SIWC preservation coverage to retain the native ChatGPT bridge, audio UI, model discovery, and composer wiring while recognizing that ChatGPT has replaced the former Workers AI role.
- The initial rerun exposed stale assertions that still expected Cloudflare/Gemma to be active. Those assertions were updated to the corrected architecture; this is not evidence of a passing test run.
- New CI run and complete regression/build verification are required after this correction. No APK is approved for delivery until CI is green and the final diff confirms protected NAM/IR/MIDI/protocol files are unchanged.
