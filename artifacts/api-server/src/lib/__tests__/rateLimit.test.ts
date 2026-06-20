import { describe, expect, it } from "vitest";
import { checkRateLimit, type RateLimitBucket } from "../rateLimit";

describe("in-memory rate limit helper", () => {
  it("allows requests until the configured limit is reached", () => {
    const buckets = new Map<string, RateLimitBucket>();

    expect(checkRateLimit(buckets, "user:1", 1_000, 60_000, 2)).toEqual({ allowed: true });
    expect(checkRateLimit(buckets, "user:1", 1_001, 60_000, 2)).toEqual({ allowed: true });

    const denied = checkRateLimit(buckets, "user:1", 1_002, 60_000, 2);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBe(60);
  });

  it("opens a new bucket after the window resets", () => {
    const buckets = new Map<string, RateLimitBucket>();

    expect(checkRateLimit(buckets, "user:1", 1_000, 60_000, 1).allowed).toBe(true);
    expect(checkRateLimit(buckets, "user:1", 1_001, 60_000, 1).allowed).toBe(false);
    expect(checkRateLimit(buckets, "user:1", 61_000, 60_000, 1).allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    const buckets = new Map<string, RateLimitBucket>();

    expect(checkRateLimit(buckets, "user:1", 1_000, 60_000, 1).allowed).toBe(true);
    expect(checkRateLimit(buckets, "user:2", 1_001, 60_000, 1).allowed).toBe(true);
    expect(checkRateLimit(buckets, "user:1", 1_002, 60_000, 1).allowed).toBe(false);
  });
});
