# TIE Phase 0 — Repository Audit & Architecture Mapping

**Audit date:** 2026-11-20  
**Repository:** `Vaivaii/Nuxmg30-web-app`  
**Branch:** `feature/tone-intelligence-engine`  
**Audited HEAD:** `b1c143f4ec8c9fb6e75085331ccfafa0547b616b`  
**Base checkpoint:** `d04aba5d036791067b7f25e08500c6ebc92a2014`  
**Scope:** Read-only source/specification audit plus documentation update. No application source, UI, provider, audio, MIDI, firmware, or dependency changes.

## 1. Executive summary

MG30 Studio is an existing browser-based application packaged for Android with Capacitor. It is not a greenfield app. Its principal UI and much of the editor logic live in a large `www/index.html`; modular JavaScript handles the DAW, MIDI bridge, preset serialization, AI tone orchestration, NAM/IR and cloud access. Native Android Capacitor plugins implement USB-MIDI, USB audio capture, USB audio output and DAW file operations.

Important verified reuse opportunities:

- A native USB audio capture path exists in `native-android/MG30AudioPlugin.java`, built on Android `AudioRecord`, with USB input device inspection, sample-rate/channel/encoding metadata, channel masks and WAV take storage. This is PCM audio, not MIDI.
- Studio DAW stores imported/captured audio media in IndexedDB and decodes it into Web Audio `AudioBuffer` objects. Existing Quick Record takes are imported through the native recorder's file-to-URL bridge.
- `www/ai-audio-analysis.js` already implements local FFT-based analysis and metrics over decoded PCM. This is a partial DSP capability, not yet the full TIE DSP specification.
- A shared AI infrastructure already exists: the Editor's AI orchestration in `www/ai-tone-studio.js`, the Cloud API client, Cloudflare Worker provider endpoints/fallback and the existing ChatGPT native SIWC bridge. TIE must adapt context into this infrastructure rather than create another provider manager.
- Actual MG-30 device control remains a separate USB-MIDI path in `www/native-midi.js` and `native-android/MG30MidiPlugin.java`; the editor's live catalogue and CC mapping are in `www/index.html`.

Major blockers/gaps:

- The exact requested path `MASTER-ROADMAP.md` is absent. Its full contents are present as `MG30-Studio-Master-Roadmap-TIE-v1.0.md` (775 lines), which was read in full.
- No service-worker registration or PWA manifest was found in the inspected app entry points/tree; treat PWA/offline install behavior as unverified/not implemented in this branch until further evidence.
- Existing DSP is a single analysis module with a limited metric set; no dedicated TIE worker, AudioWorklet DSP pipeline, spectrogram engine, analysis repository, comparison engine or knowledge-base retrieval module was found.
- The exact PCM ownership/export contract for every source (especially DAW track non-destructive access) needs a designed adapter. USB audio and Quick Record paths are real, but should not be conflated.
- GitHub remote state is verifiable; local checkout/working-tree status is not accessible through the connected GitHub tools. Do not claim the local working tree is clean.

## 2. Repository and branch audit

- Repository verified: `Vaivaii/Nuxmg30-web-app`.
- Working branch verified remotely: `feature/tone-intelligence-engine`; not `main`.
- HEAD: `b1c143f4ec8c9fb6e75085331ccfafa0547b616b`, commit message `Add files via upload`.
- HEAD parent: `e4d684af9ca88ec5ce80cce0f085326629e71d59`.
- Previous known base/branch checkpoint: `d04aba5d036791067b7f25e08500c6ebc92a2014`.
- Compare against `d04aba5...`: branch is 5 commits ahead, 0 behind. The net changed files are documentation files only: roadmap, six TIE specifications, specification README and development checkpoint. No application source files appear in that diff.
- Latest HEAD commit's own changed file is `DEVELOPMENT/CHECKPOINT.md` (83 additions, 0 deletions); it does not alter app source.
- Remote GitHub branch tree contains 237 files; recursive tree was not truncated.
- **Working tree:** not verifiable. GitHub exposes committed refs/tree, not the user's local index or uncommitted files. No local Git checkout was available through the connected tools. This is a limitation, not a clean-tree assertion.
- No reset, rebase, force push, merge or destructive operation was performed.

