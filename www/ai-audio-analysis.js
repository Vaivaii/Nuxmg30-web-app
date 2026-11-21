/**
 * Local MG-30 USB audio tone measurements.
 * Audio samples stay on-device; callers may send only the returned metrics to AI.
 */
import { analyzeToneAudioSamples as analyzeSharedToneAudioSamples } from './ai-live-tone-dsp.js';

function finiteSample(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(-1, Math.min(1, number)) : 0;
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
        real[odd] = real[even] - tr; imag[odd] = imag[even] - ti;
        real[even] += tr; imag[even] += ti;
        const nextWr = wr * stepReal - wi * stepImag;
        wi = wr * stepImag + wi * stepReal; wr = nextWr;
      }
    }
  }
}
function nextPowerOfTwo(value) {
  let result = 1;
  while (result < value) result <<= 1;
  return result;
}
function dbfs(value) { return value > 0 ? 20 * Math.log10(value) : -240; }

/** Analyze one or more decoded PCM channels without uploading audio. */
export function analyzeToneAudioSamples(channelData, sampleRate) {
  return analyzeSharedToneAudioSamples(channelData, sampleRate);
}

/**
 * Select only the requested USB input positions from an Android multichannel WAV.
 * The active mask maps WAV channel order; requested mask identifies the input pair
 * chosen by the caller (for AI listening this is USB inputs 1–2, mask 0x3).
 */
export function selectUsbInputChannels(channelData, activeMask, requestedMask) {
  if (!Array.isArray(channelData)) throw new TypeError('Decoded USB channel data is required.');
  const active = Number(activeMask) || Number(requestedMask) || 0;
  const requested = Number(requestedMask) || active;
  const selected = [];
  let position = 0;
  for (let bit = 0; bit < 8; bit += 1) {
    const flag = 1 << bit;
    if ((active & flag) === 0) continue;
    const channel = channelData[position++];
    if ((requested & flag) !== 0 && channel) selected.push(channel);
  }
  if (selected.length !== countBits(requested)) {
    throw new Error('The MG-30 USB capture does not contain every requested input channel.');
  }
  return selected;
}
function countBits(value) {
  let count = 0, bits = Number(value) || 0;
  while (bits) { count += bits & 1; bits >>>= 1; }
  return count;
}

export function formatToneAudioMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object') return 'No measured USB audio context is available.';
  const bands = metrics.bandsPct || {};
  return [
    'Capture: '+Number(metrics.durationSeconds||0).toFixed(2)+' s, '+Number(metrics.sampleRate||0)+' Hz, '+Number(metrics.channels||0)+' channel(s).',
    'Level: RMS '+metrics.rmsDbfs+' dBFS, peak '+metrics.peakDbfs+' dBFS, crest factor '+metrics.crestFactorDb+' dB.',
    'Spectrum: centroid '+metrics.spectralCentroidHz+' Hz, 85% rolloff '+metrics.rolloff85Hz+' Hz.',
    'Relative band energy: sub-bass '+bands.subBass+'%, low '+bands.low+'%, low-mid '+bands.lowMid+'%, mid '+bands.mid+'%, high-mid '+bands.highMid+'%, high '+bands.high+'%.',
    'Performance level variation (10th–95th percentile): '+metrics.frameRmsRangeDb+' dB.',
    metrics.analysisNote||''
  ].filter(Boolean).join('\n');
}
