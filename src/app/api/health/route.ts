import { NextResponse } from "next/server";
import { databaseConfigured, query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database: "not-configured" | "ok" | "error" = "not-configured";
  if (databaseConfigured) {
    try {
      await query("SELECT 1");
      database = "ok";
    } catch {
      database = "error";
    }
  }

  const googleAuth =
    Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
      ? "configured"
      : "not-configured";

  const aiWorker =
    Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL && database === "ok")
      ? "credentials-configured-worker-must-be-checked-separately"
      : "not-configured";

  const health = {
    status: database === "error" ? "degraded" : "ok",
    application: "NOVARIA",
    stage: "mvp-setup",
    integrations: {
      authentication: googleAuth,
      database,
      aiAgents: aiWorker,
      monetization: "disabled",
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(health, {
    status: database === "error" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
