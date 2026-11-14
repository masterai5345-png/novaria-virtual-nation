import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { auth } from "@/auth";
import { databaseConfigured, query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const previewMissions = [
  { missionKey: "welcome-to-novaria", title: "Welcome to NOVARIA", detail: "Explore the town square and meet Mayor Otti.", rewardNvc: 120, completed: false },
  { missionKey: "visit-the-harbor", title: "Visit the Harbor", detail: "Explore the waterfront district and discover the harbor.", rewardNvc: 180, completed: false },
  { missionKey: "help-the-town", title: "Help the Town", detail: "Visit City Hall and review the latest town proposal.", rewardNvc: 250, completed: false },
];

type MissionRow = QueryResultRow & {
  mission_key: string;
  title: string;
  detail: string;
  reward_nvc: number;
  completed: boolean;
};

export async function GET() {
  const session = await auth();
  if (!databaseConfigured) {
    return NextResponse.json({
      source: "preview",
      authenticated: Boolean(session?.user?.id),
      missions: previewMissions,
      wallet: null,
      note: "Connect PostgreSQL to save mission progress and NOVA Coin.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const citizenId = session?.user?.id || null;
    const missionRows = await query<MissionRow>(
      `SELECT
         definitions.mission_key,
         definitions.title,
         definitions.detail,
         definitions.reward_nvc,
         COALESCE(progress.mission_status = 'completed', FALSE) AS completed
       FROM mission_definitions AS definitions
       LEFT JOIN citizen_missions AS progress
         ON progress.mission_id = definitions.id
        AND progress.citizen_id = $1::uuid
       WHERE definitions.enabled = TRUE
       ORDER BY definitions.created_at ASC`,
      [citizenId],
    );

    let walletBalance: number | null = null;
    if (citizenId) {
      const wallet = await query<QueryResultRow & { balance_nvc: string }>(
        "SELECT balance_nvc::text FROM citizen_wallets WHERE citizen_id = $1 LIMIT 1",
        [citizenId],
      );
      walletBalance = Number(wallet.rows[0]?.balance_nvc ?? 0);
    }

    return NextResponse.json({
      source: "database",
      authenticated: Boolean(citizenId),
      missions: missionRows.rows.map((row) => ({
        missionKey: row.mission_key,
        title: row.title,
        detail: row.detail,
        rewardNvc: Number(row.reward_nvc),
        completed: row.completed,
        status: row.completed ? "Completed" : "Available",
      })),
      wallet: walletBalance === null ? null : { balanceNvc: walletBalance, cashValue: 0 },
      note: "NOVA Coin is a non-cash game balance.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load NOVARIA missions." }, { status: 503 });
  }
}
