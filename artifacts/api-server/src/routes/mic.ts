import express, { Router } from "express";
import OpenAI, { toFile } from "openai";

const openai = new OpenAI();
const router = Router();

const SUPPORTED_LANGS = new Set([
  "uk", "pl", "en", "de", "ru", "fr", "es", "it",
  "pt", "nl", "ja", "ko", "zh", "ar", "tr", "cs", "sk", "ro",
]);

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

      console.log(`[Whisper] ✓ lang=${lang} bytes=${body.length} ms=${duration_ms} text="${text.slice(0, 80)}"`);
      return res.json({ text, lang, duration_ms });
    } catch (err) {
      const msg = (err as Error)?.message ?? "unknown";
      console.error(`[Whisper] ✗ ${msg}`);
      return res.status(500).json({ error: "transcription_failed", detail: msg });
    }
  },
);

export default router;
