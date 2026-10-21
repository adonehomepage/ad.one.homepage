import { describe, expect, it } from "vitest";
import { consumeRateLimit, rateLimitBucketCount, resetRateLimitBuckets } from "@/lib/auth/rate-limit";

describe("consumeRateLimit", () => {
  it("allows until max then blocks with retryAt", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    expect(consumeRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = consumeRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAt).toBeGreaterThan(Date.now());
  });

  it("prunes when bucket map grows large", () => {
    resetRateLimitBuckets();
    for (let i = 0; i < 5_100; i += 1) {
      consumeRateLimit(`grow:${i}`, 1, 60_000);
    }
    expect(rateLimitBucketCount()).toBeLessThan(5_100);
    resetRateLimitBuckets();
  });
});
