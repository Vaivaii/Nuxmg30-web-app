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



### Community .14 build result — verified signed APK

- Final source commit used by Actions: `3da645f537103f79ec7a21ce636a3031bbf95fde`.
- UI implementation commit: `7bf29c22129a191b8bb637658eae105dce785e97`.
- Regression test correction commits: `7a59609df8d8e990a648cd81b88476659dae4d5e` and `3da645f537103f79ec7a21ce636a3031bbf95fde`.
- GitHub Actions run: [42501013321](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42501013321).
- Regression suite: **343 tests passed, 0 failed**.
- Keystore/alias validation, Android project generation and signing metadata: passed.
- Gradle Release: `BUILD SUCCESSFUL in 1m 18s`.
- APK Signature Scheme v2: valid; one RSA 4096-bit signer.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Package: `com.vaivaii.mg30studio`; versionName `1.0.0-community.14`; versionCode `14`; min SDK `24`; target SDK `36`.
- APK size: `3,570,390` bytes.
- APK SHA-256: `a956432182f76cd5ec2d04a8982586522af74a754ed5ceb75675b47007d6a9b1`; matched the CI sidecar exactly and independently recomputed after extraction.
- Artifact ID: `13625825888`; artifact ZIP digest: `sha256:b095183d723eb417d8711278379ab73029625952b4792d15eb26412e1c871fba`.
- Extracted and inspected `assets/public/index.html` inside the actual APK. Confirmed final v8 style node and installer are present; 68px discrete-control and 52px option heights are bundled; the superseded 116px/94px discrete-switch rules are removed from v7; the remaining 116px declaration in the bundle applies only to model artwork stage / gear-art, not parameter switches; no `12 blocks` label remains in Signal Chain markup; the edit icon class and SVG are absent; `EDIT` text and dynamic `DONE` label handler are present.
- This confirms build and static bundle integrity. Final screenshot parity and actual switch hardware writes still require the user to install and verify on the original MG-30 Gen 2; do not state that physical hardware behavior was verified by CI.



## Community .15 — NAM Slot subtitle and modal hardware preset chooser

### User request / screenshots

- Restore the subtitle below AMP when an AMP model is a NAM profile, showing the one-based slot label `NAM Slot 1`, `NAM Slot 2`, etc. instead of the long QuickTone slot / ID string.
- Replace the current preset selector's four-column slot-number grid with a popup/modal window containing a vertical, scrollable list of hardware preset slots. Each row displays slot code and preset name, visually following the preset cards/list already used in Preset Manager. After tapping a slot, use the existing hardware slot selection handler and automatically close the popup.

### Implementation scope

- Candidate `1.0.0-community.15`, versionCode `15`.
- Branch `feature/editor-reference-one-screen`.
- NAM subtitle is assigned from the existing `ampNamProfileForModelIndex()` result: `NAM Slot ` + `profile.slot`. Removed the v6 rule that hid the NAM subtitle. No NAM slot index mapping, profile lookup, QuickTone ID, NAM transfer, or slot cache is altered.
- Preset chooser container is now a native `<dialog>` using `showModal()/close()`; Escape/cancel and backdrop click close it and update `aria-expanded`.
- The 128-row vertical list reads names from the same Preset Manager localStorage cache key `mg30-preset-library-card-names-v1`, with the currently loaded hardware preset name taking precedence for the active slot. Slot identifiers are generated with the existing `slotName(program)` helper. Unscanned slots display `—` until Preset Manager reads their names.
- Selecting a row closes the modal and calls the original `selectHardwareSlot(slot,false)`. The old Program Change, preset synchronization/read flow, favorite button, previous/next slot controls, and Preset Manager module `www/preset-library-ui.js` are untouched.
- No changes to MIDI CC mapping, SysEx, preset buffer writes, NAM import, IR User/Third Party import, IR Collection, scene switching, signal-chain ordering, Device behavior, or USB audio.

### Regression / signed build

- Added tests for one-based NAM slot subtitle, modal semantics, vertical scroll list, cached Preset Manager preset names, auto-close, reuse of the existing slot selection function, and late stylesheet cascade.
- Full Node regression suite and signed Community Release workflow must pass before distributing APK.
- CI proves source/build integrity only; actual hardware preset selection and visual popup behavior still require phone verification.



### Community .15 build result — verified signed APK

