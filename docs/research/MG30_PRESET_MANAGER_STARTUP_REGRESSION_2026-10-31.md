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
