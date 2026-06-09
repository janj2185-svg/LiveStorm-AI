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

  // ── TikTok live events ───────────────────────────────────────────────────────
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

  // ── AI announcements (boss battle, level up, etc.) ───────────────────────────
  useEffect(() => {
    if (aiAnnouncements.length > prevAnnouncementsLen.current) {
      const newest = aiAnnouncements[0];
      if (newest.type === "boss_defeated") {
        machine.push("victory");
        setLastReaction(`🏆 Boss defeated! Victory!`);
      } else if (newest.type === "level_up") {
        machine.push("excited");
        setLastReaction(`⬆️ Level up!`);
      } else if (newest.type === "gift") {
        machine.push("gift_reaction");
        setLastReaction(`🎁 Gift: ${newest.viewerName ?? "viewer"}`);
      } else {
        machine.push("excited", 2000);
        setLastReaction(`📣 AI announced`);
      }
    }
    prevAnnouncementsLen.current = aiAnnouncements.length;
  }, [aiAnnouncements, machine]);

  // ── Lucky drops ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (luckyDrops.length > prevLuckyDropsLen.current) {
      const drop = luckyDrops[0];
      machine.push("excited");
      setLastReaction(`🍀 Lucky Drop: ${drop?.dropName ?? "Prize"}!`);
    }
    prevLuckyDropsLen.current = luckyDrops.length;
  }, [luckyDrops, machine]);

  // ── Achievement unlocks ──────────────────────────────────────────────────────
  useEffect(() => {
    if (achievementUnlocks.length > prevAchievementsLen.current) {
      const ach = achievementUnlocks[0];
      machine.push("happy");
      setLastReaction(`🏅 ${ach?.achievement.name ?? "Achievement"} unlocked!`);
    }
    prevAchievementsLen.current = achievementUnlocks.length;
  }, [achievementUnlocks, machine]);

  return { lastReaction };
}
