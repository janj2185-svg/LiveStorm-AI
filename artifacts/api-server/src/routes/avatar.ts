import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, avatarConfigsTable, avatarAnimationPresetsTable, streamersTable } from "@workspace/db";
import { requireAuth, getOrCreateUser } from "./users";

const router = Router();

// ─── Built-in avatars (static, not DB-stored) ─────────────────────────────────

export const BUILT_IN_AVATARS = [
  {
    key: "ivan-host",
    name: "Ivan Host",
    tagline: "Primary Host · Professional",
    description: "Confident and authoritative bald male presenter. Best for product launches, professional hosting and high-stakes streams.",
    style: "Realistic",
    accentColor: "#2563eb",
    personalities: ["serious", "professional", "motivator"],
    isPrimary: true,
  },
  {
    key: "marcus",
    name: "Marcus",
    tagline: "TV Host · Professional",
    description: "Polished and charismatic male presenter. Best for news-style content, product reviews and brand stories.",
    style: "Realistic",
    accentColor: "#3b82f6",
    personalities: ["professional", "friendly", "serious"],
    isPrimary: false,
  },
  {
    key: "aria",
    name: "Aria",
    tagline: "Presenter · Professional",
    description: "Elegant and trustworthy female presenter. Best for interviews, brand stories and professional lifestyle content.",
    style: "Realistic",
    accentColor: "#8b5cf6",
    personalities: ["friendly", "professional", "motivator"],
    isPrimary: false,
  },
  {
    key: "sofia",
    name: "Sofia",
    tagline: "Streamer · Content Creator",
    description: "Creative and community-driven female streamer. Best for gaming streams, lifestyle vlogs and interactive shows.",
    style: "Realistic",
    accentColor: "#ec4899",
    personalities: ["funny", "friendly", "hype"],
    isPrimary: false,
  },
];

// ─── Default animation preset seeds ───────────────────────────────────────────

const DEFAULT_PRESETS = [
  { name: "Breathing Idle",      category: "idle",     description: "Subtle chest rise and head sway",           glbUrl: "/assets/animations/idle_breathing.glb",       durationMs: 4000, isLoop: true,  isDefault: true  },
  { name: "Standing Relaxed",    category: "idle",     description: "Natural weight shift",                      glbUrl: "/assets/animations/idle_standing.glb",        durationMs: 6000, isLoop: true,  isDefault: false },
  { name: "Looking Around",      category: "idle",     description: "Curious head movement",                     glbUrl: "/assets/animations/idle_lookAround.glb",      durationMs: 8000, isLoop: true,  isDefault: false },
  { name: "Normal Speaking",     category: "talking",  description: "Moderate head and hand gestures",           glbUrl: "/assets/animations/talking_normal.glb",       durationMs: 3000, isLoop: true,  isDefault: true  },
  { name: "Excited Speaking",    category: "talking",  description: "Energetic gestures, leaning forward",       glbUrl: "/assets/animations/talking_excited.glb",      durationMs: 3000, isLoop: true,  isDefault: false },
  { name: "Happy Wave",          category: "reaction", description: "Friendly wave with a smile",                glbUrl: "/assets/animations/happy_wave.glb",           durationMs: 1500, isLoop: false, isDefault: true  },
  { name: "Excited Jump",        category: "emotion",  description: "Jump and fist pump",                        glbUrl: "/assets/animations/excited_jump.glb",         durationMs: 2000, isLoop: false, isDefault: true  },
  { name: "Gift Reaction Small", category: "reaction", description: "Happy surprise for small gifts",            glbUrl: "/assets/animations/gift_reaction_small.glb",  durationMs: 1800, isLoop: false, isDefault: true  },
  { name: "Gift Reaction Big",   category: "reaction", description: "Dramatic bow for large gifts",              glbUrl: "/assets/animations/gift_reaction_big.glb",    durationMs: 2500, isLoop: false, isDefault: false },
  { name: "Follow Reaction",     category: "reaction", description: "Point at camera and nod",                   glbUrl: "/assets/animations/follow_reaction.glb",      durationMs: 1500, isLoop: false, isDefault: true  },
  { name: "Victory Pose",        category: "victory",  description: "Arms raised, full celebration",             glbUrl: "/assets/animations/victory_pose.glb",         durationMs: 4000, isLoop: false, isDefault: true  },
  { name: "Boss Spawn Awe",      category: "reaction", description: "Look up in shock at boss appearance",       glbUrl: "/assets/animations/boss_spawn_awe.glb",       durationMs: 2000, isLoop: false, isDefault: true  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getStreamer(clerkUserId: string) {
  const user = await getOrCreateUser(clerkUserId);
  return db.query.streamersTable.findFirst({
    where: eq(streamersTable.userId, user.id),
  });
}

async function getOrCreateAvatarConfig(streamerId: number) {
  let config = await db.query.avatarConfigsTable.findFirst({
    where: eq(avatarConfigsTable.streamerId, streamerId),
  });
  if (!config) {
    [config] = await db
      .insert(avatarConfigsTable)
      .values({ streamerId })
      .returning();
  }
  return config!;
}

async function seedPresetsIfEmpty() {
  const existing = await db.select({ id: avatarAnimationPresetsTable.id }).from(avatarAnimationPresetsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(avatarAnimationPresetsTable).values(DEFAULT_PRESETS);
  }
}

// ─── GET /api/avatar/config ───────────────────────────────────────────────────

router.get("/avatar/config", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });
    const config = await getOrCreateAvatarConfig(streamer.id);
    res.json({ ...config, builtInAvatars: BUILT_IN_AVATARS });
  } catch {
    res.status(500).json({ error: "Failed to get avatar config" });
  }
});

