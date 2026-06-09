import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, moderationRulesTable, streamersTable } from "@workspace/db";
import { requireAuth, getOrCreateUser } from "./users";

const router = Router();

const DEFAULT_RULES: { ruleKey: string; isActive: boolean }[] = [
  { ruleKey: "hate_speech", isActive: true },
  { ruleKey: "spam",        isActive: true },
  { ruleKey: "profanity",   isActive: false },
  { ruleKey: "self_promo",  isActive: true },
];

async function getStreamer(clerkUserId: string) {
  const user = await getOrCreateUser(clerkUserId);
  return db.query.streamersTable.findFirst({
    where: eq(streamersTable.userId, user.id),
  });
}

async function seedRulesForStreamer(streamerId: number): Promise<void> {
  const existing = await db
    .select({ ruleKey: moderationRulesTable.ruleKey })
    .from(moderationRulesTable)
    .where(eq(moderationRulesTable.streamerId, streamerId));

  const existingKeys = new Set(existing.map((r) => r.ruleKey));
  const toInsert = DEFAULT_RULES.filter((r) => !existingKeys.has(r.ruleKey));

  if (toInsert.length > 0) {
    await db.insert(moderationRulesTable).values(
      toInsert.map((r) => ({ streamerId, ruleKey: r.ruleKey, isActive: r.isActive }))
    );
  }
}

router.get("/moderation/rules", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer not found" });

    await seedRulesForStreamer(streamer.id);

    const rules = await db
      .select()
      .from(moderationRulesTable)
      .where(eq(moderationRulesTable.streamerId, streamer.id));

    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: "Failed to get moderation rules" });
  }
});

router.put("/moderation/rules/:id", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer not found" });

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid rule id" });

    const { isActive } = req.body;
    if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive must be a boolean" });

    const [updated] = await db
      .update(moderationRulesTable)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(moderationRulesTable.id, id), eq(moderationRulesTable.streamerId, streamer.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Rule not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update moderation rule" });
  }
});

export default router;
