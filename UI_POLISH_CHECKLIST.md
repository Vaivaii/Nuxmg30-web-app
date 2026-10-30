# MG30 Studio — UI Polish Checklist / Project Memory

This file is the durable continuation record for the multi-screenshot UI-polish pass. Update it whenever the user sends another screenshot or requests a UI change.

## Protected project constraints
- Target: original NUX MG-30 Gen 2, firmware 6.0.x; not MG-30 MKII.
- Do not regress the already-working NAM feature.
- Do not change the correct existing MIDI mapping.
- Do not regress the tested IR Collection transfer.
- Preserve the confirmed real-time movable signal-chain behavior based on the QuickTone capture.
- Updated user instruction (2026-10-29): after every source/UI change, immediately build an APK and record the change/build details in this project file. Do not wait for a separate build request each time.
- Keep automatic builds managed deliberately: only the requested UI branch is built for a change, verify the run/artifact, and restore temporary workflow settings if needed. Do not change the tested baseline branch.

## Branches / baseline
- UI-only working branch: `android/ui-polish-pass-1`.
- Created from the tested real-time signal-chain branch: `android/movable-signal-chain-editmode`.
- Do not modify the tested baseline branch while polishing UI.
- Continue committing new screenshot changes to `android/ui-polish-pass-1`.
- Current Screenshot 1–3 UI polish APK: **built successfully** on 2026-10-29; GitHub Actions run [40851305061](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40851305061). APK artifact size 4,363,208 bytes; local artifact SHA-256 `e0d32435353405605235894ac9523a574ef42fbf1e0181c26d9b642741163765`. The APK was supplied separately in the conversation for install/review.

## Screenshot 1 — Editor / Signal Chain

- [x] Reduce the oversized Signal Chain Edit button.
- [x] Replace the header NUX wordmark SVG with a trace of the user-provided black/white NUX wordmark; app/web icon updated to match it.
- [x] Remove the visible “Simpan draft” button and its click handler from the editor header.
- [x] Remove the “perubahan lokal” text below the model title.
- [x] Simplify the bottom footer to “MG30 Studio”.
- [x] For custom NAM amp models, use “NAM Profile” as the “Based on” label rather than showing the internal QuickTone slot/device ID string.
- [x] Remove outdated empty-state instruction that told users to “Simpan draft”.
- [x] Keep signal-chain real-time reordering, SysEx, IR/NAM, and MIDI map code unchanged in the UI polish branch.

## Screenshot 2 — Studio tab / Device tab / YouTube

- [x] Move the USB audio test card/button from Studio to Device.
- [x] Keep the manual “Tes USB” button in Device so users can re-run the check.
- [x] Trigger the existing USB audio inspection automatically when the header “Hubungkan” flow successfully connects to the MG-30, for both native Android USB-MIDI and Web MIDI connection paths. The connection emits `mg30-midi-connected`; `www/main.js` calls the existing `inspectAudio()` handler from that event.
- [x] Place a visible YouTube search input and Search button directly below Track 01 / Backing in Studio (not hidden inside a collapsed details element).
- [x] Keep YouTube results and the optional “paste YouTube URL” workflow in Studio.
- [x] Move the existing YouTube Data API v3 key input/save/clear/settings from Studio into a Device panel, near the existing Device/TONE3000 settings.
- [x] Keep the existing storage key `mg30-youtube-data-api-key` and current YouTube search/load functions. If the key is missing, Studio tells the user to configure it in Device.
- [x] Do not change the TONE3000/NAM API panel or its logic.
- [ ] Runtime-test auto USB inspection on the Android device.
- [ ] Runtime-test YouTube key saving in Device and searching from Studio after moving the settings.


## Screenshot 3 — NAM & IR tab

- [x] Reduce and left-align “Native NAM Profile” directly below “NAM / Profile Lab”.
- [x] Remove the NAM metadata-description subtitle under the page heading.
- [x] Move the “Slot NAM di perangkat” read-only card to Device, before the API-key/third-party settings. The existing DOM node is moved after its controls are wired so the read/copy handlers remain attached.
- [x] Remove the yellow “Perhatian” notice from the NAM import card to make it more compact. Keep the file selection, destination-slot picker, send control, and transfer status.
- [x] Reduce the NAM text icon in the file picker so “NAM” fits more comfortably.
- [x] Remove the “Katalog MG-30 GEN2” UI card from the NAM page.
- [x] Hide the generated “Third Party / User IR” card in the IR manager view, leaving the Collection IR card as the focus. The underlying transfer module is not rewritten in this UI-only change.
- [x] Update the “Impulse Response” subtitle to describe importing WAVs into Collection slots 01–24.
- [ ] Runtime-test NAM slot read/copy from Device after installation.
- [ ] Runtime-test Collection IR UI after installation and confirm sync/import/use-in-User workflows remain as before.


## Build after Screenshot 3 — 2026-10-29

- [x] User explicitly asked to build after the NAM & IR screenshot changes.
- [x] JavaScript syntax validation passed.
- [x] Android debug APK build passed.
- [x] Artifact upload succeeded: `MG30-Studio-IR-Collection-Experiment` (4,363,208 bytes).
- [x] APK extracted and copied as `MG30-Studio-NAM-IR-UI-Polish.apk` for this conversation; SHA-256 `e0d32435353405605235894ac9523a574ef42fbf1e0181c26d9b642741163765`.
- [x] Disabled automatic build trigger again after the requested build. For any later screenshot changes, edit/commit UI only and wait for explicit user instruction before another build.
- [ ] User to install/review screenshot 1–3 refinements on the Android device. Specifically verify NAM slot reader is available under Device, NAM transfer still works, and Collection IR sync/import/use-in-User UI remains correct.

## Screenshot 4 — Tab headings, signal-chain button, artwork badges, and Android status bar

- [x] Fix the hero/header layout bug: the eyebrow, title, and subtitle are now stacked vertically for a single content column. Only a separate second child (such as action buttons) is rendered as a flex row.
- [x] Reduce the vertical top margin of tab headings slightly on mobile to bring them nearer the header.
- [x] Resize the Signal Chain “Edit” button to normal button height and intrinsic width, matching the regular “Simpan ke pedal” control rather than stretching/taking a tall layout.
- [x] Add an on-artwork badge for amplifier models identified as NAM profiles (including names with a suffix like NAM 07).
- [x] Add an “IMAGE” badge overlay directly on amplifier/effect-pedal artwork for models marked · IMAGE; this is separate from the existing origin chip in the copy area.
- [x] Strengthen Android system-bar background configuration: set the decor/root background to #0b1012, set status/navigation bar colors, disable Android contrast scrims on API 29+, and include windowBackground in generated theme items.
- [x] Order Capacitor status-bar calls so style/visibility are set before applying the final #0b1012 status-bar background; config style is now LIGHT to match the dark header/white status icons.
- [ ] Build and install the next APK to verify headings, Edit button size, NAM/IMAGE artwork badges, and status-bar color on the actual Android device. Do not build until user explicitly asks, after collecting remaining screenshots.

## Build after Screenshot 4 — 2026-10-29

- [x] User explicitly requested a build after the latest screenshot/UI changes.
- [x] JavaScript syntax check passed.
- [x] Android debug APK build passed.
- [x] Artifact uploaded: `MG30-Studio-IR-Collection-Experiment`, run [40855992189](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40855992189), size 3,985,790 bytes.
- [x] APK extracted for this conversation as `MG30-Studio-UI-Polish-Screenshot4.apk`, size 4,363,844 bytes, SHA-256 `c2ff1ff3bff50d4efb90e8453478e07cc19fe5d33f683b38329208787fbd707c`.
- [x] Automatic build trigger disabled again after the requested build; continue saving screenshot changes to this branch without building until the user asks.
- [ ] User to install/review screenshot 4 changes: title alignment, compact Edit button, NAM/IMAGE artwork badges, and Android status bar color.

## Screenshot 5 — Edit button proportions, Studio title, NAM label/import compactness

- [x] Make the Signal Chain Edit button genuinely match the regular header-action scale: 39px fixed height, no oversized min-width, compact 10px text, and no wrapping.
- [x] Add a Studio page eyebrow/title pair: green small label “MG30 STUDIO”, white title “Jam & Record”, aligned left like Preset Library.
- [x] Simplify the amplifier NAM artwork badge text from “NAM PROFILE” to “NAM”.
- [x] Remove supporting instructions under “Import NAM ke MG-30”; keep the section title only.
- [x] Remove the “A2-LITE · EXPERIMENTAL” chip from the NAM import card.
- [x] Hide the file-format metadata under “Pilih file NAM untuk dikirim”, leaving that prompt as the only explanatory text in the file picker. The hidden metadata element is retained so existing JS handlers can still update it safely.
- [x] Preserve NAM file input IDs, destination selector, send handler, and existing transfer implementation.
- [ ] Install and visually verify this build: the Edit button height/font proportions, Studio title placement, and compact NAM file picker.
- [ ] If any follow-up screenshot changes are requested, commit UI changes only; do not rebuild unless the user explicitly asks.
## Build after Screenshot 5 — 2026-10-29

- [x] User explicitly requested the build after Screenshot 5.
- [x] JavaScript syntax check passed; Android debug APK build and artifact upload succeeded.
- [x] Run [40859911667](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40859911667) completed successfully from the Screenshot 5 changes.
- [x] APK saved for this conversation as `MG30-Studio-UI-Polish-Screenshot5.apk`, 4,364,064 bytes, SHA-256 `e590b363ac638ba2d4c3458aa169648449fdeee31560e074e2c5c2ad52d407be`.
- [x] Disabled automatic build trigger again after this requested build; future screenshot UI changes must be committed without building until the user requests it.
- [ ] User to check the Edit button height/text scale, Studio title header, simplified NAM artwork badge, and compact NAM import card on the Android device.

## Screenshot 6 — Signal-chain icon and tab eyebrow cleanup

- [x] Replace the text-based signal-chain Edit button with a compact reorder icon-only button (38×38px) and keep the icon intact while toggling edit mode; accessible title/ARIA label changes between Edit and Selesai.
- [x] Move the signal-chain action controls up into the top row of the panel on mobile, aligned with the heading rather than below the description.
- [x] Remove “/ 02” from the Library eyebrow; it now reads “Library”.
- [x] Remove “/ 04” from the Device eyebrow; it now reads “DEVICE”.
- [x] Keep the real-time signal-chain send/ACK logic unchanged.
- [ ] Install and check icon alignment, hit target, and consistency of Library/Device title styling.
## Build after Screenshot 6 — 2026-10-29

- [x] User explicitly requested an APK build after the signal-chain icon and tab-eyebrow cleanup.
- [x] JavaScript syntax check passed; Android debug APK build and artifact upload succeeded.
- [x] Build run [40863176055](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40863176055) completed successfully from commit `a89f7d51ceeef8704511209df80d54ccf6d35e4f`.
- [x] APK extracted and verified at `MG30-Studio-UI-Polish-Screenshot6.apk`; size 4,364,352 bytes, SHA-256 `3ad0c36274d0ac5fb914a62b3f0739bb6ac1d61de68a394ce89981106bfa1118`.
- [x] Automatic build trigger disabled again after the requested build.
- [ ] User to confirm icon button alignment/size and Library/Device headings after installation.

