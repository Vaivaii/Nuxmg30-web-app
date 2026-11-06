# Editor card proportions with fixed dock — 6 November 2026

## User reference
- Image 1: current restored Build #643 Editor view.
- Image 2: Editor UI before the model dock was introduced.
- Requested: retain fixed Editor model dock; restore AMP/pedal artwork and Scene card proportions from the prior UI; preserve a fixed, non-scrollable Editor viewport. Keep the change confined to the Editor card presentation.

## Implementation
- Branch: `feature/editor-card-proportions-with-dock`.
- Parent: stable Build #643 source commit `204bafd8a507d86c88c382566e62a4de360cb37f`.
- Root issue: earlier SVG size rules were placed before later inline Editor CSS rules with `width:100%!important`, so those sizes were overridden by the cascade.
- Added a final inline style block at the end of `<head>`, after all existing Editor inline styles.
- Restored natural artwork-stage layout: 116px default, 105px on narrow/short screens. SVGs are centered and preserve aspect ratio, with height ratios AMP 76%, regular pedal 74%, cabinet IR 70%, Wah/Volume 64%, FX Loop 70%.
- Scene strip is anchored at the lower edge of the existing Editor card. Scene cards use 46px minimum height and compact title/subtitle sizing to match the prior reference.
- Kept existing fixed Editor page, overflow lock and card flex container. No scroll behavior was added or modified.
- Kept Build #643 header, stable tab transitions and Studio dock positioning implementation unchanged.

## Validation
- Build #644, GitHub Actions run `42230033475`: success.
- Regression suite: 300/300 passed.
- Android initializer: pass; Capacitor generation: pass; Gradle `assembleDebug`: BUILD SUCCESSFUL.
- Artifact ID: `13508985245`; ZIP SHA-256 `57f1323e5c08401ba1461a98575cca0d50f4dc934e43ecec886a29f913cf369f`.
- APK size: 4,601,504 bytes; SHA-256 `1dd768dc409ace7a1618cb5a695f968a04788989db53c8fa5b49401c66f45048`.
- APK archive integrity passed. Packaged HTML/CSS inspection confirmed the final stage sizing, SVG ratios, Scene card sizing/bottom alignment and fixed viewport overflow lock.
- The user still needs to confirm the visual result and non-scroll behavior on the physical Android device.
