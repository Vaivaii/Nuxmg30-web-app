import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const MG30Audio = registerPlugin('MG30Audio');
const $ = (id) => document.getElementById(id);
const isNative = () => Capacitor.isNativePlatform();
const safeText = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let backingObjectUrl = null;
let recording = false;
let takeNumber = 0;
const takes = [];

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
  const enc = (device.encodings || []).map((x) => x === 2 ? 'PCM 16-bit' : (x === 4 ? 'PCM float' : (x === 21 ? 'PCM 24-bit packed' : 'encoding ' + x)));
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
      setStatus('audioStatus', 'Input USB ditemukan. Ini baru tes deteksi; lanjutkan rekaman percobaan untuk memverifikasi jalur yang benar-benar dipakai.', 'ok');
      $('guitarTrackMeta').textContent = 'Input USB terdeteksi · siap diuji dengan rekaman';
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
    $('audioCheckBtn').textContent = '⌁ Tes ulang kompatibilitas USB Audio';
  }
}
function renderTakes() {
  $('takeCount').textContent = takes.length + (takes.length === 1 ? ' take' : ' take');
  if (!takes.length) {
    $('takeList').innerHTML = '<div class="studio-empty">Take gitar akan muncul setelah rekaman pertama selesai.</div>';
    return;
  }
  $('takeList').innerHTML = takes.map((take, index) =>
    '<div class="studio-take"><div class="studio-take-icon">♫</div><div class="studio-take-copy"><strong>' +
    safeText(take.fileName) + '</strong><small>' + safeText(take.sampleRate + ' Hz · ' + take.bitDepth + '-bit · ' + take.channels + ' ch · ' + bytesLabel(take.dataBytes)) +
    '<br>' + safeText(take.routeName || 'USB input') + '</small></div><button class="btn" type="button" data-play-take="' + index + '">Putar</button></div>'
  ).join('');
  $('takeList').querySelectorAll('[data-play-take]').forEach((button) => {
    button.addEventListener('click', () => {
      const take = takes[Number(button.dataset.playTake)];
      if (!take) return;
      const webPath = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(take.path) : take.path;
      $('guitarPlayback').src = webPath;
      $('guitarPlayback').play().catch(() => {});
    });
  });
}
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
    $('guitarTrackMeter').classList.add('is-recording');
    $('guitarTrackMeta').textContent = result.sampleRate + ' Hz · PCM ' + result.bitDepth + '-bit · ' + result.channels + ' channel';
    setStatus('recordStatus', 'RECORDING · input aktual: ' + (result.routeName || 'USB audio') + ' · PCM ' + result.bitDepth + '-bit / ' + result.sampleRate + ' Hz.', 'ok');
  } catch (error) {
    setStatus('recordStatus', error?.message || 'Tidak dapat memulai rekaman USB.', 'warn');
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
    if (take && take.path) {
      takeNumber += 1;
      takes.unshift(take);
      renderTakes();
      const webPath = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(take.path) : take.path;
      $('guitarPlayback').src = webPath;
      $('guitarTrackMeta').textContent = take.sampleRate + ' Hz · PCM ' + take.bitDepth + '-bit · ' + take.channels + ' channel';
      setStatus('recordStatus', 'Take tersimpan: ' + take.fileName + ' · ' + bytesLabel(take.dataBytes) + '. Dengarkan hasilnya lewat pemutar di bawah.', 'ok');
    } else {
      setStatus('recordStatus', 'Rekaman berhenti tetapi file take tidak dikembalikan oleh audio engine.', 'warn');
    }
  } catch (error) {
    recording = false;
    $('guitarTrackMeter').classList.remove('is-recording');
    setStatus('recordStatus', error?.message || 'Gagal menyimpan take WAV.', 'warn');
  } finally {
    $('guitarRecordBtn').disabled = false;
    $('guitarStopBtn').disabled = true;
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
$('backingFileInput')?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (backingObjectUrl) URL.revokeObjectURL(backingObjectUrl);
  backingObjectUrl = URL.createObjectURL(file);
  $('backingAudio').src = backingObjectUrl;
  $('backingFileName').textContent = file.name + ' · ' + bytesLabel(file.size) + ' · siap diputar terpisah dari track gitar.';
  $('backingFileName').classList.add('ok');
});
$('backingVolume')?.addEventListener('input', (event) => {
  const value = Number(event.target.value);
  $('backingVolumeValue').textContent = value + '%';
  $('backingAudio').volume = value / 100;
});
$('backingAudio') && ($('backingAudio').volume = 0.8);
$('youtubeSearchBtn')?.addEventListener('click', () => {
  const query = $('youtubeSearchInput').value.trim();
  if (!query) {
    setStatus('audioStatus', 'Masukkan judul lagu atau artis di kolom YouTube terlebih dahulu.');
    $('youtubeSearchInput').focus();
    return;
  }
  openExternal('https://www.youtube.com/results?search_query=' + encodeURIComponent(query));
});
$('youtubeSearchInput')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') $('youtubeSearchBtn').click();
});
$('youtubeLoadBtn')?.addEventListener('click', () => {
  const id = parseYoutubeId($('youtubeUrlInput').value);
  if (!id) {
    $('youtubeUrlInput').setCustomValidity('Tempel URL video YouTube yang valid.');
    $('youtubeUrlInput').reportValidity();
    return;
  }
  $('youtubeUrlInput').setCustomValidity('');
  $('youtubePlayer').src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?playsinline=1&rel=0';
});
$('youtubeUrlInput')?.addEventListener('input', () => $('youtubeUrlInput').setCustomValidity(''));
$('backingAudio')?.addEventListener('error', () => setStatus('backingFileName', 'Browser tidak bisa memutar format file ini. Coba WAV PCM atau MP3.', 'warn'));
if (!isNative()) {
  $('audioEngineBadge').textContent = 'PERLU APK';
  $('guitarRecordBtn').disabled = true;
  setStatus('recordStatus', 'UI ini bisa dipreview di web, tetapi USB audio dan perekaman native harus diuji dari APK Android.', 'warn');
}