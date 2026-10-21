import { afterEach, describe, expect, it, vi } from "vitest";

describe("getDeployEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("maps prod to production", async () => {
    vi.stubEnv("APP_ENV", "prod");
    vi.resetModules();
    const { getDeployEnv, isProd, isLocal } = await import("@/lib/deploy-env");
    expect(getDeployEnv()).toBe("production");
    expect(isProd()).toBe(true);
    expect(isLocal()).toBe(false);
  });

  it("maps local", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.resetModules();
    const { getDeployEnv, isLocal } = await import("@/lib/deploy-env");
    expect(getDeployEnv()).toBe("local");
    expect(isLocal()).toBe(true);
  });
});
