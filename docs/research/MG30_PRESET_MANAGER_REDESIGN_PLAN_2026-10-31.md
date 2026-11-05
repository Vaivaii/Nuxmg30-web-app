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


## Visual reference and required two-way hardware synchronization (user clarification, 31 Oct 2026)

The user supplied a TONEX-style preset-card screenshot as a **visual reference only**. Do not copy its unrelated TONEX Plug/Mobile Device tabs, bottom navigation or branding. Apply the visual language to the existing MG-30 Preset Library tab only.

### Card appearance

- Use a vertical list of distinct, rounded preset cards with a dark background.
- Each card has a narrow left column containing the hardware slot label (e.g. `00A`, `00B`, `01A`) and a thin vertical accent divider separating it from the preset name.
- Show the actual preset name prominently on the right.
- Keep the card content minimal: no explanatory copy, subtitles, category descriptions, helper paragraphs, repeated status labels, or unrelated metadata.
- The overall page should show only the Preset Manager title/header, the Import and Export actions at the top, and the scrolling preset-card list. Temporary feedback may be shown only when a user operation needs it.
- Use a clear selected-card treatment (border/accent/background) so the current hardware slot is immediately obvious.
- Do not add block/effect icons unless their source is already available inside Preset Library without reading or changing protected tabs/protocols. Do not invent icons or preset metadata.

### Two-way slot synchronization — essential behavior

The preset cards are not merely labels. The existing hardware slot synchronization must remain bidirectional:

1. **App → pedal:** tapping a preset card selects that slot on the MG-30, using the existing, proven Preset Library slot-selection/synchronization behavior. It must not be replaced with a local-only selected state.
2. **Pedal → app:** when the user changes the hardware slot directly on the MG-30 (e.g. pedal moves to 02A), the app must receive the existing device-state update and move the selected-card highlight/current slot to 02A.
3. The app's selected slot, displayed slot label and actual hardware slot must remain consistent. Do not create a second independent slot state.
4. Preserve existing behavior for preset loading/sync into the app when a slot is selected, including whatever read/refresh flow currently works. Do not invent a new protocol.
5. Reuse the existing sync functions and event/state pathways. No new Program Change polling loop, USB-MIDI handler, global event listener or connection startup changes may be added for this redesign.
6. If the existing Preset Library tab does not expose enough information to implement device → app card selection without changing protected global/USB-MIDI code, stop and report the exact limitation. Ask the user before touching any protected code.

This bidirectional requirement is higher priority than visual convenience. A card list that only changes its highlight locally is not an acceptable implementation.


## Implementation checkpoint — first preset-card UI pass (31 Oct 2026)

### Files changed

- www/index.html: only the Preset Library section was replaced; a page-scoped stylesheet and dedicated Preset Library module were attached. All original Import/Export IDs remain in the section. No Editor/startup/USB-MIDI/Movable Signal Chain code was edited.
- www/preset-library-ui.js: new isolated controller renders 128 cards, reads/caches stored preset names using the existing 0B/00 read-only helper, and handles card selection and existing active-slot events.
- www/preset-library-ui.css: new scoped styles; every selector is under #page-presets.

### Interaction and protocol reuse

- App → pedal uses the existing global selectHardwareSlot(program, false) function.
- Pedal → app selected-card changes listen to the already-existing mg30-active-preset-changed event emitted by the app's existing persist/slot sync path.
- Active slot is read from the existing slotLabel display; the new module does not keep an independent slot variable.
- Name scanning runs only when the user opens the Preset Library tab and the existing export bridge reports connected. It does not start on USB connect.
- Name scan reads stored preset part 0 via existing readSysExPart(0x0B, program, 0), validates the returned program/part and reads packed name slots 106–121. It sends no Program Change and performs no write.
- The name scan stores partial progress in a page-specific localStorage key and can resume missing entries when the user reopens the tab.
- The scanner checks exposed in-progress flags for Import, Export and IR transfer, NAM reader dataset.busy, and active Save/Copy Scene status before proceeding.

### Import/Export and protected scope

- Existing Import and Export modules, IDs, validations, transaction ordering, serializers, parsers, binary format, readback, Android save picker and handlers are unchanged. Only their existing controls were repositioned inside the Preset Library UI.
- Movable Signal Chain remains untouched.
- Editor, USB-MIDI/native bridge, NAM/IR transfer modules, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio and Device remain untouched.
- No shared CSS file was edited; the new CSS file is dedicated to the Preset Library page.
- www/index.html is a shared host file, but its change is restricted to the Preset Library section and the dedicated stylesheet/module attachment points only.

### Commits

