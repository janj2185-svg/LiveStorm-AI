import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, streamersTable, kingdomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.clerkUserId = userId;
  next();
}

async function getOrCreateUser(clerkId: string, email?: string) {
  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId,
        email: email || `${clerkId}@unknown.com`,
        role: "user",
        plan: "free",
      })
      .returning();
    user = created;
  }
  return user;
}

router.get("/users/me", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      displayName: user.displayName,
      tiktokUsername: user.tiktokUsername,
      avatarUrl: user.avatarUrl,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/me", requireAuth, async (req: any, res: any) => {
  try {
    const { displayName, avatarUrl } = req.body;
    const user = await getOrCreateUser(req.clerkUserId);
    const [updated] = await db
      .update(usersTable)
      .set({
        ...(displayName !== undefined && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();
    res.json({
      id: updated.id,
      clerkId: updated.clerkId,
      email: updated.email,
      displayName: updated.displayName,
      tiktokUsername: updated.tiktokUsername,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      plan: updated.plan,
      createdAt: updated.createdAt,
    });
  } catch (err) {
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

    res.json({
      id: updated.id,
      clerkId: updated.clerkId,
      email: updated.email,
      displayName: updated.displayName,
      tiktokUsername: updated.tiktokUsername,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      plan: updated.plan,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export { requireAuth, getOrCreateUser };
export default router;
