# Multi-AI Real-Time Tone Studio — Architecture Decision
Date: 2026-11-15
Branch: feature/ai-live-tone-studio
Status: **Architecture decision plus 2026-11-18 implementation changes recorded; CI and hardware verification pending**

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


## Regression recovery — provider-backed Tone Architect agents and USB Audio Listening (2026-11-18)

### Tone Architect provider execution
- GPT-6 Luna remains the sole Chief, orchestrator and final Tone Plan authority through the connected native ChatGPT SIWC bridge.
- Each delegate_tone_specialist handoff becomes one authenticated /api/v1/ai/light-task request to a configured provider. The role prompt, MG-30 catalogue subset, JSON output contract and token budget are preserved if a provider fails and the task falls back to the next configured provider.
- Specialist calls remain sequential. The starting provider rotates across the configured Gemini, Groq, OpenRouter and Cloudflare Workers AI team so provider activity is visible in the usage monitor. If all configured providers fail a requested specialist, no Tone Plan is produced or applied.
- Ordinary Auto fallback order is ChatGPT → Gemini → Groq → OpenRouter → Cloudflare Workers AI. Cloudflare Workers AI remains the final fallback provider, and the settings page restores its binding-status indicator and explicit connectivity test button.
- Worker source updates both cloud-worker/src/index.js and the deployment entry cloud-worker/worker.js. wrangler.toml declares [ai] binding = "AI". Worker deployment is separate and is not performed by the app build.

### Audio Listening regression
- Root cause: current www/main.js had dropped toneAnalysisCapture and dedicated Tone Analysis methods from window.NUXStudioRecorder. The AI panel still called inspectToneAnalysisInput, startToneAnalysis, getToneAnalysisStats, stopToneAnalysis and deleteToneAnalysisTake, so Audio Listening could not pass its initial device check.
- Restore the known-good native wrapper methods in www/main.js and export them from the recorder bridge. Keep Quick Record and DAW recording separate. Do not modify native-android/MG30AudioPlugin.java, its AudioRecord settings, USB routing or channel-mask protocol.
- Regression tests cover the restored recorder bridge and authenticated Worker task endpoints. Physical-device capture and real provider calls still need acceptance testing after the new APK and Worker deployment.

### Validation status
- CI validation is pending for this recovery commit. The previous APK does not contain these fixes and is not a deliverable for this recovery.


---

## User-approved two-mode Luna architecture — 2026-11-18

This section supersedes prior provider-selection and external Tone Researcher assignments above. Historical decisions are retained for traceability.

### 1. Ordinary discussion
- Every ordinary chat/discussion turn uses the signed-in ChatGPT native SIWC session with GPT-5.6 Luna (model ID: gpt-5.6-luna).
- The discussion route is prose-only. It does not generate a Tone Plan, invoke external specialist providers, or apply device parameters.
- The composer no longer allows the user to switch the conversational provider/model. Settings still retain provider diagnostics and connectivity controls.
- During discussion, the conversation displays a compact three-dot typing bubble labelled GPT-5.6 Luna.

### 2. Preset creation
- Creating a new preset uses GPT-6 Luna (model ID: gpt-6-luna) through the native ChatGPT SIWC bridge.
- GPT-6 Luna is the only Chief, does its own musical/reference research, owns the Tone Researcher responsibility, evaluates evidence and uncertainty, directs specialist work, synthesizes the final result and remains the final decision-maker.
- Tone Researcher is not an external specialist role and must not appear in the specialist tool schema.
- All ChatGPT selection logic is task-specific: GPT-5.6 Luna for discussion; GPT-6 Luna for preset creation, preset correction and local tone refinement. A saved manual model selection cannot silently override this routing.
- NAM/TONE3000 search-term derivation invoked as part of preset creation is also treated as a preset task and uses GPT-6 Luna, not the GPT-5.6 discussion model.

