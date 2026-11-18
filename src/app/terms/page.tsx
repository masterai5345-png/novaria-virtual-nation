import type { Metadata } from "next";
import Link from "next/link";
import { PublicLegalLayout, SupportContact } from "@/components/legal/PublicLegalLayout";
export const metadata:Metadata={title:"Ketentuan Layanan | NOVARIA",description:"Aturan penggunaan desa virtual NOVARIA, akun Google, KTP digital, chat global, dan voting."};
export default function TermsPage(){
 const email=process.env.NOVARIA_PUBLIC_CONTACT_EMAIL?.trim();
 return <PublicLegalLayout eyebrow="INFORMASI RESMI NOVARIA" title="Ketentuan Layanan" lead="Aturan dasar agar Desa Nol menjadi ruang bermain, berekspresi, dan berkomunitas yang aman untuk semua warga.">
  <p><strong>Terakhir diperbarui:</strong> 16 November 2026. Dengan mengakses NOVARIA, pengunjung dan warga setuju mematuhi aturan yang berlaku pada fitur yang mereka gunakan.</p>
  <h2>1. Layanan NOVARIA</h2>
  <p>NOVARIA menyediakan lingkungan desa 3D dan fitur komunitas digital. Pengunjung dapat melihat dunia tanpa login. Fitur seperti karakter pribadi, KTP permainan, klaim rumah, aksi karakter, dan pengiriman chat memerlukan akun Google yang berhasil diautentikasi. Beberapa fitur dapat tersedia bertahap dan mungkin berubah selama pengembangan.</p>
  <h2>2. Akun dan identitas warga</h2>
  <p>Warga bertanggung jawab atas keamanan akun Google miliknya dan keakuratan informasi yang secara sukarela dicantumkan dalam profil NOVARIA. Setiap warga akan mendapat satu nomor identitas dalam permainan dan satu spesies maskot hewan yang ditetapkan secara acak pada pendaftaran pertama. Spesies tersebut dipertahankan saat login berikutnya. Pemilihan pakaian atau aksesori dapat disediakan tanpa mengubah spesies dasar.</p>
  <h2>3. KTP digital permainan</h2>
  <p>KTP NOVARIA adalah kartu identitas fiktif khusus komunitas permainan, <strong>bukan dokumen identitas resmi negara</strong>. KTP dapat disimpan atau dibagikan secara sukarela oleh warga. Dilarang menyalahgunakan KTP atau identitas permainan untuk penipuan, penyamaran, atau mengaku sebagai pihak resmi di luar NOVARIA.</p>
  <h2>4. Aturan chat dan interaksi</h2>
  <ul>
   <li>Hormati pemain lain. Dilarang melakukan perundungan, ancaman, ujaran kebencian, pelecehan, penipuan, doxxing, atau membagikan informasi pribadi orang lain.</li>
   <li>Dilarang mengirim spam, tautan berbahaya, promosi tak diminta, atau konten yang melanggar hukum.</li>
   <li>Chat global adalah ruang publik. Pengunjung tanpa akun dapat membaca pesan yang tidak disembunyikan.</li>
   <li>Pengelola dapat menyembunyikan konten, membatasi aktivitas, atau menangguhkan akun yang melanggar aturan. Penyaringan otomatis tidak selalu sempurna.</li>
  </ul>
  <h2>5. Perkembangan desa dan voting Instagram</h2>
  <p>Bangunan dan perubahan Desa Nol direncanakan mengikuti hasil komentar voting pada posting Instagram resmi yang ditentukan pengelola. Komentar dari TikTok, YouTube, atau Facebook tidak otomatis menjadi suara untuk pembangunan. Aturan periode, pilihan yang sah, pembatasan suara, penanganan seri, dan penolakan spam akan diinformasikan pada setiap kampanye. Ketika konektor belum aktif, desa tidak boleh dianggap sudah menerima suara Instagram nyata.</p>
  <h2>6. Rumah dan aset virtual</h2>
  <p>Rumah, maskot, mata uang virtual, KTP dan objek di desa merupakan fitur permainan. Aset ini tidak memberi hak kepemilikan tanah sungguhan, hak atas uang tunai, atau janji penukaran menjadi nilai moneter. Pengelola dapat menyesuaikan atau membatasi fitur demi keamanan, pemeliharaan, integritas voting, dan kelangsungan layanan.</p>
  <h2>7. Ketersediaan layanan dan eksperimen</h2>
  <p>NOVARIA masih berkembang. Sistem dapat diperbarui, mengalami gangguan sementara, atau memiliki keterbatasan teknis. Fitur AI untuk penulisan konten, pengelolaan komunitas, video, dan publikasi media sosial belum tentu beroperasi otomatis. Kami akan berupaya memisahkan pengujian dari informasi publik dan tidak menganggap simulasi sebagai aktivitas warga nyata.</p>
  <h2>8. Hak dan konten pengguna</h2>
  <p>Warga tetap bertanggung jawab atas konten yang mereka kirim. Dengan mengirim pesan chat, pengguna mengizinkan NOVARIA menampilkannya dalam layanan dan memprosesnya untuk moderasi dan keamanan. Pengguna tidak boleh menggunakan layanan untuk menyebarkan karya atau materi tanpa hak yang diperlukan.</p>
  <h2>9. Privasi</h2>
  <p>Penggunaan data dijelaskan pada <Link href="/privacy">Kebijakan Privasi</Link>. Data login Google digunakan untuk membuat dan memverifikasi akun, bukan untuk menampilkan email Google di KTP publik. Jangan mengungkap informasi sensitif di ruang chat.</p>
  <h2>10. Pembatasan dan perubahan ketentuan</h2>
  <p>Pengelola dapat menangguhkan akses yang melanggar aturan atau mengancam keamanan komunitas. Ketentuan dapat diperbarui ketika fitur berubah; tanggal revisi akan ditampilkan. Ketentuan ini tidak meniadakan hak pengguna yang dilindungi hukum yang berlaku.</p>
  <h2>11. Hubungi pengelola</h2>
  <p>Pertanyaan atau laporan mengenai layanan dan komunitas dapat disampaikan melalui <SupportContact email={email}/>. Informasi kontak publik harus dilengkapi sebelum pengajuan verifikasi branding Google.</p>
  <p><Link href="/">Kembali ke Desa NOVARIA</Link> · <Link href="/privacy">Baca Kebijakan Privasi</Link></p>
 </PublicLegalLayout>;
}
