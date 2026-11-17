# AI Live Tone Assistant — Fixed Audio and Settings Docks (2026-11-16)

## Target and scope
- Original NUX MG-30 Gen 2 firmware 6.0.x only; not MKII.
- Correct the layout reported in recordings `1001019981.mp4`, `1001019980.mp4`, and `1001019979.mp4`.
- Keep the successful composer dock behavior from the prior DOM fix.
- UI/DOM and layout correction in `www/ai-tone-studio.js`; add regression coverage in `tests/ai-tone-studio.test.js`.

## Video observations and source-level cause
- The Audio Listening panel was a descendant of `.ai-tone-scroll-area`, so conversation scrolling also moved the audio controls.
- The Settings window was also nested inside the same scroll container. Its absolute positioning was relative to an element inside the scroller, so it moved with that scroll region.
- The conversation wrapper was forced to `min-height:100%` while it lived inside the scrolling region. That could leave an artificial trailing area after the final chat card.

## Implemented layout
The sheet now has four explicit grid rows:
1. Header.
2. One conversation scroll region containing the message history.
3. Audio Listening dock, directly above the composer. It is a sibling of the conversation region and is controlled by the existing header toggle.
4. Message composer dock.

Additional changes:
- Move `#aiToneSettings` outside the conversation scroller. It is an absolute overlay positioned relative to the assistant sheet and retains its own internal scrolling.
- Keep `#aiToneAudioPanel` outside the conversation scroller, in grid row 3. Its `hidden` state still collapses the row when the header toggle is off.
- Remove the forced `min-height:100%` from the conversation content wrapper and use `min-height:0`; only real message content contributes to scroll height.
- Route busy/activity auto-scroll to `#aiToneScrollArea`, not the non-scrolling message-content element.

## Preserved behavior and protected areas
- Existing Audio Listening modes, USB Audio capture, local PCM analysis, refresh, status and start/stop handlers are unchanged.
- Existing Settings controls, provider/model selection, fallback preference and token monitor remain intact.
- Existing conversation rendering, NAM search/results/capture picker/import and slot-10 validation remain intact.
- No changes to NAM transfer protocol/A2 compatibility, IR User/Third Party/Collection routing, MIDI CC mapping, USB-MIDI live update, preset validation or original Gen 2 device targeting.

## Regression coverage
The layout test now asserts:
- Settings and Audio Listening markup are outside `#aiToneScrollArea`.
- Audio Listening is between the conversation scroller and composer.
- The header toggle remains wired to collapse/expand the audio dock.
- Grid rows are header / conversation / audio dock / composer.
- The conversation wrapper is not forced to viewport height.
- Busy activity scrolls the actual conversation container.

## Validation boundary
- The GitHub Actions build/test workflow is triggered by this branch update. Its result must be checked before claiming CI success.
- Physical Android WebView testing is still required for keyboard appearance, long conversation scrolling, Audio Listening toggle, Settings overlay scroll and concurrent USB Audio/USB-MIDI behavior.
