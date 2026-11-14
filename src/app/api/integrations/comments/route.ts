import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeCompareHex(actual: string, expected: string) {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function classifyComment(text: string): "safe" | "escalated" | "flagged" {
  if (/https?:\/\/|www\./i.test(text)) return "flagged";
  if (/withdraw|payment|bank|password|email|phone|address|refund|cash reward|earn money|payout|billing|scam|fraud/i.test(text)) {
    return "escalated";
  }
  return "safe";
}

export async function POST(request: NextRequest) {
  const secret = process.env.SOCIAL_INGEST_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "Social comment ingestion is not configured." }, { status: 503 });
  }
  if (!db) return NextResponse.json({ error: "NOVARIA database is not configured." }, { status: 503 });

  const timestamp = request.headers.get("x-novaria-timestamp") || "";
  const signature = request.headers.get("x-novaria-signature") || "";
  const timestampNumber = Number(timestamp);
  if (!Number.isInteger(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) {
    return NextResponse.json({ error: "Expired or invalid webhook timestamp." }, { status: 401 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 24_000) {
    return NextResponse.json({ error: "Webhook body is too large." }, { status: 413 });
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  if (!safeCompareHex(signature, expected)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let body: unknown;
  try { body = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Comment payload must be an object." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const platforms = new Set(["youtube", "instagram", "facebook", "tiktok"]);
  const platform = typeof input.platform === "string" ? input.platform : "";
  const sourceAccountId = typeof input.sourceAccountId === "string" ? input.sourceAccountId.trim() : "";
  const externalCommentId = typeof input.externalCommentId === "string" ? input.externalCommentId.trim() : "";
  const authorName = typeof input.authorDisplayName === "string" ? input.authorDisplayName.trim() : "Community member";
  const commentText = typeof input.commentText === "string" ? input.commentText.trim() : "";

  if (!platforms.has(platform) || !sourceAccountId || sourceAccountId.length > 200 ||
      !externalCommentId || externalCommentId.length > 300 ||
      !commentText || commentText.length > 5000) {
    return NextResponse.json({ error: "Invalid platform, source account, comment ID, or comment text." }, { status: 400 });
  }

  const classification = classifyComment(commentText);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO social_comment_inbox
        (platform, source_account_id, external_comment_id, author_display_name,
         comment_text, classification, moderation_status, reply_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'not_drafted')
       ON CONFLICT (platform, source_account_id, external_comment_id) DO NOTHING
       RETURNING id`,
      [
        platform,
        sourceAccountId,
        externalCommentId,
        authorName.slice(0, 80) || "Community member",
        commentText,
        classification,
        classification === "safe" ? "pending" : classification,
      ],
    );

    if (!inserted.rowCount) {
      await client.query("COMMIT");
      return NextResponse.json({ accepted: true, duplicate: true }, { status: 200 });
    }

    const commentId = inserted.rows[0].id;
    if (classification === "safe") {
      await client.query(
        `INSERT INTO agent_jobs (job_key, agent_key, job_type, priority, input_payload)
         VALUES ($1, 'community-reply', 'comment_reply', 6, $2::jsonb)
         ON CONFLICT (job_key) DO NOTHING`,
        [
          `comment-reply:${platform}:${sourceAccountId}:${externalCommentId}`,
          JSON.stringify({ commentId, platform, sourceAccountId }),
        ],
      );
    } else {
      await client.query(
        `INSERT INTO audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, detail)
         VALUES ('system', 'social-comment-ingest', 'escalate_social_comment', 'social_comment', $1, 'pending', $2::jsonb)`,
        [commentId, JSON.stringify({ classification, platform })],
      );
    }
    await client.query("COMMIT");

    return NextResponse.json({
      accepted: true,
      duplicate: false,
      classification,
      queuedForDraft: classification === "safe",
      note: classification === "escalated"
        ? "This comment needs human handling and will not receive an automated reply draft."
        : classification === "flagged"
          ? "This comment was flagged for moderation."
          : "A reply draft will be prepared for owner review; it is not published automatically.",
    }, { status: 201 });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Could not store the social comment." }, { status: 500 });
  } finally {
    client.release();
  }
}
