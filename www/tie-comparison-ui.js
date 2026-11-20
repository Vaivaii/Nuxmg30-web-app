import {
  listQuickRecordSources,
  loadImportedAudioFile,
  loadQuickRecordTake,
} from "./tie-audio-source.js";
import {
  buildComparisonReport,
  createAlignedComparisonPlan,
} from "./tie-comparison-engine.js";

const $ = (id) => document.getElementById(id);
const slots = {
  a: { name: "A", select: "tieCompareSourceA", fileInput: "tieCompareFileA", importButton: "tieCompareImportA", channel: "tieCompareChannelA", file: null, decoded: null, decodedId: "" },
  b: { name: "B", select: "tieCompareSourceB", fileInput: "tieCompareFileB", importButton: "tieCompareImportB", channel: "tieCompareChannelB", file: null, decoded: null, decodedId: "" },
};
let activeCompareController = null;
let latestPlan = null;
let latestReport = null;
let previewContext = null;
let activePreview = null;

function setStatus(message, state = "") {
  const node = $("tieCompareStatus");
  if (!node) return;
  node.textContent = String(message || "");
  if (state) node.dataset.state = state;
  else delete node.dataset.state;
}

function setBusy(busy) {
  for (const slot of Object.values(slots)) {
    $(slot.select).disabled = busy;
    $(slot.importButton).disabled = busy;
    $(slot.fileInput).disabled = busy;
    $(slot.channel).disabled = busy || !slot.decoded;
  }
  $("tieCompareFftSize").disabled = busy;
  $("tieCompareOffsetMs").disabled = busy;
  $("tieCompareLevelMatch").disabled = busy;
  $("tieCompareRunButton").disabled = busy || !slots.a.select || !slots.b.select ||
    !$("tieCompareSourceA").value || !$("tieCompareSourceB").value;
  $("tieCompareCancelButton").hidden = !busy;
}

function addOption(select, value, label, disabled = false) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.disabled = disabled;
  select.appendChild(option);
}

function refreshSlotOptions(slot) {
  const select = $(slot.select);
  const current = select.value;
  select.replaceChildren();
  addOption(select, "", "Choose an imported file or saved Quick Record", true);
  if (slot.file) addOption(select, "imported-file", "Imported · " + slot.file.name);
  for (const source of listQuickRecordSources(window.NUXStudioRecorder)) {
    const optionLabel = source.label +
      (source.sampleRateHz ? " · " + source.sampleRateHz.toLocaleString() + " Hz" : "") +
      (source.channelCount ? " · " + source.channelCount + " ch" : "");
    addOption(select, source.sourceId, optionLabel);
  }
  const available = Array.from(select.options).some((option) => option.value === current);
  select.value = available ? current : (slot.file ? "imported-file" : "");
}

function refreshSources() {
  for (const slot of Object.values(slots)) refreshSlotOptions(slot);
  updateRunButton();
}

function updateRunButton() {
  const ready = Boolean($("tieCompareSourceA")?.value && $("tieCompareSourceB")?.value);
  $("tieCompareRunButton").disabled = Boolean(activeCompareController) || !ready;
}

function updateChannelOptions(slot, count) {
  const select = $(slot.channel);
  const previous = Number(select.value) || 0;
  select.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const label = count === 1 ? "Mono" : (index === 0 ? "Left" : (index === 1 ? "Right" : "Channel " + (index + 1)));
    addOption(select, String(index), "Channel " + (index + 1) + " · " + label);
  }
  select.value = String(Math.min(previous, count - 1));
  select.disabled = Boolean(activeCompareController);
}

async function decodeArrayBuffer(arrayBuffer) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    const error = new Error("Web Audio decoding is not supported in this Android WebView.");
    error.code = "UNSUPPORTED_FORMAT";
    throw error;
  }
  const context = new AudioContextClass();
  try {
    return await context.decodeAudioData(arrayBuffer);
  } finally {
    try { await context.close(); } catch (_) {}
  }
}

