# Dashboard Kepala Desa NOVARIA

## Halaman
- Public URL masa depan: `/` — harus langsung menampilkan game 3D, tanpa layar login/landing.
- Admin pribadi: `/admin/kepala-desa` — hanya akun Google pemilik yang lolos `requireOwner()`.
- Pusat AI lama: `/admin/ai` — tetap ada dan memiliki tautan ke dashboard baru.
- Demo Desa Nol: `/village-zero` — belum production dan tidak menjadi halaman utama sampai pemilik menyetujui.

## Apa yang terlihat
1. Suara Instagram hari ini: opsi Rumah, Jalan, Pohon, Taman, Toko. Sumber `village_votes` untuk Desa Nol hari ini (WIB). Tidak menghitung TikTok/YouTube/Facebook sebagai voting.
2. Total pembangunan dan rumah: dari `village_objects` dan `village_homes`.
3. Riwayat keputusan harian: dari `village_vote_results`.
4. Aspirasi/komentar yang sudah masuk: dari `social_comment_inbox` dengan status moderasi.
5. Status AI worker: heartbeat aktual dan job queue; error kredit Claude terlihat jika tercatat.
6. Draft konten dan persetujuan: `media_drafts` dan `approval_requests`.
7. Daftar tugas tim Agent yang sudah tersedia maupun belum terhubung, ditandai jelas.

## Keamanan
- Server Component, dieksekusi setelah requireOwner() yang memeriksa sesi Google, alamat owner, role database dan status akun aktif.
- Seluruh query SELECT; tidak ada tombol mutasi, eksekusi posting, pemrosesan pembayaran, atau reset dari dashboard.
- Skema Desa Nol masih belum diterapkan: dashboard akan menginformasikan 'belum terhubung', bukan memalsukan angka voting.
- Tidak mengubah homepage publik `/`. Visual Kota Maskot asli yang disetujui tetap utuh.
- Tidak mengaktifkan perubahan otomatis ke production atau layanan berbayar.

## Tindakan selanjutnya
- Uji TypeScript, build dan tampilan responsive di lingkungan pengembangan sebelum merge.
- Setelah pemilik menyetujui deployment: tambahkan migrasi Desa Nol baru di DB development terlebih dahulu, sambungkan Instagram Meta API resmi dan uji webhook.
- Pindahkan dunia bersama ke server lalu tampilkan game Desa Nol premium di `/` hanya setelah disetujui, tanpa menghapus dunia Kota Maskot asli.
- Tambah kontrol persetujuan pembangunan harian, riwayat suara yang dimoderasi dan analytics resmi 4 platform saat konektor siap.

## Catatan
- Halaman ini **belum live**, karena branch terpisah dan belum diuji build atau deploy.
- Naskah AI yang gagal akibat saldo API tidak memblokir penghitungan voting berbasis kode.

## Pembaruan tahap kedua
- `DashboardRefresh.tsx`: tombol "Segarkan Data" dan pembaruan otomatis 60 detik saat tab aktif. Pembacaan saja.
- `ApprovalInbox` tersedia langsung dalam dashboard untuk tinjauan rencana dan draft lama. Keputusan approval pada sistem saat ini hanya pencatatan review; bukan perintah publikasi.
- `GET /api/village-zero/world`: API publik baca-saja untuk dunia bersama. Tanpa tabel/epoch mengembalikan status belum aktif dan objek kosong; jika DB bermasalah membalas 503, tidak mengarang data.
- `docs/QA_DESA_NOL.md`: daftar pengujian dan hal-hal yang memblokir peluncuran.
- Tidak ada build/test yang dijalankan oleh alat ini karena runtime pengembangan penuh belum tersedia. Wajib `npm ci && npx tsc --noEmit && npm run lint && npm run build` di komputer clone atau runner CI yang disetujui.

## Perbedaan 'koneksi terkonfigurasi' dengan 'benar-benar aktif'
Ada/tidaknya variabel lingkungan hanya berarti pengaturan tersedia. Jangan menganggap integrasi Instagram berhasil sebelum ada hasil valid dari API resmi dan data suara masuk secara benar.
