import { afterEach, describe, expect, it, vi } from "vitest";

describe("shouldExposeSandboxLinks", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("exposes links on local", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("EMAIL_PROVIDER", "postmark");
    vi.resetModules();
    const { shouldExposeSandboxLinks } = await import("@/lib/notifications");
    expect(shouldExposeSandboxLinks()).toBe(true);
  });

  it("exposes links when email is sandbox on preview", async () => {
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("EMAIL_PROVIDER", "sandbox");
    vi.resetModules();
    const { shouldExposeSandboxLinks } = await import("@/lib/notifications");
    expect(shouldExposeSandboxLinks()).toBe(true);
  });

  it("hides links when production uses a real mail provider", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "postmark");
    vi.resetModules();
    const { shouldExposeSandboxLinks } = await import("@/lib/notifications");
    expect(shouldExposeSandboxLinks()).toBe(false);
  });
});
