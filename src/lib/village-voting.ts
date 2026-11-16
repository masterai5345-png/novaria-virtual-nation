import { applyVillageComment, EMPTY_VILLAGE, type VillageAction, type VillageWorld } from "./village-zero";

// Bahasa Indonesia untuk seluruh command publik. Tidak perlu AI/API berbayar.
export const PILIHAN_VOTING: readonly { kata: string; tindakan: VillageAction; label: string }[] = [
  { kata: "RUMAH", tindakan: "BUILD HOUSE", label: "Bangun Rumah" },
  { kata: "JALAN", tindakan: "BUILD ROAD", label: "Bangun Jalan" },
  { kata: "POHON", tindakan: "PLANT TREE", label: "Tanam Pohon" },
  { kata: "TAMAN", tindakan: "BUILD PARK", label: "Bangun Taman" },
  { kata: "TOKO", tindakan: "BUILD SHOP", label: "Bangun Toko" },
];

export type SuaraWarga = { idKomentar: string; idPengguna: string; tanggal: string; pilihan: VillageAction };
export type HasilVoting = { tanggal: string; pilihan: VillageAction; jumlah: number; total: number };
export type DesaVoting = { versi: 1; dunia: VillageWorld; suara: SuaraWarga[]; hasil: HasilVoting[] };
export const DESA_AWAL: DesaVoting = { versi: 1, dunia: EMPTY_VILLAGE, suara: [], hasil: [] };

export function hariJakarta(waktu: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(waktu);
}

export function bacaPilihan(teks: string): VillageAction | null {
  const norm = teks.normalize("NFKC").trim().toUpperCase().replace(/[!.,]/g, "").replace(/\s+/g, " ");
  const singkat = norm.replace(/^(PILIH|VOTE)\s+/, "");
  return PILIHAN_VOTING.find(p => p.kata === singkat)?.tindakan ?? null;
}

export function terimaSuara(
  desa: DesaVoting,
  masukan: { idKomentar: string; idPengguna: string; teks: string; tanggal: string },
): { desa: DesaVoting; diterima: boolean; pesan: string } {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(masukan.tanggal) ||
      !/^[a-zA-Z0-9_.:-]{1,160}$/.test(masukan.idKomentar) ||
      !/^[a-zA-Z0-9_.:-]{1,160}$/.test(masukan.idPengguna)) {
    return { desa, diterima: false, pesan: "Identitas atau tanggal komentar tidak valid." };
  }
  if (desa.hasil.some(h => h.tanggal === masukan.tanggal)) {
    return { desa, diterima: false, pesan: "Voting hari tersebut sudah ditutup." };
  }
  if (desa.suara.some(s => s.idKomentar === masukan.idKomentar)) {
    return { desa, diterima: false, pesan: "Komentar ini sudah tercatat." };
  }
  if (desa.suara.some(s => s.tanggal === masukan.tanggal && s.idPengguna === masukan.idPengguna)) {
    return { desa, diterima: false, pesan: "Setiap akun hanya mendapat satu suara per hari." };
  }
  const pilihan = bacaPilihan(masukan.teks);
  if (!pilihan) return { desa, diterima: false, pesan: "Perintah tidak dikenal. Gunakan RUMAH, JALAN, POHON, TAMAN, atau TOKO." };
  return {
    diterima: true,
    pesan: "Suara berhasil masuk dan menunggu penghitungan harian.",
    desa: { ...desa, suara: [...desa.suara, { idKomentar: masukan.idKomentar, idPengguna: masukan.idPengguna, tanggal: masukan.tanggal, pilihan }] },
  };
}

// Tutup voting hanya untuk tanggal yang SUDAH berlalu, bukan hari yang masih berlangsung.
// Tidak ada pembangunan otomatis untuk hari tanpa suara. Hasil seri ditentukan oleh urutan opsi tetap.
export function tutupVoting(desa: DesaVoting, tanggal: string, hariSekarang: string):
  { desa: DesaVoting; berhasil: boolean; pesan: string; pemenang?: VillageAction } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || tanggal >= hariSekarang) {
    return { desa, berhasil: false, pesan: "Voting hanya dapat ditutup setelah hari berakhir." };
  }
  if (desa.hasil.some(h => h.tanggal === tanggal)) {
    return { desa, berhasil: false, pesan: "Hasil voting tanggal ini sudah disahkan." };
  }
  const suara = desa.suara.filter(s => s.tanggal === tanggal);
  if (!suara.length) return { desa, berhasil: false, pesan: "Belum ada suara; desa tetap kosong." };
  const peringkat = PILIHAN_VOTING.map(p => ({ pilihan: p.tindakan, jumlah: suara.filter(s => s.pilihan === p.tindakan).length }));
  peringkat.sort((a,b)=> b.jumlah - a.jumlah);
  const juara = peringkat[0];
  const result = applyVillageComment(desa.dunia, { id: `voting-${tanggal}`, text: juara.pilihan, source: "voting-harian" });
  if (!result.accepted) return { desa, berhasil: false, pesan: result.reason };
  return {
    berhasil: true, pesan: `Hasil: ${PILIHAN_VOTING.find(x=>x.tindakan===juara.pilihan)?.label}. Desa bertambah satu objek.`,
    pemenang: juara.pilihan,
    desa: { ...desa, dunia: result.world, hasil: [...desa.hasil, { tanggal, pilihan: juara.pilihan, jumlah: juara.jumlah, total: suara.length }] },
  };
}
