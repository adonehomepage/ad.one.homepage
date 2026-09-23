import { afterEach, describe, expect, it, vi } from "vitest";

async function loadFresh() {
  vi.resetModules();
  return {
    deploy: await import("@/lib/deploy-env"),
    flags: await import("@/lib/feature-flags"),
  };
}

describe("deploy-env helpers", () => {
  afterEach(() => {
    delete process.env.APP_ENV;
  });

  it("maps prod aliases to production", async () => {
    process.env.APP_ENV = "prod";
    const { deploy } = await loadFresh();
    expect(deploy.getDeployEnv()).toBe("production");
    expect(deploy.isProd()).toBe(true);
    expect(deploy.isNonProd()).toBe(false);
  });

  it("maps preview/dev to preview", async () => {
    process.env.APP_ENV = "dev";
    const { deploy } = await loadFresh();
    expect(deploy.getDeployEnv()).toBe("preview");
    expect(deploy.isPreview()).toBe(true);
  });
});

describe("featureFlags cronWork", () => {
  afterEach(() => {
    delete process.env.APP_ENV;
    delete process.env.VERCEL;
    delete process.env.CRON_ALLOW_NON_PROD;
    delete process.env.FEATURE_LEAD_ADMIN;
    delete process.env.LEAD_COLLECTION_ENABLED;
  });

  it("skips cron on Vercel preview", async () => {
    process.env.APP_ENV = "preview";
    process.env.VERCEL = "1";
    const { flags } = await loadFresh();
    expect(flags.featureFlags().cronWork).toBe(false);
  });

  it("runs cron on production", async () => {
    process.env.APP_ENV = "production";
    process.env.VERCEL = "1";
    const { flags } = await loadFresh();
    expect(flags.featureFlags().cronWork).toBe(true);
  });

  it("runs cron on local without VERCEL", async () => {
    process.env.APP_ENV = "local";
    delete process.env.VERCEL;
    const { flags } = await loadFresh();
    expect(flags.featureFlags().cronWork).toBe(true);
  });

  it("hides leadAdmin on production when collection disabled", async () => {
    process.env.APP_ENV = "production";
    process.env.LEAD_COLLECTION_ENABLED = "false";
    const { flags } = await loadFresh();
    expect(flags.featureFlags().leadAdmin).toBe(false);
  });

  it("shows leadAdmin on production when FEATURE_LEAD_ADMIN=true", async () => {
    process.env.APP_ENV = "production";
    process.env.LEAD_COLLECTION_ENABLED = "false";
    process.env.FEATURE_LEAD_ADMIN = "true";
    const { flags } = await loadFresh();
    expect(flags.featureFlags().leadAdmin).toBe(true);
  });
});