### 3. Mandatory specialist consultation
- Every new preset requires at least two successful, distinct technical specialist roles from at least two different external provider identities before GPT-6 Luna may return a final Tone Plan.
- Specialists run sequentially, never in parallel. GPT-6 Luna issues one role request, waits for the provider result, evaluates it, and only then issues the next role.
- Default specialist roles for an artist/amp-led request are Amp & Cabinet Specialist first and Effects Specialist second. Guitar & Input Specialist, Tone Calibration Specialist and Tone Critic remain conditional on the actual request and quality risks.
- Gemini is the first provider priority. If the current role task fails, fallback is sequential: Groq, OpenRouter, then Cloudflare Workers AI. A failed provider is never reported as a successful specialist.
- After a specialist succeeds, the provider cursor advances so the next specialist starts with the next provider in the chain. A provider that already succeeded for this preset is not reused for the second required specialist.
- If the app cannot obtain two successful specialist roles from two different providers, it stops without producing or applying a Tone Plan. It must not fabricate research or specialist results.
- Local same-tone delta refinements may remain Luna-only to avoid unnecessary token usage; they still use GPT-6 Luna, exact catalogue validation and the existing safe delta-patch rules.

### 4. Activity UI
- Discussion uses a normal chat typing bubble.
- Preset creation uses Mission Control inside the conversation: GPT-6 Luna Chief/research/synthesis plus visible Gemini, Groq, OpenRouter and Cloudflare Workers AI status tiles.
- Provider tiles reflect actual runtime state (standby, ready, working, fallback, completed or unavailable). Specialist activity is visibly sequential.
- The Mission Control card remains visible on errors and shows that the operation stopped; no fake progress percentage or timer is used.
- The existing editor apply path runs only after the exact original MG-30 Gen 2 catalogue validator accepts the Tone Plan.

### 5. Protected boundaries
- The implementation changes app-side AI routing/orchestration, the composer/AI activity UI, regression tests and this documentation only.
- No Cloudflare Worker endpoint, request route, authentication secret, provider key or Worker deployment is changed by this implementation.
- Original NUX MG-30 Gen 2 firmware 6.0.x remains the target, not MG-30 MKII.
- NAM, TONE3000 OAuth/model transfer, NAM Slot 10, IR User/Third Party and IR Collection mappings, preset codec, MIDI mappings, USB-MIDI and native USB Audio code remain out of scope and must be preserved.
- Physical Android and pedal acceptance tests are still required after installing the new APK. CI success alone does not prove hardware behavior.


### Implementation alignment follow-up — 2026-11-18
- Removed the obsolete ChatGPT-as-specialist helper path; external specialist execution uses only the configured Gemini/Groq/OpenRouter/Workers AI provider pipeline.
- Updated the remaining reusable Tone Architect instructions and token-usage labels so GPT-6 Luna is the preset Chief/researcher, with no legacy Lead AI / Preset Composer handoff wording.
- Made specialist eligibility metadata consistent with the mandatory two-expert policy for every new preset. A local delta refinement can still bypass external specialists.
- Mission Control's required-expert count now reflects actual create-vs-local-refinement behavior.
- This follow-up does not add, alter or deploy any Cloudflare Worker endpoint, credential, authentication or route.


---

## Recovery of missing AI helpers and successful Android build — 2026-11-18

Status: **Implementation and CI validation passed on the isolated feature branch. Debug APK artifact verified. Physical Android and original MG-30 hardware acceptance remain pending.**

### Source recovery
- The prior alignment commit had removed the exported ChatGPT specialist orchestrator and reusable AI/NAM helper functions from `www/ai-tone-studio.js`, while live code and regression tests still referenced them.
- Restored `orchestrateChatGptTonePlan` with its sequential one-specialist-per-turn handling, maximum six task budget, mandatory successful-role quorum, distinct-provider quorum, failed-handoff handling, usage accounting and lifecycle events.
- Restored the deleted shared parsing/provider utilities, compact MG-30 context, artist-tone guidance, model selection helper, token budgets, NAM candidate sanitizers and metadata helpers. The obsolete ChatGPT-as-specialist request path was not restored.
- Restored the intent payload in `toneLeadInstruction()` so GPT-6 Luna receives the compact musical intent (for example style and playing feel), rather than losing it before preset synthesis.
- The task router remains locked: ordinary discussion selects `gpt-5.6-luna`; preset creation selects `gpt-6-luna`. Luna performs initial musical/reference research itself and owns final synthesis.
- New presets require at least two distinct specialist roles successfully completed by at least two different configured provider identities. Specialist generation calls run sequentially. Gemini is first; fallback for the same role task is Groq, OpenRouter, then Cloudflare Workers AI. The subsequent successful role uses a provider identity not already successful.
- Local delta refinements retain the lightweight path and may skip external specialists. No endpoint, Worker source, auth secret, key, or deployment was changed.

