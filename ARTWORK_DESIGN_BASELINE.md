# MG30 Studio — Artwork Design Baseline

> Dokumen acuan visual permanen untuk revisi artwork pada aplikasi NUX MG30 Studio.  
> Baseline ini mencatat implementasi yang benar-benar ada di repository, bukan konsep desain baru.

## 1. Identitas baseline

| Item | Nilai |
|---|---|
| Produk target | NUX MG-30 original, Gen 2, firmware 6.0.x |
| Repository | `Vaivaii/Nuxmg30-web-app` |
| Branch kerja | `feature/amp-knob-label-correction-artwork` |
| Baseline commit sebelum dokumen ini | `a59e389baf147f0cae0c265796c8e912016b6bdc` |
| Tanggal pencatatan | 2026-11-04 |
| Status | Baseline implementasi artwork; revisi berikutnya harus dibandingkan dengan versi ini |

Branch di atas adalah target kerja proyek. Jangan mengubah default branch repository hanya karena dokumen ini dibuat.

## 2. Tujuan dan ruang lingkup

Dokumen ini menjaga kesinambungan tampilan ilustrasi perangkat yang muncul pada area visual model/gear di editor MG30 Studio, terutama:

- Artwork amplifier/head untuk blok AMP, termasuk profil NAM.
- Artwork pedal untuk blok efek yang memiliki referensi khusus.
- Konsistensi ukuran, proporsi, warna, detail panel, kontrol, label, dan tipografi antar-revisi.

Baseline ini **tidak** mengizinkan perubahan perilaku perangkat. Pekerjaan artwork harus tetap bersifat visual kecuali pengguna secara eksplisit meminta hal lain.

## 3. Prinsip visual yang harus dipertahankan

### 3.1 Bahasa visual aplikasi

Shell aplikasi memakai tema gelap dengan nuansa hijau/olive:

| Token | Nilai saat baseline |
|---|---|
| Latar utama `--bg` | `#0b0d0b` |
| Panel `--panel` | `#141714` |
| Panel sekunder `--panel2` | `#1b2019` |
| Garis/border `--line` | `#2b3329` |
| Teks utama `--text` | `#eff3e9` |
| Teks sekunder `--muted` | `#8c9785` |
| Aksen utama `--lime` | `#c5f36b` |
| Aksen sekunder `--orange` | `#ffbd69` |

Pedoman: artwork harus terbaca jelas di dalam UI gelap. Jangan mengganti aksen global, radius komponen, atau gaya panel aplikasi sebagai bagian dari revisi artwork lokal tanpa permintaan tersendiri.

### 3.2 Karakter artwork

1. **Ilustrasi perangkat, bukan kartu dekoratif.** Bentuk chassis, panel kontrol, grille, knob, switch, LED, jack, footswitch, slider, dan label harus tetap menjadi pusat visual.
2. **Reference-led.** Identitas bentuk dan tata letak mengikuti referensi model yang terdokumentasi. Jangan mengganti identitas model dengan desain generik atau logo rekaan.
3. **Vektor lokal.** Render dilakukan sebagai SVG lokal. Foto arsip menjadi bahan referensi, bukan gambar yang dimuat dari URL saat aplikasi berjalan.
4. **Proporsi dijaga.** Kontrol tidak boleh meluber keluar chassis/panel, label tidak boleh saling bertumpuk, dan siluet perangkat tidak boleh terpotong oleh viewBox.
5. **Detail tetap terbaca pada ukuran editor.** Jangan menambah detail kecil berlebihan yang hanya terbaca saat SVG diperbesar.
6. **Konsistensi tidak berarti semua perangkat harus seragam.** Perbedaan bentuk dan warna antar-amplifier/pedal justru dipertahankan ketika memang menjadi karakter perangkat referensi.

## 4. Baseline artwork AMP

### 4.1 Sumber implementasi

