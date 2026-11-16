# Cloudflare Workers AI — Auto Free Multi-AI Integration

Date: 2026-11-16
Branch: `feature/multi-ai-free-tone-architect`
Target: original NUX MG-30 Gen 2 firmware 6.0.x (not MKII)

## User requirement

Use the existing Cloudflare Worker binding named `AI` (`env.AI`) with model `@cf/google/gemma-4-26b-a4b-it` as the first choice for light tone discussion and TONE3000 search-term generation. Keep Gemini → Groq → OpenRouter as the normal free Tone Plan route and use Workers AI as the last-resort fallback when upstream providers fail. Convert the Workers AI `response.response` text to the Worker JSON parser's normal input.

## Implementation

### Worker
- Added a fixed `WORKERS_AI_MODEL` constant for `@cf/google/gemma-4-26b-a4b-it`.
- Added `generateWorkersAiJson()`, which calls `env.AI.run(model, { messages, temperature, max_completion_tokens, chat_template_kwargs })`.
- Added `workersAiText()` to normalize plain string, `response.response`, `response.text`, and existing chat-compatible text shapes. The extracted text goes through the existing `extractJsonObject()`; no alternate Tone Plan schema was introduced.
- Added authenticated `POST /api/v1/ai/light-task` with explicit task allow-list:
  - `tone-discussion` (maximum 520 output tokens)
  - `tone3000-search-terms` (maximum 180 output tokens)
- Light-task results are returned as `{ result, provider, model, usage }`, preserving the app's structured JSON handling.
- Auto Tone Plan route order is Gemini → Groq → OpenRouter → Cloudflare Workers AI. Auto mode proceeds after any failed upstream provider call; Cloudflare is skipped if `env.AI.run` is not bound.
- Health/provider endpoints report binding presence only; they never expose credentials.

### App
- Free tone discussion uses the Workers AI light-task endpoint directly.
- TONE3000 search-term generation uses the Workers AI light-task endpoint directly. For a fresh NAM creation flow it is run after Tone Plan validation, and the validated plan keeps a non-enumerable `search_terms` field for the existing TONE3000 search call.
- The existing TONE3000 query fallback remains local if Workers AI cannot produce usable terms.
- Auto/Collab agent calls append Workers AI as their final fallback; when no free model team can be prepared, Workers AI can generate a single-agent Tone Plan that still passes the existing catalog validator.
- No provider model picker entry or client-side API key was added for Workers AI; model ID is fixed server-side.

### Configuration
- Added Wrangler TOML `[ai]` binding = `"AI"`, which maps to `env.AI`.
- No model API key secret is required for this service binding.
- Deployment still must be run separately against the existing `nux-mg30-studio-api` Worker.

## Usage / billing note

This integration avoids consuming Gemini, Groq and OpenRouter provider quota for the designated tasks, but it does not imply zero-cost inference. Cloudflare Workers AI has a daily free Neurons allocation and account usage limits; the current Cloudflare pricing page lists the Gemma 4 model at $0.100 per million input tokens and $0.300 per million output tokens. Monitor Neuron usage in the Cloudflare dashboard.

## Safety / protected scope

No change to:
- original MG-30 Gen 2 6.0.x targeting; no MKII assumptions;
- NAM profile/capture chooser, A2-Lite file validation, slot 10 transfer protocol or NAM library persistence;
- IR User / Third Party / Collection storage/import mapping;
- MIDI CC mappings, USB-MIDI editor dispatcher or live parameter-write contract;
- preset serialization, firmware codec, save-to-device or raw SysEx behavior.

AI output remains untrusted and must pass the app's existing MG-30 catalog validator. The Worker does not write to the pedal.

## Validation plan

Automated Worker regression tests cover:
1. `response.response` parsing for discussion and TONE3000 query tasks.
2. Per-task output-token ceilings and disabled Gemma reasoning.
3. Auto fallback to Workers AI after Gemini 429, Groq 503 and OpenRouter 429.
4. Existing Gemini→Groq success path remains unchanged.

Automated tests and CI must pass before treating the code as ready. Production deployment and a live request through the user's Cloudflare account are separate verification steps.


## UI visibility follow-up — 2026-11-16

The first application build exposed a presentation gap: Workers AI was already called for light tone discussion and TONE3000 search-term derivation, and was already the final Tone Plan fallback, but the AI Settings panel still showed only the four API-key providers. The free-team status message also named Gemini first, which obscured the separate Workers AI light-task route.

