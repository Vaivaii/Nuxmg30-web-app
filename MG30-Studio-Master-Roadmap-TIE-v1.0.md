# MG30 STUDIO

## Master Roadmap & Technical Specification

### Tone Intelligence Engine (TIE)

**Dokumen:** Master Roadmap dan Spesifikasi Teknis\
**Versi:** 1.0\
**Status:** Proposed / Active Development Planning\
**Platform:** Android / PWA\
**Target hardware:** NUX MG-30 Gen 2\
**Tanggal:** 19 November 2026

------------------------------------------------------------------------

# 1. Tujuan Dokumen

Dokumen ini merupakan acuan utama pengembangan MG30 Studio. Dokumen
menggabungkan visi produk, arsitektur tingkat tinggi, rancangan UI/UX,
spesifikasi Tone Intelligence Engine, aturan integrasi, tahapan
implementasi, dan sistem checkpoint.

Dokumen ini harus digunakan bersama kondisi repository yang sebenarnya.
Spesifikasi tidak berarti suatu fitur sudah tersedia atau telah diuji.
Sebelum implementasi, lakukan audit kode dan verifikasi kemampuan
perangkat, browser, firmware, serta provider yang digunakan.

## Prinsip pengembangan

-   Pertahankan fitur yang sudah berjalan.
-   Audit repository sebelum mengubah kode.
-   Implementasikan secara bertahap dan terukur.
-   Jangan mengarang kemampuan, data perangkat, hasil pengukuran, atau
    status pengujian.
-   Pisahkan pengukuran DSP, interpretasi teknis, hipotesis, dan
    rekomendasi AI.
-   Catat setiap keputusan arsitektur dan perubahan roadmap.
-   Jangan mengulang pekerjaan yang sudah selesai dan diverifikasi.

------------------------------------------------------------------------

# 2. Visi Produk

MG30 Studio dikembangkan menjadi platform terpadu untuk:

-   Guitar tone editing dan device control.
-   NAM dan IR management.
-   Preset management.
-   Jamming dan recording.
-   Mini 4-track DAW.
-   Audio analysis dan audio engineering.
-   Tone comparison.
-   Signal chain diagnostics.
-   AI-assisted guitar tone consultation.

**Visi akhir: A Complete Guitar Editing, Recording, Audio Engineering &
AI Tone Intelligence Platform.**

MG30 Studio bukan hanya editor untuk mengontrol NUX MG-30, tetapi juga
lingkungan kerja untuk membuat, merekam, mengukur, membandingkan,
memahami, dan menyempurnakan karakter tone gitar.

------------------------------------------------------------------------

# 3. Struktur Aplikasi dan Navigasi Utama

Pertahankan lima tab utama yang sudah ada:

  Tab        Tanggung jawab
  ---------- -------------------------------------------------------
  Editor     Editing efek, parameter, tone creation, dan AI Editor
  NAM & IR   Pengelolaan NAM capture dan Impulse Response
  Presets    Pengelolaan preset
  Studio     Jamm, Record, DAW, dan Tone Analysis
  Device     Koneksi dan konfigurasi perangkat

**Larangan:** Jangan menambah bottom navigation keenam atau mengubah
fungsi lima tab utama sebagai bagian dari implementasi TIE.

## 3.1 Studio memiliki dua workspace

Tab Studio dikembangkan menjadi dua workspace internal:

1.  **Jamm & Record**
2.  **Tone Analysis**

Tambahkan workspace selector di bawah header Studio. Bentuk yang
disarankan adalah segmented control:

`[ Jamm & Record ] [ Tone Analysis ]`

### Jamm & Record

Workspace ini mempertahankan tampilan dan fungsi Studio yang sudah ada,
termasuk:

-   Jamm.
-   Quick Record.
-   Mini DAW 4 Track.
-   Timeline.
-   Mixer.
-   Track Settings.
-   Playback Controls.
-   USB Loopback.
-   Input Gain.
-   Fitur recording lain yang sudah tersedia.