- 2bada7b0359cc79526813762079d63cd29f00304 — add Preset Library card controller.
- f0f99e65f1a3f02c8c0bfd7bb2f036907f0c4018 — add scoped card styles.
- 2294e4a5cc86ea79db2bfc13e781e1585673d07c — replace only Preset Library markup and attach page-specific files.
- 8747a6392b4314a9d7856a195c925041f92117c3 — validate name-field minimum bytes needed by the existing packed-name decoder.
- 3dcbd03ad7831275ab6d85504a8fa1c25353f012 — make existing Export diagnostics visible when its module opens them.
- Checklist checkpoint: d2b6c033e49bbaf4f9173e3e0f4eb5f4378eb21a.

### Validation / stop point

- Static source review completed. The application-code diff is limited to the three files listed above.
- Automated tests not run. Android build not run. No GitHub Actions workflow run was triggered for this feature branch.
- Physical test pending: connect original MG-30 Gen2 FW 6.0.x, open Preset Manager, allow stored-name scan to complete, verify example names from slots 28A–29B, tap a card and verify the pedal follows, change slot on pedal and verify selected card follows.
- Next: ask the user Build sekarang atau nanti? Do not start CI/Gradle/APK packaging without explicit Build sekarang approval.

## Follow-up implementation — Import destination selection and Library heading (31 October 2026)

The user explicitly requested a Preset Library import-flow adjustment. This is a narrow exception to the earlier blanket restriction on editing the preset Import UI module: the user has now authorized a change to the **interaction flow**, while the underlying import format/protocol/bridge remain protected.

### New user workflow

1. Tap **Import** in the Preset Manager header.
2. Android/WebView opens the existing file picker from the existing `input[type=file]`.
3. Select a valid `.mg30patch`.
4. Tap the destination preset card. The card uses the existing `selectHardwareSlot(program, false)` path; it is not a local-only target selection.
5. Once the existing slot label confirms the requested target, show the native confirmation dialog (Cancel / OK).
6. Cancel sends no import frames and retains the selected file. OK invokes the existing import bridge and plan.

### UI refinements

- Add small green **LIBRARY** eyebrow above the Preset Manager title.
- Remove the visible Draft lokal disclosure.
- Keep the legacy draft IDs inside a hidden compatibility container because the existing Editor renderer still queries those IDs during render/startup.
- Fix the import details row so the filename and target text are full-width stacked rows rather than a narrow one-character column.

### Implementation and commits

- `9d0d751d13bf9b661b9ff43eae461fa6ea959dfa` — `www/index.html`: Library eyebrow, hidden legacy draft nodes, and import-row markup.
- `3b7b3d4f2edb16d15f7a4106a1d2ea111ff35ebe` — `www/preset-library-ui.js`: dispatch destination-selected event after existing slot synchronization resolves.
- `d62229841361c7e20d40a0e6ec88e39b668f1045` — `www/preset-library-ui.css`: stacked full-width file and target display.
- `cfd5b0ab896440806b4faf97e1bfbdc54b875e84` — `www/mg30-preset-import.js`: file → slot card → Cancel/OK dialog → existing import bridge.

### Import preservation boundary

Only the user-facing sequence and confirmation gate changed. The following remain unchanged:
- `parseMG30SinglePresetPatch()` and `buildMG30SinglePresetImportPlan()`.
- Existing 78-step single-preset plan, IR resource routing to Third Party/User, three-scene preset write sequence, ACK and readback behavior.
- `MG30PresetImportBridge.import()`, native USB-MIDI handling and packet/frame transfer.
- Preset format/read/export modules.

NAM transfer, IR Collection behavior, MIDI mappings, signal chain and all other app pages remain untouched.

### Verification state

No source-level automated regression tests, Android build or physical pedal validation has been completed for these follow-up commits. Validate the Cancel path specifically to confirm no writes/frames are sent, then validate OK on a safe slot. Target remains original MG-30 Gen 2 FW 6.0.x, not MKII.

## Build verification — Import flow follow-up (31 Oct 2026)

- Application-code commit: `cfd5b0ab896440806b4faf97e1bfbdc54b875e84`.
- GitHub Actions run #189 / ID `41218768705`: success.
- Protocol regression tests, Capacitor Android generation, Android debug compilation and APK artifact upload all succeeded.
- Artifact ID: `13048698907`.
- APK: `MG30_Studio_Preset_Manager_Import_Flow_cfd5b0a.apk` (4,020,278 bytes).
- APK SHA-256: `1b4ce29cff32b478ea433cc78920c17125d59ffe761d76d9fdb42d1d95235101`.
- Build was triggered automatically by the existing push workflow for this branch. The packaged bundle was inspected and contains the new import destination event, confirmation text and Preset Library CSS.

Build success only confirms CI and packaging. It does not establish that the file picker, slot-selection event or actual hardware import works on the pedal. Physical validation remains mandatory on original MG-30 Gen2 FW 6.0.x, especially the Cancel path (no transfer frames) and the OK path (78/78 ACK and readback).