## 3. Documentation reviewed in full

1. `MG30-Studio-Master-Roadmap-TIE-v1.0.md` — 775 lines. This is the roadmap requested as `MASTER-ROADMAP.md`, but under a different actual path. It covers product vision, five-tab navigation, Studio workspaces, shared AI engine, local-first DSP, source gating, phased implementation and non-negotiable compatibility constraints.
2. `SPECIFICATIONS/TIE-DSP-ENGINE-SPEC.md` — 278 lines. PCM contract, validation, FFT/STFT, metrics, worker/performance, persistence, error model and fixtures.
3. `SPECIFICATIONS/TIE-AUDIO-ENGINE-SPEC.md` — 169 lines. Source capability matrix, session lifecycle, DAW coexistence, format normalization, Android/browser verification and permission/privacy rules.
4. `SPECIFICATIONS/TIE-COMPARISON-SPEC.md` — 143 lines. A/B sources, alignment, RMS/integrated-loudness rules, non-destructive processing, comparison reporting and limitations.
5. `SPECIFICATIONS/TIE-AI-INTEGRATION-SPEC.md` — 176 lines. One shared AI orchestration/provider/fallback path, context envelope/isolation, response normalization, safe parameter apply, privacy and cancellation.
6. `SPECIFICATIONS/TIE-KNOWLEDGE-BASE-SPEC.md` — 128 lines. Versioned knowledge records, provenance, claim types, retrieval and editorial process.
7. `SPECIFICATIONS/TIE-TESTING-SPEC.md` — 151 lines. Static/unit/integration/device/regression tests, deterministic DSP fixtures, lifecycle, performance baseline and release gates.
8. `DEVELOPMENT/CHECKPOINT.md` — 84 lines at audited HEAD. It previously listed Phase 0 tasks as incomplete and contained no architecture audit result.

**Path discrepancy:** `MASTER-ROADMAP.md` was not found at repository root or elsewhere. The alternative roadmap filename above was inspected in full; no content was inferred from the missing path.

## 4. Application structure and architecture

### Framework, language and build

- `package.json`: JavaScript ES modules (`"type":"module"`), Node test runner (`node --test`), Vite build, TypeScript only as a development dependency/config type, Capacitor Android 8.x.
- `vite.config.js`: Vite root is `www`, base `./`, output `dist`, no sourcemaps.
- `capacitor.config.ts`: app ID `com.vaivaii.mg30studio`, webDir `dist`, Capacitor native shell, mixed content disabled, CapacitorHttp enabled.
- Main UI is a large monolithic `www/index.html` (6,060 lines) containing markup, extensive CSS and legacy/editor logic. Modular scripts are loaded from the page.
- Key modules include `www/main.js`, `www/studio-daw.js`, `www/studio-daw-core.js`, `www/ai-tone-studio.js`, `www/ai-audio-analysis.js`, `www/native-midi.js`, preset/NAM/IR modules and native Android plugins.
- No frontend framework such as React/Vue/Svelte was identified in package dependencies. UI is DOM/HTML/CSS with ES modules.
- Navigation is page switching via five `data-page` buttons in `www/index.html`: Editor, NAM & IR, Presets, Studio, Device. Do not add a sixth bottom tab.
- State management is primarily module-local variables, DOM state/events and browser storage; no central Redux-like state library is listed.
- DAW persistence uses IndexedDB database `mg30-studio-daw`, version 1, with project/media stores (see `www/studio-daw.js`). Cloud token uses localStorage key `mg30-cloud-auth-token`. Other device/editor persistence conventions must be preserved and audited per feature before integration.
- No service-worker registration was found in the inspected HTML/module tree; no PWA manifest appeared in the recursive tree. Capacitor Android packaging is confirmed; PWA capability is not confirmed.
- No server-side application backend is present in this repository beyond the Cloudflare Worker source/config.

### Important repository paths

