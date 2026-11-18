import type { Metadata } from "next";
import Link from "next/link";
import { PublicLegalLayout } from "@/components/legal/PublicLegalLayout";
export const metadata:Metadata={title:"Kontak dan Bantuan | NOVARIA",description:"Informasi kontak dan layanan dukungan warga NOVARIA, termasuk permintaan privasi dan laporan chat."};
export default function ContactPage(){
 const email=process.env.NOVARIA_PUBLIC_CONTACT_EMAIL?.trim();
 return <PublicLegalLayout eyebrow="BANTUAN & KONTAK" title="Hubungi NOVARIA" lead="Untuk bantuan akun warga, laporan penyalahgunaan chat, dan pertanyaan mengenai data atau kebijakan komunitas.">
  <h2>Dukungan warga</h2>
  {email?<>
   <p>Kirim pertanyaan melalui email dukungan resmi: <a href={`mailto:${email}`}>{email}</a>.</p>
   <p>Untuk laporan atau permintaan penghapusan data, jelaskan nama akun NOVARIA dan kebutuhanmu. Jangan mengirim kata sandi, token login, atau dokumen sensitif melalui chat publik.</p>
  </>:<>
   <p><strong>Kanal dukungan email resmi sedang disiapkan.</strong> Kami belum menampilkan alamat pribadi pengelola sebagai kontak publik tanpa persetujuan. Sebelum mengajukan verifikasi merek Google, pengelola harus menentukan alamat email layanan yang dapat dihubungi dan memasangnya sebagai <code>NOVARIA_PUBLIC_CONTACT_EMAIL</code> pada konfigurasi server.</p>
   <p>Halaman ini belum memenuhi kebutuhan kontak publik untuk pengajuan verifikasi. Untuk saat ini, halaman <Link href="/privacy">Kebijakan Privasi</Link> dan <Link href="/terms">Ketentuan Layanan</Link> dapat dibaca oleh semua pengunjung.</p>
  </>}
  <h2>Melaporkan masalah di desa</h2>
  <p>Dalam chat global, jangan membagikan informasi identitas pribadi atau alamat email. Pesan yang melanggar aturan dapat disembunyikan oleh pengelola NOVARIA melalui Dashboard Kepala Desa. Jika mengalami kendala login Google, lihat pesan kesalahan pada halaman <Link href="/masuk">Masuk Jadi Warga</Link> dan laporkan kode kesalahan tanpa membagikan rahasia akun.</p>
  <h2>Layanan yang dikelola</h2>
  <p>Website NOVARIA saat ini dioperasikan melalui layanan hosting Render dengan autentikasi Google dan penyimpanan profil permainan pada database aplikasi. Konektor Instagram, YouTube, TikTok, dan Facebook akan memerlukan izin resmi dan pengumuman tambahan jika diaktifkan.</p>
  <p><Link href="/">Kembali ke Game NOVARIA</Link>.</p>
 </PublicLegalLayout>;
}
