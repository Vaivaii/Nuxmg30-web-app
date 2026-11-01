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

## 22. Preset Manager palette, compact card proportions and sync toast (1 November 2026)

User's latest screenshots compare Preset Manager with Editor and ask for a matching dark background palette, smaller/more proportional frame and cards, and no tiny synchronization text hidden below the list. Synchronization result should appear as the app's existing toast: selesai / gagal / ditunda.

Implemented on feature/preset-manager-redesign:
- www/preset-library-ui.css commit 2fc0fc0a92aac23fec87d9a50fbec4da5f4b3e12: changed the enclosing card frame to the same charcoal/blue-green tone as Editor panels; reduced frame radius/padding/gap and reduced card proportions (66px base, 62px mobile, narrower slot column, 3px divider and smaller label typography). Hides presetLibraryScanStatus only within the Preset Library.
- www/preset-library-ui.js commit 3d8635ff38ea33290bc9eb05427fbeb2ccb2b1a9: uses existing window.toast for concise 2.2-second outcome notices: “Sinkronisasi preset selesai”, “Sinkronisasi preset gagal”, and “Sinkronisasi preset ditunda”. No separate toast system or global CSS was added.
- If a device connects while Presets is open, existing mg30-midi-connected event starts the name scan. Existing scanPromise prevents concurrent scans. Disconnected/busy device is deferred; read error is failed; full completion is done.
- Background scan still uses the read-only stored preset path readSysExPart(0x0b, program, 0), its retry, name cache and card refresh.

Preservation:
- All four Draft compatibility IDs remain intact in the same hidden container.
- Dynamic measured card viewport to just above .nav remains intact.
- Export picker hand-off fix remains intact; www/mg30-preset-export.js unchanged SHA 7959dea88d42f9433a9ddc06ed7198449e25ba52.
- Import/Export protocol, Editor/startup, shared navigation, Signal Chain, USB-MIDI/native Android handlers, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio and Device untouched.
- Only www/preset-library-ui.css and www/preset-library-ui.js changed in this application stage.

Validation/build:
- Static assertions passed for palette, smaller cards, hidden scan status, all three toast outcomes, auto scan on connection event, retained Draft IDs and unchanged Export module.
- Build #193 succeeded for older base commit 134dc6dd731a49779ea6f60295e0abf814e2e7cb (artifact ID 13051943991); it does not include this new polish.
- No automated tests or physical UI check run for this stage. No build was run after current source changes.

Current stop point: code and project notes committed; ask exactly “Build sekarang atau nanti?” and wait for approval.
## 23. Preset Manager bottom fade / sinking-card edge (1 Nov 2026)

User asks for a soft bottom shadow/gradient so cards near the lower edge appear to sink/fade into the frame background instead of ending abruptly.

