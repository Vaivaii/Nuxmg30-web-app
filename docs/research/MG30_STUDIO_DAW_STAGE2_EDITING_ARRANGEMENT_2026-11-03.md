# MG30 Studio — Stage 2: Editing & Arrangement

Tanggal: 3 November 2026  
Target: NUX MG-30 original Gen 2 firmware 6.0.x (bukan MKII).

## Scope yang dikonfirmasi pengguna
Tahap kedua yang benar adalah **Editing dan arrangement**, bukan native metronome/output meters. Fokusnya:
- Copy, paste, duplicate clip.
- Geser clip di timeline, termasuk memindahkan clip ke track lain.
- Loop section dengan batas In/Out.
- Pengaturan posisi clip/playhead yang lebih mudah.

## Branch isolation
- Repository: `Vaivaii/Nuxmg30-web-app`
- Branch: `feature/studio-daw-editing-arrangement`
- Base: `feature/studio-daw-output-routing` (Stage 1 output playback yang sudah dikonfirmasi pengguna berhasil).
- Tidak mengubah `main`, branch Stage 1, atau branch percobaan yang tidak terkait.
- Target perangkat tetap NUX MG-30 original Gen 2 firmware 6.0.x, bukan MKII.

## Implementasi
### Clip editing
- Copy menyimpan referensi media dan seluruh metadata clip yang dipilih ke clipboard sesi.
- Paste menempatkan clip baru di playhead pada track yang sedang dipilih, memakai ID clip baru dan referensi media yang sama.
- Duplicate membuat clip baru tepat setelah clip asli, tetap pada track yang sama.
- Tombol Copy/Paste/Duplicate tersedia di toolbar dan inspector.
- Shortcut desktop: Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+D, Delete/Backspace.
- Tombol panah kiri/kanan menggeser clip satu langkah snap; Shift+panah menggeser satu bar.
- Geser vertikal clip ke lane track lain memindahkan clip tanpa mengubah media sumber, offset, durasi, fade, atau input metadata.
- Trim start/end tetap non-destruktif dan tetap memakai helper yang sudah ada.
- Semua operasi clip menyimpan project melalui mekanisme autosave/history yang sudah ada.

### Section loop
- Project schema menambahkan `loopStartSeconds` dan `loopEndSeconds`; project lama default ke 0/0 tanpa mengubah media clip.
- Tombol Set In dan Set Out mengambil posisi playhead yang sudah mengikuti snap.
- Tombol Clear Loop menghapus batas section dan menonaktifkan loop.
- Toggle Section mengaktifkan pengulangan batas In/Out; jika belum ada batas eksplisit, perilaku lama full-timeline loop tetap berlaku.
- Batas section divisualisasikan pada ruler dan ditampilkan sebagai readout.
- Speaker/Web Audio melakukan restart scheduling pada Loop Out; native MG-30 AudioTrack melakukan wrap cursor ke Loop In tanpa menutup stream.
- Playhead pause/native mengikuti posisi dalam section loop.

### Positioning
- Drag clip horizontal tetap mengikuti snap mode aktif.
- Clip bisa dipindahkan vertikal ke lane track lain.
- Nudge kiri/kanan dan shortcut keyboard menyediakan penggeseran presisi.
- Cursor to start/end membantu navigasi timeline.

### Compact touch UI
- The section loop toggle, Set In, Set Out, Clear and loop-range readout now live inside the tempo/time-signature/metronome card; the separate full-width arrangement toolbar has been removed.
- Undo/Redo, Copy/Paste/Duplicate, clip nudging, and cursor-to-start/end are grouped under the three-dot overflow menu so the timeline is not pushed down by editing controls.
- The overflow menu closes after a command is selected. Existing button IDs, keyboard shortcuts, loop state, and action handlers are retained.
- Automated layout regression coverage checks that loop controls remain in the metronome card and editing/history controls remain available in the overflow menu.

