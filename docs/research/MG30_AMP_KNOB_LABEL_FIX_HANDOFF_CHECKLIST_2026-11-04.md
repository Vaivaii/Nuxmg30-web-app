# MG-30 Amp Knob Label Correction — Handoff Checklist
Tanggal: 4 November 2026
Branch kerja: `feature/amp-knob-label-correction`
Base branch: `feature/studio-daw-editing-arrangement`
Target: **NUX MG-30 original Gen 2, firmware 6.0.x — BUKAN MG-30 MKII**

Dokumen ini adalah catatan pemulihan pekerjaan. Baca dokumen ini terlebih dahulu apabila percakapan terputus atau dilanjutkan pada sesi baru. Data ekstraksi lengkap dan bukti teknis berada di:
`docs/research/MG30_QUICKTONE_AMP_KNOB_LABEL_ANALYSIS_2026-11-04.md`

## Status saat branch dibuat

- [x] Branch baru dibuat dari `feature/studio-daw-editing-arrangement`.
- [x] Analisis QuickTone 2.6.7.16 sudah dilakukan pada blok panel amp kandidat.
- [x] **38 entri panel amp kandidat** telah diekstrak; setiap baris memiliki nama model, daftar label control, dan nomor `midiCC`.
- [x] Elemen non-knob yang semula terlewat juga sudah diperiksa: dua switch DGLASS serta switch CONTOUR STARLIFT.
- [ ] Verifikasi final bahwa blok 38 entri tersebut tepat terikat ke profil **NUX MG-30 original Gen 2 / `.mg30patch`**, bukan MKII / `.mg30mk2patch` atau profil produk lain.
- [ ] Cocokkan slot/urutan model QuickTone dengan katalog amp original MG-30 di aplikasi.
- [ ] Setelah gerbang verifikasi selesai, implementasikan koreksi **label UI saja**.
- [ ] Jalankan pemeriksaan build dan regression test tanpa mengubah mapping MIDI/CC.
- [ ] Minta pengguna memvalidasi label pada perangkat/aplikasi QuickTone bila diperlukan.

## Sumber analisis

QuickTone Windows:
- Versi: `2.6.7.16`
- Arsip: `NUX_QuickTone_V2.6.7.16_Windows.zip`
- SHA-256 arsip: `95990e1e57079439c89b13e16d19f17c1769ec0c60336b546bc7f43b4ee91f2a`
- Embedded `QuickTone.exe`: 190,296,504 bytes
- SHA-256 executable: `0d64728f8f0e013114c228c8e6f9a8f3c648a5f82ff54ff03081c930ebd771d6`

QuickTone menyimpan konfigurasi panel sebagai blok JSON-like. Field penting:
- `elementType=2`: rotary knob pada panel amp yang diekstrak.
- `elementType=5`: button/switch.
- `languageKey`: key label semantik; label Inggris diperoleh dari language table QuickTone.
- `midiCC`: indeks CC yang terkait dengan elemen tersebut.
- `elementImage1`, koordinat, ukuran, dan sudut: aset/geometry untuk pembanding visual.
- `parameter1/2/3`: metadata tambahan; semantiknya belum dipastikan dan tidak diperlukan untuk koreksi label.

Blok kandidat pertama mulai di offset `0x6897190` dan berisi 109 entri panel, termasuk 38 entri numbered built-in amp dan entri NAM terpisah. Blok panel lain mulai di `0x6906960`; contoh amp yang diperiksa mempunyai assignment label-ke-CC sama. Executable juga menyimpan profil untuk MG-30, MG-30 MKII dan produk lain. Karena itu, angka 38 pada tabel ini adalah hasil ekstraksi blok kandidat, **bukan bukti tunggal bahwa seluruh 38 baris adalah daftar final amp original MG-30** sebelum profile binding/cross-check selesai.

## Hasil ekstraksi knob per amp — 38 entri kandidat

Label di bawah merupakan label Inggris yang di-resolve dari `languageKey` QuickTone. Nomor CC dicantumkan apa adanya dari elemen knob. CC yang melompat adalah disengaja; jangan dirapatkan atau dinomori ulang.

