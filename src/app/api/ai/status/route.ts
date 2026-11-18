import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/authz";
import { databaseConfigured, query } from "@/lib/db";
import type { QueryResultRow } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await requireOwner();
  if (!owner.ok) return NextResponse.json({ error: owner.reason }, { status: owner.status });

  let databaseStatus: "not-configured" | "connected" | "error" = "not-configured";
  let agentRoleCount = 0;
  let workerStatus: "not-configured" | "online" | "stale" | "stopped" | "error" = "not-configured";
  let workerLastSeen: string | null = null;
  let workerDetails: Record<string, unknown> = {};

  if (databaseConfigured) {
    try {
      await query("SELECT 1");
      databaseStatus = "connected";
      const count = await query<{ count: string } & QueryResultRow>(
        "SELECT COUNT(*)::text AS count FROM agent_definitions",
      );
      agentRoleCount = Number(count.rows[0]?.count ?? 0);

      const heartbeat = await query<{
        worker_status: string;
        last_seen_at: string;
        details: Record<string, unknown>;
      } & QueryResultRow>(
        "SELECT worker_status, last_seen_at, details FROM worker_heartbeats WHERE worker_key = 'novaria-agent-worker' LIMIT 1",
      );
      const row = heartbeat.rows[0];
      if (row) {
        workerLastSeen = row.last_seen_at;
        workerDetails = row.details ?? {};
        const ageMs = Date.now() - new Date(row.last_seen_at).getTime();
        if (row.worker_status === "running" && ageMs < 45_000) workerStatus = "online";
        else if (row.worker_status === "running") workerStatus = "stale";
        else if (row.worker_status === "error") workerStatus = "error";
        else workerStatus = "stopped";
      }
    } catch {
      databaseStatus = "error";
    }
  }

  const googleConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET,
  );
  const orchestratorStatus = databaseStatus !== "connected"
    ? "database-unavailable"
    : workerStatus === "online" ? "code-worker-online" : "code-worker-not-running";


  return NextResponse.json({
    application: "NOVARIA",
    mode: "mvp",
    database: databaseStatus,
    authentication: googleConfigured ? "credentials-configured" : "not-configured",
    orchestrator: orchestratorStatus,
    worker: {
      status: workerStatus,
      lastSeenAt: workerLastSeen,
      details: workerDetails,
    },
    seededAgentRoles: agentRoleCount,
    agents: [
      { id: "ceo-orchestrator", name: "Rule-based Task Coordinator", status: orchestratorStatus },
      { id: "growth-monitor", name: "Growth Monitor", status: "awaiting-official-social-api-connector" },
      { id: "population-registrar", name: "Population Registrar", status: databaseStatus === "connected" ? "database-ready-connector-pending" : "not-configured" },
      { id: "house-construction", name: "House Construction", status: databaseStatus === "connected" ? "construction-service-ready-connector-pending" : "not-configured" },
      { id: "content-producer", name: "Code Video Producer", status: "scheduled-native-ffmpeg-and-owner-approval" },
      { id: "community-reply", name: "Code Community Reply", status: "rule-based-drafts-awaiting-approval" },
    ],
    proposalOnlyWorker: true,
    routineAgentMode: "code-only",
    externalGenerativeAIRequired: false,
    realMoneyPayoutsEnabled: false,
    timestamp: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
