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


## Lockfile workflow completed — 7 November 2026

The owner dispatched **Prepare deterministic npm lockfile** successfully from `release/community-prep-v2`.
- GitHub Actions run: [#1 — run 42282822194](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42282822194)
- Job conclusion: success.
- Lockfile generation: success.
- Reproducible clean install using `npm ci`: success.
- Regression suite using `npm test`: success.
- Commit of `package-lock.json` to the release-preparation branch: success.
- Lockfile blob SHA: `63fdf2c900a1be3e98f990d704d13f46fa2f65bf`.

The lockfile gate is now complete. The next release-engineering gate is owner-managed Android signing: create and securely back up a PKCS#12 keystore locally, then configure the four repository Actions secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Do not send the keystore or any secret values in chat.


## Signed candidate run #3 — keystore validation narrowed down — 7 November 2026

Run #3: [42290046239](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42290046239), commit `e78b93c8bee09985a0818758c9c092ce28b28c45`.
- Branch/tag validation and checkout succeeded.
- `npm ci` succeeded; 310/310 tests passed, 0 failed.
- The release job failed in `Prepare and validate release keystore`; Android project generation and APK build were skipped.
- The step's log does not expose whether the failure was the keystore store password or the alias check because the original workflow suppressed `keytool` diagnostics.
- User locally confirmed that the PKCS#12 file decodes from its Base64 representation byte-for-byte (`cmp` reports `BASE64 VALID`). Clipboard-get is not responsive in Termux, but `termux-clipboard-set` eventually returned to the shell prompt.
- Updated the release workflow on both `main` and `release/community-prep-v2` to strip Base64 whitespace, report decode success, test keystore opening separately from alias matching, and print only safe keytool diagnostics/alias metadata. No secret values or private key material are logged.
- Next run will distinguish an incorrect `ANDROID_KEYSTORE_PASSWORD` from an incorrect `ANDROID_KEY_ALIAS`. The user created the key with alias `mg30studio-release`; if the store password is accepted, verify the alias Secret is exactly that value. Since the user pressed Enter for the private-key password, `ANDROID_KEY_PASSWORD` should equal the keystore password.
- No app runtime source or protocol code was changed. No APK has been produced yet.


## Signed candidate run #4 — definitive keystore password failure — 7 November 2026

Run #4: [42290372459](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42290372459), commit `8f940440f1039bb86ad738bdd1c4af810dc7abb7`.
- `npm ci` and all 310/310 regression tests passed.
- Base64 decoding passed in the runner and produced a non-empty PKCS#12 file.
- The first `keytool -list` invocation, which opens the PKCS#12 using `ANDROID_KEYSTORE_PASSWORD`, failed. Workflow emitted: "Keystore file decoded, but it could not be opened. Check ANDROID_KEYSTORE_PASSWORD."
- Alias check was never reached. This is not an alias diagnosis.
- Next action: user must validate the local .p12 with the exact store password and then update only the GitHub Actions secret `ANDROID_KEYSTORE_PASSWORD` to the exact same value. Never ask the user to send the password in chat. Do not regenerate the keystore or alter alias until local validation proves the password works.
- No Android project generation or APK build occurred. No app runtime source/protocol changes.


## Signed candidate run #5 — alias secret mismatch — 7 November 2026

Run #5: [42291146581](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42291146581), commit `7bf60df16bea53812c1562a72eb0c344e493e4b3`.
- Base64 decoding passed.
- PKCS#12 opened successfully with `ANDROID_KEYSTORE_PASSWORD` ("Keystore password accepted.").
- Workflow enumerated the keystore alias as exactly `mg30studio-release`.
- Validation failed because `ANDROID_KEY_ALIAS` did not exactly match that entry. No private material or secret values were logged.
- Next action: update only GitHub Actions secret `ANDROID_KEY_ALIAS` to the exact string `mg30studio-release` (no quotes, no leading/trailing spaces). Keep Base64/password/private-key password unchanged.
- All 310/310 regression tests passed; Android build steps skipped. No app runtime or protocol files changed.


## Signed candidate run #6 — keystore fixed; Gradle lifecycle issue — 7 November 2026

Run #6: [42291360173](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42291360173), commit `0a7bc8bdc5bfdc99094c7d92060d54185c2fa488`.
- Keystore Base64 decode, store password, alias, and key entry validation all passed.
- Android project generation passed.
- Failure moved to `assembleRelease`: init script tried to create a signing config during `gradle.projectsEvaluated`, after AGP had finalized/used signing configs. Exact error: "It is too late to add new signing configs. They have already been used to configure this project. Consider moving this call to finalizeDsl or during evaluation."
- Updated `.github/workflows/community-release.yml` on `release/community-prep-v2` and `main` to register a `plugins.withId("com.android.application")` callback in `gradle.beforeProject` and configure signing/version in Android Components `finalizeDsl`. This follows the AGP lifecycle requested by the error.
- Branch commit after fix: `39763041ae5e6cee56eebb0c21eee72751217c3d`; main commit: `b9247037125684134002052726145251d93746a6`.
- No app runtime source, NAM/IR/MIDI/preset/USB protocol code changed. Secrets were not changed. 310/310 tests passed before Android generation in Run #6.
- Next: run community-release workflow again from `release/community-prep-v2`, same tag `v1.0.0-community.1`, `create_draft_release=false`. Inspect Gradle build and signature verification. Do not claim APK ready until artifact exists and signing checks pass.


## Signed candidate run #7 — Gradle signing lifecycle fixed; environment scope issue — 7 November 2026

Run #7: [42291743508](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42291743508), commit `979a5a68117937734f805e01b67b46fff2cfd9a5`.
- 310/310 tests passed.
- Keystore Base64, password, alias and private-key entry validation passed.
- Android project generation and signing configuration step passed.
- Previous AGP lifecycle error was resolved by configuring in `androidComponents.finalizeDsl`.
- Build then failed at init script line 14: `Cannot invoke method replaceFirst() on null object`. Root cause: Gradle init script reads `RELEASE_TAG` when Gradle runs, but that environment variable was only scoped to the earlier workflow step that writes the init script; step-level environment does not persist to the later Gradle build step.
- Updated `Build signed release APK` step on both `release/community-prep-v2` and `main` to pass `RELEASE_TAG` and the three signing secrets explicitly to the Gradle process. This also ensures the Gradle init script can access signing values when executed.
- Release branch fix commit: `8ffdff060afe50250fb81746608ba322c39f4eab`; main: `304af06b910d2d9c00aac0e33fa40d35c38e1e48`.
- No app runtime/protocol code changed.
- Next: rerun signed candidate from release branch with same tag and draft=false; verify assembleRelease, apksigner, package ID, SHA-256 and artifact.


## Signed candidate run #8 — APK signing succeeded; verifier output matcher corrected — 7 November 2026

Run #8, Attempt 2: [42292044547](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42292044547), checked-out commit `db4649d08dd4e8b5d54daad28945baa8e1fe9dd5`.
- Owner updated `ANDROID_KEY_PASSWORD` to match the PKCS#12 keystore password.
- `npm ci` and all 310/310 regression tests passed.
- Keystore Base64 decoding, store password and alias validation passed.
- Android project generation and Gradle signing configuration passed.
- `assembleRelease` completed with **BUILD SUCCESSFUL**; the release APK was created and signed.
- `apksigner verify --verbose --print-certs` itself succeeded and reported one V2 signer, RSA 4096-bit, certificate SHA-256 `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Workflow verification failed only because its grep expected the literal text `Signer #1 certificate SHA-256 digest`, while the installed Android Build Tools print `V2 Signer: certificate SHA-256 digest:`. This is a workflow-output matcher bug, not an APK/signing failure. Package-ID and checksum checks were not reached; artifact upload was skipped.
- Corrected the signature matcher on `release/community-prep-v2` to require the actual V2 certificate SHA-256 digest line and a 64-character hexadecimal digest. Fix commit: `89ffbd7db7fa9992712c3e7f83cd0b917dac6b7a`.
- Next: dispatch the signed candidate workflow from the updated release branch with tag `v1.0.0-community.1` and `create_draft_release=false`. Verify signature, package ID, checksum and uploaded artifact. Do not publish a release yet.
- No app runtime or protocol source changed. NAM, User/Third Party IR, IR Collection, MIDI mappings, USB-MIDI and device communication remain untouched.


## Signed community candidate run #9 — successful build, verification and artifact upload — 7 November 2026

Run #9: [42293560406](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42293560406), branch `release/community-prep-v2`, source/workflow commit `47d4c4783728366ef9eff428338da592c46507c1`.
- Overall GitHub Actions conclusion: **success**.
- `npm ci` succeeded and regression suite passed **310/310 tests**.
- PKCS#12 keystore Base64 decode, password and alias validation passed.
- Android project generation and release signing configuration passed.
- `assembleRelease`: **BUILD SUCCESSFUL**.
- APK signature verification passed; V2 signer certificate SHA-256: `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`.
- Package identity verified: `com.vaivaii.mg30studio`, versionCode `1`, versionName `1.0.0-community.1`.
- SHA-256 checksum file generated and included in the artifact.
- Artifact upload succeeded: `MG30-Studio-Community-Signed-Candidate`, artifact ID `13540567982`, size 3,237,665 bytes, expires 4 February 2027.
- Optional GitHub draft release step was skipped (input remained false); no draft or public release was created.
- Next gate is owner download and installation/smoke test of this exact signed candidate on Android and MG-30 hardware, after backing up data. Because it uses a permanent release key, a debug-signed app with the same package ID may need to be uninstalled before installation; preserve/export app data first. Record exact tested artifact identity. Complete outstanding dependency/license, privacy, trademark/artwork and release-documentation reviews before any public release.
- No application runtime/protocol source changed in this run. NAM, custom IR, IR Collection, MIDI mappings, USB-MIDI, presets and device communication remain untouched.
