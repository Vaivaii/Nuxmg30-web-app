# Multi-AI Free-First Tone Architect — Implementation Record
Date: 2026-11-15
Target: Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)
Working branch: `feature/multi-ai-free-tone-architect`
Base branch: `feature/ai-live-tone-studio`
Base commit: `351db6a96bb277c675b8ef60d69184a536814eb8`

## User authorization and non-negotiable boundaries

The user explicitly authorized the Multi-AI implementation on a separate branch with the instruction not to change any already-working functionality, especially the deployed cloud backend.

This work is restricted to AI orchestration and its regression tests:
- Do not modify or deploy `cloud-worker/src/index.js`, `cloud-worker/worker.js`, Worker configuration, secrets, routes or backend provider adapters.
- Do not modify `www/cloud-api.js`; retain the existing authenticated `POST /api/v1/ai/tone-plan` and existing model/status endpoints.
- Do not modify `www/index.html` or the frozen `window.MG30AIToneBridge` device bridge.
- Do not change MIDI CC/parameter mappings, dispatcher sequencing, NAM import/slot-10 behavior, IR User/Third Party/Collection mapping, preset serialization, device protocol or firmware handling.
- Never silently route automatic traffic to a paid GPT model. GPT may only be invoked after the user explicitly selects GPT in the provider dropdown.

The existing live behavior remains authoritative:
`user request → Tone Plan → validateAiTonePlan → MG30AIToneBridge.applyPlan(plan) → existing MIDI parameter path`.
Validated changes continue to update the editor and pedal directly. There is no additional manual Apply/Send gate for live AI editing. The existing Save-to-Device control is still the way to store the resulting preset.

## Implemented orchestration roles

### Tone Architect — mandatory musical role

Tone Architect interprets the musical brief before gear selection: reference/artist, style, feel, dynamics, gain character, tonal balance, ambience, focus and avoid-list. It does not invent MG-30 catalogue IDs, MIDI commands or device operations.

- With at least two available free providers and a new/broad musical target, Tone Architect receives a short dedicated request and returns compact `tone_intent` JSON.
- Its result is normalized to a small session object: reference, style, feel, dynamics, gain character, tonal balance, ambience, avoid-list, focus, summary and confidence.
- A local refinement reuses the last Tone Architect context rather than calling a second provider again.
- If only one free provider is configured, musical analysis and preset synthesis are combined into one request; the Tone Architect role is still explicitly mandatory in the prompt.
- When a single provider is manually selected (including GPT), Tone Architect remains mandatory but is combined with the Lead AI task in one call.

### Lead AI / Preset Composer

Lead AI receives the Tone Architect intent, current compact catalogue and compact editor snapshot. It combines Gear Specialist and Parameter Engineer duties into one structured proposal:
- select only compatible amp/effect models from the verified MG-30 catalogue;
- set only parameters that need to change;
- preserve unaffected blocks;
- return one coherent Tone Plan with optional confidence/review metadata.

Agents never write MIDI directly. The existing application validator remains authoritative. The existing `validateAiTonePlan` rules remain intact.

### Critical Reviewer — conditional

Reviewer is not called for routine changes. It is considered only when the Lead output:
- explicitly sets `review_required`;
- reports conflicts or uncertainties;
- returns confidence below 0.62; or
- changes four or more blocks (materially coupled preset update).

A reviewed plan must pass the same validator. If the review provider is unavailable or its proposal is invalid, the already validated Lead plan is retained. Reviewer failure does not block a valid plan from reaching the unchanged live dispatcher.

## Free-first provider and token policy

Automatic and Multi-AI modes use only the free Gemini, Groq and OpenRouter provider set. GPT is excluded from automatic provider discovery, model selection and fallback. GPT remains available through an explicit manual selection.

Model discovery uses the existing Worker model-catalogue API. The prior automatic model-selection path sent short generation requests to several candidate models as probes; this was removed. Model choice now uses the already-fetched model catalogue, a saved valid choice/default, and a short in-memory model cache. No generation tokens are used just to rank/test candidate models.

Expected normal request budget:
- Broad/new tone, 2+ free providers available: one Tone Architect call + one Lead AI call.
- Local refinement with session intent: one Lead AI call.
- Only one free provider available: one combined Tone Architect + Lead/Gear/Parameter call.
- Critical Reviewer: one additional call only when triggered by the conditions above.
- Catalog correction: at most one additional correction call after the initial plan fails local validation.

