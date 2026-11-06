# MG30 Studio — Public Release Checklist

## Release engineering
- [ ] Owner creates and securely backs up the permanent PKCS#12 release keystore.
- [ ] Four GitHub Actions signing secrets are configured.
- [ ] Run signed candidate workflow from `release/community-prep-v2`.
- [ ] 310+ regression tests (or updated suite) pass on the release candidate.
- [x] Run Actions → Prepare deterministic npm lockfile on `release/community-prep-v2`; `package-lock.json` committed and `npm ci` plus `npm test` passed (run #1, 7 Nov 2026).
- [x] Configure signed release workflow to require `package-lock.json` and use deterministic `npm ci`.
- [ ] Capacitor Android generation and Gradle `assembleRelease` pass on the release candidate.
- [ ] `apksigner verify` passes; record signer certificate SHA-256.
- [ ] Android package ID is `com.vaivaii.mg30studio`.
- [ ] SHA-256 checksum matches the downloaded APK.
- [ ] APK installs on a clean Android device and launches without crash.
- [ ] Confirm first-install instructions for moving from debug signature.
- [ ] Set a versionCode greater than 1 for any later update.

## Original MG-30 Gen 2 physical QA
- [x] Owner confirms feature testing on original NUX MG-30 Gen 2 firmware 6.0.x (not MKII).
- [x] USB-MIDI connect/disconnect and ordinary control response.
- [x] NAM loading and device transfer without regression.
- [x] IR User/Third Party import.
- [x] IR Collection import/use.
- [x] MIDI/CC mappings and existing working controls.
- [x] Preset selection, Single Import and Single Export.
- [x] Import All and Export All; owner confirms both now work end-to-end.
- [x] Signal Chain reorder and Serial/Parallel state.
- [x] Scenes, CTRL/EXP and Loopback/Record/Playback levels.
- [ ] Startup, Android Back, dialogs, rotation/responsive layouts.
- [x] Owner confirms all MG30 Studio features are functioning; this supersedes earlier notes that marked Import All, Export All or Playback Level as unverified.
- [ ] Record exact physically tested APK/source SHA-256 in the release evidence once identified.
- [ ] Back up the full pedal bank before any destructive import test.

## Public-facing material and legal/privacy
- [x] Select the open-source distribution model (owner decision recorded 7 November 2026).
- [x] Select GPL-3.0-only and add canonical GNU GPL v3 LICENSE text.
- [ ] Review dependency licenses and confirm all bundled artwork, fonts and other assets can be distributed under their respective terms.
- [x] Update the default-branch README landing page with truthful release status and links to the Android source/release-prep branch (README-only change; no application source merged to main).
- [x] Prepare the Android-app README on the release-prep branch with compatibility, installation, safety and known-limitations information.
- [x] Draft `PRIVACY.md` from source inspection (TONE3000, YouTube, localStorage, USB-MIDI, audio and diagnostics).
- [ ] Verify privacy notice against the final generated Android manifest, APK and observed network behavior; resolve camera feature/permission uncertainty.
- [ ] Review NUX name/logo and other third-party artwork/marks; retain non-affiliation notice.
- [ ] Prepare installation, update, troubleshooting and backup instructions.
- [ ] Prepare release notes and known-issues section.
- [x] Confirm GitHub Issues as the public support and issue-reporting channel; add `CONTRIBUTING.md` guidance.
- [ ] Review APK permissions and release package contents.

## Publication gate
- [ ] All release-engineering checks complete.
- [x] Physical feature QA confirmation received from the owner; exact candidate build identity still needs to be attached to the release record.
- [ ] Privacy/legal documentation is complete.
- [ ] Draft release reviewed and approved.
- [ ] Only then publish the GitHub Release and announce the download link.

## Physical QA evidence note

On 7 November 2026, the owner explicitly confirmed that all MG30 Studio features have been tested and are functioning on the target pedal, including Import All and Export All. This is owner-reported physical-test confirmation. The exact APK filename, build number and source SHA-256 used for that test were not supplied in the confirmation, so they must be captured before the public release is approved. This note supersedes earlier provisional limitations in this checklist and the older research record; it does not imply that the signed public-release APK has already been built or installed.
