const SUPPORTED_FFT_SIZES = new Set([1024, 2048, 4096, 8192, 16384]);
const MAX_SPECTROGRAM_ROWS = 256;
const DB_FLOOR = -240;
const CLIP_THRESHOLD = 0.999;
const BANDS = [
  { id: "subBass", label: "Sub-bass", lowHz: 20, highHz: 120 },
  { id: "low", label: "Low", lowHz: 120, highHz: 400 },
  { id: "lowMid", label: "Low-mid", lowHz: 400, highHz: 1000 },
  { id: "mid", label: "Mid", lowHz: 1000, highHz: 3000 },
  { id: "highMid", label: "High-mid", lowHz: 3000, highHz: 6000 },
  { id: "high", label: "High", lowHz: 6000, highHz: 12000 },
];

export class TieDspError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TieDspError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new TieDspError(code, message);
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function dbfs(value) {
  return value > 0 ? 20 * Math.log10(value) : DB_FLOOR;
}

function fftInPlace(real, imag) {
  const length = real.length;
  let j = 0;
  for (let i = 1; i < length; i += 1) {
    let bit = length >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      const realValue = real[i];
      const imagValue = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = realValue;
      imag[j] = imagValue;
    }
  }
  for (let size = 2; size <= length; size <<= 1) {
    const half = size >> 1;
    const angle = -2 * Math.PI / size;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    for (let start = 0; start < length; start += size) {
      let wr = 1;
      let wi = 0;
      for (let offset = 0; offset < half; offset += 1) {
        const even = start + offset;
        const odd = even + half;
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr;
        imag[odd] = imag[even] - ti;
        real[even] += tr;
        imag[even] += ti;
        const nextWr = wr * stepReal - wi * stepImag;
        wi = wr * stepImag + wi * stepReal;
        wr = nextWr;
      }
    }
  }
}

export function validateAudioMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    fail("INVALID_PCM", "Audio metadata is missing.");
  }
  const sampleRateHz = Number(metadata.sampleRateHz);
  const channelCount = Number(metadata.channelCount);
  const frameCount = Number(metadata.frameCount);
  if (!Number.isFinite(sampleRateHz) || sampleRateHz < 8000 || sampleRateHz > 384000) {
    fail("INVALID_PCM", "The source sample rate is missing or outside the supported range.");
  }
  if (!Number.isInteger(channelCount) || channelCount < 1 || channelCount > 8) {
    fail("INVALID_PCM", "The source channel count must be between 1 and 8.");
  }
  if (!Number.isSafeInteger(frameCount) || frameCount < 1) {
    fail("INVALID_PCM", "The source frame count is missing or invalid.");
  }
  const durationSeconds = frameCount / sampleRateHz;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    fail("INVALID_PCM", "The source duration is invalid.");
  }
  return {
    ...metadata,
    sampleRateHz,
    channelCount,
    frameCount,
    durationSeconds,
    sourceKind: String(metadata.sourceKind || "unknown"),
    sourceId: String(metadata.sourceId || "unknown"),
    sampleFormat: String(metadata.sampleFormat || "Float32 PCM"),
  };
}

export function createDspAccumulator(metadata, settings = {}) {
  const source = validateAudioMetadata(metadata);
  const fftSize = Number(settings.fftSize || 2048);
  if (!SUPPORTED_FFT_SIZES.has(fftSize)) {
    fail("INVALID_SETTINGS", "FFT size must be 1024, 2048, 4096, 8192, or 16384.");
  }
  const hopSize = Number(settings.hopSize || fftSize / 2);
  if (!Number.isInteger(hopSize) || hopSize < 1 || hopSize > fftSize) {
    fail("INVALID_SETTINGS", "Hop size must be an integer between 1 and the FFT size.");
  }
  const channelIndex = Number(settings.channelIndex ?? 0);
  if (!Number.isInteger(channelIndex) || channelIndex < 0 || channelIndex >= source.channelCount) {
    fail("INVALID_SETTINGS", "The selected audio channel does not exist in this source.");
  }
  if (source.frameCount < fftSize) {
    fail("BUFFER_TOO_SHORT", "The audio is shorter than one FFT frame. Choose a longer recording or a smaller FFT size.");
  }

  const half = fftSize >> 1;
  const window = new Float64Array(fftSize);
  let windowSum = 0;
  for (let index = 0; index < fftSize; index += 1) {
    const value = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (fftSize - 1));
    window[index] = value;
    windowSum += value;
  }
  const expectedFrames = Math.max(1, Math.floor((source.frameCount - fftSize) / hopSize) + 1);
  const spectrogramStride = Math.max(1, Math.ceil(expectedFrames / MAX_SPECTROGRAM_ROWS));

  return {
    metadata: source,
    settings: { fftSize, hopSize, window: "hann", spectrumScale: "dBFS", channelIndex },
    window,
    windowSum,
    half,
    magnitudeSum: new Float64Array(half + 1),
    powerSum: new Float64Array(half + 1),
    spectrogramRows: [],
    spectrogramStride,
    expectedFrames,
    spectralFrames: 0,
    sampleCount: 0,
    sumSquares: 0,
    samplePeak: 0,
    clippedSampleCount: 0,
    processedFrames: 0,
    lastChunkEnd: 0,
  };
}

