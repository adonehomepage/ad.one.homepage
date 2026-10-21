import path from "node:path";
import { describe, expect, it } from "vitest";
import { localFilePath } from "@/lib/storage/local";
import { appConfig } from "@/lib/config";

describe("localFilePath", () => {
  it("resolves under storage root", () => {
    const full = localFilePath("public-assets", "2026-01-01/abc-file.png");
    expect(full.startsWith(path.resolve(appConfig.storageLocalRoot))).toBe(true);
  });

  it("rejects path traversal", () => {
    expect(() => localFilePath("public-assets", "../secret.txt")).toThrow();
    expect(() => localFilePath("..", "x")).toThrow();
  });
});
