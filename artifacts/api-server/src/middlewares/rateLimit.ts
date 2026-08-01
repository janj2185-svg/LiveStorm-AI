import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-node / local and small VPS deployments.
 * For multi-node production, replace with Redis-backed limiting.
 */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  keyFn?: (req: Request) => string;
}) {
  const { windowMs, max, keyPrefix = "rl", keyFn } = opts;

  return (req: Request, res: Response, next: NextFunction) => {
    const id =
      keyFn?.(req) ??
      `${keyPrefix}:${req.ip ?? "unknown"}:${req.method}:${req.path}`;
    const now = Date.now();
    let bucket = buckets.get(id);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(id, bucket);
    }
    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      });
    }
    return next();
  };
}

/** Periodic cleanup to avoid unbounded Map growth */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 60_000).unref?.();
