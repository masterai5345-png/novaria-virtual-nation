import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  const seed = await readFile(new URL("../db/seed.sql", import.meta.url), "utf8");
  await pool.query("BEGIN");
  await pool.query(schema);
  await pool.query(seed);
  await pool.query("COMMIT");
  console.log("NOVARIA schema and founding seed applied successfully.");
} catch (error) {
  await pool.query("ROLLBACK").catch(() => {});
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
