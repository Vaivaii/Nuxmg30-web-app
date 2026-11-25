import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const NativeChatGPT = registerPlugin('MG30ChatGPT');
const $ = (id) => document.getElementById(id);
const nativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

let session = { status: 'disconnected', sharing: false };
let profiles = [];
let mounted = false;

function emitSession(next) {
  session = next || { status: 'disconnected', sharing: false };
  window.dispatchEvent(new CustomEvent('mg30-chatgpt-session-changed', { detail: session }));
}

function setStatus(text, kind = 'idle') {
  const node = $('mg30ChatGPTStatus');
  if (!node) return;
  node.textContent = text;
  node.dataset.state = kind;
}

function render() {
  const login = $('mg30ChatGPTLoginBtn');
  const add = $('mg30ChatGPTAddBtn');
  const logout = $('mg30ChatGPTLogoutBtn');
  const switchButton = $('mg30ChatGPTSwitchBtn');
  const select = $('mg30ChatGPTAccounts');
  const identity = $('mg30ChatGPTIdentity');
  const switchRow = $('mg30ChatGPTSwitchRow');
  const connected = session.status === 'connected' && session.sharing;

  if (login) {
    login.hidden = connected;
    login.disabled = session.status === 'connecting';
    login.textContent = session.status === 'connecting'
      ? 'Connecting…'
      : (session.status === 'connected' && !session.sharing ? 'Enable ChatGPT plan access' : 'Continue with ChatGPT');
  }
  if (add) add.hidden = !connected;
  if (logout) logout.hidden = !connected;
  if (identity) {
    identity.hidden = !connected;
    const name = session.identity?.name || session.identity?.email || session.profileLabel || 'Connected';
    identity.textContent = connected ? name + ' · Using ChatGPT plan' : '';
  }
  if (select) {
    select.replaceChildren();
    for (const item of profiles) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.email || item.name || item.label;
      if (item.id === session.profileId) option.selected = true;
      select.append(option);
    }
    select.hidden = profiles.length < 2;
  }
  if (switchButton) switchButton.hidden = profiles.length < 2;
  if (switchRow) switchRow.hidden = profiles.length < 2;
}

async function refreshState(message) {
  if (!nativeAndroid()) {
    emitSession({ status: 'disconnected', sharing: false });
    setStatus('ChatGPT account connection is available in the Android app.', 'idle');
    render();
    return;
  }
  try {
    const [next, listed] = await Promise.all([
      NativeChatGPT.getSession(),
      NativeChatGPT.listProfiles()
    ]);
    emitSession(next);
    profiles = Array.isArray(listed?.profiles) ? listed.profiles : [];
    render();
    if (message) setStatus(message, 'success');
    else if (next.status === 'connected' && next.sharing) setStatus('ChatGPT connected. Your requests run directly from this Android app.', 'success');
    else if (next.status === 'connected') setStatus('Signed in, but ChatGPT plan-use permission is not enabled. Reconnect and approve the requested permission.', 'error');
    else setStatus('Not connected. Sign in with your own ChatGPT account.', 'idle');
  } catch (error) {
    setStatus('ChatGPT connection unavailable: ' + (error?.message || error), 'error');
    render();
  }
}

async function signIn(newProfile = false) {
  if (!nativeAndroid()) return;
  const login = $('mg30ChatGPTLoginBtn');
  const add = $('mg30ChatGPTAddBtn');
  if (login) login.disabled = true;
  if (add) add.disabled = true;
  setStatus('Opening secure ChatGPT sign-in in your browser…', 'busy');
  emitSession({ ...session, status: 'connecting' });
  render();
  try {
    const next = await NativeChatGPT.signIn({ newProfile });
    emitSession(next);
    await refreshState(next.sharing ? 'ChatGPT connected successfully.' : 'Signed in, but plan-use permission is not enabled.');
  } catch (error) {
    emitSession(await NativeChatGPT.getSession().catch(() => ({ status: 'disconnected', sharing: false })));
    await refreshState();
    setStatus(error?.message || 'ChatGPT sign-in was not completed.', 'error');
  } finally {
    if (login) login.disabled = false;
    if (add) add.disabled = false;
    render();
  }
}

async function switchProfile() {
  const id = $('mg30ChatGPTAccounts')?.value;
  if (!id) return;
  try {
    setStatus('Switching ChatGPT account…', 'busy');
    const next = await NativeChatGPT.selectProfile({ profileId: id });
    emitSession(next);
    await refreshState('ChatGPT account switched.');
  } catch (error) {
    setStatus('Could not switch account: ' + (error?.message || error), 'error');
  }
}

