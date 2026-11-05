import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const loginId = process.env.E2E_LOGIN_ID || "teamadit";
const password = process.env.E2E_LOGIN_PASSWORD || "!adit1017";

async function loginAndCreateProject(page: Page, slug: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.goto("/login");
    await page.getByTestId("login-id").fill(loginId);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-submit").click();
    try {
      await expect(page).toHaveURL(/\/admin/, { timeout: 8_000 });
      break;
    } catch {
      const limited = page.getByText(/잠시 후 다시|약 \d+분/);
      if (attempt === 3 || !(await limited.isVisible().catch(() => false))) throw new Error("로그인 실패");
      await page.waitForTimeout(90_000);
    }
  }

  await page.goto("/admin/projects/new");
  await page.getByTestId("template-foreon").locator("xpath=ancestor::button[1]").click();
  await page.getByRole("button", { name: "제작하기" }).click();
  await page.getByTestId("project-name").fill(`잔여검증 ${slug}`);
  await page.getByTestId("project-slug").fill(slug);
  await page.getByTestId("project-slug").blur();
  await page.getByTestId("create-project").click();
  await expect(page).toHaveURL(/\/editor/);
  const tip = page.getByText("문구·이미지를");
  if (await tip.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "확인" }).click().catch(() => undefined);
  }
}

function panel(page: Page) {
  return page.locator("aside").filter({ hasText: "선택 섹션 설정" });
}

function sectionRail(page: Page) {
  return page.locator("aside").filter({ has: page.getByRole("heading", { name: "섹션", exact: true }) });
}

async function waitDraftSaved(page: Page) {
  const status = page.getByRole("status").first();
  await expect.poll(async () => (await status.textContent())?.trim() || "", { timeout: 30_000 }).toMatch(/작업본 저장됨/);
}

test("TEST-009 느린 이전 저장이 최신 입력을 덮지 않음", async ({ page }) => {
  const slug = `race-${randomUUID().slice(0, 8)}`;
  await loginAndCreateProject(page, slug);
  const projectId = page.url().match(/projects\/([^/]+)\/editor/)?.[1];
  expect(projectId).toBeTruthy();

  let releaseFirst: (() => void) | undefined;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let patchCount = 0;
  const bodies: string[] = [];

  await page.route(`**/api/projects/${projectId}/draft`, async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.continue();
      return;
    }
    patchCount += 1;
    bodies.push(route.request().postData() || "");
    if (patchCount === 1) {
      await firstGate;
      await route.continue();
      return;
    }
    await route.continue();
  });

  await sectionRail(page).getByRole("button", { name: "상품 상단" }).click();
  const siteName = panel(page).getByRole("textbox", { name: /^현장명/ });
  const headline = panel(page).getByRole("textbox", { name: /^히어로 제목/ });

  await siteName.fill("레이스현장A");
  await expect.poll(() => patchCount, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);

  await headline.fill("독립광고제목-최종");
  await page.waitForTimeout(250);
  releaseFirst?.();

  await waitDraftSaved(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "발행하기" })).toBeVisible({ timeout: 20_000 });

  const draft = await page.request.get(`/api/projects/${projectId}/draft`).then((r) => r.json());
  const hero = (draft.sections as Array<{ sectionType: string; content: Record<string, unknown> }>).find((s) => s.sectionType === "hero");
  expect(String(draft.draft?.globalSettings?.siteName ?? draft.project?.name ?? "")).toContain("레이스현장A");
  expect(String(hero?.content.headline ?? "")).toBe("독립광고제목-최종");
  expect(bodies.some((b) => b.includes("독립광고제목-최종"))).toBeTruthy();
});

