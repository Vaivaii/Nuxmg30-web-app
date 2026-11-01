# NUX MG-30 Studio — Dark Performance UI Polish Plan

Date: 1 November 2026
Target: **Original NUX MG-30 Gen 2 firmware 6.0.x; not MKII**
Repository: `Vaivaii/Nuxmg30-web-app`
New UI branch: `feature/dark-performance-ui-polish`
Protected reference branch: `feature/preset-manager-redesign`
Starting source HEAD: `cd9fcf2daf09a143edcb895b8d11275d8f1aaaf3`
Starting app source baseline: Build #209 source `7dc18bd497684eb7eef75a98e7b5d17f9f74b31d`

## Purpose

Refine the existing application UI based on the user's current Android screenshots. Keep the current visual identity and improve polish, hierarchy, spacing, responsiveness, and consistency. This is a **refinement, not a redesign**.

Approved visual direction: **Dark Performance 2.0**.
- Preserve near-black / charcoal backgrounds, graphite panels, subtle blue-grey borders, lime-green active/primary accents, and restrained outline iconography.
- Preserve the current MG-30 Studio character, header, and five-tab navigation.
- Improve consistency and clarity, not replace the UI with a different design language.
- Mobile-first; the supplied screenshots are the primary visual reference.

## Scope candidates (visual presentation only)

1. **Editor:** hierarchy of preset header, Signal Chain, block cards, AMP/CAB visual, Scenes, controls and knob spacing.
2. **NAM & IR:** clearer visual grouping for native NAM import, TONE3000, User/Third Party IR and Collection IR. Improve information hierarchy and density.
3. **Collection IR:** improve slot cards, state labels and action hierarchy while preserving its two-column mobile grid unless a separately reviewed visual case justifies change.
4. **Preset Manager:** refine 128-slot row density, slot/name alignment, selected/empty states, and search affordance if it can be added without touching protected behavior.
5. **Studio:** visual consistency of recording, monitoring, audio and video panels.
6. **Device:** visual clarity of USB Audio, connection state, hardware details, NAM slots and TONE3000 settings.

The exact sequence and first target will be chosen one isolated change at a time after reviewing the current UI on this branch. Do not bundle multiple tabs or multiple unrelated elements into one source change.

## Hard preservation boundaries

This branch is a separate visual work area. Its creation does not authorize feature/protocol redesign.

- Do not alter USB-MIDI / native Android connection code, event routing, bridge APIs, connection startup or lifecycle.
- Do not change NAM transfer, NAM payloads, IR User / Third Party import or transfer, IR Collection install/use behavior or IR binary/transfer logic.
- Do not change preset Import/Export UI event wiring, validation, serializers, parsers, binary formats, readback, native file picker, bridge or transfer ordering.
- Do not change MIDI mapping, SysEx packet generation, parameter encoding, preset read/save protocol, active-slot synchronization, Save-to-device, Copy Scene, CTRL/EXP, or hardware state.
- Do not change Movable Signal Chain markup, DOM structure, drag/drop, touch gestures, ordering algorithms, state or persistence.
- Do not change Editor rendering/startup, shared state, app initialization or connection sequence.
- Do not change behavior of Studio / Device services or audio/video capture pipelines.
- No backend, data model, storage, transfer protocol or device behavior change.
- Do not remove existing elements or hidden compatibility IDs merely to simplify the UI.
- Avoid global CSS and shared JS whenever possible. Prefer tightly scoped styles and presentational markup. If a change would touch protected shared logic or cannot be proven visual-only, stop and ask the user before proceeding.

Build #209 and the multi-effects processor icon are the preserved starting baseline. Do not roll back or replace the icon with the superseded USB glyph.

## Mandatory workflow for every small change

