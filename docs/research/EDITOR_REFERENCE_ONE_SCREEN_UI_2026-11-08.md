# Editor UI — Match User Reference, One-Screen Inline Parameters — 2026-11-08

## Base / branch

- New branch: `feature/editor-reference-one-screen`.
- Created directly from the verified Community .6 source at `a6009d158f841a65d61b6b70808dae505a2ec0bb`.
- Initial signed candidate target was `1.0.0-community.7` / versionCode `7`. The corrected fixed-reference build is Community `.8` / versionCode `8`.

## User-supplied portrait reference

The user explicitly requested a faithful implementation of the supplied 684×1536 portrait Editor reference, not a redesign. Main visual requirements:
- Global NUX/MG-30 GEN2 brand header and USB-MIDI status unchanged.
- Hardware preset navigation row immediately under the header.
- CTRL/EXP and Save to Device in one equal-width row.
- Signal Chain card with horizontal small block cards; no per-card ON/OFF label. Disabled effects are dimmed; selected block retains lime focus.
- AMP/effect editor card with block icon/title/model selector/ON switch in one row.
- Model artwork and “Based on” line below the block header.
- All live model parameters visible directly in the editor as a compact four-column grid, no popup or floating knob panel, no vertical scrolling.
- Scene selector is a short dock immediately above bottom navigation, with compact Scene 1/2/3 buttons and the existing Copy Scene action.
- Remove the separate floating model-name/previous-next dock visually. Keep current model selection through the existing block/model dropdown.

## Implementation boundaries

- The single existing `#knobs` mount has been moved into `.main-editor-card`. Existing `parameterControls()`, `parameterValueForControl()`, `sendBlockParam()`, knob pointer/keyboard handlers, discrete switches and parameter selects continue to render through the same path.
- Four-column knob grid row count is derived from actual model parameter count; dial size adapts to available viewport height.
- Existing `#blockQuickSelect` remains the visible model selector. Existing hidden modelSelect/modelPrev/modelNext and dock IDs remain in the DOM only for backwards compatibility with the existing render function; the former floating dock is not displayed.
- Existing `sceneButtons`, `sceneSelect`, scene button event handlers, MIDI CC 80 scene switching and Copy Scene menu are retained. Only visual placement/text arrangement changes.
- Signal chain renderer and bypass state remain unchanged; CSS hides the per-card small text and uses the existing `.off` class to dim inactive effects.
- No MIDI/SysEx packets, parameter encoders, scene mapping, NAM, Tone3000, User/Third Party IR, IR Collection, preset format, signal-chain order, USB audio, Android WindowInsets or MIDI/CC mapping implementation intentionally modified.

## Validation

- Added/updated regression tests for the single inline knob mount, one-screen non-scroll layout, docked scenes, four-column dynamic rows and preserved live event/MIDI wiring.
- Signed Release workflow should run on this branch and increment from Community .6 to .7 with the same signing keystore. CI results to be appended after workflow completion.
- Physical Android screenshot/device validation remains required after installation.


## Responsive-fit follow-up

- Changed the mobile Editor flex sizing to use remaining app content height rather than a forced 100% child height; this avoids overrun once native top/bottom insets and the fixed app header/navigation are accounted for.
- Removed the legacy Editor page entrance transform on the mobile reference page. The fixed Scene dock therefore remains viewport-positioned rather than inheriting a transformed containing block.
- Added `fitInlineParameterDials()`, which measures the live #knobs grid height and actual row count after rendering and sets a visual dial diameter. It also recalculates on viewport resize/orientation change. This affects only dial dimensions, not parameter values, encoders, input handlers, or MIDI writes.
- Updated regression tests to verify the measured dial sizing and exact source IDs.


## CI iteration — DOM assertion updated

- First CI run `42455295027` and follow-up `42455835956` both stopped in regression tests before Android build. Each run had 322/323 tests pass. The sole failing test searched for the AMP card close using the pre-move adjacent HTML pattern `</div><details...`; the new Editor card retains hidden selects and draft controls before the card closes. Updated test to use the following quick-panel boundary as the parent card end. No runtime/parameter behavior change was needed.


## Signed Community .7 build — SUCCESS

