import { Capacitor, registerPlugin } from '@capacitor/core';

const MG30AudioOutput = registerPlugin('MG30AudioOutput');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function addStyles() {
  if (document.getElementById('dawUsbOutputStyles')) return;
  const style = document.createElement('style');
  style.id = 'dawUsbOutputStyles';
  style.textContent = `
    #page-studio .daw-usb-output-card{margin-top:14px;padding:14px;border:1px solid rgba(148,163,184,.18);border-radius:13px;background:rgba(15,23,30,.72)}
    #page-studio .daw-usb-output-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    #page-studio .daw-usb-output-card h3{margin:3px 0 4px;font-size:14px;font-weight:750}
    #page-studio .daw-usb-output-card p{margin:0;color:var(--muted,#98a6b3);font-size:11px;line-height:1.45}
    #page-studio .daw-usb-output-eyebrow{font-size:9px;letter-spacing:.11em;font-weight:800;color:#8fa3b8}
    #page-studio .daw-usb-output-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}
    #page-studio .daw-usb-output-button{border:1px solid rgba(122,168,202,.35);border-radius:9px;background:rgba(53,105,145,.18);color:#dceaf5;padding:9px 12px;font-size:10px;font-weight:800;letter-spacing:.04em}
    #page-studio .daw-usb-output-button.secondary{border-color:rgba(190,230,110,.35);background:rgba(161,205,84,.12);color:#d4f18b}
    #page-studio .daw-usb-output-button:disabled{opacity:.45}
    #page-studio .daw-usb-output-status{margin-top:11px;padding:9px 10px;border-radius:8px;background:rgba(148,163,184,.07);color:#c1ccd6;font-size:11px;line-height:1.45}
    #page-studio .daw-usb-output-status.ok{color:#9dd9b0;background:rgba(54,142,83,.12)}
    #page-studio .daw-usb-output-status.warn{color:#e7c58d;background:rgba(170,116,38,.12)}
    #page-studio .daw-usb-output-list{display:grid;gap:7px;margin-top:8px}
    #page-studio .daw-usb-output-device{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:9px 10px;border:1px solid rgba(148,163,184,.12);border-radius:8px}
    #page-studio .daw-usb-output-device strong{display:block;font-size:11px}
    #page-studio .daw-usb-output-device small{display:block;margin-top:3px;color:var(--muted,#98a6b3);font-size:9px;line-height:1.4}
    #page-studio .daw-usb-output-tag{flex:none;color:#9fc5e3;font-size:8px;letter-spacing:.07em;font-weight:850}
    #page-studio .daw-usb-output-note{display:block;margin-top:9px;color:var(--muted,#98a6b3);font-size:9px;line-height:1.45}
  `;
  document.head.appendChild(style);
}

function renderDevice(device) {
  const rates = Array.isArray(device.sampleRates) && device.sampleRates.length
    ? device.sampleRates.join(' / ') + ' Hz'
    : 'Sample rate belum dilaporkan';
  const channels = Array.isArray(device.channelCounts) && device.channelCounts.length
    ? device.channelCounts.join(' / ') + ' kanal'
    : 'Kanal belum dilaporkan';
  const encodings = Array.isArray(device.encodings) && device.encodings.length
    ? ' · encoding ' + device.encodings.join(', ')
    : '';
  return '<div class="daw-usb-output-device"><div><strong>' +
    escapeHtml(device.name || 'Audio output') + '</strong><small>' +
    escapeHtml(device.typeName || 'Audio output') + ' · ' +
    escapeHtml(rates) + ' · ' + escapeHtml(channels + encodings) +
    '</small></div><span class="daw-usb-output-tag">' +
    (device.isMg30 ? 'MG-30' : (device.isUsb ? 'USB OUT' : 'OUTPUT')) + '</span></div>';
}

