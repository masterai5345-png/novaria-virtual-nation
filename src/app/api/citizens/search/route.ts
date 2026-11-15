import { NextRequest, NextResponse } from "next/server";
import { databaseConfigured, query } from "@/lib/db";
import type { QueryResultRow } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResidentRow = QueryResultRow & {
  id: string;
  display_name: string;
  social_handle: string;
  avatar_species: string;
  avatar_style: Record<string, unknown> | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  if (!databaseConfigured) {
    return NextResponse.json({
      source: "preview",
      residents: [],
      message: "Resident search becomes available after the city database is connected.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const handle = (request.nextUrl.searchParams.get("handle") ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  const random = request.nextUrl.searchParams.get("random") === "1";

  if (!random && (handle.length < 2 || handle.length > 30 || !/^[a-z0-9._]+$/.test(handle))) {
    return NextResponse.json({ error: "Enter a valid Instagram username (2–30 characters)." }, { status: 400 });
  }

  try {
    const result = random
      ? await query<ResidentRow>(
          `SELECT id, display_name, social_handle, avatar_species, avatar_style, created_at
           FROM citizens
           WHERE account_status = 'active'
             AND social_handle IS NOT NULL
             AND social_handle <> ''
           ORDER BY RANDOM()
           LIMIT 1`,
        )
      : await query<ResidentRow>(
          `SELECT id, display_name, social_handle, avatar_species, avatar_style, created_at
           FROM citizens
           WHERE account_status = 'active'
             AND social_handle IS NOT NULL
             AND social_handle <> ''
             AND LOWER(social_handle) LIKE $1
           ORDER BY CASE WHEN LOWER(social_handle) = $2 THEN 0 ELSE 1 END,
                    display_name ASC
           LIMIT 8`,
          [`%${handle}%`, handle],
        );

    return NextResponse.json({
      source: "database",
      residents: result.rows.map((resident) => ({
        id: `handle:${resident.social_handle.toLowerCase()}`,
        displayName: resident.display_name,
        publicHandle: resident.social_handle,
        species: resident.avatar_species,
        avatarStyle: resident.avatar_style ?? {},
        joinedAt: resident.created_at,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Resident search is temporarily unavailable." }, { status: 503 });
  }
}
