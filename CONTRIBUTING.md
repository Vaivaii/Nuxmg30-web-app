# Contributing to MG30 Studio

Thank you for considering a contribution.

## Project target and compatibility

- Target only the original NUX MG-30 Gen 2 running firmware 6.0.x.
- MG-30 MKII is not part of this project's current compatibility target.
- The Android application ID is `com.vaivaii.mg30studio`.

## License

The current release-preparation source branch is licensed under GNU GPL-3.0-only. By submitting a contribution, you confirm that you have the right to submit it under GPL-3.0-only and that you have identified any third-party material and its license. Do not submit copied proprietary assets, fonts, artwork, firmware, NAM captures, IR files or other material unless you have permission to redistribute them.

See [LICENSE](LICENSE) and [Third-Party Notices](THIRD_PARTY_NOTICES.md).

## Protected compatibility areas

Changes must not regress:
- NAM loading and transfer.
- User / Third Party IR import.
- IR Collection import and mapping.
- Existing MIDI/CC mappings and USB-MIDI.
- Preset read/write, Signal Chain order and Serial/Parallel state.
- Existing audio loopback and recording paths.

Keep the two IR transfer command families separate: User/Third Party and Collection are not interchangeable. Do not change mappings or protocol payloads without capture evidence and a regression test.

Do not claim hardware support based only on unit tests or a successful APK build. Hardware changes must be tested on the original Gen 2 firmware 6.0.x and documented.

## Before submitting

1. Explain the problem and the expected behavior.
2. Identify the affected feature and protocol path.
3. Add or update automated tests for logic changes.
4. Run `npm test`.
5. Run `node --check scripts/init-android.mjs` when changing Android initialization.
6. If Android/native code changes, run the Android build and report the exact build result.
7. For device protocol changes, attach sanitized capture evidence and record physical test results.
8. Update the relevant research note or release checklist.

Do not include OAuth tokens, API keys, passwords, signing keystores, private preset backups or personal data in commits, issues or pull requests.

## Reporting issues

Use the [GitHub Issues page](https://github.com/Vaivaii/Nuxmg30-web-app/issues). Include the app build, Android version, original MG-30 firmware version, exact reproduction steps and sanitized logs. Back up pedal presets before testing any bulk-write behavior.
