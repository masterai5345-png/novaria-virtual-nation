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
  await client.query("BEGIN");
  await client.query(schema);
  await client.query(seed);
  await client.query("COMMIT");
  console.log("NOVARIA schema and founding seed applied successfully.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
