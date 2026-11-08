# Android WindowInsets / 3-Button Navigation Layout Fix — 2026-11-08

## Target and safety boundaries

- App target remains original NUX MG-30 Gen 2 firmware 6.0.x; not MKII.
- Only Android window layout/safe-area handling and tests are changed.
- Do not modify MIDI/SysEx, NAM, IR collection imports, preset transfer, USB audio, or MIDI mappings.

## User-reported issue

On Android devices using gesture navigation, the Editor layout fits. On devices using Android's 3-button navigation, the lower portion of the Editor (notably the Scene cards) is pushed/cut off above the system navigation keys.

## Source diagnosis

- Generated MainActivity previously used `WindowCompat.setDecorFitsSystemWindows(window, true)` without an explicit insets listener.
- The mobile WebView layout is a fixed `100dvh` app shell with a fixed bottom tab bar; on affected Android builds its viewport height was not consistently reduced by the three-button navigation area.
- CSS safe-area env values alone were not a reliable native source of the actual system navigation-bar height.

## Implementation

- Switch to explicit edge-to-edge with `WindowCompat.setDecorFitsSystemWindows(window, false)`.
- Install `ViewCompat.setOnApplyWindowInsetsListener` on `android.R.id.content`, the native content host wrapping the Capacitor WebView.
- Read current `systemBars() | displayCutout()` insets from `WindowInsetsCompat` and apply them as native view padding, preserving the container's original padding.
- Re-request insets on resume and after the view host is first found, so rotations and navigation-mode changes are recalculated from actual system values.
- Remove the theme opt-out for edge-to-edge enforcement so the app has one consistent insets strategy.
- Use `WindowInsetsControllerCompat` to keep light system-bar icons against the app's dark system-bar colors.
- Consume only the already-applied system-bar and cutout insets when dispatching to the WebView child; pass through other inset types such as IME.
- Add regression tests for edge-to-edge, dynamic system bars/cutout insets, re-application on resume, and the absence of fixed 24/48/72dp nav-height assumptions.

## Validation history

First CI run `42448134416` failed before tests because an over-escaped JavaScript regex in the Android initializer caused a syntax error. No APK was produced. Correct the regex and rerun the complete test, Android project generation, signed Release build, APK signature, package identity and checksum checks.

CI build success does not itself simulate physical gesture/3-button navigation. Final device check is required with the app installed on both navigation modes.


## CI iteration 2

- Run `42448360681` passed Node syntax validation but stopped at one regression assertion. The assertion rejected any occurrence of the theme opt-out attribute's name, including the intentional cleanup regex in the initializer. Updated the assertion to reject only re-insertion of the opt-out XML item into the generated theme. The actual edge-to-edge/insets implementation was unchanged.


## Final CI result — successful signed candidate

- Final source/workflow commit: `020198c9de3615cc2227268ce2668f0a4fb0f01b`.
- GitHub Actions run: [42448452194](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42448452194).
- Regression tests: **317 passed, 0 failed**.
- Android project generation: passed.
- Generated MainActivity compilation / Android Release: `BUILD SUCCESSFUL`.
- APK V2 signature verification: passed.
- Package identity: `com.vaivaii.mg30studio`.
- Version: `1.0.0-community.5`, versionCode `5`.
- Signing certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- APK checksum validation: passed (`MG30-Studio-Community.apk: OK`).
- Artifact: `MG30-Studio-Community-Signed-Candidate`, ID `13604995973`.
- Artifact ZIP SHA-256: `d9e051f188791e7c15b49d02bcef3733c3bc840a1e355b75ff15211e5961e22f`.
- Artifact expires: 2027-02-06.
- Candidate .5 can update candidate .4 in place: same signing certificate, higher versionCode.
- CI compiles and verifies the Android implementation, but did not run a physical/emulator navigation-mode visual test. The 3-button and gesture layouts must still be visually confirmed on Android devices after installation.