export function processDspChunk(accumulator, inputSamples, startFrame, coreFrameCount) {
  if (!accumulator || !(inputSamples instanceof Float32Array)) {
    fail("INVALID_PCM", "A Float32 PCM chunk is required.");
  }
  const start = Number(startFrame);
  const coreCount = Number(coreFrameCount);
  if (!Number.isSafeInteger(start) || start !== accumulator.lastChunkEnd ||
      !Number.isSafeInteger(coreCount) || coreCount < 1 ||
      start + coreCount > accumulator.metadata.frameCount ||
      inputSamples.length < coreCount) {
    fail("INVALID_PCM", "PCM chunks must be ordered, contiguous, and within the source length.");
  }
  const fftSize = accumulator.settings.fftSize;
  const hopSize = accumulator.settings.hopSize;
  if (start % hopSize !== 0) {
    fail("INVALID_PCM", "PCM chunk boundaries must align to the selected FFT hop size.");
  }
  const coreEnd = Math.min(coreCount, accumulator.metadata.frameCount - start);
  for (let index = 0; index < inputSamples.length; index += 1) {
    if (!Number.isFinite(inputSamples[index])) {
      fail("INVALID_PCM", "The audio contains a non-finite PCM sample.");
    }
  }
  for (let index = 0; index < coreEnd; index += 1) {
    const sample = inputSamples[index];
    accumulator.sumSquares += sample * sample;
    accumulator.samplePeak = Math.max(accumulator.samplePeak, Math.abs(sample));
    if (Math.abs(sample) >= CLIP_THRESHOLD) accumulator.clippedSampleCount += 1;
    accumulator.sampleCount += 1;
  }

  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);
  for (let localStart = 0; localStart < coreEnd && localStart + fftSize <= inputSamples.length; localStart += hopSize) {
    for (let index = 0; index < fftSize; index += 1) {
      real[index] = inputSamples[localStart + index] * accumulator.window[index];
      imag[index] = 0;
    }
    fftInPlace(real, imag);
    const amplitudes = new Float32Array(accumulator.half + 1);
    for (let bin = 0; bin <= accumulator.half; bin += 1) {
      const magnitude = Math.hypot(real[bin], imag[bin]);
      const isEndpoint = bin === 0 || bin === accumulator.half;
      const amplitude = magnitude * (isEndpoint ? 1 : 2) / accumulator.windowSum;
      amplitudes[bin] = amplitude;
      accumulator.magnitudeSum[bin] += amplitude;
      accumulator.powerSum[bin] += amplitude * amplitude;
    }
    const globalFrameIndex = Math.round((start + localStart) / hopSize);
    if (globalFrameIndex % accumulator.spectrogramStride === 0 &&
        accumulator.spectrogramRows.length < MAX_SPECTROGRAM_ROWS) {
      const valuesDbfs = new Float32Array(amplitudes.length);
      for (let bin = 0; bin < amplitudes.length; bin += 1) {
        valuesDbfs[bin] = dbfs(amplitudes[bin]);
      }
      accumulator.spectrogramRows.push({
        frameIndex: globalFrameIndex,
        timeSeconds: (start + localStart) / accumulator.metadata.sampleRateHz,
        valuesDbfs,
      });
    }
    accumulator.spectralFrames += 1;
  }
  accumulator.processedFrames += coreEnd;
  accumulator.lastChunkEnd += coreEnd;
  return {
    processedFrames: accumulator.processedFrames,
    totalFrames: accumulator.metadata.frameCount,
  };
}