- Final source/test commit used by GitHub Actions: `e9ab0933093d563aec3bd57e86bad231474b1df1`.
- UI implementation commit: `1fce7b6cf557b1072b6698daf677be64fec9a9c0`.
- Regression contract correction commit: `e9ab0933093d563aec3bd57e86bad231474b1df1`.
- GitHub Actions run: [42507269250](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42507269250).
- Regression suite: **346 passed, 0 failed**.
- Keystore / alias validation, Android project generation and signing metadata: passed.
- Gradle Release: `BUILD SUCCESSFUL in 1m 43s`.
- APK Signature Scheme v2: verified successfully; one RSA 4096-bit signer.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Package: `com.vaivaii.mg30studio`; versionName `1.0.0-community.15`; versionCode `15`; min SDK `24`; target SDK `36`.
- APK size: `3,571,754` bytes.
- APK SHA-256: `c1ab305c851719c32079ec8a44ba4ae50577e8d7b44cdab0a9a619543bcc76f0`; matches the included sidecar and was independently recomputed after extracting the APK.
- Artifact ID: `13628071152`; artifact ZIP digest: `sha256:89e7ae11efc7d7729c1466577fbad25618a918b204267af1fb3fee0447aba8d1`.
- Direct APK inspection of `assets/public/index.html` confirmed the native `<dialog id="presetJumpMenu">`, `preset-jump-list` vertical list, cache key `mg30-preset-library-card-names-v1`, `menu.showModal()`, `menu.close()`, and one-based `NAM Slot` subtitle logic are bundled. The old `preset-jump-grid` markup is absent.
- Package info and signing output were inspected from the downloaded audit bundle. The final signed APK and sidecar were copied to the stable `/mnt/data/NUX-MG30-Studio-Community-15.apk` paths and verified byte-identical to the APK inside the audit ZIP.
- Source-level tests verify that selection calls the existing `selectHardwareSlot(slot,false)` path and the dialog closes after a choice. Preset Manager module `www/preset-library-ui.js` was not modified; the chooser reads its existing localStorage name cache. Slots whose names have not yet been scanned remain labeled `—` until Preset Manager populates the cache.
- This confirms source, build, signing and bundle integrity. Final modal appearance, hardware slot switching and NAM subtitle alignment still require user installation/visual confirmation on the original MG-30 Gen 2; do not claim physical hardware verification based solely on CI.


## Community .16 — NAM subtitle and Track Settings scroll correction (9 November 2026)

### User-observed defects

- Community .15 displayed NAM Slot 1 inline beside AMP; the requested hierarchy is AMP on the first line and the slot subtitle beneath it, matching built-in AMP headings such as AMP / Model 34.
- In Studio → DAW → Track Settings, the bottom of Project Settings (including the saved Quick Record take section) was covered by the fixed transport and Track Settings sub-navigation. The available scroll range did not move the last content sufficiently above that dock.

### Changes

- Added a final-cascade NAM-only rule to editor-reference-final-v9: the existing heading text wrapper is a vertical flex column and left aligned. The existing NAM Slot N text and profile lookup remain unchanged.
- Added mobile bottom padding of 88px plus safe-area inset to the active #dawTrackSettingsPage. This supplements, rather than replaces, the existing #studio-daw-workspace bottom reserve. The fixed dock itself is not moved or resized.
- No changes to NAM protocol/transfer, IR User/Third Party or Collection, preset selection, MIDI CC mapping, Signal Chain ordering, USB-MIDI, DAW transport, recording, project persistence, or audio routing.
- Added source regression tests for both reported cases.
- Candidate version: 1.0.0-community.16 (versionCode 16). Signed production build, regression suite, package inspection and final verification results follow below.


### Community .16 build, signed APK and bundle inspection — 9 November 2026