| No. | QuickTone amp model | Knob label dan CC |
|---:|---|---|
| 01 | JAZZ CLEAN | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), LEVEL (CC 6) |
| 02 | DELXUE RVB | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), BIAS (CC 5), LEVEL (CC 6) |
| 03 | BASSMATE | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 04 | TWEEDY | GAIN (CC 0), TONE (CC 1), MASTER (CC 2), LEVEL (CC 3) |
| 05 | TWIN RVB | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), BIAS (CC 6), LEVEL (CC 7) |
| 06 | HIWIRE | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 07 | CALI CRUNCH | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 08 | CLASS A15 | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 09 | CLASS A30 | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 10 | PLEXI 100 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 11 | PLEXI 45 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 12 | BRIT 800 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 13 | 1987 X 50 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 14 | SLO 100 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 15 | FIREMAN HBE | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 16 | DUAL RECT | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 17 | DIE VH4 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 18 | VIB KING | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 19 | BUDDA | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), MIDDLE (CC 4), TREB (CC 5), LEVEL (CC 6) |
| 20 | MR.Z 38 | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), MIDDLE (CC 4), TREB (CC 5), LEVEL (CC 6) |
| 21 | SUPER RVB | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), BIAS (CC 6), LEVEL (CC 7) |
| 22 | BRIT BLUES | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 23 | MATCH | GAIN (CC 0), MASTER (CC 1), CUT (CC 2), BASS (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 24 | BRIT 2000 | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 25 | UBER | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 26 | AGL | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), M.FREQ (CC 4), TREB (CC 5), LEVEL (CC 6) |
| 27 | BASSGUY | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), LEVEL (CC 6) |
| 28 | MLD | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), M.FREQ (CC 4), TREB (CC 5), LEVEL (CC 6) |
| 29 | OPTIMA AIR | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 30 | STAGEMAN | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), LEVEL (CC 5) |
| 31 | DGLASS | MASTER (CC 0), BASS (CC 1), LO MIDS (CC 3), HI MIDS (CC 4), TREB (CC 6), LEVEL (CC 7) |
| 32 | STARLIFT | BASS (CC 0), MID (CC 1), MID FREQ (CC 2), TREB (CC 3), VOLUME (CC 5), LEVEL (CC 6) |
| 33 | VIVO | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 34 | PRINCETONE | VOLUME (CC 0), TREB (CC 1), BASS (CC 2), BIAS (CC 3), LEVEL (CC 4) |
| 35 | L STAR | GAIN (CC 0), MASTER (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4), PRES (CC 5), BIAS (CC 6), LEVEL (CC 7) |
| 36 | DELUXE RVB | GAIN (CC 0), VOLUME (CC 1), BASS (CC 2), TREB (CC 3) |
| 37 | CLASS A30 | GAIN (CC 0), VOLUME (CC 1), BASS (CC 2), TREB (CC 3) |
| 38 | FIREMAN HBE | GAIN (CC 0), VOLUME (CC 1), BASS (CC 2), MIDDLE (CC 3), TREB (CC 4) |

## Kontrol non-knob yang ditemukan

### DGLASS — 2 switch
Panel kandidat original MG-30 pada offset `0x68DCC4B` (blok duplikat `0x694C41B`):
- MASTER knob: CC 0, `AMP_MASTER`.
- BASS knob: CC 1, `AMP_BASS`.
- Switch pertama: `elementType=5`, CC 2, `languageKey` kosong, asset `_Plist_Button_1_Frame_1/2/3_png`, posisi x=272 y=29.
- LO MIDS knob: CC 3, `AMP_LO MIDS`.
- HI MIDS knob: CC 4, `AMP_HI MIDS`.
- Switch kedua: `elementType=5`, CC 5, `languageKey` kosong, asset sama, posisi x=483 y=29.
- TREB knob: CC 6, `AMP_TREB`.
- LEVEL knob: CC 7, `AMP_LEVEL`.

Kedua switch punya `parameter1=0`, `parameter2=100`, `parameter3=-1`. Label teks tidak disediakan oleh JSON. Berdasarkan posisi, switch pertama kemungkinan selector frekuensi LO MIDS dan switch kedua kemungkinan selector frekuensi HI MIDS. **Ini inferensi tata letak, bukan label eksplisit**; jangan membuat caption final sebelum diverifikasi dari panel/screenshot/hardware. CC 2 dan CC 5 adalah temuan eksplisit.

### STARLIFT — CONTOUR switch
Panel kandidat di offset `0x68DE2F2` (blok duplikat `0x694DAC2`):
- BASS knob CC 0 (`AMP_BASS`)
- MID knob CC 1 (`AMP_MID`)
- MID FREQ knob CC 2 (`AMP_MID FREQ`)
- TREB knob CC 3 (`AMP_TREB`)
- CONTOUR switch CC 4 (`elementType=5`, `AMP_CONTOUR`, posisi x=435 y=26)
- VOLUME knob CC 5 (`AMP_VOLUME`)
- LEVEL knob CC 6 (`AMP_LEVEL`)

QuickTone language table memetakan `AMP_CONTOUR` menjadi `CONTOUR`. State visual dari tiga frame asset belum dijelaskan oleh JSON.

## Temuan label penting