| Path | Responsibility / evidence |
|---|---|
| `www/index.html` | Main five-page UI, editor model/parameter catalog, MIDI CC mapping, editor state and AI apply validation |
| `www/main.js` | Main app bootstrap and page/device behavior |
| `www/studio-daw.js` | DAW UI, transport, recording/import/playback, IndexedDB, audio graph |
| `www/studio-daw-core.js` | DAW routes, track definitions, project schema normalization and channel selection |
| `www/studio-daw.css` | Existing Studio/DAW visual system |
| `native-android/MG30AudioPlugin.java` | Native USB audio input capture and WAV take management |
| `native-android/MG30AudioOutputPlugin.java` | USB audio output discovery/probe and DAW playback route |
| `native-android/MG30DawFilesPlugin.java` | Native streaming/export of DAW files |
| `www/native-midi.js` | JS bridge/shim for native USB-MIDI |
| `native-android/MG30MidiPlugin.java` | Android USB-MIDI device enumeration, port connection, SysEx/CC send and receive |
| `www/ai-audio-analysis.js` | Existing local PCM FFT/metrics |
| `www/ai-tone-studio.js` | Editor AI, orchestration, specialist tasks, intent classification, tone context and safe plan integration |
| `www/cloud-api.js` | Authenticated Cloudflare Worker client |
| `cloud-worker/worker.js` | Current Worker v1.2.4 endpoints, provider adapters/fallback and TONE3000 proxy |
| `www/mg30-preset-format.js` | Validated original Gen2 single-preset binary/IR resource codec and import plan |
| `www/mg30-preset-read.js`, `www/mg30-preset-import.js`, `www/mg30-preset-export.js` | Preset read/import/export paths |
| `www/nam-transfer.js`, `www/nam-model-library-ui.js` | NAM library/transfer and UI |
| `www/ir-transfer.js` | IR transfer path |
| `model-assets.js` | Model reference artwork and display parameter labels; not the authoritative live writable catalogue |

## 5. Audio engine and source audit

### Native input capture — confirmed PCM

`native-android/MG30AudioPlugin.java` registers Capacitor plugin `MG30Audio` and uses Android `AudioRecord`. It:

- enumerates Android input devices and exposes USB device metadata (sample rates, channel counts, channel/index masks, encodings);
- requests microphone permission through Capacitor where required;
- selects NUX/MG-30 USB input endpoints for multichannel/loopback modes;
- supports channel-index masks, including MG-30 channel selections;
- captures sample data and writes WAV takes, retaining capture mode, sample rate, channel count and encoding metadata;
- exposes take listing, rename, export and related file operations.

This is a real PCM capture route, distinct from MIDI. The repository's own `docs/research/MG30_USB_OUTPUT_AND_RECORDING_CONFIRMED_2026-11-03.md` and USB capture notes provide additional historical evidence, but live hardware capability must still be checked against the user's actual Android/USB route for every advertised source.

### USB Loopback meaning

The DAW exposes input routes in `www/studio-daw-core.js`, including:
- `usb-ch1-mono` — MG-30 USB Input 1;
- `usb-ch1-2-stereo` — Input 1–2, labelled Stereo + Host Loopback Mix;
- `usb-wet-sync-3-4-stereo` — Input 3–4, labelled Wet Sync / Dry Out.

The Android recorder captures these as PCM through AudioRecord using the requested/advertised channel index mask. Thus the USB loopback/recording route is not merely a MIDI connection. However, exact signal semantics per channel and firmware/device routing must follow existing capture research and physical tests; do not infer channel meaning beyond the code's labels and recorded evidence.

`MG30AudioOutputPlugin.java` is a separate AudioTrack output path. It explicitly verifies the selected MG-30 USB output route before writing a low-level test tone and implements DAW playback routing separately. Its comments state that output endpoint detection/probe does not prove full duplex, Reamp or Loopback by itself.

### DAW, Quick Record, playback and storage