- Application source changes: commit `bb61255fc82127e36dd726bc886c1e01482314fd`.
- Final test-only assertion correction: commit `3d55dfefe6c7606f906b58a617276f582555653e`. No app source or runtime behavior changed after the source fix commit.
- Successful GitHub Actions Build #54: [run 42509337120](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42509337120); tested HEAD `3d55dfefe6c7606f906b58a617276f582555653e`.
- Regression suite: **348 passed, 0 failed**.
- Release keystore / alias validation: passed. Android project generation and release signing metadata configuration: passed.
- Gradle: `./gradlew --no-daemon assembleRelease` — **BUILD SUCCESSFUL in 1m 41s**.
- APK verification: APK Signature Scheme v2 **true**, one RSA 4096-bit signer. Certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Package: `com.vaivaii.mg30studio`; versionName `1.0.0-community.16`; versionCode `16`; min SDK `24`; target SDK `36`.
- Signed APK size: **3,571,802 bytes**. SHA-256: `a0b7284be21649b23d1ce51c3682435dd10f2b60fa890695ed8d6c130a96ed70`.
- GitHub audit artifact `MG30-Studio-Community-Signed-Candidate`, ID `13628618604`, ZIP size 3,252,841 bytes; ZIP SHA-256 `3ba625b6eb0240cce37be1a058879fe962b66fbcd714466e8b536a2738b45869`.
- Downloaded audit ZIP integrity and extracted APK ZIP integrity passed. The APK's included checksum sidecar independently matched the extracted APK.
- Direct inspection of the actual APK confirmed: NAM profile subtitle flex direction is column and left-aligned; the existing NAM profile class handler and late v9 style installer remain; Track Settings CSS includes the new 88px + safe-area bottom clearance; the pre-existing fixed Studio dock and DAW transport controls remain in the package.
- The first two CI runs exposed only new-test assertion mistakes (over-escaped selector patterns, then targeting the later variable-only dock override). Those assertions were corrected without changing application source. Final Run #54 passed all 348 tests.
- **Physical-device acceptance remains pending**: install Community .16 on the original NUX MG-30 Gen 2 firmware 6.0.x and visually verify (1) AMP / NAM Slot N two-line hierarchy and (2) scrolling Track Settings fully above the fixed dock. CI and package inspection do not substitute for that phone check.





## Community .17 — NAM/IR Collection and Preset Manager bottom viewport correction (9 November 2026)

- User confirmed Community .16 fixed both previous defects: NAM Slot subtitle is below AMP, and Studio Track Settings now scrolls above its dock.
- New phone screenshots show the bottom of the IR Collection and Preset Manager card areas is still clipped by the bottom app navigation.
- Root cause A (NAM & IR): `ir-transfer.js` creates four direct page rows in order — `nam-page-hero`, `nam-ir-tools-frame`, `namModelLibrary` (inserted by `nam-model-library-ui.js` immediately before `ir-import-content`), and the Collection `ir-import-content`. The active mobile CSS allocated only three grid rows. The Collection therefore landed in an implicit row outside the intended measured viewport. Changed the explicit grid to three max-content rows plus one `minmax(0,1fr)` Collection row. Added 12px bottom padding/scroll-padding to the 24-slot inner grid and a 16px fallback page clearance.
- Root cause B (Preset Manager): `preset-library-ui.js` already measures the real top-header bottom and bottom-nav top and sets `--preset-manager-top/bottom`. A later `ui-redesign.css` mobile override changed that page to `position:relative`, defeating the measured fixed viewport; a second stale relative-scroller override duplicated the conflict. Removed the stale override and restored the fixed measured interval in the authoritative mobile rule. The 128-card list remains the single independent vertical scroller.
- Only `www/ui-redesign.css` changes runtime behavior. Preset and IR transfer JavaScript, MIDI, Collection SysEx frames, WAV import, local storage, preset data, hardware selection, NAM, TONE3000, and the already-correct Track Settings clearance are untouched.
- Added `tests/mobile-scroll-viewport-layout.test.js` to guard the four-row NAM layout, Collection grid end clearance, measured Preset viewport, and the independent Preset card scroller.
- Candidate advanced from Community .16 / versionCode 16 to Community .17 / versionCode 17.
- CI build, signed APK inspection and physical device verification: pending.

### Community .17 verification completed — 9 November 2026

- GitHub Actions run #55: success, commit `99fb897e9cb317c09110e1facbf945175960cc4a`.
- Regression suite: 352 tests, 352 passed, 0 failed.
- Android Release: `BUILD SUCCESSFUL`; signed APK generated.
- APK verification: package `com.vaivaii.mg30studio`, versionCode 17, versionName `1.0.0-community.17`; APK Signature Scheme v2 verified true; SHA-256 checksum check passed.
- Downloaded audit artifact and extracted the exact APK payload. Confirmed the bundled production CSS contains the four-row NAM viewport, Collection 12px end padding and scroll padding, the measured fixed Preset Manager viewport, and the independently scrolling Preset card list. Confirmed bundled JavaScript retains both top/header and bottom/navigation measurements and sets the corresponding CSS custom properties for NAM and Preset Manager.
- No transfer, NAM, TONE3000, MIDI mapping, IR protocol, preset data, or Track Settings runtime code was changed.
- Artifact: `MG30-Studio-Community-17-audit`, run #55, artifact id `13650791831`; APK size 3,571,818 bytes.
- Note: automated regression and packaged-CSS/JS inspection completed. A live Android handset/WebView visual test was not available in this run, so final confirmation of touch scrolling on the target phone remains a device-side check.