### Validation
- Final source/test commit: `ae3bc8b22ee11e0a9fb45968cd5f2098428b5c50`.
- GitHub Actions run #1069: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44292470903 — **success**.
- JavaScript syntax validation: passed.
- Protocol regression tests: **659 passed, 0 failed**.
- Capacitor Android project generation and USB Audio plugin installation: passed.
- Gradle `assembleDebug`: `BUILD SUCCESSFUL` (1m 33s).
- Artifact: `MG30-Studio-debug-APK`, artifact ID `14421123769`; ZIP size 4,377,213 bytes.
- Extracted APK: `app-debug.apk`, 4,754,216 bytes.
- APK archive integrity: `unzip -t` passed; host identifies it as an Android package with APK Signing Block.
- APK SHA-256: `a86f0ce18d49238426e2c72923f8c8e457a511ff20e69a42991e830b3efdbd61`.
- The APK is a debug build, not a signed release package.

### Protected boundaries
- Diff relative to the pre-recovery six-agent branch base is limited to:
  - `www/ai-tone-studio.js`
  - `tests/ai-tone-studio.test.js`
  - this architecture decision record
- No changes to NAM/TONE3000 transfer paths, NAM Slot 10 mapping, IR User/Third Party/Collection import and storage mapping, MIDI CC/parameter mapping, preset/scene codec, USB-MIDI transfer or native USB Audio code.
- Target remains original NUX MG-30 Gen 2 firmware 6.0.x, not MG-30 MKII.
- CI does not prove real provider credentials, actual specialist quotas, native SIWC models available in the signed-in account, or physical pedal behavior. Those still require testing on the Android device and original MG-30.



---

## AI Tone Assistant UI polish — 2026-11-18

Work is isolated on branch `feature/ai-tone-ui-bubble-mission-cloud`, based on `feature/tone-architect-six-agent-sequential`.

### Requested UI changes
- Add an immediate in-chat activity bubble after every submitted message, so the user sees the assistant working even during the initial preflight/network phase. Discussion uses the three-dot GPT-5.6 Luna typing bubble; preset requests show Mission Control immediately.
- Replace the generic green orb in the Mission Control chief card with original inline SVG instrument artwork chosen from the current specialist role: amplifier/cabinet, effects pedal, guitar/input, calibration meter, Tone Critic review board, or Tone Architect signal flow.
- Animate relevant SVG details while the AI is working (speaker cone, pedal LEDs/knobs, guitar strings, meter bars, review lens or signal flow). Respect `prefers-reduced-motion`; standby/completed/fallback states remain visually distinguishable.
- Remove the redundant DISKUSI / CREATE PRESET / SPECIALIST routing strip from AI Settings. Provider configuration, diagnostics, automatic fallback, usage monitor and actual routing behavior remain intact.
- Translate the Cloud Account card, status, login, logout, session-expiry and local-feature notice into English. The Cloud auth flow and endpoint are unchanged.

### Scope and protected boundaries
- App UI files: `www/ai-tone-studio.js`, `www/cloud-account.js`.
- UI regression tests: `tests/ai-tone-studio.test.js`.
- The APK build workflow is configured to run for this isolated UI branch.
- No Cloudflare Worker code, URL, endpoint, credentials, account tokens, AI orchestration/provider order, Tone Plan validator, NAM functionality, TONE3000 transfer, IR User/Third Party/Collection mapping, MIDI mapping, preset codec, USB-MIDI or native USB Audio code is intentionally changed.
- Hardware acceptance on Android and the original MG-30 Gen 2 remains required after CI verification.

### Validation
- Five targeted UI regression tests were added for role-to-art mapping, safe artwork values, immediate activity visibility, Settings routing-strip removal and English Cloud UI copy.
- CI/build results are pending at the time of this note. Do not distribute an APK unless the complete regression suite and Android build pass and the resulting artifact is verified.


### Final automated validation — 2026-11-18

Status: **GitHub Actions build and automated validation passed. Debug APK artifact downloaded and integrity checked. Physical device / original MG-30 acceptance is not claimed.**