async function loadSlot(slot) {
  const sourceId = $(slot.select).value;
  if (!sourceId) throw new Error("Choose a source for slot " + slot.name + ".");
  if (slot.decoded && slot.decodedId === sourceId) return slot.decoded;
  setStatus("Loading source " + slot.name + " locally…");
  let pcm;
  if (sourceId === "imported-file") {
    if (!slot.file) throw new Error("Choose an audio file for slot " + slot.name + ".");
    pcm = await loadImportedAudioFile(slot.file, decodeArrayBuffer);
  } else {
    const source = listQuickRecordSources(window.NUXStudioRecorder).find((item) => item.sourceId === sourceId);
    if (!source) {
      const error = new Error("The saved Quick Record selected for slot " + slot.name + " is no longer available. Refresh the source list.");
      error.code = "SOURCE_UNAVAILABLE";
      throw error;
    }
    pcm = await loadQuickRecordTake(
      source.take,
      window.NUXStudioRecorder,
      window.fetch.bind(window),
      decodeArrayBuffer,
    );
  }
  slot.decoded = pcm;
  slot.decodedId = sourceId;
  updateChannelOptions(slot, pcm.metadata.channelCount);
  return pcm;
}

function clearComparison() {
  void stopPreview();
  latestPlan = null;
  latestReport = null;
  $("tieCompareResults").hidden = true;
  $("tieCompareResults").classList.remove("is-visible");
  for (const id of ["tieComparePlayA", "tieComparePlayB", "tieCompareStop"]) $(id).disabled = true;
}

function waitForWorkerMessage(worker, expectedType, signal, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("Comparison cancelled.")); return; }
    let timer;
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
        error.code = message.code || "PROCESSING_FAILED";
        reject(error);
      } else if (message.type === expectedType) {
        cleanup();
        resolve(message);
      }
    };
    const onError = (event) => {
      cleanup();
      reject(new Error(event.message || "The comparison DSP worker stopped unexpectedly."));
    };
    const onAbort = () => {
      cleanup();
      reject(new Error("Comparison cancelled."));
    };
    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Comparison DSP timed out. Try a shorter recording or smaller FFT size."));
    }, timeoutMs);
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function analyzeAlignedWindow(slot, planPart, frameCount, fftSize, signal, progressOffset) {
  const pcm = slot.decoded;
  const sampleRateHz = pcm.metadata.sampleRateHz;
  const hopSize = fftSize / 2;
  const channel = pcm.channels[planPart.channelIndex];
  const metadata = {
    ...pcm.metadata,
    sourceId: pcm.metadata.sourceId + ":compare:" + slot.name,
    channelCount: 1,
    frameCount,
    durationSeconds: frameCount / sampleRateHz,
  };
  const worker = new Worker(new URL("./tie-dsp.worker.js", import.meta.url), { type: "module" });
  try {
    worker.postMessage({
      type: "start",
      metadata,
      settings: { fftSize, hopSize, window: "hann", channelIndex: 0 },
    });
    await waitForWorkerMessage(worker, "ready", signal);
    const chunkFramesTarget = Math.max(hopSize, Math.floor((sampleRateHz * 2) / hopSize) * hopSize);
    let startFrame = 0;
    while (startFrame < frameCount) {
      if (signal.aborted) throw new Error("Comparison cancelled.");
      const coreFrameCount = Math.min(chunkFramesTarget, frameCount - startFrame);
      const overlapFrames = Math.min(fftSize - hopSize, frameCount - startFrame - coreFrameCount);
      const chunk = channel.subarray(
        planPart.startFrame + startFrame,
        planPart.startFrame + startFrame + coreFrameCount + overlapFrames,
      ).slice();
      if (planPart.gain !== 1) {
        for (let index = 0; index < chunk.length; index += 1) chunk[index] *= planPart.gain;
      }
      worker.postMessage({ type: "chunk", startFrame, coreFrameCount, samples: chunk }, [chunk.buffer]);
      const response = await waitForWorkerMessage(worker, "ack", signal);
      const percent = Math.round((response.processedFrames / response.totalFrames) * 100);
      $("tieCompareProgress").value = Math.min(100, Math.round(progressOffset === 0 ? percent / 2 : 50 + percent / 2));
      startFrame += coreFrameCount;
    }
    worker.postMessage({ type: "finish" });
    return (await waitForWorkerMessage(worker, "result", signal)).result;
  } finally {
    worker.terminate();
  }
}

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function formatDelta(value, digits = 2) {
  if (!Number.isFinite(value)) return "n/a";
  return (value > 0 ? "+" : "") + value.toFixed(digits);
}

