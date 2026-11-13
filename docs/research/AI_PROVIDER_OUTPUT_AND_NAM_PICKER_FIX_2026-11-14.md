# AI provider output reliability and compact NAM capture picker — 2026-11-14

## Scope
- Work stays on `feature/ai-live-tone-studio`; device target remains the original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.
- Field report: Gemini generates Tone Plans successfully; Groq (selected model `openai/gpt-oss-120b`) fails JSON validation; OpenRouter may return a completion without final text.
- User requested that the lengthy TONE3000 NAM metadata paragraph be removed from the capture-selection UI while retaining the AI's primary recommendation and an editable dropdown of all downloadable candidates.

## Provider handling
- Groq GPT-OSS requests use low reasoning effort, exclude the separate reasoning output, and use `max_completion_tokens`; the large system/task instruction is folded into the user message for GPT-OSS compatibility.
- If Groq rejects JSON Object Mode / generated JSON, retry once without `response_format`, with a stricter final-output contract. JSON is still parsed locally and the existing Tone Plan validator remains authoritative before any MIDI update.
- OpenRouter requests exclude reasoning output and use a larger response allowance. If a successful HTTP response has no final assistant text, retry once without JSON mode and with an explicit JSON-only output contract.
- The response adapter accepts string content and common text-part shapes. A reasoning-only response is not treated as the Tone Plan; diagnostics expose finish reason/route presence without displaying reasoning content.
- Groq/OpenRouter retries do not weaken the exact MG-30 catalog validator. Malformed/invalid plans still abort before editor MIDI writes.

## NAM selection UI
- Keep the AI-recommended model name, tone/creator and slot-10 context visible.
- Keep the dropdown with every downloadable A2 candidate; mark the AI top recommendation in its option label. The user can select a different candidate.
- Remove the verbose TONE3000 model/tone metadata summary from the visible picker. Metadata stays available internally to the AI ranking and its boost/overdrive evidence logic; no NAM metadata is discarded from data processing.
- The selected candidate still follows existing download, actual file extraction/1,871-weight validation, slot-10 metadata check, overwrite confirmation, transfer, and local library-copy path.

## Protected behavior
- No changes to NAM slot-10 transfer codec, model-weight validation, Library persistence, manual NAM target selection, IR User/Third Party/Collection transfer paths, or MIDI mappings.
- Gemini request and response path remains unchanged.
- These changes do not prove live provider acceptance; test the Groq and OpenRouter keys/models on the Android device after installation.

## Validation
- Extend `tests/ai-tone-studio.test.js` for GPT-OSS reasoning configuration, Groq JSON retry, OpenRouter no-text retry, common response content extraction, and the compact NAM picker.
- GitHub Actions must pass protocol regression tests and Android `assembleDebug`. Live Groq/OpenRouter API requests and physical MG-30 slot-10/audio acceptance remain field tests.
