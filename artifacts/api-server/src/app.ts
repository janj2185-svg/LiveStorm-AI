import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { rateLimit } from "./middlewares/rateLimit";
import { WebhookHandlers } from "./lib/webhookHandlers";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Register Stripe webhook BEFORE express.json() — it needs raw Buffer body
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: any, res: any) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) return res.status(400).json({ error: "Missing stripe-signature" });
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Global API rate limit (per IP). Expensive AI routes get a tighter limit below.
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    max: Number(process.env.API_RATE_LIMIT_PER_MIN ?? 300),
    keyPrefix: "api",
  }),
);
app.use(
  ["/api/ai", "/api/mic", "/api/sessions/start"],
  rateLimit({
    windowMs: 60_000,
    max: Number(process.env.AI_RATE_LIMIT_PER_MIN ?? 60),
    keyPrefix: "ai",
  }),
);

// Healthcheck — no auth required, must respond before /api/router (which needs Clerk)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", router);

export default app;
