# AI Tone Studio & AI Stem Studio — Technical Design

Date: 2026-11-11
Project: NUX MG-30 Studio
Target hardware: original NUX MG-30 Gen 2, firmware 6.0.x (not MKII)
Status: Product/technical proposal; not implemented or hardware-validated.
Working branch: `feature/full-backup-selective-restore`

## User-approved scope

- AI Preset Generator supports both natural-language prompts and reference-audio analysis.
- AI Stem Splitter produces four stems: Vocals, Drums, Bass, Other.
- The design must not regress the existing MG-30 transfer paths or the current NAM, IR, MIDI, preset, USB-audio and Loopback behavior.

## Design principles

1. AI is an isolated application capability, not a replacement for the device communication layer.
2. AI output is an untrusted proposal. A deterministic, firmware-specific validator must approve all preset structures, effect IDs and parameter ranges before the existing preset import bridge can receive them.
3. No guessed MG-30 effect IDs, parameter ranges, scene structures or serialization formats.
4. The first release targets original MG-30 Gen 2 firmware 6.0.x only. Do not silently target MKII.
5. Stem processing must never use or modify USB-MIDI/device asset protocols.
6. Do not claim exact amp/effect identification from a mixed reference recording. Reference analysis produces an approximate tone target with confidence/uncertainty.
7. Never embed provider API secrets in APK or browser code.

## System architecture

Application modules:
- AI Tone Studio: prompt input, reference-audio input, generation status, tone preview/editor, save draft and explicit device-apply action.
- AI Stem Studio: audio import, separation job, four-stem mixer/player and WAV export.
- Existing MG-30 Device Core: remains the only owner of device USB-MIDI/preset/NAM/IR operations.
- Existing preset library: stores generated presets as local drafts until explicitly approved.

Backend services (recommended hybrid deployment):
- AI API Gateway: authenticated entry point, schema validation, rate limits and quota.
- Tone Generation Service: LLM orchestration and structured tone plan generation.
- Audio Analysis Service: DSP feature extraction and optional audio-model interpretation.
- Job Queue: asynchronous stem separation jobs.
- GPU Worker: executes selected source-separation model.
- Temporary Object Storage: source and result audio with retention/expiry policy.
- Job Metadata Store: job state, model/version and output metadata.
- Preset catalog delivered to app/backend: versioned, verified catalog for original MG-30 Gen 2 6.0.x.

The mobile/web app should not hold model-provider credentials. The gateway should enforce file size/duration limits, MIME sniffing, user quotas, timeouts and deletion policies.

## AI Tone Studio — flow

1. User chooses text-only, audio-reference, or combined mode.
2. Validate prompt and audio file. Preserve original audio; do not overwrite it.
3. Extract measurable audio features where reference audio is supplied:
   - loudness/RMS and dynamics;
   - spectral centroid, roll-off and frequency balance;
   - onset/transient density and sustain-related estimates;
   - stereo width/ambience indicators where meaningful.
4. AI interprets user intent and measured features into a platform-neutral tone intent.
5. Tone planner proposes signal-chain categories and parameter intent.
6. MG-30 mapper maps only against the verified firmware-specific effect catalog.
7. Deterministic validator checks effect IDs, supported blocks, ordering constraints, parameter types/ranges, preset schema and scene structure.
8. Invalid output is rejected or sent through a bounded repair pass. Never silently clamp an unknown or invalid effect into another effect.
9. Show signal-chain and parameter preview. User may edit, regenerate or save as draft.
10. Only after explicit user approval, pass a validated preset through the existing preset import bridge.
11. Use existing verification behavior where available. Do not claim full hardware verification beyond what current readback actually proves.

### Tone plan intermediate representation

AI must not author raw device preset bytes. Use a versioned JSON intermediate representation, for example:

