# MG30 Studio — Public Release Checklist

## Release engineering
- [ ] Owner creates and securely backs up the permanent PKCS#12 release keystore.
- [ ] Four GitHub Actions signing secrets are configured.
- [ ] Run signed candidate workflow from `release/community-prep-v2`.
- [ ] 310+ regression tests (or updated suite) pass.
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
- [ ] Update the public README to describe the actual Android application, target and limitations.
- [ ] Add a privacy notice covering network access, OAuth, integrations, local data and diagnostics.
- [ ] Choose and add a source-code LICENSE; review all third-party dependencies and assets.
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
