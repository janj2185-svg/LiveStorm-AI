import { Pool } from "pg";

declare global {
  var __syloraPgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__syloraPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // Avoid hard-fail during `next build` when env is not injected yet.
      // Runtime requests always provide DATABASE_URL via Compose.
      global.__syloraPgPool = new Pool({
        connectionString: "postgresql://127.0.0.1:5432/sylora",
        max: 1,
        idleTimeoutMillis: 1_000,
        connectionTimeoutMillis: 1_000,
      });
    } else {
      global.__syloraPgPool = new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      });
    }
  }
  return global.__syloraPgPool;
}
