#!/usr/bin/env node
/**
 * Seed local demo accounts for friend testing.
 *
 * Usage:
 *   DATABASE_URL=postgresql://livestorm:livestorm_dev@127.0.0.1:5432/livestormdb \
 *     pnpm --filter @workspace/api-server exec tsx src/scripts/seed-demo-users.ts
 */

process.env.DATABASE_URL ??=
  "postgresql://livestorm:livestorm_dev@127.0.0.1:5432/livestormdb";

const { db, usersTable, streamersTable, aiPersonaConfigsTable, kingdomsTable } = await import("@workspace/db");
const { eq, or } = await import("drizzle-orm");

const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "owner@sylora.local").trim().toLowerCase();

const demos = [
  {
    clerkId: "demo_admin_clerk",
    email: OWNER_EMAIL,
    displayName: "SYLORA Admin",
    role: "owner",
    plan: "studio",
    tiktokUsername: "sylora_demo",
    makeStreamer: true,
  },
  {
    clerkId: "demo_streamer_clerk",
    email: "streamer@sylora.local",
    displayName: "Demo Streamer",
    role: "streamer",
    plan: "creator",
    tiktokUsername: "sylora_demo",
    makeStreamer: true,
  },
  {
    clerkId: "demo_friend_clerk",
    email: "friend@sylora.local",
    displayName: "Demo Friend",
    role: "user",
    plan: "free",
    tiktokUsername: null as string | null,
    makeStreamer: false,
  },
] as const;

async function upsertUser(d: (typeof demos)[number]) {
  const existing = await db.query.usersTable.findFirst({
    where: or(eq(usersTable.clerkId, d.clerkId), eq(usersTable.email, d.email)),
  });

  if (existing) {
    const [updated] = await db
      .update(usersTable)
      .set({
        clerkId: d.clerkId,
        email: d.email,
        displayName: d.displayName,
        role: d.role,
        plan: d.plan,
        tiktokUsername: d.tiktokUsername,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, existing.id))
      .returning();
    console.log(`Updated user #${updated.id} (${d.email})`);
    return updated;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId: d.clerkId,
      email: d.email,
      displayName: d.displayName,
      role: d.role,
      plan: d.plan,
      tiktokUsername: d.tiktokUsername,
    })
    .returning();
  console.log(`Created user #${created.id} (${d.email})`);
  return created;
}

async function ensureStreamer(userId: number) {
  const existing = await db.query.streamersTable.findFirst({
    where: eq(streamersTable.userId, userId),
  });
  if (existing) {
    await db.update(streamersTable).set({ isLive: false, updatedAt: new Date() }).where(eq(streamersTable.id, existing.id));
    return existing;
  }
  const [created] = await db.insert(streamersTable).values({ userId, isLive: false }).returning();
  console.log(`  → streamer #${created.id}`);
  return created;
}

async function ensurePersona(streamerId: number) {
  const existing = await db.query.aiPersonaConfigsTable.findFirst({
    where: eq(aiPersonaConfigsTable.streamerId, streamerId),
  });
  if (existing) {
    await db
      .update(aiPersonaConfigsTable)
      .set({
        autoReplyEnabled: true,
        voiceEnabled: true,
        operatingMode: "autopilot",
        updatedAt: new Date(),
      })
      .where(eq(aiPersonaConfigsTable.streamerId, streamerId));
    return;
  }
  await db.insert(aiPersonaConfigsTable).values({
    streamerId,
    personaName: "Storm",
    tone: "friendly",
    replyLanguage: "uk",
    defaultLanguage: "uk",
    autoReplyEnabled: true,
    voiceEnabled: true,
    announceGifts: true,
    operatingMode: "autopilot",
  });
  console.log(`  → AI persona seeded for streamer #${streamerId}`);
}

async function ensureKingdom(streamerId: number) {
  const existing = await db.query.kingdomsTable.findFirst({
    where: eq(kingdomsTable.streamerId, streamerId),
  });
  if (existing) return;
  await db.insert(kingdomsTable).values({
    streamerId,
    name: "Demo Kingdom",
    gold: 100,
    wood: 50,
    stone: 50,
  });
  console.log(`  → kingdom seeded for streamer #${streamerId}`);
}

async function main() {
  console.log("Using", process.env.DATABASE_URL!.replace(/:[^:@/]+@/, ":***@"));

  for (const d of demos) {
    const user = await upsertUser(d);
    if (!d.makeStreamer) continue;
    const streamer = await ensureStreamer(user.id);
    await ensurePersona(streamer.id);
    await ensureKingdom(streamer.id);
  }

  const streamerUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, "demo_streamer_clerk"),
  });
  if (streamerUser) {
    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, streamerUser.id),
    });
    console.log("\nDev login target:");
    console.log(`  streamerId=${streamer?.id} userId=${streamerUser.id}`);
    console.log(`  curl -c cookies.txt "http://localhost:8080/api/dev/login?clerkId=demo_streamer_clerk"`);
    console.log(`  Web UI (API cookie + skip Clerk gate): http://localhost:5173/dashboard?_devMode=1`);
  }

  console.log("\n✅ Demo seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
