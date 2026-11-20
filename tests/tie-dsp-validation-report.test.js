import test from "node:test";
import assert from "node:assert/strict";
import {
  createDspAccumulator,
  finalizeDspAccumulator,
  processDspChunk,
} from "../www/tie-dsp-engine.js";

const SAMPLE_RATE = 48000;
const reportRows = [];

function metadata(frameCount) {
  return {
    sourceId: "fixture:tie-dsp-validation",
    sourceKind: "imported-file",
    label: "Deterministic synthetic PCM",
    sourceFormat: "Generated Float32 PCM",
    sampleRateHz: SAMPLE_RATE,
    channelCount: 1,
    frameCount,
    durationSeconds: frameCount / SAMPLE_RATE,
    sampleFormat: "Float32 PCM",
  };
}

function sine(frameCount, frequencyHz, amplitude) {
  const samples = new Float32Array(frameCount);
  for (let index = 0; index < frameCount; index += 1) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * frequencyHz * index) / SAMPLE_RATE);
  }
  return samples;
}

function analyze(samples, settings = {}) {
  const accumulator = createDspAccumulator(metadata(samples.length), settings);
  processDspChunk(accumulator, samples, 0, samples.length);
  return finalizeDspAccumulator(accumulator);
}

function addNumeric(name, expected, actual, tolerance, unit) {
  const error = Math.abs(actual - expected);
  const status = Number.isFinite(actual) && error <= tolerance ? "PASS" : "FAIL";
  reportRows.push({
    test: name,
    expected: expected + (unit ? " " + unit : ""),
    actual: actual + (unit ? " " + unit : ""),
    tolerance: "±" + tolerance + (unit ? " " + unit : ""),
    error: Number.isFinite(error) ? Number(error.toFixed(6)) : null,
    status,
  });
  assert.equal(status, "PASS", name + ": expected " + expected + ", actual " + actual + ", tolerance " + tolerance);
}

function addRange(name, minimum, maximum, actual, unit) {
  const error = actual < minimum ? minimum - actual : (actual > maximum ? actual - maximum : 0);
  const status = Number.isFinite(actual) && error === 0 ? "PASS" : "FAIL";
  reportRows.push({
    test: name,
    expected: minimum + "–" + maximum + (unit ? " " + unit : ""),
    actual: actual + (unit ? " " + unit : ""),
    tolerance: "inside stated range",
    error: Number(error.toFixed(6)),
    status,
  });
  assert.equal(status, "PASS", name + ": actual " + actual + " is outside the expected range");
}

function addExact(name, expected, actual) {
  const status = Object.is(actual, expected) ? "PASS" : "FAIL";
  reportRows.push({
    test: name,
    expected: String(expected),
    actual: String(actual),
    tolerance: "exact",
    error: status === "PASS" ? 0 : 1,
    status,
  });
  assert.equal(status, "PASS", name + ": expected " + expected + ", actual " + actual);
}

function peakNear(result, frequencyHz, radiusBins = 2) {
  const center = Math.round(frequencyHz / result.spectrum.binWidthHz);
  let peakBin = Math.max(1, center - radiusBins);
  for (let bin = Math.max(1, center - radiusBins); bin <= Math.min(result.spectrum.magnitudeDbfs.length - 1, center + radiusBins); bin += 1) {
    if (result.spectrum.magnitudeDbfs[bin] > result.spectrum.magnitudeDbfs[peakBin]) peakBin = bin;
  }
  return {
    frequencyHz: peakBin * result.spectrum.binWidthHz,
    amplitudeDbfs: result.spectrum.magnitudeDbfs[peakBin],
  };
}