The follow-up in `www/ai-tone-studio.js` now:
- displays Cloudflare Workers AI as a fifth provider status row, driven by `providers.cloudflare` from `GET /api/v1/ai/providers`;
- counts configured providers as `n / 5` and describes the binding as active/unavailable (not as an API-key secret);
- adds a **Test Workers AI** action that invokes the existing authenticated `POST /api/v1/ai/light-task` `tone-discussion` path and reports the returned response;
- exposes `Cloudflare Workers AI · Gemma 4` as a manual provider choice using the fixed `@cf/google/gemma-4-26b-a4b-it` model, without calling a provider model catalogue for it;
- clarifies that Workers AI is primary for light discussion and TONE3000 query terms, while Gemini → Groq → OpenRouter remain the free Tone Plan provider team and Workers AI remains the final Tone Plan fallback.

No Worker protocol, NAM/IR import code, MG-30 catalog validation, USB-MIDI command routing or MIDI mapping is changed by this UI-only follow-up. Automated coverage is added for the fifth provider status, test action, UI copy and manual fallback order. Results of the next CI build are to be recorded after completion.


### UI follow-up validation result

- GitHub Actions workflow run: [#892](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43819579207)
- Branch commit: `89b0db726512d12f4702d2aa294fb17474fbdf11`
- JavaScript syntax validation: passed.
- Protocol regression tests: **551 passed, 0 failed**.
- Android debug APK: **BUILD SUCCESSFUL**; uploaded as artifact `MG30-Studio-debug-APK` (artifact ID `14203409686`).
- Extracted APK: `MG30-Studio-WorkersAI-UI-debug.apk`; SHA-256 `a3749e92510fde955e2f61af2d957ae0a8809656ab1bf2d7326a101205a0cedb`.
- This verifies compilation and regression tests only. The new Test Workers AI button still needs a live tap from the user's installed app to confirm the deployed Cloudflare binding/model responds in their account.


## Cloudflare-first routing and internal model pool — 2026-11-16

The installed APK screenshots showed that Auto used Workers AI for TONE3000 search-term derivation but still used Gemini for profile ranking. The corrected routing policy is now:

- **Workers AI only (no external provider inference/RPM):** tone discussion, TONE3000 search-term derivation, TONE3000 profile ranking, A2 capture selection, ordinary/simple Tone Plans and single-agent corrections while in Auto.
- **Complex Auto Tone Architect / Collab:** Workers AI is inserted first in the existing team and is the first Tone Architect candidate. Gemini, Groq and OpenRouter remain available as following agents/lead/reviewer fallback candidates. OpenAI API/GPT remains manual-only; the Workers AI-hosted GPT-OSS fallback is separate from the OpenAI provider.
- The Auto model selector copy now identifies Cloudflare-first behavior and the complex-team exception.

The authenticated Worker light-task allowlist adds `tone3000-profile-ranking` and `tone3000-capture-selection` with 320-token caps. These keep profile/capture recommendation stages on Workers AI rather than silently calling the Gemini/Groq/OpenRouter generation providers.

### Workers AI internal fallback order

The Worker now calls the binding sequentially, stopping at the first model that returns parseable JSON:

1. `@cf/google/gemma-4-26b-a4b-it` — primary.
2. `@cf/openai/gpt-oss-20b` — fallback.
3. `@cf/mistralai/mistral-small-3.1-24b-instruct` — fallback.
4. `@cf/meta/llama-4-scout-17b-16e-instruct` — final Workers AI fallback.

Gemma retains its existing `max_completion_tokens` plus `chat_template_kwargs.enable_thinking=false` request shape. The other models use `max_tokens`. Model attempts advance on a binding error or a response that cannot be parsed as a JSON object. The Worker response returns the actual model that succeeded so the app usage monitor does not mislabel fallback inference as Gemma.

Cloudflare's official model catalogue documents the exact model IDs for [GPT-OSS 20B](https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/), [Mistral Small 3.1 24B](https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/) and [Llama 4 Scout 17B](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/). The Worker continues to use the existing `env.AI` binding; no vendor API keys are required for this internal pool.

### Deployment note

The repository Worker source and its mirrored `cloud-worker/src/index.js` now contain the internal model pool, new light-task names and Cloudflare-first Worker auto order. To make the deployed Worker match this source, redeploy the Worker from this branch using `npx wrangler deploy --config cloud-worker/wrangler.toml`. The app APK is a separate build/deployment from the Worker.

### Protected hardware scope

No changes to original MG-30 Gen 2 firmware 6.0.x targeting, NAM A2-Lite validator / Slot 10 transfer, IR User / Third Party / Collection paths, MIDI mapping, live parameter transport, preset serialization, or SysEx. AI output continues through existing catalog validation before any live MIDI apply.


## User-supplied Worker 1.2.2 reconciliation — 2026-11-16

The user supplied their currently deployed Worker script, edited with Gemini. Its four-model pool and fallback behavior are retained; the repository Worker is reconciled to this model-list naming and behavior rather than replacing the user's model choices:

- `WORKERS_AI_MODELS` contains Gemma 4 26B A4B, GPT-OSS 20B, Mistral Small 3.1 24B and Llama 4 Scout 17B; `WORKERS_AI_MODEL` remains the first (Gemma) entry.
- Auto `/api/v1/ai/tone-plan` now tries Cloudflare first, followed by Gemini, Groq and OpenRouter only if the internal Workers AI pool is exhausted.
- A manually requested Cloudflare model is honored only when it is one of the four approved IDs. The chosen model runs first and the remaining three remain its fallback chain; unapproved IDs return HTTP 400 without inference.
- The allow-listed light task set remains four tasks: `tone-discussion` (520), `tone3000-search-terms` (180), `tone3000-profile-ranking` (320), and `tone3000-capture-selection` (320). These tasks always use the internal Workers AI pool, and do not spill to external providers.
- Model-specific token parameters are intentionally used: Gemma 4 receives `max_completion_tokens` and `chat_template_kwargs.enable_thinking=false`; GPT-OSS 20B, Mistral Small 3.1 and Llama 4 Scout receive `max_tokens`. This avoids sending both limit parameters to every model.
- `/health` and `/api/v1/ai/providers` expose `workers_ai_models` and Worker version `1.2.3` so the deployed code can be distinguished from the user's former 1.2.2 deployment.

The repository's standalone Worker entry point and mirrored test source `cloud-worker/src/index.js` have been kept in sync. Automated tests now assert the four IDs, all four light-task budgets, Cloudflare-first Auto order, internal fallback sequence, cumulative usage across failed/invalid model attempts, and manual model allow-list enforcement.

**Deployment status:** no Cloudflare deployment was performed from this chat. The live Worker needs one redeploy from the updated Worker 1.2.3 source after CI validation. The existing APK from build #909 already contains the matching four light-task calls and Cloudflare-first Auto routing; no APK rebuild is required for Worker-only changes.


## Manual TONE3000 profile → A2 capture blank-panel fix — 2026-11-16

User screenshot review established two separate observations:

1. The app received HTTP 400 `Unsupported lightweight AI task` while ranking TONE3000 NAM profiles. This identifies the live Worker deployment at screenshot time as missing the app's `tone3000-profile-ranking` task (and likely the paired `tone3000-capture-selection` task). The updated repository Worker 1.2.3 allowlists both. Deploy Worker 1.2.3 for these task calls to work; manual selection must still remain possible even when optional AI ranking fails.
2. The manual **View A2 Captures** path showed a blank message area until the assistant panel was closed/reopened, while the automatic/recommended path remained usable. The app-side fix now inserts a persistent `nam-captures-loading` chat card before awaiting TONE3000 `loadTone` and optional AI capture ranking. On completion it updates that same card in-place to `nam-captures`, preserving the selected-profile history and preventing a blank waiting surface. On true load failure the transient card is removed and the delegated handler displays the failure message.

Chat history rerender now scrolls to the last message after two animation frames, allowing the WebView flex/scroll layout to settle before applying the scroll position. If AI capture ranking returns an unsupported-task or other error, the existing fallback `aiChoice?.model || candidates[0]` still exposes the first downloadable A2 candidate and all alternatives; this does not bypass A2-Lite validation or the explicit Slot 10 import confirmation.

Regression coverage asserts the loading card, replacement-in-place, error cleanup, post-layout scroll and manual first-candidate fallback. No NAM transfer protocol, Slot 10 semantics, IR collection/user paths, MIDI mapping or MG-30 catalogue logic is modified.


### Manual A2 picker fix build result

- GitHub Actions workflow run #918: [43835780963](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43835780963)
- Commit: `a5278da7b3dbc9e8ea5c8f7f60096d109125bfcf`
- JavaScript syntax: passed.
- Protocol regression tests: **556 passed, 0 failed**.
- Android debug APK: `BUILD SUCCESSFUL`; artifact `MG30-Studio-debug-APK` ID `14211041341`.
- Extracted APK file: `MG30-Studio-Manual-A2-Capture-Fix.apk`, SHA-256 `42636ba6a33d1928f33d3d7e31876583ef549dfa2554f97050d5e344b87024e7`.
- App-side loading/picker fix is included in this APK. Worker deploy remains a separate operation: the live Worker must be version 1.2.3 with `tone3000-profile-ranking` and `tone3000-capture-selection` allowlisted to remove the HTTP 400 recommendation errors shown in the screenshot.


## Follow-up fix: NAM light-task allow-list and AI sheet scrolling (2026-11-16)

- Root cause confirmed from the app/Worker contract: `www/ai-tone-studio.js` calls `tone3000-profile-ranking` and `tone3000-capture-selection`, while the deployed Worker source initially allowed only `tone-discussion` and `tone3000-search-terms`. This produced HTTP 400 `Unsupported lightweight AI task` and disabled AI ranking/capture recommendation.
- Added both missing tasks to the allow-list in `cloud-worker/worker.js` and synchronized `cloud-worker/src/index.js`; each is capped at 320 output tokens.
- Adjusted the AI sheet body to scroll vertically on mobile and reset the body/message scroll positions when reopening the sheet. This addresses the clipped/stale panel position seen after closing and reopening.
- No NAM A2-Lite validator, slot-10 transfer, IR import/Collection, MIDI mapping, or preset serialization logic was changed.
- New commits: Worker `db85287c5bf1dfc755a410d56e32ec70b6ec138e`, synchronized source `be04a11abe9debe7330ee4777313a927960172d1`, app UI `46973c78cf8c90720629853fd6bc9e23f94f2e88`.
- CI run for app head: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43838160396 (pending at note creation). Physical Android/WebView validation is still required; no claim of live device verification.


## A2 capture radio selection must not move chat scroll — 2026-11-16

The user confirmed that selecting a radio item in the manual A2 capture picker caused the conversation to jump to the bottom/composer. Root cause: the delegated `change` handler updated `historyItem.data.selectedId` and then called `renderHistory()`; that function rebuilds the entire chat and always calls `scrollMessagesToEnd()`.

Fix committed in `www/ai-tone-studio.js`:
- Radio selection now updates only the in-memory `selectedId` and the `.selected` class on labels in the existing `[data-ai-nam-card]` element. It does not call `renderHistory`, does not replace the capture card and does not assign either scrollTop.
- `updateChatCard` replaces only the specific loading card's `outerHTML`, preserving both `#aiToneMessages.scrollTop` and the enclosing `.ai-tone-body.scrollTop`; it no longer redraws the whole conversation for a card-state transition.
- `openPanel` no longer resets body/message scroll or forces focus to the composer. The sheet remains mounted while closed, so it retains the exact position the user left.
- Regression tests verify the radio handler has no history repaint or scroll operation, the loading-card updater preserves both scroll positions, and reopening does not force the composer into view.

This UI-only patch does not modify AI prompts, candidate limits, token budgets, usage accounting, Cloudflare routing, Worker endpoints, A2-Lite validation, or Slot 10 transfer. Thus the prior token-saving settings (12 profile candidates, 18 capture candidates, and 180/320 output-token limits) are unchanged.


### No-auto-scroll A2 radio selection verification

- Final app commit: `76daa2ba96005693385bddf5474f11b65793905c`.
- CI workflow #927: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43842193505
- Protocol regression tests: **559 passed, 0 failed**.
- Android Gradle: `BUILD SUCCESSFUL`.
- APK artifact: `MG30-Studio-debug-APK`, artifact ID `14213786317`; extracted as `MG30-Studio-No-AutoScroll-A2-Picker.apk` (SHA-256 `7c42e5dd9c3f6b7b4dc1ec0e9fbdbcd8af6b0e512ca818f34b4cc4be0fdde42e`).
- Manual radio changes now update only the selected classes inside the existing A2 capture card; the full chat is not repainted and neither chat nor body scroll position is assigned. Loading-card replacement updates only that card and preserves both scroll positions. Reopening the sheet no longer resets the body/chat scroll or focuses the composer.
- No Worker redeploy required for this UI-only change. Physical Android touch/scroll verification remains a user-side check; CI covers syntax, regression assertions and APK compilation.
