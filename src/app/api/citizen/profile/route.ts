import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db, query } from "@/lib/db";
import type { QueryResultRow } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const furTones = new Set(["river-brown", "warm-cocoa", "silver", "honey"]);
const outfits = new Set(["citizen-teal", "explorer", "builder", "harbor-guard"]);
const accessories = new Set(["none", "scarf", "cap", "backpack"]);

type ProfileRow = QueryResultRow & {
  id: string;
  display_name: string;
  email: string | null;
  account_role: string;
  avatar_species: string;
  avatar_style: Record<string, unknown>;
  social_handle: string | null;
  created_at: string;
};

export async function GET() {
  const session = await auth();
  const citizenId = session?.user?.id;
  if (!citizenId) return NextResponse.json({ error: "Sign in to view your citizen profile." }, { status: 401 });

  try {
    const result = await query<ProfileRow>(
      `SELECT id, display_name, email, account_role, avatar_species, avatar_style, social_handle, created_at
       FROM citizens
       WHERE id = $1 AND account_status = 'active'
       LIMIT 1`,
      [citizenId],
    );
    const profile = result.rows[0];
    if (!profile) return NextResponse.json({ error: "Active citizen profile not found." }, { status: 404 });
    return NextResponse.json({
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        role: profile.account_role,
        species: profile.avatar_species,
        avatarStyle: profile.avatar_style ?? {},
        publicHandle: profile.social_handle,
        createdAt: profile.created_at,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load the citizen profile." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  const citizenId = session?.user?.id;
  if (!citizenId) return NextResponse.json({ error: "Sign in to customize your citizen." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Citizen database is not configured." }, { status: 503 });

  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-origin profile updates are not allowed." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json." }, { status: 415 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Profile payload must be an object." }, { status: 400 });
  }

  const input = body as {
    displayName?: unknown;
    avatarStyle?: { furTone?: unknown; outfit?: unknown; accessory?: unknown };
    publicHandle?: unknown;
  };
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (displayName.length < 2 || displayName.length > 28) {
    return NextResponse.json({ error: "Display name must contain 2–28 characters." }, { status: 400 });
  }

  const style = input.avatarStyle;
  if (!style || typeof style !== "object") {
    return NextResponse.json({ error: "Choose an outfit before saving." }, { status: 400 });
  }

  const furTone = typeof style.furTone === "string" ? style.furTone : "";
  const outfit = typeof style.outfit === "string" ? style.outfit : "";
  const accessory = typeof style.accessory === "string" ? style.accessory : "";
  if (!furTones.has(furTone) || !outfits.has(outfit) || !accessories.has(accessory)) {
    return NextResponse.json({ error: "One or more avatar options are invalid." }, { status: 400 });
  }

  const publicHandleProvided = typeof input.publicHandle === "string";
  const publicHandle = publicHandleProvided
    ? input.publicHandle.trim().replace(/^@/, "").toLowerCase()
    : null;
  if (
    publicHandleProvided &&
    publicHandle !== "" &&
    (publicHandle.length > 30 || !/^[a-z0-9._]+$/.test(publicHandle))
  ) {
    return NextResponse.json({ error: "Instagram username must use 1–30 letters, numbers, dots or underscores." }, { status: 400 });
  }

  try {
    const updated = await query<ProfileRow>(
      `UPDATE citizens
       SET display_name = $2,
           avatar_style = $3::jsonb,
           social_handle = CASE WHEN $4::boolean THEN NULLIF($5, '') ELSE social_handle END,
           updated_at = NOW()
       WHERE id = $1 AND account_status = 'active'
       RETURNING id, display_name, email, account_role, avatar_species, avatar_style, social_handle, created_at`,
      [citizenId, displayName, JSON.stringify({ furTone, outfit, accessory }), publicHandleProvided, publicHandle ?? ""],
    );
    const profile = updated.rows[0];
    if (!profile) return NextResponse.json({ error: "Active citizen profile not found." }, { status: 404 });

    await query(
      `INSERT INTO audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, detail)
       VALUES ('citizen', $1, 'customize_animal_mascot', 'citizen', $1, 'success', $2::jsonb)`,
      [citizenId, JSON.stringify({ furTone, outfit, accessory, ...(publicHandleProvided ? { publicHandle: publicHandle || null } : {}) })],
    );

    return NextResponse.json({
      saved: true,
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        species: profile.avatar_species,
        avatarStyle: profile.avatar_style,
        publicHandle: profile.social_handle,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "That Instagram username is already linked to another NOVARIA citizen." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save your avatar. Please try again." }, { status: 503 });
  }
}
