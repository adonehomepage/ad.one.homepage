import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const loginId = process.env.E2E_LOGIN_ID || "teamadit";
const password = process.env.E2E_LOGIN_PASSWORD || "!adit1017";
const fixtures = path.join(os.tmpdir(), "adit-upload-test");

function ensureFixtures() {
  fs.mkdirSync(fixtures, { recursive: true });
  const okPng = path.join(fixtures, "ok.png");
  if (!fs.existsSync(okPng)) {
    fs.writeFileSync(
      okPng,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    );
  }
  const badTxt = path.join(fixtures, "bad.txt");
  if (!fs.existsSync(badTxt)) fs.writeFileSync(badTxt, "not-an-image");

  // 정상 MIME(image/gif) + 용량 초과 — 클라이언트는 GIF를 압축하지 않음
  const oversizeGif = path.join(fixtures, "oversize.gif");
  if (!fs.existsSync(oversizeGif) || fs.statSync(oversizeGif).size < 4_000_000) {
    const header = Buffer.from("GIF89a");
    const body = Buffer.alloc(4 * 1024 * 1024 - header.length, 0);
    fs.writeFileSync(oversizeGif, Buffer.concat([header, body]));
  }

  // 정상 MIME(image/jpeg) + 용량 초과 — API 직접 검증용
  const oversizeJpg = path.join(fixtures, "oversize.jpg");
  if (!fs.existsSync(oversizeJpg) || fs.statSync(oversizeJpg).size < 4_000_000) {
    const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const body = Buffer.alloc(4 * 1024 * 1024 - header.length, 0xff);
    fs.writeFileSync(oversizeJpg, Buffer.concat([header, body]));
  }
}

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
  await page.getByTestId("project-name").fill(`CRUD 검증 ${slug}`);
  await page.getByTestId("project-slug").fill(slug);
  await page.getByTestId("project-slug").blur();
  await page.getByTestId("create-project").click();
  await expect(page).toHaveURL(/\/editor/);
  await dismissEditorTip(page);
}

async function dismissEditorTip(page: Page) {
  const tip = page.getByText("문구·이미지를");
  if (await tip.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "확인" }).click().catch(() => undefined);
  }
}

async function waitDraftSaved(page: Page) {
  const status = page.getByRole("status").first();
  await expect.poll(async () => (await status.textContent())?.trim() || "", { timeout: 25_000 }).toMatch(/작업본 저장됨/);
}

function panel(page: Page) {
  // 오른쪽 속성 패널(선택 섹션 설정)
  return page.locator("aside").filter({ hasText: "선택 섹션 설정" });
}

function sectionRail(page: Page) {
  return page.locator("aside").filter({ has: page.getByRole("heading", { name: "섹션", exact: true }) });
}

async function selectSection(page: Page, name: string | RegExp) {
  await dismissEditorTip(page);
  await sectionRail(page).getByRole("button", { name, exact: typeof name === "string" }).first().click();
  await expect(panel(page)).toBeVisible();
}

