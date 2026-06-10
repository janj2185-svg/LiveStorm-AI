import { useEffect, useRef, useState } from "react";
import type {
  LiveEvent,
  AiAnnouncementEvent,
  LuckyDropEvent,
  AchievementUnlockEvent,
} from "./useLiveSession";
import type { AvatarAnimationMachine } from "@/components/avatar/avatarAnimationMachine";

export interface AvatarReactionsState {
  lastReaction: string | null;
}

export function useAvatarReactions({
  machine,
  events,
  aiAnnouncements,
  luckyDrops,
  achievementUnlocks,
}: {
  machine: AvatarAnimationMachine;
  events: LiveEvent[];
  aiAnnouncements: AiAnnouncementEvent[];
  luckyDrops: LuckyDropEvent[];
  achievementUnlocks: AchievementUnlockEvent[];
}): AvatarReactionsState {
  const [lastReaction, setLastReaction] = useState<string | null>(null);
  const prevEventsLen = useRef(0);
  const prevAnnouncementsLen = useRef(0);
  const prevLuckyDropsLen = useRef(0);
  const prevAchievementsLen = useRef(0);

  // ── TikTok live events → immediate avatar reactions ──────────────────────────
  useEffect(() => {
    const newCount = events.length - prevEventsLen.current;
    if (newCount > 0) {
      // Newest events are at index 0 (prepended by useLiveSession)
      const newest = events[0] as LiveEvent;
      switch (newest.type) {
        case "gift":
          machine.push("gift_reaction");
          setLastReaction(`🎁 Gift from @${newest.username ?? "viewer"}`);
          break;
        case "follow":
          machine.push("follow_reaction");
          setLastReaction(`💜 @${newest.username ?? "viewer"} followed!`);
          break;
        case "like":
          machine.push("happy", 2000);
          setLastReaction(`❤️ @${newest.username ?? "viewer"} liked`);
          break;
        case "share":
          machine.push("excited", 2500);
          setLastReaction(`📢 @${newest.username ?? "viewer"} shared!`);
          break;
        case "comment":
          machine.push("happy", 1200);
          setLastReaction(`💬 @${newest.username ?? "viewer"} commented`);
          break;
      }
    }
    prevEventsLen.current = events.length;
  }, [events, machine]);

  // ── AI announcements → avatar state driven by announcement type ───────────────
  useEffect(() => {
    if (aiAnnouncements.length > prevAnnouncementsLen.current) {
      const newest = aiAnnouncements[0];
      const type = newest?.type ?? "";

      if (type === "boss_defeated") {
        machine.push("victory");
        setLastReaction(`🏆 Boss defeated! Victory!`);
      } else if (type === "level_up") {
        machine.push("excited");
        setLastReaction(`⬆️ Level up — ${newest?.viewerName ?? "viewer"}!`);
      } else if (type === "gift") {
        machine.push("gift_reaction");
        setLastReaction(`🎁 Gift hype — ${newest?.viewerName ?? "viewer"}`);
      } else if (type === "follow") {
        machine.push("follow_reaction");
        setLastReaction(`💜 Follow shoutout — ${newest?.viewerName ?? "viewer"}`);
      } else if (type === "share") {
        machine.push("excited", 2500);
        setLastReaction(`📢 Share shoutout — ${newest?.viewerName ?? "viewer"}`);
      } else if (type === "like_milestone") {
        machine.push("excited", 3000);
        setLastReaction(`❤️ Like milestone reached!`);
      } else if (type === "lucky_drop") {
        machine.push("gift_reaction");
        setLastReaction(`🍀 Lucky Drop — ${newest?.viewerName ?? "viewer"} won!`);
      } else if (type === "achievement") {
        machine.push("happy", 3200);
        setLastReaction(`🏅 Achievement — ${newest?.viewerName ?? "viewer"}`);
      } else if (type === "comment_reply") {
        machine.push("happy", 1500);
        setLastReaction(`💬 AI replied to chat`);
      } else {
        machine.push("excited", 2000);
        setLastReaction(`📣 AI announced`);
      }
    }
    prevAnnouncementsLen.current = aiAnnouncements.length;
  }, [aiAnnouncements, machine]);

  // ── Lucky drops → direct avatar trigger (fires even without AI speech) ────────
  useEffect(() => {
    if (luckyDrops.length > prevLuckyDropsLen.current) {
      const drop = luckyDrops[0];
      machine.push("gift_reaction");
      setLastReaction(`🍀 Lucky Drop: ${drop?.dropName ?? "Prize"}!`);
    }
    prevLuckyDropsLen.current = luckyDrops.length;
  }, [luckyDrops, machine]);

  // ── Achievement unlocks → direct avatar trigger ───────────────────────────────
  useEffect(() => {
    if (achievementUnlocks.length > prevAchievementsLen.current) {
      const ach = achievementUnlocks[0];
      machine.push("excited", 3000);
      setLastReaction(`🏅 ${ach?.achievement.name ?? "Achievement"} unlocked!`);
    }
    prevAchievementsLen.current = achievementUnlocks.length;
  }, [achievementUnlocks, machine]);

  return { lastReaction };
}
