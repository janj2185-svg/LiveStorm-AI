import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 4317 },
  preview: { port: 4318 },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    css: false
  }
});
