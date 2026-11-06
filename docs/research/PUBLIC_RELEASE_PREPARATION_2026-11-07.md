# MG30 Studio — Public Release Preparation Record

Date: 7 November 2026
Target: Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)
Repository: `Vaivaii/Nuxmg30-web-app`

## Baseline recovered

- Development source branch: `fix/global-english-android-back`
- Source HEAD: `b67a3196fba5191741399fc8bcb79c7d5a5babfb`
- Latest successful CI evidence available when this preparation began: Build #669, run `42270761593`
- Build #669: 310 tests passed / 0 failed; Android initializer syntax validation passed; Capacitor Android generation passed; Gradle `assembleDebug` succeeded; debug artifact uploaded.
- Build #669 is not a signed public APK.
- The repository default branch is `main`; its source is stale relative to the active Android app source. Do not merge branches blindly.
- The old `release/community-prep` branch is stale/diverged and must not be used.

## Release preparation branch

Created `release/community-prep-v2` directly from immutable Build #669 source commit `b67a3196fba5191741399fc8bcb79c7d5a5babfb`.

Preparation changes on this branch are limited to release documentation and GitHub Actions workflow files. The application runtime/protocol code is unchanged from the selected Build #669 source baseline. Protected areas include NAM, User/Third Party IR, IR Collection, MIDI mapping, USB-MIDI, presets, Signal Chain and device communication.

The branch contains:
- `.github/workflows/community-release.yml` for a signed release candidate;
- `.github/workflows/prepare-lockfile.yml` for a manually dispatched npm lockfile bootstrap;
- `PUBLIC_RELEASE_CHECKLIST.md`;
- `COMMUNITY_RELEASE_GUIDE.md`;
- `LICENSE` (canonical GPL-3.0-only text);
- `PRIVACY.md`;
- `THIRD_PARTY_NOTICES.md`;
- `CONTRIBUTING.md`;
- updated Community Edition README and this research record.

No application runtime or protocol source changes were made as part of release preparation.

## Owner decision: open-source model

The owner selected **GPL-3.0-only** on 7 November 2026. The canonical GPL-3.0-only `LICENSE` file has been committed. This records the intended source license; it does not establish that third-party dependencies or bundled assets are relicensed. Their individual terms and the project's authority over first-party code still require review.

## Owner confirmation: physical feature QA complete

On 7 November 2026, the owner explicitly confirmed: **all MG30 Studio features are functioning and all feature tests have been completed on the device**.

The confirmation includes Import All and Export All, superseding the earlier provisional notes that reported an Import All readback mismatch at program 72 / scene 0 and an unvalidated Export All path. It also supersedes earlier pending status for Playback Level. The confirmed feature scope includes:
- NAM loading and transfer;
- Custom IR User/Third Party import;
- IR Collection import/use;
- MIDI/CC mapping and USB-MIDI;
- preset selection, Single Import/Export and Import All/Export All;
- Signal Chain, scenes, CTRL/EXP;
- USB audio loopback, Record Level and Playback Level.

This is owner-reported physical QA confirmation. The exact APK filename/build number/source SHA-256 used for the physical test was not supplied in the confirmation. Capture that identity in the release evidence before publication. Do not misstate this confirmation as proof that the signed release APK has already been built or installed.

## Privacy and dependency audit

- `PRIVACY.md` is a source-audited draft. It records TONE3000 OAuth/API token handling in WebView localStorage, optional YouTube API key storage and API requests, YouTube embed behavior, local preset/NAM/IR settings, USB-MIDI, audio recording/export and diagnostic sharing.
- Final generated Android manifest, signed APK and observed network behavior still need verification, especially camera implementation/permission and the handling of OAuth tokens/API keys in localStorage.
- `THIRD_PARTY_NOTICES.md` is a preliminary direct npm dependency license inventory. A complete npm/Gradle transitive dependency and bundled-asset audit remains outstanding because no lockfile/SBOM has been committed yet.
- Review NUX/Cherub marks, bundled artwork and third-party assets before broad public distribution.

## Release workflow and remaining gates

The signed release workflow:
- runs only from `release/community-prep-v2`;
- checks out the exact workflow-dispatch commit;
- requires `package-lock.json` and uses `npm ci`;
- runs `npm test` and Android initializer syntax validation;
- requires four owner-configured secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`;
- generates the Capacitor Android project and builds `assembleRelease`;
- verifies APK signature, package ID `com.vaivaii.mg30studio` and SHA-256;
- uploads an audit artifact;
- creates a GitHub Release only when explicitly requested, and then only as draft + prerelease, never public/latest.

Still outstanding:
1. Run the manual lockfile workflow and confirm `package-lock.json` is committed. It has not been run; the file is absent.
2. Owner creates and backs up the permanent PKCS#12 keystore locally, then configures the four GitHub Actions secrets. Never send the keystore or passwords in chat.
3. Run the signed candidate workflow and inspect its tests, generated manifest, APK permissions, signature, package identity and checksum.
4. Install the signed APK on a clean Android device. A signed APK normally cannot update an existing debug-signed app with the same package ID; back up app data and uninstall the debug build if needed. Keep the same permanent signing key for future updates.
5. Record the exact physically tested APK/source identity, and separately smoke-test the signed candidate.
6. Complete transitive dependency, artwork/font/asset, privacy and trademark reviews; prepare final installation/update/troubleshooting instructions.
7. Publish only after all checklist gates are complete. No public or draft release should be created automatically.

## Current repository status at this record

- Release-preparation branch: `release/community-prep-v2`.
- The latest release-preparation documentation commits record the owner's completed feature QA confirmation.
- The application runtime/protocol source remains unchanged by the documentation updates.
- No `package-lock.json` is committed; the bootstrap workflow has not been run.
- No signed APK has been built in this release-preparation sequence; signing secrets have not been read.
- No tag or GitHub Release has been created.
- The default `main` branch is a README-only landing page and does not contain the current Android app source. Do not merge branches without a deliberate reconciliation plan.

The physical feature QA gate is now recorded as complete based on the owner's explicit confirmation. Release engineering, signed-candidate verification and legal/privacy publication gates remain open.


## Workflow visibility correction — 7 November 2026

The owner reported that the GitHub Actions link for the lockfile workflow displayed “Not found / This workflow does not exist.” Investigation confirmed that `.github/workflows/prepare-lockfile.yml` existed on `release/community-prep-v2` but not on the repository default branch `main`. GitHub requires a `workflow_dispatch` workflow file to exist on the default branch for it to be dispatchable. The lockfile workflow has therefore also been registered on `main`, while its job-level guard still permits execution only when the selected ref is `release/community-prep-v2`.

The default branch also contained an older `community-release.yml` that pinned Build #663 and could publish a public/latest release automatically. That unsafe legacy workflow was replaced on `main` with the guarded signed-candidate workflow from `release/community-prep-v2`: it only runs from the release-preparation branch, requires the committed lockfile and owner-managed signing secrets, and creates a draft prerelease only when explicitly requested. No public release is created by default.

These default-branch changes affect workflow registration/safety only; they do not merge application source into `main` or alter app runtime/protocol code. The owner should now open the Actions page, select the lockfile workflow, choose branch `release/community-prep-v2`, and dispatch it. The workflow has not yet been run and no lockfile has been generated.