- `www/studio-daw.js` uses Web Audio `AudioContext` for decode/playback and waveform analysis; it maintains live source nodes, playback transport, recording state, clips and track state.
- DAW projects/media persist in IndexedDB (`mg30-studio-daw`); media is represented as blobs and decoded into `AudioBuffer` objects.
- Captured multichannel USB buffers are selected by channel masks and encoded into WAV PCM24 for project media. Track clips retain sample rate, channels, capture mode and route metadata.
- Quick Record is a separate native take workflow. The DAW's `importQuickTake()` uses `window.NUXStudioRecorder.pathToUrl` and the take's file path to load the saved take into a DAW track. The saved WAV can therefore be a reusable analysis source once the file/URL-to-PCM adapter is verified.
- The DAW already contains timeline, clip editing, track settings, mixer, mute/solo, gain/pan, playback controls, recording arm, loop points, output route and native export support. Do not replace this engine.
- USB loopback, hardware record/playback level controls and route selection are already surfaced in DAW project settings. Preserve their current lifecycle and state.

### DSP currently present

`www/ai-audio-analysis.js` exports:
- `analyzeToneAudioSamples(channelData, sampleRate)`: local FFT using an in-file radix-2 implementation, Hann window, averaged spectral power and metrics;
- `selectUsbInputChannels()`: channel-mask selection from captured multichannel WAV channels;
- `formatToneAudioMetrics()`: compact text summary for AI context.

Metrics include RMS dBFS, sample peak dBFS, crest factor, spectral centroid, 85% rolloff, relative energy bands and frame RMS percentile range. It rejects short/near-silent input. PCM is processed locally; its module comment says only returned metrics need be sent to AI.

Limitations against TIE DSP spec:
- no configurable FFT size/window/hop/channel settings API matching the spec;
- no exported spectrum frames/plot data or spectrogram/STFT visualization engine;
- no true-peak oversampling, validated THD, harmonic/fundamental analyzer or designated quiet-region noise floor estimator;
- no documented calibrated amplitude/frequency-response measurement;
- no dedicated DSP Worker or AudioWorklet processing pipeline found;
- no versioned AnalysisResult/AnalysisRepository/AnalysisSettings persistence layer;
- no deterministic DSP fixture test file was found in the test tree at audit time. The existing module must be unit-tested before extension.

### Source capability matrix (audit status)

| Source | Repository evidence | Phase 0 status |
|---|---|---|
| USB MG-30 input / loopback PCM | Native AudioRecord USB capture, channel masks, WAV | Implemented; device-route semantics require target-device regression test |
| USB MG-30 output | Native AudioTrack route and DAW playback | Implemented; separate from input capture |
| Quick Record | Native WAV take management; DAW import bridge | Existing source; direct Analyzer adapter not yet verified |
| DAW track | IndexedDB media Blob + decoded AudioBuffer | Existing in-app PCM; safe read-only adapter needs design |
| Imported audio | DAW decodeBlob(AudioContext.decodeAudioData) | Existing import/playback route; supported MIME/codec list needs audit |
| Live input via browser getUserMedia | Not established by audited files | Not verified; do not advertise as available |
| MG-30 USB MIDI | Native MIDI only | Device control/data, not PCM audio |

## 6. DSP and worker architecture

- Existing DSP calculation is synchronous JavaScript in `www/ai-audio-analysis.js`.
- No TIE-specific Web Worker or AudioWorklet was found.
- The existing native capture thread is a background Android Java thread, but it is a recording implementation, not a DSP worker abstraction.
- No WASM DSP package or FFT dependency is listed in `package.json`; the existing FFT is handwritten JS.
- Canvas is used elsewhere in app UI/artwork; dedicated TIE spectrum/spectrogram renderer was not found.
- First implementation should reuse PCM sources and existing FFT math only after defining metric correctness and tests. Move long/offline jobs to a Worker only when profiling demonstrates need; live capture worklet is not justified until source/lifecycle baseline is known.
- IndexedDB is already used for DAW media/projects and is a candidate persistence substrate, but avoid placing large PCM copies or analysis data into DAW stores without a schema/migration plan.

## 7. AI provider and orchestration audit

### Existing shared infrastructure