- Validated source/test commit: `6af03d6f7dc1dde05b6c6f9544fc69d707f536f8` on `feature/ai-tone-ui-bubble-mission-cloud`.
- GitHub Actions run #1078: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44303918183 — **success**.
- JavaScript syntax validation: passed.
- Full project protocol/regression tests: **664 passed, 0 failed**.
- Capacitor Android project generation and USB Audio plugin installation: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL** in 1m 17s.
- Workflow artifact: `MG30-Studio-debug-APK`, artifact ID `14426334647`, ZIP size 4,379,068 bytes.
- ZIP SHA-256: `94de320f6c551c5240dba8acb73a8ef018dc4d1cbb63f4122f0e01f39ec47c31`.
- Extracted `app-debug.apk`: 4,756,832 bytes; identified by the host as an Android package with APK Signing Block.
- APK ZIP integrity: `unzip -t` passed with no errors.
- APK SHA-256: `9a8b052d4e529f5eda3b132164311b4e863d16abc4a557b31684e28054a57a3f`.
- This is a **debug APK**, not a signed release package.
- Compared with base `feature/tone-architect-six-agent-sequential`, the isolated branch changes only `.github/workflows/build-apk.yml`, this documentation file, `tests/ai-tone-studio.test.js`, `tests/chatgpt-si-wc-ui-preservation.test.js`, `www/ai-tone-studio.js` and `www/cloud-account.js`. No NAM/IR/MIDI/protocol/codec/native USB files are included in the diff.
- User-facing acceptance still requires installing this APK on the user's Android phone and checking the screen layout/animations there. Original MG-30 Gen 2 hardware behavior must also be tested after install; CI does not emulate the phone, signed-in SIWC session or physical pedal.


---

## User-reported Android acceptance feedback — animation and specialist error — 2026-11-18

The user installed/tested the UI-polish APK and supplied a screenshot. **No code changes are authorized yet.** This entry records the requested follow-up only.

### 1. Mission Control artwork animation correction
- Artwork selection and card visuals are accepted as good.
- Current motion is rejected because individual parts appear to float independently: pedal knobs move detached from the pedal body, and the amplifier speaker appears to float independently from the amp cabinet.
- Desired motion: animate the **complete illustrated object as one coherent assembly**, not isolated knobs/speaker. Possible restrained motion: gentle whole-pedal rocking/tilting or slight body sway; similarly animate the complete amplifier/cabinet as a single grounded object. Internal components must remain visually attached and maintain their geometry/relative positions.
- Apply the same principle to other instrument illustrations where appropriate: whole object/group motion rather than detached component motion. Keep motion polished and subtle, not chaotic spinning unless specifically designed for that object.
- Preserve the current accepted artwork/card layout. Respect reduced-motion accessibility.
- Do not start implementation until the user explicitly authorizes changes.

### 2. Specialist failure shown in the same screenshot
The request was: `Buat preset blues ala srv menggunakan nam profil`.
Visible assistant failure:
- Effects specialist failed across all configured provider fallbacks.
- UI says no Tone Plan was generated and no pedal changes were sent.
- OpenRouter reported: `Provider did not return a JSON Tone Plan. [502 /api/v1/ai/tone-plan]`.
- Cloudflare Workers AI reported all configured models failed; visible model detail: `@cf/google/gemma-4-26b-a4b-it: Expected ',' or '}' after property value in JSON at positi...` (message is truncated in the screenshot).
- Mission Control indicates 1/2 successful specialists: Gemini fallback for effects failed; Groq completed amp cabinet specialist; OpenRouter and Cloudflare failed effects specialist.
- The app correctly stopped rather than generating/applying a Tone Plan with only one successful role. Preserve this fail-closed quorum behavior.

### 3. Required investigation when authorized
- Trace why the effects-specialist task produces a non-JSON response / HTTP 502 at `POST /api/v1/ai/tone-plan` for OpenRouter and malformed JSON from Cloudflare's selected model.
- Inspect provider response extraction, structured-output/JSON parsing, prompt/output token budget, model compatibility and fallback error classification. Distinguish provider transport failure from invalid model output.
- Do not weaken the two-distinct-role/two-distinct-provider quorum, fabricate specialist success, silently accept malformed output, or allow a partial Tone Plan to reach the device.
- Keep the already successful Gemini/Groq routing behavior, GPT-6 Luna chief synthesis and all existing working NAM, IR User/Third Party/Collection, MIDI, preset codec, USB-MIDI and USB Audio paths unchanged.
- Add targeted regression tests for OpenRouter 502/non-JSON response and Cloudflare malformed JSON, alongside full suite/build validation after approval.

**Status:** recorded only. No source code, Worker endpoint, provider configuration, APK, branch behavior or hardware mapping was changed in response to this feedback.


### Mission Control redesign direction selected by user — 2026-11-18

