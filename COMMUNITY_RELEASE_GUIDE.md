# MG30 Studio — Community Edition Release Preparation

## Release identity

- Product: MG30 Studio
- Channel: free Community Edition
- Source license: GNU General Public License v3.0 only (GPL-3.0-only); canonical LICENSE file committed
- Target: original NUX MG-30 Gen 2, firmware 6.0.x; not MG-30 MKII
- Android application ID: `com.vaivaii.mg30studio`
- Candidate tag: `v1.0.0-community.1`
- Candidate source: Build #669, commit `b67a3196fba5191741399fc8bcb79c7d5a5babfb`
- CI: [Build #669](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42270761593)

The release workflow checks out this immutable source commit. It does not build from a moving branch. Build #669 passed 310 automated tests, Android initializer validation, Capacitor generation and Gradle `assembleDebug`. This is CI evidence only; it does not replace physical hardware QA.

## Open-source licensing decision

The owner selected **GPL-3.0-only** on 7 November 2026. The repository now includes the canonical GNU GPL version 3 license text in `LICENSE` (SPDX identifier: `GPL-3.0-only`). This is a strong copyleft license: distribution of covered modified versions is subject to GPLv3 terms, including corresponding-source obligations. The license does not automatically relicense third-party dependencies, fonts, artwork, logos or vendor assets; audit those separately before distribution.

## Current release workflow

Run Actions → **MG30 Studio Community Release (signed candidate)** from branch `release/community-prep-v2`.

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
- Do not describe CI success as physical validation.
- Import All can write the full 128-preset bank; users must back up presets before any such operation.
- Import All readback mismatch and Export All end-to-end validation remain documented limitations. Do not advertise those paths as fully verified.
- Playback Level endpoint validation and other pending physical checks must remain clearly identified.
- NAM, User/Third Party IR, IR Collection, MIDI/CC mapping, USB-MIDI, Signal Chain and preset paths are protected regression areas. No release-preparation change should modify their protocol behavior.
- This is an independent community project and is not affiliated with NUX. Review all third-party marks, artwork and bundled assets before publication.

## Repository housekeeping

The source license is now selected and the `LICENSE` file is present. Remaining legal review includes confirming the project has authority to license all first-party code and auditing third-party dependencies and bundled assets.

A public privacy notice is also required before broad distribution. Review the app's network/API integrations, OAuth flow, permissions, local storage and any diagnostics before making privacy promises. Do not publish a privacy statement based on assumptions; inspect the actual app and generated Android manifest first.