async function logout() {
  const button = $('mg30ChatGPTLogoutBtn');
  if (button) button.disabled = true;
  try {
    setStatus('Disconnecting ChatGPT account…', 'busy');
    const next = await NativeChatGPT.logout();
    emitSession(next);
    await refreshState('ChatGPT disconnected. Local MG-30 features remain available.');
  } catch (error) {
    setStatus('Could not disconnect ChatGPT: ' + (error?.message || error), 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

async function openUsage() {
  try {
    await Browser.open({ url: 'https://chatgpt.com/settings/usage' });
  } catch {
    window.open('https://chatgpt.com/settings/usage', '_blank', 'noopener,noreferrer');
  }
}

function mount() {
  if (mounted) return;
  const page = $('page-device');
  if (!page) return;
  mounted = true;

  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.id = 'mg30ChatGPTPanel';
  panel.style.marginBottom = '16px';
  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <h3>ChatGPT · Primary AI</h3>
        <p>Your ChatGPT account powers discussion, NAM research, tone analysis and preset planning.</p>
      </div>
      <span class="chip">LOCAL CONNECTION</span>
    </div>
    <div id="mg30ChatGPTStatus" role="status" aria-live="polite" style="margin:10px 0;color:#b9c4c8">Checking ChatGPT connection…</div>
    <div id="mg30ChatGPTIdentity" class="switch-row" hidden></div>
    <button class="btn primary" id="mg30ChatGPTLoginBtn" type="button" style="width:100%;min-height:44px">Continue with ChatGPT</button>
    <div id="mg30ChatGPTConnectedActions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px">
      <button class="btn" id="mg30ChatGPTAddBtn" type="button" hidden>Add account</button>
      <button class="btn" id="mg30ChatGPTLogoutBtn" type="button" hidden>Log out</button>
    </div>
    <div id="mg30ChatGPTSwitchRow" style="display:flex;gap:8px;margin-top:9px" hidden>
      <select id="mg30ChatGPTAccounts" class="btn" aria-label="Saved ChatGPT accounts" style="flex:1;min-width:0"></select>
      <button class="btn" id="mg30ChatGPTSwitchBtn" type="button">Switch</button>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px">
      <span class="slot-note">OAuth tokens remain inside Android native secure storage.</span>
      <button class="btn" id="mg30ChatGPTUsageBtn" type="button">Manage usage ↗</button>
    </div>
  `;
  const overview = $('deviceOverviewView') || page;
  const anchor = overview.querySelector('#mg30CloudPanel') || overview.querySelector('.device-usb-audio-card');
  if (anchor) overview.insertBefore(panel, anchor);
  else overview.appendChild(panel);

  $('mg30ChatGPTLoginBtn').addEventListener('click', () => void signIn(false));
  $('mg30ChatGPTAddBtn').addEventListener('click', () => void signIn(true));
  $('mg30ChatGPTLogoutBtn').addEventListener('click', () => void logout());
  $('mg30ChatGPTSwitchBtn').addEventListener('click', () => void switchProfile());
  $('mg30ChatGPTUsageBtn').addEventListener('click', () => void openUsage());

  // render() owns the hidden state for the account switch row. Do not observe
  // and rewrite the same attribute here: that can create an endless
  // MutationObserver -> hidden setter -> MutationObserver loop in Android WebView.
  void refreshState();
}

export const MG30ChatGPTBridge = Object.freeze({
  getSession: () => NativeChatGPT.getSession(),
  listProfiles: () => NativeChatGPT.listProfiles(),
  listModels: async () => {
    const result = await NativeChatGPT.listModels();
    return Array.isArray(result?.models) ? result.models : [];
  },
  sendResponse: async ({ model, input, instructions, tools, maxOutputTokens, parallelToolCalls = false }) => {
    const response = await NativeChatGPT.sendResponse({
      model,
      input: JSON.stringify(input),
      instructions,
      ...(Array.isArray(tools) && tools.length ? { tools } : {}),
      maxOutputTokens: Number.isFinite(Number(maxOutputTokens)) ? Number(maxOutputTokens) : 1350,
      parallelToolCalls: Boolean(parallelToolCalls)
    });
    return response;
  },
  addDeltaListener: (listener) => NativeChatGPT.addListener('chatgptDelta', listener),
  signIn: (options = {}) => NativeChatGPT.signIn(options),
  selectProfile: (profileId) => NativeChatGPT.selectProfile({ profileId }),
  logout: () => NativeChatGPT.logout(),
  openUsage
});

window.MG30ChatGPTBridge = MG30ChatGPTBridge;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