- TWEEDY: GAIN, TONE, MASTER, LEVEL — bukan generic BASS/MIDDLE/TREB.
- CLASS A15 / CLASS A30 (entri 09): GAIN, MASTER, CUT, BASS, TREB, LEVEL.
- BUDDA, MR.Z 38, MATCH: mempunyai CUT.
- AGL dan MLD: mempunyai M.FREQ.
- DGLASS: LO MIDS dan HI MIDS, dengan CC tidak berurutan karena dua switch menempati CC 2 dan 5.
- STARLIFT: BASS, MID, MID FREQ, TREB, VOLUME, LEVEL, plus CONTOUR switch CC 4.
- PRINCETONE: VOLUME, TREB, BASS, BIAS, LEVEL.
- Beberapa entri bernama sama muncul lebih dari sekali dalam database multi-produk (misalnya CLASS A30 dan FIREMAN HBE; DELXUE RVB/DELUXE RVB juga berbeda penulisan). Karena itu jangan gunakan nama tampilan saja sebagai key. Gunakan profil produk + slot amp/model ID + control CC.

## Checklist eksekusi UI (belum dikerjakan)

- [ ] Baca catalogue amp yang sudah dipakai aplikasi untuk original MG-30 Gen 2 dan petakan tiap slot amp ke baris sumber QuickTone yang benar.
- [ ] Pisahkan profil `.mg30patch` original MG-30 dari `.mg30mk2patch` MKII serta database perangkat lain.
- [ ] Verifikasi duplikasi nama amp melalui slot/model index, bukan fuzzy match nama.
- [ ] Jadikan tabel label sebagai metadata per amp dan per `midiCC`; pertahankan urutan dan gap CC persis.
- [ ] Pastikan label UI di tiap posisi knob membaca metadata per amp; jangan gunakan label generik yang sama untuk semua model.
- [ ] Label dan CC harus terpisah: perubahan caption tidak boleh mengubah nilai CC, parameter ID, event callback, atau payload MIDI.
- [ ] Untuk DGLASS, jangan mengarang nama dua switch dari inferensi posisi. Catat CC2/CC5 dan minta verifikasi label jika hendak mengubah switch UI.
- [ ] Untuk STARLIFT, label CONTOUR pada switch CC4 tersedia eksplisit; jangan mengubah mapping switch.
- [ ] Jalankan test untuk amp dengan susunan non-generik: TWEEDY, CLASS A15/A30, BUDDA, MR.Z 38, MATCH, AGL, MLD, DGLASS, STARLIFT, PRINCETONE, dan varian VOLUME.
- [ ] Jalankan regression test pada amp generik 6-knob dan 8-knob, termasuk knob terakhir LEVEL.
- [ ] Pastikan perubahan tidak menyentuh fitur lain yang sudah benar: NAM, import IR User/Third Party, import IR Collection, preset operations, MIDI mapping, Signal Chain, USB audio/DAW.
- [ ] Build aplikasi dan periksa diff: perubahan hanya pada metadata/label amp UI serta test/dokumentasi yang diperlukan.
- [ ] Setelah build, validasi bahwa memutar knob pada setiap model masih mengontrol parameter/CC yang sama.

## Batas perubahan — WAJIB DIPATUHI

**Implementasi yang diminta adalah perbaikan caption/label amp UI saja.**
Jangan:
- mengubah mapping MIDI/CC yang sudah bekerja;
- mengubah pemetaan parameter, ID, urutan payload atau handler knob;
- merombak katalog amp atau urutan preset;
- menyentuh import/export preset, NAM, IR User/Third Party, IR Collection;
- mengubah firmware target atau memasukkan data MG-30 MKII;
- mengubah bagian DAW/USB audio yang sudah tervalidasi.

Jangan klaim validasi hardware selesai kecuali pengguna sudah mengujinya dan melaporkan hasilnya.

## Cara melanjutkan pada percakapan baru

1. Buka branch `feature/amp-knob-label-correction`.
2. Baca file ini sampai selesai.
3. Baca `docs/research/MG30_QUICKTONE_AMP_KNOB_LABEL_ANALYSIS_2026-11-04.md` untuk detail metode, offsets, dan tabel sumber.
4. Mulai dari checklist **Eksekusi UI**; jangan mengulang ekstraksi QuickTone dari awal.
5. Selesaikan profile/slot binding ke original MG-30 Gen 2 terlebih dahulu, lalu implementasikan label-only dan regression test.

Status penutup saat dokumen ini dibuat: **data label 38 entri kandidat telah diekstrak; switch tambahan DGLASS/STARLIFT telah dicatat; kode aplikasi belum diubah; koreksi label UI belum diimplementasikan.**


