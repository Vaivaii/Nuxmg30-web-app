# MG30 Studio — App-wide lightweight motion pass

**Date:** 3 November 2026 (Asia/Jakarta)  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-mockup-alignment-undo`  
**Validated source commit:** `54d3f015c56ae98403947d852778388a4bf498c4`

## User request

After confirming the Build #338 ruler fix on the physical phone, the user requested lightweight animations across the whole application, including popup/dialog entrances, to make the interface feel more interactive without making the app heavy.

## Implementation

The motion layer is centralized in `www/ui-redesign.css`, which is shared across the main application tabs. The HTML stylesheet query token in `www/index.html` was changed to `motion-lite-1` to avoid reusing an older WebView stylesheet cache.

- Main app tab changes: a short 180ms opacity fade on the visible `#page-*` section. It intentionally does not translate the root page, so sticky/fixed controls keep their geometry.
- Internal page changes: a short opacity/5px translate reveal for Studio mode/DAW subpages and NAM internal panes.
- Controls: brief 140ms transform/color/border/shadow transitions for buttons, with a subtle press scale. The draggable Studio playhead hit button is explicitly excluded so pointer-drag behavior is not altered.
- Fields: short border/shadow/background transitions for text inputs, selects and textareas.
- Cards: short border/shadow/background transitions; desktop pointer hover only adjusts border color and does not force movement on touch devices.
- Native HTML dialogs: generic `dialog[open]` entrance uses a short opacity + slight translate/scale animation; `dialog[open]::backdrop` fades in. This covers static dialogs in Editor CTRL/EXP, Preset import/export, Studio stem export and recording rename, plus dynamically-created Preset Library operation dialogs.
- Menus/popovers: preset jump menu, scene-copy menu, `role=menu` popovers and disclosure content use short opacity/translate/scale entrances. The scene-copy menu is portalled to `document.body`, so its selector is intentionally global rather than scoped under `.app`.
- All open `details` disclosure children receive the same short reveal, including Quick Panel, NAM reader, Preset diagnostics and Studio disclosure panels.
- Toast: retains its current show/hide lifecycle and receives a short opacity/translate/scale entrance.
- Accessibility: `prefers-reduced-motion: reduce` shortens all animation/transition durations to near-zero, removes animation loops by limiting iteration count, and disables smooth scrolling.

## Performance boundaries

- Motion is CSS-only; no JS animation loop or timer was added.
- New keyframes animate only opacity and transform; no height, width, top/left, layout, or expensive filter interpolation is used.
- No new infinite animation was introduced. The existing recording/connection activity indicators retain their current behavior and respect the global reduced-motion override.
- No changes to MIDI/SysEx, USB-MIDI, NAM, IR User/Third Party, IR Collection, preset transfer, Signal Chain, native Android plugins, Studio audio engine, or playhead timing/drag logic.

## Regression coverage

Added `tests/ui-motion.test.js` with assertions for:
- All main application tabs being present and using the page entrance animation.
- Generic dialog and backdrop entrances, including Editor, Preset and Studio dialog IDs.
- Menus, buttons, fields, cards, toast and open disclosure animations.
- Reduced-motion support.
- The updated stylesheet cache token.

## Build #341 validation

- GitHub Actions run: [Build #341](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41493465845)
- Run ID: `41493465845`
- Source commit: `54d3f015c56ae98403947d852778388a4bf498c4`
- Conclusion: **success**.
- `npm test`: **127/127 passed, 0 failed**.
- Vite 7.3.7 production build: **passed** (512 ms).
- Capacitor Android generation and USB audio plugin registration: **passed**.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL**.
- APK artifact upload: **passed**; artifact ID `13164259987`.

## Artifact verification

- Artifact ZIP: **4,116,665 bytes**, SHA-256 `19c7545394b3b2ca31071192d42168be79e5ca0543988eeaed598033775aa31c`.
- Extracted `app-debug.apk`: **4,493,? bytes** (see exact APK size in the verified local artifact) with SHA-256 `10b23287008dfff110958f02cf0cbac31ac0a8efc432636d425de82a517d03f5`.
- ZIP and APK archive integrity checks: **passed**.
- Packaged Vite CSS inspection: confirmed all six `mg30-*` keyframe families, native dialog/backdrop animation, scene-copy menu portal animation, disclosure animation, button press motion, and reduced-motion rules. The packaged index links the bundled stylesheet `./assets/index-B56Gqfb-.css`.

## Physical-device check still required

Install Build #341 on the Android phone and verify:
- Switching between Editor, NAM & IR, Presets, Studio, Device and Backup has a quick, subtle entrance with no sticky-header or fixed-dock movement.
- CTRL/EXP, Preset import/export/rename/save-as and Studio rename/export dialogs fade/scale in without clipping.
- Preset jump and Copy Scene menus, Quick Panel and disclosure sections open smoothly.
- Button press states feel responsive; fields remain easy to use.
- Studio playhead drag, transport and USB-MIDI remain unchanged.
- The animations remain unobtrusive during long sessions.

CI verifies the source assertions and APK packaging, not the exact handset frame pacing or visual feel. Do not claim physical-device motion validation until the user reports back.