## Community .18 — compact IR Collection rows and bottom navigation spacing (9 November 2026)

- User supplied fresh Community .17 screenshots: IR Collection was still using a tall two-column vertical card layout; Preset Manager frame ended too close to the fixed bottom navigation.
- IR Collection is now a single-column list of compact horizontal slot cards: slot number on the left, status/name/source text in the middle, Import WAV and Use in User actions stacked in a fixed right-hand column. Existing slot DOM, button IDs/data attributes, transfer handlers and 24-slot mapping are unchanged.
- The inner Collection list keeps vertical scrolling and now has 14px bottom padding/scroll padding. Fallback WebView mode receives the same compact card presentation.
- Both the IR Collection and Preset Manager viewport controllers now reserve an additional 12px between their visible frame and the measured top edge of the bottom nav. Preset card scroller also receives 16px bottom/scroll padding.
- The five-button bottom nav was shortened slightly: top/bottom vertical padding reduced by 2px, button padding reduced modestly, icon size reduced from 19px to 18px. All five tabs, labels, hit targets and navigation handlers remain.
- No change to IR Collection/User SysEx frame IDs or ACK behavior, WAV builder, 24-slot storage, IR-to-preset assignment map, Preset hardware operations/data, NAM, TONE3000, MIDI mapping, USB-MIDI or Studio.
- Added regression coverage for horizontal card grid, retained Import/Use actions, 24 slots, both 12px viewport gaps, and five-tab nav sizing.
- Candidate release: `1.0.0-community.18`, versionCode 18. CI and package inspection pending.

### Community .18 — release verification completed (9 November 2026)

