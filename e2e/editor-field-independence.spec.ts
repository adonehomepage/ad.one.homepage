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
  await page.getByTestId("project-name").fill(`필드독립 ${slug}`);
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

test("탭라벨·푸터자막·캡션/alt·프리미엄 갤러리 저장·새로고침·미리보기", async ({ page }) => {
  const slug = `ind-${randomUUID().slice(0, 8)}`;
  await loginAndCreateProject(page, slug);
  const projectId = page.url().match(/projects\/([^/]+)\/editor/)?.[1];
  if (!projectId) throw new Error("editor project id missing");

  // —— 평면: 타입명과 탭 라벨 분리 ——
  await sectionRail(page).getByRole("button", { name: /평면안내/ }).first().click();
  await panel(page).getByRole("textbox", { name: /^타입명/ }).first().fill("타입84A");
  await panel(page).getByRole("textbox", { name: /^탭 라벨/ }).first().fill("탭84");
  await waitDraftSaved(page);

  // —— 입지: caption / alt 분리 ——
  await sectionRail(page).getByRole("button", { name: /입지/ }).first().click();
  await panel(page).getByRole("button", { name: "주소로 사진 추가" }).click();
  await panel(page).getByRole("textbox", { name: /이미지 주소/ }).first().fill("https://example.com/loc.jpg");
  const locCaption = panel(page).getByRole("textbox", { name: /이미지 캡션/ }).first();
  await locCaption.scrollIntoViewIfNeeded();
  await locCaption.fill("입지캡션표시");
  const locAlt = panel(page).getByRole("textbox", { name: /대체 텍스트/ }).first();
  await locAlt.scrollIntoViewIfNeeded();
  await locAlt.fill("입지대체텍스트");
  await waitDraftSaved(page);

  // —— 프리미엄 내부 갤러리 ——
  await sectionRail(page).getByRole("button", { name: /프리미엄|특장점/ }).first().click();
  await expect(panel(page).getByText("특장점 갤러리")).toBeVisible();
  await panel(page).getByRole("button", { name: "주소로 사진 추가" }).click();
  await panel(page).getByRole("textbox", { name: /이미지 주소/ }).first().fill("https://example.com/premium.jpg");
  await panel(page).getByRole("textbox", { name: /이미지 캡션/ }).first().fill("프리미엄캡션");
  await panel(page).getByRole("textbox", { name: /대체 텍스트/ }).first().fill("프리미엄alt");
  await waitDraftSaved(page);

  // —— 푸터 보조 문구 (헤더 navSubtitle과 분리) ——
  await sectionRail(page).getByRole("button", { name: /법적 고지|고지/ }).first().click();
  await panel(page).getByRole("textbox", { name: /^푸터 보조 문구/ }).fill("푸터만보이는문구");
  await waitDraftSaved(page);

  // 새로고침 후 유지
  await page.reload();
  await expect(page.getByRole("button", { name: "발행하기" })).toBeVisible({ timeout: 20_000 });
  const tip = page.getByText("문구·이미지를");
  if (await tip.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "확인" }).click().catch(() => undefined);
  }

  const draft = await page.request.get(`/api/projects/${projectId}/draft`).then((r) => r.json());
  const floor = (draft.sections as Array<{ sectionType: string; content: { types?: Array<{ name?: string; tabLabel?: string }> } }>).find(
    (s) => s.sectionType === "floorplan",
  );
  const location = (draft.sections as Array<{ sectionType: string; content: { images?: Array<{ caption?: string; alt?: string }> } }>).find(
    (s) => s.sectionType === "location",
  );
  const premium = (draft.sections as Array<{ sectionType: string; content: { images?: Array<{ caption?: string; alt?: string; url?: string }> } }>).find(
    (s) => s.sectionType === "premium",
  );
  expect(floor?.content.types?.[0]?.name).toBe("타입84A");
  expect(floor?.content.types?.[0]?.tabLabel).toBe("탭84");
  expect(location?.content.images?.[0]?.caption).toBe("입지캡션표시");
  expect(location?.content.images?.[0]?.alt).toBe("입지대체텍스트");
  expect(premium?.content.images?.[0]?.url).toContain("premium.jpg");
  expect(premium?.content.images?.[0]?.caption).toBe("프리미엄캡션");
  expect(premium?.content.images?.[0]?.alt).toBe("프리미엄alt");

  const legal = (draft.sections as Array<{ sectionType: string; content: { footerSubtitle?: string } }>).find((s) => s.sectionType === "legal");
  expect(String(legal?.content.footerSubtitle ?? "")).toBe("푸터만보이는문구");
  expect(String(draft.draft?.globalSettings?.navSubtitle ?? "")).not.toBe("푸터만보이는문구");

  // 미리보기에서 탭 라벨·푸터 문구 노출
  await page.getByRole("button", { name: "미리보기" }).click();
  await expect(page.getByRole("button", { name: "편집 계속" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "탭84" })).toBeVisible();
  const footerText = page.locator("footer").getByText("푸터만보이는문구");
  await footerText.scrollIntoViewIfNeeded();
  await expect(footerText).toBeVisible();
  await page.getByRole("button", { name: "편집 계속" }).click();
});
