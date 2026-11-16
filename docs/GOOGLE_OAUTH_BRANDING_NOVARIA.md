# NOVARIA — Checklist Google OAuth Branding

Ditambahkan pada 16 November 2026.

## Halaman publik yang siap diuji
- Homepage: https://novaria-web.onrender.com
- Tentang aplikasi: https://novaria-web.onrender.com/tentang
- Privacy Policy: https://novaria-web.onrender.com/privacy
- Terms of Service: https://novaria-web.onrender.com/terms
- Kontak: https://novaria-web.onrender.com/contact
- OAuth callback untuk tipe Web application: https://novaria-web.onrender.com/api/auth/callback/google

Halaman di-host pada domain yang sama; footer dan halaman utama menautkan kebijakan privasi. Tidak perlu login untuk membacanya.

## PENTING: belum siap mengajukan verifikasi sampai hal di bawah diselesaikan
1. **Alamat dukungan publik:** pemilik perlu menyediakan email brand yang bersedia dipublikasikan. Set env `NOVARIA_PUBLIC_CONTACT_EMAIL` di Render, contoh format `support@domain-milik-sendiri` jika alamat itu benar-benar ada. Jangan gunakan nama/alamat contoh sebelum tersedia. Kontak tidak boleh dibiarkan kosong saat submit.
2. **Tinjau teks legal:** pemilik harus memastikan seluruh praktik pengumpulan data, retensi, dan hubungan dengan provider benar dan sah, lalu meninjau hukum yang berlaku. Dokumen adalah draf berbasis fitur kode saat ini, bukan penilaian profesional.
3. **Kepemilikan domain:** `novaria-web.onrender.com` adalah subdomain domain milik platform Render, bukan domain registrasi NOVARIA. Google menyarankan domain yang dimiliki sendiri untuk verifikasi kepemilikan melalui Google Search Console. Jangan menambahkan `novaria.id` atau nama domain lain ke console sebelum benar-benar dimiliki. Bisa tetap memakai Render untuk pengujian dan menghubungkan domain milik sendiri nanti.
4. **OAuth Client:** jenis **Web application**, origin HTTPS homepage dan callback persis (termasuk `/api/auth/callback/google`). Pastikan Google OAuth yang digunakan pada Render memakai Client ID/Secret dari project dan client yang sama.
5. **Logo:** square 120×120 PNG/JPG/BMP <=1MB sesuai UI Google.
6. **Scopes:** meminta hanya `openid`, `email`, `profile` untuk login warga; akses Gmail/Drive tidak diperlukan.
7. **Verifikasi:** akses situs dan privacy dari browser/incognito, cocokkan URL privacy di homepage dengan URL pada consent screen.
8. **Login Google 400:** penerbitan halaman legal TIDAK otomatis memperbaiki error `invalid_request`. Lihat "see error details" dan periksa client OAuth, redirect URI, compliance, serta konfigurasi aplikasi.

## Pengisian menu Branding
- App Name: NOVARIA
- Homepage: https://novaria-web.onrender.com
- Privacy: https://novaria-web.onrender.com/privacy
- Terms: https://novaria-web.onrender.com/terms
- App logo: gunakan logo resmi milik pengelola
- Authorized domains: harus sesuai domain dan aturan Google; verifikasi kepemilikannya di Google Search Console bila disyaratkan.
- User support email: email yang aktif dan dikuasai pengelola.

## Catatan teknis
- Homepage publik game tidak diganti; hanya ditambah panel informasi dan tautan legal yang bisa diklik.
- Tidak ada perubahan database dan tidak ada sumber daya hosting baru.
- Teks kebijakan harus diperbarui ketika API Instagram, video agent, iklan, analitik atau data baru diaktifkan.
- Info lebih lanjut: https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