The user reviewed two alternative mockups and selected **Alternative B — Studio Console** as the preferred design direction. This is design approval only, not authorization to implement code yet.

Design direction:
- Amplifier illustration is the main visual anchor.
- Animate the complete amplifier as one coherent object; speaker and controls must remain attached and must not float independently.
- Place GPT-6 Luna / Chief identity and task progress directly below the hero illustration.
- Show specialist roles as compact horizontal rows rather than multiple large provider tiles.
- Keep provider diagnostics and verbose errors collapsed behind an expandable detail area.
- Preserve the existing dark green / lime visual language and leave adequate room for chat content.
- Preserve truthful sequential provider state, fallback details, and the two-successful-distinct-role/provider quorum. Do not hide or weaken failure states.
- Retain reduced-motion accessibility.

The previously recorded issue with effects-specialist provider failures remains open and separate from the visual redesign. No source code or APK was changed by this design selection.


### AI typing indicator visual direction — 2026-11-18

The user requested replacing the conventional chat typing bubble / three-dot indicator with a **waveform-style animation** to reinforce the music identity of NUX MG-30 Studio.

Design direction to retain for the next authorized UI implementation:
- Replace the generic typing dots/bubble with a compact animated waveform / equalizer motif in the assistant's in-progress chat state.
- Use the app's existing dark green and lime palette; waveform bars should animate with a smooth, restrained rhythm (varying heights / sequential pulse), not a loading spinner or bouncing detached objects.
- Label it clearly as the assistant composing/responding (e.g. "AI sedang menyusun respons" or localized equivalent) so users can distinguish active response generation from a stalled request.
- This is a UI activity indicator, not a claim that actual audio is being played or measured.
- Respect reduced-motion settings: provide a static waveform or gentle non-animated state.
- Keep Mission Control's separate whole-object illustration animation requirements intact; this waveform is specifically for the chat typing indicator.

This request complements the user-selected **Alternative B — Studio Console** Mission Control direction. Design note only; no source code, APK, provider logic, NAM, IR, MIDI or hardware behavior changed.

---

## Mission Control / waveform UI implementation and specialist-output recovery — 2026-11-18

User authorized implementation after selecting Studio Console mockup Alternative B and requesting a waveform typing indicator.

### Implemented UI
- Replaced the three-dot GPT-5.6 typing indicator with a compact animated waveform labelled COMPOSING.
- Redesigned GPT-6 Mission Control around the amplifier hero illustration, concise task context, specialist progress, compact role rows and expandable Provider diagnostics.
- Removed the old large provider-tile presentation and obsolete CREATE PRESET activity label from the active mission view.
- Specialist rows show role, provider actually running/completing it, and truthful queued/working/completed/retrying/failed states.
- Verbose provider details and execution errors remain available in collapsed diagnostics; failures remain visible and are not converted to success.
- Artwork is grouped as one SVG object assembly. Whole pedal / amp / guitar / meter / critic / chief groups receive restrained whole-object movement; internal details do not animate independently. Reduced-motion CSS disables animation.
- Tone Researcher remains Luna's own research responsibility and is not exposed as an external specialist role in Mission Control.

### Specialist provider-output fixes
- Bumped both Worker source copies to version 1.2.1 and kept cloud-worker/worker.js and cloud-worker/src/index.js synchronized.
- Cloudflare Workers AI requests now use JSON-object response mode and max-completion-token option; response extraction accepts structured object payloads as well as textual responses.
- Existing Cloudflare model fallback can continue after malformed JSON rather than treating a returned object as a string.
- OpenRouter retry classification now includes transient retryable upstream failures such as HTTP 502, in addition to malformed/non-JSON responses.
- Increased Effects specialist output budget from 360 to 640 tokens to reduce truncation risk for catalogue-grounded structured output.
- Failure chat response is concise; detailed error is retained in Mission Control diagnostics.
- Fail-closed two-successful-role/two-distinct-provider quorum is unchanged. No Tone Plan is fabricated or applied when quorum is not reached.

