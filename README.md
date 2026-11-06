# MG30 Studio — Community Edition

MG30 Studio is an independent Android companion application for the **original NUX MG-30 Gen 2 running firmware 6.0.x**. It is not intended for the MG-30 MKII.

The planned distribution channel is a free Community Edition. The application source code is licensed under **GNU General Public License v3.0 only (GPL-3.0-only)**. See [LICENSE](LICENSE). Modified versions and redistributed copies of covered code must comply with GPL-3.0. Third-party components and assets retain their own license terms.

It is not developed, endorsed or supported by NUX.

## Download

Public releases will be published on [GitHub Releases](https://github.com/Vaivaii/Nuxmg30-web-app/releases) after the signed APK, installation and hardware validation gates are complete.

Do not install debug workflow artifacts as public releases. The first signed community APK may require uninstalling a previously installed debug build because Android treats different signing certificates as different app identities.

## Compatibility

- Android app ID: `com.vaivaii.mg30studio`
- Hardware target: original NUX MG-30 Gen 2
- Firmware target: 6.0.x
- MG-30 MKII: not supported or validated

## Feature and validation status

The app includes editor and Signal Chain controls, USB-MIDI integration, NAM and custom IR workflows, preset management and studio/audio features. Feature-level hardware validation is not uniform.

Import All and Export All remain under validation. Import All may overwrite the pedal's 128-preset bank; make a complete backup before using any bulk-write function. Do not treat automated CI tests as proof of hardware compatibility.

Consult the release notes and known limitations for the exact build before installation.

## Installation

1. Download the signed `MG30-Studio-Community.apk` from a published GitHub Release.
2. Verify its SHA-256 checksum against the accompanying `.sha256` file.
3. Back up important app data and pedal presets.
4. If upgrading from a debug-signed build, export/backup anything needed, uninstall that debug build, then install the signed APK.
5. Allow Android to install apps from the selected source if prompted.

Future community updates must be signed with the same release key. Do not uninstall the signed app when updating.

## Safety

- Back up pedal presets before any bulk import or write operation.
- Keep the USB connection stable during device transfers.
- Stop if the app reports a protocol mismatch or incomplete acknowledgement; do not repeatedly retry a bulk write without preserving diagnostics.
- NAM, User/Third Party IR, IR Collection, MIDI/CC mapping, USB-MIDI and preset operations are treated as protected regression areas.

## Project status

The current release candidate baseline is Build #669. CI passed 310 automated tests and the Android debug packaging workflow. This does not mean that every feature has passed physical-device testing. See `COMMUNITY_RELEASE_GUIDE.md`, `PUBLIC_RELEASE_CHECKLIST.md`, [Privacy Notice](PRIVACY.md), [Third-Party Notices](THIRD_PARTY_NOTICES.md), and [Contributing](CONTRIBUTING.md).

## Independence and trademarks

MG30 Studio is an independent community project and is not affiliated with, endorsed by or supported by NUX or Cherub Technology. Product names are used only to identify compatibility. Review of third-party marks and bundled assets is required before public distribution.
