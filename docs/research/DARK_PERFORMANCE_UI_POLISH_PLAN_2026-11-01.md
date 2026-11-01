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


## Latest build checkpoint — Build #214 (1 November 2026)

- User approved **Build sekarang** for the latest corrected Collection layout.
- Application source: `41f7d620d021e280a8321fe2162f5ea4032d13a9` (`www/ir-transfer.js` and `www/ui-redesign.css` UI mounting/layout controller and mobile CSS only).
- One-off workflow trigger commit: `aa920f3682907bd0147fce27e1265c062c599a38`. No application source beyond the tested source checkpoint was changed for the build trigger.
- Build #214 / run ID `41299957248`: **success**. Run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41299957248
- `npm test`, Capacitor Android init + USB audio plugin, Gradle `assembleDebug`, and artifact upload all passed.
- Artifact ID `13080459335`, ZIP size 4,029,191 bytes, ZIP SHA-256 `d7ce9f191eb4269df07ea294cdce48b1b9331e5cdf69d095d69536cbb166c7a6`; expiry 15 November 2026.
- Extracted APK: `/mnt/data/MG30_Studio_Dark_Performance_Build_214.apk`, size 4,406,196 bytes, SHA-256 `7db3d6da6faa6f57e3f94fd1507fe666d038c1c96e37c84dcf40c31051774250`.
- ZIP and APK integrity passed; APK package inspection found the Collection grid, NAM/TONE3000 controls, layout fallback, NAM title/import panel and TONE3000 panel.
- Manual build gate restored: workflow blob `15484977fbfda4c1beea5a1132e30edd669bc0d2`; no push trigger for this branch; manual `workflow_dispatch` remains. Restoration commit `c3380ef98c6d862d3a3d8c164ff28aae6be4879c`.
- Build #214 supersedes #213. Physical Android / MG-30 verification remains pending; the APK and browser fixture do not prove hardware/runtime behavior.
- Next step: install Build #214 on Android; verify NAM/Profile title, compact NAM/TONE3000 controls, Collection card + all 24 slots, slot actions, and independent grid scrolling. Then capture a screenshot if any part is still missing. Do not start another build without explicit approval.


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


## APK Build #216 — Collection IR header alignment (1 November 2026)

- User mengirim screenshot Build #215 dan meminta tombol Sinkronkan sejajar dengan judul Collection IR, serta grid slot dinaikkan.
- Source UI yang dibangun: `1a5959b08a31fe35b79c4808f0f665068eae1c87`; file app yang berubah pada source commit: `www/ir-transfer.js` dan `www/ui-redesign.css`.
- Perubahan layout: judul Collection IR + indikator “Belum sinkron” menjadi satu blok di kiri; tombol Sinkronkan di sisi kanan header yang sama; toolbar terpisah dihapus; grid 24 slot langsung menjadi area konten di bawah header.
- GitHub Actions **Build #216**, run ID `41302162108`: **completed / success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41302162108
- Workflow steps semuanya sukses: checkout, Node.js, Java, `npm install`, `npm test` (protocol regression), Capacitor Android generation + USB audio plugin, Gradle `assembleDebug`, dan artifact upload.
- Trigger commit: `166b5b672edd8519f98dd5bbe248908d013cc73c`; trigger hanya menambahkan push branch sementara ke workflow. Source UI tetap pada commit di atas.
- Artifact `MG30-Studio-debug-APK`, ID `13081787932`, ZIP size 4,028,945 bytes, SHA-256 `aea62a241f84db3f0c15b0f0be8a42d18862a059065f2e44762bac3e7e051dc7`, expiry 15 November 2026 11:32:05 UTC.
- ZIP: `/mnt/data/MG30-Studio-Collection-Header-Aligned-Build-216.zip`; archive integrity passed. Extracted APK: `/mnt/data/MG30_Studio_Collection_Header_Aligned_Build_216.apk`, size 4,406,032 bytes, SHA-256 `9987bf5b6e814975003d6287f7a82e20e57b37503f84a3a700a36d728a0cff7a`; APK ZIP integrity passed and `file` recognizes Android package with Gradle metadata and APK Signing Block.
- Packaged-asset checks passed:
  - Collection heading and `ir-collection-card-head` markup in JS bundle; `irManagerSyncCollection` and `irManagerCollectionCount` retained; `irManagerCollectionGrid` retained.
  - The count/status string is nested in the left title block; sync button is the sibling in the same header.
  - Old `ir-collection-toolbar`, collapse control ID `irManagerToggleSlots`, and initial hint `Pilih slot untuk import WAV.` are absent from packaged JS.
  - CSS contains the combined header class and updated card grid sizing.
  - Static `Native NAM Profile` title remains in packaged `index.html`; NAM/TONE3000 mode controls remain in JS bundle.
  - Import/transfer-related package strings include `Import WAV`, WAV RIFF parsing errors, and phase ACK diagnostics.
