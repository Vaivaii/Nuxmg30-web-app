import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { extractMG30A2LiteWeights, buildMG30A2LiteTransferPlan, sendMG30A2LiteTransfer, safeMG30SlotLabel, readMG30NAMSlotNames } from './nam-transfer.js';

const T3K = 'https://www.tone3000.com/api/v1';
const PREFIX = 'mg30-t3k-';
const NativeMidi = registerPlugin('MG30Midi');
const Native = () => Capacitor.isNativePlatform();
const $ = id => document.getElementById(id);
let panelReady = false;
let selectedTone = null;
const modelBytesCache = new WeakMap();
window.NUXNAMTransfer = Object.freeze({ readMG30NAMSlotNames });

const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function stylePanel() {
  if (document.getElementById('t3k-style')) return;
  const style = document.createElement('style');
  style.id = 't3k-style';
  style.textContent = `
    .t3k-panel{margin:16px 0;padding:18px;border:1px solid var(--border,#293238);border-radius:18px;background:var(--panel,#11191d);color:var(--text,#f1f5f4)}
    .t3k-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
    .t3k-panel h3{margin:0 0 6px;font-size:1.04rem}.t3k-panel p{margin:4px 0 12px;color:var(--muted,#a6b1b4);font-size:.88rem;line-height:1.5}
    .t3k-mark{display:inline-flex;align-items:center;gap:6px;border:1px solid #3a6450;border-radius:999px;padding:4px 9px;color:#b6f2ce;font-size:.72rem;white-space:nowrap}
    .t3k-form{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.t3k-form input{flex:1;min-width:180px}
    .t3k-panel input{box-sizing:border-box;width:100%;padding:11px 12px;border:1px solid var(--border,#39464b);border-radius:10px;background:var(--input,#0b1114);color:inherit}
    .t3k-panel select{box-sizing:border-box;min-width:140px;flex:1;padding:10px 12px;border:1px solid var(--border,#39464b);border-radius:10px;background:var(--input,#0b1114);color:inherit;font:inherit}
    .t3k-transfer-actions select{max-width:220px}
    .t3k-panel button{border:1px solid var(--border,#3a454a);border-radius:10px;padding:10px 13px;background:var(--button,#202a2f);color:inherit;font:inherit;font-weight:650;cursor:pointer}
    .t3k-panel button.primary{background:#c5f36b;border-color:#c5f36b;color:#0b1012}.t3k-panel button:disabled{opacity:.45;cursor:not-allowed}
    .t3k-status{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.035);font-size:.85rem;line-height:1.5;overflow-wrap:anywhere}
    .t3k-tone{display:grid;gap:10px;margin-top:12px}.t3k-card{padding:12px;border-radius:12px;border:1px solid var(--border,#293238);background:rgba(255,255,255,.025)}
    .t3k-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.t3k-card strong{display:block}.t3k-card small{display:block;color:var(--muted,#a6b1b4);margin-top:4px;line-height:1.4}
    .t3k-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.t3k-link{color:#c5f36b;text-decoration:underline}.t3k-warning{border-left:3px solid #c5f36b;padding-left:10px}
    .t3k-target-row{align-items:center}.t3k-target-row label{display:block;color:var(--muted,#a6b1b4);font-size:.85rem;font-weight:650}.t3k-target-row select{flex:0 1 210px;max-width:220px}
    @media(max-width:560px){.t3k-panel{padding:14px}.t3k-form button{width:100%}.t3k-card-head{display:block}.t3k-target-row select{flex:1;max-width:none}}
  `;
  document.head.appendChild(style);
}

