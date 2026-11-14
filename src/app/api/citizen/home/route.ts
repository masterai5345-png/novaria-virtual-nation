import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db, query } from "@/lib/db";
import type { QueryResultRow } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HomeRow = QueryResultRow & {
  id: string;
  house_type: string;
  design_key: string;
  house_status: string;
  plot_key: string;
  district_name: string;
};

export async function GET() {
  const session = await auth();
  const citizenId = session?.user?.id;
  if (!citizenId) return NextResponse.json({ error: "Sign in to view your home." }, { status: 401 });
  if (!db) return NextResponse.json({ configured: false, home: null, availableHomes: null });

  try {
    const [claimed, available] = await Promise.all([
      query<HomeRow>(
        `SELECT houses.id, houses.house_type, houses.design_key, houses.house_status,
                plots.plot_key, districts.name AS district_name
         FROM houses
         INNER JOIN home_plots AS plots ON plots.id = houses.plot_id
         INNER JOIN districts ON districts.id = plots.district_id
         WHERE houses.owner_citizen_id = $1 AND houses.house_status = 'claimed'
         LIMIT 1`,
        [citizenId],
      ),
      query<{ count: string } & QueryResultRow>(
        "SELECT COUNT(*)::text AS count FROM houses WHERE owner_citizen_id IS NULL AND house_status = 'community'",
      ),
    ]);

    const row = claimed.rows[0];
    return NextResponse.json({
      configured: true,
      home: row ? {
        id: row.id,
        type: row.house_type,
        designKey: row.design_key,
        status: row.house_status,
        plotKey: row.plot_key,
        district: row.district_name,
      } : null,
      availableHomes: Number(available.rows[0]?.count ?? 0),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load your home information." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const citizenId = session?.user?.id;
  if (!citizenId) return NextResponse.json({ error: "Sign in to claim a home." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Citizen database is not configured." }, { status: 503 });

  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-origin home claims are not allowed." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const citizen = await client.query(
      "SELECT id FROM citizens WHERE id = $1 AND account_status = 'active' FOR UPDATE",
      [citizenId],
    );
    if (!citizen.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Active citizen account not found." }, { status: 403 });
    }

    const existing = await client.query<HomeRow>(
      `SELECT houses.id, houses.house_type, houses.design_key, houses.house_status,
              plots.plot_key, districts.name AS district_name
       FROM houses
       INNER JOIN home_plots AS plots ON plots.id = houses.plot_id
       INNER JOIN districts ON districts.id = plots.district_id
       WHERE houses.owner_citizen_id = $1 AND houses.house_status = 'claimed'
       LIMIT 1`,
      [citizenId],
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      const home = existing.rows[0];
      return NextResponse.json({
        claimed: true,
        alreadyClaimed: true,
        home: { id: home.id, type: home.house_type, designKey: home.design_key, plotKey: home.plot_key, district: home.district_name },
      });
    }

    const candidate = await client.query<HomeRow>(
      `SELECT houses.id, houses.house_type, houses.design_key, houses.house_status,
              plots.plot_key, districts.name AS district_name
       FROM houses
       INNER JOIN home_plots AS plots ON plots.id = houses.plot_id
       INNER JOIN districts ON districts.id = plots.district_id
       WHERE houses.owner_citizen_id IS NULL AND houses.house_status = 'community'
       ORDER BY houses.created_at ASC, houses.id ASC
       LIMIT 1
       FOR UPDATE OF houses SKIP LOCKED`,
    );
    const home = candidate.rows[0];
    if (!home) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "No community homes are available yet. Check back after the next town expansion." }, { status: 409 });
    }

    await client.query(
      `UPDATE houses
       SET owner_citizen_id = $2, house_status = 'claimed', updated_at = NOW()
       WHERE id = $1`,
      [home.id, citizenId],
    );
    await client.query(
      `INSERT INTO audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, detail)
       VALUES ('citizen', $1, 'claim_community_home', 'house', $2, 'success', $3::jsonb)`,
      [citizenId, home.id, JSON.stringify({ plotKey: home.plot_key, houseType: home.house_type })],
    );
    await client.query("COMMIT");

    return NextResponse.json({
      claimed: true,
      alreadyClaimed: false,
      home: { id: home.id, type: home.house_type, designKey: home.design_key, plotKey: home.plot_key, district: home.district_name },
    }, { status: 201 });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Could not claim a home. Please try again." }, { status: 500 });
  } finally {
    client.release();
  }
}
