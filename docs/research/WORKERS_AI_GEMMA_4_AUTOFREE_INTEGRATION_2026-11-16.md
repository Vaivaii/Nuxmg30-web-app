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