Free-provider calls are sequential rather than launching every model concurrently. This intentionally bounds duplicate prompt context, API use and conflicting proposals in the first implementation. Provider failures may use bounded sequential fallback to another available free provider only for transient errors and only while the existing automatic-fallback setting is enabled. NAM search/model-selection helper tasks also use the free-first path and do not launch a full Multi-AI round.

Provider order currently prefers Gemini, then Groq, then OpenRouter when all are available; roles are assigned from the providers actually configured/available for the current session rather than permanently tying a role to one vendor. Free-tier availability and account quotas remain provider-controlled and dynamic; no exact quota guarantee is implied.

## Session and prompt efficiency

- Tone Architect context is held in the current AI assistant panel session.
- Tone intent is normalized and capped field-by-field; avoid-list is capped at four entries.
- Model discovery results are cached briefly; no candidate generation probes are executed.
- Follow-up instructions classified as local changes reuse the existing intent and ask Lead AI only for the affected tone changes.
- A new style, artist, genre, reference, or new preset request refreshes the Tone Architect analysis.
- Only changed blocks are returned to the existing validator and dispatcher. The validator still rejects unknown blocks/models/parameters, invalid ranges and incomplete model changes.

This first implementation deliberately prioritizes token/cost safety and deterministic serialized application over parallel multi-agent calls. It does not claim that all providers participated when fewer providers are configured or available.

## Existing functionality preserved by design

- `www/cloud-api.js` and the deployed Worker API remain unchanged; no Worker deployment was performed.
- `MG30AIToneBridge.applyPlan()`, the MIDI parameter path and editor/pedal synchronization remain unchanged.
- No changes to `www/index.html`, device-side MIDI mappings or CC values.
- No changes to NAM capture validation, slot 10 import, overwrite handling or Library persistence.
- No changes to IR User/Third Party/Collection capture/import mapping.
- No changes to preset codec, save-to-device behavior or original Gen-2 firmware protocol.
- No MKII targeting or assumptions introduced.

## Files changed on this branch

- `www/ai-tone-studio.js`: orchestration roles, compact Tone Architect intent/session reuse, reviewer conditions, free-first routing and removal of generation-token model probes.
- `tests/ai-tone-studio.test.js`: regression coverage for provider routing, token-probe removal, Tone Architect context, conditional review, direct live apply path and unchanged Worker API path.
- `.github/workflows/build-apk.yml`: added this feature branch to the existing Android CI branch filter so the same test/build workflow can validate the isolated branch.
- `docs/MULTI_AI_REALTIME_TONE_STUDIO_ARCHITECTURE_DECISION_2026-11-15.md`: corrected the live-edit approval boundary and points to this implementation record.

## Validation status

GitHub Actions workflow: Build MG30 Studio Android APK, run #834, run ID `43622323162`, triggered by commit `77d43373796acce31fce40591ed46588faed488c`.
Final status: **success**. All workflow steps completed successfully: JavaScript syntax checks, `npm test`, Capacitor Android generation, Gradle `assembleDebug`, and APK artifact upload. Artifact `MG30-Studio-debug-APK`, ID `14124199070`, ZIP size 4,316,301 bytes, SHA-256 `74d12fe90b51a34eb7a61358792e8a5df18a57a7ff1be3fec54e34e559380587`. This confirms automated CI/build only; it does not replace physical-device verification.

Not yet verified by this record:
- real provider live calls under the user's Gemini/Groq/OpenRouter quotas;
- Android physical-device behavior;
- actual original MG-30 Gen 2 firmware 6.0.x audition and readback;
- audio quality, which remains subjective and requires listening/user feedback.

## Follow-up safety checks

Before merging this branch into `feature/ai-live-tone-studio`:
1. Require CI #834 to pass, including the unchanged MIDI/NAM/IR regression suite.
2. Review the diff to confirm no Worker, Cloud API helper, device bridge, NAM, IR, preset codec or MIDI mapping changes.
3. Test the Auto free-only mode and manual GPT selection separately; confirm Auto never invokes GPT.
4. Test a new tone followed by a local parameter refinement; verify Tone Architect is called for the first and its context reused for the second.
5. Perform a controlled live audition on the original MG-30 Gen 2 firmware 6.0.x.

Do not merge to the base branch or deploy the backend as part of this implementation record.


## AI Token Efficiency and Compact Header Update — 2026-11-16

**Scope:** Original NUX MG-30 Gen 2 firmware 6.0.x. This change improves AI call routing, prompt payload size, output budgets and header controls. It does not change the device codec, MIDI mapping or pedal transfer protocol.

