# NAM-OFF specialist transient-response recovery — 2026-11-19

## User-visible symptom

During two consecutive new-preset tests with TONE3000 NAM OFF, the preset was still completed through fallback, but diagnostics showed:

- Gemini Amp & Cabinet specialist returned HTTP 503 (provider temporarily unavailable).
- OpenRouter Effects specialist returned HTTP 502 with `Provider did not return a JSON Tone Plan.`
- The specialist team continued to Groq and Cloudflare Workers AI and eventually met the existing two-specialist/two-provider completion quorum.

The subsequent NAM-ON test completed without those visible failures. This comparison does not establish that NAM mode caused the provider errors: the observed statuses are consistent with transient provider availability and incomplete/non-JSON generation responses.

## App-side change

Branch: `fix/no-nam-specialist-provider-order`

For new preset creation only when `namModeActive === false`:

- Gemini and OpenRouter specialist calls now get at most one same-provider retry when the first response is a transient HTTP 5xx (500/502/503/504) or a recognized missing/malformed JSON result.
- The retry waits 400 ms and uses a compact JSON-recovery instruction. The output budget is raised by 160 tokens for that retry (capped at 1,024) to give the structured response room to close.
- If the retry still fails, the existing provider fallback proceeds normally. No provider is marked successful unless it returns a valid structured result.
- HTTP 4xx authentication/quota cases are not retried by this policy.

## Protected behavior

- Provider priority remains Gemini → Groq → OpenRouter → Cloudflare Workers AI.
- The NAM-ON mode receives no additional retry through this new policy.
- GPT-6 Luna remains the sole Chief Tone Architect.
- The mandatory two successful specialist roles from two distinct external provider identities is unchanged; the fail-closed behavior is preserved.
- NAM query generation remains pinned to Cloudflare Workers AI; GPT-6 Luna profile/capture selection is unchanged.
- No Worker source or Cloudflare deployment was changed.
- No NAM transfer/slot-10, IR User/Third Party/Collection, MIDI, preset codec, USB-MIDI, or USB Audio implementation was changed.

## Validation

GitHub Actions run #1107, run ID `44374702380`, commit `f5a30b8a55346c1d057f755550d5f892def32cfe`:

- JavaScript syntax validation: passed.
- Protocol regression tests: **676 passed, 0 failed**.
- Capacitor Android generation and USB Audio plugin initialization: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL**.
- Artifact `MG30-Studio-debug-APK`, ID `14460117429`.
- Artifact ZIP SHA-256: `7dc4d966fc16344f24dbe164ed201cff54727d2d41cd840b75f5bf5860c5d538`.
- Extracted APK SHA-256: `47c9fd773d2243ee6a43df6458997ade13c9053d7e0368c9a0908b1175754687`.
- ZIP and APK archive integrity checks: passed.

Hardware/provider acceptance remains a user-side test: this CI run proves the retry policy, fallback/quorum regression checks and APK build, but cannot guarantee a future provider will never return 503/502.
