# NUX MG-30 Studio — Project Recovery Checkpoint

**Tanggal pemulihan:** 3 November 2026 (Asia/Jakarta)  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x; bukan MG-30 MKII  
**Tujuan:** Menyimpan posisi repo, source, CI, APK, batas validasi fisik, dan pekerjaan terbaru agar sesi berikutnya tidak kembali ke Build #248 atau checkpoint lama.

## 1. Posisi repository yang ditemukan

Repository: `Vaivaii/Nuxmg30-web-app`  
Default branch GitHub: `main` (HEAD `079b65669441daa320332cf6bb61c2d609fdcd5c`, 24 Oktober 2026). Jangan menyamakan default branch dengan branch kerja terakhir.

Branch dengan commit terbaru saat pemulihan: `feature/studio-usb-reamp-loopback`.

Source HEAD sebelum dokumen pemulihan ini:
- Commit: `81c5b0c280e3500fec31e002e3035cee18eaf861`
- Waktu commit: 3 November 2026, 04:33:02 UTC (11:33:02 WIB)
- Pesan: `Align USB endpoint type guards with Android API levels`
- File pada commit terakhir: `native-android/MG30AudioOutputPlugin.java` (2 insertions, 2 deletions).
- Parent: `65001a3e2c429b6a56f85722946177cbe59fb5ae`.
- Parent branch sesuai research log: `feature/studio-mockup-alignment-undo`.

GitHub tidak memiliki konsep satu branch global yang selalu “aktif”; nama di atas adalah branch dengan commit paling baru di antara branch yang terdaftar ketika diperiksa.

## 2. Perbedaan source terbaru dengan build sukses

Latest source branch `feature/studio-usb-reamp-loopback` dibanding source Build #351:
- Build #351 source commit: `534fb0049f87a9d2a5e6f5eaa3229026ac121ee6`.
- Compare: branch terbaru ahead 14 commits, behind 0.
- File yang berubah sejak Build #351:
  - `UI_POLISH_CHECKLIST.md`
  - `docs/research/MG30_NAM_TONE3000_GRID_WIDTH_FIX_2026-11-03.md`
  - `docs/research/MG30_STUDIO_USB_REAMP_LOOPBACK_2026-11-03.md`
  - `native-android/MG30AudioOutputPlugin.java`
  - `scripts/init-android.mjs`
  - `tests/studio-usb-output.test.js`
  - `www/index.html`
  - `www/studio-usb-output.js`

Perubahan aplikasi pada branch terbaru adalah penemuan endpoint USB output yang terisolasi. Tidak ada perubahan pada `www/nam-transfer.js`, `www/ir-transfer.js`, `www/native-midi.js`, `native-android/MG30AudioPlugin.java` (USB input/AudioRecord yang sudah ada), mapping MIDI, preset protocol, atau Signal Chain. `www/index.html` hanya mendapat referensi modul UI output baru pada diff tersebut.

## 3. GitHub Actions dan APK terbaru yang berhasil

Workflow terakhir yang ditemukan: **Build MG30 Studio Android APK #351**
- Run ID: `41517135543`
- Branch: `feature/studio-mockup-alignment-undo`
- Source commit: `534fb0049f87a9d2a5e6f5eaa3229026ac121ee6`
- Conclusion: success.
- Run: https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41517135543

Log Actions mentah menunjukkan:
- `npm test`: **142 tests, 142 pass, 0 fail, 0 skipped**.
- Vite 7.3.7 production build: sukses.
- Capacitor Android generation dan plugin setup: sukses.
- Gradle `assembleDebug`: `BUILD SUCCESSFUL`.
- Upload artifact: sukses.

**Koreksi dokumentasi:** Bagian Build #351 di checklist saat ini menyebut 137/137. Log run #351 yang diperiksa langsung menunjukkan 142/142. Gunakan log Actions sebagai angka otoritatif sampai checklist diperbaiki.

Artifact Build #351:
- Artifact ID: `13176995035`
- ZIP: `MG30-Studio-debug-APK`, 4,116,944 bytes
- ZIP SHA-256: `922823f6bd9b382640441c2b4240f467c4117878e07b1740e1687437fe411191`
- APK: `app-debug.apk`, 4,494,948 bytes
- APK SHA-256: `bfd3120ca348abcf9f1cb20309479caa520883d2f7b4182f544bfe7f033f3211`
- ZIP dan APK archive integrity checks: passed.
- Packaged APK contents were inspected. `MG30AudioOutputPlugin` and `studio-usb-output.js` are **not present** in this APK, so Build #351 is not a build of the latest USB-output discovery branch.

Build #350 failed; do not distribute it. Build #351 is the latest successful artifact found on 3 November 2026. The repository had no GitHub Releases listed at the time of inspection.

**Install status:** Repo notes do not identify the exact build number that is currently installed on the user's phone. The Build #351 checklist entry still requests physical handset verification. Do not claim Build #351 was installed or hardware-verified unless the user confirms it.

## 4. Latest branch: USB Reamp / Loopback discovery boundary

Research file: `docs/research/MG30_STUDIO_USB_REAMP_LOOPBACK_2026-11-03.md`.

