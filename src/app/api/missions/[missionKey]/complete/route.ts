import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ missionKey: string }> },
) {
  const session = await auth();
  const citizenId = session?.user?.id;
  if (!citizenId) {
    return NextResponse.json({ error: "Sign in with Google to complete citizen missions." }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Citizen missions are unavailable until PostgreSQL is configured." }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-origin mission completion is not allowed." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const { missionKey } = await context.params;
  if (!/^[a-z0-9-]{3,80}$/.test(missionKey)) {
    return NextResponse.json({ error: "Invalid mission key." }, { status: 400 });
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

    const mission = await client.query<QueryResultRow & {
      id: string;
      mission_key: string;
      title: string;
      reward_nvc: number;
    }>(
      `SELECT id, mission_key, title, reward_nvc
       FROM mission_definitions
       WHERE mission_key = $1 AND enabled = TRUE
       LIMIT 1
       FOR SHARE`,
      [missionKey],
    );
    const definition = mission.rows[0];
    if (!definition) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Mission not found or unavailable." }, { status: 404 });
    }

    const progress = await client.query(
      `INSERT INTO citizen_missions (citizen_id, mission_id, mission_status, completed_at)
       VALUES ($1, $2, 'completed', NOW())
       ON CONFLICT (citizen_id, mission_id) DO NOTHING
       RETURNING id`,
      [citizenId, definition.id],
    );
    if (!progress.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This mission has already been completed." }, { status: 409 });
    }

    await client.query(
      "INSERT INTO citizen_wallets (citizen_id, balance_nvc) VALUES ($1, 0) ON CONFLICT (citizen_id) DO NOTHING",
      [citizenId],
    );
    const wallet = await client.query<QueryResultRow & { balance_nvc: string }>(
      `UPDATE citizen_wallets
       SET balance_nvc = balance_nvc + $2, updated_at = NOW()
       WHERE citizen_id = $1
       RETURNING balance_nvc::text`,
      [citizenId, definition.reward_nvc],
    );
    const balance = Number(wallet.rows[0].balance_nvc);

    await client.query(
      `INSERT INTO wallet_ledger
        (citizen_id, idempotency_key, entry_type, amount_delta, balance_after, reference_type, reference_id, description)
       VALUES ($1, $2, 'mission_reward', $3, $4, 'mission', $5, $6)`,
      [
        citizenId,
        `mission-reward:${citizenId}:${definition.id}`,
        definition.reward_nvc,
        balance,
        definition.id,
        `Completed mission: ${definition.title}`,
      ],
    );

    await client.query(
      `INSERT INTO city_events
        (event_key, event_type, title, description, public_facts, visibility)
       VALUES ($1, 'citizen_mission_completed', $2, $3, $4::jsonb, 'public')
       ON CONFLICT (event_key) DO NOTHING`,
      [
        `citizen-mission:${citizenId}:${definition.id}`,
        "A NOVARIA citizen completed a town mission",
        "A citizen completed a founding town mission and earned non-cash NOVA Coins.",
        JSON.stringify({ missionKey, rewardNvc: definition.reward_nvc }),
      ],
    );

    await client.query(
      `INSERT INTO audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, detail)
       VALUES ('citizen', $1, 'complete_mission', 'mission', $2, 'success', $3::jsonb)`,
      [citizenId, definition.id, JSON.stringify({ rewardNvc: definition.reward_nvc, balanceNvc: balance })],
    );

    await client.query("COMMIT");
    return NextResponse.json({
      completed: true,
      missionKey,
      rewardNvc: Number(definition.reward_nvc),
      balanceNvc: balance,
      cashValue: 0,
      message: "Mission completed. NOVA Coin is a non-cash game balance.",
    });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Could not complete this mission." }, { status: 500 });
  } finally {
    client.release();
  }
}
