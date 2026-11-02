/** 内存限流：单 isolate 够用；多 isolate 各自计数，仍可挡住暴力爆破 */

const buckets = new Map();

export function hit(key, { windowMs, max }) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= max,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

export function reset(key) {
  buckets.delete(key);
}

export function limiter({ windowMs, max, scope, message }) {
  return async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
    const key = `${scope}:${ip}`;
    const { allowed, retryAfterSec } = hit(key, { windowMs, max });
    if (allowed) return next();
    c.header("Retry-After", String(retryAfterSec));
    return c.json(
      {
        error: message || `操作过于频繁，请 ${retryAfterSec} 秒后再试`,
        retryAfterSec
      },
      429
    );
  };
}