async function getDraft(page: Page, projectId: string) {
  const res = await page.request.get(`/api/projects/${projectId}/draft`);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

function sectionOf(draft: { sections: Array<{ sectionType: string; content: Record<string, unknown> }> }, type: string) {
  return draft.sections.find((section) => section.sectionType === type);
}

/** 운영 템플릿에는 갤러리가 없다. E2E만 draft에 갤러리 섹션을 심는다. */
async function ensureGalleryFixture(page: Page, projectId: string) {
  const draft = await getDraft(page, projectId);
  if ((draft.sections as Array<{ sectionType: string }>).some((section) => section.sectionType === "gallery")) {
    return;
  }
  const galleryId = randomUUID();
  const sections = [...(draft.sections as Array<Record<string, unknown>>)];
  const floorIdx = sections.findIndex((section) => section.sectionType === "floorplan");
  const insertAt = floorIdx >= 0 ? floorIdx : Math.max(0, sections.length - 2);
  const gallery = {
    id: galleryId,
    projectId,
    rootSectionId: galleryId,
    sourceSectionId: null,
    sectionType: "gallery",
    title: "갤러리",
    gnbLabel: "갤러리",
    anchorId: "gallery",
    isOriginal: true,
    isRequired: false,
    isVisible: true,
    showInGnb: true,
    content: {
      heading: "갤러리",
      body: "",
      emptyImageLabel: "이미지",
      representativeLabel: "대표",
      images: [] as Array<{ url: string; alt: string }>,
    },
    settings: {},
    sortOrder: insertAt,
  };
  sections.splice(insertAt, 0, gallery);
  const next = sections.map((section, index) => ({ ...section, sortOrder: index }));
  const revision = Number(draft.project?.draftRevision ?? draft.draft?.revision ?? 0);
  const patch = await page.request.patch(`/api/projects/${projectId}/draft`, {
    data: { expectedRevision: revision, sections: next },
  });
  expect(patch.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("button", { name: "발행하기" })).toBeVisible({ timeout: 20_000 });
  await dismissEditorTip(page);
}

test("표·카드·갤러리·평면·FAQ CRUD 저장·새로고침·미리보기 유지", async ({ page }) => {
  test.setTimeout(400_000);
  ensureFixtures();
  const slug = `crud-${Date.now()}`;
  await loginAndCreateProject(page, slug);
  const projectId = page.url().match(/projects\/([^/]+)\/editor/)?.[1];
  expect(projectId).toBeTruthy();
  await ensureGalleryFixture(page, projectId!);

  // —— 사업개요 표(개요 항목) 추가·수정 ——
  await selectSection(page, /사업개요/);
  await expect(panel(page).getByRole("paragraph").filter({ hasText: /^개요 항목$/ })).toBeVisible();
  await panel(page).getByRole("button", { name: "항목 추가" }).first().click();
  await panel(page).getByRole("textbox", { name: "항목" }).last().fill("E2E 표행");
  await panel(page).getByRole("textbox", { name: "내용" }).last().fill("표행 값 유지");
  await waitDraftSaved(page);

  // —— 입지 카드 추가·수정 ——
  await selectSection(page, /입지/);
  await expect(panel(page).getByRole("paragraph").filter({ hasText: /^입지 카드$/ })).toBeVisible();
  await panel(page).getByRole("button", { name: "카드 추가" }).click();
  await panel(page).getByRole("textbox", { name: "제목" }).last().fill("E2E 카드");
  await panel(page).getByRole("textbox", { name: "설명" }).last().fill("카드 본문 유지");
  await waitDraftSaved(page);

  // —— 갤러리: URL로 사진 추가·수정 ——
  await selectSection(page, /^갤러리$/);
  await panel(page).getByRole("button", { name: "주소로 사진 추가" }).click();
  await panel(page).getByRole("textbox", { name: /이미지 주소/ }).last().fill("https://example.com/e2e-gallery.png");
  await panel(page).getByRole("textbox", { name: "설명" }).last().fill("E2E 갤러리 설명");
  await waitDraftSaved(page);

  // —— 평면 타입 추가·수정 ——
  await selectSection(page, /평면/);
  await panel(page).getByRole("button", { name: "타입 추가" }).click();
  await panel(page).getByRole("textbox", { name: "타입명" }).last().fill("E2E84A");
  await panel(page).getByRole("textbox", { name: "설명" }).last().fill("평면 타입 설명 유지");
  await waitDraftSaved(page);

  // —— FAQ 추가·수정 ——
  await selectSection(page, /FAQ/);
  await panel(page).getByRole("button", { name: "항목 추가" }).click();
  await panel(page).getByRole("textbox", { name: "질문" }).last().fill("E2E FAQ 질문?");
  await panel(page).getByRole("textbox", { name: "답변" }).last().fill("E2E FAQ 답변 유지");
  await waitDraftSaved(page);

  let draft = await getDraft(page, projectId!);
  expect(((sectionOf(draft, "overview")?.content.facts as Array<{ label: string; value: string }>) ?? []).some((f) => f.label === "E2E 표행" && f.value === "표행 값 유지")).toBeTruthy();
  expect(((sectionOf(draft, "location")?.content.cards as Array<{ title: string; body: string }>) ?? []).some((c) => c.title === "E2E 카드" && c.body === "카드 본문 유지")).toBeTruthy();
  expect(((sectionOf(draft, "gallery")?.content.images as Array<{ url?: string; alt: string }>) ?? []).some((img) => img.url === "https://example.com/e2e-gallery.png" && img.alt === "E2E 갤러리 설명")).toBeTruthy();
  expect(((sectionOf(draft, "floorplan")?.content.types as Array<{ name: string; summary: string }>) ?? []).some((t) => t.name === "E2E84A" && t.summary === "평면 타입 설명 유지")).toBeTruthy();
  expect(((sectionOf(draft, "faq")?.content.items as Array<{ question: string; answer: string }>) ?? []).some((item) => item.question === "E2E FAQ 질문?" && item.answer === "E2E FAQ 답변 유지")).toBeTruthy();

  // —— 새로고침 후 유지 ——
  await page.reload();
  await expect(page.getByRole("button", { name: "발행하기" })).toBeVisible({ timeout: 20_000 });
  draft = await getDraft(page, projectId!);
  expect(((sectionOf(draft, "overview")?.content.facts as Array<{ label: string }>) ?? []).some((f) => f.label === "E2E 표행")).toBeTruthy();
  expect(((sectionOf(draft, "location")?.content.cards as Array<{ title: string }>) ?? []).some((c) => c.title === "E2E 카드")).toBeTruthy();
  expect(((sectionOf(draft, "gallery")?.content.images as Array<{ alt: string }>) ?? []).some((i) => i.alt === "E2E 갤러리 설명")).toBeTruthy();
  expect(((sectionOf(draft, "floorplan")?.content.types as Array<{ name: string }>) ?? []).some((t) => t.name === "E2E84A")).toBeTruthy();
  expect(((sectionOf(draft, "faq")?.content.items as Array<{ question: string }>) ?? []).some((i) => i.question === "E2E FAQ 질문?")).toBeTruthy();

  // —— 미리보기 유지 ——
  await page.getByRole("button", { name: "미리보기" }).click();
  await expect(page.getByRole("button", { name: "편집 계속" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("E2E 표행").first()).toBeVisible();
  await expect(page.getByText("E2E 카드").first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "E2E84A" })).toBeVisible();
  await expect(page.getByText("E2E FAQ 질문?").first()).toBeVisible();
  await page.getByRole("button", { name: "편집 계속" }).click();

  async function clickDeleteNear(_fieldName: string | RegExp, value: string, preferLast = false) {
    const field = panel(page).locator(`input[value="${value}"], textarea:text-is("${value}")`).first();
    await expect(field).toBeVisible();
    await field.evaluate(
      (el, last) => {
        let node: HTMLElement | null = el.parentElement;
        while (node && node !== document.body) {
          if (node.className.includes("border") || node.className.includes("rounded")) {
            const buttons = Array.from(node.querySelectorAll("button.text-danger")) as HTMLButtonElement[];
            const enabled = buttons.filter((button) => !button.disabled);
            const button = last ? enabled[enabled.length - 1] : enabled[0];
            if (button) {
              button.click();
              return;
            }
          }
          node = node.parentElement;
        }
        throw new Error("삭제 버튼을 찾지 못함");
      },
      preferLast,
    );
  }

  // —— 삭제 ——
  await selectSection(page, /FAQ/);
  await clickDeleteNear("질문", "E2E FAQ 질문?");
  await waitDraftSaved(page);
  draft = await getDraft(page, projectId!);
  expect(((sectionOf(draft, "faq")?.content.items as Array<{ question: string }>) ?? []).some((i) => i.question === "E2E FAQ 질문?")).toBeFalsy();

  await selectSection(page, /^갤러리$/);
  await clickDeleteNear("설명", "E2E 갤러리 설명");
  await waitDraftSaved(page);
  draft = await getDraft(page, projectId!);
  expect(((sectionOf(draft, "gallery")?.content.images as Array<{ alt: string }>) ?? []).some((i) => i.alt === "E2E 갤러리 설명")).toBeFalsy();

  await selectSection(page, /입지/);
  await clickDeleteNear("제목", "E2E 카드");
  await waitDraftSaved(page);
  draft = await getDraft(page, projectId!);
  expect(((sectionOf(draft, "location")?.content.cards as Array<{ title: string }>) ?? []).some((c) => c.title === "E2E 카드")).toBeFalsy();

  await selectSection(page, /평면/);
  await clickDeleteNear("타입명", "E2E84A", true);
  await waitDraftSaved(page);
  draft = await getDraft(page, projectId!);
  expect(((sectionOf(draft, "floorplan")?.content.types as Array<{ name: string }>) ?? []).some((t) => t.name === "E2E84A")).toBeFalsy();

  await selectSection(page, /사업개요/);
  await clickDeleteNear("항목", "E2E 표행");
  await waitDraftSaved(page);
  draft = await getDraft(page, projectId!);
  expect(((sectionOf(draft, "overview")?.content.facts as Array<{ label: string }>) ?? []).some((f) => f.label === "E2E 표행")).toBeFalsy();
});

test("타입 거부·정상 MIME 용량 초과 분리 + 저장 실패 재시도", async ({ page }) => {
  test.setTimeout(300_000);
  ensureFixtures();
  const slug = `fail-${Date.now()}`;
  await loginAndCreateProject(page, slug);
  const projectId = page.url().match(/projects\/([^/]+)\/editor/)?.[1];
  expect(projectId).toBeTruthy();
  const status = page.getByRole("status").first();
  await selectSection(page, /상품 상단/);
  const heroFile = panel(page).locator('input[type="file"][accept*="image"]').first();

  // —— 1) 타입 거부 (지원하지 않는 파일) ——
  const badChooser = page.waitForEvent("filechooser");
  await heroFile.evaluate((el: HTMLInputElement) => {
    el.value = "";
    el.click();
  });
  await (await badChooser).setFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not-an-image"),
  });
  const typeAlert = panel(page).getByRole("alert").or(panel(page).locator(".text-danger")).filter({ hasText: /이미지·영상·PDF만|올릴 수 없습니다|지원하지|업로드/ });
  await expect(typeAlert.first()).toBeVisible({ timeout: 15_000 });
  const typeText = (await typeAlert.first().textContent()) ?? "";
  expect(typeText).not.toMatch(/3\.5MB/);

  // —— 2) 정상 MIME(image/gif) 용량 초과 — UI (GIF는 클라이언트 압축 없음) ——
  const gifChooser = page.waitForEvent("filechooser");
  await heroFile.evaluate((el: HTMLInputElement) => {
    el.value = "";
    el.click();
  });
  await (await gifChooser).setFiles({
    name: "oversize.gif",
    mimeType: "image/gif",
    buffer: fs.readFileSync(path.join(fixtures, "oversize.gif")),
  });
  const sizeAlert = panel(page).getByRole("alert").or(panel(page).locator(".text-danger")).filter({ hasText: /3\.5MB|줄여도|작아야/ });
  await expect(sizeAlert.first()).toBeVisible({ timeout: 15_000 });
  expect((await sizeAlert.first().textContent()) ?? "").not.toMatch(/이미지·영상·PDF만/);

  // —— 3) API: 정상 JPEG MIME + 용량 초과 ——
  const oversizeJpeg = await page.request.post("/api/uploads", {
    multipart: {
      projectId: projectId!,
      file: {
        name: "oversize.jpg",
        mimeType: "image/jpeg",
        buffer: fs.readFileSync(path.join(fixtures, "oversize.jpg")),
      },
    },
  });
  expect(oversizeJpeg.ok()).toBeFalsy();
  const jpegJson = await oversizeJpeg.json();
  expect(String(jpegJson.message ?? "")).toMatch(/3\.5MB/);
  expect(String(jpegJson.message ?? "")).not.toMatch(/이미지·영상·PDF만/);

  // —— 4) API: 타입 거부 ——
  const badMime = await page.request.post("/api/uploads", {
    multipart: {
      projectId: projectId!,
      file: {
        name: "bad.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("not-an-image"),
      },
    },
  });
  expect(badMime.ok()).toBeFalsy();
  const badJson = await badMime.json();
  expect(String(badJson.message ?? "")).toMatch(/이미지·영상·PDF만/);
  expect(String(badJson.message ?? "")).not.toMatch(/3\.5MB/);

  // —— 5) 저장 실패 → 다시 저장으로 복원 ——
  await page.route("**/api/projects/*/draft", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "강제 저장 실패", code: "INTERNAL" }),
      });
      return;
    }
    await route.continue();
  });

  await panel(page).getByRole("textbox", { name: /^히어로 제목/ }).fill(`저장실패복원-${slug}`);
  await expect(status).toContainText(/저장 실패/, { timeout: 15_000 });
  const retry = page.getByRole("alert").getByRole("button", { name: "다시 저장" });
  await expect(retry).toBeVisible({ timeout: 10_000 });
  await expect(status).not.toHaveText(/작업본 저장됨|^저장됨$/);

  await page.unroute("**/api/projects/*/draft");
  await retry.click();
  await expect.poll(async () => (await status.textContent())?.trim() || "", { timeout: 25_000 }).toMatch(/작업본 저장됨/);
  await expect(status).not.toHaveText(/저장 실패/);

  const draft = await getDraft(page, projectId!);
  expect(String(sectionOf(draft, "hero")?.content.headline ?? "")).toContain(`저장실패복원-${slug}`);
});
