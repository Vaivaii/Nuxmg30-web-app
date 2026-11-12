# MG30 Studio Full Backup & Selective Restore

Date: 2026-11-10
Target: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII).
Feature branch: `feature/full-backup-selective-restore`.

## Scope and architecture

This feature upgrades the existing Device > Backup & Restore page. It does not add or change any MG-30 transfer protocol.

### Backup archive

- Produces one `MG30_Studio_Full_Backup.zip` using the in-app STORE-only ZIP implementation.
- Includes a manifest, README, CRC32-verified files and section metadata.
- ZIP entries are path-validated; duplicate paths, path traversal, unsupported compression/encryption and CRC mismatches are rejected.
- Archive limit: 200 MB; entry count limit: 512.
- Android writes the ZIP through a native chunked staging flow (64 KiB chunks) followed by the system document picker. The destination is reopened and verified by byte count and CRC32 before success is reported.

### Included sections

1. **MG-30 Preset Bank** — all 128 hardware presets exported through the existing `MG30PresetExportAll` QuickTone-compatible read-only serializer. It includes 3 scenes per preset and embedded per-preset User IR resources where present.
2. **Local Preset Drafts** — `mg30-presets`, `mg30-draft`, and up to 3 saved local slot-backup snapshots for each hardware program.
3. **NAM Library** — source files in app-private `nam-models` storage with extension `.nam` or `.namb`; each is read back and size-checked before inclusion.
4. **IR Collection** — local WAV Blob records in IndexedDB database `mg30-studio-ir-collection-v1`, store `slots`, plus preset-to-Collection assignment metadata. Every WAV is parsed before inclusion.
5. **App Settings** — an explicit safe-key allowlist. YouTube API keys and Tone3000 access/refresh tokens are excluded.

Full Backup requires the original MG-30 connected over USB OTG because its 128-slot hardware bank is part of this backup.

## Selective Restore

- ZIP structure, manifest, supported preset patch size/order, NAM A2-Lite file structure, WAV structure, file sizes and CRC32 are validated before a section can be selected.
- Each present section has an independent checkbox. No section is selected by default; the user explicitly selects what to restore.
- Conflict modes:
  - **Keep Both** — preserves NAM duplicates with a new filename; maps conflicting IR slot records to the next free local Collection slot; duplicates conflicting preset drafts; preserves existing app setting values.
  - **Keep Existing** — skips conflicting NAM files and IR slots, leaves existing drafts/settings in place, and adds non-conflicting draft records.
  - **Replace** — replaces same-name NAM files atomically per file, overwrites corresponding IR Collection slots, replaces local draft data and overwrites whitelisted settings.
- Restored NAM files go back into app-private NAM Library only; they are not sent to the pedal.
- Restored IR WAVs go back into the local IR Collection IndexedDB only; they are not sent to the pedal.
- Hardware preset bank restore reuses the existing `MG30PresetImportBridge.importAll` transaction and requires 128 preset/384 scene readback verification. This overwrites all 128 hardware slots; the patch can also replace embedded User IR resources present in the bank.
- The user sees an explicit confirmation warning before any restore starts.

## Preserved project boundaries

- Target remains original MG-30 Gen 2, firmware 6.0.x, not MKII.
- No changes to NAM A2-Lite transfer framing or NAM import sequence.
- No changes to IR User / Third Party transfer framing or IR Collection transfer framing.
- No changes to MIDI mappings or the Preset Manager's existing hardware protocols.
- Existing Export All / Import All routines are reused rather than reimplemented.

## Safety and known limitations