- File utama: `www/index.html`
- Palette amplifier: `MG30_AMP_ART_PALETTES`
- Renderer amplifier: `renderAmpHeadArtwork()`
- Pemetaan skin/model: `MG30_AMP_ART_SKIN_BY_MODEL`
- Adapter untuk aplikasi: `renderAmpArtworkForApp()`
- Jalur pemanggilan: `renderGearSvg(blockId, modelName)`

AMP dirender sebagai SVG dengan viewBox:

```text
viewBox="20 65 720 310"
```

### 4.2 Ciri yang harus dipertahankan

- Bentuk amplifier/head dengan panel depan, grille/vent, chassis, knob, switch, input/jack, badge, dan tulisan sesuai keluarga model.
- Palet berbeda per keluarga amplifier; jangan meratakan seluruh model ke satu warna atau satu panel generik.
- Highlight dan shading pada permukaan, knob, panel logam, dan grille merupakan bagian dari bahasa ilustrasi yang sudah ada.
- Nama model dan identitas basis model tetap berasal dari pemetaan aplikasi yang sudah ada.
- Model NAM tetap mendapat jalur artwork NAM melalui skin `nam` bila tidak memiliki skin khusus. Jangan mengubah cara profil NAM ditemukan, dinamai, atau disimpan hanya untuk mengubah artwork.

### 4.3 Keluarga palet AMP yang sudah tersedia

Nama skin saat baseline:

`roland`, `blackface`, `tweed`, `vox`, `marshall`, `marshallCombo`, `hiwatt`, `mesa`, `soldano`, `friedman`, `diezel`, `budda`, `drz`, `blackCombo`, `matchless`, `bogner`, `aguilar`, `nuxBass`, `nuxAcoustic`, `darkglass`, `peavey`, `orange`, `rivera`, dan `nam`.

Saat menambah atau merevisi model, pertahankan pemetaan keluarga visual yang sesuai. Jangan mengganti skin seluruh model hanya karena satu artwork sedang diperbaiki.

## 5. Baseline artwork pedal

### 5.1 Sumber implementasi

- File renderer: `www/pedal-reference-artwork.js`
- Peta referensi: `docs/research/pedal-artwork-reference-map.md`
- Integrasi: module script dimuat dari `www/index.html`, kemudian dipanggil melalui `window.renderPedalReferenceSvg(blockId, modelName)` di `renderGearSvg()`.

SVG pedal memakai viewBox dasar:

```text
viewBox="0 0 420 250"
```

### 5.2 Cakupan yang sudah ada

Pada baseline ini terdapat **53 model/reference pedal** yang memiliki renderer SVG khusus. Pemetaan lengkap nama arsip, block/model MG-30, identitas referensi, dan layout yang dipertahankan tercatat dalam:

`docs/research/pedal-artwork-reference-map.md`

Gunakan file tersebut sebagai indeks utama. Jangan membuat daftar pengganti yang berbeda tanpa memperbarui peta referensi dan tes.

Karakter bentuk yang sudah didukung meliputi enclosure stompbox vertikal maupun horizontal, unit rack/controller yang lebih lebar, perangkat dengan dua footswitch, slider EQ, serta antarmuka EQ grafis yang memang bukan stompbox.

### 5.3 Aturan model yang belum memiliki referensi

Model yang tidak mempunyai referensi khusus tetap menggunakan renderer sebelumnya. Jangan membuat identitas perangkat, logo, atau layout baru berdasarkan tebakan. Bila artwork baru memang diperlukan, tandai sebagai usulan sampai referensi visualnya tersedia dan pengguna menyetujuinya.

### 5.4 Detail teknis ilustrasi

Renderer menggunakan bentuk SVG lokal (path, rect, circle, gradient, pattern, dan teks). ID gradient/pattern dibuat unik untuk menghindari benturan antar-instance. Tipografi wordmark dibuat dengan SVG text dan fallback font sistem; karena itu hasil font script/logo dapat sedikit berbeda antarperangkat. Jangan mengimpor font proprietary sebagai bagian dari revisi tanpa persetujuan dan pemeriksaan lisensi.

