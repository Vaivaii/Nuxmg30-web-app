import test from "node:test";
import assert from "node:assert/strict";
import {
  createDspAccumulator,
  finalizeDspAccumulator,
  processDspChunk,
  TieDspError,
} from "../www/tie-dsp-engine.js";

function makeMetadata(frameCount, sampleRateHz = 48000) {
  return {
    sourceId: "fixture:sine",
    sourceKind: "imported-file",
    label: "Deterministic fixture",
    sourceFormat: "generated PCM",
    sampleRateHz,
    channelCount: 1,
    frameCount,
    durationSeconds: frameCount / sampleRateHz,
    sampleFormat: "Float32 PCM",
  };
}

function makeSine(frameCount, sampleRateHz, frequencyHz = 1000, amplitude = 0.5) {
  const samples = new Float32Array(frameCount);
  for (let index = 0; index < frameCount; index += 1) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * frequencyHz * index) / sampleRateHz);
  }
  return samples;
}

function analyzeInOneChunk(samples, sampleRateHz = 48000, settings = {}) {
  const metadata = makeMetadata(samples.length, sampleRateHz);
  const accumulator = createDspAccumulator(metadata, settings);
  processDspChunk(accumulator, samples, 0, samples.length);
  return finalizeDspAccumulator(accumulator);
}

test("TIE DSP: 1 kHz sine reports RMS, sample peak and crest factor from actual PCM", () => {
  const result = analyzeInOneChunk(makeSine(48000, 48000));
  assert.ok(Math.abs(result.metrics.rmsDbfs - (-9.03)) < 0.08, result.metrics.rmsDbfs);
  assert.ok(Math.abs(result.metrics.samplePeakDbfs - (-6.02)) < 0.02, result.metrics.samplePeakDbfs);
  assert.ok(Math.abs(result.metrics.crestFactorDb - 3.01) < 0.08, result.metrics.crestFactorDb);
  assert.equal(result.sampleCount, 48000);
  assert.ok(result.spectralFrames > 0);
});

test("TIE DSP: FFT peak is placed within one bin of the known sine frequency", () => {
  const result = analyzeInOneChunk(makeSine(48000, 48000, 1000, 0.5), 48000, { fftSize: 2048 });
  const values = result.spectrum.magnitudeDbfs;
  let peakBin = 1;
  for (let bin = 2; bin < values.length; bin += 1) {
    if (values[bin] > values[peakBin]) peakBin = bin;
  }
  const peakHz = peakBin * result.spectrum.binWidthHz;
  assert.ok(Math.abs(peakHz - 1000) <= result.spectrum.binWidthHz, peakHz);
  assert.ok(Math.abs(result.spectrum.binWidthHz - (48000 / 2048)) < 1e-9);
  assert.ok(Math.abs(values[peakBin] - (-6.02)) < 1.2, values[peakBin]);
});

test("TIE DSP: silence remains a valid measurement without NaN or fabricated noise floor", () => {
  const result = analyzeInOneChunk(new Float32Array(48000));
  assert.equal(result.metrics.rmsDbfs, -240);
  assert.equal(result.metrics.samplePeakDbfs, -240);
  assert.equal(result.metrics.crestFactorDb, null);
  assert.equal(result.metrics.noiseFloor.available, false);
  assert.ok(result.spectrum.magnitudeDbfs.every(Number.isFinite));
  assert.ok(result.metrics.bandEnergyPct.subBass === 0);
});

test("TIE DSP: clipped samples are counted using the documented sample threshold", () => {
  const samples = makeSine(48000, 48000, 1000, 0.5);
  samples[10] = 1;
  samples[11] = -1;
  const result = analyzeInOneChunk(samples);
  assert.equal(result.metrics.clipping.detected, true);
  assert.equal(result.metrics.clipping.sampleCount, 2);
  assert.equal(result.metrics.clipping.threshold, 0.999);
});

test("TIE DSP: chunked processing preserves sample counts and FFT frame continuity", () => {
  const sampleRate = 44100;
  const samples = makeSine(sampleRate * 3, sampleRate, 997, 0.4);
  const metadata = makeMetadata(samples.length, sampleRate);
  const fftSize = 1024;
  const hopSize = 512;
  const accumulator = createDspAccumulator(metadata, { fftSize, hopSize });
  const chunkFramesTarget = Math.floor((sampleRate * 2) / hopSize) * hopSize;
  let startFrame = 0;
  while (startFrame < samples.length) {
    const coreFrameCount = Math.min(chunkFramesTarget, samples.length - startFrame);
    const overlap = Math.min(fftSize - hopSize, samples.length - startFrame - coreFrameCount);
    const chunk = samples.subarray(startFrame, startFrame + coreFrameCount + overlap).slice();
    processDspChunk(accumulator, chunk, startFrame, coreFrameCount);
    startFrame += coreFrameCount;
  }
  const result = finalizeDspAccumulator(accumulator);
  assert.equal(result.sampleCount, samples.length);
  assert.equal(result.spectralFrames, Math.floor((samples.length - fftSize) / hopSize) + 1);
  assert.ok(result.spectrogram.rows.length <= 256);
  assert.ok(result.analyzedDurationSeconds > 2.99);
});

test("TIE DSP: each FFT size in the supported set is accepted", () => {
  for (const fftSize of [1024, 2048, 4096, 8192, 16384]) {
    const frameCount = Math.max(fftSize, 48000);
    const samples = makeSine(frameCount, 48000);
    const accumulator = createDspAccumulator(makeMetadata(frameCount), { fftSize });
    processDspChunk(accumulator, samples, 0, samples.length);
    const result = finalizeDspAccumulator(accumulator);
    assert.equal(result.settings.fftSize, fftSize);
  }
});

test("TIE DSP: unsupported FFT settings are rejected with a typed error", () => {
  assert.throws(
    () => createDspAccumulator(makeMetadata(48000), { fftSize: 1536 }),
    (error) => error instanceof TieDspError && error.code === "INVALID_SETTINGS",
  );
});

test("TIE DSP: malformed sample rate and channel selection are rejected", () => {
  assert.throws(
    () => createDspAccumulator({ ...makeMetadata(48000), sampleRateHz: 0 }),
    (error) => error.code === "INVALID_PCM",
  );
  assert.throws(
    () => createDspAccumulator(makeMetadata(48000), { channelIndex: 1 }),
    (error) => error.code === "INVALID_SETTINGS",
  );
});

test("TIE DSP: non-finite samples are rejected instead of silently replaced", () => {
  const samples = makeSine(48000, 48000);
  samples[100] = Number.NaN;
  const accumulator = createDspAccumulator(makeMetadata(samples.length));
  assert.throws(
    () => processDspChunk(accumulator, samples, 0, samples.length),
    (error) => error.code === "INVALID_PCM",
  );
});

test("TIE DSP: source shorter than one FFT frame is rejected", () => {
  assert.throws(
    () => createDspAccumulator(makeMetadata(500), { fftSize: 1024 }),
    (error) => error.code === "BUFFER_TOO_SHORT",
  );
});

test("TIE DSP: out-of-order or overlapping chunks are rejected", () => {
  const samples = makeSine(48000, 48000);
  const accumulator = createDspAccumulator(makeMetadata(samples.length));
  processDspChunk(accumulator, samples.subarray(0, 24000), 0, 24000);
  assert.throws(
    () => processDspChunk(accumulator, samples.subarray(23000), 23000, 25000),
    (error) => error.code === "INVALID_PCM",
  );
});
