import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const hasClaudeKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasDatabase = Boolean(process.env.DATABASE_URL);

  return NextResponse.json({
    application: "NOVARIA",
    mode: "foundation-preview",
    orchestrator: hasClaudeKey ? "credentials-present-runtime-not-implemented" : "not-configured",
    database: hasDatabase ? "credentials-present-schema-not-connected" : "not-configured",
    agents: [
      { id: "growth-monitor", name: "Growth Monitor", status: "not-configured" },
      { id: "population-registrar", name: "Population Registrar", status: "planned" },
      { id: "house-construction", name: "House Construction", status: "planned" },
      { id: "content-producer", name: "Content Producer", status: "planned" },
      { id: "community-reply", name: "Community Reply", status: "planned" },
    ],
    liveExecutionEnabled: false,
    realMoneyPayoutsEnabled: false,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}