test("TIE DSP validation: deterministic fixture report", () => {
  reportRows.length = 0;

  // 440 Hz, 0.5 amplitude: frequency bin placement and one-sided Hann amplitude.
  const sine440 = analyze(sine(SAMPLE_RATE, 440, 0.5), { fftSize: 8192 });
  const peak440 = peakNear(sine440, 440);
  addNumeric("440 Hz sine · peak frequency", 440, peak440.frequencyHz, sine440.spectrum.binWidthHz, "Hz");
  addNumeric("440 Hz sine · amplitude 0.5 (8192 FFT, reduced scalloping)", 20 * Math.log10(0.5), peak440.amplitudeDbfs, 0.1, "dBFS");

  // 1 kHz at amplitude 0.5: RMS, peak, and crest factor.
  const sine1kHalf = analyze(sine(SAMPLE_RATE, 1000, 0.5), { fftSize: 4096 });
  const expectedHalfRms = 20 * Math.log10(0.5 / Math.sqrt(2));
  addNumeric("1 kHz sine · amplitude 0.5 · peak frequency", 1000, peakNear(sine1kHalf, 1000).frequencyHz, sine1kHalf.spectrum.binWidthHz, "Hz");
  addNumeric("1 kHz sine · amplitude 0.5 · RMS", expectedHalfRms, sine1kHalf.metrics.rmsDbfs, 0.02, "dBFS");
  addNumeric("1 kHz sine · amplitude 0.5 · sample peak", 20 * Math.log10(0.5), sine1kHalf.metrics.samplePeakDbfs, 0.02, "dBFS");
  addNumeric("1 kHz sine · amplitude 0.5 · crest factor", 20 * Math.log10(Math.sqrt(2)), sine1kHalf.metrics.crestFactorDb, 0.02, "dB");

  // 1 kHz at amplitude 1.0: full-scale metrics.
  const sine1kFull = analyze(sine(SAMPLE_RATE, 1000, 1.0), { fftSize: 4096 });
  addNumeric("1 kHz sine · amplitude 1.0 · RMS", 20 * Math.log10(1 / Math.sqrt(2)), sine1kFull.metrics.rmsDbfs, 0.02, "dBFS");
  addNumeric("1 kHz sine · amplitude 1.0 · sample peak", 0, sine1kFull.metrics.samplePeakDbfs, 0.001, "dBFS");
  addNumeric("1 kHz sine · amplitude 1.0 · crest factor", 20 * Math.log10(Math.sqrt(2)), sine1kFull.metrics.crestFactorDb, 0.02, "dB");

  // Dual tone: both expected spectral components must remain measurable.
  const dualTone = new Float32Array(SAMPLE_RATE);
  for (let index = 0; index < dualTone.length; index += 1) {
    const time = index / SAMPLE_RATE;
    dualTone[index] = 0.25 * Math.sin(2 * Math.PI * 440 * time) +
      0.25 * Math.sin(2 * Math.PI * 3000 * time);
  }
  const dualResult = analyze(dualTone, { fftSize: 8192 });
  addNumeric("Dual-tone · combined RMS", 20 * Math.log10(0.25), dualResult.metrics.rmsDbfs, 0.02, "dBFS");
  const expectedToneDbfs = 20 * Math.log10(0.25);
  for (const frequency of [440, 3000]) {
    const peak = peakNear(dualResult, frequency, 2);
    addNumeric("Dual-tone · " + frequency + " Hz component", expectedToneDbfs, peak.amplitudeDbfs, 0.1, "dBFS");
  }

  // Seeded uniform white noise: RMS is independently calculated from the source samples.
  const noise = new Float32Array(SAMPLE_RATE * 2);
  let seed = 0x13579bdf;
  let noiseSumSquares = 0;
  for (let index = 0; index < noise.length; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const sample = ((seed / 0x100000000) * 2 - 1) * 0.5;
    noise[index] = sample;
    noiseSumSquares += sample * sample;
  }
  const expectedNoiseRms = 20 * Math.log10(Math.sqrt(noiseSumSquares / noise.length));
  const noiseResult = analyze(noise, { fftSize: 4096 });
  addNumeric("Seeded white noise · independently calculated RMS", expectedNoiseRms, noiseResult.metrics.rmsDbfs, 0.01, "dBFS");
  addRange("Seeded white noise · spectral centroid sanity range", 8000, 16000, noiseResult.metrics.spectralCentroidHz, "Hz");

  // Digital silence: zero signal has the documented finite dB floor and no noise estimate.
  const silence = analyze(new Float32Array(SAMPLE_RATE), { fftSize: 2048 });
  addExact("Digital silence · RMS floor", -240, silence.metrics.rmsDbfs);
  addExact("Digital silence · sample peak floor", -240, silence.metrics.samplePeakDbfs);
  addExact("Digital silence · crest factor unavailable", null, silence.metrics.crestFactorDb);
  addExact("Digital silence · noise floor not fabricated", false, silence.metrics.noiseFloor.available);

  // 100 Hz–10 kHz linear frequency sweep: spectrogram's early and late peaks must follow the sweep.
  const sweep = new Float32Array(SAMPLE_RATE * 2);
  const sweepDuration = sweep.length / SAMPLE_RATE;
  const startHz = 100;
  const endHz = 10000;
  const slope = (endHz - startHz) / sweepDuration;
  for (let index = 0; index < sweep.length; index += 1) {
    const time = index / SAMPLE_RATE;
    sweep[index] = 0.5 * Math.sin(2 * Math.PI * (startHz * time + 0.5 * slope * time * time));
  }
  const sweepResult = analyze(sweep, { fftSize: 4096, hopSize: 1024 });
  const rowPeakHz = (row) => {
    let peakBin = 1;
    for (let bin = 2; bin < row.magnitudeDbfs.length; bin += 1) {
      if (row.magnitudeDbfs[bin] > row.magnitudeDbfs[peakBin]) peakBin = bin;
    }
    return peakBin * sweepResult.spectrum.binWidthHz;
  };
  addRange("100 Hz–10 kHz sweep · early STFT peak", 100, 1000, rowPeakHz(sweepResult.spectrogram.rows[0]), "Hz");
  addRange("100 Hz–10 kHz sweep · late STFT peak", 6000, 11000, rowPeakHz(sweepResult.spectrogram.rows[sweepResult.spectrogram.rows.length - 1]), "Hz");
  addRange("100 Hz–10 kHz sweep · spectrogram row cap", 1, 256, sweepResult.spectrogram.rows.length, "rows");

  // Clipped sine: clipped samples and sample peak are separately checked.
  const clipped = new Float32Array(SAMPLE_RATE);
  for (let index = 0; index < clipped.length; index += 1) {
    const raw = 1.25 * Math.sin((2 * Math.PI * 1000 * index) / SAMPLE_RATE);
    clipped[index] = Math.max(-1, Math.min(1, raw));
  }
  const clippedResult = analyze(clipped, { fftSize: 2048 });
  addRange("Clipped sine · clipped sample count", 1, clipped.length, clippedResult.metrics.clipping.sampleCount, "samples");
  addNumeric("Clipped sine · sample peak", 0, clippedResult.metrics.samplePeakDbfs, 0.001, "dBFS");

  const passed = reportRows.filter((row) => row.status === "PASS").length;
  const failed = reportRows.length - passed;
  console.log("TIE_DSP_VALIDATION_REPORT " + JSON.stringify({
    generatedAt: new Date().toISOString(),
    runtime: process.version,
    tests: reportRows.length,
    passed,
    failed,
    rows: reportRows,
  }));
  assert.equal(failed, 0);
});
