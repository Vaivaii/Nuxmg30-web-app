# Editor Dynamic Parameter Dock

## Branch and starting point
- Branch: `feature/editor-dynamic-parameter-dock`
- Base: `feature/studio-hardware-level-controls` at `f80858213a06a219b14b827101e2693a2a4b44c4` (documentation commit after successful Build #634).
- Scope: Editor interface only. Existing model selector, parameter renderer, parameter IDs, and send callbacks are reused.

## Interaction contract
- A fixed dock sits immediately above the bottom navigation.
- The dock has no "MODEL" label and no lime/green outline. It displays the active block type and model name centered, with previous/next model arrows at its sides.
- Tapping the centered dock title expands a parameter sheet upward. The dock header remains pinned at the bottom edge of the sheet.
- Tapping the same title again, tapping outside, pressing Escape, or leaving the Editor page collapses the sheet.
- Parameter content scrolls inside the sheet; the Editor page remains independent.
- Existing `modelPrev`, `modelNext`, `modelCurrentName`, `modelSelect`, and `knobs` IDs remain connected to the existing Editor renderer. No duplicate parameter UI is created.

## Protected behavior
- Existing per-model parameter schemas, read/write paths, scene behavior, block enable state, and USB-MIDI functions remain unchanged.
- NAM, User/Third Party IR, IR Collection, Presets, Signal Chain, MIDI mappings, USB audio, and the NUX MG-30 original Gen 2 firmware 6.0.x target are out of scope.
- Build/test result and APK verification will be appended after CI.
