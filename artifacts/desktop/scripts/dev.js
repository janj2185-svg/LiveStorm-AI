/**
 * Development launcher for the LiveStorm AI desktop app.
 *
 * Usage:
 *   pnpm --filter @workspace/desktop run dev
 *
 * The script waits for the frontend dev server (or the Replit proxy URL),
 * then launches Electron pointing at it.
 *
 * Environment variables:
 *   PORT              — frontend dev server port (default: 5173)
 *   ELECTRON_START_URL — override the URL loaded in Electron
 */

"use strict";

const { spawn }      = require("child_process");
const http           = require("http");
const https          = require("https");
const path           = require("path");

const DEV_PORT = process.env.PORT || 5173;
const DEV_URL  =
  process.env.ELECTRON_START_URL ||
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : `http://localhost:${DEV_PORT}`);

console.log("[LiveStorm Desktop Dev] Target URL:", DEV_URL);

/**
 * Poll until the server responds (or timeout).
 */
function waitForServer(url, timeoutMs = 30_000) {
  return new Promise((resolve) => {
    const start  = Date.now();
    const client = url.startsWith("https") ? https : http;

    const attempt = () => {
      const req = client.get(url, { timeout: 3_000 }, (res) => {
        if (res.statusCode < 500) return resolve(true);
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(attempt, 1_000);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(attempt, 1_000);
      });
      req.on("timeout", () => {
        req.destroy();
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(attempt, 1_000);
      });
    };

    attempt();
  });
}

async function main() {
  process.stdout.write("[LiveStorm Desktop Dev] Waiting for web server");
  const ready = await waitForServer(DEV_URL, 30_000);
  if (ready) {
    console.log(" ✓");
  } else {
    console.log(" (timeout — launching anyway)");
  }

  let electronBin;
  try {
    // Resolve electron binary from the local node_modules
    electronBin = require("electron");
  } catch {
    electronBin = "electron";
  }

  console.log("[LiveStorm Desktop Dev] Launching Electron...\n");

  const proc = spawn(electronBin, [path.resolve(__dirname, "..")], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV:            "development",
      ELECTRON_START_URL:  DEV_URL,
    },
  });

  proc.on("close", (code) => {
    console.log(`\n[LiveStorm Desktop Dev] Electron exited (code ${code})`);
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error("[LiveStorm Desktop Dev] Fatal:", err.message);
  process.exit(1);
});
