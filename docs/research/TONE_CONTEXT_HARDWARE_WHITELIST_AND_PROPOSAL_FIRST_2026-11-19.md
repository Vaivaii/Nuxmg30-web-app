# Tone context, hardware whitelist, and proposal-first refinement — 2026-11-19

## User-reported regressions

Two separate behaviors were observed during live MG-30 Gen 2 use:

1. New preset creation (John Petrucci lead) produced a valid-looking Tone Plan but failed device readback for `DLY.subd`, then restored the previous state.
2. A review question ("Apakah ada yang perlu diperbaiki?") was classified as a preset/refinement action, invoked specialists, and attempted an invalid AMP model recommendation instead of discussing the active tone.

## Implementation

Branch: `feature/tone-context-proposal-first`

### A. Hardware-constrained preset generation

- The full `compactToneContext(catalog,snapshot)` already carries the live device catalogue (all block IDs, model names, writable parameter keys, discrete choices) and current editor state.
- Tone Architect system instructions now explicitly make this catalogue the only source for legal block IDs, model names, and parameter keys. Artist/reference equipment names are not hardware model names unless they exactly occur in the MG-30 catalogue.
- Specialist Amp & Cabinet and Effects contexts are no longer limited to the first 24 models.
- These two specialists now receive every model's exact parameter whitelist, including discrete choices, as well as the exact block IDs and model names. Other specialists continue receiving the exact selected model's parameter whitelist.
- Device-side `aiPreparePlan` remains the final guard: it resolves the selected model against the app's current device catalogue and resolves parameter IDs against the selected model's writable controls. Unsupported IDs/models fail closed before MIDI write.

### B. DLY selector readback quantization

- The device editor normalizes selectors such as `subd` to a 0–100 UI range, but the physical MG-30 stores one of seven discrete positions (`PARAMETER_MAX.subd = 6`).
- Before this change, the AI writer could compare an unrepresentable normalized midpoint to the readback value after encoding/decoding, causing a false mismatch/rollback.
- `aiPreparePlan` now canonicalizes every non-switch selector using `quantizeParameterValue(key,value)` before it prepares the MIDI value and the target value used for readback verification.
- This does **not** add `subd` to models whose exact catalogue does not expose it. The selected model's own writable-control list remains authoritative.
- No MIDI CC mapping was changed.

### C. Discussion vs proposal vs preset creation

- Review questions, including "Apakah ada yang perlu diperbaiki?" and "Apa yang kurang dari preset saya?", route to **consultation** rather than preset generation or edit.
- Consultation stays on GPT-5.6 Luna and sends the live MG-30 catalogue + active editor snapshot along with recent conversation context. It returns prose recommendations only: no specialists, JSON Tone Plan, or MIDI writes. It distinguishes editor-state evidence from anything that would require listening to supplied audio.
- Imperative requests such as "Coba perbaiki", "Kurangi sedikit treble", and "Perbaiki jika preset saya tidak enak" route to **tone_refine**.
- Tone refinement is a separate **GPT-6 Luna proposal-only** action. It refreshes the connected MG-30 state, sends the full exact catalogue + current snapshot, asks for a small delta only, forbids model changes, new blocks, chain redesign, and protects NAM AMP slot 10.
- The proposal is validated against the current model's exact parameter list/ranges/discrete choices before it is shown.
- The UI shows a human-readable before → proposed-value list. No MIDI is sent when the proposal is generated.
- Only explicit commands such as `SETUJU`, `TERAPKAN PERUBAHAN`, `Terapkan rekomendasi tadi`, or `Apply changes` can approve it. Casual acknowledgements such as `Oke` and `Ya` do not approve. `BATALKAN` / `Jangan dulu` discards the proposal.
- Approval refreshes the MG-30 readback and compares a stable fingerprint of the active preset snapshot and the current catalogue. If either has changed since proposal creation, the proposal is invalidated and no MIDI is sent.
- After approval, the same validated delta-only plan uses the existing MG30 bridge `applyPlan` path and readback verification. Undo remains available.
- No specialist calls are used for ordinary discussion or current-tone refinement.

## Protected behavior

- Original NUX MG-30 Gen 2 firmware 6.0.x remains the only target; not MKII.
- GPT-6 Luna remains the Chief Tone Architect for new presets and the author of refinement proposals.
- Gemini remains the primary specialist provider. Groq and OpenRouter remain fallback providers, then Cloudflare Workers AI; the NAM-OFF transient retry fix is retained.
- NAM search terms still go to Cloudflare Workers AI; GPT-6 Luna still selects TONE3000 profile and A2-Lite capture.
- NAM Library, capture download/validation (1,871 weights), slot-10 import/transfer, IR User/Third Party/Collection behavior, MIDI mappings, preset codec, USB-MIDI, and USB Audio integration are not intentionally changed.
- No Cloudflare Worker source, task endpoint, Worker secret, or deployment was changed.

## Automated validation

GitHub Actions run **#1116**, run ID `44465846388`, head commit `f5caff9d247287e2ea7f36ce1635c7d318a2909b`:

- JavaScript syntax validation: passed.
- Protocol regression tests: **682 passed, 0 failed**.
- Capacitor Android project generation and USB Audio plugin initialization: passed.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL** in 1m 27s.
- Artifact upload: passed; artifact `MG30-Studio-debug-APK`, ID `14502401276`.
- Artifact ZIP size: 4,389,741 bytes; SHA-256: `192775e836a60d9cfa60b68997a01c44050c2baa17600435aa5a6505609235f5`.
- Extracted `app-debug.apk`: 4,766,672 bytes; SHA-256: `c9ed12ea5f6a2496cfaee3a9a704a9700a80d0810a4e59047218884e90c482f5`.
- Local ZIP integrity test: passed; APK file type and internal ZIP integrity test: passed.
- This APK contains the application source at commit `f5caff9d247287e2ea7f36ce1635c7d318a2909b`. The later commits on this branch only add project documentation.
- No Cloudflare Worker source or deployment change was part of this build.

## Hardware acceptance still required

CI tests verify routing, validation guards, stale-proposal rejection logic, selector quantization, and Android build. They do not connect to a physical pedal or call live external providers.

After installing the final APK, perform these checks on the original MG-30 Gen 2:

1. Create a NAM-OFF Petrucci lead preset. Verify selected AMP and effect models exist in the editor catalogue, each parameter key exists on that exact model, and no `DLY.subd` readback mismatch occurs.
2. Ask "Apakah ada yang perlu diperbaiki?" while a preset is active. Confirm it returns a discussion/recommendation only, no specialist mission, no preset creation, and no MIDI.
3. Say "Coba perbaiki". Confirm a delta proposal appears, with no MIDI before approval.
4. Approve with `SETUJU` or `TERAPKAN PERUBAHAN`. Confirm readback verification.
5. Generate a proposal, manually change a device parameter, then approve the stale proposal. Confirm it is rejected and does not overwrite the manual change.
6. Repeat discussion/refinement with NAM active. Confirm AMP/NAM slot 10, IR, and MIDI mappings remain unchanged.
