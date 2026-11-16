import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { QueryResultRow } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Epoch = QueryResultRow & { id: string; nama: string; status: string };
type Build = QueryResultRow & {
  id: string; result_day: string; action_key: string; grid_x: number; grid_z: number;
};
type Result = QueryResultRow & {
  vote_day: string; winning_option: string; winning_votes: number; total_votes: number;
};

const noCache = { "Cache-Control": "no-store" };
export async function GET() {
  // The empty world is a separate version. Never fall back to founding houses
  // from the existing production city.
  try {
    const exists = await query<QueryResultRow & { schema_exists: boolean }>(
      "SELECT to_regclass('public.village_epochs') IS NOT NULL AND to_regclass('public.village_objects') IS NOT NULL AND to_regclass('public.village_vote_results') IS NOT NULL AS schema_exists"
    );
    if (!exists.rows[0]?.schema_exists) {
      return NextResponse.json({
        status: "belum-diaktifkan", title: "Desa Nol", day: 0, plots: [], results: [],
        note: "Database desa baru belum dimigrasikan. Jangan gunakan data demo sebagai dunia publik.",
      }, { headers: noCache });
    }
    const epoch = await query<Epoch>(
      "SELECT id, nama, status FROM village_epochs WHERE slug = 'desa-nol' LIMIT 1"
    );
    if (!epoch.rows[0]) {
      return NextResponse.json({
        status: "belum-diaktifkan", title: "Desa Nol", day: 0, plots: [], results: [],
        note: "Desa Nol belum diresmikan oleh Kepala Desa.",
      }, { headers: noCache });
    }
    const id = epoch.rows[0].id;
    const [builds, results] = await Promise.all([
      query<Build>(
        "SELECT id::text, result_day::text, action_key, grid_x, grid_z FROM village_objects WHERE epoch_id=$1 ORDER BY result_day ASC, created_at ASC LIMIT 500",
        [id]
      ),
      query<Result>(
        "SELECT vote_day::text, winning_option, winning_votes, total_votes FROM village_vote_results WHERE epoch_id=$1 ORDER BY vote_day DESC LIMIT 30",
        [id]
      ),
    ]);
    return NextResponse.json({
      status: epoch.rows[0].status,
      title: epoch.rows[0].nama,
      day: builds.rows.length,
      plots: builds.rows.map(b => ({ id: b.id, action: b.action_key, x: Number(b.grid_x), z: Number(b.grid_z), day: b.result_day })),
      results: results.rows,
      note: "Data pembangunan asli yang tersimpan di database NOVARIA, bukan localStorage.",
    }, { headers: noCache });
  } catch {
    return NextResponse.json({
      status: "tidak-tersedia", title: "Desa Nol", day: null, plots: null, results: null,
      note: "Sistem belum dapat membaca data desa. Jangan menampilkan angka palsu.",
    }, { status: 503, headers: noCache });
  }
}
