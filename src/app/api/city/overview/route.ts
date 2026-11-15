import { NextResponse } from "next/server";
import { databaseConfigured, query } from "@/lib/db";
import type { QueryResultRow } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!databaseConfigured) {
    return NextResponse.json({
      source: "preview",
      database: "not-configured",
      population: null,
      homes: null,
      activeCitizens: null,
      mayor: { name: "Pak Wali Kota Beruang", species: "bear" },
      note: "Configure PostgreSQL and apply db/schema.sql + db/seed.sql to show live city data.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await query<{
      active_citizens: string;
      homes: string;
      districts: string;
      mayor_name: string | null;
    } & QueryResultRow>(`SELECT
      (SELECT COUNT(*) FROM citizens WHERE account_status = 'active')::text AS active_citizens,
      (SELECT COUNT(*) FROM houses WHERE house_status <> 'inactive')::text AS homes,
      (SELECT COUNT(*) FROM districts)::text AS districts,
      (SELECT display_name FROM city_leaders WHERE is_active = TRUE LIMIT 1) AS mayor_name`);

    const row = result.rows[0];
    return NextResponse.json({
      source: "database",
      database: "connected",
      activeCitizens: Number(row.active_citizens),
      homes: Number(row.homes),
      districts: Number(row.districts),
      mayor: { name: row.mayor_name ?? "Pak Wali Kota Beruang", species: "bear" },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not read city overview." }, { status: 503 });
  }
}
