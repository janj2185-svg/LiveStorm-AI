import type { Integration } from "./types";

export const INTEGRATIONS: Integration[] = [
  {
    id: "tiktok",
    name: "TikTok LIVE",
    tagline: "Connect to TikTok LIVE streams",
    description:
      "Capture chat, gifts, follows, likes, and viewer counts from any TikTok LIVE stream in real time. Pipe events into overlays, automation, gamification, and AI co-host.",
    available: true,
    stage: "live",
    requiredFields: ["tiktokUsername"],
    docsUrl: "https://eulerstream.com",
    color: "#010101",
    roadmapStage: 1,
  },
  {
    id: "youtube",
    name: "YouTube Live",
    tagline: "Connect to YouTube Live streams",
    description:
      "Capture chat messages, Super Chats, memberships, and viewer counts from YouTube Live. Requires Google OAuth and a YouTube channel.",
    available: false,
    stage: "coming_soon",
    requiredFields: ["youtubeChannel", "googleOAuth"],
    docsUrl: "https://developers.google.com/youtube/v3/live/getting-started",
    color: "#ff0000",
    roadmapStage: 2,
  },
  {
    id: "twitch",
    name: "Twitch",
    tagline: "Connect to Twitch streams",
    description:
      "Capture chat, channel point redemptions, bits/cheers, subscriptions, and raids from Twitch streams. Requires Twitch OAuth.",
    available: false,
    stage: "coming_soon",
    requiredFields: ["twitchChannel", "twitchOAuth"],
    docsUrl: "https://dev.twitch.tv",
    color: "#9147ff",
    roadmapStage: 2,
  },
  {
    id: "kick",
    name: "Kick",
    tagline: "Connect to Kick streams",
    description:
      "Capture chat, gifts, and subscriptions from Kick streams. Kick integration planned for Stage 2.",
    available: false,
    stage: "coming_soon",
    color: "#53fc18",
    roadmapStage: 2,
  },
  {
    id: "internal",
    name: "LiveStorm Native",
    tagline: "Go live directly on our platform",
    description:
      "Stream directly on LiveStorm — no external platform required. Camera and microphone access, built-in audience tools, overlays, gamification, and monetization all in one place.",
    available: false,
    stage: "coming_soon",
    color: "#7c3aed",
    roadmapStage: 3,
  },
];

export function getIntegration(id: string): Integration | undefined {
  return INTEGRATIONS.find((i) => i.id === id);
}
