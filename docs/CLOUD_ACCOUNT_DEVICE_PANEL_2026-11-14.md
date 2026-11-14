# Cloud Account panel on Device — 2026-11-14

## Correct working branch
- Repository: `Vaivaii/Nuxmg30-web-app`
- Branch: `feature/ai-live-tone-studio`
- Base state before this repair: `bf0321256ab9ad531833943ab0562ac303a0ff6c`

## Root cause
The previous APK was built from the correct AI Live Tone branch, but that branch did not contain `www/cloud-account.js` and `www/index.html` did not load the module. The login panel therefore could not appear on the Device page. The module existed only on the separate `feature/cloud-account-auth` branch.

## Changes made on the correct branch
1. Added `www/cloud-account.js` (commit `0288fdd1fe24c9bd85725d04a27d8880b8675fd2`).
2. Updated `www/index.html` to load `./cloud-account.js` before `english-ui.js` (commit `210d89d710cbcc969ccc7ed3376d03d1870bf3a8`).
3. Mounted the Cloud Account panel after the Device page hero heading, above the USB/MIDI device settings.
4. The login module uses the existing Worker endpoint `https://nux-mg30-studio-api.vaivai851.workers.dev`, stores only the session token and username, clears the password field after login, and validates saved sessions with `/auth/me`.
5. The module is isolated from Web MIDI, SysEx, NAM, IR, presets, and MIDI mapping logic. Local device features remain available without Cloud login or internet.

## Build validation
- GitHub Actions run #786 checks the module-file commit only and is not the authoritative APK for the final integration.
- GitHub Actions run #787 checks the final integration commit `210d89d710cbcc969ccc7ed3376d03d1870bf3a8`; its result and artifact must be confirmed before distributing the APK.
- Protocol regression tests and Android initializer syntax validation passed in the observed run summaries while Gradle APK assembly was running.
- Physical-device installation and interactive login still need validation after installing the final APK.

## Guardrails
Do not move this work to `feature/cloud-account-auth` or replace the working branch. Preserve AI Live Tone behavior and existing NAM, IR, local device, and MIDI functionality.

## Packaging correction
An initial successful APK build (run #787) still omitted the Cloud Account JavaScript file because the HTML referenced it as a classic external script. Inspection of the APK archive showed no packaged `cloud-account.js`. The call was changed to a Vite-processed module script in commit `f1a4d7aca28a42275c2a994f60b4126a207ecf87`. Run #788 is the authoritative build. Do not distribute run #787; verify that the run #788 APK contains the Cloud Account code in its packaged web assets before release.

## Final APK verification
- Authoritative run: GitHub Actions #788, run ID `43580446637`, conclusion `success`.
- Built from integration commit: `f1a4d7aca28a42275c2a994f60b4126a207ecf87`.
- Artifact ID: `14108711025` (`MG30-Studio-debug-APK`).
- APK web bundle inspection confirms the generated `assets/public/assets/index-CDYKmJC2.js` contains the Cloud login identifiers `mg30CloudPanel`, `Connect Cloud Account`, and `mg30-cloud-auth-token`.
- APK SHA-256: `5ca4ba0f63ddd669d29964d58e3773f6d4eaa17f30c7e2522a7e62e3bec03910`.
- Automated protocol regression tests, Android initializer validation, Android APK assembly, and artifact upload all passed. Physical installation and live login on the user's phone remain untested.
