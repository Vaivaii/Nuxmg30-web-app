/**
 * Shared local DSP engine for AI Live Tone Assistant.
 * The same chunk processor powers Analyze Once and Live Listening.
 * It accepts decoded PCM samples only; it never records, uploads, or sends audio to AI.
 */

const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 192000;
const MAX_CHANNELS = 8;
const CLIP_THRESHOLD = 0.999;
const DB_FLOOR = -120;
const BAND_DEFINITIONS = Object.freeze([
  ["subBass", 20, 120],
  ["low", 120, 400],
  ["lowMid", 400, 1000],
  ["mid", 1000, 3000],
  ["highMid", 3000, 6000],
  ["high", 6000, 12000],
]);

export class ToneDspError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ToneDspError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ToneDspError(code, message);
}

function dbfs(amplitude) {
  return amplitude > 0 ? 20 * Math.log10(amplitude) : -240;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * fraction)));
  return sorted[index];
}

function fftInPlace(real, imag) {
  const length = real.length;
  let j = 0;
  for (let i = 1; i < length; i += 1) {
    let bit = length >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let size = 2; size <= length; size <<= 1) {
    const half = size >> 1;
    const angle = -2 * Math.PI / size;
    const stepReal = Math.cos(angle), stepImag = Math.sin(angle);
    for (let start = 0; start < length; start += size) {
      let wr = 1, wi = 0;
      for (let offset = 0; offset < half; offset += 1) {
        const even = start + offset, odd = even + half;
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

function normalizePcmChannels(channelData) {
  if (!Array.isArray(channelData) || channelData.length < 1 || channelData.length > MAX_CHANNELS) {
    fail("INVALID_PCM", "DSP requires one to eight decoded PCM channels.");
  }
  const frameCount = channelData[0]?.length;
  if (!Number.isInteger(frameCount) || frameCount < 0) {
    fail("INVALID_PCM", "PCM channels must be non-empty array-like sample buffers.");
  }
  for (const channel of channelData) {
    if (!channel || channel.length !== frameCount) {
      fail("INVALID_PCM", "All PCM channels must contain the same number of frames.");
    }
    for (let index = 0; index < channel.length; index += 1) {
      const sample = Number(channel[index]);
      if (!Number.isFinite(sample) || sample < -1.000001 || sample > 1.000001) {
        fail("INVALID_PCM", "PCM contains a non-finite or out-of-range sample; samples are not silently clamped.");
      }
    }
  }
  return { channels: channelData, frameCount };
}

export function createToneDspSession(metadata = {}, settings = {}) {
  const sampleRateHz = Math.round(Number(metadata.sampleRateHz ?? metadata.sampleRate));
  const channelCount = Number(metadata.channelCount ?? metadata.channels);
  if (!Number.isInteger(sampleRateHz) || sampleRateHz < MIN_SAMPLE_RATE || sampleRateHz > MAX_SAMPLE_RATE) {
    fail("INVALID_METADATA", "Sample rate must be between 8 kHz and 192 kHz.");
  }
  if (!Number.isInteger(channelCount) || channelCount < 1 || channelCount > MAX_CHANNELS) {
    fail("INVALID_METADATA", "Channel count must be between one and eight.");
  }
  const fftSize = Number(settings.fftSize ?? 2048);
  const hopSize = Number(settings.hopSize ?? fftSize / 2);
  if (![1024, 2048, 4096, 8192].includes(fftSize)) {
    fail("INVALID_SETTINGS", "FFT size must be 1024, 2048, 4096, or 8192.");
  }
  if (!Number.isInteger(hopSize) || hopSize < 1 || hopSize > fftSize) {
    fail("INVALID_SETTINGS", "Hop size must be an integer from one to the FFT size.");
  }
  const window = new Float64Array(fftSize);
  let windowSum = 0;
  for (let i = 0; i < fftSize; i += 1) {
    const value = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
    window[i] = value;
    windowSum += value;
  }
  return {
    metadata: {
      source: String(metadata.source || "MG-30 USB Audio"),
      sampleRateHz,
      channelCount,
      channelIndexMask: Number(metadata.channelIndexMask) || null,
      captureMode: String(metadata.captureMode || "unknown"),
    },
    settings: { fftSize, hopSize, window: "hann", clippingThreshold: CLIP_THRESHOLD },
    window,
    windowSum,
    carry: Array.from({ length: channelCount }, () => new Float32Array(0)),
    spectrumPower: new Float64Array((fftSize >> 1) + 1),
    spectralFrames: 0,
    frameRmsDbfs: [],
    sumSquares: 0,
    sampleCount: 0,
    samplePeak: 0,
    clippedSampleCount: 0,
    totalFrames: 0,
    startedAt: Date.now(),
    processingMs: 0,
    finalized: false,
  };
}

/** Feed the next contiguous PCM chunk. Each channel must have the same frame count. */
export function processToneDspChunk(session, channelData) {
  if (!session || session.finalized) fail("SESSION_CLOSED", "This DSP session is already finalized.");
  const { channels, frameCount } = normalizePcmChannels(channelData);
  if (channels.length !== session.metadata.channelCount) {
    fail("INVALID_PCM", "PCM channel count does not match the initialized DSP session.");
  }
  const started = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  for (const channel of channels) {
    for (let index = 0; index < frameCount; index += 1) {
      const sample = Number(channel[index]);
      session.sumSquares += sample * sample;
      session.samplePeak = Math.max(session.samplePeak, Math.abs(sample));
      if (Math.abs(sample) >= CLIP_THRESHOLD) session.clippedSampleCount += 1;
      session.sampleCount += 1;
    }
  }
  session.totalFrames += frameCount;

  const fftSize = session.settings.fftSize;
  const hopSize = session.settings.hopSize;
  const half = fftSize >> 1;
  const combined = channels.map((channel, index) => {
    const prior = session.carry[index];
    const joined = new Float32Array(prior.length + frameCount);
    joined.set(prior);
    joined.set(channel, prior.length);
    return joined;
  });
  let offset = 0;
  while (offset + fftSize <= combined[0].length) {
    let frameSumSquares = 0;
    let frameSamples = 0;
    for (let channelIndex = 0; channelIndex < combined.length; channelIndex += 1) {
      const real = new Float64Array(fftSize);
      const imag = new Float64Array(fftSize);
      const input = combined[channelIndex];
      for (let i = 0; i < fftSize; i += 1) {
        const sample = input[offset + i];
        frameSumSquares += sample * sample;
        frameSamples += 1;
        real[i] = sample * session.window[i];
      }
      fftInPlace(real, imag);
      for (let bin = 0; bin <= half; bin += 1) {
        session.spectrumPower[bin] += (real[bin] * real[bin] + imag[bin] * imag[bin]) / combined.length;
      }
    }
    const frameRms = Math.sqrt(frameSumSquares / Math.max(1, frameSamples));
    session.frameRmsDbfs.push(dbfs(frameRms));
    session.spectralFrames += 1;
    offset += hopSize;
  }
  session.carry = combined.map(input => input.subarray(offset).slice());
  const ended = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  session.processingMs += Math.max(0, ended - started);
  return getToneDspLiveSummary(session);
}

/** Lightweight live readout; it does not create a conversation message or finalize the session. */
export function getToneDspLiveSummary(session) {
  const rms = session.sampleCount ? Math.sqrt(session.sumSquares / session.sampleCount) : 0;
  let totalPower = 0, weightedFrequency = 0;
  const binWidthHz = session.metadata.sampleRateHz / session.settings.fftSize;
  const half = session.settings.fftSize >> 1;
  const bandPower = Object.fromEntries(BAND_DEFINITIONS.map(([name]) => [name, 0]));
  for (let bin = 1; bin <= half; bin += 1) {
    const power = session.spectrumPower[bin];
    const frequencyHz = bin * binWidthHz;
    totalPower += power;
    weightedFrequency += frequencyHz * power;
    for (const [name, low, high] of BAND_DEFINITIONS) {
      if (frequencyHz >= low && frequencyHz < high) bandPower[name] += power;
    }
  }
  const bandTotal = Object.values(bandPower).reduce((sum, value) => sum + value, 0);
  const liveBandsPct = Object.fromEntries(BAND_DEFINITIONS.map(([name]) => [
    name, bandTotal > 0 ? Math.round((bandPower[name] / bandTotal) * 1000) / 10 : 0,
  ]));
  return {
    durationSeconds: session.totalFrames / session.metadata.sampleRateHz,
    rmsDbfs: session.sampleCount ? Math.round(dbfs(rms) * 100) / 100 : null,
    samplePeakDbfs: session.sampleCount ? Math.round(dbfs(session.samplePeak) * 100) / 100 : null,
    spectralCentroidHz: session.spectralFrames && totalPower > 0 ? Math.round(weightedFrequency / totalPower) : null,
    bandsPct: liveBandsPct,
    spectralFrames: session.spectralFrames,
    sampleCount: session.sampleCount,
    clippingSamples: session.clippedSampleCount,
  };
}

export function finalizeToneDspSession(session) {
  if (!session || session.finalized) fail("SESSION_CLOSED", "This DSP session is already finalized.");
  session.finalized = true;
  if (session.totalFrames < Math.floor(session.metadata.sampleRateHz * 0.35)) {
    fail("BUFFER_TOO_SHORT", "Capture at least 350 ms of MG-30 USB Audio before analysis.");
  }
  if (!session.sampleCount || session.samplePeak < 0.0005) {
    fail("NO_SIGNAL", "No usable signal was measured in the MG-30 USB Audio capture.");
  }
  if (!session.spectralFrames) fail("BUFFER_TOO_SHORT", "The capture did not contain a complete FFT analysis frame.");

  const { sampleRateHz, channelCount } = session.metadata;
  const fftSize = session.settings.fftSize;
  const binWidthHz = sampleRateHz / fftSize;
  const half = fftSize >> 1;
  const averagePower = Array.from(session.spectrumPower, value => value / session.spectralFrames);
  let totalPower = 0, weightedFrequency = 0;
  for (let bin = 1; bin <= half; bin += 1) {
    const power = averagePower[bin];
    const frequencyHz = bin * binWidthHz;
    totalPower += power;
    weightedFrequency += frequencyHz * power;
  }
  const spectralCentroidHz = totalPower > 0 ? weightedFrequency / totalPower : null;
  const targetPower = totalPower * 0.85;
  let cumulative = 0, rolloff85Hz = null;
  for (let bin = 1; bin <= half; bin += 1) {
    cumulative += averagePower[bin];
    if (cumulative >= targetPower) {
      rolloff85Hz = bin * binWidthHz;
      break;
    }
  }
  const bandsPower = Object.fromEntries(BAND_DEFINITIONS.map(([name]) => [name, 0]));
  for (let bin = 1; bin <= half; bin += 1) {
    const frequencyHz = bin * binWidthHz;
    for (const [name, low, high] of BAND_DEFINITIONS) {
      if (frequencyHz >= low && frequencyHz < high) bandsPower[name] += averagePower[bin];
    }
  }
  const bandTotal = Object.values(bandsPower).reduce((sum, value) => sum + value, 0);
  const bandsPct = Object.fromEntries(BAND_DEFINITIONS.map(([name]) => [
    name, bandTotal > 0 ? Math.round((bandsPower[name] / bandTotal) * 1000) / 10 : 0,
  ]));
  const windowCorrection = session.windowSum > 0 ? 2 / session.windowSum : 0;
  const frequencyBins = Array.from({ length: half + 1 }, (_, bin) => {
    const power = averagePower[bin];
    const correction = (bin === 0 || bin === half) ? 1 : windowCorrection;
    const amplitude = Math.sqrt(Math.max(0, power)) * correction;
    return {
      frequencyHz: Math.round(bin * binWidthHz * 10) / 10,
      magnitudeDbfs: Math.max(DB_FLOOR, Math.round(dbfs(amplitude) * 10) / 10),
    };
  });
  const rms = Math.sqrt(session.sumSquares / session.sampleCount);
  const rmsDbfs = dbfs(rms);
  const peakDbfs = dbfs(session.samplePeak);
  const lowLevelDbfs = percentile(session.frameRmsDbfs, 0.10);
  const highLevelDbfs = percentile(session.frameRmsDbfs, 0.95);
  const levelVariationDb = lowLevelDbfs === null || highLevelDbfs === null ? null : highLevelDbfs - lowLevelDbfs;
  const totalDuration = session.totalFrames / sampleRateHz;
  const result = {
    schemaVersion: "mg30-tone-dsp/1.0",
    measuredAt: Date.now(),
    source: {
      kind: "mg30-usb-audio",
      label: session.metadata.source,
      sampleRateHz,
      channelCount,
      channelIndexMask: session.metadata.channelIndexMask,
      captureMode: session.metadata.captureMode,
      durationSeconds: Math.round(totalDuration * 1000) / 1000,
      sampleCount: session.sampleCount,
      frameCount: session.totalFrames,
      pcmProvenance: "decoded local MG-30 USB Audio PCM",
    },
    settings: { ...session.settings, binWidthHz: Math.round(binWidthHz * 1000) / 1000 },
    measurementStatus: {
      rmsDbfs: "measured",
      samplePeakDbfs: "measured",
      crestFactorDb: "measured",
      spectrum: "measured",
      frequencyBands: "measured",
      clipping: "measured",
      noiseFloor: "unavailable",
      dynamicRange: "not_measured",
      latency: "not_measured",
      truePeak: "not_measured",
    },
    metrics: {
      rmsDbfs: Math.round(rmsDbfs * 100) / 100,
      samplePeakDbfs: Math.round(peakDbfs * 100) / 100,
      crestFactorDb: Math.round((peakDbfs - rmsDbfs) * 100) / 100,
      spectralCentroidHz: spectralCentroidHz === null ? null : Math.round(spectralCentroidHz),
      rolloff85Hz: rolloff85Hz === null ? null : Math.round(rolloff85Hz),
      bandsPct,
      levelVariation10To95Db: levelVariationDb === null ? null : Math.round(levelVariationDb * 100) / 100,
      clipping: {
        detected: session.clippedSampleCount > 0,
        sampleCount: session.clippedSampleCount,
        threshold: CLIP_THRESHOLD,
      },
      noiseFloor: {
        valueDbfs: null,
        status: "unavailable",
        reason: "No dedicated noise-only interval or validated noise-floor estimator is available.",
      },
      dynamicRange: {
        valueDb: null,
        status: "not_measured",
        reason: "Performance level variation is reported separately; it is not a calibrated dynamic-range measurement.",
      },
      latency: {
        valueMs: null,
        status: "not_measured",
        reason: "No input-latency or end-to-end latency loopback measurement was performed.",
      },
      truePeak: {
        valueDbfs: null,
        status: "not_measured",
        reason: "Inter-sample true peak is not calculated.",
      },
    },
    spectrum: {
      status: "measured",
      binWidthHz: Math.round(binWidthHz * 1000) / 1000,
      nyquistHz: sampleRateHz / 2,
      bins: frequencyBins,
    },
    analysis: {
      status: "measured",
      fftFrames: session.spectralFrames,
      processingMs: Math.round(session.processingMs * 100) / 100,
      clippedSampleCount: session.clippedSampleCount,
      limitations: [
        "Measurements describe the captured performance and signal path, not a calibrated frequency response of the amplifier alone.",
        "Results depend on guitar pickups, playing technique, guitar volume, gain staging, and the selected USB input channels.",
        "Relative band energy is calculated from the measured FFT bins and is not a universal good/bad tone score.",
      ],
    },
  };
  // Backward-compatible fields for current assistant and older call sites.
  result.sampleRate = sampleRateHz;
  result.durationSeconds = result.source.durationSeconds;
  result.channels = channelCount;
  result.rmsDbfs = result.metrics.rmsDbfs;
  result.peakDbfs = result.metrics.samplePeakDbfs;
  result.crestFactorDb = result.metrics.crestFactorDb;
  result.spectralCentroidHz = result.metrics.spectralCentroidHz;
  result.rolloff85Hz = result.metrics.rolloff85Hz;
  result.bandsPct = result.metrics.bandsPct;
  result.frameRmsRangeDb = result.metrics.levelVariation10To95Db;
  result.spectralFrames = session.spectralFrames;
  result.analysisNote = result.analysis.limitations.join(" ");
  return result;
}

/** Analyze a complete decoded buffer through the same chunk engine used by Live Listening. */
export function analyzeToneAudioSamples(channelData, sampleRate, settings = {}) {
  const channels = Array.isArray(channelData) ? channelData : [];
  if (!channels.length) fail("INVALID_PCM", "Decoded PCM channels are required.");
  const session = createToneDspSession({
    sampleRateHz: sampleRate,
    channelCount: channels.length,
    source: "MG-30 USB Audio",
    captureMode: "analyze-once",
  }, settings);
  const frameCount = channels[0]?.length || 0;
  const chunkFrames = Math.max(session.settings.fftSize, 8192);
  for (let offset = 0; offset < frameCount; offset += chunkFrames) {
    const end = Math.min(frameCount, offset + chunkFrames);
    processToneDspChunk(session, channels.map(channel => channel.subarray(offset, end)));
  }
  return finalizeToneDspSession(session);
}

/** Compact, provenance-preserving payload for the existing AI provider pipeline. */
export function toAiToneDspPayload(report, maxSpectrumBins = 96) {
  if (!report || report.schemaVersion !== "mg30-tone-dsp/1.0") {
    fail("INVALID_REPORT", "A versioned DSP report is required before AI interpretation.");
  }
  const bins = Array.isArray(report.spectrum?.bins) ? report.spectrum.bins : [];
  const stride = Math.max(1, Math.ceil(bins.length / Math.max(16, maxSpectrumBins)));
  return {
    schemaVersion: report.schemaVersion,
    source: report.source,
    settings: report.settings,
    measurementStatus: report.measurementStatus,
    metrics: report.metrics,
    spectrum: {
      status: report.spectrum.status,
      binWidthHz: report.spectrum.binWidthHz,
      nyquistHz: report.spectrum.nyquistHz,
      bins: bins.filter((_, index) => index % stride === 0),
    },
    analysis: report.analysis,
  };
}
