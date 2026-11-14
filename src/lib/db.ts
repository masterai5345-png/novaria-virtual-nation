import { Pool, type QueryResultRow } from "pg";

const globalForNovaria = globalThis as typeof globalThis & {
  novariaPool?: Pool;
};

export const databaseConfigured = Boolean(process.env.DATABASE_URL);

export const db: Pool | null = databaseConfigured
  ? (globalForNovaria.novariaPool ??= new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      application_name: "novaria-web",
    }))
  : null;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return db.query<T>(text, values);
}

export type CitizenRecord = {
  [key: string]: unknown;
  id: string;
  email: string | null;
  display_name: string;
  account_role: "citizen" | "moderator" | "admin" | "owner";
  account_status: "active" | "suspended" | "deleted";
  avatar_species: "otter";
  avatar_style: Record<string, unknown>;
  created_at: string;
};

export async function upsertGoogleCitizen(input: {
  googleSubject: string;
  email: string;
  displayName: string;
}) {
  const result = await query<CitizenRecord>(
    `INSERT INTO citizens (
       auth_provider, auth_subject, email, display_name, account_role
     )
     VALUES ('google', $1, $2, $3,
       CASE WHEN lower($2) = lower($4) THEN 'owner' ELSE 'citizen' END
     )
     ON CONFLICT (auth_provider, auth_subject)
     DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name,
       account_role = CASE
         WHEN lower(EXCLUDED.email) = lower($4) THEN 'owner'
         ELSE citizens.account_role
       END,
       updated_at = NOW()
     RETURNING id, email, display_name, account_role, account_status,
               avatar_species, avatar_style, created_at`,
    [
      input.googleSubject,
      input.email,
      input.displayName,
      process.env.NOVARIA_OWNER_EMAIL ?? "",
    ],
  );
  return result.rows[0];
}

export function isOwnerEmail(email?: string | null) {
  const owner = process.env.NOVARIA_OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && email && email.trim().toLowerCase() === owner);
}
