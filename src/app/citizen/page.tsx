import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { query } from "@/lib/db";

type CitizenRow = {
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
  if (!session?.user?.id) redirect("/");

  const result = await query<CitizenRow>(
    `SELECT id, display_name, email, account_role, avatar_species, created_at
     FROM citizens
     WHERE id = $1 AND account_status = 'active'
     LIMIT 1`,
    [session.user.id],
  );
  const citizen = result.rows[0];
  if (!citizen) redirect("/");

  return (
    <main className="citizen-page-shell">
      <header className="citizen-page-header">
        <Link href="/" className="brand"><span className="brand-mark">N</span><span><strong>NOVARIA</strong><small>A LIVING VIRTUAL NATION</small></span></Link>
        <Link href="/" className="citizen-return">Return to town →</Link>
      </header>
      <section className="citizen-welcome-card">
        <div className="citizen-big-otter" aria-hidden="true">🦦</div>
        <span className="eyebrow">OFFICIAL CITIZEN PROFILE</span>
        <h1>Welcome to NOVARIA, {citizen.display_name}.</h1>
        <p>Your Google account has been registered as a NOVARIA citizen. Your permanent profile is stored in the city database.</p>
        <div className="citizen-profile-grid">
          <div><small>CITIZEN ID</small><strong>{citizen.id.slice(0, 8).toUpperCase()}</strong></div>
          <div><small>AVATAR SPECIES</small><strong>Otter</strong></div>
          <div><small>ACCOUNT ROLE</small><strong>{citizen.account_role}</strong></div>
          <div><small>REGISTERED EMAIL</small><strong>{citizen.email}</strong></div>
        </div>
        <p className="citizen-next-step">Avatar customization, house claiming, and multiplayer visits will be enabled as the next game systems are connected.</p>
      </section>
    </main>
  );
}