- `www/ai-tone-studio.js` is the main Editor AI orchestration module. It contains intent classification, tone plan validation, GPT-6 Luna Chief orchestration, sequential specialist delegation, context assembly, provider calls and safe proposal/apply flow.
- It imports `cloudApiRequest` from `www/cloud-api.js`.
- It also imports the local USB PCM analysis functions from `www/ai-audio-analysis.js`, showing an existing bridge between USB capture metrics and AI tone context.
- Existing Editor AI uses the ChatGPT native SIWC bridge for Luna tasks; this is distinct from Worker providers.
- `www/cloud-api.js` reads Cloud Account bearer token from localStorage and sends authenticated requests to the Cloudflare Worker base URL. It normalizes HTTP/upstream errors.
- `cloud-worker/worker.js` is version 1.2.4. Provider registry includes OpenAI, Gemini, Groq and OpenRouter API keys from Worker environment; Cloudflare Workers AI is accessed via the `AI` binding. It exposes provider status/model catalogue, light-task, tone-plan and other app endpoints.
- The current tone-plan auto order visible in Worker source is Cloudflare → Gemini → Groq → OpenRouter for the Worker tone-plan route. This is not necessarily the Editor specialist order: the Editor orchestration explicitly states Gemini first, then Groq, OpenRouter, Cloudflare Workers AI. Preserve task-specific existing routing; do not collapse different flows into one guessed global order.
- Worker auth uses APP_AUTH_SECRET-signed bearer tokens; provider secrets remain server-side Worker environment bindings. Do not move keys into client bundles.
- Worker source includes TONE3000 OAuth-scoped proxy logic. NAM query phrase generation has a separate Workers AI light-task route as recorded in current source/tests.
- ChatGPT native account bridge is loaded from `www/chatgpt-account.js`; `requestChatGptConversation()` and `orchestrateChatGptTonePlan()` in `www/ai-tone-studio.js` call the native bridge. This path is an existing first-party AI access point, not a reason to create a separate Studio AI manager.
- No independent TIE AI orchestration module exists yet.

### TIE integration direction

Create an Editor context adapter and Studio context adapter that produce a bounded, versioned envelope and call the same orchestration/provider/fallback boundary. Keep task and entry-point tags explicit to prevent stale Studio analysis from contaminating Editor preset/tweak requests. Reuse the existing validated Editor apply path for any device parameter changes. Studio analysis requests should send structured metrics and provenance, not raw PCM by default.

## 8. Preset, NAM, IR and MIDI audit

### Device schema and MIDI

- The authoritative block/model/parameter runtime catalogue is embedded in `www/index.html` and is used by the editor. `model-assets.js` is reference artwork/labels, not a safe source of writable hardware capabilities.
- `MIDI_PARAM_CC` and `MIDI_SW` mappings are explicitly defined in `www/index.html`; `sendBlockParam()`, incoming CC sync and AI validation/apply use these mappings.
- `aiGetCatalog()`, `aiPreparePlan()` and related helpers build the exact live writable-control whitelist and validate model/parameter values before writes.
- `www/native-midi.js` adapts the Capacitor `MG30Midi` plugin into Web-MIDI-like input/output ports. It handles device enumeration, connect/disconnect, incoming MIDI data and byte sending.
- `native-android/MG30MidiPlugin.java` uses Android MIDI APIs, `MidiManager`, `MidiDevice`, `MidiInputPort` / `MidiOutputPort` and forwards raw MIDI/SysEx data. This is not the audio capture path.
- No firmware protocol or MIDI mapping change is required for TIE DSP. Signal Chain Intelligence should read the current app/device state and must not write MIDI.

### Preset / NAM / IR

- `www/mg30-preset-format.js` contains validated original MG-30 Gen2 single-preset parsing/building logic, including the embedded IR resource fields. It explicitly rejects the 128-preset container from the single-preset parser and directs it to Import All.
- `www/mg30-preset-read.js`, `www/mg30-preset-import.js`, `www/mg30-preset-export.js`, `www/mg30-preset-all-import.js`, `www/preset-library-operations.js` and related UI modules manage preset data and operations.
- NAM and IR have dedicated modules: `www/nam-transfer.js`, `www/nam-model-library-ui.js`, `www/ir-transfer.js`; NAM/IR management is not part of the USB MIDI audio PCM analysis pipeline.
- TIE should consume read-only snapshots of current preset/effect chain, NAM capture metadata and IR metadata. A preset or IR file alone is not audio; comparison of audible output requires controlled audio renders/recordings as specified in TIE-03.
- Do not modify slot-10 NAM transfer, IR User/Third Party/Collection paths, preset codec, MIDI CC map, device readback or USB protocol as part of TIE Phase 0/1.