- Application/runtime source commit: `89eb6b0d85817aa2139eb849adad47261a21623f`.
- Final regression-test-only commit: `f50ec5f9549e7ef39a61d2300b897bf018f5772d`. This corrected four assertions to match the implemented CSS/viewport strings; no further runtime source change after the application commit.
- GitHub Actions Run #57 succeeded: [run 42567326423](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42567326423).
- Regression suite: **355 tests passed, 0 failed**.
- Android Release: `BUILD SUCCESSFUL in 1m 34s`.
- APK package/version: `com.vaivaii.mg30studio`, versionName `1.0.0-community.18`, versionCode `18`, min SDK 24, target SDK 36.
- APK Signature Scheme v2: valid; one RSA 4096-bit signer. Certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- APK size: **3,572,246 bytes**. APK SHA-256: `984233f881131d963f08d973ba95c651543fa211b5dcae97209e78b6d6ea617f`. Extracted APK ZIP integrity: passed (449 entries); embedded checksum matched.
- Direct inspection of bundled production assets verified: one-column compact IR slot list; horizontal card grid columns (slot number / metadata / action buttons); original Import WAV and Use in User data actions remain present; all 24 Collection slots remain in the compiled application; IR and Preset viewport controllers both add 12px below the visible frame; bottom nav has only modestly reduced padding and retains five columns; Preset list adds 16px bottom/scroll padding.
- Test assertion failures in first Run #56 were due to tests using pre-adjustment viewport values and over-escaped regular expressions. Corrected tests use literal assertions; final Run #57 passed. No IR/User/Collection SysEx command, ACK/retry, WAV transfer, 24-slot mapping, preset data/operations, NAM, TONE3000, MIDI mapping, USB-MIDI, or Studio functionality was changed.
- User-side physical Android/WebView confirmation remains pending. CI and bundled APK inspection passed; the exact visual spacing/scroll feel should still be checked on the target phone.
- Audit artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13652031696`, ZIP SHA-256 `961fd8ca6c2015dccb80f5e5b30713c93795b10b07c57f24b7cc94d104628378`.



## Community .19 — IR slot rail and Preset Manager gradient consistency (9 November 2026)

- User tested Community .18 and reported: the IR number tile still showed an incomplete/bright side strip rather than a full filled slot rail; Preset Manager's scrolling card-list gradient did not align with the inner frame.
- IR Collection number tile now uses a 64px full-height dark rail matching the Preset Manager card structure. Its vertical divider is rendered separately with an absolutely positioned pseudo-element (top/bottom 0, 3px width); removed the thick border-right from the number tile itself. The slot remains full-card height, clips cleanly to the card's left radius, and preserves the red "used in current preset" class.
- Preset Manager bottom fade override is placed in `preset-library-ui.css` (loaded after `ui-redesign.css`), restricted to the scroll frame width (`width:100%`), aligned with zero side margins and `bottom:0`, shortened to 36px, and uses one vertical gradient matching the frame's #101619 bottom color. The prior horizontal edge-darkening gradient and negative side margins are removed.
- UI cache token advanced from `stable-ui-3` to `stable-ui-4` to prevent Android WebView from reusing old CSS.
- Added regression tests for full-height IR number rail, independent divider, exact fade width/alignment, and vertical-only gradient.
- No changes to Collection slot mapping/actions/data, IR User/Collection SysEx or ACK handling, WAV transfer, preset operations/data, NAM, TONE3000, MIDI mapping, USB-MIDI or Studio.
- Candidate release advanced to `1.0.0-community.19`, versionCode 19. CI validation pending.



### Final .19 state-marker conflict guard — 9 November 2026

- During direct inspection of the packaged .19 CSS, identified a selector-specificity conflict: the new full-height dark IR slot rail could override the older red `is-used-in-current-preset` marker.
- Added an explicit higher-specificity responsive rule restoring the red background, white number and subtle red outline for slots used by the active preset. The full-height rail and separate gray divider remain intact.
- Added a regression test for that state.
- The earlier Run #62 passed 357/357 tests and produced a valid signed .19 APK, but that artifact is withheld. A final rebuild is required so the delivered .19 package includes the state-marker preservation rule.

### Community .19 final build, APK and packaged CSS verification — 9 November 2026

- Final runtime/source commit: `1ba2dfdb67493f389f73bb8788698ada310499a4` on `feature/editor-reference-one-screen`.
- Final GitHub Actions Run #63 succeeded: [run 42576421938](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42576421938).
- Regression suite: **358 passed, 0 failed**.
- Gradle Release: `BUILD SUCCESSFUL in 1m 34s`.
- Package/version: `com.vaivaii.mg30studio`, versionName `1.0.0-community.19`, versionCode `19`, min SDK 24, target SDK 36.
- APK Signature Scheme v2: valid; one RSA 4096-bit signer; certificate SHA-256 `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Signed APK size: **3,572,554 bytes**. SHA-256: `0eaa8592e7916b89f3149ee77aaf5f21c3d3cd8cb26c0a1b9fc85e2291642f29`. Extracted APK ZIP integrity passed and embedded checksum sidecar matched the APK.
- Direct inspection of the APK's compiled production CSS verified: full-height 64px dark IR slot-number rail; minimum 80px slot card with three equal flexible rows; separate full-height 3px divider; red `is-used-in-current-preset` marker remains; Preset Manager fade is 36px high, 100% of the inner list width, has no horizontal side gradient or negative side margins, and ends in the same `#101619` tone as the frame.
- Preset fade override is in `preset-library-ui.css`, which loads after `ui-redesign.css`, so the final rule wins over the old 64px horizontal+vertical fade.
- The CSS cache token advanced to `stable-ui-4`; Vite compiles the stylesheet to its content-hashed Android asset.
- Run #58 and #59 failed only because old/new assertions were not synchronized with the latest selectors and width. Run #61 exposed a test scope typo. These were corrected; the final Run #63 passed all 358 tests. Earlier .19 artifacts from Runs #60 and #62 are **withheld**; only the final Run #63 APK is approved.
- No changes to IR Collection/User protocol commands, ACK/retry, WAV payload builder, 24-slot map, preset read/write/rename/save/import/export, NAM, TONE3000, MIDI mapping, USB-MIDI, or Studio signal/audio logic.
- Audit artifact ID `13655407229`, ZIP SHA-256 `0756f594fd16862af439a540db195030098090f8b78b0b8f6dafb65bf4277353`.
- Target-device visual/touch acceptance still requires the user to install .19 on the original NUX MG-30 Gen 2 firmware 6.0.x; CI and package inspection have passed but do not claim physical handset testing.



## Community .20 — restore the complete IR Collection frame and pin Preset fade (9 November 2026)