- The archive is intended for MG30 Studio Android app data, not a firmware update or pedal firmware image.
- API keys and OAuth credentials are intentionally not backed up.
- Full Backup reads the connected hardware preset bank, while the NAM Library and local IR Collection are backed up from this app's local storage. IR Collection restore is deliberately local-only and does not send WAVs to the MG-30.
- Hardware preset bank restore can overwrite every device preset and embedded User IR resources in that patch. The existing Import All transaction waits for ACKs and verifies all 384 scene payloads; an interrupted transfer can still leave hardware partially written and must not be retried blindly.
- Restore sections are applied in sequence; they are not a single cross-device atomic transaction. NAM file replacement uses per-file staging; the IR batch uses an IndexedDB transaction. A hardware-bank transfer cannot be rolled back automatically by this utility.
- Android installation must be tested on-device. Release build verification does not substitute for a real MG-30 USB OTG run.

## Validation

Automated coverage:
- ZIP writer/reader round trip with UTF-8 filenames and binary bytes.
- CRC32 mismatch detection.
- Duplicate/path traversal/unsupported ZIP input rejection.
- NAM, IR and preset-draft conflict planning.
- Safe settings allowlist.
- UI/HTML/native plugin/export/restore bridge integration checks.
- Existing repository protocol regression suite.

Signed candidate target: Community .31 / versionCode 31 (same signing certificate lineage as the prior Community builds). Physical device and MG-30 acceptance must be recorded after installation.


## Final signed build and regression verification

- Final source commit used for APK: `6fb8e8ed639acf357dfc19288590d105fde9b5de`.
- Final docs-only commit after packaging: recorded on branch head separately; no app code changed after the APK source commit.
- Debug workflow: [run 42773565267](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42773565267) — tests, Android project generation, Gradle debug build and artifact upload succeeded.
- Signed Community workflow: [run 42773565348](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/42773565348) — all jobs succeeded, including keystore validation, signed Gradle release, APK identity/signature/checksum verification and audit upload.
- Regression result: 391 passed, 0 failed.
- Gradle: `BUILD SUCCESSFUL in 1m 40s`.
- Package: `com.vaivaii.mg30studio`; version `1.0.0-community.31`; versionCode `31`.
- APK size: `3,589,770 bytes`.
- APK SHA-256: `ff3b661d41e85f4b23852a9b533575fac05ef43f2a2e07cd67830df585fb5f0c`.
- Signature: APK Signature Scheme V2 valid; one RSA-4096 signer. Certificate SHA-256 `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`, matching the previous Community signing certificate.
- Audit artifact ID: `13743395561`; ZIP SHA-256: `bfa14e577dcb5ef672b877cdebadb6327df640699b14280a90a61bb1a0383810`.

The APK was downloaded from the Actions audit artifact, extracted, and independently checked against its SHA-256 file. Its package/version metadata and V2 signer details were inspected locally. The bundled WebView JavaScript was also checked for the Full Backup ZIP, Selective Restore UI, NAM rollback, and localStorage rollback code paths.

No physical Android phone or MG-30 was connected to the build runner. Hardware acceptance remains a user-side test after installing the signed .31 update. Install over the existing app without uninstalling or clearing app data.

## Final-polish stabilization scope — Community .32 candidate

User-requested work for the temporary final app build:
- Backup & Restore mobile page must remain a complete vertical scroll area, including the final warning text and bottom controls; remove the fixed tab-fade layer from this page so it does not mask the warning.
- Full Backup, ZIP inspection and Selective Restore must show a blocking operation dialog with current step, detail and progress. Determinate percentages are based on completed preset/file/chunk/ACK/readback counts; indeterminate animation is used only while an operation does not expose a meaningful fraction.
- Restore progress is reported for NAM files, IR Collection records, hardware-bank write ACKs and the 128-preset / 384-scene readback. Duplicate starts are blocked while the operation is busy.
- The candidate is prepared as signed Community .32 / versionCode 32 using the repository's existing release signing keystore workflow. Do not describe it as signed until the `apksigner verify` step succeeds and the certificate fingerprint is recorded.
- This stabilization scope does not add device-resident IR/NAM readback; it preserves the existing and explicitly documented distinction between hardware preset bank (including embedded per-preset User IR data), local NAM Library, and local IR Collection.