Follow the user's permanent project rule:
1. Make one small and reviewable source change.
2. Run targeted static/syntax checks and browser simulation against the **exact changed source**, with realistic markup and relevant viewport dimensions.
3. If any check fails, diagnose the cause, record the failed attempt, make the smallest safe correction, and rerun the affected test(s) until they pass. Never mark an untested or failing stage complete.
4. Record every attempt, correction, commit SHA, changed file, protected areas checked, method, exact tested source, pass/fail, blocked tests and next step in `UI_POLISH_CHECKLIST.md`.
5. Keep the resume prompt in sync so a new chat can continue without redoing the investigation.
6. Keep browser simulation, automated tests, Android packaging and physical hardware tests as separate evidence levels. Never claim a browser simulation validates a real pedal.
7. After a source change and its passing test record are committed, stop and ask exactly **“Build sekarang atau nanti?”**. Do not start Actions / CI / Gradle / APK until the user explicitly says **Build sekarang**.
8. When the user authorizes a build, build the exact tested HEAD. Verify workflow run and artifact, download ZIP, inspect archive, extract APK, verify package contents and checksum, then provide the direct APK sandbox link in chat. Every build's APK is delivered immediately; never provide an older APK as current.
9. If an authorized workflow/build fails, disclose it, diagnose and correct within the approved scope, rerun tests, and retry until success. Preserve failure/correction history.
10. Documentation-only commits must use `[skip ci]` when appropriate and must not trigger an Android build.

## Baseline verification

At branch creation:
- New branch created from `feature/preset-manager-redesign` HEAD `cd9fcf2daf09a143edcb895b8d11275d8f1aaaf3`.
- `www/index.html` includes the Build #209 multi-FX Device navigation icon.
- `www/ui-redesign.css` is inherited unchanged from the preserved baseline.
- Build #209 app source remains the baseline; no UI source changes have been made on this new branch yet.
- Existing feature code (Editor, Signal Chain, USB-MIDI, NAM/IR, Import/Export, MIDI, Studio/Device behavior) is carried forward unchanged.
- No build or CI run is started by branch creation/documentation.

## Current stop point

Branch setup and design direction are recorded. **No application code has been changed.**
Next step: inspect the existing mobile UI structure on this branch and propose the first smallest visual-only refinement before editing. The user has not authorized a first UI code change yet.

## First UI implementation checkpoint — Editor Scene typography (1 November 2026)

- Completed first user-approved small visual refinement: Editor Scene card title 10px → 11px and description 8px → 9px.
- Source commit: `54ae2c69dbe59d011457ecd8a8dfd80c49a29dba`; only `www/ui-redesign.css` changed, limited to two selectors under `#page-editor .main-editor-card .scene-button`.
- No card sizing, grid, spacing, state, scene event handlers, copy scene, Editor render, or hardware behavior changed.
- Targeted Chromium / Playwright fixture based on the existing `renderSceneButtons()` DOM and exact scoped CSS. PASS at 320×740, 360×800, 393×873, 432×915: 3 cards remain in one row, labels 11px and descriptions 9px, all text fits, single active highlight remains, no horizontal overflow.
- Test harness initial `file://` navigation was blocked by environment; fixed using `page.set_content()`. Rerun passed all four sizes; history is in `UI_POLISH_CHECKLIST.md`.
- Protected JS/HTML and transfer modules verified unchanged. No app behavior or device protocol was modified.
- No CI, Android build or physical hardware test run. Wait for user response **Build sekarang ou Build nanti**.

## Current stop point

UI polish 01 is complete and recorded. Do not edit the next component until the build decision is received. After the user responds, continue one small UI refinement at a time, with simulation and complete checklist/resume records.

## Android APK build request — accepted and started (1 November 2026)

- User explicitly answered **“Sekarang”** to the build gate after UI Polish 01.
- Build workflow originally did not include `feature/dark-performance-ui-polish` in its push branch filter. Added that branch only to `.github/workflows/build-apk.yml`; workflow commands, environment, regression tests and artifact upload steps were not altered.
- Workflow config commit: `83e6412c1099a29d9512731bf8f393117d70e4e5`.
- GitHub Actions run: **#210**, run ID `41283669737`, URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41283669737
- Confirmed run state: `in_progress` at last poll.
- Completed successfully: checkout, Node 22 setup, Java 21 setup, `npm install`, `npm test` (protocol regression), `npm run android:init` (Capacitor Android project + USB audio plugin).
- Current step at last poll: `cd android && ./gradlew --no-daemon assembleDebug` (Build debug APK) — in progress. APK upload step pending. No artifact exists yet; do not claim APK produced until Actions confirms success and artifact is present.
- No changes to NUX MG-30 protocol, NAM, IR import/collection, MIDI mapping, or existing editor/transfer implementation were made for build enablement.



## Build #210 verified — UI Polish 01 / Editor Scene typography (1 November 2026)