function createPanel() {
  const localPanel = $('namImportTransferPanel');
  if (!localPanel) return false;
  if (document.getElementById('tone3000Panel')) return true;

  const panel = document.createElement('section');
  panel.id = 'tone3000Panel';
  panel.className = 'panel t3k-panel';
  panel.innerHTML = `
    <div class="t3k-head">
      <div><h3>TONE3000 · katalog NAM</h3>
      <p>Pilih slot tujuan, lalu pilih tone di katalog TONE3000. Setelah kembali ke aplikasi, model A2-Lite yang cocok akan diunduh dan dikirim otomatis ke slot tersebut.</p></div>
      <span class="t3k-mark">T3K</span>
    </div>
    <label for="t3kClientId"><small>Publishable key TONE3000</small></label>
    <div class="t3k-form">
      <input id="t3kClientId" type="password" autocomplete="off" spellcheck="false" placeholder="t3k_pub_…">
      <button id="t3kSaveKey" type="button">Simpan key</button>
    </div>
    <div class="t3k-form t3k-target-row">
      <label for="t3kTargetSlot">Slot tujuan MG-30</label>
      <select id="t3kTargetSlot" aria-label="Pilih slot tujuan TONE3000">
        <option value="">Pilih slot tujuan</option>
        <option value="1">Slot 1</option><option value="2">Slot 2</option><option value="3">Slot 3</option>
        <option value="4">Slot 4</option><option value="5">Slot 5</option><option value="6">Slot 6</option>
        <option value="7">Slot 7</option><option value="8">Slot 8</option><option value="9">Slot 9</option><option value="10">Slot 10</option>
      </select>
    </div>
    <div class="t3k-actions">
      <button id="t3kChooseTone" class="primary" type="button">Pilih tone & impor ke MG-30</button>
      <button id="t3kSignOut" type="button">Putuskan akun</button>
    </div>
    <div class="t3k-status" id="t3kStatus" role="status" aria-live="polite">Siap. Masukkan publishable key dari pengaturan developer TONE3000 terlebih dahulu.</div>
    <div id="t3kToneDetails" class="t3k-tone"></div>
    <p class="t3k-warning">Untuk NUX MG-30 Gen 2 firmware 6.0.5 (bukan MKII). Transfer NAM lokal sudah berhasil diuji di perangkat; jalur impor otomatis TONE3000 tetap perlu diuji. Proses menimpa slot tujuan—cadangkan model penting terlebih dahulu.</p>
    <p><a class="t3k-link" href="https://www.tone3000.com/api" target="_blank" rel="noopener noreferrer">Dokumentasi API TONE3000</a> · <a class="t3k-link" href="https://www.tone3000.com/api/terms" target="_blank" rel="noopener noreferrer">Ketentuan API</a></p>
  `;
  localPanel.insertAdjacentElement('afterend', panel);
  stylePanel();
  panelReady = true;

  $('t3kClientId').value = localStorage.getItem(PREFIX + 'client_id') || '';
  $('t3kTargetSlot').value = localStorage.getItem(PREFIX + 'target_slot') || '';
  $('t3kTargetSlot').addEventListener('change', () => {
    const slot = Number($('t3kTargetSlot').value || 0);
    if (Number.isInteger(slot) && slot >= 1 && slot <= 10) localStorage.setItem(PREFIX + 'target_slot', String(slot));
    else localStorage.removeItem(PREFIX + 'target_slot');
  });
  $('t3kSaveKey').addEventListener('click', () => {
    const key = $('t3kClientId').value.trim();
    if (!/^t3k_pub_[A-Za-z0-9_-]+$/.test(key)) {
      setStatus('Masukkan publishable key dengan format t3k_pub_… . Jangan memasukkan client secret.');
      return;
    }
    localStorage.setItem(PREFIX + 'client_id', key);
    setStatus('Publishable key disimpan di perangkat ini. Selanjutnya pilih tone untuk memulai autentikasi.');
  });
  $('t3kChooseTone').addEventListener('click', startSelectFlow);
  $('t3kSignOut').addEventListener('click', signOut);
  updateAccountStatus();
  return true;
}

function setStatus(message) {
  const node = $('t3kStatus');
  if (node) node.textContent = String(message || '');
}

function updateAccountStatus() {
  const token = localStorage.getItem(PREFIX + 'access_token');
  if (token && $('t3kStatus')) {
    setStatus('Akun TONE3000 tersambung pada perangkat ini. Kamu dapat memilih tone A2 atau memuat ulang detail tone yang terakhir dipilih.');
  }
}

