# MG30 Studio — Community Edition

MG30 Studio is an independent Android companion application for the **original NUX MG-30 Gen 2 running firmware 6.0.x**. It is not intended for the MG-30 MKII.

The planned distribution channel is a free Community Edition. MG30 Studio is not developed, endorsed or supported by NUX or Cherub Technology.

## Release status

There is no published signed Community Edition release yet.

- [GitHub Releases](https://github.com/Vaivaii/Nuxmg30-web-app/releases)
- [Current Android source and release preparation branch](https://github.com/Vaivaii/Nuxmg30-web-app/tree/release/community-prep-v2)
- [Public release checklist](https://github.com/Vaivaii/Nuxmg30-web-app/blob/release/community-prep-v2/PUBLIC_RELEASE_CHECKLIST.md)

The Android release candidate is based on Build #669. Automated CI passed 310 tests and produced a debug APK, but that is not a signed public APK and does not prove that every feature has passed physical hardware testing.

## Compatibility

- Android application ID: `com.vaivaii.mg30studio`
- Hardware: original NUX MG-30 Gen 2
- Firmware: 6.0.x
- MG-30 MKII: not supported or validated

## Feature status and safety

The app includes editor and Signal Chain controls, USB-MIDI integration, NAM and custom IR workflows, preset management and studio/audio features. Hardware validation varies by feature.

Import All and Export All remain under validation. Import All may overwrite the pedal's full 128-preset bank. Back up all presets before any bulk-write operation. Stop if the app reports a protocol mismatch or incomplete acknowledgement; preserve diagnostics rather than repeatedly retrying.

Do not treat automated tests or APK packaging as proof of hardware compatibility. Read the build-specific release notes and known limitations before use.

## Installation

When a signed release is published:

1. Download `MG30-Studio-Community.apk` from GitHub Releases.
2. Verify the accompanying SHA-256 checksum.
3. Back up important app data and pedal presets.
4. A first signed release may require uninstalling a previously installed debug-signed build before installation. Back up anything needed first.
5. Future signed updates must use the same release key.

## License and privacy

The current Android release-preparation source branch is licensed under [GNU GPL-3.0-only](https://github.com/Vaivaii/Nuxmg30-web-app/blob/release/community-prep-v2/LICENSE). This default-branch landing page does not mean the older application source on `main` has been synchronized; use the release-preparation branch for the current Android source.

A source-audited [privacy notice](https://github.com/Vaivaii/Nuxmg30-web-app/blob/release/community-prep-v2/PRIVACY.md) and preliminary [third-party dependency license inventory](https://github.com/Vaivaii/Nuxmg30-web-app/blob/release/community-prep-v2/THIRD_PARTY_NOTICES.md) are available. Final APK, manifest, dependency and asset checks remain release gates.

## Project documentation

See the [Community Release Guide](https://github.com/Vaivaii/Nuxmg30-web-app/blob/release/community-prep-v2/COMMUNITY_RELEASE_GUIDE.md) and [Public Release Checklist](https://github.com/Vaivaii/Nuxmg30-web-app/blob/release/community-prep-v2/PUBLIC_RELEASE_CHECKLIST.md).

## Independence and trademarks

MG30 Studio is an independent community project. NUX and MG-30 are referenced only to identify the compatible hardware; this project is not affiliated with, endorsed by or supported by NUX or Cherub Technology. Third-party marks and bundled assets must be reviewed before broad distribution.
