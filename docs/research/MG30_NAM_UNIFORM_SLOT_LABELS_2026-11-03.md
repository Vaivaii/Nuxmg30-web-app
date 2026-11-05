# MG30 NAM UI — Uniform default slot labels and legacy-name migration

**Date:** 3 November 2026 (Asia/Jakarta)  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-mockup-alignment-undo`  
**Source commit:** `df9b02206438aad0a550620246b90958abc62fa6`

## User clarification

The earlier instruction to restore AATR to ID 61 was a misunderstanding. The user clarified that AATR SX3 Clean BAL3 CAB is **not** a default NAM name. All ten slots must use the same generic naming convention based on their sequential IDs in the screenshot.

Expected list:
- NAM Slot 01 · ID 54
- NAM Slot 02 · ID 55
- NAM Slot 03 · ID 56
- NAM Slot 04 · ID 57
- NAM Slot 05 · ID 58
- NAM Slot 06 · ID 59
- NAM Slot 07 · ID 60
- NAM Slot 08 · ID 61
- NAM Slot 09 · ID 62
- NAM Slot 10 · ID 63

## Source correction

- Removed the AATR special case from the default profile expression. Every slot now uses `NAM Slot {NN} · ID {53 + slot}`.
- Preserved the numeric mapping formula `const slot=i+1,id=53+slot,number=String(slot).padStart(2,'0');` unchanged.
- Because older builds may already have persisted the incorrect hard-coded AATR label in `localStorage['mg30-nam-slot-names']`, the profile initializer now recognizes only the two exact legacy values `AATR SX3 Clean BAL3 CAB · NAM 07` and `AATR SX3 Clean BAL3 CAB · ID 61`. If found under the old ID 60 or 61 key, it migrates that entry to that ID's generic slot label.
- Other customized slot names are preserved. Unrelated localStorage keys and records are not cleared.
- The old AATR strings remain in the source only as exact migration match values so the bad labels can be removed from existing installations; they are no longer used as a default/display label.

## Protected NAM implementation

- Only `www/index.html` (default display-name initializer) and `tests/nam-slot-default-name.test.js` changed.
- `www/nam-transfer.js` was not modified. NAM SysEx framing, command/selector IDs, transfer function, descriptor/data packing, ACK handling, retry/timeout behavior, readback and hardware communication remain untouched.
- The contiguous UI slot ID sequence remains IDs 54 through 63.

## Regression coverage

The tests execute the actual profile initializer in a VM with a fake localStorage and verify:
- All ten generated names and numeric IDs against the expected sequence.
- Migration of the legacy AATR label under ID 60 to `NAM Slot 07 · ID 60`.
- Migration of the legacy AATR label under ID 61 to `NAM Slot 08 · ID 61`.
- An unrelated custom name for ID 59 is preserved while ID 60 is migrated.
- The ID formula and existing NAM transfer module markers remain present.

A second simulation was run using the exact initializer extracted from `assets/public/index.html` inside the Build #347 APK. The complete ten-label sequence, both legacy migrations, and preservation of an unrelated custom label all passed.

## Build #347 validation

- GitHub Actions run: [Build #347](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41507690980)
- Run ID: `41507690980`
- Source commit: `df9b02206438aad0a550620246b90958abc62fa6`
- Conclusion: **success**.
- `npm test`: **136/136 passed, 0 failed**.
- Capacitor Android generation and USB audio plugin registration: **passed**.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL**.
- APK artifact upload: **passed**, artifact ID `13172016621`.

## Artifact verification

- Artifact ZIP: **4,116,805 bytes**, SHA-256 `75c27095a0e0c472cc0a0adc3375eedb1b16683cb2a22fc82975185be81a531e`.
- Extracted `app-debug.apk`: **4,494,672 bytes**, SHA-256 `42f86608c540ccce8ac1e711ed7256190715c91eeec5c17ce17faf7008302dd3`.
- ZIP and APK archive integrity checks: **passed**.
- Embedded `assets/public/index.html` was extracted from APK and the exact profile initializer was executed in a local simulation: the ten generic labels and IDs 54-63 appeared in order; stale AATR strings were migrated correctly; unrelated custom slot names remained intact.

## Physical device confirmation

Install Build #347 and reopen the Editor amp model list. Expected:
- Slot 07: `NAM Slot 07 · ID 60`.
- Slot 08: `NAM Slot 08 · ID 61`.
- All other slots follow the same pattern.
No AATR label should remain as a default name. Hardware transfer behavior is intentionally untouched.
