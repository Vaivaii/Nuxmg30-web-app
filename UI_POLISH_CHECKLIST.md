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