// ─── PUT /api/avatar/config ───────────────────────────────────────────────────

router.put("/avatar/config", requireAuth, async (req: any, res: any) => {
  try {
    const streamer = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const {
      avatarEnabled, avatarKey, avatarUrl, avatarThumbnailUrl, renderer,
      positionX, positionY, positionZ, rotationY, scale,
      backgroundType, backgroundValue, lightingPreset, shadowEnabled,
      lipSyncEnabled, lipSyncSensitivity, expressionIntensity,
      blinkEnabled, blinkIntervalMs,
      obsWidth, obsHeight, obsShowSpeechBubble, obsShowNameTag,
    } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (avatarEnabled !== undefined) updates.avatarEnabled = Boolean(avatarEnabled);
    if (avatarKey !== undefined) updates.avatarKey = String(avatarKey);
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (avatarThumbnailUrl !== undefined) updates.avatarThumbnailUrl = avatarThumbnailUrl;
    if (renderer !== undefined) updates.renderer = String(renderer);
    if (positionX !== undefined) updates.positionX = Number(positionX);
    if (positionY !== undefined) updates.positionY = Number(positionY);
    if (positionZ !== undefined) updates.positionZ = Number(positionZ);
    if (rotationY !== undefined) updates.rotationY = Number(rotationY);
    if (scale !== undefined) updates.scale = Math.max(0.1, Math.min(3.0, Number(scale)));
    if (backgroundType !== undefined) updates.backgroundType = String(backgroundType);
    if (backgroundValue !== undefined) updates.backgroundValue = backgroundValue;
    if (lightingPreset !== undefined) updates.lightingPreset = String(lightingPreset);
    if (shadowEnabled !== undefined) updates.shadowEnabled = Boolean(shadowEnabled);
    if (lipSyncEnabled !== undefined) updates.lipSyncEnabled = Boolean(lipSyncEnabled);
    if (lipSyncSensitivity !== undefined) updates.lipSyncSensitivity = Number(lipSyncSensitivity);
    if (expressionIntensity !== undefined) updates.expressionIntensity = Number(expressionIntensity);
    if (blinkEnabled !== undefined) updates.blinkEnabled = Boolean(blinkEnabled);
    if (blinkIntervalMs !== undefined) updates.blinkIntervalMs = Number(blinkIntervalMs);
    if (obsWidth !== undefined) updates.obsWidth = Number(obsWidth);
    if (obsHeight !== undefined) updates.obsHeight = Number(obsHeight);
    if (obsShowSpeechBubble !== undefined) updates.obsShowSpeechBubble = Boolean(obsShowSpeechBubble);
    if (obsShowNameTag !== undefined) updates.obsShowNameTag = Boolean(obsShowNameTag);

    const existing = await db.query.avatarConfigsTable.findFirst({
      where: eq(avatarConfigsTable.streamerId, streamer.id),
    });

    let result;
    if (existing) {
      [result] = await db
        .update(avatarConfigsTable)
        .set(updates)
        .where(eq(avatarConfigsTable.streamerId, streamer.id))
        .returning();
    } else {
      [result] = await db
        .insert(avatarConfigsTable)
        .values({ streamerId: streamer.id, ...updates })
        .returning();
    }

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to update avatar config" });
  }
});

// ─── GET /api/avatar/presets ──────────────────────────────────────────────────

router.get("/avatar/presets", requireAuth, async (req: any, res: any) => {
  try {
    await seedPresetsIfEmpty();
    const presets = await db.select().from(avatarAnimationPresetsTable);
    res.json(presets);
  } catch {
    res.status(500).json({ error: "Failed to get avatar presets" });
  }
});

// ─── GET /api/avatar/built-in ─────────────────────────────────────────────────

router.get("/avatar/built-in", requireAuth, async (_req: any, res: any) => {
  res.json(BUILT_IN_AVATARS);
});

export default router;