## Next planned Full Backup development phase (not included in .32)

After the app-shell/backup UI stabilization is accepted, the next development phase is device-asset backup and slot-preserving restore:

1. **Hardware IR Collection** — enumerate and read all 24 physical Collection slots, including WAV-equivalent waveform and curve payloads, names/CRC and original slot index. Backup must distinguish actual pedal slots from the app's local IndexedDB mirror. Restore writes each entry to its same original slot and performs readback verification. A slot that cannot be read completely must be reported unavailable; never substitute a local mirror silently.
2. **Hardware NAM slots** — back up the actual model weights from each populated device slot, with its slot identity/metadata. Restore the model into the same device slot using the existing proven NAM A2-Lite write path, then verify slot metadata and model-content readback wherever the device protocol permits. The current research note still says the 7,484-byte device weight readback command is unproven, so that investigation is a prerequisite; metadata-only readback must not be called a full NAM backup.
3. Preserve the 128 presets / 384 scenes and their embedded User IR resources as already covered by the existing preset-bank backup.

Stem Splitter and AI Tone Preset are explicitly deferred. Do not add them to the .32 stabilization scope or alter their branches/features in this work.

Acceptance boundary: the signed .32 APK can stabilize the current UI and progress feedback, but it does not yet fulfill the later device-slot NAM/IR preservation phase. That phase remains a separate reverse-engineering and hardware-validation milestone.

## Signed Community .32 final-polish artifact — 2026-11-12

- Source commit: `c665b483832378a37e34af85ec3da590a6ad3c2d` on `release/mg30-studio-final-polish`.
- Signed workflow: [run #110](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43148046415) — all steps succeeded: 417 tests, keystore/alias validation, Android generation, signed `assembleRelease`, `apksigner` verification, package identity/checksum checks and audit artifact upload.
- Regression suite: **417 passed, 0 failed**. Debug workflow [run #717](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/43148046477) also passed tests, Capacitor Android generation, Gradle `assembleDebug` and artifact upload.
- Gradle release: `BUILD SUCCESSFUL`.
- Package: `com.vaivaii.mg30studio`; `versionCode=32`; `versionName=1.0.0-community.32`.
- Signed artifact ID: `13912443041`; artifact ZIP SHA-256: `ada251e59e9136b3b11b965f8738e5551c239fa6d7c5da98a4316073d7eb32cf`.
- Extracted signed APK size: `3,594,966 bytes`; APK SHA-256: `706dcb4a7ea52743f0e0303664ea6a6d622e1e0418b00847cc99e57f792c3849`.
- APK signature: APK Signature Scheme V2 verified `true`; one RSA-4096 signer. Certificate SHA-256 `3cb91a0f76d2a1eb38a5c311a2bf1c08051ab8bf41c4a00401693f062c6bf85b`, same existing Community signing certificate lineage.
- Artifact ZIP and APK ZIP integrity checks passed; extracted APK hash matched the included `.sha256` file. The exact APK's Vite JS/CSS assets were inspected and contain the progress overlay, progress stages, Backup page scroll rules and bottom-fade removal.
- Build run #108 from source before correcting versionName was not accepted as final: its `versionCode` was 32 but `versionName` remained .31. The accepted run is #110 above, where both are .32 and the new regression assertion enforces this.

### Physical acceptance and next scope

- This is a signed, CI-verified Community .32 candidate. The runner did not have the user's Android phone or MG-30 connected, so Backup & Restore scrolling and progress interactions still need the user's physical-phone acceptance; no hardware behavior is claimed as physically tested.
- .32 only stabilizes the existing Backup/Restore UI and reports progress for the current backup sections. It does not yet back up actual device-resident NAM model weights or all 24 device IR Collection slot payloads. That remains the next planned device-readback / same-slot-restore project documented above.
- Stem Splitter and AI Tone Preset remain deferred and untouched.