```json
{
  "schema_version": 1,
  "target": {
    "device": "NUX MG-30",
    "generation": "Gen 2",
    "firmware_family": "6.0.x"
  },
  "intent": {
    "style": "blues rock",
    "gain": "low-medium",
    "brightness": "moderate",
    "ambience": "subtle",
    "notes": ["responsive to guitar volume"]
  },
  "chain": [
    {
      "block": "drive",
      "catalog_effect_id": null,
      "parameters": {}
    },
    {
      "block": "amp",
      "catalog_effect_id": null,
      "parameters": {}
    }
  ],
  "analysis": {
    "source": "text_and_reference_audio",
    "confidence": null,
    "limitations": []
  }
}
```

Null IDs are intentional placeholders in this design example, not usable MG-30 IDs. Production mapper must populate them only from the verified catalog.

### Reference audio limits

- Audio analysis can estimate tonal traits; it cannot reliably prove which physical amp, cabinet, microphone, pedal or settings were used.
- Mixed songs may contain multiple guitars and processing. Allow users to upload an isolated guitar recording where possible.
- Display the result as a tone approximation, with uncertainty and editable suggestions.
- Do not reproduce copyrighted recordings or promise an exact clone of a commercial artist's sound.

### Preset safety rules

- Reject effect IDs absent from the target catalog.
- Enforce parameter types and verified min/max/step values.
- Validate required blocks and preset/scene schema.
- Preserve source preset and unrelated scene data when editing an existing preset.
- Do not alter MIDI mapping, NAM, IR, device settings or unrelated preset slots.
- Never write to pedal automatically when generation completes.
- Require a preview and explicit confirmation before device transfer.
- Keep generated preset drafts separate from confirmed hardware state.

## AI Stem Studio — flow

1. Import a user-provided audio file.
2. Validate actual file type, decodeability, duration, sample rate, channels and size.
3. Preserve the source file unchanged.
4. Convert/resample to the model's required input format in a temporary working copy.
5. Enqueue an asynchronous separation job.
6. Execute a four-stem model candidate such as Demucs/HTDemucs, subject to license, quality, memory/VRAM and throughput review.
7. Post-process outputs to maintain aligned start time and duration; retain provenance and source metadata.
8. Store four WAV outputs and a separation manifest.
9. Present a synchronized player/mixer with shared play/pause/seek, per-stem volume, mute, solo, loop and mixdown/export.
10. Allow retry only for failed jobs; do not rerun completed separation unnecessarily.

### Four-stem semantics

- Vocals: vocal content.
- Drums: percussion/drum content.
- Bass: bass content.
- Other: remaining instruments, which may include guitar, keyboard and other sources.

Important: the four-stem Other output is not a guitar-isolated stem. A later guitar-specific separation feature requires a separately evaluated model/workflow. Do not advertise guitar isolation as part of the initial four-stem model.

### Audio formats and outputs

Initial target:
- Inputs: WAV, MP3 and FLAC; M4A only if the selected decoder supports it reliably.
- Outputs: four WAV files.
- Preserve alignment and duration across stems.
- Record original file metadata and any resampling/conversion performed.
- Never replace the original input.

Suggested output layout:

```text
TrackName/
  vocals.wav
  drums.wav
  bass.wav
  other.wav
  separation.json
```

The manifest should include source metadata, model/version, processing parameters, output metadata, job ID and creation time. Avoid storing unnecessary personal data.

## Job state and progress UX

Both features should show real operation state:
- queued;
- uploading (where applicable);
- processing;
- post-processing;
- ready;
- failed.

Show stage and measurable progress only when the underlying service reports it. Use indeterminate progress if a reliable fraction is unavailable. Prevent duplicate submissions while a job is active. Provide actionable errors and safe retry. Cancellation must reflect actual worker cancellation behavior; never imply that cancellation reverses completed work.

For Tone Studio, show analysis, generation, mapping, validation and preview stages. For Stem Studio, show upload, queue, separation and output packaging stages.

## Storage, privacy and security

- Keep source audio local until the user explicitly starts upload.
- Explain whether processing is remote and obtain user consent before upload.
- Use authenticated, short-lived upload/download URLs.
- Apply per-user quotas, maximum file size/duration, request throttling and abuse controls.
- Encrypt transport and storage.
- Set documented retention/automatic deletion for temporary source and result files.
- Provide user-initiated deletion of cloud jobs/files.
- Never put API keys or provider secrets in app assets, APK, localStorage or client bundles.
- Treat prompts, audio metadata and model output as untrusted input.
- Validate output schemas server-side and client-side.

