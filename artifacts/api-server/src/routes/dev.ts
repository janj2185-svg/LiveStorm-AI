import { Router } from "express";
import { ingestLiveEvent } from "../lib/socketServer";
import { db, usersTable, streamersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

if (process.env.NODE_ENV !== "production") {
  router.post("/dev/inject-event", async (req: any, res: any) => {
    try {
      const { sessionId, userId, type, username, text, giftName, coins, likeCount } = req.body;
      if (!sessionId || !userId || !type) {
        return res.status(400).json({ error: "sessionId, userId, type required" });
      }
      const validTypes = ["comment", "gift", "like", "follow", "share", "viewerCount"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
      }

      let data: Record<string, unknown> = {};
      if (type === "comment") data = { text: text ?? "test comment" };
      else if (type === "gift") data = { giftName: giftName ?? "Rose", coins: coins ?? 1, count: 1 };
      else if (type === "like") data = { likeCount: likeCount ?? 1 };
      else if (type === "viewerCount") data = { count: likeCount ?? 10 };

      await ingestLiveEvent({
        type,
        sessionId: Number(sessionId),
        username: username ?? "test_user",
        data,
        timestamp: Date.now(),
      }, Number(userId));

      res.json({ ok: true, type, sessionId: Number(sessionId), username: username ?? "test_user", data });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get("/dev/login", async (_req: any, res: any) => {
    try {
      const streamer = await db.query.streamersTable.findFirst({
        where: eq(streamersTable.id, 4),
      });
      if (!streamer) return res.status(404).json({ error: "Dev streamer not found" });

      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, streamer.userId),
      });
      if (!user) return res.status(404).json({ error: "Dev user not found" });

      const cookieOpts = {
        httpOnly: true,
        sameSite: "lax" as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      };
      res.cookie("dev_auth_clerk_id", user.clerkId, cookieOpts);
      res.json({ ok: true, streamerId: streamer.id, userId: user.id });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get("/dev/logout", (_req: any, res: any) => {
    res.clearCookie("dev_auth_clerk_id", { path: "/" });
    res.json({ ok: true });
  });
}

export default router;