function drawSpectrumOverlay(spectrum) {
  const canvas = $("tieCompareOverlayCanvas");
  const context = canvas?.getContext("2d");
  if (!context) return;
  const width = canvas.width, height = canvas.height;
  const left = 48, right = 12, top = 12, bottom = 28;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  context.fillStyle = "#080e0a";
  context.fillRect(0, 0, width, height);
  const xForFrequency = (frequency) => left +
    (Math.log(Math.max(20, frequency) / 20) / Math.log(Math.max(20, spectrum.nyquistHz) / 20)) * plotWidth;
  const yForDb = (value) => top + ((0 - Math.max(-100, Math.min(0, value))) / 100) * plotHeight;
  context.font = "10px system-ui";
  context.fillStyle = "#8c9b85";
  context.strokeStyle = "#263629";
  for (const db of [0, -20, -40, -60, -80, -100]) {
    const y = yForDb(db);
    context.beginPath(); context.moveTo(left, y); context.lineTo(width - right, y); context.stroke();
    context.fillText(String(db), 5, y + 3);
  }
  for (const frequency of [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
    if (frequency > spectrum.nyquistHz) continue;
    const x = xForFrequency(frequency);
    context.beginPath(); context.moveTo(x, top); context.lineTo(x, top + plotHeight); context.stroke();
    context.fillText(frequency >= 1000 ? (frequency / 1000) + "k" : String(frequency), x - 9, height - 8);
  }
  const drawLine = (values, color) => {
    context.beginPath();
    let started = false;
    for (let bin = 1; bin < values.length; bin += 1) {
      const frequency = bin * spectrum.binWidthHz;
      if (frequency < 20 || frequency > spectrum.nyquistHz) continue;
      const x = xForFrequency(frequency), y = yForDb(values[bin]);
      if (!started) { context.moveTo(x, y); started = true; } else context.lineTo(x, y);
    }
    context.strokeStyle = color; context.lineWidth = 1.6; context.stroke();
  };
  drawLine(spectrum.aDbfs, "#c5f36b");
  drawLine(spectrum.bDbfs, "#67d8ef");
}

function drawSpectrumDifference(spectrum) {
  const canvas = $("tieCompareDiffCanvas");
  const context = canvas?.getContext("2d");
  if (!context) return;
  const width = canvas.width, height = canvas.height;
  const left = 48, right = 12, top = 12, bottom = 28;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  context.fillStyle = "#080e0a"; context.fillRect(0, 0, width, height);
  const xForBin = (bin) => left + (bin / Math.max(1, spectrum.differenceDb.length - 1)) * plotWidth;
  const yForDb = (value) => top + ((24 - Math.max(-24, Math.min(24, value))) / 48) * plotHeight;
  context.font = "10px system-ui"; context.fillStyle = "#8c9b85"; context.strokeStyle = "#263629";
  for (const db of [-24, -12, 0, 12, 24]) {
    const y = yForDb(db);
    context.beginPath(); context.moveTo(left, y); context.lineTo(width - right, y); context.stroke();
    context.fillText((db > 0 ? "+" : "") + db, 5, y + 3);
  }
  context.beginPath();
  spectrum.differenceDb.forEach((value, bin) => {
    const x = xForBin(bin), y = yForDb(value);
    if (bin === 0) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.strokeStyle = "#d9a8ff"; context.lineWidth = 1.6; context.stroke();
}

function drawDynamicEnvelope(dynamic) {
  const canvas = $("tieCompareDynamicCanvas");
  const context = canvas?.getContext("2d");
  if (!context) return;
  const width = canvas.width, height = canvas.height;
  const left = 48, right = 12, top = 12, bottom = 27;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  context.fillStyle = "#080e0a"; context.fillRect(0, 0, width, height);
  const yForDb = (value) => top + ((0 - Math.max(-100, Math.min(0, value))) / 100) * plotHeight;
  context.font = "10px system-ui"; context.fillStyle = "#8c9b85"; context.strokeStyle = "#263629";
  for (const db of [0, -20, -40, -60, -80, -100]) {
    const y = yForDb(db);
    context.beginPath(); context.moveTo(left, y); context.lineTo(width - right, y); context.stroke();
    context.fillText(String(db), 5, y + 3);
  }
  const drawLine = (key, color) => {
    context.beginPath();
    dynamic.points.forEach((point, index) => {
      const x = left + (index / Math.max(1, dynamic.points.length - 1)) * plotWidth;
      const y = yForDb(point[key]);
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.strokeStyle = color; context.lineWidth = 1.6; context.stroke();
  };
  drawLine("aRmsDbfs", "#c5f36b");
  drawLine("bRmsDbfs", "#67d8ef");
}

function renderMetrics(report) {
  const ids = {
    rmsDbfs: ["tieCompareRmsA", "tieCompareRmsB", "tieCompareRmsDelta"],
    samplePeakDbfs: ["tieComparePeakA", "tieComparePeakB", "tieComparePeakDelta"],
    crestFactorDb: ["tieCompareCrestA", "tieCompareCrestB", "tieCompareCrestDelta"],
    spectralCentroidHz: ["tieCompareCentroidA", "tieCompareCentroidB", "tieCompareCentroidDelta"],
    spectralRolloff85Hz: ["tieCompareRolloffA", "tieCompareRolloffB", "tieCompareRolloffDelta"],
  };
  for (const [key, nodeIds] of Object.entries(ids)) {
    const metric = report.metrics[key];
    const digits = key.endsWith("Hz") ? 1 : 2;
    $(nodeIds[0]).textContent = formatNumber(metric.a, digits);
    $(nodeIds[1]).textContent = formatNumber(metric.b, digits);
    $(nodeIds[2]).textContent = formatDelta(metric.deltaBMinusA, digits);
  }
  $("tieCompareSummary").textContent =
    report.sources.a.label + " vs " + report.sources.b.label +
    " · " + report.alignment.matchedDurationSeconds.toFixed(2) + " s matched · " +
    report.settings.fftSize + " FFT / Hann";
  const sourceSummary = (source) => source.label + " · " + source.sourceKind +
    " · " + source.sourceFormat +
    " · source " + (source.sourceSampleRateHz || "n/a") + " Hz / " +
    (source.sourceChannelCount || "n/a") + " ch" +
    " → analysis " + source.sampleRateHz + " Hz / " + source.channelCount +
    " ch · selected channel " + (source.selectedChannel + 1);
  $("tieCompareProvenance").textContent =
    "A: " + sourceSummary(report.sources.a) + "\n" +
    "B: " + sourceSummary(report.sources.b);
  report.listeningNotes = $("tieCompareListeningNotes").value.trim();
  report.aiInterpretation = null;
  $("tieCompareReportMeta").textContent =
    "Measured " + new Date(report.measuredAt).toLocaleString() +
    " · Alignment: " + report.alignment.method +
    " (" + formatDelta(report.alignment.offsetMs, 1) + " ms) · " +
    report.levelMatch.note +
    " Gain A " + formatDelta(report.levelMatch.gainADb, 2) + " dB / B " +
    formatDelta(report.levelMatch.gainBDb, 2) + " dB.";
  const limitations = $("tieCompareLimitations");
  limitations.replaceChildren();
  const list = document.createElement("ul");
  for (const note of report.limitations) {
    const item = document.createElement("li");
    item.textContent = note;
    list.appendChild(item);
  }
  limitations.appendChild(list);
  drawSpectrumOverlay(report.spectrum);
  drawSpectrumDifference(report.spectrum);
  drawDynamicEnvelope(report.dynamic);
  $("tieCompareResults").hidden = false;
  $("tieCompareResults").classList.add("is-visible");
}

async function runComparison() {
  if (activeCompareController) return;
  const controller = new AbortController();
  activeCompareController = controller;
  clearComparison();
  $("tieCompareProgress").hidden = false;
  $("tieCompareProgress").value = 0;
  setBusy(true);
  try {
    const pcmA = await loadSlot(slots.a);
    const pcmB = await loadSlot(slots.b);
    const fftSize = Number($("tieCompareFftSize").value) || 2048;
    const plan = createAlignedComparisonPlan(pcmA, pcmB, {
      channelA: Number($("tieCompareChannelA").value) || 0,
      channelB: Number($("tieCompareChannelB").value) || 0,
      offsetMs: Number($("tieCompareOffsetMs").value) || 0,
      levelMatch: $("tieCompareLevelMatch").checked ? "rms" : "off",
    });
    if (plan.frameCount < fftSize) {
      throw new Error("The matched region is shorter than one FFT frame. Reduce the alignment offset or choose a smaller FFT size.");
    }
    latestPlan = plan;
    setStatus("Comparing A locally… original recordings remain unchanged.");
    const resultA = await analyzeAlignedWindow(slots.a, plan.a, plan.frameCount, fftSize, controller.signal, 0);
    setStatus("Comparing B locally…");
    $("tieCompareProgress").value = 50;
    const resultB = await analyzeAlignedWindow(slots.b, plan.b, plan.frameCount, fftSize, controller.signal, 50);
    latestReport = buildComparisonReport(plan, resultA, resultB);
    renderMetrics(latestReport);
    $("tieCompareProgress").value = 100;
    $("tieComparePlayA").disabled = false;
    $("tieComparePlayB").disabled = false;
    $("tieCompareStop").disabled = false;
    setStatus("Comparison complete. Both sources were measured locally over the matched region.", "success");
  } catch (error) {
    latestPlan = null;
    latestReport = null;
    if (error?.message === "Comparison cancelled.") setStatus("Comparison cancelled. Original source files were not changed.");
    else setStatus(error?.message || "Audio comparison failed.", "error");
  } finally {
    activeCompareController = null;
    $("tieCompareProgress").hidden = true;
    setBusy(false);
  }
}

async function stopPreview() {
  if (!activePreview) return;
  const preview = activePreview;
  activePreview = null;
  try { preview.source.stop(); } catch (_) {}
  try { preview.source.disconnect(); } catch (_) {}
  try { preview.gain.disconnect(); } catch (_) {}
}

async function playPreview(key) {
  if (!latestPlan || !slots[key].decoded?.audioBuffer) return;
  try {
    await stopPreview();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio playback is not supported in this Android WebView.");
    if (!previewContext || previewContext.state === "closed") previewContext = new AudioContextClass();
    if (previewContext.state === "suspended") await previewContext.resume();
    const source = previewContext.createBufferSource();
    const gain = previewContext.createGain();
    source.buffer = slots[key].decoded.audioBuffer;
    gain.gain.value = latestPlan[key].gain;
    source.connect(gain);
    gain.connect(previewContext.destination);
    activePreview = { source, gain };
    source.onended = () => {
      if (activePreview?.source === source) {
        activePreview = null;
        try { source.disconnect(); } catch (_) {}
        try { gain.disconnect(); } catch (_) {}
      }
    };
    const startFrame = latestPlan[key].startFrame;
    const startSeconds = startFrame / latestPlan.sampleRateHz;
    source.start(0, startSeconds, latestPlan.durationSeconds);
  } catch (error) {
    setStatus(error?.message || "A/B preview could not start.", "error");
  }
}

function clearSlot(slot) {
  void stopPreview();
  slot.decoded = null;
  slot.decodedId = "";
  $(slot.channel).replaceChildren();
  addOption($(slot.channel), "0", "Load a source first");
  $(slot.channel).disabled = true;
  clearComparison();
}

for (const slot of Object.values(slots)) {
  $(slot.importButton).addEventListener("click", () => $(slot.fileInput).click());
  $(slot.fileInput).addEventListener("change", (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    slot.file = file;
    clearSlot(slot);
    refreshSlotOptions(slot);
    $(slot.select).value = "imported-file";
    setStatus("Selected " + file.name + " for slot " + slot.name + ". It will be decoded on this device.");
    updateRunButton();
  });
  $(slot.select).addEventListener("change", () => {
    clearSlot(slot);
    updateRunButton();
  });
  $(slot.channel).addEventListener("change", clearComparison);
}

$("tieCompareRunButton").addEventListener("click", () => { void runComparison(); });
$("tieCompareCancelButton").addEventListener("click", () => activeCompareController?.abort());
$("tieComparePlayA").addEventListener("click", () => { void playPreview("a"); });
$("tieComparePlayB").addEventListener("click", () => { void playPreview("b"); });
$("tieCompareStop").addEventListener("click", () => { void stopPreview(); });
$("tieCompareOffsetMs").addEventListener("change", clearComparison);
$("tieCompareFftSize").addEventListener("change", clearComparison);
$("tieCompareLevelMatch").addEventListener("change", clearComparison);
$("tieCompareListeningNotes").addEventListener("input", () => {
  if (latestReport) latestReport.listeningNotes = $("tieCompareListeningNotes").value.trim();
});
window.addEventListener("mg30-studio-takes-updated", refreshSources);
window.addEventListener("nux-studio-recorder-ready", refreshSources);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    activeCompareController?.abort();
    void stopPreview();
    if (previewContext && previewContext.state !== "closed") {
      void previewContext.close().catch(() => {});
      previewContext = null;
    }
  }
});
document.addEventListener("click", (event) => {
  const tab = event.target.closest?.("button[data-tie-page]");
  if (tab && tab.dataset.tiePage !== "compare") void stopPreview();
});
window.addEventListener("pagehide", () => {
  activeCompareController?.abort();
  void stopPreview();
  if (previewContext && previewContext.state !== "closed") void previewContext.close().catch(() => {});
});
refreshSources();
setBusy(false);
