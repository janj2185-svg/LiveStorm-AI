import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for auth migrations");
  }

  const sqlPath = process.env.AUTH_SCHEMA_PATH
    || path.resolve(__dirname, "../../../infrastructure/postgres/auth-schema.sql");

  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await pool.query(sql);
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'accounts', 'sessions', 'verification_token')
      ORDER BY table_name
    `);
    console.log(
      "AUTH_MIGRATE_OK",
      tables.rows.map((row) => row.table_name).join(",")
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("AUTH_MIGRATE_FAIL", error);
  process.exit(1);
});
