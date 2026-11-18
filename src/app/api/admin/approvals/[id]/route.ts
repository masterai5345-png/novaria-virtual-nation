import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/authz";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const owner = await requireOwner();
  if (!owner.ok) return NextResponse.json({ error: owner.reason }, { status: owner.status });
  if (!db) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });

  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-origin approval is not allowed." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json." }, { status: 415 });
  }

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid approval ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const decision = typeof body === "object" && body !== null && "decision" in body
    ? (body as { decision?: unknown }).decision
    : undefined;
  const note = typeof body === "object" && body !== null && "note" in body
    ? (body as { note?: unknown }).note
    : "";
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "Decision must be approved or rejected." }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const approval = await client.query(
      `SELECT id, job_id, action_type, approval_status, action_payload
       FROM approval_requests WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const row = approval.rows[0];
    if (!row || row.approval_status !== "pending") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Approval not found or already reviewed." }, { status: 409 });
    }

    await client.query(
      `UPDATE approval_requests
       SET approval_status = $2, reviewed_by = $3, review_note = $4, reviewed_at = NOW()
       WHERE id = $1`,
      [id, decision, owner.email, typeof note === "string" ? note.slice(0, 1000) : ""],
    );

    if (row.action_type === "review_media_draft") {
      const draftId = row.action_payload?.draftId;
      if (typeof draftId === "string") {
        await client.query(
          "UPDATE media_drafts SET draft_status = $2 WHERE id = $1 AND draft_status = 'awaiting_approval'",
          [draftId, decision === "approved" ? "approved" : "rejected"],
        );
      }
    }

    if (row.action_type === "review_comment_reply") {
      const commentId = row.action_payload?.commentId;
      if (typeof commentId === "string") {
        await client.query(
          `UPDATE social_comment_inbox
           SET reply_status = $2,
               moderation_status = CASE WHEN $2 = 'approved' THEN 'safe' ELSE 'flagged' END,
               reviewed_at = NOW()
           WHERE id = $1 AND reply_status = 'awaiting_approval'`,
          [commentId, decision === "approved" ? "approved" : "rejected"],
        );
      }
    }

    if (row.job_id) {
      await client.query(
        `UPDATE agent_jobs
         SET job_status = $2
         WHERE id = $1 AND job_status = 'awaiting_approval'`,
        [row.job_id, decision === "approved" ? "completed" : "cancelled"],
      );
    }

    await client.query(
      `INSERT INTO audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, detail)
       VALUES ('owner', $1, $2, 'approval_request', $3, 'success', $4::jsonb)`,
      [owner.citizenId, decision === "approved" ? "approve_agent_proposal" : "reject_agent_proposal", id, JSON.stringify({ actionType: row.action_type })],
    );

    await client.query("COMMIT");
    return NextResponse.json({ id, decision });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Could not record the approval decision." }, { status: 500 });
  } finally {
    client.release();
  }
}
