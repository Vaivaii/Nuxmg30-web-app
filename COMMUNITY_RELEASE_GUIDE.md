# MG30 Studio — Community Edition Release Guide

## Release identity

- Product name: MG30 Studio
- Channel: Community Edition (free community distribution)
- Target hardware: original NUX MG-30 Gen 2, firmware 6.0.x; not MKII
- Stable source baseline: Build #663, commit `b989727c3bfbe7700e4e3a617cd7143056688e58`
- Verified CI run: [Build #663](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42258403823)
- Android application ID: `com.vaivaii.mg30studio`
- Initial release tag proposal: `v1.0.0-community.1`

The release workflow deliberately checks out the immutable Build #663 source commit. It does not build from the moving development branch head and does not include subsequent unverified source changes.

## One-time signing key creation (owner's computer only)

Create a PKCS#12 keystore locally. Do not upload the keystore to the repository, attach it to an issue, or send it in chat. Keep at least two encrypted offline backups. Loss of this key prevents signing compatible updates; exposure requires treating the signing identity as compromised.

On Windows PowerShell (with JDK/keytool installed):

```powershell
keytool -genkeypair -v -keystore mg30-studio-community-release.p12 -storetype PKCS12 -alias mg30studio-release -keyalg RSA -keysize 4096 -validity 10000
```

Use a strong unique store password and key password. The workflow expects these GitHub Actions repository secrets:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64 of the complete PKCS#12 file, one line |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | `mg30studio-release` (or the exact alias chosen) |
| `ANDROID_KEY_PASSWORD` | Private-key password |

Generate a one-line Base64 value in PowerShell without printing the private key:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\\mg30-studio-community-release.p12")) | Set-Clipboard
```

Then open the repository on GitHub → Settings → Secrets and variables → Actions → New repository secret. Add the four values above. Paste the Base64 value directly into GitHub's secret field. Never paste it into a chat, commit, workflow file, or ordinary issue.

## Build and publish

1. Open Actions → **MG30 Studio Community Release (signed)**.
2. Choose **Run workflow** on branch `release/community-prep`.
3. Use tag `v1.0.0-community.1` for the first release.
4. The workflow runs the regression suite, regenerates the Capacitor Android project, signs the release APK, verifies the APK signature with `apksigner`, computes SHA-256, uploads an audit artifact, and publishes the GitHub Release.
5. If a signing secret is missing or invalid, the workflow must fail. It must never fall back to a debug APK.

## Release verification checklist

- [ ] All four signing secrets configured.
- [ ] Workflow succeeds from the fixed Build #663 source commit.
- [ ] Regression tests pass.
- [ ] Gradle `assembleRelease` succeeds.
- [ ] `apksigner verify` succeeds and prints the certificate SHA-256.
- [ ] APK SHA-256 file matches the downloaded APK.
- [ ] Install over the existing app succeeds without uninstalling (same application ID and same signing key).
- [ ] User confirms USB-MIDI, NAM, IR User/Third Party/Collection, presets, Signal Chain, scenes and MIDI mappings still work on original MG-30 Gen 2 firmware 6.0.x.
- [ ] Only after device confirmation, share the GitHub Release link with the community.

## Important signing and update rules

- Never regenerate or replace the release keystore for a normal app update.
- Never commit keystore files or passwords.
- Increment Android `versionCode` for every future release. The initial release uses code 1.
- Keep the application ID `com.vaivaii.mg30studio` stable to support in-place updates.
- Build #663 was previously installed and user-confirmed using the debug signing identity. A release-signed APK uses a different certificate and Android will normally refuse an in-place update over that debug-signed install. For the first signed release, back up app data where possible and uninstall the debug-signed app before installing the signed release. Subsequent updates signed with this same release keystore can install in place.
- This workflow is for APK sideload/community distribution, not Play Store App Signing.
- This project is independent and not affiliated with NUX.
