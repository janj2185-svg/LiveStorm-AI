/**
 * eventUtils — Shared Live Event Utilities
 *
 * Single source of truth for:
 * - Event display configuration (colors, labels)
 * - Event description formatting
 *
 * Previously duplicated across Dashboard, Live Studio, and AI Co-Host.
 * All pages should import from here instead of defining their own maps.
 *
 * NOTE: Icons are NOT included here to keep this module framework-agnostic.
 * Each page maps iconName → React component from lucide-react.
 */

import type { LiveEvent } from "@/hooks/useLiveSession";

export interface EventDisplayConfig {
  bg: string;
  text: string;
  border: string;
  label: string;
  iconName: string;
}

export const EVENT_DISPLAY: Record<string, EventDisplayConfig> = {
  gift:                 { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",  label: "Gift",        iconName: "Gift"          },
  comment:              { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20",   label: "Chat",        iconName: "MessageSquare" },
  follow:               { bg: "bg-green-500/10",   text: "text-green-400",   border: "border-green-500/20",  label: "Follow",      iconName: "UserPlus"      },
  like:                 { bg: "bg-pink-500/10",    text: "text-pink-400",    border: "border-pink-500/20",   label: "Like",        iconName: "Heart"         },
  share:                { bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/20",   label: "Share",       iconName: "Share"         },
  viewerCount:          { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20", label: "Viewers",     iconName: "Users"         },
  ai_announcement:      { bg: "bg-purple-600/15",  text: "text-purple-300",  border: "border-purple-500/20", label: "AI",          iconName: "Bot"           },
  xp_awarded:           { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/20", label: "XP",          iconName: "Zap"           },
  achievement_unlocked: { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20", label: "Achievement", iconName: "Trophy"        },
  level_up:             { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20",label: "Level Up",    iconName: "TrendingUp"    },
};

export function getEventDisplay(eventType: string): EventDisplayConfig {
  return EVENT_DISPLAY[eventType] ?? EVENT_DISPLAY.comment;
}

/**
 * Returns a human-readable description for a live event.
 * Returns null for events that should be hidden in feeds (e.g. viewerCount).
 */
export function formatEventDesc(event: LiveEvent): string | null {
  switch (event.type) {
    case "gift":
      return `sent ${event.data.giftName || "a gift"} · ${event.data.coins || 1} coins`;
    case "like":
      return `liked the stream (${event.data.likeCount || 1}×)`;
    case "comment":
      return `"${event.data.text || ""}"`;
    case "follow":
      return "started following";
    case "share":
      return "shared the LIVE";
    case "ai_announcement":
      return (event.data.text as string) || "";
    case "xp_awarded":
      return `+${event.data.xp} XP · Lv.${event.data.level}`;
    case "achievement_unlocked":
      return `unlocked: ${event.data.achievementName || "Achievement"}`;
    case "level_up":
      return `reached Level ${event.data.newLevel}!`;
    case "viewerCount":
      return null;
    default:
      return "interacted";
  }
}