## 9. Five-tab and existing-feature compatibility

The five main page buttons are present in `www/index.html`: Editor, NAM & IR, Presets, Studio, Device. TIE roadmap's workspace selector belongs inside Studio; no sixth bottom tab.

Compatibility-critical modules:
- Editor/device/MIDI: `www/index.html`, `www/main.js`, `www/native-midi.js`, `native-android/MG30MidiPlugin.java`.
- Presets: `www/mg30-preset-format.js`, `www/mg30-preset-read.js`, `www/mg30-preset-import.js`, `www/mg30-preset-export.js`, `www/mg30-preset-all-import.js`, `www/preset-library-operations.js`.
- NAM/IR: `www/nam-transfer.js`, `www/nam-model-library-ui.js`, `www/ir-transfer.js`.
- AI: `www/ai-tone-studio.js`, `www/cloud-api.js`, `cloud-worker/worker.js`, ChatGPT account bridge.
- Studio/DAW/audio: `www/studio-daw.js`, `www/studio-daw-core.js`, `native-android/MG30AudioPlugin.java`, `native-android/MG30AudioOutputPlugin.java`, `native-android/MG30DawFilesPlugin.java`.

Five bottom tabs, Editor AI, provider/fallback routing, original Gen2 firmware communication, MIDI CC mappings, presets, NAM, IR, DAW recording/playback and USB audio must be treated as protected regression surfaces.

## 10. Gap analysis against TIE specs

| TIE area | Existing reusable capability | Gap / status |
|---|---|---|
| Analyzer source acquisition | Native USB PCM AudioRecord, Quick Record WAV, DAW IndexedDB media, audio decode | No unified AudioSourceRegistry/Session adapter; direct import/Quick Record/DAW Analyzer path needs proof and design |
| DSP FFT/spectrum | Local FFT + Hann + spectral power/bands/metrics | Partial; configurable settings, exposed spectrum/STFT, spectrogram, metric definitions/validity, worker/cancel, persistence and fixtures absent |
| Metrics | RMS, sample peak, crest factor, centroid, 85% rolloff, band energy, frame RMS spread | True peak, THD, harmonic validity, noise floor, dynamic range methods not implemented/validated |
| Compare | DAW clips and playback engine; media stored as blobs | Dedicated A/B compare, non-destructive alignment, level match, spectrum delta/report absent |
| Signal Chain | Live editor catalogue/state and preset context | Read-only chain analyzer/visualizer and evidence-based diagnostic rules absent |
| Shared AI | Existing Editor orchestrator, provider manager/Worker, SIWC bridge, context helpers | Studio adapter and structured measured-facts/hypothesis/recommendation response contract absent; avoid duplicate engine |
| Knowledge Base | Documentation and existing product research files | No versioned KnowledgeRecord repository/retrieval/editorial workflow found |
| Testing | Node test suite with editor, DAW, MIDI, NAM/IR, Worker regressions | Dedicated deterministic DSP/audio-source/comparison fixtures and TIE lifecycle/device test matrix absent |
| UI foundation | Five tabs and Studio/DAW UI already present | Internal Studio workspace selector and five Tone Analysis subviews not present in audited tree |
| Android lifecycle/performance | Native capture thread and Capacitor lifecycle environment | No measured TIE processing baseline, battery/memory/latency budgets or full source lifecycle tests |

### Potential conflicts