- Final source commit used by the build: `9cbec5c9ff2d7ca3de7cf2b626cdb5b1b620316c` (`test: assert inline parameter mount in updated editor card`).
- GitHub Actions run: `42455928929` — all 14 workflow steps completed successfully except the optional draft-release step, which was intentionally skipped.
- Regression suite: `323 tests`, `323 passed`, `0 failed`.
- Keystore decoding, password and alias validation passed.
- Android project generation passed; Gradle `assembleRelease` completed with `BUILD SUCCESSFUL`.
- APK verification passed with APK Signature Scheme v2 and one RSA 4096-bit signer.
- Package identity: `com.vaivaii.mg30studio`; versionName `1.0.0-community.7`; versionCode `7`; min SDK `24`; target SDK `36`.
- APK SHA-256: `77fc5b7e5a825fbfde45f9c6d72acb9046355d4220da89af68785a3fd44c5d9e`.
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13607950445`, run `42455928929`.
- Built APK was extracted and its provided SHA-256 sidecar independently checked in the working environment; result: `OK`.
- This proves CI regression/build/signature/package validation only. Physical Android installation, screenshot/layout validation and MG-30 hardware smoke testing remain pending; do not mark those as passed until explicitly tested.



## Fixed reference layout — Community .8 implementation

### Source change

- Branch: `feature/editor-reference-one-screen`.
- UI implementation commit: `1121d4444e14fb14846a3109dfcea1b3609d6a2a`.
- Restored the visible `TONE WORKSPACE` / `Tone Editor` heading; CTRL/EXP and Save to Device remain horizontally aligned to its right. Hardware preset strip follows the header.
- Signal Chain retains its heading, 12-block count and routing-edit control. The descriptive paragraph and per-block model/status captions are hidden; block icon and block ID remain visible in compact horizontal cards. Horizontal chain swipe is retained; the Editor page itself does not vertically scroll.
- AMP/effect editor remains one live card: existing block selector and ON switch, artwork, Based on caption and four-column parameter grid. SVG artwork is bounded with `object-fit:contain` so AMP and non-AMP graphics fit rather than crop.
- The Scene dock replaces the legacy AMP previous/current/next model dock at the bottom of the Editor, directly above app tabs. It contains Scene 1/2/3 and one Copy icon; no duplicate Copy Scene label. Legacy model-dock markup/IDs remain hidden for compatibility with the existing renderer.
- Copy Scene popup is positioned above its trigger (drop-up) and constrains its own height where needed.
- The final CSS layer is authoritative over older accumulated responsive styles. Editor viewport is fixed; the app tab bar remains separate from Android system navigation.
- New `www/editor-viewport-fit.js` measures the actual app-navigation top edge and Scene dock height, then sets Scene bottom clearance and Editor workspace reserve. It responds to ResizeObserver, resize, orientationchange, pageshow and visualViewport changes, avoiding a fixed guess for 3-button versus gesture navigation.
- `fitInlineParameterDials()` now measures both available row height and column width and observes the live knob container. This is presentation-only: the existing parameter renderer, values, encoder logic, pointer/keyboard handlers, discrete controls, block selector and MIDI writes remain unchanged.
- Native Android WindowInsets / MainActivity code was not changed.

### Protected behavior

- No modifications to NAM import/transfer, TONE3000, User/Third Party IR import, IR Collection, preset serialization, MIDI/CC mappings, SysEx packets, scene CC 80 mapping, signal-chain order/bypass renderer, USB audio, or device protocol.
- The 12-block signal-chain order/routing behavior and scene-copy implementation remain the existing code paths. Only display layout and popup placement changed.
- Physical-device verification is still required for visual pixel matching across this phone's 3-button and gesture navigation modes, and for MG-30 hardware interaction. CI cannot prove exact screenshot parity or physical hardware behavior.

### Signed Community .8 CI result — SUCCESS

- Exact source commit: `1121d4444e14fb14846a3109dfcea1b3609d6a2a`.
- GitHub Actions run: [42475033471](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42475033471).
- Regression suite: **329 tests, 329 passed, 0 failed**.
- Keystore password and alias validation: passed.
- Android project generation: passed.
- Gradle Release build: `BUILD SUCCESSFUL`.
- APK Signature Scheme v2 verification: passed; RSA 4096-bit signer.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b` (same Community signing certificate).
- Package ID: `com.vaivaii.mg30studio`; versionName `1.0.0-community.8`; versionCode `8`; min SDK `24`; target SDK `36`.
- APK size: `3,563,526` bytes.
- APK SHA-256: `2b37ba2b48004c895be1c0cafd0550cff26549ebbf3888be4be7363ca1bda163`.
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13614704529`; artifact ZIP digest `sha256:d95bc46d98bc1f158289de17c8b275d389d616fda5f29e80be23985f9f1c1503`.
- The downloaded audit artifact contained the signed APK and CI sidecars; the APK's sidecar checksum independently verified `OK`, and a separate user-facing APK file plus checksum sidecar were created.
- This records automated test/build/signature/package validation only. Do not mark physical installation, screenshot parity or live MG-30 hardware smoke tests as passed until the user validates them.



## Reference mismatch correction — Community .9

### Evidence from installed Community .8 screenshot

The user supplied a same-resolution pair (691×1536) showing Community .8 versus the required reference. Community .8 was not accepted visually. Specific mismatches:
- Preset strip, Signal Chain panel and global/editor headers consumed too much vertical space versus the reference.
- Signal Chain descriptive text remained visible because a previous selector had greater CSS specificity than the new override.
- Per-block cards were too wide, so fewer blocks were visible than the reference strip.
- The AMP category caption remained visible; AMP artwork was undersized relative to its card; the remaining vertical area for inline knobs collapsed and only partial dial/range fragments were visible.
- Scene dock used fixed positioning inside the Editor while app tabs were separately fixed; on edge-to-edge Android the fixed app tabs did not reserve the native system navigation area, leaving a large gap/incorrect overlap depending on navigation mode.

### Community .9 corrections

- Candidate version: `1.0.0-community.9`, versionCode `9`, same signing certificate as prior Community candidates.
- Main source implementation commit: `54973e8945213ceb0fb8dedd09531eb82b0673a6`; follow-up syntax/test commits: `ec50d47f5b7383ee9cb160ac5baf9ca05921188d`, `899334d8f6571195698a4d4674b4de6b3a9b4115`, `69b2cb2b5529b89550779096d9cac7c1d83cb5ca`, `07a5631280ed477caad6b8ac06cdd41cb1b83602`.
- Rescaled Editor vertical dimensions for 691×1536 phone reference: topbar 38 CSS px, preset row 42 CSS px, Signal Chain 88 CSS px, Scene dock 62 CSS px. The AMP card flexes into the remaining content height to give the knob grid two full rows.
- Restored/kept the tab title and horizontal CTRL/EXP + Save to Device layout.
- The Signal Chain paragraph is hidden with a selector matching the stronger previous cascade; block model/status captions remain hidden. Blocks are 44 CSS px wide, show icon + block name only, and explicit left/right arrow buttons scroll the original chain element without replacing its renderer or order logic.
- Preset strip adds the divider and pencil glyph visually; the existing preset jump/name trigger and event path remain unchanged.
- AMP header gains the visual divider separators; AMP artwork is enlarged and constrained with `object-fit:contain`. The AMP category caption is hidden so the reference only retains the Based on line. Non-AMP artwork has bounded width/height and uses contain sizing.
- Scene dock is now a normal-flow final flex child after the AMP editor, rather than a fixed overlay. It occupies the bottom dock position directly above the fixed app tab bar.
- App tab bar bottom is offset by the live Android navigation-bar inset. The generated Android `MainActivity` now exposes only `getNavigationBottomInsetDp()` through a small WebView JavaScript interface, sourced from `WindowInsetsCompat.Type.navigationBars()`. CSS/JS use it to lift the app tabs above 3-button or gesture navigation. The workspace reserve is calculated from measured app-tab height + system bottom inset + scene gap.
- No changes to NAM/IR transfers, parameter or knob renderer/event handlers, MIDI/CC mapping, scene CC 80 logic, SysEx, preset serialization, signal-chain order/bypass data, USB audio, or MG-30 device protocol.

### Successful CI and APK audit — Community .9

- Exact build source commit: `07a5631280ed477caad6b8ac06cdd41cb1b83602`.
- GitHub Actions run: [42478061304](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42478061304).
- Regression suite: **330 tests passed, 0 failed**.
- Native Android project generation: passed.
- Gradle signed Release build: `BUILD SUCCESSFUL`.
- Keystore/password/alias validation: passed.
- APK Signature Scheme v2 verification: passed, one RSA 4096-bit signer.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Package ID: `com.vaivaii.mg30studio`; versionName `1.0.0-community.9`; versionCode `9`; min SDK `24`; target SDK `36`.
- APK size: `3,565,854` bytes.
- APK SHA-256: `e14095fa350e95350ea09f0839a4b4b49967d1b8739783eca935c3468b37f0ec`.
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13616860328`; ZIP SHA-256 `cf2b20cea517c855a13235873687f258880ce46d4ba4fdfbc194c32bd56ed6c8`.
- Downloaded audit ZIP was unpacked locally; its APK SHA-256 sidecar independently matched the APK exactly.
- The final APK bundle was checked to include the v3 responsive CSS, Signal Chain arrow markup and Android inset bridge module.
- Physical Android installation and screenshot matching in both 3-button and gesture navigation modes remain pending. CI verifies source/tests/build/signature/package only; do not state that the physical visual match is proven until the user checks it.