### Regression tests and CI
- Added coverage for Cloudflare structured object JSON Mode response.
- Added coverage for malformed Gemma JSON followed by configured model fallback.
- Added coverage for OpenRouter transient HTTP 502 retry.
- Updated UI preservation assertions for waveform and compact Mission Control.
- Added tests asserting whole SVG object group animation and Effects specialist token budget.
- Workflow now includes this feature branch.
- GitHub Actions run #1082, run ID 44314742452, commit d8f5c106343ddf5bd3dee19598fb2220451cf43c: SUCCESS.
- JavaScript/test suite: 669 passed, 0 failed.
- Android Gradle assembleDebug: BUILD SUCCESSFUL.
- Artifact MG30-Studio-debug-APK, artifact ID 14432445808, ZIP size 4,382,487 bytes; SHA-256 a4ec2de89c5fdca99fddea5da53a24f1f3fba9a2226f3da194d14a1967173ce9.
- CI artifact URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/44314742452/artifacts/14432445808
- Build is a debug APK, not a signed release.

### Scope protection / remaining acceptance
- No NAM/TONE3000 transfer or slot mapping, IR User/Third Party/Collection transfer/storage mapping, MIDI mapping, preset/scene codec, USB-MIDI or native USB Audio source was changed.
- Target remains original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.
- Physical Android UI/animation acceptance and real provider credential/model behavior still need user-side verification. Successful CI validates code/tests/build, not a physical MG-30 session or production provider quota/availability.


---

## Implementation — Worker-led NAM search, Luna selection, and complete preset state (2026-11-18)

