import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireOwner } from "@/lib/authz";
import { db, query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await requireOwner();
  if (!owner.ok) return NextResponse.json({ error: owner.reason }, { status: owner.status });

  const result = await query(
    `SELECT id, job_status, input_payload, result_payload, last_error, created_at
     FROM agent_jobs
     WHERE job_type = 'owner_command'
     ORDER BY created_at DESC
     LIMIT 30`,
  );
  return NextResponse.json({ jobs: result.rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const owner = await requireOwner();
  if (!owner.ok) return NextResponse.json({ error: owner.reason }, { status: owner.status });
  if (!db) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });

  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-origin command submission is not allowed." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const command = typeof body === "object" && body !== null && "command" in body
    ? (body as { command?: unknown }).command
    : undefined;
  if (typeof command !== "string" || command.trim().length < 8 || command.trim().length > 2000) {
    return NextResponse.json({ error: "Command must contain 8–2,000 characters." }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const recent = await client.query(
      `SELECT COUNT(*)::integer AS count
       FROM agent_jobs
       WHERE job_type = 'owner_command'
         AND input_payload->>'requestedBy' = $1
         AND created_at > NOW() - INTERVAL '10 minutes'`,
      [owner.email],
    );
    if (Number(recent.rows[0]?.count ?? 0) >= 10) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Command rate limit reached. Please wait a few minutes." }, { status: 429 });
    }

    const exists = await client.query(
      "SELECT agent_key FROM agent_definitions WHERE agent_key = 'ceo-orchestrator' LIMIT 1",
    );
    if (!exists.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Agent definitions are not seeded. Run the database migration and seed first." }, { status: 503 });
    }

    const id = randomUUID();
    const jobKey = `owner-command:${id}`;
    const result = await client.query(
      `INSERT INTO agent_jobs (job_key, agent_key, job_type, priority, input_payload)
       VALUES ($1, 'ceo-orchestrator', 'owner_command', 10, $2::jsonb)
       RETURNING id, job_status, created_at`,
      [jobKey, JSON.stringify({ command: command.trim(), requestedBy: owner.email })],
    );

    await client.query(
      `INSERT INTO audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, detail)
       VALUES ('owner', $1, 'queue_owner_command', 'agent_job', $2, 'success', $3::jsonb)`,
      [owner.citizenId, result.rows[0].id, JSON.stringify({ commandLength: command.trim().length })],
    );
    await client.query("COMMIT");
    return NextResponse.json({ job: result.rows[0] }, { status: 202 });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Could not queue the command." }, { status: 500 });
  } finally {
    client.release();
  }
}
