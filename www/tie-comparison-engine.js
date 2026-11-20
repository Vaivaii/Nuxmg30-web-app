const DB_FLOOR = -240;
const MAX_ALIGNMENT_OFFSET_MS = 30000;

export class TieComparisonError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TieComparisonError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new TieComparisonError(code, message);
}

function dbfs(value) {
  return value > 0 ? 20 * Math.log10(value) : DB_FLOOR;
}

function validateSource(source, label, channelIndex) {
  if (!source || !source.metadata || !Array.isArray(source.channels) || !source.channels.length) {
    fail("SOURCE_UNAVAILABLE", "Comparison source " + label + " is not loaded.");
  }
  const metadata = source.metadata;
  const sampleRateHz = Number(metadata.sampleRateHz);
  const frameCount = Number(metadata.frameCount);
  if (!Number.isFinite(sampleRateHz) || sampleRateHz < 8000 || sampleRateHz > 384000 ||
      !Number.isSafeInteger(frameCount) || frameCount < 1) {
    fail("INVALID_SOURCE", "Comparison source " + label + " has invalid audio metadata.");
  }
  if (!Number.isInteger(channelIndex) || channelIndex < 0 || channelIndex >= source.channels.length) {
    fail("INVALID_CHANNEL", "Select a channel that exists in source " + label + ".");
  }
  const samples = source.channels[channelIndex];
  if (!(samples instanceof Float32Array) || samples.length !== frameCount) {
    fail("INVALID_SOURCE", "Comparison source " + label + " does not expose a valid Float32 PCM channel.");
  }
  return { sampleRateHz, frameCount, samples, metadata };
}

function rmsOf(samples, startFrame, frameCount) {
  let sumSquares = 0;
  for (let i = 0; i < frameCount; i += 1) {
    const sample = samples[startFrame + i];
    if (!Number.isFinite(sample)) fail("INVALID_PCM", "The selected comparison region contains a non-finite PCM sample.");
    sumSquares += sample * sample;
  }
  return frameCount > 0 ? Math.sqrt(sumSquares / frameCount) : 0;
}

/**
 * Build a non-destructive matched-window plan. A positive manual offset means
 * B starts later than A; a negative offset means A starts later than B.
 * The plan references source PCM but never modifies it.
 */
export function createAlignedComparisonPlan(sourceA, sourceB, settings = {}) {
  const channelA = Number(settings.channelA ?? 0);
  const channelB = Number(settings.channelB ?? 0);
  const a = validateSource(sourceA, "A", channelA);
  const b = validateSource(sourceB, "B", channelB);
  if (a.sampleRateHz !== b.sampleRateHz) {
    fail("SAMPLE_RATE_MISMATCH", "The decoded analysis sample rates differ. Compare requires the same analysis sample rate; resampling is not applied silently.");
  }

  const offsetMs = Number(settings.offsetMs || 0);
  if (!Number.isFinite(offsetMs) || Math.abs(offsetMs) > MAX_ALIGNMENT_OFFSET_MS) {
    fail("INVALID_ALIGNMENT", "Manual alignment offset must be between -30,000 and +30,000 ms.");
  }
  const offsetFrames = Math.round((offsetMs / 1000) * a.sampleRateHz);
  const startA = Math.max(0, -offsetFrames);
  const startB = Math.max(0, offsetFrames);
  const frameCount = Math.min(a.frameCount - startA, b.frameCount - startB);
  if (!Number.isSafeInteger(frameCount) || frameCount < 1) {
    fail("NO_OVERLAP", "The selected manual alignment leaves no overlapping audio.");
  }

  const rmsA = rmsOf(a.samples, startA, frameCount);
  const rmsB = rmsOf(b.samples, startB, frameCount);
  const levelMatchRequested = settings.levelMatch === "rms";
  let gainA = 1;
  let gainB = 1;
  let levelMatchAvailable = false;
  let levelMatchNote = "Off";
  if (levelMatchRequested) {
    if (rmsA > 0 && rmsB > 0) {
      // Attenuation-only matching targets the quieter source to avoid boosts/clipping.
      const targetRms = Math.min(rmsA, rmsB);
      gainA = targetRms / rmsA;
      gainB = targetRms / rmsB;
      levelMatchAvailable = true;
      levelMatchNote = "RMS matched to the quieter source (attenuation only).";
    } else {
      levelMatchNote = "RMS matching unavailable because one source is digital silence.";
    }
  }

  return {
    sampleRateHz: a.sampleRateHz,
    frameCount,
    durationSeconds: frameCount / a.sampleRateHz,
    offsetMs,
    offsetFrames,
    alignmentMethod: offsetFrames === 0 ? "none" : "manual",
    levelMatch: {
      requested: levelMatchRequested,
      available: levelMatchAvailable,
      method: levelMatchAvailable ? "rms-attenuation-only" : "off",
      targetRms: levelMatchAvailable ? Math.min(rmsA, rmsB) : null,
      gainA,
      gainB,
      gainADb: gainA > 0 ? 20 * Math.log10(gainA) : DB_FLOOR,
      gainBDb: gainB > 0 ? 20 * Math.log10(gainB) : DB_FLOOR,
      note: levelMatchNote,
    },
    a: {
      source: sourceA,
      metadata: a.metadata,
      samples: a.samples,
      channelIndex: channelA,
      startFrame: startA,
      sourceRms: rmsA,
      gain: gainA,
    },
    b: {
      source: sourceB,
      metadata: b.metadata,
      samples: b.samples,
      channelIndex: channelB,
      startFrame: startB,
      sourceRms: rmsB,
      gain: gainB,
    },
  };
}

