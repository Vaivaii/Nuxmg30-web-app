import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';

const MG30Audio = registerPlugin('MG30Audio');
const MG30Camera = registerPlugin('MG30Camera');
const $ = (id) => document.getElementById(id);
const isNative = () => Capacitor.isNativePlatform();
const safeText = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let backingObjectUrl = null;
let recording = false;
let takeNumber = 0;
const takes = [];
let selectedRenameIndex = -1;
let activePlaybackPath = "";
const YOUTUBE_API_KEY_STORAGE = 'mg30-youtube-data-api-key';
let youtubeSearchController = null;
async function applyNativeStatusBar() {
  if (!isNative() || Capacitor.getPlatform() !== 'android') return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#0b1012' });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.show();
  } catch (error) {
    console.warn('Status bar styling is limited by this Android version:', error);
  }
}
applyNativeStatusBar();

function setStatus(id, message, kind = '') {
  const node = $(id);
  if (!node) return;
  node.textContent = message;
  node.classList.remove('ok', 'warn');
  if (kind) node.classList.add(kind);
}
function openExternal(url) {
  if (isNative()) return Browser.open({ url });
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.href = url;
}
function bytesLabel(value) {
  const n = Number(value) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}
function displayDevice(device) {
  const usb = device.isUsb;
  const rates = (device.sampleRates || []).length ? device.sampleRates.join(' / ') + ' Hz' : 'Rate tidak dilaporkan Android';
  const channels = (device.channelCounts || []).length ? device.channelCounts.join(' / ') + ' channel' : 'Kanal belum dilaporkan';
  const enc = (device.encodings || []).map((x) => x === 2 ? 'PCM 16-bit' : (x === 4 ? 'PCM float 32-bit' : (x === 21 ? 'PCM 24-bit packed' : (x === 22 ? 'PCM 32-bit integer' : 'encoding ' + x))));
  return '<div class="audio-device-card"><div><strong>' + safeText(device.name || 'Audio input') + '</strong><small>' +
    safeText(device.typeName || device.type || 'Input audio') + ' · ' + safeText(rates) + ' · ' + safeText(channels) +
    (enc.length ? '<br>' + safeText(enc.join(', ')) : '') + '</small></div><span class="audio-device-tag">' +
    (usb ? 'USB INPUT' : 'INPUT') + '</span></div>';
}
async function inspectAudio() {
  if (!isNative()) {
    setStatus('audioStatus', 'Tes USB Audio harus dijalankan dari APK Capacitor. Browser/PWA tidak dapat memakai bridge audio native.', 'warn');
    $('audioEngineBadge').textContent = 'BUKAN APK';
    $('audioDeviceList').innerHTML = '<div class="studio-empty">Buka APK MG30 Studio di Android, sambungkan MG-30 via USB OTG, lalu jalankan tes ini.</div>';
    return;
  }
  $('audioCheckBtn').disabled = true;
  $('audioCheckBtn').textContent = 'Memeriksa input…';
  setStatus('audioStatus', 'Meminta daftar input audio dari Android…');
  try {
    const result = await MG30Audio.inspectDevices();
    const devices = result.devices || [];
    $('audioDeviceList').innerHTML = devices.length ? devices.map(displayDevice).join('') : '<div class="studio-empty">Android belum melaporkan input audio apa pun.</div>';
    if (result.usbInputFound) {
      $('audioEngineBadge').textContent = 'USB INPUT ADA';
      setStatus('audioStatus', 'USB MG-30 terdeteksi. Tekan Rekam; aplikasi akan mencoba beberapa konfigurasi dan hanya lanjut jika rute aktif benar-benar USB.', 'ok');
      $('guitarTrackMeta').textContent = 'USB terdeteksi · target WAV PCM 24-bit / 48 kHz';
      $('guitarRecordBtn').disabled = false;
    } else {
      $('audioEngineBadge').textContent = 'USB BELUM ADA';
      setStatus('audioStatus', 'Input USB belum ditemukan. Coba kabel data OTG lain, pastikan MG-30 menyala, lalu periksa kembali.', 'warn');
      $('guitarTrackMeta').textContent = 'Belum ada input USB audio';
      $('guitarRecordBtn').disabled = true;
    }
  } catch (error) {
    $('audioEngineBadge').textContent = 'TES GAGAL';
    setStatus('audioStatus', error?.message || 'Pemeriksaan USB Audio gagal.', 'warn');
  } finally {
    $('audioCheckBtn').disabled = false;
    $('audioCheckBtn').textContent = '↻ Tes USB';
  }
}
function playbackPathFor(take) {
  return Capacitor.convertFileSrc ? Capacitor.convertFileSrc(take.path) : take.path;
}
function setCurrentPlayback(take, autoplay = false) {
  if (!take || !take.path) return;
  activePlaybackPath = take.path;
  const audio = $('guitarPlayback');
  const nextSrc = playbackPathFor(take);
  if (audio.src !== nextSrc) audio.src = nextSrc;
  $('guitarPlayBtn').disabled = false;
  $('guitarStopBtn').disabled = false;
  $('guitarPlayGlyph').textContent = audio.paused ? '▶' : 'Ⅱ';
  $('guitarPlayLabel').textContent = audio.paused ? 'PLAY' : 'PAUSE';
  if (autoplay) audio.play().catch((error) => setStatus('recordStatus', 'Tidak dapat memutar take: ' + (error?.message || 'audio playback gagal'), 'warn'));
}
function renderTakes() {
  $('takeCount').textContent = takes.length + (takes.length === 1 ? ' take' : ' take');
  $('guitarStopBtn').disabled = !recording && takes.length === 0;
  if (!takes.length) {
    $('takeList').innerHTML = '<div class="studio-empty">Belum ada rekaman tersimpan. Setelah Stop, file akan otomatis disimpan.</div>';
    $('guitarPlayBtn').disabled = true;
    activePlaybackPath = "";
    return;
  }
  $('takeList').innerHTML = takes.map((take, index) =>
    '<div class="studio-take"><div class="studio-take-icon">♫</div><div class="studio-take-copy"><strong>' +
    safeText(take.fileName) + '</strong><small>' +
    safeText((take.sampleRate || 48000) + ' Hz · ' + (take.bitDepth || 24) + '-bit · ' + (take.channels || 2) + ' ch · ' + bytesLabel(take.dataBytes || 0)) +
    '<br>' + safeText(take.routeName || 'USB-Audio · NUX MG-30') + '</small></div>' +
    '<div class="studio-take-actions">' +
    '<button class="studio-take-action" type="button" data-play-take="' + index + '" aria-label="Putar ' + safeText(take.fileName) + '" title="Putar">▶</button>' +
    '<button class="studio-take-action" type="button" data-rename-take="' + index + '" aria-label="Ganti nama ' + safeText(take.fileName) + '" title="Ganti nama">✎</button>' +
    '<button class="studio-take-action" type="button" data-export-take="' + index + '" aria-label="Ekspor ' + safeText(take.fileName) + '" title="Simpan salinan ke perangkat">⇩</button>' +
    '</div></div>'
  ).join('');
  $('takeList').querySelectorAll('[data-play-take]').forEach((button) => {
    button.addEventListener('click', () => {
      const take = takes[Number(button.dataset.playTake)];
      if (!take) return;
      setCurrentPlayback(take, true);
    });
  });
  $('takeList').querySelectorAll('[data-rename-take]').forEach((button) => {
    button.addEventListener('click', () => openRenameDialog(Number(button.dataset.renameTake)));
  });
  $('takeList').querySelectorAll('[data-export-take]').forEach((button) => {
    button.addEventListener('click', async () => {
      const take = takes[Number(button.dataset.exportTake)];
      if (!take || !isNative()) {
        setStatus('recordStatus', 'Ekspor file tersedia di APK Android.', 'warn');
        return;
      }
      button.disabled = true;
      try {
        const result = await MG30Audio.exportTake({ path: take.path });
        setStatus('recordStatus', 'Salinan tersimpan di lokasi pilihanmu: ' + (result.fileName || take.fileName), 'ok');
      } catch (error) {
        setStatus('recordStatus', error?.message || 'Ekspor dibatalkan atau gagal.', 'warn');
      } finally {
        button.disabled = false;
      }
    });
  });
}
async function restoreTakes() {
  if (!isNative()) return;
  try {
    const result = await MG30Audio.listTakes();
    takes.splice(0, takes.length, ...(result.takes || []));
    renderTakes();
    if (takes.length) {
      setStatus('recordStatus', takes.length + ' rekaman tersimpan di perangkat ini. Rekaman disimpan otomatis saat tombol Stop ditekan.', 'ok');
      $('guitarTrackMeta').textContent = 'USB siap diuji · ' + takes.length + (takes.length === 1 ? ' take tersimpan' : ' take tersimpan');
    }
  } catch (error) {
    setStatus('recordStatus', 'Belum dapat membaca daftar take: ' + (error?.message || 'kesalahan penyimpanan'), 'warn');
  }
}
function openRenameDialog(index) {
  const take = takes[index];
  if (!take) return;
  selectedRenameIndex = index;
  $('renameTakeInput').value = take.fileName.replace(/\.wav$/i, '');
  $('renameTakeError').textContent = '';
  if (typeof $('renameTakeDialog').showModal === 'function') $('renameTakeDialog').showModal();
  else {
    const name = window.prompt('Nama rekaman', $('renameTakeInput').value);
    if (name !== null) saveRenamedTake(index, name);
  }
  $('renameTakeInput').focus();
}
async function saveRenamedTake(index, rawName) {
  const take = takes[index];
  const name = String(rawName || '').trim();
  if (!take || !name) {
    $('renameTakeError').textContent = 'Nama tidak boleh kosong.';
    return;
  }
  if (!isNative()) {
    $('renameTakeError').textContent = 'Ganti nama file memerlukan APK Android.';
    return;
  }
  $('renameTakeSave').disabled = true;
  try {
    const result = await MG30Audio.renameTake({ path: take.path, newName: name });
    takes[index] = { ...take, ...result };
    const wasActiveTake = activePlaybackPath === take.path;
    if (wasActiveTake) {
      stopPlayback(true);
      activePlaybackPath = result.path;
      setCurrentPlayback(result, false);
    }
    renderTakes();
    $('renameTakeDialog').close();
    setStatus('recordStatus', 'Nama rekaman diubah menjadi ' + result.fileName, 'ok');
  } catch (error) {
    $('renameTakeError').textContent = error?.message || 'Nama file gagal diubah.';
  } finally {
    $('renameTakeSave').disabled = false;
  }
}
$('renameTakeSave')?.addEventListener('click', () => saveRenamedTake(selectedRenameIndex, $('renameTakeInput').value));
$('renameTakeCancel')?.addEventListener('click', () => $('renameTakeDialog').close());
$('renameTakeInput')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    $('renameTakeSave').click();
  }
});
function stopPlayback(reset = true) {
  const audio = $('guitarPlayback');
  audio.pause();
  if (reset) {
    try { audio.currentTime = 0; } catch (_) {}
  }
  $('guitarPlayGlyph').textContent = '▶';
  $('guitarPlayLabel').textContent = 'PLAY';
}
async function toggleGuitarPlayback() {
  if (recording) return;
  const audio = $('guitarPlayback');
  if (!activePlaybackPath && takes.length) setCurrentPlayback(takes[0], false);
  if (!activePlaybackPath) {
    setStatus('recordStatus', 'Belum ada take untuk diputar. Rekam gitar terlebih dahulu.', 'warn');
    return;
  }
  if (!audio.paused) {
    audio.pause();
    $('guitarPlayGlyph').textContent = '▶';
    $('guitarPlayLabel').textContent = 'PLAY';
  } else {
    const current = takes.find(take => take.path === activePlaybackPath);
    if (current) setCurrentPlayback(current, false);
    try {
      await audio.play();
      $('guitarPlayGlyph').textContent = 'Ⅱ';
      $('guitarPlayLabel').textContent = 'PAUSE';
    } catch (error) {
      setStatus('recordStatus', 'Gagal memutar rekaman: ' + (error?.message || 'audio playback gagal'), 'warn');
    }
  }
}
$('guitarPlayBtn')?.addEventListener('click', toggleGuitarPlayback);
$('guitarStopBtn')?.addEventListener('click', async () => {
  if (recording) {
    await stopGuitarRecording();
    return;
  }
  stopPlayback(true);
  setStatus('recordStatus', 'Pemutaran dihentikan.', '');
});
$('guitarPlayback')?.addEventListener('ended', () => {
  $('guitarPlayGlyph').textContent = '▶';
  $('guitarPlayLabel').textContent = 'PLAY';
});
async function startGuitarRecording() {
  if (!isNative()) {
    setStatus('recordStatus', 'Rekaman USB langsung hanya tersedia di APK native. Jalankan APK untuk menguji MG-30.', 'warn');
    return;
  }
  if (recording) return;
  $('guitarRecordBtn').disabled = true;
  setStatus('recordStatus', 'Menyiapkan AudioRecord dan memverifikasi routing USB…');
  try {
    const result = await MG30Audio.startRecording({ prefer24Bit: true });
    recording = true;
    $('guitarStopBtn').disabled = false;
    $('guitarPlayBtn').disabled = true;
    stopPlayback(true);
    $('guitarRecordBtn').classList.add('is-recording');
    $('guitarTrackMeter').classList.add('is-recording');
    $('guitarTrackMeta').textContent = result.sampleRate + ' Hz · WAV PCM ' + result.bitDepth + '-bit';
    setStatus('recordStatus', 'RECORDING · ' + (result.routeName || 'USB audio') + ' · output WAV PCM ' + result.bitDepth + '-bit / ' + result.sampleRate + ' Hz. Capture: ' + (result.captureSource || 'format belum dilaporkan') + '.', 'ok');
  } catch (error) {
    setStatus('recordStatus', error?.message || 'Tidak dapat memulai rekaman USB.', 'warn');
    $('guitarTrackMeta').textContent = 'USB terdeteksi, tetapi rute rekaman belum berhasil';
  } finally {
    $('guitarRecordBtn').disabled = recording;
  }
}
async function stopGuitarRecording() {
  if (!isNative() || !recording) return;
  $('guitarStopBtn').disabled = true;
  setStatus('recordStatus', 'Menutup take dan menulis header WAV…');
  try {
    const take = await MG30Audio.stopRecording();
    recording = false;
    $('guitarTrackMeter').classList.remove('is-recording');
    $('guitarRecordBtn').classList.remove('is-recording');
    if (take && take.path) {
      takeNumber += 1;
      takes.unshift(take);
      renderTakes();
      setCurrentPlayback(take, false);
      $('guitarTrackMeta').textContent = take.sampleRate + ' Hz · WAV PCM ' + take.bitDepth + '-bit · ' + take.channels + ' ch';
      $('guitarFormatMeta').textContent = 'File tersimpan otomatis · WAV PCM ' + take.bitDepth + '-bit · ' + take.sampleRate + ' Hz';
      setStatus('recordStatus', 'Take tersimpan otomatis: ' + take.fileName + ' · ' + bytesLabel(take.dataBytes) + '. Gunakan ikon Ekspor untuk menyimpan salinan ke folder pilihanmu.', 'ok');
    } else {
      setStatus('recordStatus', 'Rekaman berhenti tetapi file take tidak dikembalikan oleh audio engine.', 'warn');
    }
  } catch (error) {
    recording = false;
    $('guitarTrackMeter').classList.remove('is-recording');
    $('guitarRecordBtn').classList.remove('is-recording');
    setStatus('recordStatus', error?.message || 'Gagal menyimpan take WAV.', 'warn');
  } finally {
    $('guitarRecordBtn').disabled = false;
    $('guitarStopBtn').disabled = takes.length === 0;
    $('guitarRecordBtn').classList.remove('is-recording');
    $('guitarPlayBtn').disabled = takes.length === 0;
  }
}
function parseYoutubeId(value) {
  try {
    const url = new URL(value.trim());
    if (url.hostname.endsWith('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || null;
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtube-nocookie.com')) {
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const bits = url.pathname.split('/').filter(Boolean);
      const index = bits.findIndex((part) => ['embed', 'shorts', 'live'].includes(part));
      if (index >= 0 && bits[index + 1]) return bits[index + 1];
    }
  } catch (_) {}
  return null;
}
$('audioCheckBtn')?.addEventListener('click', inspectAudio);
$('guitarRecordBtn')?.addEventListener('click', startGuitarRecording);
$('guitarStopBtn')?.addEventListener('click', stopGuitarRecording);
function formatAudioTime(value) {
  if (!Number.isFinite(value) || value < 0) return '00:00';
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}
function refreshBackingControls() {
  const audio = $('backingAudio');
  if (!audio) return;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  $('backingElapsed').textContent = formatAudioTime(audio.currentTime || 0);
  $('backingDuration').textContent = duration ? formatAudioTime(duration) : '--:--';
  $('backingSeek').value = duration ? String(Math.round((audio.currentTime / duration) * 1000)) : '0';
  $('backingPlayBtn').textContent = audio.paused ? '▶' : 'Ⅱ';
  $('backingPlayBtn').setAttribute('aria-label', audio.paused ? 'Putar backing track' : 'Jeda backing track');
  $('backingPlayBtn').title = audio.paused ? 'Putar' : 'Jeda';
}
function setBackingStatus(message, kind = '') {
  const node = $('backingPlaybackStatus');
  if (!node) return;
  node.textContent = message;
  node.classList.remove('hidden', 'ok', 'warn');
  if (kind) node.classList.add(kind);
}
$('backingFileInput')?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (backingObjectUrl) URL.revokeObjectURL(backingObjectUrl);
  const audio = $('backingAudio');
  audio.pause();
  backingObjectUrl = URL.createObjectURL(file);
  audio.src = backingObjectUrl;
  audio.volume = Number($('backingVolume')?.value ?? 80) / 100;
  audio.load();
  $('backingPlaybackControls')?.classList.remove('hidden');
  $('backingVolumeRow')?.classList.remove('hidden');
  $('backingFileName').textContent = file.name + ' · ' + bytesLabel(file.size);
  $('backingFileName').classList.remove('hidden');
  $('backingFileName').classList.add('ok');
  $('backingSeek').value = '0';
  $('backingElapsed').textContent = '00:00';
  $('backingDuration').textContent = '--:--';
  $('backingPlayBtn').disabled = false;
  setBackingStatus('Backing siap diputar. Tekan ▶ untuk mulai.', 'ok');
});
$('backingPlayBtn')?.addEventListener('click', async () => {
  const audio = $('backingAudio');
  if (!audio?.src) {
    setBackingStatus('Pilih file audio terlebih dahulu.', 'warn');
    return;
  }
  if (audio.paused) {
    try {
      await audio.play();
      setBackingStatus('Backing sedang diputar.', 'ok');
    } catch (error) {
      setBackingStatus('File dipilih, tetapi WebView tidak bisa memutarnya. Coba WAV PCM atau MP3; beberapa file FLAC tidak didukung perangkat ini.', 'warn');
    }
  } else {
    audio.pause();
  }
  refreshBackingControls();
});
$('backingStopBtn')?.addEventListener('click', () => {
  const audio = $('backingAudio');
  audio.pause();
  try { audio.currentTime = 0; } catch (_) {}
  refreshBackingControls();
  setBackingStatus('Backing dihentikan.');
});
$('backingSeek')?.addEventListener('input', (event) => {
  const audio = $('backingAudio');
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = (Number(event.target.value) / 1000) * audio.duration;
    refreshBackingControls();
  }
});
$('backingAudio')?.addEventListener('loadedmetadata', refreshBackingControls);
$('backingAudio')?.addEventListener('durationchange', refreshBackingControls);
$('backingAudio')?.addEventListener('timeupdate', refreshBackingControls);
$('backingAudio')?.addEventListener('play', refreshBackingControls);
$('backingAudio')?.addEventListener('pause', refreshBackingControls);
$('backingAudio')?.addEventListener('ended', () => {
  refreshBackingControls();
  setBackingStatus('Backing selesai diputar.');
});
$('backingAudio')?.addEventListener('error', () => {
  setBackingStatus('Format audio ini tidak bisa diputar di Android WebView. Konversi ke MP3 atau WAV PCM lalu impor ulang.', 'warn');
});
$('backingVolume')?.addEventListener('input', (event) => {
  const value = Number(event.target.value);
  $('backingVolumeValue').textContent = value + '%';
  $('backingAudio').volume = value / 100;
});
$('backingAudio') && ($('backingAudio').volume = 0.8);
function savedYoutubeKey() {
  try { return localStorage.getItem(YOUTUBE_API_KEY_STORAGE) || ''; } catch (_) { return ''; }
}
function setYoutubeKeyStatus(saved) {
  const node = $('youtubeKeyStatus');
  if (node) {
    node.textContent = saved ? 'API key tersimpan di perangkat' : 'Pencarian langsung perlu API key';
    node.classList.toggle('is-configured', !!saved);
  }
}
function showYoutubeApiSettings(show = true) {
  $('youtubeApiSettings')?.classList.toggle('hidden', !show);
  if (show && $('youtubeApiKeyInput')) $('youtubeApiKeyInput').value = savedYoutubeKey();
}
function loadYoutubeVideo(videoId) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId || '')) return;
  $('youtubePlayer').src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&playsinline=1&rel=0';
  $('studioVideoWrap')?.classList.remove('hidden');
  $('youtubePlayer').title = 'Pemutar YouTube · ' + (document.querySelector('[data-youtube-id="' + videoId + '"] .youtube-result-copy strong')?.textContent || 'Video');
  $('youtubeResults')?.classList.add('hidden');
  if ($('youtubeSearchDetails')) $('youtubeSearchDetails').open = false;
}
function safeHttpsUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch (_) { return ''; }
}
function renderYoutubeResults(items) {
  const holder = $('youtubeResults');
  if (!holder) return;
  if (!items.length) {
    holder.innerHTML = '<div class="studio-empty">Tidak ada video yang cocok. Coba judul atau nama artis yang lebih spesifik.</div>';
    return;
  }
  holder.classList.remove('hidden');
  holder.innerHTML = items.slice(0, 6).map((item) => {
    const id = item.id?.videoId;
    const snippet = item.snippet || {};
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return '';
    const thumbnails = snippet.thumbnails || {};
    const thumbnail = safeHttpsUrl((thumbnails.medium || thumbnails.default || thumbnails.high || {}).url || '');
    return '<button class="youtube-result" type="button" data-youtube-id="' + safeText(id) + '">' +
      (thumbnail ? '<img loading="lazy" src="' + safeText(thumbnail) + '" alt="">' : '<span class="studio-file-icon">▶</span>') +
      '<span class="youtube-result-copy"><strong>' + safeText(snippet.title || 'Video YouTube') + '</strong>' +
      '<small>' + safeText(snippet.channelTitle || 'YouTube') + '</small><small class="youtube-result-action">Ketuk untuk memutar ↗</small></span></button>';
  }).join('');
  holder.querySelectorAll('[data-youtube-id]').forEach((button) => {
    button.addEventListener('click', () => loadYoutubeVideo(button.dataset.youtubeId));
  });
}
async function searchYoutubeInStudio() {
  const query = $('youtubeSearchInput').value.trim();
  if (!query) { $('youtubeSearchInput').focus(); return; }
  const key = savedYoutubeKey();
  if (!key) {
    showYoutubeApiSettings(true);
    setYoutubeKeyStatus(false);
    $('youtubeResults').classList.remove('hidden');
    $('youtubeResults').innerHTML = '<div class="studio-empty">Pencarian langsung perlu YouTube Data API v3 key. Simpan key lewat tombol API Key, lalu cari lagi. Hasil video akan bisa diketuk langsung di sini.</div>';
    return;
  }
  if (youtubeSearchController) youtubeSearchController.abort();
  youtubeSearchController = new AbortController();
  const button = $('youtubeSearchBtn');
  button.disabled = true;
  button.textContent = 'Mencari…';
  $('youtubeResults').classList.remove('hidden');
  $('youtubeResults').innerHTML = '<div class="studio-empty">Mencari video di YouTube…</div>';
  try {
    const params = new URLSearchParams({
      part: 'snippet', type: 'video', maxResults: '12', q: query,
      videoEmbeddable: 'true', key
    });
    const response = await fetch('https://www.googleapis.com/youtube/v3/search?' + params.toString(), {
      method: 'GET', signal: youtubeSearchController.signal
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      const reason = data.error?.errors?.[0]?.reason || '';
      const message = data.error?.message || ('HTTP ' + response.status);
      $('youtubeResults').classList.remove('hidden');
      $('youtubeResults').innerHTML = '<div class="studio-empty">Pencarian YouTube gagal: ' + safeText(message) +
        (reason === 'keyInvalid' ? '<br>Periksa API key.' : '') +
        (reason === 'quotaExceeded' ? '<br>Kuota YouTube Data API hari ini habis.' : '') +
        '</div>';
      return;
    }
    renderYoutubeResults(data.items || []);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      $('youtubeResults').classList.remove('hidden');
      $('youtubeResults').innerHTML = '<div class="studio-empty">Tidak bisa menghubungi YouTube Data API. Periksa koneksi, API key, dan aktivasi YouTube Data API v3.</div>';
    }
  } finally {
    button.disabled = false;
    button.textContent = 'Cari';
  }
}
$('youtubeApiToggle')?.addEventListener('click', () => showYoutubeApiSettings($('youtubeApiSettings').classList.contains('hidden')));
$('youtubeApiSaveBtn')?.addEventListener('click', () => {
  const key = $('youtubeApiKeyInput').value.trim();
  if (!key) { $('youtubeApiKeyInput').focus(); return; }
  try { localStorage.setItem(YOUTUBE_API_KEY_STORAGE, key); } catch (_) {}
  setYoutubeKeyStatus(true);
  showYoutubeApiSettings(false);
  $('youtubeResults').innerHTML = '<div class="studio-empty">API key tersimpan. Sekarang cari judul lagu atau artis lagi.</div>';
});
$('youtubeApiClearBtn')?.addEventListener('click', () => {
  try { localStorage.removeItem(YOUTUBE_API_KEY_STORAGE); } catch (_) {}
  $('youtubeApiKeyInput').value = '';
  setYoutubeKeyStatus(false);
  $('youtubeResults').innerHTML = '<div class="studio-empty">API key dihapus dari perangkat ini.</div>';
});
$('youtubeApiConsoleBtn')?.addEventListener('click', () => openExternal('https://console.cloud.google.com/apis/credentials'));
$('youtubeSearchBtn')?.addEventListener('click', searchYoutubeInStudio);
$('youtubeSearchInput')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') searchYoutubeInStudio();
});
setYoutubeKeyStatus(!!savedYoutubeKey());
$('youtubeLoadBtn')?.addEventListener('click', () => {
  const id = parseYoutubeId($('youtubeUrlInput').value);
  if (!id) {
    $('youtubeUrlInput').setCustomValidity('Tempel URL video YouTube yang valid.');
    $('youtubeUrlInput').reportValidity();
    return;
  }
  $('youtubeUrlInput').setCustomValidity('');
  loadYoutubeVideo(id);
});
$('youtubeUrlInput')?.addEventListener('input', () => $('youtubeUrlInput').setCustomValidity(''));
$('backingAudio')?.addEventListener('error', () => setStatus('backingFileName', 'Browser tidak bisa memutar format file ini. Coba WAV PCM atau MP3.', 'warn'));
if (!isNative()) {
  $('audioEngineBadge').textContent = 'PERLU APK';
  $('guitarRecordBtn').disabled = true;
  $('guitarPlayBtn').disabled = true;
  setStatus('recordStatus', 'UI ini bisa dipreview di web, tetapi USB audio dan perekaman native harus diuji dari APK Android.', 'warn');
} else {
  restoreTakes();
}