1. **Audio ownership:** DAW and native recorder already own capture/playback. A second independent capture graph can cause exclusive-device conflicts or disrupt recording.
2. **Buffer duplication:** DAW media blobs and decoded AudioBuffers can be large. Copying full recordings into another store may cause Android memory pressure.
3. **Navigation lifecycle:** Studio workspace switching must not tear down DAW transport/capture; existing DAW blocks edits during recording/playing in several operations.
4. **Audio route semantics:** Android endpoint discovery metadata is advisory. Input and output route are distinct; output probe does not prove full duplex. Channel masks and capture mode labels must be retained.
5. **MIDI/audio confusion:** USB-MIDI plugin handles control bytes only. PCM is delivered via Android AudioRecord. Never treat MIDI connection status as audio-source readiness.
6. **Metric validity:** Current local analyzer is not a calibrated frequency response or THD meter. Existing spectral bands cannot independently diagnose fizz/harshness.
7. **AI context leakage:** Editor and Studio requests share history/infrastructure but need explicit entry-point/task context and freshness timestamps.
8. **Provider routing regression:** Multiple routes have different priorities by task. Changing global fallback order would regress established behavior.
9. **Hardware schema integrity:** Editor catalogue/CC map is authoritative; artwork labels and guessed gear names are not writable device models.
10. **PWA assumption:** No service worker or manifest found; offline/PWA support must not be assumed.

## 11. Dependencies and library assessment

Current dependencies are Capacitor Android/Browser/Core/StatusBar/App, Vite, TypeScript. No FFT.js, DSP package, waveform/plot package, WASM package, React/Vue/Svelte, or IndexedDB wrapper appears in package dependencies.

**No new dependency is justified in Phase 0.** Existing FFT and browser/native audio primitives should be measured and tested first. Add a library only after a demonstrated correctness/performance gap, bundle-size review and Android WebView compatibility check.

## 12. Recommended architecture and safe implementation order

1. **Phase 1A — Studio shell only:** add internal workspace/sub-navigation while retaining the existing Jamm & Record DOM/state. Avoid moving/remounting DAW nodes until recording/playback lifecycle behavior is mapped.
2. **Phase 1B — Empty-state subviews:** create Analyzer, Compare, Signal Chain, Intelligence and AI Consultant shells with honest source availability states; no mock measurements.
3. **Phase 2A — Source adapters:** build read-only adapters for existing WAV take, DAW media Blob/AudioBuffer, imported file and verified USB PCM capture. Each reports metadata/capabilities and explicit unsupported/not-verified state.
4. **Phase 2B — DSP contract/tests:** define versioned PCM/metadata/settings/result contracts and deterministic fixtures first. Test existing FFT math; fix correctness only in a separately scoped approved change.
5. **Phase 2C — DSP worker:** add worker only for offline/chunked analysis after profiling. Consider AudioWorklet only for verified low-latency streaming need and device compatibility.
6. **Phase 3 — Compare:** reuse DAW media/playback with non-destructive copies and independent compare transport; avoid mutating DAW transport/gain.
7. **Phase 4 — Signal Chain:** read-only adapter from editor live catalogue and active snapshot; no MIDI writes.
8. **Phase 5 — Shared AI:** add Studio context adapter and route through existing orchestration/provider/fallback. Enforce source timestamp, context isolation, bounded metrics and secret-free payload.
9. **Phase 6 — Knowledge Base:** versioned records with provenance and deterministic category/tag/text retrieval.
10. **Phase 7 — validation:** deterministic DSP fixtures, integration/lifecycle tests, regression suite for all five tabs, NAM/IR, preset, MIDI, DAW, USB loopback and Android hardware.

## 13. Risk register

| Risk | Severity | Mitigation / gate |
|---|---|---|
| DAW recording/playback interruption | Critical | Keep current workspace mounted; explicit lifecycle tests while recording/playing |
| USB endpoint or channel routing misrepresented | High | Report source status from actual AudioRecord session and metadata; hardware validation |
| PCM buffer copies cause OOM/GC stalls | High | Read-only references/streamed chunks, bounded retention, memory profiling |
| Existing FFT results inaccurate for claimed metrics | High | Deterministic fixtures and method/tolerance documentation before exposing metric |
| Shared AI route/context regressions | High | One orchestrator; entry-point/task envelope; provider contract tests |
| Accidental MIDI/firmware changes | Critical | No changes to MIDI mapping/protocol; Signal Chain remains read-only |
| NAM slot/IR import regression | Critical | Keep transfer/import modules untouched; full regression suite |
| Unsupported WebView/PWA assumptions | Medium | Capability detection and actual target runtime tests |
| Knowledge-base unsourced claims | Medium | Required source provenance and claim-type labels |
| Monolithic HTML coupling | High | Minimal DOM insertion; extract modules only when a specific boundary is justified |

