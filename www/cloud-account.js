/* NUX MG30 Studio Cloud Account — isolated UI/auth module
 * This module does not access Web MIDI, NAM, IR, MIDI mappings, or preset state.
 * Cloud account authentication only; provider credentials remain server-side.
 */
(() => {
  "use strict";
  const API_BASE = "https://nux-mg30-studio-api.vaivai851.workers.dev";
  const TOKEN_KEY = "mg30-cloud-auth-token";
  const USER_KEY = "mg30-cloud-auth-user";
  const $ = (id) => document.getElementById(id);

  function status(message, good = false) {
    const el = $("mg30CloudStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = good ? "#74d6a0" : "#b9c4c8";
  }

  async function request(path, options = {}) {
    const response = await fetch(API_BASE + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      cache: "no-store"
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("Invalid server response (" + response.status + ")"); }
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || ("HTTP " + response.status));
    }
    return data;
  }

  function renderConnected(username) {
    const login = $("mg30CloudLogin");
    const connected = $("mg30CloudConnected");
    if (login) login.hidden = true;
    if (connected) connected.hidden = false;
    const user = $("mg30CloudUser");
    if (user) user.textContent = username || "Connected account";
    status("Cloud Account connected", true);
  }

  function renderDisconnected(message) {
    const login = $("mg30CloudLogin");
    const connected = $("mg30CloudConnected");
    if (login) login.hidden = false;
    if (connected) connected.hidden = true;
    status(message || "Not connected to Cloud Account");
  }

  async function validateSavedSession() {
    const token = localStorage.getItem(TOKEN_KEY);
    const username = localStorage.getItem(USER_KEY);
    if (!token) {
      renderDisconnected();
      return;
    }
    try {
      const data = await request("/auth/me", {
        method: "GET",
        headers: { Authorization: "Bearer " + token }
      });
      renderConnected(data.user?.username || username);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      renderDisconnected("Your session has expired. Please sign in again.");
    }
  }

  async function login() {
    const username = $("mg30CloudUsername")?.value.trim() || "";
    const password = $("mg30CloudPassword")?.value || "";
    const button = $("mg30CloudLoginBtn");
    if (!username || !password) {
      status("Please enter your username and password.");
      return;
    }
    if (button) { button.disabled = true; button.textContent = "Connecting…"; }
    status("Checking Cloud Account…");
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      if (!data.token) throw new Error("The server did not return an authentication token.");
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, data.user?.username || username);
      const pass = $("mg30CloudPassword");
      if (pass) pass.value = "";
      renderConnected(data.user?.username || username);
    } catch (error) {
      status("Login failed: " + error.message);
    } finally {
      if (button) { button.disabled = false; button.textContent = "Connect Cloud Account"; }
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    renderDisconnected("Cloud Account disconnected. Local features remain available.");
  }

  function mount() {
    const page = $("page-device");
    if (!page || $("mg30CloudPanel")) return;
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.id = "mg30CloudPanel";
    panel.style.marginBottom = "16px";
    panel.innerHTML = `
      <div class="panel-head">
        <div><h3>NUX MG30 Studio Cloud</h3>
        <p>A personal account for Cloud services. A local pedal connection does not require an account.</p></div>
        <span class="chip">PRIVATE ACCOUNT</span>
      </div>
      <div id="mg30CloudStatus" role="status" aria-live="polite" style="margin:10px 0;color:#b9c4c8">Checking session…</div>
      <div id="mg30CloudLogin">
        <label for="mg30CloudUsername" style="display:block;margin:10px 0 5px">Username</label>
        <input id="mg30CloudUsername" autocomplete="username" style="display:block;width:100%;box-sizing:border-box;margin-bottom:10px;min-height:44px;padding:11px 12px;background:#0c100d;color:#eff3e9;border:1px solid #333d30;border-radius:10px;font:inherit">
        <label for="mg30CloudPassword" style="display:block;margin:0 0 5px">Password</label>
        <input id="mg30CloudPassword" type="password" autocomplete="current-password" style="display:block;width:100%;box-sizing:border-box;margin-bottom:12px;min-height:44px;padding:11px 12px;background:#0c100d;color:#eff3e9;border:1px solid #333d30;border-radius:10px;font:inherit">
        <button class="btn primary" id="mg30CloudLoginBtn" type="button" style="width:100%;min-height:44px">Connect Cloud Account</button>
      </div>
      <div id="mg30CloudConnected" hidden>
        <div class="switch-row"><span>Account</span><strong id="mg30CloudUser"></strong></div>
        <button class="btn" id="mg30CloudLogoutBtn" type="button">Disconnect Cloud</button>
      </div>
      <div class="notice" style="margin-top:12px">
        Cloud services are online-only. USB-MIDI, local presets, NAM, IR, and MIDI remain available without signing in or an internet connection.
      </div>`;
    const hero = page.querySelector(":scope > .hero");
    if (hero?.nextSibling) page.insertBefore(panel, hero.nextSibling);
    else page.appendChild(panel);
    $("mg30CloudLoginBtn").addEventListener("click", login);
    $("mg30CloudPassword").addEventListener("keydown", e => {
      if (e.key === "Enter") login();
    });
    $("mg30CloudLogoutBtn").addEventListener("click", logout);
    validateSavedSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
