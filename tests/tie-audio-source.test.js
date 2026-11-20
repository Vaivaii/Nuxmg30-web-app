import test from "node:test";
import assert from "node:assert/strict";
import {
  createPcmAudioFromDecodedBuffer,
  decodeAudioBlob,
  readWavSourceMetadata,
  listQuickRecordSources,
  loadImportedAudioFile,
  loadQuickRecordTake,
  TIE_AUDIO_SOURCE_CONSTANTS,
} from "../www/tie-audio-source.js";

function makeWavBytes({ sampleRate = 44100, channels = 1, bits = 16, frames = 8 } = {}) {
  const bytesPerSample = bits / 8;
  const dataBytes = frames * channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeText = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bits, true);
  writeText(36, "data");
  view.setUint32(40, dataBytes, true);
  return buffer;
}

function makeDecodedAudio({ sampleRate = 48000, channels = 2, frames = 4800 } = {}) {
  const channelData = Array.from({ length: channels }, (_, index) => {
    const samples = new Float32Array(frames);
    samples.fill(index ? -0.25 : 0.25);
    return samples;
  });
  return {
    sampleRate,
    numberOfChannels: channels,
    length: frames,
    getChannelData(index) { return channelData[index]; },
  };
}

test("TIE Audio Source: Quick Record source list includes only takes with a usable local path", () => {
  const recorder = {
    listTakes: () => [
      { path: "/takes/one.wav", fileName: "one.wav", sampleRate: 48000, channels: 2 },
      { fileName: "broken.wav" },
    ],
    pathToUrl: (take) => "file://" + take.path,
  };
  const sources = listQuickRecordSources(recorder);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].sourceKind, "quick-record");
  assert.equal(sources[0].label, "one.wav");
  assert.equal(sources[0].sampleRateHz, 48000);
});

test("TIE Audio Source: decoded AudioBuffer exposes source metadata and read-only PCM channel references", () => {
  const buffer = makeDecodedAudio();
  const pcm = createPcmAudioFromDecodedBuffer(buffer, {
    sourceId: "fixture:decoded",
    sourceKind: "imported-file",
    label: "fixture.wav",
  });
  assert.equal(pcm.metadata.sampleRateHz, 48000);
  assert.equal(pcm.metadata.channelCount, 2);
  assert.equal(pcm.metadata.frameCount, 4800);
  assert.equal(pcm.metadata.durationSeconds, 0.1);
  assert.equal(pcm.channels[0], buffer.getChannelData(0));
  assert.equal(pcm.metadata.sampleFormat, "Float32 PCM decoded by Web Audio");
});

test("TIE Audio Source: imported WAV is decoded through the supplied local decoder", async () => {
  const file = {
    name: "fixture.wav",
    type: "audio/wav",
    size: 128,
    arrayBuffer: async () => new ArrayBuffer(16),
  };
  const pcm = await loadImportedAudioFile(file, async () => makeDecodedAudio({ channels: 1 }));
  assert.equal(pcm.metadata.sourceKind, "imported-file");
  assert.equal(pcm.metadata.label, "fixture.wav");
  assert.equal(pcm.metadata.channelCount, 1);
});

test("TIE Audio Source: unsupported file extensions are rejected before decoding", async () => {
  const file = {
    name: "notes.txt",
    type: "text/plain",
    size: 12,
    arrayBuffer: async () => new ArrayBuffer(12),
  };
  await assert.rejects(
    loadImportedAudioFile(file, async () => makeDecodedAudio()),
    (error) => error.code === "UNSUPPORTED_FORMAT",
  );
});

test("TIE Audio Source: empty and oversized files are rejected", async () => {
  await assert.rejects(
    loadImportedAudioFile({ name: "empty.wav", type: "audio/wav", size: 0, arrayBuffer: async () => new ArrayBuffer(0) }, async () => makeDecodedAudio()),
    (error) => error.code === "SOURCE_UNAVAILABLE",
  );
  await assert.rejects(
    loadImportedAudioFile({ name: "large.wav", type: "audio/wav", size: TIE_AUDIO_SOURCE_CONSTANTS.maxFileBytes + 1, arrayBuffer: async () => new ArrayBuffer(0) }, async () => makeDecodedAudio()),
    (error) => error.code === "UNSUPPORTED_FORMAT",
  );
});

test("TIE Audio Source: decoded PCM exceeding the memory guard is rejected before channel reads", () => {
  const buffer = {
    sampleRate: 48000,
    numberOfChannels: 2,
    length: 20 * 1024 * 1024,
    getChannelData() { throw new Error("PCM channel should not be copied/read after the guard."); },
  };
  assert.throws(
    () => createPcmAudioFromDecodedBuffer(buffer),
    (error) => error.code === "UNSUPPORTED_FORMAT",
  );
});

