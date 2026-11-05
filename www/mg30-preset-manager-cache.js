const TOTAL_SLOTS = 128;
const SCENE_REPLY_BYTES = 220;

function assertProgram(value) {
  const program = Number(value);
  if (!Number.isInteger(program) || program < 0 || program >= TOTAL_SLOTS) {
    throw new RangeError("Indeks preset cache harus 0–127.");
  }
  return program;
}

function cloneReadback(source) {
  return {
    recordOrdinal: source.recordOrdinal,
    sceneReplies: source.sceneReplies.map(reply => new Uint8Array(reply)),
    resourceMarker: source.resourceMarker,
    resourceName: source.resourceName || "",
    samples: source.samples instanceof Float32Array ? new Float32Array(source.samples) : null,
    curve: source.curve instanceof Uint16Array ? new Uint16Array(source.curve) : null,
    resourceIndex: source.resourceIndex
  };
}

function validateReadback(program, source) {
  if (!source || typeof source !== "object") throw new TypeError("Hasil readback preset tidak tersedia.");
  if (Number(source.recordOrdinal) !== program) throw new Error("Ordinal record cache tidak cocok dengan slot " + program + ".");
  if (!Array.isArray(source.sceneReplies) || source.sceneReplies.length !== 3) {
    throw new Error("Cache memerlukan tepat tiga balasan scene.");
  }
  source.sceneReplies.forEach((reply, sceneIndex) => {
    if (!(reply instanceof Uint8Array) || reply.length !== SCENE_REPLY_BYTES ||
        reply[0] !== 0x43 || reply[1] !== 0x58 || reply[2] !== 0x70 ||
        reply[3] !== 0x0C || reply[4] !== 0x02 ||
        reply[5] !== program || reply[6] !== sceneIndex) {
      throw new Error("Balasan Scene " + (sceneIndex + 1) + " tidak cocok untuk slot " + program + ".");
    }
  });

  const marker = Number(source.resourceMarker);
  if (marker !== 0 && marker !== 1) throw new Error("Penanda resource cache harus 0 atau 1.");
  if (marker === 0) {
    if (String(source.resourceName || "").length || source.samples != null || source.curve != null) {
      throw new Error("Preset tanpa resource tidak boleh menyimpan nama IR, waveform, atau curve.");
    }
    return;
  }
  if (typeof source.resourceName !== "string" || !source.resourceName.trim()) {
    throw new Error("Preset dengan resource harus memiliki nama IR.");
  }
  if (!(source.samples instanceof Float32Array) || source.samples.length !== 2048) {
    throw new Error("Cache resource memerlukan tepat 2.048 sampel Float32.");
  }
  if (!(source.curve instanceof Uint16Array) || source.curve.length !== 600) {
    throw new Error("Cache resource memerlukan tepat 600 nilai curve UInt16.");
  }
  for (let i = 0; i < source.samples.length; i++) {
    if (!Number.isFinite(source.samples[i])) throw new Error("Waveform cache non-finite pada indeks " + i + ".");
  }
  for (let i = 0; i < source.curve.length; i++) {
    if (source.curve[i] > 305) throw new Error("Curve cache di luar rentang pada indeks " + i + ".");
  }
}

export class MG30PresetManagerCache {
  #entries = new Map();
  #active = false;
  #sessionKey = null;
  #generation = 0;
  #now;

  constructor(options = {}) {
    this.totalSlots = TOTAL_SLOTS;
    this.#now = typeof options.now === "function" ? options.now : () => Date.now();
  }

