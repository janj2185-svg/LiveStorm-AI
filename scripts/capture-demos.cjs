const { chromium } = require("playwright");
const fs = require("fs");

const screens = [
  "welcome", "auth", "home", "gifts", "wallet", "marketplace",
  "assistant", "live-studio", "creator-dashboard", "admin", "business", "inventory",
];

async function main() {
  fs.mkdirSync("/opt/cursor/artifacts/screenshots", { recursive: true });
  fs.mkdirSync("/tmp/sylora-videos", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  async function shot(name, url) {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(700);
    const path = `/opt/cursor/artifacts/screenshots/${name}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log("saved", path);
  }

  for (const id of screens) {
    await shot(`gallery-${id}`, `http://127.0.0.1:4173/#/${id}`);
  }
  await shot("api-docs", "http://127.0.0.1:8000/docs");

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: "/tmp/sylora-videos", size: { width: 1280, height: 720 } },
  });
  const vpage = await context.newPage();
  for (const id of ["welcome", "gifts", "wallet", "assistant", "live-studio", "admin", "marketplace"]) {
    await vpage.goto(`http://127.0.0.1:4173/#/${id}`, { waitUntil: "domcontentloaded" });
    await vpage.waitForTimeout(1100);
  }
  await context.close();
  await browser.close();

  const videos = fs.readdirSync("/tmp/sylora-videos").filter((f) => f.endsWith(".webm"));
  for (const video of videos) {
    const dest = "/opt/cursor/artifacts/sylora_gallery_walkthrough.webm";
    fs.copyFileSync(`/tmp/sylora-videos/${video}`, dest);
    console.log("video", dest);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