## Klarifikasi penting dari pengguna — scope final UI amp (4 Nov 2026)

Pengguna mengonfirmasi bahwa **urutan mapping knob dan slot amp di aplikasi sebenarnya sudah sama dengan perangkat**. Masalah utamanya bukan urutan slot/model yang salah. Masalahnya adalah:
1. Sebagian caption/nama knob yang ditampilkan aplikasi tidak sesuai dengan nama kontrol pada amp yang dipilih.
2. Aplikasi menampilkan knob generik yang sebenarnya tidak ada pada amp fisik tertentu.
3. Knob yang tidak mempunyai data CC pada model amp tersebut memang tidak tersedia/tidak berfungsi pada perangkat; karena itu kontrol UI generik tersebut tidak berguna dan harus dihilangkan dari tampilan untuk amp terkait.

### Implikasi terhadap rencana kerja

- **Jangan melakukan remapping urutan slot amp.** Urutan slot aplikasi sudah dikonfirmasi pengguna cocok dengan perangkat.
- **Jangan mengubah mapping CC yang sudah benar.** Data CC dipakai untuk menentukan kontrol mana yang memang ada pada setiap model, bukan untuk mengganti nomor CC.
- Pekerjaan UI sekarang mencakup dua hal: (a) mengganti label setiap knob sesuai metadata QuickTone untuk amp/slot yang sama, dan (b) hanya merender knob yang benar-benar tersedia pada model itu.
- Knob yang tidak memiliki entri CC untuk model amp tersebut harus disembunyikan/dihilangkan dari UI model itu, bukan diberi label generik atau dibiarkan sebagai knob mati.
- Jangan menghapus dukungan parameter dari model lain. Visibilitas harus spesifik per amp/slot sehingga knob yang valid pada amp lain tetap tampil.
- Gunakan urutan slot amp aplikasi yang sudah ada sebagai indeks penghubung ke tabel QuickTone, lalu validasi daftar CC per slot terhadap data SysEx/aplikasi yang sudah dianalisis.
- Tetap bedakan CC knob dari switch. DGLASS CC2 dan CC5 adalah switch element, bukan knob rotary; STARLIFT CC4 adalah CONTOUR switch. Jangan menampilkannya sebagai knob.
- Jika satu elemen tidak memiliki CC di konfigurasi panel atau data perangkat, jangan menebak CC dari posisi knob. Tandai untuk pemeriksaan daripada mengubah mapping.

### Checklist revisi sebelum implementasi

- [ ] Pertahankan urutan amp/slot yang saat ini sudah benar di aplikasi.
- [ ] Buat metadata per slot amp berisi hanya rotary knob yang memang tersedia, masing-masing dengan label dan CC QuickTone.
- [ ] Pisahkan metadata button/switch dari metadata rotary knob.
- [ ] Render knob berdasarkan daftar kontrol amp aktif; hilangkan knob UI yang tidak mempunyai kontrol fisik/CC pada model tersebut.
- [ ] Pastikan tidak ada knob mati atau knob generik ekstra pada TWEEDY dan model-model dengan jumlah kontrol lebih sedikit.
- [ ] Pastikan knob valid pada amp lain tidak ikut hilang karena perubahan global.
- [ ] Pastikan nilai CC, ID parameter, callback, dan payload MIDI untuk knob yang tetap tampil identik dengan implementasi saat ini.
- [ ] Uji perpindahan antar amp dengan jumlah knob berbeda agar UI menambah/mengurangi kontrol secara benar.

**Pembaruan status verifikasi:** tidak perlu lagi memperlakukan pencocokan urutan slot sebagai pekerjaan reverse engineering yang belum diketahui. Pengguna telah mengonfirmasi urutan slot aplikasi dan perangkat sudah sama. Fokus verifikasi berikutnya adalah mencocokkan daftar kontrol/CC per slot dengan hasil QuickTone dan SysEx, lalu memperbaiki label serta visibilitas knob.



## Permintaan lanjutan pengguna — Mic dan Mic Position (4 Nov 2026)

Pengguna menambahkan bahwa pada UI aplikasi saat ini, pilihan **Mic** dan **Mic Position** juga direpresentasikan sebagai knob. Karena knob tidak memperlihatkan nama opsi yang sedang dipilih, pengguna sulit mengetahui mic mana yang aktif dan posisi mic mana yang aktif.

### Target UI yang diminta

