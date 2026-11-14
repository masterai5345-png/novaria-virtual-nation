import { NextResponse } from "next/server";
import { databaseConfigured, query } from "@/lib/db";
import type { QueryResultRow } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HomeRow = QueryResultRow & {
  id: string;
  house_type: string;
  design_key: string;
  house_status: string;
  position_x: string;
  position_z: string;
  rotation_y: string;
  district_slug: string;
};

export async function GET() {
  if (!databaseConfigured) {
    return NextResponse.json({
      source: "preview",
      mayor: { name: "Mayor Otti", species: "otter" },
      homes: [],
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await query<HomeRow>(
      `SELECT
         houses.id,
         houses.house_type,
         houses.design_key,
         houses.house_status,
         plots.position_x::text,
         plots.position_z::text,
         plots.rotation_y::text,
         districts.slug AS district_slug
       FROM houses
       INNER JOIN home_plots AS plots ON plots.id = houses.plot_id
       INNER JOIN districts ON districts.id = plots.district_id
       WHERE houses.house_status <> 'inactive'
       ORDER BY houses.created_at DESC
       LIMIT 160`,
    );

    return NextResponse.json({
      source: "database",
      mayor: { name: "Mayor Otti", species: "otter" },
      homes: result.rows.map((home) => ({
        id: home.id,
        type: home.house_type,
        designKey: home.design_key,
        status: home.house_status,
        x: Number(home.position_x),
        z: Number(home.position_z),
        rotation: Number(home.rotation_y),
        district: home.district_slug,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load the city world state." }, { status: 503 });
  }
}