function mountUsbOutputPanel() {
  const host = document.getElementById('dawTrackSettingsPage');
  if (!host || host.querySelector('[data-daw-usb-output]')) return;

  addStyles();
  const panel = document.createElement('section');
  panel.className = 'daw-usb-output-card';
  panel.dataset.dawUsbOutput = 'true';
  panel.innerHTML = `
    <div class="daw-usb-output-head">
      <div>
        <span class="daw-usb-output-eyebrow">USB AUDIO · OUTPUT ROUTING TEST</span>
        <h3>MG-30 USB Playback</h3>
        <p>Periksa endpoint USB, lalu uji apakah AudioTrack benar-benar diarahkan ke output MG-30.</p>
      </div>
    </div>
    <div class="daw-usb-output-actions">
      <button class="daw-usb-output-button" type="button" data-usb-output-check>PERIKSA USB OUT</button>
      <button class="daw-usb-output-button secondary" type="button" data-usb-output-tone disabled>TES AUDIO 1,2 DETIK</button>
    </div>
    <div class="daw-usb-output-status" data-usb-output-status aria-live="polite">Belum diperiksa.</div>
    <div class="daw-usb-output-list" data-usb-output-list></div>
    <small class="daw-usb-output-note">Tes audio memakai nada 440 Hz stereo dengan level rendah selama 1,2 detik. Nada hanya dikirim setelah Android melaporkan rute aktual ke endpoint MG-30 yang dipilih. Ini belum membuktikan playback DAW, USB input, full-duplex, Reamp, atau Loopback.</small>
  `;

  host.appendChild(panel);
  const button = panel.querySelector('[data-usb-output-check]');
  const toneButton = panel.querySelector('[data-usb-output-tone]');
  const status = panel.querySelector('[data-usb-output-status]');
  const list = panel.querySelector('[data-usb-output-list]');
  let selectedMg30Device = null;

  if (!Capacitor.isNativePlatform()) {
    button.disabled = true;
    toneButton.disabled = true;
    status.textContent = 'Pemeriksaan dan tes USB output tersedia dari APK Android.';
    status.classList.add('warn');
    return;
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    toneButton.disabled = true;
    toneButton.textContent = 'TES AUDIO 1,2 DETIK';
    selectedMg30Device = null;
    button.textContent = 'MEMERIKSA…';
    status.classList.remove('ok', 'warn');
    status.textContent = 'Meminta daftar endpoint output ke Android…';
    list.innerHTML = '';
    try {
      const result = await MG30AudioOutput.inspectOutputDevices();
      const devices = Array.isArray(result.devices) ? result.devices : [];
      list.innerHTML = devices.map(renderDevice).join('');
      selectedMg30Device = devices.find((device) => device.isMg30 && Number.isInteger(Number(device.id))) || null;
      if (result.mg30OutputFound && selectedMg30Device) {
        status.textContent = 'Endpoint output NUX / MG-30 terlihat: ' + selectedMg30Device.name +
          '. Android melaporkan 48 kHz; tes audio terarah sudah tersedia.';
        status.classList.add('ok');
        toneButton.disabled = false;
      } else if (result.usbOutputFound) {
        status.textContent = 'USB output terdeteksi, tetapi nama endpoint belum cocok dengan NUX / MG-30. Periksa daftar perangkat di bawah.';
        status.classList.add('warn');
      } else {
        status.textContent = devices.length
          ? 'Android melihat output audio, tetapi belum ada endpoint USB yang dikenali.'
          : 'Android belum melaporkan endpoint output audio.';
        status.classList.add('warn');
      }
    } catch (error) {
      status.textContent = error?.message || 'Pemeriksaan output USB gagal.';
      status.classList.add('warn');
    } finally {
      button.disabled = false;
      button.textContent = 'PERIKSA USB OUT';
    }
  });

  toneButton.addEventListener('click', async () => {
    if (!selectedMg30Device) return;
    toneButton.disabled = true;
    button.disabled = true;
    toneButton.textContent = 'MENGUJI…';
    status.classList.remove('ok', 'warn');
    status.textContent = 'Meminta AudioTrack diarahkan ke NUX MG-30. Belum ada nada yang dikirim sebelum rute aktual terverifikasi…';
    try {
      const result = await MG30AudioOutput.playTestTone({ deviceId: Number(selectedMg30Device.id) });
      const actualRoute = result.routedDeviceName
        ? result.routedDeviceName + ' (ID ' + result.routedDeviceId + ')'
        : 'belum terkonfirmasi';
      if (result.played && Number(result.routedDeviceId) === Number(result.requestedDeviceId)) {
        status.textContent = result.message + ' Rute aktual: ' + actualRoute +
          '. Dengarkan apakah nada terdengar dari MG-30.';
        status.classList.add('ok');
      } else {
        status.textContent = result.message + ' Rute aktual: ' + actualRoute +
          '. Tidak dihitung berhasil sebagai tes output MG-30.';
        status.classList.add('warn');
      }
    } catch (error) {
      status.textContent = error?.message || 'Tes audio USB gagal.';
      status.classList.add('warn');
    } finally {
      toneButton.disabled = !selectedMg30Device;
      toneButton.textContent = 'TES AUDIO 1,2 DETIK';
      button.disabled = false;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountUsbOutputPanel, { once: true });
} else {
  mountUsbOutputPanel();
}
