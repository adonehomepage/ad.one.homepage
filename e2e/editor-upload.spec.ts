import { expect, test } from "@playwright/test";
import path from "node:path";
import os from "node:os";

const loginId = process.env.E2E_LOGIN_ID || "teamadit";
const password = process.env.E2E_LOGIN_PASSWORD || "!adit1017";
const fixtures = path.join(os.tmpdir(), "adit-upload-test");

test("편집기 이미지 업로드·실패·저장 상태·새로고침 유지", async ({ page }) => {
  const slug = `upload-${Date.now()}`;

  await page.goto("/login");
  await page.getByTestId("login-id").fill(loginId);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/projects/new");
  await page.getByTestId("template-foreon").locator("xpath=ancestor::button[1]").click();
  await page.getByRole("button", { name: "제작하기" }).click();
  await page.getByTestId("project-name").fill(`업로드 검증 ${slug}`);
  await page.getByTestId("project-slug").fill(slug);
  await page.getByTestId("project-slug").blur();
  await page.getByTestId("create-project").click();
  await expect(page).toHaveURL(/\/editor/);

  const status = page.getByRole("status").first();

  // 지원하지 않는 파일
  const badChooser = page.waitForEvent("filechooser");
  await page.locator('input[type="file"][accept*="image"]').first().evaluate((el: HTMLInputElement) => el.click());
  const badInput = await badChooser;
  await badInput.setFiles(path.join(fixtures, "bad.txt"));
  await expect(page.getByRole("alert").or(page.locator(".text-danger")).first()).toBeVisible({ timeout: 10_000 });

  // 정상 PNG 업로드 (히어로 또는 속성 패널 첫 이미지 input)
  const okChooser = page.waitForEvent("filechooser");
  await page.locator('input[type="file"][accept*="image"]').first().evaluate((el: HTMLInputElement) => {
    el.value = "";
    el.click();
  });
  const okInput = await okChooser;
  await okInput.setFiles(path.join(fixtures, "ok.png"));

  // 저장 대기 → 저장 중 → 작업본 저장됨 (서버 성공 전 '저장됨' 단독 표시 금지)
  await expect(status).toContainText(/저장 대기|저장 중|작업본 저장됨/, { timeout: 15_000 });
  await expect.poll(async () => (await status.textContent())?.trim() || "", { timeout: 20_000 }).toMatch(/작업본 저장됨|저장됨/);
  await expect(status).not.toHaveText(/^저장됨$/);

  // draft에 이미지 URL이 들어갔는지
  const projectId = page.url().match(/projects\/([^/]+)\/editor/)?.[1];
  expect(projectId).toBeTruthy();
  const draft = await page.request.get(`/api/projects/${projectId}/draft`);
  expect(draft.ok()).toBeTruthy();
  const draftJson = await draft.json();
  const hero = (draftJson.sections as Array<{ sectionType: string; content: Record<string, unknown> }>).find(
    (section) => section.sectionType === "hero",
  );
  const imageUrl = String(hero?.content.imageUrl ?? "");
  expect(imageUrl.length).toBeGreaterThan(0);

  // 새로고침 후 유지
  await page.reload();
  await expect(page.getByRole("button", { name: "발행하기" })).toBeVisible({ timeout: 20_000 });
  const draft2 = await page.request.get(`/api/projects/${projectId}/draft`);
  const draft2Json = await draft2.json();
  const hero2 = (draft2Json.sections as Array<{ sectionType: string; content: Record<string, unknown> }>).find(
    (section) => section.sectionType === "hero",
  );
  expect(String(hero2?.content.imageUrl ?? "")).toBe(imageUrl);

  // 미리보기에서도 이미지 노출
  await page.getByRole("button", { name: "미리보기" }).click();
  await expect(page.locator(`img[src*="${imageUrl.split("/").pop()}"]`).or(page.locator(`img[src="${imageUrl}"]`)).first()).toBeVisible({
    timeout: 10_000,
  });

  // 용량 초과(API) — UI 압축 경로와 별도로 서버/클라이언트 거절 확인
  const oversize = await page.request.post("/api/uploads", {
    multipart: {
      projectId: projectId!,
      file: {
        name: "big.bin",
        mimeType: "application/octet-stream",
        buffer: Buffer.alloc(4 * 1024 * 1024, 1),
      },
    },
  });
  expect(oversize.ok()).toBeFalsy();
});
