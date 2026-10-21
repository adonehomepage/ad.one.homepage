import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

describe("shouldSkipCronWork", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("skips on preview by default", async () => {
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("CRON_ALLOW_NON_PROD", "");
    vi.stubEnv("VERCEL", "1");
    vi.resetModules();
    const { shouldSkipCronWork } = await import("@/lib/jobs/cron");
    expect(shouldSkipCronWork()).toBe(true);
  });

  it("runs on production", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("CRON_ALLOW_NON_PROD", "");
    vi.resetModules();
    const { shouldSkipCronWork } = await import("@/lib/jobs/cron");
    expect(shouldSkipCronWork()).toBe(false);
  });

  it("runs on preview when override is set", async () => {
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("CRON_ALLOW_NON_PROD", "true");
    vi.resetModules();
    const { shouldSkipCronWork } = await import("@/lib/jobs/cron");
    expect(shouldSkipCronWork()).toBe(false);
  });
});

describe("assertCron", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts matching bearer secret", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret-value");
    vi.resetModules();
    const { assertCron } = await import("@/lib/jobs/cron");
    const req = new NextRequest("http://localhost/api/jobs/expire-projects", {
      headers: { Authorization: "Bearer cron-secret-value" },
    });
    expect(() => assertCron(req)).not.toThrow();
  });

  it("rejects wrong secret", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret-value");
    vi.resetModules();
    const { assertCron } = await import("@/lib/jobs/cron");
    const req = new NextRequest("http://localhost/api/jobs/expire-projects", {
      headers: { Authorization: "Bearer wrong" },
    });
    expect(() => assertCron(req)).toThrowError(/작업 인증/);
  });
});
