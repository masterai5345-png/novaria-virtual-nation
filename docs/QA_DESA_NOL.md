# Pengujian NOVARIA Desa Nol — petunjuk sebelum peluncuran

Semua pekerjaan pada branch `feature/village-zero-instagram-commands`.
Tidak boleh merge ke `foundation/mvp` sampai QA lulus dan pemilik memberikan izin eksplisit.
Perubahan branch saja tidak menjalankan migrasi ataupun deploy Render.

## Pengujian teknis (belum dijalankan pada production)
Setelah clone repository pada komputer pengembangan:
```bash
npm ci
npx tsc --noEmit
npm run lint
npm run build
```
Pastikan tidak ada error TypeScript/build.

## Tes manual tanpa Instagram
- Akses `/village-zero`: saat data kosong tidak ada rumah/jalan/toko.
- Gerakkan kamera; mouse/touch di HP tidak menyebabkan frame terlalu lambat.
- Pengunjung tanpa login dapat melihat dunia.
- Pemilih simulasi memasukkan opsi Bahasa Indonesia dan akun unik.
- Dua suara dari akun yang sama di tanggal yang sama harus ditolak.
- Dua komentar ber-ID sama harus ditolak.
- Akhiri voting demo dan periksa hanya satu pembangunan per tanggal.
- Reset demo harus hanya memengaruhi localStorage.
- Tidak ada klaim rumah Desa Nol saat database belum aktif.
- Dashboard `/admin/kepala-desa` menolak akun anonim dan bukan owner.
- Dashboard memaparkan status konektor belum aktif dengan benar tanpa angka rekaan.
- Dashboard data refresh 60 detik; menghentikan interval ketika komponen hilang.
- Tombol persetujuan hanya merekam keputusan review, tidak mengunggah konten.

## Pengujian setelah pemilik mengizinkan database DEV
- Terapkan `db/village-zero-schema.sql` di database sementara; jangan di database produksi.
- Buat epoch slug `desa-nol` dengan status `berjalan` di lingkungan tes.
- Pastikan `GET /api/village-zero/world` kosong (day 0, plots []).
- Pastikan `POST /api/integrations/village-vote` menolak tanpa HMAC, salah timestamp, akun dan media yang tidak terdaftar.
- Pastikan 1 akun hanya memiliki satu suara per hari meski komentar dan media berbeda.
- Jangan melupakan payload Meta asli memerlukan verifikasi X-Hub-Signature-256 oleh konektor resmi sebelum mengirim data internal.
- Jalankan `node scripts/settle-village-vote.mjs YYYY-MM-DD` tanpa `--apply`: hanya ROLLBACK, tanpa perubahan.
- Dengan persetujuan, finalisasi sekali; pengulangan harus gagal tanpa membuat objek ganda.
- Pemenang RUMAH menciptakan rumah yang bisa diklaim, pemenang lain tidak menciptakan rumah.
- Klaim rumah tanpa login ditolak. Setiap warga maksimum satu rumah.
- Simulasikan dua klaim pada satu rumah secara paralel; hanya satu menang.
- Pastikan `GET /api/village-zero/world` mencerminkan perubahan hasil vote, dan dashboard memakai angka yang sama.
- Testing mobile: Chrome Android serta Safari iOS.

## Kondisi BLOKIR peluncuran
1. Belum ada akses Instagram API resmi dan kepemilikan akun diverifikasi.
2. Berkas skema belum diverifikasi di DB development.
3. World renderer belum berlangganan data server secara realtime.
4. QA TypeScript/build belum lulus.
5. Cadangan, keamanan, monitoring, rate limit, dan kebijakan privasi belum diimplementasi.
6. Follower belum mendapatkan informasi aturan voting dan moderasi dengan transparan.

## Biaya
Tidak menjalankan CI berbayar, tidak membuat service, tidak memodifikasi Render dan tidak memakai token AI berbayar untuk menghitung suara.
