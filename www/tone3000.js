import { Capacitor, registerPlugin } from '@capacitor/core';
import { normalizeToneCatalogue, parseToneCatalogue, readToneCatalogue, writeToneCatalogue, selectToneModel } from './tone3000-workspace.js';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { extractMG30A2LiteWeights, buildMG30A2LiteTransferPlan, sendMG30A2LiteTransfer, safeMG30SlotLabel, readMG30NAMSlotNames } from './nam-transfer.js';

const T3K = 'https://www.tone3000.com/api/v1';
const SecureStore = registerPlugin('MG30SecureStore');
const AUTH_FIELDS = ['access_token', 'refresh_token', 'expires_at', 'code_verifier', 'state', 'redirect_uri'];
let oauthData = null;
let oauthDataPromise = null;
const PREFIX = 'mg30-t3k-';
const NativeMidi = registerPlugin('MG30Midi');
const Native = () => Capacitor.isNativePlatform();
const $ = id => document.getElementById(id);
let panelReady = false;
let selectedTone = null;
let selectedModelId = '';
let callbackLoadedTone = false;
const preparedAiNamFiles = new Map();
window.NUXNAMTransfer = Object.freeze({ readMG30NAMSlotNames });

const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// OAuth tokens and transient PKCE secrets are encrypted by the existing Android Keystore plugin.
// The Publishable Key remains public and stays in localStorage as the OAuth client_id.
async function loadOAuthData() {
  if (oauthData) return oauthData;
  if (oauthDataPromise) return oauthDataPromise;
  oauthDataPromise = (async () => {
    const data = {};
    if (Capacitor.isNativePlatform()) {
      const stored = await SecureStore.getSecret({ provider: 'tone3000' });
      if (stored?.configured && stored.value) {
        let parsed;
        try { parsed = JSON.parse(stored.value); } catch { throw new Error('Encrypted TONE3000 session data is invalid. Reconnect TONE3000.'); }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Encrypted TONE3000 session data is invalid. Reconnect TONE3000.');
        Object.assign(data, parsed);
      } else {
        for (const key of AUTH_FIELDS) {
          const legacy = localStorage.getItem(PREFIX + key);
          if (legacy !== null) data[key] = legacy;
        }
        if (Object.keys(data).length) {
          await SecureStore.setSecret({ provider: 'tone3000', value: JSON.stringify(data) });
        }
      }
      // Remove plaintext tokens/PKCE values only after secure storage was read or migration succeeded.
      for (const key of AUTH_FIELDS) localStorage.removeItem(PREFIX + key);
    } else {
      for (const key of AUTH_FIELDS) {
        const value = localStorage.getItem(PREFIX + key);
        if (value !== null) data[key] = value;
      }
    }
    oauthData = data;
    return oauthData;
  })();
  try { return await oauthDataPromise; }
  catch (error) { oauthDataPromise = null; throw error; }
}

function authValue(key) {
  return oauthData?.[key] ?? (!Capacitor.isNativePlatform() ? localStorage.getItem(PREFIX + key) : null);
}

async function saveOAuthData(patch = {}, remove = []) {
  await loadOAuthData();
  const next = { ...oauthData, ...patch };
  for (const key of remove) delete next[key];
  if (Capacitor.isNativePlatform()) {
    if (Object.keys(next).length) {
      await SecureStore.setSecret({ provider: 'tone3000', value: JSON.stringify(next) });
    } else {
      await SecureStore.deleteSecret({ provider: 'tone3000' });
    }
    for (const key of AUTH_FIELDS) localStorage.removeItem(PREFIX + key);
  } else {
    for (const key of remove) localStorage.removeItem(PREFIX + key);
    for (const [key, value] of Object.entries(patch)) localStorage.setItem(PREFIX + key, String(value));
  }
  oauthData = next;
  return oauthData;
}

