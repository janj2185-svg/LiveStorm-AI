import { createServer } from "http";
import app from "./app";
import { initSocketServer } from "./lib/socketServer";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripeClient";

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

// Initialize Stripe (non-fatal — gracefully skips if not connected)
await initStripe();

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
