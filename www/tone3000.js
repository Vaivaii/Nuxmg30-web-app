import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

const T3K = 'https://www.tone3000.com/api/v1';
const PREFIX = 'mg30-t3k-';
const NativeMidi = registerPlugin('MG30Midi');
const Native = () => Capacitor.isNativePlatform();
const $ = id => document.getElementById(id);
let panelReady = false;
let selectedTone = null;

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
    .t3k-panel button{border:1px solid var(--border,#3a454a);border-radius:10px;padding:10px 13px;background:var(--button,#202a2f);color:inherit;font:inherit;font-weight:650;cursor:pointer}
    .t3k-panel button.primary{background:#c5f36b;border-color:#c5f36b;color:#0b1012}.t3k-panel button:disabled{opacity:.45;cursor:not-allowed}
    .t3k-status{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.035);font-size:.85rem;line-height:1.5;overflow-wrap:anywhere}
    .t3k-tone{display:grid;gap:10px;margin-top:12px}.t3k-card{padding:12px;border-radius:12px;border:1px solid var(--border,#293238);background:rgba(255,255,255,.025)}
    .t3k-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.t3k-card strong{display:block}.t3k-card small{display:block;color:var(--muted,#a6b1b4);margin-top:4px;line-height:1.4}
    .t3k-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.t3k-link{color:#c5f36b;text-decoration:underline}.t3k-warning{border-left:3px solid #c5f36b;padding-left:10px}
    @media(max-width:560px){.t3k-panel{padding:14px}.t3k-form button{width:100%}.t3k-card-head{display:block}}
  `;
  document.head.appendChild(style);
}

function createPanel() {
  const localHeading = [...document.querySelectorAll('.panel h3')]
    .find(node => node.textContent.trim().includes('Profil NAM lokal'));
  if (!localHeading) return false;
  const localPanel = localHeading.closest('.panel');
  if (document.getElementById('tone3000Panel')) return true;

  const panel = document.createElement('section');
  panel.id = 'tone3000Panel';
  panel.className = 'panel t3k-panel';
  panel.innerHTML = `
    <div class="t3k-head">
      <div><h3>TONE3000 · katalog NAM</h3>
      <p>Pilih tone dari katalog TONE3000, baca metadata dan unduh model A2 yang tersedia. Integrasi ini memakai API resmi dengan autentikasi pengguna.</p></div>
      <span class="t3k-mark">API RESMI</span>
    </div>
    <label for="t3kClientId"><small>Publishable key TONE3000</small></label>
    <div class="t3k-form">
      <input id="t3kClientId" type="password" autocomplete="off" spellcheck="false" placeholder="t3k_pub_…">
      <button id="t3kSaveKey" type="button">Simpan key</button>
    </div>
    <div class="t3k-actions">
      <button id="t3kChooseTone" class="primary" type="button">Pilih NAM dari TONE3000</button>
      <button id="t3kSignOut" type="button">Putuskan akun</button>
    </div>
    <div class="t3k-status" id="t3kStatus" role="status" aria-live="polite">Siap. Masukkan publishable key dari pengaturan developer TONE3000 terlebih dahulu.</div>
    <div id="t3kToneDetails" class="t3k-tone"></div>
    <p class="t3k-warning">Catatan kompatibilitas: katalog difilter ke format NAM dan arsitektur A2, tetapi hal itu belum menjamin setiap model sesuai dengan batas A2-Lite pada MG-30 Gen 2 firmware 6.0.5. Pengiriman langsung ke perangkat tetap dikunci sampai payload dan protokol transfer tervalidasi.</p>
    <p><a class="t3k-link" href="https://www.tone3000.com/api" target="_blank" rel="noopener noreferrer">Dokumentasi API TONE3000</a> · <a class="t3k-link" href="https://www.tone3000.com/api/terms" target="_blank" rel="noopener noreferrer">Ketentuan API</a></p>
  `;
  localPanel.insertAdjacentElement('beforebegin', panel);
  stylePanel();
  panelReady = true;

  $('t3kClientId').value = localStorage.getItem(PREFIX + 'client_id') || '';
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
    setStatus('Simpan publishable key TONE3000 yang valid sebelum membuka katalog.');
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
    setStatus('Membuka katalog TONE3000. Setelah memilih tone, aplikasi akan kembali dan memuat metadata model.');
    if (Native()) {
      await Browser.open({ url, presentationStyle: 'fullscreen' });
    } else {
      window.location.assign(url);
    }
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

async function loadSelectedTone(toneId) {
  const id = String(toneId || '').trim();
  if (!/^\d+$/.test(id)) return;
  const holder = $('t3kToneDetails');
  if (!holder) return;
  holder.innerHTML = '';
  setStatus('Memuat metadata tone dan daftar model A2…');
  try {
    const [toneBody, modelBody] = await Promise.all([
      apiJSON('/tones/' + encodeURIComponent(id)),
      apiJSON('/models?tone_id=' + encodeURIComponent(id) + '&architecture=2&page_size=50'),
    ]);
    const tone = toneBody?.data || toneBody?.tone || toneBody;
    const allModels = Array.isArray(modelBody?.data) ? modelBody.data : (Array.isArray(modelBody?.models) ? modelBody.models : []);
    const models = allModels.filter(item => item && item.model_url);
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
      card.innerHTML = '<div class="t3k-card-head"><div><strong>' + safe(fileName) + '</strong><small>Arsitektur: ' + safe(architecture) + ' · Ukuran: ' + safe(size) + '</small></div></div>' +
        '<small>Model URL hanya digunakan untuk unduhan yang diminta pengguna; katalog tidak disalin atau dimirror.</small>' +
        '<div class="t3k-actions"><button class="primary" type="button" data-t3k-save="' + index + '">Simpan model di aplikasi</button>' +
        '<button type="button" disabled title="Menunggu validasi format transfer">Kirim ke MG-30 (menunggu protokol)</button></div>';
      holder.appendChild(card);
    });
    holder.querySelectorAll('[data-t3k-save]').forEach(button => {
      button.addEventListener('click', () => saveModel(Number(button.dataset.t3kSave), button));
    });
    setStatus('Tone siap. Pilih model untuk menyimpan file ke aplikasi. Pengiriman ke perangkat belum diaktifkan karena payload transfer belum tervalidasi.');
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

async function processCallback(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return; }
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const toneId = url.searchParams.get('tone_id');
  const error = url.searchParams.get('error');
  const isCallback = code || state || toneId || error;
  if (!isCallback) return;
  if (!panelReady && !createPanel()) return;

  const expected = localStorage.getItem(PREFIX + 'state');
  if (!state || !expected || state !== expected) {
    setStatus('Callback TONE3000 ditolak karena state tidak cocok. Mulai ulang proses pilih tone.');
    return;
  }
  try {
    if (error) throw new Error(url.searchParams.get('error_description') || error);
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
    if (toneId) await loadSelectedTone(toneId);
    else setStatus('Autentikasi TONE3000 berhasil. Pilih tone dari katalog untuk memuat model.');
  } catch (callbackError) {
    setStatus('Autentikasi TONE3000 gagal: ' + (callbackError?.message || callbackError));
  }
}

async function initTone3000() {
  if (!createPanel()) {
    setTimeout(initTone3000, 250);
    return;
  }
  if (Native()) {
    App.addListener('appUrlOpen', event => processCallback(event?.url));
    try {
      const launch = await App.getLaunchUrl();
      if (launch?.url) await processCallback(launch.url);
    } catch {}
  }
  await processCallback(window.location.href);
  const savedId = localStorage.getItem(PREFIX + 'selected_tone_id');
  if (savedId && localStorage.getItem(PREFIX + 'access_token') && !new URL(window.location.href).search) {
    await loadSelectedTone(savedId);
  }
}

initTone3000();