export function finalizeDspAccumulator(accumulator) {
  if (!accumulator || accumulator.processedFrames !== accumulator.metadata.frameCount) {
    fail("INVALID_PCM", "The PCM stream ended before every source frame was analyzed.");
  }
  if (!accumulator.spectralFrames) {
    fail("BUFFER_TOO_SHORT", "The source did not contain a complete FFT frame.");
  }
  const { metadata, settings, spectralFrames } = accumulator;
  const sampleRateHz = metadata.sampleRateHz;
  const binWidthHz = sampleRateHz / settings.fftSize;
  const magnitude = new Float64Array(accumulator.magnitudeSum.length);
  const magnitudeDbfs = new Array(magnitude.length);
  for (let bin = 0; bin < magnitude.length; bin += 1) {
    magnitude[bin] = accumulator.magnitudeSum[bin] / spectralFrames;
    magnitudeDbfs[bin] = dbfs(magnitude[bin]);
  }

  let magnitudeTotal = 0;
  let weightedFrequency = 0;
  let powerTotal = 0;
  for (let bin = 1; bin < magnitude.length; bin += 1) {
    const frequencyHz = bin * binWidthHz;
    magnitudeTotal += magnitude[bin];
    weightedFrequency += frequencyHz * magnitude[bin];
    powerTotal += accumulator.powerSum[bin];
  }
  const spectralCentroidHz = magnitudeTotal > 0 ? weightedFrequency / magnitudeTotal : 0;
  const targetPower = powerTotal * 0.85;
  let cumulativePower = 0;
  let rolloffBin = 0;
  for (let bin = 1; bin < magnitude.length; bin += 1) {
    cumulativePower += accumulator.powerSum[bin];
    if (cumulativePower >= targetPower && targetPower > 0) {
      rolloffBin = bin;
      break;
    }
  }

  const bandEnergy = {};
  for (const band of BANDS) {
    let energy = 0;
    for (let bin = 1; bin < accumulator.powerSum.length; bin += 1) {
      const frequencyHz = bin * binWidthHz;
      if (frequencyHz >= band.lowHz && frequencyHz < band.highHz) {
        energy += accumulator.powerSum[bin];
      }
    }
    bandEnergy[band.id] = energy;
  }
  const bandTotal = Object.values(bandEnergy).reduce((sum, value) => sum + value, 0);
  const bandEnergyPct = Object.fromEntries(BANDS.map((band) => [
    band.id,
    bandTotal > 0 ? Math.round((bandEnergy[band.id] / bandTotal) * 1000) / 10 : 0,
  ]));

  const rms = accumulator.sampleCount > 0
    ? Math.sqrt(accumulator.sumSquares / accumulator.sampleCount) : 0;
  const rmsDbfs = dbfs(rms);
  const samplePeakDbfs = dbfs(accumulator.samplePeak);
  return {
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    source: metadata,
    settings,
    analyzedDurationSeconds: accumulator.processedFrames / sampleRateHz,
    sampleCount: accumulator.sampleCount,
    spectralFrames,
    spectrum: {
      binWidthHz,
      nyquistHz: sampleRateHz / 2,
      magnitudeDbfs,
    },
    spectrogram: {
      timeStepSeconds: settings.hopSize / sampleRateHz * accumulator.spectrogramStride,
      rows: accumulator.spectrogramRows.map((row) => ({
        frameIndex: row.frameIndex,
        timeSeconds: row.timeSeconds,
        magnitudeDbfs: Array.from(row.valuesDbfs),
      })),
    },
    metrics: {
      rmsDbfs: Math.round(rmsDbfs * 100) / 100,
      samplePeakDbfs: Math.round(samplePeakDbfs * 100) / 100,
      crestFactorDb: rms > 0 ? Math.round((samplePeakDbfs - rmsDbfs) * 100) / 100 : null,
      spectralCentroidHz: Math.round(spectralCentroidHz * 10) / 10,
      spectralRolloff85Hz: Math.round(rolloffBin * binWidthHz * 10) / 10,
      bandEnergyPct,
      clipping: {
        detected: accumulator.clippedSampleCount > 0,
        sampleCount: accumulator.clippedSampleCount,
        threshold: CLIP_THRESHOLD,
      },
      noiseFloor: {
        available: false,
        reason: "A quiet segment or a validated noise estimator is required; arbitrary guitar performance audio is not used as a noise-floor measurement.",
      },
      truePeakDbfs: null,
      thdPct: null,
    },
    limitations: [
      "Spectrum is a one-sided Hann-window amplitude spectrum normalized to dBFS; it is not a calibrated frequency response.",
      "Sample peak does not detect inter-sample peaks. True peak is not calculated.",
      "Noise floor is unavailable without a quiet-region selection or validated estimator.",
      "THD is not reported for arbitrary guitar performance audio.",
      "High-frequency energy is descriptive and is not a definitive digital-fizz diagnosis.",
    ],
  };
}

export const TIE_DSP_CONSTANTS = Object.freeze({
  supportedFftSizes: Object.freeze([1024, 2048, 4096, 8192, 16384]),
  maxSpectrogramRows: MAX_SPECTROGRAM_ROWS,
  clippingThreshold: CLIP_THRESHOLD,
  bands: Object.freeze(BANDS.map((band) => Object.freeze({ ...band }))),
});
