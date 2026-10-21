type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;
let consumeCalls = 0;

function pruneExpired(now: number) {
  consumeCalls += 1;
  const forceSweep = buckets.size >= MAX_BUCKETS;
  // 만료 키는 주기적으로도 정리해 메모리 잔존을 줄인다
  if (!forceSweep && consumeCalls % 32 !== 0) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
  if (buckets.size < MAX_BUCKETS) return;
  const entries = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  for (let i = 0; i < Math.ceil(entries.length / 2); i += 1) {
    buckets.delete(entries[i]![0]);
  }
}

export function consumeRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  pruneExpired(now);
  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (current.count >= max) {
    return { ok: false, remaining: 0, retryAt: current.resetAt };
  }
  current.count += 1;
  return { ok: true, remaining: max - current.count };
}

/** 테스트용 */
export function resetRateLimitBuckets() {
  buckets.clear();
  consumeCalls = 0;
}

export function rateLimitBucketCount() {
  return buckets.size;
}
