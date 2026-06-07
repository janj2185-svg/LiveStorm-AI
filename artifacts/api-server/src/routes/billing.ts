import { Router, type IRouter } from "express";
import { requireAuth } from "./users";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { getStripeSubscription, getStripeProductsWithPrices } from "../lib/stripeStorage";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const BASE = import.meta?.url ? "" : "";

function getBaseUrl(req: any): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return `${req.protocol}://${req.get("host")}`;
}

async function getOrCreateStripeCustomer(user: any): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.displayName ?? user.email,
    metadata: { userId: String(user.id) },
  });
  await db
    .update(usersTable)
    .set({ stripeCustomerId: customer.id })
    .where(eq(usersTable.id, user.id));
  return customer.id;
}

// GET /billing/subscription — current subscription status
router.get("/billing/subscription", requireAuth, async (req: any, res: any) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, req.clerkUserId));
    if (!user) return res.status(404).json({ error: "User not found" });

    const plan = user.plan ?? "free";

    if (!user.stripeCustomerId) {
      return res.json({ plan, subscription: null });
    }

    // Try to find active subscription in Stripe schema
    try {
      const { db: rawDb, sql } = await import("@workspace/db").then(async (m) => {
        const { sql } = await import("drizzle-orm");
        return { db: m.db, sql };
      });
      const result = await rawDb.execute(
        sql`SELECT * FROM stripe.subscriptions WHERE customer = ${user.stripeCustomerId} AND status IN ('active','trialing','past_due') ORDER BY created DESC LIMIT 1`,
      );
      const sub = result.rows[0] ?? null;
      return res.json({ plan, subscription: sub });
    } catch {
      return res.json({ plan, subscription: null });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

// GET /billing/products — list products with prices from Stripe
router.get("/billing/products", async (_req: any, res: any) => {
  try {
    const products = await getStripeProductsWithPrices();
    res.json(products);
  } catch {
    // Stripe not connected yet — return empty array
    res.json([]);
  }
});

// POST /billing/checkout — create Stripe Checkout session
router.post("/billing/checkout", requireAuth, async (req: any, res: any) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, req.clerkUserId));
    if (!user) return res.status(404).json({ error: "User not found" });

    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ error: "priceId is required" });

    const customerId = await getOrCreateStripeCustomer(user);
    const stripe = await getUncachableStripeClient();
    const baseUrl = getBaseUrl(req);
    const basePath = process.env.REPLIT_BASE_PATH ?? "";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}${basePath}/settings?tab=billing&success=1`,
      cancel_url: `${baseUrl}${basePath}/pricing?canceled=1`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to create checkout session" });
  }
});

// POST /billing/portal — create Stripe Customer Portal session
router.post("/billing/portal", requireAuth, async (req: any, res: any) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, req.clerkUserId));
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.stripeCustomerId) return res.status(400).json({ error: "No subscription found" });

    const stripe = await getUncachableStripeClient();
    const baseUrl = getBaseUrl(req);
    const basePath = process.env.REPLIT_BASE_PATH ?? "";

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}${basePath}/settings?tab=billing`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to create portal session" });
  }
});

export default router;
