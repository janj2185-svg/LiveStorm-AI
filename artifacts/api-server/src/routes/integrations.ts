import { Router } from "express";
import { requireAuth } from "./users";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { INTEGRATIONS } from "../integrations/registry";
import type { ConnectedIntegration } from "../integrations/types";

const router = Router();

router.get("/integrations", requireAuth, async (req: any, res) => {
  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, req.clerkUserId!),
    });

    const result: ConnectedIntegration[] = INTEGRATIONS.map((integration) => ({
      ...integration,
      connected:
        integration.id === "tiktok" ? !!user?.tiktokUsername : false,
      connectedAccount:
        integration.id === "tiktok" ? (user?.tiktokUsername ?? null) : null,
    }));

    res.json({ integrations: result });
  } catch (_err) {
    res.status(500).json({ error: "Failed to load integrations" });
  }
});

export default router;
