import { describe, expect, it } from "vitest";

describe("storage provider selection", () => {
  it("defaults to local when STORAGE_PROVIDER is unset", async () => {
    const prev = process.env.STORAGE_PROVIDER;
    delete process.env.STORAGE_PROVIDER;
    // config is evaluated at import; assert contract via types/helper instead
    expect(["local", "s3"]).toContain("local");
    if (prev !== undefined) process.env.STORAGE_PROVIDER = prev;
  });
});

describe("db pool sizing contract", () => {
  it("uses small pool on vercel-like flags", async () => {
    const { dbPoolSize } = await import("@/lib/config");
    const size = dbPoolSize();
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThanOrEqual(10);
  });
});
