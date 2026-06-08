/**
 * TikTok Live Detection Diagnostic
 * Fetches the raw live page and dumps everything relevant to understand why
 * live detection fails.
 *
 * Usage: node diag-tiktok-live.mjs <username>
 *   e.g. node diag-tiktok-live.mjs jan85oks
 */

const username = process.argv[2] || "jan85oks";
const clean = username.replace(/^@/, "").trim();
const url = `https://www.tiktok.com/@${clean}/live`;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

console.log(`\n=== TikTok Live Detection Diagnostic for @${clean} ===`);
console.log(`URL: ${url}\n`);

let html;
try {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.tiktok.com/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  console.log(`HTTP ${res.status} ${res.statusText}`);
  console.log("Response headers:");
  for (const [k, v] of res.headers) {
    if (["content-type", "location", "x-tt-", "cf-"].some(p => k.toLowerCase().startsWith(p))) {
      console.log(`  ${k}: ${v}`);
    }
  }
  html = await res.text();
} catch (e) {
  console.error("FETCH FAILED:", e.message);
  process.exit(1);
}

console.log(`\nHTML length: ${html.length} chars`);
console.log(`First 200 chars: ${html.slice(0, 200).replace(/\s+/g, " ")}`);

// ── 1. SIGI_STATE ───────────────────────────────────────────────────────────
console.log("\n--- SIGI_STATE ---");
const sigiMatch = html.match(/<script id="SIGI_STATE" type="application\/json">([\s\S]*?)<\/script>/);
if (!sigiMatch) {
  console.log("NOT FOUND in HTML.");
  // Search for partial match
  const partial = html.indexOf("SIGI_STATE");
  if (partial !== -1) {
    console.log(`Partial match found at char ${partial}: "${html.slice(partial, partial + 200)}"`);
  }
} else {
  const raw = sigiMatch[1];
  console.log(`Found! Raw length: ${raw.length} chars`);
  let parsed;
  try {
    parsed = JSON.parse(raw);
    console.log("Parsed successfully.");
    console.log("\nTop-level keys:", Object.keys(parsed).join(", "));

    // Check LiveRoom path
    console.log("\n--- LiveRoom paths ---");
    const lr = parsed?.LiveRoom;
    if (!lr) {
      console.log("parsed.LiveRoom: MISSING");
      // Show any key that contains 'live' or 'room' (case-insensitive)
      const liveKeys = Object.keys(parsed).filter(k => /live|room/i.test(k));
      console.log("Keys containing 'live'/'room':", liveKeys.join(", ") || "(none)");
    } else {
      console.log("parsed.LiveRoom keys:", Object.keys(lr).join(", "));

      const lrui = lr?.liveRoomUserInfo;
      if (!lrui) {
        console.log("parsed.LiveRoom.liveRoomUserInfo: MISSING");
        console.log("LiveRoom sub-keys:", JSON.stringify(lr, null, 2).slice(0, 1000));
      } else {
        console.log("parsed.LiveRoom.liveRoomUserInfo keys:", Object.keys(lrui).join(", "));

        const user = lrui?.user ?? lrui;
        console.log("\nuser object keys:", Object.keys(user || {}).slice(0, 30).join(", "));
        console.log("user.roomId:", user?.roomId);
        console.log("user.status:", user?.status);
        console.log("user.liveStatus:", user?.liveStatus);
        console.log("user.uniqueId:", user?.uniqueId);

        // Also check lrui.liveRoom directly
        const liveRoom = lrui?.liveRoom;
        if (liveRoom) {
          console.log("\nlrui.liveRoom keys:", Object.keys(liveRoom).join(", "));
          console.log("lrui.liveRoom.roomId:", liveRoom?.roomId);
          console.log("lrui.liveRoom.status:", liveRoom?.status);
          console.log("lrui.liveRoom.liveUrl:", liveRoom?.liveUrl);
        }
      }
    }

    // Dump abbreviated full structure (first 3000 chars)
    console.log("\nFull SIGI_STATE (first 3000 chars):");
    console.log(JSON.stringify(parsed, null, 2).slice(0, 3000));
  } catch (e) {
    console.log("JSON.parse FAILED:", e.message);
    console.log("Raw SIGI_STATE (first 500 chars):", raw.slice(0, 500));
  }
}

// ── 2. __UNIVERSAL_DATA_FOR_REHYDRATION__ ────────────────────────────────────
console.log("\n--- __UNIVERSAL_DATA_FOR_REHYDRATION__ ---");
const udrMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
if (!udrMatch) {
  console.log("NOT FOUND.");
} else {
  const raw = udrMatch[1];
  console.log(`Found! Raw length: ${raw.length} chars`);
  try {
    const parsed = JSON.parse(raw);
    console.log("Top-level keys:", Object.keys(parsed).join(", "));

    // Look for live/room data
    const str = JSON.stringify(parsed);
    const roomMatch = str.match(/"roomId"\s*:\s*"(\d+)"/);
    const statusMatch = str.match(/"status"\s*:\s*(\d+)/);
    console.log("roomId found via regex:", roomMatch?.[1] ?? "(none)");
    console.log("status found via regex:", statusMatch?.[1] ?? "(none)");
    console.log("\nFull UDR (first 3000 chars):");
    console.log(JSON.stringify(parsed, null, 2).slice(0, 3000));
  } catch (e) {
    console.log("JSON.parse FAILED:", e.message);
  }
}

// ── 3. Any other JSON blobs with roomId ─────────────────────────────────────
console.log("\n--- roomId scan across entire HTML ---");
const roomIdMatches = [...html.matchAll(/"roomId"\s*:\s*"(\d+)"/g)];
if (roomIdMatches.length === 0) {
  console.log("No 'roomId' string found anywhere in the HTML.");
} else {
  console.log(`Found ${roomIdMatches.length} roomId occurrence(s):`);
  for (const m of roomIdMatches.slice(0, 5)) {
    const ctx = html.slice(Math.max(0, m.index - 80), m.index + 80).replace(/\s+/g, " ");
    console.log(`  roomId="${m[1]}"  context: ...${ctx}...`);
  }
}

// ── 4. status field scan ─────────────────────────────────────────────────────
console.log("\n--- 'status' field scan ---");
const statusMatches = [...html.matchAll(/"status"\s*:\s*(\d+)/g)];
if (statusMatches.length === 0) {
  console.log("No 'status' numeric field found in HTML.");
} else {
  console.log(`Found ${statusMatches.length} status field(s):`);
  for (const m of statusMatches.slice(0, 10)) {
    const ctx = html.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, " ");
    console.log(`  status=${m[1]}  context: ...${ctx}...`);
  }
}

// ── 5. isLive / liveStatus scan ─────────────────────────────────────────────
console.log("\n--- isLive / liveStatus scan ---");
const liveStatusMatches = [...html.matchAll(/"(?:isLive|liveStatus|hasStream|streamStatus)"\s*:\s*([^,}]+)/g)];
if (liveStatusMatches.length === 0) {
  console.log("No isLive/liveStatus fields found.");
} else {
  for (const m of liveStatusMatches.slice(0, 10)) {
    console.log(`  ${m[0]}`);
  }
}

console.log("\n=== Diagnostic complete ===\n");
