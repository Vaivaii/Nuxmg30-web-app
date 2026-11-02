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


## Goal 3 follow-up — real .mg30patch sample comparison and write-path hypothesis (2026-10-30)

- [x] Receive and inspect `1B DELUX DIST.mg30patch` (0x26AE bytes) and `MG30AllPatch.mg30patch` (0x135700 bytes).
- [x] Confirm all-preset file divides exactly into 128 records of 0x26AE bytes, with sequential little-endian 32-bit record/index prefixes 0–127.
- [x] Match record index 1 name `DELUX DIST` to the single-file sample.
- [x] Confirm a RIFF/WAVE resource region and an additional undecoded trailing region are present inside records; keep their exact semantics open until an import capture proves the resource type.
- [x] Confirm samples support the export-side 0x26AE stride / 0x135700 total-size inference.
- [ ] Resolve the concrete conflict with the statically traced QuickTone reader helpers, which expect 0x2590 / 0x12C800. Do not truncate/pad by 0x11E or guess a conversion.
- [x] Review existing MG30 Studio `writeHardwarePreset()`: per-scene `0B/01` writes, matching `0B/03` ACKs, `07/01` finalize, `07/03` ACK and `0B/00` payload read-back verification.
- [ ] Prove whether QuickTone .mg30patch import converts each record into the same three scene parts and reuses this hardware write path. Need a USBPcap capture of importing the supplied single-preset file.
- [ ] Determine whether import sends additional WAVE/resource transfer frames; do not assume all RIFF/resource bytes are carried inside the three scene-part messages.
- [ ] No source/protocol change and no APK build in this research checkpoint. Preserve NAM, IR User/Collection, MIDI mappings, preset sync, and Copy Scene unchanged.
- [x] Save sample hashes, record layout observations, current writer transaction details, discrepancies and capture plan in `docs/research/MG30_PRESET_FILE_FORMAT_RESEARCH_2026-10-30.md`.


## Goal 3 addendum — embedded IR/resource clue in preset records (2026-10-30)

- [x] Correlate the record's RIFF/WAVE data size (`0x1800` = 2,048 mono 24-bit samples) with the existing MG-30 IR waveform transfer's 2,048-sample span (64 × 32 samples).
- [x] Note the adjacent per-record resource label and the independent WAVE/trailing-data region.
- [ ] Confirm whether this resource is a cabinet IR and whether QuickTone restores it as User/Third Party, Collection, or via a separate resource command family. The structural match is not proof.
- [ ] Decode the `0xCB0)-byte trailer. The `0x4B0) size component coincides with 600 × 2 bytes but its meaning/offset is unproven.
- [ ] Capture the exact import transaction to establish whether resource upload happens before or after the three-scene preset write, and whether both phases use existing User/Collection handlers.
- [x] Keep `10/09/11` User and `6A/6C/6B` Collection flows separate; no changes to either path or its parameter mapping in this checkpoint.
- [x] Update the research note with this cross-correlation and a two-data-class import hypothesis. No source/protocol change and no APK build.


## Goal 3 — QuickTone preset-import USBPcap validated (2026-10-30)

- [x] Decode supplied `presetimport.pcapng`: 78 SysEx OUT requests and 78 matching SysEx IN responses.
- [x] Confirm ordered IR User/Third Party phase: `09/01 → 09/03` once, `10/01 → 10/03` 64 times, then `11/01 → 11/03` 10 times.
- [x] Compare with standalone `ir user import.pcapng`: same command families/counts, but different message ordering and a differing header parameter. Keep the parameter unresolved; do not copy constants blindly.
- [x] Confirm Collection family `6A/6B/6C` and NAM family `58` are absent from this preset import capture.
- [x] Confirm the IR resource phase is followed by exactly three `0B/01` preset scene writes targeting program `0x3C` (60), part indices 0, 1, and 2; each has a matching `0B/03` response.
- [x] Confirm QuickTone import capture does **not** contain `07/01` or `07/03`, unlike MG30 Studio's current `writeHardwarePreset()` helper. Keep the existing Save-to-device finalization path untouched; do not blindly reuse the whole helper for import.
- [ ] Decode the `09/01` metadata parameter and the `0x78` field in `10/01`/`11/01`; establish exact mapping from .mg30patch WAVE/resource bytes to User IR message payloads.
- [ ] Resolve the trailing `0xCB0)-byte per-record region and the earlier `0x2590) vs `0x26AE) file-reader/export discrepancy.
- [ ] Implement QuickTone-compatible import only after resource conversion, IR destination, scene buffer conversion, post-write commit/readback, and rollback/failure behavior are documented.
- [x] Record capture sequence, ACK counts, standalone IR User correlation, Collection/NAM exclusions, and the missing `07/01` distinction in `docs/research/MG30_PRESET_FILE_FORMAT_RESEARCH_2026-10-30.md`.
- [x] No source/protocol changes or APK build in this analysis checkpoint. Preserve NAM, IR User/Collection, MIDI mappings, preset sync, and Copy Scene.

### Goal 3 — IR resource handle/ACK refinement from presetimport.pcapng (2026-10-30)

- [x] Confirm 09/01 in preset import is the same 62-byte SysEx shape as the standalone User IR name frame; its leading parameter field is 0x3C rather than standalone User's 0x01.
- [x] Confirm 10/01/11/01 parameter field is 0x78 in preset import versus 0x02 in standalone User import; note the observed relation 0x78 = 2 × 0x3C and 0x02 = 2 × 0x01.
- [ ] Keep the doubled field as an unresolved resource-handle/address relationship; do not label it a physical IR slot or hardcode 0x78.
- [x] Verify ACK phase statuses: 09/03 status 0; 10/03 63 × status 2 + final status 3; 11/03 9 × status 2 + final status 3; all three 0B/03 responses status 1.
- [x] Record that waveform and curve address progressions match the known User transfer patterns.
- [ ] Pair the captured 10/01 waveform and 11/01 curve payloads back to the .mg30patch record's WAVE/resource and trailing-data offsets before implementing file-to-IR conversion.
- [x] Update the research note with the derived-handle correlation and exact ACK status pattern.

## Goal 3 — QuickTone single-preset importer implemented (2026-10-31)

- [x] Confirm the 0x78 byte in IR `10/01`/`11/01` header is the middle 7-bit byte of encoded destination program 0x3C (`encodeWord16(0x003C) = 00 78 00`), not a separate doubled resource handle.
- [x] Correct the WAVE interpretation: RIFF declares PCM24, but import sends 2,048 raw float32 samples (1,536 in apparent data chunk + 512 immediately after RIFF); do not decode as standard PCM24.
- [x] Cross-map all three 142-byte scene sections to the three `0B/01` payloads; exact 213/213-byte payload equality for each scene.
- [x] Cross-map the 16-byte resource name to `09/01`, all 2,048 float32 samples to 64 `10/01` packets, and 600 curve words to the meaningful 600 values in 10 `11/01` packets.
- [x] Add `www/mg30-preset-format.js`: strict single-file parser (0x26AE) and builder for captured 78-frame import plan; reject batch/all-file (0x135700), unknown size, invalid ordinal/marker, invalid resource metadata, non-finite float samples or invalid curve values.
- [x] Add `www/mg30-preset-import.js`: single-preset picker/validator/import UI in the Preset page, displays resource and selected destination; refuses unsupported 128-record batch.
- [x] Add `MG30PresetImportBridge` to `www/index.html`: exact QuickTone order `09/01 → 10/01 ×64 → 11/01 ×10 → 0B/01 ×3`, wait for each matching ACK and validate phase status.
- [x] Keep QuickTone import path separate from existing `writeHardwarePreset()`: no `07/01) finalization is sent in importer; existing Save-to-device finalizer and readback remain untouched.
- [x] Add read-only `0B/00` three-scene readback after the three `0B/03` ACKs; verify target program, part indices, and complete payload equality before declaring success. This extra app safety check is not claimed to be part of QuickTone's captured sequence.
- [x] Add a transaction lock against poll/scene change/Copy Scene/Save/slot selection/CTRL-EXP/CC changes/signal-chain sender while import is running.
- [x] Preserve IR User/Third Party `09/10/11` family and target destination parameter; no modifications to IR Collection `6A/6B/6C), NAM `58), MIDI mappings, preset sync, or Copy Scene.
- [x] Record final byte mapping, correction of earlier RIFF and 0x78 interpretations, packet order/statuses, importer behavior, tests and outstanding hardware verification in `docs/research/MG30_PRESET_FILE_FORMAT_RESEARCH_2026-10-30.md`.
- [x] User reports that the single-preset import was physically tested and succeeded on the original MG-30 Gen2. IR list visibility and separate audio audition were not separately reported; do not infer those checks.
- [ ] Define recovery/retry behavior after partial IR or scene transfer interruption; do not auto-retry partial writes.
- [ ] Decode and reconcile the static reader helper 0x2590/0x12C800 size discrepancy before enabling additional file variants.
- [ ] Implement/validate all-preset 128-record batch import only after capturing QuickTone batch import and establishing destination slot mapping.
- [x] Physical hardware validation of the single-preset importer is now user-reported as successful on the original MG-30 Gen2. The remaining physical Goal 3 hardware test is the read-only Export path, not a repeat of the successful import.


### Build handoff — single-preset importer (2026-10-31)

