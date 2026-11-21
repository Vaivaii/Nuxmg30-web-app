# Controlled pre-TIE rollback report — 2026-11-21

## Decision
Owner decision: **Tone Intelligence Engine (TIE) — CANCELLED / DEFERRED**. The application is restored to the last pre-TIE implementation state. The sole intentional TIE-era product change retained is the Editor Signal Chain category colour treatment and per-block category identity. Roadmap/specification/research material remains in the repository as historical archive.

## Git baseline and recovery
- Repository: `Vaivaii/Nuxmg30-web-app`
- Target branch: `feature/tone-intelligence-engine`
- Pre-rollback remote HEAD: `1c0371ec438dbc33094af14009263aabd4ea18f4`
- Pre-TIE source baseline: `114305b7b927a8f63096e5760240b712ba4a7a9c`
- Baseline meaning: last commit before the first TIE application-code commit `5292c7de40acd6a28305782aa782c97380cdb083` ("feat(studio): add TIE workspace shell"). Commit `114305b` only updates the Phase 0 audit checkpoint and does not change application source.
- Recovery branch: `recovery/pre-tie-rollback-2026-11-21`, created at exact pre-rollback HEAD `1c0371ec438dbc33094af14009263aabd4ea18f4`.
- Rollback is an append-only commit whose tree is based on the pre-TIE baseline plus explicitly documented exceptions. No reset, branch deletion or force-push.
- Local `git status`, index and uncommitted working tree cannot be read through the available GitHub remote interface. No claim is made that the user's local checkout is clean; local-only changes are not touched by this remote rollback and must remain preserved on the workstation.

## Application restoration
Restored from the pre-TIE baseline:
- Original Studio Jamm & Record mode selector and panels.
- Original Mini DAW, Quick Record, timeline, mixer, playback and USB loopback UI.
- Original Studio JavaScript, CSS, UI redesign stylesheet, navigation, script imports and routing.
- Existing AI Live Tone Assistant, shared AI engine/provider fallback, provider/key settings, Editor, presets, NAM & IR and Device code as present at the baseline.

The baseline tree removes the TIE application modules:
- `www/tie-analyzer-ui.js`
- `www/tie-audio-source.js`
- `www/tie-comparison-engine.js`
- `www/tie-comparison-ui.js`
- `www/tie-configuration-review-ui.js`
- `www/tie-dsp-engine.js`
- `www/tie-dsp.worker.js`
- `www/tie-signal-chain-ui.js`

The Tone Analysis workspace shell/routes/state, Configuration Review, Analyzer/Compare/Chain Intelligence interfaces, and TIE-specific stylesheet additions are removed by restoring baseline versions of the Studio files. TIE-only runtime/test modules are removed.

## Retained Editor Signal Chain exception
- Editor block markup adds `data-category` from the actual `BLOCKS[i].id`; order, selection, icon renderer and ON/OFF expressions are unchanged.
- Preserved category tokens: WAH `#c47bea`, EFX `#31c6ec`, S/R `#e6c84a`, GATE `#36d7c7`, AMP `#ef5b58`, IR `#36cbdc`; the existing other category mappings CMP, EQ, MOD, DLY, RVB and VOL are also retained.
- Mapping/style rules are scoped only to `#page-editor .chain`.
- Existing SVG glyphs are reused; fill/stroke/currentColor, border colour, category label, selected outline/glow and bypass visibility remain category-based.
- No Tone Analysis route, TIE runtime bridge, readback, parameter mapping or new MIDI write path is kept for this visual-only exception.
- Dedicated coverage is added in `tests/editor-signal-chain-category-colors.test.js`.

## Documentation archive
- The actual roadmap path is `MG30-Studio-Master-Roadmap-TIE-v1.0.md` (the exact name `MASTER-ROADMAP.md` does not exist in this repository); it is marked CANCELLED / DEFERRED.
- `SPECIFICATIONS/README.md` marks all TIE specifications as historical.
- Existing TIE specification files and `docs/research/TIE_*` reports are retained.
- `DEVELOPMENT/CHECKPOINT.md` preserves the development notes and adds the cancellation decision and rollback record.

## Guardrails
No intended change to firmware protocol, USB-MIDI mapping, preset codec/serialization, device read/write behavior, NAM transfer, IR User/Third Party import, IR Collection mapping, DSP/audio engine, Quick Record engine, DAW transport or device-management implementation. AI Live Tone Assistant and provider orchestration are restored from the pre-TIE tree.

The Android build workflow retains only a branch push trigger needed to build/test this rollback; no TIE runtime feature is enabled.

## Verification — complete CI #1223

- Run #1223 / 44912486940 on source commit 9db494480d8004b68660a5163a8f5766188e2784: SUCCESS.
- JavaScript syntax validation: passed.
- Full regression suite: 686 passed, 0 failed.
- Capacitor Android project generation and USB audio plugin installation: passed.
- Gradle assembleDebug: BUILD SUCCESSFUL in 1m 31s.
- APK artifact MG30-Studio-debug-APK, artifact ID 14710164136, archive size 4,390,531 bytes; archive SHA-256 51399d50427e6dfe79419f8d32f889671183587ca35da6c61eb6a471fd77e52a.
- Standalone APK app-debug.apk, 4,767,220 bytes; SHA-256 828c060acae764a6468ff3a28a750abc9705c599778e9aacca90e75b77d35aff.
- APK package inspection confirms original Studio Jamm & Record/DAW markup, no Tone Analysis route or TIE Analyzer import, and retained Editor category markup and colour CSS.
- Run #1222 initially failed only because a Node test attempted to access the app-local escapeHtml function; the assertion was corrected without production-code changes. Run #1223 is green.
- No physical Android handset or original NUX MG-30 Gen 2 firmware 6.0.x hardware test was performed. Source CI cannot certify those hardware behaviours.
- Local workstation git status is inaccessible through the remote connector. No claim is made about workstation-only uncommitted changes.