- **Mic** harus ditampilkan sebagai kontrol pilihan bernama (misalnya dropdown/select), bukan rotary knob anonim. Nilai aktif harus terbaca sebagai nama mic.
- **Mic Position** juga harus ditampilkan sebagai kontrol pilihan bernama; dropdown/select atau pilihan visual berlabel dapat digunakan setelah bentuk dan jumlah opsinya diketahui.
- Kontrol harus menampilkan nilai yang sedang aktif dari perangkat/aplikasi, dan perubahan pilihan harus tetap bekerja melalui jalur komunikasi yang sudah ada.
- Pertahankan parameter ID, CC/index, nilai wire/protocol, urutan payload, callback, dan perilaku transfer yang sekarang. Perubahan ini adalah perbaikan representasi UI, bukan kesempatan untuk menebak atau mengganti protokol.
- Jangan mengasumsikan Mic dan Mic Position memiliki daftar opsi global yang sama untuk semua cab/amp. Cakupan pilihan harus ditentukan dari konfigurasi perangkat/QuickTone dan data aplikasi.
- Jangan mengarang nama mikrofon, nama posisi, jumlah opsi, nilai enum, CC, atau default. Ekstrak dan validasi nilai/label yang benar terlebih dahulu untuk **NUX MG-30 original Gen 2 firmware 6.0.x**, bukan MKII.

### Analisis yang harus dilakukan sebelum implementasi

- [ ] Temukan komponen UI Mic dan Mic Position yang saat ini dibuat sebagai knob.
- [ ] Identifikasi sumber state/nilai aktif dan parameter ID/CC/index yang dipakai masing-masing kontrol.
- [ ] Periksa konfigurasi panel/cab QuickTone dan language table untuk label opsi Mic dan Mic Position.
- [ ] Cocokkan setiap pilihan dengan nilai wire/protocol yang benar dari source aplikasi/capture yang relevan; jangan menyimpulkan urutan enum hanya dari urutan teks UI.
- [ ] Pastikan apakah pilihan Mic dan Mic Position bergantung pada cab, amp, atau blok tertentu; dokumentasikan batasannya.
- [ ] Tentukan komponen UI pilihan yang paling tepat setelah diketahui apakah nilainya enum diskret atau range kontinu. Untuk pilihan diskret, gunakan dropdown/select atau segmented choices berlabel, bukan knob.
- [ ] Uji baca nilai aktif dari perangkat, ubah pilihan, kirim perubahan, lalu baca kembali untuk memastikan pilihan tampil konsisten.
- [ ] Pastikan perubahan Mic/Mic Position tidak menyentuh NAM import, IR User/Third Party, IR Collection, preset transfer, mapping MIDI yang sudah benar, Signal Chain, atau DAW/USB audio.

### Batas implementasi yang diperbarui

Target pekerjaan cabang ini sekarang adalah **perbaikan layout dan label kontrol amp/cab**, meliputi:
1. Rotary knob amp: hanya kontrol yang benar-benar tersedia untuk amp aktif, dengan label per amp yang akurat.
2. Switch/button amp: ditampilkan sebagai switch/button, tidak disamarkan sebagai knob.
3. Mic: pilihan bernama yang menunjukkan mic aktif.
4. Mic Position: pilihan bernama yang menunjukkan posisi aktif.

Jangan mengubah komunikasi perangkat yang sudah bekerja untuk mencapai tampilan ini. Bila analisis menunjukkan suatu kontrol sebenarnya memakai parameter kontinu, jangan memaksakan dropdown; dokumentasikan temuannya dan pilih representasi yang sesuai berdasarkan bukti.

**Status permintaan Mic/Mic Position:** scope UI sudah diterima dan dicatat; daftar opsi, mapping nilai, dan perilaku protokol belum diverifikasi; belum ada perubahan kode aplikasi.


## Implementasi awal UI — 4 November 2026

### Perubahan yang sudah masuk ke branch