test("숨김↔GNB·Undo/Redo·PC/모바일↔미리보기 왕복", async ({ page }) => {
  const slug = `ux-${randomUUID().slice(0, 8)}`;
  await loginAndCreateProject(page, slug);

  // 팁 배너가 있으면 키보드 단축키/클릭을 가릴 수 있어 닫는다.
  const tip = page.getByText("문구·이미지를");
  if (await tip.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "확인" }).click().catch(() => undefined);
  }

  await sectionRail(page).getByRole("button", { name: "상품 상단" }).click();
  const headline = panel(page).getByRole("textbox", { name: /^히어로 제목/ });
  await headline.fill("언두리두제목");
  await waitDraftSaved(page);

  // Undo/Redo는 툴바 버튼이 아니라 Ctrl+Z / Ctrl+Shift+Z (입력 포커스 중에는 브라우저 기본 Undo)
  await headline.blur();
  await page.waitForTimeout(500);
  await page.locator('[aria-label="랜딩페이지 편집기"]').click({ position: { x: 20, y: 20 } });
  await page.keyboard.press("Control+z");
  await expect(headline).not.toHaveValue("언두리두제목");
  await page.keyboard.press("Control+Shift+z");
  await expect(headline).toHaveValue("언두리두제목");

  await sectionRail(page).getByRole("button", { name: "사업개요" }).click();
  await sectionRail(page).getByRole("switch", { name: /사업개요/ }).click();
  await waitDraftSaved(page);
  await expect(page.locator(".presale-foreon header nav a", { hasText: "사업개요" })).toHaveCount(0);

  await sectionRail(page).getByRole("switch", { name: /사업개요/ }).click();
  await waitDraftSaved(page);
  await expect(page.locator(".presale-foreon header nav a", { hasText: "사업개요" }).first()).toBeVisible();

  await page.getByRole("button", { name: "모바일" }).click();
  await page.getByRole("button", { name: "미리보기" }).click();
  await expect(page.getByRole("button", { name: "편집 계속" })).toBeVisible();
  const previewTitle = page.locator(".presale-foreon").getByText("언두리두제목").first();
  await previewTitle.scrollIntoViewIfNeeded();
  await expect(previewTitle).toBeVisible();
  await page.getByRole("button", { name: "편집 계속" }).click();
  await page.getByRole("button", { name: "PC" }).click();
  await sectionRail(page).getByRole("button", { name: "상품 상단" }).click();
  await expect(panel(page).getByRole("textbox", { name: /^히어로 제목/ })).toHaveValue("언두리두제목");
});

test("현장명 변경이 독립 히어로 제목·카피를 덮지 않음 + 입지 내부 갤러리 패널", async ({ page }) => {
  const slug = `link-${randomUUID().slice(0, 8)}`;
  await loginAndCreateProject(page, slug);
  const projectId = page.url().match(/projects\/([^/]+)\/editor/)?.[1];
  if (!projectId) throw new Error("editor project id missing");

  await sectionRail(page).getByRole("button", { name: "상품 상단" }).click();
  await panel(page).getByRole("textbox", { name: /^히어로 제목/ }).fill("광고 전용 헤드라인");
  await panel(page).getByRole("textbox", { name: /^핵심 카피/ }).fill("독립 리드 카피입니다");
  await waitDraftSaved(page);
  await panel(page).getByRole("textbox", { name: /^현장명/ }).fill("연동현장명변경");
  await waitDraftSaved(page);

  const draft = await page.request.get(`/api/projects/${projectId}/draft`).then((r) => r.json());
  const hero = (draft.sections as Array<{ sectionType: string; content: Record<string, unknown> }>).find((s) => s.sectionType === "hero");
  expect(String(draft.draft?.globalSettings?.siteName ?? "")).toBe("연동현장명변경");
  expect(String(hero?.content.headline ?? "")).toBe("광고 전용 헤드라인");
  expect(String(hero?.content.subheadline ?? "")).toBe("독립 리드 카피입니다");

  await sectionRail(page).getByRole("button", { name: /입지/ }).first().click();
  await expect(panel(page).getByText("입지 내부 갤러리")).toBeVisible();
  await expect(panel(page).getByText("독립 갤러리 섹션과는 별개")).toBeVisible();
  await panel(page).getByRole("button", { name: "주소로 사진 추가" }).click();
  await panel(page).getByRole("textbox", { name: /^이미지 주소/ }).first().fill("https://example.com/location-main.jpg");
  await panel(page).getByRole("textbox", { name: /^이미지 캡션/ }).first().fill("입지 대표 캡션");
  await waitDraftSaved(page);

  const after = await page.request.get(`/api/projects/${projectId}/draft`).then((r) => r.json());
  const location = (after.sections as Array<{ sectionType: string; content: { images?: Array<{ url?: string; alt?: string }> } }>).find(
    (s) => s.sectionType === "location",
  );
  expect(location?.content.images?.[0]?.url).toContain("location-main.jpg");
  expect(location?.content.images?.[0]?.alt).toBe("입지 대표 캡션");
  expect((after.sections as Array<{ sectionType: string }>).some((s) => s.sectionType === "gallery")).toBeFalsy();
});
