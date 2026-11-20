import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComparisonReport,
  buildDynamicComparison,
  buildSpectrumComparison,
  createAlignedComparisonPlan,
  TieComparisonError,
} from "../www/tie-comparison-engine.js";

function makeSource(id, channels, sampleRateHz = 48000) {
  const frameCount = channels[0].length;
  return {
    metadata: {
      sourceId: id,
      sourceKind: "imported-file",
      label: id.toUpperCase(),
      sourceFormat: "Fixture WAV",
      sampleRateHz,
      sourceSampleRateHz: sampleRateHz,
      channelCount: channels.length,
      frameCount,
      durationSeconds: frameCount / sampleRateHz,
    },
    channels,
  };
}

function sine(length, amplitude = 0.5, frequencyHz = 1000, sampleRateHz = 48000) {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequencyHz * i) / sampleRateHz);
  }
  return samples;
}

function fakeAnalysis(fftSize = 1024, value = -12) {
  return {
    settings: { fftSize, hopSize: fftSize / 2, window: "hann", spectrumScale: "dBFS" },
    spectrum: {
      binWidthHz: 48000 / fftSize,
      nyquistHz: 24000,
      magnitudeDbfs: Array.from({ length: fftSize / 2 + 1 }, (_, i) => i === 10 ? value : -80),
    },
    metrics: {
      rmsDbfs: -12,
      samplePeakDbfs: -6,
      crestFactorDb: 6,
      spectralCentroidHz: 1200,
      spectralRolloff85Hz: 5000,
    },
  };
}

test("TIE compare: unequal lengths use only the matched overlapping duration", () => {
  const a = makeSource("a", [sine(48000)]);
  const b = makeSource("b", [sine(24000)]);
  const plan = createAlignedComparisonPlan(a, b);
  assert.equal(plan.frameCount, 24000);
  assert.equal(plan.durationSeconds, 0.5);
  assert.equal(plan.alignmentMethod, "none");
});

test("TIE compare: channels can differ and each slot selects its own channel", () => {
  const a = makeSource("a", [sine(48000), sine(48000, 0.2)]);
  const b = makeSource("b", [sine(48000)]);
  const plan = createAlignedComparisonPlan(a, b, { channelA: 1, channelB: 0 });
  assert.equal(plan.a.channelIndex, 1);
  assert.equal(plan.b.channelIndex, 0);
});

test("TIE compare: manual positive offset starts B later and preserves source PCM", () => {
  const samplesA = sine(96000);
  const samplesB = sine(96000);
  const originalA = samplesA.slice();
  const originalB = samplesB.slice();
  const plan = createAlignedComparisonPlan(
    makeSource("a", [samplesA]),
    makeSource("b", [samplesB]),
    { offsetMs: 125 },
  );
  assert.equal(plan.offsetFrames, 6000);
  assert.equal(plan.a.startFrame, 0);
  assert.equal(plan.b.startFrame, 6000);
  assert.equal(plan.frameCount, 90000);
  assert.deepEqual(samplesA, originalA);
  assert.deepEqual(samplesB, originalB);
});

test("TIE compare: manual negative offset starts A later", () => {
  const plan = createAlignedComparisonPlan(
    makeSource("a", [sine(96000)]),
    makeSource("b", [sine(96000)]),
    { offsetMs: -50 },
  );
  assert.equal(plan.a.startFrame, 2400);
  assert.equal(plan.b.startFrame, 0);
  assert.equal(plan.frameCount, 93600);
});

