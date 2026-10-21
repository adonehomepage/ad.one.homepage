import { afterEach, describe, expect, it, vi } from "vitest";

describe("isAllowedOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows missing origin and same host", async () => {
    vi.stubEnv("APP_PUBLIC_URL", "https://example.com");
    vi.stubEnv("APP_ADMIN_URL", "https://example.com");
    vi.resetModules();
    const { isAllowedOrigin } = await import("@/lib/api/origin");
    expect(isAllowedOrigin(null, "https://example.com/api")).toBe(true);
    expect(isAllowedOrigin("https://example.com", "https://example.com/api")).toBe(true);
  });

  it("rejects foreign origins", async () => {
    vi.stubEnv("APP_PUBLIC_URL", "https://example.com");
    vi.stubEnv("APP_ADMIN_URL", "https://example.com");
    vi.resetModules();
    const { isAllowedOrigin } = await import("@/lib/api/origin");
    expect(isAllowedOrigin("https://evil.test", "https://example.com/api")).toBe(false);
  });

  it("assertRequestOrigin throws on foreign origin", async () => {
    vi.stubEnv("APP_PUBLIC_URL", "https://example.com");
    vi.stubEnv("APP_ADMIN_URL", "https://example.com");
    vi.resetModules();
    const { assertRequestOrigin } = await import("@/lib/api/origin");
    const req = new Request("https://example.com/api", {
      method: "POST",
      headers: { Origin: "https://evil.test" },
    });
    expect(() => assertRequestOrigin(req)).toThrowError(/허용되지 않은/);
  });

  it("assertRequestOrigin rejects cross-site without origin", async () => {
    vi.stubEnv("APP_PUBLIC_URL", "https://example.com");
    vi.stubEnv("APP_ADMIN_URL", "https://example.com");
    vi.resetModules();
    const { assertRequestOrigin } = await import("@/lib/api/origin");
    const req = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Sec-Fetch-Site": "cross-site" },
    });
    expect(() => assertRequestOrigin(req)).toThrowError(/허용되지 않은/);
  });

  it("assertPublicMutationOrigin requires origin or same-site metadata", async () => {
    vi.stubEnv("APP_PUBLIC_URL", "https://example.com");
    vi.stubEnv("APP_ADMIN_URL", "https://example.com");
    vi.resetModules();
    const { assertPublicMutationOrigin } = await import("@/lib/api/origin");
    expect(() =>
      assertPublicMutationOrigin(new Request("https://example.com/api", { method: "POST" })),
    ).toThrowError(/허용되지 않은/);
    expect(() =>
      assertPublicMutationOrigin(
        new Request("https://example.com/api", {
          method: "POST",
          headers: { "Sec-Fetch-Site": "same-origin" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      assertPublicMutationOrigin(
        new Request("https://example.com/api", {
          method: "POST",
          headers: { Origin: "https://example.com" },
        }),
      ),
    ).not.toThrow();
  });
});
