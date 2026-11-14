import { auth } from "../../auth";
import { databaseConfigured, isOwnerEmail, query } from "@/lib/db";\nimport type { QueryResultRow } from "pg";

export async function requireOwner() {
  const session = await auth();
  const email = session?.user?.email;
  if (!session?.user?.id || !isOwnerEmail(email)) {
    return { ok: false as const, status: 403 as const, reason: "Owner access required." };
  }

  if (!databaseConfigured) {
    return { ok: false as const, status: 503 as const, reason: "Database is not configured." };
  }

  const result = await query<{ account_role: string; account_status: string } & QueryResultRow>(
    "SELECT account_role, account_status FROM citizens WHERE id = $1 LIMIT 1",
    [session.user.id],
  );
  const citizen = result.rows[0];
  if (!citizen || citizen.account_status !== "active" || citizen.account_role !== "owner") {
    return { ok: false as const, status: 403 as const, reason: "This Google account is not configured as the NOVARIA owner." };
  }

  return {
    ok: true as const,
    citizenId: session.user.id,
    email: email!,
  };
}
