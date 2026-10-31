# NUX MG-30 Studio — Preset Manager Redesign Plan

Date: 31 October 2026
Target device: **Original NUX MG-30 Gen 2, firmware 6.0.x** (not MKII)
Repository: `Vaivaii/Nuxmg30-web-app`
Dedicated branch: `feature/preset-manager-redesign`
Base commit: `c5a2ba998777dd8cb8601a7a7bd629ef97902f08`
Stable rollback build: Build #184 (restored Editor baseline; source code files were restored to the pre-redesign Build #155 baseline).

## Purpose

Redesign only the Presets page into an efficient hardware-style Preset Manager. Keep the Editor and all existing device workflows exactly as they are in the stable baseline.

## User's requested UI

- Page title: **Preset Manager**.
- Remove explanatory subtitle/description below the title.
- Put **Import** and **Export** actions in the title/header row.
- Hardware presets appear as one vertically scrollable list, resembling the MG-30's own preset browser.
- Each list item displays both the hardware slot and the preset's actual name, e.g. 28A TT Clean Single, 28B NAM TES, 28C TT DJENTE, 28D TT TV, 29A R.ACOUSTIC, 29B MK Shim Diy.
- All 128 hardware positions are represented (01A–32D).
- Make selected slot obvious and keep the page compact, consistent, and efficient.
- Avoid a cluttered layout. Keep draft/local preset management separate and unobtrusive.

## Non-negotiable preservation rules

**This is a UI-only project. Do not change any of the following to implement the Preset Manager:**

- Main Editor markup, state, render functions, startup sequence or initialization order.
- USB-MIDI / Native Android MIDI connection code, bridge, handlers, connection status or event wiring.
- MIDI CC mappings, controller mapping, or parameter encoding.
- NAM transfer implementation or payloads.
- IR User / Third Party import and transfer implementation.
- IR Collection catalog and Collection → User install/use behavior.
- Preset Import/Export binary protocol and serializer.
- Save-to-device, Copy Scene, scene readback, signal-chain order or CTRL/EXP.
- Existing storage behavior for drafts or the already-working workflows.

Do not implement a hardware-name scan by inserting new code into the main Editor startup path. That caused a prior regression where the Editor failed to render and USB-MIDI could not connect. The failure was not sufficiently diagnosed at runtime; treat that root cause as unresolved and avoid repeating the risky integration.

## Implementation approach

- Work only on `feature/preset-manager-redesign`; do not apply these changes to the stable branch.
- Prefer a separate page-scoped file/component such as `www/preset-manager.js` and isolated CSS selectors scoped to the Preset Manager container.
- Keep page initialization lazy and local to the Presets navigation. It must not gate, delay, or be a prerequisite for the main Editor rendering or USB-MIDI connection.
- If a Preset Manager script or UI fails, the error must remain contained to the Presets page and must not stop or break the Editor.
- Reuse already-established actions/bridges where possible; avoid modifying device protocol code to achieve a visual redesign.
- Any future read-only preset-name browsing must be separately designed and reviewed for MIDI transaction concurrency before implementation. Do not start a background scan on connection or while NAM/IR/Collection/preset transactions are active.
- Preserve readable progress, empty, disconnected, partial-scan and error states. Never invent preset names.

## Mandatory working protocol for this project

1. Make one small, reviewable logical code change at a time.
2. After every code change, update `UI_POLISH_CHECKLIST.md` in the same work cycle with:
   - date and summary of the change;
   - every file changed;
   - exact commit SHA(s);
   - what was deliberately left untouched;
   - test results, or explicitly say not yet tested;
   - next validation step.
3. **After each code change and its checklist update, stop and ask the user: “Build sekarang atau nanti?”**
4. Do not start GitHub Actions, Android/Gradle build, APK generation or CI build until the user explicitly answers **build sekarang**.
5. If the user answers **build nanti**, do not build; leave the source and checklist committed and wait for the next instruction.
6. If the user answers **build sekarang**, run tests/build for the current branch, inspect the exact run and artifact, download the artifact, extract the APK, and provide a direct `sandbox:/mnt/data/...` APK link in the conversation. The user should not need to open GitHub Actions.
7. Report build success/failure honestly. Never provide an old APK as if it contains newer code.
8. Persist each code change and decision in `UI_POLISH_CHECKLIST.md` and this plan so a new chat can resume without re-asking established requirements.

