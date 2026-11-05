# MG30 NAM pane — prevent animation-related width expansion

**Date:** 3 November 2026 (Asia/Jakarta)  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** feature/studio-mockup-alignment-undo  
**Validated Build:** #349  
**Source HEAD:** 9892b78adde105ac2ecaa25d4d9df83369febd41

## User-observed issue

The user reported that the NAM mode inside the NAM & IR page expanded horizontally after the global animation work. The same NAM/TONE3000 switch frame rendered normally after switching to TONE3000. The screenshot showed the NAM mode form controls and panel extending beyond the intended mobile content width.

## Source diagnosis

- www/ir-transfer.js creates a shared .nam-ir-tools-frame and two sibling panes: .nam-ir-nam-pane and .nam-ir-tone-pane, both using .nam-ir-tool-pane.
- The animation layer in www/ui-redesign.css applied mg30-content-enter to the visible .nam-ir-tool-pane.
- mg30-content-enter animates both opacity and transform: translate3d(0, 5px, 0) to translate3d(0,0,0). This transform-based compositing on the active NAM tool pane is the animation/layout interaction isolated from the report.
- The pane already had min-width:0; the shared stage also had min-width:0. Those existing layout constraints were retained.

## Correction

- Added @keyframes mg30-nam-pane-fade with opacity only.
- Changed #page-nam .nam-ir-tool-pane:not([hidden]) to use mg30-nam-pane-fade rather than mg30-content-enter.
- This applies to both NAM and TONE3000 panes, keeping their entrance treatment consistent but avoiding transform on either active pane.
- No width, flex, grid, margin, padding, overflow, or panel structure rules were changed.
- Bumped the ui-redesign.css query token from motion-lite-1 to motion-lite-2 in www/index.html so Android WebView does not reuse a cached pre-fix stylesheet. Vite bundles the stylesheet into the APK CSS asset; the output filename changed accordingly.
- Added a regression test in tests/ui-motion.test.js confirming both pane nodes are created by www/ir-transfer.js, the visible-pane animation resolves to the opacity-only keyframe, and the existing width constraints remain.

## Protected scope

No changes to:
- www/ir-transfer.js pane creation/toggle behavior.
- www/nam-transfer.js or any NAM transfer/readback/protocol code.
- NAM selectors, SysEx, IDs, ACK/retry, USB-MIDI, preset mapping or NAM storage.
- TONE3000 model logic or API requests.
- IR User/Third Party or IR Collection transfer logic.

Only the animation stylesheet, stylesheet cache reference, and UI motion regression test changed.

## Build #349 validation

- GitHub Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41511616371
- Run ID: 41511616371
- Source HEAD: 9892b78adde105ac2ecaa25d4d9df83369febd41
- Conclusion: success.
- npm test: 137/137 passed, 0 failed.
- Vite 7.3.7 production build: passed.
- Capacitor Android generation and USB audio plugin registration: passed.
- Gradle assembleDebug: BUILD SUCCESSFUL.
- APK artifact upload: passed, artifact ID 13174180450.

## Artifact verification

- Artifact ZIP: 4,116,816 bytes, SHA-256 a3bddbb068fdb0b061a9c75b2ad7b49eadde63f0c57243f622a4916cb38702c3.
- Extracted app-debug.apk: 4,494,676 bytes, SHA-256 c899bddfb70cbc69e1f4993e5434d304abaa2233a260d7c5973504e0d4d61c31.
- ZIP and APK archive integrity: passed.
- Packaged CSS inspection confirmed @keyframes mg30-nam-pane-fade and #page-nam .nam-ir-tool-pane:not([hidden]) { animation: mg30-nam-pane-fade ... }.
- Packaged rule inspection confirmed the NAM pane animation declaration has no transform. Existing .nam-ir-tool-pane and .nam-ir-tools-stage min-width:0 rules remain.
- Packaged index points to a new Vite CSS asset (cache-busted output).

## Physical-device confirmation still required

Install Build #349 on the Android phone and open NAM mode while USB is connected. Confirm:
- NAM import panel stays within screen width.
- File chooser, target slot, Send NAM button and status text do not extend beyond the page.
- Switching to TONE3000 still looks normal.
- Switch back to NAM and repeat; the width should remain stable after animation completes.
- NAM file selection, target slot and transfer flow remain operational.
- NAM transfer was intentionally not modified; this visual pass only changes the pane entrance animation.

CI and packaged CSS inspection do not replace the handset visual confirmation.