export function buildSpectrumComparison(resultA, resultB) {
  const spectrumA = resultA?.spectrum;
  const spectrumB = resultB?.spectrum;
  if (!spectrumA || !spectrumB ||
      spectrumA.binWidthHz !== spectrumB.binWidthHz ||
      spectrumA.magnitudeDbfs?.length !== spectrumB.magnitudeDbfs?.length ||
      resultA.settings?.fftSize !== resultB.settings?.fftSize ||
      resultA.settings?.window !== resultB.settings?.window) {
    fail("SPECTRUM_MISMATCH", "A and B spectra must use identical FFT, window, sample-rate and bin settings.");
  }
  const differenceDb = spectrumA.magnitudeDbfs.map((value, index) =>
    Number(spectrumB.magnitudeDbfs[index]) - Number(value));
  return {
    binWidthHz: spectrumA.binWidthHz,
    nyquistHz: spectrumA.nyquistHz,
    aDbfs: spectrumA.magnitudeDbfs.slice(),
    bDbfs: spectrumB.magnitudeDbfs.slice(),
    differenceDb,
    differenceDirection: "B minus A",
  };
}

export function buildDynamicComparison(plan, windowMs = 50) {
  const windowFrames = Math.max(1, Math.round((Number(windowMs) / 1000) * plan.sampleRateHz));
  const points = [];
  for (let offset = 0; offset < plan.frameCount; offset += windowFrames) {
    const count = Math.min(windowFrames, plan.frameCount - offset);
    const rmsA = rmsOf(plan.a.samples, plan.a.startFrame + offset, count) * plan.a.gain;
    const rmsB = rmsOf(plan.b.samples, plan.b.startFrame + offset, count) * plan.b.gain;
    const aDbfs = dbfs(rmsA);
    const bDbfs = dbfs(rmsB);
    points.push({
      timeSeconds: offset / plan.sampleRateHz,
      aRmsDbfs: aDbfs,
      bRmsDbfs: bDbfs,
      deltaDb: bDbfs - aDbfs,
    });
  }
  return { windowMs, points };
}

export function buildComparisonReport(plan, resultA, resultB) {
  const spectrum = buildSpectrumComparison(resultA, resultB);
  const dynamic = buildDynamicComparison(plan);
  const metrics = {};
  for (const key of ["rmsDbfs", "samplePeakDbfs", "crestFactorDb", "spectralCentroidHz", "spectralRolloff85Hz"]) {
    const a = resultA.metrics[key];
    const b = resultB.metrics[key];
    metrics[key] = {
      a,
      b,
      deltaBMinusA: Number.isFinite(a) && Number.isFinite(b) ? b - a : null,
    };
  }
  return {
    schemaVersion: 1,
    comparisonVersion: "1.0.0",
    measuredAt: new Date().toISOString(),
    sources: {
      a: {
        sourceId: plan.a.metadata.sourceId,
        sourceKind: plan.a.metadata.sourceKind,
        label: plan.a.metadata.label,
        sourceFormat: plan.a.metadata.sourceFormat,
        sampleRateHz: plan.a.metadata.sampleRateHz,
        sourceSampleRateHz: plan.a.metadata.sourceSampleRateHz ?? null,
        sourceChannelCount: plan.a.metadata.sourceChannelCount ?? null,
        sourceBitDepth: plan.a.metadata.sourceBitDepth ?? null,
        sourceEncoding: plan.a.metadata.sourceEncoding ?? null,
        channelCount: plan.a.metadata.channelCount,
        selectedChannel: plan.a.channelIndex,
        durationSeconds: plan.a.metadata.durationSeconds,
      },
      b: {
        sourceId: plan.b.metadata.sourceId,
        sourceKind: plan.b.metadata.sourceKind,
        label: plan.b.metadata.label,
        sourceFormat: plan.b.metadata.sourceFormat,
        sampleRateHz: plan.b.metadata.sampleRateHz,
        sourceSampleRateHz: plan.b.metadata.sourceSampleRateHz ?? null,
        sourceChannelCount: plan.b.metadata.sourceChannelCount ?? null,
        sourceBitDepth: plan.b.metadata.sourceBitDepth ?? null,
        sourceEncoding: plan.b.metadata.sourceEncoding ?? null,
        channelCount: plan.b.metadata.channelCount,
        selectedChannel: plan.b.channelIndex,
        durationSeconds: plan.b.metadata.durationSeconds,
      },
    },
    alignment: {
      method: plan.alignmentMethod,
      offsetMs: plan.offsetMs,
      offsetFrames: plan.offsetFrames,
      matchedDurationSeconds: plan.durationSeconds,
      matchedFrames: plan.frameCount,
    },
    levelMatch: { ...plan.levelMatch },
    settings: {
      fftSize: resultA.settings.fftSize,
      hopSize: resultA.settings.hopSize,
      window: resultA.settings.window,
      spectrumScale: resultA.settings.spectrumScale,
    },
    metrics,
    spectrum,
    dynamic,
    limitations: [
      "Comparison uses the selected decoded analysis channel from each recording; original files and recorder takes are not modified.",
      "RMS matching is attenuation-only and targets the quieter source. It is not LUFS or integrated-loudness matching.",
      "A positive manual offset means B starts later than A. No transient or cross-correlation auto-alignment is performed.",
      "A and B must have the same decoded analysis sample rate. Resampling is not applied silently.",
      "Different lengths are compared only over the matched overlapping region.",
      "Differences between separate performances can include playing variation, pickup, guitar, input, room and recording differences.",
      "A brighter spectrum or higher RMS is not an objective rating of tone quality.",
    ],
  };
}
