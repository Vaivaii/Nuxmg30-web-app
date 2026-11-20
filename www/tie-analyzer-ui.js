import {
  createPcmAudioFromDecodedBuffer,
  listQuickRecordSources,
  loadImportedAudioFile,
  loadQuickRecordTake,
} from "./tie-audio-source.js";

const $ = (id) => document.getElementById(id);
let importedFile = null;
let decodedSource = null;
let activeAnalysis = null;
let lastAnalysisResult = null;

function setAnalyzerView(view) {
  const allowed = ["spectrum", "spectrogram", "meter", "harmonics"];
  const selected = allowed.includes(view) ? view : "spectrum";
  document.querySelectorAll("[data-tie-analyzer-view]").forEach((button) => {
    const active = button.dataset.tieAnalyzerView === selected;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-tie-analyzer-panel]").forEach((panel) => {
    const active = panel.dataset.tieAnalyzerPanel === selected;
    panel.hidden = !active;
    panel.setAttribute("aria-hidden", String(!active));
  });
  try { localStorage.setItem("mg30-tie-analyzer-view", selected); } catch (_) {}
}

function setStatus(message, state = "") {
  const node = $("tieAnalysisStatus");
  if (!node) return;
  node.textContent = String(message || "");
  if (state) node.dataset.state = state;
  else delete node.dataset.state;
}
function getSelectedSourceId() { return $("tieAudioSourceSelect")?.value || ""; }
function setBusy(busy) {
  $("tieAnalyzeButton").disabled = busy || !getSelectedSourceId();
  $("tieCancelAnalysisButton").hidden = !busy;
  $("tieImportAudioButton").disabled = busy;
  $("tieAudioSourceSelect").disabled = busy;
  $("tieFftSize").disabled = busy;
  $("tieChannelSelect").disabled = busy || !decodedSource;
}
function addOption(select, value, label, disabled = false) {
  const option = document.createElement("option");
  option.value = value; option.textContent = label; option.disabled = disabled;
  select.appendChild(option);
}
function refreshSourceOptions() {
  const select = $("tieAudioSourceSelect");
  if (!select) return;
  const current = select.value;
  select.replaceChildren();
  addOption(select, "", "Select a saved Quick Record or import an audio file", true);
  if (importedFile) addOption(select, "imported-file", "Imported · " + importedFile.name);
  const sources = listQuickRecordSources(window.NUXStudioRecorder);
  for (const source of sources) {
    const rate = source.sampleRateHz ? " · " + source.sampleRateHz + " Hz" : "";
    const channels = source.channelCount ? " · " + source.channelCount + " ch" : "";
    addOption(select, source.sourceId, source.label + rate + channels);
  }
  const values = Array.from(select.options).map((option) => option.value);
  select.value = values.includes(current) ? current : (importedFile ? "imported-file" : "");
  $("tieAnalyzeButton").disabled = !getSelectedSourceId();
  setStatus(!sources.length && !importedFile
    ? "No saved Quick Record takes are listed. Import a WAV or other audio file to continue."
    : "Select a source, choose a channel and analyze. Source audio stays on this device.");
}
async function decodeArrayBuffer(arrayBuffer) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    const error = new Error("Web Audio decoding is not supported in this Android WebView.");
    error.code = "UNSUPPORTED_FORMAT"; throw error;
  }
  const context = new AudioContextClass();
  try { return await context.decodeAudioData(arrayBuffer); }
  finally { try { await context.close(); } catch (_) {} }
}
async function loadSelectedSource() {
  const sourceId = getSelectedSourceId();
  if (!sourceId) throw new Error("Choose an audio source first.");
  if (decodedSource?.metadata?.sourceId === sourceId) return decodedSource;
  setStatus("Reading and decoding the selected audio locally…");
  let pcm;
  if (sourceId === "imported-file") {
    pcm = await loadImportedAudioFile(importedFile, decodeArrayBuffer);
  } else {
    const source = listQuickRecordSources(window.NUXStudioRecorder).find((item) => item.sourceId === sourceId);
    if (!source) {
      const error = new Error("That Quick Record take is no longer listed. Refresh the source list and try again.");
      error.code = "SOURCE_UNAVAILABLE"; throw error;
    }
    pcm = await loadQuickRecordTake(
      source.take,
      window.NUXStudioRecorder,
      window.fetch.bind(window),
      decodeArrayBuffer,
    );
  }
  decodedSource = pcm;
  updateChannelOptions(pcm.metadata.channelCount);
  renderSourceMetadata(pcm.metadata);
  return pcm;
}
function updateChannelOptions(channelCount) {
  const select = $("tieChannelSelect");
  const previous = Number(select.value) || 0;
  select.replaceChildren();
  for (let channel = 0; channel < channelCount; channel += 1) {
    const side = channelCount === 1 ? "Mono" : (channel === 0 ? "Left" : (channel === 1 ? "Right" : "Channel " + (channel + 1)));
    addOption(select, String(channel), "Channel " + (channel + 1) + " · " + side);
  }
  select.value = String(Math.min(previous, channelCount - 1));
  select.disabled = Boolean(activeAnalysis);
}
function appendMetadataTag(holder, label, value) {
  const span = document.createElement("span");
  span.textContent = label + ": " + value; holder.appendChild(span);
}
function renderSourceMetadata(metadata) {
  const holder = $("tieSourceMetadata"); holder.replaceChildren();
  const sourceRate = Number(metadata.sourceSampleRateHz);
  const sourceChannels = Number(metadata.sourceChannelCount);
  appendMetadataTag(holder, "Source", metadata.label);
  appendMetadataTag(holder, "Type", metadata.sourceKind);
  appendMetadataTag(holder, "Format", metadata.sourceFormat);
  appendMetadataTag(holder, "Source rate", sourceRate > 0 ? sourceRate.toLocaleString() + " Hz" : "Not available");
  appendMetadataTag(holder, "Analysis rate", metadata.sampleRateHz.toLocaleString() + " Hz");
  appendMetadataTag(holder, "Source channels", Number.isInteger(sourceChannels) && sourceChannels > 0 ? String(sourceChannels) : "Not available");
  appendMetadataTag(holder, "Analysis channels", String(metadata.channelCount));
  appendMetadataTag(holder, "Resampling", metadata.resamplingApplied === null
    ? "Not established"
    : (metadata.resamplingApplied ? "Yes" : "No"));
  appendMetadataTag(holder, "Duration", metadata.durationSeconds.toFixed(2) + " s");
  holder.hidden = false; holder.classList.add("is-visible");
}
function formatDb(value) {
  return Number.isFinite(value) ? (value <= -239.99 ? "−∞" : value.toFixed(1)) : "n/a";
}
function drawSpectrum(spectrum) {
  const canvas = $("tieSpectrumCanvas"), context = canvas?.getContext("2d");
  if (!context) return;
  const width = canvas.width, height = canvas.height;
  const left = 48, right = 12, top = 12, bottom = 31;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#080e0a"; context.fillRect(0, 0, width, height);
  const yForDb = (value) => top + ((0 - Math.max(-100, Math.min(0, value))) / 100) * plotHeight;
  context.font = "10px system-ui"; context.strokeStyle = "#263629";
  context.fillStyle = "#8c9b85"; context.lineWidth = 1;
  for (const db of [0, -20, -40, -60, -80, -100]) {
    const y = yForDb(db);
    context.beginPath(); context.moveTo(left, y); context.lineTo(width - right, y); context.stroke();
    context.fillText(String(db), 5, y + 3);
  }
  const maxFrequency = Math.max(20, Math.min(20000, spectrum.nyquistHz));
  const logMax = Math.log(maxFrequency / 20);
  const xForFrequency = (frequency) => left + (Math.log(Math.max(20, frequency) / 20) / logMax) * plotWidth;
  for (const frequency of [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
    if (frequency > maxFrequency) continue;
    const x = xForFrequency(frequency);
    context.beginPath(); context.moveTo(x, top); context.lineTo(x, top + plotHeight); context.stroke();
    context.fillText(frequency >= 1000 ? (frequency / 1000) + "k" : String(frequency), x - 10, height - 9);
  }
  context.beginPath(); let started = false;
  for (let bin = 1; bin < spectrum.magnitudeDbfs.length; bin += 1) {
    const frequency = bin * spectrum.binWidthHz;
    if (frequency < 20 || frequency > maxFrequency) continue;
    const x = xForFrequency(frequency), y = yForDb(spectrum.magnitudeDbfs[bin]);
    if (!started) { context.moveTo(x, y); started = true; } else context.lineTo(x, y);
  }
  context.strokeStyle = "#c5f36b"; context.lineWidth = 1.7; context.stroke();
  context.fillStyle = "#91a183"; context.fillText("Frequency (Hz, logarithmic)", left + 4, height - 9);
}
function drawSpectrogram(spectrogram) {
  const canvas = $("tieSpectrogramCanvas"), context = canvas?.getContext("2d");
  if (!context) return;
  const width = canvas.width, height = canvas.height, rows = spectrogram.rows || [];
  context.fillStyle = "#080e0a"; context.fillRect(0, 0, width, height);
  if (!rows.length) {
    context.fillStyle = "#91a183"; context.font = "12px system-ui";
    context.fillText("No complete STFT frames available.", 15, 24); return;
  }
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const row = rows[Math.min(rows.length - 1, Math.floor((y / height) * rows.length))];
    const values = row.magnitudeDbfs;
    for (let x = 0; x < width; x += 1) {
      const bin = Math.min(values.length - 1, Math.floor((x / width) * values.length));
      const db = Math.max(-100, Math.min(0, Number(values[bin]) || -100));
      const level = (db + 100) / 100, index = (y * width + x) * 4;
      image.data[index] = Math.round(5 + 44 * level);
      image.data[index + 1] = Math.round(15 + 215 * level);
      image.data[index + 2] = Math.round(9 + 62 * level);
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}
function renderBandEnergy(bands) {
  const holder = $("tieBandEnergy"); holder.replaceChildren();
  const definitions = [["Sub-bass", "subBass"], ["Low", "low"], ["Low-mid", "lowMid"], ["Mid", "mid"], ["High-mid", "highMid"], ["High", "high"]];
  for (const [label, key] of definitions) {
    const value = Number(bands[key]) || 0;
    const row = document.createElement("div"); row.className = "tie-band-row";
    const name = document.createElement("label"); name.textContent = label;
    const track = document.createElement("div"); track.className = "tie-band-track";
    const fill = document.createElement("span"); fill.style.width = Math.max(0, Math.min(100, value)) + "%";
    track.appendChild(fill);
    const amount = document.createElement("strong"); amount.textContent = value.toFixed(1) + "%";
    row.append(name, track, amount); holder.appendChild(row);
  }
}
function renderAnalysisResult(result) {
  const metrics = result.metrics;
  $("tieMetricRms").textContent = formatDb(metrics.rmsDbfs);
  $("tieMetricPeak").textContent = formatDb(metrics.samplePeakDbfs);
  $("tieMetricCrest").textContent = metrics.crestFactorDb === null ? "n/a" : metrics.crestFactorDb.toFixed(1);
  $("tieMetricCentroid").textContent = Math.round(metrics.spectralCentroidHz).toLocaleString();
  $("tieMetricRolloff").textContent = Math.round(metrics.spectralRolloff85Hz).toLocaleString();
  $("tieMetricClipping").textContent = metrics.clipping.detected ? metrics.clipping.sampleCount.toLocaleString() : "None";
  $("tieSpectrumDetails").textContent = result.settings.fftSize + " FFT · Hann · " +
    result.spectrum.binWidthHz.toFixed(2) + " Hz/bin · channel " + (result.settings.channelIndex + 1);
  drawSpectrum(result.spectrum); drawSpectrogram(result.spectrogram); renderBandEnergy(metrics.bandEnergyPct);
  const meterWidth = (value) => {
    const numeric = Number(value);
    const dbfs = Number.isFinite(numeric) ? numeric : -240;
    return Math.max(0, Math.min(100, ((Math.max(-60, Math.min(0, dbfs)) + 60) / 60) * 100));
  };
  $("tieMeterRmsFill").style.width = meterWidth(metrics.rmsDbfs) + "%";
  $("tieMeterPeakFill").style.width = meterWidth(metrics.samplePeakDbfs) + "%";
  $("tieMeterRmsValue").textContent = formatDb(metrics.rmsDbfs) + " dBFS";
  $("tieMeterPeakValue").textContent = formatDb(metrics.samplePeakDbfs) + " dBFS";
  $("tieQuickDiagnosisTitle").textContent = metrics.clipping.detected
    ? "Sample clipping detected"
    : "No sample clipping detected";
  $("tieQuickDiagnosisDetails").textContent = metrics.clipping.detected
    ? metrics.clipping.sampleCount.toLocaleString() + " samples reached the documented clipping threshold. Noise floor: " + (metrics.noiseFloor.available ? "measured" : "not available from this selection") + "."
    : "Zero samples reached the documented clipping threshold. This does not establish overall tone quality; noise floor is " + (metrics.noiseFloor.available ? "measured" : "not available from this selection") + ".";
  const holder = $("tieAnalysisLimitations"); holder.replaceChildren();
  const intro = document.createElement("div");
  intro.textContent = "Measurement notes — " + result.spectralFrames + " STFT frames; " +
    result.analyzedDurationSeconds.toFixed(2) + " seconds analyzed.";
  holder.appendChild(intro);
  const list = document.createElement("ul");
  for (const note of result.limitations) {
    const item = document.createElement("li"); item.textContent = note; list.appendChild(item);
  }
  const noise = document.createElement("li");
  noise.textContent = "Noise floor: unavailable — " + metrics.noiseFloor.reason;
  list.appendChild(noise); holder.appendChild(list);
  $("tieAnalysisResults").hidden = false; $("tieAnalysisResults").classList.add("is-visible");
}
function waitForWorkerMessage(worker, expectedType, signal, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("Analysis cancelled.")); return; }
    const cleanup = () => {
      window.clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onMessage = (event) => {
      const message = event.data || {};
      if (message.type === "error") {
        cleanup();
        const error = new Error(message.message || "DSP worker failed.");
        error.code = message.code || "PROCESSING_FAILED"; reject(error);
      } else if (message.type === expectedType) { cleanup(); resolve(message); }
    };
    const onError = (event) => { cleanup(); reject(new Error(event.message || "The DSP worker stopped unexpectedly.")); };
    const onAbort = () => { cleanup(); reject(new Error("Analysis cancelled.")); };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("DSP processing timed out. Try a smaller FFT size or a shorter recording.")); }, timeoutMs);
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
async function runWorkerAnalysis(pcm, settings, signal) {
  if (typeof Worker !== "function") {
    const error = new Error("This Android WebView does not support the offline DSP worker required for safe analysis.");
    error.code = "PROCESSING_FAILED"; throw error;
  }
  const worker = new Worker(new URL("./tie-dsp.worker.js", import.meta.url), { type: "module" });
  try {
    worker.postMessage({ type: "start", metadata: pcm.metadata, settings });
    await waitForWorkerMessage(worker, "ready", signal);
    const source = pcm.channels[settings.channelIndex], hopSize = settings.hopSize, fftSize = settings.fftSize;
    const chunkFramesTarget = Math.max(hopSize, Math.floor((pcm.metadata.sampleRateHz * 2) / hopSize) * hopSize);
    let startFrame = 0;
    while (startFrame < pcm.metadata.frameCount) {
      if (signal.aborted) throw new Error("Analysis cancelled.");
      const coreFrameCount = Math.min(chunkFramesTarget, pcm.metadata.frameCount - startFrame);
      const overlapFrames = Math.min(fftSize - hopSize, pcm.metadata.frameCount - startFrame - coreFrameCount);
      const chunk = source.subarray(startFrame, startFrame + coreFrameCount + overlapFrames).slice();
      worker.postMessage({ type: "chunk", startFrame, coreFrameCount, samples: chunk }, [chunk.buffer]);
      const response = await waitForWorkerMessage(worker, "ack", signal);
      const percent = Math.round((response.processedFrames / response.totalFrames) * 100);
      $("tieAnalysisProgress").value = percent;
      setStatus("Analyzing locally… " + percent + "%");
      startFrame += coreFrameCount;
    }
    worker.postMessage({ type: "finish" });
    return (await waitForWorkerMessage(worker, "result", signal, 120000)).result;
  } finally { worker.terminate(); }
}
async function analyzeSelectedSource() {
  if (activeAnalysis || !getSelectedSourceId()) return;
  const controller = new AbortController(); activeAnalysis = controller;
  $("tieAnalysisProgress").hidden = false; $("tieAnalysisProgress").value = 0;
  $("tieAnalysisResults").hidden = true; $("tieAnalysisResults").classList.remove("is-visible"); setBusy(true);
  try {
    const pcm = await loadSelectedSource();
    const settings = {
      fftSize: Number($("tieFftSize").value) || 2048,
      hopSize: (Number($("tieFftSize").value) || 2048) / 2,
      window: "hann",
      channelIndex: Number($("tieChannelSelect").value) || 0,
    };
    setStatus("Starting local DSP worker…");
    const result = await runWorkerAnalysis(pcm, settings, controller.signal);
    lastAnalysisResult = result;
    window.dispatchEvent(new CustomEvent("mg30-tie-analysis-updated"));
    renderAnalysisResult(result);
    $("tieAnalysisProgress").value = 100;
    setStatus("Analysis complete. Measurements were calculated locally from the selected PCM source.", "success");
  } catch (error) {
    if (error?.message === "Analysis cancelled.") setStatus("Analysis cancelled. The original recording was not changed.");
    else setStatus(error?.message || "Audio analysis failed.", "error");
  } finally {
    activeAnalysis = null; $("tieAnalysisProgress").hidden = true; setBusy(false);
  }
}
$("tieImportAudioButton")?.addEventListener("click", () => $("tieAudioFileInput")?.click());
$("tieAudioFileInput")?.addEventListener("change", (event) => {
  const file = event.target.files?.[0] || null; if (!file) return;
  importedFile = file; decodedSource = null; $("tieAnalysisResults").hidden = true;
  refreshSourceOptions(); $("tieAudioSourceSelect").value = "imported-file";
  setStatus("Selected " + file.name + " · " + (file.size / 1048576).toFixed(2) + " MB. It will be decoded on this device.");
});
$("tieAudioSourceSelect")?.addEventListener("change", () => {
  decodedSource = null; $("tieAnalysisResults").hidden = true;
  $("tieChannelSelect").disabled = true; $("tieSourceMetadata").hidden = true; $("tieSourceMetadata").classList.remove("is-visible");
  $("tieAnalyzeButton").disabled = !getSelectedSourceId();
});
$("tieChannelSelect")?.addEventListener("change", () => { $("tieAnalysisResults").hidden = true; });
$("tieFftSize")?.addEventListener("change", () => { $("tieAnalysisResults").hidden = true; });
$("tieAnalyzeButton")?.addEventListener("click", () => { void analyzeSelectedSource(); });
$("tieCancelAnalysisButton")?.addEventListener("click", () => activeAnalysis?.abort());
document.querySelectorAll("[data-tie-analyzer-view]").forEach((button) => {
  button.addEventListener("click", () => setAnalyzerView(button.dataset.tieAnalyzerView));
});
window.addEventListener("mg30-studio-takes-updated", refreshSourceOptions);
window.addEventListener("nux-studio-recorder-ready", refreshSourceOptions);
document.addEventListener("visibilitychange", () => { if (document.hidden && activeAnalysis) activeAnalysis.abort(); });
refreshSourceOptions();
setAnalyzerView((() => { try { return localStorage.getItem("mg30-tie-analyzer-view") || "spectrum"; } catch (_) { return "spectrum"; } })());
setBusy(false);

window.MG30TIEAnalyzerBridge = Object.freeze({ getResult: () => lastAnalysisResult });
