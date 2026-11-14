import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/authz";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await requireOwner();
  if (!owner.ok) return NextResponse.json({ error: owner.reason }, { status: owner.status });

  const result = await query(
    `SELECT
       approvals.id,
       approvals.action_type,
       approvals.approval_status,
       approvals.action_payload,
       approvals.created_at,
       jobs.job_status,
       jobs.result_payload,
       drafts.title AS draft_title,
       drafts.script AS draft_script,
       drafts.description AS draft_description
     FROM approval_requests AS approvals
     LEFT JOIN agent_jobs AS jobs ON jobs.id = approvals.job_id
     LEFT JOIN media_drafts AS drafts
       ON drafts.id::text = approvals.action_payload->>'draftId'
     WHERE approvals.approval_status = 'pending'
     ORDER BY approvals.created_at DESC
     LIMIT 50`,
  );
  return NextResponse.json({ approvals: result.rows }, { headers: { "Cache-Control": "no-store" } });
}
