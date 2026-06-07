import { Router } from "express";
import { db, automationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "./users";

const router = Router();

router.get("/automations", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const automations = await db
      .select()
      .from(automationsTable)
      .where(eq(automationsTable.userId, user.id));
    res.json(automations);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/automations", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const { name, eventType, conditionOperator, conditionValue, actionType, actionPayload } = req.body;

    if (!name || !eventType || !actionType) {
      return res.status(400).json({ error: "name, eventType, and actionType are required" });
    }

    const [automation] = await db
      .insert(automationsTable)
      .values({
        userId: user.id,
        name,
        eventType,
        conditionOperator: conditionOperator ?? "gte",
        conditionValue: String(conditionValue ?? "1"),
        actionType,
        actionPayload: actionPayload ?? "",
        isEnabled: true,
      })
      .returning();

    res.json(automation);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/automations/:id", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const { name, eventType, conditionOperator, conditionValue, actionType, actionPayload, isEnabled } = req.body;

    const [updated] = await db
      .update(automationsTable)
      .set({
        ...(name !== undefined && { name }),
        ...(eventType !== undefined && { eventType }),
        ...(conditionOperator !== undefined && { conditionOperator }),
        ...(conditionValue !== undefined && { conditionValue: String(conditionValue) }),
        ...(actionType !== undefined && { actionType }),
        ...(actionPayload !== undefined && { actionPayload }),
        ...(isEnabled !== undefined && { isEnabled }),
        updatedAt: new Date(),
      })
      .where(and(eq(automationsTable.id, id), eq(automationsTable.userId, user.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/automations/:id", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    await db
      .delete(automationsTable)
      .where(and(eq(automationsTable.id, id), eq(automationsTable.userId, user.id)));

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
