import { Router, type IRouter } from "express";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "./users";
import { getIO } from "../lib/socketServer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(__dirname, "../../gift-library"),
  path.resolve(__dirname, "../../../artifacts/gift-library"),
  path.resolve(process.cwd(), "artifacts/gift-library"),
  path.resolve(process.cwd(), "../gift-library"),
];
const GIFT_ROOT = candidates.find((p) => existsSync(path.join(p, "catalog", "sylora-gifts-100.json")))
  ?? candidates[0];
const CATALOG = path.join(GIFT_ROOT, "catalog", "sylora-gifts-100.json");
console.log(`[Gifts] catalog root=${GIFT_ROOT} exists=${existsSync(CATALOG)}`);

const router: IRouter = Router();

function loadCatalog() {
  if (!existsSync(CATALOG)) {
    throw new Error(`Gift catalog not found at ${CATALOG}`);
  }
  return JSON.parse(readFileSync(CATALOG, "utf8"));
}

router.get("/gifts/catalog", (_req, res) => {
  try {
    const catalog = loadCatalog();
    res.json({
      library: catalog.library,
      version: catalog.version,
      count: catalog.count,
      policy: catalog.policy,
      rarityCounts: catalog.rarityCounts,
      gifts: catalog.gifts.map((g: any) => ({
        id: g.id,
        slug: g.slug,
        name: g.name,
        rarity: g.rarity,
        priceCoins: g.priceCoins,
        durationSec: g.durationSec,
        story: g.story,
        assets: g.assets,
        performance: g.performance,
        qualityTarget: g.qualityTarget,
        status: g.status,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/gifts/status/pipeline", (_req, res) => {
  try {
    const catalog = loadCatalog();
    const summary = {
      total: catalog.gifts.length,
      glbReady: 0,
      thumbReady: 0,
      blendReady: 0,
      previewReady: 0,
    };
    for (const g of catalog.gifts) {
      if (existsSync(path.join(GIFT_ROOT, g.assets.glb))) summary.glbReady++;
      if (existsSync(path.join(GIFT_ROOT, g.assets.thumbnail))) summary.thumbReady++;
      if (existsSync(path.join(GIFT_ROOT, g.assets.blender))) summary.blendReady++;
      if (existsSync(path.join(GIFT_ROOT, g.assets.previewMp4))) summary.previewReady++;
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/gifts/:slug", (req, res) => {
  try {
    const catalog = loadCatalog();
    const gift = catalog.gifts.find((g: any) => g.slug === req.params.slug);
    if (!gift) return res.status(404).json({ error: "Gift not found" });
    const manifestPath = path.join(GIFT_ROOT, "manifests", `${gift.slug}.manifest.json`);
    const manifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf8"))
      : null;
    res.json({ gift, manifest });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * Play / send a Sylora gift into the active session room.
 * Emits socket events for overlay + AI interaction hooks.
 */
router.post("/gifts/:slug/play", requireAuth, async (req: any, res) => {
  try {
    const catalog = loadCatalog();
    const gift = catalog.gifts.find((g: any) => g.slug === req.params.slug);
    if (!gift) return res.status(404).json({ error: "Gift not found" });

    const sessionId = Number(req.body?.sessionId);
    const viewerName = String(req.body?.viewerName ?? "viewer");
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    const io = getIO();
    const roomId = `session:${sessionId}`;
    const payload = {
      giftId: gift.id,
      slug: gift.slug,
      name: gift.name,
      rarity: gift.rarity,
      priceCoins: gift.priceCoins,
      viewerName,
      durationSec: gift.durationSec,
      interactions: gift.interactions,
      ts: Date.now(),
    };

    if (io) {
      io.to(roomId).emit("sylora:gift:play", payload);
      io.to(roomId).emit("ai:gift-hook", {
        type: "sylora_gift",
        ...payload,
        promptHint: gift.interactions?.ai?.promptHint,
      });
      if (gift.interactions?.chain?.globalEvent) {
        io.to(roomId).emit("sylora:gift:global", payload);
      }
    }

    res.json({ ok: true, played: payload, socketsNotified: !!io });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
