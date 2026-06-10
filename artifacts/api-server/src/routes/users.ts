import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable, streamersTable, kingdomsTable, platformEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { OWNER_EMAIL } from "../middlewares/featureGate";

const router = Router();

const VALID_UI_LANGUAGES = [
  "en", "uk", "pl", "de", "fr", "es", "it", "pt",
  "nl", "tr", "ar", "hi", "ja", "ko", "zh", "zh-TW",
  "id", "vi", "th", "ru",
] as const;

function requireAuth(req: any, res: any, next: any) {
  if (process.env.NODE_ENV !== "production" && req.cookies?.dev_auth_clerk_id) {
    req.clerkUserId = req.cookies.dev_auth_clerk_id;
    return next();
  }
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.clerkUserId = userId;
  next();
}

async function fetchClerkEmail(clerkId: string): Promise<string | null> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    return clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses?.[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}

async function getOrCreateUser(clerkId: string, hintEmail?: string) {
  // Step 1: look up by Clerk ID (fast path — covers every subsequent login)
  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (user) {
    // Self-heal: ensure owner is always owner
    const isOwnerNow = user.email === OWNER_EMAIL;
    if (isOwnerNow && (user.role !== "owner" || user.plan !== "studio")) {
      const [upgraded] = await db
        .update(usersTable)
        .set({ role: "owner", plan: "studio", updatedAt: new Date() })
        .where(eq(usersTable.clerkId, clerkId))
        .returning();
      user = upgraded;
      await db.insert(platformEventsTable).values({
        userId: user.id,
        eventType: "owner_access_granted",
        description: `Owner account re-confirmed — role set to owner, plan set to studio.`,
        metadata: JSON.stringify({ role: "owner", plan: "studio", bypass: true }),
      }).catch(() => {});
    }
    return user;
  }

  // Step 2: clerkId not found — resolve real email (hint or Clerk API)
  const resolvedEmail = hintEmail ?? await fetchClerkEmail(clerkId) ?? `${clerkId}@unknown.com`;
  const isOwnerAccount = resolvedEmail === OWNER_EMAIL;

  // Step 3: email-based fallback (handles placeholder → real Clerk ID migration)
  const [existingByEmail] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, resolvedEmail));

  if (existingByEmail) {
    // Migrate: update placeholder clerkId to the real one, re-promote if owner
    const updates: Record<string, unknown> = { clerkId, updatedAt: new Date() };
    if (isOwnerAccount) {
      updates.role = "owner";
      updates.plan = "studio";
    }
    const [migrated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.email, resolvedEmail))
      .returning();
    user = migrated;

    if (isOwnerAccount) {
      await db.insert(platformEventsTable).values({
        userId: user.id,
        eventType: "owner_access_granted",
        description: `Owner account linked to real Clerk ID — placeholder replaced, permanent bypass active.`,
        metadata: JSON.stringify({ role: "owner", plan: "studio", bypass: true, migrated: true }),
      }).catch(() => {});
    }
    return user;
  }

  // Step 4: truly new user — insert fresh row
  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId,
      email: resolvedEmail,
      role: isOwnerAccount ? "owner" : "user",
      plan: isOwnerAccount ? "studio" : "free",
    })
    .returning();
  user = created;

  if (isOwnerAccount) {
    await db.insert(platformEventsTable).values({
      userId: created.id,
      eventType: "owner_access_granted",
      description: `Owner account created — permanent bypass of all plan restrictions granted.`,
      metadata: JSON.stringify({ role: "owner", plan: "studio", bypass: true }),
    }).catch(() => {});
  }

  return user;
}

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    displayName: user.displayName,
    tiktokUsername: user.tiktokUsername,
    avatarUrl: user.avatarUrl,
    role: user.role,
    plan: user.plan,
    isOwner: user.role === "owner",
    uiLanguage: user.uiLanguage ?? "en",
    createdAt: user.createdAt,
  };
}

router.get("/users/me", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    res.json(serializeUser(user));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/me", requireAuth, async (req: any, res: any) => {
  try {
    const { displayName, avatarUrl, uiLanguage } = req.body;
    const user = await getOrCreateUser(req.clerkUserId);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (displayName !== undefined) updates.displayName = displayName;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (uiLanguage !== undefined && VALID_UI_LANGUAGES.includes(uiLanguage)) {
      updates.uiLanguage = uiLanguage;
    }

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, user.id))
      .returning();
    res.json(serializeUser(updated));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/me/tiktok", requireAuth, async (req: any, res: any) => {
  try {
    const { tiktokUsername } = req.body;
    if (!tiktokUsername) {
      return res.status(400).json({ error: "tiktokUsername is required" });
    }
    const user = await getOrCreateUser(req.clerkUserId);

    const [updated] = await db
      .update(usersTable)
      .set({ tiktokUsername, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();

    let streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, updated.id),
    });
    if (!streamer) {
      const [newStreamer] = await db
        .insert(streamersTable)
        .values({ userId: updated.id })
        .returning();
      streamer = newStreamer;

      let kingdom = await db.query.kingdomsTable.findFirst({
        where: eq(kingdomsTable.streamerId, newStreamer.id),
      });
      if (!kingdom) {
        await db.insert(kingdomsTable).values({
          streamerId: newStreamer.id,
          name: `${tiktokUsername}'s Kingdom`,
        });
      }
    }

    res.json(serializeUser(updated));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export { requireAuth, getOrCreateUser };
export default router;