function makeRandomToken() {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Base64Url(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function getRedirectUri() {
  if (Native()) return 'mg30studio://oauth/callback';
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return url.href;
}

async function startSelectFlow() {
  const clientId = (localStorage.getItem(PREFIX + 'client_id') || $('t3kClientId')?.value || '').trim();
  if (!/^t3k_pub_[A-Za-z0-9_-]+$/.test(clientId)) {
    setStatus('Masukkan publishable key TONE3000 yang valid sebelum membuka katalog.');
    return;
  }
  const targetSlot = Number($('t3kTargetSlot')?.value || localStorage.getItem(PREFIX + 'target_slot') || 0);
  if (Native() && (!Number.isInteger(targetSlot) || targetSlot < 1 || targetSlot > 10)) {
    setStatus('Pilih slot tujuan 1–10 terlebih dahulu.');
    $('t3kTargetSlot')?.focus();
    return;
  }
  if (Number.isInteger(targetSlot) && targetSlot >= 1 && targetSlot <= 10) {
    localStorage.setItem(PREFIX + 'target_slot', String(targetSlot));
  }
  if (Native() && !window.confirm(
    'Setelah memilih tone di TONE3000, aplikasi akan mengunduh model A2-Lite yang cocok dan langsung mengimpornya ke MG-30 slot ' +
    targetSlot + '. Slot ini akan ditimpa. Lanjutkan?'
  )) {
    setStatus('Pemilihan tone dibatalkan. Tidak ada model yang ditulis ke perangkat.');
    return;
  }
  try {
    $('t3kChooseTone').disabled = true;
    setStatus('Menyiapkan autentikasi TONE3000…');
    const verifier = makeRandomToken();
    const state = makeRandomToken();
    const challenge = await sha256Base64Url(verifier);
    const redirectUri = getRedirectUri();
    localStorage.setItem(PREFIX + 'client_id', clientId);
    localStorage.setItem(PREFIX + 'code_verifier', verifier);
    localStorage.setItem(PREFIX + 'state', state);
    localStorage.setItem(PREFIX + 'redirect_uri', redirectUri);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      prompt: 'select_tone',
      format: 'nam',
      architecture: '2',
      gears: 'amp_amp-cab',
      menubar: 'true',
      locale: 'id',
    });
    const url = 'https://www.tone3000.com/api/v1/oauth/authorize?' + params.toString();
    setStatus('Membuka TONE3000. Setelah memilih tone, aplikasi akan kembali dan otomatis mengimpor model yang cocok ke slot ' + (targetSlot || 'yang dipilih') + '…');
    if (Native()) await Browser.open({ url, presentationStyle: 'fullscreen' });
    else window.location.assign(url);
  } catch (error) {
    setStatus('Gagal membuka TONE3000: ' + (error?.message || error));
  } finally {
    if ($('t3kChooseTone')) $('t3kChooseTone').disabled = false;
  }
}


async function exchangeAuthorizationCode(code) {
  const clientId = localStorage.getItem(PREFIX + 'client_id');
  const verifier = localStorage.getItem(PREFIX + 'code_verifier');
  const redirectUri = localStorage.getItem(PREFIX + 'redirect_uri');
  if (!clientId || !verifier || !redirectUri) throw new Error('Data PKCE tidak lengkap; ulangi proses pilih tone.');
  const response = await fetch(T3K + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      client_id: clientId,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error_description || body.error || ('HTTP ' + response.status));
  storeTokens(body);
}

function storeTokens(body) {
  if (!body?.access_token || !body?.refresh_token) throw new Error('Respons TONE3000 tidak menyertakan token yang diperlukan.');
  localStorage.setItem(PREFIX + 'access_token', body.access_token);
  localStorage.setItem(PREFIX + 'refresh_token', body.refresh_token);
  localStorage.setItem(PREFIX + 'expires_at', String(Date.now() + Number(body.expires_in || 3600) * 1000));
}

function signOut() {
  for (const key of ['access_token', 'refresh_token', 'expires_at', 'selected_tone_id', 'code_verifier', 'state', 'redirect_uri']) {
    localStorage.removeItem(PREFIX + key);
  }
  selectedTone = null;
  if ($('t3kToneDetails')) $('t3kToneDetails').innerHTML = '';
  setStatus('Akun TONE3000 diputuskan dari aplikasi ini. Publishable key tetap tersimpan.');
}

async function ensureAccessToken() {
  let accessToken = localStorage.getItem(PREFIX + 'access_token');
  const expiresAt = Number(localStorage.getItem(PREFIX + 'expires_at') || 0);
  if (accessToken && Date.now() < expiresAt - 60_000) return accessToken;

  const refreshToken = localStorage.getItem(PREFIX + 'refresh_token');
  const clientId = localStorage.getItem(PREFIX + 'client_id');
  if (!refreshToken || !clientId) throw new Error('Sesi TONE3000 belum aktif. Pilih tone untuk masuk kembali.');
  const response = await fetch(T3K + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (body.error === 'invalid_grant') signOut();
    throw new Error(body.error_description || body.error || ('Refresh token HTTP ' + response.status));
  }
  storeTokens(body);
  accessToken = body.access_token;
  return accessToken;
}

async function apiJSON(path) {
  const token = await ensureAccessToken();
  const response = await fetch(T3K + path, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error_description || body.message || body.error || ('API HTTP ' + response.status));
  return body;
}

