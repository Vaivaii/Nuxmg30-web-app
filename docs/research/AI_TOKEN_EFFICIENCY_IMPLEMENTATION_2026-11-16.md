# MG30 Studio — AI Token Efficiency and Header Sizing
**Date:** 2026-11-16
**Branch:** feature/multi-ai-free-tone-architect
**Target:** Original NUX MG-30 Gen 2 firmware 6.0.x only (not MKII)

## Why this work was done
Gemini's review identified repeated multi-agent chat history, duplicated Tone Architect state, oversized generic output ceilings, repeated full-context reviewer/correction prompts and unnecessary Multi-AI usage for routine tasks. The user also requested restoring the Audio/Settings/Close header controls to compact original-size frames.

## Implemented application changes
1. Four-turn sliding dialogue memory, 1,400 characters maximum per stored turn. UI transcript history remains separate.
2. State-passing between agents. Tone Architect receives current request and optional local USB Audio metrics; Lead receives a single minified MG30_TONE_INTENT_V1 JSON handoff. Chat history and raw audio are not resent to Lead.
3. Auto mode is single-agent for ordinary tasks. Multi-AI is conditional for complex new-tone creation; explicit Collab remains an opt-in. Routine discussion, audio diagnosis and same-tone refinements are one-agent tasks.
4. Delta Patch instructions for same-tone refinements. Only changed blocks and changed parameter keys are requested; catalogue validation and existing USB-MIDI application remain unchanged.
5. Correction and Reviewer receive only affected block catalogue/state. Maximum three hops per run; correction and Reviewer are mutually exclusive in the same run.
6. Output budgets: NAM query/ranking/capture 180; Tone Architect 260; discussion 520; audio diagnosis 520; Tone Plan 1,350; correction/Reviewer 850; provider test 64.
7. Per-agent console usage log [MG30 AI TOKEN USAGE] includes task/provider/model and token counts. Provider usage is preferred when available. Otherwise the source is explicitly labelled estimated_chars_div_4.
8. 60-second provider cooldown after 429/503 and temporary upstream failures. No retry to the same provider within the fallback chain; GPT remains manual-only and Gemini default remains Gemini 3.1 Flash Lite.
9. Header buttons Audio/Settings/Close are equal 38×38 CSS px; waveform icon is 18×18. Prior 56×56 override is removed.

## Cloud Worker update and deployment state
cloud-worker/worker.js, cloud-worker/src/index.js and tests/cloud-worker.test.js now:
- accept a bounded maxOutputTokens value from 96 to 2,048;
- apply the same output ceiling to Gemini, OpenAI Responses, Groq and OpenRouter;
- return normalized provider usage where upstream supplies it;
- include usage from a malformed-JSON attempt plus the subsequent format retry when applicable.

**Important:** Worker source was updated in this repository branch, but Cloudflare Worker was not deployed. Until that separate deployment, the live endpoint may ignore maxOutputTokens and omit actual usage; the app then logs a clearly labelled local estimate. Do not claim actual usage or server-side output limits are live until the Worker deployment is verified.

## Explicitly protected
- Original MG-30 Gen 2 6.0.x only; never MKII.
- NAM architecture/A2 compatibility, slot 10 transfer, installed NAM context and NAM Library.
- IR User/Third Party/Collection mapping and import paths.
- MIDI CC mappings, USB-MIDI live update path and preset transfer protocol.
- USB Audio input capture and local PCM analysis.
- Gemini default model gemini-3.1-flash-lite-preview; GPT remains manual-only.
- No Worker secrets are exposed; no prompt content is written to console usage logs.
- No physical pedal verification is claimed from CI.

## Validation checklist
- [ ] JavaScript syntax and full Node regression suite.
- [ ] Cloud Worker tests for Gemini output budget and provider usage normalization.
- [ ] Android debug APK build.
- [ ] Separately deploy Worker and verify output limit/real usage response before claiming actual token measurements.
- [ ] On phone, compare ordinary preset creation vs complex Collab, confirm four-message context, delta tweak, 429/503 fallback and compact header.
- [ ] On original MG-30 Gen 2 hardware, verify live MIDI, NAM slot 10 and USB Audio + USB-MIDI coexistence.

## Handoff for future conversations
Continue on feature/multi-ai-free-tone-architect. Keep the constraints above. Before optimizing further, inspect the current intent router and makePlan path. Do not reintroduce full chat passing between agents or make routine tasks multi-agent by default. Do not deploy Worker or claim actual token usage until Worker deployment is separately completed and checked.
