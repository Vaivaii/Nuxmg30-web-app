# Universal New-Chat Resume Prompt — NUX MG-30 Studio

Copy everything in this file into the first message of a new chat in the same ChatGPT Project.

---

You are continuing work in the project **nux mg30 reverse enginering**. Do not treat this as a new project. First recover the exact last state from the repository and checklist.

## 1. Project identity and target

- Repository: `Vaivaii/Nuxmg30-web-app`
- Active branch for the current UI task: `feature/preset-manager-redesign`
- Target hardware: **original NUX MG-30 Gen 2, firmware 6.0.x — NOT MG-30 MKII**.
- Stable Editor recovery baseline: Build #184; core UI/transfer source was restored byte-identically to the pre-redesign Build #155 baseline.
- Current task: redesign only the **Preset Library tab**, as a dedicated Preset Manager.

## 2. Mandatory resume procedure

Before doing anything:
1. Confirm the current branch and its HEAD commit.
2. Read `UI_POLISH_CHECKLIST.md` from the active branch, especially the latest dated section and any “current stop point”.
3. Read `docs/research/MG30_PRESET_MANAGER_REDESIGN_PLAN_2026-10-31.md`.
4. Read this file again if you need the full working contract.
5. Inspect the files/commits changed after the last recorded checkpoint.
6. Summarize the exact last completed work, current state, last commit, and next smallest action. Do not ask the user to repeat known project details or already-decided requirements.
7. Do not assume an APK exists for the latest code. Check the exact build run/artifact only when a build was explicitly approved.

## 3. User's requested Preset Manager UI

- Rename “Preset Library” to **Preset Manager**.
- Remove the explanatory subtitle.
- Put Import and Export actions in the header row next to the page title, but only visually reuse the existing controls and handlers.
- Present all 128 hardware slots (01A–32D) in one vertical scrolling list.
- Show each slot number and the actual hardware preset name, matching the MG-30's own preset browser.
- Clearly highlight the selected slot.
- Make the layout compact, coherent and efficient; local drafts should be secondary/unobtrusive.
- Do not invent preset names. If names are not available, represent that state honestly.

## 4. ABSOLUTE protected areas — never edit without explicit user permission

### Preset Import and Export
Do not change any Import/Export code or behavior:
- existing control IDs, event wiring, handlers or bridges;
- Import validation, SysEx/packet sequence, transfer ordering, timing or ACK handling;
- Export readback, metadata/waveform/curve retrieval, serializers, parsers or binary file format;
- native Android Save As/file picker behavior;
- tests or helpers tied to Import/Export.
The Import/Export buttons may only be moved visually inside the Preset Library tab by reusing the exact existing controls/handlers. If that cannot be done without touching protected code, stop and ask first.

### Movable Signal Chain
Do not touch any part of the movable signal chain:
- markup/DOM structure;
- CSS or shared styles affecting it;
- drag/drop and touch interactions;
- reorder algorithm/state/persistence;
- callbacks, event propagation or supporting code.
Do not move, wrap, rename or refactor signal-chain elements.

### Everything outside Preset Library
No edits outside the Preset Library tab:
- Editor page markup, rendering, state, initialization, startup or navigation shell;
- USB-MIDI/native Android MIDI bridge, connection logic, handlers and status;
- NAM and IR User/Third Party transfer or IR Collection catalog/install workflow;
- MIDI mappings, parameter encoding;
- Save-to-device, Copy Scene, CTRL/EXP;
- Studio and Device tabs;
- global/shared JS or CSS that can affect the above.
If a requirement cannot be achieved within the Preset Library tab only, stop and request explicit permission. Never broaden the scope by yourself.

## 5. Safe architecture

- Work only on `feature/preset-manager-redesign`. Never apply the experimental changes to the stable branch without explicit instruction.
- Prefer a dedicated module such as `www/preset-library-ui.js` and CSS namespaced to a dedicated Preset Library container.
- Do not insert page-specific setup into the Editor's main startup path.
- UI errors must remain isolated to Preset Library and must never block Editor rendering or USB-MIDI connection.
- Treat a shared file such as `www/index.html` as protected. Before editing it, isolate the exact minimal Preset Library-only insertion point; inspect and report the intended diff if it might touch other functionality.
- Do not start preset-name scans on USB connection. Any device read used to populate names needs its own design/concurrency review and user approval before code changes.

## 6. Mandatory change-by-change workflow

