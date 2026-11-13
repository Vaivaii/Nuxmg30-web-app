# MG30 Studio Build Record — Signal-chain drag fix

Date: 2026-10-29

## Target and scope
- Device target remains the original NUX MG-30 Gen 2 on firmware 6.0.x; not MG-30 MKII.
- Requested build covers the signal-chain edit-mode swipe/drag visual and horizontal auto-scroll changes in `www/index.html`, source commit `46c07577021a9f8cfd7729893aa8ab57b97a060a`.
- The build-trigger commit was `1e18c25dfa46f3069b8a22d900a626c4344f19f3`; its only source difference from the UI fix commit was a temporary workflow branch trigger, which was reverted after the run started.
- Final branch HEAD after restoring the workflow is `222768b96d514c2547f11b754dc99a6de8981de9`.

## Build result
- GitHub Actions run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/40900946570
- Status: SUCCESS.
- Android debug build (`assembleDebug`) and APK artifact upload both succeeded.
- Artifact name: `MG30-Studio-debug-APK`; artifact ID `12909072656`.
- Downloaded artifact archive: `MG30-Studio-debug-APK.zip`, 3,986,994 bytes, SHA-256 `83975f47417c5572a410f3a93f5553de439d1addd464079448121b89dd28842b`.
- Extracted APK: `app-debug.apk`, 4,365,508 bytes, SHA-256 `515fcca1bbd0cfa0cc2747cca49a1d80a83a44911889884a79fa0b66e17f892b`.
- Artifact retention expires 2026-11-12.

## Workflow and protected behavior
- The temporary push-trigger inclusion of `android/ui-polish-pass-1` was reverted after the run started. Automatic build triggering for this branch remains disabled as before.
- The signal-chain fix preserves the existing sender/ACK path and AMP/IR adjacency guard.
- NAM behavior, IR transfer logic, MIDI mappings, preset encoding, and protocol functions were not changed in the UI fix.

## Still required: physical-device test
- [ ] Install this APK on Android.
- [ ] In edit mode, swipe the chain horizontally from the card surface.
- [ ] Drag EFX using the `GESER` handle while auto-scroll reaches an off-screen destination behind AMP.
- [ ] Confirm resulting signal-chain order/readback on the physical MG-30.
- [ ] Recheck NAM import/use, IR Collection transfer, and existing MIDI mapping remain intact.

A successful APK build confirms compilation and packaging only; it does not substitute for the runtime and physical-pedal tests above.
