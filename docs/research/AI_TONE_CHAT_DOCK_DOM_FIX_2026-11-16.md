# AI Live Tone Assistant — Chat Dock DOM Fix (2026-11-16)

## Target and scope
- Original NUX MG-30 Gen 2 firmware 6.0.x.
- UI-only correction in `www/ai-tone-studio.js`.
- Preserve existing AI Listening controls and behavior, provider/model settings, TONE3000 NAM mode and Amp Only / Amp + Cab selection, NAM capture picker/import, Undo, Send, token monitor, USB-MIDI path, IR mapping, MIDI mappings, NAM features and preset validation.

## Root cause confirmed in source
The composer was visually styled as Grid row 3, but it was still nested inside `.ai-tone-scroll-area`. The scroll area was not closed until after the composer. Therefore the composer remained part of the scrolling content and could move with NAM cards and long conversation content. Prior CSS-only changes could not reliably correct this parent/child hierarchy.

## Fix
- Close `.ai-tone-scroll-area` immediately after `.ai-tone-body`.
- Keep `.ai-tone-composer` as a direct child of `.ai-tone-sheet`, alongside the header and scroll region.
- Retain the existing 3-row grid: header / scrollable conversation / composer dock.
- Keep `.ai-tone-scroll-area` as the only conversation scroll container.
- Give `.ai-tone-body` a minimum height of 100% so the middle row fills the available space even for short conversations.
- Keep conversation messages in normal flow; NAM card selection continues to update the selected card in place without rendering the full history or scrolling the conversation.
- Audio Listening panel, settings and NAM controls remain in the conversation area and their existing IDs, event handlers and behavior are preserved.

## Regression coverage and CI
- Added assertions that the audio/body region closes before the composer and that the body fills the conversation viewport.
- GitHub Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43857659725
- Commit: `f45553e4820f94faaec4323842c4d6a57b27a84d`
- JavaScript syntax validation: passed.
- Protocol/regression tests: 561 passed, 0 failed.
- Capacitor Android project generation: passed.
- Gradle `assembleDebug`: BUILD SUCCESSFUL.
- Artifact: `MG30-Studio-debug-APK` (workflow artifact, expires 2026-11-30).

## Verification boundary
CI confirms syntax, regression tests and APK build. It does not simulate the user's exact Android WebView/keyboard/device interaction or physical MG-30 connection. Install the new APK and verify: (1) typing with Android keyboard open, (2) scrolling a long conversation, (3) selecting multiple NAM captures without viewport movement, (4) toggling AI Listening and opening settings. Do not claim physical-device verification until these checks are performed.
