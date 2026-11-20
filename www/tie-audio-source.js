const SUPPORTED_EXTENSIONS = new Set([".wav", ".wave", ".mp3", ".m4a", ".aac", ".ogg", ".opus", ".flac"]);
const MAX_AUDIO_FILE_BYTES = 128 * 1024 * 1024;
const MAX_DECODED_PCM_BYTES = 128 * 1024 * 1024;

function sourceError(code, message) {
  const error = new Error(message);
  error.name = "TieAudioSourceError";
  error.code = code;
  return error;
}

function getExtension(name) {
  const match = String(name || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function positiveNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function positiveIntegerOrNull(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

/**
 * Read container metadata before Web Audio decoding. decodeAudioData()
 * returns PCM at the AudioContext sample rate, which may differ from the
 * original WAV rate. Keep source metadata separate from decoded PCM metadata.
 */
export function readWavSourceMetadata(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < 12) return null;
  const view = new DataView(arrayBuffer);
  const readFourCc = (offset) => String.fromCharCode(
    view.getUint8(offset), view.getUint8(offset + 1),
    view.getUint8(offset + 2), view.getUint8(offset + 3),
  );
  if (readFourCc(0) !== "RIFF" || readFourCc(8) !== "WAVE") return null;

  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const chunkId = readFourCc(offset);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > view.byteLength) return null;

    if (chunkId === "fmt " && chunkSize >= 16) {
      const originalFormatCode = view.getUint16(chunkStart, true);
      let formatCode = originalFormatCode;
      if (originalFormatCode === 0xfffe && chunkSize >= 40) {
        formatCode = view.getUint16(chunkStart + 24, true);
      }
      const sourceChannelCount = view.getUint16(chunkStart + 2, true);
      const sourceSampleRateHz = view.getUint32(chunkStart + 4, true);
      const sourceBitDepth = view.getUint16(chunkStart + 14, true);
      if (!sourceChannelCount || !sourceSampleRateHz || !sourceBitDepth) return null;

      const encoding = formatCode === 1
        ? "PCM"
        : (formatCode === 3 ? "IEEE float" : "WAVE format 0x" + formatCode.toString(16));
      return {
        sourceSampleRateHz,
        sourceChannelCount,
        sourceBitDepth,
        sourceEncoding: encoding,
        sourceFormat: "WAV " + encoding + " " + sourceBitDepth + "-bit",
      };
    }

    offset = chunkEnd + (chunkSize % 2);
  }
  return null;
}

export function listQuickRecordSources(recorder) {
  if (typeof recorder?.listTakes !== "function" || typeof recorder?.pathToUrl !== "function") return [];
  let takes = [];
  try {
    takes = recorder.listTakes() || [];
  } catch (_) {
    return [];
  }
  return takes.filter((take) => take && typeof take.path === "string" && take.path)
    .map((take, index) => ({
      sourceId: "quick-record:" + take.path,
      sourceKind: "quick-record",
      label: String(take.fileName || ("Quick Record " + (index + 1))),
      take,
      sampleRateHz: Number(take.sampleRate) || null,
      channelCount: Number(take.channels) || null,
      bitDepth: Number(take.bitDepth) || null,
      capturedAt: take.createdAt || take.timestamp || null,
    }));
}

export function createPcmAudioFromDecodedBuffer(audioBuffer, sourceDetails = {}) {
  if (!audioBuffer || typeof audioBuffer.getChannelData !== "function") {
    throw sourceError("UNSUPPORTED_FORMAT", "The selected file could not be decoded as audio.");
  }
  const sampleRateHz = Number(audioBuffer.sampleRate);
  const channelCount = Number(audioBuffer.numberOfChannels);
  const frameCount = Number(audioBuffer.length);
  if (!Number.isFinite(sampleRateHz) || sampleRateHz < 8000 || sampleRateHz > 384000 ||
      !Number.isInteger(channelCount) || channelCount < 1 || channelCount > 8 ||
      !Number.isSafeInteger(frameCount) || frameCount < 1) {
    throw sourceError("INVALID_PCM", "The decoded audio metadata is incomplete or outside the supported range.");
  }
  const decodedBytes = frameCount * channelCount * Float32Array.BYTES_PER_ELEMENT;
  if (!Number.isSafeInteger(decodedBytes) || decodedBytes > MAX_DECODED_PCM_BYTES) {
    throw sourceError("UNSUPPORTED_FORMAT", "The decoded PCM would exceed the 128 MB analysis memory limit. Use a shorter recording or a lower-channel-count file.");
  }
  const channels = [];
  for (let channel = 0; channel < channelCount; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    if (!(data instanceof Float32Array) || data.length !== frameCount) {
      throw sourceError("INVALID_PCM", "The decoded audio channel data is not a valid Float32 PCM buffer.");
    }
    channels.push(data);
  }
  const sourceSampleRateHz = positiveNumberOrNull(sourceDetails.sourceSampleRateHz);
  const sourceChannelCount = positiveIntegerOrNull(sourceDetails.sourceChannelCount);
  const sourceBitDepth = positiveIntegerOrNull(sourceDetails.sourceBitDepth);
  return {
    metadata: {
      sourceId: String(sourceDetails.sourceId || "imported-audio"),
      sourceKind: String(sourceDetails.sourceKind || "imported-file"),
      label: String(sourceDetails.label || "Imported audio"),
      sourceFormat: String(sourceDetails.sourceFormat || "unknown"),
      sourceEncoding: String(sourceDetails.sourceEncoding || "unknown"),
      sourceSampleRateHz,
      sourceChannelCount,
      sourceBitDepth,
      sampleRateHz,
      analysisSampleRateHz: sampleRateHz,
      channelCount,
      analysisChannelCount: channelCount,
      channelCountChanged: sourceChannelCount === null ? null : sourceChannelCount !== channelCount,
      resamplingApplied: sourceSampleRateHz === null ? null : sourceSampleRateHz !== sampleRateHz,
      frameCount,
      durationSeconds: frameCount / sampleRateHz,
      sampleFormat: "Float32 PCM decoded by Web Audio",
      capturedAt: sourceDetails.capturedAt || undefined,
    },
    channels,
    audioBuffer,
  };
}