Jangan merombak DAW hanya untuk menambahkan Tone Analysis. Perubahan
visual dibatasi pada penambahan selector dan integrasi navigasi yang
diperlukan.

Perpindahan workspace tidak boleh secara tidak sengaja menghentikan
recording, mereset playback, menghapus track, atau membuang state.
Perilaku ketika recording aktif harus ditentukan setelah audit lifecycle
audio dan state aplikasi.

### Tone Analysis

Workspace baru untuk Tone Intelligence Engine. Workspace ini memiliki
lima sub-menu internal:

1.  Analyzer.
2.  Compare.
3.  Signal Chain.
4.  Intelligence.
5.  AI Consultant.

Gunakan compact horizontal navigation atau segmented navigation yang
dapat di-scroll pada layar sempit. Jangan membuat bottom navigation
kedua.

------------------------------------------------------------------------

# 4. Tone Intelligence Engine (TIE)

TIE adalah sistem analisis gitar dan audio engineering yang
menggabungkan:

-   Digital Signal Processing (DSP).
-   Audio capture dan recording.
-   Tone comparison.
-   Signal Chain Intelligence.
-   Guitar Tone Knowledge Base.
-   AI reasoning melalui provider yang telah tersedia.

## 4.1 Sasaran utama

TIE harus membantu pengguna:

-   Memahami karakteristik sinyal audio.
-   Melihat distribusi energi frekuensi.
-   Mengidentifikasi clipping, noise, dan ketidakseimbangan yang
    terukur.
-   Membandingkan dua rekaman atau konfigurasi tone.
-   Memeriksa konfigurasi signal chain.
-   Memahami kemungkinan penyebab karakter tone.
-   Mendapatkan rekomendasi teknis dengan dasar data yang jelas.

TIE tidak boleh menjanjikan bahwa satu metrik sederhana dapat menentukan
kualitas tone atau memastikan penyebab suatu masalah. Contohnya, puncak
high-frequency tidak otomatis berarti digital fizz.

------------------------------------------------------------------------

# 5. Rancangan UI/UX

## 5.1 Design language

Ikuti identitas visual MG30 Studio yang sudah ada:

-   Dark charcoal background.
-   Deep green/black surfaces.
-   Lime green sebagai highlight utama.
-   Metallic gray borders.
-   Rounded cards.
-   Subtle glass effect jika sesuai dengan sistem UI saat ini.
-   Typography yang bersih.
-   Layout ringkas dan profesional.
-   Responsive untuk Android, terutama layar mobile.

Jangan membuat Tone Analysis terlihat seperti aplikasi terpisah. Gunakan
design tokens, komponen, spacing, radius, typography, dan pola interaksi
yang telah digunakan MG30 Studio.

## 5.2 Studio workspace selector

Di bawah header Studio tampilkan:

-   Jamm & Record
-   Tone Analysis

Workspace yang aktif harus terlihat jelas melalui lime highlight atau
treatment aktif yang konsisten dengan aplikasi.

Jamm & Record tetap menjadi tampilan DAW yang sekarang. Tone Analysis
menampilkan workspace analisis.

## 5.3 Struktur halaman Tone Analysis

Header: - Judul Tone Analysis. - Status sumber audio bila relevan. -
Tombol AI untuk membuka konsultasi Studio.

Sub-navigation: - Analyzer. - Compare. - Signal Chain. - Intelligence. -
AI Consultant.

Konten halaman mengikuti sub-menu yang dipilih. Pada Android, hindari
menampilkan terlalu banyak grafik dan metrik sekaligus. Gunakan cards,
expandable sections, dan progressive disclosure.

## 5.4 Analyzer screen

Urutan layout yang disarankan:

1.  Audio Source Card.
2.  Analysis Controls.
3.  Frequency Visualization.
4.  Audio Metrics.
5.  Diagnosis / Findings.
6.  AI Interpretation entry point.

