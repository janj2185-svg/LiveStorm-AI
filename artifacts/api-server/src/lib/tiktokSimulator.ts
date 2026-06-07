import type { Server as SocketServer } from "socket.io";
import { ingestLiveEvent } from "./socketServer";

export interface TikTokEvent {
  type: "comment" | "gift" | "like" | "follow" | "share" | "viewerCount";
  sessionId: number;
  userId?: string;
  username?: string;
  avatarUrl?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const DEMO_USERS = [
  { username: "cosmic_warrior", avatarUrl: null },
  { username: "luna_phoenix", avatarUrl: null },
  { username: "pixel_storm", avatarUrl: null },
  { username: "dragon_ryder99", avatarUrl: null },
  { username: "neon_ghost", avatarUrl: null },
  { username: "void_hunter", avatarUrl: null },
  { username: "starfire_echo", avatarUrl: null },
  { username: "blaze_master", avatarUrl: null },
  { username: "crystal_viper", avatarUrl: null },
  { username: "thunder_wolf", avatarUrl: null },
];

const DEMO_COMMENTS = [
  "Let's go!!",
  "This stream is insane",
  "First time here, love it!",
  "GG GG GG",
  "You're the best streamer",
  "More content please!!",
  "From Brazil here",
  "This is wild",
  "Can you do a shoutout?",
  "Watching from the UK!",
  "W streamer W chat",
  "How long have you been streaming?",
  "Drop the link!",
];

const GIFT_TYPES = [
  { name: "Rose", coins: 1 },
  { name: "Finger Heart", coins: 5 },
  { name: "TikTok", coins: 10 },
  { name: "Sunglasses", coins: 25 },
  { name: "Mic", coins: 50 },
  { name: "Lion", coins: 100 },
  { name: "Rainbow Puke", coins: 200 },
  { name: "Drama Queen", coins: 500 },
  { name: "Universe", coins: 1000 },
];

function randomUser() {
  return DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)];
}

function randomComment() {
  return DEMO_COMMENTS[Math.floor(Math.random() * DEMO_COMMENTS.length)];
}

function randomGift() {
  const weights = [0.4, 0.25, 0.15, 0.08, 0.05, 0.04, 0.015, 0.01, 0.005];
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) return GIFT_TYPES[i];
  }
  return GIFT_TYPES[0];
}

interface SimulatorEntry {
  interval: NodeJS.Timeout;
  userId: number;
}

const activeSimulators = new Map<number, SimulatorEntry>();

export function startSimulator(_io: SocketServer, sessionId: number, _roomId: string, userId: number) {
  if (activeSimulators.has(sessionId)) return;

  let viewerCount = Math.floor(Math.random() * 100) + 20;
  let tickCount = 0;

  async function emitEvent() {
    tickCount++;
    const rand = Math.random();

    if (tickCount % 10 === 0) {
      const delta = Math.floor(Math.random() * 20) - 8;
      viewerCount = Math.max(5, viewerCount + delta);
      await ingestLiveEvent({
        type: "viewerCount",
        sessionId,
        data: { count: viewerCount },
        timestamp: Date.now(),
      }, userId);
    }

    if (rand < 0.45) {
      const user = randomUser();
      await ingestLiveEvent({
        type: "comment",
        sessionId,
        username: user.username,
        data: { text: randomComment() },
        timestamp: Date.now(),
      }, userId);
    } else if (rand < 0.6) {
      const user = randomUser();
      const gift = randomGift();
      await ingestLiveEvent({
        type: "gift",
        sessionId,
        username: user.username,
        data: { giftName: gift.name, coins: gift.coins, count: 1 },
        timestamp: Date.now(),
      }, userId);
    } else if (rand < 0.75) {
      const user = randomUser();
      await ingestLiveEvent({
        type: "like",
        sessionId,
        username: user.username,
        data: { likeCount: Math.floor(Math.random() * 20) + 1 },
        timestamp: Date.now(),
      }, userId);
    } else if (rand < 0.85) {
      const user = randomUser();
      await ingestLiveEvent({
        type: "follow",
        sessionId,
        username: user.username,
        data: {},
        timestamp: Date.now(),
      }, userId);
    } else {
      const user = randomUser();
      await ingestLiveEvent({
        type: "share",
        sessionId,
        username: user.username,
        data: {},
        timestamp: Date.now(),
      }, userId);
    }
  }

  const interval = setInterval(emitEvent, 1200);
  activeSimulators.set(sessionId, { interval, userId });
}

export function stopSimulator(sessionId: number) {
  const entry = activeSimulators.get(sessionId);
  if (entry) {
    clearInterval(entry.interval);
    activeSimulators.delete(sessionId);
  }
}
