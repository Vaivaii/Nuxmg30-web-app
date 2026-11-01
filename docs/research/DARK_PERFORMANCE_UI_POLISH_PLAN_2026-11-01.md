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
