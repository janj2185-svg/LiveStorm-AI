#!/usr/bin/env node
/**
 * TikTok LIVE Connection Test
 *
 * Usage:
 *   node scripts/test-tiktok.mjs @yourtiktokusername
 *
 * Requirements:
 *   - npm install tiktok-live-connector   (in the api-server directory)
 *   - The target account must currently be LIVE on TikTok
 *
 * This script tries to connect to a TikTok LIVE stream and prints
 * the result. Use this to verify your VPS can reach TikTok before
 * starting the full server.
 *
 * Example:
 *   cd artifacts/api-server
 *   npm install tiktok-live-connector
 *   node ../../scripts/test-tiktok.mjs @charlidamelio
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const username = process.argv[2];
if (!username) {
  console.error("Usage: node scripts/test-tiktok.mjs @tiktokusername");
  process.exit(1);
}

const clean = username.replace(/^@/, "").trim();
console.log(`\n🔌 Testing TikTok LIVE connection to @${clean}...`);
console.log("   (The account must be LIVE right now)\n");

let WebcastPushConnection;
try {
  // Try to load from api-server node_modules first, then workspace root
  const searchPaths = [
    path.join(__dirname, "../artifacts/api-server/node_modules/tiktok-live-connector"),
    path.join(__dirname, "../node_modules/tiktok-live-connector"),
  ];
  let found = false;
  for (const p of searchPaths) {
    try {
      const mod = await import(p + "/index.js").catch(() => null)
        ?? await import(p).catch(() => null);
      if (mod) {
        WebcastPushConnection = mod.WebcastPushConnection ?? mod.default?.WebcastPushConnection;
        if (WebcastPushConnection) { found = true; break; }
      }
    } catch (_) {}
  }
  if (!found) throw new Error("not found");
} catch (_) {
  console.error("❌ tiktok-live-connector is not installed.\n");
  console.error("   Fix:");
  console.error("   1. cd artifacts/api-server");
  console.error("   2. npm install tiktok-live-connector");
  console.error("   3. Run this script again\n");
  process.exit(1);
}

const start = Date.now();
let connection;
try {
  connection = new WebcastPushConnection(clean, {
    processInitialData: false,
    enableWebsocketUpgrade: true,
  });

  let eventCount = 0;
  const types = {};

  connection.on("chat",     (d) => { eventCount++; types.chat = (types.chat || 0) + 1; });
  connection.on("gift",     (d) => { eventCount++; types.gift = (types.gift || 0) + 1; });
  connection.on("like",     (d) => { eventCount++; types.like = (types.like || 0) + 1; });
  connection.on("follow",   (d) => { eventCount++; types.follow = (types.follow || 0) + 1; });
  connection.on("roomUser", (d) => {
    if (d.viewerCount) console.log(`   👥 Viewer count: ${d.viewerCount}`);
  });

  await connection.connect();
  const latencyMs = Date.now() - start;

  console.log(`✅ Connected to @${clean} LIVE  (${latencyMs}ms)\n`);
  console.log("   Listening for 10 seconds to verify real events...\n");

  await new Promise((resolve) => setTimeout(resolve, 10_000));

  console.log(`\n📊 Events received in 10s:`);
  if (eventCount === 0) {
    console.log("   (none — stream may be quiet or just started)");
  } else {
    for (const [type, count] of Object.entries(types)) {
      console.log(`   ${type}: ${count}`);
    }
  }

  console.log(`\n✅ Real TikTok LIVE connection is working correctly.`);
  console.log(`   Set TIKTOK_MODE=real on your server and restart.\n`);
} catch (err) {
  const ms = Date.now() - start;
  const msg = err?.message ?? String(err);
  console.error(`\n❌ Connection failed after ${ms}ms\n`);

  if (msg.includes("LIVE_NOT_FOUND") || msg.toLowerCase().includes("not live")) {
    console.error(`   @${clean} is not currently LIVE on TikTok.`);
    console.error("   Start a TikTok LIVE on that account and try again.\n");
  } else if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
    console.error("   Network error — server cannot reach TikTok.");
    console.error("   Check: firewall rules, outbound port 443, VPS provider restrictions.\n");
  } else if (msg.includes("429")) {
    console.error("   TikTok rate-limited this IP. Wait a few minutes and retry.\n");
  } else {
    console.error(`   Error: ${msg}\n`);
  }
  process.exit(1);
} finally {
  try { connection?.disconnect(); } catch (_) {}
  process.exit(0);
}
