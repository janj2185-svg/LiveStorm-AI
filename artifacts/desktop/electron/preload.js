"use strict";

const { contextBridge, ipcRenderer } = require("electron");

/**
 * Exposes a safe electronAPI surface to the renderer (web app).
 * The web app can detect it is running inside Electron via:
 *   if (window.electronAPI?.isElectron) { ... }
 */
contextBridge.exposeInMainWorld("electronAPI", {
  /** True when running inside the LiveStorm AI desktop app */
  isElectron: true,

  /** Current OS platform: "win32" | "darwin" | "linux" */
  platform: process.platform,

  /** Async helpers that invoke main-process IPC handlers */
  getPlatform:        () => ipcRenderer.invoke("get-platform"),
  getAppVersion:      () => ipcRenderer.invoke("get-app-version"),
  getElectronVersion: () => ipcRenderer.invoke("get-electron-version"),
  isDev:              () => ipcRenderer.invoke("is-dev"),
  getWebUrl:          () => ipcRenderer.invoke("get-web-url"),

  /**
   * Subscribe to Clerk OAuth deep-link callbacks.
   * The main process fires "electron-deep-link" CustomEvents on the window
   * when the app is opened via the `livestorm://` protocol.
   */
  onDeepLink: (callback) => {
    const handler = (event) => callback(event.detail);
    window.addEventListener("electron-deep-link", handler);
    return () => window.removeEventListener("electron-deep-link", handler);
  },
});