- `www/index.html` sekarang memiliki `AMP_QUICKTONE_LAYOUTS` sebanyak 35 model, mengikuti urutan amp bawaan original MG-30 Gen 2 yang sudah benar di aplikasi.
- Setiap kontrol rotary amp memiliki parameter key, caption QuickTone, dan `ccIndex` eksplisit.
- Render knob amp hanya menggunakan daftar kontrol model aktif. Model seperti TWEEDY, CLASS A15/A30, AGL, MLD, DGLASS, STARLIFT dan PRINCETONE tidak lagi mendapat set knob generik yang sama.
- Celah `ccIndex` dipertahankan; contoh Jazz Clean tetap memakai indeks 0,1,2,3,4,6 untuk GAIN/MASTER/BASS/MIDDLE/TREB/LEVEL.
- DGLASS switch slot 2/5 dan STARLIFT CONTOUR switch slot 4 tidak dimasukkan sebagai rotary knob. Switch belum dibuat menjadi kontrol interaktif karena encoding/state switch belum diuji; jangan menebak aksi toggle.
- Mic sekarang memakai select bernama dengan 8 opsi original MG-30: DYN421, S57, U87, R122, R121, C414, C3000, B52.
- Mic Position sekarang memakai select bernama dengan opsi CENTER, MIDDLE, EDGE.
- Kedua selector menggunakan parameter `mic` / `position` yang sudah ada dan jalur normalisasi/encoding yang sama. `PARAMETER_MAX`, `MIDI_PARAM_CC`, `KNOB_SLOTS`, protocol frame, dan MIDI payload tidak diubah.
- `syncIncomingParameterCC` kini juga memperbarui pilihan select bila perangkat mengirim nilai Mic atau Mic Position.
- `www/ui-redesign.css` mendapat styling selector; pernyataan font invalid pada versi pertama sudah dikoreksi.
- Test baru: `tests/mg30-amp-controls-ui.test.js`, memeriksa 35 layouts, indeks CC yang berlubang, daftar Mic/Position, jalur sinkronisasi dan styling.
- Workflow build branch ditambahkan untuk menjalankan npm test + build APK pada perubahan branch ini.

### Riwayat implementasi

- App amp/select UI: commit `dd3571346195e6d4bd5b636ecb59533887526372`
- Styling awal selector: `1a2bd3e2abed3ce52062a1ea14663a943ed16379`
- Koreksi CSS font: `116034424e9e071b6fcc60d87f3ea39b614406a1`
- Test regresi: `b655f39104a219acb8a92e1a894027f9525df072`
- Test regex diperbaiki: `2f1b831a7b91431e83a371009e58a8fadbb41bde`
- Test selector CSS: `1395f657a49ac0890ab235b3129448fd9a2816c7`
- Test sync assertion diperbaiki: `5314fda7a233c3bc489dac26a1610be3b88faec2`

### Hasil validasi

- Struktur sumber berhasil diperiksa: 35 layout terbaca dan celah indeks amp penting tetap ada.
- GitHub Actions run pertama sempat gagal karena assertion test mencari nama variabel yang keliru (`control` padahal callback memakai `item`). Test diperbaiki pada commit `5314fda7a233c3bc489dac26a1610be3b88faec2`.
- Run ulang pada commit tersebut sedang berjalan saat catatan ini diperbarui. **Jangan nyatakan test/build berhasil sebelum run tersebut selesai.**
- Belum ada validasi hardware fisik oleh pengguna.

### Batas yang masih tersisa

- Switch DGLASS dan STARLIFT belum mempunyai UI aksi; saat ini hanya dicegah agar tidak tampil sebagai knob.
- Belum dilakukan pengujian langsung pada MG-30 untuk memastikan pilihan Mic/Mic Position dapat ditulis dan dibaca kembali di perangkat.
- Setelah CI lulus, tetap perlu uji perangkat dengan sedikitnya satu model amp generik, TWEEDY, DGLASS, STARLIFT, dan satu cab dengan pergantian Mic serta Mic Position.
- Jangan menggabungkan branch ke branch utama sebelum hasil hardware user dilaporkan.


### Pembaruan hasil CI — setelah assertion diperbaiki

- Run GitHub Actions terbaru pada commit `5314fda7a233c3bc489dac26a1610be3b88faec2`: langkah **Run protocol regression tests = success**.
- Total hasil: **189 test lulus, 0 gagal**.
- Generate Capacitor Android project and install USB audio plugin = success.
- Pada pemeriksaan terakhir, langkah **Build debug APK masih in progress**; artifact APK belum tersedia untuk dinyatakan berhasil.


## Implementasi switch tiga posisi + bahasa IR Collection — 4 Nov 2026

### Bukti dari foto layar MG-30 yang dikirim pengguna

- DGLASS memiliki dua switch tiga posisi:
  - Low Mids frequency: 250 Hz (atas), 500 Hz (tengah), 1 kHz (bawah).
  - High Mids frequency: 750 Hz (atas), 1.5 kHz (tengah), 3 kHz (bawah).
- STARLIFT memiliki switch CONTOUR tiga posisi:
  - VINTAGE (atas), OFF (tengah), MODERN (bawah).
- Foto juga memperlihatkan bahwa knob dan switch adalah elemen UI berbeda; switch tidak boleh ditampilkan sebagai rotary knob.
- Pada layar IR Collection, beberapa status dinamis masih memunculkan teks Indonesia ketika diikuti metadata CRC. Exact-string translation tidak mencocokkan keseluruhan text node yang berisi suffix tersebut.

### Implementasi yang masuk ke branch