## 14. Files likely involved (not modified by this audit)

| File | Likely role in future TIE | Expected action (subject to Phase 1 approval) |
|---|---|---|
| `www/index.html` | Studio workspace shell, five-tab nav, design tokens, live device catalogue | Minimal Studio shell insertion only; protect editor/MIDI sections |
| `www/studio-daw.js` | Existing DAW lifecycle, audio media, transport, Quick Record import | Add read-only source adapter hooks only after lifecycle review |
| `www/studio-daw-core.js` | Track/project/media metadata | Reuse existing definitions; avoid schema change unless required |
| `native-android/MG30AudioPlugin.java` | Native USB PCM capture/WAV metadata | Likely no modification initially; inspect/test public methods for source adapter |
| `native-android/MG30AudioOutputPlugin.java` | Output route/playback | Preserve; no DSP need identified |
| `www/ai-audio-analysis.js` | Existing FFT/metrics | Extend only after fixture coverage and result contract |
| New `www/tie/*` modules | TIE orchestration of sources, DSP, results, comparison, knowledge | Candidate modular boundary; no files created yet |
| New `www/tie/audio-source-adapters.js` | Adapter interface for Quick Record/DAW/import/USB | Candidate; exact API after source ownership audit |
| New `www/tie/dsp/*` | Versioned metrics/FFT/STFT/spectrogram | Candidate; worker split based on profiling |
| New `www/tie/compare/*` | Alignment, level match, compare result | Candidate |
| New `www/tie/knowledge/*` | Knowledge schema/retrieval | Candidate |
| `www/ai-tone-studio.js` | Shared AI orchestration/context | Prefer a separate Studio adapter calling existing boundary; avoid provider changes |
| `www/cloud-api.js`, `cloud-worker/worker.js` | Existing auth/provider/fallback | No change anticipated for initial TIE; only if audited contract requires explicit extension |
| `tests/*` | Existing regression suites | Add deterministic TIE unit/integration tests in later approved phases |

## 15. Audit completion and outstanding verification

**Phase 0 audit:** repository/spec/source mapping completed to the extent possible through the GitHub remote source view.

Verified:
- repository and remote branch/HEAD;
- full content of all six TIE specifications, checkpoint and actual roadmap file;
- application structure/build configuration and key source modules;
- existence of native USB PCM capture and separate USB-MIDI control path;
- existing DAW/IndexedDB/Web Audio/Quick Record integration points;
- existing local FFT analyzer;
- existing AI orchestration/provider infrastructure;
- preset/NAM/IR/MIDI module boundaries;
- five main navigation pages.

Not verified:
- local working-tree/uncommitted changes (no local checkout access);
- live Android/WebView version, permission prompts, route changes, USB full-duplex and source lifecycle on target device during this audit;
- every codec/import format;
- PWA/service worker support beyond absence in the audited tree;
- measured DSP performance, memory and battery baseline;
- end-to-end TIE source adapters (they do not yet exist).

No build or test command was run as part of this read-only audit. Existing tests were inspected by repository inventory only; do not mark them as executed.

## 16. Phase 0 recommendation

**Phase 0 is complete as a repository/source audit, with the explicit remote-only working-tree limitation above.** Before Phase 1 coding, the owner should confirm the roadmap filename discrepancy is acceptable and provide/approve the local working-tree state if there are uncommitted local changes.

Recommended first Phase 1 task: design and implement only the Studio internal workspace shell with Jamm & Record retained in place, plus non-functional/empty Tone Analysis navigation. Do not start DSP capture or provider integration until the source adapter contract and audio lifecycle are separately approved.