Audio Source Card: - Source selector. - Connection/status indicator. -
Input level meter jika sumber mendukung. - Sumber USB Loopback, live
input jika tersedia, Quick Record, import WAV, atau rekaman yang sudah
ada.

Analysis Controls: - Analyze Once. - Live Analysis. - Stop. - Refresh /
Select Source.

Visualisasi: - FFT Frequency Spectrum. - Spectrogram. - Frequency
Response bila definisi dan metode pengukurannya tersedia. - Harmonic
display bila dapat dihitung dengan benar. - Audio level meter.

Sediakan pilihan tampilan: - Spectrum. - Spectrogram. - Meter. -
Harmonics.

Metrics cards: - RMS. - Sample Peak. - True Peak hanya jika implementasi
oversampling dan metodenya tersedia. - Crest Factor. - Spectral
Centroid. - Spectral Rolloff. - Noise Floor dengan metode estimasi yang
dijelaskan. - Dynamic Range dengan definisi pengukuran yang jelas. - THD
hanya dalam kondisi dan metode pengujian yang sesuai.

Potential findings: - Clipping. - Excessive low-end energy. - Low-mid
buildup. - Potential high-frequency harshness. - Noise. - Dynamic
compression indicators. - Frequency imbalance. - Potential digital-fizz
indicators.

Gunakan bahasa seperti "indikasi", "potensi", atau "perlu pemeriksaan
lanjutan" ketika pengukuran tidak cukup untuk memastikan penyebab.

## 5.5 Compare screen

Tujuan: membandingkan dua atau lebih sumber tone secara adil.

Komponen: - Audio Slot A. - Audio Slot B. - Import recording. - Select
existing recording. - Playback A/B. - Level matching. - Spectrum
overlay. - Spectral difference. - Dynamic comparison. - Harmonic
comparison jika valid. - Summary dan AI interpretation.

Skenario: - Dua NAM captures. - Dua IR. - Dua preset. - Dua signal
chains. - Sebelum dan sesudah EQ. - Dua rekaman gitar. - Perbandingan
tone untuk headphone dan live PA.

Level matching harus transparan. Tampilkan apakah matching dilakukan
berdasarkan RMS, loudness, atau metode lain. Jangan menyamakan peak saja
lalu menyebutnya loudness matching.

Perbandingan harus mengingatkan pengguna bahwa hasil dipengaruhi oleh
level, permainan, pickup, posisi gitar, input, dan kondisi rekaman.

## 5.6 Signal Chain screen

Baca konfigurasi aktual dari editor/preset bila data tersedia.

Contoh ilustratif:

`Gate → EFX → Overdrive → AMP → NAM → IR → EQ → Delay → Reverb`

Tampilkan blok efek secara visual. Ketika blok dipilih, tampilkan
parameter yang benar-benar tersedia dari data aplikasi.

Analisis yang dapat dikembangkan: - Effect order. - Input/output level
dan gain staging jika data tersedia. - Overdrive stacking. - EQ
interaction. - Noise gate behavior. - Amp/NAM placement. - IR context. -
Potential clipping. - Potensi interaksi frekuensi.

Jangan mengarang parameter, urutan, nilai, atau karakter perangkat. Jika
suatu data tidak diekspos oleh preset atau protokol, tampilkan "data
tidak tersedia".

## 5.7 Intelligence screen

Bangun knowledge base modular dengan kategori:

-   Guitar pickups and electronics.
-   Amplifier topology dan perilaku amplifier.
-   Fender, Marshall, Vox, Mesa/Boogie, Dumble-style, Tone King, dan
    referensi amplifier lain.
-   Overdrive, distortion, fuzz.
-   Guitar speakers dan cabinet.
-   Microphone dan microphone placement.
-   Impulse Response.
-   Neural Amp Modeling.
-   EQ dan filter.
-   Dynamics dan gain staging.
-   Recording dan mixing.
-   Live PA optimization.