## 6. Ukuran dan perilaku layout

Aturan compact artwork saat baseline berada di `www/index.html`:

| Kondisi viewport | Tinggi area artwork | Padding |
|---|---:|---:|
| Default | 160 px | 6 px 8 px |
| Lebar maksimum 720 px | 138 px | 5 px 6 px |
| Lebar maksimum 390 px | 126 px | 4 px |

SVG menggunakan lebar/tinggi maksimum kontainer dan `object-fit: contain`. Pertahankan seluruh artwork di dalam area tersebut, tanpa distorsi rasio, crop yang tidak disengaja, atau scroll horizontal.

Perubahan ukuran ini berdampak ke seluruh ilustrasi gear. Jangan mengubahnya untuk menyelesaikan masalah satu model saja; perbaiki geometri SVG model tersebut terlebih dahulu.

## 7. Batas aman: fitur yang tidak boleh ikut berubah

Renderer artwork pedal menyatakan dirinya visual-only. Revisi artwork tidak boleh mengubah atau merusak:

- Komunikasi MIDI/USB, SysEx, ACK/retry, atau state koneksi perangkat.
- Pemetaan MIDI, CC, parameter, indeks model, urutan blok, maupun nilai kontrol.
- Fungsi NAM yang sudah berjalan, daftar slot, identitas slot, nama profil, atau penyimpanan profil.
- Jalur import IR, khususnya koleksi User / Third Party, dan protokol transfer IR yang sedang diteliti.
- Penyimpanan preset, import/export preset, atau struktur data patch.

Jangan mengubah handler, konstanta, data mapping, atau urutan inisialisasi fitur-fitur tersebut hanya demi menyesuaikan artwork. Jika perubahan lintas-area benar-benar diperlukan, buat pekerjaan terpisah, jelaskan alasannya, dan uji regresinya secara khusus.

## 8. Aturan revisi artwork

Setiap revisi berikutnya wajib mengikuti urutan ini:

1. Baca dokumen ini dan file implementasi terkait sebelum mengedit.
2. Pastikan branch kerja adalah `feature/amp-knob-label-correction-artwork`; jangan pindah ke branch sumber lama tanpa alasan yang jelas.
3. Identifikasi satu model atau satu aspek visual yang diminta pengguna. Jangan melakukan redesign seluruh keluarga artwork sebagai efek samping.
4. Pertahankan viewBox, skala, karakter material, warna keluarga, posisi kontrol, dan hierarki tulisan kecuali bagian tersebut memang diminta untuk diubah.
5. Bila pengguna memberi screenshot/foto referensi baru, catat file, model, dan bagian yang harus ditiru. Jangan menganggap referensi baru otomatis menggantikan seluruh baseline.
6. Perbarui tes visual/layout yang relevan. Jika pemetaan referensi berubah, perbarui juga `docs/research/pedal-artwork-reference-map.md`.
7. Jalankan tes proyek dan periksa tampilan pada ukuran desktop serta layar sempit.
8. Catat setiap perubahan di bagian Riwayat Revisi dokumen ini, lalu commit ke branch kerja.

### Jangan dilakukan tanpa instruksi

- Mengganti keseluruhan gaya dari ilustrasi realistis/representatif menjadi ikon flat, kartun, atau gaya lain.
- Mengubah warna semua amplifier/pedal menjadi satu tema yang sama.
- Mengubah bentuk chassis, jumlah/posisi knob, switch, jack, atau footswitch secara spekulatif.
- Menghapus label, logo, atau detail khas model yang sudah ada.
- Mengganti SVG lokal dengan foto eksternal atau URL remote.
- Mengubah fungsi perangkat atau mapping MIDI/NAM/IR sambil mengerjakan visual.

## 9. Tes dan kriteria penerimaan

Tes yang relevan pada baseline:

