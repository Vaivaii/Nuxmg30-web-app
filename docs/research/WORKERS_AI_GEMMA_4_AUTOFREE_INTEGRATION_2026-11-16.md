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
