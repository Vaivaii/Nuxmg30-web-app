# Preset Manager name-only sync and Import/Export dropdowns — 2026-11-06

Build #593 was reported slow and disruptive on the original MG-30 Gen2 FW 6.0.x. Cause: the name scan was extended to read full scene, metadata, waveform and curve data for all 128 presets.

Decision: restore the stable lightweight name-only scan (one scene-0 0B/00 request/reply per missing name). Keep the session readback cache for explicit Export Single/Export All only; Export All reads uncached slots on demand. No full-bank cache warmup during connection or Preset Manager navigation.

UI: Import dropdown offers Import Single and Import All. Export dropdown offers Export Single and Export All. Existing action IDs are retained, preserving their handlers. Menus close after selection, outside click, or Escape.

Restore stable pre-integration versions of mg30-preset-manager-cache.js, mg30-preset-format.js and ir-transfer.js. Keep the existing Export All serialization and working Import All resource/placeholder planner unchanged.

Safety: original MG-30 Gen2 FW 6.0.x only, not MKII. No NAM packet changes, IR Collection/User/Third Party routing changes, MIDI/CC mapping changes, or Import All transfer changes. Hardware verification remains outstanding until user tests the build.
