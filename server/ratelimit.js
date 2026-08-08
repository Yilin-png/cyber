/* 内存版限流：单实例够用；将来多实例部署需换 Redis */

const buckets = new Map();

/* 定期清理过期桶，避免长跑进程内存无限增长 */
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000);
sweeper.unref?.();

function hit(key, { windowMs, max }) {
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

function reset(key) {
  buckets.delete(key);
}

/**
 * @param {object} opts
 * @param {number} opts.windowMs 时间窗
 * @param {number} opts.max 窗口内最大次数
 * @param {string} opts.scope 桶前缀，不同接口互不影响
 * @param {string} [opts.message]
 */
function limiter({ windowMs, max, scope, message }) {
  return (req, res, next) => {
    const key = `${scope}:${req.ip}`;
    const { allowed, retryAfterSec } = hit(key, { windowMs, max });
    if (allowed) return next();
    res.set("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: message || `操作过于频繁，请 ${retryAfterSec} 秒后再试`,
      retryAfterSec
    });
  };
}

module.exports = { limiter, hit, reset };