## Progress checklist

- [x] Create dedicated branch from stable recovery baseline.
- [x] Record UI requirements and non-negotiable preservation rules.
- [x] Record mandatory “code change → checklist update → ask build now/later” protocol.
- [ ] Design a Preset page layout proposal before touching code.
- [ ] Implement one isolated Preset Manager UI change.
- [ ] Update checklist and pause for the user's build decision.
- [ ] After approval, build and provide a direct APK download link.
- [ ] User verifies Editor and USB-MIDI still work.
- [ ] User verifies all 128 displayed slot names on the original MG-30 Gen 2.
- [ ] User verifies Import and Export actions.
- [ ] User verifies existing NAM, IR User/Third Party, Collection, MIDI mapping, Save, Copy Scene and CTRL/EXP workflows.

## Current state

No application code has been changed on this branch yet. Only this plan and the project checklist are being prepared. Do not build until the user has requested a code change and then explicitly selected “build sekarang”.


## Addendum — strict scope lock requested by user (31 October 2026)

The following restrictions override any broader interpretation of the earlier implementation plan.

### Absolutely do not modify these areas

1. **Preset Import and Export — completely off limits**
   - Do not edit Import preset UI, Import validation, Import bridge, Import packet sequence, Export preset UI, Export readback, Export bridge, serializers, parsers, file format, save picker, or related tests.
   - The existing Import/Export controls may be repositioned or visually restyled only if this can be done without changing their IDs, event wiring, JS modules, behavior, validations, transaction ordering or protocol. Prefer a visual wrapper/CSS around their existing controls.
   - Never refactor or “clean up” Import/Export code as part of this UI task.

2. **Movable Signal Chain — completely off limits**
   - Do not edit its markup, styling, DOM structure, drag/drop handlers, reorder algorithms, state, persistence, block ordering, touch gestures, event propagation, or supporting code.
   - Do not change shared CSS selectors or shared event handlers in a way that can affect movable signal-chain behavior.
   - Do not move or wrap signal-chain elements as part of the Preset Library redesign.

3. **All code outside the Preset Library tab — off limits**
   - Do not modify Editor, NAM & IR, Studio, Device, global app shell/header, bottom navigation, shared app startup, connection code, USB-MIDI/native Android bridge, global state, shared helpers, MIDI mappings, preset engine, Save-to-device, Copy Scene, CTRL/EXP, audio or other tabs.
   - Do not modify shared CSS selectors or global JavaScript functions if their scope can reach other tabs.
   - Only code whose sole responsibility is the Preset Library tab may be added or edited. Use isolated Preset Library-specific files/selectors and tab-local event handling.
   - If a required task cannot be done without changing something outside the Preset Library tab, stop and ask the user before editing it.

### Import / Export buttons in the header

The user's requested header Import and Export buttons are a presentation request, not permission to change transfer behavior:
- Reuse the current Import and Export controls/handlers as they exist.
- Move only their visual presentation inside the Preset Library tab, using the narrowest possible tab-scoped wrapper/CSS.
- Do not change their IDs or JS module files.
- If simply repositioning existing controls would require modifying transfer modules or protocol code, do not do it; report the limitation and ask first.

### Required review before each edit

Before changing any file, identify whether it is exclusively Preset Library code. If the file is shared (especially `www/index.html`, global styles, or a shared JS module), do not edit it automatically. First isolate the Preset Library markup/controller into a dedicated module or request approval for the minimal shared-file edit. Never touch the movable signal-chain region.

### Mandatory per-change checkpoint

After each small code edit:
- Update `UI_POLISH_CHECKLIST.md` with date, exact file names, summary, commit SHA, files/areas explicitly not touched, and test state.
- Update the project resume prompt/document if the latest stop point or instructions changed.
- Stop and ask exactly: **“Build sekarang atau nanti?”**
- Do not run tests that trigger CI/build, GitHub Actions, Gradle or APK packaging until the user explicitly chooses “build sekarang”. Local static checks/tests that do not package/build may be run only when they do not alter protected code.
