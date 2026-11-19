# MG30 Studio --- TIE Technical Specification Pack

Versi 1.0. Paket ini adalah dokumen teknis pendamping
`MASTER-ROADMAP.md`.

## Isi paket

1.  `TIE-DSP-ENGINE-SPEC.md` --- DSP, FFT, metrik, worker, validasi
    numerik.
2.  `TIE-AUDIO-ENGINE-SPEC.md` --- audio sources, capture, lifecycle,
    Android compatibility.
3.  `TIE-COMPARISON-SPEC.md` --- A/B, alignment, level matching,
    comparison report.
4.  `TIE-AI-INTEGRATION-SPEC.md` --- satu AI engine, dua akses, context
    contract, validasi rekomendasi.
5.  `TIE-KNOWLEDGE-BASE-SPEC.md` --- skema knowledge, sumber, retrieval,
    grounding.
6.  `TIE-TESTING-SPEC.md` --- test fixtures, regression matrix, release
    gates.

## Cara menempatkan di repository

Letakkan enam file ini di folder `SPECIFICATIONS/` pada root repository.
Simpan `MASTER-ROADMAP.md` di root repository dan tambahkan tautan ke
setiap spesifikasi dari bagian dokumentasi pendamping.

## Catatan penting

Dokumen ini menetapkan rancangan dan acceptance criteria, bukan
menyatakan bahwa fitur sudah ada. Codex harus mengaudit repository aktif
sebelum implementasi, menyesuaikan nama modul dengan arsitektur aktual,
dan tidak mengasumsikan dukungan audio USB dari koneksi USB MIDI.