## Community .10 — CSS cascade audit and final fixed viewport correction

### Root-cause audit from the user's installed .9 screenshot

The .9 build still did not match the supplied UI reference. The visual symptoms were traced to specific code-level conflicts:
- `www/ui-redesign.css` still ended with a legacy `Final compact mobile Editor layout` block, followed by an `Android 3-button / compact-height recovery` block. Those late rules made the Editor page vertically scrollable, returned the main AMP card to auto height, reserved a fixed artwork/caption block, and restored category captions.
- The legacy responsive stylesheet retained higher-specificity mobile rules for the preset row (70px minimum), Signal Chain panel (content-sized with a two-line explanatory paragraph), block cards (72px minimum), and the AMP card. The weaker .9 inline stylesheet did not consistently win the cascade.
- The AMP/pedal parameter nodes were still rendered by the original `renderEditor()` function, but their parent `.editor` and `.main-editor-card` were given auto height by the legacy recovery rule. Consequently, the flex-growing `#knobs` grid had no defined remaining height and collapsed to clipped dial arcs.
- The Scene dock was already moved into normal DOM flow, but `editor-viewport-fit.js` measured the Android navigation inset a second time. `scripts/init-android.mjs` generated a `MainActivity` that applies system-bar insets as padding on `android.R.id.content`; the extra JavaScript bottom offset therefore counted the same system inset again and left a large gap above the app tabs.