For every code change:
1. Make exactly one small, reviewable logical change.
2. Update `UI_POLISH_CHECKLIST.md` immediately in the same work cycle.
3. Record date, changed files, what changed, commit SHA, what was deliberately untouched, tests run/not run and next validation step.
4. Update this resume document if the current stop point or instructions changed.
5. Then STOP and ask the user exactly: **“Build sekarang atau nanti?”**
6. Do not run GitHub Actions, CI, Gradle, Android build, APK packaging or any workflow that creates a build until the user explicitly answers **“build sekarang”**.
7. If the user answers **“build nanti”**, do not build; preserve the committed source/checklist and wait for the next instruction.
8. If the user answers **“build sekarang”**, run tests/build on the active branch, inspect that exact run, download its artifact, extract the APK and provide a direct `sandbox:/mnt/data/<exact-file>.apk` link in the chat. The user must not have to navigate GitHub Actions.
9. Never give an older APK as though it contains the newest code. State the exact commit/build number and test status.

Documentation-only changes do not require an APK build; still record them in the checklist.

## 7. Preservation priorities

- Do not damage working NAM transfer.
- Do not change working IR User / Third Party import and Collection → User behavior.
- Do not change existing MIDI mappings.
- Do not change preset Import/Export.
- Do not change movable signal chain.
- Do not change Editor, USB-MIDI, Save, Copy Scene, CTRL/EXP or any other tab.

## 8. Current saved state at the time this prompt was created

- Dedicated branch created: `feature/preset-manager-redesign`.
- Branch setup and project plan are committed.
- Scope-lock addenda explicitly prohibit edits to preset Import/Export, movable signal chain and code outside Preset Library.
- Universal prompt file is stored at `docs/research/UNIVERSAL_NEW_CHAT_RESUME_PROMPT_PRESET_MANAGER.md`.
- No application code has been changed on this branch yet.
- No build has been run on this branch.
- Current next task: propose/review the Preset Library UI structure before the first isolated code change. Do not code until the user asks to proceed.
- After the first code change and checklist update, ask **“Build sekarang atau nanti?”** and wait.

## 9. What to say at the start of the new chat

Start by confirming the active branch, the last checklist entry/commit, and the exact next action. Then continue without asking the user to re-explain the project or the protected areas.


## 10. Latest user clarification — card design and two-way slot sync (31 Oct 2026)

The user supplied a TONEX-style preset-card screenshot as a visual reference only. Required MG-30 design:
- Vertically scrolling rounded preset cards.
- Slot number in a narrow left column (e.g. 00A), thin vertical accent divider, actual preset name prominent on the right.
- Minimal content only: slot number and preset name. No helper paragraphs, extra subtitles, categories, explanations or unrelated metadata.
- Header: Preset Manager title with Import and Export buttons at the top. The existing transfer behavior must be reused exactly.
- Clear selected-card highlight.
- Do not copy TONEX brand, tabs or navigation.

**Bidirectional device synchronization is essential:**
- Tap a card in the app → the same hardware slot is selected/synchronized on the MG-30, using the existing working slot-selection behavior.
- Change the slot directly on the MG-30 → the app's current slot and selected-card highlight must follow the hardware change.
- The card list is not a local-only visual list. App target, displayed slot, selected card and actual pedal slot must stay consistent.
- Reuse the existing device update/state pathway. Do not add Program Change polling, global event listeners, USB-MIDI handlers or Editor startup changes.
- If the existing Preset Library-only code cannot support pedal → app updates without editing protected global code, stop and ask permission. Do not silently broaden scope.
- No extra effect/block icons unless data is already available within the Preset Library's permitted scope.

The plan and checklist now contain this clarification:
- Plan commit: `01d1fcb812e36cab74bce3f2962a3b462aabee55`.
- Checklist commit: `6f9746c147ba7dad6f7b4454bc5f626f8a8dcbc2`.

## 11. Latest stop point

- Only documentation was updated after the branch setup.
- No application code has been changed.
- No tests or builds were run for this documentation-only clarification.
- Current next step: inspect the existing Preset Library-only slot-selection and device-to-app update pathway, then present an isolated design/implementation proposal. Do not touch protected code or start coding unless instructed.


## 12. Latest implementation checkpoint — Preset cards and two-way hardware selection (31 Oct 2026)