async function loadSelectedTone(toneId, options = {}) {
  const id = String(toneId || '').trim();
  if (!/^\d+$/.test(id)) return;
  const holder = $('t3kToneDetails');
  if (!holder) return;
  holder.innerHTML = '';
  setStatus('Memuat metadata tone dan daftar model A2…');
  try {
    const [toneBody, modelBody] = await Promise.all([
      apiJSON('/tones/' + encodeURIComponent(id) + '?architecture=2'),
      apiJSON('/models?tone_id=' + encodeURIComponent(id) + '&architecture=2&page=1&page_size=50'),
    ]);
    const tone = toneBody?.data || toneBody?.tone || toneBody;
    const allModels = Array.isArray(modelBody?.data) ? modelBody.data
      : Array.isArray(modelBody?.models) ? modelBody.models
      : Array.isArray(modelBody?.items) ? modelBody.items
      : Array.isArray(modelBody?.data?.items) ? modelBody.data.items
      : [];
    const models = allModels.filter(item => item && (item.model_url || item.modelUrl));
    models.forEach(model => { if (!model.model_url && model.modelUrl) model.model_url = model.modelUrl; });
    selectedTone = { id, tone, models };
    localStorage.setItem(PREFIX + 'selected_tone_id', id);
    const title = tone?.name || tone?.title || ('TONE3000 tone #' + id);
    const creator = tone?.username || tone?.creator?.username || tone?.user?.username || tone?.user?.name || '';
    const description = tone?.description || '';
    const header = document.createElement('div');
    header.className = 't3k-card';
    header.innerHTML = '<div class="t3k-card-head"><div><strong>' + safe(title) + '</strong><small>TONE3000 ID ' + safe(id) + (creator ? ' · Pembuat: ' + safe(creator) : '') + '</small></div><span class="t3k-mark">' + models.length + ' MODEL</span></div>' +
      (description ? '<small>' + safe(description) + '</small>' : '');
    holder.appendChild(header);

    if (!models.length) {
      holder.insertAdjacentHTML('beforeend', '<div class="t3k-card"><small>Tidak ada model yang dapat diunduh melalui respons API untuk tone ini. Coba pilih tone NAM A2 lainnya.</small></div>');
      setStatus('Tone dimuat, tetapi API tidak mengembalikan file model A2 yang dapat diunduh.');
      return;
    }
    models.forEach((model, index) => {
      const card = document.createElement('div');
      card.className = 't3k-card';
      const size = typeof model.size === 'number' ? (model.size + ' bytes') : (model.size?.label || model.size?.name || model.size || 'Ukuran tidak tersedia');
      const architecture = model.architecture_version ?? model.architecture ?? 'A2 (difilter API)';
      const fileName = model.name || ('tone-' + id + '-model-' + (index + 1) + '.nam');
      const slotOptions = '<option value="">Pilih slot tujuan</option>' +
        Array.from({ length: 10 }, (_, slot) => '<option value="' + (slot + 1) + '">Slot ' + (slot + 1) + '</option>').join('');
      card.innerHTML = '<div class="t3k-card-head"><div><strong>' + safe(fileName) + '</strong><small>Arsitektur: ' + safe(architecture) + ' · Ukuran: ' + safe(size) + '</small></div></div>' +
        '<small>Setelah tone dipilih, aplikasi mencoba mengunduh model A2-Lite yang cocok untuk MG-30. Kamu juga bisa memakai tombol Kirim ke MG-30 untuk memilih model dan slot secara manual.</small>' +
        '<div class="t3k-actions"><button class="primary" type="button" data-t3k-save="' + index + '">Simpan model di aplikasi</button></div>' +
        '<div class="t3k-actions t3k-transfer-actions"><select data-t3k-slot="' + index + '" aria-label="Slot tujuan untuk ' + safe(fileName) + '">' + slotOptions + '</select>' +
        '<button type="button" data-t3k-send="' + index + '"' + (Native() ? '' : ' disabled title="Transfer langsung tersedia di aplikasi Android"') + '>Kirim ke MG-30</button></div>';
      holder.appendChild(card);
    });
    const defaultSlot = Number($('t3kTargetSlot')?.value || localStorage.getItem(PREFIX + 'target_slot') || 0);
    holder.querySelectorAll('[data-t3k-slot]').forEach(select => {
      if (Number.isInteger(defaultSlot) && defaultSlot >= 1 && defaultSlot <= 10) select.value = String(defaultSlot);
      select.addEventListener('change', () => {
        const slot = Number(select.value || 0);
        if (Number.isInteger(slot) && slot >= 1 && slot <= 10) {
          if ($('t3kTargetSlot')) $('t3kTargetSlot').value = String(slot);
          localStorage.setItem(PREFIX + 'target_slot', String(slot));
        }
      });
    });
    holder.querySelectorAll('[data-t3k-save]').forEach(button => {
      button.addEventListener('click', () => saveModel(Number(button.dataset.t3kSave), button));
    });
    holder.querySelectorAll('[data-t3k-send]').forEach(button => {
      button.addEventListener('click', () => sendModel(Number(button.dataset.t3kSend), button));
    });
    setStatus(Native()
      ? 'Tone siap. Aplikasi akan mencari model A2-Lite yang cocok lalu mengimpor ke slot tujuan. Jika ada beberapa model, pilih model yang ingin dikirim.'
      : 'Tone siap. Kamu bisa menyimpan model di browser; transfer langsung membutuhkan APK Android dan USB OTG.');
    const autoSlot = Number(options.autoImportSlot || 0);
    if (Native() && autoSlot >= 1 && autoSlot <= 10) await autoImportFirstCompatibleModel(autoSlot);
  } catch (error) {
    setStatus('Gagal memuat tone/model: ' + (error?.message || error));
  }
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

async function saveModel(index, button) {
  const model = selectedTone?.models?.[index];
  if (!model?.model_url) {
    setStatus('URL model tidak tersedia untuk pilihan ini.');
    return;
  }
  if (button) { button.disabled = true; button.textContent = 'Mengunduh…'; }
  try {
    const token = await ensureAccessToken();
    const response = await fetch(model.model_url, { headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) throw new Error('Unduhan model HTTP ' + response.status);
    const blob = await response.blob();
    if (!blob.size) throw new Error('File model yang diterima kosong.');
    let fileName = String(model.name || '').trim() || ('tone-' + selectedTone.id + '-model-' + (index + 1) + '.nam');
    fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    if (!/\.(nam|namb|image)$/i.test(fileName)) fileName += '.nam';

    if (Native()) {
      const base64 = toBase64(await blob.arrayBuffer());
      const result = await NativeMidi.saveModel({ fileName, base64 });
      setStatus('Model tersimpan di penyimpanan internal aplikasi: ' + result.fileName + ' (' + result.bytes + ' byte). Lokasi ini bersifat app-private; pengiriman langsung menyusul setelah protokol tervalidasi.');
    } else {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus('Unduhan dimulai: ' + fileName + '. File belum dikirim ke MG-30; unggah langsung akan diaktifkan setelah protokol tervalidasi.');
    }
  } catch (error) {
    setStatus('Gagal menyimpan model: ' + (error?.message || error));
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Simpan model di aplikasi'; }
  }
}

async function sendModel(index, button, options = {}) {
  const model = selectedTone?.models?.[index];
  if (!model?.model_url) {
    setStatus('URL model tidak tersedia untuk pilihan ini.');
    return false;
  }
  if (!Native()) {
    setStatus('Transfer langsung hanya tersedia di APK Android dengan koneksi USB OTG ke MG-30.');
    return false;
  }
  const slotSelect = document.querySelector('[data-t3k-slot="' + index + '"]');
  const slotNumber = Number(slotSelect?.value || $('t3kTargetSlot')?.value || localStorage.getItem(PREFIX + 'target_slot') || 0);
  if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 10) {
    setStatus('Pilih slot tujuan 1–10 sebelum memulai transfer.');
    return false;
  }
  const rawLabel = String(model.name || ('TONE3000 tone ' + selectedTone.id + ' model ' + (index + 1)))
    .replace(/\.(nam|namb)$/i, '').trim();
  if (!options.confirmed && !window.confirm(
    'Kirim "' + rawLabel + '" ke MG-30 slot ' + slotNumber +
    '? Isi slot tersebut akan ditimpa. Pastikan model lama sudah dicadangkan.'
  )) {
    setStatus('Transfer dibatalkan. Model belum ditulis ke slot ' + slotNumber + '.');
    return false;
  }

  if (button) { button.disabled = true; button.textContent = 'Menyiapkan transfer…'; }
  if (slotSelect) slotSelect.disabled = true;
  try {
    setStatus('Mengunduh model dari TONE3000…');
    let modelBytes = modelBytesCache.get(model);
    if (modelBytes) modelBytesCache.delete(model);
    else {
      const token = await ensureAccessToken();
      const response = await fetch(model.model_url, { headers: { Authorization: 'Bearer ' + token } });
      if (!response.ok) throw new Error('Unduhan model HTTP ' + response.status);
      const blob = await response.blob();
      if (!blob.size) throw new Error('File model yang diterima kosong.');
      modelBytes = await blob.arrayBuffer();
    }

    const weightBytes = extractMG30A2LiteWeights(modelBytes);
    const plan = buildMG30A2LiteTransferPlan(weightBytes, rawLabel, slotNumber);
    let fileName = String(model.name || ('tone-' + selectedTone.id + '-model-' + (index + 1) + '.nam')).trim();
    fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    if (!/\.(nam|namb|image)$/i.test(fileName)) fileName += '.nam';

    const saved = await NativeMidi.saveModel({ fileName, base64: toBase64(modelBytes) });
    setStatus('Model valid (' + weightBytes.length + ' byte bobot A2-Lite), tersimpan sebagai ' +
      saved.fileName + '. Membuka USB-MIDI…');
    const connection = await window.NUXNativeMidi.connect();
    const result = await sendMG30A2LiteTransfer(connection, plan, progress => {
      if (progress.stage === 'write') {
        setStatus('Transfer ke slot ' + slotNumber + ': ACK frame ' + progress.completed + '/' +
          progress.total + ' (' + progress.label + '). Jangan cabut USB OTG.');
      } else if (progress.stage === 'retry') {
        setStatus('ACK belum diterima untuk ' + progress.label + '; mencoba ulang ' + progress.attempt + '. Jangan cabut USB OTG.');
      } else if (progress.stage === 'readback') {
        setStatus('Bobot sudah dikirim. Sinkronisasi nama perangkat: putaran ' + progress.round +
          '/2, slot ' + progress.slot + '/10.');
      }
    });
    window.dispatchEvent(new CustomEvent('mg30-nam-names-sync', {
      detail: { slots: result.slots, source: 'transfer' }
    }));
    setStatus('Transfer selesai ke slot ' + result.slotNumber + ' (' + result.label + '). Semua ' +
      result.acknowledgedWriteFrames + ' frame tulis mendapat ACK; nama slot disinkronkan dari MG-30. ' +
      'Isi bobot tidak bisa dibaca balik oleh protokol ini, jadi suara tetap perlu diperiksa.');
    return true;
  } catch (error) {
    setStatus('Transfer tidak selesai: ' + (error?.message || error) +
      '. Model sudah diunduh/disimpan bila tahap itu berhasil. Jika penulisan sudah dimulai, slot mungkin berisi data parsial; periksa perangkat sebelum mencoba lagi.');
    return false;
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Kirim ke MG-30'; }
    if (slotSelect) slotSelect.disabled = false;
  }
}

async function autoImportFirstCompatibleModel(slotNumber) {
  if (!Native() || !window.NUXNativeMidi) {
    setStatus('Impor langsung membutuhkan APK Android dan MG-30 melalui USB OTG.');
    return;
  }
  const models = selectedTone?.models || [];
  if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 10) {
    setStatus('Pilih slot tujuan 1–10 sebelum transfer.');
    return;
  }
  if (!models.length) {
    setStatus('Tone dipilih, tetapi TONE3000 tidak mengembalikan daftar file model. Periksa akses akun/API lalu coba lagi.');
    return;
  }

  let lastError = '';
  let candidatesChecked = 0;
  for (let index = 0; index < models.length; index++) {
    const model = models[index];
    if (!model?.model_url) continue;
    const label = String(model.name || ('model ' + (index + 1)));
    let modelBytes;
    try {
      candidatesChecked++;
      setStatus('Tone dipilih. Mengunduh dan memeriksa model ' + (index + 1) + '/' +
        models.length + ' (' + label + ') untuk mencari A2-Lite yang cocok…');
      const token = await ensureAccessToken();
      const response = await fetch(model.model_url, { headers: { Authorization: 'Bearer ' + token } });
      if (!response.ok) throw new Error('Unduhan model HTTP ' + response.status);
      modelBytes = await response.arrayBuffer();
      if (!modelBytes.byteLength) throw new Error('File model yang diterima kosong.');
      extractMG30A2LiteWeights(modelBytes);
    } catch (error) {
      modelBytesCache.delete(model);
      lastError = label + ': ' + (error?.message || error);
      continue;
    }
    modelBytesCache.set(model, modelBytes);
    const slotSelect = document.querySelector('[data-t3k-slot="' + index + '"]');
    if (slotSelect) slotSelect.value = String(slotNumber);
    const button = document.querySelector('[data-t3k-send="' + index + '"]');
    setStatus('Model A2-Lite cocok ditemukan (' + label + '). Mengimpor langsung ke slot ' + slotNumber + '…');
    // User confirmed the target-slot overwrite before the TONE3000 browser opened.
    // Do not require a second confirmation after returning from the selected tone.
    await sendModel(index, button, { confirmed: true });
    return;
  }
  setStatus('Tone berhasil dipilih, tetapi dari ' + candidatesChecked +
    ' file model yang diperiksa tidak ditemukan A2-Lite native (1.871 bobot). ' +
    (lastError ? 'Detail: ' + lastError + '. ' : '') +
    'Coba tone NAM A2 lain atau gunakan impor file lokal.');
}