### Community .10 corrections

- New final responsive style: `editor-reference-final-v4`, appended after previous styles with selectors matched to / stronger than the old high-specificity rules.
- Removed the obsolete final compact mobile Editor style block and the Android scroll-recovery block from the end of `www/ui-redesign.css`. This removes the contradictory scroll/auto-height behavior instead of layering another competing override on top.
- Restored a fixed flex layout for the page Editor, editor card and model parameter area. The main AMP/pedal card now receives the remaining viewport height; `#knobs` is a four-column dynamic grid with a flexing height. The existing `fitInlineParameterDials()` remains presentation-only and now caps the adaptive dial at 66px.
- Preset row is forced to 42 CSS px and the generated pencil pseudo-element is disabled; existing preset jump/name click behavior and previous/next/favorite actions remain in the DOM.
- Signal Chain is forced to 88 CSS px with a 21px heading/actions row and a separate block row. Its explanatory paragraph and per-block model/status captions are hidden. Existing chain renderer, selection, drag reorder, routing state and horizontal scroll behavior remain; explicit left/right strip arrows remain.
- Artwork stage is forced to 116 CSS px with `object-fit:contain` for AMP and non-AMP categories. Only the category caption/disclaimer is hidden; the renderer still supplies category metadata and the Based on caption. Artwork is visually bounded and centered.
- Scene dock is compacted to 54 CSS px, retained as a normal-flow sibling after the Editor card, directly above app navigation. The old floating AMP model dock stays hidden.
- App navigation is fixed to `bottom:0` in the WebView content viewport. The existing native `MainActivity` already pads the WebView host using `WindowInsetsCompat.Type.systemBars()`; the redundant WebView JavaScript inset bridge was removed from `scripts/init-android.mjs`, and `editor-viewport-fit.js` now reserves only measured app-tab height + the small Scene gap. No double system-bar offset remains. This works against the WebView's native-inset safe viewport in both system navigation modes.
- The global NUX wordmark is restored to a wider proportion; the Editor tab heading and horizontal CTRL/EXP + Save to Device actions remain intact.
- Copy Scene continues using the upward popup introduced earlier.
- No parameter protocol, knob renderer, parameter event handler, discrete control mapping, MIDI/CC mapping, SysEx frame, NAM import/transfer, User/Third Party IR import, IR Collection logic, preset serialization, signal-chain model order, USB audio recorder, or MG-30 hardware command changed. Changes in this iteration are presentation/layout, removal of a redundant visual-only inset bridge, and test expectations.

