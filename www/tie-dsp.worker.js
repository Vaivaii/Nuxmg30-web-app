import {
  createDspAccumulator,
  finalizeDspAccumulator,
  processDspChunk,
} from "./tie-dsp-engine.js";

let accumulator = null;

self.addEventListener("message", (event) => {
  const message = event.data || {};
  try {
    if (message.type === "start") {
      accumulator = createDspAccumulator(message.metadata, message.settings);
      self.postMessage({ type: "ready" });
      return;
    }
    if (message.type === "chunk") {
      if (!accumulator) throw new Error("The DSP worker has not been initialized.");
      const samples = message.samples instanceof Float32Array
        ? message.samples
        : new Float32Array(message.samples);
      const progress = processDspChunk(
        accumulator,
        samples,
        message.startFrame,
        message.coreFrameCount,
      );
      self.postMessage({ type: "ack", ...progress });
      return;
    }
    if (message.type === "finish") {
      if (!accumulator) throw new Error("The DSP worker has no active analysis.");
      const result = finalizeDspAccumulator(accumulator);
      accumulator = null;
      self.postMessage({ type: "result", result });
      return;
    }
    if (message.type === "cancel") {
      accumulator = null;
      self.postMessage({ type: "cancelled" });
    }
  } catch (error) {
    accumulator = null;
    self.postMessage({
      type: "error",
      code: String(error?.code || "PROCESSING_FAILED"),
      message: String(error?.message || "DSP processing failed."),
    });
  }
});
