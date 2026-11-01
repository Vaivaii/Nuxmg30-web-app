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