let selectedLocalNamFile = null;

function initLocalNamImport() {
  const fileInput = $('namTransferFileInput');
  const chooseButton = $('namTransferChooseBtn');
  const sendButton = $('namTransferSendBtn');
  const slotSelect = $('namTransferSlot');
  const status = $('namTransferStatus');
  const fileTitle = $('namTransferFileTitle');
  const fileMeta = $('namTransferFileMeta');
  if (!fileInput || !chooseButton || !sendButton || !slotSelect || !status || fileInput.dataset.bound === 'true') return;
  fileInput.dataset.bound = 'true';

  const setLocalStatus = message => { status.textContent = String(message || ''); };
  const renderSelection = file => {
    fileTitle.textContent = file ? file.name : 'Pilih file NAM untuk dikirim';
    fileMeta.textContent = file ? (file.size.toLocaleString() + ' byte · file dibaca lokal di perangkat') :
      'Mendukung .nam (JSON SlimmableContainer) dan .namb A2-Lite 1.871 bobot';
  };

  chooseButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    selectedLocalNamFile = null;
    sendButton.disabled = true;
    if (!file) {
      renderSelection(null);
      setLocalStatus('Belum ada file dipilih.');
      return;
    }
    renderSelection(file);
    if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
      setLocalStatus('Ukuran file kosong atau terlalu besar untuk diproses.');
      fileInput.value = '';
      return;
    }
    try {
      setLocalStatus('Memeriksa arsitektur dan bobot A2-Lite…');
      const bytes = await file.arrayBuffer();
      const weightBytes = extractMG30A2LiteWeights(bytes);
      selectedLocalNamFile = {
        file,
        bytes,
        weightBytes,
        label: safeMG30SlotLabel(file.name),
      };
      sendButton.disabled = !Native();
      setLocalStatus('Valid: A2-Lite, 1.871 bobot (' + weightBytes.length.toLocaleString() +
        ' byte). ' + (Native()
          ? 'Pilih slot tujuan dan tekan Kirim NAM ke MG-30.'
          : 'File bisa diperiksa di browser, tetapi transfer hanya tersedia di APK Android melalui USB OTG.'));
    } catch (error) {
      selectedLocalNamFile = null;
      sendButton.disabled = true;
      setLocalStatus('File tidak cocok untuk MG-30 Gen 2 A2-Lite: ' + (error?.message || error));
    }
  });

  sendButton.addEventListener('click', async () => {
    const selected = selectedLocalNamFile;
    const slotNumber = Number(slotSelect.value || 0);
    if (!selected) {
      setLocalStatus('Pilih dan validasi file NAM terlebih dahulu.');
      return;
    }
    if (!Native() || !window.NUXNativeMidi) {
      setLocalStatus('Transfer langsung memerlukan APK Android dan USB OTG ke MG-30.');
      return;
    }
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 10) {
      setLocalStatus('Pilih slot tujuan 1–10.');
      return;
    }
    const fileName = selected.file.name.replace(/[\\/:*?"<>|]/g, '_');
    if (!window.confirm('Kirim "' + selected.label + '" ke MG-30 slot ' + slotNumber +
      '? Model lama di slot ini akan ditimpa. Cadangkan dahulu atau gunakan slot uji.')) return;

    sendButton.disabled = true;
    chooseButton.disabled = true;
    slotSelect.disabled = true;
    fileInput.disabled = true;
    try {
      setLocalStatus('Menyimpan salinan model dan menyiapkan transfer…');
      await NativeMidi.saveModel({ fileName, base64: toBase64(selected.bytes) });
      const plan = buildMG30A2LiteTransferPlan(selected.weightBytes, selected.label, slotNumber);
      const connection = await window.NUXNativeMidi.connect();
      const result = await sendMG30A2LiteTransfer(connection, plan, progress => {
        if (progress.stage === 'write') {
          setLocalStatus('Slot ' + slotNumber + ': ACK ' + progress.completed + '/' + progress.total +
            ' · ' + progress.label + '. Jangan cabut USB OTG.');
        } else if (progress.stage === 'retry') {
          setLocalStatus('ACK belum diterima untuk ' + progress.label +
            '; percobaan ulang ' + progress.attempt + '. Jangan cabut USB OTG.');
        } else if (progress.stage === 'readback') {
          setLocalStatus('Memeriksa metadata slot: putaran ' + progress.round + '/2, slot ' +
            progress.slot + '/10.');
        }
      });
      setLocalStatus('Transfer selesai ke slot ' + result.slotNumber + ' (' + result.label + '). Semua ' +
        result.acknowledgedWriteFrames + ' frame tulis mendapat ACK dan nama slot cocok pada dua putaran readback. ' +
        'Perangkat tidak menyediakan readback bobot; coba mainkan model untuk memastikan suara.');
    } catch (error) {
      setLocalStatus('Transfer tidak selesai: ' + (error?.message || error) +
        '. Jika proses sudah mulai menulis, slot mungkin berisi data parsial; periksa perangkat sebelum mengulang.');
    } finally {
      sendButton.disabled = !selectedLocalNamFile || !Native();
      chooseButton.disabled = false;
      slotSelect.disabled = false;
      fileInput.disabled = false;
    }
  });

  if (!Native()) sendButton.disabled = true;
  renderSelection(null);
}

