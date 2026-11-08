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