## Screenshot 7 — Signal-chain alignment, block headings, and bottom navigation icons

- [x] Make the signal-chain reorder icon button exactly 32×32px with a pill radius to match the approximate height of the adjacent “12 blok” chip.
- [x] Simplify the top-left editor model heading to the block type only (`AMP`, `EFX`, `CMP`, `IR`, `RVB`, etc.); model/pedal/amp names remain available in the dropdown and artwork.
- [x] Replace text/symbol navigation glyphs with consistent inline outline SVG icons: sliders for Editor, library/book for Presets, waveform for Studio, amplifier cabinet for NAM & IR, and cable/device connection for Device.
- [x] Style bottom-nav SVGs as consistent Lucide-inspired stroke icons. Reference used: official Lucide icon gallery https://lucide.dev/icons/ and guitar icon sample/reference https://rdicons.vimalbhatt.com/icons/lucide/guitar . Icons are original inline SVG drawings based on the general visual language, not copied brand marks.
- [x] Leave the real-time chain SysEx sender/ACK logic, Collection IR transfer, NAM transfer, and MIDI mapping unchanged.
- [ ] Install and check button/chip alignment, block headings, and bottom navigation icon relevance/consistency on Android.

## Build after Screenshot 7 — 2026-10-29

- [x] User requested a build after the latest signal-chain/navigation UI adjustments.
- [x] JavaScript syntax check passed; Android debug APK build and artifact upload succeeded.
- [x] GitHub Actions run [40864976216](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40864976216) completed successfully from commit `2d95ca30b85208dcc175820f6b449c5600393059`.
- [x] Build artifact `MG30-Studio-IR-Collection-Experiment` (3,986,398 bytes, artifact ID `12893028237`) was downloaded as `MG30-Studio-UI-Polish-Screenshot7.zip`; extracted and verified install package `MG30-Studio-UI-Polish-Screenshot7.apk` (4,364,688 bytes), SHA-256 `ca5f3aa283c562531c341e0fc25d2d9c7addc6cb4513e0a1ba8d2cba78923a51`.
- [x] Automatic build trigger disabled again after this requested build.
- [ ] User to verify the 32×32 reorder icon aligns with the “12 blok” chip, the editor block heading only displays its type (`AMP`, `EFX`, etc.), and the bottom-nav SVG icons fit their respective tabs.

## Follow-up — Signal-chain drag interaction (2026-10-29)

- [x] Fix only the UI gesture layer in `www/index.html` on `android/ui-polish-pass-1`: reorder mode now allows horizontal panning from the card surface while the visible `GESER` handle starts a drag.
- [x] Show a floating visual copy of the dragged card following the pointer/finger; keep a dimmed source placeholder and the existing destination highlight.
- [x] Add horizontal auto-scroll while dragging near the left/right edge of the Signal chain viewport.
- [x] Preserve the existing drop calculation, AMP/IR adjacency guard, local `chainOrder` persistence, and `sendSignalChainOrderRealtime()` sender/ACK path unchanged.
- [x] No changes to NAM, IR transfer, MIDI mappings, preset encoding, or protocol functions.
- [x] No APK build triggered for this UI-only follow-up.
- [ ] Runtime-test on Android: swipe the chain in edit mode, drag EFX behind AMP using `GESER`, verify auto-scroll reaches off-screen cards, and confirm the physical pedal order/readback remains correct.
- Static validation performed before commit: source replacement uniqueness checks and inline JavaScript parse check.

## Workflow for future changes
1. Apply a focused change to `android/ui-polish-pass-1`, respecting original MG-30 Gen 2 firmware 6.0.x scope.
2. Preserve working NAM transfer, IR Collection transfer, MIDI mappings, preset encoding, and confirmed SysEx/ACK protocol unless the user specifically asks for a change to those behaviors.
3. Run static validation, then immediately build the Android debug APK for the latest source change.
4. Verify build status and uploaded APK artifact; record run URL, commit, artifact details, checksum, and any outstanding hardware runtime tests here.
5. Maintain the user’s project-continuity record in every change session.

## Latest scope
The current commit includes the Studio → Device control move, connection-triggered USB test, and visible Studio YouTube search. The working tree is represented by this Git branch; continue from it in future conversations.

## Follow-up — live reorder preview while dragging (2026-10-29)

- [x] User reported that dragging EFX toward OD did not make the target card move aside, so it looked like the block could not be repositioned.
- [x] Updated only the reorder UI in `www/index.html`: as the drag crosses target cards, CSS flex order now previews the resulting chain order during the drag so neighbouring cards shift, rather than only highlighting the target.
- [x] Hit-testing uses `elementsFromPoint()` and excludes the pointer-following ghost/source placeholder, so the card beneath the finger can still be targeted.
- [x] On release, commit the same preview order the user saw. Keep the AMP/IR adjacency guard and the existing `sendSignalChainOrderRealtime()` ACK path unchanged.
- [x] Static inline-JavaScript parse check passed; reorder insertion math passed 264 source/target/side combinations.
- [x] No changes to NAM transfer, IR transfer, MIDI mapping, preset encoding, or the signal-chain SysEx sender.
- [x] APK build for this follow-up completed successfully in run [40903769421](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40903769421); details recorded below.
- [ ] Runtime-test on Android: drag EFX to either side of an adjacent block (including OD), verify neighbouring cards visibly shift during drag and the final order changes on release; then verify AMP/IR stay adjacent and test physical-pedal ACK/readback.


## Build after live reorder preview fix — 2026-10-29

- [x] Following the user's updated instruction, the APK was built immediately after the live reorder preview source change.
- [x] GitHub Actions run [40903769421](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40903769421) completed successfully on branch `android/ui-polish-pass-1`, trigger commit `8cf13cb64722c8e14446592971bbac9ec50da37e`. The tree includes the source fix from `d9fa7eab8dac74b74c9f98ea08d729905c8c4615`.
- [x] `assembleDebug` and `Upload APK artifact` succeeded.
- [x] Artifact: `MG30-Studio-debug-APK`, ID `12909494822`, ZIP size 3,987,384 bytes; ZIP SHA-256 `80b4b98d3c95651e8dc9abbadff07643b1c360ae7100fadd9e81a94c3cf8ec60`. Expires 2026-11-12.
- [x] Extracted APK: `MG30-Studio-Live-Reorder-Preview.apk`, size 4,365,876 bytes; APK SHA-256 `2aae4e8b1a5f5fc35b034519c4d8e461c4bb154f29db3489609e4b95a2995511`.
- [x] Restored `.github/workflows/build-apk.yml` push branch filters after the build had started. Automatic push-triggered build for `android/ui-polish-pass-1` remains disabled by default, to avoid an uncontrolled build on every documentation-only commit; the latest APK was explicitly built and verified for this source change.
- [ ] Runtime-test on Android: drag EFX over OD and verify OD visibly shifts during drag, confirm drop order persists after release, ensure AMP/IR adjacency validation still works, and verify real-time MG-30 ACK/readback.
- [ ] After testing, recheck existing NAM import/use, IR Collection transfer, and MIDI mappings remain intact.


## Follow-up — preset-aware Collection IR marker (2026-10-29)