test("TIE compare: RMS matching attenuates only the louder source", () => {
  const samplesA = sine(48000, 0.25);
  const samplesB = sine(48000, 0.5);
  const plan = createAlignedComparisonPlan(
    makeSource("a", [samplesA]),
    makeSource("b", [samplesB]),
    { levelMatch: "rms" },
  );
  assert.equal(plan.levelMatch.available, true);
  assert.equal(plan.a.gain, 1);
  assert.ok(Math.abs(plan.b.gain - 0.5) < 1e-5);
  assert.ok(plan.a.gain <= 1 && plan.b.gain <= 1);
  assert.equal(plan.levelMatch.method, "rms-attenuation-only");
  assert.ok(plan.levelMatch.gainBDb < -5.9 && plan.levelMatch.gainBDb > -6.1);
  assert.equal(samplesA[1], sine(2, 0.25)[1]);
  assert.equal(samplesB[1], sine(2, 0.5)[1]);
});

test("TIE compare: RMS matching is explicitly unavailable when either source is silent", () => {
  const plan = createAlignedComparisonPlan(
    makeSource("a", [new Float32Array(48000)]),
    makeSource("b", [sine(48000)]),
    { levelMatch: "rms" },
  );
  assert.equal(plan.levelMatch.available, false);
  assert.match(plan.levelMatch.note, /digital silence/i);
  assert.equal(plan.a.gain, 1);
  assert.equal(plan.b.gain, 1);
});

test("TIE compare: mismatched sample rates are rejected instead of silently resampled", () => {
  assert.throws(
    () => createAlignedComparisonPlan(
      makeSource("a", [sine(48000)], 48000),
      makeSource("b", [sine(44100, 0.5, 1000, 44100)], 44100),
    ),
    (error) => error instanceof TieComparisonError && error.code === "SAMPLE_RATE_MISMATCH",
  );
});

test("TIE compare: invalid channels, offsets and non-overlapping windows return typed errors", () => {
  const a = makeSource("a", [sine(48000)]);
  const b = makeSource("b", [sine(48000)]);
  assert.throws(() => createAlignedComparisonPlan(a, b, { channelA: 1 }), /channel/i);
  assert.throws(() => createAlignedComparisonPlan(a, b, { offsetMs: 30001 }), /offset/i);
  assert.throws(() => createAlignedComparisonPlan(a, b, { offsetMs: 2000 }), (e) => e.code === "NO_OVERLAP");
});

test("TIE compare: spectrum difference is B minus A with identical analysis settings", () => {
  const a = fakeAnalysis(1024, -12);
  const b = fakeAnalysis(1024, -9);
  const comparison = buildSpectrumComparison(a, b);
  assert.equal(comparison.differenceDirection, "B minus A");
  assert.equal(comparison.differenceDb[10], 3);
  assert.equal(comparison.differenceDb[9], 0);
  assert.throws(() => buildSpectrumComparison(a, fakeAnalysis(2048)), (e) => e.code === "SPECTRUM_MISMATCH");
});

test("TIE compare: dynamic envelope uses matched interval and reports B-minus-A level", () => {
  const a = makeSource("a", [sine(48000, 0.25)]);
  const b = makeSource("b", [sine(48000, 0.5)]);
  const plan = createAlignedComparisonPlan(a, b, { levelMatch: "rms" });
  const dynamic = buildDynamicComparison(plan, 100);
  assert.equal(dynamic.points.length, 10);
  assert.ok(Math.abs(dynamic.points[0].deltaDb) < 0.01);
});

test("TIE compare: report captures provenance, settings, gains, metrics and limitations", () => {
  const plan = createAlignedComparisonPlan(
    makeSource("a", [sine(48000, 0.25)]),
    makeSource("b", [sine(48000, 0.5)]),
    { levelMatch: "rms" },
  );
  const report = buildComparisonReport(plan, fakeAnalysis(), fakeAnalysis(1024, -10));
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.sources.a.label, "A");
  assert.equal(report.sources.b.selectedChannel, 0);
  assert.equal(report.levelMatch.method, "rms-attenuation-only");
  assert.equal(report.settings.fftSize, 1024);
  assert.equal(report.spectrum.differenceDirection, "B minus A");
  assert.ok(report.dynamic.points.length > 0);
  assert.ok(report.limitations.some((item) => /brighter spectrum/i.test(item)));
});
