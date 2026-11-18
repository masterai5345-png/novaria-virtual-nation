import type { Metadata } from "next";
import Link from "next/link";
import { PublicLegalLayout, SupportContact } from "@/components/legal/PublicLegalLayout";
export const metadata:Metadata={title:"Kebijakan Privasi | NOVARIA",description:"Kebijakan privasi NOVARIA tentang login Google, KTP warga, maskot hewan, chat global, dan aktivitas desa."};
export default function PrivacyPage(){
 const email=process.env.NOVARIA_PUBLIC_CONTACT_EMAIL?.trim();
 return <PublicLegalLayout eyebrow="INFORMASI RESMI NOVARIA" title="Kebijakan Privasi" lead="Penjelasan tentang data yang digunakan untuk menjalankan desa virtual NOVARIA dan bagaimana warga dapat mengendalikan informasi pribadinya.">
  <p><strong>Terakhir diperbarui:</strong> 16 November 2026. Kebijakan ini berlaku untuk website NOVARIA dan fitur-fiturnya yang tersedia melalui website resmi.</p>
  <h2>1. Tentang NOVARIA</h2>
  <p>NOVARIA adalah pengalaman desa virtual 3D: pengunjung dapat menjelajahi dunia tanpa akun, sedangkan warga yang masuk dapat memperoleh maskot hewan permanen dan KTP digital, bergerak di desa, berinteraksi lewat chat, serta mengakses fitur kepemilikan rumah jika tersedia. Perkembangan desa direncanakan mengikuti voting pada komentar Instagram resmi. Konektor Instagram dan sebagian otomatisasi AI mungkin belum aktif.</p>
  <h2>2. Data yang kami akses dan kumpulkan</h2>
  <ul>
   <li><strong>Login Google:</strong> nama profil, alamat email, dan identitas akun Google (ID unik dari Google) yang digunakan untuk memverifikasi akun dan mencegah pendaftaran ganda. NOVARIA tidak menerima atau menyimpan kata sandi akun Google.</li>
   <li><strong>Profil warga:</strong> ID warga internal, nama tampilan, spesies maskot yang dipilih acak sekali pada pendaftaran awal, pengaturan tampilan maskot, dan nama pengguna media sosial jika warga memilih menambahkannya.</li>
   <li><strong>Aktivitas permainan:</strong> data rumah dan klaim rumah, tugas permainan dan saldo mata uang virtual bila digunakan, serta status aktivitas untuk menjalankan fitur desa.</li>
   <li><strong>Chat global:</strong> nama tampilan warga, jenis maskot, isi pesan, dan waktu pengiriman. Pesan yang tidak disembunyikan dapat dilihat semua pengunjung, termasuk yang tidak login.</li>
   <li><strong>Kehadiran di desa:</strong> posisi dan aksi maskot yang sedang aktif, diperbarui secara berkala untuk menampilkan pemain lain. Hanya identitas tampilan permainan yang diperlukan ditampilkan, bukan email Google.</li>
   <li><strong>Operasional dan keamanan:</strong> informasi teknis yang mungkin tercatat di log layanan hosting, termasuk waktu akses, kesalahan aplikasi, dan metadata jaringan sesuai pengoperasian penyedia layanan.</li>
   <li><strong>Interaksi Instagram:</strong> jika konektor resmi diaktifkan, komentar atau identitas akun Instagram terkait voting dapat diproses sesuai aturan voting yang diumumkan. Saat ini fitur tersebut belum tentu aktif.</li>
  </ul>
  <h2>3. Tujuan penggunaan informasi</h2>
  <p>Data digunakan untuk memverifikasi login, menyimpan identitas maskot dan KTP permainan, mengelola rumah, menampilkan aktivitas pemain, menayangkan dan memoderasi percakapan, menghitung voting yang sah jika konektor Instagram aktif, mencegah spam atau penyalahgunaan, dan membantu pengelola memantau kinerja layanan.</p>
  <h2>4. Data Google dan akses pihak ketiga</h2>
  <p>Login Google dipakai untuk autentikasi akun saja. Nama, email dan ID Google tidak dijual kepada pengiklan, tidak dimasukkan ke KTP yang dapat diunduh, dan tidak dipublikasikan di chat global. Tidak ada akses Gmail, Google Drive, kontak, atau kalender yang diperlukan untuk menjadi warga. Data akun dapat diproses oleh penyedia autentikasi dan hosting sesuai fungsi layanan. Google mengelola proses login melalui kebijakannya sendiri.</p>
  <h2>5. Data yang terlihat oleh pengunjung lain</h2>
  <p>Nama tampilan, spesies maskot, posisi karakter ketika online, pesan chat yang terlihat, dan status dalam permainan dapat terlihat oleh pengguna lain. KTP digital dapat dibagikan oleh pemiliknya secara sukarela; karena itu KTP hanya memuat identitas permainan, bukan alamat email, token login, atau data sensitif dari Google. Hindari mengirim alamat rumah, nomor telepon, dokumen identitas negara, atau informasi sensitif melalui chat.</p>
  <h2>6. Penyimpanan, perlindungan, dan masa simpan</h2>
  <p>Informasi akun dan permainan disimpan pada database aplikasi yang dioperasikan melalui infrastruktur hosting. Sesi login dijaga dengan mekanisme autentikasi aplikasi. Kami menerapkan pemeriksaan akses dan batas pengiriman pesan untuk mengurangi spam, tetapi tidak ada sistem internet yang bebas risiko. Data akun dapat tetap disimpan selama akun digunakan atau sepanjang diperlukan untuk keamanan, integritas permainan, penyelesaian permintaan, dan kewajiban hukum yang berlaku. Log dan salinan cadangan dapat memiliki siklus penyimpanan tersendiri menurut penyedia layanan.</p>
  <h2>7. Penghapusan dan pembaruan data</h2>
  <p>Warga dapat mengubah nama tampilan dan pengaturan maskot melalui profil. Untuk meminta akses, koreksi, atau penghapusan data akun serta pesan, hubungi pengelola menggunakan kanal pada bagian Kontak. Beberapa catatan audit atau transaksi permainan mungkin perlu dipertahankan jika diperlukan secara sah, dan permintaan penghapusan tidak otomatis menghapus konten yang sebelumnya disalin atau dibagikan pihak lain.</p>
  <h2>8. Anak-anak dan penggunaan yang aman</h2>
  <p>NOVARIA merupakan ruang komunitas dengan interaksi pengguna. Anak di bawah usia yang berlaku untuk memberikan persetujuan atas layanan online perlu pendampingan dan izin orang tua atau wali sesuai ketentuan setempat. Pengelola dapat membatasi atau menghapus konten yang membahayakan komunitas.</p>
  <h2>9. Perubahan kebijakan</h2>
  <p>Jika fitur berubah secara material, termasuk penambahan konektor sosial atau pemrosesan data baru, kebijakan ini akan diperbarui dengan tanggal revisi terbaru. Kami menganjurkan warga memeriksanya secara berkala.</p>
  <h2>10. Kontak privasi</h2>
  <p>Untuk pertanyaan atau permintaan terkait privasi, hubungi pengelola NOVARIA melalui <SupportContact email={email}/>. Email dukungan publik harus disiapkan sebelum proses verifikasi branding Google diajukan.</p>
  <p>Kembali ke <Link href="/">Game Desa NOVARIA</Link> atau baca <Link href="/terms">Ketentuan Layanan</Link>.</p>
 </PublicLegalLayout>;
}
