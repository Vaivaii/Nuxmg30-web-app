# MG30 Studio — Community Edition Release Preparation

## Release identity

- Product: MG30 Studio
- Channel: free Community Edition
- Source license: GNU General Public License v3.0 only (GPL-3.0-only); canonical LICENSE file committed
- Target: original NUX MG-30 Gen 2, firmware 6.0.x; not MG-30 MKII
- Android application ID: `com.vaivaii.mg30studio`
- Candidate tag: `v1.0.0-community.1`
- Candidate source baseline: Build #669, commit `b67a3196fba5191741399fc8bcb79c7d5a5babfb`
- CI evidence: [Build #669](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42270761593)

Build #669 passed 310 automated tests, Android initializer validation, Capacitor generation and Gradle `assembleDebug`. This is CI evidence, not a signed release build. The owner has separately confirmed that all MG30 Studio features now work on the target physical pedal, including Import All and Export All. The exact APK/source hash used for that physical test still needs to be attached to the release evidence.

## Owner confirmation: physical feature QA

On 7 November 2026, the owner explicitly confirmed that all features are functioning on the original MG-30 Gen 2 target. This confirmation supersedes earlier provisional notes that treated Import All, Export All or Playback Level as unverified. The confirmed feature scope includes NAM, User/Third Party IR, IR Collection, MIDI/CC mapping, USB-MIDI, presets and all-preset import/export, Signal Chain, scenes, CTRL/EXP, and USB audio loopback with recording/playback levels.

Do not misrepresent this owner confirmation as proof that a signed public-release APK has been built. Before publication, identify and record the exact physically tested APK/build and source SHA-256, then install and smoke-test the signed candidate separately. Preserve the pedal-bank backup precaution for any full-bank write.

## Open-source licensing decision

The owner selected **GPL-3.0-only** on 7 November 2026. The repository includes the canonical GNU GPL version 3 license text in `LICENSE` (SPDX identifier: `GPL-3.0-only`). This is a strong copyleft license: distribution of covered modified versions is subject to GPLv3 terms, including corresponding-source obligations. The license does not automatically relicense third-party dependencies, fonts, artwork, logos or vendor assets; audit those separately before distribution.

## Current release workflow

First run Actions → **Prepare deterministic npm lockfile** from branch `release/community-prep-v2`. That workflow creates `package-lock.json`, validates `npm ci` and tests, then commits the lockfile to the branch. Wait for that commit to appear before starting the signed release workflow.

Then run Actions → **MG30 Studio Community Release (signed candidate)** from branch `release/community-prep-v2`. The release workflow checks out the exact commit selected for that dispatch and requires `package-lock.json`; it uses `npm ci`, not `npm install`.

- The workflow always runs tests and creates a signed APK candidate.
- It requires all four signing secrets and fails closed if any is missing or invalid.
- It verifies the APK signature, Android package ID and SHA-256.
- It uploads an audit artifact.
- `create_draft_release` defaults to false. If explicitly enabled, the workflow creates a **draft + prerelease**, never a public/latest release.
- Do not publish the draft until all release gates in `PUBLIC_RELEASE_CHECKLIST.md` are complete.

## One-time signing key setup (owner's computer only)

Create a PKCS#12 keystore locally using a supported JDK:

```powershell
keytool -genkeypair -v -keystore mg30-studio-community-release.p12 -storetype PKCS12 -alias mg30studio-release -keyalg RSA -keysize 4096 -validity 10000
```

Use unique strong passwords. Keep at least two encrypted offline backups. Do not upload the keystore to Git, attach it to issues, or send it in chat.

Create these GitHub Actions repository secrets under Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | One-line Base64 of the PKCS#12 keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Exact key alias, e.g. `mg30studio-release` |
| `ANDROID_KEY_PASSWORD` | Private-key password |

PowerShell Base64 clipboard command:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\\mg30-studio-community-release.p12")) | Set-Clipboard
```

Never put passwords or Base64 keystore data in chat, source files, workflow logs, or issues.

## First-install and update behavior

The application ID is `com.vaivaii.mg30studio`. The first signed release uses versionCode 1. A release-signed APK will normally not install over a debug-signed app with the same package ID because the certificates differ. Back up important app data, uninstall the debug build, then install the signed community APK. All later community updates must use the same retained release keystore and a higher versionCode.

## Source and release boundaries

- The release candidate is for the original Gen 2 firmware 6.0.x only; do not advertise MKII compatibility.
- Do not describe CI success as physical validation; keep owner-reported hardware QA evidence distinct from automated CI evidence.
- Import All can write the full 128-preset bank; users must back up presets before any such operation.
- NAM, User/Third Party IR, IR Collection, MIDI/CC mapping, USB-MIDI, Signal Chain and preset paths are protected regression areas. No release-preparation change should modify their protocol behavior.
- This is an independent community project and is not affiliated with NUX. Review all third-party marks, artwork and bundled assets before publication.

## Repository housekeeping

The source license is selected and the `LICENSE` file is present. Remaining legal review includes confirming the project has authority to license all first-party code and auditing third-party dependencies and bundled assets.

A source-audited draft privacy notice exists at `PRIVACY.md`. It documents the observed TONE3000 OAuth/API flow, YouTube API/embed, localStorage data, USB-MIDI, audio recording, and the current camera-permission uncertainty. It must be checked against the final generated manifest and release APK before publication. A preliminary direct-dependency license inventory is in `THIRD_PARTY_NOTICES.md`; it is not a complete SBOM because no lockfile exists yet.
