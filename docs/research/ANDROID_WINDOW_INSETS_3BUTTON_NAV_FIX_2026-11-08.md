# Android 3-Button Navigation and Editor Scene Clipping — 2026-11-08

## Scope / safety
- Original NUX MG-30 Gen 2 firmware 6.0.x only; not MKII.
- Preserve NAM, User/Third Party IR, Collection IR, MIDI/CC mapping, presets, SysEx, USB audio, and device protocol paths.
- This iteration changes only responsive Editor CSS, CSS regression tests, release version metadata, and this note.

## User validation of candidate .5
The user installed candidate `1.0.0-community.5` and supplied a screenshot with Android 3-button navigation visible. The screenshot confirms the Scene 1/2/3 buttons remain clipped at the bottom of the AMP card. The fixed AMP model dock and bottom tab navigation occupy the lower viewport.

## Root cause from screenshot and CSS cascade
- `#page-editor` was explicitly set to `overflow:hidden`.
- `.editor` was constrained to a flexing viewport with `overflow:hidden`.
- `.main-editor-card` was assigned `height:100%` and `overflow:hidden`.
- The model dock and bottom tab navigation are fixed overlays.
Together these rules prevent the Scene row from being scrolled into view, even when native Android content has system-bar insets.

## Corrective change for candidate .6
- Make the Editor page the vertical scroll container on mobile.
- Keep the page bounded by the app shell but allow its content to exceed the viewport and scroll.
- Make the inner Editor and AMP card content-sized with visible overflow.
- Keep Scene controls in normal document flow rather than pushing them to the bottom of a clipped flex card.
- Reserve a 220px scroll tail plus any CSS safe-area bottom inset for the fixed AMP dock and bottom tab navigation.
- Keep the native WindowInsets implementation from .5 unchanged.
- Add regression tests for final CSS cascade, vertical scrolling, bottom clearance, and visible Scene content.
- Bump package to `1.0.0-community.6` / versionCode `6` for a same-key in-place update.

## Validation
Candidate .5 passed 317 tests, Android Release compilation, V2 APK signature, package identity, and checksum, but the user's physical screenshot demonstrated that the Editor layout remained clipped. Candidate .5 is not accepted as the fix.

The .6 CI run must pass all tests and signed Release checks. After installation, verify the entire Scene 1/2/3 row by scrolling the Editor workspace on a 3-button Android device. Gesture mode remains a regression check. CI cannot substitute for physical visual confirmation.


## Candidate .6 CI result — successful

- Exact tested source/workflow commit: `30232096b2de11c3ee95b6a10fae9b24a3129258`.
- GitHub Actions run: [42449282840](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42449282840).
- Regression suite: **319 passed, 0 failed**.
- Android project generation: passed.
- Android Release compilation: `BUILD SUCCESSFUL`.
- APK V2 signature verification: passed.
- Package ID: `com.vaivaii.mg30studio`.
- Version: `1.0.0-community.6`, versionCode `6`.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- APK checksum verification: passed (`MG30-Studio-Community.apk: OK`).
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13604927881`.
- Artifact ZIP SHA-256: `a929ece8edb8f7cbf8b70937732469be13f6224579891f7fd166febbc0506e49`.
- Candidate .6 is signed with the same community certificate and a higher versionCode than .5, so it supports in-place update.
- Physical 3-button visual verification of .6 is still pending. The candidate is not marked accepted until the complete Scene row is visibly reachable above the fixed model dock and tab navigation.
