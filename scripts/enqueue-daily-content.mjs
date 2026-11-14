import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  const events = await pool.query(
    `SELECT COUNT(*)::integer AS count
     FROM city_events
     WHERE visibility = 'public'
       AND occurred_at >= NOW() - INTERVAL '7 days'
       AND NOT EXISTS (
         SELECT 1 FROM media_drafts AS used
         WHERE city_events.id = ANY(used.source_city_event_ids)
       )`,
  );
  if (Number(events.rows[0]?.count ?? 0) < 1) {
    console.log("No unused verified public city events in the last 7 days. No daily video draft was queued.");
    process.exit(0);
  }

  const day = new Date().toISOString().slice(0, 10);
  const jobKey = `daily-content:${day}`;
  const created = await pool.query(
    `INSERT INTO agent_jobs (job_key, agent_key, job_type, priority, input_payload)
     VALUES ($1, 'scriptwriter', 'daily_content', 8, $2::jsonb)
     ON CONFLICT (job_key) DO NOTHING
     RETURNING id`,
    [jobKey, JSON.stringify({ period: "last-seven-days", scheduledDate: day, requestedBy: "daily-scheduler" })],
  );

  if (created.rowCount) {
    await pool.query(
      `INSERT INTO audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, detail)
       VALUES ('system', 'daily-scheduler', 'enqueue_daily_content', 'agent_job', $1, 'success', $2::jsonb)`,
      [created.rows[0].id, JSON.stringify({ day, eventCount: events.rows[0].count })],
    );
    console.log("Queued daily content job", created.rows[0].id);
  } else {
    console.log("Daily content job already queued for", day);
  }
} finally {
  await pool.end();
}
