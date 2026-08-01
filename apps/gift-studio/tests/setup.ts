import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

// jsdom may expose a partial/broken SubtleCrypto. Always use Node's Web Crypto.
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
