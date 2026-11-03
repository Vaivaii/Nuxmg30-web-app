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

