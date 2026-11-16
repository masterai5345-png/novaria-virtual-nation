# NOVARIA Desa Nol — Mode B / Indonesia

Semua fitur baru berada di branch `feature/village-zero-instagram-commands`.
Tidak ada perubahan pada `foundation/mvp`, Render production, layanan berbayar, maupun database utama.

## Desain game
- **Hari 0:** tanah kosong dengan pemandangan alam, tidak ada bangunan, rumah atau jalan yang sudah jadi.
- **Pengunjung:** tanpa login, bebas memutar/zoom kamera dan melihat dunia.
- **Warga:** masuk dengan Google (identitas yang juga dapat digunakan untuk YouTube). Identitas warga diverifikasi server, bukan nama yang diketik. Fitur klaim rumah hanya memakai database Desa Nol, bukan rumah lama NOVARIA.
- **Pembangunan:** Mode B, 1 akun Instagram / 1 vote setiap hari WIB dari komentar pada post Instagram yang dipilih.
- **Opsi:** RUMAH, JALAN, POHON, TAMAN, TOKO.
- **Hasil:** satu jenis pembangunan per hari yang ada suara; tidak ada suara = tidak membangun. Seri: prioritas tetap sesuai urutan opsi.
- **Kepemilikan rumah:** setelah voting memilih RUMAH dan hasil disahkan, objek rumah tersedia untuk satu warga aktif yang login (klaim satu rumah per orang). Dalam fitur ini tidak ada klaim otomatis karena follower count.

## Kepatuhan YouTube
Tidak menerapkan syarat subscribe untuk mendapatkan rumah, karena hadiah sebagai imbalan berlangganan melanggar Kebijakan Developer YouTube API, bagian Playback Integrity. Tombol subscribe sukarela boleh ditampilkan terpisah, tanpa menjadi kondisi game.
Rujukan: https://developers.google.com/youtube/terms/developer-policies
Untuk login Google biasa tidak diperlukan scope YouTube yang sensitif; jangan mengumpulkan kredensial YouTube.

## File implementasi
- `src/app/village-zero/page.tsx`: demo interaktif 3D bahasa Indonesia dan pemilih simulasi, mode jalan-jalan bebas login, mode warga login.
- `src/lib/village-voting.ts`: fungsi bebas biaya untuk parsing komentar, deduplikasi dan finalisasi voting (demo lokal).
- `src/lib/village-zero.ts`: penempatan objek deterministik dan mencegah duplikasi.
- `db/village-zero-schema.sql`: skema SQL baru yang **BELUM** diterapkan.
- `src/app/api/integrations/village-vote/route.ts`: endpoint internal HMAC untuk menerima komentar terverifikasi dari connector Meta yang sah; dinonaktifkan jika environment belum diatur.
- `scripts/settle-village-vote.mjs`: finalisasi suara harian dengan mode default dry-run/ROLLBACK. `--apply` hanya setelah izin pemilik.
- `src/app/api/village-zero/claim/route.ts`: API klaim satu rumah untuk warga login, dengan transaksi, penguncian row dan pemeriksaan stok.

## Yang belum jadi
- Integrasi akun Instagram Business/Creator melalui Meta Login/OAuth, izin API komentar, validasi langsung `X-Hub-Signature-256`, ID media yang diawasi, dan APP Review bila diperlukan.
- Migrasi SQL ke database, inisialisasi epoch desa secara eksplisit, serta sinkronisasi tampilan 3D ke tabel `village_objects` di server. DEMO saat ini memakai localStorage browser, bukan world bersama.
- Video render + editing otomatis, posting media sosial, pemungutan statistik follower, admin moderation dan approval.
- End-to-end test, build/lint di CI, audit keamanan, optimasi performa browser mobile.

## Keamanan & privasi
- Jangan letakkan Meta/Google token di browser atau GitHub. Gunakan Render secret/env saat deployment yang disetujui.
- Endpoint internal mengharuskan `VILLAGE_VOTE_INGEST_SECRET` (minimal 32 karakter), `VILLAGE_INSTAGRAM_ACCOUNT_ID`, dan `VILLAGE_INSTAGRAM_MEDIA_IDS` (CSV).
- Payload connector: `{sourceAccountId,mediaId,commentId,authorId,text,receivedAt}`; header `x-novaria-timestamp` (Unix seconds) dan `x-novaria-signature` (HMAC SHA256 heksadesimal atas `timestamp.raw_body`).
- API HMAC hanya membuktikan asal connector internal. Connector wajib memverifikasi payload Meta sebelum meneruskannya.
- Simpan user_id Instagram internal seperlunya; jangan mempublikasikan identitas pemilih; sediakan kebijakan privasi dan mekanisme penghapusan data.
- Jangan menyatakan vote lokal/demo sebagai suara asli.
- OAuth dan kelayakan akun harus diperiksa secara terpisah; API/kuota dapat berubah.

## Instalasi berikutnya, masih membutuhkan persetujuan
1. Tinjau build dan tes feature branch di lingkungan lokal/pratinjau terisolasi.
2. Jalankan migrasi Desa Nol hanya di database pengembangan, bukan production.
3. Buat OAuth Meta dan konektor resmi dengan akun milik sendiri.
4. Verifikasi data suara dan jalankan finalisasi dry-run, baru izinkan settlement server berkala.
5. Hubungkan database snapshot ke tampilan Three.js. Kamera dan visual tetap responsif 9:16 serta layar biasa.
6. Hubungkan sistem render video dan publikasi dengan approval.

## Biaya
Tidak memanggil API Claude untuk voting, membangun plot, atau validasi perintah. Three.js serta logika voting dapat berjalan tanpa biaya AI. Hosting Render yang sudah ada memakai paket berbayar dan tidak diubah di branch ini.