- Workflow trigger was restored after the one-off build. Workflow blob: `15484977fbfda4c1beea5a1132e30edd669bc0d2`; `workflow_dispatch` remains enabled; `feature/dark-performance-ui-polish` is absent from push trigger filters. Restore commit: `13adead664657e8f2637a1d73d5efc6e088dd9e3`.
- Build #216 supersedes #215 for the latest header-alignment request. This is a successful build and package-content check, not a physical Android WebView screenshot test and not MG-30 hardware validation.


## English UI validation checkpoint — IR Collection naming (1 November 2026)

- User requested removal of the duplicate “Collection IR” card title, renaming the main page heading to “IR Collection”, and converting the app interface to English.
- Latest application source commit: `53003dbfdcaee07e060befc41e5e8e7c384b0f59` on `feature/dark-performance-ui-polish`.
- `www/index.html` now displays the page heading **IR Collection**, loads `english-ui.js` as a module before the application modules, and no longer uses a classic script tag that Vite warned it could not bundle.
- `www/ir-transfer.js` no longer renders the redundant “Collection IR” card subheading. The Collection title is represented by the main page heading; sync control and status remain in place.
- `www/english-ui.js` contains the English UI translation layer for static and dynamic DOM text, common labels, status/error messages, ARIA/title/placeholder attributes, and native confirm/prompt/alert dialogs. Latest inspected dictionary: 769 exact entries and 113 phrase rules.
- Data-preservation guardrails: preset names, hardware preset names, model labels, IR slot names, recording names, NAM profile names, TONE3000 model names, and device-returned name values are protected from translation. This is a display-only layer.
- Source checks:
  - JavaScript syntax: `node --check www/english-ui.js` passed.
  - Text sweep: 238 static HTML text nodes checked; no Indonesian UI strings remained after translation. Dynamic text/HTML string scan across the nine inspected UI source modules also showed no remaining Indonesian UI text in the checked strings.
  - Translation spot checks for Third Party/User labels, Collection sync counters, file-selection prompts and destructive-action wording passed.
- GitHub Actions validation-only run **#218**, ID `41305767689`, completed **success**: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41305767689
  - `npm test`: **9 passed, 0 failed**.
  - `npm run build`: Vite web production build succeeded; 31 modules transformed. The earlier warning about `english-ui.js` not being bundleable disappeared after changing it to an ordered module script.
  - This was a web asset build only. No Capacitor Android generation, Gradle, or APK build ran.
- The one-off validation workflow trigger has been removed. `.github/workflows/build-apk.yml` is restored to its original blob `15484977fbfda4c1beea5a1132e30edd669bc0d2`; `workflow_dispatch` remains enabled and `feature/dark-performance-ui-polish` is absent from automatic push filters. Restore commit: `714cc3d8c162c4328b61d0807822bf3f8e2c6da1`.
- No changes were made to NAM transfer code, IR SysEx frame generation/ACK handling, Collection/User routing, TONE3000 transfer logic, preset import/export logic, USB-MIDI implementation, or MIDI mapping. The checked source hashes for `www/ir-transfer.js`, `www/nam-transfer.js`, `www/main.js`, `www/tone3000.js`, and `www/native-midi.js` remain unchanged from the preceding checkpoint.
- Validation boundary: source/static tests and web build passed. The new English UI has not yet been installed for a physical Android WebView test; MG-30 hardware and IR/NAM transfer have not been tested as part of this language pass. Do not treat Build #216 as containing these English UI changes. APK has not been built; await explicit user approval before building.


## TONE3000 Native Workspace — persistent model selection and expandable catalogue (1 November 2026)