- `AMP_THREE_POSITION_SWITCHES` menambahkan dua switch DGLASS di indeks CC parameter 2 dan 5, serta switch STARLIFT CONTOUR pada indeks 4.
- Pilihan diurutkan sesuai posisi fisik atas/tengah/bawah dan ditampilkan sebagai tiga tombol pilihan berlabel.
- Nilai wire dipetakan ke tiga titik rentang QuickTone 0..100: 0 / 50 / 100. Ini adalah pemetaan tiga titik yang berjarak sama berdasarkan rentang konfigurasi QuickTone; **belum divalidasi pada perangkat fisik**. Wajib cek readback/writeback MG-30 sebelum menyatakan mapping final.
- Switch menggunakan `parameterControls`, `sendBlockParam`, `syncIncomingParameterCC`, dan `KNOB_SLOTS` yang sudah ada. CC list, parameter payload layout, dan SysEx transfer tidak diubah.
- Switch tidak mengambil nilai fallback dari generic rotary draft lama karena tidak ada knob ekuivalen di slot tersebut.
- Incoming CC memperbarui posisi tombol aktif. Tombol yang dipilih mengirim nilai melalui CC yang sudah terpetakan.
- `english-ui.js` menambah terjemahan prefix `IR tersimpan di perangkat · CRC ` agar status Collection tetap berbahasa Inggris meski diikuti CRC, dan memastikan deskripsi Import WAV Collection diterjemahkan.
- Test baru mencakup DGLASS frequencies, STARLIFT contour positions, CC indices, jalur read/write/sync, fallback draft, dan terjemahan status IR.

### Commits implementasi

- Switch UI catalogue, renderer, write handler, readback sync: `93ddbd4fe07ac7f7d693a8b81ae74bd852a5cb2f`
- Terjemahan prefix IR Collection: `d8036470c601f9d9ebfaf7ea01f515466d54f031`
- Styling tiga posisi: `6a8da8877e32a100cb6127a652de720a3b67b4f0`
- Hindari fallback generic knob draft untuk switch: `0133da33aebc356a29580619a4aa4aae8cb9465b`
- Tes switch dan terjemahan: `7f50ee7c1fa6ee92aa70c0c8d9357e6693cfee23`

### Validasi tahap ini

- GitHub Actions run `41701473159` berjalan pada commit `7f50ee7c1fa6ee92aa70c0c8d9357e6693cfee23`.
- Tahap Validate Android initializer syntax: success.
- Tahap Run protocol regression tests: success.
- Generate Capacitor Android project and install USB audio plugin: success.
- Tahap Build debug APK masih berjalan saat catatan ini dibuat; belum menyatakan build sukses sampai artifact tersedia.
- Belum ada pengujian hardware untuk switch tiga posisi. User harus memastikan setiap posisi mengubah frekuensi/Contour yang sesuai dan readback kembali ke tombol yang tepat.


### Hasil akhir build & paket APK

- GitHub Actions run `41701473159` pada source commit `7f50ee7c1fa6ee92aa70c0c8d9357e6693cfee23`: **success**.
- Test suite: **193 passed, 0 failed**.
- Android initializer syntax: success.
- Capacitor Android project generation: success.
- Gradle: `BUILD SUCCESSFUL in 1m 13s`.
- Artifact `MG30-Studio-debug-APK`, ID `13262874325`, SHA-256 ZIP `7e00c8ff6952ddf16a816a5109c090bfc4470d7955dce28127196a4fd63dc972`.
- APK diekstrak dari artifact dan diperiksa: ZIP integrity valid; `AndroidManifest.xml`, `classes.dex`, serta web assets tersedia. Pemeriksaan asset APK mengonfirmasi string `AMP_THREE_POSITION_SWITCHES`, `LO MIDS FREQ`, `250 Hz`, `VINTAGE`, `MODERN`, dan terjemahan `IR stored on device · CRC` ikut terpaket.
- APK filename: `MG30-Studio-amp-switch-ir-english.apk`.
- APK SHA-256: `408ee07e0bfc6485296c9fdc58429f32d129d03cd4fe401811ec3fc0385b125a`.
- Build APK berasal dari source commit di atas; commit setelahnya hanya memperbarui dokumen handoff. Tidak ada perubahan kode aplikasi setelah build tersebut.
- Batas validasi: ini adalah regression/simulation test + Android debug build, bukan pengujian perangkat keras fisik. Pemetaan nilai switch 0/50/100 tetap harus dicoba pada MG-30 dan dikonfirmasi lewat readback serta perubahan suara/parameter.


## Koreksi keselamatan setelah laporan pengguna — 4 Nov 2026

Pengguna melaporkan bahwa urutan/value switch yang dikirim aplikasi terbalik dan setelah memilih switch dari aplikasi, elemen switch pada display MG-30 menghilang. Ini menunjukkan implementasi sebelumnya berisiko dan **tidak boleh dipakai untuk menulis switch**.

