/**
 * Gifts API — received TikTok/YouTube gift feed + reference catalog.
 *
 * Honest scope:
 * - Lists gifts ingested from live platforms (in-memory recent events + session totals)
 * - Provides a reference catalog of common TikTok gift tiers for UI/preview
 * - Does NOT implement a purchasable wallet, gift store commerce, or AAA 3D assets
 *   (see docs/GIFT_AAA_PIPELINE.md). Fake purchase success is intentionally absent.
 */
import { Router } from "express";
import { db, sessionsTable, streamersTable, usersTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireAuth } from "./users";
import { getRecentEvents } from "../lib/socketServer";

const router = Router();

/** Reference catalog — emoji/CSS preview only. Not purchasable platform gifts. */
export const GIFT_REFERENCE_CATALOG = [
  { id: "rose", name: "Rose", coins: 1, tier: "micro", emoji: "🌹", category: "classic", animation: "css-float" },
  { id: "tiktok", name: "TikTok", coins: 1, tier: "micro", emoji: "🎵", category: "classic", animation: "css-float" },
  { id: "finger_heart", name: "Finger Heart", coins: 5, tier: "micro", emoji: "🤟", category: "classic", animation: "css-pulse" },
  { id: "ice_cream_cone", name: "Ice Cream Cone", coins: 5, tier: "micro", emoji: "🍦", category: "food", animation: "css-float" },
  { id: "gg", name: "GG", coins: 10, tier: "standard", emoji: "✌️", category: "classic", animation: "css-burst" },
  { id: "perfume", name: "Perfume", coins: 20, tier: "standard", emoji: "🧴", category: "luxury", animation: "css-sparkle" },
  { id: "doughnut", name: "Doughnut", coins: 30, tier: "standard", emoji: "🍩", category: "food", animation: "css-bounce" },
  { id: "corgi", name: "Corgi", coins: 299, tier: "big", emoji: "🐕", category: "animals", animation: "css-burst" },
  { id: "money_gun", name: "Money Gun", coins: 500, tier: "big", emoji: "💵", category: "luxury", animation: "css-rain" },
  { id: "swan", name: "Swan", coins: 699, tier: "big", emoji: "🦢", category: "animals", animation: "css-sparkle" },
  { id: "lion", name: "Lion", coins: 2999, tier: "whale", emoji: "🦁", category: "animals", animation: "css-epic" },
  { id: "drama_queen", name: "Drama Queen", coins: 5000, tier: "whale", emoji: "👑", category: "luxury", animation: "css-epic" },
  { id: "universe", name: "Universe", coins: 34999, tier: "legendary", emoji: "🌌", category: "legendary", animation: "css-epic" },
] as const;

async function resolveStreamer(clerkId: string) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) return null;
  const streamer = await db.query.streamersTable.findFirst({
    where: eq(streamersTable.userId, user.id),
  });
  return streamer ? { user, streamer } : null;
}

// GET /gifts/catalog — reference tiers for UI (not a commerce store)
router.get("/gifts/catalog", requireAuth, (_req, res) => {
  res.json({
    catalog: GIFT_REFERENCE_CATALOG,
    commerceEnabled: false,
    walletEnabled: false,
    aaaAssetsAvailable: false,
    note:
      "This is a reference catalog for TikTok gift recognition and CSS overlay previews. " +
      "Purchasable animated gift store / wallet / AAA 3D assets are not implemented. " +
      "See docs/GIFT_AAA_PIPELINE.md.",
  });
});

// GET /gifts/received — recent gift events for the active (or latest) session
router.get("/gifts/received", requireAuth, async (req: any, res: any) => {
  try {
    const resolved = await resolveStreamer(req.clerkUserId);
    if (!resolved) return res.status(404).json({ error: "Streamer not found" });
    const { streamer } = resolved;

    const activeSession = await db.query.sessionsTable.findFirst({
      where: and(eq(sessionsTable.streamerId, streamer.id), isNull(sessionsTable.endedAt)),
      orderBy: [desc(sessionsTable.startedAt)],
    });

    const latestSession =
      activeSession ??
      (await db.query.sessionsTable.findFirst({
        where: eq(sessionsTable.streamerId, streamer.id),
        orderBy: [desc(sessionsTable.startedAt)],
      }));

    const sessionId = latestSession?.id;
    const recent = sessionId
      ? getRecentEvents(sessionId).filter((e) => e.type === "gift" && e.data.repeatEnd !== false)
      : [];

    const gifts = recent
      .map((e) => ({
        username: e.username ?? "Viewer",
        giftName: (e.data.giftName as string) ?? "Gift",
        coins: (e.data.coins as number) ?? 0,
        count: (e.data.count as number) ?? 1,
        timestamp: e.timestamp,
        platform: e.platform ?? "tiktok",
      }))
      .reverse();

    res.json({
      sessionId: sessionId ?? null,
      sessionActive: !!activeSession,
      totalGiftsReceived: streamer.totalGiftsReceived ?? 0,
      sessionGiftCoins: latestSession?.totalGifts ?? 0,
      gifts,
      commerceEnabled: false,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to load gifts" });
  }
});

// GET /gifts/status — honest capability matrix for the gifts module
router.get("/gifts/status", requireAuth, (_req, res) => {
  res.json({
    modules: {
      tiktokGiftIngest: true,
      youtubeSuperChatAsGift: true,
      obsGiftAlerts: true,
      avatarGiftReaction: true,
      gamificationFromGifts: true,
      giftReferenceCatalog: true,
      receivedGiftFeed: true,
      giftStorePurchase: false,
      platformWallet: false,
      aaa3dAnimations: false,
      particleShaders: false,
      giftSoundPack: false,
    },
    approvalRequired: [
      "AAA gift art pipeline (Blender / Unreal / Houdini or studio)",
      "Platform wallet + payment provider (Stripe Connect or similar)",
      "Legal review for selling virtual goods",
    ],
  });
});

export default router;
