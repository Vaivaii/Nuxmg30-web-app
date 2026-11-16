# TONE3000 NAM — Payload and token reduction
Date: 2026-11-16
Branch: \`feature/multi-ai-free-tone-architect\`
Target: Original NUX MG-30 Gen 2 firmware 6.0.x only (not MKII).

## Application behavior
- Profile chooser input is minified JSON with only ID, title/name, creator, optional tags, and a description capped at 100 characters.
- A2-Lite chooser input is minified JSON with only ID, name, size/weight information, and concise gain/cab notes when available. URLs, dates, architecture internals and unrelated API metadata stay app-side.
- Both chooser reasons are instructed to use Bahasa Indonesia and normalized to at most two sentences and 30 words.
- Both chooser output budgets are 320 tokens.
- Automatic NAM tone creation now gets TONE3000 \`search_terms\` from the existing Tone Plan. The validated plan is retained in the pending profile/capture flow and reused after Slot 10 import, preventing a duplicate Tone Plan call when submission resumes.
- Full TONE3000 records remain in application state for profile cards, capture selection, manual override, downloads, A2-Lite validation and import. Sanitization applies only to the AI payload.
- Explicit standalone NAM catalogue search keeps its separate query agent because it has no associated Tone Plan.

## Protected paths
No Worker endpoint, Worker secret or deployment change. No changes to OAuth, TONE3000 download, A2-Lite validation, NAM slot-10 transfer, IR User/Third Party/Collection mapping, MIDI CC mapping, preset serialization, or the direct editor MIDI bridge.

## Validation
Regression tests cover allow-list fields, description cap, omitted URLs/metadata, concise rationale limits, output budgets, search-term consolidation, and retention of full local UI records. Actual 40–60% savings must be measured from provider \`prompt_tokens\`; estimated character counts are not billable token measurements. Physical MG-30 Gen 2 verification remains separate.
