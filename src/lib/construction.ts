import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export type VerifiedAudienceSnapshot = {
  platform: "youtube" | "instagram" | "facebook" | "tiktok";
  sourceAccountId: string;
  snapshotDate: string;
  followerCount: number;
  gained: number;
  lost: number;
  accuracyNote: string;
  sourcePayload?: Record<string, unknown>;
};

export async function recordVerifiedAudienceSnapshot(input: VerifiedAudienceSnapshot) {
  if (!db) throw new Error("DATABASE_URL is not configured.");
  if (!input.sourceAccountId.trim()) throw new Error("A verified source account ID is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.snapshotDate)) throw new Error("snapshotDate must use YYYY-MM-DD.");
  for (const [key, value] of Object.entries({
    followerCount: input.followerCount,
    gained: input.gained,
    lost: input.lost,
  })) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${key} must be a non-negative safe integer.`);
    }
  }

  const netChange = input.gained - input.lost;
  const homesRequested = Math.max(0, netChange);
  if (homesRequested > 5000) {
    throw new Error("A single snapshot cannot trigger more than 5,000 homes. Split and review the source event.");
  }

  const idempotencyKey = createHash("sha256")
    .update(`${input.platform}| ${input.sourceAccountId}| ${input.snapshotDate}`)
    .digest("hex");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const snapshot = await client.query(
      `INSERT INTO follower_snapshots
        (platform, source_account_id, snapshot_date, follower_count, gained, lost, net_change, accuracy_note, source_payload)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (platform, source_account_id, snapshot_date) DO NOTHING
       RETURNING id`,
      [
        input.platform,
        input.sourceAccountId,
        input.snapshotDate,
        input.followerCount,
        input.gained,
        input.lost,
        netChange,
        input.accuracyNote.slice(0, 500),
        JSON.stringify(input.sourcePayload ?? {}),
      ],
    );

    if (!snapshot.rowCount) {
      const existing = await client.query(
        `SELECT id FROM construction_events
         WHERE idempotency_key = $1 LIMIT 1`,
        [idempotencyKey],
      );
      await client.query("COMMIT");
      return {
        duplicate: true,
        snapshotDate: input.snapshotDate,
        constructionEventId: existing.rows[0]?.id ?? null,
        housesCreated: 0,
      };
    }

    const event = await client.query(
      `INSERT INTO construction_events
        (idempotency_key, platform, source_account_id, period_start, period_end,
         follower_delta, houses_requested, event_status, details)
       VALUES ($1, $2, $3, $4::date, $4::date, $5, $5, 'pending', $6::jsonb)
       RETURNING id`,
      [
        idempotencyKey,
        input.platform,
        input.sourceAccountId,
        input.snapshotDate,
        homesRequested,
        JSON.stringify({ gained: input.gained, lost: input.lost, netChange, accuracyNote: input.accuracyNote }),
      ],
    );
    const eventId = event.rows[0].id;
    let housesCreated = 0;

    if (homesRequested > 0) {
      // Serialize plot allocation so overlapping concurrent snapshots cannot reuse coordinates.
      await client.query("SELECT pg_advisory_xact_lock(hashtext('novaria-home-plot-allocation'))");
      const district = await client.query(
        "SELECT id FROM districts WHERE slug = 'harbor-view' LIMIT 1",
      );
      if (!district.rowCount) throw new Error("Harbor View district is missing. Run the database seed.");

      const plotCountResult = await client.query(
        "SELECT COUNT(*)::integer AS count FROM home_plots WHERE district_id = $1",
        [district.rows[0].id],
      );
      const offset = Number(plotCountResult.rows[0].count);

      const plots = await client.query(
        `INSERT INTO home_plots
          (district_id, plot_key, position_x, position_z, rotation_y, plot_status)
         SELECT
           $1,
           'audience:' || $2 || ':' || series.n::text,
           ((($3 + series.n - 1) % 20) * 3.8 - 36.1)::numeric(10,3),
           (floor(($3 + series.n - 1) / 20.0) * 3.6 - 20.0)::numeric(10,3),
           0,
           'built'
         FROM generate_series(1, $4::integer) AS series(n)
         RETURNING id, plot_key`,
        [district.rows[0].id, eventId, offset, homesRequested],
      );

      await client.query(
        `INSERT INTO houses (plot_id, house_type, design_key, house_status, visual_config)
         SELECT
           plot.id,
           CASE WHEN row_number() OVER (ORDER BY plot.plot_key)::integer % 5 = 0 THEN 'family' ELSE 'starter' END,
           CASE WHEN row_number() OVER (ORDER BY plot.plot_key)::integer % 5 = 0 THEN 'modern-family-01' ELSE 'modern-starter-01' END,
           'community',
           jsonb_build_object('source', 'verified-audience-growth', 'constructionEventId', $1)
         FROM unnest($2::uuid[]) AS plot(id)`,
        [eventId, plots.rows.map((row) => row.id)],
      );
      housesCreated = plots.rowCount ?? 0;
    }

    await client.query(
      `UPDATE construction_events
       SET houses_created = $2,
           event_status = 'completed',
           completed_at = NOW()
       WHERE id = $1`,
      [eventId, housesCreated],
    );
    await client.query(
      `INSERT INTO city_events
        (event_key, event_type, title, description, source_construction_event_id, public_facts, visibility)
       VALUES ($1, 'community_growth', $2, $3, $4, $5::jsonb, 'public')`,
      [
        `audience-growth:${idempotencyKey}`,
        homesCreated > 0 ? `NOVARIA builds ${housesCreated.toLocaleString("en-US")} new community homes` : "NOVARIA completes its daily community growth check",
        homesCreated > 0
          ? `A verified audience-growth snapshot created ${housesCreated} community homes in Harbor View.`
          : `The verified net audience change was ${netChange}; no new homes were required.`,
        eventId,
        JSON.stringify({
          platform: input.platform,
          snapshotDate: input.snapshotDate,
          gained: input.gained,
          lost: input.lost,
          netChange,
          housesCreated,
        }),
      ],
    );

    await client.query(
      `INSERT INTO audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, detail)
       VALUES ('system', $1, 'record_verified_audience_snapshot', 'construction_event', $2, 'success', $3::jsonb)`,
      [
        `${input.platform}:${input.sourceAccountId}`,
        eventId,
        JSON.stringify({ snapshotDate: input.snapshotDate, netChange, housesCreated }),
      ],
    );

    await client.query("COMMIT");
    return { duplicate: false, constructionEventId: eventId, netChange, housesCreated };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