const handledCallbackStates = new Set();
async function processCallback(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch {
    if ($('t3kStatus')) setStatus('Callback TONE3000 tidak terbaca sebagai URL yang valid.');
    return;
  }
  const query = new URLSearchParams(url.search || '');
  const hash = new URLSearchParams(String(url.hash || '').replace(/^#\\??/, ''));
  const param = name => query.get(name) || hash.get(name);
  const code = param('code');
  const state = param('state');
  const toneId = param('tone_id') || param('toneId');
  const error = param('error');
  const errorDescription = param('error_description');
  const canceled = param('canceled') === 'true';
  const isCallback = Boolean(code || state || toneId || error || canceled);
  if (!isCallback) return;
  if (!panelReady && !createPanel()) return;
  if (state && handledCallbackStates.has(state)) return;

  const expected = localStorage.getItem(PREFIX + 'state');
  if (!state || !expected || state !== expected) {
    setStatus('Callback TONE3000 diterima, tetapi parameter state tidak cocok. Proses dihentikan demi keamanan. Buka kembali TONE3000 dari aplikasi.');
    return;
  }
  handledCallbackStates.add(state);
  if (handledCallbackStates.size > 8) {
    handledCallbackStates.delete(handledCallbackStates.values().next().value);
  }

  try {
    if (error) throw new Error(errorDescription || error);
    if (code) await exchangeAuthorizationCode(code);
    localStorage.removeItem(PREFIX + 'state');
    localStorage.removeItem(PREFIX + 'code_verifier');
    if (Native()) {
      try { await Browser.close(); } catch {}
    } else {
      const clean = new URL(window.location.href);
      clean.search = '';
      clean.hash = '';
      history.replaceState({}, document.title, clean.href);
    }
    if (canceled) {
      setStatus('Pemilihan tone dibatalkan. Tidak ada model yang ditulis ke perangkat.');
      return;
    }
    if (toneId) {
      const targetSlot = Number(localStorage.getItem(PREFIX + 'target_slot') || $('t3kTargetSlot')?.value || 0);
      if (Native() && (!Number.isInteger(targetSlot) || targetSlot < 1 || targetSlot > 10)) {
        setStatus('Tone TONE3000 terpilih (ID ' + toneId + '), tetapi slot tujuan tidak ditemukan. Pilih slot 1–10 dan ulangi.');
        return;
      }
      setStatus('Callback berhasil. Memuat tone ' + toneId + ' untuk impor ke slot ' + (targetSlot || '—') + '…');
      await loadSelectedTone(toneId, { autoImportSlot: Native() ? targetSlot : 0 });
    } else {
      setStatus('TONE3000 kembali tanpa tone_id. Login bisa berhasil, tetapi pilihan tone tidak dikirim di callback. Coba ulangi pemilihan tone; jika berulang, periksa redirect URI mg30studio://oauth/callback pada pengaturan API TONE3000.');
    }
  } catch (callbackError) {
    setStatus('Autentikasi/impor TONE3000 gagal: ' + (callbackError?.message || callbackError));
  }
}

async function initTone3000() {
  if (!createPanel()) {
    setTimeout(initTone3000, 250);
    return;
  }
  initLocalNamImport();
  if (Native()) {
    try {
      await App.addListener('appUrlOpen', event => {
        if (event?.url) void processCallback(event.url);
      });
    } catch (error) {
      setStatus('Listener callback Android gagal dipasang: ' + (error?.message || error));
    }
    try {
      const launch = await App.getLaunchUrl();
      if (launch?.url) await processCallback(launch.url);
    } catch (error) {
      console.warn('TONE3000 launch URL check failed', error);
    }
  }
  await processCallback(window.location.href);
  const savedId = localStorage.getItem(PREFIX + 'selected_tone_id');
  if (savedId && localStorage.getItem(PREFIX + 'access_token') && !new URL(window.location.href).search) {
    await loadSelectedTone(savedId);
  }
}

initTone3000();
