import type { TikTokEvent } from "./tiktokSimulator";

export type CoHostOperatingMode = "assistant" | "semi-auto" | "autopilot";

export interface CoHostReplyPolicyInput {
  operatingMode: string;
  autoReplyEnabled: boolean;
  eventType: TikTokEvent["type"] | "streamer_speech" | string;
  priority: number;
}

export function autoReplyForOperatingMode(mode: string): boolean | undefined {
  if (mode === "assistant") return false;
  if (mode === "semi-auto" || mode === "autopilot") return true;
  return undefined;
}

export function shouldAllowCoHostReply({
  operatingMode,
  autoReplyEnabled,
  eventType,
  priority,
}: CoHostReplyPolicyInput): boolean {
  if (eventType === "streamer_speech") return true;
  if (operatingMode === "assistant") return false;
  if (!autoReplyEnabled) return false;
  if (operatingMode === "autopilot") return true;

  if (operatingMode === "semi-auto") {
    if (eventType !== "comment") return true;
    // Semi-auto handles high-confidence comments/questions, but leaves generic
    // P6 chat for the streamer instead of behaving like full autopilot.
    return priority <= 4;
  }

  return false;
}
