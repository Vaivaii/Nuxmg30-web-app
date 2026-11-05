# Export All SysEx latency optimization — 2026-11-06

Target: Original NUX MG-30 Gen 2 firmware 6.0.x (not MKII).

## Baseline inspection (Build #595)

The Export All loop already performs the requested incremental session-RAM cache lookup:
- For each program index 0–127, `presetManagerCache.get(program)` is evaluated before any Program Change or live readback.
- A cache hit increments `cacheHits` and uses the cached scene/resource arrays; it skips `selectProgramForRead(program)` and `readSingleWithManagerCache()`.
- A cache miss selects the slot, reads it with the existing response-matched SysEx flow, then `readSingleWithManagerCache` stores the readback for reuse.
- Cache entries remain session-scoped and are invalidated by existing preset-write/resource changes. This path was preserved; tests now explicitly protect the order of cache check before any device request.

## Latency sources and changes

1. The shared MIDI send queue had a 45 ms minimum gap (`MIDI_GAP=45`) between every frame. A new Export-All-only pacing mode now uses `EXPORT_ALL_MIDI_GAP=22` ms. The standard 45 ms gap remains unchanged for all other app functions and for Export Single.
2. `selectProgramForRead()` waited 360 ms after each Program Change. It now waits `EXPORT_PROGRAM_SETTLE_MS=25` ms. The subsequent indexed 0C/00 scene read registers its SysEx response listener before sending and validates exact command, program and scene, so data acquisition remains response-gated rather than trusting a blind sleep.
3. Existing `requestPresetExportFrame()` already awaits the matching SysEx response before the next scene/metadata request. Existing waveform/curve batch reader already registers one listener and resolves its Promise once all expected offsets have arrived; it retains offset, length, duplicate and timeout validation.

## Safety and cleanup

- Fast pacing is activated only around `exportAllPresets()`, including slot selection, scene, metadata, waveform and curve requests.
- A nested `finally` restores the original active program when required and always disables the fast pacing mode, including cancellation/error paths after mode activation.
- No global MIDI pacing change: ordinary Editor, NAM, IR Collection, User/Third Party IR, MIDI/CC controls and Export Single retain 45 ms.
- No changes to NAM or IR transfer packet bytes, Collection/User routing, resource marker interpretation, Import All, or MIDI/CC mappings.
- Export remains read-only against the pedal.

## Regression tests

Added coverage to ensure:
- The cache lookup happens before Program Change and live readback and the hit branch skips both.
- Export All fast mode selects 22 ms, Program Change settling selects 25 ms, and fast mode is disabled in cleanup.
- Scene requests continue to use exact-match Promise/listener SysEx response gating.

## Validation state

The code commit triggers the repository Android workflow. CI test and APK results, followed by physical MG-30 Gen2 validation, must be recorded separately. Do not infer that 22 ms pacing is hardware-proven until the user tests the resulting APK; if a response/offset is missed, preserve the diagnostics and adjust pacing only for Export All.
