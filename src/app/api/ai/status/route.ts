import { NextResponse } from "next/server";
import { databaseConfigured, query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let databaseStatus = "not-configured";
  let agentRoleCount = 0;
  if (databaseConfigured) {
    try {
      await query("SELECT 1");
      databaseStatus = "connected";
      const count = await query<{ count: string }>("SELECT COUNT(*)::text AS count FROM agent_definitions");
      agentRoleCount = Number(count.rows[0]?.count ?? 0);
    } catch {
      databaseStatus = "error";
    }
  }

  const googleConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET,
  );
  const claudeConfigured = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL);

  return NextResponse.json({
    application: "NOVARIA",
    mode: "mvp",
    database: databaseStatus,
    authentication: googleConfigured ? "credentials-configured" : "not-configured",
    orchestrator: claudeConfigured ? "claude-credentials-configured-worker-health-unverified" : "not-configured",
    seededAgentRoles: agentRoleCount,
    agents: [
      { id: "ceo-orchestrator", name: "CEO Orchestrator", status: databaseStatus === "connected" && claudeConfigured ? "ready-for-queued-jobs" : "not-configured" },
      { id: "growth-monitor", name: "Growth Monitor", status: "awaiting-social-api-permissions" },
      { id: "population-registrar", name: "Population Registrar", status: databaseStatus === "connected" ? "database-ready-integration-pending" : "not-configured" },
      { id: "house-construction", name: "House Construction", status: databaseStatus === "connected" ? "database-ready-integration-pending" : "not-configured" },
      { id: "content-producer", name: "Content Producer", status: "draft-workflow-planned-video-renderer-not-connected" },
      { id: "community-reply", name: "Community Reply", status: "awaiting-social-api-permissions" },
    ],
    liveExecutionEnabled: false,
    proposalOnlyWorker: true,
    realMoneyPayoutsEnabled: false,
    timestamp: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