Knowledge base harus memisahkan: - Fakta teknis yang bersumber. -
Pengetahuan umum. - Interpretasi dari pengukuran. - Hipotesis. -
Rekomendasi.

Sediakan kategori, pencarian, halaman detail, dan struktur data yang
dapat diperbarui tanpa mengubah seluruh AI engine.

Jangan menyajikan klaim yang tidak memiliki dasar sebagai fakta pasti.

## 5.8 AI Consultant screen

AI Consultant adalah antarmuka konsultasi untuk konteks Tone Analysis.

Fitur: - Conversation history. - Message input dan send. - Suggested
questions. - Ringkasan hasil analisis aktif. - Konteks preset dan signal
chain jika tersedia. - Recommendation cards. - Aksi untuk menerapkan
rekomendasi ke Editor melalui validasi.

AI Consultant bukan sistem AI kedua. Ia menggunakan shared AI engine
yang sama dengan tombol AI di Editor.

------------------------------------------------------------------------

# 6. One AI Engine --- Two AI Access Points

Ini adalah ketentuan arsitektur utama.

MG30 Studio memiliki **satu AI Engine dengan dua tombol akses**:

## 6.1 Editor AI

Pertahankan tombol AI dan AI Live Tone Assistant yang sudah ada di
Editor.

Fokus: - Guitar tone design. - Tone creation. - Amp dan effect
recommendations. - Parameter adjustment. - EQ recommendations. - Preset
assistance. - Editor control. - USB MIDI parameter updates melalui
mekanisme yang sudah ada.

Jangan merusak validasi parameter dan mekanisme pengiriman MIDI yang
sudah berjalan.

## 6.2 Studio AI

Tambahkan tombol AI pada workspace Tone Analysis.

Fokus: - DSP interpretation. - Audio diagnosis. - Tone comparison
interpretation. - Signal chain diagnosis. - NAM dan IR consultation. -
Audio engineering. - Live PA optimization.

Tombol ini membuka AI Consultant dengan konteks analisis yang sedang
aktif.

## 6.3 Shared AI architecture

Kedua tombol menggunakan: - Satu AI orchestration layer. - Satu provider
manager. - Satu fallback system. - Satu authentication strategy yang
sudah ada. - Shared conversation history sesuai desain aplikasi. -
Shared tone context. - Shared preset context.

Jangan menduplikasi provider manager, fallback engine, autentikasi, atau
implementasi request hanya karena ada dua tombol.

Gunakan context adapter terpisah:

### Editor Context

-   Active preset.
-   Effect parameters.
-   Signal chain.
-   NAM dan IR.
-   Device state.
-   Parameter yang dapat dikontrol.

### Studio Context

-   Audio source.
-   DSP metrics.
-   Spectrum summary.
-   Comparison results.
-   Recording metadata.
-   Signal chain context.

Context harus dikirim secara selektif. Hindari mengirim data besar atau
sensitif yang tidak diperlukan.

Ketika AI mengubah parameter dari Editor, Studio harus membaca
konfigurasi terbaru dari sumber state yang benar. Ketika AI Studio
memberikan rekomendasi, pengguna dapat memilih untuk menerapkannya
melalui mekanisme validasi yang sudah tersedia.

Conversation history boleh dibagi atau disinkronkan sesuai desain
existing, tetapi konteks aktif harus jelas agar jawaban tidak mencampur
tugas Editor dan Studio.

------------------------------------------------------------------------

# 7. DSP Engine Architecture

Prioritaskan pemrosesan lokal agar analisis dasar tidak selalu
membutuhkan API berbayar.

Teknologi yang dapat dievaluasi setelah audit: - Web Audio API. -
AudioWorklet. - FFT.js atau DSP library yang sesuai. - WebAssembly untuk
kebutuhan komputasi tertentu. - Canvas atau WebGL untuk visualisasi. -
Web Workers untuk pekerjaan yang tidak boleh memblokir UI. - IndexedDB
untuk metadata dan hasil analisis.