- User approved implementation and APK build for a TONE3000 workflow change:
  - Select the tone on the TONE3000 website, then return to MG30 Studio.
  - All model selection and download actions happen inside the app, not on the website.
  - The returned model catalogue opens automatically in an expandable workspace and can be hidden afterward.
  - Remember the entire model list, last selected model and target slot permanently.
- Source revision: `bdddeb5e7c40df0a07bc665b8d1cccfe0f09e605` on `feature/dark-performance-ui-polish`.
- Source files changed: `www/tone3000.js`, new `www/tone3000-workspace.js`, and `www/ui-redesign.css`; new tests: `tests/tone3000-workspace.test.js`.
- Implemented behaviour:
  - TONE3000 authorization still uses the existing PKCE and app deep-link callback. The authorization request now requests English locale.
  - The callback closes the browser and fetches tone metadata plus paginated model metadata (50 per page, up to 20 pages; duplicate/repeated pages are detected to stop further requests).
  - Callback no longer selects the first A2-Lite model or auto-writes anything to the MG-30. User selects a model in MG30 Studio, selects the target slot, and explicitly confirms before overwrite.
  - The in-app catalogue has a persistent header and Expand/Hide control. After a new tone callback, it expands automatically. On mobile the expanded catalogue is a large overlay with its own scrolling and a Hide action, so the IR Collection grid keeps its viewport height.
  - Model rows show the entire API catalogue, including entries without a downloadable URL; unavailable download actions are disabled rather than silently omitting those entries.
  - `Download & Import` fetches the selected model, validates native A2-Lite weights, saves the file to app-private storage, and then calls the existing `buildMG30A2LiteTransferPlan` / `sendMG30A2LiteTransfer` route. `Download Only` retains the app-private save action.
  - The persistent `mg30-t3k-workspace-v1` localStorage record stores tone metadata, all returned model metadata/URLs, and the selected model ID. Separate keys retain the selected tone, model ID, target slot and expanded/collapsed preference. Model bytes are not stored in Local Storage; they are fetched when the user chooses an action.
  - The saved catalogue restores immediately after app launch. Refresh Models re-fetches the current tone catalogue. Sign-out clears tokens but keeps the saved tone/model list.
  - Selection state is scoped to the active tone, preventing a previous tone's selected model from carrying over when switching tones.
- Added unit tests for catalogue normalization (including numeric model IDs), full model-list persistence, selection persistence, invalid payloads, storage errors and models without a download URL.
- Protected transfer scope: no modifications to `www/nam-transfer.js`, `www/native-midi.js`, `www/ir-transfer.js`, `www/main.js`, `www/mg30-preset-import.js`, or `www/mg30-preset-export.js` in this change. Existing USB-MIDI mapping, IR Collection/User routing, IR SysEx/ACK, NAM transfer packets and preset import/export remain untouched.
- Source validation before build: branch and protected file hashes checked; legacy first-model auto-import and session-only WeakMap cache removed. Automated `npm test`, Vite production build, Gradle APK build and packaged asset inspection are still pending for the build run.
- User explicitly requested both implementation and APK build. The approved build will be a one-off trigger; restore the workflow to manual-only immediately after triggering.
- Physical Android WebView/TONE3000 account callback and MG-30 hardware transfer testing remain pending until user installs and tests the APK.


## Android APK Build #221 — Persistent TONE3000 Native Workspace (1 November 2026)

