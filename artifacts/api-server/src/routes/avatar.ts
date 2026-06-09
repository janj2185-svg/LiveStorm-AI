import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, avatarConfigsTable, avatarAnimationPresetsTable, streamersTable } from "@workspace/db";
import { requireAuth, getOrCreateUser } from "./users";

const router = Router();

// ─── Built-in avatars (static, not DB-stored) ─────────────────────────────────

export const BUILT_IN_AVATARS = [
  {
    key: "marcus",
    name: "Marcus",
    tagline: "Male Host · Professional",
    description: "Polished and charismatic male presenter. Best for news-style content, product reviews and brand stories.",
    style: "Realistic",
    accentColor: "#3b82f6",
    personalities: ["professional", "friendly", "serious"],
    isPrimary: true,
  },
  {
    key: "kai",
    name: "Kai",
    tagline: "Male Streamer · Content Creator",
    description: "High-energy male streamer. Best for gaming streams, hype events and interactive live drops.",
    style: "Realistic",
    accentColor: "#06b6d4",
    personalities: ["funny", "hype", "friendly"],
    isPrimary: false,
  },
  {
    key: "aria",
    name: "Aria",
    tagline: "Female Host · Professional",
    description: "Elegant and trustworthy female presenter. Best for interviews, brand stories and professional lifestyle content.",
    style: "Realistic",
    accentColor: "#8b5cf6",
    personalities: ["friendly", "professional", "motivator"],
    isPrimary: false,
  },
  {
    key: "sofia",
    name: "Sofia",
    tagline: "Female Streamer · Content Creator",
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
      .values({
        streamerId,
        avatarKey: "marcus",
        avatarEnabled: true,
      })
      .returning();
  }

  return config;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/avatar/presets — list built-in avatars
router.get("/presets", (_req, res) => {
  res.json(BUILT_IN_AVATARS);
});

// GET /api/avatar/config — get streamer's avatar config
router.get("/config", requireAuth, async (req, res) => {
  try {
    const streamer = await getStreamer(req.auth!.userId);
    if (!streamer) return res.status(404).json({ error: "Streamer not found" });

    const config = await getOrCreateAvatarConfig(streamer.id);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Failed to get avatar config" });
  }
});

// PUT /api/avatar/config — update streamer's avatar config
router.put("/config", requireAuth, async (req, res) => {
  try {
    const streamer = await getStreamer(req.auth!.userId);
    if (!streamer) return res.status(404).json({ error: "Streamer not found" });

    const config = await getOrCreateAvatarConfig(streamer.id);

    const {
      avatarKey,
      avatarEnabled,
      animationState,
      lipSyncEnabled,
      expressionsEnabled,
      reactionsEnabled,
      avatarUrl,
      avatarThumbnailUrl,
      renderer,
      scale,
      positionX,
      positionY,
      rotationY,
      lightingPreset,
      backgroundType,
      backgroundValue,
      lipSyncSensitivity,
      expressionIntensity,
      blinkEnabled,
      shadowEnabled,
    } = req.body;

    const [updated] = await db
      .update(avatarConfigsTable)
      .set({
        ...(avatarKey !== undefined && { avatarKey }),
        ...(avatarEnabled !== undefined && { avatarEnabled }),
        ...(animationState !== undefined && { animationState }),
        ...(lipSyncEnabled !== undefined && { lipSyncEnabled }),
        ...(expressionsEnabled !== undefined && { expressionsEnabled }),
        ...(reactionsEnabled !== undefined && { reactionsEnabled }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(avatarThumbnailUrl !== undefined && { avatarThumbnailUrl }),
        ...(renderer !== undefined && { renderer }),
        ...(scale !== undefined && { scale }),
        ...(positionX !== undefined && { positionX }),
        ...(positionY !== undefined && { positionY }),
        ...(rotationY !== undefined && { rotationY }),
        ...(lightingPreset !== undefined && { lightingPreset }),
        ...(backgroundType !== undefined && { backgroundType }),
        ...(backgroundValue !== undefined && { backgroundValue }),
        ...(lipSyncSensitivity !== undefined && { lipSyncSensitivity }),
        ...(expressionIntensity !== undefined && { expressionIntensity }),
        ...(blinkEnabled !== undefined && { blinkEnabled }),
        ...(shadowEnabled !== undefined && { shadowEnabled }),
        updatedAt: new Date(),
      })
      .where(eq(avatarConfigsTable.id, config.id))
      .returning();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update avatar config" });
  }
});

// GET /api/avatar/animation-presets — list animation presets for the streamer
router.get("/animation-presets", requireAuth, async (req, res) => {
  try {
    const streamer = await getStreamer(req.auth!.userId);
    if (!streamer) return res.status(404).json({ error: "Streamer not found" });

    let presets = await db.query.avatarAnimationPresetsTable.findMany({
      where: eq(avatarAnimationPresetsTable.streamerId, streamer.id),
    });

    // Seed defaults if none exist
    if (presets.length === 0) {
      const seeds = DEFAULT_PRESETS.map((p) => ({ ...p, streamerId: streamer.id }));
      presets = await db.insert(avatarAnimationPresetsTable).values(seeds).returning();
    }

    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: "Failed to get animation presets" });
  }
});

export default router;
