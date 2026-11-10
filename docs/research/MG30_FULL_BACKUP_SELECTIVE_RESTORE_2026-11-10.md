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
