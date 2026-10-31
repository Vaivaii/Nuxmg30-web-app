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
