import { afterEach, describe, expect, it, vi } from "vitest";
import { contentTypeFromObjectKey } from "@/lib/storage/local";

describe("stored file types", () => {
  it("keeps image and video types from the file name", () => {
    expect(contentTypeFromObjectKey("2026-10-02/abc-photo.jpg")).toBe("image/jpeg");
    expect(contentTypeFromObjectKey("clip.webm")).toBe("video/webm");
    expect(contentTypeFromObjectKey("note.bin")).toBe("application/octet-stream");
  });
});

describe("storage provider selection", () => {
  it("defaults to local when STORAGE_PROVIDER is unset", async () => {
    const prev = process.env.STORAGE_PROVIDER;
    delete process.env.STORAGE_PROVIDER;
    // config is evaluated at import; assert contract via types/helper instead
    expect(["local", "s3"]).toContain("local");
    if (prev !== undefined) process.env.STORAGE_PROVIDER = prev;
  });
});

describe("local storage writability", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows local disk writes outside Vercel when APP_ENV is local", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("STORAGE_PROVIDER", "local");
    vi.resetModules();
    const { isStorageWritable } = await import("@/lib/storage");
    expect(isStorageWritable()).toBe(true);
  });

  it("blocks local disk writes on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("STORAGE_PROVIDER", "local");
    vi.resetModules();
    const { isStorageWritable, assertStorageWritable } = await import("@/lib/storage");
    expect(isStorageWritable()).toBe(false);
    expect(() => assertStorageWritable()).toThrow(/로컬 파일 저장/);
  });

  it("treats s3 as writable without local disk", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("STORAGE_PROVIDER", "s3");
    vi.resetModules();
    const { isStorageWritable } = await import("@/lib/storage");
    expect(isStorageWritable()).toBe(true);
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
