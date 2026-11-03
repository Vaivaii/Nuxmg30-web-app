# MG30 Studio — Stage 2: Native Metronome, Loop and Output Meters

Tanggal: 3 November 2026  
Target: NUX MG-30 original Gen 2 firmware 6.0.x (bukan MKII).

## Pemicu tahap
Pengguna mengonfirmasi bahwa playback DAW melalui output yang dikerjakan pada Stage 1 sekarang berhasil. Tahap ini mengimplementasikan tiga tindak lanjut yang sudah tercatat dalam dokumen output-routing:
1. Metronome masuk ke jalur PCM native MG-30.
2. Loop timeline mengulang di dalam stream AudioTrack yang sama.
3. Meter master stereo dan meter masing-masing track tersedia saat output MG-30 aktif.

## Branch dan isolasi
- Repository: `Vaivaii/Nuxmg30-web-app`
- Branch: `feature/studio-daw-native-loop-metronome-meters`
- Base: `feature/studio-daw-output-routing`
- Tidak mengubah `main` atau branch Stage 1.
- Tidak mengubah `native-android/MG30AudioPlugin.java` dan tidak membuat/mengubah AudioRecord.
- Plugin output native yang sudah dipakai Stage 1 tetap menggunakan AudioTrack dan pemeriksaan ID route MG-30.

## Perubahan implementasi
### Metronome native
- Click dibangkitkan sebagai sampel PCM di JS sebelum encoding PCM16.
- Posisi click dihitung dari waktu timeline, tempo project, dan time signature.
- Beat pertama setiap bar memakai 1.500 Hz; beat lain 900 Hz, dengan envelope pendek yang konsisten dengan click Web Audio sebelumnya.
- Click dicampurkan ke pasangan channel master, sehingga mengikuti outputRoute MG-30 dan tidak bocor ke speaker HP.
- Meter track tidak memasukkan click; meter master merefleksikan sinyal akhir termasuk click.

### Loop native
- Pump native tidak lagi berhenti di akhir timeline saat loop aktif.
- Setelah chunk terakhir di timeline ditulis, cursor kembali ke nol dan data timeline berikutnya dikirim melalui AudioTrack yang sama.
- AudioTrack tidak dihentikan/dibuat ulang pada batas loop.
- Playhead UI menggunakan posisi modulo durasi project saat native loop aktif.
- Saat loop dimatikan, stream berhenti normal pada ujung timeline.

### Meter native
- `renderAudioChunk` memiliki mode tambahan untuk merender pasangan stereo master plus pasangan stereo terpisah untuk tiap track.
- Master L dan R diukur terpisah dari output hasil render.
- Empat meter track memakai tap post-fader/post-pan masing-masing track, lalu mengisi LED VU yang sudah ada di Mixer.
- Meter diperbarui setiap chunk PCM native (500 ms); ini adalah refresh berbasis chunk, bukan analyzer hardware real-time.
- Meter dibersihkan saat pause/stop/end/error.

## Batasan dan hal yang belum boleh diklaim
- Chunk output tetap 500 ms dari Stage 1. Belum ada pengukuran baru untuk dropouts, latency, CPU, atau kontinuitas pada HP/perangkat fisik.
- Loop tidak memutus AudioTrack di batas akhir, tetapi kualitas transisi tanpa gap tetap perlu didengarkan di perangkat fisik.
- Metronome dan meter native baru divalidasi oleh tes kode/build; belum diklaim telah diuji secara akustik di MG-30.
- Full-duplex USB, monitoring langsung saat merekam, overdub simultan dengan playback USB, dan sinkronisasi input-output tetap tahap terpisah.
- Tidak mengubah perilaku routing pedal, REAMP/PLAY LEVEL, atau setting MG-30 secara otomatis.

## Regression guardrails
- NAM import/transfer tidak disentuh.
- IR User/Third Party dan IR Collection tidak disentuh.
- MIDI mapping dan USB-MIDI framing tidak disentuh.
- Preset read/write/import/export tidak disentuh.
- Signal Chain, CTRL/EXP, Editor dan Device Settings tidak disentuh.
- USB AudioRecord plugin `MG30AudioPlugin.java` tidak disentuh.
- Project/track media model dan routing input track tidak diubah; perubahan hanya pada render/playback dan meter native.

## Validasi otomatis yang ditambahkan
- Native metronome click harus masuk ke stream PCM dan mengikuti tempo/time signature.
- Loop native harus melakukan cursor wrap tanpa restart AudioTrack.
- Meter native harus memiliki channel master L/R dan tap terpisah untuk tiap track.
- Workflow Android APK diaktifkan untuk branch Stage 2.

## Rencana uji perangkat
1. Output MG-30, metronome OFF/ON, pastikan click terdengar dari MG-30 dan tidak dari speaker HP.
2. Loop OFF: playback berhenti pada akhir timeline.
3. Loop ON: playback kembali dari awal tanpa jeda/putus yang mengganggu.
4. Mixer: master L/R dan meter Backing, Guitar, Bass, Vocals bergerak sesuai track yang aktif; mute/solo harus tercermin.
5. Pause, resume, stop, seek, cabut USB dan sambungkan ulang; pastikan stream berhenti aman dan tidak pindah diam-diam ke speaker HP.
6. Pastikan speaker route Stage 1 dan USB recording yang sudah ada tetap berfungsi.
7. Jangan ubah/merge branch utama sebelum hasil uji fisik pengguna dilaporkan.

