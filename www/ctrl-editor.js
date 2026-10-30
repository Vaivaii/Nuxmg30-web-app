const EXP_FUNCTIONS = [
  ["----", 0], ["WAH", 1], ["EFX", 2], ["AMP", 3], ["MOD", 4], ["DLY", 5], ["RVB", 6]
];
const FOOTSWITCH_OPTIONS = [
  "----", "TAP", "CMP", "GATE", "EFX", "EQ", "SR", "MOD",
  "DLY", "RVB", "SCENE", "RVB HF", "WAH", "S.UP", "S.DN"
];
const MULTI_FUNCTIONS = [
  "----", "TAP", "CMP", "GATE", "EFX", "EQ", "SR", "MOD", "DLY", "RVB", "SCENE", "RVB HF", "WAH"
];
const FUNCTION_BLOCK = { 1: 0, 2: 2, 3: 3, 4: 6, 5: 7, 6: 8 };
const FUNCTION_NAME = { 1: "WAH", 2: "EFX", 3: "AMP", 4: "MOD", 5: "DLY", 6: "RVB" };

const MODEL_PAIRS = {
  EFX: {
    "DIST +": ["OUTPUT", "OUTPUT"],
    "RC BOOST": ["GAIN", "VOLUME"],
    "AC BOOST": ["GAIN", "VOLUME"],
    "DIST UNO": ["LEVEL", "DRIVE"],
    "T SCREAM": ["DRIVE", "LEVEL"],
    "BLUES DRV": ["LEVEL", "GAIN"],
    "SPUA DRV": ["VOLUME", "DRIVE"],
    "BLACKDIST": ["DIST", "VOLUME"],
    "RED DIRT": ["DRIVE", "LEVEL"],
    "CRUNCH": ["VOLUME", "GAIN"],
    "MUFFFUZZ": ["VOLUME", "VOLUME"],
    "KATANA": ["VOLUME", "VOLUME"],
    "STSIGNER": ["VOLUME", "GAIN"],
    "REDFUZZ": ["GAIN", "OUTPUT"],
    "T WAH": ["DECAY", "SENS."],
    "FULL OD": ["VOLUME", "DRIVE"],
    "HORSEMAN": ["GAIN", "OUTPUT"],
    "NOB ODR": ["DRIVE", "LEVEL"],
    "RIV BLUE": ["LEVEL", "GAIN"],
    "TURBO OD": ["LEVEL", "DRIVE"],
    "CE 1": ["DEPTH", "RATE"],
    "CE 2": ["RATE", "DEPTH"],
    "ST CHORUS": ["INTEN", "RATE"],
    "VIBRATOR": ["RATE", "DEPTH"],
    "DETUNE": ["MIX", "MIX"],
    "FLANGER": ["LEVEL", "RATE"],
    "PHASE 90": ["SPEED", "SPEED"],
    "PHASE 100": ["INTEN", "SPEED"],
    "SCF FLG": ["SPEED", "INTEN"],
    "U VIBE": ["SPEED", "INTEN"],
    "TREMOLO": ["RATE", "DEPTH"],
    "ROTARY": ["SPEED", "SPEED"],
    "HARMONIST": ["BLEND", "BLEND"],
    "SCH 1": ["RATE", "DEPTH"],
    "MONO OCT": ["SUB", "UP"]
  },
  MOD: {
    "CE 1": ["DEPTH", "RATE"], "CE 2": ["RATE", "DEPTH"],
    "ST CHORUS": ["INTEN", "RATE"], "VIBRATOR": ["RATE", "DEPTH"],
    "DETUNE": ["MIX", "MIX"], "FLANGER": ["LEVEL", "RATE"],
    "PHASE 90": ["SPEED", "SPEED"], "PHASE 100": ["INTEN", "SPEED"],
    "SCF": ["SPEED", "INTEN"], "U VIBE": ["SPEED", "INTEN"],
    "TREMOLO": ["RATE", "DEPTH"], "ROTARY": ["SPEED", "SPEED"],
    "HARMONIST": ["BLEND", "BLEND"], "SCH 1": ["RATE", "DEPTH"],
    "MONO OCTAVE": ["SUB", "UP"]
  },
  DLY: {
    "ANALOG DELAY": ["RATE", "INTEN"], "DIGITAL DELAY": ["TIME", "LEVEL"],
    "MODULATION": ["TIME", "LEVEL"], "TAPE ECHO": ["TIME", "LEVEL"],
    "REVERSE": ["TIME", "MIX"], "PAN DELAY": ["TIME", "LEVEL"],
    "DUOTIME": ["LEVEL", "TIME"], "PHI DELAY": ["TIME", "MIX"]
  },
  RVB: {
    "ROOM": ["LEVEL", "LEVEL"], "HALL": ["LEVEL", "LEVEL"],
    "PLATE": ["LEVEL", "LEVEL"], "SPRING": ["LEVEL", "LEVEL"],
    "SHIMMER": ["MIX", "MIX"], "DAMP": ["MIX", "MIX"]
  }
};
const MODEL_ALIASES = {
  EFX: {
    "DISTORTION": "DIST +", "DIST ONE": "DIST UNO", "T SCREAM": "T SCREAM",
    "BLUES DRV": "BLUES DRV", "MORNING DRV": "SPUA DRV", "EAT DIST": "BLACKDIST",
    "MUFF FUZZ": "MUFFFUZZ", "ST SINGER": "STSIGNER", "RED FUZZ": "REDFUZZ",
    "TOUCH WAH": "T WAH", "FULL OD HP": "FULL OD", "HORSEMAN OD": "HORSEMAN",
    "RIV BLUEFLOG": "RIV BLUE"
  },
  MOD: { "ST CHORUS": "ST CHORUS", "MONO OCT": "MONO OCTAVE" },
  DLY: {
    "ANA DLY": "ANALOG DELAY", "DIGI DLY": "DIGITAL DELAY",
    "MOD DLY": "MODULATION", "TAPEECHO": "TAPE ECHO",
    "PAN DLY": "PAN DELAY", "PHI DLY": "PHI DELAY"
  }
};
const $ = id => document.getElementById(id);
const normalize = value => String(value || "").toUpperCase().replace(/\s*[·•]\s*IMAGE\s*$/i, "").replace(/[^A-Z0-9]+/g, " ").trim();

