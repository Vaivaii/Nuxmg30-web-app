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


## Build #635 — implementation and package verification (2026-11-06)

- Code commit: `cb0cb0624a77de4e5fcb93ab2f9ff867bbffd067`.
- CI-enabled branch head: `9b8c405ec4b43e463be34305e1f2949b8d59d63a` (also adds this branch to the explicit Android workflow push allowlist).
- GitHub Actions #635: [42203363577](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42203363577) — completed success.
- Regression tests: **292 passed, 0 failed**. Android initializer syntax, Capacitor project generation, USB audio plugin install, Gradle `assembleDebug`, and artifact upload all passed. Gradle: `BUILD SUCCESSFUL in 1m 19s`.
- Artifact ID: `13494729470`; ZIP size 4,220,009 bytes; ZIP SHA-256 `c95940511bda60370f825382ce7d7c8af9a3e3049f26b6f9c4ed1a75a3cfc818`.
- Extracted APK: `app-debug.apk`, 4,598,056 bytes; SHA-256 `2ad74b5df02852b320e35f48bd4cae8924f2360c6446c206d182eb06fb0d21a5`. APK ZIP integrity passed and file type is recognized as Android package.
- Packaged HTML/CSS inspection confirms the dynamic dock markup, single `#knobs` mount inside `#editorParameterPanel`, centered active-block/model title, previous/next model buttons, panel state handling, page-aware hide behavior, fixed positioning, and independent vertical scrolling. The old visible `MODEL` label is absent.
- The existing `renderEditor()` writes the current block type/model into the dock and continues to render the existing parameter controls into `#knobs`. Existing `modelPrev`/`modelNext` callbacks and knob event handlers remain in place; no duplicate parameter controls were introduced.
- Interaction: tap centered title to expand the parameter sheet upward; tap it again, backdrop, Escape, or navigate away to collapse. The dock header remains fixed directly above bottom navigation. Panel scrolling is internal.
- Scope is Editor UI layout only. No USB-MIDI packet, parameter encoder, Record/Playback hardware level mapping, NAM, Third Party/User IR, IR Collection, preset format, scene behavior, signal-chain order, MIDI/CC mapping, or USB audio source was modified.
- Physical Android UI test remains pending. In particular verify dock stacking/height on the user's phone, arrows while expanded, parameter dial gestures/scroll, and navigation to/from NAM & IR/Presets/Studio/Device.


## Editor viewport, fluid dock motion, and English-only UI policy (2026-11-06)

- The Build #635 screenshot showed the Editor page still scrolling vertically, allowing the preset header to move out of view. The root cause was the shared mobile tab rule `overflow-y:auto` plus the Editor's legacy bottom padding.
- Only `#page-editor` is now locked on mobile with `overflow:hidden`; the other tabs keep their existing independent scroll behavior. Editor is a flex column with compact header, preset card, signal-chain card and main editor card. Signal chain keeps horizontal scrolling. Model artwork and scenes use responsive compact dimensions, including a short-screen breakpoint.
- Dock sheet no longer animates `max-height` or padding. It has a fixed responsive height and expands/collapses using `translate3d`, opacity and visibility; its content scrolls internally. Backdrop opacity transitions independently. Editor page has a short slide/fade entrance. `prefers-reduced-motion` is respected.
- Device page source labels are now English. Dynamic toast and Device status functions call `window.MG30EnglishUI.translate()` before rendering; native audio statuses use the same English translator. Missing translations were added for Device, signal-chain, preset/scene, NAM, IR, import and export messages.
- **Permanent product-language rule:** all new or edited user-facing app copy must be English by default, across static labels, status text, toast notifications, dialogs/alerts/confirm prompts, tooltips, placeholders, accessibility labels, and dynamically generated content on every tab. Do not introduce Indonesian UI copy. If legacy Indonesian source strings are retained for translation compatibility, they must have a tested English dictionary mapping in `www/english-ui.js`. Internal code comments and research notes are not UI copy.
- Regression tests execute the English translator for dynamic Device/toast strings and guard the fixed Editor viewport and transform-only dock animation.
- No USB-MIDI payloads, parameter callbacks, NAM transfer, Third Party/User IR, IR Collection, preset format, signal-chain order, MIDI/CC mappings or hardware dB mappings changed.
- Build and APK inspection pending.
