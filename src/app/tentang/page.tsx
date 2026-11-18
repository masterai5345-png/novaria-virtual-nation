import type { Metadata } from "next";
import Link from "next/link";
import { PublicLegalLayout } from "@/components/legal/PublicLegalLayout";
export const metadata:Metadata={title:"Tentang NOVARIA | Desa Virtual 3D",description:"Kenali dunia NOVARIA: Desa Nol 3D, maskot hewan acak, KTP warga, chat global dan pembangunan hasil voting Instagram."};
export default function AboutNovaria(){
 return <PublicLegalLayout eyebrow="KENALI DUNIA KITA" title="Tentang NOVARIA" lead="NOVARIA adalah desa virtual 3D yang tumbuh mengikuti aspirasi komunitasnya—mulai dari Hari 0, satu pembangunan demi satu pembangunan.">
  <h2>Mulai dari Desa Nol</h2>
  <p>Setiap pengunjung dapat membuka desa langsung dari halaman utama tanpa membuat akun. Jelajahi pemandangan, lihat perkembangan pembangunan, dan ikuti kisah terbentuknya sebuah komunitas dari tanah kosong.</p>
  <h2>Menjadi warga dan memiliki maskot sendiri</h2>
  <p>Warga yang mendaftar menggunakan login Google memperoleh identitas desa, maskot hewan yang dipilih secara acak pada pendaftaran pertama, serta KTP digital khusus permainan. Warga dapat berjalan, duduk, melambaikan tangan, dan menggunakan fitur sosial yang sudah diaktifkan.</p>
  <h2>Berinteraksi dengan komunitas</h2>
  <p>Pesan di chat global dapat dibaca pengunjung lain. Untuk mengirim pesan diperlukan login; percakapan tunduk pada aturan moderasi. Kehadiran maskot pemain lain ditampilkan secara berkala dan bergantung pada koneksi serta kapasitas layanan.</p>
  <h2>Instagram menentukan pembangunan</h2>
  <p>Rencana jangka panjang NOVARIA adalah membangun rumah, jalan, taman, toko, atau pohon berdasarkan hasil komentar voting Instagram resmi. Platform YouTube, TikTok, dan Facebook membantu memperkenalkan dunia NOVARIA, tetapi komentarnya bukan suara pembangunan. Integrasi otomatis tersebut akan diumumkan setelah benar-benar aktif.</p>
  <h2>Mengapa kami meminta login Google?</h2>
  <p>Google digunakan untuk memastikan satu identitas akun yang dapat dihubungkan ke profil permainan, menghindari akun ganda, menyimpan maskot permanen, mengelola klaim rumah, dan mengurangi penyalahgunaan chat. NOVARIA tidak meminta akses ke email Gmail, Drive, kontak, atau kalender. Lihat <Link href="/privacy">Kebijakan Privasi</Link> untuk informasi lebih lanjut.</p>
  <p><Link href="/">Jelajahi Desa Nol</Link> · <Link href="/masuk">Masuk Jadi Warga</Link> · <Link href="/terms">Aturan Komunitas</Link></p>
 </PublicLegalLayout>;
}
