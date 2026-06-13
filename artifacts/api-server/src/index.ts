import { createServer } from "http";
import app from "./app";
import { initSocketServer, getIO } from "./lib/socketServer";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripeClient";
import { recoverActiveSessions, cleanupStaleSessions } from "./lib/tiktokConnector";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe init");
    return;
  }
  try {
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");
    const stripeSync = await getStripeSync();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (domain) {
      await stripeSync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
      logger.info("Stripe webhook configured");
    }
    // Backfill in background — don't block server startup
    stripeSync.syncBackfill().catch((err) => logger.error({ err }, "Stripe backfill error"));
  } catch (err: any) {
    logger.warn({ msg: err?.message }, "Stripe init skipped — connect Stripe integration to enable billing");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
initSocketServer(httpServer);

// Listen FIRST so the port opens immediately and healthchecks pass from the
// first probe. All async initialisation (Stripe migrations, TikTok session
// recovery) runs in the background after the port is open.
httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");

  // Schema migrations (non-fatal — add new columns if not present)
  db.execute(sql`
    ALTER TABLE ai_persona_configs ADD COLUMN IF NOT EXISTS intensity_mode TEXT NOT NULL DEFAULT 'streamer';
  `).catch((err) => logger.warn({ msg: String(err?.message) }, "Schema migration skipped"));

  // YouTube OAuth columns
  db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_access_token  TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_refresh_token TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_channel_id    TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_channel_name  TEXT;
  `).catch((err) => logger.warn({ msg: String(err?.message) }, "YouTube column migration skipped"));

  // Stripe (non-fatal — gracefully skips if not connected)
  initStripe().catch((err) =>
    logger.warn({ msg: err?.message }, "Stripe init error"),
  );

  // Clean up stale sessions (>24 h old) before recovering.
  cleanupStaleSessions().catch((err) =>
    logger.error({ err }, "Stale session cleanup failed"),
  );

  // Reconnect TikTok for any sessions that were live before this restart.
  // Must run after listen() so Socket.IO is fully initialised and getIO() returns the instance.
  const io = getIO();
  if (io) {
    recoverActiveSessions(io).catch((err) =>
      logger.error({ err }, "TikTok session recovery failed"),
    );
  }
});
