import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function getStripeCustomerByUserId(stripeCustomerId: string) {
  const result = await db.execute(
    sql`SELECT * FROM stripe.customers WHERE id = ${stripeCustomerId} LIMIT 1`,
  );
  return result.rows[0] ?? null;
}

export async function getStripeSubscription(subscriptionId: string) {
  const result = await db.execute(
    sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId} LIMIT 1`,
  );
  return result.rows[0] ?? null;
}

export async function listAllStripeSubscriptions(limit = 100, offset = 0) {
  const result = await db.execute(
    sql`SELECT s.*, c.email as customer_email
        FROM stripe.subscriptions s
        LEFT JOIN stripe.customers c ON c.id = s.customer
        ORDER BY s.created DESC
        LIMIT ${limit} OFFSET ${offset}`,
  );
  return result.rows;
}

export async function getStripeProductsWithPrices() {
  const result = await db.execute(
    sql`SELECT p.id as product_id, p.name as product_name, p.description, p.metadata,
               pr.id as price_id, pr.unit_amount, pr.currency, pr.recurring, pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC`,
  );
  // Group prices by product
  const map = new Map<string, any>();
  for (const row of result.rows) {
    if (!map.has(row.product_id as string)) {
      map.set(row.product_id as string, {
        id: row.product_id,
        name: row.product_name,
        description: row.description,
        metadata: row.metadata,
        prices: [],
      });
    }
    if (row.price_id) {
      map.get(row.product_id as string).prices.push({
        id: row.price_id,
        unitAmount: row.unit_amount,
        currency: row.currency,
        recurring: row.recurring,
      });
    }
  }
  return Array.from(map.values());
}

export async function getMRR(): Promise<number> {
  try {
    const result = await db.execute(
      sql`SELECT COALESCE(SUM(
            CASE
              WHEN p.recurring->>'interval' = 'year' THEN p.unit_amount / 12
              ELSE p.unit_amount
            END
          ), 0) as mrr
          FROM stripe.subscriptions s
          JOIN stripe.prices p ON p.id = s.items->0->>'price'
          WHERE s.status = 'active'`,
    );
    return Number(result.rows[0]?.mrr ?? 0) / 100;
  } catch {
    return 0;
  }
}

export async function getActiveSubscriptionCount(): Promise<number> {
  try {
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM stripe.subscriptions WHERE status = 'active'`,
    );
    return Number(result.rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}
