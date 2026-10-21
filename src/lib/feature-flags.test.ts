import { afterEach, describe, expect, it, vi } from "vitest";

describe("featureFlags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("hides lead admin in production when collection is off", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("LEAD_COLLECTION_ENABLED", "false");
    vi.stubEnv("FEATURE_LEAD_ADMIN", "");
    vi.resetModules();
    const { featureFlags } = await import("@/lib/feature-flags");
    expect(featureFlags().leadAdmin).toBe(false);
    expect(featureFlags().leadCollection).toBe(false);
  });

  it("shows lead admin in local by default", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("LEAD_COLLECTION_ENABLED", "false");
    vi.stubEnv("FEATURE_LEAD_ADMIN", "");
    vi.resetModules();
    const { featureFlags } = await import("@/lib/feature-flags");
    expect(featureFlags().leadAdmin).toBe(true);
  });

  it("allows FEATURE_LEAD_ADMIN override in production", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("LEAD_COLLECTION_ENABLED", "false");
    vi.stubEnv("FEATURE_LEAD_ADMIN", "true");
    vi.resetModules();
    const { featureFlags } = await import("@/lib/feature-flags");
    expect(featureFlags().leadAdmin).toBe(true);
  });
});