- User provided side-by-side screenshots: reference IR Collection had a bounded framed scroll viewport; .19 showed the lower part of the frame clipped beneath the app nav. Preset Manager's bottom fade appeared noticeably above the actual bottom edge.
- IR root cause: `.ir-collection-grid` is the flexible middle child of the Collection card's `grid-template-rows: auto minmax(0,1fr) auto`, but an older rule forced `height:100% !important`. That percentage was based on the full card, including its header, so the grid overflowed its allocated middle row and its lower frame edge was clipped by the parent's `overflow:hidden`. Community .20 overrides only the active mobile Collection grid to `height:auto !important`, `min-height:0`, `max-height:none`, `align-self:stretch`, and border-box sizing. The grid naturally fills exactly the allocated middle row; its own `overflow-y:auto` keeps all 24 slots inside the restored frame.
- Preset fade root cause: the fade pseudo-element belonged to the scrolling card content, so its position was tied to the scrolled content/end-of-list. The old scroller pseudo is disabled. A new 36px vertical-gradient overlay is anchored absolutely to the fixed Preset Manager page at `bottom:2px`, spanning its full content width and staying stationary while cards scroll. It therefore aligns with the actual bottom of the list viewport rather than an item in the scroll stream.
- No changes to slot card arrangement or appearance, IR transfer/User/Collection SysEx, ACK/retry, WAV payload, 24-slot map, preset operations/data, NAM, TONE3000, MIDI mapping, USB-MIDI, or Studio.
- Cache tokens advanced to `stable-ui-5` and `card-v2` so Android WebView reloads both corrected stylesheets.
- Added regression tests for the IR grid's allocated height, inner overflow scroller, fixed Preset viewport fade, and both cache tokens.
- Candidate release: `1.0.0-community.20`, versionCode 20. CI validation and package inspection pending.

### Community .20 final verification — 9 November 2026

- Tested application commit: `437d48692d717db9ee5cb5738cff5adbf8bb1f96`; branch `feature/editor-reference-one-screen`.
- GitHub Actions Run #65 succeeded: [run 42587987010](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42587987010).
- Regression suite: **360 passed, 0 failed**.
- Gradle Release: `BUILD SUCCESSFUL in 1m 35s`.
- Android package: `com.vaivaii.mg30studio`; versionName `1.0.0-community.20`; versionCode `20`; min SDK 24; target SDK 36.
- APK Signature Scheme v2: verified true, one RSA 4096-bit signer. Certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Signed APK size: **3,572,614 bytes**. SHA-256: `9b303fe16a1381ff5abeaf0fa237bc30953a3e14e412b4fe60242b91ae0749dc`. APK ZIP integrity passed; audit checksum sidecar independently matched the extracted APK.
- Actual APK's Vite-bundled CSS inspected: final mobile IR Collection grid rule overrides the previous `height:100% !important` with `height:auto !important`, `min-height:0`, `align-self:stretch`, and border-box sizing, preserving the independently scrollable framed grid. Preset Manager's old scroll-content pseudo fade is disabled; the new fade is anchored to the fixed Preset page at `bottom:2px`, `height:36px`, `position:absolute`, with a single vertical gradient.
- Both stylesheet cache tokens were advanced: `stable-ui-5` and `card-v2`.
- No IR protocol/transfer, ACK/retry, WAV payload, Collection/User slot mapping, 24-slot storage, preset operation/data, NAM, TONE3000, MIDI, USB-MIDI or Studio logic changed.
- Audit artifact ID `13659653885`; ZIP size **3,253,351 bytes**; ZIP SHA-256 `d209a518cc43448e8ce07fa77354044a4ef09acaf7d1186be1a15fe3c1f35070`.
- Phone-side visual/touch confirmation still pending: install Community .20 on original NUX MG-30 Gen 2 firmware 6.0.x to confirm the complete frame and stationary bottom fade on the target WebView.

## Community .21 — final viewport-chain audit and release verification (9 November 2026)

### Source audit and root causes