- [x] Add a local per-preset mapping from hardware program slot 0–127 (display labels 01A–32D) to Collection IR slot 01–24.
- [x] After a successful Collection → User action, record the source slot against the preset that was selected when the action started. Direct Collection-use records only after the existing 6E/02 reply; WAV transfer records only after the existing 75/75 frame transfer succeeds.
- [x] When the selected/active hardware preset changes, update the active marker from that preset's saved mapping.
- [x] Style only the Collection slot-number badge red; leave the card, name, file details, and buttons unchanged. Add a small legend explaining that red means the IR associated with the selected preset.
- [x] If the user imports a standalone WAV to User (not from a Collection slot), clear the current preset's old Collection association after successful transfer, so an outdated badge is not shown.
- [x] The Collection IR transfer packet builder, USB-MIDI request bytes, response/ACK checks, NAM code, MIDI mappings, and signal-chain sender are unchanged.
- [x] Inline JavaScript and the IR ES module passed parser checks after the change.
- [x] APK build succeeded in GitHub Actions run [40907019774](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40907019774), run #86; trigger commit `1b4034f8739fe8d6aac5456edd93600667b48e1a`. Android `assembleDebug` and artifact upload both passed.
- [x] Artifact: `MG30-Studio-debug-APK`, ID `12911113452`, ZIP size 3,988,128 bytes; ZIP SHA-256 `9fe17d0eb29abe584e07dbbb51858460218b5667b514d42b3a2f21496f2cdeef`. It expires 2026-11-12.
- [x] Extracted APK: `MG30-Studio-Collection-IR-Preset-Marker.apk`, size 4,366,808 bytes; APK SHA-256 `f8254df36556f6ee4764b5b8ddb06a52cc605a60da71786883fb34dc8da46b39`.
- [x] Source commits: [HTML active-preset marker event + red badge style](https://github.com/Vaivaii/Nuxmg30-web-app/commit/ffb9b66134c9ba97f28765e8154700a3ad1c3542) and [per-preset Collection → User association](https://github.com/Vaivaii/Nuxmg30-web-app/commit/bb8f4d5b2696f27976ad18df0f7fc8e6b5ce9427).
- [x] Restored `.github/workflows/build-apk.yml` push filters; automatic build trigger on `android/ui-polish-pass-1` remains disabled by default after this confirmed build.
- [ ] Runtime-test: use Collection 01 in preset 01A and Collection 04 in preset 01B; switch between the presets and confirm only the corresponding number badge turns red. Also confirm a direct WAV-to-User import clears the old marker only after success.



## Follow-up — cabinet IR slot badge + tab navigation order (2026-10-29)

- [x] Add a compact red `IR 01` badge to the IR cabinet artwork when the current hardware preset has a saved Collection IR 01–24 association and the cabinet model is Third-party/User IR.
- [x] The badge reads the existing `mg30-ir-collection-preset-map` mapping, so it follows the active preset instead of being a global current-slot marker.
- [x] Refresh the cabinet badge immediately after a Collection → User association is saved or cleared, using the `mg30-collection-ir-mapped` UI event; the mapping is only changed after successful transfer/use confirmation.
- [x] Reorder bottom navigation to `Editor → NAM & IR → Presets → Studio → Device`. Page IDs, navigation click handlers, and page implementations remain the same.
- [x] JavaScript syntax checks passed for both inline app scripts and the IR transfer ES module; static checks verified badge lookup/event and tab order.
- [x] No changes to the IR waveform/name/curve transfer packet sequence, NAM transfer, MIDI mappings, or signal-chain SysEx/ACK behavior.
- [x] APK build completed successfully: GitHub Actions run [40909332299](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40909332299), run #87, trigger commit `e2f65d2e8162ae7b9bc15221e3787294aa571a2a`; Android `assembleDebug` and artifact upload both succeeded.
- [x] Artifact `MG30-Studio-debug-APK`, ID `12912892334`, ZIP size 3,988,510 bytes; ZIP SHA-256 `088effdb1a07691d36e9c99945e0c0caaa1af6d58d1084c33e70d3d71d278f07`; expires 2026-11-12.
- [x] Extracted APK `MG30-Studio-Cabinet-IR-Badge-Tab-Order.apk`, size 4,367,124 bytes; APK SHA-256 `075fb7e73f3642fcec92e8135201260960a185a37b31e1f075af1059530a6dbc`.
- [x] Source commits: [cabinet badge + nav order](https://github.com/Vaivaii/Nuxmg30-web-app/commit/01f6fb871a8c58794961b420d4a820ffce1330a5), [mapping update event](https://github.com/Vaivaii/Nuxmg30-web-app/commit/a12e510ca40b81557e557115cefc97da89b1ec18), and [badge refresh listener](https://github.com/Vaivaii/Nuxmg30-web-app/commit/7e799e9ecd9eda3446c8eb94c5a49d814d35fcac).
- [x] Restored the workflow branch filter after the build started; automatic build trigger for `android/ui-polish-pass-1` is disabled by default again.
- [ ] Runtime-test: select a preset with a Collection IR association and confirm its cabinet artwork shows the right `IR 01` / `IR 04` badge; switch to another preset with a different mapping and confirm it updates. Check navigation taps/pages after tab reordering, and recheck NAM/IR transfer.



## Follow-up — QuickTone Copy Scene port (2026-10-30)

- [x] Reverse-engineered the actual QuickTone 2.6.7.16 Copy Scene callback `0x5BA430`: option index 0/1 is mapped against active source scene, then the 142-byte scene data block is copied to the destination.
- [x] Reproduced the verified on-wire sequence: read three `0C 02` scene parts; write all three `0C 01` parts in scene-index order; wait for corresponding `0C 03` ACK for each; send CC80 destination; query scene status and read back destination payload before reporting success.
- [x] Added a Copy Scene dropdown that offers only the other two scenes, with explicit overwrite confirmation and preset-slot mismatch guard.
- [x] UI markup/source commit: `2167ec51be6335c113717f746ee0c40eaa7f9927`; CSS commit: `0f24d9846b67d25b7385a1ef4d7047301cec68f7`.
- [x] Inline JavaScript parse check passed for both inline scripts; static checks verified menu wiring, ACK handling, target CC80, and read-back equality validation.
- [x] APK build run [#88 / 40928213459](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40928213459) succeeded; Android `assembleDebug` and artifact upload passed.
- [x] Artifact: `MG30-Studio-debug-APK`, ID `12922190556`, ZIP size 3,991,519 bytes; ZIP SHA-256 `af08487e85b089b80a9c03becbcab2330d6f22189fdf609775bceca356c58d46`; expires 2026-11-12.
- [x] Extracted APK `MG30-Studio-Copy-Scene-Gen2.apk`, size 4,369,432 bytes; SHA-256 `d5de8040bbc0387305ccd9bdbdc59911be3d6e7c644e13d4107c0ceb1c335404`.
- [x] Restored the workflow branch filter via commit `75c19f54aad07becc7a80fee32e842132bdd07da`; the Copy Scene source was built from trigger commit `8c44e01c8310f7d394bb5c3dd62502ffe6cc1a25`.
- [ ] Runtime-test on the original MG-30 Gen2 firmware 6.0.x: test with intentionally different source/target scene data, verify source is unchanged, destination matches byte-for-byte, and verify all six source-target combinations. Confirm existing NAM import/use, IR Collection transfer, and MIDI mappings continue working.


## Follow-up — Copy Scene mobile layout and verification timing (2026-10-30)

- [x] Fix popup clipping on mobile by capping menu width at the viewport minus 24 px and allowing long target labels to wrap.
- [x] Wait 220 ms after CC80 target-scene selection before requesting active scene/preset status, matching the existing scene-switch handler's settle time.
- [x] Replace the generic Copy Scene failure toast with stage-specific diagnostics; status identifies the failing phase and concrete error, with ACK count/CC80 state recorded.
- [x] Both inline scripts pass JavaScript syntax checks; static checks confirm the new width constraints, wrapping, scene-settle delay, ACK checks and payload read-back verification remain present.
- [x] Build run [#89 / 40930240411](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40930240411) passed (assembleDebug + artifact upload).
- [x] Artifact ID 12921304697, ZIP size 3,991,970 bytes, ZIP SHA-256 5eb8f1cd4a05459f703d3a7b0a7835d94820618c565617d0fa745d877c1bb127; expires 2026-11-12.
- [x] APK MG30-Studio-Copy-Scene-Mobile-Fix.apk, size 4,369,816 bytes, SHA-256 67c05ac2e2f96ca981d761d67b18b12dd566e4fc5697f048b212fd09f6dceeed.
- [x] Workflow branch filter restored by commit 5d0b3f333f4ecfed9c91bb14784f292048f5b2ae.
- [ ] Test on the original MG-30 Gen2 firmware 6.0.x. Verify dropdown is fully visible and try a source/target pair with different settings; if it fails, record the new detailed stage/error message for the next protocol correction.
- [ ] Recheck NAM, IR Collection, and existing MIDI mappings after hardware testing.


## Follow-up — dropdown portal and preset status resynchronization (2026-10-30)

- [x] Portal Copy Scene menu into document body and position it from the button's bounding box, clamped to the screen, repositioning on scroll/resize.
- [x] On mismatch (for example app 31B vs device-reported 01D), ask permission to send Program Change to selected app slot, wait, and query again. Scene writing proceeds only if status confirms the selected slot; otherwise abort safely.
- [x] Syntax checks passed for both inline app scripts; static checks verify popup portal/positioning, Program Change, follow-up status check and destination payload read-back guard.
- [x] Build run [#90 / 40932094023](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40932094023) succeeded (`assembleDebug` + artifact upload).
- [x] Artifact `MG30-Studio-debug-APK`, ID `12922463144`, ZIP size 3,992,666 bytes, ZIP SHA-256 `1a4f3604aca541a968336162090c745fcddfb38fd12eda926241a15e879a3b80`; expires 2026-11-12.
- [x] APK `MG30-Studio-Copy-Scene-Preset-Alignment.apk`, size 4,370,572 bytes, SHA-256 `edf0244d868989b618b83b9080a7f965ae9d25a40732127a7631707175a5a1db`.
- [x] Source commit `2fc91435a9946cdcc3c0a8d3f1b918dad4974e50`; workflow push filters restored by `1371679ebcf760cacd36251f8f508427109e7589`.
- [ ] Test on original MG-30 Gen2 firmware 6.0.x. Confirm the dropdown is fully visible. If status still reports 01D after confirming Program Change to 31B, capture the detailed status/readback so the preset-status byte interpretation can be corrected without bypassing the write guard.


## Follow-up — active preset slot sync correction (2026-10-30)

- [x] Fix status parser to read the zero-based preset slot from response body byte 5 (`reply[5]`), not byte 6. The earlier offset produced 01D (slot 3) where physical 02A (slot 4) is reported.
- [x] Fix Copy Scene mismatch branch to use a mutable status variable so the post-Program-Change response can be read without a runtime `const` assignment error.
- [x] Add program-change detection to hardware polling, separate from scene-change detection, and update `targetSlot`, bank/slot indicators, hardware preset name and buffer when the active program changes.
- [x] Both inline scripts pass syntax checks; static checks confirm the response-byte correction, mutable status assignment and hardware preset polling path.
- [ ] Confirm on physical MG-30 Gen2 firmware 6.0.x that R.PLEXI reports 02A after connecting, remains 02A during idle polling, and Copy Scene reads/writes preset 02A only. Verify source scene unchanged and destination data matches.


## Follow-up — correct active preset slot byte and polling (2026-10-30)

- [x] Fix the `15/02` status parser from `reply[6]` to `reply[5]`; the observed off-by-one label 01D for physical 02A is consistent with reading the adjacent field.
- [x] Change Copy Scene status binding from `const` to `let` so the status response after Program Change can be processed.
- [x] Track `lastReportedProgram` separately from scene status; preset changes detected by polling now refresh the slot index, bank selector, preset name and hardware buffer even when scene index is unchanged.
- [x] Both inline scripts passed JavaScript syntax parsing.
- [x] APK build run [#91 / 40934489229](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40934489229) passed; `assembleDebug` and artifact upload succeeded.
- [x] Artifact ID `12923014115`, ZIP size 3,992,913 bytes, ZIP SHA-256 `cf75b33199b8ab94b57ce52a61a671ce4d3fc8fbecf5f854dcd472f501c56edf`; expires 2026-11-12.
- [x] APK `MG30-Studio-Active-Preset-Sync-Fix.apk`, size 4,370,824 bytes, SHA-256 `569a4889d3c832b7ef93261eb5ef40f44f0688d1ef5b32db98d54fc976a65689`.
- [x] Source commit `e000d5b5c1a8c5accd1faa542173c0d5731298da`; workflow branch filter restored by `6bbb0ba6b038762675fd5973b72b5fbccd42e737`.
- [ ] Confirm on original MG-30 Gen2 firmware 6.0.x that R.PLEXI appears as 02A immediately after connection and remains correctly labeled while connected; then test Copy Scene source preservation and destination read-back on 02A.


## Follow-up — Copy Scene `body.set` runtime failure (2026-10-30)

- [x] Diagnosed reported dialog `body set not function`: MIDI receive parsing returns a normal JavaScript Array, so calling TypedArray-only `.set()` throws before the write sequence starts.
- [x] Replaced `body.set(sourcePayload, 7)` with per-byte `sourcePayload.forEach((value, offset) => { body[7 + offset] = value; })`.
- [x] Copy Scene failure toast now shows up to 120 characters for 6.5 seconds; other toast messages keep the default duration.
- [x] Both inline scripts passed JavaScript syntax checks; confirmed the `.set()` call was removed and per-byte payload copy is present.
- [ ] APK build #92 / run `40935784561` and artifact SHA/link to be recorded after successful workflow completion.
- [ ] Verify Copy Scene on the physical MG-30 Gen2: different source/target content, source unchanged and target read-back equals source. If it fails, use the now-longer message to capture the actual next protocol-stage error.


## Follow-up — Copy Scene Array payload fix, build #92 (2026-10-30)

- [x] Replace `body.set(sourcePayload, 7)` with byte-wise assignment because readback payload parts are standard JavaScript arrays, not TypedArrays.
- [x] Extend Copy Scene diagnostic toast to 6.5 seconds (normal toast timing remains unchanged for all other calls).
- [x] Both inline scripts pass syntax checks.
- [x] Build [#92 / 40935784561](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40935784561) succeeded (`assembleDebug` + artifact upload).
- [x] Artifact ID `12925280867`, ZIP size 3,992,958 bytes, ZIP SHA-256 `fe8b2265450cd460d1653024eca346f59008c53a321baf4313cc785146504960`.
- [x] APK `MG30-Studio-Copy-Scene-Array-Fix.apk`, size 4,370,868 bytes, SHA-256 `823b4ed362605cc9a865827c030eec5aeb270930123a2a0b2e9d0825212f59e3`.
- [x] Source fix commit `dc2891a1402f555d940b2a0e7c04322ed9b1e6a9`; workflow filter restored by `64bb487352308415c70539bd2aa050204ed574b8`.
- [ ] Test on original MG-30 Gen2 firmware 6.0.x. Confirm the `body.set` error is gone and then verify actual target-scene write/read-back. If there is a new error, capture the now-longer diagnostic.


## Follow-up — Copy Scene source scene tracking (build #93, 2026-10-30)

- [x] Use `activeSceneIndex` (scene selected in the editor / CC80 state) as Copy Scene source, instead of the `scene` field from the `15/00` status query that was consistently being parsed as Scene 1 in the user's tests.
- [x] Remove the post-copy rejection based only on `after.scene`; keep hardware preset consistency checking and destination byte-for-byte payload read-back before success.
- [x] Both inline app scripts passed syntax checks. Static checks verified source uses `activeSceneIndex`, preset check remains, and ACK/read-back checks are retained.
- [x] Build [#93 / 40938188175](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40938188175) succeeded (`assembleDebug` + artifact upload).
- [x] Artifact ID `12925423351`, ZIP size 3,993,091 bytes, SHA-256 `46c086a644319ed382970c5c8af167eef02f14ef39439172027842c9d553ab11`.
- [x] APK `MG30-Studio-Copy-Scene-Source-Scene-Fix.apk`, size 4,370,996 bytes, SHA-256 `bec19f99f65db49d9bc443558dbd43da42e218cb928ecd2400c0de3fd584f2ff`.
- [x] Source commit `d8a5751a2e09c6205d96c1b011b3853f9ca56f6a`; workflow branch filter restored by `e8f8218161f16a0bd27c3ec615000eaba005f2e8`.
- [ ] Test on original MG-30 Gen2 firmware 6.0.x with distinct scene values: Scene 2 → 1, Scene 2 → 3, Scene 3 → 1 and Scene 3 → 2. Confirm the dialog source reflects the selected scene, source remains unchanged, and target read-back equals source.


## Follow-up — compact Copy Scene dropdown (2026-10-30)

- [x] Replace option labels with only `Scene 1`, `Scene 2`, or `Scene 3`; remove the `Copy to` prefix and `Salin dari Scene` subtitle.
- [x] Reduce dropdown width to 148 CSS px, compact menu/option padding and gap, and use a single-line option layout.
- [x] Both inline app scripts pass JavaScript syntax checks; static checks verify compact width and simplified labels.
- [ ] APK build #94 / run `40940168961` is still in progress in the last status check; add artifact checksum and APK reference after completion.


### Compact dropdown build follow-up (2026-10-30)

- Source and syntax checks are complete. Run [#94](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40940168961) did not finish on the last check; retry [#95](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40940578576) was also still in `assembleDebug` with no artifact uploaded.
- Do not give out an older APK as if it contains this menu polish. Recheck either run and record APK checksum when a successful artifact is available.
- Workflow branch filter was restored; default blob SHA `877d83759eba533b56f516fbfa99812d3bead089`.


# Project handoff — next-session goals (saved 2026-10-30)

## Current state at handoff

- Target remains the original NUX MG-30 Gen 2, firmware 6.0.x; do not switch assumptions to MG-30 MKII.
- Preset number synchronization from the connected pedal has been fixed and user-verified.
- Copy Scene is now working on the user's pedal after fixing the JavaScript Array `.set()` error and using the editor-selected scene as the copy source. The user confirmed successful copying.
- Latest UI request: simplify Copy Scene dropdown options to `Scene 1`, `Scene 2`, `Scene 3` only; remove “Copy to” and source subtitle, and compact popup dimensions. Source edits and syntax checks are done, but APK build runs #94 (`40940168961`) and #95 (`40940578576`) were still reported in progress with no artifact at last check. Recheck build/artifact before supplying a new APK; never substitute an older APK as the compact-menu build.
- Keep working NAM import and IR User/Collection paths intact. Do not alter already-correct MIDI mappings or the verified Copy Scene write/ACK/read-back path without evidence and regression checks.

## Next session — ordered goals

### Goal 1 — Compact Copy Scene dropdown — COMPLETE (user confirmed 2026-10-30)
- [x] Compact Copy Scene dropdown implemented: options are only “Scene 1”, “Scene 2”, “Scene 3”; no “Copy to” prefix or source subtitle; popup width/padding reduced.
- [x] User confirmed roadmap item 1 is complete.
- [x] Source commits: HTML label simplification `28059bb44bec055b7866c157d643b5679e945369`; CSS compaction `dd0760be39c9f0af3cb75622d63a8cafa11d4e0c`.
- [x] Previous notes recorded APK build runs #94 (`40940168961`) and #95 (`40940578576`) as still running/no artifact at the last status check. User now confirms this roadmap item is complete; treat this as superseding the pending status for the roadmap, and do not reopen unless the user reports a regression.
- [x] Move on to Goal 2: reverse-engineer QuickTone CTRL / Expression controls.

### Goal 2 — Reverse-engineer CTRL / Expression pedal controls
- [x] Inspect QuickTone Windows v2.6.7.16 UI strings, event handlers, data structures, and MIDI/SysEx call sites related to CTRL and Expression/EXP assignments.
- [x] Map QuickTone controls to their protocol payload and acknowledgement using captures/disassembly; distinguish wire-confirmed evidence from static-code inference.
- [x] Identify assignment fields, range/enum values, and read-back behavior.
- [x] Implement the CTRL / EXP controls in MG30 Studio with read-back/ACK handling and safe validation.
- [x] Complete Goal 2 on the original MG-30 Gen2 firmware 6.0.x. User confirms Goal 2 is successful; do not reopen or repeat its analysis/testing unless a regression is reported. Preserve NAM, IR User/Collection, MIDI mappings, preset sync, signal-chain realtime reorder, and Copy Scene.

### Goal 3 — Replicate QuickTone preset-management features

**Import/export presets**
- [ ] Determine QuickTone preset file format, extension, structure, checksums/headers, and any version fields.
- [ ] Support importing/exporting a preset in a form the MG-30 can actually read; validate round-trip by exporting from the pedal, importing to the app, and comparing the device read-back.
- [ ] Keep device-write operations explicit and guarded against writing to the wrong preset slot.

**Rename preset**
- [ ] Find the QuickTone rename code path and capture/verify the protocol.
- [ ] Implement rename with device ACK and read-back confirmation; ensure displayed preset number and name stay synchronized.

**Save As / duplicate preset**
- [ ] Trace QuickTone Save As/duplicate behavior and whether it copies on-device or exports/imports data.
- [ ] Implement duplicate to a chosen destination slot, preserving source and validating destination contents after writing.
- [ ] Check preset naming, slot selection, and overwrite confirmation.

**IR and NAM — rename on the pedal from the app**
- [ ] Scope clarified by user: this is a straightforward rename operation. When the user renames an IR or NAM in the app, the new name must be written/synchronized to the MG-30 so the device shows the same name. This is not just a local UI label change.
- [ ] Find and verify QuickTone's device-side rename command/protocol for IR and NAM, including ACK/read-back behavior.
- [ ] Implement rename controls in the app that send the new name to the correct device asset and confirm the device accepted it.
- [ ] Verify the renamed name is shown by both the pedal and app after refresh/reconnect, and that the correct IR/NAM item was renamed.
- [ ] Keep this task limited to renaming. Do not add or redesign import/export, change IR User/Collection mappings, alter NAM import, or change MIDI mappings as part of this goal.

### Goal 4 — Redesign Studio UI
- [ ] Review the current Studio screen and QuickTone's equivalent functions before deciding information architecture.
- [ ] Sketch a compact mobile-first layout for studio tools and preset/asset management; keep Editor, NAM & IR, Presets, Studio, Device navigation consistent unless a clear usability reason warrants a change.
- [ ] Make UI-only changes independently of protocol work, then verify no changes to NAM, IR, MIDI, or scene-transfer behavior.

## Execution order — one milestone at a time

This sequence is the user-facing roadmap. Do not work on multiple feature milestones in parallel.

1. [x] **Copy Scene dropdown polish** — completed and confirmed by user.
2. [x] **CTRL / Expression controls** — completed successfully on the original MG-30 Gen2; user confirmed. Do not reopen unless regression is reported.
3. [ ] **Preset import/export** — identify QuickTone preset format and implement files the MG-30 can actually read/write; verify round-trip on hardware.
4. [ ] **Rename preset** — rename from the app and synchronize the name to the device; verify ACK/read-back.
5. [ ] **Save As / duplicate preset** — copy a preset to a chosen slot, preserve the source, confirm overwrite explicitly, and verify destination read-back.
6. [ ] **IR and NAM device-synced rename** — rename an IR or NAM in the app and write the new name to the physical MG-30 so the device and app show the same name. This milestone is rename only; no new import/export work.
7. [ ] **Studio UI redesign** — redesign the Studio screen after core protocol features are stable.

## Working method and acceptance rules

1. Investigate QuickTone and captures first; label facts as “wire-confirmed”, “static-code evidence”, or “hypothesis”.
2. Make one narrowly scoped change at a time, run syntax/static checks, and build an APK immediately after each source/UI change.
3. Record every source commit, test result, build run, artifact ID, filename, size and SHA-256 in this project note.
4. Do not call a feature complete from compilation alone. Hardware acceptance requires correct ACK, device read-back, and a regression check on working NAM/IR/MIDI/preset sync.
5. If the conversation is interrupted, resume from this handoff section and inspect the latest branch/build state before editing.


## Scope clarification — device-synced IR/NAM rename (2026-10-30)

User clarified the exact requirement: rename the IR or NAM **from the app and synchronize/write the changed name to the physical MG-30**, so the name also changes on the device. This is a device-side rename feature, not merely changing a local display label. Reverse-engineer QuickTone's rename command for the appropriate asset type and verify the device ACK/read-back. Keep the task limited to renaming; do not fold in new import/export work or alter existing IR User/Collection, NAM import, or MIDI paths.


## Goal 2 — CTRL / Expression reverse-engineering progress (2026-10-30)

### Static QuickTone executable inspection — initial findings

Input executable: user-provided `NUX_QuickTone_V2.6.7.16_Windows.zip`, containing `QuickTone.exe` (190,296,504 bytes).

- [x] Extracted the executable and inspected its printable strings / MSVC RTTI-style class names.
- [x] Confirmed MG-30-specific UI classes are present: `NuxPedalPopupMenuMG30`, `NuxPedalSettingPanelMG30`, and `NuxPedalSetValuePanelMG30`. Separate MK2 classes also exist; analysis must stay on the MG30 (non-MK2) class family.
- [x] Found UI/resource strings including `EXP & Pedal`, `EXP & Pedal1`, `EXP & Pedal2`, `CTRL`, `CTRL1`, and `CTRL2`.
- [x] Found a MG30-specific MIDI transmission method name `NuxMidiTransmissionMG30::getPedalSetCheck`, plus a similarly named MG30MK2 method. This is a useful code-navigation lead, but the method's packet format and semantics are not yet established.
- [x] Found MG30-specific incoming MIDI handler symbols and a lambda associated with the `NuxPedalSetValuePanelMG30` constructor. The exact event-to-packet call graph remains to be disassembled.
- [ ] Determine the actual UI fields/options, their value ranges/enums, and whether CTRL and EXP are per-preset or global.
- [ ] Disassemble the MG30-specific panel constructor/callbacks and `getPedalSetCheck`; trace exact outgoing messages and matching incoming ACK/readback.

### Evidence classification

- **Static-code evidence:** QuickTone v2.6.7.16 contains distinct original-MG30 pedal-setting UI/transmission classes and CTRL/EXP labels.
- **Not yet wire-confirmed:** No command bytes, parameter offsets, value encoding, ACK pattern, or readback behavior have been established for CTRL/EXP.
- **Capture gap:** The currently supplied capture inventory includes IR User/Collection, NAM import, Deluxe capture, and Copy Scene traces. No capture is yet identified as a dedicated CTRL/Expression edit/readback session. Do not infer a CTRL/EXP protocol from the unrelated IR/NAM/Copy Scene packets.
- **No application source changes have been made for Goal 2.** Existing NAM, IR, MIDI mapping, preset sync, and Copy Scene code remains untouched.

### Required next evidence

Capture QuickTone v2.6.7.16 communicating with the original MG-30 Gen2 firmware 6.0.x while performing isolated operations:
1. Open the pedal-setting / EXP & Pedal panel without changing anything (baseline/read request).
2. Change exactly one CTRL setting, apply/save it, then capture the response.
3. Restore baseline, change exactly one EXP setting (or calibration/range field), apply/save, then capture the response.
4. Reopen/read the panel to determine whether QuickTone performs an explicit readback.
5. If there are separate CTRL1/CTRL2 or EXP1/EXP2 tabs/options, capture each independently and note which field was changed.

Keep each operation isolated and note the before/after UI value. Preserve the raw USBPcap/pcapng files. Do not send guessed SysEx or test unknown commands against the pedal.

### Current status

Goal 2 remains **analysis in progress**. Next work is deeper static call-graph/disassembly plus dedicated CTRL/EXP captures. No feature implementation or APK build is appropriate until the protocol fields and ACK/readback path are supported by evidence.


### Goal 2 capture checkpoint — 2026-10-30

- [x] Received screenshot plus dedicated `ctrl1efx.pcapng` and `ctrl2wah.pcapng` from the user.
- [x] Decoded USBPcap bulk endpoint traffic and reassembled USB-MIDI events.
- [x] Identified outgoing `F0 43 58 70 13 01 ... F7` messages and matching `F0 43 58 70 13 03 ... F7` device responses. Captures show the response approximately 1 ms after each request.
- [x] Identified three varying payload bytes at SysEx offsets 10–12, but their meanings are not yet mapped.
- [x] Found two additional CC77/value55 messages in the CTRL1 capture only; purpose unknown.
- [x] Static QuickTone UI evidence includes MG30 pedal setting classes, `getPedalSetCheck`, and separate T:/R: function option lists.
- [x] Detailed raw packet bytes, hashes, evidence classification, and next differential-capture steps saved in [CTRL_EXPRESSION_QUICKTONE_REVERSE_ENGINEERING_2026-10-30.md](CTRL_EXPRESSION_QUICKTONE_REVERSE_ENGINEERING_2026-10-30.md).
- [ ] Obtain isolated panel-open/read capture, CTRL1 single-choice change, CTRL2 single-choice change, and panel reopen/readback capture.
- [ ] Map the three changing bytes to controls and UI enums; establish CC77 purpose and whether settings are preset-specific/global.
- [ ] No application source change or APK build yet. Continue analysis only until command semantics and readback are established.



### Goal 2 — dependent CTRL/EXP controls clarified by screenshots (2026-10-30)

- [x] User clarified CTRL1 = EFX with dependent fields: effect model (example DIST UNO) and model-specific controllable parameter (example LEVEL; other effects may expose DRIVE or different parameters).
- [x] User clarified CTRL2 = WAH with selected pedal model (example CLYDE) and a WAH MIN/MAX range editor.
- [x] Added the distinction between observed screenshot values (MIN slider shown at 0–50 and MAX at 51–100 in the example) and unverified universal device defaults/limits.
- [x] Updated detailed analysis document with a dependent data-model hypothesis and isolated field-by-field capture plan.
- [ ] Capture changes to EFX model, EFX parameter, WAH MIN only, and WAH MAX only; keep all other fields and preset fixed.
- [ ] Map those field changes to the observed SysEx payload bytes and confirm panel readback.
- [ ] No app source changes or APK build; still protocol-analysis phase.



### Goal 2 — correction: built-in EXP pedal and Signal Chain-linked EFX (2026-10-30)

- [x] User clarified hardware callout/row 1 is the MG-30's built-in NUX expression pedal, not an external footswitch.
- [x] Corrected CTRL1/EFX interpretation: column 2 (e.g. DIST UNO) is read-only context from the active EFX block in Signal Chain, not an editable model selector in the CTRL dialog.
- [x] Column 3 chooses a parameter supported by that active effect (e.g. DRIVE or LEVEL); available options depend on the Signal Chain EFX model.
- [x] Corrected the previous analysis hypothesis and documented the distinction between this EFX path and the separate WAH model/MIN-MAX range example.
- [ ] Capture a single CTRL1 third-column change (e.g. LEVEL → DRIVE) with the Signal Chain EFX model held constant.
- [ ] Separately change the actual Signal Chain EFX block/model and observe whether CTRL1 column 2 and available parameter choices update automatically.
- [ ] Keep WAH MIN/MAX capture separate until its exact control-row relationship and range semantics are established.
- [ ] Existing protocol bytes at offsets 10–12 remain unmapped; no app source change or APK build yet.



### Goal 2 — hardware control families clarified by user (2026-10-30)

- [x] **Callout 1:** built-in NUX expression pedal. EFX assignment references the active Signal Chain EFX model and selects a model-supported parameter (e.g. DRIVE/LEVEL); WAH has its own model and MIN/MAX range path.
- [x] **Callout 3:** external NUX footswitch, with separate T and R contact assignments / two configuration columns. Its user-confirmed actions are limited to toggling a pedal/block currently active in Signal Chain and scene up/down.
- [x] **Callout 4:** CTRL associated with built-in Multi EFX. User-confirmed actions include Delay TAP, pedal/block on/off, and scene cycling 1–3.
- [x] Detailed technical note now separates the three control families and explicitly warns against using ambiguous CTRL1/CTRL2 names before row-to-hardware mapping is captured.
- [ ] Capture callout 1 expression parameter change with the Signal Chain effect held constant.
- [ ] Capture external footswitch T and R assignments independently, including block toggle and scene up/down.
- [ ] Capture Multi EFX CTRL TAP, block toggle, and scene cycle 1–3 independently.
- [ ] Capture panel-open/readback for each family; identify its own command/ACK/readback path.
- [ ] No app source changes or APK build yet. Keep all three control families separate until their wire semantics are established.



### Goal 2 — CTRL2 working hypothesis updated (2026-10-30)

- [x] User proposes CTRL2 is expression-related because its dependent configuration columns resemble CTRL1, not the external T/R footswitch editor.
- [x] Treat this as the leading hypothesis for investigation, not as confirmed hardware fact.
- [ ] Determine whether CTRL2 is a second physical expression input, an alternate/internal expression assignment, or another expression-related controller.
- [ ] Capture a CTRL2-only assignment change while keeping CTRL1 and external T/R unchanged.
- [ ] If possible, test built-in and external expression pedal movement independently and observe which assignment responds.
- [ ] Verify CTRL1/CTRL2 independent readback and compare their SysEx with external T/R transactions.
- [ ] Do not label CTRL2 as external footswitch. No app source changes or APK build until physical mapping is established.



### Goal 2 — final scope/priorities clarified by user (2026-10-30)

- [x] CTRL2 retained as the additional-expression-pedal assignment. User does not own the additional expression pedal, so physical behavior cannot be tested now.
- [x] Do not spend current milestone effort trying to prove CTRL2 physical response. Keep CTRL2 configurable/present; do not delete it or repurpose it as external footswitch.
- [ ] **Priority 1 — CTRL1 / callout 1:** built-in expression pedal assignment and effect-dependent parameter controls; protocol, ACK/readback and physical validation.
- [ ] **Priority 2 — CTRL3 / callout 3:** external footswitch T/R mappings for active Signal Chain block ON/OFF and Scene Up/Down; validate T and R independently.
- [ ] **Priority 3 — CTRL4 / callout 4:** Multi EFX CTRL mapping for Delay TAP, block ON/OFF and scene cycling 1–3.
- [ ] **CTRL2 — retained, physical validation deferred:** preserve QuickTone-compatible configuration UI/protocol where supported; mark hardware response unverified until an additional expression pedal is available.
- [ ] Milestone goal is changing the CTRL assignments in MG30 Studio for each numbered control, with implementation/testing focused on 1, 3 and 4 first. CTRL2 remains in the configuration surface.
- [ ] No app source changes yet; remain in protocol mapping/capture phase until commands, payload fields, ACK and readback are supported.



### Goal 2 — CTRL1 LEVEL → DRIVE differential capture (2026-10-30)

- [x] Received and decoded `ctrl1leveltodrive.pcapng` (3,044 bytes; SHA-256 `5edda84a0144e3ec76cc94b65e7ea2ed850aeb90ec4a893748df4d051871dd5d`).
- [x] Reassembled USB-MIDI traffic: one OUT SysEx `F0 43 58 70 13 01 0A 07 04 02 01 03 00 00 00 64 00 64 F7`, followed by the usual IN response `F0 43 58 70 13 03 00 00 00 00 00 00 00 00 F7` approximately 1.424 ms later.
- [x] Compared against `ctrl1efx.pcapng` CTRL1 baseline. Six SysEx positions differ: offsets 6, 7, 8, 10, 11, and 12. This confirms a distinct command payload for the captured LEVEL → DRIVE selection; numeric meanings are still unmapped.
- [x] Confirmed there is no additional CC77 message and no separate readback transaction in this capture.
- [x] Appended full packet/differential analysis and evidence classification to `CTRL_EXPRESSION_QUICKTONE_REVERSE_ENGINEERING_2026-10-30.md` (commit `2294f6845e43276ee9891cc8b40e5826e9ffe58d`).
- [ ] Reopen the CTRL1/EXP panel without changing fields and capture the resulting device query/readback; this is the next most useful experiment.
- [ ] Do not implement or build yet: the payload bytes' semantics and device-side readback remain unproven. Preserve NAM, IR User/Collection, MIDI mappings, preset sync and Copy Scene unchanged.

### Goal 2 — QuickTone static parameter-menu disassembly (2026-10-30)

- [x] Disassembled original-MG30 QuickTone popup menu builder at `0x005C48F0`; function dropdown options match the screenshot: `----`, `WAH`, `EFX`, `AMP`, `MOD`, `DLY`, `RVB`.
- [x] Identified separate static T and R option lists in the same popup builder, including `T:SCENE`, `T:S.UP`, `T:S.DN` and parallel R entries. Do not conflate these with expression parameter menus.
- [x] Traced dependent parameter popup creation: QuickTone calls lookup helper `0x005C2070` for choice indexes 0 and 1 using the active type/model context. This statically corroborates exactly two parameter choices per active pedal/amp.
- [x] Extracted representative parameter identifier/display-label translations for CMP, EFX, MOD, DLY, RVB, AMP and WAH from QuickTone's resource string table.
- [ ] Decode runtime-populated metadata tables (singleton rooted at `0x0B8D9718`) so the two parameter IDs can be mapped to each active model and display label without capturing each pedal.
- [ ] Trace parser handling record header `15 02` and identify its source/role in the original-MG30 communication path; do not assume it is a readback without call-graph proof.
- [ ] Continue reverse engineering only; no app source changes or APK build. Protect existing NAM, IR User/Collection, MIDI mapping, preset sync and Copy Scene paths.

### Goal 2 — CTRL1/CTRL2 packed option state and lookup flow (2026-10-30)

- [x] Trace MG30 setting-panel event handler `0x005C4610`: selectors 0/1 update the low nibble of separate state bytes `+0x7D` / `+0x7E` (CTRL1/CTRL2 function); selectors 2/3 update the high nibble of those bytes (dependent option selection).
- [x] Trace panel refresh handler `0x005C13A4`: the low nibble resolves function/category context and the high nibble selects one of two dependent column-3 option entries; helper `0x005C2070` returns the second-column target/model label and the currently selected third-column parameter label.
- [x] Confirm RTTI for constructor `0x005C5290`: vtable `0x00D318FC` identifies `NuxPedalSetValuePanelMG30`; constructor creates slider/value controls. Exact WAH MIN/MAX caller and protocol semantics remain to be traced.
- [ ] Decode and align the full static initializer tables plus model-key string table into a readable model → target label → option 0 / option 1 catalogue. Do not publish pairs from partially decoded string IDs.
- [ ] Correlate packed state fields and option index with the `13 01` wire payload and confirm readback behavior.
- [x] Record findings in `CTRL_EXPRESSION_QUICKTONE_REVERSE_ENGINEERING_2026-10-30.md` (commit `4e1c82fc248feb62d106cff77671988b8f7cd6cf`).
- [ ] No app source changes/APK build yet; keep NAM, IR User/Collection, MIDI mappings, preset sync and Copy Scene untouched.

### Goal 2 — bulk CTRL parameter extraction from embedded QuickTone model JSON (2026-10-30)

- [x] Located structured embedded model-control JSON blobs in `QuickTone.exe`; entries expose ordered `languageKey` parameter lists per model.
- [x] Extracted two candidate profile sets that both include the user-confirmed MG30 model names `ANALOG DELAY` / `ANA-DLY`, `PLEXI 45`, and `DIST UNO`: resource blob at file offset `0x69F8DB0` (79 top-level entries) and blob at `0x6A41E78` (92 top-level entries).
- [x] Established strong static-data correlation that the first two non-empty `languageKey` entries match CTRL's two dependent parameter choices: ANA-DLY `RATE`/`INTEN`; PLEXI 45 `GAIN`/`PRES`; DIST UNO `LEVEL`/`DRIVE`. DIST UNO's `LEVEL` → `DRIVE` order matches the user's isolated SysEx capture.
- [x] Exported both candidate datasets to `QuickTone_CTRL_parameter_pairs_candidate_profiles.csv` (165 model rows; SHA-256 `e9eba79fea026a3d14a28617ba75ed468c9c49d1803eed7d32ed5dc84be400d7`).
- [x] Detailed extraction/correlation, profile offsets, pair differences and caveats recorded in `CTRL_EXPRESSION_QUICKTONE_REVERSE_ENGINEERING_2026-10-30.md` (commit `8f371e111434cff1af0d2c33cce8dd07e51075c0`).
- [ ] Trace which embedded profile set is selected by original `NuxPedalSettingPanelMG30` versus `NuxPedalSettingPanelMG30MK2`; do not confuse candidate profiles or use MKII-only model rows in the original MG30 implementation.
- [ ] Resolve special `PH 90` one-key case and WAH's distinct MIN/MAX path; do not invent missing second options.
- [ ] Correlate the selected embedded model pair data with the exact runtime lookup/write/readback path for `13 01` / `13 03` before implementation.
- [ ] No MG30 Studio source change or APK build yet. Preserve existing NAM, IR User/Collection, MIDI mappings, preset synchronization and Copy Scene.

### Goal 2 — user-provided parameter-family consistency checks (2026-10-30)

- [x] Record user's expected conventions: AMP generally `GAIN` + `MASTER`; OD generally `DRIVE` + `LEVEL`; DLY/RVB/MOD are the families expected to vary more by model.
- [ ] Compare these expectations against both extracted QuickTone resource profiles and resolve discrepancies before selecting the original MG30 profile. Do not force-normalize the table to these expectations; preserve exact QuickTone evidence.
- [ ] Prioritize original MG30 vs MKII resource-family selector, then spot-check representative AMP, OD, DLY, RVB and MOD mappings from static data. Avoid per-model capture unless a concrete unresolved discrepancy remains.

### Authoritative AMP CTRL mapping correction (2026-10-30)

- [x] User checked all AMP models in original MG-30 QuickTone and confirms every AMP exposes exactly `GAIN` + `MASTER` in CTRL parameter choices.
- [x] Mark candidate JSON-derived AMP pairs (`GAIN` + `PRES` / `CUT` / `BRIGHT`) as invalid for the canonical original-MG30 CTRL mapping; these likely represent model-editor controls or a different resource context/profile.
- [ ] Correct the extraction method: distinguish model-editor control arrays from the CTRL-specific two-option lookup table. Do not promote first-two model `languageKey` entries as CTRL pairs across all model categories.
- [x] No additional AMP capture required; user has checked all AMP models. Record the authoritative correction in the technical note (commit `2441dc5308b94d60f72c758b4bbd1b5df054eac7`).

## Goal 2 — CTRL/Expression static disassembly breakthrough (2026-10-30)

- [x] Continue original-MG30 QuickTone 2.6.7.16 disassembly (not MKII) before changing MG30 Studio source.
- [x] Map 13 01 write serializer VA 0x004A7FE0 to the settings record: SysEx offsets 9/10 are CTRL1 function/dependent-choice nibbles; offsets 11/12 are CTRL2 function/dependent-choice nibbles.
- [x] Map 13 02 incoming parser VA 0x004A8340 back to the same packed fields. This proves a native readback parser exists, but not yet the request that triggers it or a complete hardware readback transaction.
- [x] Map 13 03 write ACK checker VA 0x004A81F0; keep it distinct from the 13 02 state parser.
- [x] Confirm static function popup order for selector arguments 0/1: ----, WAH, EFX, AMP, MOD, DLY, RVB (indices 0–6).
- [x] Preserve separate T/R footswitch lists and do not assign the restricted selector-6 list to Multi EFX CTRL without caller/UI proof.
- [x] Record full byte layout, function list, capture caveats, and next steps in CTRL_EXPRESSION_QUICKTONE_REVERSE_ENGINEERING_2026-10-30.md.
- [ ] Trace the request/callback path that produces 13 02 readback when EXP & Pedal opens/reopens.
- [ ] Trace 0D 01/0D 02 against the MG30 set-value panel and WAH MIN/MAX sliders; do not assign those bytes to ranges yet.
- [ ] Recover the model-dependent CTRL parameter pair table from the correct MG30 panel/model data object; do not use candidate JSON editor arrays as canonical CTRL mappings. Keep the user-confirmed AMP pair GAIN + MASTER authoritative.
- [ ] Obtain a clean one-field CTRL1 dependent-choice capture plus panel reopen/readback capture if static tracing leaves ambiguity.
- [ ] No MG30 Studio source change or APK build in this checkpoint. NAM, IR User/Collection, MIDI mapping, preset sync, and Copy Scene remain untouched.


### Opcode correction — 0D query path (2026-10-30)

- Static recheck corrected the adjacent set-value-related message family: outgoing VA 0x004A7D40 sends 0D 00 (not 0D 01); incoming handler VA 0x004A7E60 checks 0D 02.
- Keep 0D 00/0D 02 separate from 13 01/13 03 CTRL assignment writes and ACKs. The 0D payload semantics and its connection to WAH MIN/MAX remain unproven.


## Goal 2 — Original-MG30 CTRL model lookup source located (2026-10-30)

- [x] Identify original MG30 panel constructor VA 0x005BE8D0 (RTTI: NuxPedalSettingPanelMG30, not MKII).
- [x] Locate embedded panel-data initializer VA 0x005C23E0, called with ECX = outer object + 0x74.
- [x] Trace dependent-choice lookup helper VA 0x005C2070, string/key resolver VA 0x005C2030, and dependent-choice popup builder VA 0x005C48F0.
- [x] Identify static selector-map bytes at VA 0x00D3124C and lookup table regions 0x14A, 0x168, 0x23A, 0x35A, 0x42C, 0x45C.
- [x] Correct evidence status: VA 0x005C48F0 builds the dependent-choice menu, not the first-column function menu; the first-column function item IDs/order remain to be traced.
- [ ] Reconcile the exact helper parent pointer with the initializer's +0x74 object base before extracting table rows.
- [ ] Trace function dropdown construction and item IDs; correlate with selector map and known CTRL1 EFX / CTRL2 WAH examples.
- [ ] Trace active model-index mapping through the singleton +0x2C data to category-array row indices.
- [ ] Decode key/display translation and validate against the user-confirmed original-MG30 AMP pair GAIN + MASTER for every AMP model.
- [ ] Do not implement or publish partial parameter rows until the AMP validation and base-pointer alignment pass.
- [ ] No app source changes or APK build in this checkpoint. NAM, IR User/Collection, MIDI mapping, preset sync and Copy Scene remain protected.


## Goal 2 — Original MG30 CTRL model/parameter table decoded (2026-10-30)

- [x] Resolve helper/initializer object-base alignment: constructor 0x005BE8D0 calls initializer 0x005C23E0 at outer+0x74; refresh/helper base is outer object; helper offsets map to initializer offset minus 0x74.
- [x] Decode static function-to-table selector map at 0x00D3124C: stored values 0 none, 1 WAH, 2 EFX, 3 AMP, 4 MOD, 5 DLY, 6 RVB map to selectors 0, 0, 2, 3, 6, 7, 8.
- [x] Recover original-MG30 model/parameter rows from the native initializer and key resolver; full table saved in docs/research/MG30_CTRL_EXPRESSION_MODEL_PARAMETER_TABLE_2026-10-30.md.
- [x] Validate EFX DIST UNO = LEVEL + DRIVE against the known UI/capture example.
- [x] Validate first 30 original AMP records = GAIN + MASTER against the user's direct check of all AMP models. This resolves the earlier candidate JSON conflict.
- [x] Identify WAH special rows (CLYDE, CRYBB, V847, HORSE, OCTAVE) with no generic parameter pair; keep WAH MIN/MAX separate.
- [x] Trace exact first-column function popup construction/item IDs. The original-MG30 shared popup builder `0x005C48F0` and selection handler `0x005C4610` are documented in `MG30_CTRL_MENU_AND_0D_QUERY_TRACE_2026-10-30.md`.
- [x] Recover the active model-row lookup algorithm: `manager+0x2C` supplies the active model-code array; the function-family selector indexes it, masks the code with `0x3F`, and converts the one-based code to a zero-based six-byte record row. See the new active-row section in `MG30_CTRL_MENU_AND_0D_QUERY_TRACE_2026-10-30.md`.
- [ ] Cross-check every duplicate/shared model record against actual model IDs from active original-MG30 preset readback; the selection formula is statically confirmed, but a complete per-model hardware ID inventory is still outstanding.
- [ ] Trace 13 02 device readback request/callback and verify panel reopen/readback on hardware.
- [ ] Trace 0D 00 / 0D 02 with NuxPedalSetValuePanelMG30 and WAH MIN/MAX sliders.
- [ ] Only after protocol/readback checks, implement Roadmap 2 in isolation and build/test APK. No MG30 Studio source change or APK build in this static-analysis checkpoint.
- [ ] NAM import, IR User/Collection, MIDI mappings, preset sync and Copy Scene remain untouched.


## Goal 2 — CTRL readback request traced (2026-10-30)

- [x] Trace native read request VA 0x004A500D: QuickTone sends F0 43 58 70 13 00 F7 and registers callback VA 0x004A8340.
- [x] Confirm callback VA 0x004A8340 accepts 13 02 and restores state offsets 0x7A–0x82. Static read transaction is 13 00 OUT → 13 02 IN.
- [x] Keep write path distinct: 13 01 OUT → 13 03 ACK.
- [x] Correctly separate 0D 00 OUT → 0D 02 IN. Its variable-length payload is stored starting at singleton offset +0x5E with a length/status byte at +0x5D; its UI semantics are not proven.
- [x] Trace NuxPedalSetValuePanelMG30 slider handler VA 0x005C5D60: it updates either state pair +0x7F/+0x80 or +0x81/+0x82 and then sends 13 01. The pair labels/meaning are still unresolved.
- [ ] Capture the 13 00/13 02 readback exchange when QuickTone opens/reopens EXP & Pedal on the original MG-30.
- [x] Trace actual first-column function dropdown item IDs and stored ordinals: `----=0, WAH=1, EFX=2, AMP=3, MOD=4, DLY=5, RVB=6`.
- [ ] Identify the two set-value slider pair labels and their caller before assigning MIN/MAX or controller semantics.
- [ ] Decode 0D 00/0D 02 UI consumer and payload semantics separately.
- [ ] No app source change or APK build in this static-analysis checkpoint.


### Goal 2 — hardware-confirmed EXP & Pedal panel-open readback (2026-10-30)

- [x] Capture `ctrlpanel.pcapng` received and decoded; full report saved under `docs/research/MG30_CTRL_PANEL_CAPTURE_VALIDATION_2026-10-30.md`.
- [x] Confirm panel open sends `13 00` OUT and original MG-30 returns `13 02` IN (~2.151 ms request-to-response).
- [x] Confirm readback contains CTRL1/CTRL2 function-choice fields and two value pairs; snapshot captured codes are CTRL1 AMP/choice 0, CTRL2 WAH/choice 0, values 100/100.
- [x] Keep response bytes not covered by the current parser map uninterpreted.
- [x] Record separate outgoing CC77/value55 event as unknown; do not merge it into the SysEx protocol.
- [x] Panel-open readback hardware-validation item is complete.
- [x] First-column function-menu item IDs and ordinals are now statically traced.
- [ ] Continue identifying the CC77 sender/trigger; do not implement CC77 until its purpose is known.
- [ ] Continue separate `0D 00 → 0D 02` / set-value panel analysis; no assumption that it means WAH MIN/MAX.
- [ ] Do not change source or build APK yet. Keep NAM, IR User/Collection, MIDI mapping, preset sync and Copy Scene protected.


### Goal 2 — original-MG30 CTRL editor selector map (2026-10-30)

- [x] Trace shared popup builder `0x005C48F0`: selectors 0/1 = CTRL1/CTRL2 function; 2/3 = their dependent choices; 4/5 = external T/R; 6 = Multi EFX CTRL function; 7 = its conditional dependent/mode choice.
- [x] Confirm expression function list order and enum values: `----=0, WAH=1, EFX=2, AMP=3, MOD=4, DLY=5, RVB=6`.
- [x] Confirm first three payload bytes map to Multi EFX CTRL `+0x7A`, external T `+0x7B`, external R `+0x7C`; CTRL1/CTRL2 packed bytes follow at `+0x7D/+0x7E`.
- [x] Confirm T/R Scene Up/Down selection updates the opposite contact with the complementary direction code.
- [x] Confirm Multi EFX CTRL list contains TAP, block selectors and SCENE entries and is independent of CTRL1/CTRL2.
- [x] Document the correction and detailed trace in `docs/research/MG30_CTRL_MENU_AND_0D_QUERY_TRACE_2026-10-30.md`.
- [x] Resolve selector-7 DLY/SCENE labels and bit polarity: DLY `S.TAP ON/OFF` uses set/clear bit `0x20`; SCENE `S3 ON/OFF` uses the opposite polarity.
- [ ] Resolve exact localized caption IDs for the two SetValue slider pairs, conditional availability rules, and the CC77 sender/trigger.
- [ ] Continue separating `0D 00 → 0D 02` extended-data refresh from `13 00 → 13 02` CTRL readback. Do not label 0D as WAH MIN/MAX without proof.
- [ ] No source changes or APK build yet. Protect NAM, IR User/Collection, MIDI mapping, preset sync and Copy Scene.


### Goal 2 — SetValue panel caller and slider wire-path (2026-10-30)

- [x] Confirm only CTRL1 dependent row (selector 2) and CTRL2 dependent row (selector 3) open the original-MG30 SetValue panel.
- [x] Confirm SetValue panel has three localized captions and two sliders; QuickTone resource strings include WAH_RANGE/RANGE, VOL_MIN/MIN and VOL_MAX/MAX, matching the user's WAH screenshot (exact caption IDs to resource keys remain inferred).
- [x] Confirm slider changes store CTRL1 pair at `+0x7F/+0x80` or CTRL2 pair at `+0x81/+0x82` and immediately use `13 01`.
- [x] Confirm these same value bytes are restored in `13 02` readback.
- [x] Do not assign WAH MIN/MAX to the separate 0D family; no evidence connects 0D payload to these range values.
- [ ] Complete exact localized caption-ID join and determine whether semantics vary across active function/model.
- [ ] Continue identifying the separate 0D extended-data response consumer and CC77 sender.
- [ ] No source changes/APK build until these remaining items are evidence-backed.


### Goal 2 — 0D type-cache consumer and MIDI CC77 sender boundary (2026-10-30)

- [x] Trace 0D payload into type-indexed manager cache; response data is copied and mirrored separately from CTRL state.
- [x] Confirm helper updates per-type records against a 12-entry type table; semantic type names remain unknown.
- [x] Identify generic Windows MIDI short-message output path for CC77, but not its app-level sender or trigger.
- [x] Keep 0D payload and CC77/value55 out of the MG30 Studio implementation until their actual feature meaning is established.
- [ ] Next wire captures should isolate external T-only, external R-only, and Multi EFX CTRL changes if those protocol bytes are to be implemented.
- [x] Decode selector-7 DLY/SCENE dependent option labels and mode bit; retain the function-dependent opposite bit polarity in implementation.


### Goal 2 — Multi EFX CTRL dependent options decoded (2026-10-30)

- [x] Selector-7 DLY options decoded in popup order: S.TAP ON, S.TAP OFF.
- [x] Selector-7 SCENE options decoded in popup order: S3 ON, S3 OFF.
- [x] Decode state-byte +0x7A bit 0x20 exactly: DLY ON=1/OFF=0; SCENE ON=0/OFF=1.
- [x] Document that bit polarity is function-dependent and must not be simplified to a shared boolean.
- [ ] Capture the corresponding isolated hardware writes for DLY and SCENE states before implementation.


### Goal 2 — CTRL / EXP editor first implementation (2026-10-30)

- [x] Add CTRL / EXP button beside Simpan ke pedal in the Tone Editor top bar.
- [x] Add isolated modal editor for Multi EFX CTRL, external footswitch T/R, CTRL1 built-in expression and CTRL2 additional expression.
- [x] Reuse the shared MIDI queue and existing SysEx wait path; no direct native MIDI calls or second queue.
- [x] Implement 13 00 readback and 13 01 write → 13 03 ACK → 13 00/13 02 readback verification.
- [x] Add model-dependent CTRL parameter choices for known original-MG30 model pairs; keep unknown model option disabled rather than guessing.
- [x] Add WAH MIN/MAX controls from the CTRL1/CTRL2 range value pairs.
- [x] Implement Multi EFX DLY and SCENE selector-7 labels and opposite bit polarity.
- [x] Implement T/R complementary Scene Up/Down coupling.
- [x] Add mutual-exclusion guard against preset/scene sync, Copy Scene and periodic hardware polling.
- [x] Leave NAM import, IR User/Collection, native MIDI plugin, preset model sync, block MIDI mapping and Copy Scene source paths unchanged.
- [x] Complete final CI APK build for latest application source commit 249e6ada; run 41027171814 succeeded.
- [ ] Test panel readback on original MG-30 Gen2 firmware 6.0.x.
- [ ] Test one isolated CTRL1/CTRL2 or T/R write, verify 13 03 ACK and readback.
- [ ] Test Multi EFX DLY/SCENE physical behavior.
- [ ] Do not claim physical validation until these hardware tests pass.
- [x] Full implementation and scope note saved in `docs/research/MG30_CTRL_EDITOR_IMPLEMENTATION_2026-10-30.md`.


#### CTRL editor APK artifact (2026-10-30)

- [x] GitHub Actions run 41027171814 succeeded for source commit `249e6ada74444a7c6f62c79066568df8cfabc5ad`.
- [x] Artifact ID `12964162270`; extracted debug APK size 4,378,432 bytes.
- [x] APK SHA-256 `2fb982240a318ca86fdcfc85b2343a8a72c509f8d1462f99a83d9baee27169f5`.
- [ ] First real-device readback/write and functional hardware tests remain pending.

- [x] After first user screenshot, remove small payload labels and redundant explanatory helper/footer text from CTRL panel.
- [x] Match top-bar CTRL / EXP and Simpan ke pedal button height/padding/font sizing.
- [x] Build and deliver refreshed APK for this visual refinement (CI run 41028702729; source bd87002b; APK SHA-256 48f15e6d3b5d55fab6e7a095ef31301c9f1e15880addc693bc44a420157f4a9f).

## Correction — compact CTRL / EXP header controls (2026-10-30)

- [x] Revert the added fixed 42px/40px shared header-button styling that enlarged **Simpan ke pedal**; restore the normal `.btn` sizing and the original compact mobile padding/font rule.
- [x] Keep both header controls aligned: desktop retains their normal approximately 40px height; on mobile, CTRL / EXP uses a 32px minimum height to match the normal compact Save button.
- [x] Remove the literal placeholder strings `footswitch helper` and `footer explanation` from the CTRL / EXP dialog while retaining the external footswitch fields and footer action buttons.
- [x] No JavaScript or protocol code changed. The CTRL state/readback/write handlers, shared MIDI queue, NAM import, IR User/Collection transfer, MIDI mappings, preset sync and Copy Scene remain untouched.
- [ ] Verify the compact dimensions and clean CTRL / EXP dialog on Android; hardware readback/write validation remains a separate test.

## Follow-up — USB icon status + automatic MG-30 USB-MIDI reconnect (2026-10-30)

- [x] Remove the literal `header eyebrow` and `header subtitle` placeholder strings from the CTRL / EXP dialog heading.
- [x] Replace the large **Hubungkan** text button in the app header with a compact USB icon button; it is dim while disconnected, illuminated when connected, and exposes accessible status/labels.
- [x] Preserve manual recovery: tapping the USB icon while disconnected runs the existing connection flow; tapping while connected does not reopen the connection.
- [x] Add Android `MidiManager.DeviceCallback` attach/detach notifications. When a matching NUX/MG-30 MIDI device appears, the app attempts a silent auto-connect using the existing readback/polling path. A device already attached at app startup is checked once after the page loads.
- [x] Auto-connect only selects a named MG-30/NUX candidate; the existing single-device fallback remains available to an explicit manual connection attempt.
- [x] Detaching the active MIDI device closes its ports and updates the connection state so the USB icon turns off; reattaching triggers a fresh automatic attempt.
- [x] No change to IR/NAM transfer packet code, preset/scene serialization, MIDI parameter map, signal-chain sender, or CTRL protocol handlers.
- [ ] Validate on original MG-30 Gen2 FW 6.0.x: open app with pedal already attached, attach after app launch, unplug/replug, and manually tap the USB icon after a simulated disconnect.
- [ ] Confirm existing NAM import/readback, IR User/Collection, and MIDI mappings remain unchanged on hardware.

## Follow-up — USB header spacing and square icon (2026-10-30)

- [x] Add a compact two-line `USB MIDI` / connection-state label beside the USB icon to use the otherwise empty header area.
- [x] Keep label state synchronized with MIDI: `Terputus`, `Menghubungkan…`, or `Terhubung`; connected state uses the lime accent.
- [x] Change the USB icon control from a circular shape to a 12px rounded square (11px on narrow screens), matching the app's other buttons/cards.
- [x] Preserve click-to-connect behavior and Android attach/detach auto-connect logic.
- [ ] Verify header fit and connection-state label on the Android device at regular and narrow phone widths.

## Follow-up — simplify CTRL / EXP dialog header (2026-10-30)

- [x] Remove the `BELUM DIBACA` dirty/read badge from the CTRL / EXP dialog header.
- [x] Keep the `Tutup` button at the top-right, aligned with the heading rather than below a status badge.
- [x] Remove the framed amber/red `Panel siap...` status box. Reuse its live status region as a single plain-text subtitle directly beneath `CTRL / EXP & Pedal`, without background, border or warning box.
- [x] Initial subtitle explains the panel: Multi EFX CTRL, external footswitch, and expression pedal assignments. Subsequent connection/read/write messages still update this subtitle so errors and operation status remain visible.
- [x] JavaScript control state, read/write workflow and MIDI protocol are unchanged; the existing dirty-badge DOM accesses are already null-guarded.
- [ ] Verify header spacing and status text on Android portrait layout.

## Follow-up — slightly reduce CTRL / EXP dialog footprint (2026-10-30)

- [x] Reduce dialog max width from 980px to 920px and phone width from viewport minus 22px to viewport minus 38px, adding a little breathing room at the sides.
- [x] Reduce dialog and scrolling shell maximum height from viewport minus 24px to viewport minus 40px, adding a little breathing room above and below while keeping inner content scrollable.
- [x] Do not reduce input/select/button sizes or alter CTRL read/write behavior.
- [ ] Check the resulting portrait layout on the Android device; adjust only if the panel is still too close to screen edges.

## Follow-up — full CTRL / EXP panel visible without scrolling (2026-10-30)

- [x] Replace the phone dialog's internal scroll area with a non-scrolling shell; the dialog clips overflow instead of presenting a scroll bar.
- [x] Compact the CTRL header, card gaps, card padding, labels, model context, range spacing, and footer spacing for mobile.
- [x] Keep dropdowns and footer buttons at usable touch heights (36–38 CSS px minimum in the narrow phone layout).
- [x] Preserve the existing single-column sequence and full-width controls; no protocol, JavaScript, SysEx, NAM, IR, or MIDI-map files changed.
- [x] User confirmed the final phone layout is "Sip, sudah bagus"; all four control sections and both footer buttons are visible together with no internal scrolling in the tested default state.
- [ ] Separately re-check the fit if a selected function reveals additional conditional/range controls.

## Final CTRL / EXP panel fit — user accepted (2026-10-30)

- [x] User confirmed the compact one-screen/no-scroll CTRL / EXP panel is good; treat the default phone layout as accepted.
- [x] Dialog shows title, subtitle, Multi EFX CTRL, external T/R, CTRL1, CTRL2, and the Baca ulang / Simpan ke pedal footer in one viewport.
- [x] Internal dialog scrolling remains disabled on mobile; mobile layout uses compact gaps/padding and 36–38px minimum dropdown/button touch heights.
- [x] No protocol or MIDI behavior changed in this visual pass.
- [x] Source commit: `7c93364f1e9148a2f0f54e9398404e75cf8af15f` — `style: fit CTRL editor on phone without scrolling`.
- [x] Android debug build: run [41038988421](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41038988421) — success.
- [x] CI artifact: `MG30-Studio-debug-APK`, artifact ID `12968364791`, ZIP size 4,002,327 bytes, SHA-256 `67b69e6d05932b02bc89d6795938458d475c8ea54db78388f1c1c65a51977bda`.
- [ ] Verify any conditional WAH MIN/MAX or other expanded states still fit on the phone; the accepted screenshot shows the default state.

## Roadmap continuation — next active milestone

- [x] Close the CTRL / EXP mobile UI acceptance item after the user's confirmation.
- [x] Goal 2 — CTRL / EXP controls — user confirms successful completion; this milestone is closed.
- [ ] Next: Goal 3 — preset import/export, followed by preset rename, Save As/duplicate, and IR/NAM device-synced rename. Studio redesign remains Goal 4.
- [ ] Preserve working NAM, IR User/Collection, MIDI mappings, preset sync, signal-chain realtime reorder, and Copy Scene in all future steps.


## Latest accepted change — CTRL / EXP panel no-scroll layout (2026-10-30)

- [x] User confirms: "Sip, sudah bagus." The final mobile CTRL / EXP panel layout is accepted.
- [x] All four control sections and both footer actions (Baca ulang / Simpan ke pedal) fit in the tested phone viewport without internal scrolling.
- [x] Keep the compact spacing and usable 36–38 CSS px minimum touch targets; no protocol or MIDI behavior was changed in this UI pass.
- [x] Android debug build succeeded: [GitHub Actions run 41038988421](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41038988421).
- [x] Build artifact: MG30-Studio-debug-APK, artifact ID 12968364791, SHA-256 `67b69e6d05932b02bc89d6795938458d475c8ea54db78388f1c1c65a51977bda`.
- [x] Goal 2 remains closed; next roadmap milestone is Goal 3 — Preset import/export.

## Goal 3 progress — QuickTone preset import/export research (2026-10-30)

- [x] Inspect supplied QuickTone Windows v2.6.7.16 executable and confirm original MG-30 Gen2 file extension .mg30patch.
- [x] Confirm QuickTone has separate original-MG30 Export/Import panels (NuxPresetExportPanelMG30, NuxPresetImportPanelMG30), distinct from MKII panels.
- [x] Confirm Export dialog filter/title: *.mg30patch / Export the Preset data.; default filename string: MG30AllPatch.mg30patch.
- [x] Confirm Import dialog filter/title: *.mg30patch / Import the Preset data.
- [x] Confirm separate MG-30 transmission entry points for exportPresetLogic and exportAllPresetLogic.
- [ ] Still determine the actual .mg30patch byte layout, record boundaries, header/version/checksum and relation between single-preset and all-preset files. Strings and file-dialog filters are not sufficient to build a compatible parser.
- [ ] Obtain a real original-MG30 .mg30patch exported from QuickTone plus a matching USBPcap export capture. The current deluxecapt.pcapng has 24 USB packet blocks showing device/interface enumeration and a few CC messages; it does not contain a preset SysEx/file transfer.
- [ ] After schema is confirmed, implement strict import/export validation and use the existing MG30 hardware ACK/read-back path. Keep Copy Scene's existing 0C/01 → 0C/03 flow separate and unchanged.
- [x] Save detailed static-analysis evidence and next capture requirements in docs/research/MG30_PRESET_FILE_FORMAT_RESEARCH_2026-10-30.md.
- [ ] Goal 3 source implementation and physical round-trip test have not started. Do not mark preset import/export complete yet.

## Goal 3 follow-up — QuickTone binary static disassembly (2026-10-30)

- [x] Trace the all-preset export dialog path to its buffer construction and file-write helper; observed output length 0x135700 and record stride 0x26AE (static inference: 128 entries).
- [x] Trace single-file and all-file reader helpers: expected input lengths 0x2590 and 0x12C800 respectively; all-file reader loops 128 records with source stride 0x2590.
- [ ] Resolve the 0x135700 export vs 0x12C800 all-import size discrepancy by inspecting a real QuickTone .mg30patch file. Do not alter/truncate/pad the data based on speculation.
- [ ] Identify file headers/version/checksum/slot encoding and match the file import/export path to a USBPcap SysEx capture.
- [ ] Only after format reconciliation, implement QuickTone-compatible file import/export and validate export → import → pedal read-back on original MG-30 Gen2 firmware 6.0.x.
- [x] Document the extra disassembly, candidate sizes/strides, uncertainty and guardrails in docs/research/MG30_PRESET_FILE_FORMAT_RESEARCH_2026-10-30.md.
- [ ] No app source code or protocol implementation was changed; no APK was built in this research-only step.