Implemented on feature/preset-manager-redesign:
- www/preset-library-ui.css commit 654f9029fdaf745de43765f791c25e5d1de829d7.
- Added #page-presets .preset-library-card-list::after as a 48px sticky bottom overlay inside the scroll container.
- Background gradient fades from transparent to the existing frame base (#101619), with a subtle upper shadow.
- pointer-events: none preserves direct card taps.
- No new wrapper/markup or card sizing/height measurement change.

Preservation:
- Editor-matched frame palette, compact cards and nav-measured card list remain in place.
- Four hidden Draft compatibility IDs remain.
- Import/Export UI and transfer protocols untouched; www/mg30-preset-export.js remains unchanged.
- Editor/startup, Signal Chain, USB-MIDI/native Android, NAM, IR User/Third Party, IR Collection, MIDI mappings, Save, Copy Scene, CTRL/EXP, Studio and Device untouched.

Build state:
- Build #194 succeeded for source commit a49bf650543b58d9b74de10d2a4568d78a96cc53, run ID 41228353932, artifact ID 13052363256, ZIP size 4,022,251 bytes. That artifact predates the fade overlay.
- The fade overlay has not yet been built or physically tested.
- No build has been triggered for commit 654f9029.

Current stop point: CSS source and project notes are committed. Ask exactly “Build sekarang atau nanti?” and wait for approval.
## 24. Extend Preset Manager bottom fade to the frame edge (1 Nov 2026)

User screenshot showed the bottom fade stopping above the frame bottom. The initial sticky overlay used bottom:0 and 48px height while list retained 8px bottom padding, leaving a visible gap.

Corrected only www/preset-library-ui.css in commit e392180c752ad9857cee8332df3930c8c61d5423:
- Sticky fade height increased 48px -> 56px.
- Sticky bottom offset set to -8px and margin-bottom -8px to extend across the list's bottom padding and visually meet the frame edge.
- Gradient ramp softened and final opacity increased to .99; border radius follows frame bottom.
- pointer-events:none retained so cards remain tappable.
- No markup, JS, scroll measurement, card dimensions, Import/Export logic, or other app areas touched.

Build #195 (run ID 41229602878) succeeded on commit dcd017b8384eee91b7d80d4a129bb21bf84adcc6; artifact ID 13053385990, ZIP size 4,022,403 bytes. It contains initial fade only, NOT the edge correction.
The e392180c correction has not been built or tested on device. Do not trigger CI/Gradle/APK until user explicitly approves.

Current stop point: ask **Build sekarang atau nanti?**.
## 25. Bottom fade precisely aligned with the frame sides and lower corners (1 Nov 2026)

The user screenshot showed that the previous fade ended slightly above the frame bottom and did not merge into the left/right inner edges.

Corrected www/preset-library-ui.css in commit d6040b9083f13159a958c6d684b501006df5532a:
- Sticky overlay is 64px high.
- Width is calc(100% + 16px), with -8px left/right margins covering the list's 8px inner horizontal padding.
- Added side-edge horizontal gradient plus vertical bottom fade.
- Gradient ends at the exact frame background color #101619 and uses 17px lower radius matching the frame's inner corners.
- pointer-events:none stays enabled so card selection works.
- Only CSS changed; no Import/Export protocol, HTML, JavaScript, scroll measuring, card sizes, nav, Editor, Signal Chain, MIDI, NAM or IR files modified.

Build state:
- Build #196 success (source commit 5e13dba57f37824f891fabdea93afc43767afa5c, run 41230174130) is the prior fade attempt and does not contain this correction.
- Build #197 was triggered automatically from exact commit d6040b9083f13159a958c6d684b501006df5532a, run ID 41230734572.
- At last check, dependencies were installing; follow run 41230734572 to completion and retrieve its artifact only after success.
- No second build should be started while #197 is running.
## 26. Isolate Preset Manager tab scroll and pin its footer above navigation (1 Nov 2026)

Screenshot diagnosis: NAM & IR and Presets were sharing the app document/root scroll position. Switching tabs inherited the scroll offset; the original global `MG30 Studio` footer is after all sections, so it appeared only when the entire app document reached the bottom. This is unrelated to hidden Draft IDs.

Implemented on `feature/preset-manager-redesign`:
- `www/index.html` commit `6ada04ac86f35885ed566c3dd2dd3b0c5c71e732`: added local `MG30 Studio` footer inside `#page-presets`, retaining the original global footer for other tabs.
- `www/preset-library-ui.js` commit `83838af09442e706e444e4a3c093165ed48a742d`: added Preset-only viewport controller. When Presets becomes visible on mobile, it measures `.top` bottom and `.nav` top and activates `body.preset-manager-active`; it clears the mode on page hide through a class MutationObserver. Removed the old list-height-only logic.
- `www/preset-library-ui.css` commit `0070b958a31ddaac0768057ff670a149306083a3`: positions only the visible Preset section fixed between header and bottom nav, flexes the card-list as its own scroll area, hides global footer only while Presets is active, and keeps its local footer just above nav.

Preservation:
- All four hidden Draft compatibility IDs remain unchanged in the existing hidden container.
- The shared nav and header are measured, not restyled or repositioned.
- `www/main.js` unchanged; `www/mg30-preset-export.js` unchanged SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- No Editor/startup, NAM & IR, Signal Chain, USB-MIDI/native Android, Import/Export protocol, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio or Device code changed.
- Git compare shows exactly three changed files: index markup for Preset-local footer, Preset UI controller, and page-scoped CSS.

Validation/build:
- Static checks passed for local/global footer presence, retained Draft IDs, fixed Preset-only viewport, header/nav measurement, independent card scroll and cleanup on tab hide.
- Build #197 succeeded on previous source d6040b9083f13159a958c6d684b501006df5532a (run 41230734572, artifact 13053622163; ZIP 4,022,454 bytes); it predates this change.
- No automated tests or physical Android checks run for this isolation change. Do not treat Build #197 as containing it.

**Current stop point:** source and project notes are committed. Ask exactly **“Build sekarang atau nanti?”**; no build until approval.
## All tabs independent scrolling / remove MG30 Studio footer labels (1 Nov 2026)

User explicitly authorized changing only www/ui-redesign.css and www/index.html to make each tab scroll independently and remove MG30 Studio footer labels, while preserving existing working functionality.

Implemented:
- www/index.html commit 9ee2a812404a1f4b2115bfbfee295086a4e8b83e: removed the Preset-local MG30 Studio footer and the original shared MG30 Studio footer. No section, nav, script or IDs changed.
- www/ui-redesign.css commit 6d671aa0dcb53bb613d173d1de0cc812636d4d3c: mobile app shell fixed to 100dvh with body scroll disabled; header remains in shell; bottom nav remains fixed; each visible page section becomes an independent flex scroller with overscroll containment; hidden pages are display:none and retain their own scroll positions; previous Preset-only fixed viewport is overridden so Presets uses the same model.
- Shared footer is removed from markup; no global footer label remains.

Scope verification:
- Git compare from base 437a9bfe57c808f04bdda55c369617c7f38e5a66 shows exactly two app files changed: www/index.html and www/ui-redesign.css.
- www/main.js unchanged SHA e2697b26e1d673be2002b8f1a085f12e9618b1de.
- www/preset-library-ui.js unchanged SHA 67ec75258620323492609dcdec559badfb769797.
- www/preset-library-ui.css unchanged SHA ce207d1b218366add1b4916225ee0eedb3a24d6d.
- www/mg30-preset-export.js unchanged SHA 7959dea88d42f9433a9ddc06ed7198449e25ba52.
- Four hidden Draft compatibility IDs are retained. No device protocol, USB-MIDI, Editor, Signal Chain, Import/Export, NAM/IR, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio or Device code touched.

Builds:
- Build #199 run 41233084907 at HTML-only commit 9ee2a812404a1f4b2115bfbfee295086a4e8b83e; it is not the full final source.
- Build #200 run 41233090589 at final combined commit 6d671aa0dcb53bb613d173d1de0cc812636d4d3c; this is the build to inspect and distribute.
- At note creation, automated checks/Gradle for #200 have not yet been validated; inspect its completion and artifact before giving a download link.
## Build #200 — independent tab scrolling release checkpoint (1 Nov 2026)

- Build #200 run 41233090589 completed successfully on source commit 6d671aa0dcb53bb613d173d1de0cc812636d4d3c on feature/preset-manager-redesign.
- npm test, Capacitor Android project generation, Gradle debug APK compilation, and artifact upload all passed.
- Artifact ID 13054292076; ZIP size 4,023,560 bytes.
- Extracted /mnt/data/MG30_Studio_Build_200_Independent_Tabs.apk, 4,401,596 bytes; SHA-256 4cae80dad35061272d001af0a30977d11a02a27f0a5993089ea990c3324cc107.
- APK archive integrity passed. Embedded index no longer contains either MG30 Studio footer markup; bundled CSS confirms the independent viewport/scroll rules and legacy Preset override.
- The APK changes only the two approved app files: www/index.html and www/ui-redesign.css. All feature code files remained unchanged.
- Physical Android test is still needed: scroll NAM & IR, open Presets and verify it retains its own scroll position; then test Editor, Studio and Device independently.
## Fix Build #200 regression — header position and Preset internal scrolling (1 Nov 2026)

Build #200 screenshots showed the NUX header displaced below a large blank area and the Preset list could not scroll.

Root causes addressed in `www/ui-redesign.css` commit `e636a666d4439fd0bc220c064a93be2d1b29ab87`:
- Pin `.app` itself to the viewport origin with `position:fixed; inset:0`; reset body to static while root overflow remains locked. This avoids stale/root-scroll offset moving the header down.
- Restore header to normal flex flow with no inset/transform.
- Keep each visible tab as its own flex scroll container.
- Make active Preset page a flex column with `overflow:hidden`; card list becomes the bounded `flex:1; min-height:0; overflow-y:auto` child. The old override had `display:block`, which defeated the card list's flex height.
- Keep bottom nav fixed.

Only `www/ui-redesign.css` was edited for this correction. `index.html`, `main.js`, `preset-library-ui.js`, `preset-library-ui.css`, and `mg30-preset-export.js` are unchanged. No MIDI/device/protocol/Editor/Signal Chain/NAM/IR logic was edited.

Build #201 automatically triggered from exact commit e636a666d4439fd0bc220c064a93be2d1b29ab87; run ID 41233822485. Monitor this build; its artifact supersedes Build #200 for layout fix. At the last note, dependencies were installing, later build stages pending.

Physical test after install: header returns to normal near top; Preset card list scrolls; switching tabs preserves each tab's own scroll.
## Build #201 successful — header and Preset scrolling recovery (1 Nov 2026)

- Build #201 / run `41233822485` succeeded from exact source commit `e636a666d4439fd0bc220c064a93be2d1b29ab87`.
- All checks passed: npm install, protocol regression tests, Capacitor Android generation, Gradle debug APK and artifact upload.
- Artifact ID `13055051632`, ZIP 4,023,993 bytes. Extracted APK `/mnt/data/MG30_Studio_Build_201_Fixed_Header_Scroll.apk`, 4,401,968 bytes.
- APK SHA-256 `a04cce7cc5523364b1f3fefb0d0409419a8ede399f23b91217d9772f18bf9b22`.
- ZIP integrity passed; APK recognized as Android package.
- Packaged bundle checks passed: fixed app viewport, independent tab section scrolling, Preset flex-column/internal card scroller, both footer labels removed, four Draft IDs retained.
- Physical Android validation pending. User should verify header returns to top, Preset list scrolls, and each tab retains its own scroll position.
## Cross-tab sticky headings, Device compact layout, non-Preset bottom fades and Export edge alignment (1 Nov 2026)

User wants top headings/actions to remain visible while each tab body scrolls: Editor's CTRL/EXP and Save-to-device, NAM title, Studio title and other tab titles. Device title/subtitle should disappear and its first content panel should sit closer to the app header. All tabs except Presets receive the same bottom fade ending at the top of bottom nav; Presets retains its own existing fade. Preset Export button right edge needs an inset.

Implemented CSS-only:
- `www/ui-redesign.css` latest SHA `d00872d708124046f5d826d5bbb0c0df800676ae`: sticky top headings/actions for Editor `.editor-topbar`, NAM `.nam-page-hero`, Studio `.studio-page-hero`, Backup `.hero:first-child`; sticky opaque/blurred header treatment per tab scroll container.
- Device first `.hero` hidden; Device section top padding 5px and USB audio panel margin top 2px.
- Adds 58px sticky bottom fade to `#page-editor`, `#page-nam`, `#page-studio`, `#page-device`, `#page-backup`, with base color #0b1012, side gutter extension, ends at the scroll area/nav boundary; pointer events disabled. Preset is intentionally excluded and retains existing card-frame fade.
- Global CSS changes originated in commit `08409b72e02e46bf88b13188090844a543e130ca`; Device first-panel selector corrected in `d1b9209722864aa16c4ca5a649a72bd17cb8730b`.
- `www/preset-library-ui.css` SHA `2f892e82d151ab82d7a98345ea871bc735e3818d`, commit `bd36d0f214615a5818317bd90da17ec47ae434c2`: header right padding 5px and action button box sizing/min width consistency to keep Export inset from the right edge.

Preservation:
- Git compare confirms only the two CSS files changed.
- `www/index.html` unchanged, `www/main.js` unchanged, `www/mg30-preset-export.js` unchanged.
- Editor control markup, MIDI/SysEx/USB audio handlers, Signal Chain, scene operations, Import/Export transfer protocols and Preset controller untouched.

Validation:
- Static checks passed for sticky selectors, Editor top action controls retained, Device title hidden and spacing adjusted, five non-Preset gradients, Preset gradient exclusion, Export inset and unchanged JS/HTML/protocol sources.
- No build or physical Android UI verification yet.

Current stop point: CSS source and project notes saved. Ask exactly **“Build sekarang atau nanti?”** and wait for approval.
## Device heading clarification — retain green DEVICE label and main title (1 Nov 2026)

User clarified that only the small descriptive subtitle beneath Device & Settings should be removed. The green DEVICE eyebrow must remain, and the main Device & Settings heading should stay but be slightly smaller. Keep header sticky and Device content close below.

Implemented only in www/ui-redesign.css, commit 95c9fb4d22a861ffa57ddafb64dd04ddf54b0b28:
- Device hero added to shared sticky heading selectors.
- Removed prior display:none rule on the whole Device hero.
- Hide only `#page-device > .hero:first-child p`.
- Retain green eyebrow and show Device & Settings heading at 23px, line-height 1.12.
- Existing Device top padding and USB panel 2px margin remain.
- No HTML/JS/function/protocol edits.

Static assertions passed. Android build run triggered by this CSS push; check the exact run and verify it before providing APK.
## Build #202 — corrected Device header (1 Nov 2026)

- CSS fix commit `95c9fb4d22a861ffa57ddafb64dd04ddf54b0b28` on feature/preset-manager-redesign.
- Build #202 / run `41235480866` completed successfully. Dependencies, protocol regression tests, Capacitor Android generation, Gradle debug APK and artifact upload all passed.
- Artifact ID `13055268057`, ZIP 4,024,455 bytes; extracted APK `MG30_Studio_Build_202_Device_Header_Correction.apk`, 4,402,360 bytes.
- APK SHA-256 `c21d602b8e7d66b952cfd9a1416dbab9dfd7f2e24191bf8692f5446e51af4d53`.
- ZIP integrity passed and APK recognized as Android package with APK Signing Block.
- Verified bundled HTML/CSS: green DEVICE eyebrow and Device & Settings heading retained; only the small explanatory paragraph is hidden; title size 23px; Device hero sticky. Other tab heading sticky selectors remain.
- `index.html`, `main.js`, and `mg30-preset-export.js` unchanged. No device/protocol/Editor/Signal Chain/Import/Export/NAM/IR function changed.
- Physical Android visual check still pending.
## Preset Export button fit + subtle bottom fades (1 Nov 2026)

User screenshots show the Export button clipped on the right and bottom fade on Editor/other tabs too strong with a visible edge line.

Implemented two CSS-only commits:
- `www/preset-library-ui.css` commit `11ecead956a222eb37003318516ff9f460846c3d`: mobile header right padding 12px, title flex/shrink enabled, actions group 6px gap with 5px right margin, buttons minimum width 62px / height 36px / padding 7px 9px / font 10px. Export pseudo-label retained; no markup or event handler change.
- `www/ui-redesign.css` commit `85f5de0f6f9e91b96d2fab63b3e442e8632c8c55`: non-Preset tab fade shortened 58px -> 32px, much lower alpha ramp and no hard box-shadow. Applies to Editor, NAM & IR, Studio, Device and Backup only; Presets keeps its existing frame fade.

Protection:
- Only the two CSS files changed.
- main.js SHA e2697b26e1d673be2002b8f1a085f12e9618b1de; mg30-preset-export.js SHA 7959dea88d42f9433a9ddc06ed7198449e25ba52; index.html SHA 75f32a4ed4a83b76596099e731acf8485f60bbb3 remain unchanged.
- No functions/protocol/MIDI/device/Editor/Signal Chain/Import/Export behavior touched.
- Static assertions passed. Physical phone verification pending.

Build #202 is an older APK and does not include these two CSS refinements. No manual build approval has yet been given for the latest CSS stage. Check recent Actions runs for any automatic path-triggered build.
## Latest UI refinement — Export fits, bottom fade reaches scroll boundary, Device header joined (1 Nov 2026)

User screenshots showed three defects after Build #204: Export still clipped, non-Preset fade did not reach the bottom edge, and Device sticky header was visually detached with USB panel content showing above/behind.

Fixes:
- `www/preset-library-ui.css` commit `6335984e7e15626ffa40a262d5706be9252449d3`: Preset mobile header explicit grid `minmax(0,1fr) 126px`; actions grid with two 60px fixed buttons, 38px height; title can shrink; both button IDs receive explicit width/min/max of 60px, overriding old min-width. Export pseudo-label retained; no handler/module touched.
- `www/ui-redesign.css` commit `4905efbafce0b6babe820464e8d42c77f9d33371`: non-Preset tab fade now ends at `bottom:0` with no negative bottom margin; 42px smooth gradient, no hard shadow. Presets excluded. Device hero is full-width, opaque app-background, sticky at top with z-index 45 and aligned negative top margin to cover underlying USB content while scrolling; eyebrow and heading retained, only subtitle hidden.

Only two app CSS files changed. `main.js`, `index.html`, and `mg30-preset-export.js` unchanged. No MIDI, SysEx, USB, Import/Export, Editor, Signal Chain, NAM/IR function code touched.

Automatic builds: #205 run 41274647488 includes intermediate button sizing only. #206 run 41274669130 is the authoritative build with both fixes; latest source commit 4905efbafce0b6babe820464e8d42c77f9d33371. At note time both in progress; wait/check #206 artifact only.
## Post-Build #206 correction — tested in browser before Build #207 (1 Nov 2026)

Screenshot defects: Export showed the full dynamic status string clipped; non-Preset fade did not reach the nav; Device sticky heading had a gap/sliver caused by page padding and negative sticky hero margin.

CSS fixes:
- `www/preset-library-ui.css` commit `5dc81d61cf70b8484b9f285c0fbd857d6d8a3a7e`: visually suppress the long runtime Export button text using font-size:0 and transparent color while retaining JS text/handler/aria. Existing ::after pseudo-label `Export` remains visible. Button grid remains 60px per control.
- `www/ui-redesign.css` commit `b400d9ab25f663a97b2535867f6475680f2efbd4`: Device scrollport padding-top 0; sticky hero margin top 0 and z-index100, solid background, aligned to section top. Non-Preset fades fixed at bottom64px/height42px, exactly where 64px bottom nav begins; Presets excluded.

Browser simulation BEFORE building:
- Basis: extracted Build #206 APK HTML and CSS; inline scripts preserved; 128 preset cards injected with the exact DOM structure used by preset-library-ui.js for layout testing. This is visual/layout simulation, not external JS protocol test or physical USB pedal test.
- Viewports 320x740, 360x800, 393x873, 432x915.
- Both buttons: 60x38px, actions 126px; header and actions overflow 0 and root horizontal overflow 0. Dynamic button DOM text remains; CSS hides it visually and pseudo content returns `Export`.
- Preset list overflow-y:auto; at 393x873 clientHeight 665px and scrollHeight 8968px; scrollTop=350 worked.
- Device: hero top=section top=80px; after Device scrollTop=260 hero stays fixed at 80px and top-edge hit-test belongs to hero, not card.
- Fade: nav top=808.95px, fade bottom=809px, 0.05px difference; no root horizontal overflow.
- Screenshots stored `/mnt/data/mg30-sim/validated-*.png`.
- Only two app CSS files changed. main.js, index.html, preset-library-ui.js and mg30-preset-export.js unchanged.

Build #207 auto-triggered AFTER successful simulation from commit b400d9ab25f663a97b2535867f6475680f2efbd4, run 41277953622. Protocol tests and Capacitor generation passed; Gradle build pending at record time. Use #207 artifact only after success.
## Build #207 validated APK — Export label, Device header and tab fade corrected (1 Nov 2026)

- Source commits: `www/preset-library-ui.css` `5dc81d61cf70b8484b9f285c0fbd857d6d8a3a7e`; `www/ui-redesign.css` `b400d9ab25f663a97b2535867f6475680f2efbd4`.
- Build #207 / run `41277953622` completed successfully from source commit `b400d9ab25f663a97b2535867f6475680f2efbd4`. npm/protocol tests, Capacitor, Gradle, and upload succeeded.
- Artifact ID `13071882537`, ZIP size 4,025,004 bytes. Extracted APK `/mnt/data/MG30_Studio_Build_207_Validated_UI.apk`, 4,402,812 bytes; SHA-256 `3833716ed0bbc7e0224ef7bd9afa6bf0005b1a389737fec8114ce9339391c810`.
- ZIP integrity passed. `file` recognizes an Android package with APK Signing Block; apksigner unavailable, so no signature verification beyond archive/package recognition.

Validated actual Build #207 package in Chromium using bundled HTML/CSS, inline page scripts and a 128-card DOM fixture matching the unchanged renderer:
- Viewports 320x740, 360x800, 393x873, 432x915.
- Export/Import each 60x38, action group width126, all header/action/root overflow measurements zero. Runtime long Export text remains in DOM but font-size0; CSS pseudo label is `Export`.
- Card list clientHeight665px / scrollHeight8968px at 393x873; overflow auto; scrollTop350 succeeded.
- Device hero exactly at section top80px and remains there after scrollTop260; top hit-test is hero, not USB card.
- Fade bottom64px, height42px; nav top808.95px and fade bottom809px (0.05px alignment); no document horizontal overflow.
- Verified screenshots under `/mnt/data/mg30-build207/verified-*.png`.
- These are browser layout simulations, not a physical Android/USB pedal test.

Only `www/preset-library-ui.css` and `www/ui-redesign.css` were modified. `index.html`, `main.js`, `preset-library-ui.js`, `mg30-preset-export.js` and all device/protocol function code are unchanged.

## Permanent rule — simulate and test every change until it passes (1 November 2026)

This rule is mandatory for every future application/source change on this branch, including tiny CSS, HTML, JavaScript, wording, one-line fixes, and follow-up corrections:

1. Before calling a change complete or asking whether to build, run a targeted simulation/test pass against the exact current working-tree/commit contents. Choose checks appropriate to the touched area (for example syntax/static assertions, protocol regression tests when relevant, and browser/UI simulation using the actual updated HTML/CSS/JS and realistic fixtures). Never validate a new change using an older APK or stale source snapshot.
2. If any check or simulation fails, do not stop at the failed result, do not mark the stage complete, and do not ask for build approval yet. Diagnose the failure, make the smallest safe correction within the approved scope, record the failure and correction, then rerun the relevant test/simulation against the corrected source. Repeat until the required checks pass.
3. Be honest and explicit about intermediate failures and what was corrected. Never hide a failed attempt, invent a passing result, or label an untested item as passed. The hand-off/completion report should emphasize the final passing result while retaining the failure/correction history in the checklist. If a check cannot be run for a clearly stated environmental or scope reason, record it as NOT RUN/BLOCKED; do not claim overall validation for that check or silently substitute an unrelated test.
4. After each individual source change and each correction, update `UI_POLISH_CHECKLIST.md` with: date; exact files changed; short change summary; commit SHA; protected files/areas verified unchanged; test/simulation name and method; source commit tested; pass/fail result; any failure diagnosis and correction commit; final rerun result; checks not run and why; next step. Keep every attempt as a dated record rather than overwriting history.
5. A source change made after a passing test invalidates that test for the changed source. Rerun the relevant checks on the new exact source before proceeding. Do not batch several untested edits and validate only an earlier intermediate state.
6. “Test/simulation passed” is not the same as a successful Android build or a physical MG-30 hardware test. Report each evidence level separately. Browser simulation cannot be described as physical Android/USB-MIDI/pedal validation.
7. Build approval remains a separate gate: do not trigger GitHub Actions/CI, Gradle, APK packaging or a new APK until the user explicitly says **Build sekarang**. “Build nanti” means no build. When build is authorized, verify the build against the exact tested HEAD; if the workflow/build fails, disclose the failure, diagnose/correct within scope, rerun the test loop and the authorized build until it succeeds. Never distribute an older APK as the latest.
8. Documentation-only updates do not require an Android build, but they must still be committed and recorded accurately. Use a skip-CI commit marker when appropriate to avoid triggering a build from documentation-only changes.

**Completion gate:** no source-change stage may be handed off as complete while a required simulation/test is failing or has not been rerun after the final correction. Report limitations honestly; never manufacture success.

## Latest icon-only UI change — Device navigation USB glyph (1 November 2026)

- User authorized only the bottom Device-tab icon replacement; do not make any other visual or code change before user review.
- Chosen symbol: Lucide `usb` outline, because Device contains USB-MIDI and USB audio settings. Official reference: https://lucide.dev/icons/usb.
- Source commit: `082c320e847b5cabdf50c7a4802e73cf14a08242`; only `www/index.html` changed, exactly one SVG inside `button[data-page="device"]`. Existing wrapper, button, page identifier, accessible-hidden treatment, label `Device`, sizing/stroke CSS, other four tab icons, and all behaviors remain untouched.
- Targeted browser simulation against exact commit `082c320e847b5cabdf50c7a4802e73cf14a08242`, using the extracted actual bottom-nav markup and unchanged `www/ui-redesign.css`: Chromium/Playwright sizes 320×740, 360×800, 393×873, 432×915; all passed (five tabs intact, Device label unchanged, SVG 23×23, responsive fit, bottom alignment, correct inactive/active colors, visible icon pixel check).
- Test harness issues and corrections are fully recorded in the latest `UI_POLISH_CHECKLIST.md` entry: Chromium file URL/CLI trouble switched to Playwright `page.set_content`; corrected expected SVG element count from 9 to 7; corrected pixel sampling to derive the SVG's real bounding box. Final rerun passed all four sizes.
- No npm test, CI, Actions, Gradle or APK run (not authorized); no physical Android/pedal validation claimed.
- Latest checklist includes the full failure → diagnosis → corrected test → passing rerun record. The one-change-per-stage and mandatory test-until-pass rule still applies.
- **Current stop point:** icon-only change recorded. Ask exactly **“Build sekarang atau nanti?”**; do not make any other source change unless the user gives the next instruction.

## Latest build — Build #208 USB Device navigation icon APK (1 November 2026)

- User approved **Build sekarang**.
- GitHub Actions run #208 / ID `41279514428`, built exact source commit `082c320e847b5cabdf50c7a4802e73cf14a08242`; workflow conclusion success.
- Protocol regression tests passed; Capacitor Android generation / USB audio plugin install passed; Gradle debug APK build and artifact upload passed.
- Artifact ID `13073015721`, ZIP SHA-256 `3f3ebe6fb9a1204b26469001fb766b1c906abd4663f61bb3dee028617aaf32dc`, ZIP integrity passed.
- Extracted current APK: `/mnt/data/MG30_Studio_Build_208.apk`, 4,402,840 bytes, SHA-256 `a798ef248e14d1054afe6a7994c63a175b8e5f8a168add9327eb788f32625970`. It was identified as an Android package with Gradle app metadata and APK Signing Block. `apksigner` unavailable; cryptographic signature verification not run.
- This supersedes Build #207. Do not provide Build #207 as latest.
- Icon browser simulation passed four mobile widths; workflow protocol tests and Android build passed. No physical phone/MG-30 test claimed.
- Full build evidence also recorded in `UI_POLISH_CHECKLIST.md`.

## Latest UI change — Device bottom tab multi-effects pedal icon (1 November 2026)

- Replaced only the SVG in `button[data-page="device"]` within `www/index.html` with a compact multi-FX processor pictogram (enclosure, display, three controls, two footswitches). Kept Device label, button, wrapper, size/color CSS, the other navigation icons and all functions unchanged.
- Source commit: `7dc18bd497684eb7eef75a98e7b5d17f9f74b31d`. Git diff changes exactly one file / one SVG.
- Targeted browser simulation against this exact source with Playwright `page.set_content` passed at 320×740, 360×800, 393×873 and 432×915. Five tabs intact, Device label unchanged, icon 23×23, active lime color correct, no horizontal overflow, nav bottom aligned. Screenshots: `/mnt/data/device-nav-multifx-{320,360,393,432}.png`.
- Initial `file://` navigation blocked by container policy; switching to `page.set_content` fixed the test harness and final simulation passed. Full history in checklist.
- Protected files verified unchanged: `main.js`, `ui-redesign.css`, Import and Export modules. No Editor / Signal Chain / USB-MIDI / NAM / IR / mapping / Studio / Device behavior changed.
- User explicitly approved an immediate build and requested that every APK be extracted and placed directly in chat. Workflow #209 / run ID `41281944052` was triggered from source commit `7dc18bd497684eb7eef75a98e7b5d17f9f74b31d`; status was in progress at note time. Wait for exact run #209 artifact only; never send Build #208 as the new result.
- Latest checklist contains source scope, test results, failed test-harness attempt / correction and pending workflow. After successful build, update both documents with artifact ID, run conclusion, ZIP integrity, extracted APK path, size and SHA-256.

## Latest APK — Build #209 Device multi-FX processor icon (1 November 2026)

- Build #209 / GitHub Actions run ID `41281944052`; exact application source commit `7dc18bd497684eb7eef75a98e7b5d17f9f74b31d`; conclusion success. All workflow steps passed: dependency install, protocol regression tests, Capacitor Android generation / USB audio plugin install, Gradle debug APK and artifact upload.
- Artifact ID `13073289470`, ZIP size 4,025,041 bytes, SHA-256 `8d8f08b96f675db411434392cf28af9296850983a0cb96a48b78582d3aaa8eb3`; downloaded ZIP integrity passed.
- Extracted latest APK: `/mnt/data/MG30_Studio_Build_209.apk`, size 4,402,848 bytes, SHA-256 `b20d2d54dfa616502e888564bd06e13db7951878b8ca9ce62773071297b13651`; APK archive integrity passed. Package contains the expected multi-FX SVG in `assets/public/index.html`, one Device nav button and one Device label.
- APK is newer than Build #208 and supersedes it. Use Build #209 as latest. Direct sandbox link is in the build delivery message.
- Pre-build UI simulation passed for 320×740, 360×800, 393×873, 432×915. Protocol regression tests and Android build passed. Physical Android / MG-30 test not claimed. `apksigner` unavailable; cryptographic signature verification not run.
- Full logs / source file scope / checks are in `UI_POLISH_CHECKLIST.md`.

## Current active workstream — separate Dark Performance 2.0 visual branch (1 November 2026)

**Important branch switch:** For the new cross-tab UI polish work, the active branch is now `feature/dark-performance-ui-polish`. Do not continue the new visual work on `feature/preset-manager-redesign`.

- New branch was created from the exact latest preserved `feature/preset-manager-redesign` HEAD `cd9fcf2daf09a143edcb895b8d11275d8f1aaaf3`, which carries Build #209 and the multi-effects Device icon. The prior branch remains untouched as the reference / recovery point.
- Visual direction approved by user: **Dark Performance 2.0** — preserve the current near-black / charcoal background, graphite panels, subtle blue-grey borders, lime-green accents, outline icons, five-tab navigation and current MG-30 Studio identity; improve spacing, hierarchy, density, consistency and polish. It is refinement, not redesign.
- Dedicated plan: `docs/research/DARK_PERFORMANCE_UI_POLISH_PLAN_2026-11-01.md` (commit `5d7834fe1f6bfbf985875015c662db9e6fd26dbd`).
- User's screenshots are the primary visual reference. Planned visual-only areas: Editor; NAM & IR; Collection IR; Preset Manager; Studio; Device. Choose one isolated change at a time.
- Hard boundaries: do not alter Editor behavior/startup; USB-MIDI/native Android connection; NAM/IR/Collection transfers; Preset Import/Export behavior/protocol; MIDI/SysEx mapping/packet behavior; Movable Signal Chain/drag-drop/order; Save, Copy Scene, CTRL/EXP; Studio/Device services, capture pipelines, shared state or app startup. Avoid global CSS/shared JS. Ask before touching a protected/shared area or if the change is not demonstrably presentational.
- Preserve Build #209 multi-FX Device icon. No app code has been edited on the new branch yet.
- Current HEAD contains only branch setup and documentation so far. `UI_POLISH_CHECKLIST.md` has the branch checkpoint. No build or CI was triggered.
- Next: review the UI source/screenshot layout for the first smallest visual-only improvement, report the proposal, then wait for explicit approval before changing source.
- Continue mandatory workflow: one small change → test/simulate exact source until passing → record all attempts and commit SHA in checklist → update resume → ask **“Build sekarang atau nanti?”**. Upon build approval, immediately verify run, download artifact, extract APK and deliver direct sandbox link.

## Dark Performance UI polish — UI change 01 complete (1 November 2026)

- Active branch: `feature/dark-performance-ui-polish`.
- First visual refinement completed on Editor: Scene 1–3 label fonts increased 10px → 11px and descriptions Clean/Rhythm/Lead 8px → 9px, using only the page-scoped rules under `#page-editor .main-editor-card .scene-button` in `www/ui-redesign.css`.
- Exact source commit tested: `54ae2c69dbe59d011457ecd8a8dfd80c49a29dba`. Only one file changed: `www/ui-redesign.css` (2 additions / 2 deletions). Git compare confirms no other app files changed.
- Targeted Chromium/Playwright test from existing `renderSceneButtons()` markup and relevant scoped styles passed 320×740, 360×800, 393×873, 432×915. All three cards remain in one row; text fits; selected highlight remains; no horizontal overflow.
- Initial local-file `page.goto(file://...)` was blocked by container policy; switched to Playwright `page.set_content()` and reran all four tests successfully. Exact failed attempt and correction preserved in `UI_POLISH_CHECKLIST.md`.
- Verified untouched: `www/index.html`, `www/main.js`, `www/mg30-preset-import.js`, `www/mg30-preset-export.js`; no Editor handlers, Copy Scene, Signal Chain/drag-drop, USB-MIDI, NAM/IR, preset transfer, MIDI/SysEx or startup code changed.
- Checklist contains full source SHA, test method, viewport measurements, failure/correction history, and next step. Dedicated plan also updated.
- No npm test, Actions, CI, Gradle, APK build or physical device test. This is a visual-only CSS stage.
- Current stop point: UI polish 01 complete. Ask exactly **“Build sekarang atau nanti?”**. Do not edit the next component until that build decision is received; then continue one small change at a time.

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



## UI Polish 03 — Isolated Collection IR scroll frame (1 November 2026)

- User request: put the Collection IR column inside a frame like Preset Manager so scrolling the 24 slots does not move the other menus; only the Collection IR slot list itself should scroll.
- Active branch: `feature/dark-performance-ui-polish`.
- Implementation follows the existing Preset Manager pattern: the NAM & IR page is fixed between the measured shared app header and bottom navigation while the tab is active; the page is clipped; only the Collection IR slot grid receives vertical scrolling with `overscroll-behavior: contain` and `-webkit-overflow-scrolling: touch`.
- The Collection card heading, sync/hide buttons, current-preset note, footnote, transfer status, NAM & IR title and shared navigation remain outside the scrollable grid. The 24 slot cards remain in the existing 2-column mobile grid (and existing 4-column layout at widths >=680px). Other tabs return to their normal layout when NAM & IR is hidden. Widths >720px do not activate mobile scroll isolation.
- Source commits:
  - Initial controller insertion: `a9ca2e3e275c9a293a80ec93d74d84abfdfde8ae`. Static source review caught a temporal-dead-zone risk before test execution: `grid` was declared after the first viewport sizing call.
  - Correction: `09b8100400bd0a1a426b43c4e3c7db37f2723afc`. Moved `fileInput`, `userButton`, and `grid` references before the viewport controller's first sizing call. No runtime test was run against the intermediate faulty ordering.
  - CSS frame/scroll implementation: `0f9a1b883d038046e8d28dae3a1eac6e328f114e`.
- Exact final app source tested: HEAD `0f9a1b883d038046e8d28dae3a1eac6e328f114e`.
- Compare from previous documentation HEAD `cd9489f94e93bb4a741b7ac33a669e690530f4af` shows only two app files changed: `www/ir-transfer.js` (33 additions; the existing variable declaration was moved before the inserted viewport controller) and `www/ui-redesign.css` (111 additions). The `ir-transfer.js` change is limited to the viewport controller and UI element references; no IR transfer/packet/parser/CRC/ACK routine was modified.
- Browser test: Chromium / Playwright via `page.set_content()`; fixture based on the actual page markup and generated Collection IR card structure in `www/ir-transfer.js`, with the exact committed viewport controller and CSS rules. Used 24 representative slot cards and the shared top header / fixed five-tab navigation.
- Viewports all PASS:
  - 320×740: grid client height 149px, scroll height 1401px, 2 columns.
  - 360×800: 223px / 1401px, 2 columns.
  - 393×873: 327px / 1401px, 2 columns.
  - 432×915: 369px / 1401px, 2 columns.
  - 680×900: 358px / 705px, 4 columns (existing responsive breakpoint).
  - 768×1024: mobile isolation correctly disabled; normal desktop document flow remains unchanged.
- Assertions PASS on mobile: NAM & IR page becomes fixed between measured header and nav; page overflow is hidden; the only scrollable descendant in the Collection view is `#irManagerCollectionGrid`; mouse-wheel gesture inside the grid advances its scrollTop; wheel gesture over the fixed Collection header does not move the grid or document; header, page headings, Collection card heading, and bottom nav retain their positions; document scrollTop stays 0; no horizontal overflow; no uncaught JavaScript errors; switching away from NAM & IR removes the active body class and the dynamic top/bottom CSS properties.
- Visual preview: `/mnt/data/ir-collection-scroll-393.png` (393×873 fixture screenshot, taken after scrolling inside the slot grid).
- Protected files/areas verified unchanged at final HEAD: `www/main.js` SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`; `www/mg30-preset-import.js` SHA `e2490e6df3f5f32853743fc5eb29c99cc4026ea8`; `www/mg30-preset-export.js` SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`; `www/index.html` SHA `7947eac23fa6e28a208d5a7589e742575a22444c`; `www/preset-library-ui.css` SHA `1be19a3d4e7ce617f5662c6e164b3d79fa770bf7`; `www/preset-library-ui.js` SHA `67ec75258620323492609dcdec559badfb769797`. Existing NAM/IR Collection import flow, file validation, transfer frames, MIDI/SysEx mapping, preset encoding/import/export, Signal Chain, and app startup logic were not edited.
- `npm test` was not run because this stage changes only viewport/layout behavior; the existing preset-format/read tests exercise unrelated serializer/parser code and were not altered. No GitHub Actions, CI, Gradle, APK build, physical Android test, or MG-30 hardware test was run. A new build still requires explicit user approval.
- Current stop point: UI Polish 03 source and browser simulation are complete and recorded. Ask exactly **“Build sekarang atau nanti?”**. Do not start Actions/CI/Gradle/APK or make another source change until the user responds.



## Approved APK build — UI Polish 03 (1 November 2026)

- User explicitly approved building the APK for UI Polish 03 (isolated Collection IR slot scrolling).
- Build run #211 / ID `41286541498`: in_progress; conclusion `null`. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41286541498
- Trigger commit: `17927754a2efd0985ec2295b18ab0c429d094630` (temporarily enabled push trigger for `feature/dark-performance-ui-polish`).
- Manual build gate restored immediately after trigger with `[skip ci]` commit `b56ea60e02ae22279db8a7a950b8a9ef2fb32362`; branch push trigger is absent again, `workflow_dispatch` remains.
- UI source tested in browser and included in the trigger commit: `0f9a1b883d038046e8d28dae3a1eac6e328f114e`.
- Current step summaries: [{"name":"Build debug APK","status":"in_progress","conclusion":null,"steps":[{"name":"Set up job","status":"completed","conclusion":"success"},{"name":"Checkout","status":"completed","conclusion":"success"},{"name":"Set up Node.js","status":"completed","conclusion":"success"},{"name":"Set up Java","status":"completed","conclusion":"success"},{"name":"Install JavaScript dependencies","status":"completed","conclusion":"success"},{"name":"Run protocol regression tests","status":"completed","conclusion":"success"},{"name":"Generate Capacitor Android project and install USB audio plugin","status":"completed","conclusion":"success"},{"name":"Build debug APK","status":"in_progress","conclusion":null},{"name":"Upload APK artifact","status":"pending","conclusion":null},{"name":"Post Set up Java","status":"pending","conclusion":null},{"name":"Post Set up Node.js","status":"pending","conclusion":null},{"name":"Post Checkout","status":"pending","conclusion":null}]}]
- Artifacts currently listed: [].
- Do not report APK complete or offer a download until the run concludes successfully and the artifact is downloaded, extracted, and verified. Continue polling run `41286541498`.



## UI Polish 03 — Collection slots restored after scroll-frame regression (1 November 2026)

- User reported that Collection slots disappeared in the installed build (screenshot showed the NAM import panel and TONE3000 above the Impulse Response heading, while the 24-slot Collection grid was clipped below the fixed viewport).
- Root cause: the previous mobile frame fixed the entire `#page-nam` and applied `overflow:hidden`, but the same page still contained the NAM import and TONE3000 panels before `#ir-import-content`. Those preceding panels consumed the fixed height and pushed the Collection card outside the visible frame.
- Source fix commit: `a66f87e83ff47eb8b7031285dd3bd42db9a78da1` on `feature/dark-performance-ui-polish`.
- Added two internal workspaces: **NAM / TONE3000** and **IR COLLECTION**. The first retains the existing NAM and TONE3000 panels in their own scrollable pane; the second gets the available viewport and keeps only the 24-slot grid vertically scrollable. First-open default is IR COLLECTION; the selected workspace is remembered locally.
- Late-mounted direct children of `#page-nam` are moved into the NAM/TONE3000 pane by a child-list observer; the existing panel nodes and their event handlers are moved, not recreated.
- Responsive fixture simulation passed at 320×740, 360×800, 393×873, 432×915, and 680×900: all 24 slot nodes present; Collection grid heights 249–424px; grid scrollHeight 1905px; setting grid.scrollTop did not move document.scrollTop; toggling to NAM pane restored the NAM content pane. At 768×1024 the fixed mobile frame is disabled and desktop normal flow remains.
- JavaScript syntax parse check passed after removing ESM export declarations for parser compatibility.
- Change scope is limited to `www/ir-transfer.js` (workspace UI mounting/layout controller only) and `www/ui-redesign.css`. Transfer packet generation/sending/ACK, Collection/User command routing, NAM, preset import/export, main app/MIDI mapping, and `www/index.html` were not changed.
- Protected file SHAs remain unchanged:
  - `www/main.js`: `e2697b26e1d673be2002b8f1a085f12e9618b1de`
  - `www/mg30-preset-import.js`: `e2490e6df3f5f32853743fc5eb29c99cc4026ea8`
  - `www/mg30-preset-export.js`: `7959dea88d42f9433a9ddc06ed7198449e25ba52`
  - `www/index.html`: `7947eac23fa6e28a208d5a7589e742575a22444c`
  - `www/preset-library-ui.css`: `1be19a3d4e7ce617f5662c6e164b3d79fa770bf7`
  - `www/preset-library-ui.js`: `67ec75258620323492609dcdec559badfb769797`
- Build #211 (run ID `41286541498`, artifact `13075337014`) succeeded but contains the earlier clipped-layout version. Do not give that APK to the user as the fix.
- The corrected source has NOT yet been built into a new APK or verified on the user's Android device. Await explicit approval before starting a replacement APK build. Ask: **Build sekarang atau nanti?**


## Conversation resume checkpoint — Collection slots missing on Android (1 November 2026)

- User reported “Slotnya malah hilang” with a mobile screenshot: NAM import and TONE3000 panels occupy the fixed page; the Collection grid is clipped below the viewport.
- Root cause: the mobile frame fixed the entire `#page-nam` and hid overflow while NAM/TONE3000 panels still preceded the IR manager. The earlier layout fixture did not represent the complete page composition.
- Corrective source commits on this branch:
  - `d8581446216f433352f8af8b8e27a544a8da1fd1`: split into NAM / TONE3000 and IR COLLECTION workspaces; move existing panel nodes rather than recreate them; persist workspace selection; allocate mobile viewport to the active pane and isolate slot-grid scrolling.
  - `25e0afe6988084746351eecdcdf8366d2733352f`: remove duplicate viewport-controller tail.
  - `a66f87e83ff47eb8b7031285dd3bd42db9a78da1`: clean obsolete comments. Source branch was verified at `dbcb043035ef46d52437308da00981eff7795bde` before this documentation update.
- Current `www/ir-transfer.js` syntax check passed after stripping ESM export declarations. This is not an Android/WebView runtime test.
- Previous fixture results belong to the old layout and do not validate the final two-workspace implementation. Re-run a browser fixture against the full page structure (hero, NAM import, TONE3000, workspace tabs, IR manager and 24 slots). Check default IR COLLECTION, NAM/TONE3000 access, grid-only scrolling, and desktop normal flow.
- Source scope is `www/ir-transfer.js` and `www/ui-redesign.css`. No IR transfer packets, NAM transfer, Collection/User protocol routing, MIDI/SysEx mappings, preset import/export, or main app logic were intentionally changed.
- Build #211 / run ID `41286541498` completed successfully but its head `17927754a2efd0985ec2295b18ab0c429d094630` contains the earlier clipped layout. Do not distribute it as the fix.
- Current two-workspace source has not been built into a replacement APK or tested on the user's Android device. Do not start CI/Gradle/APK until explicit approval. After full-page fixture validation, ask exactly **“Build sekarang atau nanti?”**.


## Final validation addendum — compact Collection workspace (1 November 2026)

- Latest source commit before this addendum: `7ba181a53cbb4cc3a66f86ebb7acfc38212726e1`.
- The full-page representative Playwright fixture was expanded to include the real order and major content blocks: NAM page hero, NAM device reader, local NAM import panel, TONE3000 NAM panel, Impulse Response manager heading, User/Collection manager cards, and 24 slot cards. A TONE3000 panel injected after initial workspace setup was also detected and moved into the NAM pane.
- The first complete fixture revealed that the NAM page title and duplicate Collection card title/footnote left too little slot viewport on short screens. Final compacting change: hide the redundant “Native NAM Profile” heading in Collection mode (restore it in NAM mode), hide the duplicate Collection card title and footnote only in the mobile Collection frame. NAM/TONE3000 content itself remains available in its own pane.
- Final representative fixture results (viewport -> grid client height; grid scroll height): 320x740 -> 149px; 1845px. 360x800 -> 209px; 1845px. 393x873 -> 282px; 1845px. 432x915 -> 324px; 1845px. 680x900 -> 327px; 927px (four columns). At 768x1024 the mobile fixed frame is disabled and desktop normal flow is used.
- Assertions passed: exactly 24 slot nodes; first-open mode is Collection; NAM reader/local import/TONE3000 panels remain in NAM pane; delayed TONE3000 panel is captured; toggling between workspaces restores the appropriate pane and restores the NAM heading; scrolling the Collection grid changes its scrollTop while document scrollTop remains 0; changing back to Collection restores the slot viewport.
- Current JavaScript syntax check passed after stripping ESM export declarations for parser compatibility. This test is a representative DOM/CSS simulation, not an instrumentation run of the full APK/WebView and not physical-device verification.
- Important correction: the earlier checkpoint's stated 249–424px and 1905px scroll metrics do NOT describe the final full-page layout. The accurate post-compaction fixture metrics are the values listed above.
- Current source remains limited to `www/ir-transfer.js` and `www/ui-redesign.css`. Protected SHAs verified unchanged: `www/index.html` 7947eac23fa6e28a208d5a7589e742575a22444c; `www/main.js` e2697b26e1d673be2002b8f1a085f12e9618b1de; `www/mg30-preset-import.js` e2490e6df3f5f32853743fc5eb29c99cc4026ea8; `www/mg30-preset-export.js` 7959dea88d42f9433a9ddc06ed7198449e25ba52; `www/preset-library-ui.js` 67ec75258620323492609dcdec559badfb769797; `www/preset-library-ui.css` 1be19a3d4e7ce617f5662c6e164b3d79fa770bf7; `www/native-midi.js` a912c6e7379e193877122c9010b38bdbc0daae64; `www/nam-transfer.js` e854d2a7a122272b8971a3023f4e1d5e81b48cc4; `www/tone3000.js` 34b29972051c6db4dad3994f4ab12961d517139a.
- No packet generation, Collection/User protocol commands, ACK validation, NAM transfer, MIDI/SysEx mapping, preset logic, or application startup behavior was altered.
- No new APK build was started. Build #211 is stale and contains the clipped layout. The latest compacted source has not been built or installed on the user's Android device. Wait for explicit approval before starting another build; ask: **Build sekarang atau nanti?**


## UI refinement — compact NAM / TONE3000 tool frame (1 November 2026)

- User requested that NAM and TONE3000 controls share one compact framed block, be smaller, and remove nonessential explanation text so the Collection scroll area is larger.
- Source commit: `e76d32f85be40e7121718812ef19492a2261aed1`.
- The two separate NAM/TONE3000 and IR Collection workspace tabs are replaced by one compact framed tool selector containing two small buttons: `NAM` and `TONE3000`. Each button expands its existing form inside the frame; selecting one hides the other, and tapping the active button collapses it. Both forms are collapsed by default so the Collection occupies maximum available height. The Collection remains visible while either tool form is opened.
- Existing `#namImportTransferPanel` and `#tone3000Panel` DOM elements are moved, not recreated, so their existing file chooser, slot selector, TONE3000 OAuth/catalogue and transfer event handlers stay attached. A MutationObserver catches a late-mounted TONE3000 panel.
- Mobile-only compaction hides redundant NAM and TONE3000 headings, long explanatory paragraphs and duplicate warning/footnote copy. It keeps functional controls: NAM choose file, target slot, send, and current status; TONE3000 target slot, choose tone, model details and current status. For Collection, the 24-slot grid remains visible; title and short slot count, sync/hide actions and status remain. Red-slot explanation and secondary footnote are hidden to save vertical space.
- Production CSS + representative full-page DOM fixture simulation passed at: 320×740 → grid client height 254px; 360×800 → 314px; 393×873 → 386px; 432×915 → 426px; 680×900 → 410px. At 768×1024 the mobile fixed frame is disabled and desktop normal flow remains. Grid scroll height in the fixture is 1662px for 24 cards.
- At 393×873, opening NAM leaves 279px for the Collection grid; opening TONE3000 leaves 282px. The IR Collection pane stays visible in both states. Setting grid.scrollTop to 300 does not change document scrollTop (0); there is no horizontal overflow in the checked viewport sizes. The screenshot preview is saved at `/mnt/data/mg30-collection-compact-preview.png`.
- JavaScript syntax check passes after stripping ESM export declarations for parser compatibility. Comparison against the pre-refinement source confirms the complete prefix (WAV parsing/packet generator/transfer core) and suffix (slot UI handlers, Collection/User routing, sync, file handling) of `www/ir-transfer.js` are byte-identical; only the workspace DOM/layout controller block changed.
- Source files changed: `www/ir-transfer.js` and `www/ui-redesign.css` only. Protected SHAs remain: `www/index.html` 7947eac23fa6e28a208d5a7589e742575a22444c; `www/main.js` e2697b26e1d673be2002b8f1a085f12e9618b1de; `www/mg30-preset-import.js` e2490e6df3f5f32853743fc5eb29c99cc4026ea8; `www/mg30-preset-export.js` 7959dea88d42f9433a9ddc06ed7198449e25ba52; `www/preset-library-ui.js` 67ec75258620323492609dcdec559badfb769797; `www/preset-library-ui.css` 1be19a3d4e7ce617f5662c6e164b3d79fa770bf7; `www/native-midi.js` a912c6e7379e193877122c9010b38bdbc0daae64; `www/nam-transfer.js` e854d2a7a122272b8971a3023f4e1d5e81b48cc4; `www/tone3000.js` 34b29972051c6db4dad3994f4ab12961d517139a.
- No NAM/IR protocol packets, ACK logic, Collection/User command routing, MIDI/SysEx mappings, NAM transfer code, preset import/export, or startup logic were changed.
- No replacement APK build was started. Build #211 still contains the old clipped layout and must not be distributed as the fix. The compact-frame refinement has not been installed on the user's Android device. Ask for explicit approval before creating a new APK.


## APK Build #212 — compact NAM/TONE3000 + Collection layout (1 November 2026)

- User approved “Build sekarang” for the compact NAM/TONE3000 tool frame.
- GitHub Actions run #212 / ID `41294916777`: **completed / success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41294916777
- Build source commit: `e4bd93ff8d16d7472b1c4eb55afe5f02d9066bae`; contains compact-frame changes. Current branch after restoring manual build gate: `c66091d37c9d4edc961ff161419c5b39c71d529f`.
- All stages passed: Node/Java setup, dependency install, `npm test`, Capacitor Android init + USB audio plugin, Gradle `assembleDebug`, and APK artifact upload.
- Artifact: `MG30-Studio-debug-APK`, artifact ID `13078499442`, size 4,028,221 bytes; GitHub expiry `2026-11-15T09:53:05Z`. Artifact ZIP SHA-256: `54c212a017741ea77bba75063ad98f54cd11fe15cdf847a10f75362c8cb09f62`.
- Downloaded artifact ZIP and extracted `app-debug.apk`; APK size 4,405,424 bytes; APK SHA-256: `b9d322979d6ba3f60b2579bd0514f7021a841756dfa72f88b85ca6481b20be1e`.
- APK contents inspection passed: packaged web assets include compact NAM/TONE3000 frame marker and toggle controls, NAM chooser and send button, TONE3000 action, Collection sync action, Collection grid, and isolated Collection scroll CSS.
- APK is available in the active conversation container as `/mnt/data/MG30-Studio-Compact-NAM-IR-Build-212.apk`.
- Manual build gate restored immediately after triggering: push trigger for `feature/dark-performance-ui-polish` is absent again; `workflow_dispatch` remains available.
- This is a successful software build and packaged-asset inspection, not a physical Android/WebView UI test and not MG-30 hardware protocol validation. User should install and check the NAM and TONE3000 compact controls, Collection 24 slots and scrolling on their phone; connect MG-30 afterward for hardware checks. Do not imply physical-device verification.


## User screenshot regression fix — restore NAM profile title and visible IR Collection (1 November 2026)

- User installed Build #212 and sent screenshot: only the NAM and TONE3000 compact buttons appeared; the green “NAM / PROFILE LAB” label, “Native NAM Profile” heading, and the entire IR Collection block were absent.
- Diagnosis: the compact workspace implementation put `#ir-import-content` inside an additional `.nam-ir-ir-pane` flex wrapper. The Android WebView fixed-page / nested-flex / overflow composition collapsed or clipped that nested Collection region in the installed UI. Additionally the compact CSS explicitly hid the top `.nam-page-hero`, suppressing both requested title lines.
- Fix commits:
  - `db1bf8d26b410f05c05d40642792b684ac4b449c`: make Collection root a direct child of `#page-nam` and restore the NAM/Profile hero title.
  - `0f3b858d9988f1f965f1d8e6f6cc4cb83f3c95e8`: remove obsolete wrapper state and make the TONE3000 observer watch both the page and NAM pane, because TONE3000 inserts its panel immediately after the moved NAM import panel.
  - `ed6743bb3dfa88ee0241ef24c72df7e0c29802b5`: remove unused wrapper references.
  - `ef34c8658979bc7b7158d66955228b3ad6534c6a`: shorten Collection initial count, sync/toggle buttons and slot-selection status to save horizontal/vertical space on narrow phones.
- Current hierarchy is intentionally simple: `#page-nam > NAM/Profile hero > compact NAM/TONE3000 frame > #ir-import-content`. The Collection root is a direct child, not inside another wrapper. NAM and TONE3000 forms are collapsed initially and expand within the small frame; Collection remains visible underneath.
- NAM/Profile title is visible again as green eyebrow “NAM / PROFILE LAB” and heading “Native NAM Profile”. The IR heading “Impulse Response”, Collection card, 24 slot cards, Sync control, collapse control, slot status and scroll grid remain visible. Redundant long descriptive text remains hidden in compact mobile mode.
- The TONE3000 module can mount after the initial page composition. The MutationObserver now watches the moved NAM pane as well as the page; a delayed panel injection was exercised in the browser fixture and moved into the TONE3000 pane. Existing panel element and event handlers are preserved.
- Playwright/Chromium representative fixture passed at 320×740, 360×800, 393×873, 432×915, 680×900 and 768×1024. 24 slot nodes rendered in all cases. Collection grid client heights: 117px, 194px, 267px, 307px, 291px respectively for mobile sizes; 768px desktop switches to normal flow (1228px grid fixture height, no fixed mobile scroll viewport). In all checked sizes, scrolling the Collection grid left both page.scrollTop and document.scrollTop at 0. NAM and TONE3000 buttons opened their forms; Collection stayed visible underneath. Delayed TONE3000 panel was moved to `#namIrTonePane` and was visible on opening.
- JavaScript syntax check passed after removing ESM export declarations; CSS brace balance is zero. This is a browser fixture with representative app DOM/CSS, not a test run on the user's physical Android device.
- Scope limited to `www/ir-transfer.js` and `www/ui-redesign.css`. Protected SHA values verified unchanged: `www/index.html` 7947eac23fa6e28a208d5a7589e742575a22444c; `www/main.js` e2697b26e1d673be2002b8f1a085f12e9618b1de; `www/mg30-preset-import.js` e2490e6df3f5f32853743fc5eb29c99cc4026ea8; `www/mg30-preset-export.js` 7959dea88d42f9433a9ddc06ed7198449e25ba52; `www/preset-library-ui.js` 67ec75258620323492609dcdec559badfb769797; `www/preset-library-ui.css` 1be19a3d4e7ce617f5662c6e164b3d79fa770bf7; `www/native-midi.js` a912c6e7379e193877122c9010b38bdbc0daae64; `www/nam-transfer.js` e854d2a7a122272b8971a3023f4e1d5e81b48cc4; `www/tone3000.js` 34b29972051c6db4dad3994f4ab12961d517139a.
- IR packet generation, 75-frame transfer, command routing, ACK checks, NAM protocol, preset handling, Signal Chain and MIDI/SysEx mapping were not changed. Manual build gate remains active: `workflow_dispatch` enabled and no push trigger for this feature branch.
- Build #212 includes the previous nested wrapper version, so it is NOT the screenshot regression fix. The corrected source at `ef34c8658979bc7b7158d66955228b3ad6534c6a` has not yet been built or installed on the user's phone. Wait for explicit approval before starting replacement APK build.
- Browser fixture preview: `/mnt/data/mg30-restored-layout-v2.png`.


## Corrected APK Build #213 — restore NAM title and Collection after Android screenshot regression (1 November 2026)

- User approved replacement build after Build #212 screenshot showed only the NAM/TONE3000 buttons while “NAM / PROFILE LAB”, “Native NAM Profile” and IR Collection were invisible.
- Corrected source commit built: trigger commit `9b0882b518b1c0613a492b06edafeaaff5b71b9a`, based on source commit `ef34c8658979bc7b7158d66955228b3ad6534c6a` plus project documentation. It uses the direct-child `#ir-import-content` layout, restored NAM hero title, compact NAM/TONE3000 frame, and TONE3000 late-mount observer.
- GitHub Actions Build #213 / run ID `41297695316`: **completed / success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41297695316
- All workflow steps passed: checkout, Node + Java setup, npm dependencies, `npm test`, Capacitor Android init + USB audio plugin, Gradle `assembleDebug`, upload artifact.
- Artifact: `MG30-Studio-debug-APK`, ID `13080236325`, size 4,028,299 bytes, expiry `2026-11-15T10:31:11Z`, artifact ZIP SHA-256 `789ba064ce01ea21174076fe0adb71da95b183f9c115249e96b4642b9d57025d`.
- Downloaded ZIP and extracted `app-debug.apk`: size 4,405,464 bytes, SHA-256 `c022ee9b7b47ef73b7f632aface80742c27caf242aa80004e725004224ca0f77`. Active container path: `/mnt/data/MG30-Studio-Restored-NAM-Collection-Build-213.apk`.
- APK format inspection recognized Android package; packaged assets confirmed `NAM / PROFILE LAB`, `Native NAM Profile`, `irManagerCollectionGrid`, `namIrModeNam`, `namIrModeTone`, `nam-ir-tools-frame`, and TONE3000 panel markers.
- Manual build gate restored immediately after trigger: feature branch push trigger absent; `workflow_dispatch` remains.
- Build #213 includes the restored-title and direct Collection layout fix. Still not physically installed or tested on the user's Android phone / MG-30; only workflow success and packaged-asset checks are confirmed. Ask the user to install and visually confirm both the restored title and 24 Collection slots before treating the UI regression as physically resolved.


## UI regression follow-up — Collection still blank on Build #213 (1 November 2026)

- User installed Build #213 and sent a second screenshot. NAM/Profile title, compact NAM/TONE3000 buttons, and the “THIRD PARTY / COLLECTION — Impulse Response” heading are visible; the Collection card, toolbar, and 24 slots remain absent.
- Important diagnostic correction: `index.html` contains an inline `mergeNamAndIr()` script immediately before module entrypoints. It prepends the IR heading and moves `#ir-import-content` into `#page-nam` before `main.js` / `ir-transfer.js` modules execute. Thus the root is normally already a child of the page; do not claim that `insertBefore` necessarily threw on Build #213. That earlier explanation was not proven.
- Latest source commit: `41f7d620d021e280a8321fe2162f5ea4032d13a9`.
- Source correction/robustness changes:
  - Explicitly ensure `#ir-import-content` is a direct child of `#page-nam` before inserting the tool frame. Use `if(root.parentElement!==page)page.appendChild(root); page.insertBefore(toolsFrame,root);` so both pre-merged and not-yet-merged DOM states are handled.
  - Replace mobile nested flex sizing with explicit CSS grid rows at each level: page (title / compact tools / Collection), IR root (heading / manager), manager (visible Collection card), Collection card (card head / toolbar / 24-slot grid / status). This avoids relying on a nested flex chain that may collapse in Android WebView.
  - Add a post-render check after NAM page activation: verify exactly 24 slot elements, a real Collection card, and minimum measured card/grid heights. If height collapses, add `ir-collection-layout-fallback` and switch to a scrollable page + bounded Collection grid.
  - Wrap synchronous `initUI()` startup errors and write an explicit “IR Collection gagal dimuat: …” warning into the IR root instead of silently leaving only the heading.
- Browser fixture now matches actual app ordering: initial `#ir-import-content` is a sibling after `#page-nam`; inline merge script prepends the IR heading and moves root into page; TONE3000 panel mounts after NAM import panel; IR manager builds User and Collection cards with 24 slot cards; compact tool frame is then installed before root. Tests at 320×740, 360×800, 393×873, 432×915, 680×900 and 768×1024: 24 cards created; Collection grid client heights 184, 264, 336, 374, 356, and 1408px respectively; root parent confirmed `page-nam`; no horizontal overflow; document scrollTop remains 0 for mobile Collection grid. NAM and TONE buttons open their corresponding pane while Collection remains present. At desktop 768px the normal flow layout is used.
- Representative 393×873 screenshot from the browser fixture: `/mnt/data/mg30-collection-layout-debug.png`. The fixture uses representative application markup and exact relevant CSS, but is not a complete APK WebView instrumentation test.
- JavaScript syntax check passes after stripping ESM exports; CSS brace balance is zero. The exact transfer core from `buildMG30IRTransferPlan` through the end of send-logic before the UI helper remains byte-identical to the pre-patch source. Protected files unchanged: `www/index.html` 7947eac23fa6e28a208d5a7589e742575a22444c; `www/main.js` e2697b26e1d673be2002b8f1a085f12e9618b1de; `www/mg30-preset-import.js` e2490e6df3f5f32853743fc5eb29c99cc4026ea8; `www/mg30-preset-export.js` 7959dea88d42f9433a9ddc06ed7198449e25ba52; `www/preset-library-ui.js` 67ec75258620323492609dcdec559badfb769797; `www/preset-library-ui.css` 1be19a3d4e7ce617f5662c6e164b3d79fa770bf7; `www/native-midi.js` a912c6e7379e193877122c9010b38bdbc0daae64; `www/nam-transfer.js` e854d2a7a122272b8971a3023f4e1d5e81b48cc4; `www/tone3000.js` 34b29972051c6db4dad3994f4ab12961d517139a.
- No IR packet generation, 75-frame command sets, ACK handling, Collection/User command routing, NAM transfer, MIDI/SysEx mappings, preset logic, or main startup module was changed.
- Manual build gate remains active: `workflow_dispatch` is present and feature branch push trigger is absent. No APK build has been started for commit `41f7d620d021e280a8321fe2162f5ea4032d13a9`. Explicit user approval required before replacement APK build. Build #213 is known to reproduce the missing-card issue and must not be reissued.


## Latest branch checkpoint — Dark Performance UI / Build #214 (1 November 2026)

- Active unfinished UI branch: `feature/dark-performance-ui-polish` (do not confuse with `feature/preset-manager-redesign`).
- Current branch HEAD after restoring the manual build gate: `c3380ef98c6d862d3a3d8c164ff28aae6be4879c`.
- Latest application source checkpoint: `41f7d620d021e280a8321fe2162f5ea4032d13a9`; files: `www/ir-transfer.js` and `www/ui-redesign.css`. This corrected Collection runtime/layout source was built as Build #214.
- Build #214 / run `41299957248`: success. Artifact `13080459335`; ZIP SHA-256 `d7ce9f191eb4269df07ea294cdce48b1b9331e5cdf69d095d69536cbb166c7a6`.
- Latest APK: `/mnt/data/MG30_Studio_Dark_Performance_Build_214.apk`, size 4,406,196 bytes, SHA-256 `7db3d6da6faa6f57e3f94fd1507fe666d038c1c96e37c84dcf40c31051774250`. ZIP and APK archive integrity passed; APK packaged-asset assertions passed for Collection grid, NAM/TONE controls, fallback, NAM title/import and TONE3000.
- Workflow push branch filter was enabled for one trigger only, then restored. Current workflow file does not include `feature/dark-performance-ui-polish` in push branches; `workflow_dispatch` remains. Restoration commit is `c3380ef98c6d862d3a3d8c164ff28aae6be4879c`.
- Build #213 is obsolete for the missing-Collection issue; never distribute it as the fix. Build #214 is the current APK for user install/review.
- No physical Android WebView runtime test or MG-30 hardware test is claimed. Next: user installs #214 and verifies that the Collection card and all 24 slots are visible and independently scrollable, while NAM and TONE3000 controls remain accessible. Resume from this branch and do not build again without explicit approval.


## Collection IR — rapikan kontrol & ruang grid (1 November 2026)

- User mengonfirmasi melalui screenshot bahwa Build #214 sudah menampilkan kembali NAM/Profile, panel Collection IR, dan kartu-kartu slot.
- Permintaan UI lanjutan: hilangkan badge “24 SLOT”, tombol “Sembunyikan”, serta kotak petunjuk awal “Pilih slot untuk import WAV.” agar grid Collection naik dan mendapat area lebih luas.
- Source commit: `2e33d7ccbccb2f11320e65b0e01f3db9fe000119` pada `feature/dark-performance-ui-polish`, berbasis Build #214.
- Perubahan terbatas pada `www/ir-transfer.js` dan `www/ui-redesign.css`:
  - Menghapus chip 24 SLOT dan tombol collapse; grid 24 slot selalu terbuka.
  - Toolbar tinggal menampilkan status sinkronisasi dinamis dan tombol Sinkronkan.
  - Status Collection tetap menjadi elemen ARIA live untuk progres/error saat operasi; teks awal dikosongkan, status kosong disembunyikan, dan pesan dinamis tampil tanpa kotak/border.
  - Mengurangi susunan baris kartu Collection dari empat menjadi tiga serta toolbar dari tiga kolom menjadi dua, sehingga ruang yang sebelumnya dipakai kontrol/status kosong kembali ke grid.
- Handler sinkronisasi, baca metadata, impor WAV, alur Collection/User, generator paket SysEx, ACK, NAM, TONE3000, preset, dan pemetaan MIDI tidak sengaja diubah.
- Pemeriksaan sumber lulus: chip/tombol collapse tidak lagi dirender; seluruh referensi handler toggle dihapus; ID count/sinkronisasi dan live status dipertahankan; fungsi inti transfer, sync, dan import masih ada.
- Build belum dijalankan dan APK belum dibuat. Build #214 tetap APK terakhir; jangan menganggap perubahan ini sudah ada di APK. Manual build gate tetap aktif: `workflow_dispatch` tersedia dan branch ini tidak ditambahkan ke push trigger. Minta persetujuan eksplisit sebelum build APK berikutnya.
- Batas validasi: pemeriksaan statis sumber dan workflow saja; belum ada uji WebView Android fisik atau uji perangkat MG-30 untuk revisi UI ini.


## APK Build #215 — Collection IR controls compact (1 November 2026)

- User menyetujui “Build sekarang” setelah meminta menghilangkan badge “24 SLOT”, tombol “Sembunyikan”, dan panel petunjuk awal di bawah grid Collection IR.
- Application source yang dibangun: `2e33d7ccbccb2f11320e65b0e01f3db9fe000119`. Build trigger commit: `7ca8a59c73195e21b3e8d2296428a7f834f81ea0`. Perbandingan source → trigger menunjukkan hanya perubahan workflow sementara dan penambahan catatan proyek; tidak ada perubahan app source tambahan.
- GitHub Actions **Build #215**, run ID `41301409541`: **completed / success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41301409541
- Semua langkah workflow lulus: checkout, Node.js, Java, `npm install`, `npm test` (protocol regression), Capacitor Android init + USB audio plugin, Gradle `assembleDebug`, dan upload artifact.
- Artifact `MG30-Studio-debug-APK`, ID `13081296928`, ZIP size 4,028,924 bytes, SHA-256 `4454220c6c06b3e53f5c1903dca4aaa3d94f51f52d5f5287d8a59c18a1c39ee3`; expiry 15 November 2026 11:21:14 UTC.
- Extracted APK: `/mnt/data/MG30_Studio_Collection_Compact_Build_215.apk`, size 4,406,024 bytes, SHA-256 `f1a1c7ff79b6498dcd95d5c0d416ca0f7c3a1f0ae6baf4a705767f05c946b0cb`.
- ZIP integrity and APK archive integrity passed. APK is recognized as Android package with Gradle app metadata and APK Signing Block.
- Packaged asset checks: removed badge `24 SLOT`, removed collapse control identifier `irManagerToggleSlots`, removed default prompt `Pilih slot untuk import WAV.`; retained Collection IR heading, sync label and button, live status node, NAM/Profile heading, and NAM/TONE3000 controls. The remaining word “Sembunyikan” found elsewhere belongs to the unrelated collapsible NAM reader label, not the Collection toolbar.
- Manual build gate restored after the one-off trigger. Workflow blob returned to `15484977fbfda4c1beea5a1132e30edd669bc0d2`; `workflow_dispatch` remains enabled and `feature/dark-performance-ui-polish` is absent from push branch filters. Restore commit: `5af1e9b80e4cfb454674051cf48360420208488b`.
- Build #215 is the current APK containing the compact Collection controls. Build #214 is superseded for this UI change.
- Validation boundary: workflow + source/package asset checks passed. APK has not been installed on the user's physical Android device, and the MG-30 hardware has not been tested as part of this build. No claim of physical WebView rendering or IR protocol operation is made.


## Collection IR — sejajarkan Sinkronkan dan naikkan slot grid (1 November 2026)

- Screenshot Build #215 menunjukkan tombol Sinkronkan masih berada satu baris di bawah judul Collection IR; pengguna meminta tombol tepat sejajar dengan judul dan kartu slot naik.
- Source commit UI: `1a5959b08a31fe35b79c4808f0f665068eae1c87` pada `feature/dark-performance-ui-polish`.
- Perubahan hanya menyentuh `www/ir-transfer.js` dan `www/ui-redesign.css`:
  - Memindahkan indikator “Belum sinkron” ke bawah judul Collection IR dalam satu blok judul.
  - Memindahkan tombol Sinkronkan ke sisi kanan dalam header Collection yang sama.
  - Menghapus toolbar terpisah; grid 24 slot menjadi baris konten utama tepat di bawah header.
  - Status proses/error tetap dipertahankan sebagai live region tersembunyi ketika kosong.
- Jalur impor Collection, status sinkronisasi, 75-frame transfer/SysEx, ACK, User/Third Party, NAM, TONE3000, preset dan pemetaan MIDI tidak sengaja diubah.
- Pengguna secara eksplisit meminta “langsung build”; build APK akan dijalankan dari source commit ini.
- Belum ada uji fisik Android/WebView atau MG-30 untuk perubahan UI ini. Hasil build dan package asset check akan dicatat terpisah setelah workflow selesai.