Current branch: feature/preset-manager-redesign.
Latest code commits:
- 2bada7b0359cc79526813762079d63cd29f00304 — new www/preset-library-ui.js.
- f0f99e65f1a3f02c8c0bfd7bb2f036907f0c4018 — new www/preset-library-ui.css.
- 2294e4a5cc86ea79db2bfc13e781e1585673d07c — Preset Library-only markup replacement and dedicated module/style attachment in www/index.html.
- 8747a6392b4314a9d7856a195c925041f92117c3 — name field minimum-byte validation.
- 3dcbd03ad7831275ab6d85504a8fa1c25353f012 — Export diagnostics visibility style correction.

Files changed for this implementation:
- www/index.html — the only markup replaced was #page-presets. One Preset Library-specific CSS link and one Preset Library-specific module script were attached. Original Import/Export IDs were preserved.
- www/preset-library-ui.js — isolated card list, local name cache, lazy stored-name reader, app-to-pedal card selection via existing selectHardwareSlot(), and pedal-to-app selected card via existing mg30-active-preset-changed event.
- www/preset-library-ui.css — selectors scoped under #page-presets only.

Behavior implemented:
- Minimal Preset Manager header with existing Import/Export controls at top.
- 128 vertically scrolling rounded cards; slot number at left, thin divider, preset name at right; selected slot is highlighted.
- Import file selection remains the existing control; after choosing a file, existing send button appears in a compact row.
- The list lazily reads missing preset names when the Preset Library tab is opened while connected. It uses existing readSysExPart(0x0B, program, 0), verifies returned program and part, decodes packed name slots 106–121, performs no Program Change and writes nothing. Cached names persist in localStorage and partial scan can resume on re-entry.
- App → pedal selection uses the existing selectHardwareSlot(program, false) path.
- Pedal → app selection follows the existing mg30-active-preset-changed event and existing slotLabel state; there is no second independent hardware-slot state.

Protection check:
- No changes to mg30-preset-import.js or mg30-preset-export.js; their IDs, logic and transaction behavior are preserved.
- No Movable Signal Chain changes.
- No Editor render/startup or USB-MIDI/native connection changes.
- No NAM/IR modules, MIDI mappings, Save, Copy Scene, CTRL/EXP, Studio or Device changes.
- No global CSS changes.
- This is a source-only update; there is no APK yet for these changes.

Validation state:
- Source diff manually reviewed; application-code changes are limited to the three files above.
- Automated tests NOT run. Android build NOT run. Hardware test pending.
- The Actions workflow does not auto-trigger for pushes to this new feature branch.

## 13. Mandatory current stop point

The first isolated card UI implementation and checklist update are complete. The latest checklist entry is authoritative. The assistant must now ask the user exactly: **Build sekarang atau nanti?**
- If user says Build sekarang: run tests/build for this exact branch head, inspect the Actions result, download and extract the matching APK, then provide a direct sandbox APK link in chat.
- If user says Build nanti: do not build. Leave code and checklist committed and wait for next instruction.
- Do not make another code change until the user chooses the build timing and gives the next instruction. Do not modify any protected area.

## 14. Latest follow-up — destination-first preset import (31 Oct 2026)

The user requested the following exact flow on the Preset Library tab:
- Tap Import → Android file manager opens → choose a `.mg30patch`.
- Tap a preset card to choose the destination slot.
- After the existing hardware slot selection resolves, show a native Cancel / OK confirmation.
- Cancel must send no import frames; OK runs the existing import.
- Add a small green **LIBRARY** eyebrow above Preset Manager.
- Remove the visible Draft lokal card/panel.

Implemented commits on `feature/preset-manager-redesign`:
- `9d0d751d13bf9b661b9ff43eae461fa6ea959dfa` — `www/index.html`: new Library label, removed visible draft panel, retained legacy draft IDs hidden so existing Editor render logic does not break.
- `3b7b3d4f2edb16d15f7a4106a1d2ea111ff35ebe` — `www/preset-library-ui.js`: dispatches `mg30-preset-library-target-selected` only after existing slot synchronization is reflected by `slotLabel`.
- `d62229841361c7e20d40a0e6ec88e39b668f1045` — `www/preset-library-ui.css`: fixes narrow vertical filename by stacking file/target info at full width; adds title styling.
- `cfd5b0ab896440806b4faf97e1bfbdc54b875e84` — `www/mg30-preset-import.js`: new sequence file validation → card selection → native Cancel/OK confirmation → existing import bridge call.

