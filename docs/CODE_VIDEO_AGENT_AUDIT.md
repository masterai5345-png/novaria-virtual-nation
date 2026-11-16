# NOVARIA — Audit stabilitas dan Video Agent tanpa AI generatif

## Keadaan yang benar ditemukan 16 November 2026
- Database live: 0 warga, 0 suara Instagram, 0 objek Desa Nol, 0 draft pada saat audit.
- Worker Claude lama masih hidup tetapi job `daily_content` gagal 3x dengan error saldo Anthropic.
- Login Google belum teruji sukses; memerlukan konfigurasi OAuth Google / Render di luar kode.
- Konektor Instagram dan posting otomatis TikTok/YouTube/Facebook belum terhubung.

## Implementasi baru: mesin FFmpeg
- `scripts/novaria-video-engine.mjs`: menggambar latar menggunakan buffer piksel JS dan membuat 3 adegan @10 detik dengan FFmpeg. Tidak memakai layanan generatif.
- `scripts/produce-daily-video.mjs`: membaca **village_vote_results** terakhir dari DB, lalu membuat episode MP4 30 detik, 480×854 (vertikal). Tanpa suara voting sah, **hanya satu episode pengenalan yang menjelaskan bahwa desa kosong**. Tidak mengarang angka.
- Menyimpan bytes di tabel `novaria_video_assets`; maksimal 3MB/episode dan menghapus binari >14 hari. Ini solusi sementara untuk paket database yang kecil, bukan CDN produksi skala besar.
- Menambahkan entry `media_drafts`, `approval_requests`, dan audit; **tidak melakukan auto-publish**.
- Endpoint privat `/api/admin/novaria-video/[id]` hanya bagi owner untuk pemutaran MP4. Dashboard menampilkan semua episode yang masih tersimpan.
- Cron Render yang sudah ada pada 01:00 UTC / 08:00 WIB kini menjalankan `scripts/produce-daily-video.mjs`, bukan antrean `daily_content` Claude.
- `npm run video:test`: 30 detik FFmpeg smoke test dengan validasi MP4/ffprobe. Jalankan saat debugging/penerimaan deployment.
- Tidak membeli layanan baru. FFmpeg sudah termasuk Render native runtime.

## Batasan dan pekerjaan tersisa
1. Video saat ini **grafis recap berbasis kode**, bukan rekaman sinematik dunia 3D. Untuk capture 3D interaktif perlu rendering browser/headless dan pipeline lebih lanjut.
2. Upload ke media sosial butuh konektor + persetujuan dan permission API resmi. Status `awaiting_approval` tidak sama dengan `published`.
3. Video menggunakan sinyal audio sintetis sangat sederhana; mixing musik/voiceover yang menarik belum dibuat.
4. Google login belum dapat diperbaiki tanpa Google OAuth Client ID/Secret dan pengaturan callback yang cocok. Jangan menebak atau mempublikasikan secret.
5. Chat real-time lewat polling dan batas moderasi sekarang belum cocok untuk puluhan ribu pengguna; uji beban sebelum viral.
6. Konektor Instagram asli harus dijalankan dan diverifikasi untuk mengisi hasil suara; settlement manual/dry-run masih memerlukan otomatisasi integrasi.

## Checklist QA sebelum klaim siap seluruhnya
- [ ] Render web build sukses
- [ ] Migrasi tabel video sukses tanpa reset existing DB
- [ ] Worker dan cron status live
- [ ] `npm run video:test` lulus pada Render runtime
- [ ] Cron menghasilkan MP4 pertama, arsip terlihat dan bisa dibuka owner
- [ ] Tidak ada permintaan Anthropic saat pipeline video
- [ ] OAuth Google berhasil dengan dua akun berbeda
- [ ] Warga menerima maskot permanen dan KTP
- [ ] Dua pemain bisa bergerak dan chat, moderasi bekerja
- [ ] Integrasi komentar Instagram resmi dan rekonsiliasi voting tervalidasi
- [ ] Publish otomatis sesuai persetujuan akun masing-masing platform

Catatan: jangan mengklaim semua AI Agent autonomously operational hanya karena mesin video sudah bisa dibuat. Ini adalah satu subsistem yang berjalan tanpa AI generatif.
