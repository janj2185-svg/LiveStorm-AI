import { getUncachableStripeClient } from "../lib/stripeClient";

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    description: "AI Voice, full XP, achievements, lucky drops, fan profiles, leaderboards, 10 automations, OBS sources.",
    monthlyAmount: 999,
    yearlyAmount: 799,
    metadata: { plan: "pro" },
  },
  {
    id: "creator",
    name: "Creator",
    description: "AI Translator (20 languages), advanced analytics, multiple TikTok accounts, unlimited automations, custom themes.",
    monthlyAmount: 1999,
    yearlyAmount: 1599,
    metadata: { plan: "creator" },
  },
  {
    id: "studio",
    name: "Studio",
    description: "3D AI Host (early access), voice clone, team accounts, API access, dedicated support.",
    monthlyAmount: 3999,
    yearlyAmount: 3199,
    metadata: { plan: "studio" },
  },
];

async function seedProducts() {
  console.log("🚀 Seeding LiveStorm AI Stripe products...");

  let stripe: any;
  try {
    stripe = await getUncachableStripeClient();
  } catch (err: any) {
    console.error("❌ Failed to connect to Stripe. Is the Stripe integration connected in Replit?");
    console.error(err.message);
    process.exit(1);
  }

  for (const plan of PLANS) {
    console.log(`\n📦 Processing plan: ${plan.name}`);

    const existing = await stripe.products.search({
      query: `metadata['plan']:'${plan.id}'`,
    });

    let product: any;
    if (existing.data.length > 0) {
      product = existing.data[0];
      console.log(`  ✅ Product already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: `LiveStorm AI ${plan.name}`,
        description: plan.description,
        metadata: plan.metadata,
      });
      console.log(`  ✅ Created product: ${product.id}`);
    }

    const prices = await stripe.prices.list({ product: product.id, active: true });
    const hasMonthly = prices.data.some((p: any) => p.recurring?.interval === "month");
    const hasYearly = prices.data.some((p: any) => p.recurring?.interval === "year");

    if (!hasMonthly) {
      const monthly = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyAmount,
        currency: "eur",
        recurring: { interval: "month" },
        metadata: { plan: plan.id, billing: "monthly" },
      });
      console.log(`  💶 Monthly price: ${monthly.id} (€${plan.monthlyAmount / 100}/mo)`);
    } else {
      console.log(`  ℹ️  Monthly price already exists`);
    }

    if (!hasYearly) {
      const yearly = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.yearlyAmount * 12,
        currency: "eur",
        recurring: { interval: "year" },
        metadata: { plan: plan.id, billing: "yearly" },
      });
      console.log(`  💶 Yearly price: ${yearly.id} (€${(plan.yearlyAmount * 12) / 100}/yr)`);
    } else {
      console.log(`  ℹ️  Yearly price already exists`);
    }
  }

  console.log("\n✨ Done! Products seeded. Webhooks will sync them to the local database.");
  console.log("\nTo verify in Stripe Dashboard: https://dashboard.stripe.com/test/products");
}

seedProducts().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
