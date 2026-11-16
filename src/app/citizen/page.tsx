import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { query } from "@/lib/db";
import { ANIMAL_EMOJI, ANIMAL_LABELS, isCitizenSpecies } from "@/lib/animals";
import type { QueryResultRow } from "pg";
import AvatarStudio from "@/components/citizen/AvatarStudio";
import HouseClaimCard from "@/components/citizen/HouseClaimCard";
import CitizenKTP from "@/components/citizen/CitizenKTP";

type CitizenRow = QueryResultRow & {
  id: string;
  display_name: string;
  email: string | null;
  account_role: string;
  avatar_species: string;
  created_at: string;
};

export const dynamic = "force-dynamic";

export default async function CitizenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/masuk");

  const result = await query<CitizenRow>(
    `SELECT id, display_name, email, account_role, avatar_species, created_at
     FROM citizens
     WHERE id = $1 AND account_status = 'active'
     LIMIT 1`,
    [session.user.id],
  );
  const citizen = result.rows[0];
  if (!citizen) redirect("/masuk");
  const species = isCitizenSpecies(citizen.avatar_species) ? citizen.avatar_species : "fox";
  const speciesLabel = ANIMAL_LABELS[species];

  return (
    <main className="citizen-page-shell">
      <header className="citizen-page-header">
        <Link href="/" className="brand"><span className="brand-mark">🐾</span><span><strong>NOVARIA</strong><small>NOVARIA · DESA NOL</small></span></Link>
        <Link href="/" className="citizen-return">Kembali ke desa →</Link>
      </header>
      <section className="citizen-welcome-card">
        <div className="citizen-big-mascot" aria-hidden="true">{ANIMAL_EMOJI[species]}</div>
        <span className="eyebrow">PROFIL WARGA DESA NOL</span>
        <h1>Selamat datang di NOVARIA, {citizen.display_name}.</h1>
        <p>Akun Google kamu telah terdaftar sebagai warga NOVARIA. Spesies maskotmu dipilih secara acak saat pendaftaran, lalu disimpan permanen di database kota.</p>
        <div className="citizen-profile-grid">
          <div><small>ID WARGA</small><strong>{citizen.id.slice(0, 8).toUpperCase()}</strong></div>
          <div><small>MASKOT HEWANMU</small><strong>{ANIMAL_EMOJI[species]} {speciesLabel}</strong></div>
          <div><small>PERAN AKUN</small><strong>{citizen.account_role}</strong></div>
          <div><small>EMAIL TERDAFTAR</small><strong>{citizen.email}</strong></div>
        </div>
        <p className="citizen-next-step">Atur pakaian, warna bulu, dan aksesori maskotmu, lalu klaim rumah komunitas pertamamu.</p>
      </section>

      <div style={{maxWidth:850,margin:"16px auto"}}><CitizenKTP citizenId={citizen.id} displayName={citizen.display_name} species={species} joinedAt={citizen.created_at} role={citizen.account_role}/></div>
      <div className="citizen-tools-grid">
        <AvatarStudio />
        <HouseClaimCard />
      </div>
    </main>
  );
}