- User approved the complete TONE3000 workflow redesign and immediate APK build.
- App source commit: `bdddeb5e7c40df0a07bc665b8d1cccfe0f09e605`. Build trigger commit: `a8545ca1b959341c956bb1785a90f76510fda5fc`, which temporarily enabled this feature branch in the push filter. Restore commit: `0f105dc9d493093824e4b784ed754236f2e06258`.
- GitHub Actions **Build #221**, run ID `41316863805`: **completed / success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41316863805
- Regression tests: **15 passed, 0 failed, 0 skipped**, including the new `tests/tone3000-workspace.test.js` cases for full catalogue persistence, selected model, numeric IDs, malformed storage and models without download URLs.
- Workflow steps all succeeded: checkout, Node.js 22, Java 21, npm install, protocol regression tests, Capacitor Android project generation + USB audio plugin, Gradle `assembleDebug`, artifact upload.
- Artifact `MG30-Studio-debug-APK`, ID `13087627186`, size 4,058,814 bytes; ZIP SHA-256 `0408c918ef30b2e3a6611f180ecd30a3bdb43a6524790d035992d4b1f79d5b64`; expiry 15 November 2026 14:36:15 UTC.
- Downloaded ZIP: `/mnt/data/MG30-Studio-TONE3000-Native-Workspace-Build-221.zip`; ZIP integrity verified.
- Extracted APK: `/mnt/data/MG30_Studio_TONE3000_Native_Workspace_Build_221.apk`; size 4,436,632 bytes; SHA-256 `7be158699a94db1cda67335ae5cec3db33fb6cea2c3058882d66d97df44711c6`; APK archive integrity verified.
- Packaged asset checks passed: `Available Models`, `Select Model`, `Download & Import`, `Download Only`, `Refresh Models`, workspace key `mg30-t3k-workspace-v1`, and IR Collection/NAM page assets present; first-model auto-import and WeakMap-only model cache strings absent.
- TONE3000 behaviour in this build: user selects tone on TONE3000 website, app receives callback and loads the catalogue; model selection and download happen in MG30 Studio; full model metadata is remembered; selected model and target slot persist; model catalogue can be expanded/hidden; mobile list opens as a large overlay with its own scroll; model download URL absence disables its download actions. Import to MG-30 still requires explicit model choice, target slot choice and overwrite confirmation.
- No intended changes to `www/nam-transfer.js`, `www/native-midi.js`, `www/ir-transfer.js`, `www/main.js`, `www/mg30-preset-import.js` or `www/mg30-preset-export.js`; their source blobs remain unchanged from the pre-TONE workspace checkpoint. NAM/IR transfer protocols, Collection/User routing, USB-MIDI and MIDI mapping were not modified in this feature.
- Workflow restored to manual-only: blob `15484977fbfda4c1beea5a1132e30edd669bc0d2`, `workflow_dispatch` remains enabled, and `feature/dark-performance-ui-polish` is absent from push branch filters.
- Validation boundary: GitHub workflow/tests and APK archive/package checks passed. Physical Android WebView testing of the TONE3000 OAuth callback, catalogue scrolling, persistence across a true app restart, and actual MG-30 NAM transfer have not yet been performed. User must install and verify on the phone/device.


## Latest screenshot-driven correction — TONE3000 expanded catalogue position (1 November 2026)

User supplied two Build #221 screenshots. The expanded TONE3000 model list was opening over the MG-30 Target Slot dropdown and nearby Choose a Tone / Refresh Models / status controls. Preserve the floating, independently scrollable mobile catalogue, but keep the whole TONE3000 control cluster visible above it.

Application source:
- File: `www/ui-redesign.css` only.
- Final source commit: `d16dd03e55ce5701409757232fae58cc6546319c`.
- Final mobile overlay offset: `top: max(270px, calc(env(safe-area-inset-top, 0px) + 260px));` under `.t3k-catalogue.is-expanded #t3kModelList` in the existing max-width 720px media rule.
- The initial 214/204px attempt still overlapped the action/status controls; it was corrected to 270/260px and this failed intermediate is retained in `UI_POLISH_CHECKLIST.md`.
- No TONE3000 JavaScript, model persistence, OAuth/API, NAM download/import, A2-Lite transfer plan/sender, IR transfer, USB-MIDI, Editor, Signal Chain or other device logic changed.

Validation:
- Exact final source commit tested: `d16dd03e55ce5701409757232fae58cc6546319c`.
- Git compare against the prior branch HEAD confirms one application file and one net CSS line changed.
- Chromium + Playwright `page.set_content` fixture passed at 320×640, 360×740, 393×873, 432×915 and desktop 768×1024. Target dropdown, both TONE3000 action buttons and status remain outside the overlay; the list stays scrollable and ends above bottom navigation. The initial fixture-coordinate/class issue and correction are fully recorded in the checklist.
- No npm test, Vite, CI, Actions, Gradle or APK build was run. No physical Android/WebView or MG-30 hardware validation is claimed.

Project records:
- Detailed history, intermediate failure/correction, protected-file hashes, per-viewport metrics and build gate are in `UI_POLISH_CHECKLIST.md` under the matching TONE3000 heading.
- Latest source commit is `d16dd03e55ce5701409757232fae58cc6546319c`; subsequent commits may update documentation only.
- Current stop point: source and documentation are saved. Ask exactly **“Build sekarang atau nanti?”** and do not start a build before explicit approval.