Kemampuan yang direncanakan: - FFT. - Spectrogram. - RMS. - Peak
detection. - Crest Factor. - Spectral Centroid. - Spectral Rolloff. -
Noise floor estimation. - Harmonic analysis. - Dynamic range metrics. -
THD jika sumber dan metode pengukuran memenuhi syarat.

## 7.1 Audio source integration

Audit jalur audio yang benar-benar tersedia di aplikasi. Jangan
mengasumsikan bahwa USB MIDI otomatis menyediakan audio input. MIDI dan
audio adalah jalur berbeda.

Verifikasi secara khusus: - Apakah USB Loopback sudah dapat diakses
sebagai audio source oleh browser/app. - Apakah perangkat Android dan
browser mendukung jalur input tersebut. - Apakah Quick Record menyimpan
file atau buffer yang dapat digunakan Analyzer. - Format, sample rate,
channel count, dan bit depth sumber. - Apakah live analysis dapat
berjalan tanpa mengganggu recording/playback.

Jika suatu sumber belum tersedia, tandai sebagai dependency atau future
integration. Jangan menampilkan status "Connected" palsu.

## 7.2 Performance and safety

-   Hindari blocking main thread.
-   Gunakan asynchronous processing atau Worker bila sesuai.
-   Perhatikan penggunaan CPU, memory, dan battery Android.
-   Batasi ukuran buffer dan frekuensi update UI.
-   Hentikan atau lepaskan audio resources dengan benar.
-   Jangan mengganggu USB MIDI communication.
-   Jangan mengubah audio playback, DAW, recording, USB Loopback, atau
    input gain yang sudah berjalan.

------------------------------------------------------------------------

# 8. DSP-to-AI Data Pipeline

Alur yang direncanakan:

1.  Pengguna memilih audio source atau recording.
2.  Audio source menyediakan data yang benar-benar tersedia.
3.  DSP Engine melakukan pengukuran lokal.
4.  Signal Chain Analyzer membaca konfigurasi aktual.
5.  Knowledge Base menyediakan referensi teknis yang relevan.
6.  Context Adapter membentuk structured context.
7.  Shared AI Engine menerima data yang diperlukan.
8.  AI memberikan interpretasi, hipotesis, dan rekomendasi.
9.  UI menampilkan bukti dan keterbatasan analisis.

AI tidak harus menerima seluruh audio jika hasil DSP lokal sudah cukup.
Kirim audio ke provider hanya bila provider mendukung kemampuan tersebut
dan tugas memang membutuhkannya.

Setiap hasil AI harus memisahkan:

-   **Measured Facts:** angka atau temuan yang benar-benar dihitung.
-   **Technical Interpretation:** penjelasan teknis atas data.
-   **Hypothesis:** kemungkinan penyebab, bukan kepastian.
-   **Recommendations:** langkah uji atau perbaikan.
-   **Confidence / Limitations:** tingkat keyakinan dan data yang belum
    tersedia.

AI wajib menyatakan ketika data tidak cukup.

------------------------------------------------------------------------

# 9. Editor Shortcut

Tambahkan shortcut menuju Tone Analysis dari Editor, berdekatan dengan
tombol AI yang sudah ada.

Ketika ditekan: - Buka Studio \> Tone Analysis. - Bawa konteks preset
aktif jika tersedia. - Bawa konfigurasi signal chain. - Bawa informasi
NAM dan IR. - Jangan mengubah parameter perangkat hanya karena pengguna
membuka Analysis.

Shortcut harus ringkas dan tidak mengganggu layout Editor.

------------------------------------------------------------------------

# 10. Integrasi dengan Fitur MG30 Studio