Critical boundary:
- The user has explicitly approved changing the **preset import interaction**, overriding the older blanket ban on changing its UI module.
- Do NOT change the binary parser, import plan builder, 78-step transaction sequence, IR User/Third Party resource transfer, device bridge, ACK/readback or underlying USB-MIDI packet logic.
- NAM, IR Collection mapping, MIDI mappings, movable signal chain, Editor startup/render, Save, Copy Scene, CTRL/EXP, Studio and Device remain protected and untouched.
- Hidden draft compatibility DOM IDs are intentionally retained because the existing Editor-side renderer queries them. Do not remove them without first refactoring that dependency with user approval.

Validation status:
- Source committed; automated tests and hardware validation pending.
- The old APK does NOT contain these latest changes.
- Test first on the original MG-30 Gen2 FW 6.0.x. Verify the Cancel path sends no import frames, then test OK on a safe destination slot.
- Current next step: update/check the build state, then ask the user exactly **“Build sekarang atau nanti?”** before producing an APK for this new commit set.

## 15. Build result for destination-first Import flow (31 Oct 2026)

Latest code commit: `cfd5b0ab896440806b4faf97e1bfbdc54b875e84`.

- GitHub Actions run #189, ID `41218768705`: **success**.
- Protocol regression test step: passed.
- Android debug build and artifact upload: passed.
- Artifact ID: `13048698907`.
- APK filename: `MG30_Studio_Preset_Manager_Import_Flow_cfd5b0a.apk`.
- APK size: 4,020,278 bytes.
- APK SHA-256: `1b4ce29cff32b478ea433cc78920c17125d59ffe761d76d9fdb42d1d95235101`.
- APK was extracted and the packaged JS/CSS checked for the destination-first import event, confirmation copy and updated Library styles.

Next step is physical verification on the original MG-30 Gen2 firmware 6.0.x. Test the Android file picker, select a destination card, Cancel (verify no import frames are sent), then OK on a safe slot and verify 78/78 ACK / readback. Recheck NAM transfer, IR User/Third Party, IR Collection and MIDI mappings. A successful CI build does not replace that hardware test.

## 16. Latest UI refinement — import progress modal and final-card clearance (31 Oct 2026)

Latest source commits on `feature/preset-manager-redesign`:
- `03ccd46539eab6aad02010d2c2e14956b7848770` — import progress/result dialog in `www/mg30-preset-import.js`.
- `ab3db2de0f1bbfbd3f5fbaeef255e61e8d6106e7` — scoped dialog styles and extra bottom scroll inset in `www/preset-library-ui.css`.
- `e7d3249f06166765dd8cc196e02ee810e134ba4b` — dialog markup and legacy draft IDs moved to the final child position in `www/index.html`.

Behavior:
- Import progress now appears in a modal with spinner, explanatory transfer text, current phase and ACK count out of 78.
- Escape/cancel cannot dismiss the dialog while the operation is in progress.
- Success result remains visible for 1.5 seconds, then closes automatically. Failure result is shown for 2.6 seconds, then closes automatically.
- The old persistent inline success box is cleared.
- Hidden Editor compatibility IDs `search`, `presetCount`, `newPresetBtn`, and `presetList` remain present and are the final hidden nodes in `#page-presets`.
- The Preset Manager card scroller has extra bottom/safe-area clearance for the last slot cards.

Preservation:
- Only Preset Manager markup, its page-scoped CSS, and the progress/result presentation in the Import UI module were changed.
- Parser, plan builder, `bridge.import(plan, ...)`, packet sender, transfer ordering, ACK/readback implementation and Export are unchanged.
- Movable Signal Chain, Editor/startup, USB-MIDI/native Android connection, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio and Device remain untouched.

Validation:
- Source-level inspection only; automated syntax/tests not run.
- No CI, Gradle, GitHub Actions or new APK build has been run.
- Build #189 is the previous build and does not include these commits.
- Physical verification on the original MG-30 Gen2 FW 6.0.x remains pending.

**Current stop point:** source and checklist are committed. Do not build until the user answers **Build sekarang**. Ask exactly: **Build sekarang atau nanti?**

## 17. Build result — Preset Manager import progress dialog (31 Oct 2026)

- User approved **Build sekarang**.
- Build workflow run **#190**, ID `41220763279`, successful.
- Build source commit: `7ce732bcaae87254d5893286ed168c3d162e0c2b` on `feature/preset-manager-redesign`.
- Protocol regression tests, Capacitor Android project generation, debug APK build and artifact upload all passed.
- Artifact ID: `13049299836`; ZIP size: 4,022,237 bytes.
- Extracted APK: `MG30_Studio_Preset_Manager_Import_Dialog_7ce732b.apk`.
- APK size: 4,400,648 bytes.
- APK SHA-256: `c222f563f4506e6ae201000f403e9059a496662b5a6eeb8fe86b0fcc4d83dd13`.
- APK package inspection confirmed the import dialog, ACK field, modal/spinner styles, success/error auto-close code, hidden legacy draft IDs after the card list, and safe-area scroll clearance.
- Direct APK path in the build conversation: `/mnt/data/MG30_Studio_Preset_Manager_Import_Dialog_7ce732b.apk`.

