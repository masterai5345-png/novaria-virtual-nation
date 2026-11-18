import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordVerifiedAudienceSnapshot, type VerifiedAudienceSnapshot } from "@/lib/construction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeCompareHex(actual: string, expected: string) {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.AUDIENCE_INGEST_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "Audience ingestion is not configured." }, { status: 503 });
  }

  const timestamp = request.headers.get("x-novaria-timestamp") || "";
  const signature = request.headers.get("x-novaria-signature") || "";
  const timestampNumber = Number(timestamp);
  if (!Number.isInteger(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) {
    return NextResponse.json({ error: "Expired or invalid webhook timestamp." }, { status: 401 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 32_000) {
    return NextResponse.json({ error: "Webhook body is too large." }, { status: 413 });
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  if (!safeCompareHex(signature, expected)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const value = body as Partial<VerifiedAudienceSnapshot>;
  const platforms = new Set(["youtube", "instagram", "facebook", "tiktok"]);
  if (
    typeof value.platform !== "string" ||
    !platforms.has(value.platform) ||
    typeof value.sourceAccountId !== "string" ||
    typeof value.snapshotDate !== "string" ||
    typeof value.followerCount !== "number" ||
    typeof value.gained !== "number" ||
    typeof value.lost !== "number" ||
    typeof value.accuracyNote !== "string"
  ) {
    return NextResponse.json({ error: "Payload is missing a required audience snapshot field." }, { status: 400 });
  }

  try {
    const result = await recordVerifiedAudienceSnapshot({
      platform: value.platform as VerifiedAudienceSnapshot["platform"],
      sourceAccountId: value.sourceAccountId,
      snapshotDate: value.snapshotDate,
      followerCount: value.followerCount,
      gained: value.gained,
      lost: value.lost,
      accuracyNote: value.accuracyNote,
      sourcePayload: value.sourcePayload,
    });
    return NextResponse.json({ accepted: true, ...result }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not record audience snapshot.",
    }, { status: 400 });
  }
}