- User's latest screenshots still showed IR Collection slots 23–24 and the lower frame concealed beneath the app navigation; Preset Manager's bottom fade did not meet the actual scroll frame.
- A complete DOM/CSS audit identified the root IR sizing defect: `initUI()` hides the original direct-child legacy hero and import panel, then appends a single visible `#ir-manager-ui` child into `#ir-import-content`. The old `grid-template-rows:auto minmax(0,1fr)` sent that one visible child into the `auto` row and left the flexible row empty. This let the 24-slot content determine its intrinsic height and overflow the fixed NAM viewport. A separate chain of `height:100%` rules on root, manager, card and slot grid compounded the overflow.
- Fixed by assigning the visible root exactly one `minmax(0,1fr)` row; manager also gets one flexible row; card retains `auto minmax(0,1fr) auto`; all active ancestor/grid percentage heights are removed and replaced with auto sizing plus `min-height:0`/stretch. The Collection grid remains the only inner `overflow-y:auto` scroller inside its border/background frame.
- A duplicate later selector for `#page-nam > #ir-import-content` had only partial `grid-row/min-height` declarations. It was merged into the authoritative root rule and removed, preventing cascade order from splitting sizing responsibility.
- Preset fade audit found the original sticky 64px side+bottom fade, the .19 inner-scroll override, and the .20 page-level absolute overlay coexisting. The page overlay was attached to `#page-presets`, not the actual scrolling frame. All three conflicting versions were consolidated into one pseudo-element on `.preset-library-card-list`: sticky at `bottom:0`, width 100%, height 42px, `margin:-42px 0 0`, vertical-only gradient. The page-level overlay and duplicate .19/.20 blocks are removed.

### Change and regression protection

- Runtime source commit: `ef04db7caf7a38fa369d0c9c5470f1fe86a6ea4b`.
- Test-only selector cleanup commits: `f72b0a6b232ebf04908b0277281cf6c636c66f7a` and `f54830173b2a4400d6ef4049489ade810d34c952`. These test commits did not change application runtime source.
- WebView cache tokens advanced to `stable-ui-6` and `card-v3`.
- Added regression assertions for the one-visible-child/one-grid-track root, all ancestor height rules, uniqueness of the root selector, continued 24-slot inner scrolling, exactly one sticky Preset fade, and cache tokens.
- No IR protocol IDs, ACK/retry, WAV payload/build, User/Collection mapping, 24-slot mapping/actions, preset read/write/import/export, NAM/TONE3000 behavior, MIDI mapping, USB-MIDI, Studio or audio routing code was modified.

### Final CI and APK

- GitHub Actions Run #68 succeeded: [run 42594836165](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42594836165), tested HEAD `f54830173b2a4400d6ef4049489ade810d34c952`.
- Regression suite: **363 passed, 0 failed**.
- Gradle: `BUILD SUCCESSFUL in 1m 49s`.
- Android package: `com.vaivaii.mg30studio`; versionName `1.0.0-community.21`; versionCode `21`; min SDK 24; target SDK 36.
- APK Signature Scheme v2: verified true; one RSA 4096-bit signer. Certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Signed APK size: **3,572,458 bytes**. SHA-256: `96ddd70280669c5642e6cb3871f267286fd285d3e6b92283e32d4012bee1cffe`. Extracted APK ZIP integrity passed (449 entries); sidecar SHA-256 matched the APK.
- Actual Vite-bundled APK CSS verified: active Collection root has exactly one grid track; manager/card/grid no longer force percentage height; only one active root sizing selector remains; slot grid retains inner vertical overflow and frame border. Preset CSS has exactly one sticky fade on the real scroller and no page-level fade pseudo.
- APK asset includes the new CSS bundle and cache-token assets. Package metadata and v2 signature were inspected from the audit ZIP, not inferred from workflow success alone.
- Audit artifact ID `13663565160`, ZIP size **3,253,249 bytes**, ZIP SHA-256 `4722b2e3f38652cec6245284acb03a5cdd9ca4dec4dd76759b7530096f5caa3c`.
- Phone-side visual/touch acceptance remains pending: install Community .21 on the original NUX MG-30 Gen 2 firmware 6.0.x to confirm the lower Collection frame and last slots are reachable, and the Preset fade touches the scroller's exact lower edge.


## Community .22 — flex-bounded IR Collection and Preset frames (9 November 2026)

### User request and source inspection
- User supplied Android screenshots showing the lower IR Collection frame and slots 23–24 obscured at the bottom navigation, plus a Preset Manager fade that moved with the list rather than staying on the frame edge.
- Confirmed the existing Preset list combined the frame and scroller on `#presetLibraryCards`, with a sticky `::after` pseudo-element on that same scroll container. This did not match the requested outer-frame / inner-scroller / sibling-overlay structure.
- Confirmed the mobile NAM/IR page used nested grid tracks for the NAM page, `#ir-import-content`, `#ir-manager-ui`, and the Collection card. The Collection grid remained an inner scroller but had no explicit sibling fade; the viewport sizing was not expressed as a single flex-bounded chain.