### Architecture
- The in-session AI dialogue memory is now a four-message sliding window. Each stored user/assistant turn is capped at 1,400 characters. The visible transcript remains intact and is not used as a full model prompt.
- Tone Architect receives the current user request and, only when present, locally measured USB Audio metrics. It does not receive the preceding chat transcript.
- In Multi-AI mode, Lead AI receives one minified MG30_TONE_INTENT_V1 JSON object from Tone Architect plus task-specific instructions and the compact MG-30 catalogue/current state. It no longer receives the full conversation, duplicate intent payloads or duplicate raw audio measurements.
- Auto mode uses one provider for ordinary tone creation and for all routine conversation/audio/tweak work. Multi-AI is selected for complex new-tone prompts (multi-amp, multi-scene, layered or similarly coupled designs). The explicit Collab setting still opts into Multi-AI. Focused same-tone refinements are single-agent even when Collab is selected.
- Correction and Critical Reviewer each receive minified state and only the affected block catalogue/snapshot. An execution is capped at three provider hops: Architect → Lead → either one catalog correction OR one conditional Reviewer. A Reviewer is skipped if a validation correction already consumed hop three.
- Same-tone refinements include an explicit Delta Patch contract: return only changed blocks and changed parameter keys, retain current model unless the user explicitly asks for a model change, and preserve unaffected blocks. The existing MG-30 catalogue validator remains authoritative.

### Token limits and usage
| Stage | Output-token ceiling |
|---|---:|
| NAM search query / pack / capture selection | 180 |
| Tone Architect | 260 |
| Tone discussion | 520 |
| USB Audio diagnosis | 520 |
| Tone Plan generator | 1,350 |
| Catalog correction / Critical Reviewer | 850 |
| Provider test | 64 |

- Frontend sends maxOutputTokens with each request. Cloud Worker clamps it to 96–2,048 and uses the same ceiling for any JSON-format retry; a format retry does not silently raise the output allowance.
- Worker normalizes Gemini usageMetadata, OpenAI Responses usage, and OpenAI-compatible usage into prompt_tokens, completion_tokens, and total_tokens.
- The app emits one [MG30 AI TOKEN USAGE] console record per model call, without logging prompt text. If the Worker response contains actual provider usage, usage_source is provider; otherwise it is estimated_chars_div_4. Character-based estimates are not billable token measurements.
- **Deployment boundary:** Cloud Worker source and tests have been updated, but no Cloudflare Worker deployment was performed. The production Worker must be deployed separately before the live endpoint honours maxOutputTokens or returns actual provider usage. Until then, the app logs estimates only and the existing production output ceiling remains unchanged.

### Provider fallback and protected paths
- HTTP 429/503 and temporary provider failures trigger a 60-second client-side provider cooldown, preventing repeated calls to the same provider across subsequent agent stages. Authentication errors and generic Worker-route 404s do not cause cooldown.
- Gemini gemini-3.1-flash-lite-preview default is unchanged. GPT remains manual-only. No model latency probes were added.
- TONE3000 search, A2 validation, NAM slot 10 import, NAM library retention, IR User/Third Party/Collection mapping, MIDI CC mappings, live USB-MIDI parameter writes, USB Audio capture and local audio analysis are unchanged.
- The current branch remains feature/multi-ai-free-tone-architect. CI and APK build results must be recorded separately; a successful Android build is not a Worker deployment or physical MG-30 verification.


## Final validation record — CI #866

- Final app commit tested: 7843c4eabf7b7b1877c6d040917cc749cc1fcc49.
- GitHub Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43743943327
- JavaScript syntax: passed.
- Node protocol/regression suite: 539 passed, 0 failed.
- Capacitor Android project generation: passed.
- Gradle assembleDebug: passed.
- APK artifact upload: passed.
- Artifact: MG30-Studio-debug-APK, artifact ID 14172529965, ZIP SHA-256 5bdd51d3ece960ba8e574fe3dfd09e5832af8335f8a776522454e6d7ba4c279d.
- Extracted APK SHA-256: 86f07ef3dbbf6960d09de2d0b1ba5b9fe1ae6bbcec5cfbb3b0cb3dbf9857a2e1.
- The Lead state payload now includes the current exact user request alongside MG30_TONE_INTENT_V1, compact intent and optional installed NAM source; it does not include previous conversation turns or raw audio.
- Production Worker remains undeployed. Actual provider usage and server-enforced per-stage output limits must not be claimed as active in the installed app until the Worker is separately deployed and verified.
- Physical testing on the original MG-30 hardware remains outstanding.
