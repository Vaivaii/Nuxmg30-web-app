# English UI and AI Response Language Fix
Date: 2026-11-15
Branch: `feature/multi-ai-free-tone-architect`
Target: Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)

## User requirement
- The application interface is English by default. Newly added or changed UI text must be authored in English.
- AI-generated natural-language responses should follow the language of the user's latest request. For example, an Indonesian request should receive Indonesian explanations and summaries even though the application UI remains English.
- JSON property names, device terminology, exact catalogue/model names, block IDs, parameter keys and technical identifiers remain unchanged.

## Changes made
- `www/cloud-account.js`: replaced Indonesian static copy, connection/session statuses, login validation text, and connected-account labels with English. Cloud Account still uses the existing authenticated Worker endpoints and local auth-token storage.
- `www/ai-tone-studio.js`: removed the instruction that forced Tone Plan summaries and notes to English. Added compact same-language guidance to the Lead AI/Tone Plan system prompt, Tone Architect prompt, and TONE3000 NAM recommendation prompts. NAM recommendation reasons now follow the request language. Corrected the provider-specific upstream 404 retry matcher after CI exposed a double-escaped word-boundary: Gemini model/request 404 can now trigger the already-approved free-provider fallback, while a generic missing Worker route 404 remains non-retryable. Provider order and the free-only policy are unchanged. Empty Tone Architect summary/focus fallbacks preserve the user's own wording rather than inserting an English artist-guidance paragraph.
- `tests/english-ui-polish.test.js`: added assertions that the Cloud Account module contains English UI strings and no longer contains the screenshot-reported Indonesian copy.
- `tests/ai-tone-studio.test.js`: updated the language-policy assertions and added a regression test for Indonesian Tone Architect fallback text.

## Protected scope
No changes to:
- Cloudflare Worker source, deployed Worker, backend routes, secrets, authentication contract, or provider adapters.
- Free-provider selection, automatic fallback order, Auto/Free Team orchestration, or model catalogue behaviour.
- NAM validation/import/slot-10 transfer path.
- IR User/Third Party/Collection mapping or import pipeline.
- MIDI CC mappings, live MIDI dispatcher, editor/pedal synchronization, preset codec, or device transfer protocol.

## Validation status
- GitHub Actions run #843 (ID `43627968959`) completed successfully for code commit `74484299c1bb843538074b2fe5a1f8cb1c45474f`.
- JavaScript syntax checks passed.
- `npm test` passed.
- Capacitor Android project generation passed.
- Gradle `assembleDebug` passed and the APK artifact uploaded successfully.
- Artifact: `MG30-Studio-debug-APK`, ID `14126958001`, SHA-256 `7922011b02506aea136f3459221c6ff73cfa94ffce26c5ba2744ff22a4b65f53`.
- A subsequent documentation-only commit records this result; it does not change the tested application code.
- No physical MG-30 Gen 2 firmware 6.0.x hardware verification is claimed by this change record.
