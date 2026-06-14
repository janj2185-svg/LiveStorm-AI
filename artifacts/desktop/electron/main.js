"use strict";

const {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  session,
  nativeTheme,
  Menu,
  Tray,
} = require("electron");
const path = require("path");

// ─── Config ───────────────────────────────────────────────────────────────────

const APP_NAME     = "LiveStorm AI";
const APP_PROTOCOL = "livestorm";
const isDev        = process.env.NODE_ENV === "development" || !app.isPackaged;

/**
 * Web app URL to load:
 *   Dev  → ELECTRON_START_URL env var (set by scripts/dev.js)
 *   Prod → LIVESTORM_APP_URL env var OR baked-in production URL
 *
 * The desktop app is a "SaaS shell" — it loads the hosted LiveStorm AI
 * web app exactly as a browser would. All API calls, WebSockets, and
 * Clerk auth flow through the same hosted backend.
 */
const WEB_URL =
  process.env.ELECTRON_START_URL ||
  process.env.LIVESTORM_APP_URL   ||
  "https://livestorm-ai.replit.app";

// ─── Single-instance lock (Windows/Linux) ────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// ─── Custom protocol for Clerk OAuth deep links ───────────────────────────────

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(
      APP_PROTOCOL,
      process.execPath,
      [path.resolve(process.argv[1])]
    );
  }
} else {
  app.setAsDefaultProtocolClient(APP_PROTOCOL);
}

// ─── Globals ─────────────────────────────────────────────────────────────────

let mainWindow = null;
let tray       = null;

// ─── Create main window ───────────────────────────────────────────────────────

function createWindow() {
  nativeTheme.themeSource = "dark";

  mainWindow = new BrowserWindow({
    width:     1400,
    height:    900,
    minWidth:  1024,
    minHeight: 600,
    title:     APP_NAME,
    webPreferences: {
      preload:          path.join(__dirname, "preload.js"),
      nodeIntegration:  false,
      contextIsolation: true,
      sandbox:          false,
      webSecurity:      true,
      // Persist Clerk JWT and session cookies across launches
      partition:        "persist:livestorm",
    },
    // macOS: integrate with traffic lights
    titleBarStyle:       process.platform === "darwin" ? "hiddenInset" : "default",
    vibrancy:            process.platform === "darwin" ? "under-window" : undefined,
    backgroundColor:     "#0a0a0f",
    show:                false,
  });

  // ── Load the app ────────────────────────────────────────────────────────────
  console.log(`[LiveStorm Desktop] Loading: ${WEB_URL}`);
  mainWindow.loadURL(WEB_URL).catch((err) => {
    console.error("[LiveStorm Desktop] Load error:", err.message);
    mainWindow.loadURL("about:blank");
  });

  // Show once ready (avoids white flash on startup)
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  });

  // ── Window open handler ──────────────────────────────────────────────────────
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const u = url.toLowerCase();
    // Allow OAuth popups in a sandboxed child window
    if (
      u.includes("accounts.google.com") ||
      u.includes("clerk.") ||
      u.includes("clerk.dev") ||
      u.includes("accounts.dev")
    ) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width:  520,
          height: 700,
          parent: mainWindow,
          webPreferences: {
            nodeIntegration:  false,
            contextIsolation: true,
            partition:        "persist:livestorm",
          },
        },
      };
    }
    // All other external links → system browser
    shell.openExternal(url);
    return { action: "deny" };
  });

  // ── Navigation guard ─────────────────────────────────────────────────────────
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const appHost  = new URL(WEB_URL).hostname;
      const navHost  = new URL(url).hostname;
      const isInternal =
        navHost === appHost ||
        url.startsWith(APP_PROTOCOL + "://") ||
        navHost.endsWith(".clerk.com") ||
        navHost.endsWith(".clerk.dev") ||
        navHost.endsWith("accounts.google.com");
      if (!isInternal) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      // Ignore URL parse errors
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── Permissions (mic / camera / notifications) ───────────────────────────────

function setupPermissions() {
  const ALLOWED = new Set([
    "media",
    "notifications",
    "microphone",
    "camera",
    "audioCapture",
    "videoCapture",
    "geolocation",
  ]);

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(ALLOWED.has(permission));
    }
  );

  // Screen capture (for OBS virtual camera integration)
  if (session.defaultSession.setDisplayMediaRequestHandler) {
    session.defaultSession.setDisplayMediaRequestHandler(
      (_request, callback) => callback({}),
      { useSystemPicker: true }
    );
  }
}

// ─── Application menu (minimal) ──────────────────────────────────────────────

function buildMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(process.platform === "darwin"
          ? [{ type: "separator" }, { role: "front" }]
          : [{ role: "close" }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Deep link handler ────────────────────────────────────────────────────────

function handleDeepLink(url) {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
  // Dispatch to renderer so Clerk can handle the OAuth callback
  mainWindow.webContents
    .executeJavaScript(
      `window.dispatchEvent(new CustomEvent('electron-deep-link', { detail: ${JSON.stringify(url)} }))`
    )
    .catch(() => {});
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  setupPermissions();
  buildMenu();
  createWindow();
});

// macOS: Re-create window on dock click
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Windows/Linux: Quit on last window closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// macOS: Handle OAuth deep links via open-url
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Windows/Linux: Handle deep links from second instance
app.on("second-instance", (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  const deepLink = commandLine.find((arg) =>
    arg.startsWith(APP_PROTOCOL + "://")
  );
  if (deepLink) handleDeepLink(deepLink);
});

// ─── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle("get-platform",         () => process.platform);
ipcMain.handle("get-app-version",      () => app.getVersion());
ipcMain.handle("get-electron-version", () => process.versions.electron);
ipcMain.handle("is-dev",               () => isDev);
ipcMain.handle("get-web-url",          () => WEB_URL);

// ─── Startup log ─────────────────────────────────────────────────────────────

console.log(`
╔══════════════════════════════════════════════╗
║         LiveStorm AI — Desktop App           ║
║         Electron ${(process.versions.electron || "").padEnd(6)}  Node ${process.versions.node.padEnd(8)}     ║
║         Platform: ${process.platform.padEnd(27)}║
║         URL: ${WEB_URL.slice(0, 32).padEnd(32)}║
╚══════════════════════════════════════════════╝
`);