## MG-30 integration boundary

The only allowed path from AI Tone Studio to the device is:
AI tone plan -> verified MG-30 catalog mapper -> deterministic preset validator -> preview -> user confirmation -> existing preset import bridge.

AI modules must not:
- change NAM A2-Lite import or slot metadata behavior;
- change IR User/Third Party protocol 10/09/11;
- change IR Collection protocol 6A/6C/6B;
- change MIDI mappings or controller behavior;
- change preset serialization/transfer except through separately reviewed work;
- change USB audio or Loopback behavior;
- assume local NAM/IR library contents are a device backup.

Stem Studio is independent of the device communication layer. Any future audio routing into MG-30 must be designed and tested as a separate feature.

## Suggested implementation phases

### Phase 0 — Catalog and interface contract
- Inventory existing app architecture and UI framework.
- Extract and verify original MG-30 Gen 2 6.0.x effect IDs and parameter schemas from trusted project data/device evidence.
- Define versioned tone-plan JSON schema and validator tests.
- Define backend API contract, authentication and audio limits.
- No device protocol changes.

### Phase 1 — Text-only AI preset drafts
- Implement prompt UX and backend orchestration.
- Generate tone intent against verified catalog.
- Validate and preview only; save draft.
- Do not transfer to hardware until validator and preset serializer compatibility tests pass.

### Phase 2 — Reference-audio tone analysis
- Add upload/consent flow, DSP features and AI interpretation.
- Combine user text and audio analysis.
- Show uncertainty and editable suggestions.
- Validate generated plans using the same mapper/validator as Phase 1.

### Phase 3 — Stem separation MVP
- Benchmark selected four-stem model on representative music.
- Implement async jobs, storage expiry, progress and error states.
- Build synchronized four-stem player/mixer and WAV export.
- Validate alignment, duration, decoding and memory behavior.

### Phase 4 — Controlled device integration
- Connect validated preset drafts to existing preset import bridge.
- Add explicit confirmation and existing readback checks.
- Test on original MG-30 Gen 2 6.0.x hardware.
- No MKII assumptions and no changes to NAM/IR/MIDI paths.

## Acceptance criteria

### Tone Studio
- Text, audio-reference and combined modes produce a valid versioned tone plan.
- Every effect ID exists in the verified target catalog.
- Every parameter passes deterministic type/range validation.
- Invalid model output cannot reach the preset import bridge.
- User can preview, edit, save draft and discard.
- No hardware write occurs without explicit approval.
- Existing preset import tests, NAM import tests, IR tests and MIDI mapping regression tests remain green.
- Hardware application is tested on original Gen 2 firmware 6.0.x before release.

### Stem Studio
- Four expected outputs are produced for supported input.
- All stems remain aligned and have consistent duration.
- Original input remains unchanged.
- Player play/pause/seek controls remain synchronized.
- Individual stem mute/solo/volume and WAV export work.
- Failed jobs report stage and actionable reason.
- UI remains responsive during upload, queue and processing.
- Temporary cloud files expire according to policy.

### Regression and project guardrails
- Existing 128-preset/384-scene behavior remains unchanged.
- No change to NAM model import transaction or metadata readback.
- No change to IR User/Third Party or Collection transfer paths.
- No change to MIDI mappings, USB audio or Loopback.
- No claim of device NAM/IR backup completeness based on local caches.
- Build, automated tests and physical hardware validation are reported separately and honestly.

## Open decisions before implementation

1. Which verified effect catalog source will be authoritative for original MG-30 Gen 2 6.0.x?
2. Which backend/hosting environment and budget are acceptable?
3. What maximum audio duration and file size should be supported?
4. Should Stem Studio retain cloud results, or delete them after user download?
5. Which app platforms must be supported in the first release?

## Current status

This is a design document only. No AI feature implementation, backend deployment, model benchmark, APK build or hardware test is claimed by this document.