### Posisi visual yang benar dari foto perangkat

- DGLASS LO MIDS: TOP = 500 Hz, MIDDLE = 1 kHz, BOTTOM = 250 Hz.
- DGLASS HI MIDS: TOP = 1.5 kHz, MIDDLE = 3 kHz, BOTTOM = 750 Hz.
- STARLIFT CONTOUR: TOP = VINTAGE, MIDDLE = OFF, BOTTOM = MODERN.

### Mitigasi yang diterapkan

- Label visual DGLASS diperbaiki mengikuti posisi di atas.
- Ketiga kontrol switch sementara menjadi **read-only/disabled**.
- Handler pengiriman MIDI dari tombol switch dihapus sepenuhnya. Tidak ada nilai switch 0/50/100 yang dikirim lagi.
- UI menampilkan raw value dari readback perangkat sebagai angka, tetapi tidak mengarang posisi aktif karena mapping raw-to-frame belum terverifikasi.
- Jalur knob amp lain, Mic/Mic Position, NAM, IR, preset, MIDI block/model switch, Signal Chain dan DAW tidak diubah.

### Gate sebelum switch diaktifkan kembali

- Capture QuickTone terpisah saat switch DGLASS LOW berpindah TOP → MIDDLE → BOTTOM.
- Capture QuickTone terpisah saat switch DGLASS HIGH berpindah TOP → MIDDLE → BOTTOM.
- Capture QuickTone terpisah saat STARLIFT CONTOUR berpindah VINTAGE → OFF → MODERN.
- Cocokkan CC number, raw value, urutan state, dan frame asset (1/2/3) untuk tiap kontrol.
- Uji readback dan writeback MG-30 pada firmware original Gen 2 6.0.x. Jangan gunakan 0/50/100 atau membalik urutan lagi tanpa capture.


## Uji perangkat oleh pengguna — switch tiga posisi gagal (4 Nov 2026)

Pengguna melaporkan dari APK #448 yang benar-benar dipakai:
- Pada kedua amp yang memiliki switch (DGLASS dan STARLIFT), memilih posisi MIDDLE membuat switch menghilang dari layar perangkat.
- Mengembalikan pilihan ke posisi TOP membuat switch muncul kembali.
- Label frekuensi DGLASS pada APK tersebut terbalik terhadap posisi fisik yang terlihat pada foto MG-30.

### Kesimpulan dan tindakan wajib
- Nilai 0/50/100 yang pernah diasumsikan sebagai TOP/MIDDLE/BOTTOM adalah tebakan berbasis rentang generik, bukan bukti enum firmware. Jangan kirim nilai tersebut.
- Gejala menghilangnya elemen setelah nilai tengah dikirim menunjukkan write sebelumnya tidak aman; penyebab byte-level pastinya masih perlu capture QuickTone per posisi.
- Untuk DGLASS, caption fisik yang benar dari foto: LO MIDS TOP=500 Hz, MIDDLE=1 kHz, BOTTOM=250 Hz; HI MIDS TOP=1.5 kHz, MIDDLE=3 kHz, BOTTOM=750 Hz.
- Untuk STARLIFT, caption fisik tetap TOP=VINTAGE, MIDDLE=OFF, BOTTOM=MODERN.
- Semua tombol switch harus nonaktif/read-only. sendBlockParam juga wajib menolak switch three-way-switch agar pemanggil generik tidak dapat mengirim enum yang belum diverifikasi.
- Pemetaan CC dan indeks parameter tetap dipertahankan untuk kebutuhan readback; jangan mengubah MIDI block/model switch atau kontrol rotary lain.
- Build #454 sebelumnya gagal pada dua tes karena tes mencari renderer switch terlalu awal dan justru mengambil helper parameterValueForControl. Perbaiki pencarian tes agar dimulai dari renderer yang membuat konten #knobs; jangan melemahkan pengamanan untuk membuat tes lulus.

### Status setelah koreksi kode
- Label fisik switch telah dibetulkan di source setelah APK #448.
- Switch tetap read-only; generic MIDI writer diberi guard eksplisit untuk menolak switch.
- Belum ada nilai wire untuk ketiga posisi pada masing-masing switch. Pengaktifan ulang menunggu capture TOP/MIDDLE/BOTTOM dan uji readback/writeback pada MG-30 original Gen 2 firmware 6.0.x.
- APK #448 tetap baseline instalasi terakhir yang dikonfirmasi pengguna; perubahan ini adalah source perbaikan berikutnya, bukan klaim bahwa APK lama sudah diperbaiki.