### Contextual editing controls in the main card
- Undo/Redo sit to the left of the transport clock; Copy/Paste/Duplicate sit to its right, using the previously unused horizontal space.
- The three-dot menu contains Fade In/Fade Out sliders for the currently selected clip, plus Snap, Zoom, Nudge and cursor navigation. Fade controls are removed from Track Settings.
- Compact Clip and Track menus sit on the right side of the loop row. Clip actions include Trim Start to Cursor, Trim End to Cursor, Split at Cursor and Delete Clip. Track actions include Delete Track.
- Trim-to-cursor requires the snapped cursor to sit inside the selected clip, uses the existing non-destructive trim helpers and preserves the mediaId/source audio.
- Deleting a clip or track removes its arrangement references only; original audio files stay in local media storage. Track deletion requires confirmation, is blocked during playback/recording, and never allows the last remaining track to be removed.
- Automated tests cover trim helper behaviour, toolbar action placement, fade control location, and selected track/clip action wiring.

## Regression guardrails
- Stage 1 speaker/MG-30 output routing dan native AudioTrack code diwarisi apa adanya.
- Tidak mengubah USB AudioRecord plugin `native-android/MG30AudioPlugin.java`.
- NAM import/transfer tidak disentuh.
- IR User/Third Party dan IR Collection tidak disentuh.
- MIDI mapping dan USB-MIDI framing tidak disentuh.
- Preset read/write/import/export tidak disentuh.
- Signal Chain, CTRL/EXP, Editor, Device Settings dan track input routing tidak disentuh.
- Clip editing hanya menyalin metadata clip dan menggunakan mediaId yang sama; tidak menulis ulang atau memodifikasi file audio sumber.

## Automated tests
File baru `tests/studio-daw-arrangement.test.js` memeriksa:
- Default/migrasi batas loop project.
- Persistensi Loop In/Out.
- Copy/Paste/Duplicate.
- Cross-track drag.
- Keyboard shortcuts/nudge.
- Loop section pada speaker dan native playback.
- Keberadaan kontrol UI dan tidak adanya ID loop toggle ganda.

## Hardware validation checklist
1. Copy clip lalu paste di posisi playhead pada track sama dan track lain.
2. Duplicate clip; pastikan salinan mulai tepat setelah clip asli.
3. Geser clip horizontal dan vertikal antar-track; pastikan audio sumber, trim, fade dan durasi tidak berubah.
4. Uji snap Off, Beat, 1/8 dan Bar.
5. Set Loop In/Out, aktifkan Section, dengarkan speaker dan MG-30; periksa transisi dan posisi playhead.
6. Clear Loop dan pastikan playback kembali normal.
7. Uji Undo/Redo di sisi kiri timer, save, tutup/buka project dan pastikan arrangement tersimpan.
8. Pastikan NAM, IR collection/user, MIDI dan USB recording masih bekerja.

## Status
- Source implementation and tests are committed to this isolated branch.
- CI/APK status must be checked separately; do not distribute APK until tests, Gradle build and artifact inspection pass.
- No physical hardware validation of Stage 2 has been claimed yet.
- The user explicitly corrected the Stage 2 scope; native metronome and native output meter work is not part of this stage.


## CI test maintenance — 3 November 2026
- The first run for contextual controls (#431, commit `b1a6697`) stopped in regression tests, before Android generation/APK build.
- The implementation tests for trim helpers passed. Two unrelated/stale assertions still expected the previous exact menu class and fade sliders inside the Track Inspector.
- The tests were updated to assert the new menu class and fade sliders inside the three-dot overflow menu; the runtime code keeps fade control state in the main DAW card dropdown.
- No production logic was changed as part of that test-only correction.


## Mobile DAW polish — pinch zoom and overlay fix (3 November 2026)
- The metronome/tempo card now establishes a higher stacking context than the timeline panel. Its three-dot popover is raised above the playhead, preventing the white cursor line from painting through the dropdown.
- Cursor-to-start and cursor-to-end controls are moved out of the three-dot menu and placed at the right side of the timer row, next to Copy/Paste/Duplicate.
- Two-finger pinch on the timeline grid scales the complete timeline canvas live. The bar position beneath the fingers' midpoint remains anchored; zoom is bounded to the existing 44–180 range.
- During pinch, a one-finger clip drag is cancelled and DOM rebuilding is deferred until pointer-up. The chosen zoom is committed once at the end of the gesture; tap/click after pinch is suppressed to avoid an accidental seek.
- Added core tests for proportional pinch scaling and midpoint anchor math, plus UI assertions for overlay stacking, cursor button placement, and pointer gesture registration.
