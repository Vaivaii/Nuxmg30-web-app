import test from "node:test";
import assert from "node:assert/strict";
import {
  createToneDspSession,
  processToneDspChunk,
  finalizeToneDspSession,
  analyzeToneAudioSamples,
  toAiToneDspPayload,
} from "../www/ai-live-tone-dsp.js";

function sine(frames, sampleRate, frequency = 1000, amplitude = 0.5) {
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    out[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return out;
}

function makeSession(frameCount, sampleRate = 48000, settings = {}) {
  return createToneDspSession({
    sampleRateHz: sampleRate,
    channelCount: 1,
    source: "test PCM",
    captureMode: "test",
  }, settings);
}

test("shared DSP measures RMS, sample peak, and crest factor from actual PCM", () => {
  const result = analyzeToneAudioSamples([sine(48000, 48000)], 48000);
  assert.ok(Math.abs(result.metrics.rmsDbfs - (-9.03)) < 0.08, result.metrics.rmsDbfs);
  assert.ok(Math.abs(result.metrics.samplePeakDbfs - (-6.02)) < 0.02, result.metrics.samplePeakDbfs);
  assert.ok(Math.abs(result.metrics.crestFactorDb - 3.01) < 0.08, result.metrics.crestFactorDb);
  assert.equal(result.source.frameCount, 48000);
  assert.ok(result.spectrum.bins.length > 500);
  assert.equal(result.metrics.noiseFloor.status, "unavailable");
  assert.equal(result.metrics.dynamicRange.status, "not_measured");
  assert.equal(result.metrics.latency.status, "not_measured");
});

test("shared DSP FFT locates a known sine peak within one bin", () => {
  const result = analyzeToneAudioSamples([sine(48000, 48000, 1000, 0.5)], 48000, { fftSize: 2048 });
  const peak = result.spectrum.bins.reduce((best, row) => row.magnitudeDbfs > best.magnitudeDbfs ? row : best);
  assert.ok(Math.abs(peak.frequencyHz - 1000) <= result.spectrum.binWidthHz);
  assert.ok(Math.abs(peak.magnitudeDbfs - (-6.02)) < 1.2, peak.magnitudeDbfs);
});

test("chunked Live Listening DSP matches the same complete-buffer analysis", () => {
  const samples = sine(48000 * 3, 48000, 997, 0.4);
  const single = analyzeToneAudioSamples([samples], 48000);
  const session = makeSession(samples.length);
  for (let offset = 0; offset < samples.length; offset += 4096) {
    processToneDspChunk(session, [samples.subarray(offset, Math.min(samples.length, offset + 4096))]);
  }
  const streamed = finalizeToneDspSession(session);
  assert.equal(streamed.source.frameCount, single.source.frameCount);
  assert.equal(streamed.analysis.fftFrames, single.analysis.fftFrames);
  assert.ok(Math.abs(streamed.metrics.rmsDbfs - single.metrics.rmsDbfs) < 0.001);
  assert.ok(Math.abs(streamed.metrics.samplePeakDbfs - single.metrics.samplePeakDbfs) < 0.001);
  assert.ok(Math.abs(streamed.metrics.spectralCentroidHz - single.metrics.spectralCentroidHz) < 1);
  assert.ok(Math.abs(streamed.spectrum.bins[43].magnitudeDbfs - single.spectrum.bins[43].magnitudeDbfs) < 0.001);
});

test("stereo DSP combines actual channel samples and reports channel provenance", () => {
  const left = sine(48000, 48000, 440, 0.5);
  const right = sine(48000, 48000, 1760, 0.25);
  const session = createToneDspSession({ sampleRateHz: 48000, channelCount: 2, channelIndexMask: 3 });
  processToneDspChunk(session, [left.subarray(0, 20000), right.subarray(0, 20000)]);
  processToneDspChunk(session, [left.subarray(20000), right.subarray(20000)]);
  const result = finalizeToneDspSession(session);
  assert.equal(result.source.channelCount, 2);
  assert.equal(result.source.channelIndexMask, 3);
  assert.equal(result.metrics.clipping.detected, false);
});

test("clipping detection counts samples at the declared threshold", () => {
  const samples = sine(48000, 48000);
  samples[10] = 1;
  samples[11] = -1;
  const result = analyzeToneAudioSamples([samples], 48000);
  assert.equal(result.metrics.clipping.detected, true);
  assert.equal(result.metrics.clipping.sampleCount, 2);
  assert.equal(result.metrics.clipping.threshold, 0.999);
});

test("malformed PCM is rejected rather than silently clamped or replaced", () => {
  const samples = sine(48000, 48000);
  samples[50] = Number.NaN;
  const session = makeSession(samples.length);
  assert.throws(() => processToneDspChunk(session, [samples]), error => error.code === "INVALID_PCM");
  const outOfRange = sine(48000, 48000);
  outOfRange[51] = 1.2;
  assert.throws(() => analyzeToneAudioSamples([outOfRange], 48000), error => error.code === "INVALID_PCM");
});

test("AI payload is structured, compact, and contains no raw audio samples", () => {
  const report = analyzeToneAudioSamples([sine(48000, 48000)], 48000);
  const payload = toAiToneDspPayload(report, 64);
  assert.equal(payload.schemaVersion, "mg30-tone-dsp/1.0");
  assert.ok(payload.spectrum.bins.length <= 64);
  assert.equal("audioBytes" in payload, false);
  assert.equal("samples" in payload, false);
});

test("short captures and missing signal are reported instead of inventing measurements", () => {
  assert.throws(() => analyzeToneAudioSamples([sine(4000, 48000)], 48000), error => error.code === "BUFFER_TOO_SHORT");
  assert.throws(() => analyzeToneAudioSamples([new Float32Array(48000)], 48000), error => error.code === "NO_SIGNAL");
});