- [x] Push of importer source triggered Android APK workflow run [#114](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41101214040), source commit `af71ae32bb342ecff15cc55580d54d5ebac2d0cf`.
- [x] Rechecked run #114: completed successfully; artifact MG30-Studio-debug-APK, ID 12998752306, 4,007,697 bytes, SHA-256 80d4b66508bee6f31dc48271730de45061ae5dbeb6c4000dbe4a5135d68e1e7c.
- [x] This APK is built from importer commit af71ae32bb342ecff15cc55580d54d5ebac2d0cf and does not contain the newer export serializer/registry commits. Build a new APK after export UI and hardware readback are implemented.


## Goal 3 — export serializer and batch-import reverse engineering (2026-10-31)

- [x] User reports that the implemented single-preset QuickTone import was physically tested and succeeded on their original MG-30 Gen2 device. Record this as a general successful hardware test only; do not infer unreported separate checks such as IR list visibility or audio audition.
- [x] Add strict scene reply decoder and single-preset .mg30patch serializer in www/mg30-preset-format.js; serializer commit 0addfab4d8e7f02dbb77e97ab479a13197855113, followed by registry exposure commit 1f34e8957c7f891ba6a43246af86b79a10b2e63f.
- [x] Offline reconstruction of supplied 1B DELUX DIST.mg30patch returns an exact 9,902-byte match and the same SHA-256 0b8f9fecb5150bfe5a96dfcf66f3a777b910cef2910bcaa3100f0fa990aaa67a.
- [ ] Export is not yet end-to-end and no Export UI is enabled: there is no verified device readback sequence for the preset's associated IR waveform (2,048 float32 values) and curve (600 words). Do not export a scene-only/zero-filled file as a valid QuickTone preset.
- [ ] Next export requirement: matching USBPcap capture and output file from QuickTone single-preset export with a known attached IR. Reverse engineer readback first, then implement/test hardware export and round-trip.
- [x] Batch-file inventory: MG30AllPatch.mg30patch is 128 × 0x26AE (total 0x135700); 101 records have resource marker 0 and 27 marker 1. Of the latter, 26 are standard RIFF/WAVE records and ordinal 91 is structurally anomalous (marker 1/name present, no RIFF at the normal offset).
- [x] Confirm two RIFF variants among 26 standard resource records: 15 × PCM24 / 0x1800 data and 11 × PCM32 / 0x2000 data. Single-record parser's one strict variant must not be reused for all batch records without variant handling.
- [ ] Batch import remains disabled pending actual QuickTone batch-import capture, destination-slot mapping, handling of empty and anomalous records, and resolution of reader size discrepancy 0x2590 vs actual export stride 0x26AE.
- [x] Continue to preserve NAM, IR User/Collection paths and mappings, MIDI map, preset sync, Copy Scene, CTRL/EXP, signal-chain reorder, and Save-to-device writer.

- [x] Correct build checkpoint: run #114 succeeded and artifact ID 12998752306 is available. This verifies the earlier single-importer source only; it is not a build of the current export serializer changes.


## Goal 3 — export capture diagnostic checkpoint (2026-10-31)

- [x] User attempted QuickTone single-preset Export capture; reports USBPcap remained silent / showed no packets.
- [ ] No new silent .pcapng has been uploaded yet. Determine whether packet count is exactly zero or only no SysEx packets before diagnosing.
- [ ] Request the silent capture file, matching exported .mg30patch if generated, and confirmation of whether the USBPcap packet counter remained at zero.
- [ ] Repeat capture on all USBPcap root-hub interfaces (or identify MG-30 root hub via USBPcapCMD), no capture filter, start before QuickTone launch; optionally reconnect pedal after starting capture to verify bus/interface. Do not perform import/write operations during this diagnostic.
- [ ] Leave Export UI and batch-import UI disabled until the relevant read/batch transactions are evidenced.


## Goal 3 — presetexport.pcapng forensic result (2026-10-31)

- [x] Inspect user-supplied presetexport.pcapng directly: 2,756 bytes, one USBPcap1 interface, 18 USB packet blocks.
- [x] Identify MG-30 at USB bus 1/device address 3, VID:PID 1FC9:8260, device revision 0101; matching NUX MG-30 descriptor signature.
- [x] Parse MG-30 configuration: 344 bytes, four interfaces; MIDI Streaming interface 4 exposes Bulk OUT 0x02 and Bulk IN 0x82.
- [x] Confirm all captured traffic is USB enumeration/configuration control transfers. No packet uses MIDI endpoints 0x02/0x82; no SysEx or preset/IR read traffic appears during the reported Export capture.
- [ ] Trace QuickTone exportPresetLogic/exportAllPresetLogic and their data source. Hypothesis: Export serializes already-populated local/cache state and does not trigger a USB hardware read when clicked. Treat as hypothesis pending call-graph/data-flow verification.
- [ ] Determine which QuickTone action populates the cached preset/IR data before export; avoid asking for another identical capture until this code path is understood.
- [x] No changes to app source/protocols; all working features remain untouched.


## Goal 3 — QuickTone IR readback and first Export implementation (2026-10-31)

- [x] Trace QuickTone IR read-side command sequence: 09/00 → 09/02 metadata; 10/00 × 64 → 10/02 waveform (offsets 0..2016, step 32); 11/00 × 10 → 11/02 curve (offsets 0..576, step 64).
- [x] Identify the exact 15-byte 10/00 and 11/00 read-request layout: command/action, two reserved zero bytes, packed uint16 resource index, packed uint16 block offset, F7.
- [x] Implement strict read-side packet builders, parsers and 2,048-sample / 600-value assembly in www/mg30-preset-read.js.
- [x] Add read-only MG30PresetExportBridge and Export .mg30patch UI in www/index.html and www/mg30-preset-export.js. Reads the three scenes plus User IR metadata/waveform/curve and uses the previously byte-verified serializer.
- [x] Export has its own busy lock; it does not call any preset/IR write path. It blocks CC/poll/slot-change/chain operations while reading and resumes polling afterward.
- [ ] Hardware test initial Export UI on original MG-30 Gen2 FW 6.0.x; verify each phase/count/offset and re-import a generated file into a safe test slot.
- [ ] Initial export bridge assumes the preset program index is the attached IR resource index. It checks the returned index/offset and aborts on mismatch; revise only if actual hardware readback provides evidence for a different resource mapping.
- [ ] Until the hardware test passes, label Export as implemented but not yet hardware-validated. Keep batch import disabled.


## Goal 3 — export code-level validation checkpoint (2026-10-31)

- [x] Syntax-check all added/modified JS modules and inline app scripts.
- [x] Synthetic runtime verification: 09/00, 10/00, 11/00 request frames are each 15 bytes; synthetic metadata, 64 waveform and 10 curve replies parse and assemble into exactly 2,048 float32 samples and 600 curve words; three synthetic scene replies serialize into a 9,902-byte record.
- [x] Add Node test coverage in tests/mg30-preset-read.test.js; package.json now has npm test = node --test. Test runner itself still needs to be run by CI/Node.
- [x] Add shared busy locks across preset import, preset export and IR User/Collection upload so transactions cannot interleave.
- [x] Reject IR names longer than the file's 16-byte field rather than silently truncating.
- [ ] Export UI labeled READ ONLY · UJI AWAL. Physical test on original MG-30 Gen2 FW 6.0.x still pending; verify actual resource index mapping and every read reply before trusting the output file.
- [x] Fresh APK confirmed by Actions run #132 from source commit `bc10120099acfedd45e17fc023aebe50c78271b9`; `npm test` and `assembleDebug` both passed. Artifact ID `13004389391`, size 4,014,515 bytes, SHA-256 `03076b06387983506817a8db81260a4c2ffeb87ede15bc2e1b4bc4a904f87f9f`. Branch head at checkpoint `17e19a127077ebd79b1b6b60b769d4eff3e2d302` is one docs-only commit ahead (only `UI_POLISH_CHECKLIST.md` changed), so the APK contains the current app source.
- [ ] Batch importer remains disabled pending hardware export verification and a dedicated batch-import capture/mapping.


- [x] Cross-check index mapping in QuickTone binary: IR manager constructor initializes 0x80 (128) metadata entries; refresh loop requests metadata for each index 0–127; the 0x0B transaction handler passes the preset program byte to the 09/00 metadata request path. This supports the initial preset-slot-to-IR-index mapping; live reply index validation remains mandatory.

- [x] Export rechecks all conflicting hardware-operation locks after waiting for the current MIDI queue, before starting the read sequence.
- [ ] Fresh APK and original Gen2 hardware validation still pending.


## Goal 3 — physical Export failure diagnosis and read-reply parser correction (2026-10-31)

- [x] Review screenshots for slot 04D/program 15 and 32B/program 125: first data reply was parsed as tag/index 0 or 256 and offset 128, while offset 0 was expected. Both attempts aborted before any device write.
- [x] Cross-check QuickTone `0x4AB510` waveform response handler: the second decoded uint16 is the returned sample offset; the first decoded uint16 is not an echoed resource index in this handler.
- [x] Rename the first decoded word to opaque `replyTag`; stop comparing it with the requested IR index. Keep offset validation.
- [x] Filter `10/02` and `11/02` replies by the expected offset in the pending-request matcher, so unrelated/stale/out-of-order frames are ignored rather than consuming the current request.
- [ ] Explain the observed offset 128 from actual USB-MIDI request/reply bytes; do not assume the filter alone fixes the device interaction.
- [ ] Run Node tests and fresh Android APK build for the latest branch revision.
- [ ] Physical re-test read-only Export on original MG-30 Gen2 FW 6.0.x; collect full USBPcap capture if no reply with the requested offset arrives.
- [x] Protect all working features: NAM, IR User/Third Party, IR Collection, MIDI mappings, existing preset import and Save-to-device behavior, Copy Scene, CTRL/EXP, preset sync and signal-chain reorder are untouched.


## Build workflow — regression test gate (2026-10-31)

- [x] Add `tests/**` to the APK workflow path filter.
- [x] Run `npm test` before Android project generation/build so protocol unit tests gate each relevant source/test change.
- [x] Confirmed by Actions run #132: protocol regression tests (`npm test`) passed, Android debug APK build completed, and artifact upload succeeded.


## Recovery checkpoint — single-preset import complete; read-only Export next (2026-10-31)

- [x] Recovered branch `android/ui-polish-pass-1`; source checkpoint for the latest successful APK is `bc10120099acfedd45e17fc023aebe50c78271b9`.
- [x] Confirmed branch head before this documentation update was `17e19a127077ebd79b1b6b60b769d4eff3e2d302`; comparison shows the only intervening change was this checklist file. No app source differs from the successful APK build.
- [x] Preserve the user's report that single-preset `.mg30patch` import on the original MG-30 Gen2 physically succeeded. Do not reopen the established file-format investigation or require a redundant import test.
- [x] Build evidence: Actions run [#132](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41115756336) completed successfully. Both protocol regression tests and Android debug APK build passed; artifact `MG30-Studio-debug-APK` is available (ID `13004389391`, SHA-256 `03076b06387983506817a8db81260a4c2ffeb87ede15bc2e1b4bc4a904f87f9f`).
- [ ] Next Goal 3 hardware task: install the APK from run #132 and test the **read-only Export** path on original MG-30 Gen2 firmware 6.0.x. Validate the 09/02 metadata response, all 64 10/02 waveform offsets (0–2016), all 10 11/02 curve offsets (0–576), plus the three scene readbacks before trusting the output file.
- [ ] If Export still fails, capture the complete USB-MIDI exchange, especially the first outgoing 10/00 request and all incoming 10/02 replies (including opaque reply tag and decoded offset). Do not treat the offset filter as proof of a protocol fix.
- [ ] Keep 128-record batch import disabled until QuickTone batch import capture and destination mapping are verified.
- [x] Scope guard maintained: no source change to NAM, IR User/Third Party upload, Collection 6A/6B/6C, MIDI mappings, preset sync, Copy Scene, CTRL/EXP, signal chain, existing single-preset importer, or Save-to-device writer.


## Goal 3 — Export offset mismatch and diagnostic instrumentation (2026-10-31)

- [x] Review user screenshot from a read-only Export attempt on preset slot 04A (program/index 12). MG30 Studio reported no matching SysEx reply during waveform read: it received a 10/02 response decoded as opaque tag 0 / offset 0 while waiting for a different offset. Export aborted and explicitly reported that no data was written to the MG-30.
- [x] Interpret the screenshot narrowly: it proves at least one 10/02 body passed the current 203-byte/header parser and decoded to tag 0, offset 0. The screenshot does not show the requested offset or which waveform frame timed out, so do not assume it was specifically offset 32.
- [x] Independently inspect QuickTone v2.6.7.16 code at 0x4AB340, helper 0x4A4910 and response handler 0x4AB510. The QuickTone requester stores resource index and sample offset as two little-endian uint16 values, packs each as three 7-bit bytes, and advances waveform offsets 0, 32, …, 2016. Its response handler unpacks 132 bytes and reads the second decoded uint16 (output +2) as the sample offset. This supports the current request field order and parser offset location; it does not prove which bytes physically reached or were returned by the pedal in this Android test.
- [x] Add an exact unit assertion for the 15-byte request used by slot 04A at waveform offset 32: `F0 43 58 70 10 00 00 00 00 18 00 00 40 00 F7`.
- [x] Add read-only Export diagnostics: request frame bytes, target resource index, expected offset, each matching-command reply's body length/header prefix, opaque reply tag, returned offset, and elapsed time. Show a copyable log on failure.
- [ ] Wait for the diagnostics APK workflow to finish successfully; only use the artifact from the final successful run.
- [ ] Re-test read-only Export once on slot 04A with the diagnostics APK. Expand “Detail diagnostik readback”, copy the log, and provide it for analysis. Do not repeat preset import and do not perform any write operation for this test.
- [ ] If the logged request frame is correct but the response continues to report a previous/zero offset, inspect the actual USB-MIDI wire exchange and request/response timing before changing protocol semantics. Do not re-label or accept offset 0 as a different sample offset.
- [x] Keep the working single-preset importer, NAM, User/Third Party write path, Collection 6A/6B/6C, MIDI mappings, preset synchronization, Copy Scene, CTRL/EXP, signal chain and Save-to-device code untouched.


## Physical Export retry — repeated 10/02 offset 0 (2026-10-31)

- [x] User tested read-only Export on selected hardware slot 04A; screenshot reports: `Export gagal: Tidak ada balasan SysEx dari MG-30`. The transaction received a `10/02` data reply with opaque tag `0` and decoded offset `0`, but that offset did not match the outstanding request and was ignored.
- [x] No data was written to MG-30; the operation is read-only and aborted before generating the preset file.
- [ ] Obtain the in-app **Detail diagnostik readback** log before changing the protocol. It contains the exact outgoing SysEx request, requested offset, all observed reply headers, and failure step. Use its requestHex and expectedOffset to distinguish a wrong offset field/layout from a stale/repeated response.
- [ ] In particular, determine whether the failure occurred on the second waveform request (expected offset 32 after offset 0 had succeeded) or at a later offset; the screenshot's short status message does not identify the expected offset or include the request bytes.
- [ ] Do not change the User IR 10/09/11 upload path, Collection 6A/6B/6C, NAM, MIDI mappings, or preset import while diagnosing this read-only request path. Do not treat the reply's opaque tag 0 as a resource index.


## Physical Export diagnostic — slot 04B (2026-10-31)

- [x] Received the in-app read-only Export diagnostic for slot 04B / program 13.
- [x] First request: 10/00 waveform 1/64, expected offset 0; app-recorded request: `F0 43 58 70 10 00 00 00 00 1A 00 00 00 00 F7`.
- [x] One 203-byte 10/02 response arrived 51 ms after send. Prefix: `43 58 70 10 02 00 00 00 02 00 00 03 1C 21 02 39 3A 02 2C 4C`. Current decoder reports opaque tag 0 / returned offset 128.
- [x] Expected offset 0 did not match returned offset 128; export timed out after 3.79 s and aborted without writing to MG-30.
- [ ] Obtain full USBPcap trace with outgoing 10/00 and complete incoming 10/02 bodies and USB-MIDI packet boundaries.
- [ ] Re-verify QuickTone unpack helper 0x4A4970 and response handler 0x4AB510. Do not change parser semantics or accept offset 128 without evidence.
- [x] Mismatch rejection remains enabled; no source/protocol change from this log. Protect the successful importer and all unrelated features.


## Correction — QuickTone silent Export capture was on direct PC↔MG-30 USB connection (2026-10-31)

- [x] User clarified that the USBPcap session was captured on the PC with the MG-30 directly connected to that PC; no phone was connected.
- [x] Supersede the earlier Android-vs-Windows capture-boundary speculation. The supplied `presetexport.pcapng` captured MG-30 enumeration/configuration, including VID:PID `1FC9:8260` and MIDI streaming endpoints `0x02` OUT / `0x82` IN.
- [x] Confirm the 18-packet trace contains no packets on MG-30 MIDI endpoints `0x02` or `0x82`, and no USB-MIDI SysEx transaction during QuickTone Export.
- [x] Interpret this as a valid negative capture: the QuickTone Export action itself generated no observable MIDI endpoint traffic in that session. This supports, but does not conclusively prove, local preset/resource cache serialization.
- [ ] Trace QuickTone call graph upstream from Export and identify what populates its preset/IR cache before Export (connect/init, preset sync/selection, IR manager metadata refresh, or another callback). The already identified cache-miss path performs 09/00 then 10/00 waveform and 11/00 curve reads.
- [ ] Compare cache population path with MG30 Studio's explicit read-only Export bridge. Do not repeat the same silent USBPcap capture.
- [x] No change to read/write protocol or app source based on this clarification. Keep the Android 10/00 offset mismatch fail-closed and preserve all successful/protected features.


## QuickTone Export cache explanation strengthened by disassembly (2026-10-31)

- [x] Confirmed user's PC capture topology: MG-30 directly connected to PC; no phone involved. The 18-packet USBPcap file includes MG-30 enumeration but no packets on MIDI endpoints 0x02 OUT / 0x82 IN during Export.
- [x] Re-examined QuickTone initialization: function 0x841D00 calls IR manager refresh 0x4A9560.
- [x] Confirmed 0x4A9560 loops through the manager's 128 entries (count at +0x640, initialized to 0x80 by 0x4B1500) and calls 0x4A95F0 for each index.
- [x] Confirmed 0x4A95F0 issues 09/00 metadata requests; the 09/02 handler 0x4A9720 checks the corresponding resource cache and, on cache miss, invokes 10/00 waveform 0x4AB340 followed by 11/00 curve 0x4AAEA0.
- [x] This provides a code-supported explanation for silent QuickTone Export: relevant preset/IR data can be read/cached during initialization/refresh, then Export serializes in-memory state. Export click itself need not issue USB-MIDI.
- [ ] Trace the cache-present predicate and identify all triggers for metadata refresh (startup/connect, preset selection/0B notification, IR manager opening). Do not ask for another identical USBPcap Export capture.
- [ ] Keep the Android readback offset mismatch (requested 0, response decoder reports 128) as a distinct unresolved issue. No change to request encoding or parser semantics until supported by evidence.
- [x] No source/protocol changes. Successful single-preset importer and all protected features remain untouched.


## Goal 3 — QuickTone asynchronous IR request queue and offset-keyed Export (2026-10-31)

- [x] Disassembled QuickTone 0x4AB340: it creates 64 waveform requests for offsets 0…2016, registers each with callback 0x4AB510/timeout 1000 ms through 0xB0E360, and continues the loop without waiting for each callback to complete.
- [x] Disassembled 0xB0DE60: it adds transaction objects to a pending-request queue and starts the dispatcher when the queue changes from empty. This confirms batch registration of asynchronous transactions; it does not claim simultaneous USB transmission.
- [x] Confirmed 0x4AB510 places each 32-sample page using the returned second-word offset; completion is recognized at 0x7E0.
- [x] Confirmed the curve read path similarly queues 10 11/00 requests and the 11/02 handler places 64-word pages by returned offset, bounded to 600 meaningful values.
- [x] Reinterpreted the 04B diagnostic: returned offset 128 is aligned and valid (32-sample page grid), even though the sequential MG30 Studio matcher was waiting for 0. Its origin remains unproven.
- [x] Added offset-ordering helper and tests; out-of-order responses are sorted before assembly, while duplicate/missing/out-of-range responses are rejected.
- [x] Changed only the read-only Export bridge to register all 64 waveform requests and collect 10/02 pages by returned offset; same pattern for 10 curve requests and 11/02 responses.
- [x] Node protocol regression tests passed in Actions run #138, source commit fc68d00e2c48e3a954988bc76c80f200f9212cb4.
- [x] Verified Actions run [#138](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41123736392): protocol tests, Capacitor generation, Gradle assembleDebug and artifact upload all passed. Artifact `MG30-Studio-debug-APK`, ID `13008509843`, size 4,016,705 bytes, SHA-256 `8f9b1b1fc37cec90521cdfe3e000f754cc6a3c3e190c0b18322d2ae81840c701`. Source commit `fc68d00e2c48e3a954988bc76c80f200f9212cb4`.
- [ ] Physical read-only Export test on original MG-30 Gen2 FW 6.0.x; inspect complete unique offset coverage, three scene readbacks and final file.
- [ ] If only offset 128 arrives without other pages, retain diagnostics; do not redefine the offset field or bypass validation.
- [x] Protected write/import paths, NAM, IR Collection, MIDI mapping, preset sync, Copy Scene, CTRL/EXP, signal chain and Save-to-device untouched.


## Physical Export diagnostic — slot 04C / program 14; send-timing fix (2026-10-31)

- [x] Review the full diagnostic: read-only Export on slot 04C failed in waveform phase with 4/64 unique returned offsets (0, 256, 512, 768); each appeared 16 times, leaving 60 offsets missing.
- [x] Confirm the first response sequence was 0, 0, 256, 256, 512, 512, 768, 768, followed by repetitions of those same four offsets. This is not ordinary arbitrary out-of-order coverage; the cause is still unknown.
- [x] Identify misleading diagnostic timestamps: old sentAtMs was recorded before midiFrame() entered the paced MIDI queue, not at actual output dispatch.
- [x] Identify a status race where a response could mark a block matched before the send promise resumed, after which the send loop overwrote it as sent and failure handling later marked it not-received.
- [x] Update read-only Export logging to capture queue time, actual dispatch time immediately before midiOutput.send(), and send completion time; preserve the matched state and distinguish not-sent / not-received / send-failed.
- [x] Harden offset collection: ignore a page if the request for that same offset has not yet been dispatched in the current batch; include the reason and response-to-dispatch latency fields in diagnostics.
- [x] Commit: 14d13eb90358a68a82ccdc9b52964aac4fb489d7 — Fix IR export readback send timing and reject pre-request pages.
- [ ] Wait for the CI workflow from commit 14d13eb to pass before distributing an APK.
- [ ] Repeat read-only Export on original MG-30 Gen2 FW 6.0.x; inspect dispatch timestamps, pre-request pages, unique waveform and curve offset coverage, and all three scene readbacks.
- [x] No change to the request encoder, decoded-offset meaning, IR write/import routines, NAM, Collection, MIDI mapping, preset sync, Copy Scene, CTRL/EXP, signal-chain order, or Save-to-device.


### Android APK build verification — dispatch-timing diagnostics (2026-10-31)

GitHub Actions run #139 completed successfully from source commit 14d13eb90358a68a82ccdc9b52964aac4fb489d7: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41156796990

- Protocol regression tests (npm test): passed.
- Capacitor Android generation: passed.
- Gradle assembleDebug: passed.
- Artifact upload: passed.
- Artifact: MG30-Studio-debug-APK, ID 13025326763, size 4,016,974 bytes.

The build verifies the updated dispatch-time diagnostics and pre-request page rejection at source commit 14d13eb. It does not establish that read-only Export now succeeds on the physical pedal. Install the artifact from run #139 and repeat the read-only test; inspect all 64 unique waveform pages, 10 curve pages and three scene replies before trusting any output.


## Goal 3 — Root cause and correction for repeated waveform offsets (2026-10-31)

- [x] Re-examined exact QuickTone v2.6.7.16 frame construction in waveform function `0x4AB340` and curve function `0x4AAEA0`.
- [x] Confirmed both use command at bytes 4–5, packed resource index at bytes 6–8, packed page offset at bytes 9–11, two trailing zero padding bytes at 12–13, and `F7` at byte 14. Helper `0x4A4910` writes the packed two-word source structure starting at frame byte 6.
- [x] Identified the app's former two-byte displacement: it placed two reserved zero bytes before the packed index instead of after the packed offset.
- [x] Matched the exact slot 04C pattern to that displacement: request pairs at offsets 0/32, 64/96, 128/160, 192/224 were misinterpreted by the pedal as reply offsets 0, 256, 512 and 768 respectively; the pattern repeats as the leading packed offset byte changes.
- [x] Corrected the shared read-only data request builder in commit `4f7833ca203be339769e861b90fd3b43714c8192`.
- [x] Updated exact waveform and curve request vectors in commit `fca33e90f4ba050a6ae9847bf0742a3279155ef6`; protocol regression tests passed in Actions run #141.
- [ ] Wait for Actions run #141 Android build and artifact upload to complete; do not use the earlier failed run #140 artifact (protocol tests failed there because the test vectors still described the old layout).
- [ ] Hardware-test corrected APK on original MG-30 Gen2 FW 6.0.x using read-only Export on slot 04C; inspect 64 waveform offsets, 10 curve offsets and all three scene readbacks.
- [x] Protected User IR upload, Collection, NAM, preset importer, MIDI mapping, preset sync, Copy Scene, CTRL/EXP, signal chain and Save-to-device code remain unchanged.


### Explicit correction to the earlier request-builder comparison (2026-10-31)

Earlier notes that the app and QuickTone had matching `10/00` / `11/00` request structure were incomplete and are superseded here. The 7-bit uint16 packing algorithm in helper `0x4A4910` was equivalent, but the app placed the packed words two bytes too late. QuickTone starts its packed `[resourceIndex, offset]` fields at frame byte 6; the old app inserted two zeros there and started those fields at byte 8. Do not revert this fix based on the earlier statement that the request bytes matched. The response decoder/offset semantics remain unchanged.


## Goal 3 — Native Android file manager destination for QuickTone Export (2026-10-31)

- [x] Identify current Blob URL + anchor-click download as the reason Android WebView did not reliably open the system Save As file manager.
- [x] Add native `MG30Midi.savePatch` using Android `ACTION_CREATE_DOCUMENT`; user chooses the destination folder in the system picker.
- [x] Write validated 9,902-byte Gen2 `.mg30patch` bytes to the returned `content://` URI and only report success after the output stream closes successfully.
- [x] Return the saved display name, bytes and document URI; distinguish user cancellation from I/O failure.
- [x] Expose native save method through `window.NUXNativeMidi` and route Android Export to it. Keep browser download fallback for non-native browser sessions.
- [x] Commits: `804cf5e`, `9f344a3`, `ddc584f`.
- [ ] Confirm Actions run #144 and APK artifact.
- [ ] On Android, verify Save As picker opens, chosen-folder file exists and has 9,902 bytes; verify cancellation reports no save.
- [x] No changes to MIDI protocol or any preset/IR/NAM/Collection device write paths.


## Physical MG-30 round-trip validation — Export and Import succeeded (2026-10-31)

- [x] User confirms successful QuickTone `.mg30patch` Export on physical MG-30 after correcting request field offsets.
- [x] User confirms Android system file manager Save As was used in the Export path.
- [x] User confirms successful Import of the exported `.mg30patch` back to the physical MG-30.
- [x] Record Android build: Actions #144 passed; commit `ddc584f33fc7b81248445da5b56d7944deaa2b9b`; artifact `MG30-Studio-debug-APK` ID `13042443301`, 4,018,075 bytes.
- [ ] Optional: verify/audition all three imported scenes and compare IR identity/settings with the source slot; not yet explicitly reported.
- [ ] Keep Collection and NAM as separately scoped validation items; the successful single-preset round trip does not prove those separate flows.


## Clarification — IR Collection catalog maps to User for active use (2026-10-31)

- [x] User confirms IR Collection is a storage/catalog only, not a separate active IR destination.
- [x] IR selected from Collection is installed/transferred to pedal User (Third Party) for use. Preserve existing mapping; do not create a separate Collection device bank or redirect this path.
- [ ] NAM hardware test remains pending; user has not tested NAM on physical MG-30 yet.


## NAM status correction — transfer works; NAM-containing preset round trip pending (2026-10-31)

- [x] User confirms NAM transfer to physical MG-30 succeeded yesterday, before IR import success.
- [ ] Test Export from the app of a preset/file containing NAM, then Import that exported file back to the MG-30.
- [ ] Confirm NAM identity/assignment and preset behavior survive that round trip.
- [x] Do not label NAM transfer as untested; do not alter its working transfer path.
- [ ] Keep generic preset Export/Import success separate unless the tested preset is confirmed to contain/use NAM.


### Preset Export — QuickTone long IR name behavior correction (2026-10-31)

- User tested the manual alias prompt for the built-in IR `YA DXVB 112 Mix 10` (18 bytes); pressing OK failed. User explicitly requested QuickTone-style behavior and does not want a manual alias dialog.
- Removed manual alias prompt. Export now retains the full metadata name during readback, then stores the first 16 printable ASCII bytes in the `.mg30patch` 16-byte name field, trimming trailing padding whitespace at the boundary. Example: `YA DXVB 112 Mix 10` → `YA DXVB 112 Mix`.
- Export status reports original and stored names when they differ. Device metadata name itself is not modified.
- No changes to waveform/curve data, three scenes, Importer, NAM, IR User/Third Party transfer, IR Collection, or MIDI mappings.
- Regression tests verify the user's exact 18-byte example, first-16-byte boundary and printable-ASCII validation.
- Await GitHub Actions test/build result, then validate Export and Import on original MG-30 Gen2 FW 6.0.x. This exact long built-in IR is the primary retest.
- Note: this follows the user's direct observation of QuickTone truncating names, rather than claiming a disassembly-proven implementation detail. Do not reintroduce manual alias prompts.


### Preset Export — corrected QuickTone IR name field to 32 bytes (2026-10-31)

- User correctly questioned whether the earlier 16-byte assumption came from one short-name sample. Reinspection of the supplied QuickTone v2.6.7.16 executable confirmed that it copies the resource name in two consecutive 16-byte chunks from record offsets 0x1B2 and 0x1C2; RIFF begins at 0x1D2. Thus the full name field is 32 bytes, not 16.
- The sample name c414_cap_45_dc only occupied the first 14 bytes, leaving the remaining 18 bytes zero. That is why the second 16-byte half looked like padding.
- Updated parser, serializer and preset Import 09/01 name-frame validation to support the complete 32-byte field. The user's exact 18-byte built-in name YA DXVB 112 Mix 10 now passes unchanged. No manual alias prompt and no 16-byte truncation.
- Names longer than 32 printable ASCII bytes are limited to the first 32 bytes, consistent with the observed fixed-width field. Full 32-byte names are tested.
- No change to independent standalone IR WAV upload UI/20-character cap, NAM, IR Collection workflow, User/Third Party upload packet flow, MIDI mapping, preset scenes, or Save-to-device.
- Tests cover 32-byte exact capacity, the 18-byte user-reported name, and 36-to-32-byte limit. Wait for GitHub Actions, then physically test Export 03B and Import to safe slot on original MG-30 Gen2 FW 6.0.x.
- This correction supersedes the previous checklist note about truncating to 16 bytes. Do not reintroduce the alias prompt or 16-byte rule.


### QuickTone 32-byte IR name field — build result (2026-10-31)

- [x] GitHub Actions run #155 passed all 9 regression tests and completed Android debug APK build/upload.
- [x] Build source commit: d75d55942ad57562b8b27018d4cda9933e237476.
- [x] Artifact MG30-Studio-debug-APK ID 13044153884; APK 4,395,972 bytes; SHA-256 cbb1bc5d77b09023d2c1e89bd716352870aa64571053a0ae4a2ac5e77c2fcb17.
- [ ] Install and physically test on original MG-30 Gen2 FW 6.0.x: export slot 03B with IR name YA DXVB 112 Mix 10, verify full 18-byte name in .mg30patch, then import to a safe test slot and confirm name, waveform, curve, and all three scenes.

### Preset Manager UI and 128-slot name browser (2026-10-31)

- [x] Rename Preset Library to Preset Manager; remove subtitle copy.
- [x] Move Import and Export to the title/header row.
- [x] Replace bank + A/B/C/D slot buttons with a scrolling 128-slot hardware list showing slot label and cached preset name; retain search, selected-row highlight, favorite indication and local-drafts collapse.
- [x] Add explicit ↻ action for read-only names scan; cache names locally and persist partial scan progress.
- [x] Read stored slot names through 0B/00 → 0B/02, part 0, bit slots 106..121. Scan does not send Program Change.
- [x] Refresh names after active buffer read, verified Save-to-device and verified preset Import.
- [x] Guard against overlapping NAM, IR User, IR Collection, preset transfer, scene, Save and Copy Scene operations while scan runs.
- [ ] Hardware test all 128 names on original MG-30 Gen2 FW 6.0.x. Confirm 28A TT Clean Single, 28B NAM TES, 28C TT DJENTE, 28D TT TV, 29A R.ACOUSTIC, 29B MK Shim Diy.
- [ ] Verify header Import/Export, list selection/sync, Save, Copy Scene, NAM, IR User and Collection workflows on the new APK.
- Details: docs/research/MG30_PRESET_MANAGER_UI_2026-10-31.md

### Preset Manager APK build result (2026-10-31)

- [x] GitHub Actions #175 passed: 9 protocol regression tests, Android debug build, artifact upload.
- [x] Source commit b4c26c9202e435b14ce7bcf03d6ce7a6b9cda0a3.
- [x] Artifact MG30-Studio-debug-APK ID 13046282191; APK 4,400,228 bytes.
- [x] APK SHA-256 7d96bba63a0dcdcbd36ce46e9738166d7f4a99dbf93bc0d713722c278621f64d.
- [ ] Physical test on original MG-30 Gen2 FW 6.0.x: refresh full 128 slot names, verify 28A–29B labels, choose a row and sync, then check Import/Export and existing NAM/IR/Collection functions.

 
### Preset Manager startup regression — recovery build (2026-10-31)

- [x] Isolate Preset Manager list initialization so an error in that UI cannot stop main Editor render or USB-MIDI connect-handler wiring.
- [x] Wire core Editor render and USB-MIDI click handler before optional Preset Manager initialization; catch/log Preset Manager-only errors.
- [x] Native Android classes.dex and AndroidManifest confirmed byte-identical to previously working Build #155.
- [x] Added startup-order regression test and inline script parse check.
- [x] GitHub Actions Build #178 passed: 11 tests, 0 failures; APK built and uploaded.
- [x] APK: MG30-Studio-USB-MIDI-Startup-Fix-Build-178.apk · 4,400,364 bytes · SHA-256 ab87eb8e28a0106863e1f1275bb5fc5b03e2d85ac748e9696e76c52ed2372a55.
- [ ] User hardware test: Editor renders normally; connect via OTG succeeds; header shows Terhubung; then check Preset Manager and existing NAM/IR/Collection workflows.
- Details: docs/research/MG30_PRESET_MANAGER_STARTUP_REGRESSION_2026-10-31.md


### Rollback — Preset Manager UI experiment (2026-10-31)

- [x] User reported Editor render regression and USB-MIDI no longer connects on Build #178.
- [x] Stopped the Preset Manager redesign rather than asking the user to troubleshoot hardware.
- [x] Restored `www/index.html`, `www/ui-redesign.css`, `www/ir-transfer.js`, `www/nam-transfer.js`, and `www/mg30-preset-export.js` exactly to stable Build #155 baseline commit `d75d55942ad57562b8b27018d4cda9933e237476`.
- [x] Removed startup test specific to the reverted Preset Manager startup path.
- [x] Retained the 32-byte QuickTone IR resource-name support present in Build #155.
- [ ] Build restored baseline and verify CI before APK delivery.
- [ ] User to confirm Editor renders normally and USB-MIDI reconnects on physical MG-30.
- Preset Manager redesign is suspended; do not touch Editor/USB-MIDI/NAM/IR/MIDI paths for another UI-only change.
- Details: `docs/research/MG30_PRESET_MANAGER_STARTUP_REGRESSION_2026-10-31.md`


### Restored stable Editor APK — Build #184 (2026-10-31)

- [x] CI #184 passed tests and Android debug build.
- [x] Five core/UI/transfer files restored byte-identically to stable Build #155 baseline.
- [x] APK size 4,395,972 bytes; SHA-256 04d67d94cee87a3f70f5be6597451393aa85643f4ffdfa7fe19dc879a99365f4.
- [x] Artifact ID 13047232483.
- [ ] User to install Build #184 and confirm Editor fully renders and USB-MIDI connects to original MG-30 Gen2.


---

## Dedicated Preset Manager redesign branch — 2026-10-31

<badge>Branch: `feature/preset-manager-redesign`</badge>

**Baseline:** `c5a2ba998777dd8cb8601a7a7bd629ef97902f08` — restored stable Editor code after rollback.

### User's requested result

- [ ] Rename page to **Preset Manager** and remove the subtitle.
- [ ] Place Import and Export actions in the page header.
- [ ] Show all 128 hardware slots in a single vertical scrolling list (01A–32D).
- [ ] Display both slot number and actual preset name, following the MG-30 hardware list style.
- [ ] Highlight selected slot and keep layout compact, clear and efficient.
- [ ] Keep local drafts separate and visually unobtrusive.

### Strict change boundaries

- [ ] Do not modify Editor page markup, render functions, state, startup code or initialization order.
- [ ] Do not modify USB-MIDI / Native Android MIDI code, event handlers or connection state.
- [ ] Do not modify MIDI mappings or parameter encoding.
- [ ] Do not modify NAM, IR User/Third Party, IR Collection, Collection → User behavior.
- [ ] Do not modify preset Import/Export protocol, binary serializer, Save-to-device, Copy Scene, CTRL/EXP or signal-chain behavior.
- Prefer isolated `www/preset-manager.js` plus Preset Manager-scoped CSS. UI/script errors must never block the Editor or USB-MIDI startup.
- Do not start preset-name scans automatically on connection. Any read-only scan must first have a separate concurrency review and must not overlap NAM/IR/Collection/preset transactions.

### Mandatory iteration / build approval protocol

**For every future code change:**

1. Make one small, reviewable logical code change on this branch only.
2. Update this checklist in the same work cycle, naming every changed file, summary, commit SHA, untouched features, test status and next validation step.
3. Stop and ask the user exactly: **“Build sekarang atau nanti?”**
4. Do not run CI, GitHub Actions, Gradle or APK build until the user explicitly says **build sekarang**.
5. If the user says **build nanti**, leave the committed code/checklist as-is and do not build.
6. If the user says **build sekarang**, run tests/build, download the matching artifact, extract the APK and post a direct sandbox APK link in chat. The user must not need to navigate GitHub Actions.
7. Never supply an older APK as though it contains the latest source.

### Branch setup completed

- [x] Created branch `feature/preset-manager-redesign` from the restored stable recovery baseline.
- [x] Added detailed plan: `docs/research/MG30_PRESET_MANAGER_REDESIGN_PLAN_2026-10-31.md`.
- [x] Recorded the no-build-without-approval procedure.
- [x] No application code has been changed on this branch.
- [ ] Review/propose the visual and interaction structure before the first code edit.

**Plan commit:** `8a7074057e1c3f9e93c6feaab3aca6032463fc72`.

**Current stop point:** branch and checklist are prepared. Waiting for the user's next instruction. No build has been started.


---

## Strict scope lock — Import/Export, movable signal chain, non-Preset tabs (2026-10-31)

<badge color="danger">Protected areas — do not modify</badge>

### Absolute prohibitions

- [ ] **Preset Import and Export code must not be changed.** This includes controls/IDs/event wiring, Import validation, bridges, SysEx/packet flow, serializers/parsers, binary format, Export readback, Android save picker, transaction timing, and tests. Header buttons are visual placement only; reuse existing controls/handlers without changing their behavior. If moving them needs a protected code edit, stop and ask first.
- [ ] **Movable Signal Chain must not be touched.** No markup, CSS, drag/drop, touch handling, DOM order, reorder algorithm, state, persistence, callbacks, event propagation or supporting code changes.
- [ ] **No code outside the Preset Library tab may be modified.** Editor, NAM & IR, Studio, Device, app shell, global header/navigation, shared startup, USB-MIDI/native bridge, global state/helpers, MIDI mappings, Save, Copy Scene, CTRL/EXP and all other non-Preset tabs are protected.
- [ ] Do not change global/shared CSS or global/shared JavaScript where it could affect a protected area.
- [ ] If the requested Preset Library UI cannot be completed without touching a protected area, stop and request explicit permission. Never decide to broaden scope yourself.

### Safe implementation boundary

- Prefer a standalone Preset Library controller/module (for example `www/preset-library-ui.js`) and CSS selectors namespaced only to a dedicated Preset Library container.
- A shared host file such as `www/index.html` is not automatically considered safe. Before editing it, isolate the exact Preset Library-only markup/attachment point and confirm the diff does not touch Editor, startup/connect code, transfer modules or movable signal chain.
- Import/Export controls in the header may be moved visually only by a narrowly scoped wrapper/CSS while preserving their exact IDs, handler bindings and module behavior.
- No protocol work, no transfer refactor, no global cleanup, no unrelated fixes.

### Mandatory change record

For each single, small code change, append to this checklist:
- Date and purpose.
- Exact list of files changed.
- Commit SHA.
- Confirmation that Import/Export, movable signal chain, Editor, USB-MIDI, NAM, IR, MIDI mapping, Save, Copy Scene, CTRL/EXP and non-Preset tabs were not touched.
- Tests run (or “not run”).
- Next validation step.

After the code change and checklist update, stop and ask **“Build sekarang atau nanti?”**. Never trigger CI, GitHub Actions, Gradle or APK packaging before the user explicitly says **“build sekarang”**.

### Universal new-chat resume prompt

Saved separately at:
`docs/research/UNIVERSAL_NEW_CHAT_RESUME_PROMPT_PRESET_MANAGER.md`

Copy that prompt into a new chat in this same project whenever a conversation is interrupted. It instructs the next chat to inspect the latest checklist and resume from the exact last commit/stop point without asking the user to repeat established context.

### Addendum commit

- Plan scope-lock commit: `8e1e1c10997fdfdb0a966b3df746b6fc2ff56a99`.


### Universal resume prompt added (2026-10-31)

- [x] Added `docs/research/UNIVERSAL_NEW_CHAT_RESUME_PROMPT_PRESET_MANAGER.md`.
- [x] Prompt instructs a new chat to inspect branch HEAD, checklist, plan, latest commits and current stop point before continuing.
- [x] Prompt repeats all strict scope restrictions: no Import/Export changes, no movable signal-chain changes, no code outside Preset Library.
- [x] Prompt repeats the mandatory per-code-change checklist update and **“Build sekarang atau nanti?”** approval gate.
- [x] Direct APK download obligation after an approved build is recorded.
- Prompt file commit: `79ebd05108146a809934b3cbfbf7891565d81b25`.
- Scope-lock plan commit: `8e1e1c10997fdfdb0a966b3df746b6fc2ff56a99`.
- Scope-lock checklist commit: `49b72e32ca6d88ed7b7b23840fe68a215cb5115c`.
- Checklist remains the authoritative source for current work status and must be updated after every code change.
- [x] Documentation only. No app code changed; no build started.

**Current stop point:** branch and restrictions are documented. Waiting to draft/review the Preset Library layout before the first code change.


---

## User visual-reference clarification — preset cards + bidirectional slot sync (2026-10-31)

### Card design — required

- [ ] Replace any table/dropdown/number-only list concept with a vertical scrolling list of rounded preset cards inspired by the supplied TONEX screenshot (visual language only; do not copy TONEX tabs, navigation or branding).
- [ ] Each card displays the slot number in a narrow left column (e.g. 00A, 00B, 01A) and the actual preset name prominently on the right, separated by a thin vertical accent line.
- [ ] Keep the card and page visually minimal. Do not add helper paragraphs, subtitles, category text, repeated status text, explanatory boxes or unrelated metadata.
- [ ] Page header contains only the Preset Manager title and Import / Export actions. Do not add unrelated buttons or page descriptions.
- [ ] Highlight the currently selected hardware slot clearly.
- [ ] Do not add effect/block icons unless data is already available within the Preset Library's permitted scope. Never fabricate icons or labels.

### Bidirectional synchronization — mandatory, not just visual

- [ ] **App → pedal:** tapping card 02A selects/synchronizes hardware slot 02A using the current existing Preset Library slot-selection mechanism.
- [ ] **Pedal → app:** changing the slot directly on the MG-30 to 02A must update the app's active slot and selected-card highlight to 02A.
- [ ] Displayed slot, selected card, app target slot and actual pedal slot must remain in sync. No separate local-only card state.
- [ ] Preserve the current behavior that selecting a slot synchronizes/loads its data into the application.
- [ ] Reuse existing proven slot-state and device-update pathways. Do not add a new Program Change polling loop, global listener, USB-MIDI handler or startup hook.
- [ ] If bidirectional updates cannot be delivered using existing code whose sole responsibility is Preset Library, stop and ask the user before modifying any protected global/USB-MIDI/Editor code.
- [ ] A card list that changes highlight only when tapped locally is not accepted.

### Visual-reference clarification — stop point (2026-10-31)

- Reference: user-provided TONEX-style card list screenshot.
- The screenshot is only a card-layout example; the app remains MG-30 Studio and keeps its existing navigation.
- Desired essential card content: slot number + preset name. No extra prose.
- Actions: Import and Export at top, reusing existing transfer behavior without changing protected code.
- Required interaction: bidirectional app ↔ pedal slot selection and active-card synchronization.
- Plan updated: `docs/research/MG30_PRESET_MANAGER_REDESIGN_PLAN_2026-10-31.md`.
- Plan commit: `01d1fcb812e36cab74bce3f2962a3b462aabee55`.
- Files changed in this clarification: documentation only; no application code changed.
- Protected areas untouched: preset Import/Export implementation, movable signal chain, Editor, USB-MIDI, NAM, IR, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio, Device.
- Tests: not run (documentation-only clarification).
- Next step: inspect the existing Preset Library-only slot selection and incoming device-slot update pathway; propose exact isolated implementation before editing code.
- Build: not applicable; no build started.

**Current stop point:** card design and bidirectional synchronization requirements have been recorded. No code has been touched. The next step is source inspection/design review, not implementation until the user says to proceed.

---

## First Preset Manager card UI implementation — 2026-10-31

Code change committed. Build approval required.

### Implemented

- [x] Replaced only the contents of the Preset Library tab with a minimal Preset Manager header.
- [x] Moved the existing Import file-picker control and Export action to the header without changing their IDs or transfer modules.
- [x] Kept the existing Import send button in a compact inline row that appears after a file is selected.
- [x] Added the vertical rounded-card list for all 128 hardware slots (01A–32D). Cards show only the slot on the left, an accent divider and the preset name.
- [x] Added a selected-card highlight.
- [x] Kept local drafts inside a collapsed Draft lokal section.
- [x] Added page-local name caching in localStorage and lazy name loading when the user opens the Preset Library tab while connected. It does not start on USB connection.
- [x] Name loading uses the existing read-only stored-preset helper readSysExPart(0x0B, program, 0) and decodes the name from packed slots 106–121. It reads only Scene/part 0, sends no Program Change, and performs no writes.
- [x] App → pedal card selection calls the existing selectHardwareSlot(program, false) path.
- [x] Pedal → app selected-card updates listen to the existing mg30-active-preset-changed event. The card component derives active selection from the existing hidden slotLabel; it does not maintain an independent hardware-slot state.
- [x] The name scan checks existing visible busy flags for preset Import/Export, IR transfer, NAM metadata scan and in-progress Save/Copy Scene status before reading. If another known operation is active, it stops and can resume when the user reopens the tab.

### Exact application files changed

1. www/index.html
   - Replaced only the #page-presets section markup.
   - Preserved all existing IDs consumed by the unchanged Import/Export modules and existing legacy slot state.
   - Added one page-scoped stylesheet attachment and one Preset Library module attachment.
   - No Editor, global startup, connection, device, or movable signal-chain logic was changed.
   - Commit: 2294e4a5cc86ea79db2bfc13e781e1585673d07c.

2. www/preset-library-ui.js (new)
   - Implements card rendering, local name cache, lazy read-only 128-slot name loading, card → existing hardware selector, and existing device → app active-slot event handling.
   - Commit: 2bada7b0359cc79526813762079d63cd29f00304.
   - Follow-up byte-range validation correction: 8747a6392b4314a9d7856a195c925041f92117c3.

3. www/preset-library-ui.css (new)
   - All selectors are scoped under #page-presets; no global/shared selectors.
   - Styles the card list, header actions, selected card and compact conditional Import/Export feedback.
   - Commit: f0f99e65f1a3f02c8c0bfd7bb2f036907f0c4018.
   - Follow-up diagnostics visibility correction: 3dcbd03ad7831275ab6d85504a8fa1c25353f012.

### Protected areas explicitly not changed

- [x] www/mg30-preset-import.js — unchanged; all existing Import IDs and behavior retained.
- [x] www/mg30-preset-export.js — unchanged; all existing Export IDs and behavior retained.
- [x] www/mg30-preset-format.js and www/mg30-preset-read.js — unchanged.
- [x] Movable Signal Chain markup, styles, drag/drop, touch and reorder logic — unchanged.
- [x] Editor page logic, signal-chain rendering, www/main.js, CTRL/EXP and Save-to-device — unchanged.
- [x] USB-MIDI / Native Android connection handlers and startup — unchanged.
- [x] NAM and IR User/Third Party / Collection modules and transfer payloads — unchanged.
- [x] MIDI mappings, Studio and Device tabs — unchanged.
- [x] No shared/global CSS file was edited. The new stylesheet is dedicated to #page-presets only.

### Verification status

- Manual source review: the compare diff contains only www/index.html, www/preset-library-ui.js, and www/preset-library-ui.css as application-code files.
- Automated tests: not run yet.
- Android build / APK: not run.
- GitHub Actions: no workflow run was triggered for this new branch; the APK build workflow is not configured to auto-run on pushes to feature/preset-manager-redesign.
- Hardware validation: pending. Must verify all 128 names, app → pedal selection, pedal → app selected-card update, Import/Export and protected workflows on original MG-30 Gen2 FW 6.0.x.

### Mandatory stop point

The first isolated UI/code change is complete and recorded. Do not run tests through CI, GitHub Actions, Gradle or APK packaging until the user explicitly answers: Build sekarang.

Next response must ask exactly: Build sekarang atau nanti?

## Follow-up — Import target flow, Library eyebrow, and remove visible drafts (2026-10-31)

### User-requested behavior implemented

- [x] Small green **LIBRARY** eyebrow now appears directly above **Preset Manager**.
- [x] The visible **Draft lokal** disclosure/card is removed from Preset Manager.
- [x] Legacy draft nodes remain hidden inside a page-local compatibility container because the existing Editor renderer still queries `search`, `presetCount`, `newPresetBtn`, and `presetList`. These nodes are not visible in Preset Manager and their IDs were not removed.
- [x] Tapping **Import** continues to open the existing `presetImportFile` Android/WebView file picker. The accepted file remains `.mg30patch`.
- [x] After a file is selected and validated, the user taps a destination slot card. The card continues to select/synchronize the physical slot through the existing `selectHardwareSlot(program, false)` flow.
- [x] After the slot selection resolves, the Preset Library dispatches a tab-local `mg30-preset-library-target-selected` event. The preset import UI then displays the native confirmation prompt with Cancel / OK.
- [x] Cancel sends no import frames and leaves the selected file available so the user can tap another destination. OK starts the existing import plan.
- [x] The narrow vertical file-name rendering is fixed: the file metadata and target instruction now occupy full-width stacked rows; the old full-width send button no longer squeezes the filename.
- [x] Import feedback identifies the selected destination before confirmation.

### Exact application files changed

1. `www/index.html`
   - Commit: `9d0d751d13bf9b661b9ff43eae461fa6ea959dfa`
   - Added the green LIBRARY eyebrow.
   - Removed the visible Draft lokal disclosure.
   - Preserved the legacy draft DOM IDs in a hidden compatibility container to prevent the existing Editor renderer from throwing on null elements.
   - Kept the file input and Import/Export control IDs in the Preset Library section.

2. `www/preset-library-ui.js`
   - Commit: `3b7b3d4f2edb16d15f7a4106a1d2ea111ff35ebe`
   - After the existing slot-selection promise resolves, emits the Preset Library-local destination-selected event only if the existing `slotLabel` confirms the requested hardware slot.

3. `www/preset-library-ui.css`
   - Commit: `d62229841361c7e20d40a0e6ec88e39b668f1045`
   - Fixes the import file row sizing and shows the selected destination instruction.
   - Adds only #page-presets-scoped styles for the Library heading/import row.

4. `www/mg30-preset-import.js`
   - Commit: `cfd5b0ab896440806b4faf97e1bfbdc54b875e84`
   - Implements file → destination card → native Cancel/OK confirmation → import.
   - Preserves existing file parser, plan builder, 78-step progress callback, bridge call, success/failure reporting, and transfer sequence.
   - The confirmation is shown only after the hardware slot is selected and the bridge confirms the same target program.

### Explicitly untouched

- `MG30PresetImportBridge.import()`, the inline USB-MIDI implementation, packet sequence, 78-frame transfer plan, ACK handling and readback logic.
- `www/mg30-preset-format.js`, `www/mg30-preset-export.js`, `www/mg30-preset-read.js`.
- Export behavior and Android export save picker.
- NAM transfer, IR User / Third Party module, IR Collection, Collection mapping, MIDI mappings, movable Signal Chain, Editor startup/rendering, USB-MIDI/native Android bridge, Save, Copy Scene, CTRL/EXP, Studio and Device.
- No changes to the original MG-30 Gen2 firmware-specific protocol data.

### Validation / build status

- Source changes committed to `feature/preset-manager-redesign`.
- Static/hardware verification has not yet been performed.
- No APK for these new commits has been user-validated.
- Physical test required on **original NUX MG-30 Gen 2, firmware 6.0.x**:
  1. Tap Import and verify Android's file manager opens.
  2. Choose a valid `.mg30patch`.
  3. Tap destination card 32B (or a safe test slot) and verify the Cancel/OK confirmation names that slot.
  4. Tap Cancel and confirm no import transfer starts.
  5. Repeat and tap OK; inspect the 78/78 ACK result and device readback.
  6. Verify Export and all NAM/IR User/Third Party/Collection and MIDI workflows remain unchanged.

**Current stop point:** the requested source change and project notes are committed. Do not treat the old APK/build as containing these changes. Ask the user exactly: **Build sekarang atau nanti?**

## Build verification — destination-first Import flow (31 October 2026)

- Latest application-code commit built: `cfd5b0ab896440806b4faf97e1bfbdc54b875e84`.
- GitHub Actions run: **#189**, run ID `41218768705`.
- Run result: **success**.
- Protocol regression test step: success.
- Capacitor Android project generation: success.
- Debug APK build: success.
- APK artifact: `MG30-Studio-debug-APK`, artifact ID `13048698907`.
- Artifact ZIP SHA-256: `820382313657bb58f044381ae2d1a1a5cd5324b6577f8c995c5795e8901cd74c`.
- Extracted APK: `MG30_Studio_Preset_Manager_Import_Flow_cfd5b0a.apk`, 4,020,278 bytes.
- Extracted APK SHA-256: `1b4ce29cff32b478ea433cc78920c17125d59ffe761d76d9fdb42d1d95235101`.
- Build run was triggered by the branch's existing push workflow configuration.
- Verified the built APK's bundled JavaScript contains the new target-selected event and destination-first confirmation text; bundled CSS contains the Library/import-row selectors.
- APK download has been materialized and is available at `/mnt/data/MG30_Studio_Preset_Manager_Import_Flow_cfd5b0a.apk` in this conversation session.

**Still pending:** install and physically verify on the original NUX MG-30 Gen 2 FW 6.0.x. Confirm Cancel sends no import frames, OK completes on a safe slot, and NAM / IR Third Party / Collection / MIDI paths remain unaffected. CI success is not a substitute for pedal validation.

## Preset Manager import progress dialog and final-card clearance — 31 October 2026

### User-requested refinement

- Replace the persistent inline “Import selesai” status box with a Preset Manager modal dialog.
- While import is active, show a loading spinner, a plain-language explanation of the IR + three-scene transfer, the current phase, and the live ACK count out of 78.
- The progress dialog has no close action and prevents the Cancel/Escape dismissal event while active. This is a presentation-only wait screen; it does not cancel or alter the transfer.
- On success, show the 78/78 ACK and existing three-scene readback result in the dialog, then auto-close after 1.5 seconds.
- On failure, show the error and latest known ACK count, then auto-close after 2.6 seconds. The selected file remains available for inspection/retry as before.
- Clear the old inline status after success/failure so the large persistent message box no longer occupies the Preset Manager page.
- Keep all four legacy draft IDs (`search`, `presetCount`, `newPresetBtn`, `presetList`) hidden and move their compatibility container to the final child position inside `#page-presets`. No ID was removed.
- Add extra bottom scroll clearance (including device safe-area inset) to the 128-card list so the final cards have room at the end of the scroll viewport.

### Exact files changed and commits

1. `www/mg30-preset-import.js`
   - Commit: `03ccd46539eab6aad02010d2c2e14956b7848770`
   - Added dialog state, loading/progress display, ACK counter, non-dismissible cancel handling, and automatic result dismissal.
   - The existing parser call, plan builder, selected-target validation, and `bridge.import(plan, ...)` invocation remain in place. The only changed part is how progress/result feedback is presented.

2. `www/preset-library-ui.css`
   - Commit: `ab3db2de0f1bbfbd3f5fbaeef255e61e8d6106e7`
   - Added modal/spinner/progress/result styles and additional card-list bottom scroll padding.
   - Every new/modified selector is scoped under `#page-presets`; no global/shared selector was added.

3. `www/index.html`
   - Commit: `e7d3249f06166765dd8cc196e02ee810e134ba4b`
   - Added the dialog markup inside `#page-presets`.
   - Moved hidden draft compatibility IDs to the very end of the Preset Manager tab, after the retained hidden hardware-slot compatibility nodes.
   - Shared host file edit is limited to the Preset Manager section.

### Protected areas deliberately untouched

- Import binary parsing, `parseMG30SinglePresetPatch()`, `buildMG30SinglePresetImportPlan()`, plan contents, transfer bridge, USB-MIDI/native Android packet sender, packet ordering, timeouts, ACK validation, readback, and the 78-step transfer behavior.
- Export module, Export readback, serialization, format and native Save As flow.
- Movable Signal Chain markup, styling, drag/drop, touch and reorder behavior.
- Editor rendering/startup, global app initialization, USB-MIDI/native Android connection handlers.
- NAM, IR User/Third Party protocol, IR Collection catalog/install/use workflow, MIDI mappings, Save-to-device, Copy Scene, CTRL/EXP, Studio, Device.
- No shared JavaScript or global CSS was changed. NAM and all other working workflows remain outside this change.

### Validation and build status

- Git compare from previous HEAD `3195b337912e509cee460c975cb75cd2ff02cdc8` confirms the three application files above are the only code paths changed.
- Source inspection confirms the dialog markup, ACK display, cancel-event prevention, success/error auto-close timers, the existing plan-builder call, and the existing bridge import call.
- Automated tests and JavaScript syntax tests: not run.
- GitHub Actions / CI / Gradle / APK build: not run. Commits use `[skip ci]` to avoid triggering an automatic build before user approval.
- Physical import test on original NUX MG-30 Gen 2 FW 6.0.x: pending.
- The previous Build #189 APK does not contain this new dialog refinement.

### Mandatory stop point

The source change and this checklist record are committed to `feature/preset-manager-redesign`. Do not run a build until the user explicitly chooses **Build sekarang**.

Next response must ask exactly: **Build sekarang atau nanti?**

## Build verification — Preset Manager import progress dialog (31 October 2026)

- User explicitly approved **Build sekarang**.
- Build trigger commit: `7ce732bcaae87254d5893286ed168c3d162e0c2b`; the only source difference from the preceding UI commit is a harmless CSS comment in `www/preset-library-ui.css` to produce a push event for the configured APK workflow.
- Branch: `feature/preset-manager-redesign`.
- GitHub Actions run **#190**, run ID `41220763279`: **success**.
- Workflow: `Build MG30 Studio Android APK`.
- Run head SHA: `7ce732bcaae87254d5893286ed168c3d162e0c2b`.
- Protocol regression tests: success.
- Capacitor Android project generation: success.
- Android debug APK build: success.
- APK artifact upload: success.
- Artifact name: `MG30-Studio-debug-APK`.
- Artifact ID: `13049299836`.
- Artifact ZIP size: 4,022,237 bytes.
- Extracted APK: `MG30_Studio_Preset_Manager_Import_Dialog_7ce732b.apk`.
- APK size: 4,400,648 bytes.
- APK SHA-256: `c222f563f4506e6ae201000f403e9059a496662b5a6eeb8fe86b0fcc4d83dd13`.
- APK extracted from the artifact ZIP into the current conversation container and retained at `/mnt/data/MG30_Studio_Preset_Manager_Import_Dialog_7ce732b.apk`.
- Package inspection confirmed: Preset Manager import progress dialog markup, progress ACK field, scoped modal/spinner CSS, success and failure auto-close code, all four hidden legacy draft IDs, their placement after the card list, and safe-area bottom scroll padding are present in the APK bundle.
- The source code that drives the transfer remains unchanged apart from progress/result presentation; no packet, ACK, parser, plan, or readback logic was changed.
- Physical test on original NUX MG-30 Gen 2 FW 6.0.x is still pending. Install this exact APK and verify: loading dialog during import, live phase/ACK count, dialog auto-close, failure message behavior if safely reproducible, last card (32D) fully reachable, and existing preset Import/Export, NAM, IR User/Third Party, IR Collection and MIDI mapping workflows.

**Current stop point:** Build #190 completed successfully and its exact APK was extracted and verified. No more build has been started. Physical pedal validation remains next.

## Preset Manager — consolidate Import / Export feedback into compact modal (31 October 2026)

### User screenshot feedback addressed in this stage

- After choosing a `.mg30patch`, keep one compact file panel: show the selected filename and one short target prompt, **“Pilih slot tujuan.”** The duplicate green “File valid...” status box is suppressed.
- Import progress now uses the smaller shared dialog: title + one progress bar. All explanatory IR/scene/protocol text and the numeric ACK/phase label are removed from the visible dialog.
- Keep the important warning during an active transfer: **“Jangan tutup aplikasi atau lepas koneksi USB selama proses berlangsung.”**
- Successful Import shows only **“Import selesai”**, fills the progress bar, and auto-closes after about 1.05 seconds. Failure shows **“Import gagal”** and auto-closes after about 2.1 seconds with only a short connection reminder.
- Export's existing inline status output is now observed by the Preset Library-only controller and presented through the same modal:
  - active readback/save phase → **“Export sedang berlangsung”** and progress bar;
  - saved file → **“Export selesai”**, then auto-close;
  - initial confirmation cancellation or Android file-manager save cancellation → **“Export dibatalkan”**, then auto-close;
  - failure/disconnected device → short outcome title, then auto-close.
- Hide the permanent Export status banner; keep its existing status node as the observer source.
- Dialog width has been reduced from 380px to 340px and verbose inner content removed.
- Progress fractions from existing Export status messages (for example 48/64) are converted to a visual percentage; no Export message parsing, readback or save behavior is changed.

### Exact application files and commits

1. `www/index.html`
   - Commit: `8972f7de1482b78902bbe5f235369c6d5b075b94`
   - Simplified the shared Preset Manager progress dialog markup to title, progress bar, and USB warning only.

2. `www/preset-library-ui.css`
   - Commit: `240e1dfe69b6cbf8f83e7f22b5290820b0f8190b`
   - Made the dialog smaller and compact.
   - Suppressed the duplicate successful/normal Import status panel and persistent Export status banner; Import validation warnings remain visible.
   - Every new/modified selector is scoped under `#page-presets`.

3. `www/preset-library-ui.js`
   - Commit: `bc86d59464cda59ff294bd50959e2005fbe68cfa`
   - Added a page-local MutationObserver for the existing `presetExportStatus` node.
   - Routes Export progress, completion, cancellation and failure to the shared modal.
   - Follow-up parsing correction: `03dc4305c75ec821fa7e9a7508ef54666a5804f5`.

4. `www/mg30-preset-import.js`
   - Commit: `0b989421174b3352988f791870c322d4603bddd5`
   - Simplified filename/target copy and Import modal copy/results.
   - Keeps the native USB warning and non-dismissible modal behavior.
   - The existing parser, target validation, plan-builder call, `bridge.import(plan, updateProgressDialog)`, and transfer flow remain in place.

### Explicitly untouched

- **`www/mg30-preset-export.js` is unchanged** (source blob SHA remains `7959dea88d42f9433a9ddc06ed7198449e25ba52`). The observer reads its existing status output; no Export function, readback, serializer, .mg30patch content, Android Save As/native bridge or file manager flow is edited.
- Import parser `parseMG30SinglePresetPatch()`, plan builder `buildMG30SinglePresetImportPlan()`, bridge call, packet/frame payload, packet ordering, ACK validation, readback and USB-MIDI sender are unchanged.
- Movable Signal Chain, Editor/startup, global CSS/shared JavaScript, USB-MIDI/native Android connection, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save-to-device, Copy Scene, CTRL/EXP, Studio and Device are untouched.
- No changes to the original MG-30 Gen2 firmware-specific transfer logic.

### Source checks and validation

- Static source assertions passed for: compact dialog markup, single target prompt, no visible Import phase/ACK text, retained USB warning, short Import result text, Export status observer, Export progress fraction regex, Export cancellation/success outcome routing, existing Import plan-builder call and existing bridge call.
- Git compare from prior HEAD `0f8f78b23168ab1bb93a21c4982a116f46d7ccc1` confirms only `www/index.html`, `www/preset-library-ui.css`, `www/preset-library-ui.js`, and `www/mg30-preset-import.js` changed.
- JavaScript automated syntax tests, app tests and physical-device tests: not run.
- GitHub Actions / CI / Gradle / APK build: not run. All commits use `[skip ci]`.
- Build #190 does not contain this feedback refinement.

### Remaining screenshot item — separate next stage

- The card scroller still needs a dedicated Preset Library-only viewport-height adjustment so it reaches down to immediately above the fixed bottom navigation and the final card can be shown fully.
- The hidden legacy draft IDs remain present and at the bottom of `#page-presets`; they must not be removed. This viewport adjustment is the next isolated code change and has **not** been applied in this stage.

### Mandatory stop point

This Import/Export feedback stage and this checklist record are committed. Do not build until the user explicitly chooses **Build sekarang**.

Next response must ask exactly: **Build sekarang atau nanti?**

## Video review — Export picker transition and Preset Manager card viewport (31 October 2026)

### Evidence from user video `1001008546.mp4`

- Export progress itself advances through the readback; the visual glitch happens at the hand-off to Android File Manager / DocumentsUI.
- The video shows the Export web modal still displayed while the native save-location picker slides over it, creating a split/overlaid transition.
- Source tracing confirms the Export module first sets the status text `Pembacaan selesai. Memilih lokasi penyimpanan di File manager Android…`, then immediately invokes the existing `savePatch()` / native `savePatch` bridge. The Preset Library MutationObserver previously treated that status as another generic “Export sedang berlangsung” state and left the web modal open.
- The final captured Preset Manager list ends noticeably above the fixed bottom navigation, leaving unused vertical space and limiting how many complete cards can be shown.

### Changes committed

1. `www/preset-library-ui.js`
   - Commit: `f6baa478df7b4cf5bbf592808a4dceefc3d08f61`.
   - In the existing Export-status observer, detect the “Memilih lokasi penyimpanan / File manager Android” hand-off status.
   - Clear any pending Export feedback auto-close timer and close the Export modal before Android DocumentsUI appears.
   - When the native file manager returns, the unchanged existing status still drives the short `Export selesai` or `Export dibatalkan` dialog. Export progress, failure and initial-confirmation cancellation feedback remain routed to the same modal.
   - No changes to `www/mg30-preset-export.js`, `savePatch()`, native Android bridge, readback sequencing, .mg30patch serialization or File Manager result handling.

2. `www/preset-library-ui.css`
   - Commit: `cfcb379c3e89a1aa52dcea95ac3672d85e6e5d95`.
   - Added a mobile-only, Preset Manager-scoped dynamic list height: `min(720px, calc(100dvh - 280px))`.
   - Removes the previous 64vh/620px mobile cap for widths up to 720px, so the card list expands toward the fixed bottom tab navigation.
   - Keeps the existing internal scrolling, card dimensions, bottom/safe-area padding, and hidden draft compatibility nodes. No nav CSS was changed.

### Protected areas / verification

- `www/mg30-preset-export.js` remains unchanged (SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`).
- Export data readback, file format, native Save As bridge, cancellation result and protocol are unchanged.
- Import parsing, plan builder, bridge transfer, ACK/readback and packet sequencing are unchanged.
- Editor/startup, global/shared CSS, Movable Signal Chain, USB-MIDI/native Android connection, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save-to-device, Copy Scene, CTRL/EXP, Studio and Device remain untouched.
- Git compare from previous HEAD `c4f0c0f560ab009a13a100a7576bc1fb74137a70` confirms only `www/preset-library-ui.js` and `www/preset-library-ui.css` changed.
- Static source checks passed for the pre-picker dialog close, preserved success/cancel popups, and mobile dynamic card height scoped under `#page-presets`.
- Automated app tests and physical Android/device validation: not run.
- Prior Build #191 (run ID `41223265713`) succeeded for commit `c4f0c0f560ab009a13a100a7576bc1fb74137a70`, but its artifact predates both changes in this section.
- No GitHub Actions, CI, Gradle or APK build has been run for commits `f6baa478` / `cfcb379c`; both commits use `[skip ci]`.

### Mandatory stop point

The Export transition and card-viewport source changes are committed and this checklist entry records the video diagnosis. Do not build until the user explicitly chooses **Build sekarang**.

Next response must ask exactly: **Build sekarang atau nanti?**

## Screenshot clarification — measure Preset Manager list exactly to bottom tab (1 November 2026)

### User's intended result

- The 128 preset cards should use the available vertical area down to immediately above the fixed bottom tab navigation.
- Show more complete cards at once; if the final card cannot fit entirely on a very short screen, the card list remains scrollable and must never be clipped by the fixed navigation.
- Do not delete the hidden legacy Draft IDs.

### Why the previous layout stopped early

- The four compatibility IDs `search`, `presetCount`, `newPresetBtn`, and `presetList` are inside a container with class `hidden`; the shared CSS defines `.hidden { display:none!important }`. They therefore consume no layout height.
- The actual limit was the mobile card scroller's fixed viewport formula `min(720px, calc(100dvh - 280px))`, plus 34px bottom padding.
- The screenshot also showed the shared `MG30 Studio` footer underneath the preset list; the footer and fixed bottom nav do not need to be moved or edited.

### New dedicated layout adjustment

1. `www/preset-library-ui.js`
   - Commit: `cae96c435c1a23c000943560465e8cfe63c6f216`.
   - Added `resizeCardViewport()`, which measures the visible card-list top and the real top edge of the fixed `.nav` and sets the card scroller height to the exact available gap minus an 8px clearance.
   - Recalculates on window resize, VisualViewport resize, Preset tab activation, and Import file-panel visibility changes.
   - Runs only for visible Preset Manager on phone-sized layouts (<=720px); it does not reposition/change the shared nav.

2. `www/preset-library-ui.css`
   - Commit: `b71a5bfccf964977e3943beb88c51edb279b5767`.
   - Reduces card-list bottom padding and scroll padding from 34px to 8px.
   - Replaces the hard mobile height/max-height cap with a fallback. The runtime measurement supplies the final inline height and max-height.
   - All changes are scoped to `#page-presets .preset-library-card-list`.

### Preserved items

- All four Draft compatibility IDs remain present inside their original hidden container in `www/index.html`; no markup changes were made.
- `www/mg30-preset-export.js` remains unchanged (SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`).
- Export hand-off fix, Import flow/protocol, parser/plan builder, USB-MIDI, native Android bridge, Editor/startup, Signal Chain, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio and Device remain untouched by this layout stage.
- Git compare from source build-trigger base `2a4310f304faab9a34ed88bda2693e7603766995` confirms only `www/preset-library-ui.js` and `www/preset-library-ui.css` changed in this stage.

### Build status

- Previous Build #192 (run ID `41224584822`) completed successfully against base commit `2a4310f304faab9a34ed88bda2693e7603766995`; artifact ID `13051745621`, ZIP size 4,021,812 bytes. The user screenshot still showed unused space before the bottom tab, so #192 does not contain the exact measurement adjustment in this section.
- This dynamic-height update is source-only; automated tests and physical screen validation have not yet been run.
- No CI / GitHub Actions / Gradle / APK build has been triggered for commits `cae96c43` and `b71a5bfc`. Both use `[skip ci]`.

### Mandatory stop point

This one layout change and documentation update are committed. Do not build until the user explicitly chooses **Build sekarang**.

Next response must ask exactly: **Build sekarang atau nanti?**
## Preset Manager — framed card collection (1 November 2026)

### User request
- Add one enclosing frame/panel around the complete list of 128 preset cards so the cards appear grouped in a dedicated area instead of floating flat on the page.
- Keep the existing 128 slots, card size, internal scrolling, measured viewport reaching to just above the fixed bottom navigation, and the legacy Draft compatibility IDs.

### Change
- File: www/preset-library-ui.css
- Commit: c464a2976561d174cb84df3625a09f7239a78ea6
- Styled the existing #page-presets .preset-library-card-list as the frame itself; no additional wrapper or DOM relocation was required.
- Added a subtle olive border, 22px rounded corners, darker gradient background, inset highlight and soft shadow.
- Increased only the inner inset spacing to 12px top / 10px sides / 8px bottom. Cards keep their existing individual dimensions and 11px vertical gap.
- Preserved the card list scrolling and dynamic inline height measurement from resizeCardViewport(); the frame adds no space outside the already measured viewport.

### Verification and protected areas
- Static checks passed: frame border, radius, background, shadow, internal scrolling, measured nav-based viewport, all four Draft IDs and hidden Draft container.
- www/index.html and www/preset-library-ui.js unchanged in this step.
- www/mg30-preset-export.js unchanged (SHA 7959dea88d42f9433a9ddc06ed7198449e25ba52).
- No changes to Import/Export protocol, parser, plan, native file picker, USB-MIDI, Editor/startup, Movable Signal Chain, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio, Device, global CSS or shared navigation.
- Automated tests and physical Android visual check: not run.

### Build state
- Build #192 succeeded on earlier source commit 2a4310f304faab9a34ed88bda2693e7603766995; it does not include the later measured viewport or framed-card changes.
- The current dynamic viewport fix and this frame style have not been built.
- No CI / GitHub Actions / Gradle / APK build has been triggered for this frame change. The commit uses [skip ci].

### Mandatory stop point
This one CSS change and its project notes are committed. Do not build until the user explicitly chooses Build sekarang.
Next response must ask exactly: Build sekarang atau nanti?

## Preset Manager — Editor-matched palette, compact cards, sync outcome toast (1 November 2026)

### User screenshot feedback addressed
- The previous framed list used a green/olive gradient that differed from the charcoal/blue-green Editor panels. The frame now uses an Editor-matched dark charcoal palette and border.
- The frame and individual cards were visually oversized. Reduced frame padding/radius, vertical card gap, card height, slot column width, divider width, card-name font and card-name padding so more slots are visible without changing scrolling.
- Removed the tiny inline preset synchronization progress text below the list; it was obscured by the fixed navigation on phone layouts.
- Background name synchronization now uses the existing application toast function, with brief outcome labels: “Sinkronisasi preset selesai”, “Sinkronisasi preset gagal”, and “Sinkronisasi preset ditunda”. Toast duration is 2.2 seconds.
- If the MG-30 connects while Preset Manager is already open, the existing mg30-midi-connected event now starts the missing-name scan; the existing scanPromise guard prevents duplicate reads.
- If the device is disconnected or a device operation is active, synchronization reports “ditunda”. A read error reports “gagal”; successful completion reports “selesai”.

### Exact source files / commits
1. www/preset-library-ui.css — commit 2fc0fc0a92aac23fec87d9a50fbec4da5f4b3e12.
   - Frame palette matched to Editor panel colors (#151e21 / #12191c / #101619, line #263137).
   - Rounded frame reduced from 22px to 18px, with tighter internal padding and gaps.
   - Cards reduced to 66px base / 62px mobile height; slot label column reduced to 64px base / 60px mobile; divider 3px; label font/padding reduced.
   - presetLibraryScanStatus is hidden inside the Preset tab.
2. www/preset-library-ui.js — commit 3d8635ff38ea33290bc9eb05427fbeb2ccb2b1a9.
   - Removed progress writes to the obscured scan-status element.
   - Added small outcome toast using the existing window.toast function only.
   - Shows the requested finished / failed / deferred outcome and starts a scan when the connected-device event arrives while the Preset tab is open.
   - Preserves current cache, stored-preset read command readSysExPart(0x0b, program, 0), retry and read-only scan path.

### Protected areas / verification
- All four legacy Draft IDs (search, presetCount, newPresetBtn, presetList) remain in the same hidden container in www/index.html.
- The exact nav-based card viewport measurement from the previous step remains in place.
- Export picker transition observer remains unchanged; www/mg30-preset-export.js remains unchanged (SHA 7959dea88d42f9433a9ddc06ed7198449e25ba52).
- Import parser/plan/bridge and Export readback/serialization/save/File Manager native flow remain unchanged.
- No edits to www/index.html, www/main.js, www/ctrl-editor.js, www/ctrl-editor.css, www/ui-redesign.css, global CSS, shared navigation, Editor/startup, Movable Signal Chain, USB-MIDI/native Android connection handlers, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save-to-device, Copy Scene, CTRL/EXP, Studio or Device.
- Git compare from previous successful build source 134dc6dd731a49779ea6f60295e0abf814e2e7cb confirms only www/preset-library-ui.css and www/preset-library-ui.js changed in this application stage.
- Static assertions passed for the palette, compact card sizing, hidden inline scan text, three toast outcomes, auto-scan on mg30-midi-connected, retained stored-preset read path, unchanged Export module and retained Draft IDs.
- Automated tests and physical UI/MG-30 validation: not run.

### Build status
- Build #193 completed successfully (run ID 41226563156) against commit 134dc6dd731a49779ea6f60295e0abf814e2e7cb, artifact ID 13051943991, ZIP size 4,022,206 bytes. It predates this compact palette/card/toast refinement.
- This refinement has not been built. No CI / GitHub Actions / Gradle / APK build has been triggered for commits 2fc0fc0a / 3d8635ff; commits use [skip ci].

### Mandatory stop point
This visual/synchronization stage is committed. Do not build until the user explicitly chooses Build sekarang.
Next response must ask exactly: Build sekarang atau nanti?
## Preset Manager — bottom fade / sinking-card edge (1 November 2026)

### User request
- Add a subtle bottom shadow/gradient inside the framed card collection so the last visible cards appear to fade or sink into the frame background rather than ending at a hard, abrupt edge.
- Keep the fade localized to Preset Manager and preserve card selection/scroll behavior.

### Change
- File: www/preset-library-ui.css
- Commit: 654f9029fdaf745de43765f791c25e5d1de829d7
- Added #page-presets .preset-library-card-list::after as a sticky 48px overlay at the bottom of the scroll viewport.
- Gradient starts transparent and blends into the existing frame base color (#101619), with a very soft upper shadow.
- pointer-events: none ensures the overlay does not intercept card taps.
- The pseudo-element is inside the existing scrolling list; no wrapper, markup, height measurement or card geometry changes were made.

### Preserved
- Editor-matched frame palette and compact card sizing.
- Dynamic measured list height to the top of the bottom navigation.
- All four hidden Draft compatibility IDs.
- Import/Export feedback and the Export native File Manager hand-off observer.
- www/mg30-preset-export.js is unchanged; no transfer protocol, readback, save, USB-MIDI, Editor, Signal Chain, NAM, IR, MIDI mapping, Studio or Device code changed.

### Verification and build
- Static checks passed for the page-scoped pseudo-element, sticky bottom positioning, transparent-to-frame gradient, and pointer-events none.
- Build #194 succeeded on source commit a49bf650543b58d9b74de10d2a4568d78a96cc53 (run ID 41228353932, artifact ID 13052363256, ZIP size 4,022,251 bytes); it does NOT contain this new bottom fade.
- The new bottom fade has not been built or tested physically on the Android phone / original MG-30.
- No CI, GitHub Actions, Gradle or APK build was triggered for commit 654f9029; it uses [skip ci].

### Mandatory stop point
This one CSS change is committed and documented. Do not build until the user explicitly chooses Build sekarang.
Next response must ask exactly: Build sekarang atau nanti?
## Preset Manager — extend bottom fade to the frame edge (1 November 2026)

### Screenshot issue and diagnosis
- User reported that the bottom fade did not reach the bottom edge of the frame. Screenshot shows the fade ending above the frame's lower boundary, leaving a visible abrupt transition.
- Cause in current implementation: sticky pseudo-element used bottom: 0 and 48px height while the scroll container retained 8px bottom padding, so the overlay visually stopped short of the inner frame edge.

### Single CSS correction
- File: www/preset-library-ui.css
- Commit: e392180c752ad9857cee8332df3930c8c61d5423
- Extend the sticky fade from 48px to 56px; offset sticky bottom by -8px to cover the list's bottom padding; apply matching -8px bottom margin; soften the gradient ramp and finish at 99% of the frame base color; increase corner radius to follow the frame bottom.
- `pointer-events: none` remains, so card selection is not intercepted.
- No HTML, JS, scroll measurement, card sizing, frame dimensions, import/export, or device logic changed.

### Build and validation
- Build #195 succeeded for source commit dcd017b8384eee91b7d80d4a129bb21bf84adcc6 (run ID 41229602878; artifact ID 13053385990; artifact MG30-Studio-debug-APK; ZIP size 4,022,403 bytes). Build includes the first fade but NOT this edge correction.
- The edge correction has static source assertions only; not yet built or physically verified on Android.
- No CI/GitHub Actions/Gradle/APK build triggered for e392180c; commit uses [skip ci].

### Protected areas
- Only www/preset-library-ui.css changed in this correction.
- Import and Export code, Editor/startup, global/shared CSS, Signal Chain, USB-MIDI/native Android, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save-to-device, Copy Scene, CTRL/EXP, Studio and Device remain untouched.

### Mandatory stop point
CSS correction is committed and this checklist updated. Ask exactly **Build sekarang atau nanti?** and wait for approval.
## Preset Manager — bottom fade aligned with frame sides and lower corners (1 November 2026)

### User screenshot feedback
- The previous bottom gradient still stopped short of the lower frame edge and did not blend into the left/right inner frame edges.
- The latest correction expands the fade overlay beyond the list content width to cover the 8px horizontal inner padding, and adds side-edge shading in addition to the vertical fade.
- The gradient ends in the exact frame base color #101619; the lower border-radius follows the inner lower frame corners.

### Source change
- File: www/preset-library-ui.css
- Commit: d6040b9083f13159a958c6d684b501006df5532a
- Sticky fade overlay changed from 56px to 64px.
- Width increased from 100% to calc(100% + 16px), with -8px left and right margins to meet the inner frame sides.
- Added a horizontal edge gradient that darkens toward both frame sides, layered with the bottom vertical fade that ends in #101619.
- Bottom radius remains 17px to match the inner edge of the 18px frame with 1px border.
- pointer-events:none is retained so the overlay never blocks card taps.
- No markup, Javascript, card height, scroll viewport measurement, Export/Import, or shared navigation changed.

### Verification / build
- Static source checks passed for expanded width/margins, 64px fade height, horizontal edge shading, exact #101619 bottom color, lower radius and pointer-events:none.
- www/mg30-preset-export.js unchanged (SHA 7959dea88d42f9433a9ddc06ed7198449e25ba52).
- Build #196 succeeded on previous CSS commit 5e13dba57f37824f891fabdea93afc43767afa5c (run ID 41230174130). It predates this geometry correction.
- Build #197 triggered automatically from the corrected CSS commit d6040b9083f13159a958c6d684b501006df5532a; run ID 41230734572. At checklist update time: dependency install in progress; no artifact yet.
- Physical Android screen verification remains pending.

### Protected areas
- Only www/preset-library-ui.css changed for this correction.
- Import/Export transfer code, Editor/startup, global/shared CSS, Movable Signal Chain, USB-MIDI/native Android connection, NAM, IR User/Third Party, IR Collection, MIDI mappings, Save-to-device, Copy Scene, CTRL/EXP, Studio and Device remain untouched.

### Current stop point
Build #197 is already running for the edge correction. Do not start a second build. Continue checking run 41230734572 and download only its artifact after success.
## Preset Manager — isolate tab scrolling and pin footer above bottom navigation (1 November 2026)

### Screenshot diagnosis
- The NAM & IR screenshot showed the shared document/root page had been scrolled down to its end; switching to Presets inherited that same root scroll position. The bottom global `.footer` (`MG30 Studio`) also lives after all page sections, so it only appears when the shared document reaches the end.
- This is not caused by the four hidden Draft compatibility IDs; their container remains `.hidden` and occupies no layout space.

### Implemented change
1. `www/index.html` — commit `6ada04ac86f35885ed566c3dd2dd3b0c5c71e732`.
   - Added a Preset Manager-local `MG30 Studio` footer directly inside `#page-presets`, after the card list/status area and before hidden compatibility nodes.
   - Retained the original shared footer for all other tabs.
2. `www/preset-library-ui.js` — commit `83838af09442e706e444e4a3c093165ed48a742d`.
   - Replaced the old card-height-only calculation with a Preset-only viewport controller.
   - When the Preset page becomes visible on phone layouts, measure the sticky app header bottom and fixed nav top, then set the Preset section's top/bottom viewport variables and add `body.preset-manager-active`.
   - A page-class MutationObserver removes that mode and clears sizing when Presets is hidden, including direct `showPage()` transitions that are not nav button events.
   - The card list now scrolls inside the fixed Preset section; its height is controlled by flex layout rather than document scrolling.
3. `www/preset-library-ui.css` — commit `0070b958a31ddaac0768057ff670a149306083a3`.
   - Added mobile-only fixed panel rules for `#page-presets`, measured between the sticky header and bottom nav.
   - Made only the Preset card list the flexible `overflow-y:auto` area.
   - Hid the original global footer only while `body.preset-manager-active`; the new local footer remains a few pixels above the fixed nav.

### Verification
- Git compare from prior source checkpoint `0c546d1f17d7867173e3a43923dad5a0d1b00f97` confirms only `www/index.html`, `www/preset-library-ui.js`, and `www/preset-library-ui.css` changed.
- Static assertions passed: local footer exists; original footer remains; all four Draft IDs and hidden container remain; fixed mode is scoped to active Preset Manager; top/nav positions are measured; list is the independent flex scroller; mode clears when tab is hidden; global footer is hidden only while Presets is active.
- `www/main.js` is unchanged; `www/mg30-preset-export.js` is unchanged (SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`).
- No protocol, Editor/startup, Signal Chain, USB-MIDI/native Android, NAM/IR, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio or Device code changed.
- Automated tests and physical Android checks for this isolation change: not run.

### Build status
- Build #197 succeeded for prior source commit `d6040b9083f13159a958c6d684b501006df5532a`; run ID `41230734572`, artifact ID `13053622163`, artifact `MG30-Studio-debug-APK`, ZIP size 4,022,454 bytes. It does NOT include this scroll isolation/local-footer change.
- The scroll isolation and footer change has not been built.

### Mandatory stop point
All three source commits and the project checkpoint are saved to the active branch. Do not build until the user explicitly chooses **Build sekarang**.
Next response must ask exactly: **Build sekarang atau nanti?**
## All tabs — independent scrolling and remove MG30 Studio footer labels (1 November 2026)

### User authorization / scope
- User explicitly approved changing only www/ui-redesign.css and www/index.html for app-wide independent tab scrolling and removing MG30 Studio footer labels, with the condition that already-working functions must not be changed or touched.

### Application changes
1. www/index.html — commit 9ee2a812404a1f4b2115bfbfee295086a4e8b83e.
   - Removed the Preset-local footer `<div class="footer preset-library-footer">MG30 Studio</div>`.
   - Removed the original shared footer `<div class="footer">MG30 Studio</div>`.
   - No section markup, nav button, IDs, scripts, handlers or compatibility Draft nodes were changed.
2. www/ui-redesign.css — commit 6d671aa0dcb53bb613d173d1de0cc812636d4d3c.
   - On phone viewports (<=720px), fixes the app shell to 100dvh and prevents the document/body from scrolling.
   - Header remains in the shell; the bottom nav remains fixed.
   - Each currently visible direct `section[id^="page-"]` becomes its own `flex:1` scroll container with `overflow-y:auto` and `overscroll-behavior-y:contain`. Hidden sections stay `display:none`; their own scrollTop is preserved when switched away and back.
   - Overrides only the previous Preset-specific fixed viewport so Presets follows the same flex scroll model as every other tab. The existing `preset-manager-active` controller can still add/remove its body class; its former fixed-page effect is neutralized by scoped `!important` layout overrides.
   - Hides both global footer selectors only; no shared navigation style or behavior changed.

### Protected code verification
- Git compare from previous branch HEAD `437a9bfe57c808f04bdda55c369617c7f38e5a66` shows exactly two changed application files: `www/index.html` and `www/ui-redesign.css`.
- `www/main.js` unchanged (SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`).
- `www/preset-library-ui.js` unchanged (SHA `67ec75258620323492609dcdec559badfb769797`).
- `www/preset-library-ui.css` unchanged (SHA `ce207d1b218366add1b4916225ee0eedb3a24d6d`).
- `www/mg30-preset-export.js` unchanged (SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`).
- All four legacy Draft IDs remain in their original hidden container.
- No USB-MIDI/native Android, Editor, Signal Chain, Import/Export, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save-to-device, Copy Scene, CTRL/EXP, Studio or Device logic was touched.

### Build runs
- Push of the HTML commit triggered Build #199, run ID `41233084907`, source commit `9ee2a812404a1f4b2115bfbfee295086a4e8b83e`. This captures only the footer removal and is not the final build for the full feature.
- Push of the CSS commit triggered Build #200, run ID `41233090589`, source commit `6d671aa0dcb53bb613d173d1de0cc812636d4d3c`. This is the final build containing both approved application changes; use #200 for validation and APK retrieval.
- Static source assertions passed. Automated protocol regression and Gradle result for #200 are pending at the moment of this record; physical Android UI verification remains pending.

### Stop / next action
Do not edit other application files. Follow Build #200 to completion, verify the artifact source SHA matches `6d671aa0dcb53bb613d173d1de0cc812636d4d3c`, download/extract/inspect its APK, then provide the verified APK link.
### Build #200 — independent tab scrolling + remove footer labels (1 November 2026)

- Build run: 41233090589; result: success; branch: feature/preset-manager-redesign.
- Exact application source commit: 6d671aa0dcb53bb613d173d1de0cc812636d4d3c.
- All workflow stages succeeded: Node setup, Java setup, npm install, protocol regression tests, Capacitor Android generation, Gradle assembleDebug, artifact upload.
- Artifact ID: 13054292076; artifact: MG30-Studio-debug-APK; downloaded ZIP: MG30_Studio_Build_200_Independent_Tabs.zip; ZIP size 4,023,560 bytes.
- Extracted APK: MG30_Studio_Build_200_Independent_Tabs.apk; size 4,401,596 bytes; SHA-256 `4cae80dad35061272d001af0a30977d11a02a27f0a5993089ea990c3324cc107`.
- APK ZIP integrity test passed. Embedded web assets verified: both MG30 Studio footer markup strings absent; bundled CSS contains 100dvh/overflow-y auto independent tab shell and the Preset Manager fixed-viewport override.
- `npm test` passed. Physical Android tab-switch/scroll-retention test is still pending.
- Build #199 (run 41233084907) was triggered by the preceding HTML-only commit and is not the authoritative build. Build #200 checks out the combined source commit with both approved files.
- No changes to main.js, preset-library-ui.js/css, mg30-preset-export.js, MIDI/SysEx/device logic, Editor behavior, Import/Export protocols, NAM/IR, Signal Chain or mapping.
## Fix Build #200 regression — normal header position and restore Preset card scrolling (1 November 2026)

### Screenshot diagnosis
- After Build #200, the Android screenshots showed the NUX header displaced far down the screen (large blank region above it) and Preset cards not scrolling.
- The previous independent-scroll shell sized `.app` but did not pin the shell itself to viewport origin; body was fixed, which could retain a prior root scroll/visual viewport offset.
- The old Preset-specific override in the global CSS forced the page section to `display:block`, while the Preset UI expected its card list to flex inside a column. That removed the list's bounded flex height and made scrolling unreliable.

### Correction
- File: www/ui-redesign.css only.
- Commit: e636a666d4439fd0bc220c064a93be2d1b29ab87.
- The app shell is now explicitly `position:fixed; inset:0` and body returns to normal static positioning while html/body root scrolling remains locked on mobile. This anchors the NUX header at the top of the viewport and prevents inherited document scroll offset.
- Header is returned to normal in-shell flex flow, with transform/inset reset and no forced height.
- Visible tab sections remain individual flex scrollers, with overscroll containment and hidden sections removed from layout.
- Preset-only override now makes `#page-presets` a `display:flex; flex-direction:column; overflow:hidden` viewport. Its heading/actions remain fixed in the panel while `.preset-library-card-list` is `flex:1; min-height:0; overflow-y:auto`, restoring a bounded, independently scrollable card list.
- Bottom navigation stays fixed. No JavaScript or DOM change was necessary.

### Scope / protected code verification
- The only app source file changed for this correction is `www/ui-redesign.css`.
- `www/index.html` unchanged; no footer, markup, Draft IDs or script tags changed.
- `www/main.js` unchanged SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`.
- `www/preset-library-ui.js` unchanged SHA `67ec75258620323492609dcdec559badfb769797`.
- `www/preset-library-ui.css` unchanged SHA `ce207d1b218366add1b4916225ee0eedb3a24d6d`.
- `www/mg30-preset-export.js` unchanged SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- No changes to Editor controls, Signal Chain, USB-MIDI/native Android, Import/Export protocol, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save, Copy Scene, CTRL/EXP, Studio, Device or startup logic.
- Static assertions passed for fixed app origin, normal-flow header, independent visible section scroll, Preset flex column, bounded internal card-list scroll, and fixed bottom nav.

### Build
- Build #201 was triggered from exact correction commit `e636a666d4439fd0bc220c064a93be2d1b29ab87`, run ID `41233822485`.
- At checklist update time, Node/Java setup had succeeded and dependency installation was running. Protocol tests, Capacitor generation, Gradle compilation and artifact upload were pending.
- Do not use Build #200 APK for this correction; it contains the broken header / Preset scroll layout.
- Physical Android validation still required after installing #201: confirm header near status bar; scroll Presets and verify list moves; switch between tabs and verify retained independent scroll positions.

### Current state
Build #201 is the authoritative build for this fix. Continue monitoring its run and provide only its verified artifact.
### Build #201 — fixed header + restored Preset card scrolling (1 November 2026)

- Run `41233822485`, Build #201, conclusion `success`; exact source commit `e636a666d4439fd0bc220c064a93be2d1b29ab87` on `feature/preset-manager-redesign`.
- All job steps passed: checkout, Node setup, Java setup, npm install, protocol regression tests, Capacitor Android generation, Gradle `assembleDebug`, and APK artifact upload.
- Artifact ID `13055051632`, name `MG30-Studio-debug-APK`, ZIP 4,023,993 bytes; downloaded and extracted as `MG30_Studio_Build_201_Fixed_Header_Scroll.apk` (4,401,968 bytes).
- APK SHA-256: `a04cce7cc5523364b1f3fefb0d0409419a8ede399f23b91217d9772f18bf9b22`.
- ZIP integrity test passed; APK identified as Android package with APK signing block.
- Inspected packaged Vite bundle: app fixed viewport recovery present; independent section scroll present; Preset flex-column and card-list internal `overflow-y:auto` present; both MG30 Studio footer strings absent; all four hidden Draft IDs remain.
- No protocol/device/feature JS code changed for this fix. Physical Android UI validation remains pending; install #201 and verify header top position, Preset scrolling, and tab-to-tab scroll retention.
## Cross-tab sticky headings, Device compact layout, and per-tab bottom fades (1 November 2026)

### User screenshot requests
- Keep the heading/top controls fixed inside each tab while its content scrolls: Editor CTRL/EXP + Save-to-device, NAM & IR title, Studio title, and Backup title.
- Device page: remove the large DEVICE / Device & Settings title and explanatory subtitle; start its USB connection panel closer to the app header.
- Add a bottom gradient fade to all non-Preset tabs, ending at the scroll viewport boundary above the fixed bottom navigation. Do not duplicate the existing Preset Manager fade.
- Correct the right inset/box alignment of Preset Manager Export button.

### CSS-only changes
1. `www/ui-redesign.css` latest blob SHA `d00872d708124046f5d826d5bbb0c0df800676ae` (change commit `08409b72e02e46bf88b13188090844a543e130ca`, with Device selector correction commit `d1b9209722864aa16c4ca5a649a72bd17cb8730b`).
   - On phone widths, make `.editor-topbar`, `.nam-page-hero`, `.studio-page-hero`, and Backup's first hero sticky at the top of their own page scroll container, with opaque/blurred background and border so their actions/titles do not disappear under scrolling.
   - Device's first `.hero` (DEVICE eyebrow, Device & Settings title, subtitle) is hidden; first USB audio card gets a small 2px top margin and Device section gets 5px top padding.
   - Add a 58px sticky bottom fade to Editor, NAM, Studio, Device and Backup scroll containers. Gradient ends in app background `#0b1012`, extends across the app's side gutters, reaches the top edge of fixed bottom navigation, and has `pointer-events:none`.
   - Preset Manager is explicitly excluded from this extra pseudo-element; it retains its own existing card-frame fade.
2. `www/preset-library-ui.css` latest blob SHA `2f892e82d151ab82d7a98345ea871bc735e3818d` (commit `bd36d0f214615a5818317bd90da17ec47ae434c2`).
   - Add 5px right inset to the Preset header; constrain action buttons' sizing with border-box and consistent 72px minimum width so Export no longer sits flush against the right edge.

### Verification / protected files
- Git compare from prior project checkpoint `115f6c4b12faf7bb68262ebb1d7ea7aaa8728a27` confirms exactly two application CSS files changed: `www/ui-redesign.css` and `www/preset-library-ui.css`.
- `www/index.html` unchanged SHA `75f32a4ed4a83b76596099e731acf8485f60bbb3`.
- `www/main.js` unchanged SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`.
- `www/mg30-preset-export.js` unchanged SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- Editor CTRL/EXP and Save-to-device markup remain untouched; all MIDI, SysEx, USB audio, scene, Signal Chain, Import/Export logic remains untouched.
- Static assertions passed for sticky headers, Editor control buttons remaining in the sticky bar, hidden Device hero, Device spacing, all five non-Preset fades, Preset fade exclusion, Export inset and unchanged protocol files.
- Physical Android layout check and build of this visual stage have not yet been run.

### Mandatory stop point
Both CSS changes and the project notes are saved. Do not run CI / GitHub Actions / Gradle / APK until the user explicitly chooses **Build sekarang**.
Next response must ask exactly: **Build sekarang atau nanti?**
## Device title correction — preserve DEVICE eyebrow and Device & Settings title (1 November 2026)

### User clarification
- The request was to remove only the small explanatory subtitle under Device & Settings, NOT the green DEVICE eyebrow or the large heading.
- Keep the large Device & Settings title, slightly smaller than before.
- Keep Device heading sticky like the other tabs. Keep the Device USB content spacing compact.

### CSS correction
- File: www/ui-redesign.css
- Commit: 95c9fb4d22a861ffa57ddafb64dd04ddf54b0b28.
- Added Device hero to the shared sticky-heading selector alongside Editor, NAM, Studio and Backup.
- Removed the rule that hid the entire Device hero.
- Hide only `#page-device > .hero:first-child p`.
- Preserve the green eyebrow; reduce Device heading to 23px with 1.12 line height.
- Preserve Device top padding (5px) and USB panel margin (2px).

### Verification / protection
- Static checks passed: Device hero visible and sticky, subtitle alone hidden, green eyebrow retained, title 23px, compact panel spacing kept, other tabs' sticky headings remain selected.
- This correction changes only www/ui-redesign.css; no HTML, JS, event handling, USB-MIDI, Editor, Import/Export, NAM/IR, or Device function code changed.
- Automated/physical testing pending.

### Build
- Commit 95c9fb4d22a861ffa57ddafb64dd04ddf54b0b28 was pushed to the active branch and triggers the Android build workflow. Verify its run/artifact before distribution.
### Build #202 — Device heading correction (1 November 2026)

- Build run #202: `41235480866`; completed successfully, source commit `95c9fb4d22a861ffa57ddafb64dd04ddf54b0b28`.
- All workflow steps passed: dependencies, protocol regression tests, Capacitor Android generation, Gradle assembleDebug, and artifact upload.
- Artifact ID `13055268057`, ZIP 4,024,455 bytes; downloaded to `MG30_Studio_Build_202_Device_Header_Correction.zip`.
- Extracted APK: `MG30_Studio_Build_202_Device_Header_Correction.apk`, 4,402,360 bytes.
- APK SHA-256: `c21d602b8e7d66b952cfd9a1416dbab9dfd7f2e24191bf8692f5446e51af4d53`.
- ZIP integrity test passed; APK recognized as Android package with APK Signing Block.
- Inspected packaged `assets/public/index.html` and CSS bundle: green `DEVICE` eyebrow is retained; `<h2>Device & Settings</h2>` retained; explanatory subtitle remains in markup but the scoped CSS hides only its paragraph; Device title is 23px and sticky. Editor/NAM/Studio/Backup sticky heading selectors remain in bundled CSS.
- `www/index.html` unchanged; `www/main.js` unchanged SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`; `www/mg30-preset-export.js` unchanged SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- No MIDI, SysEx, USB connection, Import/Export protocol, Editor behavior, Signal Chain, NAM/IR or Device function logic changed. Physical Device UI check remains pending.
## Preset header button fit + subtle bottom fade on other tabs (1 November 2026)

### User screenshot feedback
- Preset Export button was clipped at the right edge. Reduce Import/Export button size and move the action group slightly left while allowing the title to shrink before the actions overflow.
- Non-Preset tab bottom gradient looked too strong and had a visible transition line. Shorten it and make the ramp much softer, just enough to mask the scroll viewport boundary above bottom navigation.

### Source edits
1. `www/preset-library-ui.css` — commit `11ecead956a222eb37003318516ff9f460846c3d`.
   - Mobile header gap 8px, right padding 12px.
   - Title flexes with `min-width:0` so action buttons retain space.
   - Action group gap reduced to 6px and margin-right 5px (visually shifts it left inside the header).
   - Buttons minimum width reduced 72px -> 62px, minimum height 36px, padding 7px 9px, label font 10px.
   - Export text remains provided by the existing CSS pseudo-label; no button markup or handler changed.
2. `www/ui-redesign.css` — commit `85f5de0f6f9e91b96d2fab63b3e442e8632c8c55`.
   - Non-Preset tab fade shortened 58px -> 32px.
   - Reduced intermediate alpha stops to 0.035 / 0.16 / 0.48 and removed the hard upper box shadow, keeping a gentle gradient into #0b1012.
   - Still applies only to Editor, NAM & IR, Studio, Device and Backup; Preset is excluded because its own frame fade remains.

### Protected files / checks
- Git compare from base `2b163a26a446cb49b3efc7d953739486bdb66e06` shows only two application files changed: `www/preset-library-ui.css` and `www/ui-redesign.css`.
- `www/main.js` unchanged SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`.
- `www/mg30-preset-export.js` unchanged SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- `www/index.html` unchanged SHA `75f32a4ed4a83b76596099e731acf8485f60bbb3`.
- No handlers, import/export protocol, MIDI/SysEx, Editor, Signal Chain, NAM/IR, scene, or device function code changed.
- Static checks passed for smaller/left-shifted actions, title shrink, retained Export label, shorter softer fade, no hard shadow, Preset fade exclusion, and unchanged main/export code.

### Build / testing
- Build #202 (run `41235480866`) is the prior successful APK and does not include these button/fade refinements.
- Current CSS refinements have not been physically tested on Android.
- Do not manually trigger CI/Gradle/APK until the user explicitly chooses Build sekarang. Check recent Actions state because path-based workflow may automatically run on www/ CSS commits.

### Stop point
CSS change and project notes saved. Ask exactly **Build sekarang atau nanti?** before any manual build.
## Correct Export width, full-bottom fade and joined Device header (1 November 2026)

### Latest screenshots / defects
- Preset Export remained clipped because its old explicit min-width/intrinsic sizing exceeded the available header width even after reducing the action group gap.
- Non-Preset tab fade appeared to stop short of the bottom edge because the pseudo-element used `bottom:-5px` and `margin-bottom:-5px`.
- Device screenshot showed USB panel content visible through/above the sticky Device heading, making the label/title appear detached from the app header.

### CSS corrections
1. `www/preset-library-ui.css` commit `6335984e7e15626ffa40a262d5706be9252449d3`.
   - Mobile Preset header changed to an explicit two-column grid: flexible title + fixed 126px action group.
   - Import and Export buttons are now exactly 60px wide, 38px high, with equal columns/gap; title can shrink with `min-width:0`.
   - Explicit width/min/max widths override the earlier `#presetImportChoose` / `#presetExportStart` min-width rules, preventing Export from expanding past the right edge.
   - Existing Export label remains CSS-generated; no element, click handler or export module changed.
2. `www/ui-redesign.css` commit `4905efbafce0b6babe820464e8d42c77f9d33371`.
   - Non-Preset tab bottom fade now uses `bottom:0` and `margin-bottom:0`, so it ends exactly at the scrollport bottom; height 42px, gradual alpha ramp and no hard box shadow.
   - Presets remains excluded from the shared fade and keeps its own card-frame fade.
   - Device sticky hero is made opaque (`#0b1012`), full scroller width, z-index 45, with an aligned negative top margin to cover any USB card content scrolling behind the heading; Device eyebrow/title remain, subtitle remains CSS-hidden.

### Protected files / source checks
- Git compare from previous checkpoint `d4afe433fc70c5795e3f9ac3484c98f4cec85f3f` confirms only `www/preset-library-ui.css` and `www/ui-redesign.css` changed among app source files.
- `www/main.js` unchanged SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`.
- `www/mg30-preset-export.js` unchanged SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- `www/index.html` unchanged SHA `75f32a4ed4a83b76596099e731acf8485f60bbb3`.
- Static assertions passed for fixed button widths, bounded header grid, retained Export label, fade ending at bottom:0 with no bottom margin/shadow, Preset fade exclusion, and opaque full-width Device heading.
- No MIDI/USB/SysEx/device handlers, Import/Export implementation, Editor/Signal Chain, NAM/IR or other feature code changed.

### Automatic builds
- Build #205 (run `41274647488`) was triggered by the intermediate Preset button CSS commit `6335984e7e15626ffa40a262d5706be9252449d3`; intermediate only.
- Build #206 (run `41274669130`) was triggered by latest commit `4905efbafce0b6babe820464e8d42c77f9d33371`; this is the authoritative full CSS correction build.
- At time of note, #205 and #206 were in progress; no artifact available yet. Use #206 artifact only.
## Screenshot-driven correction after Build #206 — verified in browser simulation (1 November 2026)

### User-reported defects
- Export button showed clipped dynamic text `Ekspor 01A sebagai .mg30patch` instead of the short `Export` label.
- Fade on Editor and other non-Preset tabs did not reach the fixed bottom navigation edge.
- Device hero had a 5px top offset caused by `#page-device` padding-top 5px plus a negative hero margin; USB card content could appear as a thin strip above the title.

### CSS-only source correction
1. `www/preset-library-ui.css` — commit `5dc81d61cf70b8484b9f285c0fbd857d6d8a3a7e`.
   - Button bridge JS continues writing its full dynamic status text to the real button DOM; no handler, module or export protocol changed.
   - On mobile, the real button text is visually hidden with `font-size:0!important;color:transparent!important`, while the existing `::after` label is explicitly kept visible as `Export` with 10px font and foreground color.
   - Fixed 60px button geometry and header grid are retained.
2. `www/ui-redesign.css` — commit `b400d9ab25f663a97b2535867f6475680f2efbd4`.
   - Device page top padding set to 0; sticky Device hero margin changed from `-5px -10px 8px` to `0 -10px 8px`, z-index 100, solid background, so it begins exactly at scroll viewport top and covers the USB card behind it.
   - Non-Preset fade pseudo-element now uses `position:fixed`, `bottom:64px`, `height:42px`, full viewport width, zero margins, matching the 64px fixed bottom nav. Fade remains excluded from Presets and pointer-events remain disabled.

### Browser layout simulation — performed BEFORE triggering Build #207
- Test basis: extracted Build #206 APK's actual HTML and compiled stylesheet; preserved the inline HTML scripts (including the NAM & IR merge). Test fixture created 128 preset buttons using the same slot/name/card structure as `preset-library-ui.js` so the actual card scroller height and scrolling could be measured. External feature JS / USB hardware operations were not executed; this was a UI/CSS browser simulation, not a pedal protocol test.
- Viewports: 320x740, 360x800, 393x873 and 432x915 CSS pixels.
- Export at all tested widths: both buttons 60x38px; actions group 126px; right edge exactly matches header right edge; header/action horizontal overflow 0; document horizontal overflow 0. JS dynamic text remains `Ekspor 01A sebagai .mg30patch` but computed font-size is 0; pseudo label content resolves to `Export`.
- Preset card list: computed overflow-y `auto`; at 393x873 clientHeight 665px and scrollHeight 8968px; setting scrollTop to 350 succeeded. This confirms the 128-card list has a bounded, independently scrolling viewport.
- Device at 393x873: section top 80px, sticky hero top 80px (exact alignment). After setting Device scrollTop to 260, hero remains top 80px; hit-testing the top edge returns the hero, not the USB panel, and USB card bottom has scrolled above the hero.
- Fade: fixed overlay bottom 64px / height 42px; fixed nav top 808.95px; fade lower edge at 809px (0.05px alignment difference); document horizontal overflow 0.
- Candidate screenshots saved under `/mnt/data/mg30-sim/validated-*.png` for preset 320/360/393/432, Device scrolled, and Editor fade.
- Static source assertions passed: only the two expected app CSS files changed; `www/main.js`, `www/index.html`, `www/mg30-preset-export.js`, and `www/preset-library-ui.js` are unchanged. No transfer/MIDI/device/editor/Signal Chain feature logic altered.

### Build after successful simulation
- Because the browser simulation and source checks passed, workflow auto-triggered Build #207 from exact source commit `b400d9ab25f663a97b2535867f6475680f2efbd4`; run ID `41277953622`.
- Protocol regression tests and Capacitor Android generation passed; Gradle APK compilation was in progress at the time of this note. No artifact yet.
- #207 is authoritative for this correction. Do not distribute #206 or any intermediate build.
### Build #207 — successful, browser-tested UI corrections (1 November 2026)

- Run #207: `41277953622`; conclusion `success`; exact app source commit `b400d9ab25f663a97b2535867f6475680f2efbd4` on `feature/preset-manager-redesign`.
- All workflow stages passed: dependencies, `npm test` protocol regression suite, Capacitor Android generation, Gradle debug APK compilation, and artifact upload.
- Artifact ID `13071882537`, name `MG30-Studio-debug-APK`, ZIP size 4,025,004 bytes; ZIP integrity test passed.
- Extracted APK: `/mnt/data/MG30_Studio_Build_207_Validated_UI.apk`; size `4,402,812` bytes; SHA-256 `3833716ed0bbc7e0224ef7bd9afa6bf0005b1a389737fec8114ce9339391c810`.
- `file` identifies the output as an Android package with Gradle app metadata and APK Signing Block. `apksigner` was not installed in this environment; no apksigner verification claim is made.
- The APK's compiled HTML/CSS bundle was extracted and inspected; all seven bundle assertions passed: dynamic Export text visually hidden, `Export` pseudo-label still present, Device page padding reset, Device sticky hero flush/opaque, non-Preset fade fixed to bottom64px, non-Preset selectors present, and Preset's existing card-frame fade retained.

### Post-build browser simulation against the actual Build #207 package
- Used the extracted Build #207 APK `assets/public/index.html` and its actual compiled CSS bundle. Inline page scripts were retained, including the NAM & IR merge. For the Preset list, 128 card elements were seeded with the exact slot/card DOM structure from the unchanged `preset-library-ui.js` renderer; this verifies layout/scroll geometry, not hardware protocol.
- Tested 320x740, 360x800, 393x873, and 432x915 CSS-pixel viewports.
- At all four widths: Import and Export each 60x38px; actions group 126px; header/action overflow 0; document horizontal overflow 0. Export button's dynamic DOM text remains `Ekspor 01A sebagai .mg30patch`, its computed font size is 0, and its pseudo-label displays `Export`.
- At 393x873: card list client height 665px, scroll height 8968px, `overflow-y:auto`; scrollTop successfully changed to 350px.
- Device at 393x873: Device hero top exactly matches section scrollport top at 80px. After Device scrollTop 260px, hero remains at 80px and hit-testing at the scrollport top resolves to the hero, not the USB card; no top sliver is exposed.
- Fade at 393x873: fixed pseudo bottom 64px / height 42px; nav top 808.95px, fade bottom 809px (0.05px alignment difference); root horizontal overflow 0.
- Validation screenshots: `/mnt/data/mg30-build207/verified-preset-320.png`, `-360.png`, `-393.png`, `-432.png`, `verified-device-scroll.png`, `verified-editor-fade.png`.
- This is a browser layout simulation using packaged HTML/CSS and a matching card fixture. It is not a physical Android touch test or USB pedal/protocol test; user still needs to confirm on phone and MG-30 Gen 2.

### Protected code
- Only `www/preset-library-ui.css` and `www/ui-redesign.css` changed for this fix.
- `www/main.js` unchanged SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`.
- `www/index.html` unchanged SHA `75f32a4ed4a83b76596099e731acf8485f60bbb3`.
- `www/mg30-preset-export.js` unchanged SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- `www/preset-library-ui.js` unchanged SHA `67ec75258620323492609dcdec559badfb769797`.
- No MIDI, SysEx, USB, NAM/IR, Editor, Signal Chain, Save, Copy Scene, CTRL/EXP or transfer protocol functions were changed.

## Permanent mandatory rule — test every change until the corrected source passes (1 November 2026)

Applies to **every** application/source change, no matter how small (CSS, HTML, JavaScript, text, one-line adjustment, or correction) on `feature/preset-manager-redesign`.

### Required test-and-correction loop
1. After each individual source change, run a targeted simulation/test pass against the exact current source/commit before considering that stage complete or asking for build approval. Select checks that actually exercise the touched area: syntax/static assertions, relevant regression/protocol tests, and browser/UI simulation using the updated source and realistic fixtures where applicable. Never use an older APK or stale source as proof for a new edit.
2. **If a test/simulation fails, do not stop and do not mark the change complete.** Diagnose the cause, make the smallest safe correction inside the approved scope, record the failed attempt and correction, and rerun the relevant checks on the corrected source. Repeat until the required checks pass.
3. Report failures honestly; do not conceal, relabel, or fabricate results. The user-facing hand-off should state the final passing result and any remaining limitations. Preserve the intermediate failure → diagnosis → correction → rerun history in this checklist. If a check cannot be performed because of an environmental or scope limitation, record **NOT RUN/BLOCKED** and the reason; never claim it passed.
4. Every entry must record: date; every changed file; concise change summary; exact commit SHA; protected files/areas checked and confirmed untouched; test/simulation name and method; exact source commit tested; result; any failure diagnosis and correction commit; final rerun result; checks not run and reasons; next step.
5. A later source edit invalidates the earlier pass for that changed source. Rerun applicable checks after every correction. Do not accumulate several untested edits and rely on a test of an earlier state.
6. Keep evidence levels separate: static/syntax checks, automated regression tests, browser simulation, Android build/package validation, and physical Android/MG-30/USB-MIDI testing are not interchangeable. Never describe browser simulation as a physical pedal test.

### Build approval remains mandatory
- Simulations and local tests that do not trigger a build may be run before asking the user.
- Do **not** trigger GitHub Actions/CI, Gradle, APK generation or packaging until the user explicitly answers **Build sekarang**. **Build nanti** means no build.
- If the user authorizes a build and the workflow/build fails, disclose the failure, diagnose and correct it within the approved scope, rerun the applicable test loop, and retry the authorized build until success. Do not present an older APK as the latest.
- Documentation-only changes do not need an Android build. Use a skip-CI marker where appropriate.

**Hard completion gate:** never hand off a source-change stage as complete, and never ask for the build decision, while a required test/simulation is failing or has not been rerun after the last correction. Never invent a passing result.

### Documentation checkpoint for this rule
- Application/source code changed: **none**.
- Checklist updated: `UI_POLISH_CHECKLIST.md`.
- Resume instructions synchronized: `docs/research/UNIVERSAL_NEW_CHAT_RESUME_PROMPT_PRESET_MANAGER.md`.
- Resume prompt commit SHA: `ad49e3060508fe3a63f0d941729888e66af56427`.
- Build/CI/Gradle/APK: **not run** (documentation-only change; build approval rules unchanged).
- Validation: both updated Markdown files fetched back from the branch and checked for the mandatory loop, failure correction/retest requirement, exact-source requirement, and separate build-approval gate.
- Next step: apply this test-and-correction loop to every future source change; after all applicable checks pass, update this checklist and ask **“Build sekarang atau nanti?”**.

## Device bottom-navigation icon — USB symbol only (1 November 2026)

User request: replace only the irrelevant icon in the bottom **Device** tab. Do not change anything else before the user reviews this icon-only result.

### Choice and source
- Replaced the former generic branching/connector glyph with the official Lucide **USB** outline SVG.
- Icon reference: https://lucide.dev/icons/usb — Lucide categorizes USB under Devices / Multimedia / Home and tags it universal, serial, bus, controller, connector and interface. This is a direct fit for MG-30 Studio's Device tab, which includes USB-MIDI and USB audio connection functions.
- Retained the existing `<button data-page="device">`, `.nav-icon` wrapper, `aria-hidden`, viewBox 24×24 and visible label `Device`. Only SVG child shapes changed.

### Source commit / scope
- File changed: `www/index.html` only.
- App source commit: `082c320e847b5cabdf50c7a4802e73cf14a08242` — `Replace Device tab navigation glyph with USB icon`.
- Diff: exactly one existing Device-nav SVG replaced; Git compare reports one file, one insertion and one deletion. No CSS file changed.
- Verified untouched: Editor/NAM & IR/Presets/Studio nav icons and labels; tab IDs and handlers; nav layout and responsive CSS; Editor, movable Signal Chain, Import/Export, USB-MIDI/native Android connection, NAM, IR User/Third Party, IR Collection, MIDI mapping, Save-to-device, Copy Scene, CTRL/EXP, Studio, Device page logic and startup.

### Test and simulation loop — exact tested source
- Source commit tested: `082c320e847b5cabdf50c7a4802e73cf14a08242`.
- Static source check: exactly one `data-page="device"`; five nav buttons remain; Device label, button attributes and wrapper remain unchanged; only the Device SVG differs from the prior commit. PASS.
- CSS compatibility check: existing `www/ui-redesign.css` unchanged blob SHA `f3afcf6454220c7d032b743148ce11667bda7a71`; nav icon rules still set width/height 23px on mobile, `fill:none`, `stroke:currentColor`, stroke width 1.75px, round caps and joins. PASS.
- Browser simulation: Chromium via Playwright `page.set_content`, using the exact five-button nav markup extracted from the tested commit and the existing nav/mobile SVG CSS rules extracted from the unchanged `www/ui-redesign.css`. Viewports: 320×740, 360×800, 393×873, 432×915 CSS px. At all four: five buttons present, visible Device label unchanged, SVG 23×23, seven SVG shapes, button stays inside viewport, nav bottom aligned to viewport bottom, inactive stroke `rgb(132,147,151)`, active Device stroke `rgb(196,245,107)`; screenshot pixel check found 99 active-lime icon pixels. PASS.
- Rendered test screenshots: `/mnt/data/device-nav-320.png`, `device-nav-360.png`, `device-nav-393.png`, `device-nav-432.png`.

### Failed attempts and corrections (preserved)
- Initial Chromium CLI screenshot attempts timed out in the container; Playwright navigation to the local `file://` URL was blocked by the environment. Switched to Playwright `page.set_content` with the exact source snippets; Chromium launched and rendered successfully.
- First test assertion expected nine SVG shapes; inspection of the official SVG showed the icon has seven shapes (two circles and five paths). Corrected the test expectation to seven; rerun passed.
- First pixel-check crop was positioned above the actual icon and returned zero; the next crop used an estimated position and was still offset on the 320px viewport. Corrected the test to derive the SVG's actual `getBoundingClientRect()` for each viewport; all four pixel checks then passed with 99 visible lime pixels. These were test-harness corrections; no further application code change was required.

### Not run / limitations
- No `npm test`, GitHub Actions, CI, Gradle or APK build run. The change is a presentation-only SVG replacement and the user has not approved a build. Preserve the explicit **Build sekarang / Build nanti** gate.
- No physical Android-device screenshot or MG-30 hardware/USB-MIDI test; browser simulation is not represented as physical-device validation.

### Stop point
- The icon-only source change and this documentation record are committed. Do not change any other icon, style or layout until the user reviews this result.
- Ask exactly: **Build sekarang atau nanti?**

## Build #208 — Device tab USB icon APK (1 November 2026)

- User explicitly approved: **Build sekarang**.
- Built source commit: `082c320e847b5cabdf50c7a4802e73cf14a08242` (icon-only `www/index.html` change). The two later commits only append this checkpoint to Markdown documentation; no application source changed after the tested/built commit.
- GitHub Actions run: **#208**, run ID `41279514428`, workflow `Build MG30 Studio Android APK`, event `push`, branch `feature/preset-manager-redesign`, conclusion **success**.
- Job `Build debug APK`: all steps successful, including dependency install, protocol regression tests, Capacitor Android generation / USB audio plugin install, Gradle debug APK build and artifact upload.
- Artifact ID `13073015721`, name `MG30-Studio-debug-APK`, ZIP size 4,025,030 bytes, SHA-256 `3f3ebe6fb9a1204b26469001fb766b1c906abd4663f61bb3dee028617aaf32dc`.
- Downloaded and extracted artifact; ZIP integrity test passed. APK copied to `/mnt/data/MG30_Studio_Build_208.apk`, size **4,402,840 bytes**, SHA-256 `a798ef248e14d1054afe6a7994c63a175b8e5f8a168add9327eb788f32625970`.
- `file` identifies the output as an Android package with Gradle app metadata and APK Signing Block. `apksigner` is unavailable in this environment; cryptographic signature verification was **NOT RUN** and is not claimed.
- UI/browser simulation for the USB glyph passed at 320×740, 360×800, 393×873 and 432×915 before build. Protocol regression tests and Android Gradle build passed in workflow #208.
- No physical Android install test or MG-30 hardware/USB-MIDI test is claimed.
- Build result: **PASS**. This is the new latest APK; do not substitute Build #207.

## Device navigation icon — Multi-effects processor / guitar multi-FX (1 November 2026)

User feedback: the USB connector symbol still did not represent the Device tab well. User requested a recognizable **multi-FX** symbol and approved building the result immediately. Only the icon itself may change.

### Source change
- Changed exactly one SVG inside the existing `button[data-page="device"]` in `www/index.html`.
- New hand-authored, 24×24 outline icon depicts a compact guitar floor multi-effects processor: rounded pedalboard enclosure, small display, three parameter controls and two footswitches.
- Retained the Device button, `data-page="device"`, `.nav-icon` wrapper, `aria-hidden`, label `Device`, viewBox, all sizing / stroke / color CSS and other four bottom-navigation icons.
- Source commit: `7dc18bd497684eb7eef75a98e7b5d17f9f74b31d` — `Use multi-effects processor icon for Device navigation tab`.
- Git compare from prior HEAD `db2f0774047f7fb765043354fc0c4eacc81b6f59` shows exactly one changed file: `www/index.html`, one insertion / one deletion. No CSS or functionality files changed.

### Targeted simulation and correction loop — exact source
- Exact source commit tested: `7dc18bd497684eb7eef75a98e7b5d17f9f74b31d`.
- Static source review: one Device tab; five navigation buttons retained; Device label and button attributes preserved; new SVG contains 8 vector shapes; source diff isolated to Device SVG. PASS.
- Protected-file comparison: `www/ui-redesign.css` unchanged blob SHA `f3afcf6454220c7d032b743148ce11667bda7a71`; `www/main.js` unchanged SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`; `www/mg30-preset-import.js` unchanged SHA `e2490e6df3f5f32853743fc5eb29c99cc4026ea8`; `www/mg30-preset-export.js` unchanged SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- Browser simulation: Chromium + Playwright `page.set_content`, using the exact updated Device SVG / five-tab navigation markup and mobile nav SVG layout/styling from unchanged `www/ui-redesign.css`. Test viewports 320×740, 360×800, 393×873, 432×915. Every viewport: exactly five buttons; Device label unchanged; icon geometry 23×23px; 8 shapes present; no horizontal nav overflow; button stays inside screen; navigation bottom aligns to viewport bottom; Device active stroke is lime `rgb(196,245,107)`. All PASS.
- Render screenshots saved as `/mnt/data/device-nav-multifx-320.png`, `-360.png`, `-393.png`, `-432.png`. 393px screenshot visually confirms the enclosure/display/controls/footswitch glyph reads as a compact multi-effects unit.

### Failed attempt and correction (preserved)
- First Playwright attempt used `page.goto(file://...)`; container policy blocked local-file navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. No application issue indicated. Corrected harness to use `page.set_content` on the same locally saved exact nav test fixture; reran all four viewports successfully. No application-source correction required.

### Build status
- User explicitly said to replace the icon, build, and extract / place the APK directly in the chat.
- Workflow #209 was automatically triggered by the source push: run ID `41281944052`, source commit `7dc18bd497684eb7eef75a98e7b5d17f9f74b31d`, URL https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41281944052. At this checklist update the run is **in_progress**; final build outcome and artifact not yet available.
- Do not distribute Build #208 or any older APK as the result for this change. Download, extract, inspect, and provide only the artifact from this exact run after success. Record run conclusion, steps, artifact ID / ZIP integrity, extracted APK path, size and SHA-256 in a follow-up entry.

### Protected scope
- No changes to Editor, Signal Chain, Preset Manager, Import/Export implementation, USB-MIDI/native Android connection, NAM, IR User/Third Party, IR Collection, MIDI mappings, Save-to-device, Copy Scene, CTRL/EXP, Studio, Device page logic, startup, global JS or CSS.
- No physical Android install / MG-30 hardware test is claimed.

## Build #209 — Multi-effects processor icon APK (1 November 2026)

- User requested the Device navigation icon be changed from USB to a recognizable guitar multi-FX processor icon, then explicitly asked for immediate build and direct APK delivery in chat.
- Exact source commit: `7dc18bd497684eb7eef75a98e7b5d17f9f74b31d` (only the SVG inside `button[data-page="device"]` in `www/index.html` changed).
- GitHub Actions run **#209**, run ID `41281944052`, URL https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41281944052; branch `feature/preset-manager-redesign`; source SHA matches the commit above; workflow conclusion **success**.
- Job `Build debug APK`: dependency installation passed; protocol regression tests passed; Capacitor Android generation + USB audio plugin installation passed; Gradle debug APK build passed; artifact upload passed.
- Artifact ID `13073289470`, artifact name `MG30-Studio-debug-APK`, ZIP size `4,025,041` bytes, SHA-256 `8d8f08b96f675db411434392cf28af9296850983a0cb96a48b78582d3aaa8eb3` (matches downloaded ZIP digest).
- Downloaded ZIP: `/mnt/data/MG30-Studio-Build-209.zip`. `unzip -t` reports no compressed-data errors.
- Extracted APK: `/mnt/data/MG30_Studio_Build_209.apk`, size **4,402,848 bytes**, SHA-256 `b20d2d54dfa616502e888564bd06e13db7951878b8ca9ce62773071297b13651`.
- APK integrity: `unzip -t` reports no errors. `file` identifies an Android package with Gradle app metadata and APK Signing Block. APK inspected internally (454 archive entries): `assets/public/index.html` exists; exact new multi-FX SVG is present; exactly one Device tab button and one Device label are present.
- `apksigner` is unavailable in this environment; cryptographic signing verification was **NOT RUN**, and no such claim is made.
- Pre-build UI simulation of the exact source commit passed at 320×740, 360×800, 393×873 and 432×915 using Chromium/Playwright; five tabs and Device label retained, 23×23px icon, 8 SVG shapes, correct active lime color, no horizontal overflow, nav bottom alignment correct.
- Browser simulation and GitHub Actions are separate evidence. No physical Android installation or MG-30 / USB-MIDI hardware test is claimed.
- This build supersedes Build #208 for the current Device icon. APK is ready for direct installation by the user.

## New isolated visual-polish branch created — Dark Performance 2.0 (1 November 2026)

- User approved the visual direction: retain the existing screenshots' dark graphite / charcoal panels, lime accent, outline icons and MG-30 Studio identity; refine toward a more premium, tidy, consistent interface rather than redesigning it.
- Created new branch: `feature/dark-performance-ui-polish`.
- Starting point is the latest preserved `feature/preset-manager-redesign` HEAD: `cd9fcf2daf09a143edcb895b8d11275d8f1aaaf3` (contains Build #209 checkpoint and the current multi-effects Device icon baseline).
- The prior `feature/preset-manager-redesign` branch is not modified by this new branch creation and remains the protected reference branch.
- Added plan: `docs/research/DARK_PERFORMANCE_UI_POLISH_PLAN_2026-11-01.md`, documentation commit `5d7834fe1f6bfbf985875015c662db9e6fd26dbd`.
- Planned visual-only candidates: Editor, NAM & IR, Collection IR, Preset Manager, Studio and Device. First target still needs review; no UI edit has been authorized or made yet.
- Hard preservation scope recorded in the new plan: no Editor rendering/startup or USB-MIDI/native connection changes; no NAM/IR/Collection transfers; no Preset Import/Export behavior; no MIDI/SysEx mappings; no Movable Signal Chain; no Save/Copy Scene/CTRL-EXP; no Studio/Device backend or capture behavior; avoid global CSS/shared JS. Ask before any edit that cannot be proven presentational.
- Build #209 / source application baseline is preserved. `www/index.html` carries the multi-effects Device icon; `www/ui-redesign.css` inherited unchanged. No app source changed during branch setup.
- Branch creation and documentation only; no browser test, npm test, CI, Actions, Gradle or APK run required. No build was triggered.
- Current stop point: inspect screenshots and source on this branch, propose the first smallest visual-only change, and wait for authorization before editing code.

## UI polish 01 — Editor Scene button typography (1 November 2026)

### User-approved scope and rationale
- First isolated Dark Performance 2.0 refinement, beginning with Editor as agreed by the user.
- Slightly increased the readability of Scene 1–3 labels and their Clean / Rhythm / Lead descriptions. Previous page-scoped values were 10px / 8px; new values are 11px / 9px.
- The visual adjustment deliberately preserves the existing three-column grid, 49/52px min-height rules, padding, colors, active scene highlight and all card layout.

### Exact source change
- Changed file: `www/ui-redesign.css` only.
- Scoped selectors only: `#page-editor .main-editor-card .scene-button strong` and `#page-editor .main-editor-card .scene-button small`.
- Exact change: title `font-size:10px → 11px`; description `font-size:8px → 9px`. No other declaration changed.
- Source commit: `54ae2c69dbe59d011457ecd8a8dfd80c49a29dba` — `Improve Editor scene label readability`.
- New CSS blob SHA: `fbdb3be89b8db4a07e07a4756c1f7f3f7c23891a`.
- Git compare from pre-change branch HEAD `7f5f8c5429e9b9d30fadc01f2821c2e4bcd93f04` reports exactly one file: `www/ui-redesign.css`, 2 additions / 2 deletions.

### Protected scope verification
- `www/index.html` unchanged blob SHA `20f40485c77251ebe79964100fcd5b10c37550fe`.
- `www/main.js` unchanged SHA `e2697b26e1d673be2002b8f1a085f12e9618b1de`.
- `www/mg30-preset-import.js` unchanged SHA `e2490e6df3f5f32853743fc5eb29c99cc4026ea8`.
- `www/mg30-preset-export.js` unchanged SHA `7959dea88d42f9433a9ddc06ed7198449e25ba52`.
- Because the compare shows only this CSS file changed, no Editor rendering, scene click handler / hardware scene switching, Copy Scene behavior, Signal Chain/drag-drop, USB-MIDI/native bridge, NAM/IR/Collection transfer, Preset Import/Export, MIDI/SysEx mapping, Save-to-device, CTRL/EXP, Studio, Device behavior, or startup code was modified.

### Test / simulation — exact source commit
- Source tested: `54ae2c69dbe59d011457ecd8a8dfd80c49a29dba`.
- Static source assertion: exactly one scoped Scene heading rule at 11px and one description rule at 9px; the existing three-column layout and min-height declarations remain. PASS.
- Test fixture used the exact Scene button structure returned by the existing `renderSceneButtons()` renderer: button `.scene-button` + `strong` + `small`, labels Scene 1/2/3, descriptions Clean/Rhythm/Lead, and exactly one active state. No event or renderer code was changed.
- Chromium / Playwright simulation with `page.set_content()`, extracted exact scoped final CSS declarations and relevant existing Scene card styles from `www/ui-redesign.css`. Tested 320×740, 360×800, 393×873 and 432×915.
- All four sizes: heading computed to 11px, description 9px, all 3 cards in one row, text fits within each card, one active Scene remains highlighted, no horizontal overflow. Card widths: 86px / 99.3px / 110.3px / 123.3px respectively; card heights: 49px on 320/360 and 52px on 393/432. PASS.
- Visual screenshot from the 393px test fixture: `/mnt/data/scene-ui-393.png`. This is an isolated component/browser simulation, not a full Android package test or physical-device test.

### Failed test attempt and correction (preserved)
- First browser harness attempt called `page.goto(file://...)`; Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR`. This is an environment restriction on local-file navigation, not an application failure.
- Corrected the harness to call Playwright `page.set_content()` with the same fixture contents and reran the simulation. All four viewport runs passed. No source correction was required after the original CSS change.
- An additional final rerun asserted that each label and description fits its own card; all four sizes passed.

### Not run / limits
- `npm test` was not run because this is a strictly presentational CSS-only change; no protocol, handler, serialization or device logic changed.
- GitHub Actions / CI / Gradle / APK build not run yet. Build gate remains: ask **“Build sekarang atau nanti?”** and do not build until the user answers.
- No physical Android / MG-30 test is claimed.

### Next step / stop point
- UI polish 01 source, test result and this record are committed; no additional source edit is queued.
- Ask exactly **“Build sekarang atau nanti?”** before the next stage. The next visual candidate is to review the Editor Signal Chain card hierarchy, but do not begin another code edit until the user gives the next instruction.

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


## APK Build #214 — corrected Collection layout / WebView fallback (1 November 2026)

- User explicitly approved **Build sekarang** for the latest corrected source on `feature/dark-performance-ui-polish`.
- Exact latest application source tested in the preceding browser fixture: `41f7d620d021e280a8321fe2162f5ea4032d13a9`. Source files: `www/ir-transfer.js` blob `00f15461f1d9baed6f053212c76c06a7bf585048`; `www/ui-redesign.css` blob `556bffb55e0755d5f4c95ecaf574c957f306080d`.
- One-off workflow trigger commit: `aa920f3682907bd0147fce27e1265c062c599a38`. Compare from the application source checkpoint shows no additional application-code changes; the trigger adds the temporary branch filter plus the source/test record in project notes.
- GitHub Actions **Build #214**, run ID `41299957248`, branch `feature/dark-performance-ui-polish`, conclusion **success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41299957248
- All steps passed: dependency install; protocol regression tests (`npm test`); Capacitor Android generation + USB audio plugin; Gradle `assembleDebug`; APK artifact upload.
- Artifact: `MG30-Studio-debug-APK`, ID `13080459335`, ZIP size `4,029,191` bytes, SHA-256 `d7ce9f191eb4269df07ea294cdce48b1b9331e5cdf69d095d69536cbb166c7a6`. Expires 2026-11-15 11:02:25 UTC.
- Downloaded ZIP: `/mnt/data/MG30-Studio-dark-performance-Build-214.zip`; `unzip -t` passed with no compressed-data errors.
- Extracted APK: `/mnt/data/MG30_Studio_Dark_Performance_Build_214.apk`, size `4,406,196` bytes, SHA-256 `7db3d6da6faa6f57e3f94fd1507fe666d038c1c96e37c84dcf40c31051774250`. APK archive integrity passed; `file` recognized an Android package with Gradle app metadata and APK Signing Block.
- Packaged-asset checks passed: `irManagerCollectionGrid`, NAM/TONE3000 workspace controls, `ir-collection-layout-fallback`, Native NAM Profile heading, NAM file chooser panel, and TONE3000 panel are present in the APK.
- Manual build gate was restored immediately after triggering. Latest workflow file blob is back to `15484977fbfda4c1beea5a1132e30edd669bc0d2`; push branch filter does **not** include `feature/dark-performance-ui-polish`; `workflow_dispatch` remains. Restoration commit: `c3380ef98c6d862d3a3d8c164ff28aae6be4879c`.
- Build #214 is the latest APK for the corrected Collection layout; Build #213 is obsolete and must not be substituted.
- Validation boundary: browser fixture, protocol regression tests, Gradle build, ZIP/APK integrity and packaged-asset checks passed. No physical Android/WebView runtime test or MG-30 hardware test is claimed. User must install Build #214 and confirm the Collection card and 24 slots appear and scroll correctly, and that NAM/TONE3000 panels remain accessible.


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


## English UI + IR Collection naming (1 November 2026)

- User approved a consistent English-language interface and requested the small “Collection IR” subheading be removed, with the main page heading changed to “IR Collection”.
- Source commit: `4976fc7a2b847c8b93d5ea143b1f0febc8c4ab65` on `feature/dark-performance-ui-polish`.
- Source changes in this checkpoint:
  - `www/index.html`: main IR page heading changed from “Impulse Response” to “IR Collection”; loads `english-ui.js` before the application modules.
  - `www/ir-transfer.js`: removes the redundant “Collection IR” card title; Collection status and sync action remain.
  - `www/english-ui.js`: new English UI translation layer for static and dynamically rendered UI text, including attributes and runtime status/error messages. User/device-defined preset names, model names, IR slot names, recordings and other identified data fields are protected from translation.
- The translator observes DOM additions and text/attribute changes so late-rendered screens and transfer messages are translated too.
- No intentional changes to NAM import/transfer, Collection/User routing, IR packet generation, SysEx/ACK flow, preset data, USB-MIDI, or MIDI mappings.
- Validation boundary: source files and branch refs were fetched and checked for the new heading, removal of the redundant card title, and translator load order. A JavaScript syntax check, protocol regression test, APK build, physical Android WebView test and MG-30 hardware test have NOT yet been run for this checkpoint.
- Next step: validate the translation layer for syntax and runtime behaviour, refine any remaining Indonesian UI strings, then update the project notes. Do not start an APK build until the user explicitly asks for it.


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


## Conversation resume / verified current state (1 November 2026)

- The conversation resumed after an interruption. Current branch HEAD: `8cc12751216cb098e4833a822315f12843b4c2e6`.
- English UI validation run #218 (run ID `41305767689`) is confirmed completed successfully: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41305767689
  - Job `Validate English UI and protocol tests (no APK)`: all steps successful, including English UI JavaScript syntax check, protocol regression tests, and Vite web asset build.
  - Test result recorded in run checkpoint: 9 passed, 0 failed; Vite transformed 31 modules.
  - This did not generate an Android project or APK.
- Verified that the exact source blobs tested by run #218 are still the current branch blobs for `www/index.html`, `www/english-ui.js`, `www/ir-transfer.js`, `www/nam-transfer.js`, `www/main.js`, `www/tone3000.js`, and `www/native-midi.js`.
- UI heading is `IR Collection`; redundant `Collection IR` card title is absent; `english-ui.js` loads before the main app module.
- English translator has 765 exact phrase entries and 97 phrase-fragment rules at the checked source revision. It protects user/device-defined names and uses translated native confirm/prompt/alert messages.
- Protocol safety: IR transfer source, NAM transfer source, USB-MIDI source and MIDI mappings were not changed in this language pass. Do not alter them as part of UI language polish without explicit user approval.
- Workflow remains manual-only for APK builds: `workflow_dispatch` is present; the feature branch is absent from automatic push filters. No APK was built in run #218. Wait for explicit user instruction before building an APK.
- Remaining validation: install the eventual APK on Android, inspect the full English UI in WebView, and test MG-30 connection/IR/NAM workflows on physical hardware. These have not yet been claimed as tested.


## Android APK Build #219 — English UI (1 November 2026)

- User explicitly requested: “Buat sekarang” for the English-language UI revision.
- Application source built: branch checkpoint `7815614612242a74341808357b72b27df8cebfe8`. Trigger commit `2a1df648a4f3310ff9182a4eab2b1fdedf05e407` changed only the workflow push filter to initiate this one-off build. App source blobs match the previously validated English UI checkpoint.
- GitHub Actions **Build #219**, run ID `41307338405`, completed **success**: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41307338405
- All workflow steps succeeded: checkout, Node.js 22, Java 21, dependency install, protocol regression tests, Capacitor Android project generation + USB audio plugin, Gradle `assembleDebug`, APK artifact upload.
- Artifact `MG30-Studio-debug-APK`, ID `13083991458`, ZIP size 4,056,664 bytes, ZIP SHA-256 `22ac940f93540706bb1010a5e644dc3fac0a68fa6516a83565165dea637886a7`; artifact expiry 15 November 2026 12:38:48 UTC.
- Downloaded ZIP: `/mnt/data/MG30-Studio-English-UI-Build-219.zip`; `unzip -t` passed. Extracted APK: `/mnt/data/MG30_Studio_English_UI_Build_219.apk`, size 4,434,640 bytes, SHA-256 `b0e67ec05b70191912d0989c849db47d6afb0d58260145befe4fe279db9b9b2c`; `file` identifies it as an Android package with Gradle metadata and APK Signing Block; APK `unzip -t` passed. `apksigner` was not installed, so cryptographic signature verification was not performed.
- Package checks passed:
  - Includes AndroidManifest.xml, classes.dex, `assets/public/index.html`, bundled Vite JS and CSS.
  - Bundled JS includes `IR Collection`, `MG30EnglishUI`, `Use in User`, `Third Party / User`, `No device data`, `Connect the MG-30`, and `Import WAV` English UI strings.
  - The Indonesian strings found in static scanning occur as translation dictionary keys/source phrases, not as unprocessed visible labels; source validation #218 recorded zero remaining Indonesian static UI text and English checks.
  - User/device-defined names remain protected from translation.
- Workflow trigger restored after one-off build. Restore commit: `7ea441b73298571ae3e39e832d0b2d843934dfff`; workflow blob `15484977fbfda4c1beea5a1132e30edd669bc0d2`; `workflow_dispatch` remains enabled and `feature/dark-performance-ui-polish` is absent from automatic push filters.
- Current APK for English UI is Build #219. Previous Build #216 is superseded for this language change.
- Validation boundary: successful workflow and package/archive checks only. APK has not yet been installed on the user's physical Android device. No physical MG-30 USB-MIDI, IR Collection, Third Party/User transfer, or NAM transfer testing has been claimed.


## English UI follow-up — preset fallback and Device firmware warning (1 November 2026)

- User supplied screenshots from English UI Build #219 and pointed out remaining Indonesian strings in the preset header and Device warning.
- Source commit: `fed9023cf1c6fa69387cd5944ae514269998b6cc`; modified file: `www/index.html` only.
- Corrections:
  - Disconnected preset placeholder: `Connect to read preset`.
  - Connected but unread preset fallback: `Preset name not read yet`.
  - NAM slot reader disclosure labels from CSS pseudo content: `Show` / `Hide` (replacing Indonesian `Tampilkan` / `Sembunyikan`).
  - Device warning now reads fully in English:
    “Android Chrome does not always expose Web MIDI/USB-MIDI in the way this app requires. Testing on this page does not guarantee compatibility with the NUX MG-30 (original Gen 2). The protocol reference targets the latest original Gen 2 firmware (6.0.x), not the MKII. It is based on reverse engineering and is not official documentation.”
  - Removed outdated firmware reference `5.0.2`; the project target is original MG-30 Gen 2 firmware 6.0.x, not MKII.
- Source assertions passed for Show/Hide, both preset fallback strings, the complete Important warning, 6.0.x, no 5.0.2, and explicit not-MKII wording.
- User explicitly requested immediate APK build after this correction; proceed to Build #220.
- No intended changes to NAM/IR transfer protocol, Collection/User routing, USB-MIDI, preset data, or MIDI mappings.
- Physical Android WebView and MG-30 hardware validation remain pending until the user installs/tests the APK.


## Android APK Build #220 — final English UI corrections + Gen 2 firmware reference (1 November 2026)

- User sent screenshots of Build #219 and requested that remaining Indonesian labels be translated, the Device “Important” message be in English, the protocol firmware reference be updated to the latest original Gen 2 firmware, and an immediate APK build.
- Source commit: `fed9023cf1c6fa69387cd5944ae514269998b6cc`; changed file: `www/index.html`.
- UI corrections:
  - Preset header disconnected fallback: `Connect to read preset`.
  - Connected/no-readback fallback: `Preset name not read yet`.
  - NAM slot disclosure pseudo-elements: `Show` / `Hide`.
  - Important warning translated to English and firmware version reference corrected to latest original MG-30 Gen 2 firmware `6.0.x`, explicitly excluding MKII and clearly noting reverse-engineered / unofficial protocol status.
  - Removed outdated `5.0.2` firmware wording.
- Source assertions and package checks passed for all above strings; old Indonesian `Tampilkan` / `Sembunyikan` and old firmware `5.0.2` strings are absent from the corresponding packaged UI.
- GitHub Actions **Build #220**, run ID `41308495904`: completed **success**. URL: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41308495904
  - All workflow steps succeeded: checkout, Node/Java setup, dependency install, `npm test`, Capacitor Android generation + USB audio plugin, Gradle `assembleDebug`, artifact upload.
- APK artifact ID `13084143256`, size 4,056,744 bytes; ZIP SHA-256 `0d17c7e0ed2e062c49fbf574ae67465e0500fc1c70e7dd67b17b7c32d5784385`; expiry 15 November 2026 12:53:39 UTC.
- Downloaded ZIP: `/mnt/data/MG30-Studio-English-Gen2-6.0x-Build-220.zip`; ZIP integrity passed.
- Extracted APK: `/mnt/data/MG30_Studio_English_Gen2_6.0x_Build_220.apk`; 4,434,700 bytes; SHA-256 `8527c47a7970d2f182a6912f1840b01a93dd2467bf9a6e3d5ff2efbb473d462b`; APK archive integrity passed and `file` recognizes it as Android APK with Gradle metadata and APK Signing Block. Cryptographic signature verification with apksigner was not performed.
- Packaged checks passed: AndroidManifest + DEX present; Important warning in English; text says latest original Gen 2 firmware 6.0.x and “not the MKII”; old firmware 5.0.2 absent; preset initial/dynamic fallbacks English; Show/Hide English and Indonesian labels absent; translator JS bundled; IR Collection and Native NAM Profile retained.
- Manual-only build gate restored after one-off trigger. Restore commit: `f8258defad55e422fb9245028b6c38625e0b7f00`; workflow blob `15484977fbfda4c1beea5a1132e30edd669bc0d2`; `workflow_dispatch` enabled; feature branch absent from automatic push filters.
- No changes to IR/NAM protocol code, Collection/User routing, USB-MIDI handling, TONE3000 transfer logic, preset data, or MIDI mapping. Physical Android WebView and MG-30 hardware testing still remain with the user after install.


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


## TONE3000 mobile expanded catalogue — preserve target controls (1 November 2026)

### Screenshot diagnosis and intended correction
- The user supplied two screenshots from Build #221. The collapsed TONE3000 workspace shows the target-slot selector, Choose a Tone / Refresh Models actions, current status, and saved-tone summary in sequence.
- When the model catalogue is expanded on mobile, the fixed #t3kModelList overlay began at top: max(190px, calc(env(safe-area-inset-top, 0px) + 180px)). In the supplied screenshot this placed the catalogue over the MG-30 Target Slot control and the nearby TONE3000 action/status area.
- Keep the catalogue as a fixed, independently scrollable mobile overlay so the IR Collection grid does not resize, but move its top edge below the complete TONE3000 control cluster. The target slot and Choose/Refresh/status must remain visible while choosing a model.

### Source change and correction history
1. Initial position attempt:
   - Commit: 69c9a9c057192551f939f7fd9b94886cdea81038.
   - Changed only the mobile catalogue top offset from 190/180px to 214/204px.
   - First layout check showed this cleared the target dropdown but still overlapped the Choose/Refresh buttons and status. This intermediate was not accepted as complete.
2. Final correction:
   - Commit: d16dd03e55ce5701409757232fae58cc6546319c.
   - Changed the same single declaration to top: max(270px, calc(env(safe-area-inset-top, 0px) + 260px)).
   - The final position starts below the target row, action row and status row. The existing fixed left/right bounds, bottom safe-area offset, z-index, background, card list and scroll behaviour are unchanged.
- Final changed application file: www/ui-redesign.css only. The declaration remains inside @media(max-width:720px) and selector .t3k-catalogue.is-expanded #t3kModelList.
- Git compare from pre-change HEAD a12ed9a8bc5690cd58ac56bd447d7c50cff96935 to final source commit d16dd03e55ce5701409757232fae58cc6546319c confirms exactly one application file changed, one insertion / one deletion. The net source change is one CSS value line.
- Final CSS blob SHA: 0c87ffefbc31ab63039708261e40cf0af33ef7c4.

### Targeted static and browser validation — exact final source
- Exact source commit tested: d16dd03e55ce5701409757232fae58cc6546319c.
- Static checks: final top declaration occurs exactly once; old 190/180px declaration is absent; fixed position, 12px side inset, safe-area bottom 76px, mobile media scope, and hidden-state rule are retained. PASS.
- Chromium + Playwright page.set_content simulation used a representative NAM/TONE3000 panel, target row, action row, status strip, saved-tone summary, expanded overlay header and two model cards. It checked actual computed bounding rectangles, fixed positioning, scroll overflow and bottom-navigation clearance.
- Mobile viewports all passed:
  - 320×640: target bottom 208px; action bottom 241px; status bottom 264px; overlay top 270px; overlay bottom 564px; bottom navigation top 586px. List content 378px / viewport 292px; internal scrolling remains available.
  - 360×740: target/action/status all clear of overlay; overlay bottom 664px; navigation top 686px.
  - 393×873: target/action/status all clear; overlay bottom 797px; navigation top 819px.
  - 432×915: target/action/status all clear; overlay bottom 839px; navigation top 861px.
- Desktop 768×1024: mobile fixed-overlay rule does not apply; existing normal inline catalogue positioning remains. PASS.
- Final result: controls remain above the expanded list, list is scrollable on constrained mobile heights, and list stays above the fixed bottom navigation. PASS.

### Failed test attempts and corrections (preserved)
- Initial Chromium CLI --dump-dom attempt timed out in the container; switched to Playwright.
- Playwright navigation to local file:// was blocked by the environment (ERR_BLOCKED_BY_ADMINISTRATOR); switched to page.set_content with the local HTML fixture.
- First fixture run failed because the fixture counted the app-header offset twice and omitted the .t3k-model-list class. Corrected the fixture coordinates to the screenshot's viewport positions and restored the real list class; reran all five viewports successfully. This was a test-fixture correction, not an application-source defect.

### Protected files / areas verified unchanged
- www/tone3000.js SHA 13632a59bb4d5b66f41df13e2972a15a4ec0b029.
- www/nam-transfer.js SHA e854d2a7a122272b8971a3023f4e1d5e81b48cc4.
- www/ir-transfer.js SHA 9f156dade93385d8b4b2c6fc338c1a1ac085a610.
- www/main.js SHA e2697b26e1d673be2002b8f1a085f12e9618b1de.
- www/native-midi.js SHA a912c6e7379e193877122c9010b38bdbc0daae64.
- No changes to NAM download/import, A2-Lite transfer plan/sender, IR User/Third Party or Collection transfer, USB-MIDI/native Android connection, MIDI mappings, preset Import/Export, Editor/startup, Studio/Device behaviour, model catalogue persistence, or TONE3000 API/authentication logic.

### Initial stop state before the approved build (superseded)
- At the end of the screenshot/layout-only pass, npm test, Android/Gradle packaging and APK generation had not yet been run. The next section records the user's subsequent approval and the completed build.

## Follow-on Android APK build — Build #223 (1 November 2026)

### Why the workflow was adjusted
- User reported that the phone still had Build #221 installed and explicitly requested a new APK with the TONE3000 mobile catalogue correction.
- The workflow had `workflow_dispatch`, but the active branch `feature/dark-performance-ui-polish` was missing from `push.branches`. The connected GitHub interface has repository file-write and run-read/download actions but no workflow-dispatch action.
- Added `feature/dark-performance-ui-polish` to the push branch filter. The workflow file is already included in the existing `paths` filter, so this commit safely triggered a normal push build without changing application behaviour.
- Workflow commit to enable the branch: `f5d14c087855d651d512b0c7faed6b86ec331c21`.
- Restored the explicit original Node.js 22 setup in a follow-up workflow commit: `221114f161cd705185789a085c13cd99ed432d7c`. Build #223 below is the authoritative result using that corrected workflow configuration. Build #222 was a transitional run before the Node 22 declaration was restored and is not the delivery APK.

### Build #223 result
- Workflow run: [Build #223](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41324976598).
- Run ID: `41324976598`; conclusion: `success`.
- Branch: `feature/dark-performance-ui-polish`.
- Source/workflow commit: `221114f161cd705185789a085c13cd99ed432d7c`.
- Completed successfully: checkout, Node.js 22 setup, Java setup, npm dependency installation, `npm test` protocol regression tests, Capacitor Android project generation / USB audio plugin installation, Gradle `assembleDebug`, and artifact upload.
- Artifact ID: `13091250306`; artifact: `MG30-Studio-debug-APK`; uploaded as `MG30-Studio-build-223.zip`.
- Artifact ZIP SHA-256: `cf49bf11022324598984a89dc6c97bb5f75d1963d2289f4f46e597224e59c71f`.
- Extracted APK: `MG30-Studio-223-debug.apk`; size: 4,436,632 bytes; SHA-256: `1da54d82d01f2b874d7984b7ccabee85d8f2809067ba07e9ac5c69b29c8b2ceb`.
- ZIP integrity check passed and the APK entry was extracted successfully.
- Verified the packaged CSS asset `assets/public/assets/index-B_ynwlAO.css` contains the final mobile catalogue offset `max(270px, calc(env(safe-area-inset-top, 0px) + 260px))`. This confirms the screenshot correction is included in the delivered APK, not only in the source tree.

### Protected files re-verified at Build #223 source commit
- `www/tone3000.js`: `13632a59bb4d5b66f41df13e2972a15a4ec0b029`.
- `www/nam-transfer.js`: `e854d2a7a122272b8971a3023f4e1d5e81b48cc4`.
- `www/ir-transfer.js`: `9f156dade93385d8b4b2c6fc338c1a1ac085a610`.
- `www/main.js`: `e2697b26e1d673be2002b8f1a085f12e9618b1de`.
- `www/native-midi.js`: `a912c6e7379e193877122c9010b38bdbc0daae64`.
- These hashes match the previously protected values. No NAM, IR transfer, MIDI mapping, native USB-MIDI, preset import/export, Editor/startup, or device-control logic was changed for this UI correction/build-enablement work.

### Remaining device validation
- Build #223 is a successful debug APK and the CSS bundle was checked. No physical Android installation/WebView screenshot, real app-restart persistence check, or live MG-30 hardware test has been performed in this session.
- Install Build #223 on the phone and verify the expanded TONE3000 catalogue keeps the target-slot dropdown, Choose/Refresh buttons and status visible. Continue to protect working NAM and IR/MIDI paths during subsequent protocol work.
- The workflow now automatically runs on this branch when the existing watched paths (including `.github/workflows/build-apk.yml`) change; `workflow_dispatch` remains available.


### Install compatibility warning — debug signing identity differs from Build #221
- Compared the APK signing certificates extracted from the v2 APK Signing Block, not just the filenames or archive metadata.
- Build #221 certificate SHA-256: `6237669d1b68b5aec0ad557f0753a254e2f5db04997ea08644a7eddabd37e151`.
- Build #223 certificate SHA-256: `bc0908b8ae405d55a0e3524b99507a0a741651cac7abcadd3548d86b1c63e8d3`.
- The certificates are different. Both APKs identify as Android Debug certificates, but Android will reject installing #223 as an in-place update over #221 because the signing identity does not match.
- `scripts/init-android.mjs` creates/syncs the Android project and copies native plugins; it does not copy or configure a persistent signing keystore. The workflow uses Gradle `assembleDebug` on a fresh `ubuntu-latest` runner, which generates a runner-local debug key. The #221 private key was not present in the APK artifact and is not available from the current repository state, so #223 cannot be re-signed as #221 using the available material.
- Do not tell the user to uninstall #221 without warning: uninstalling may delete local application data. User should back up/export any important app data first. Safer immediate testing options are a separate Android device or a future preview build using a distinct application ID. A future stable update channel requires a persistent signing key to be managed securely; that will still not retroactively match #221 unless its original private key is recovered.


## Follow-on visual refinement — Build #224 (1 November 2026)

User reviewed the #223 mobile screenshot and requested two refinements: (1) integrate the TONE3000 Available Models / Hide toolbar into the catalogue panel rather than rendering it as a detached card; (2) reduce the visual size/height of the NAM profile tool area.

- CSS-only source commit: `5cd89bd6abf1f16ed97886087cc7cb5d49daec92` on `feature/dark-performance-ui-polish`.
- `www/ui-redesign.css` changes: toolbar now has no independent border or rounded card; it uses the catalogue background and a subtle bottom divider. Mobile NAM title is smaller; the NAM/TONE3000 tool frame padding is reduced and the visible tool pane max height is reduced from 190px/29dvh to 150px/23dvh.
- Existing mobile catalogue placement correction (top offset 270px / safe-area + 260px) is preserved.
- Protected source hashes unchanged: `www/tone3000.js` `13632a59bb4d5b66f41df13e2972a15a4ec0b029`; `www/nam-transfer.js` `e854d2a7a122272b8971a3023f4e1d5e81b48cc4`; `www/ir-transfer.js` `9f156dade93385d8b4b2c6fc338c1a1ac085a610`; `www/main.js` `e2697b26e1d673be2002b8f1a085f12e9618b1de`; `www/native-midi.js` `a912c6e7379e193877122c9010b38bdbc0daae64`.
- Build workflow [#224](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41335417957), run ID `41335417957`, completed with conclusion `success` from the CSS source commit above. Node 22 setup, npm install, `npm test`, Capacitor Android project generation, Gradle `assembleDebug`, and artifact upload all passed.
- Artifact ID `13095222551`; ZIP SHA-256 `bcab00a8f9d8ffb382aebcd3c7d8e1c5ab289cdbb2746a4847dcc3835d9f6f8f`.
- Extracted APK: `MG30-Studio-224-debug.apk`, 4,436,620 bytes; SHA-256 `9babd91ae700c22f3b9694eab004b2d9de392c38d359e6789902f8599f58435d`.
- ZIP integrity passed. Packaged CSS asset `assets/public/assets/index-Bhps5bY3.css` was checked and contains all four expected rules: integrated catalogue header, compact NAM title, compact tool-pane height, and the prior mobile catalogue top offset.
- No physical Android/WebView or MG-30 hardware validation has yet been performed. Signing-key continuity with the user's installed #221 must not be assumed; prior #223 was already found to have a different debug certificate from #221. Avoid telling the user to uninstall without warning about local app data.


## Screenshot-driven catalogue panel correction — Build #226 candidate (2 November 2026)

User supplied a fresh screenshot from Build #224 and reported that the Available Models / Hide header and profile panel still looked untidy. Root cause in the prior CSS: only `#t3kModelList` was fixed-positioned; its parent `#t3kToneDetails.t3k-catalogue` remained in normal flow, leaving the original catalogue outline/edge behind the overlay. The sticky toolbar also inherited a reduced content width from `scrollbar-gutter: stable`.

### Source correction
- Latest CSS commit: `7b5750fde71216d8e16ddb6872465d87615c224f` on `feature/dark-performance-ui-polish`.
- Only application file changed: `www/ui-redesign.css` (blob `2aef33e3e0c070c1fad0477c206d3c18c10d0f91`).
- On mobile, the complete `.t3k-catalogue.is-expanded` wrapper is now the fixed overlay panel, with one border, rounded corners, background and shadow. The collapsed Saved Tone trigger is hidden only while expanded.
- `#t3kModelList` is now the inner scroll container within that outer panel, not a second fixed card. The Available Models / Hide toolbar remains sticky and is styled as the integrated top strip with a single bottom divider.
- Removed reserved scrollbar gutter from the inner list and set thin scrollbar styling so the toolbar spans the full panel width.
- Preserved the mobile overlay top offset at `max(270px, calc(env(safe-area-inset-top, 0px) + 260px))` and bottom clearance above fixed navigation.
- Compact profile adjustment: visible NAM/TONE3000 pane max-height reduced to `min(128px, 18dvh)`; overflow remains scrollable so controls are not deleted or hidden from the DOM.

### Browser layout fixture validation
- Chromium + Playwright HTML fixture validated at 393×873, 360×740, 320×640 and 432×915.
- On all four viewports: the catalogue parent is `position: fixed`, root bounds start at 270px and end 76px above viewport bottom, list remains internally scrollable, the overlay ends above bottom navigation, and toolbar right edge matches the panel inner right edge (0px gap).
- At 393×873: outer panel x=12, y=270, width=369, height=527, bottom=797; nav top=809; toolbar width=367 matching inner list width exactly.
- This is a focused layout fixture test, not a physical Android WebView test. The fixture mimics the relevant DOM/ancestor overflow structure; it is not a full live-app screenshot.

### Protected behavior files rechecked at latest branch source
- `www/tone3000.js`: `13632a59bb4d5b66f41df13e2972a15a4ec0b029`.
- `www/nam-transfer.js`: `e854d2a7a122272b8971a3023f4e1d5e81b48cc4`.
- `www/ir-transfer.js`: `9f156dade93385d8b4b2c6fc338c1a1ac085a610`.
- `www/main.js`: `e2697b26e1d673be2002b8f1a085f12e9618b1de`.
- `www/native-midi.js`: `a912c6e7379e193877122c9010b38bdbc0daae64`.
- No edits to NAM/IR transfer protocols, User/Collection mappings, MIDI mapping, preset I/O, or device-control paths.

### APK build status at note creation
- Build #226 was triggered automatically from commit `7b5750fde71216d8e16ddb6872465d87615c224f`; run ID `41338505989`.
- At the time of this note: dependency setup, `npm test`, and Capacitor Android project generation had passed; Gradle `assembleDebug` was still running. Final success/failure and APK hash must be appended after the run completes.


### Final result for the unified catalogue correction — Build #226 SUCCESS
- Workflow [Build #226](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41338505989), run ID `41338505989`, completed with conclusion `success` from exact source commit `7b5750fde71216d8e16ddb6872465d87615c224f`.
- Node.js 22 setup, npm install, protocol regression `npm test`, Capacitor Android initialization, Gradle `assembleDebug`, and artifact upload all passed.
- Artifact ID `13095774838`, artifact `MG30-Studio-debug-APK`, archive size 4,059,097 bytes; ZIP SHA-256 `01e0d75ffff678985505a972c5978c6197829847bf0e0938a670260635c43be0`.
- Extracted APK `MG30-Studio-226-debug.apk`: 4,436,820 bytes; SHA-256 `d4484c3690ae5d5182feff67446c927bbccac1fd52bd2da25075402ffa52dbf0`.
- ZIP integrity test passed (`testzip() = None`); APK is a valid ZIP archive (`testzip() = None`).
- Packaged CSS asset `assets/public/assets/index-DMgiSMTr.css` confirmed to contain the unified fixed outer catalogue panel, hidden collapsed trigger while expanded, integrated full-width toolbar divider, no reserved scrollbar gutter, internally scrollable model list, compact 128px/18dvh tool-pane cap, and the original mobile top offset. CSS inspection confirms this is the final #226 source, not #225.
- Protected JS hashes remain unchanged as documented above. No NAM/IR/MIDI transfer logic or mappings were edited.
- Physical installation/screenshot and actual MG-30 hardware tests remain pending. The APK is a new debug build; do not promise in-place update compatibility with #221 because earlier checks established that debug keys from clean workflow runners differed. Back up important app-local data before considering uninstall/reinstall.


### Signing certificate comparison: Build #221 vs #226
- Extracted the first signer certificate from each APK's v2 APK Signing Block and compared SHA-256.
- Build #221 certificate SHA-256: `6237669d1b68b5aec0ad557f0753a254e2f5db04997ea08644a7eddabd37e151`.
- Build #226 certificate SHA-256: `001786d9c33cab0c8e41fbe5e6a0731eaec89bab218024e6413062af50c7f3af`.
- These are different. Android will not accept #226 as an in-place update over #221 using package installation. Do not uninstall #221 until any local application data has been backed up/exported. A persistent signing key is required for a continuous update channel; #221's original private key is not available in the current repository artifacts.


## Dedicated NAM Model Library — approved mockup implemented (Build #231, 2 November 2026)

User approved the separate-column mockup: TONE3000 controls first, a dedicated Downloaded / Available NAM panel with a persistent Show/Hide header second, then IR Collection. The request specifically replaces the previous floating/fixed catalogue overlay because its Hide state left clipped remnants and reduced Collection usability.

### Implementation
- Source commit used for final APK: `00fed3243681047f69fa295992b2f73325c1b96d` on `feature/dark-performance-ui-polish`.
- New file: `www/nam-model-library-ui.js` (content is presentation/controller glue only). It creates `#namModelLibrary` between `.nam-ir-tools-frame` and `#ir-import-content`, moves the existing `#t3kToneDetails` node into it, and provides a dedicated sticky header reading “Downloaded / Available NAM” with live model count/tone name and Show/Hide action.
- The new Show/Hide button delegates to the existing hidden `#t3kCatalogueToggle` click handler. The existing TONE3000 localStorage state, model selection persistence, and download/import handlers remain the source of truth; the module does not reimplement transfer actions.
- `www/index.html` loads the new module immediately after `main.js`, after the existing TONE3000 and IR UI modules have initialized.
- `www/ui-redesign.css` places the page in four ordered rows: page identity, NAM/TONE3000 controls, NAM Model Library, and IR Collection. The library panel is about 58px high when closed and expands to `min(280px, 34dvh)`; the header remains outside the internal model-list scroller. Hiding the library leaves the header and returns the vertical space to Collection.
- The old catalogue root and model list had legacy fixed-overlay CSS. Final commit explicitly resets root position/inset/z-index and list position/inset inside the new library; the previous 270px fixed-overlay positioning can no longer control this moved node. The old duplicate toolbar inside the model list is hidden because the new dedicated header replaces it.
- Existing TONE3000 panel, transfer functions, Collection grid and bottom navigation remain in their current roles.

### Protected behavior source hashes at final build commit
- `www/tone3000.js`: `13632a59bb4d5b66f41df13e2972a15a4ec0b029` (unchanged).
- `www/nam-transfer.js`: `e854d2a7a122272b8971a3023f4e1d5e81b48cc4` (unchanged).
- `www/ir-transfer.js`: `9f156dade93385d8b4b2c6fc338c1a1ac085a610` (unchanged).
- `www/main.js`: `e2697b26e1d673be2002b8f1a085f12e9618b1de` (unchanged).
- `www/native-midi.js`: `a912c6e7379e193877122c9010b38bdbc0daae64` (unchanged).
- No NAM protocol, User/Collection IR mapping, MIDI mapping, preset I/O, signal-chain or device-control changes were made. The only new runtime file is the NAM Model Library presentation controller.

### Build #231 verification
- GitHub Actions: [Build #231](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41343165458), run ID `41343165458`, conclusion `success` from exact commit `00fed3243681047f69fa295992b2f73325c1b96d`.
- Node.js 22 setup, npm install, protocol regression `npm test`, Android project/USB audio plugin generation, Gradle `assembleDebug`, and artifact upload all passed.
- Artifact ID `13098286652`; archive `MG30-Studio-build-231.zip`; archive SHA-256 `8ce55dbc594079f63252e786ada119ff020e5708bad03add21884c0d96f3f8dc`.
- Extracted APK: `MG30-Studio-231-debug.apk`; 4,438,328 bytes; SHA-256 `2d945b65fd4cec50c4a0408575654357d8fda78a308a2f9def3dfb5b0abe1578`.
- ZIP integrity and APK ZIP integrity checks passed. Packaged CSS and JS were inspected: the dedicated library title/controller, 4-row page layout, 280px/34dvh expanded sizing, sticky header panel rules, internal list scroller, and explicit reset of legacy fixed positioning are present in the APK. The header controller delegates to the existing `t3kCatalogueToggle` via its click handler.
- Signing certificate differs from Build #221 (221: `6237669d1b68b5aec0ad557f0753a254e2f5db04997ea08644a7eddabd37e151`; 231: `208d04ece7a0a6e2a56c7c8649cba17adbbe83ec3717a01cb186e65a447baf61`). Android will not install #231 as an in-place update over #221 using the current ephemeral debug signing. Do not uninstall #221 until local app data is backed up/exported.
- No physical Android WebView screenshot or live MG-30 hardware test was performed. User must install #231 in a safe manner and send a phone screenshot for final visual confirmation. Keep all NAM/IR/MIDI paths protected during follow-up adjustments.

### Additional signing check against the screenshot build #226
- Build #226 certificate SHA-256: `001786d9c33cab0c8e41fbe5e6a0731eaec89bab218024e6413062af50c7f3af`.
- Build #231 certificate SHA-256: `208d04ece7a0a6e2a56c7c8649cba17adbbe83ec3717a01cb186e65a447baf61`.
- These also differ, so do not expect #231 to update #226 in place. Back up/export app-local data before any uninstall/reinstall. The debug signing key remains ephemeral per clean GitHub runner.


## Follow-up fix after user screenshot: NAM Model Library not appearing — Build #233 (2 November 2026)

User installed #231 and provided a screenshot showing TONE3000 controls and 8-model status, but no Downloaded / Available NAM panel at all. Investigation of the actual #231 APK bundle confirmed it contained the earlier controller code with `panel.hidden = Boolean(catalogue.hidden)`; this coupled the outer library header to the inner TONE3000 catalogue's hidden state. As the catalogue can begin hidden before it is rendered, the complete panel was hidden even while the TONE3000 controls/status were visible. This is the confirmed reason for the screenshot, not a guess about CSS.

### Fix
- Latest application source commit used for the delivered APK: `a1228db924a77b133c48badcbd2309530f96896e` on `feature/dark-performance-ui-polish`.
- Updated `www/nam-model-library-ui.js`: the outer panel is always visible after its NAM/IR page mount; it no longer inherits `hidden` from `#t3kToneDetails`. If no catalogue is ready, the panel shows the helper text “Pilih tone untuk menampilkan model NAM di sini.” Header Show/Hide remains visible and toggles the existing TONE3000 handler when a catalogue exists; otherwise it toggles the local empty-state view.
- The catalogue node is still moved, not cloned, to preserve existing TONE3000 model state, event handlers, selection and transfer actions. A page-level child-list observer catches late catalogue mount/recreation.
- Updated `www/ui-redesign.css` with a clear empty state; the header-only panel remains compact when closed.
- No edits to TONE3000, NAM transfer, IR transfer, main/native MIDI logic, or User/Collection mappings.

### Verification of delivered APK #233
- Actions [Build #233](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41343795058), run ID `41343795058`, success; source commit `a1228db924a77b133c48badcbd2309530f96896e`.
- Node 22, npm install, `npm test`, Android init, Gradle `assembleDebug` and artifact upload passed.
- Artifact ID `13098780187`; archive `MG30-Studio-build-233.zip`; ZIP SHA-256 `bd5f22ef7256075ff4f9db6781b97947ea74954558007b8a801356837541fb54`.
- Extracted APK `MG30-Studio-233-debug.apk`, 4,438,444 bytes; SHA-256 `623ea83781e6d82df84d8440a76e13dc5a05b4dd573cc802262e5fcbd88edc99`.
- Outer artifact ZIP and APK ZIP integrity checks both passed. Inspected the bundled JS/CSS from inside the APK and confirmed: panel creation sets `hidden=false`; visible fallback meta and empty-state text are included; new model-library styles and empty-state styling are present; library panel size and scroll rules are included. This explicitly differs from the old #231 bundle, which was proven to have the faulty hide-coupling logic.
- Protected file hashes at source remain: `www/tone3000.js` `13632a59bb4d5b66f41df13e2972a15a4ec0b029`; `www/nam-transfer.js` `e854d2a7a122272b8971a3023f4e1d5e81b48cc4`; `www/ir-transfer.js` `9f156dade93385d8b4b2c6fc338c1a1ac085a610`; `www/main.js` `e2697b26e1d673be2002b8f1a085f12e9618b1de`; `www/native-midi.js` `a912c6e7379e193877122c9010b38bdbc0daae64`.
- Physical phone validation is still required. Since previous debug builds used different ephemeral signing certificates, do not assume #233 can update #231 in place. Back up/export local app data before uninstalling the installed APK.


## Critical freeze fix after Build #233 screenshot — source commit pending final APK (2 November 2026)

User reported that after opening Build #233 the whole app was stuck and no controls responded. The screenshot showed the Editor tab; diagnosis focused on application main-thread JS rather than MIDI connectivity.

### Confirmed root cause in the previous NAM library UI controller
- The earlier `www/nam-model-library-ui.js` installed a `MutationObserver` on the entire `#page-nam` subtree and called `syncPanel()` from that observer.
- `syncPanel()` reassigned `headerToggle.textContent` on every invocation, even when the text was unchanged. Replacing the text node is a child-list mutation inside the observed page subtree, so the observer called `syncPanel()` again indefinitely. This created a self-triggering MutationObserver loop and starved the main UI thread, explaining why the app could launch visually but no taps worked.

### Current corrective implementation
- `www/nam-model-library-ui.js` now uses idempotent `setText` and attribute/class/hidden comparisons. It no longer observes the page subtree after mounting.
- It observes only `#namIrTonePane` until the real TONE3000 catalogue appears, disconnects that observer before moving the catalogue node, then observes only the catalogue subtree for title/count/model-list/expanded state updates.
- Outer Library panel never inherits `hidden` from `#t3kToneDetails`; it always has a visible header. Empty-state hint is visible before a tone loads. When catalogue exists, header delegates Show/Hide to the original TONE3000 button, preserving its localStorage and model selection behavior.
- `www/ir-transfer.js` layout observer now explicitly excludes node id `namModelLibrary` from automatic movement into the collapsible NAM import pane. This is strictly a UI mount guard; transfer/protocol functions are unchanged.
- Empty-state visibility corrected to `empty.hidden = ready` (idempotently), so hint is shown only when no catalogue is loaded.

### Dedicated tests added
- New test file: `tests/nam-model-library-ui.test.js`.
- Tests run the UI controller in a Node VM with a DOM/MutationObserver fixture and cover: library header visible before TONE3000 catalogue load; empty-state Show/Hide; actual catalogue node moved into dedicated panel; model count/title update; Show then Hide state delegated to original TONE3000 button; no active observer watches the whole page; and ir-transfer observer excludes the new panel.
- Earlier fixture iterations failed because the fake DOM incorrectly treated detached elements as live document elements, omitted nested title/count nodes, and had a mock innerHTML lookup issue. Those test-fixture defects were corrected. These were test harness failures, not Android app build outputs; no APK was delivered from those runs.
- Latest Actions run at note creation: [Build #241](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41344811704), run ID `41344811704`, source commit `7429572182df0b3a347e596ffc860de61fca6017`. `npm test` passed all existing protocol tests and all 3 new library tests; Vite build and Android init completed; Gradle `assembleDebug` was still in progress. Append final run result and artifact hash after Gradle completes.

### Protected code remains unchanged at current source
- `www/tone3000.js` `13632a59bb4d5b66f41df13e2972a15a4ec0b029`.
- `www/nam-transfer.js` `e854d2a7a122272b8971a3023f4e1d5e81b48cc4`.
- `www/main.js` `e2697b26e1d673be2002b8f1a085f12e9618b1de`.
- `www/native-midi.js` `a912c6e7379e193877122c9010b38bdbc0daae64`.
- `www/ir-transfer.js` has one narrowly scoped presentation guard in the existing NAM page mutation observer; the IR packet builder, User/Collection target selection and transfer/readback code are unchanged. Do not treat the new JS blob hash as a protocol change.


### Final APK #241 — freeze-loop fix verified (2 November 2026)
- Final build source commit: `7429572182df0b3a347e596ffc860de61fca6017` on `feature/dark-performance-ui-polish`.
- GitHub Actions [Build #241](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41344811704), run ID `41344811704`, completed successfully.
- `npm test`: 18/18 passed, including the 3 dedicated NAM library visibility/toggle/observer lifecycle tests. Build step also completed Vite production bundling via `npm run build`, Capacitor Android initialization, Gradle `assembleDebug`, and artifact upload.
- Artifact ID `13098539446`; ZIP `MG30-Studio-build-241.zip`, size 4,061,478 bytes; SHA-256 `5e6250446a21c7b14e0254e91734e09d4d5bd3ee51318aaeaa866232fdd9a206`.
- Extracted APK `MG30-Studio-241-debug.apk`: 4,438,564 bytes; SHA-256 `8db9fa33b6078b639f234785bc1c4de6aa6e15acbe64aec638a38db23a8b42eb`.
- ZIP integrity and APK ZIP integrity checks both passed. Inspected the actual APK's bundled JS/CSS: library header text and empty state present; idempotent text guard present; persistent observer is limited to the catalogue; no page-wide library observer remains; IR layout observer excludes `namModelLibrary`; dedicated panel CSS and legacy fixed-position reset are present.
- APK v2 signer certificate SHA-256: #233 `e58377c7108920b010093574c31b78af0d797f256dfd8ec72d6968716d670ba8`; #241 `6b304ec584e8089c5770a7f3e092b9afa2e6ed4d119f74bf5caddea8bf92c214`. They differ, so Android will not install #241 as an in-place update over #233. Back up/export important app-local data before uninstalling #233; the old signing private key is not available.
- Source hashes at the exact #241 commit: `www/tone3000.js` `13632a59bb4d5b66f41df13e2972a15a4ec0b029`; `www/nam-transfer.js` `e854d2a7a122272b8971a3023f4e1d5e81b48cc4`; `www/main.js` `e2697b26e1d673be2002b8f1a085f12e9618b1de`; `www/native-midi.js` `a912c6e7379e193877122c9010b38bdbc0daae64`. `www/ir-transfer.js` includes only the UI observer skip for node id `namModelLibrary`; the User/Collection SysEx packet builder, routing maps and transfer/readback logic are not changed.
- Important validation boundary: these are Node DOM/MutationObserver fixture tests, protocol regression tests, Vite bundle validation, and Android Gradle packaging. We do not have remote access to the user's physical handset, so no direct Android WebView install/tap test was possible. User should install #241 safely and confirm the Editor tab is responsive, then verify NAM library Show/Hide and Collection. Do not claim physical phone runtime validation until that screenshot arrives.


## NAM Model Library action-button polish — Build #244 (2 November 2026)

User confirmed the NAM Model Library panel now appears and requested only visual cleanup of its model action buttons and compact Hide control.

### UI changes
- `www/nam-model-library-ui.js`: Hide control label is now exactly `Hide` with no up-arrow. Show still displays `Show⌄`.
- `www/ui-redesign.css`: Hide control is explicitly 84px wide × 38px high, compact dark Studio style.
- Model cards are styled with dark rounded surfaces and subtle selected lime outline. Model title/architecture/size have explicit hierarchy and spacing.
- Actions use a two-column grid: Select Model/Selected at left, lime Download & Import at right, and dark Download Only spanning the full row below. Disabled Selected has a muted dark fill, not browser-gray default styling.
- Mobile <=390px uses slightly tighter card/button spacing and font sizes.
- All new selectors are scoped under `#namModelLibrary`; no TONE3000 download/import JS handlers were changed.

### Verification and APK
- Final source commit: `346a0a85951cf62365db34fca83651da50d3ff9e`, branch `feature/dark-performance-ui-polish`.
- GitHub Actions [Build #244](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41345848361), run ID `41345848361`, completed successfully.
- `npm test`: 19/19 passed, 0 failures. Includes new visual contract assertions for no-arrow Hide label, compact 84px header control, two-column actions, lime Download & Import, full-width Download Only, and muted disabled Selected.
- Vite production build, Android/Capacitor setup, Gradle `assembleDebug`, and artifact upload all succeeded.
- Artifact ID `13098649464`; archive `MG30-Studio-build-244.zip`; 4,062,304 bytes; SHA-256 `8cdb5a49148550c4d6096aabae9a2ebd318219889881dacc22cc913759300d3a`.
- Extracted APK `MG30-Studio-244-debug.apk`; 4,439,168 bytes; SHA-256 `2184a556d9c9de68a5c96971e315bf07080a31241c00bda2d09424500effe4f4`.
- ZIP and APK integrity checks passed. Inspected compiled CSS/JS inside the actual APK and verified all six visual requirements: Hide has no arrow, width 84px, actions grid, lime Download & Import, full-row Download Only, dark disabled Selected.
- Protected files unchanged: `www/tone3000.js` `13632a59bb4d5b66f41df13e2972a15a4ec0b029`; `www/nam-transfer.js` `e854d2a7a122272b8971a3023f4e1d5e81b48cc4`; `www/ir-transfer.js` `6389f3ba51000c02a1b37495cb28cdbccd4197eb`; `www/main.js` `e2697b26e1d673be2002b8f1a085f12e9618b1de`; `www/native-midi.js` `a912c6e7379e193877122c9010b38bdbc0daae64`.
- Validation boundary: CI tests, Vite build, Gradle packaging, APK ZIP integrity, and inspection of the packaged CSS/JS passed. No physical Android handset/WebView touch test was run in this environment. User should install and confirm actual visual appearance. Debug signing may differ from the previous APK; back up local app data before uninstall/reinstall if Android refuses in-place update.

## Follow-up: English NAM/TONE3000 UI copy and compact model cards (2026-11-02)

- User screenshot review: translate remaining Indonesian copy in the NAM/TONE3000 panel and empty-state hint to English; remove the arrow glyph from the collapsed Show label; reduce the expanded TONE3000 model-card footprint so more models are visible.
- Updated www/tone3000.js user-facing labels/status/error strings for target-slot selection, OAuth/PKCE and Redirect URI guidance, model download/save, file validation, and NAM transfer status to English. No OAuth flow, PKCE validation, download, file-save, or NAM transfer logic was intentionally changed.
- Updated www/nam-model-library-ui.js: empty-state hint is now “Choose a tone to load models”; collapsed label is “Show” without an arrow.
- Updated www/ui-redesign.css: compact card spacing/padding, smaller title/subtitle and SELECTED badge, inline badge beside the title, and shorter action buttons (34px minimum on narrow phones; 36px otherwise). All selectors scoped under #namModelLibrary.
- Added regression tests for English UI copy, no-arrow Show label, and compact card presentation. Final source HEAD: 5315c3d0be8b79a8dfaf8ed911f05d8ac79c4259 on feature/dark-performance-ui-polish.
- GitHub Actions Build #248 (https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41347208794) completed successfully. Protocol/UI regression suite: 22/22 passed, 0 failures. Capacitor Android generation, Gradle debug APK build, and artifact upload all succeeded.
- Artifact ID 13099846178, name MG30-Studio-debug-APK, ZIP size 4,062,476 bytes, artifact digest SHA-256 40a4629afc346116f44224f0225b4330274bb882063d02ebfc8358b90a9ac14f.
- Extracted APK size 4,439,292 bytes, SHA-256 e159309181d13273c167180c326ad8b9de002f50da42194e24b3a9ca7dc38078. Inspected compiled APK assets: English empty-state and OAuth strings present, old Indonesian empty-state phrase absent, Show arrow absent, and compact-card CSS present.
- Protected transfer/native files unchanged relative to the current baseline: www/nam-transfer.js SHA e854d2a7a122272b8971a3023f4e1d5e81b48cc4; www/ir-transfer.js SHA 6389f3ba51000c02a1b37495cb28cdbccd4197eb; www/main.js SHA e2697b26e1d673be2002b8f1a085f12e9618b1de; www/native-midi.js SHA a912c6e7379e193877122c9010b38bdbc0daae64. No IR collection import mapping or MIDI mapping was edited in this follow-up.
- Validation boundary: CI tests, Android packaging, and compiled asset inspection passed. A physical phone/WebView visual check and MG-30 hardware transfer test remain outstanding; confirm actual card readability/touch behavior on the phone. This APK is a debug build.
## NEXT SESSION ENDPOINT — PRESET RENAME, PEDAL TRANSFER & SAVE AS (2026-11-02)

### Confirmed handoff state
- User confirmed Build #248 was installed successfully and the latest NAM library UI/copy changes are working on the phone.
- Last delivered build: MG30 Studio APK #248; GitHub Actions run 41347208794; source commit 5315c3d0be8b79a8dfaf8ed911f05d8ac79c4259; 22/22 automated tests passed; APK packaging and artifact inspection passed.
- The current branch remains feature/dark-performance-ui-polish. Repository HEAD may be newer than the source commit used by Build #248 because the handoff notes themselves were committed afterward. Always re-check branch HEAD and Actions before starting the next session.
- No preset rename/transfer/Save As implementation has been started in this session. This section is the next-work endpoint, not a claim that the feature already exists.

### Next target
1. **Rename Preset** — provide a clear way to rename a preset. First inspect whether the current preset name exists only in the app's local preset record or is also part of the pedal's stored preset metadata. Do not assume local rename also renames the pedal slot.
2. **Transfer Preset to Pedal** — allow a selected preset to be sent/written to the connected original NUX MG-30 Gen 2 pedal. Reuse and verify the existing preset transfer/import/export protocol and current USB-MIDI connection path; do not invent packet formats or alter the working NAM/IR transfer path.
3. **Save As / overwrite a preset slot** — add a Save As action that lets the user choose the destination pedal preset slot. If the target slot already contains a preset, show its slot number/name and require explicit overwrite confirmation before writing.

### Required investigation before implementation
- Inspect the current Presets page, preset data model, rename controls (if any), import/export serialization, slot selection, and existing device read/write functions.
- Review existing USB-MIDI/SysEx captures and any current preset readback/writeback notes. Identify confirmed command IDs, payload layout, checksums, chunking, ACK/timeouts, and slot addressing from evidence already collected; capture additional traffic only when needed.
- Establish whether the device supports a separate rename operation or whether the name is written as part of a complete preset-slot transfer. Keep this distinction explicit in the UI and documentation.
- Identify a safe read-before-write and post-write verification path. Preserve/export a backup of the destination slot before overwriting whenever supported.

### Acceptance criteria
- Rename changes the intended preset name and persists correctly after app restart; behavior on the pedal is explicitly verified rather than assumed.
- A preset can be selected and transferred to a chosen MG-30 slot through the real device connection.
- Save As presents the valid destination slot list and clearly identifies occupied slots.
- Overwrite requires explicit confirmation; cancellation sends no write commands.
- Successful write is confirmed by ACK and, where supported, slot-name/preset readback. A partial/timeout result is reported honestly and does not claim success.
- Existing preset import/export remains functional.
- Existing NAM import, custom IR, IR Collection/User mapping, MIDI mapping, USB-MIDI, Signal Chain and Editor functions remain unchanged.
- Add regression tests for preset naming, slot selection, overwrite confirmation/cancel, transfer framing, and post-write verification. Run full tests, production build, Android Gradle build, then inspect the actual APK before delivery.

### Safety rules for the preset write path
- Target device: original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.
- Do not test destructive overwrite on a valuable user preset. Start with an empty or explicitly chosen disposable/test slot and back up the destination first.
- Never send a write on a guessed slot, unverified packet format, or stale device connection.
- Keep all working NAM and IR features protected; do not alter IR collection imports or the known-correct MIDI mapping.

### Session start instruction
- When work resumes, read this endpoint section, re-check the latest branch/commit/build and the current Presets implementation, then continue with protocol and UI investigation. Do not redo Build #248's completed NAM library polish.

## Follow-up: Preset Library Rename & Save As first implementation (2026-11-02)

- Working branch: `feature/preset-rename-save-as`, created from `feature/dark-performance-ui-polish` at base HEAD `30866b9769645622024847d74a796d5b0039a04`. The existing dark-performance branch was not modified.
- Added `www/preset-library-operations.js`: isolated helpers for 16-character printable ASCII preset names, packed name bits 106–121, 3-part readback validation, applying the signal-chain IDs at bit slots 94–105 for the active scene, and storing raw destination snapshots.
- Added `tests/preset-library-operations.test.js`: covers name validation, packed name decoding, destination/scene header validation, Rename data preservation, Save As scene-chain update/source immutability, invalid chain/scene rejection, and raw backup serialization.
- Updated `www/preset-library-ui.js`: adds page-scoped Rename and Save As actions. Rename reads all three stored parts for the selected slot and rewrites them through the existing `writeHardwarePreset()` path after explicit confirmation. Save As reads the active `0C/02` edit buffer and destination `0B/02` stored parts, requires explicit overwrite confirmation, preserves a local raw snapshot, applies the current visible chain order to the selected scene, then writes the selected destination through the existing write/read-back helper. Save As does not send Program Change or change the active source slot.
- Updated `www/preset-library-ui.css`: new actions/dialog/status presentation, all selectors scoped to `#page-presets`.
- Added `docs/research/MG30_PRESET_RENAME_SAVE_AS_IMPLEMENTATION_2026-11-02.md` with protocol reuse, constraints, implementation state and physical test plan.
- Code commits: `1bf9395dc5be4ab4cd9b412479127d032d974775` (helpers), `21d28a910cfaf33f151ed0728807b84fc69ed739` (tests), `b6ff5d820c0d726c09280c8fbcdca659d977c9e6` (UI operations), `32dfd673847d71026e0037aa39ccb74c4601b581` (test fix), `f7eab67bc0513edc9eb84ace8d2bb859dae44ca3` (scoped styles), `fc91b5446e9c414b2e103e4dea0b7b9fe952ed1c` (recheck slot before write), `1cc400a3189f4f947ed0445df499825335bfca60` (position controls under header), `ad9ce89fedac8218627fa4452076b6b03cfacdad` (serialize device/editor controls), `6521bef2bbdc3ac46c797796700b46636090cb4d` (pause while name scan runs).
- Documentation commit: `add2402fa073f52eb25447418ef66f0ef073cafc`.
- Test status: 7/7 isolated helper tests passed when executed locally from a temporary test copy. The repository-wide `npm test` suite has not been run. No Vite/Gradle build, APK build or Actions workflow has been run.
- Backup limitation: each Rename/Save As operation stores the destination's three raw scene readbacks under `mg30-preset-slot-backup-v1-<program>`, retaining up to three versions. This snapshot is local to app storage and is not yet restorable through an in-app workflow. Export a normal `.mg30patch` copy separately before overwriting a valuable preset.
- Deliberately untouched: `www/index.html`, Editor save implementation, `www/main.js`, `www/native-midi.js`, `www/mg30-preset-import.js`, `www/mg30-preset-export.js`, preset binary serializer/parser/read protocol, NAM transfer, IR User/Third Party transfer, IR Collection import/mapping, Studio, MIDI mappings, movable Signal Chain behavior and native Android MIDI code. The implementation calls existing global read/write functions only; it introduces no new SysEx IDs or packet shapes.
- Hardware verification: not performed. Required before release on original MG-30 Gen 2 FW 6.0.x with a disposable slot: verify Rename persistence and unchanged scenes; verify Save As destination read-back and unchanged active source; verify Cancel sends no write frames; verify occupied-slot overwrite and raw snapshot. Recheck Editor, USB-MIDI, NAM, IR User/Third Party, Collection and MIDI mapping.
- Build protocol: branch `feature/preset-rename-save-as` is not included in the push-trigger branch list in `.github/workflows/build-apk.yml`. No Actions run was started. Stop here and ask **“Build sekarang atau nanti?”** before any manual build/Gradle/APK workflow.

- Build approval received: user replied **“Sekarang”** on 2026-11-02.
- Added `feature/preset-rename-save-as` to the existing `.github/workflows/build-apk.yml` branch allowlist so the user's approved push can run the normal protocol tests, Capacitor Android generation, Gradle debug APK build and artifact upload. Workflow change commit: `34445a918ca07a71f6f89250dd026cdc3a2ce4a3`.
- The workflow path filter includes `.github/workflows/build-apk.yml`; the push of the workflow change triggers the approved build. The build result and artifact will be recorded after the run is inspected.

## Build verification — Preset Rename & Save As Build #249 (2026-11-02)

- User approved **Build sekarang**.
- GitHub Actions run: [#249 / 41387125375](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41387125375) — **success**.
- Build source commit: `34445a918ca07a71f6f89250dd026cdc3a2ce4a3` on `feature/preset-rename-save-as`. The branch was subsequently advanced only by documentation/checklist commits; no application source changed after this build source commit.
- Repository test output: **29 tests, 29 passed, 0 failed**.
- Vite production build: completed as part of Capacitor generation.
- Capacitor Android generation: success.
- Gradle debug APK: `BUILD SUCCESSFUL`, 183 actionable tasks executed.
- Artifact ID: `13116156136`; artifact ZIP size **4,066,594 bytes**; ZIP SHA-256 `038742c4a92fa5234436cefe7745dcbb39414352c7ba2025e883538a5de1e7e3`.
- Extracted APK: `MG30_Studio_Build249.apk`, size **4,444,032 bytes**; APK SHA-256 `ebcef8e69ea9c4d2c1daab886b76b86c7ece13b266e4e0ae4f0a56348b6b464d`.
- Artifact inspection: ZIP and APK integrity tests passed. Compiled APK assets contain the Rename dialog, Save As action, raw slot-backup key, verified success status and name-changed event strings. These checks confirm code packaging, not physical pedal transfer.
- Direct APK was extracted and copied to `/mnt/data/MG30_Studio_Build249.apk` for delivery.
- Workflow update commit `34445a918ca07a71f6f89250dd026cdc3a2ce4a3` added the feature branch to the build workflow allowlist. Checklist update commit `a5dba263b3332213e2baae6dad2bbde67fefd98c` was added while build was running and contains documentation only.
- Physical device/hardware tests are still pending. On original MG-30 Gen2 FW 6.0.x, test Rename on a disposable preset; test Save As to a disposable/empty slot; cancel overwrite and confirm no write frames; then perform overwrite on a disposable slot and inspect readback. Confirm Editor, USB-MIDI, NAM, IR User/Third Party, Collection and MIDI mappings remain functional.
- Build does **not** mean physical hardware validation. Do not claim Rename/Save As has been verified on the pedal until the user confirms those tests.


## Preset Manager — concise Rename / Save As feedback (2 November 2026)

- User confirmed that Rename and Save As now complete successfully on the connected original MG-30 Gen 2. The supplied screenshots show Rename on slot 15D reporting a matching three-part read-back, and Save As from 16B to 22C succeeding while slot 16B remains active.
- Removed the persistent operation/status banner above the preset cards. Rename and Save As no longer write operation messages into the Preset Manager scan-status element.
- Removed the explanatory paragraphs and raw-snapshot technical note from both dialogs. The name field label is now simply “Preset name”. The local raw destination snapshot behavior remains in code and is not removed.
- Success feedback is now a short toast: “Preset renamed · 15D” or “Preset saved · 22C”. Same-name and error results also use concise toast feedback; detailed technical errors remain in the console rather than appearing as banners.
- Kept the Rename and overwrite confirmation prompts, destination selection, original source-slot behavior, three-scene read/write/read-back path, local backup capture, and name cache update logic intact.
- Translated remaining Rename/Save As validation and preset-list toast strings to English. NAM, IR User/Third Party, IR Collection, MIDI mappings, USB-MIDI protocol, preset transfer logic, and Signal Chain behavior were not edited.
- Source files changed: `www/preset-library-ui.js`, `www/preset-library-operations.js`, and `www/preset-library-ui.css`.
- Removed `feature/preset-rename-save-as` from automatic push-build branches. APK builds remain available via manual workflow dispatch after the user explicitly requests a build.
- Build/test status: no APK build was started for this UI-only follow-up. Repository tests and Android packaging have not been rerun yet; Build #249 remains the last delivered APK and does not include this cleanup.
- Hardware evidence boundary: the success/read-back results above are user-reported from the supplied device screenshots. No additional restart/reconnect test was reported in this update.


## Latest verification — Build #251 from latest Preset Rename / Save As work (2 November 2026)

- Target remains original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.
- Working branch: `feature/preset-rename-save-as`.
- Last application-source checkpoint before the build: `c1f58382cb8411855ffb7ef86a9685da69d43832` (Preset Library validation-toast/dialog-close follow-up).
- Build trigger commit: `b452d51d099464837b31861591c41c6bcde63287`. Compared with app checkpoint `c1f5838`, the build-trigger tree changed only `.github/workflows/build-apk.yml` (temporary allowlist line) and `tests/preset-library-operations.test.js` (assertion wording); no application module changed after the application-source checkpoint.
- A first attempt, Build #250 / run `41390473586`, failed at `npm test`: 26/29 passed. Three test cases stopped at stale assertion regexes because the application validation messages had already been translated to English. No Capacitor or Gradle step ran and no APK artifact was produced by #250.
- Test-only correction commit: `6ef22c1bfbd59838a0fbb2ce2b617638f6c1422f`. Updated six assertion patterns in `tests/preset-library-operations.test.js` to match the current English validation text. No application logic or device transfer code was modified by this correction.
- Successful run: [Build #251 / 41390573757](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41390573757), source trigger SHA `b452d51d099464837b31861591c41c6bcde63287`.
- `npm test`: **29/29 passed, 0 failed**.
- Vite production build: Vite 7.3.7, successful (`built in 609ms`).
- Capacitor Android generation: successful.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL**, 183 actionable tasks executed.
- Actions artifact: `MG30-Studio-debug-APK`, ID `13117006565`, ZIP size **4,066,352 bytes**, SHA-256 `51ed77df4f796a58763b77d0c817c51d5c51895b6d0540e8cd30c6f19fdeb2b5`.
- Extracted APK: `MG30_Studio_Build251.apk`, size **4,443,588 bytes**, SHA-256 `7b513140228d7dd249848c1fcefdc5ed8ff7194fa907f723cba1218f113a8b53`.
- ZIP integrity and APK ZIP integrity passed. The packaged production JS was inspected and includes Rename, Save As, success/error feedback, local raw-slot-backup key, and the English validation messages.
- Workflow trigger was temporarily enabled for the approved build in commit `b452d51`, then restored to manual dispatch / original allowlist. Final workflow restoration commit: `670438cb5090f2ae3ba6453f0d3bb48f53a9c3ac`. Automatic push builds for `feature/preset-rename-save-as` remain disabled.
- Comparing `b452d51` to current branch HEAD `670438c` shows only the single workflow allowlist restoration; application source and the corrected tests used in Build #251 remain unchanged.
- **Hardware boundary:** Build #251 is a debug APK. This CI run does not test installation on the user's phone or a fresh physical-pedal Rename/Save As transaction. Recheck Editor, USB-MIDI, NAM import/library, IR User/Third Party, IR Collection, MIDI mapping and Signal Chain after installation; then re-test Rename/Save As on a disposable slot. Do not mark this build physically validated until the user reports it.

## English UI / IR sync / CTRL panel follow-up — Build #258 (2 November 2026)

- Target remains the original NUX MG-30 Gen 2 firmware 6.0.x (not MKII).
- Removed the persistent explanatory/status paragraph below the IR Collection grid. The collection sync status area is hidden; synchronization outcome is reported with a short global toast. Sync progress labels and count text are English.
- Replaced Indonesian labels in the IR Collection manager's visible upload and slot-management UI with English. The sync result toast reports stable slots, empty slots, and failures without a persistent banner.
- Removed the redundant CTRL/EXP parameter warning from the visible panel. The parameter selector remains locked for unknown model/parameter pairs; no guessed enum is enabled. Added an explicit `[hidden]` CSS rule so the warning cannot override the browser's hidden state or cover the footer buttons.
- Standardized the Studio page title to **Jamm & Record** and set the document language to English. Existing `english-ui.js` exact/fragment translation and mutation observer remain in place for dynamically generated UI and device messages.
- Preserved NAM transfer, IR User/Third Party and Collection transfer commands, MIDI mappings, preset transfer paths, and signal-chain logic. No changes were made to NAM or IR protocol bytes.
- Build #258: [run 41392538778](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41392538778), source SHA `bee9c1452dc6bed3c4199ef035caa7f82bed3806`; `npm test`, Vite build, Capacitor Android generation, Gradle `assembleDebug`, and artifact upload all passed.
- Artifact: `MG30-Studio-debug-APK`, ID `13117558434`, ZIP size 4,068,386 bytes, SHA-256 `7a5b9421533aa2c64c5edd658e2d894cd3a2e99a8f708cde48bd176e60d57436`.
- Extracted APK: `MG30_Studio_Build258.apk`, size 4,446,588 bytes, SHA-256 `7763322c219a25ea526343e7ad76a66789616bfd874023b7d093e3fef6e56d92`. ZIP and APK integrity checks passed. The packaged JS bundle was inspected for Jamm & Record, Collection sync toast, English IR upload labels and progress text.
- The temporary feature-branch push trigger was removed after the build. Subsequent APK builds on this branch remain manual-dispatch only.
- Hardware boundary: this is a successful automated test/build and package inspection, not a physical MG-30/phone run. Confirm that the sync toast appears, the CTRL footer buttons are visible, and the IR/NAM/MIDI behavior remains intact on the actual device before release.


## English UI / IR Collection / CTRL footer polish — Build #260 (2026-11-02)
- IR Collection: removed the visible status/footer paragraph under the 24-slot grid; added explicit `.ir-manager-status[hidden]{display:none!important}` because the base status CSS could override the browser's default hidden behavior. Collection progress remains in the slot counter; completion/failure is reported by a short English toast.
- CTRL / EXP: the unsupported-parameter notice remains hidden and the parameter selector remains locked for unknown mappings. Explicit `.ctrl-parameter-notice[hidden]{display:none!important}` keeps the dialog footer actions visible.
- Studio title is standardized to **Jamm & Record**; document language is `en`.
- English UI audit covered 17 UI/source modules (IR, NAM, USB-MIDI, audio/recording, preset import/export/read, CTRL/EXP, YouTube/Studio and the translation dictionary). Added 48 exact English translations for remaining UI/status/error strings. Dynamic device/model data and protocol identifiers are not translated.
- No NAM transfer path, User IR / Third Party import sequence, IR Collection transfer sequence, USB-MIDI framing, MIDI mapping, preset transfer, or signal-chain behavior was intentionally changed.
- CI Build #260: `npm test` passed; Capacitor Android generation passed; Gradle `assembleDebug` passed; artifact upload passed. Run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41393237044
- Artifact ID `13117969550`, ZIP SHA-256 `4dab62e9a67b8364006a2d2a058c9995f6d5bd8640d1baf49b408a70b3be55d2`; extracted APK SHA-256 `21e641c7b733aa2676eff04bbf28ca6c97bc83ad01d9869181219b2e0f6f9f8d`. ZIP and APK integrity checks passed. Packaged JS/CSS inspected for title, English status strings, and hidden status/notice CSS.
- Temporary branch push trigger removed after the build; workflow returned to its original restricted branch allowlist. Physical phone/pedal validation remains pending; CI success is not a substitute for testing the IR sync toast, CTRL footer, NAM, USB-MIDI, and existing MIDI mappings on hardware.


## Screenshot-driven English UI correction — Build #261 candidate (2 November 2026)

- User screenshots after Build #260 exposed four untranslated items: the Android USB-MIDI no-device error toast, the YouTube search placeholder, the signal-chain chip count (“12 blok”), and the drag handle (“GESER”). The signal-chain reorder helper also remained Indonesian when toggling reorder mode.
- Corrected the source strings directly: OTG failure prefix and native bridge errors are English; YouTube placeholder reads “Search for a song or artist…”; signal-chain count reads “12 blocks”; drag handle reads “MOVE”; initial/reorder helper and accessibility labels are English.
- Changes are presentation/error wording only. The signal-chain order algorithm, gesture handling, USB-MIDI device selection, SysEx framing, connection bridge behavior, NAM, USER IR / Third Party, IR Collection, and MIDI mappings are unchanged.
- Added a focused regression test for the exact screenshot strings. CI/APK verification is pending.


## Build #261 — screenshot-driven English UI corrections (2 November 2026)

- User screenshots after Build #260 showed untranslated text in the mobile Editor and Studio pages. Corrected the YouTube search placeholder, signal-chain count chip, MOVE drag handle, signal-chain reorder helper/accessibility labels, OTG failure toast prefix, and native USB-MIDI connection errors.
- Source commit: `6d0123adc4a5c26abc47849bd3abd25bbefe1733`. Files changed: `www/index.html`, `www/native-midi.js`, new `tests/english-ui-polish.test.js`, plus the project notes. No signal-chain ordering algorithm, drag/drop event logic, USB-MIDI framing/device-selection logic, NAM transfer, USER IR / Third Party import, IR Collection, preset transfer, or MIDI mapping was modified.
- CI: [Build #261 / run 41394537804](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41394537804), conclusion **success**. `npm test`: **30/30 passed, 0 failed**. Capacitor Android generation passed. Gradle `assembleDebug`: **BUILD SUCCESSFUL**. APK artifact upload passed.
- Artifact ID: `13118548527`; ZIP size **4,069,917 bytes**, SHA-256 `4d679b888994dc0b1f3c020fa04bd8c2fa18d5c783296bc0c2c364a25239961d`.
- Extracted APK: `MG30_Studio_Build261.apk`, size **4,448,492 bytes**, SHA-256 `5574fce9e587422347817b40d43b51f1bbc6467f50e4b01edc74c00547b2d609`. ZIP and APK integrity checks passed. Packaged asset inspection confirmed the corrected visible English strings are present.
- The feature branch push trigger was temporarily added only to queue Build #261, then removed in restoration commit `6a13ee30625fa8328770f16a401df461709c9e66`. The current workflow allowlist does not include `feature/preset-rename-save-as`; subsequent builds remain manual/explicit.
- Hardware validation remains pending. Install Build #261 and check the English OTG failure toast, Studio search placeholder, and signal-chain MOVE label on the phone. A failed USB connection does not itself imply a protocol regression; NAM, both IR destinations, MIDI mappings and preset operations still need device validation as usual.

## New feature branch — Studio Mini DAW 4-track mockup (2 November 2026)

- Created branch feature/studio-mini-daw-4-track-mockup from the verified Build #261 documentation checkpoint 7da21717a0965f44b9491fcc8a76384688d14f84. The prior branch feature/preset-rename-save-as remains untouched by this feature work.
- User requested a four-track Mini DAW direction for Studio and asked for a mockup before implementation. A visual concept was generated in this conversation: four stacked waveform lanes (Backing, Guitar, Bass, Vocals), tempo/time-signature/grid/loop controls, global transport, track inspector, four-channel mixer, and project actions.
- This branch currently contains design documentation only. No production app source, audio engine, Android native code, existing recording path, YouTube player, NAM/IR, USB-MIDI, MIDI map, Presets, or Editor logic has been modified.
- Existing Studio baseline observed in source: Track 01 uses a local audio file and HTML audio playback controls, with YouTube search/reference; Track 02 records through the MG30 native USB audio plugin and saves WAV takes. The native plugin currently uses a single AudioRecord field and a single recording state; it does not establish multi-input or simultaneous four-track recording capability.
- Track 3 Bass and Track 4 Vocals are visual lanes only at this stage. Their input routing, overdub workflow, and simultaneous capture capability must be designed and tested before they are represented as working features. Do not silently fall back to the phone microphone; the existing MG-30 USB capture route and its safety checks must be preserved.
- The design brief and staged implementation plan are in docs/research/MG30_STUDIO_MINI_DAW_4_TRACK_MOCKUP_2026-11-02.md. No APK build is required for this documentation/mockup-only checkpoint.


## Mockup revision — smartphone portrait layout (2 November 2026)

- User approved the overall four-track Mini DAW direction but requested that the visual be composed at a true smartphone screen size, rather than a desktop/tablet-shaped canvas.
- Generated a dedicated portrait mobile mockup with a tall 9:20-style phone viewport and the existing NUX MG-30 dark/neon-green design language.
- Mobile composition: compact Studio title and Jam / Record / DAW mode selector; two-row timeline toolbar/position; four stacked waveform lanes with track controls; compact global transport and stereo meters; four narrow mixer strips; collapsed Track Settings and Project panels; existing five-item bottom navigation with Studio selected.
- This is still a design image only. No application source, project model, audio engine, native recorder, USB-MIDI, NAM/IR/Collection, Presets, or Editor behavior was changed.


## Product decision confirmed — default four-track DAW project (2 November 2026)

- User approved the three-mode Studio concept: JAM for play-along/backing practice, RECORD for quick standalone USB guitar takes, and DAW for project-based multitrack production.
- User selected the recommended DAW project default: **Track 1 = Backing** and **Track 2 = Guitar** are created/prepared by default; **Track 3 = Bass** and **Track 4 = Vocals** are present but initially empty.
- New Project should create the four named lanes and a project timeline immediately, without requiring the user to configure all four tracks first. Track 1 should accept imported backing audio; Track 2 should be ready for the verified MG-30 USB guitar input. Track 3 and Track 4 remain available for later overdubs or imported audio.
- The default layout does not mean Bass/Vocals have dedicated independent hardware inputs or that four tracks can record simultaneously. Input routing must be explicit and verified; preserve the existing USB route checks and do not fall back silently to the phone microphone.
- Keep Jam and Quick Record as distinct workflows. A saved Quick Record WAV should be importable into a DAW track without re-recording; DAW Record should record into the selected/armed track as a project clip. The YouTube reference remains a play-along reference, not an automatically imported audio source.


## Product decision confirmed — DAW stem export and full mix export (2 November 2026)

- User requires two distinct DAW export workflows:
  1. **Export Stems:** open a stem-export screen/menu showing a checklist of the four project tracks (Backing, Guitar, Bass, Vocals). User can check only the tracks they want; each selected track is rendered/exported as its own separate audio file (not combined into one file). Unchecked tracks are omitted. Allow selecting any subset, including one track or all four.
  2. **Export Mix:** render the complete project as one combined stereo audio file, using the DAW mix (track levels, pan, mute/solo and other applicable mix settings), similar to a conventional DAW master mix export.
- The two choices must be explicit and separate in the Project/Export UI: “Export Stems” and “Export Full Mix” (or equivalent clear English labels).
- Stem files should have useful track-based filenames and share the project's export format/sample-rate settings. The exact file container/delivery method, bit depth, sample rate, and whether selected stems are bundled in a ZIP or saved individually remain implementation decisions to validate on Android.
- Stem export should preserve each track's timing/position relative to the project start so the files can be imported into another DAW and remain aligned. Do not normalize/trim leading silence independently unless user explicitly chooses that behavior.
- This is a product requirement/design note only. No export engine, audio renderer, project format, existing quick-record export, or other production code has been changed.


## Export delivery decision confirmed — ZIP bundle for stems (2 November 2026)

- User selected ZIP packaging for Stem Export. After checking the desired tracks in the Export Stems checklist and confirming export, the app should render each selected track as a separate audio file and package those files into one ZIP archive.
- ZIP contains one file per selected track, with clear track-based filenames (for example: 01-Backing.wav, 02-Guitar.wav, 03-Bass.wav, 04-Vocals.wav). Only selected tracks are included.
- Preserve project-relative start time / timeline alignment in every stem; do not trim leading silence by default. Include a small project/metadata file in the ZIP only if it materially helps preserve tempo, sample rate, bit depth, and export alignment; this is an implementation detail to decide.
- Full Mix remains a separate export action that creates one combined stereo master WAV, not a ZIP of stems.
- This is a confirmed product/design requirement only. No production export code or current Quick Record export behavior has been changed.
