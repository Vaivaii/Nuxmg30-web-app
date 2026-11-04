# NUX MG-30 Studio — Project Handoff / Prioritas Berikutnya

Tanggal: 2026-11-05  
Target perangkat: **NUX MG-30 original Gen 2, firmware 6.0.x** (bukan MG-30 MKII).

## Status pekerjaan sebelumnya

Pekerjaan artwork pedal/amp dan koreksi label/knob amp dinyatakan **selesai dan diterima untuk tahap saat ini oleh pengguna**. Tidak perlu menahan pekerjaan berikutnya karena item checklist teknis lama masih memiliki kotak yang belum dicentang. Checklist lama tetap menjadi catatan historis/rujukan; status penerimaan pengguna pada catatan ini menjadi acuan status proyek saat ini.

Revisi visual atau teknis masih boleh dilakukan di kemudian hari bila ditemukan kebutuhan atau bukti baru. Jangan mengubah fungsi perangkat hanya demi menyelaraskan tampilan.

## Fokus fase berikutnya

1. **Import dan export all preset**
   - Prioritas utama: memahami dan mengimplementasikan alur ekspor serta impor seluruh preset.
   - Petakan format, struktur, urutan, metadata, validasi, dan perilaku transfer berdasarkan bukti capture/protokol.
   - Pertahankan kompatibilitas dengan MG-30 original Gen 2 firmware 6.0.x.
   - Jangan mengasumsikan format atau protokol MKII.
   - Jangan merusak fungsi NAM yang sudah berhasil, koleksi IR, import IR User/Third Party, preset yang ada, atau komunikasi perangkat yang sudah bekerja.
   - Lakukan pengujian bertahap dan verifikasi backup sebelum operasi tulis massal.

2. **Checklist mapping Loop Back perangkat ↔ aplikasi**
   - Audit seluruh kontrol/parameter Loop Back yang tersedia di perangkat dan padanannya di aplikasi.
   - Catat nama kontrol, nilai/rentang, status, arah sinkronisasi, pemicu perubahan, serta perilaku saat koneksi ulang bila relevan.
   - Bedakan mapping yang sudah terbukti benar dari yang masih perlu capture/validasi.
   - Jangan mengubah mapping MIDI/CC yang sudah benar atau menebak ID/parameter tanpa bukti.

## Aturan kerja tetap

- Perangkat sasaran selalu NUX MG-30 original Gen 2 firmware 6.0.x, bukan MKII.
- Jangan merusak atau menulis ulang jalur NAM yang sudah berhasil.
- Import IR tetap diarahkan ke User/Third Party; jangan mengubah perilaku IR Collection.
- Jangan mengubah pemetaan MIDI yang sudah benar.
- Perubahan protokol harus didukung capture, dokumentasi, atau pengujian nyata.
- Simpan catatan hasil analisis, keputusan, perubahan file, dan hasil tes pada dokumentasi proyek agar pekerjaan dapat dilanjutkan setelah percakapan terputus.

## Urutan kerja yang disepakati

Mulai dari reverse engineering dan validasi **import/export all preset**, kemudian lanjutkan audit dan checklist **Loop Back mapping perangkat dengan aplikasi**. Pekerjaan artwork/amp knob dianggap selesai untuk saat ini dan tidak menjadi penghambat fase tersebut.
