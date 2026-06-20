import express, { Router } from "express";
import OpenAI, { toFile } from "openai";
import { db, sessionsTable, streamersTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "./users";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_KEY ? undefined : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
const router = Router();

const SUPPORTED_LANGS = new Set([
  "uk", "pl", "en", "de", "ru", "fr", "es", "it",
  "pt", "nl", "ja", "ko", "zh", "ar", "tr", "cs", "sk", "ro",
]);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function micRateLimit(req: any, res: any, next: any) {
  const key = req.clerkUserId ?? req.ip ?? "unknown";
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({ error: "rate_limited", detail: "Too many transcription requests" });
  }

  bucket.count += 1;
  return next();
}

async function requireOwnedActiveSession(req: any, res: any, next: any) {
  const sessionId = Number(req.query.sessionId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ error: "invalid_session", detail: "sessionId query parameter is required" });
  }

  try {
    const [user, session] = await Promise.all([
      db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, req.clerkUserId) }),
      db.query.sessionsTable.findFirst({ where: eq(sessionsTable.id, sessionId) }),
    ]);

    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!session || session.endedAt) {
      return res.status(404).json({ error: "session_not_found", detail: "Session not found or already ended" });
    }

    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.id, session.streamerId),
    });
    if (!streamer || streamer.userId !== user.id) {
      return res.status(403).json({ error: "forbidden", detail: "Not authorized for this session" });
    }

    req.micSessionId = sessionId;
    return next();
  } catch (err) {
    console.error("[Whisper] session authorization failed:", (err as Error)?.message);
    return res.status(500).json({ error: "session_auth_failed" });
  }
}

/**
 * POST /api/mic/transcribe
 *
 * Receives raw audio bytes (audio/webm from MediaRecorder) and runs
 * OpenAI Whisper-1 transcription.  Returns { text, lang, duration_ms }.
 *
 * Used by useWhisperMic.ts as server-side SR — far more reliable than
 * browser SpeechRecognition, especially on Android Chrome.
 */
router.post(
  "/mic/transcribe",
  requireAuth,
  micRateLimit,
  requireOwnedActiveSession,
  express.raw({ type: ["audio/*", "application/octet-stream"], limit: "10mb" }),
  async (req, res) => {
    try {
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length < 100) {
        return res.status(400).json({ error: "empty_audio", detail: "Audio payload too small or missing" });
      }

      const rawLang = ((req.query.lang as string) ?? "uk").split("-")[0].toLowerCase();
      const lang    = SUPPORTED_LANGS.has(rawLang) ? rawLang : "uk";
      const startMs = Date.now();

      const file   = await toFile(body, "audio.webm", { type: "audio/webm" });
      const result = await openai.audio.transcriptions.create({
        file,
        model:           "whisper-1",
        language:        lang,
        response_format: "text",
      });

      const text       = (typeof result === "string" ? result : (result as any).text ?? "").trim();
      const duration_ms = Date.now() - startMs;

      console.log(`[Whisper] ✓ session=${(req as any).micSessionId} lang=${lang} bytes=${body.length} ms=${duration_ms} text="${text.slice(0, 80)}"`);
      return res.json({ text, lang, duration_ms });
    } catch (err) {
      const msg = (err as Error)?.message ?? "unknown";
      console.error(`[Whisper] ✗ ${msg}`);
      return res.status(500).json({ error: "transcription_failed", detail: msg });
    }
  },
);

export default router;
