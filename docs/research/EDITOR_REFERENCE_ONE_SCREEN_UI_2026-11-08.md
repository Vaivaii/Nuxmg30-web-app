# Editor UI — Match User Reference, One-Screen Inline Parameters — 2026-11-08

## Base / branch

- New branch: `feature/editor-reference-one-screen`.
- Created directly from the verified Community .6 source at `a6009d158f841a65d61b6b70808dae505a2ec0bb`.
- New signed candidate target: `1.0.0-community.7`, Android versionCode `7`.

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
