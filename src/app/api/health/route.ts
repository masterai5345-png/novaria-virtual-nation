import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    application: "NOVARIA",
    stage: "foundation",
    integrations: {
      authentication: "not-configured",
      database: "not-configured",
      aiAgents: "not-configured",
      monetization: "disabled",
    },
    timestamp: new Date().toISOString(),
  });
}