test("TIE Audio Source: Quick Record WAV resolves through the existing recorder file bridge", async () => {
  const take = { path: "/app/recordings/take-01.wav", fileName: "take-01.wav", bitDepth: 24 };
  let requestedUrl = "";
  const recorder = { pathToUrl: (item) => "capacitor-file://" + item.path };
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return { ok: true, blob: async () => new Blob([new Uint8Array(16)], { type: "audio/wav" }) };
  };
  const pcm = await loadQuickRecordTake(take, recorder, fetchImpl, async () => makeDecodedAudio());
  assert.equal(requestedUrl, "capacitor-file://" + take.path);
  assert.equal(pcm.metadata.sourceKind, "quick-record");
  assert.equal(pcm.metadata.label, "take-01.wav");
  assert.equal(pcm.metadata.sourceFormat, "WAV PCM 24-bit");
});

test("TIE Audio Source: missing or unreadable Quick Record files return a typed source error", async () => {
  const take = { path: "/app/missing.wav" };
  const recorder = { pathToUrl: (item) => item.path };
  await assert.rejects(
    loadQuickRecordTake(take, recorder, async () => ({ ok: false, status: 404 }), async () => makeDecodedAudio()),
    (error) => error.code === "SOURCE_UNAVAILABLE",
  );
});

test("TIE Audio Source: decoder errors report an unsupported codec instead of a false ready state", async () => {
  await assert.rejects(
    decodeAudioBlob(new Blob([new Uint8Array(4)]), { sourceId: "bad", label: "bad" }, async () => { throw new Error("decoder"); }),
    (error) => error.code === "UNSUPPORTED_FORMAT",
  );
});


test("TIE Audio Source: RIFF/WAVE parser preserves the encoded source sample rate, channels and bit depth", () => {
  const metadata = readWavSourceMetadata(makeWavBytes({ sampleRate: 44100, channels: 2, bits: 24 }));
  assert.deepEqual(metadata, {
    sourceSampleRateHz: 44100,
    sourceChannelCount: 2,
    sourceBitDepth: 24,
    sourceEncoding: "PCM",
    sourceFormat: "WAV PCM 24-bit",
  });
});

test("TIE Audio Source: WAV source rate/channel metadata remains distinct from decoded analysis PCM", async () => {
  const wav = makeWavBytes({ sampleRate: 44100, channels: 1, bits: 16, frames: 8 });
  const pcm = await decodeAudioBlob(
    new Blob([wav], { type: "audio/wav" }),
    { sourceId: "fixture:44100-mono", sourceKind: "imported-file", label: "source-44k1.wav" },
    async () => makeDecodedAudio({ sampleRate: 48000, channels: 2, frames: 4800 }),
  );

  assert.equal(pcm.metadata.sourceSampleRateHz, 44100);
  assert.equal(pcm.metadata.sampleRateHz, 48000);
  assert.equal(pcm.metadata.analysisSampleRateHz, 48000);
  assert.equal(pcm.metadata.resamplingApplied, true);
  assert.equal(pcm.metadata.sourceChannelCount, 1);
  assert.equal(pcm.metadata.channelCount, 2);
  assert.equal(pcm.metadata.channelCountChanged, true);
  assert.equal(pcm.metadata.sourceBitDepth, 16);
  assert.equal(pcm.metadata.sourceEncoding, "PCM");
  assert.equal(pcm.metadata.durationSeconds, 0.1);
});

test("TIE Audio Source: Quick Record recorder metadata is retained when a source header is unavailable", async () => {
  const take = {
    path: "/app/recordings/take-source-metadata.wav",
    fileName: "take-source-metadata.wav",
    sampleRate: 44100,
    channels: 1,
    bitDepth: 16,
  };
  const pcm = await loadQuickRecordTake(
    take,
    { pathToUrl: () => "capacitor-file://take.wav" },
    async () => ({ ok: true, blob: async () => new Blob([new Uint8Array(16)], { type: "audio/wav" }) }),
    async () => makeDecodedAudio({ sampleRate: 48000, channels: 2, frames: 4800 }),
  );

  assert.equal(pcm.metadata.sourceSampleRateHz, 44100);
  assert.equal(pcm.metadata.analysisSampleRateHz, 48000);
  assert.equal(pcm.metadata.resamplingApplied, true);
  assert.equal(pcm.metadata.sourceChannelCount, 1);
  assert.equal(pcm.metadata.analysisChannelCount, 2);
  assert.equal(pcm.metadata.channelCountChanged, true);
  assert.equal(pcm.metadata.sourceBitDepth, 16);
});

test("TIE Audio Source: malformed WAV headers do not invent source metadata", () => {
  assert.equal(readWavSourceMetadata(new ArrayBuffer(16)), null);
  const truncated = makeWavBytes();
  new DataView(truncated).setUint32(16, 0xffffffff, true);
  assert.equal(readWavSourceMetadata(truncated), null);
});