  beginSession(sessionKey = "mg30-usb-session") {
    const key = String(sessionKey || "mg30-usb-session");
    if (this.#active && this.#sessionKey === key) return false;
    this.#entries.clear();
    this.#active = true;
    this.#sessionKey = key;
    this.#generation += 1;
    this.#emit();
    return true;
  }

  endSession(reason = "USB-MIDI terputus") {
    if (!this.#active && this.#entries.size === 0) return false;
    this.#entries.clear();
    this.#active = false;
    this.#sessionKey = null;
    this.#generation += 1;
    this.lastEndReason = String(reason);
    this.#emit();
    return true;
  }

  isSessionActive() { return this.#active; }
  getSessionGeneration() { return this.#generation; }

  store(programValue, readback, metadata = {}) {
    if (!this.#active) throw new Error("Cache preset hanya boleh diisi selama sesi USB-MIDI aktif.");
    const program = assertProgram(programValue);
    validateReadback(program, readback);
    const storedAt = this.#now();
    this.#entries.set(program, {
      program,
      status: "fresh",
      storedAt,
      source: String(metadata.source || "live-readback"),
      invalidationReason: null,
      readback: cloneReadback(readback)
    });
    this.#emit();
    return { program, status: "fresh", storedAt };
  }

  get(programValue) {
    if (!this.#active) return null;
    const program = Number(programValue);
    if (!Number.isInteger(program) || program < 0 || program >= this.totalSlots) return null;
    const entry = this.#entries.get(program);
    return entry?.status === "fresh" ? cloneReadback(entry.readback) : null;
  }

  hasFresh(program) { return this.get(program) !== null; }

  getSlotState(programValue) {
    const program = Number(programValue);
    if (!Number.isInteger(program) || program < 0 || program >= this.totalSlots) {
      return { program: null, status: "invalid" };
    }
    const entry = this.#entries.get(program);
    if (!entry) return { program, status: "missing" };
    return {
      program,
      status: entry.status,
      storedAt: entry.storedAt,
      source: entry.source,
      invalidationReason: entry.invalidationReason
    };
  }

  invalidate(programValue, reason = "Preset berubah setelah readback") {
    const program = Number(programValue);
    if (!Number.isInteger(program) || program < 0 || program >= this.totalSlots) return false;
    const entry = this.#entries.get(program);
    if (!entry) return false;
    entry.status = "stale";
    entry.invalidationReason = String(reason);
    entry.invalidatedAt = this.#now();
    this.#emit();
    return true;
  }

  invalidateAll(reason = "Bank preset berubah setelah readback") {
    let changed = 0;
    const invalidatedAt = this.#now();
    for (const entry of this.#entries.values()) {
      if (entry.status !== "stale") {
        entry.status = "stale";
        entry.invalidationReason = String(reason);
        entry.invalidatedAt = invalidatedAt;
        changed += 1;
      }
    }
    if (changed) this.#emit();
    return changed;
  }

  getFreshPrograms() {
    return [...this.#entries.values()]
      .filter(entry => entry.status === "fresh")
      .map(entry => entry.program)
      .sort((a, b) => a - b);
  }

  getMissingPrograms() {
    const fresh = new Set(this.getFreshPrograms());
    return Array.from({ length: this.totalSlots }, (_, program) => program)
      .filter(program => !fresh.has(program));
  }

  getAll() {
    if (!this.#active || this.getFreshPrograms().length !== this.totalSlots) return null;
    return Array.from({ length: this.totalSlots }, (_, program) => this.get(program));
  }

  getStatus() {
    let freshCount = 0, staleCount = 0;
    for (const entry of this.#entries.values()) {
      if (entry.status === "fresh") freshCount += 1;
      else if (entry.status === "stale") staleCount += 1;
    }
    const freshTimes = [...this.#entries.values()]
      .filter(entry => entry.status === "fresh").map(entry => entry.storedAt);
    return {
      active: this.#active,
      sessionKey: this.#sessionKey,
      generation: this.#generation,
      totalSlots: this.totalSlots,
      freshCount,
      staleCount,
      missingCount: this.totalSlots - freshCount - staleCount,
      complete: this.#active && freshCount === this.totalSlots,
      lastUpdatedAt: freshTimes.length ? Math.max(...freshTimes) : null
    };
  }

  clear(reason = "Cache dihapus") {
    this.#entries.clear();
    this.lastClearReason = String(reason);
    this.#emit();
  }

  #emit() {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" ||
        typeof CustomEvent === "undefined") return;
    window.dispatchEvent(new CustomEvent("mg30-preset-cache-updated", { detail: this.getStatus() }));
  }
}

export function createMG30PresetManagerCache(options = {}) {
  return new MG30PresetManagerCache(options);
}
