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
