# Preset Manager startup regression and USB-MIDI recovery

Date: 31 October 2026
Target: original NUX MG-30 Gen 2 firmware 6.0.x (not MKII)
Branch: android/ui-polish-pass-1

## User-visible incident

After installing the Preset Manager UI update, the Editor page showed only partially initialized content (empty signal-chain area and incomplete AMP editor) and the header reported USB-MIDI "Terputus". The connection control did not respond as expected.

## Root cause analysis

The Preset Manager refactor introduced a synchronous call to `initPresetManagerList()` in the core application startup sequence, before:
- the main `render()` call that populates the Editor's dynamic signal chain and model controls;
- the assignment of the top-header USB-MIDI connect click handler (the handler was wired later in that same startup sequence).

If Preset Manager's DOM initialization threw any exception, normal JavaScript execution stopped at that line. Consequently the Editor remained in its static/partially-rendered HTML fallback and the USB-MIDI button never received its click handler. This matches both symptoms in the user's screenshot. The specific runtime exception on the user's device was not captured, so avoid claiming a specific DOM property was the throw site; the startup-order flaw itself is confirmed in source.

## Recovery change

Commit `71487ec42da38aea07021b6a3cf8bf1a0a10930d`:
- Removed Preset Manager initialization from the pre-render/pre-connection-handler section.
- Core Editor `render()` now completes and USB-MIDI click handler is wired before Preset Manager initialization is attempted.
- Preset Manager initialization is wrapped in a local `try/catch`. Any Preset Manager-only error is logged and displayed in the Preset Manager status line, while Editor and USB-MIDI remain available.
- The post-connect Preset Manager refresh listener is also guarded by `try/catch`.

The app's native Android classes.dex is byte-identical between previously working Build #155 and recovery Build #178 (SHA-256 `f06449775ef4fcb472b26b847e9d9fa72322e1f391d0a51741cd4122355d4925`). AndroidManifest.xml is also byte-identical (SHA-256 `9d74987c33e450da97db6ba2a316de1705c78659284040f219d2736252060c50`). The `connectMG30()` function and native USB-MIDI JS bridge connect implementation were not changed by the Preset Manager refactor. This supports a WebView startup-order regression rather than a change in USB-MIDI native protocol/plugin.

## Regression test and build

Commit `14acb415b2ba64bcb63891d9e34328be350d5430` adds `tests/preset-manager-startup.test.js`:
- checks the inline main app script parses;
- checks core render and connect handler wiring occur before optional Preset Manager initialization;
- checks Preset Manager initialization is locally caught and cannot block Editor/USB-MIDI.

GitHub Actions:
- Build #178: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41211930296
- Result: 11 tests passed, 0 failed; Android debug build and artifact upload succeeded.
- Source commit: `14acb415b2ba64bcb63891d9e34328be350d5430`.
- Artifact ID: `13046512924`.
- Android APK size: 4,400,364 bytes.
- APK SHA-256: `ab87eb8e28a0106863e1f1275bb5fc5b03e2d85ac748e9696e76c52ed2372a55`.

## Physical validation still required

Install Build #178 on the Android phone, connect MG-30 using the same OTG cable/setup that worked with Build #155, and verify:
1. Editor signal chain and AMP/effect controls render normally before connecting.
2. USB-MIDI header button can connect and changes to Terhubung.
3. Preset Manager opens; do not start the 128-slot name scan until normal connection is verified.
4. Confirm NAM transfer, IR User/Third Party, Collection, MIDI mapping, Save-to-device, Copy Scene, preset Import and Export remain intact.

Do not claim hardware recovery validated until the user confirms successful connection and operation on the physical pedal.

## Preservation requirements

- Do not modify NAM payload/protocol or working transfer path.
- Do not modify IR User/Third Party and Collection packet payloads/mappings.
- Do not change MIDI mappings.
- Keep the 32-byte QuickTone IR name field handling.


## User instruction — rollback the Preset Manager experiment (31 Oct 2026)

The user reported that Build #178 still displayed the same incomplete Editor and USB-MIDI "Terputus" state. The earlier startup-order diagnosis was therefore insufficient and must not be presented as a confirmed fix.

Per explicit instruction to restore the Editor and avoid touching working areas, the Preset Manager refactor introduced after stable Build #155 was rolled back:
- `www/index.html` restored to the exact content at stable baseline commit `d75d55942ad57562b8b27018d4cda9933e237476`.
- `www/ui-redesign.css` restored to that same baseline.
- `www/ir-transfer.js` and `www/nam-transfer.js` restored to baseline, removing scan-coordination changes introduced only for Preset Manager.
- `www/mg30-preset-export.js` restored to baseline, removing the UI-only Export header label change.
- Removed the startup regression test that asserted the reverted UI's initialization order.

This restores the Editor page, USB-MIDI connection handler, and existing transfer pages to the version before the Preset Manager redesign. The 32-byte QuickTone IR-name format/parser/serializer fix is retained because it already existed in Build #155. Earlier NAM transfer, IR User/Third Party and Collection protocols, MIDI map, Save, Copy Scene, and single-preset Import/Export remain at the stable baseline.

The redesign is suspended. Do not reintroduce Preset Manager startup/scan code into the core Editor script. Any future Preset Manager UI work must be strictly isolated and tested so it cannot change or block Editor initialization or USB-MIDI connection.


## Restored build verification — Build #184 (2026-10-31)

- GitHub Actions run #184 succeeded: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41213464793
- Source commit: `e7636279a0c3556a6b994bb4f4ffd242e95c4a4b`.
- Protocol tests passed; Android debug build and artifact upload succeeded.
- Artifact ID: `13047232483`; ZIP size 4,018,194 bytes.
- APK: 4,395,972 bytes.
- APK SHA-256: `04d67d94cee87a3f70f5be6597451393aa85643f4ffdfa7fe19dc879a99365f4`.
- The five restored files were verified byte-identical to stable Build #155 baseline: `www/index.html`, `www/ui-redesign.css`, `www/ir-transfer.js`, `www/nam-transfer.js`, and `www/mg30-preset-export.js`.
- This is a source/build rollback, not proof of physical USB-MIDI recovery. User must install Build #184 and confirm Editor + USB-MIDI on hardware.