- `tests/mg30-pedal-artwork.test.js`
- `tests/mg30-amp-artwork-layout.test.js`

Pada pemeriksaan build yang tercatat untuk baseline branch, suite proyek berakhir dengan **226 tes lulus dan 0 gagal** (Build #508). Angka ini adalah hasil build saat baseline integrasi; tetap jalankan suite terbaru setelah setiap revisi.

Kriteria penerimaan minimum:

- SVG terbentuk lengkap dan tidak berisi `NaN` atau `undefined`.
- Tidak ada clipping, overlap, atau kontrol yang keluar dari chassis/panel.
- Proporsi dan identitas model tetap konsisten dengan referensi.
- Artwork tetap terbaca pada ukuran desktop dan mobile yang ditentukan.
- Model tanpa referensi khusus tetap memakai fallback lama.
- Tes artwork dan tes proyek lulus.
- Tidak ada perubahan tak disengaja pada MIDI, NAM, import IR User/Third Party, preset, atau fungsi editor lain.

## 10. Referensi screenshot aplikasi aktual

Pada **2026-11-05**, pengguna mengirim delapan screenshot dari aplikasi **NUX MG-30 Gen 2 Mobile Editor** sebagai acuan visual nyata untuk artwork pedal dan amplifier. Screenshot ini adalah tangkapan layar aplikasi yang sedang berjalan, bukan mockup atau preview SVG terpisah.

### 10.1 Daftar referensi yang diterima

| File upload | Blok/model yang terlihat | Identitas artwork pada layar |
|---|---|---|
| 1001011682.jpg | DLY — Pan Delay | Pedal vertikal biru, Ibanez DPL-10 |
| 1001011683.jpg | RVB — Shimmer | Pedal vertikal gelap, Neunaber Seraphim |
| 1001011681.jpg | MOD — St Chorus | Pedal horizontal kuning, MXR M134 Stereo Chorus |
| 1001011680.jpg | EFX — Horseman OD · IMAGE | Perangkat horizontal warna emas/kuning, NUX Horseman image-based EFX |
| 1001011679.jpg | AMP — Fireman HBE | Head amplifier horizontal, Friedman HBE-100 |
| 1001011678.jpg | AMP — Plexi 100 | Head amplifier horizontal, Marshall Plexi 100W / JTM45-100 family |
| 1001011677.jpg | AMP — Class A15 | Combo amplifier, Vox AC15 |
| 1001011676.jpg | AMP — Cali Crunch | Combo amplifier, Mesa/Boogie Mark I |

File-file di atas adalah nama upload asli pada percakapan proyek tanggal tersebut. Arsip screenshot asli sudah diunggah ke Git repository pada `docs/research/MG30_artwork_baseline_screenshots.zip` (850,022 byte). Arsip ini berisi delapan gambar referensi. Gunakan file ZIP tersebut sebagai sumber asli; jangan menganggap gambar sudah diekstrak menjadi file terpisah di repository.

### 10.2 Ciri visual yang dapat diamati dari screenshot

**Area artwork**
- Ilustrasi ditempatkan di dalam panel tersendiri dengan border tipis abu-abu gelap, sudut membulat besar, dan latar charcoal yang sedikit lebih terang daripada latar halaman.
- Perangkat berada di tengah area; skala mengikuti bentuk aslinya. Pedal vertikal tetap sempit dan tinggi, pedal horizontal memakai lebar area, dan head/combo amplifier menggunakan siluet lebar.
- Artwork tidak boleh dipaksa memenuhi seluruh panel, dipotong, atau diregangkan. Ruang kosong di sekeliling perangkat adalah bagian dari komposisi.
- Bayangan, highlight, kontur enclosure, tekstur grille, knob, switch, LED, jack, footswitch, badge, dan tulisan pada perangkat terlihat sebagai detail ilustrasi, bukan ikon datar.
- Warna model tetap spesifik: biru pada DPL-10, kuning pada MXR Chorus, emas pada Horseman, hitam/emas pada Friedman dan Marshall, serta grille cokelat pada Vox dan krem pada Mesa/Boogie.

**Keterangan di bawah artwork**
- Kategori perangkat tampil sebagai teks uppercase kecil berwarna lime.
- Baris Based on: menampilkan identitas perangkat referensi dalam teks terang, dengan labelnya diberi aksen lime.
- Khusus EFX image-based, layar juga menampilkan penanda IMAGE dan catatan bahwa artwork adalah ilustrasi UI, bukan foto model hasil capture. Informasi ini merupakan konteks UI; jangan mengubah klasifikasi audio model atau perilaku EFX saat mengerjakan gambar.

**Konteks layar editor**
- Panel artwork berada setelah nama/nomor blok, pemilih model, dan toggle ON/OFF.
- Signal chain, Scene cards, kontrol navigasi model, dan bottom navigation adalah bagian dari konteks aplikasi. Screenshot ini boleh dipakai untuk memahami skala dan hierarki, tetapi perubahan artwork tidak dengan sendirinya mengizinkan redesign atau perubahan fungsi bagian-bagian tersebut.

### 10.3 Cara menggunakan referensi ini

1. Gunakan screenshot sebagai acuan bentuk, orientasi, warna, skala, dan karakter visual masing-masing perangkat.
2. Cocokkan artwork pada model yang sama terlebih dahulu; jangan menyimpulkan bentuk satu model dari screenshot model lain.
3. Saat merevisi SVG lokal, pertahankan perangkat di tengah area artwork dan gunakan object-fit: contain agar keseluruhan siluet terlihat.
4. Jika detail kecil sulit dibaca pada ukuran editor, prioritaskan siluet, panel, tata letak kontrol, material, dan warna yang paling mudah dikenali.
5. Screenshot ini mengacu pada tampilan aplikasi NUX MG-30 Gen 2. Tetap validasi hasil akhir di MG30 Studio yang sedang dibangun; jangan menganggap UI atau aset aplikasi referensi sudah otomatis tersedia di repository.
6. Bila screenshot aktual baru dikirim, tambahkan nama file, blok/model, dan detail yang menjadi acuan ke tabel di atas. Simpan aset biner ke repository dan catat path yang sudah diverifikasi.

## 11. Template prompt untuk sesi chat baru

Salin instruksi ini saat melanjutkan pekerjaan di sesi baru:

> Lanjutkan revisi artwork NUX MG30 Studio pada repository `Vaivaii/Nuxmg30-web-app`, branch `feature/amp-knob-label-correction-artwork`. Baca `ARTWORK_DESIGN_BASELINE.md` dan `docs/research/pedal-artwork-reference-map.md` terlebih dahulu. Pertahankan baseline visual, proporsi, palet keluarga, bentuk chassis, serta layout kontrol. Ubah hanya bagian artwork yang saya minta. Jangan mengubah MIDI, NAM, mapping parameter, atau import IR User/Third Party. Setelah revisi, jalankan tes, catat perubahan di Riwayat Revisi, dan commit ke branch kerja.

## 12. Riwayat revisi dokumen

| Tanggal | Versi | Catatan |
|---|---|---|
| 2026-11-04 | 1.0 | Mencatat baseline AMP + pedal SVG dari branch `feature/amp-knob-label-correction-artwork`, commit `a59e389baf147f0cae0c265796c8e912016b6bdc`. |
| 2026-11-05 | 1.1 | Menambahkan delapan screenshot NUX MG-30 Gen 2 Mobile Editor sebagai acuan aktual dan mencatat karakter area artwork, skala, warna, serta caption. |\n| 2026-11-05 | 1.2 | Memverifikasi arsip asli `docs/research/MG30_artwork_baseline_screenshots.zip` (850,022 byte) sudah ada di branch kerja. Baseline kini menunjuk ke arsip tersebut sebagai sumber gambar referensi. |
