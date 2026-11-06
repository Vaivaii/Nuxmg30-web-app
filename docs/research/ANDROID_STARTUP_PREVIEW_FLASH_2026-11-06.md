# Android startup preview flash — 6 November 2026

Target: original NUX MG-30 Gen2 FW 6.0.x; app startup visual fix only.
Branch: `feature/post-effects-parallel-routing`
Base source commit: `89ef53c71b83736b6698b709d9377b1fdb51b1a7`.

## User observation

On app launch, the previous/legacy NAM & IR menu appears for a fraction of a second, then the current Editor is shown.

## Source inspection

- The static HTML already marks Editor as the active nav item.
- `#page-editor` is the initially visible page.
- `#page-nam` starts with the `hidden` class, and the early inline CSS defines `.hidden{display:none!important}`.
- The page switch function does not select NAM/IR during startup; it only switches after a navigation action.
- Android's generated NoActionBar theme already uses the same dark `windowBackground` color as the app.

This makes a stale Android activity/task preview during launch a stronger explanation than the current WebView's own initial page markup. This is an evidence-based diagnosis, not a direct observation of the user's Android system animation.

## Change

- Add `android:windowDisablePreview=true` to the generated Android NoActionBar theme in `scripts/init-android.mjs`.
- Keep the solid `#0b1012` window background so the system does not reveal a prior activity snapshot while the WebView starts.
- No changes to WebView page routing, initial Editor markup, NAM/IR content, preset logic, Signal Chain, MIDI/SysEx, NAM, User/Third Party IR or IR Collection.

## Verification

- Add regression tests asserting the initial HTML page is Editor and NAM remains hidden.
- Add a regression test asserting the Android startup preview is disabled and its fallback background remains the app's dark color.
- GitHub Actions and Gradle result: pending.
- Physical cold-start confirmation required after installing the new APK: fully close/force-stop the app, relaunch, and verify the old NAM/IR screen no longer flashes.