Physical verification on the original MG-30 Gen2 FW 6.0.x is still pending. Confirm that the modal progress appears, displays phase/ACK count and auto-closes; verify slot 32D can scroll fully into view; recheck Import/Export, NAM, IR User/Third Party, IR Collection, MIDI mapping and other protected workflows.

**Current stop point:** build #190 succeeded and APK was extracted/verified. Do not run another build unless the user requests it.

## 18. Latest user screenshot refinement — compact shared Import / Export feedback (31 Oct 2026)

Application commits on `feature/preset-manager-redesign`:
- `8972f7de1482b78902bbe5f235369c6d5b075b94` — compact shared dialog markup in `www/index.html`.
- `240e1dfe69b6cbf8f83e7f22b5290820b0f8190b` — smaller modal and scoped feedback CSS.
- `bc86d59464cda59ff294bd50959e2005fbe68cfa` — Export feedback observer in the Preset Library-only controller.
- `03dc4305c75ec821fa7e9a7508ef54666a5804f5` — fix Export progress-fraction parsing.
- `0b989421174b3352988f791870c322d4603bddd5` — concise Import copy and result dialog.

Behavior:
- After file selection, the single import panel shows the filename and **“Pilih slot tujuan.”** The duplicate valid-file green status panel is suppressed.
- Import feedback shows only the title and progress bar, retaining the warning not to close the application or disconnect USB. Success shows only **“Import selesai”** and auto-closes in ~1.05s; failure shows **“Import gagal”** and auto-closes in ~2.1s.
- Export progress, save completion, initial confirmation cancellation, Android save-dialog cancellation and failure are mirrored from the existing Export status node into the same modal. Result messages auto-close.
- Dialog width is reduced to 340px; phase, ACK count and technical transfer explanation are not displayed.
- Export progress fractions are read only from its existing status text.

Protection:
- `www/mg30-preset-export.js` is untouched; SHA remains `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- Import parser, builder, bridge call, packet/ACK/readback logic remain unchanged.
- Signal Chain, Editor/startup, USB-MIDI/native Android, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio and Device remain untouched.
- CSS changes are exclusively scoped to `#page-presets`.

Validation:
- Source assertions passed; no automated app tests, hardware tests, CI or APK build were run.
- Build #190 is an older APK and does not include this stage.

**Next isolated task:** increase only the Preset Manager card-list viewport so the scroll area reaches just above the fixed bottom navigation and the final card is fully visible. Keep the four hidden legacy draft IDs intact at the end of `#page-presets`; do not change the shared navigation or global CSS.

**Current stop point:** this stage is committed and recorded. Ask exactly **“Build sekarang atau nanti?”** and wait. Do not start another stage until the user's next instruction.

## 19. Video review — Export native picker transition and card viewport (31 Oct 2026)

User video `1001008546.mp4` showed that Export progress was still open during the native Android File Manager / DocumentsUI launch, causing the WebView progress modal and native picker transition to overlap/split. The existing Export status string `Memilih lokasi penyimpanan di File manager Android…` occurs immediately before the unchanged `savePatch()` call. The Preset Manager observer had treated this as another generic progress state.

Changes on `feature/preset-manager-redesign`:
- `f6baa478df7b4cf5bbf592808a4dceefc3d08f61` — `www/preset-library-ui.js`: close the Export web modal as soon as the existing status signals Android File Manager hand-off; clear its timer. After the native picker returns, existing unchanged status routing presents the brief success/cancel result modal.
- `cfcb379c3e89a1aa52dcea95ac3672d85e6e5d95` — `www/preset-library-ui.css`: set a mobile-only dynamic Preset Manager card-list height `min(720px, calc(100dvh - 280px))` at widths <=720px. This expands the internal list close to the fixed bottom navigation, while preserving card sizes and safe-area scroll padding.

