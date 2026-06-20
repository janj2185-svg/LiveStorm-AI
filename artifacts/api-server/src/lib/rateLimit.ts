export interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(
  buckets: Map<string, RateLimitBucket>,
  key: string,
  now: number,
  windowMs: number,
  maxRequests: number,
): RateLimitDecision {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function createInMemoryRateLimit({
  windowMs,
  maxRequests,
  keyPrefix,
  keyGenerator,
}: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  keyGenerator: (req: any) => string | undefined | null;
}) {
  const buckets = new Map<string, RateLimitBucket>();

  return (req: any, res: any, next: any) => {
    const rawKey = keyGenerator(req) ?? req.ip ?? "unknown";
    const decision = checkRateLimit(
      buckets,
      `${keyPrefix}:${rawKey}`,
      Date.now(),
      windowMs,
      maxRequests,
    );

    if (!decision.allowed) {
      res.setHeader("Retry-After", String(decision.retryAfterSeconds ?? 1));
      return res.status(429).json({ error: "rate_limited", detail: "Too many requests" });
    }

    return next();
  };
}
