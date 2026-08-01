/**
 * Shared OpenAI client factory.
 * Never throws at import time when keys are missing — local/demo boots still work.
 * Callers must handle null / request failures when credentials are absent.
 */
import OpenAI from "openai";

const PLACEHOLDER = "sk-local-dev-missing-key";

function resolveChatKey(): string | null {
  return (
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    null
  );
}

function resolveTtsKey(): string | null {
  return process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || null;
}

let chatClient: OpenAI | null = null;
let ttsClient: OpenAI | null = null;

export function hasOpenAICredentials(): boolean {
  const key = resolveChatKey();
  return !!key && key !== PLACEHOLDER && !key.includes("missing");
}

export function getOpenAI(): OpenAI {
  if (!chatClient) {
    const key = resolveChatKey() ?? PLACEHOLDER;
    if (!resolveChatKey()) {
      console.warn(
        "[OpenAI] No AI_INTEGRATIONS_OPENAI_API_KEY / OPENAI_API_KEY — AI features disabled until configured",
      );
    }
    chatClient = new OpenAI({
      apiKey: key,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
    });
  }
  return chatClient;
}

/** TTS prefers OPENAI_API_KEY (direct api.openai.com); falls back to integrations key. */
export function getTtsOpenAI(): OpenAI | null {
  const key = resolveTtsKey();
  if (!key) {
    if (!ttsClient) {
      console.warn("[TTS] OPENAI_API_KEY not set — voice generation disabled");
    }
    return null;
  }
  if (!ttsClient) {
    ttsClient = new OpenAI({ apiKey: key });
  }
  return ttsClient;
}
