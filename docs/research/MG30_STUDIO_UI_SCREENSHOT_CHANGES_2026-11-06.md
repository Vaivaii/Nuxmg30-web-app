# MG-30 Studio — perubahan UI dan mode pengujian kontrol hardware (2026-11-06)

Branch: `feature/post-effects-parallel-routing`

## Screenshot pengguna
1. Panel MG-30 Hardware Levels: USB Loopback, Record Level, Playback Level.
2. Track Input Routing: permintaan menghapus panel Raw USB input diagnostic.

## Perubahan UI
- Panel Raw USB input diagnostic, tombol START RAW USB 1–4 TEST, dan area hasilnya dihapus dari Track Settings.
- Panel Track Input Routing dan pemetaan input per-track dipertahankan.
- USB Loopback, Record Level, Playback Level kini aktif untuk pengujian antarmuka lokal.
- Slider memperbarui readout; checkbox memperbarui status preview.

## Batasan hardware — penting
Kontrol saat ini **UI TEST MODE saja**. Interaksi tidak mengirim MIDI/SysEx dan tidak mengubah pengaturan fisik MG-30. Protokol WRITE untuk original MG-30 Gen 2 firmware 6.0.x belum tervalidasi. Jangan menganggap perubahan nilai di layar sebagai perubahan perangkat.

## Fitur yang dipertahankan
- NAM dan IR transfer paths.
- MIDI mappings.
- DAW track input routing.
- Raw USB diagnostic tetap tidak ditampilkan di UI.

## Commit
- `1370410f1d9a0c824a72413f9d6d7c798c1bd18d` — remove raw USB diagnostic panel.
- `300a57648bb2277ace6249a375d921d3d009589b` — enable controls for safe UI-only testing.

## Validasi
Source-level inspection saja. APK build dan pengujian perangkat fisik belum dilakukan.
