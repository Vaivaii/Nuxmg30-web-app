import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const nativeSource = await readFile(new URL("../www/native-midi.js", import.meta.url), "utf8");
const exportSource = await readFile(new URL("../www/mg30-preset-export.js", import.meta.url), "utf8");
const pluginSource = await readFile(new URL("../native-android/MG30MidiPlugin.java", import.meta.url), "utf8");

test("large Android patch export uses ordered bounded Base64 chunks", () => {
  assert.match(nativeSource, /beginPatchExport/);
  assert.match(nativeSource, /writePatchExportChunk/);
  assert.match(nativeSource, /finishPatchExport/);
  assert.match(nativeSource, /const chunkBytes = 48 \* 1024/);
  assert.match(nativeSource, /offset,\s*base64: toBase64\(chunk\)/);
  assert.match(nativeSource, /Number\(ack\?\.receivedBytes\) !== expectedReceived/);
  assert.doesNotMatch(nativeSource, /NativeMidi\.savePatch\(options\)/);
});

test("Export Single and Export All pass binary bytes to the local native wrapper", () => {
  assert.match(exportSource, /nativeBridge\.savePatch\(\{[\s\S]*?bytes[\s\S]*?\}\)/);
  assert.doesNotMatch(exportSource, /bytesToBase64/);
});

test("native patch chunk receiver enforces sequence, chunk size, and final staging length", () => {
  assert.match(pluginSource, /PATCH_EXPORT_CHUNK_LIMIT = 64 \* 1024/);
  assert.match(pluginSource, /offsetValue != transfer\.receivedBytes/);
  assert.match(pluginSource, /chunk\.length > PATCH_EXPORT_CHUNK_LIMIT/);
  assert.match(pluginSource, /transfer\.receivedBytes != transfer\.expectedBytes/);
  assert.match(pluginSource, /startActivityForResult\(call, intent, "savePatchResult"\)/);
});