### Successful signed build — Community .10

- UI implementation commit: `4e66b8953d947222a87a91d1f33ef458bd71c7fd`; final test commit used as exact build source: `7010f340a8bc54c35f1cc3c03afd5dedbe53a87c`.
- GitHub Actions run: [42484189724](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42484189724).
- Regression suite: **332 tests passed, 0 failed**.
- Keystore password and alias validation: passed.
- Android project generation: passed.
- Gradle Release build: `BUILD SUCCESSFUL`.
- APK Signature Scheme v2 verification: passed with an RSA 4096-bit signer.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b` (same Community signing identity).
- Package ID: `com.vaivaii.mg30studio`; versionName `1.0.0-community.10`; versionCode `10`; min SDK `24`; target SDK `36`.
- APK size: `3,566,966` bytes.
- APK SHA-256: `8eee70e9a6431c3ac634a85c06d4b3b91c54fc2e843590a19731b22072373838`.
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13618448488`; ZIP digest `sha256:237ac776479b99a89f9117580d6c2596a9cfb4f5be5d72dabf6aeabf5b06e27f`.
- Downloaded audit ZIP was unpacked locally. APK file size, package/version metadata and sidecar SHA-256 were independently checked; SHA-256 matched exactly.
- The built APK's `assets/public/index.html` was inspected and contains `editor-reference-final-v4` and the Signal Chain scroll arrows. The bundled stylesheet was inspected and no longer contains either legacy final mobile Editor override marker.
- CI confirms tests/build/signature/package integrity. Physical screenshot parity in both 3-button and gesture navigation modes and MG-30 hardware smoke testing remain pending; do not claim exact 100% visual parity until the user installs and checks the build.



## Community .11 — Vite cascade order fix and measured Scene dock

### Additional root cause found from the signed .10 APK itself

A direct inspection of the built APK's `assets/public/index.html` revealed that Vite injects the compiled `assets/index-*.css` link near the end of `<head>`, **after** the source inline styles `editor-reference-final-v4`. Therefore, even though v4 was authored after the original source styles, the generated CSS bundle was later in the runtime cascade and could override equal/higher-priority legacy mobile rules. This explains why the .10 source contained a 42px preset rule while the installed screenshot still showed the preset row at the older oversized height; it also explains why the dock positioning rules were only partially applied.

### Community .11 corrections