async function clearOAuthData() {
  await loadOAuthData();
  if (Capacitor.isNativePlatform()) await SecureStore.deleteSecret({ provider: 'tone3000' });
  for (const key of AUTH_FIELDS) localStorage.removeItem(PREFIX + key);
  oauthData = {};
}

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
    .t3k-redirect-note{display:block;margin:-4px 0 12px;color:var(--muted,#a6b1b4);font-size:.75rem;line-height:1.5;overflow-wrap:anywhere}
    .t3k-panel button{border:1px solid var(--border,#3a454a);border-radius:10px;padding:10px 13px;background:var(--button,#202a2f);color:inherit;font:inherit;font-weight:650;cursor:pointer}
    .t3k-panel button.primary{background:#c5f36b;border-color:#c5f36b;color:#0b1012}.t3k-panel button:disabled{opacity:.45;cursor:not-allowed}
    .t3k-status{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.035);font-size:.85rem;line-height:1.5;overflow-wrap:anywhere}
    .t3k-tone{display:grid;gap:10px;margin-top:12px}.t3k-card{padding:12px;border-radius:12px;border:1px solid var(--border,#293238);background:rgba(255,255,255,.025)}
    .t3k-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.t3k-card strong{display:block}.t3k-card small{display:block;color:var(--muted,#a6b1b4);margin-top:4px;line-height:1.4}
    .t3k-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.t3k-link{color:#c5f36b;text-decoration:underline}.t3k-warning{border-left:3px solid #c5f36b;padding-left:10px}
    .t3k-settings-panel{padding:0;overflow:hidden}
    .t3k-settings-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;cursor:pointer;list-style:none}
    .t3k-settings-summary::-webkit-details-marker{display:none}
    .t3k-settings-summary>span:first-child{display:grid;gap:3px}
    .t3k-settings-summary strong{font-size:.96rem}
    .t3k-settings-summary small{color:var(--muted,#a6b1b4);font-size:.78rem;line-height:1.4}
    .t3k-settings-panel[open] .t3k-settings-summary{border-bottom:1px solid var(--border,#293238)}
    .t3k-settings-body{padding:16px 18px}
    .t3k-settings-body>p{margin-top:0}

    .t3k-target-row{align-items:center}.t3k-target-row label{display:block;color:var(--muted,#a6b1b4);font-size:.85rem;font-weight:650}.t3k-target-row select{flex:0 1 210px;max-width:220px}
    @media(max-width:560px){.t3k-panel{padding:14px}.t3k-form button{width:100%}.t3k-card-head{display:block}.t3k-target-row select{flex:1;max-width:none}}
  `;
  document.head.appendChild(style);
}

function createPanel() {
  const localPanel = $('namImportTransferPanel');
  const settingsMount = $('tone3000SettingsMount');
  if (!localPanel || !settingsMount) return false;
  if (document.getElementById('tone3000Panel') && document.getElementById('tone3000SettingsPanel')) return true;

  // The NAM tab only contains the tone picker/import flow. Credentials and
  // redirect configuration live in a collapsed section on the Device tab.
  if (!document.getElementById('tone3000Panel')) {
    const panel = document.createElement('section');
    panel.id = 'tone3000Panel';
    panel.className = 'panel t3k-panel';
    panel.innerHTML = `
      <div class="t3k-head">
        <div><h3>TONE3000 · NAM Import</h3>
        <p>Select an MG-30 target slot, open the TONE3000 catalog, and choose a tone. When you return, the app finds a compatible A2-Lite model and imports it to the MG-30.</p></div>
        <span class="t3k-mark">T3K</span>
      </div>
      <div class="t3k-form t3k-target-row">
        <label for="t3kTargetSlot">MG-30 Target Slot</label>
        <select id="t3kTargetSlot" aria-label="Select a TONE3000 target slot">
          <option value="">Select target slot</option>
          <option value="1">Slot 1</option><option value="2">Slot 2</option><option value="3">Slot 3</option>
          <option value="4">Slot 4</option><option value="5">Slot 5</option><option value="6">Slot 6</option>
          <option value="7">Slot 7</option><option value="8">Slot 8</option><option value="9">Slot 9</option><option value="10">Slot 10</option>
        </select>
      </div>
      <div class="t3k-actions">
        <button id="t3kChooseTone" class="primary" type="button">Choose a Tone from TONE3000</button>
        <button id="t3kRefreshModels" type="button" disabled>Refresh Models</button>
      </div>
      <div class="t3k-status" id="t3kStatus" role="status" aria-live="polite">Ready. Configure your TONE3000 API key in Device → TONE3000 Settings.</div>
      <section id="t3kToneDetails" class="t3k-catalogue" hidden>
        <button id="t3kCatalogueToggle" class="t3k-catalogue-toggle" type="button" aria-expanded="false">
          <span class="t3k-catalogue-title"><strong id="t3kCatalogueTitle">Saved Tone</strong><small id="t3kCatalogueMeta"></small></span>
          <span class="t3k-catalogue-count" id="t3kCatalogueCount">0 MODELS</span>
          <span class="t3k-catalogue-chevron" id="t3kCatalogueChevron" aria-hidden="true">⌄</span>
        </button>
        <div id="t3kModelList" class="t3k-model-list" hidden></div>
      </section>
      <p class="t3k-warning">Importing NAM will overwrite the target slot. Back up the existing model before continuing.</p>
    `;
    localPanel.insertAdjacentElement('afterend', panel);
  }

  if (!document.getElementById('tone3000SettingsPanel')) {
    const settings = document.createElement('details');
    settings.id = 'tone3000SettingsPanel';
    settings.className = 'panel t3k-panel t3k-settings-panel';
    settings.innerHTML = `
      <summary class="t3k-settings-summary">
        <span><strong>TONE3000 Settings</strong><small>Publishable key and Redirect URI · hidden when collapsed</small></span>
        <span class="t3k-mark">API</span>
      </summary>
      <div class="t3k-settings-body">
        <p>This only needs to be configured once. Use a publishable key, not a Secret Key. The key is stored locally on this device and the field is always masked.</p>
        <label for="t3kClientId"><small>Publishable key TONE3000</small></label>
        <div class="t3k-form">
          <input id="t3kClientId" type="password" autocomplete="off" spellcheck="false" placeholder="t3k_pub_…" aria-label="Publishable key TONE3000">
          <button id="t3kSaveKey" type="button">Save Key</button>
        </div>
        <label for="t3kRedirectUri"><small>Redirect URI Android</small></label>
        <div class="t3k-form">
          <select id="t3kRedirectUri" aria-label="Select a Redirect URI registered with TONE3000">
            <option value="tone3000-example://oauth/callback">tone3000-example://oauth/callback</option>
            <option value="mg30studio://oauth/callback">mg30studio://oauth/callback</option>
          </select>
        </div>
        <small class="t3k-redirect-note">This URI must exactly match one of the URIs registered in TONE3000 → Settings → API Keys.</small>
        <div class="t3k-actions">
          <button id="t3kSignOut" type="button">Disconnect TONE3000 Account</button>
        </div>
        <p><a class="t3k-link" href="https://www.tone3000.com/api" target="_blank" rel="noopener noreferrer">TONE3000 API Documentation</a> · <a class="t3k-link" href="https://www.tone3000.com/api/terms" target="_blank" rel="noopener noreferrer">API Terms</a></p>
      </div>
    `;
    settingsMount.appendChild(settings);
  }

  stylePanel();
  panelReady = true;

  $('t3kClientId').value = localStorage.getItem(PREFIX + 'client_id') || '';
  $('t3kRedirectUri').value = localStorage.getItem(PREFIX + 'redirect_uri_config') || 'tone3000-example://oauth/callback';
  $('t3kRedirectUri').addEventListener('change', () => {
    const uri = $('t3kRedirectUri').value;
    localStorage.setItem(PREFIX + 'redirect_uri_config', uri);
    setStatus('Selected Redirect URI: ' + uri + '. Make sure this exact URI is registered for your TONE3000 API key.');
  });
  $('t3kTargetSlot').value = localStorage.getItem(PREFIX + 'target_slot') || '';
  $('t3kTargetSlot').addEventListener('change', () => {
    const slot = Number($('t3kTargetSlot').value || 0);
    if (Number.isInteger(slot) && slot >= 1 && slot <= 10) localStorage.setItem(PREFIX + 'target_slot', String(slot));
    else localStorage.removeItem(PREFIX + 'target_slot');
  });
  $('t3kSaveKey').addEventListener('click', () => {
    const key = $('t3kClientId').value.trim();
    if (!/^t3k_pub_[A-Za-z0-9_-]+$/.test(key)) {
      setStatus('Enter a publishable key in the format t3k_pub_… . Do not enter a client secret.');
      return;
    }
    localStorage.setItem(PREFIX + 'client_id', key);
    setStatus('Publishable key saved. Return to the NAM tab to choose a tone.');
  });
  $('t3kChooseTone').addEventListener('click', startSelectFlow);
  $('t3kRefreshModels').addEventListener('click', () => {
    const toneId = selectedTone?.id || localStorage.getItem(PREFIX + 'selected_tone_id');
    if (toneId) void loadSelectedTone(toneId, { expand: true });
  });
  $('t3kCatalogueToggle').addEventListener('click', () => {
    const expanded = $('t3kCatalogueToggle').getAttribute('aria-expanded') === 'true';
    setCatalogueExpanded(!expanded);
  });
  $('t3kSignOut').addEventListener('click', () => { void signOut().catch(error => setStatus('Could not disconnect TONE3000: ' + (error?.message || error))); });
  void updateAccountStatus();
  return true;
}

function setStatus(message) {
  const node = $('t3kStatus');
  if (node) node.textContent = String(message || '');
}

async function updateAccountStatus() {
  try {
    await loadOAuthData();
    if (authValue('access_token') && $('t3kStatus')) {
      setStatus('Your TONE3000 account is connected on this device. You can choose an A2 tone or reload the details of the tone you last selected.');
    }
  } catch (error) {
    setStatus('Secure TONE3000 session storage is unavailable: ' + (error?.message || error));
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
  if (Native()) {
    return localStorage.getItem(PREFIX + 'redirect_uri_config') ||
      'tone3000-example://oauth/callback';
  }
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return url.href;
}

async function startSelectFlow(options = {}) {
  const clientId = (localStorage.getItem(PREFIX + 'client_id') || $('t3kClientId')?.value || '').trim();
  if (!/^t3k_pub_[A-Za-z0-9_-]+$/.test(clientId)) {
    setStatus('Enter a valid TONE3000 publishable key before opening the catalog.');
    return;
  }
  const targetSlot = Number($('t3kTargetSlot')?.value || localStorage.getItem(PREFIX + 'target_slot') || 0);
  if (Number.isInteger(targetSlot) && targetSlot >= 1 && targetSlot <= 10) {
    localStorage.setItem(PREFIX + 'target_slot', String(targetSlot));
  }
  try {
    $('t3kChooseTone').disabled = true;
    await loadOAuthData();
    setStatus('Preparing TONE3000 authentication…');
    const verifier = makeRandomToken();
    const state = makeRandomToken();
    const challenge = await sha256Base64Url(verifier);
    const redirectUri = getRedirectUri();
    localStorage.setItem(PREFIX + 'client_id', clientId);
    const gears = options.gear === 'amp' ? 'amp' : options.gear === 'amp-cab' ? 'amp-cab' : 'amp-cab';
    await saveOAuthData({ code_verifier: verifier, state, redirect_uri: redirectUri });
    localStorage.setItem(PREFIX + 'gear_filter', gears);
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
      gears,
      menubar: 'true',
      locale: 'en',
    });
    const url = 'https://www.tone3000.com/api/v1/oauth/authorize?' + params.toString();
    setStatus('Opening TONE3000 with redirect URI ' + redirectUri + '. After you select a tone, the app will return and import the compatible model into slot ' + (targetSlot || 'the selected slot') + '. Make sure this exact URI is registered for your API key.');
    if (Native()) await Browser.open({ url, presentationStyle: 'fullscreen' });
    else window.location.assign(url);
    return true;
  } catch (error) {
    setStatus('Could not open TONE3000: ' + (error?.message || error));
    return false;
  } finally {
    if ($('t3kChooseTone')) $('t3kChooseTone').disabled = false;
  }
}


async function exchangeAuthorizationCode(code) {
  await loadOAuthData();
  const clientId = localStorage.getItem(PREFIX + 'client_id');
  const verifier = authValue('code_verifier');
  const redirectUri = authValue('redirect_uri');
  if (!clientId || !verifier || !redirectUri) throw new Error('PKCE data is incomplete. Start the tone selection flow again.');
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
  await storeTokens(body);
}

async function storeTokens(body) {
  await loadOAuthData();
  const refreshToken = body?.refresh_token || authValue('refresh_token');
  if (!body?.access_token || !refreshToken) throw new Error('The TONE3000 response did not include the required tokens.');
  await saveOAuthData({
    access_token: body.access_token,
    refresh_token: refreshToken,
    expires_at: String(Date.now() + Number(body.expires_in || 3600) * 1000),
  });
}

async function signOut() {
  await clearOAuthData();
  setStatus('TONE3000 account disconnected. Your saved tone and model list remain on this device.');
}

async function ensureAccessToken() {
  await loadOAuthData();
  let accessToken = authValue('access_token');
  const expiresAt = Number(authValue('expires_at') || 0);
  if (accessToken && Date.now() < expiresAt - 60_000) return accessToken;

  const refreshToken = authValue('refresh_token');
  const clientId = localStorage.getItem(PREFIX + 'client_id');
  if (!refreshToken || !clientId) throw new Error('Your TONE3000 session is inactive. Select a tone to sign in again.');
  const response = await fetch(T3K + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (body.error === 'invalid_grant') await signOut();
    throw new Error(body.error_description || body.error || ('Refresh token HTTP ' + response.status));
  }
  await storeTokens(body);
  accessToken = body.access_token;
  return accessToken;
}

async function apiJSON(path) {
  const token = await ensureAccessToken();
  const response = await fetch(T3K + path, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) throw new Error('TONE3000 API search rate limit reached. Wait briefly and try again; no pedal changes were made.');
    if (response.status === 401 || response.status === 403) throw new Error('TONE3000 authorization was rejected. Reconnect your account from the existing TONE3000 settings.');
    throw new Error(body.error_description || body.message || body.error || ('API HTTP ' + response.status));
  }
  return body;
}

function extractToneModels(body) {
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.models)) return body.models;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  return [];
}

async function fetchAllToneModels(toneId) {
  const pageSize = 50, collected = [], seen = new Set();
  for (let page = 1; page <= 20; page++) {
    const response = await apiJSON('/models?tone_id=' + encodeURIComponent(toneId) +
      '&architecture=2&page=' + page + '&page_size=' + pageSize);
    const rows = extractToneModels(response);
    let added = 0;
    rows.forEach((model, index) => {
      if (!model || typeof model !== 'object') return;
      const key = String(model.id ?? model.model_id ?? model.uuid ?? model.slug ??
        model.model_url ?? model.modelUrl ?? (String(model.name || '') + ':' + page + ':' + index));
      if (seen.has(key)) return;
      seen.add(key);
      collected.push(model);
      added++;
    });
    const totalPages = Number(response?.meta?.total_pages || response?.pagination?.total_pages ||
      response?.data?.meta?.total_pages || 0);
    if (rows.length < pageSize || added === 0 || (totalPages > 0 && page >= totalPages)) break;
  }
  return collected;
}

function extractToneRows(body) {
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.tones)) return body.tones;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  return [];
}

const aiToneSearchCache = new Map();
async function searchTone3000ForAI(query, gear = 'amp-cab') {
  const text = String(query || '').trim().replace(/\\s+/g, ' ').slice(0, 160);
  if (text.length < 2) throw new Error('Enter an amplifier name or tone description in the prompt before searching TONE3000.');
  if (gear !== 'amp' && gear !== 'amp-cab') throw new Error('Choose Amp Only or Amp + Cab before searching.');
  const cacheKey = gear + '|' + text.toLowerCase();
  const cached = aiToneSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 60_000) return cached.rows;
  const params = new URLSearchParams({
    query: text, page: '1', page_size: '12', sort: 'best-match',
    gears: gear, sizes: 'lite', format: 'nam', architecture: '2',
  });
  const body = await apiJSON('/tones/search?' + params.toString());
  const rows = extractToneRows(body).map(tone => {
    const user = tone?.user?.username || tone?.creator?.username || tone?.username ||
      (typeof tone?.creator === 'string' ? tone.creator : '');
    return {
      id: String(tone?.id ?? tone?.tone_id ?? ''),
      name: String(tone?.title || tone?.name || tone?.tone_name || 'Untitled tone'),
      creator: String(user || ''),
      description: String(tone?.description || ''),
      makes: Array.isArray(tone?.makes) ? tone.makes.slice(0, 5).map(item => String(item?.name || item)) : [],
      tags: Array.isArray(tone?.tags) ? tone.tags.slice(0, 6).map(item => String(item?.name || item)) : [],
      sizes: Array.isArray(tone?.sizes) ? tone.sizes.map(item => String(item?.name || item)) : [],
      format: String(tone?.format || 'nam'),
      a2ModelsCount: Number(tone?.a2_models_count ?? tone?.models_count ?? 0),
      gear: String(tone?.gear || gear),
    };
  }).filter(tone => /^\\d+$/.test(tone.id));
  aiToneSearchCache.set(cacheKey, { time: Date.now(), rows });
  if (aiToneSearchCache.size > 20) aiToneSearchCache.delete(aiToneSearchCache.keys().next().value);
  return rows;
}

async function loadTone3000ForAI(toneId, options = {}) {
  const id = String(toneId || '').trim();
  if (!/^\\d+$/.test(id)) throw new Error('The selected TONE3000 tone ID is invalid.');
  const snapshot = await loadSelectedTone(id, { expand: true, silent: options.silent === true });
  if (!snapshot || !Array.isArray(snapshot.models)) throw new Error('TONE3000 did not return its A2 NAM model list.');
  return snapshot;
}

function saveWorkspaceSnapshot(snapshot) {
  if (!snapshot) return false;
  const selected = selectedModelId && snapshot.models.some(model => model.id === selectedModelId)
    ? selectedModelId : (snapshot.selectedModelId || snapshot.models[0]?.id || '');
  const next = { ...snapshot, selectedModelId: selected };
  const saved = writeToneCatalogue(localStorage, next);
  if (saved) {
    localStorage.setItem(PREFIX + 'selected_tone_id', next.toneId);
    if (selected) localStorage.setItem(PREFIX + 'selected_model_id', selected);
  }
  return saved;
}

function setCatalogueExpanded(expanded, persist = true) {
  const root = $('t3kToneDetails'), toggle = $('t3kCatalogueToggle'), list = $('t3kModelList');
  if (!root || !toggle || !list || root.hidden) return;
  const open = Boolean(expanded);
  root.classList.toggle('is-expanded', open);
  toggle.setAttribute('aria-expanded', String(open));
  list.hidden = !open;
  if ($('t3kCatalogueChevron')) $('t3kCatalogueChevron').textContent = open ? '⌃' : '⌄';
  if (persist) localStorage.setItem(PREFIX + 'catalogue_expanded', open ? '1' : '0');
}

function rememberSelectedModel(modelId) {
  if (!selectedTone) return false;
  const base = {
    version: 1,
    toneId: selectedTone.id,
    tone: {
      name: selectedTone.tone?.name || selectedTone.tone?.title || '',
      creator: selectedTone.tone?.username || selectedTone.tone?.creator || '',
      description: selectedTone.tone?.description || '',
    },
    models: selectedTone.models,
    selectedModelId,
    updatedAt: Date.now(),
  };
  const next = selectToneModel(base, String(modelId));
  if (!next) return false;
  selectedModelId = next.selectedModelId;
  saveWorkspaceSnapshot(next);
  renderToneCatalogue(next, { expand: true, persist: false });
  return true;
}

function renderToneCatalogue(snapshot, options = {}) {
  const root = $('t3kToneDetails'), list = $('t3kModelList');
  const normalized = parseToneCatalogue(snapshot);
  if (!root || !list || !normalized) return;
  const savedToneId = localStorage.getItem(PREFIX + 'selected_tone_id');
  const previous = savedToneId === normalized.toneId
    ? localStorage.getItem(PREFIX + 'selected_model_id')
    : normalized.selectedModelId;
  selectedModelId = normalized.models.some(model => model.id === previous)
    ? previous : (normalized.selectedModelId || normalized.models[0]?.id || '');
  selectedTone = {
    id: normalized.toneId,
    tone: { name: normalized.tone.name, username: normalized.tone.creator, description: normalized.tone.description },
    models: normalized.models,
  };
  root.hidden = false;
  $('t3kCatalogueTitle').textContent = normalized.tone.name;
  $('t3kCatalogueMeta').textContent = 'TONE3000 ID ' + normalized.toneId +
    (normalized.tone.creator ? ' · Creator: ' + normalized.tone.creator : '');
  $('t3kCatalogueCount').textContent = normalized.models.length + ' MODELS';
  $('t3kRefreshModels').disabled = false;
  const listHeader = '<div class="t3k-list-toolbar"><span><strong>Available Models</strong><small>' +
    safe(normalized.tone.name) + '</small></span><button id="t3kCatalogueClose" type="button">Hide</button></div>';
  if (!normalized.models.length) {
    list.innerHTML = listHeader + '<div class="t3k-card"><small>No models were returned for this tone.</small></div>';
  } else {
    list.innerHTML = listHeader + normalized.models.map((model, index) => {
      const selected = model.id === selectedModelId;
      const size = typeof model.size === 'number' ? model.size + ' bytes' : (model.size || 'Size unavailable');
      const architecture = model.architecture_version ?? model.architecture ?? 'A2';
      return '<article class="t3k-card' + (selected ? ' is-selected' : '') + '" data-t3k-model-card="' + safe(model.id) + '">' +
        '<div class="t3k-card-head"><div><strong>' + safe(model.name) + '</strong><small>' +
        safe(architecture) + ' · ' + safe(size) + '</small></div>' +
        (selected ? '<span class="t3k-mark">SELECTED</span>' : '') + '</div>' +
        '<div class="t3k-actions">' +
        '<button type="button" data-t3k-select="' + safe(model.id) + '"' +
        (selected ? ' disabled' : '') + '>' + (selected ? 'Selected' : 'Select Model') + '</button>' +
        '<button class="primary" type="button" data-t3k-send="' + index + '"' +
        (model.model_url ? '' : ' disabled title="No downloadable file URL"') + '>Download &amp; Import</button>' +
        '<button type="button" data-t3k-save="' + index + '"' +
        (model.model_url ? '' : ' disabled title="No downloadable file URL"') + '>Download Only</button>' +
        '</div>' + (model.model_url ? '' : '<small>Download unavailable for this model.</small>') + '</article>';
    }).join('');
  }
  const closeCatalogue = $('t3kCatalogueClose');
  if (closeCatalogue) closeCatalogue.addEventListener('click', () => setCatalogueExpanded(false));
  list.querySelectorAll('[data-t3k-select]').forEach(button => {
    button.addEventListener('click', () => {
      if (rememberSelectedModel(button.dataset.t3kSelect)) setStatus('Selected model saved. Choose Download & Import when ready.');
    });
  });
  list.querySelectorAll('[data-t3k-send]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.t3kSend), model = selectedTone?.models?.[index];
      if (model) rememberSelectedModel(model.id);
      const activeButton = list.querySelector('[data-t3k-send="' + index + '"]');
      void sendModel(index, activeButton);
    });
  });
  list.querySelectorAll('[data-t3k-save]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.t3kSave), model = selectedTone?.models?.[index];
      if (model) rememberSelectedModel(model.id);
      const activeButton = list.querySelector('[data-t3k-save="' + index + '"]');
      void saveModel(index, activeButton);
    });
  });
  const expanded = options.expand ?? localStorage.getItem(PREFIX + 'catalogue_expanded') === '1';
  setCatalogueExpanded(expanded, options.persist !== false);
  if (options.persist !== false) saveWorkspaceSnapshot({ ...normalized, selectedModelId });
}

function restoreCachedCatalogue() {
  const cached = readToneCatalogue(localStorage);
  if (!cached) return null;
  const storedId = localStorage.getItem(PREFIX + 'selected_model_id');
  const snapshot = storedId ? (selectToneModel(cached, storedId) || cached) : cached;
  renderToneCatalogue(snapshot, {
    expand: localStorage.getItem(PREFIX + 'catalogue_expanded') === '1',
    persist: false,
  });
  return snapshot;
}

async function loadSelectedTone(toneId, options = {}) {
  const id = String(toneId || '').trim();
  if (!/^\d+$/.test(id)) return;
  const cached = readToneCatalogue(localStorage);
  const matchingCache = cached?.toneId === id ? cached : null;
  if (matchingCache && !options.silent) renderToneCatalogue(matchingCache, { expand: options.expand ?? false, persist: false });
  if (!options.silent) setStatus('Loading tone details and all available models…');
  try {
    const [toneBody, models] = await Promise.all([
      apiJSON('/tones/' + encodeURIComponent(id) + '?architecture=2'),
      fetchAllToneModels(id),
    ]);
    const tone = toneBody?.data || toneBody?.tone || toneBody;
    const snapshot = normalizeToneCatalogue(id, tone, models);
    const previousToneId = localStorage.getItem(PREFIX + 'selected_tone_id');
    const previous = previousToneId === id ? localStorage.getItem(PREFIX + 'selected_model_id') : '';
    if (previous && snapshot.models.some(model => model.id === previous)) snapshot.selectedModelId = previous;
    selectedModelId = snapshot.selectedModelId;
    saveWorkspaceSnapshot(snapshot);
    if (options.silent) {
      selectedTone = { id: snapshot.toneId, tone: { name: snapshot.tone.name, username: snapshot.tone.creator, description: snapshot.tone.description }, models: snapshot.models };
      selectedModelId = snapshot.selectedModelId || '';
    } else {
      renderToneCatalogue(snapshot, { expand: options.expand ?? true, persist: true });
      window.dispatchEvent(new CustomEvent('mg30-tone3000-catalogue-loaded', { detail: {
        toneId: snapshot.toneId, tone: snapshot.tone,
        models: snapshot.models.map(model => ({ id: model.id, name: model.name,
          architecture: model.architecture, architecture_version: model.architecture_version,
          size: model.size, description: model.description, downloadable: Boolean(model.model_url) }))
      }}));
      setStatus(snapshot.models.length
        ? snapshot.models.length + ' models loaded in MG30 Studio. Select a model and choose Download & Import.'
        : 'Tone loaded, but no downloadable models were returned by the TONE3000 API.');
    }
    return snapshot;
  } catch (error) {
    if (matchingCache) {
      if (options.silent) {
        selectedTone = { id: matchingCache.toneId, tone: { name: matchingCache.tone.name, username: matchingCache.tone.creator, description: matchingCache.tone.description }, models: matchingCache.models };
        selectedModelId = matchingCache.selectedModelId || '';
      } else {
        renderToneCatalogue(matchingCache, { expand: options.expand ?? false, persist: false });
        setStatus('Could not refresh TONE3000. Your saved model list is still available; reconnect and select Refresh Models to try again. ' + (error?.message || error));
      }
      return matchingCache;
    }
    if (!options.silent) setStatus('Failed to load tone/models: ' + (error?.message || error));
    throw error;
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
    setStatus('The model URL is unavailable for this selection.');
    return;
  }
  if (button) { button.disabled = true; button.textContent = 'Downloading…'; }
  try {
    const token = await ensureAccessToken();
    const response = await fetch(model.model_url, { headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) throw new Error('Model download HTTP ' + response.status);
    const blob = await response.blob();
    if (!blob.size) throw new Error('The downloaded model file is empty.');
    let fileName = String(model.name || '').trim() || ('tone-' + selectedTone.id + '-model-' + (index + 1) + '.nam');
    fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    if (!/\.(nam|namb|image)$/i.test(fileName)) fileName += '.nam';

    if (Native()) {
      const base64 = toBase64(await blob.arrayBuffer());
      const result = await NativeMidi.saveModel({ fileName, base64 });
      window.dispatchEvent(new Event('mg30-nam-library-updated'));
      setStatus('Model saved to NAM Library: ' + result.fileName + ' (' + result.bytes + ' bytes). It is stored locally and can be imported again at any time.');
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
      setStatus('Download started: ' + fileName + '. On the Android APK, use Download Only to save models in the persistent NAM Library.');
    }
  } catch (error) {
    setStatus('Failed to save model: ' + (error?.message || error));
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Download Only'; }
  }
}

async function sendModel(index, button, options = {}) {
  const model = selectedTone?.models?.[index];
  if (!model?.model_url) { setStatus('The model download URL is not available.'); return false; }
  if (!Native()) { setStatus('Direct import is available only in the Android APK with USB OTG.'); return false; }
  const slotNumber = Number(options.slotNumber ?? ($('t3kTargetSlot')?.value || localStorage.getItem(PREFIX + 'target_slot') || 0));
  if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 10) {
    setStatus('Select an MG-30 target slot from 1 to 10.');
    $('t3kTargetSlot')?.focus();
    return false;
  }
  const rawLabel = String(model.name || ('TONE3000 tone ' + selectedTone.id + ' model ' + (index + 1)))
    .replace(/\.(nam|namb)$/i, '').trim();
  if (!options.confirmed && !window.confirm(
    'Import "' + rawLabel + '" to MG-30 slot ' + slotNumber +
    '? This will overwrite the slot. Make sure the existing model is backed up.'
  )) {
    setStatus('Import canceled. No model was written to slot ' + slotNumber + '.');
    return false;
  }
  if (button) { button.disabled = true; button.textContent = 'Downloading & importing…'; }
  const slotControl = $('t3kTargetSlot');
  if (slotControl) slotControl.disabled = true;
  try {
    let modelBytes = options.modelBytes || null;
    if (!modelBytes) {
      setStatus('Downloading the selected model from TONE3000…');
      const token = await ensureAccessToken();
      const response = await fetch(model.model_url, { headers: { Authorization: 'Bearer ' + token } });
      if (!response.ok) throw new Error('Model download HTTP ' + response.status);
      const blob = await response.blob();
      if (!blob.size) throw new Error('The downloaded model file is empty.');
      modelBytes = await blob.arrayBuffer();
    }
    const weightBytes = extractMG30A2LiteWeights(modelBytes);
    const plan = buildMG30A2LiteTransferPlan(weightBytes, rawLabel, slotNumber);
    let fileName = String(model.name || ('tone-' + selectedTone.id + '-model-' + (index + 1) + '.nam')).trim();
    fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    if (!/\.(nam|namb|image)$/i.test(fileName)) fileName += '.nam';
    const saved = await NativeMidi.saveModel({ fileName, base64: toBase64(modelBytes) });
    window.dispatchEvent(new Event('mg30-nam-library-updated'));
    setStatus('A2-Lite model validated (' + weightBytes.length + ' weight bytes) and saved in NAM Library as ' +
      saved.fileName + '. Connecting to USB-MIDI…');
    const connection = options.connection || await window.NUXNativeMidi.connect();
    const result = await sendMG30A2LiteTransfer(connection, plan, progress => {
      if (progress.stage === 'write') setStatus('Transfer to slot ' + slotNumber + ': ACK frame ' +
        progress.completed + '/' + progress.total + ' (' + progress.label + '). Do not disconnect USB OTG.');
      else if (progress.stage === 'retry') setStatus('ACK not received for ' + progress.label +
        '; retry ' + progress.attempt + '. Do not disconnect USB OTG.');
      else if (progress.stage === 'readback') setStatus('Model data sent. Reading device slot names: pass ' +
        progress.round + '/2, slot ' + progress.slot + '/10.');
    });
    window.dispatchEvent(new CustomEvent('mg30-nam-names-sync', { detail: { slots: result.slots, source: 'transfer' } }));
    setStatus('Import complete to slot ' + result.slotNumber + ' (' + result.label + '). All ' +
      result.acknowledgedWriteFrames + ' write frames received ACKs and the slot name synced from the MG-30. ' +
      'The protocol does not read back model weights, so verify the sound on the device.');
    return true;
  } catch (error) {
    setStatus('Import did not complete: ' + (error?.message || error) +
      '. If writing already started, the slot may contain partial data; check the device before retrying.');
    return false;
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Download & Import'; }
    if (slotControl) slotControl.disabled = false;
  }
}


function getTone3000CatalogueForAI() {
  if (!selectedTone) return null;
  return {
    toneId: selectedTone.id,
    tone: { ...selectedTone.tone },
    models: selectedTone.models.map(model => ({
      id: model.id, name: model.name, architecture: model.architecture,
      architecture_version: model.architecture_version, size: model.size,
      description: model.description, downloadable: Boolean(model.model_url),
    })),
  };
}

async function prepareTone3000ModelForAI(modelId) {
  if (!Native()) throw new Error('Automatic NAM download and validation require the MG30 Studio Android APK.');
  const index = selectedTone?.models?.findIndex(model => String(model.id) === String(modelId)) ?? -1;
  if (index < 0) throw new Error('The selected TONE3000 model is no longer in the current catalogue.');
  const model = selectedTone.models[index];
  if (!model?.model_url) throw new Error('The selected TONE3000 model has no downloadable NAM file.');
  const cacheKey = String(selectedTone.id) + ':' + String(model.id);
  if (preparedAiNamFiles.has(cacheKey)) {
    const cached = preparedAiNamFiles.get(cacheKey);
    return { toneId: selectedTone.id, modelId: model.id, modelName: model.name, bytes: cached.modelBytes.byteLength, weightBytes: cached.weightBytes.length, cached: true };
  }
  setStatus('Downloading and validating ' + (model.name || 'the A2-Lite NAM') + ' in the background…');
  const token = await ensureAccessToken();
  const response = await fetch(model.model_url, { headers: { Authorization: 'Bearer ' + token } });
  if (!response.ok) throw new Error('TONE3000 model download HTTP ' + response.status);
  const blob = await response.blob();
  if (!blob.size || blob.size > 20 * 1024 * 1024) throw new Error('The NAM download is empty or exceeds the 20 MB safety limit.');
  const modelBytes = await blob.arrayBuffer();
  const weightBytes = extractMG30A2LiteWeights(modelBytes);
  const label = String(model.name || ('tone-' + selectedTone.id + '-model-' + (index + 1))).replace(/\\.(nam|namb)$/i, '').trim();
  buildMG30A2LiteTransferPlan(weightBytes, label, 10);
  preparedAiNamFiles.set(cacheKey, { modelBytes, weightBytes, toneId: selectedTone.id, modelId: model.id });
  return { toneId: selectedTone.id, modelId: model.id, modelName: model.name, bytes: modelBytes.byteLength, weightBytes: weightBytes.length, cached: false };
}

async function importTone3000ModelForAI(modelId, options = {}) {
  const slotNumber = Number(options.slotNumber ?? 10);
  if (slotNumber !== 10) throw new Error('The AI NAM destination is locked to MG-30 slot 10.');
  if (!Native() || !window.NUXNativeMidi?.connect) throw new Error('AI NAM import requires the Android APK and USB OTG connection to MG-30.');
  const index = selectedTone?.models?.findIndex(model => String(model.id) === String(modelId)) ?? -1;
  if (index < 0) throw new Error('The selected TONE3000 model is no longer in the current catalogue.');
  const model = selectedTone.models[index];
  if (!model?.model_url) throw new Error('The selected TONE3000 model has no downloadable NAM file.');
  const cacheKey = String(selectedTone.id) + ':' + String(model.id);
  let prepared = preparedAiNamFiles.get(cacheKey);
  if (!prepared && options.prepare !== false) {
    await prepareTone3000ModelForAI(modelId);
    prepared = preparedAiNamFiles.get(cacheKey);
  }

  const connection = await window.NUXNativeMidi.connect();
  const scan = await readMG30NAMSlotNames(connection, progress => {
    window.dispatchEvent(new CustomEvent('mg30-ai-nam-progress', { detail: progress }));
  });
  const slot = scan.slots.find(row => row.slotNumber === 10);
  if (!slot?.received) throw new Error('Could not verify the current metadata of slot 10. No NAM data was written. Reconnect and read the NAM slots again.');
  const currentName = slot.nameAvailable ? slot.name : 'No readable NAM name';
  if (options.confirmOverwrite !== false && !window.confirm(
    'AI NAM destination: slot 10.\nCurrent device label: ' + currentName +
    '\nNew model: ' + (model.name || 'TONE3000 NAM') +
    '\n\nThis will overwrite slot 10. Continue?'
  )) {
    preparedAiNamFiles.delete(cacheKey);
    return { cancelled: true, slotNumber: 10, currentName };
  }

  const imported = await sendModel(index, null, {
    confirmed: true, connection, slotNumber: 10,
    ...(prepared?.modelBytes ? { modelBytes: prepared.modelBytes } : {}),
  });
  if (!imported) throw new Error('NAM transfer did not complete. Check the TONE3000 status and device before retrying.');
  preparedAiNamFiles.delete(cacheKey);
  return { success: true, slotNumber: 10, currentName, modelName: model.name, toneId: selectedTone.id };
}

window.NUXTONE3000Bridge = Object.freeze({
  async hasSession() { await loadOAuthData(); return Boolean(authValue('access_token') || authValue('refresh_token')); },
  async startSelection(options = {}) {
    const gear = options.gear;
    if (gear !== 'amp' && gear !== 'amp-cab') throw new Error('Choose Amp Only or Amp + Cab before opening TONE3000.');
    const started = await startSelectFlow({ gear });
    if (!started) throw new Error('TONE3000 did not open. Check the Publishable Key and registered Redirect URI.');
    return { started: true, gear };
  },
  getCatalogue: getTone3000CatalogueForAI,
  async searchTones(query, options = {}) { return searchTone3000ForAI(query, options.gear); },
  async loadTone(toneId, options = {}) { return loadTone3000ForAI(toneId, options); },
  async prepareModel(modelId) { return prepareTone3000ModelForAI(modelId); },
  async importModel(modelId, options = {}) { return importTone3000ModelForAI(modelId, options); },
});

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
    fileTitle.textContent = file ? file.name : 'Choose a NAM file to send';
    fileMeta.textContent = file ? (file.size.toLocaleString() + ' bytes · file read locally on this device') :
      'Supported formats: .nam (JSON SlimmableContainer) and .namb (A2-Lite, 1,871 weights)';
  };

  chooseButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    selectedLocalNamFile = null;
    sendButton.disabled = true;
    if (!file) {
      renderSelection(null);
      setLocalStatus('No file selected.');
      return;
    }
    renderSelection(file);
    if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
      setLocalStatus('The file is empty or too large to process.');
      fileInput.value = '';
      return;
    }
    try {
      setLocalStatus('Checking A2-Lite architecture and weights…');
      const bytes = await file.arrayBuffer();
      const weightBytes = extractMG30A2LiteWeights(bytes);
      selectedLocalNamFile = {
        file,
        bytes,
        weightBytes,
        label: safeMG30SlotLabel(file.name),
      };
      sendButton.disabled = !Native();
      setLocalStatus('Valid: A2-Lite, 1.871 weights (' + weightBytes.length.toLocaleString() +
        ' bytes). ' + (Native()
          ? 'Select a target slot and tap Send NAM to MG-30.'
          : 'The file can be inspected in a browser, but transfers are available only in the Android APK through USB OTG.'));
    } catch (error) {
      selectedLocalNamFile = null;
      sendButton.disabled = true;
      setLocalStatus('The file is not compatible with MG-30 Gen 2 A2-Lite: ' + (error?.message || error));
    }
  });

  sendButton.addEventListener('click', async () => {
    const selected = selectedLocalNamFile;
    const slotNumber = Number(slotSelect.value || 0);
    if (!selected) {
      setLocalStatus('Select and validate a NAM file first.');
      return;
    }
    if (!Native() || !window.NUXNativeMidi) {
      setLocalStatus('Direct transfer requires the Android APK and a USB OTG connection to the MG-30.');
      return;
    }
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 10) {
      setLocalStatus('Select a target slot from 1–10.');
      return;
    }
    const fileName = selected.file.name.replace(/[\\/:*?"<>|]/g, '_');
    if (!window.confirm('Send "' + selected.label + '" to MG-30 slot ' + slotNumber +
      '? The existing model in this slot will be overwritten. Back it up first or use a test slot.')) return;

    sendButton.disabled = true;
    chooseButton.disabled = true;
    slotSelect.disabled = true;
    fileInput.disabled = true;
    try {
      setLocalStatus('Saving a model copy and preparing the transfer…');
      await NativeMidi.saveModel({ fileName, base64: toBase64(selected.bytes) });
      const plan = buildMG30A2LiteTransferPlan(selected.weightBytes, selected.label, slotNumber);
      const connection = await window.NUXNativeMidi.connect();
      const result = await sendMG30A2LiteTransfer(connection, plan, progress => {
        if (progress.stage === 'write') {
          setLocalStatus('Slot ' + slotNumber + ': ACK ' + progress.completed + '/' + progress.total +
            ' · ' + progress.label + '. Do not disconnect USB OTG.');
        } else if (progress.stage === 'retry') {
          setLocalStatus('ACK not received for ' + progress.label +
            '; retry attempt ' + progress.attempt + '. Do not disconnect USB OTG.');
        } else if (progress.stage === 'readback') {
          setLocalStatus('Checking slot metadata: pass ' + progress.round + '/2, slot ' +
            progress.slot + '/10.');
        }
      });
      setLocalStatus('Transfer completed to slot ' + result.slotNumber + ' (' + result.label + '). All ' +
        result.acknowledgedWriteFrames + ' write frames received ACKs and the slot name matched across both readback passes. ' +
        'The device does not provide weight readback; play the model to verify its sound.');
    } catch (error) {
      setLocalStatus('Transfer failed: ' + (error?.message || error) +
        '. If writing has started, the slot may contain partial data. Check the device before retrying.');
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
    if ($('t3kStatus')) setStatus('The TONE3000 callback is not a valid URL.');
    return;
  }
  const query = new URLSearchParams(url.search || '');
  const hashText = String(url.hash || '').replace(/^#/, '').replace(/^\?/, '');
  const hash = new URLSearchParams(hashText);
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

  try { await loadOAuthData(); } catch (error) {
    setStatus('Secure TONE3000 session storage is unavailable: ' + (error?.message || error));
    return;
  }
  const expected = authValue('state');
  if (!state || !expected || state !== expected) {
    setStatus('A TONE3000 callback was received, but its state parameter does not match. The process was stopped for security. Reopen TONE3000 from the app.');
    return;
  }
  handledCallbackStates.add(state);
  if (handledCallbackStates.size > 8) {
    handledCallbackStates.delete(handledCallbackStates.values().next().value);
  }

  try {
    if (error) throw new Error(errorDescription || error);
    if (code) await exchangeAuthorizationCode(code);
    await saveOAuthData({}, ['state', 'code_verifier']);
    if (Native()) {
      try { await Browser.close(); } catch {}
    } else {
      const clean = new URL(window.location.href);
      clean.search = '';
      clean.hash = '';
      history.replaceState({}, document.title, clean.href);
    }
    if (canceled) {
      setStatus('Tone selection canceled. No model was written to the device.');
      return;
    }
    if (toneId) {
      callbackLoadedTone = true;
      setStatus('Tone selected. Returning to MG30 Studio and loading the available models…');
      await loadSelectedTone(toneId, { expand: true });
    } else {
      setStatus('TONE3000 returned without a tone_id. Login may have succeeded, but the selected tone was not included in the callback. Try selecting the tone again. If this happens again, check that mg30studio://oauth/callback is registered in your TONE3000 API settings.');
    }
  } catch (callbackError) {
    setStatus('TONE3000 authentication/import failed: ' + (callbackError?.message || callbackError));
  }
}

async function initTone3000() {
  if (!createPanel()) {
    setTimeout(initTone3000, 250);
    return;
  }
  // Manual file import is handled by the persistent NAM Library UI.
  if (Native()) {
    try {
      await App.addListener('appUrlOpen', event => {
        if (event?.url) void processCallback(event.url);
      });
    } catch (error) {
      setStatus('Could not install the Android callback listener: ' + (error?.message || error));
    }
    try {
      const launch = await App.getLaunchUrl();
      if (launch?.url) await processCallback(launch.url);
    } catch (error) {
      console.warn('TONE3000 launch URL check failed', error);
    }
    try {
      await App.addListener('appStateChange', async event => {
        if (!event?.isActive) return;
        try {
          const launch = await App.getLaunchUrl();
          if (launch?.url) await processCallback(launch.url);
        } catch (error) {
          console.warn('TONE3000 resume URL check failed', error);
        }
      });
    } catch (error) {
      console.warn('TONE3000 appStateChange listener failed', error);
    }
  }
  try { await loadOAuthData(); } catch (error) {
    setStatus('TONE3000 secure session storage is unavailable: ' + (error?.message || error));
    return;
  }
  const cached = restoreCachedCatalogue();
  await processCallback(window.location.href);
  const savedId = localStorage.getItem(PREFIX + 'selected_tone_id') || cached?.toneId;
  if (savedId && !callbackLoadedTone && authValue('access_token') &&
      !new URL(window.location.href).search && !window.location.hash.includes('tone_id=')) {
    await loadSelectedTone(savedId, {
      expand: localStorage.getItem(PREFIX + 'catalogue_expanded') === '1',
    });
  }
}

initTone3000();