- GitHub Actions run #210 / ID `41283669737`: **success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41283669737
- Build workflow commit: `83e6412c1099a29d9512731bf8f393117d70e4e5`; application CSS source tested was UI Polish 01 commit `54ae2c69dbe59d011457ecd8a8dfd80c49a29dba`.
- npm install, protocol regression tests (`npm test`), Capacitor Android generation / USB audio plugin, Gradle `assembleDebug`, and artifact upload all succeeded.
- Artifact `MG30-Studio-debug-APK`, ID `13073548824`, ZIP size 4,025,006 bytes, SHA-256 `98d1b2f3e6d6c33ecbb15cb89fc9a22423016a958902f5247ffce1808e35f853`. ZIP integrity passed.
- Extracted APK: `/mnt/data/MG30_Studio_Build_210.apk`, 4,402,844 bytes, SHA-256 `fd27b12c42e9530b6b5453579fc337c8ed744b649f9c1f96a39608d905ed6470`. APK archive integrity passed; `file` identified an Android package with Gradle app metadata and APK Signing Block.
- The APK was delivered directly in chat as `MG30_Studio_Build_210.apk`. This is a debug APK. `apksigner` was unavailable, so cryptographic signature verification was not run. No physical Android or MG-30 hardware test is claimed.

## UI Polish 02 — Collection IR slot status readability (1 November 2026)

- User asked to continue to the next visual refinement after Build #210. Reference: supplied Collection IR screenshot `1001009076.jpeg`, where per-slot labels such as “Belum dibaca” were comparatively small/dim.
- Active branch: `feature/dark-performance-ui-polish`.
- Changed exactly one CSS rule in `www/index.html`:
  - Before: `.ir-collection-slot-status{font-size:9px;color:var(--muted);text-align:right}`
  - After: `.ir-collection-slot-status{font-size:10px;color:#a7b4b6;font-weight:600;text-align:right}`
- Purpose: improve status-label legibility only. Preserve the Collection grid’s two-column mobile layout, slot card dimensions, status text/meaning, numbered slot states, action buttons, and all behavior.
- Source commit: `eaaada44a524df2f39ed6b447c4570fef608e9f4`. Git compare against previous HEAD `ac1156edb5e5271a08a4f075dd2f1201ec752517` lists exactly two files: `.github/workflows/build-apk.yml` (one temporary push-branch filter removed) and `www/index.html` (one CSS line replaced). The app-code change itself is only that status-label rule.
- Restored the workflow push filter by removing `feature/dark-performance-ui-polish` after Build #210. `workflow_dispatch` remains. This prevents future app commits on this branch from silently starting APK builds; a new build requires an explicit user approval and deliberate workflow re-enable/trigger. Confirmed no workflow run was created for source commit `eaaada44a524df2f39ed6b447c4570fef608e9f4`; latest run remains #210.
- Exact updated source verification: GitHub HEAD equals `eaaada44a524df2f39ed6b447c4570fef608e9f4`; the new status rule occurs exactly once and the previous 9px rule is absent.
- Targeted Chromium / Playwright simulation used a representative 24-slot Collection IR fixture with the exact changed CSS rule and existing two-column grid/card styling. Tested 320×740, 360×800, 393×873, 432×915. All PASS: 24 slots, two columns, status 10px / #a7b4b6 / weight 600, status text fits, action controls remain, and no horizontal overflow. First card widths: 124px, 144px, 159.5px, 179px. Screenshot fixtures: `/mnt/data/ir-collection-ui-{320,360,393,432}.png`.
- Failed test attempt and correction (preserved): the initial exact-string assertion failed because the local fixture listed CSS declarations in a different order from the source. The fixture was corrected to match the committed rule exactly; all four Playwright viewport tests were rerun and passed. This was a fixture mismatch, not an app-source failure.
- Protected areas unchanged: `www/main.js`, `www/mg30-preset-import.js`, `www/mg30-preset-export.js`, transfer handlers, NAM/IR/Collection transfer code, preset import/export behavior, MIDI/SysEx mapping, signal-chain behavior and startup code. No JS or protocol code changed.
- `npm test`, Actions, Gradle/APK build and physical device tests were not run for UI Polish 02; this is a presentation-only CSS change and the user has not yet authorized its build.
- Current stop point: UI Polish 02 source and browser simulation are complete and documented. Ask exactly **“Build sekarang atau nanti?”**. Do not make a further source change or start an APK build until the user responds.