### Implementation
- Added a Preset outer frame wrapper `.preset-library-frame`; `#presetLibraryCards` remains the existing listbox and is now the sole inner vertical scroller. Added an explicit `.preset-library-fade` sibling with absolute positioning at the frame bottom, z-index 20, and pointer-events disabled.
- Changed the mobile NAM/IR page, Collection content root, manager and Collection outer card into a bounded flex-column chain. Kept the measured top-header and bottom-navigation offsets.
- Changed IR Collection status placement so it remains in normal flow before the slot scroller. The 24-slot grid receives 64px trailing scroll space and an explicit absolute `.ir-collection-fade` sibling is pinned to the Collection card bottom.
- Advanced WebView stylesheet cache tokens to `stable-ui-7` and `card-v4`.
- The repository does not use Tailwind; equivalent layout semantics are implemented with scoped CSS rather than introducing a new build dependency.

### Protected behavior
- No changes to NAM transfer/readback, TONE3000, IR User/Collection SysEx command families, WAV building, ACK/retry, parameter semantics, 24-slot IDs/actions, preset read/write/import/export, MIDI mapping, USB-MIDI, signal-chain operations, Studio, or audio routing.
- Preset listbox ID, selection/click handlers, import/export controls and existing program mapping remain intact.

### Validation state
- Regression tests updated for the flex viewport chain, explicit sibling fades, pointer-events, 64px scroll tails, preserved 24-slot controls and cache tokens.
- CI/release build: pending at source commit time.
- Target Android/WebView visual/touch acceptance: pending install and on-device review.


### CI follow-up after connection resumed
- Community .22 first workflow run reached the regression suite (363 tests): 356 passed, 7 failed. APK/signing/build steps were correctly skipped because the regression gate failed.
- Failures were stale assertions left behind by the layout refactor: previous cache token values, previous grid-row layout expectations, the old preset fade selector count, and a test expecting the list's bottom padding in a longhand declaration rather than the new padding shorthand.
- Removed a redundant partial duplicate IR root selector and updated the affected tests to assert the flex-frame/sibling-fade implementation and current cache tokens. No application transfer or device protocol logic was changed.
- Re-run of regression suite and release packaging: pending.


### CI follow-up 2
- The second run narrowed the failures to two assertions that were reading the wrong stylesheet/rule: the Preset list padding lives in `preset-library-ui.css`, not `ui-redesign.css`; and the final fade selector occurrence is only the mobile corner-radius override. Updated both checks to inspect the base scrollport and base absolute fade rules.
- Other earlier stale expectations, including the NAM/TONE3000 and UI-motion cache-token tests, now pass. Awaiting the next full run.


## Community .23 — measured IR card bottom and shorter Preset scroll tail (9 November 2026)

### Screenshot findings
- Preset Manager fade is attached to the frame, but there is still excessive empty space below the final preset at the scroll limit.
- IR Collection outer card extends behind the fixed bottom tab bar; its rounded lower border must stop above navigation.

### Root-cause correction
- Preset list/scroll padding at the bottom was 64px while the fade overlay was 56px. Reduced the end padding to 32px and the pinned fade to 32px, retaining the overlay and pointer-events behavior.
- The IR page-level fixed offset did not reliably bound the Collection card on Android WebView. IR now measures the actual rendered top of `.ir-collection-frame` and the top of `.nav` in the same `getBoundingClientRect()` coordinate space, then sets `--ir-collection-frame-height = floor(navTop - frameTop - 12)`. The frame uses this value for height, max-height and flex basis. The value is cleared when the viewport mode is exited.
- The Collection remains the inner scroll owner; all 24 slots and their action buttons remain unchanged.

### Scope protection
- No changes to NAM model import/readback, IR User/Collection SysEx paths, WAV transfer/ACK/retry, 24-slot mapping, preset data operations, MIDI mapping, USB-MIDI, Studio or audio routing.
- Stylesheet cache tokens advanced to `stable-ui-8` and `card-v5`. Signed candidate advanced to Community .23, Version Code 23.

### Validation
- Regression assertions updated for same-coordinate frame/nav measurement, explicit frame sizing and shortened Preset scroll tail/fade.
- CI regression suite, signed release build, package/signature/checksum verification: pending.
- Physical Android visual/touch acceptance remains required after installation. CI success alone is not visual proof.