TIE dirancang untuk terhubung dengan:

  Fitur existing           Integrasi yang direncanakan
  ------------------------ ---------------------------------------------------
  Preset Manager           Membaca preset aktif dan metadata
  NAM Manager              Menampilkan konteks NAM
  IR Collection            Memilih dan membandingkan IR
  Signal Chain Editor      Membaca urutan efek dan parameter
  AI Live Tone Assistant   Shared AI engine
  Quick Record             Sumber audio untuk analisis
  Four-track DAW           Analisis track atau hasil mix jika audio tersedia
  USB Loopback             Audio source jika jalur teknis terverifikasi
  Input Gain               Konteks level input bila tersedia
  Playback Control         A/B playback tanpa mengganggu kontrol yang ada
  Tone Journal             Menyimpan hasil analisis dan catatan

Jangan mengasumsikan semua integrasi sudah tersedia. Audit tiap fitur
dan dokumentasikan dependency.

------------------------------------------------------------------------

# 11. Roadmap Implementasi

Implementasi dilakukan bertahap. Setiap fase harus memiliki acceptance
criteria dan diuji sebelum fase berikutnya.

## Phase 0 --- Repository Audit & Architecture Mapping

Tugas: - Identifikasi branch aktif. - Audit struktur frontend dan
routing. - Audit state management. - Audit Studio dan DAW. - Audit audio
capture dan USB Loopback. - Audit AI Live Tone Assistant. - Audit semua
provider dan fallback. - Audit preset data structure. - Audit NAM dan IR
integration. - Audit komponen UI dan design tokens. - Identifikasi
risiko regresi.

Output: - Architecture map. - Daftar file/modul terkait. - Dependency
list. - Implementation plan. - Risk register.

**Jangan mulai implementasi besar sebelum audit selesai.**

## Phase 1 --- UI Foundation

Tugas: - Tambahkan Studio workspace selector. - Pertahankan Jamm &
Record. - Buat Tone Analysis workspace. - Buat lima sub-menu internal. -
Buat UI Analyzer. - Buat UI Compare. - Buat UI Signal Chain. - Buat UI
Intelligence. - Buat UI AI Consultant. - Tambahkan Editor shortcut.

Acceptance criteria: - Lima tab utama tetap ada. - DAW lama tetap
berfungsi. - Workspace dapat berpindah. - Navigasi internal berfungsi di
layar Android. - Empty, loading, error, dan ready states tersedia. -
Tidak ada angka mock yang disajikan sebagai hasil analisis aktual.

## Phase 2 --- DSP Foundation

Tugas: - Verifikasi audio source. - Implementasikan capture/import yang
didukung. - FFT dan spectrum. - RMS dan peak. - Crest factor. -
Spectrogram. - Basic metrics. - Noise floor estimation bila valid.

Acceptance criteria: - Hasil berasal dari audio aktual. - Sample rate
dan channel diketahui. - Processing tidak membekukan UI. - Error source
ditampilkan dengan jelas. - Audio resources dilepas dengan benar.

## Phase 3 --- Tone Comparison

Tugas: - Audio Slot A/B. - Playback A/B. - Level matching dengan metode
yang dinyatakan. - Spectrum overlay. - Spectral difference. - Dynamic
comparison. - Comparison report.

Acceptance criteria: - Pengguna dapat memilih dua sumber. - Perbedaan
level ditangani dan dijelaskan. - Grafik menggunakan data sumber
sebenarnya. - Tidak ada klaim kualitas tone yang hanya berdasarkan
brightness.

## Phase 4 --- Signal Chain Intelligence

Tugas: - Membaca preset dan signal chain. - Menampilkan effect blocks. -
Membaca parameter yang tersedia. - Gain staging diagnostics jika datanya
mendukung. - NAM/IR context. - Potential issue detection.

Acceptance criteria: - Data berasal dari state/preset aktual. -
Parameter yang tidak tersedia tidak dibuat-buat. - Diagnosis menyertakan
dasar dan keterbatasan.

## Phase 5 --- Shared AI Integration