let originalState = null;
let draftState = null;
let isDirty = false;
let isBusy = false;
let isOpen = false;

function cloneState(state) {
  return { bytes: state.bytes.slice(), extra: (state.extra || []).slice() };
}
function byteAt(state, index) {
  return Number(state.bytes[index] || 0) & 0x7F;
}
function setByte(state, index, value) {
  state.bytes[index] = Math.max(0, Math.min(127, Math.round(Number(value) || 0)));
}
function optionList(select, rows, current) {
  select.replaceChildren();
  rows.forEach(row => {
    const value = Array.isArray(row) ? row[1] : row;
    const label = Array.isArray(row) ? row[0] : row;
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = String(current);
}
function setStatus(message, kind) {
  const node = $("ctrlEditorStatus");
  if (!node) return;
  node.textContent = message;
  node.classList.remove("ok", "warn");
  if (kind) node.classList.add(kind);
}
function setBusy(value) {
  isBusy = Boolean(value);
  const ids = ["ctrlReadButton", "ctrlSaveButton", "ctrlCloseButton"];
  ids.forEach(id => { const node = $(id); if (node) node.disabled = isBusy; });
  document.querySelectorAll("#ctrlEditorDialog select, #ctrlEditorDialog input").forEach(node => {
    node.disabled = isBusy || node.dataset.locked === "true";
  });
  const save = $("ctrlSaveButton");
  if (save) save.disabled = isBusy || !isDirty || !originalState;
}
function markDirty() {
  isDirty = true;
  const save = $("ctrlSaveButton");
  if (save) save.disabled = isBusy || !originalState;
  const badge = $("ctrlDirtyBadge");
  if (badge) {
    badge.textContent = "BELUM DISIMPAN";
    badge.classList.add("dirty");
  }
}
function markClean() {
  isDirty = false;
  const save = $("ctrlSaveButton");
  if (save) save.disabled = isBusy || !originalState;
  const badge = $("ctrlDirtyBadge");
  if (badge) {
    badge.textContent = "SINKRON";
    badge.classList.remove("dirty");
  }
}
function pairFor(functionCode, modelName) {
  if (functionCode === 3) return ["GAIN", "MASTER"];
  const family = FUNCTION_NAME[functionCode];
  if (!family || family === "WAH") return null;
  const pairs = MODEL_PAIRS[family];
  if (!pairs) return null;
  const key = normalize(modelName);
  const mapped = (MODEL_ALIASES[family] || {})[key] || key;
  return pairs[mapped] || null;
}
function modelInfo(functionCode) {
  if (!window.MG30CtrlBridge || typeof window.MG30CtrlBridge.getModelInfo !== "function") {
    return { name: "—", blockId: "" };
  }
  return window.MG30CtrlBridge.getModelInfo(functionCode) || { name: "—", blockId: "" };
}
function renderMulti() {
  if (!draftState) return;
  const raw = byteAt(draftState, 0);
  const functionCode = raw & 0x0F;
  optionList($("multiEfxFunction"), MULTI_FUNCTIONS.map((label, index) => [label, index]), functionCode);
  const dependent = $("multiEfxDependentWrap");
  const select = $("multiEfxDependent");
  if (functionCode === 8) {
    dependent.hidden = false;
    optionList(select, [["S.TAP ON", 0], ["S.TAP OFF", 1]], (raw & 0x20) ? 0 : 1);
    $("multiEfxDependentHint").textContent = "DLY: bit 0x20 aktif berarti S.TAP ON.";
  } else if (functionCode === 10) {
    dependent.hidden = false;
    optionList(select, [["S3 ON", 0], ["S3 OFF", 1]], (raw & 0x20) ? 1 : 0);
    $("multiEfxDependentHint").textContent = "SCENE memakai polaritas bit yang berlawanan dengan DLY.";
  } else {
    dependent.hidden = true;
  }
}
function renderFootswitch() {
  if (!draftState) return;
  optionList($("footswitchT"), FOOTSWITCH_OPTIONS.map((label, index) => [label === "----" ? "T:----" : "T:" + label, index]), byteAt(draftState, 1));
  optionList($("footswitchR"), FOOTSWITCH_OPTIONS.map((label, index) => [label === "----" ? "R:----" : "R:" + label, index]), byteAt(draftState, 2));
}
function renderExpression(which) {
  if (!draftState) return;
  const isOne = which === 1;
  const functionIndex = isOne ? 3 : 5;
  const choiceIndex = isOne ? 4 : 6;
  const functionSelect = $(isOne ? "ctrl1Function" : "ctrl2Function");
  const choiceSelect = $(isOne ? "ctrl1Parameter" : "ctrl2Parameter");
  const modelNode = $(isOne ? "ctrl1Model" : "ctrl2Model");
  const choiceWrap = $(isOne ? "ctrl1ParameterWrap" : "ctrl2ParameterWrap");
  const rangeWrap = $(isOne ? "ctrl1RangeWrap" : "ctrl2RangeWrap");
  const code = byteAt(draftState, functionIndex) & 0x0F;
  const selectedChoice = byteAt(draftState, choiceIndex) & 0x01;
  optionList(functionSelect, EXP_FUNCTIONS, code);

  if (code === 0) {
    modelNode.textContent = "Tidak ada assignment";
    choiceWrap.hidden = true;
    rangeWrap.hidden = true;
    return;
  }

  const info = modelInfo(code);
  modelNode.textContent = (info.name || "Model belum diketahui") + (info.blockId ? " · " + info.blockId : "");
  if (code === 1) {
    choiceWrap.hidden = true;
    rangeWrap.hidden = false;
    const minId = isOne ? "ctrl1Min" : "ctrl2Min";
    const maxId = isOne ? "ctrl1Max" : "ctrl2Max";
    const minValue = byteAt(draftState, isOne ? 8 : 10);
    const maxValue = byteAt(draftState, isOne ? 9 : 11);
    $(minId).value = String(Math.min(100, minValue));
    $(maxId).value = String(Math.min(100, maxValue));
    $(isOne ? "ctrl1MinValue" : "ctrl2MinValue").textContent = String(minValue);
    $(isOne ? "ctrl1MaxValue" : "ctrl2MaxValue").textContent = String(maxValue);
    return;
  }

  rangeWrap.hidden = true;
  const pair = pairFor(code, info.name);
  if (!pair) {
    choiceWrap.hidden = false;
    optionList(choiceSelect, [["Parameter belum dipetakan", selectedChoice]], selectedChoice);
    choiceSelect.disabled = true;
    choiceSelect.dataset.locked = "true";
    $("ctrlParameterNotice").textContent = "Pasangan parameter model ini belum ada pada tabel QuickTone original MG-30. Assignment dapat dibaca, tetapi pilihan parameter dikunci agar tidak mengirim enum tebakan.";
    $("ctrlParameterNotice").hidden = false;
    return;
  }
  choiceSelect.disabled = false;
  choiceSelect.dataset.locked = "false";
  optionList(choiceSelect, [[pair[0], 0], [pair[1], 1]], selectedChoice);
  choiceWrap.hidden = false;
  $("ctrlParameterNotice").hidden = true;
}
function renderAll() {
  renderMulti();
  renderFootswitch();
  renderExpression(1);
  renderExpression(2);
}
function loadState(state) {
  originalState = cloneState(state);
  draftState = cloneState(state);
  markClean();
  renderAll();
  const b = draftState.bytes;
  setStatus(
    "Readback berhasil · Multi " + b[0].toString(16).padStart(2, "0").toUpperCase() +
    " · T " + b[1] + " · R " + b[2] +
    " · CTRL1 " + b[3] + "/" + b[4] +
    " · CTRL2 " + b[5] + "/" + b[6] + ".",
    "ok"
  );
}
async function readFromPedal() {
  const bridge = window.MG30CtrlBridge;
  if (!bridge || !bridge.isConnected()) {
    setStatus("Hubungkan MG-30 melalui USB-MIDI terlebih dahulu, lalu tekan Baca ulang.", "warn");
    return;
  }
  setBusy(true);
  setStatus("Membaca konfigurasi EXP & Pedal melalui 13 00…");
  try {
    const state = await bridge.readState();
    loadState(state);
  } catch (error) {
    setStatus(error && error.message ? error.message : "Readback CTRL gagal.", "warn");
  } finally {
    setBusy(false);
    if (isDirty) markDirty();
  }
}
function updateFunction(which, value) {
  if (!draftState) return;
  const index = which === 1 ? 3 : 5;
  setByte(draftState, index, Number(value) & 0x0F);
  markDirty();
  renderExpression(which);
}
function updateChoice(which, value) {
  if (!draftState) return;
  setByte(draftState, which === 1 ? 4 : 6, Number(value) & 0x01);
  markDirty();
}
function updateRange(which, kind, value) {
  if (!draftState) return;
  const minIndex = which === 1 ? 8 : 10;
  const maxIndex = which === 1 ? 9 : 11;
  let next = Math.max(0, Math.min(100, Number(value) || 0));
  if (kind === "min") {
    setByte(draftState, minIndex, next);
    if (byteAt(draftState, maxIndex) < next) setByte(draftState, maxIndex, next);
  } else {
    setByte(draftState, maxIndex, next);
    if (byteAt(draftState, minIndex) > next) setByte(draftState, minIndex, next);
  }
  const minValue = byteAt(draftState, minIndex);
  const maxValue = byteAt(draftState, maxIndex);
  $(which === 1 ? "ctrl1Min" : "ctrl2Min").value = String(minValue);
  $(which === 1 ? "ctrl1Max" : "ctrl2Max").value = String(maxValue);
  $(which === 1 ? "ctrl1MinValue" : "ctrl2MinValue").textContent = String(minValue);
  $(which === 1 ? "ctrl1MaxValue" : "ctrl2MaxValue").textContent = String(maxValue);
  markDirty();
}
function updateMultiFunction(value) {
  if (!draftState) return;
  const old = byteAt(draftState, 0);
  setByte(draftState, 0, (old & 0x20) | (Number(value) & 0x0F));
  markDirty();
  renderMulti();
}
function updateMultiDependent(value) {
  if (!draftState) return;
  const functionCode = byteAt(draftState, 0) & 0x0F;
  let setBit = false;
  if (functionCode === 8) setBit = Number(value) === 0;
  else if (functionCode === 10) setBit = Number(value) === 1;
  const raw = byteAt(draftState, 0);
  setByte(draftState, 0, setBit ? (raw | 0x20) : (raw & ~0x20));
  markDirty();
}
function bindControls() {
  $("multiEfxFunction").addEventListener("change", event => updateMultiFunction(event.target.value));
  $("multiEfxDependent").addEventListener("change", event => updateMultiDependent(event.target.value));
  $("footswitchT").addEventListener("change", event => {
    setByte(draftState, 1, Number(event.target.value));
    markDirty();
    if (Number(event.target.value) === 13) setByte(draftState, 2, 14);
    if (Number(event.target.value) === 14) setByte(draftState, 2, 13);
    renderFootswitch();
  });
  $("footswitchR").addEventListener("change", event => {
    setByte(draftState, 2, Number(event.target.value));
    markDirty();
    if (Number(event.target.value) === 13) setByte(draftState, 1, 14);
    if (Number(event.target.value) === 14) setByte(draftState, 1, 13);
    renderFootswitch();
  });
  $("ctrl1Function").addEventListener("change", event => updateFunction(1, event.target.value));
  $("ctrl2Function").addEventListener("change", event => updateFunction(2, event.target.value));
  $("ctrl1Parameter").addEventListener("change", event => updateChoice(1, event.target.value));
  $("ctrl2Parameter").addEventListener("change", event => updateChoice(2, event.target.value));
  $("ctrl1Min").addEventListener("input", event => updateRange(1, "min", event.target.value));
  $("ctrl1Max").addEventListener("input", event => updateRange(1, "max", event.target.value));
  $("ctrl2Min").addEventListener("input", event => updateRange(2, "min", event.target.value));
  $("ctrl2Max").addEventListener("input", event => updateRange(2, "max", event.target.value));
}
async function saveToPedal() {
  if (!draftState || !originalState || !isDirty) return;
  const bridge = window.MG30CtrlBridge;
  if (!bridge || !bridge.isConnected()) {
    setStatus("MG-30 terputus. Perubahan belum dikirim.", "warn");
    return;
  }
  if (!window.confirm("Kirim seluruh assignment CTRL/EXP yang terlihat ke MG-30 dan verifikasi melalui readback?")) return;
  setBusy(true);
  setStatus("Mengirim 13 01, menunggu ACK 13 03, lalu membaca ulang 13 02…");
  try {
    const result = await bridge.writeState(draftState.bytes.slice());
    if (result.matched) {
      loadState(result.state);
      setStatus("Tersimpan · ACK 13 03 diterima dan seluruh field yang dikirim cocok dengan readback 13 02.", "ok");
    } else {
      loadState(result.state);
      markDirty();
      setStatus("Perangkat membalas readback, tetapi ada field yang berbeda dari nilai kirim. Periksa kembali sebelum mencoba lagi.", "warn");
    }
  } catch (error) {
    setStatus((error && error.message ? error.message : "Penulisan CTRL gagal.") +
      " · Periksa status perangkat sebelum mengirim ulang.", "warn");
  } finally {
    setBusy(false);
    if (isDirty) markDirty();
  }
}
async function openPanel() {
  const dialog = $("ctrlEditorDialog");
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
  isOpen = true;
  if (window.MG30CtrlBridge && window.MG30CtrlBridge.isConnected()) {
    await readFromPedal();
  } else {
    setStatus("Panel siap. Hubungkan MG-30 melalui USB-MIDI untuk membaca atau menulis konfigurasi.", "warn");
  }
}
function closePanel() {
  const dialog = $("ctrlEditorDialog");
  if (isDirty && !window.confirm("Buang perubahan CTRL/EXP yang belum dikirim?")) return;
  isOpen = false;
  if (dialog && dialog.open) dialog.close();
}
function init() {
  optionList($("multiEfxFunction"), MULTI_FUNCTIONS.map((label, index) => [label, index]), 0);
  optionList($("footswitchT"), FOOTSWITCH_OPTIONS.map((label, index) => ["T:" + label, index]), 0);
  optionList($("footswitchR"), FOOTSWITCH_OPTIONS.map((label, index) => ["R:" + label, index]), 0);
  optionList($("ctrl1Function"), EXP_FUNCTIONS, 0);
  optionList($("ctrl2Function"), EXP_FUNCTIONS, 0);
  bindControls();
  $("openCtrlEditor").addEventListener("click", openPanel);
  $("ctrlReadButton").addEventListener("click", readFromPedal);
  $("ctrlSaveButton").addEventListener("click", saveToPedal);
  $("ctrlCloseButton").addEventListener("click", closePanel);
  $("ctrlEditorDialog").addEventListener("cancel", event => {
    if (isDirty && !window.confirm("Buang perubahan CTRL/EXP yang belum dikirim?")) event.preventDefault();
    else isOpen = false;
  });
  window.addEventListener("mg30-midi-connected", () => {
    if (isOpen) void readFromPedal();
  });
  window.addEventListener("mg30-native-midi-state", event => {
    if (!event.detail || !event.detail.connected) setStatus("USB-MIDI terputus. Perubahan lokal belum dikirim.", "warn");
  });
  const badge = $("ctrlDirtyBadge");
  if (badge) badge.textContent = "BELUM DIBACA";
  const save = $("ctrlSaveButton");
  if (save) save.disabled = true;
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
