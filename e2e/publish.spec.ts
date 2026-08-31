import { expect, test } from "@playwright/test";

const loginId = process.env.E2E_LOGIN_ID || "teamadit";
const password = process.env.E2E_LOGIN_PASSWORD || "!adit1017";

test("로그인 후 홈페이지를 만들고 발행한다", async ({ page }) => {
  const slug = `e2e-${Date.now()}`;

  await page.goto("/login");
  await page.getByTestId("login-id").fill(loginId);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/projects/new");
  await page.getByTestId("project-name").fill(`E2E 현장 ${slug}`);
  await page.getByTestId("project-slug").fill(slug);
  await page.getByTestId("template-image-focus").check();
  await page.getByTestId("create-project").click();
  await expect(page).toHaveURL(new RegExp(`/admin/projects/.+/editor`));

  await expect(page.getByTestId("publish-button")).toBeVisible();
  await page.getByTestId("publish-button").click();
  await expect(page.getByText("발행됨")).toBeVisible({ timeout: 20_000 });

  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("E2E 현장")).toBeVisible();
});
