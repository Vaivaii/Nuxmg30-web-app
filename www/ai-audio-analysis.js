/**
 * Local MG-30 USB audio tone measurements.
 * Audio samples stay on-device; callers may send only the returned metrics to AI.
 */
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
  const channels = Array.isArray(channelData) ? channelData.filter(channel => channel && channel.length) : [];
  const rate = Math.round(Number(sampleRate) || 0);
  if (!channels.length || !rate || channels.some(channel => !Number.isFinite(channel.length))) {
    throw new TypeError('Valid decoded USB audio channels and sample rate are required.');
  }
  const frameCount = Math.min(...channels.map(channel => channel.length));
  if (frameCount < Math.floor(rate * 0.35)) throw new Error('The USB audio capture is too short. Capture at least half a second.');
  const longest = Math.max(...channels.map(channel => channel.length));
  let sumSquares = 0, peak = 0, sampleCount = 0;
  const stride = Math.max(1, Math.floor(frameCount / 500000));
  for (const channel of channels) {
    for (let index = 0; index < channel.length; index += stride) {
      const sample = finiteSample(channel[index]);
      sumSquares += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
      sampleCount += 1;
    }
  }
  const rms = sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0;
  if (rms < 0.00012 || peak < 0.0005) {
    throw new Error('No usable guitar signal was detected in the MG-30 USB capture. Check the MG-30 output and input level, then try again.');
  }
  const fftSize = Math.min(4096, nextPowerOfTwo(Math.max(512, Math.floor(frameCount / 8))));
  const hopSize = Math.max(256, fftSize >> 1), half = fftSize >> 1;
  const spectrumPower = new Float64Array(half + 1), window = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
  let spectralFrames = 0;
  const frameRms = [];
  for (let start = 0; start + fftSize <= frameCount; start += hopSize) {
    let frameSumSquares = 0, frameSamples = 0;
    for (const channel of channels) {
      const real = new Float64Array(fftSize), imag = new Float64Array(fftSize);
      for (let i = 0; i < fftSize; i += 1) {
        const sample = finiteSample(channel[start + i]);
        frameSumSquares += sample * sample; frameSamples += 1;
        real[i] = sample * window[i];
      }
      fftInPlace(real, imag);
      for (let bin = 0; bin <= half; bin += 1) {
        const re = real[bin], im = imag[bin];
        spectrumPower[bin] += re * re + im * im;
      }
    }
    frameRms.push(Math.sqrt(frameSumSquares / Math.max(1, frameSamples)));
    spectralFrames += 1;
  }
  if (!spectralFrames) throw new Error('The USB audio capture did not contain a complete analysis frame.');
  for (let bin = 0; bin < spectrumPower.length; bin += 1) spectrumPower[bin] /= spectralFrames;
  const binHz = rate / fftSize;
  let totalPower = 0, weightedFrequency = 0, rolloffBin = half, cumulative = 0;
  const bandDefinitions = [
    ['subBass',20,120],['low',120,400],['lowMid',400,1000],
    ['mid',1000,3000],['highMid',3000,6000],['high',6000,12000],
  ];
  const bandPower = Object.fromEntries(bandDefinitions.map(([name]) => [name,0]));
  for (let bin = 1; bin <= half; bin += 1) {
    const frequency = bin * binHz, power = spectrumPower[bin];
    totalPower += power; weightedFrequency += frequency * power;
    if (frequency >= 20 && frequency <= 12000) {
      for (const [name,low,high] of bandDefinitions) if (frequency >= low && frequency < high) bandPower[name] += power;
    }
  }
  const targetPower = totalPower * 0.85;
  for (let bin = 1; bin <= half; bin += 1) {
    cumulative += spectrumPower[bin];
    if (cumulative >= targetPower) { rolloffBin = bin; break; }
  }
  const bandTotal = Object.values(bandPower).reduce((sum,value)=>sum+value,0) || 1;
  const bandsPct = {};
  for (const [name] of bandDefinitions) bandsPct[name] = Math.round((bandPower[name] / bandTotal) * 1000) / 10;
  const levels = frameRms.filter(value=>value>0).map(dbfs).sort((a,b)=>a-b);
  const percentile = p => levels.length ? levels[Math.min(levels.length-1,Math.floor((levels.length-1)*p))] : -240;
  const spectralCentroidHz = totalPower > 0 ? weightedFrequency / totalPower : 0;
  return {
    sampleRate:rate,durationSeconds:Math.round((longest/rate)*100)/100,channels:channels.length,
    rmsDbfs:Math.round(dbfs(rms)*10)/10,peakDbfs:Math.round(dbfs(peak)*10)/10,
    crestFactorDb:Math.round((dbfs(peak)-dbfs(rms))*10)/10,
    spectralCentroidHz:Math.round(spectralCentroidHz),rolloff85Hz:Math.round(rolloffBin*binHz),
    bandsPct,frameRmsRangeDb:Math.round((percentile(0.95)-percentile(0.10))*10)/10,
    spectralFrames,
    analysisNote:'Objective measurements from MG-30 USB input channels 1–2. They describe this captured performance and are not a calibrated frequency-response measurement of the amp alone.'
  };
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