Tugas: - Audit shared AI engine. - Editor Context Adapter. - Studio
Context Adapter. - Studio AI access point. - Context-aware requests. -
Shared conversation strategy. - DSP result interpretation. -
Recommendation validation.

Acceptance criteria: - Tidak ada duplikasi provider manager. - Provider
dan fallback lama tetap berfungsi. - Editor AI tetap berfungsi. - Studio
AI menerima konteks yang benar. - Rekomendasi perubahan parameter
melewati validasi.

## Phase 6 --- Tone Knowledge Base

Tugas: - Definisikan skema data. - Buat kategori dan pencarian. -
Tambahkan konten referensi terstruktur. - Tandai sumber dan tingkat
kepastian. - Hubungkan knowledge retrieval dengan AI.

Acceptance criteria: - Konten dapat diperbarui secara modular. - Fakta
dan interpretasi dibedakan. - AI tidak mengarang sumber.

## Phase 7 --- Testing & Optimization

Tugas: - Regression test lima tab. - Test Editor dan MIDI. - Test
NAM/IR. - Test preset load/save. - Test DAW, recording, playback. - Test
USB Loopback. - Test DSP performance. - Test provider fallback. - Test
responsive Android. - Test memory dan lifecycle audio.

Acceptance criteria: - Fitur lama yang terdampak telah diuji. - Tidak
ada regression blocker yang diketahui. - Build berhasil. - Hasil
pengujian dicatat. - Known issues didokumentasikan.

------------------------------------------------------------------------

# 12. Non-Negotiable Constraints

Jangan merusak atau menghapus fitur yang sudah berjalan.

Pertahankan: - NUX MG-30 Gen 2 compatibility. - USB MIDI
communication. - MIDI CC mapping. - Preset reading dan saving. - NAM
loading. - IR loading. - Effect parameter mapping. - AI Live Tone
Assistant. - Existing AI provider architecture. - Jamm. - Record. -
Four-track DAW. - Timeline. - Mixer. - Playback control. - USB
Loopback. - Input Gain. - Device management.

Jangan: - Mengubah firmware protocol tanpa bukti teknis dan kebutuhan. -
Mengubah MIDI implementation hanya untuk menambahkan DSP. - Mengganti
provider architecture tanpa alasan yang tervalidasi. - Membuat AI engine
kedua. - Menggunakan mock data sebagai hasil pengukuran. - Mengarang
kemampuan hardware atau browser. - Menghapus fitur lama untuk
menyederhanakan implementasi. - Mengklaim fitur selesai sebelum build
dan test. - Melakukan perubahan besar tanpa memeriksa dampaknya.

Jika konflik arsitektur ditemukan, jelaskan masalah, dampak, opsi, dan
rekomendasi sebelum melakukan perubahan berisiko.

------------------------------------------------------------------------

# 13. Repository Workflow

Sebelum coding: 1. Periksa repository dan branch aktif. 2. Periksa
status working tree. 3. Baca implementasi terkait. 4. Identifikasi file
yang perlu diubah. 5. Buat rencana perubahan sekecil mungkin. 6.
Identifikasi risiko regresi.

Selama coding: - Gunakan modul yang terpisah jika sesuai. - Reuse
komponen dan design tokens. - Hindari duplikasi logic. - Jangan mengubah
file yang tidak relevan. - Jaga backward compatibility.

Setelah coding: - Jalankan build. - Jalankan test yang tersedia. -
Periksa runtime errors. - Uji layout Android. - Uji fitur lama yang
terdampak. - Catat hasil aktual. - Commit perubahan setelah milestone
berhasil dan sesuai workflow repository.

Jangan mengklaim build, test, atau commit berhasil jika belum dilakukan.

------------------------------------------------------------------------

# 14. Checkpoint dan Kelanjutan Setelah Usage Limit

Setiap sesi atau milestone harus memperbarui
`DEVELOPMENT/CHECKPOINT.md`.

Format checkpoint:

``` text
PROJECT: MG30 Studio
CURRENT PHASE:
LAST COMPLETED TASK:
CURRENT TASK:
COMPLETED FEATURES:
MODIFIED FILES:
BUILD STATUS:
TESTS RUN:
TEST RESULTS:
KNOWN BUGS:
BLOCKERS:
LAST COMMIT:
NEXT ACTION:
IMPORTANT DECISIONS:
```

Ketika sesi terputus atau limit tercapai:

1.  Buka Master Roadmap.
2.  Buka checkpoint terakhir.
3.  Periksa repository dan commit aktual.
4.  Verifikasi apakah pekerjaan yang tercatat memang sudah ada.
5.  Lanjutkan dari `NEXT ACTION`.
6.  Jangan mengulang pekerjaan yang sudah selesai dan terverifikasi.

Checkpoint adalah catatan status, bukan pengganti verifikasi kode.
Selalu cocokkan dengan repository.

------------------------------------------------------------------------

# 15. Dokumentasi Pendamping

Struktur dokumentasi yang disarankan:

``` text
MG30-STUDIO/
├── MASTER-ROADMAP.md
└── DEVELOPMENT/
    ├── CHECKPOINT.md
    ├── CHANGELOG.md
    ├── TEST-REPORT.md
    └── DECISIONS.md
```

Jika spesifikasi berkembang sangat besar, bagian teknis dapat dipisah
menjadi:

``` text
SPECIFICATIONS/
├── TIE-01-TONE-INTELLIGENCE.md
├── AI-02-SHARED-AI-ARCHITECTURE.md
└── UI-03-DESIGN-SYSTEM.md
```

Dokumen ini tetap menjadi sumber acuan utama. Dokumen turunan tidak
boleh bertentangan dengan keputusan yang tercatat di Master Roadmap.

## Aturan revisi

Setiap perubahan roadmap harus: - Menaikkan versi atau mencatat
revisi. - Menjelaskan apa yang berubah. - Menjelaskan alasan
perubahan. - Mempertahankan keputusan lama yang masih berlaku. -
Memperbarui status implementasi berdasarkan bukti.

------------------------------------------------------------------------

# 16. Final Product Principles

**One Application.**\
Lima bottom navigation utama tetap dipertahankan.

**One Studio, Two Workspaces.**\
Jamm & Record dan Tone Analysis.

**One AI Engine.**\
Provider manager, fallback, dan orchestration digunakan bersama.

**Two AI Access Points.**\
Editor AI untuk tone creation dan device control. Studio AI untuk tone
analysis dan audio engineering.

**Local DSP First.**\
Pengukuran dasar dilakukan lokal jika sumber dan perangkat mendukungnya.

**Evidence-Based Intelligence.**\
AI membedakan hasil pengukuran, interpretasi, hipotesis, dan
rekomendasi.

**Incremental Development.**\
Setiap fase diaudit, diimplementasikan, diuji, dan dicatat sebelum
melanjutkan.

------------------------------------------------------------------------

# 17. Instruksi Saat Memulai Sesi Pengembangan

Gunakan instruksi berikut ketika memulai pekerjaan baru:

> Baca `MASTER-ROADMAP.md` dan `DEVELOPMENT/CHECKPOINT.md`. Audit
> kondisi repository dan branch aktif sebelum melakukan perubahan.
> Cocokkan checkpoint dengan kode aktual. Lanjutkan hanya dari tugas
> berikutnya yang belum selesai. Ikuti seluruh non-negotiable
> constraints. Jangan mengulang fitur yang sudah selesai, jangan
> mengubah fitur lama tanpa kebutuhan yang jelas, dan jangan mengklaim
> hasil yang belum diuji. Jika ada konflik atau ketidakjelasan, jelaskan
> terlebih dahulu sebelum melakukan perubahan berisiko.

------------------------------------------------------------------------

**END OF MASTER ROADMAP & TECHNICAL SPECIFICATION**