export async function decodeAudioBlob(blob, sourceDetails, decodeAudioData) {
  if (!blob || typeof blob.arrayBuffer !== "function" || blob.size === 0) {
    throw sourceError("SOURCE_UNAVAILABLE", "The selected audio file is empty or could not be read.");
  }
  if (typeof decodeAudioData !== "function") {
    throw sourceError("UNSUPPORTED_FORMAT", "Audio decoding is not available in this Android WebView.");
  }

  let encodedAudio;
  try {
    encodedAudio = await blob.arrayBuffer();
  } catch (_) {
    throw sourceError("SOURCE_UNAVAILABLE", "The selected audio file could not be read.");
  }

  const parsedWavMetadata = readWavSourceMetadata(encodedAudio);
  const effectiveDetails = {
    ...(sourceDetails || {}),
    ...(parsedWavMetadata || {}),
  };

  let audioBuffer;
  try {
    audioBuffer = await decodeAudioData(encodedAudio);
  } catch (_) {
    throw sourceError("UNSUPPORTED_FORMAT", "This audio codec could not be decoded by the current Android WebView. Try PCM WAV or MP3.");
  }
  return createPcmAudioFromDecodedBuffer(audioBuffer, {
    ...effectiveDetails,
    sourceFormat: effectiveDetails.sourceFormat || blob.type || "unknown",
  });
}

export async function loadImportedAudioFile(file, decodeAudioData) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw sourceError("SOURCE_UNAVAILABLE", "Choose an audio file first.");
  }
  if (file.size > MAX_AUDIO_FILE_BYTES) {
    throw sourceError("UNSUPPORTED_FORMAT", "This file is larger than the 128 MB import safety limit.");
  }
  const extension = getExtension(file.name);
  if (!(String(file.type || "").startsWith("audio/")) && !SUPPORTED_EXTENSIONS.has(extension)) {
    throw sourceError("UNSUPPORTED_FORMAT", "Choose a supported audio file such as WAV, MP3, M4A, OGG, or FLAC.");
  }
  return decodeAudioBlob(file, {
    sourceId: "imported-file:" + String(file.name || "audio"),
    sourceKind: "imported-file",
    label: String(file.name || "Imported audio"),
    sourceFormat: file.type || extension || "unknown",
  }, decodeAudioData);
}

export async function loadQuickRecordTake(take, recorder, fetchImpl, decodeAudioData) {
  if (!take || typeof take.path !== "string" || !take.path ||
      typeof recorder?.pathToUrl !== "function") {
    throw sourceError("SOURCE_UNAVAILABLE", "The selected Quick Record take is no longer available.");
  }
  if (typeof fetchImpl !== "function") {
    throw sourceError("SOURCE_UNAVAILABLE", "The saved recording file cannot be read in this runtime.");
  }
  let url;
  try {
    url = recorder.pathToUrl(take);
  } catch (_) {
    throw sourceError("SOURCE_UNAVAILABLE", "The app could not resolve the saved Quick Record file.");
  }
  let response;
  try {
    response = await fetchImpl(url);
  } catch (_) {
    throw sourceError("SOURCE_UNAVAILABLE", "The saved Quick Record WAV could not be opened.");
  }
  if (!response?.ok) {
    throw sourceError("SOURCE_UNAVAILABLE", "The saved Quick Record WAV could not be read (HTTP " + (response?.status || "error") + ").");
  }
  const blob = await response.blob();
  if (blob.size > MAX_AUDIO_FILE_BYTES) {
    throw sourceError("UNSUPPORTED_FORMAT", "The saved recording exceeds the 128 MB analysis import limit.");
  }
  return decodeAudioBlob(blob, {
    sourceId: "quick-record:" + take.path,
    sourceKind: "quick-record",
    label: String(take.fileName || "Quick Record"),
    capturedAt: take.createdAt || take.timestamp || undefined,
    sourceSampleRateHz: positiveNumberOrNull(take.sampleRate),
    sourceChannelCount: positiveIntegerOrNull(take.channels),
    sourceBitDepth: positiveIntegerOrNull(take.bitDepth),
    sourceFormat: "WAV PCM " + (Number(take.bitDepth) || "unknown") + "-bit",
  }, decodeAudioData);
}

export const TIE_AUDIO_SOURCE_CONSTANTS = Object.freeze({
  supportedExtensions: Object.freeze(Array.from(SUPPORTED_EXTENSIONS)),
  maxFileBytes: MAX_AUDIO_FILE_BYTES,
  maxDecodedPcmBytes: MAX_DECODED_PCM_BYTES,
});