// Native Camera2 UI only; preset editor and SysEx paths remain untouched.
let cameraOpen=false,cameraRecording=false,cameraFrontFacing=false,cameraStartedAt=0,cameraTick=null,cameraEventsReady=false,cameraVideos=[],cameraBoundsRaf=0;
function cameraStatus(m,k=''){const n=$('cameraStatus');if(!n)return;n.textContent=m;n.classList.remove('ok','warn');if(k)n.classList.add(k)}
function cameraBounds(){const e=$('cameraPreviewFrame');if(!e)return null;const r=e.getBoundingClientRect();return{left:Math.max(0,Math.round(r.left)),top:Math.max(0,Math.round(r.top)),width:Math.max(1,Math.round(r.width)),height:Math.max(1,Math.round(r.height))}}
function cameraUpdateBounds(){if(!cameraOpen||!isNative()||cameraBoundsRaf)return;cameraBoundsRaf=requestAnimationFrame(async()=>{cameraBoundsRaf=0;const b=cameraBounds();if(b)try{await MG30Camera.updatePreviewBounds(b)}catch(_){}})}
function cameraTime(ms){const s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function cameraTimerStart(){cameraStartedAt=Date.now();if(cameraTick)clearInterval(cameraTick);cameraTick=setInterval(()=>{if($('cameraTimer'))$('cameraTimer').textContent=cameraTime(Date.now()-cameraStartedAt)},250)}
function cameraTimerStop(){if(cameraTick)clearInterval(cameraTick);cameraTick=null;cameraStartedAt=0}
function cameraButtons(){if($('cameraOpenBtn')){$('cameraOpenBtn').disabled=cameraOpen;$('cameraOpenBtn').textContent=cameraOpen?'Kamera aktif':'Aktifkan kamera'}if($('cameraSwitchBtn')){$('cameraSwitchBtn').disabled=!cameraOpen||cameraRecording;$('cameraSwitchBtn').textContent=cameraFrontFacing?'↔ Kamera belakang':'↔ Kamera depan'}if($('cameraRecordBtn')){$('cameraRecordBtn').disabled=!cameraOpen||cameraRecording;$('cameraRecordBtn').classList.toggle('is-recording',cameraRecording);$('cameraRecordBtn').textContent=cameraRecording?'● MEREKAM':'● Rekam video'}if($('cameraStopBtn'))$('cameraStopBtn').disabled=!cameraRecording;if($('cameraLiveTag')){$('cameraLiveTag').textContent=cameraRecording?'RECORDING':cameraOpen?'LIVE':'STANDBY';$('cameraLiveTag').classList.toggle('is-recording',cameraRecording)}if($('cameraPreviewPlaceholder'))$('cameraPreviewPlaceholder').classList.toggle('hidden',cameraOpen)}
function cameraModes(d){if(!d)return;const n=$('cameraNrStatus'),e=$('cameraEdgeStatus');if(n){n.textContent=d.noiseReductionStatus||(d.noiseReductionOffSupported?'OFF diminta · menunggu capture':'OFF tidak didukung');n.classList.toggle('ok',d.noiseReductionMode===0);n.classList.toggle('warn',d.noiseReductionMode!==0)}if(e){e.textContent=d.edgeStatus||(d.edgeOffSupported?'OFF diminta · menunggu capture':'OFF tidak didukung');e.classList.toggle('ok',d.edgeMode===0);e.classList.toggle('warn',d.edgeMode!==0)}if(d.pipeline==='recording')cameraStatus('Video capture: NR '+(d.noiseReductionMode===0?'OFF diterapkan':'belum terverifikasi OFF')+' · Edge '+(d.edgeMode===0?'OFF diterapkan':'belum terverifikasi OFF')+'.',d.noiseReductionMode===0&&d.edgeMode===0?'ok':'warn')}
async function cameraEvents(){if(cameraEventsReady||!isNative())return;cameraEventsReady=true;try{await MG30Camera.addListener('processingStatus',cameraModes);await MG30Camera.addListener('cameraError',e=>cameraStatus(e?.message||'Kesalahan Camera2.','warn'));await MG30Camera.addListener('recordingInterrupted',async()=>{cameraRecording=false;cameraTimerStop();cameraButtons();cameraStatus('Rekaman ditutup saat kamera berhenti atau app masuk latar belakang.','warn');await cameraLoadVideos()})}catch(e){console.warn(e)}}
async function cameraOpenPreview(){if(!isNative()){cameraStatus('Camera2 native hanya tersedia di APK Android.','warn');return}if(cameraOpen)return;const b=cameraBounds();if(!b)return;$('cameraOpenBtn').disabled=true;cameraStatus('Meminta izin dan menyiapkan Camera2…');await cameraEvents();try{const d=await MG30Camera.openPreview({...b,facing:cameraFrontFacing?'front':'back'});cameraOpen=true;cameraFrontFacing=d.facing==='front';cameraButtons();cameraModes({noiseReductionOffSupported:d.noiseReductionOffSupported,edgeOffSupported:d.edgeOffSupported,noiseReductionStatus:d.noiseReductionOffSupported?'OFF diminta · verifikasi capture':'OFF tidak didukung',edgeStatus:d.edgeOffSupported?'OFF diminta · verifikasi capture':'OFF tidak didukung'});cameraStatus('Preview aktif · '+(cameraFrontFacing?'kamera depan':'kamera belakang')+'. Hasil akhir mengikuti CaptureResult.','ok');cameraUpdateBounds();await cameraLoadVideos()}catch(e){cameraOpen=false;cameraButtons();cameraStatus(e?.message||'Kamera gagal dibuka.','warn')}}
async function cameraClosePreview(m='Kamera ditutup.'){if(!cameraOpen||!isNative())return;try{const d=await MG30Camera.closePreview();if(d?.stoppedRecording)await cameraLoadVideos()}catch(e){cameraStatus(e?.message||'Gagal menutup kamera.','warn')}finally{cameraOpen=false;cameraRecording=false;cameraTimerStop();cameraButtons();if(m)cameraStatus(m)}}
async function cameraSwitch(){if(!cameraOpen||cameraRecording)return;const n=!cameraFrontFacing;await cameraClosePreview('');cameraFrontFacing=n;await cameraOpenPreview()}
async function cameraStart(){if(!cameraOpen||cameraRecording)return;$('cameraRecordBtn').disabled=true;cameraStatus('Menyiapkan encoder H.264…');try{const r=await MG30Camera.startRecording();cameraRecording=true;cameraButtons();cameraTimerStart();cameraStatus('Merekam '+(r.videoWidth||1280)+'×'+(r.videoHeight||720)+' MP4 tanpa audio mikrofon.','ok')}catch(e){cameraRecording=false;cameraButtons();cameraStatus(e?.message||'Gagal memulai rekaman.','warn')}}
async function cameraStop(){if(!cameraRecording)return;$('cameraStopBtn').disabled=true;cameraStatus('Memfinalisasi MP4…');try{const r=await MG30Camera.stopRecording();cameraRecording=false;cameraTimerStop();if($('cameraTimer'))$('cameraTimer').textContent=cameraTime(r.durationMs||0);cameraButtons();cameraStatus('Tersimpan: '+r.fileName+' · '+bytesLabel(r.sizeBytes||0),'ok');await cameraLoadVideos()}catch(e){cameraRecording=false;cameraTimerStop();cameraButtons();cameraStatus(e?.message||'Gagal menyimpan video.','warn');await cameraLoadVideos()}}
async function cameraLoadVideos(){const node=$('cameraRecordingList');if(!node)return;if(!isNative()){node.innerHTML='<div class="studio-empty">Daftar video tersedia di APK Android.</div>';return}try{const r=await MG30Camera.listRecordings();cameraVideos=r.recordings||[];if(!cameraVideos.length){node.innerHTML='<div class="studio-empty">Belum ada video tersimpan.</div>';return}node.innerHTML=cameraVideos.map((v,i)=>'<div class="camera-recording-item"><div class="camera-recording-icon">▶</div><div class="camera-recording-copy"><strong>'+safeText(v.fileName)+'</strong><small>'+safeText(bytesLabel(v.sizeBytes||0))+' · '+safeText(new Date(v.lastModified||Date.now()).toLocaleString())+'</small></div><div class="camera-recording-actions"><button class="studio-take-action" data-camera-play="'+i+'" aria-label="Putar video">▶</button><button class="studio-take-action" data-camera-rename="'+i+'" aria-label="Ganti nama video">✎</button></div></div>').join('');node.querySelectorAll('[data-camera-play]').forEach(b=>b.addEventListener('click',()=>{const v=cameraVideos[Number(b.dataset.cameraPlay)];if(!v)return;const p=$('cameraPlayback');p.src=playbackPathFor(v);p.classList.remove('hidden');p.load();p.play().catch(()=>{})}));node.querySelectorAll('[data-camera-rename]').forEach(b=>b.addEventListener('click',async()=>{const v=cameraVideos[Number(b.dataset.cameraRename)];if(!v)return;const n=prompt('Nama rekaman video:',v.fileName.replace(/\.mp4$/i,''));if(n==null)return;try{await MG30Camera.renameRecording({path:v.path,name:n.trim()});await cameraLoadVideos();cameraStatus('Nama video diperbarui.','ok')}catch(e){cameraStatus(e?.message||'Gagal mengganti nama.','warn')}}))}catch(e){node.innerHTML='<div class="studio-empty">Gagal membaca daftar video.</div>';cameraStatus(e?.message||'Gagal membaca folder video.','warn')}}
$('cameraOpenBtn')?.addEventListener('click',cameraOpenPreview);$('cameraSwitchBtn')?.addEventListener('click',cameraSwitch);$('cameraRecordBtn')?.addEventListener('click',cameraStart);$('cameraStopBtn')?.addEventListener('click',cameraStop);$('cameraRefreshBtn')?.addEventListener('click',cameraLoadVideos);$('cameraOpenStudioBtn')?.addEventListener('click',()=>document.querySelector('.nav button[data-page="studio"]')?.click());
document.querySelectorAll('.nav button[data-page]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.page==='camera')requestAnimationFrame(()=>{if(cameraOpen)cameraUpdateBounds()});else if(cameraOpen)cameraClosePreview('Kamera ditutup saat berpindah halaman.')}));window.addEventListener('resize',cameraUpdateBounds,{passive:true});window.addEventListener('scroll',cameraUpdateBounds,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(cameraUpdateBounds,150),{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden&&cameraOpen)cameraClosePreview('Kamera ditutup saat app masuk latar belakang.')});cameraButtons();if(!isNative())cameraStatus('Camera2 native hanya tersedia di APK Android.','warn');else cameraLoadVideos();
