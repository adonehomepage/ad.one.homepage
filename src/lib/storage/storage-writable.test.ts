import { afterEach, describe, expect, it, vi } from "vitest";

describe("isStorageWritable", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows local provider on local env", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("STORAGE_PROVIDER", "local");
    vi.stubEnv("VERCEL", "");
    vi.resetModules();
    const { isStorageWritable } = await import("@/lib/storage");
    expect(isStorageWritable()).toBe(true);
  });

  it("blocks local provider on vercel", async () => {
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("STORAGE_PROVIDER", "local");
    vi.stubEnv("VERCEL", "1");
    vi.resetModules();
    const { isStorageWritable } = await import("@/lib/storage");
    expect(isStorageWritable()).toBe(false);
  });

  it("allows s3 anywhere", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("STORAGE_PROVIDER", "s3");
    vi.stubEnv("VERCEL", "1");
    vi.resetModules();
    const { isStorageWritable } = await import("@/lib/storage");
    expect(isStorageWritable()).toBe(true);
  });
});
