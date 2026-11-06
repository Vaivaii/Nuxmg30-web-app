# MG-30 Studio — perubahan UI berdasarkan screenshot pengguna (2026-11-06)

Branch: `feature/post-effects-parallel-routing`

## Screenshot yang dijadikan acuan
1. Screenshot panel **MG-30 Hardware Levels**: menampilkan USB Loopback, Record Level, dan Playback Level pada halaman DAW.
2. Screenshot Track Input Routing: pengguna meminta panel **Raw USB input diagnostic · 4 channels** dihilangkan.

## Perubahan
- Menghapus markup panel Raw USB input diagnostic dari UI Track Settings.
- Melepas pemanggilan render dan event listener tombol diagnostic dari panel input routing.
- Mempertahankan daftar pemetaan input per-track dan catatan routing yang sudah ada.
- Mempertahankan panel MG-30 Hardware Levels sebagai scaffold visual.

## Batas fungsional yang belum terselesaikan
- USB Loopback, Record Level, dan Playback Level masih disabled.
- Capture USB/SysEx yang tersedia sejauh ini belum membuktikan format perintah WRITE untuk ketiga kontrol tersebut pada MG-30 Gen 2 firmware 6.0.x.
- Jangan mengaktifkan kontrol dengan nilai lokal palsu atau mengirim SysEx tebakan. Dibutuhkan capture QuickTone yang mengubah masing-masing kontrol dan mencakup USB OUT serta IN.
- NAM, IR, pemetaan MIDI, dan jalur audio/recording yang sudah ada tidak diubah oleh perubahan ini.

## Commit
- `1370410f1d9a0c824a72413f9d6d7c798c1bd18d` — remove raw USB input diagnostic panel from Track Settings.

## Validasi
- Perubahan hanya pada markup dan wiring UI panel diagnostic di `www/studio-daw.js`.
- Belum menjalankan APK build atau tes perangkat setelah perubahan ini.
