# MG30 Studio — Public Release Preparation Record

Date: 7 November 2026
Target: Original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)
Repository: `Vaivaii/Nuxmg30-web-app`

## Baseline recovered

- Development source branch: `fix/global-english-android-back`
- Source HEAD: `b67a3196fba5191741399fc8bcb79c7d5a5babfb`
- Latest successful CI: Build #669, run `42270761593`
- Build #669: 310 tests passed / 0 failed; Android initializer syntax validation passed; Capacitor Android generation passed; Gradle `assembleDebug` succeeded; debug artifact uploaded.
- Build #669 is not proof of physical MG-30 testing or a signed public APK.
- No GitHub Releases existed at the time of preparation.
- Repository default branch is `main`; its source is stale relative to the active development branch. Do not merge branches blindly.
- The former `release/community-prep` branch is stale/diverged from the active source and its release workflow pinned Build #663. Do not use it as the new baseline.

## Release preparation branch

Created `release/community-prep-v2` directly from immutable Build #669 source commit `b67a3196fba5191741399fc8bcb79c7d5a5babfb`.

Preparation-only changes on this branch:
- Added `.github/workflows/community-release.yml` for a signed release candidate.
- Updated `COMMUNITY_RELEASE_GUIDE.md` to pin the Build #669 source.
- Added `PUBLIC_RELEASE_CHECKLIST.md`.
- Replaced the stale prototype README with a truthful Community Edition overview and limitations.
- Recorded the owner's GPL-3.0-only selection and added the canonical LICENSE text.
- Added a source-audited privacy notice and preliminary direct npm dependency license inventory.
- Added a manual GitHub Actions lockfile bootstrap workflow. The signed release workflow now requires a committed lockfile, uses `npm ci`, and checks out the exact workflow-dispatch commit; it remains blocked until the bootstrap workflow is run and its commit is pushed.
- Audited privacy-relevant source paths: TONE3000 OAuth/API tokens in WebView localStorage, optional YouTube API key and embed, local preset/NAM/IR settings, USB-MIDI, native audio recording and export. The Android initializer adds RECORD_AUDIO; camera implementation/permission is not confirmed in this source audit.
- No application runtime source, NAM, IR, MIDI mapping, USB-MIDI, preset, Signal Chain, or hardware protocol code was changed.

The release workflow:
- checks out immutable commit `b67a3196fba5191741399fc8bcb79c7d5a5babfb`;
- runs `npm install`, initializer syntax validation, and `npm test`;
- requires four repository secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`;
- generates the Capacitor Android project and builds `assembleRelease`;
- verifies APK signature, package ID `com.vaivaii.mg30studio`, and SHA-256;
- uploads an audit artifact;
- creates a GitHub Release only when explicitly requested, and then creates it as draft + prerelease, never automatically public/latest.

## Owner decision recorded: open-source model

The owner selected **GPL-3.0-only** on 7 November 2026. A canonical GPL-3.0-only `LICENSE` file sourced from the SPDX license-list text has been committed to this branch. This records the project's intended source license. It does not establish that third-party dependencies or bundled assets are relicensed; their individual terms and the project's authority over first-party code still require review.

## Release blockers / owner decisions

1. The four signing secrets have not been confirmed as configured. The keystore must be created and backed up by the owner; never send it or its passwords in chat.
2. GPL-3.0-only has been selected and LICENSE added; review dependency/asset licensing and confirm all first-party code can be licensed by the project.
3. A draft `PRIVACY.md` now documents observed source behavior. Final APK/manifest/network verification remains required, especially camera permission/implementation and the unencrypted WebView localStorage handling of OAuth tokens and API key.
4. Physical hardware QA of the exact Build #669 candidate is not documented. Test original Gen 2 firmware 6.0.x and protect NAM, User/Third Party IR, IR Collection, MIDI/CC mappings, USB-MIDI, presets and Signal Chain.
5. Import All has a documented program 72 / scene 0 readback mismatch; Export All end-to-end remains unvalidated. Do not market either as fully verified.
6. First signed APK will have a different certificate from the installed debug APK. The user may need to back up app data, uninstall the debug build, then install the signed build. Keep the same release key for all future updates and increment versionCode after the first release.
7. Review NUX/Cherub marks, bundled artwork and third-party assets before broad public distribution.
8. The GitHub default branch remains `main` and is not synchronized with the current Android app source. Its README-only landing page now links to the GPL-3.0-only LICENSE, privacy notice, third-party notice inventory, and current Android release-prep branch; no application source was merged into main. Do not merge branches without a deliberate reconciliation plan.
9. No `package-lock.json` exists in the current source tree. A preliminary direct dependency license inventory exists, but transitive npm/Gradle dependencies and bundled assets remain unaudited. A lockfile bootstrap workflow is prepared but has not yet been run; there is still no committed `package-lock.json`. Generate a lockfile and use deterministic `npm ci` before final public build; the current candidate workflow follows existing CI's `npm install` behavior.

## Current status

GPL-3.0-only selection and the canonical LICENSE file are recorded in the release-prep README, guide, checklist and this research note. No lockfile workflow was run, no `package-lock.json` has been committed, no signed APK was built in this preparation session, no signing secrets were read, no tag was created, and no public or draft release was published. The source branch and functional app code remain unchanged.
