# MG30 NAM UI — Restore AATR default display name to ID 61

**Date:** 3 November 2026 (Asia/Jakarta)  
**Target:** NUX MG-30 original Gen 2, firmware 6.0.x (not MKII)  
**Branch:** `feature/studio-mockup-alignment-undo`  
**Source commit validated by Build #346:** `42c320545f060e50733997b088a6865ffccee66d`

## User correction

The user identified that the AATR SX3 Clean BAL3 CAB default label had been left on the wrong NAM model ID after earlier transfer testing. The screenshot showed AATR displayed as NAM 07 while ID 61 was still shown under generic NAM Slot 08. User explicitly restricted the work to correcting the default slot name only; do not change NAM transfer/protocol code.

## Exact correction

Before:
```js
const slot=i+1,id=53+slot,number=String(slot).padStart(2,'0');
const defaultName=slot===7?'AATR SX3 Clean BAL3 CAB · NAM 07':('NAM Slot '+number+' · ID '+id);
```

After:
```js
const slot=i+1,id=53+slot,number=String(slot).padStart(2,'0');
const defaultName=slot===8?'AATR SX3 Clean BAL3 CAB · ID 61':('NAM Slot '+number+' · ID '+id);
```

Result:
- NAM Slot 07 remains numeric ID 60 and returns to generic label **NAM Slot 07 · ID 60**.
- NAM Slot 08 remains numeric ID 61 and receives the default model label **AATR SX3 Clean BAL3 CAB · ID 61**.
- The slot-to-ID formula `id=53+slot` is unchanged.
- Device selectors, model-index mapping, protocol IDs, transfer packets, ACK/retry/timing, readback, storage/serialization and all NAM transfer code are unchanged.
- No changes in `www/nam-transfer.js` or other NAM implementation modules.

## Regression coverage

Added `tests/nam-slot-default-name.test.js` to assert:
- AATR default name is attached to slot 08 / ID 61 only.
- Slot 07 returns to the generic generated name / ID 60.
- Existing NAM transfer function and readback implementation markers remain present.
- The ID formula remains the existing contiguous formula.

Build #345 was not distributable: its new test contained an incorrect assertion naming a non-existent function. That test-only assertion was corrected to the existing `sendMG30A2LiteTransfer` function before Build #346. No APK was built from #345.

## Build #346 validation

- GitHub Actions run: [Build #346](https://github.com/Vaivaii/Nuxmg30-web-app/actions/runs/41505759334)
- Run ID: `41505759334`
- Source commit: `42c320545f060e50733997b088a6865ffccee66d`
- Conclusion: **success**.
- `npm test`: **133/133 passed, 0 failed**.
- Capacitor Android generation and USB audio plugin registration: **passed**.
- Gradle `assembleDebug`: **BUILD SUCCESSFUL** (1m 29s).
- APK artifact upload: **passed**, artifact ID `13170303439`.

## Artifact verification

- Artifact ZIP: **4,116,751 bytes**, SHA-256 `b2ff86a935e07b27ec88e43464451b2c7104d9793144d08e246e103bf9ca7108`.
- Extracted `app-debug.apk`: **4,494,548 bytes**, SHA-256 `544f99bb42af4c3e5a9e3cd5d35b105f993e88f0819681b3b7a67e925c39170c`.
- ZIP and APK integrity checks: **passed**.
- APK embedded `assets/public/index.html` inspection confirmed the exact expression `slot===8?'AATR SX3 Clean BAL3 CAB · ID 61'`.

## Source scope

The only application source change is the one `defaultName` display-name expression in `www/index.html`. The only test change is `tests/nam-slot-default-name.test.js`. This does not modify NAM transfer implementation code, but only corrects which default UI name is attached to the existing slot/ID data.

Physical confirmation still requires the user to install Build #346 and inspect the NAM model list. The expected list entry is **AATR SX3 Clean BAL3 CAB · ID 61**, while slot 07 should show **NAM Slot 07 · ID 60**.