Implemented on `feature/studio-usb-reamp-loopback`:
- An isolated Capacitor plugin enumerates Android output endpoints via `AudioManager.GET_DEVICES_OUTPUTS`.
- It reports endpoint IDs, names/types, USB classification, advertised sample rates, channel counts and PCM encodings where exposed.
- It distinguishes generic USB output from a name match for MG-30/NUX; this name match is only an identification hint.
- A Studio > DAW > Track Settings discovery panel and source-level regression tests were added.
- Existing USB input recorder `native-android/MG30AudioPlugin.java` remains unchanged.

Not implemented or verified:
- No `AudioTrack` / AAudio / Oboe playback stream.
- No DI WAV playback into the pedal.
- No simultaneous playback + processed USB return capture.
- No full-duplex 48 kHz / 24-bit verification, drift/latency/dropout test.
- No NORMAL / USB LOOPBACK / REAMP / DRY OUT routing-mode selection.
- No physical phone + original MG-30 Gen 2 endpoint enumeration test.
- The branch research note says its new tests have not yet run in CI; no Actions build or APK is approved for this branch.

**Workflow issue:** `.github/workflows/build-apk.yml` push filters do not include `feature/studio-usb-reamp-loopback`. The workflow does allow manual `workflow_dispatch`, but no Actions run for this latest branch was found. Do not confuse Build #351 with a build of this branch.

## 5. Preserved feature status and protocol guardrails

### IR User / Third Party
- Hardware-tested User transfer uses the `10 01` waveform, `09 01` name, `11 01` curve command family.
- User-path capture contains 64 waveform frames, 1 name frame, 10 curve frames, with corresponding ACK families `10 03`, `09 03`, `11 03`.
- Project notes record that multiple WAV files transferred successfully to the dedicated Third Party / User path on the physical original Gen 2 pedal.
- Observed parameter values differ among captures/tests (including 1 and 0x47); their meaning is not conclusively established as a physical slot number. Do not hardcode semantics from one capture.

### IR Collection
- Collection uses a distinct family: `6A 01` waveform, `6C 01` name, `6B 01` curve; ACKs are `6A 03`, `6C 03`, `6B 03`.
- Keep Collection and User command families separate. Never change the Third Party/User importer to Collection commands.
- Project notes record physical testing of Collection import and the app's **Gunakan di User** action.
- The app's current fallback for **Gunakan di User** re-sends the original WAV saved in the app's local IndexedDB mirror through the known User path. It does not directly read/move the stored Collection waveform from pedal memory.
- External QuickTone Collection entries are not yet enumerated by MG30 Studio's local list/readback path.
- `6E 01` request / `6E 02` response was observed during QuickTone's Collection Use action, but full semantics/effect are not yet decoded.
- Candidate `6C 00` metadata read query remains unconfirmed by a physical-device response. ACKs alone do not prove data was stored or read back.

### Offline IR builder
- Independent capture validation reports 64/64 waveform frames byte-identical, 1/1 name frame identical, and 600/600 meaningful curve values identical for a reference WAV/capture pair.
- The final curve packet has 40 extra words outside the 600 meaningful values; offline zero-fill is safer but still needs physical-device acceptance testing.
- Offline byte parity against known examples is not proof of a production sender's ACK/retry state machine or generic import success.

### NAM, MIDI, Signal Chain and Presets
- Preserve the existing working NAM transfer path and do not rewrite NAM protocol while working on USB audio discovery.
- NAM slot UI labels were normalized to sequential IDs 54–63 in the latest UI pass; readback interpretation of slot names/status must remain evidence-based.
- Preserve the established MIDI mapping and USB-MIDI transport/framing.
- Preserve the existing real-time movable Signal Chain behavior and its sender/ACK/readback logic.
- Preserve preset file format, read/write, export/import and hardware save paths; do not use this branch to refactor them.

## 6. Next safe steps

1. Keep `feature/studio-usb-reamp-loopback` isolated; do not merge into `main` or the known-good IR/NAM branches.
2. Before an APK is distributed from this branch, run the branch's test suite, Vite production build, Capacitor Android generation, Gradle `assembleDebug`, and packaged APK inspection. Fix failures and rerun.
3. Only after a successful build, install on the user's phone and inspect output endpoint IDs/names/types/rates/channels/formats with the original MG-30 Gen 2 firmware 6.0.x connected.
4. Implement a user-triggered AudioTrack route test only after endpoint inspection; preserve the existing AudioRecord capture route.
5. Test DI playback, then simultaneous output + input capture, measuring routing, latency, drift and dropouts before claiming Reamp/Loopback support.
6. After any code change, regress NAM, IR User/Third Party, IR Collection, MIDI mapping, USB-MIDI, preset read/write, and Signal Chain as applicable.
7. Keep this document and `UI_POLISH_CHECKLIST.md` updated with source commit, CI run, APK hash, physical install/test status, and unresolved items.

## 7. Recovery rule

Build #351 is a successful historical APK from the parent UI branch, not a build of the latest source branch. The latest source branch contains a new USB-output discovery experiment that has not yet been CI-built or physically tested. Treat these as separate states in every future handoff.
