import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  const seed = await readFile(new URL("../db/seed.sql", import.meta.url), "utf8");
  const villageSchema = await readFile(new URL("../db/village-zero-schema.sql", import.meta.url), "utf8");
  const chatSchema = await readFile(new URL("../db/village-chat.sql", import.meta.url), "utf8");
  const presenceSchema = await readFile(new URL("../db/village-presence.sql", import.meta.url), "utf8");
  const videoSchema = await readFile(new URL("../db/video-assets.sql", import.meta.url), "utf8");
  await client.query("BEGIN");
  await client.query(schema);
  await client.query(seed);
  // Only additive schema: preserves all old houses and citizens.
  await client.query(villageSchema);
  await client.query(chatSchema);
  await client.query(presenceSchema);
  await client.query(videoSchema);
  await client.query("INSERT INTO village_epochs (slug,nama,status,started_at) VALUES ('desa-nol','Desa Nol NOVARIA','berjalan',NOW()) ON CONFLICT (slug) DO NOTHING");
  await client.query("COMMIT");
  console.log("NOVARIA founding schema and separate Desa Nol schema applied successfully.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
