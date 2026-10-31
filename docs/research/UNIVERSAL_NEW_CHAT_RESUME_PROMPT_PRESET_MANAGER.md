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