import { describe, expect, it } from "vitest";
import { defaultOakEditorialData } from "./default-data";
import { applyOakSiteIdentity, catchUpOakSiteName, linkOakSiteName, settleOakSpaceItems } from "./oak-data";
import type { OakEditorialData } from "./types";

function named(name: string): OakEditorialData {
  return applyOakSiteIdentity(defaultOakEditorialData(), { siteName: name });
}

describe("linkOakSiteName", () => {
  it("renames logo, title, side label, footer wordmark, and floating together", () => {
    const data = named("옛 단지");
    const next = linkOakSiteName(data, data.hero.title, "새 단지");
    expect(next?.brandName).toBe("새 단지");
    expect(next?.logoText).toBe("새 단지");
    expect(next?.hero.title).toBe("새 단지");
    expect(next?.hero.sideEyebrow).toBe("새 단지");
    expect(next?.hero.sideHeadline).toBe(data.hero.sideHeadline);
    expect(next?.footer.wordmark).toBe("새 단지");
    expect(next?.floatingBrand).toBe("새 단지");
    expect(next?.footer.copyright).toBe("© 새 단지 — SAMPLE 2026");
    expect(next?.overview.specs.find((row) => row.label === "사업명")?.value).toBe("새 단지 (예시)");
    expect(next?.logoSubtitle).toBe("OFFICIAL");
  });

  it("keeps a footer wordmark that was written separately", () => {
    const data = named("옛 단지");
    data.footer.wordmark = "별도 표기";
    const next = linkOakSiteName(data, data.hero.title, "새 단지");
    expect(next?.footer.wordmark).toBe("별도 표기");
    expect(next?.logoText).toBe("새 단지");
    expect(next?.floatingBrand).toBe("새 단지");
  });

  it("does not overwrite a custom headline when the logo name changes", () => {
    const data = named("옛 단지");
    data.hero.title = "광안리 오션뷰의 완성";
    const next = linkOakSiteName(data, data.logoText, "새 단지");
    expect(next?.hero.title).toBe("광안리 오션뷰의 완성");
    expect(next?.logoText).toBe("새 단지");
    expect(next?.footer.wordmark).toBe("새 단지");
    expect(next?.floatingBrand).toBe("새 단지");
    expect(next?.brandName).toBe("새 단지");
  });

  it("leaves a custom side label alone", () => {
    const data = named("옛 단지");
    data.hero.sideEyebrow = "분양 홈페이지 예시";
    const next = linkOakSiteName(data, data.hero.sideEyebrow, "프리미엄");
    expect(next).toBeNull();
  });

  it("catches footer and floating up when only the title was renamed earlier", () => {
    const data = named("테스트2");
    data.hero.title = "테스트 현장";
    const caught = catchUpOakSiteName(data);
    expect(caught?.hero.title).toBe("테스트 현장");
    expect(caught?.logoText).toBe("테스트 현장");
    expect(caught?.brandName).toBe("테스트 현장");
    expect(caught?.hero.sideEyebrow).toBe("테스트 현장");
    expect(caught?.footer.wordmark).toBe("테스트 현장");
    expect(caught?.floatingBrand).toBe("테스트 현장");
    expect(caught?.footer.copyright).toContain("테스트 현장");
    expect(caught?.hero.sideHeadline).toBe(data.hero.sideHeadline);

    const renamed = linkOakSiteName(data, data.hero.title, "새 현장");
    expect(renamed?.footer.wordmark).toBe("새 현장");
    expect(renamed?.floatingBrand).toBe("새 현장");
    expect(renamed?.logoText).toBe("새 현장");
  });
});

describe("settleOakSpaceItems", () => {
  it("adds the fourth sample card to the old three-card set once", () => {
    const data = defaultOakEditorialData();
    data.spaces.items = data.spaces.items.slice(0, 3);
    const next = settleOakSpaceItems(data);
    expect(next.spaces.items).toHaveLength(4);
    expect(next.spaces.items[3]?.title).toBe("스마트 라이프");
    expect(next.spaces.itemCapSettled).toBe(true);
    const trimmed = settleOakSpaceItems({
      ...next,
      spaces: { ...next.spaces, items: next.spaces.items.slice(0, 3) },
    });
    expect(trimmed.spaces.items).toHaveLength(3);
  });

  it("leaves a custom three-card set alone", () => {
    const data = defaultOakEditorialData();
    data.spaces.items = data.spaces.items.slice(0, 3).map((item, index) => ({ ...item, title: `맞춤 ${index}` }));
    const next = settleOakSpaceItems(data);
    expect(next.spaces.items).toHaveLength(3);
    expect(next.spaces.itemCapSettled).toBeUndefined();
  });
});
