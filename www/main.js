import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import './native-midi.js';
import './tone3000.js';
import './ir-transfer.js';

const MG30Audio = registerPlugin('MG30Audio');
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
window.NUXStudioInspectAudio = inspectAudio;
window.addEventListener('mg30-midi-connected', () => { void inspectAudio(); });
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
    node.textContent = saved ? 'API key tersimpan di perangkat' : 'API key belum disetel';
    node.classList.toggle('is-configured', !!saved);
  }
  const searchHint = $('youtubeSearchHint');
  if (searchHint) searchHint.textContent = saved ? 'API key siap digunakan' : 'API key diatur dari Device';
}
function showYoutubeApiSettings(show = true) {
  $('youtubeApiSettings')?.classList.toggle('hidden', !show);
  $('youtubeApiToggle')?.setAttribute('aria-expanded', String(!!show));
  if (show && $('youtubeApiKeyInput')) $('youtubeApiKeyInput').value = savedYoutubeKey();
}
function loadYoutubeVideo(videoId) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId || '')) return;
  $('youtubePlayer').src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&playsinline=1&rel=0';
  $('studioVideoWrap')?.classList.remove('hidden');
  $('youtubePlayer').title = 'Pemutar YouTube · ' + (document.querySelector('[data-youtube-id="' + videoId + '"] .youtube-result-copy strong')?.textContent || 'Video');
  $('youtubeResults')?.classList.add('hidden');
  if ($('youtubeUrlDetails')) $('youtubeUrlDetails').open = false;
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
    setYoutubeKeyStatus(false);
    const hint = $('youtubeSearchHint');
    if (hint) hint.textContent = 'Atur API key pada tab Device';
    $('youtubeResults').classList.remove('hidden');
    $('youtubeResults').innerHTML = '<div class="studio-empty">Atur YouTube Data API v3 pada tab Device, lalu cari lagi. Hasil video akan bisa diketuk langsung di sini.</div>';
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
