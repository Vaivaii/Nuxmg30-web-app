# MG30 Studio — Public Release Checklist

## Release engineering
- [ ] Owner creates and securely backs up the permanent PKCS#12 release keystore.
- [ ] Four GitHub Actions signing secrets are configured.
- [ ] Run signed candidate workflow from `release/community-prep-v2`.
- [ ] 310+ regression tests (or updated suite) pass.
- [ ] Add and commit a lockfile; switch release workflow to deterministic `npm ci` before the public build (current repository has no package-lock.json).
- [ ] Capacitor Android generation and Gradle `assembleRelease` pass.
- [ ] `apksigner verify` passes; record signer certificate SHA-256.
- [ ] Android package ID is `com.vaivaii.mg30studio`.
- [ ] SHA-256 checksum matches the downloaded APK.
- [ ] APK installs on a clean Android device and launches without crash.
- [ ] Confirm first-install instructions for moving from debug signature.
- [ ] Set a versionCode greater than 1 for any later update.

## Original MG-30 Gen 2 physical QA
- [ ] Test on original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.
- [ ] Verify USB-MIDI connect/disconnect and ordinary control response.
- [ ] Verify NAM loading and device transfer without regression.
- [ ] Verify IR User/Third Party import.
- [ ] Verify IR Collection import/use.
- [ ] Verify MIDI/CC mappings and existing working controls.
- [ ] Verify preset selection, Single Import and Single Export.
- [ ] Verify Signal Chain reorder and Serial/Parallel state.
- [ ] Verify scenes, CTRL/EXP and Loopback/Record/Playback levels.
- [ ] Test startup, Android Back, dialogs, rotation/responsive layouts.
- [ ] Keep Import All / Export All labeled experimental until their outstanding validation is closed.
- [ ] Back up the full pedal bank before any destructive import test.

## Public-facing material and legal/privacy
- [x] Select the open-source distribution model (owner decision recorded 7 November 2026).
- [x] Select GPL-3.0-only and add canonical GNU GPL v3 LICENSE text.
- [ ] Review dependency licenses and confirm all bundled artwork, fonts and other assets can be distributed under their respective terms.
- [x] Update the default-branch README landing page with truthful release status and links to the Android source/release-prep branch (README-only change; no application source merged to main).
- [x] Prepare the Android-app README on the release-prep branch with compatibility, installation, safety and known-limitations information.
- [ ] Add a privacy notice based on an audit of network access, OAuth, integrations, local data, permissions and diagnostics.
- [ ] Review NUX name/logo and other third-party artwork/marks; retain non-affiliation notice.
- [ ] Prepare installation, update, troubleshooting and backup instructions.
- [ ] Prepare release notes and known-issues section.
- [ ] Confirm support/contact channel and issue-reporting template.
- [ ] Review APK permissions and release package contents.

## Publication gate
- [ ] All release-engineering checks complete.
- [ ] Physical QA is documented by the owner.
- [ ] Privacy/legal documentation is present.
- [ ] Draft release reviewed and approved.
- [ ] Only then publish the GitHub Release and announce the download link.
