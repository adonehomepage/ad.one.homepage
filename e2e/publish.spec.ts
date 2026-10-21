import { expect, test } from "@playwright/test";

const loginId = process.env.E2E_LOGIN_ID || "teamadit";
const password = process.env.E2E_LOGIN_PASSWORD || "!adit1017";

test("로그인 후 홈페이지를 만들고 발행·비공개·재공개한다", async ({ page }) => {
  const slug = `e2e-${Date.now()}`;

  await page.goto("/login?next=/admin/settings");
  await page.getByTestId("login-id").fill(loginId);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/admin\/settings/);
  await page.goto("/admin");

  await page.goto("/admin/projects/new");
  await page.getByTestId("template-image-focus").check({ force: true });
  await page.getByRole("button", { name: "제작하기" }).click();
  await page.getByTestId("project-name").fill(`E2E 현장 ${slug}`);
  await page.getByTestId("project-slug").fill("admin");
  await page.getByTestId("project-slug").blur();
  await expect(page.getByTestId("project-slug-error")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("project-slug").fill(slug);
  await page.getByTestId("project-slug").blur();
  await expect(page.getByTestId("project-slug-error")).toHaveCount(0, { timeout: 10_000 });
  await page.getByTestId("create-project").click();
  await expect(page).toHaveURL(new RegExp(`/admin/projects/.+/editor`));

  await expect(page.getByTestId("publish-button")).toBeVisible();
  await page.getByTestId("publish-button").click();
  await page.getByRole("button", { name: "이 내용으로 발행" }).click();
  await expect(page.getByText("발행됨")).toBeVisible({ timeout: 20_000 });

  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E 현장");

  await page.goto("/admin/projects");
  await page.getByRole("link", { name: new RegExp(`E2E 현장 ${slug}`) }).click();
  await expect(page.getByTestId("project-pause")).toBeVisible();
  await page.getByTestId("project-pause").click();
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click();
  await expect(page.getByTestId("project-action-message")).toContainText("즉시 비공개했습니다.", { timeout: 10_000 });

  await page.goto(`/${slug}`);
  await expect(page.getByTestId("unpublished-title")).toBeVisible();
  await expect(page.getByTestId("unpublished-body")).toContainText(/비공개|공개되지 않은|운영이 종료|발행되지 않았|일시 중지/);

  await page.goto("/admin/projects");
  await page.getByRole("link", { name: new RegExp(`E2E 현장 ${slug}`) }).click();
  await page.getByTestId("project-resume").click();
  await expect(page.getByTestId("project-action-message")).toContainText("다시 공개했습니다.", { timeout: 10_000 });

  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E 현장");

  await page.goto("/admin/projects");
  await page.getByRole("link", { name: new RegExp(`E2E 현장 ${slug}`) }).click();
  await page.getByTestId("open-analytics").click();
  await expect(page.getByRole("heading", { name: "통계" })).toBeVisible();
  await page.getByRole("link", { name: "최근 30일" }).click();
  await expect(page).toHaveURL(/days=30/);

  await page.goto("/admin/projects");
  await page.getByRole("link", { name: new RegExp(`E2E 현장 ${slug}`) }).click();
  await page.getByTestId("open-versions").click();
  await expect(page.getByTestId("version-restore").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("version-republish").first()).toBeVisible();
  await expect(page.getByTestId("version-open-editor").first()).toBeVisible();
  await page.getByTestId("version-preview-toggle").first().click();
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});
