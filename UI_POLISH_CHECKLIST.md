# MG30 Studio — UI Polish Checklist / Project Memory

This file is the durable continuation record for the multi-screenshot UI-polish pass. Update it whenever the user sends another screenshot or requests a UI change.

## Protected project constraints
- Target: original NUX MG-30 Gen 2, firmware 6.0.x; not MG-30 MKII.
- Do not regress the already-working NAM feature.
- Do not change the correct existing MIDI mapping.
- Do not regress the tested IR Collection transfer.
- Preserve the confirmed real-time movable signal-chain behavior based on the QuickTone capture.
- The user requested that UI edits be committed to this branch first and **no APK build be run until the user explicitly says all screenshots/UI changes are complete and asks for a build**. The user explicitly requested a build after Screenshot 3; that build is complete.
- Avoid automatic builds on `android/ui-polish-pass-1`. The branch's push trigger was enabled just for the requested build, then disabled again.

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
- [x] Build artifact `MG30-Studio-IR-Collection-Experiment` (3,986,398 bytes, artifact ID `12893028237`) was downloaded and exposed to the conversation as `MG30-Studio-UI-Polish-Screenshot7.zip`; installation APK supplied separately when extraction is available.
- [x] Automatic build trigger disabled again after this requested build.
- [ ] User to verify the 32×32 reorder icon aligns with the “12 blok” chip, the editor block heading only displays its type (`AMP`, `EFX`, etc.), and the bottom-nav SVG icons fit their respective tabs.

## Workflow for the remaining screenshots
1. User sends one screenshot and describes desired changes.
2. Edit only the UI-polish branch and update this file with the request/change status.
3. Do not build APK or trigger an automatic APK workflow while screenshots are still being collected.
4. After the user explicitly says the screenshot/UI list is complete and asks for a build, inspect the aggregate diff, run static checks, then build the APK once.

## Latest scope
The current commit includes the Studio → Device control move, connection-triggered USB test, and visible Studio YouTube search. The working tree is represented by this Git branch; continue from it in future conversations.