Protection:
- `www/mg30-preset-export.js` is untouched; SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- Export readback, serialization, .mg30patch format, native bridge, File Manager Save As and cancel result remain unchanged.
- Import parser/plan/transfer, Editor/startup, global/shared CSS, Signal Chain, USB-MIDI/native Android connection, NAM, IR User/Third Party, IR Collection, MIDI mappings, Save, Copy Scene, CTRL/EXP, Studio and Device remain untouched.
- Only `www/preset-library-ui.js` and `www/preset-library-ui.css` changed from the preceding HEAD.

Validation:
- Static assertions passed for Export picker hand-off closure, success/cancellation outcome retention, and the page-scoped dynamic list height.
- No automated or physical tests were run.
- Build #191 succeeded on older commit `c4f0c0f560ab009a13a100a7576bc1fb74137a70`; it does not include these two changes.
- No new workflow, CI, Gradle or APK build has been started for this stage.

**Current stop point:** both targeted source changes and project notes are saved. Ask exactly **“Build sekarang atau nanti?”** and do not build before approval.

## 20. Screenshot clarification — Preset list fills space to bottom navigation (1 Nov 2026)

The user's actual requirement is to extend the 128-card list down to immediately above the fixed bottom tab navigation and display more complete cards at once. The Draft IDs must remain.

Root cause:
- `search`, `presetCount`, `newPresetBtn`, and `presetList` are in a `.hidden` container, and `.hidden` is `display:none!important`. They do not consume screen height.
- The previous list height cap `min(720px, calc(100dvh - 280px))` and 34px bottom padding caused the unused area shown in the screenshot.

Fix on `feature/preset-manager-redesign`:
- `cae96c435c1a23c000943560465e8cfe63c6f216` — `www/preset-library-ui.js`: measure card-list top against real `.nav` top and assign the available height. Recalculate on window/visualViewport resize, entering Preset Manager, and Import panel change. Only runs on visible mobile Preset Manager.
- `b71a5bfccf964977e3943beb88c51edb279b5767` — `www/preset-library-ui.css`: bottom card-list padding/scroll padding reduced to 8px and removed the fixed mobile max-height cap; CSS fallback stays local to the Preset Manager list.

Preservation:
- Hidden Draft IDs remain in `www/index.html`; no ID removal or markup movement.
- Shared `.nav` is only read for its bounding rectangle; its position/style is not changed.
- `www/mg30-preset-export.js` unchanged (SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`).
- No Editor/startup, Signal Chain, USB-MIDI/native Android, Import/Export protocol, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio, Device, global CSS or shared code was modified in this stage.

Build:
- Build #192 succeeded on the previous source before this dynamic measurement fix; artifact ID `13051745621`. The user screenshot showed it still left a gap, so it is not the APK for the current layout adjustment.
- Current measurement change has not been built or physically tested.
- No new workflow / CI / Gradle / APK build is running for this stage yet.

**Current stop point:** layout source and project notes saved. Ask exactly **“Build sekarang atau nanti?”**; do not build before user approval.
## 21. Preset Manager framed card collection (1 November 2026)

User wants the 128 preset cards grouped inside one dedicated surrounding frame/panel, rather than appearing flat as individual cards.

Implemented:
- www/preset-library-ui.css commit c464a2976561d174cb84df3625a09f7239a78ea6.
- The existing #page-presets .preset-library-card-list is now the frame itself; no extra wrapper node was added.
- Added subtle olive border, rounded 22px corners, dark gradient background, inset highlight and soft shadow.
- Inner frame padding is 12px top, 10px left/right and 8px bottom.
- Card dimensions, 11px gaps, internal scroll behavior and dynamic measured height to the bottom navigation remain intact.
- The previous viewport calculation still sizes the list from its top edge to the real top edge of the fixed .nav.

Preservation:
- Hidden Draft IDs search, presetCount, newPresetBtn, and presetList remain intact and hidden.
- Export implementation module unchanged; SHA 7959dea88d42f9433a9ddc06ed7198449e25ba52.
- No Import/Export protocol, native file manager, Editor/startup, Signal Chain, USB-MIDI, NAM, IR User/Third Party, IR Collection, MIDI mappings, Save, Copy Scene, CTRL/EXP, Studio, Device, global CSS or shared navigation changes.

Validation:
- Static source checks passed for frame styling, scrolling, dynamic viewport, hidden Draft IDs and unchanged Export module.
- No automated tests or physical Android visual verification run.
- Current frame and measured viewport source are not in any built APK yet. Build #192 is older and does not contain these changes.
- No CI or APK build has been triggered for this stage.

Current stop point: frame styling and project notes are committed. Ask exactly Build sekarang atau nanti? and wait for approval.