- Added `editor-reference-final-v5` and a runtime `moveEditorReferenceStylesAfterBundledCss()` installer. After DOMContentLoaded (after Vite's stylesheet has loaded), it appends `editor-reference-final-v4` and `editor-reference-final-v5` to the end of `document.head`, in that order. The generated CSS bundle can no longer supersede the final Editor styles.
- Preset strip now has explicit `height`, `min-height`, `max-height`, `block-size`, and `max-block-size` all locked to 42 CSS px, with internal slot and controls bounded to the card. This prevents intrinsic flex content from reopening the old taller row.
- Scene dock is now a fixed dock anchored directly above the actual application tab bar. `editor-viewport-fit.js` measures the actual navigation top, page bottom and Scene dock height using `getBoundingClientRect()`, then derives `--editor-scene-dock-bottom` and `--editor-workspace-reserve`. The geometry adapts to a WebView whose bottom is already reduced by native system insets, and to a viewport where the app tab bar occupies its own bottom region. This replaces a fixed guessed reserve.
- Signal Chain is kept at 88 CSS px; heading/actions and icon/name block row are explicitly sized so block cards retain their full 46 CSS px height without descriptive captions.
- AMP block ON/OFF container is now a rounded pill with a complete 1px border and 999px radius, rather than the earlier rectangular/left-divider appearance.
- A subtle horizontal top border and padding are added to `#knobs`, separating the parameter grid visually from the AMP artwork and Based on line.
- `computeEditorViewportFit` pure tests cover both gesture-mode geometry (page bottom at the viewport edge) and 3-button / already-inset WebView geometry (page bottom at the navigation top), plus compact height geometry.
- Hardware parameter rendering, dial handlers, discrete switches, MIDI/CC/SysEx, scene CC 80 logic, preset save and serialization, NAM import, User/Third Party IR import, IR Collection transfers, signal-chain order, and USB audio routes remain unchanged.

### Successful signed build — Community .11

- Exact build source commit: `320d2466f92c6c57fed11b583e9cc281cb5c98c1`.
- GitHub Actions run: [42486773755](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42486773755).
- Regression suite: **332 tests passed, 0 failed**.
- Keystore and alias validation: passed.
- Android project generation: passed.
- Gradle Release build: `BUILD SUCCESSFUL` (1m 22s).
- APK Signature Scheme v2: passed; RSA 4096-bit signer.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Package: `com.vaivaii.mg30studio`; versionName `1.0.0-community.11`; versionCode `11`; min SDK `24`; target SDK `36`.
- APK size: `3,568,450` bytes.
- APK SHA-256: `8f4b5ee062702cb400b6996bd58acd3fa9b3087297d363229f1689a77c174187`.
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13620310356`; ZIP digest `sha256:9eb78cf97ac7b6ca29b5053bdaca55a6ff9c781f97e5c066fa86a0bf7cc1c015`.
- Audit ZIP downloaded and extracted locally; APK size and SHA-256 sidecar verified independently.
- Built APK inspection: `editor-reference-final-v4` and `editor-reference-final-v5` are included; Vite CSS link appears after the source style tags; the runtime cascade installer is included after the module script tags; its append operation restores v4/v5 to the end of the generated head cascade. v5 preset hard-cap, measured Scene dock variables, AMP divider and rounded toggle rules are present in the built bundle.
- CI proves tests, signed build, package identity and checksum. A physical installation/screenshot check in the user's gesture-navigation mode remains the final visual acceptance gate. Do not claim exact visual parity until that screenshot is reviewed. 3-button mode should also be smoke-tested when available.



## Community .12 — preset / NAM / discrete-switch / cabinet selector polish

### User screenshot findings

The user supplied fresh MG-30 Gen 2 screenshots covering:
- NAM Profile amp slot (QuickTone Slot 01 · ID 54), with long subtitle crowding the AMP heading.
- Built-in amp models with the normal `Model N` subtitle.
- Built-in AMP and modulation/effect models containing two- and three-position discrete controls, where switch buttons were squeezed into one quarter-width knob-grid cell and labels wrapped vertically.
- IR/Cabinet controls still showing Indonesian placeholder text `Pilih mic` and `Pilih posisi`.
- Preset name text that sat too high within its preset card.

### Source changes

- Candidate: `1.0.0-community.12`, Android versionCode `12`.
- Branch: `feature/editor-reference-one-screen`.
- Source implementation commit: `d4ac95fbf8acd94f49b32670eaa05c995e3e0472`.
- Renderer/test repair commit: `24a765345d36652a9e5ad2ef290b0a46cd409f2c`.
- Added `editor-reference-final-v6`, included in the runtime cascade installer after Vite's generated CSS alongside v4/v5. It remains an Editor-only visual layer.
- Preset name: explicitly centers `.hardware-preset-name-trigger` and its label vertically within the compact 42px preset row; existing previous/next/favorite/preset jump handlers are unchanged.
- NAM subtitle: `renderEditor()` leaves the `editorSub` empty and marks the AMP heading with `is-nam-profile` only when `ampNamProfileForModelIndex()` identifies a custom NAM slot. The v6 style hides that subtitle and vertically centers the AMP title. Built-in AMP models continue to show their normal `Model N` sublabel.
- Discrete parameter grid: added `parameterGridRowCount(controls,4)`, allocating 2 columns for each `isDiscreteSwitch(control)` and 1 column for a normal dial. The matching v6 CSS gives each discrete switch `grid-column:span 2`, places its two/three choices in an explicit horizontal grid, prevents vertical writing and disables aggressive word breaking. This fixes narrow stacked letters for controls such as CONTOUR, LO/HI MIDS FREQ, UP/DOWN, MODE and similar hardware discrete controls. Switch choices, `data-switch-value`, readback, active state, stored raw values, and click handlers are unchanged.
- Cabinet placeholders now read `Select mic` and `Select position`. `MIC_OPTIONS`, `MIC_POSITION_OPTIONS`, parameter IDs `mic`/`position`, enum indices, `encodeParameterValue`, `normalizeParameterValue`, and `sendBlockParam` are unchanged.
- No changes to MIDI CC number mapping, discrete-switch value inversion rules, SysEx, NAM transfer, User/Third Party IR import, IR Collection, preset save/serialization, signal-chain order, or USB audio.

### Regression / signed build — SUCCESS

- Exact source commit built: `24a765345d36652a9e5ad2ef290b0a46cd409f2c`.
- GitHub Actions run: [42492053138](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42492053138).
- Regression suite: **337 passed, 0 failed**.
- Inline JavaScript syntax validation: passed.
- Keystore / alias validation: passed.
- Android project generation: passed.
- Gradle Release: `BUILD SUCCESSFUL`.
- APK signature verification: Signature Scheme v2 valid; RSA 4096-bit signer.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b` (same Community signing identity).
- Package: `com.vaivaii.mg30studio`; versionName `1.0.0-community.12`; versionCode `12`; min SDK `24`; target SDK `36`.
- APK size: `3,569,318` bytes.
- APK SHA-256: `a1f4bd36e980bf42dbe607dfa1446857593702e7bb08936bfba29b7719bd3162`.
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13621428155`; artifact ZIP SHA-256 `a1b4cb334416c192d7239108f3e1f4ea9d7876e49db6a3ab23b785136027e21c`.
- Downloaded audit ZIP was unpacked locally. APK's sidecar checksum matched independently using `sha256sum`.
- Direct APK bundle inspection confirmed `editor-reference-final-v6`, `parameterGridRowCount(controls,4)`, two-column discrete switch CSS, the NAM subtitle class, and English cabinet placeholders are present; the old Indonesian cabinet placeholders are absent.
- The built APK still contains `sendBlockParam`, `normalizeParameterValue`, `data-switch-value` and the existing event-binding paths. This is source/bundle integrity evidence, not a live hardware interaction test.
- Physical MG-30 testing and visual confirmation of the two-column discrete switches on the phone remain pending user installation; do not state that live parameter writes were verified by CI.



## Community .13 — discrete switch footprint / routing connector / Device scroll

### User screenshot findings (2026-11-08)

The user supplied screenshots showing three remaining defects in Community .12:
1. Two-position WAH/EFX switches were stretched to the full grid-row height, making the boxes excessively tall. Each choice also showed duplicated text (e.g. small `UP` caption plus bold `UP`, or `OFF` twice).
2. MOD → DELAY / DELAY → REVERB connector cards were squeezed to 22 CSS px, clipping the topology icon.
3. Device & Settings was inside the fixed app shell, whose global overflow is hidden, but the Device page had no independent vertical scrolling viewport. The bottom Tone3000 settings therefore could not be reached reliably with Android system navigation.

### Community .13 source changes

- Candidate versionName: `1.0.0-community.13`; Android versionCode: `13`.
- Branch: `feature/editor-reference-one-screen`.
- UI commit: `ca1ecda66f619d30af2b927f954134b49ec02b64`.
- Regression contract update: `a56068a3fae31f59a6a01ca66b34e3ded7fe34a6`.
- Added final mobile stylesheet `editor-reference-final-v7`, installed after v4–v6 and the Vite generated CSS by the existing late-cascade installer.
- Discrete controls: two-way and three-way control cards remain two grid columns wide but are capped at 224px width and 116px height; their option row/buttons are capped at 94px and vertically centered. This prevents them from inheriting the full tall grid row. The `.knob-two-way .switch-position` caption is hidden so `UP/DOWN` and `OFF/ON` labels are not rendered twice. Three-way hardware position captions remain visible when the position and choice label differ.
- Routing cards: final width is 38px, with a 28px icon container/SVG and 46px card height so the routing topology glyph fits within the card. Existing routing buttons, `data-routing-bit`, serial/parallel state, MIDI connection/busy disabling and event handlers are unchanged.
- Device page: `#page-device:not(.hidden)` now owns a flex scroll viewport (`min-height:0`, `overflow-y:auto`, momentum scrolling, pan-y touch) and 92px plus safe-area bottom padding so its final settings sections can scroll above the fixed app tabs. The app shell and app navigation remain fixed; Android MainActivity continues to apply native WindowInsets, with no second JavaScript system-bar offset.
- No changes to NAM/IR import, Third Party mapping, IR Collection, MIDI CC mapping, parameter values, preset state, SysEx, signal-chain model order, or hardware command handlers.

### Regression and release result — PASS

- GitHub Actions run: [42498656656](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42498656656).
- Exact build source commit: `a56068a3fae31f59a6a01ca66b34e3ded7fe34a6`.
- Regression suite: **341 tests passed, 0 failed**.
- Keystore/alias validation: passed.
- Android project generation: passed.
- Gradle signed Release: `BUILD SUCCESSFUL in 1m 39s`.
- APK Signature Scheme v2: verified successfully; RSA 4096-bit signer.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Package: `com.vaivaii.mg30studio`; versionName `1.0.0-community.13`; versionCode `13`; min SDK `24`; target SDK `36`.
- APK size: `3,570,002` bytes.
- APK SHA-256: `6f49cda05b821ca43b653471a5eccc01672f3236fbc9b1d59212be3f5555bb01`.
- Artifact ID: `13624348965`; artifact ZIP digest `sha256:2c8127efe29a2265d609692250636a68b40531f6854c79c62a4ad036ebc7f3fa`.
- Downloaded audit ZIP was extracted; APK byte size and independent SHA-256 calculation match the included sidecar checksum. The APK signature file states V2 verification true.
- Direct APK bundle inspection confirmed `editor-reference-final-v7`, the capped switch CSS, duplicate two-way caption suppression, 38px routing card CSS, and `#page-device` vertical scrolling rules are present in the final APK.
- Static/integration CI confirms source/package integrity; actual touch-scrolling behavior on the user's Android phone and final visual parity remain to be confirmed after installation.



## Community .14 — compact discrete-control tiles and Signal Chain header cleanup

### User screenshot findings

The latest screenshots show that Community .13's two-way / three-way selection cards remained excessively tall, filling much of the parameter grid row. For controls such as UP/DOWN and OFF/ON, the selected-state cards were tall slabs rather than proportional tiles. The Signal Chain heading also retained the `12 blocks` chip and an edit-order icon placed too close to the pedal strip.

### Community .14 source changes

- Candidate versionName: `1.0.0-community.14`; Android versionCode: `14`.
- Branch: `feature/editor-reference-one-screen`.
- Added final stylesheet `editor-reference-final-v8`, appended after Vite CSS by the existing late-cascade installer.
- Removed Community .13's oversized discrete-switch rules (116px card / 94px option row) from the source v7 stylesheet rather than merely overriding them.
- Discrete controls are compact content tiles: 68px total height and 52px choice buttons. Two-way controls cap at 164px width (152px on narrow screens); three-way controls cap at 210px (194px on narrow screens). Both occupy two logical parameter columns and center within their grid area; they no longer stretch to the full row height.
- Two-way controls continue to hide duplicate position captions; button choices and `data-switch-value` values are unchanged. Three-way controls retain TOP/MIDDLE/BOTTOM captions where the hardware position is distinct from the selected value.
- Removed the visible `12 blocks` chip from Signal Chain markup.
- Replaced the Signal Chain edit-order SVG with a text-only `EDIT` button. The original `chainEditToggle` id and `setChainEditMode()` handler remain; while editing, the label changes to `DONE`. The heading row and pedal strip have a defined 6px separation; the action uses a compact 50×22px footprint on its own header row.
- Existing signal-chain renderer, routing controls, horizontal arrows, order mutation, hardware sync, MIDI CC mapping, discrete-switch values, NAM/IR, Third Party import, IR Collection, preset serialization and Device scroll remain unchanged.
- No changes outside Editor parameter tile presentation and the Signal Chain header presentation are intended.

### Regression / signed build

- Full Node regression suite and signed Community Release workflow must pass before distributing the APK.
- Do not claim physical MG-30 verification based solely on CI.
