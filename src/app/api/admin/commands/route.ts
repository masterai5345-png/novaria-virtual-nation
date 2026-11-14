import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireOwner } from "@/lib/authz";
import { query } from "@/lib/db";

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

  const exists = await query(
    "SELECT agent_key FROM agent_definitions WHERE agent_key = 'ceo-orchestrator' LIMIT 1",
  );
  if (!exists.rowCount) {
    return NextResponse.json({ error: "Agent definitions are not seeded. Run the database migration and seed first." }, { status: 503 });
  }

  const id = randomUUID();
  const jobKey = `owner-command:${id}`;
  const result = await query(
    `INSERT INTO agent_jobs (job_key, agent_key, job_type, priority, input_payload)
     VALUES ($1, 'ceo-orchestrator', 'owner_command', 10, $2::jsonb)
     RETURNING id, job_status, created_at`,
    [jobKey, JSON.stringify({ command: command.trim(), requestedBy: owner.email })],
  );

  await query(
    `INSERT INTO audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, detail)
     VALUES ('owner', $1, 'queue_owner_command', 'agent_job', $2, 'success', $3::jsonb)`,
    [owner.citizenId, result.rows[0].id, JSON.stringify({ commandLength: command.trim().length })],
  );

  return NextResponse.json({ job: result.rows[0] }, { status: 202 });
}
