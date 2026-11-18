# TONE3000 NAM Worker and NAM-preset field failure — 2026-11-18

## Ringkasan status

**Status: BELUM BERHASIL / belum terdiagnosis sampai akar masalah.**

Pada 18 November 2026, pengguna melaporkan:
1. Pencarian NAM melalui Cloudflare Worker belum berhasil.
2. Preset yang menggunakan NAM juga belum berhasil digunakan/dijalankan melalui alur aplikasi.

Ini adalah laporan hasil pengujian lapangan pengguna. Belum ada request/response jaringan, Worker log, query pencarian, atau rekaman langkah preset yang cukup untuk menentukan titik kegagalan. Jangan menyimpulkan bahwa penyebabnya pasti Worker, TONE3000 API, autentikasi, filter Gen 2, maupun jalur transfer preset sebelum bukti tersedia.

## Konteks screenshot aplikasi

Screenshot AI Live Tone Assistant yang dikirim pengguna pada 18 November 2026 memperlihatkan:

- Target UI menyebut **Original MG-30 Gen 2**.
- Bagian **TONE3000 NAM** berstatus **ON**.
- Pilihan pencarian **Amp + Cab** sedang aktif; UI menyatakan permintaan tone baru akan menggunakan Amp + Cab.
- AI Providers menampilkan **4 / 5 optional providers configured**.
- AI Usage menampilkan **1,143 tokens** dan **2 AI requests**.
- Rincian task memperlihatkan:
  - “Luna validating TONE3000 NAM profile” — 1 ok, 0 cont, 0 fail.
  - “deriving TONE3000 search terms” — 1 ok, 0 cont, 0 fail.

**Interpretasi yang benar:** status ok di dua task tersebut hanya menunjukkan sub-tugas AI dilaporkan selesai. Itu tidak membuktikan endpoint pencarian mengembalikan kandidat NAM yang valid, hasil dapat diunduh, atau preset NAM berhasil diproses pada perangkat. Screenshot tidak menampilkan query, HTTP status, response payload, Worker log, daftar hasil, maupun error preset.

## Hubungan dengan Worker 1.2.4

- Source Worker 1.2.3 yang diberikan pengguna menjadi baseline.
- Branch kerja dokumentasi/patch: feature/worker-v1.2.4-ai-search.
- Commit sebelum catatan ini: fc60b0e267b3fc3ddbb3193c42ce346be002f2c3.
- Worker 1.2.4 menambahkan POST /api/v1/tone3000/ai-search dengan pencarian format=nam dan architecture=2, serta fallback istilah pencarian.
- **Worker 1.2.4 belum di-deploy ke Cloudflare** menurut catatan perubahan yang ada. Karena itu, jangan menganggap pengujian lapangan pengguna tadi pasti menggunakan Worker 1.2.4. Versi Worker yang benar-benar aktif di URL Cloudflare belum diverifikasi.
- Keberadaan kode endpoint pada branch GitHub tidak sama dengan endpoint tersebut sudah aktif di Worker produksi.

## Batas perubahan dan fitur yang dilindungi

Untuk investigasi lanjutan:
- Jangan mengubah atau merusak jalur NAM yang sudah berhasil sebelumnya.
- Jangan mengubah mapping transfer NAM, validasi model/weights, metadata slot, atau proses transfer ke MG-30 tanpa bukti dan regresi khusus.
- Jangan mengubah jalur IR User/Third Party versus Collection.
- Jangan mengubah mapping MIDI yang sudah benar.
- Jangan mengubah target perangkat: **NUX MG-30 original Gen 2, firmware 6.0.x, bukan MKII**.
- Jangan melakukan deployment Cloudflare tanpa instruksi dan persetujuan eksplisit.

## Data diagnostik yang masih diperlukan

1. Versi/commit aplikasi atau APK yang dipakai saat pengujian.
2. URL/base URL Worker yang dipakai aplikasi dan versi Worker yang benar-benar ter-deploy.
3. Satu contoh query NAM yang gagal.
4. HTTP status dan response body dari POST /api/v1/tone3000/ai-search (hapus/redaksi seluruh bearer token, cookie, API key, dan data sensitif).
5. Log Worker untuk request yang sama, dengan header/token rahasia tetap disensor.
6. Untuk preset: langkah yang dilakukan, nama preset, apakah kandidat NAM terlihat, apakah file berhasil diunduh, dan tahap tepat saat gagal.

## Urutan investigasi berikutnya

1. Verifikasi Worker aktif melalui route/status/version dan pastikan apakah endpoint POST /api/v1/tone3000/ai-search benar-benar telah tersedia di deployment yang diuji.
2. Cocokkan request aplikasi dengan kontrak endpoint: query, gear (amp atau amp-cab), user OAuth header, dan filter Gen 2 NAM.
3. Periksa response endpoint: status HTTP, jumlah tones, bentuk field item, serta metadata pencarian. Bandingkan dengan hasil proxy TONE3000 langsung bila diperlukan.
4. Pisahkan diagnosis **NAM search/discovery** dari **NAM preset apply/transfer**. Jika pencarian memberi kandidat, telusuri download, file extraction, validasi model/weights, pemetaan slot dan transfer sebagai tahapan terpisah.
5. Tambahkan regresi untuk alur yang sudah berjalan sebelum memperbaiki titik gagal. Jangan menganggap status AI task sebagai keberhasilan end-to-end.

## Catatan perubahan

Tanggal: 2026-11-18
Area: TONE3000 NAM search via Cloudflare Worker dan preset berbasis NAM
Tujuan: Merekam kegagalan lapangan dan menjaga konteks agar investigasi dapat dilanjutkan.
Branch: feature/worker-v1.2.4-ai-search (branch dokumentasi/patch Worker; branch APK yang diuji belum diverifikasi).
Commit sebelum: fc60b0e267b3fc3ddbb3193c42ce346be002f2c3
Commit sesudah: diisi setelah file catatan dibuat.
File/modul yang berubah: dokumen catatan saja; tidak ada source code yang diubah.
Perubahan: mendokumentasikan laporan kegagalan pencarian NAM dan preset NAM, konteks screenshot, status deployment Worker, batas bukti, dan rencana diagnostik.
Alasan: pencarian NAM belum berhasil melalui Worker dan preset berbasis NAM juga belum berhasil.
Pengujian otomatis: tidak dijalankan; tidak ada perubahan kode.
Hasil build: tidak dijalankan.
Pengujian perangkat fisik: laporan pengguna; rincian pedal/firmware saat uji belum direkam pada screenshot ini.
Hasil: pencarian NAM dan penggunaan preset NAM **belum berhasil** menurut laporan pengguna.
Risiko/regresi: perubahan spekulatif dapat merusak NAM yang sudah berfungsi, transfer preset, IR, atau MIDI; pertahankan jalur yang sudah berhasil.
Status: **terkonfirmasi sebagai laporan kegagalan pengguna; akar masalah belum diuji/terisolasi**.
Langkah berikutnya: verifikasi deployment Worker aktual dan kumpulkan satu request/response pencarian yang gagal sebelum mengubah kode.


## Correction — Worker deployment status clarified by user (2026-11-19)

The earlier statement above that Worker 1.2.4 had not been deployed is superseded by the user's clarification: **the Cloudflare Worker has already been deployed by the user**. Do not assume it is undeployed and do not trigger another deployment as part of this app-side provider-routing task. The exact active deployment version was not independently queried in this investigation.

The current implementation reuses the existing `/api/v1/ai/light-task` endpoint and its `tone3000-search-terms` task. This change does not modify or deploy Worker code.