Work branch: \`feature/ai-efficiency-worker-nam-complete-tone-state\`.

### Changes implemented in source

- Cloudflare Worker version bumped from 1.2.1 to 1.2.2 in both synchronized source copies: \`cloud-worker/src/index.js\` and \`cloud-worker/worker.js\`.
- Added authenticated \`POST /api/v1/tone3000/ai-search\`. It requires both the app account JWT and the user's TONE3000 OAuth bearer token. Search phrase expansion, A2 NAM search filters, candidate normalization, fallback query, and search metadata now run in the Worker.
- Android client \`searchTone3000ForAI\` now calls that Worker endpoint. Existing profile-detail/model-list proxy, authenticated model download, A2-Lite validation, slot-10 import and transfer routines were intentionally left unchanged.
- GPT-6 Luna now performs TONE3000 profile and downloadable A2-Lite capture selection from Worker-returned candidates. If Luna cannot select, the existing manual result/capture selection remains available.
- GPT Tone Plan search terms are reused. The extra AI query-derivation request is now only attempted when the Tone Plan did not provide usable \`search_terms\`.
- Recent conversation included in Tone Plan requests is capped at a compact 1,200-character relevant tail; ordinary GPT-5.6 tone discussion is capped at 1,000 characters. The catalogue and live device snapshot are retained.
- Tone Plans mark new preset creation with \`completePresetState=true\`; local refinements leave it false.
- Before planning on a connected device, the bridge refreshes the active preset buffer via the existing readback path.
- Before applying, the AI transaction takes a fresh active-buffer read while holding the device-operation lock. New presets expand to all nine AI-managed blocks (WAH, CMP, EFX, AMP, EQ, GATE, MOD, DLY, RVB). Omitted blocks retain their exact current model and are assigned OFF. Selected blocks default ON unless explicitly disabled. IR, Send/Return, Volume, scene/preset storage, and chain order remain outside this AI block plan.
- Local refinement remains delta-only: unlisted blocks and parameters are preserved.
- No-op blocks are accepted and reported as unchanged rather than treated as errors.
- After MIDI writes, the existing 0C/00 active-scene readback parser reloads device state and compares target model, ON/OFF state, and requested parameter values. A mismatch fails the apply operation and attempts rollback for changed blocks. Success returns per-block statuses (applied, disabled, unchanged) and \`verified=true\`.
- UI reply reports readback verification and per-block ON/OFF status.

### Protection boundaries

- No MIDI CC values, block switch mappings, parameter mappings, preset codec, NAM transfer protocol, NAM slot-10 destination, IR User/Third Party/Collection pathways, USB-MIDI transfer protocol or native USB Audio paths were changed.
- NAM A2-Lite download, payload extraction/validation and transfer remain on the previously validated client/native path. Worker is responsible for catalogue searching and data retrieval, not the physical transfer.
- The Worker source is updated in the repository only. No production Cloudflare Worker deployment was performed in this implementation step.

### Validation still required

- CI JavaScript tests, syntax checks, Android debug build and artifact verification must complete.
- Live TONE3000 search must be checked against the deployed Worker after deployment and valid Cloud Account + TONE3000 OAuth authentication.
- Physical pedal checks remain necessary for: block OFF CC application, parameter readback match/quantization, failed-write rollback, NAM slot-10 preservation, and existing IR/MIDI workflows.
- Readback verification applies to the currently active edit buffer/scene using the existing 0C/00 flow. It does not claim that all three scenes were rewritten or independently verified.


---

## Validation run for 2026-11-18 implementation

- Added Worker contract tests for authenticated TONE3000 AI search, A2/gear filter forwarding, query expansion, result normalization, and rejection when the per-user OAuth header is absent (even when a Worker service key exists).
- Added tests for new-preset complete-state versus partial refinement, expansion of omitted managed blocks to OFF, and mandatory active-buffer readback.
- Added the new work branch to the Android CI push filter.
- CI run #1086 (`44332435860`) on commit `15f2408a9c4daf9440ccc81fe43cd07873f17ae4`: **success**. JavaScript syntax validation passed; 673/673 tests passed; Capacitor Android initialization passed; Gradle `assembleDebug` succeeded; debug APK artifact uploaded (artifact ID `14439114283`, archive size 4,383,611 bytes, SHA-256 digest `d127a1781d38b742ab60abb5fbc5558a7cf3588f1a567af10a38afa3351d1975`).
- Hardware and live deployed Worker outcome: not tested; no Worker deployment was issued.


---

## Implementation — NAM query-only Workers AI routing (2026-11-19)

Work branch: `feature/worker-ai-nam-query-routing`, based on `feature/worker-v1.2.4-ai-search`.

### Scope and provider ownership

- The existing two-mode Luna architecture is retained: ordinary discussion uses GPT-5.6 Luna; preset creation/refinement remains GPT-6 Luna Chief and final decision-maker.
- Only the compact TONE3000 NAM catalog query-generation task is moved to Cloudflare Workers AI.
- Both direct NAM search and preset creation while NAM mode is active use the existing `POST /api/v1/ai/light-task` task `tone3000-search-terms`, with a maximum output budget of 180 tokens.
- The app explicitly pins this query task to provider `cloudflare`; it no longer passes through `askNamAIJson` and cannot fall back to GPT-6 for query generation.
- If Workers AI is unavailable or returns an unusable query, the app uses the existing deterministic local `fallbackNamSearchTerms()` helper. It does not send the query task to GPT as a fallback.
- For a NAM-enabled preset, GPT-6 is instructed not to spend output tokens generating `search_terms`. The app ignores any `search_terms` field returned by GPT-6 or its catalog-correction response and obtains the query from Workers AI after the Tone Plan has been validated.

### Luna authority deliberately unchanged

- GPT-6 Luna remains responsible for selecting/recommending the best returned TONE3000 profile through `chooseNamTone()`.
- GPT-6 Luna remains responsible for selecting/recommending the downloadable A2-Lite capture through `chooseNamModel()`.
- Both selection functions continue to use `askLunaNamJson()`; Workers AI does not rank, approve, or decide which profile/capture is recommended.
- GPT-6 Luna remains responsible for the full Tone Plan, research, sequential specialist orchestration, final synthesis, technical validation, and user-facing report.
- The required specialist quorum and provider order are unchanged.

### Protected integrations

- Reuses the already-existing Worker lightweight task route and `tone3000-search-terms` task. No Worker source, task contract, model configuration, secret, URL, or deployment was changed in this implementation.
- TONE3000 `ai-search` request, OAuth handling, `format=nam` / `architecture=2` filtering, Amp / Amp + Cab gear mapping, profile/model loading, model download, and candidate normalization are unchanged.
- Existing A2-Lite file validation (1,871 weights), NAM Library persistence, slot-10 confirmation and transfer are unchanged.
- No IR User/Third Party/Collection behavior, MIDI/CC mapping, preset codec, USB-MIDI, or USB Audio path was changed.

### Automated validation

- Regression assertions were updated to require Workers AI routing for NAM query generation and GPT-6 Luna selection for both profile and capture recommendations.
- The build workflow now includes this feature branch.
- CI, full regression tests, and Android debug build: pending at the time of this note.
- No APK delivery or hardware acceptance is claimed until CI/build and the user's live NAM workflow have been checked.


### Validation result — 2026-11-19

- GitHub Actions run #1101, run ID `44358568489`, commit `11ba519b24093a7de9f1faba696f591ee3ce124d`: **failed at the full regression-test step**.
- JavaScript syntax validation passed.
- Test result: **665 passed, 9 failed** (674 total).
- The new NAM-specific tests passed, including:
  - app query helper pins the NAM query task to Cloudflare Workers AI;
  - profile and A2-Lite capture selection remain assigned to GPT-6 Luna;
  - NAM preset creation derives a separate query instead of reusing GPT `search_terms`;
  - Worker `tone3000-search-terms` accepts the authenticated light-task request and enforces the 180-token ceiling.
- All nine failures are in unchanged Worker/version/search tests, not in the changed NAM-routing tests:
  - two assertions expect Worker `1.2.2` while the unchanged deployment entry `cloud-worker/worker.js` reports `1.2.4`;
  - five assertions expect the older `tone-specialist` / provider behavior directly from `/api/v1/ai/light-task`, while the unchanged 1.2.4 entrypoint exposes the dedicated Workers AI task list and the app's existing compatibility path for specialist calls;
  - one OpenRouter test expects retry on upstream HTTP 502, which the unchanged 1.2.4 entrypoint does not implement;
  - one TONE3000 search test expects an older inline filter expression rather than the unchanged entrypoint's equivalent `URLSearchParams` construction.
- Comparison against the source branch confirms the failing Worker and test files were not changed by this task; no Worker code was modified to mask these failures.
- Because `npm test` failed, CI skipped Capacitor Android generation and Gradle `assembleDebug`. **No APK is claimed or delivered.**
- The exact user-deployed Worker version has not been queried; no redeployment was performed.

**Status:** app-side NAM query routing is implemented and its focused tests pass; full regression/build acceptance remains blocked by the pre-existing Worker/test contract mismatch described above.


### Final validation and APK result — 2026-11-19

- GitHub Actions workflow run **#1106**, run ID `44361079866`, commit `54abcbb0a0b62f509d97f5d8e3d11277dd95cf8c`: **success**.
- JavaScript syntax validation: passed.
- Protocol regression suite: **674 passed, 0 failed**.
- Capacitor Android project generation and USB Audio plugin initialization: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL** (1m 25s).
- APK artifact upload: passed.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `14456615183`.
- APK extracted from the run artifact: `app-debug.apk`, 4,762,008 bytes.
- Extracted APK SHA-256: `af573a612056c4bedc93e24987e83cd0086472e99fb6f66df9296733ebaa5108`.
- Artifact ZIP SHA-256: `edba1613094d999d19f1f50cb2e943f0d4400e8cfa8f0f6e4f1579999e6ffe8b`.
- ZIP integrity check and APK archive integrity check: passed.
- The Worker source and Cloudflare deployment were not changed in this implementation; the build packages the updated Android client.
- Physical MG-30 live NAM search/import and hardware validation remain separate acceptance checks; CI/build success does not claim those hardware checks were performed.


---

## Tone context and proposal-first refinement checkpoint — 2026-11-19

The follow-up implementation addresses two live MG-30 regressions: review questions being misclassified as preset actions, and hardware readback mismatch for discrete selector parameters such as `DLY.subd`.

- Review questions now stay in GPT-5.6 discussion and include the current editor snapshot plus complete live catalogue; they cannot invoke specialists, create a Tone Plan, or write MIDI.
- "Coba perbaiki" and other imperative refinements use GPT-6 Luna to produce a validated delta-only proposal from the current active preset. The user sees the recommendation first; explicit `SETUJU` / `TERAPKAN PERUBAHAN` is required before MIDI. A stale proposal is rejected if either the device snapshot or catalogue changes before approval.
- New preset and specialist prompts now use exact device model/parameter whitelists. Amp & Cabinet and Effects specialists receive all available models and their exact writable parameter keys/discrete choices; the prior 24-model truncation is removed.
- `aiPreparePlan` quantizes normalized discrete selectors with `quantizeParameterValue` before preparing the MIDI write and readback target. No CC mapping changes.
- NAM-OFF recovery remains based on Gemini primary → Groq → OpenRouter → Cloudflare fallback. NAM query routing, Luna NAM profile/capture choices, slot-10 import, IR, MIDI, USB-MIDI and USB Audio remain protected.

Detailed implementation contract, regression cases, and hardware acceptance checklist: `docs/research/TONE_CONTEXT_HARDWARE_WHITELIST_AND_PROPOSAL_FIRST_2026-11-19.md`.

CI status and APK details are recorded in that research note after successful build artifact verification. Physical MG-30 hardware acceptance remains separate from CI.
