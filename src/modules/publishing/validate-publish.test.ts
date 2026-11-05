import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { assertPublishable, collectPublishErrors } from "@/modules/publishing/validate-publish";
import type { PageSection, PageSnapshot } from "@/types";

function section(partial: Partial<PageSection> & Pick<PageSection, "id" | "sectionType">): PageSection {
  const defaultContent =
    partial.sectionType === "hero"
      ? { imageUrl: "https://example.com/hero.jpg" }
      : partial.sectionType === "legal"
        ? { notices: [{ text: "본 페이지의 분양 정보는 참고용입니다." }] }
        : {};
  return {
    projectId: "p1",
    rootSectionId: partial.id,
    sourceSectionId: null,
    title: partial.sectionType,
    content: defaultContent,
    settings: {},
    isVisible: true,
    showInGnb: true,
    gnbLabel: partial.sectionType,
    anchorId: partial.id,
    isOriginal: true,
    isRequired: false,
    sortOrder: 0,
    ...partial,
  };
}

function snapshot(overrides: Partial<PageSnapshot> = {}): PageSnapshot {
  const base = {
    templateCode: "foreon" as const,
    projectName: "demo",
    publicSlug: "demo",
    phone: "010-1234-5678",
    sections: [
      section({ id: "hero", sectionType: "hero" }),
      section({ id: "form", sectionType: "lead_form" }),
      section({ id: "legal", sectionType: "legal" }),
    ],
    globalSettings: {},
    formSettings: {
      intro: "",
      successMessage: "",
      fields: [
        { key: "name", type: "name" as const, label: "이름", required: true },
        { key: "phone", type: "phone" as const, label: "연락처", required: true },
      ],
    },
    privacy: {
      collectingControllerName: "애드잇",
      collectionPurpose: "상담",
      collectedFields: ["이름", "연락처"],
      retentionDescription: "1년",
      thirdPartyProvisionEnabled: false,
    },
    seoSettings: { title: "", description: "", ogImageAssetId: null },
  } as PageSnapshot;
  return {
    ...base,
    ...overrides,
    formSettings: { ...base.formSettings, ...overrides.formSettings },
    privacy: { ...base.privacy, ...overrides.privacy },
    sections: overrides.sections ?? base.sections,
  };
}

describe("collectPublishErrors", () => {
  it("accepts a complete snapshot", () => {
    expect(collectPublishErrors(snapshot())).toEqual([]);
  });

  it("accepts info template snapshots", () => {
    expect(collectPublishErrors(snapshot({ templateCode: "info" }))).toEqual([]);
  });

  it("accepts info hero from middayPresaleData when section hero image is empty", () => {
    const errors = collectPublishErrors(
      snapshot({
        templateCode: "info",
        globalSettings: {
          middayPresaleData: {
            product: { mainImage: { url: "/samples/presale-premium/hero-main.png" } },
          },
        },
        sections: [
          section({ id: "hero", sectionType: "hero", content: {} }),
          section({ id: "form", sectionType: "lead_form" }),
          section({ id: "legal", sectionType: "legal", content: { body: "안내" } }),
        ],
      }),
    );
    expect(errors.some((item) => item.includes("대표 이미지"))).toBe(false);
  });

  it("rejects placeholder collecting controller in every environment", () => {
    const errors = collectPublishErrors(snapshot({ privacy: { ...snapshot().privacy, collectingControllerName: "처리주체미정" } }));
    expect(errors.some((item) => item.includes("처리 주체"))).toBe(true);
  });

  it("rejects empty collecting controller", () => {
    const errors = collectPublishErrors(snapshot({ privacy: { ...snapshot().privacy, collectingControllerName: "  " } }));
    expect(errors.some((item) => item.includes("수집 주체"))).toBe(true);
  });

  it("rejects hero without a representative image", () => {
    const errors = collectPublishErrors(
      snapshot({
        sections: [
          section({ id: "hero", sectionType: "hero", content: {} }),
          section({ id: "form", sectionType: "lead_form" }),
          section({ id: "legal", sectionType: "legal" }),
        ],
      }),
    );
    expect(errors.some((item) => item.includes("대표 이미지"))).toBe(true);
  });

  it("accepts oak-editorial hero photos and footer copy", () => {
    const errors = collectPublishErrors(
      snapshot({
        templateCode: "oak-editorial",
        sections: [
          section({
            id: "hero",
            sectionType: "hero",
            content: { photos: [{ src: "/samples/presale-premium/hero-main.png", alt: "단지" }] },
          }),
          section({ id: "form", sectionType: "lead_form" }),
          section({
            id: "legal",
            sectionType: "legal",
            content: { copyright: "© 임시 현장 — SAMPLE 2026", wordmark: "임시 현장" },
          }),
        ],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("rejects empty phone and empty footer info", () => {
    expect(collectPublishErrors(snapshot({ phone: "  " })).some((item) => item.includes("대표 전화"))).toBe(true);
    const errors = collectPublishErrors(
      snapshot({
        sections: [
          section({ id: "hero", sectionType: "hero" }),
          section({ id: "form", sectionType: "lead_form" }),
          section({ id: "legal", sectionType: "legal", content: { body: "  ", notices: [{ text: "  " }] } }),
        ],
      }),
    );
    expect(errors.some((item) => item.includes("푸터 안내"))).toBe(true);
  });

  it("rejects incomplete third-party provision fields", () => {
    const errors = collectPublishErrors(
      snapshot({
        privacy: {
          ...snapshot().privacy,
          thirdPartyProvisionEnabled: true,
          thirdPartyRecipientName: "",
          thirdPartyPurpose: "",
          thirdPartyFields: [],
          thirdPartyRetentionDescription: "",
        },
      }),
    );
    expect(errors.some((item) => item.includes("제3자"))).toBe(true);
  });

  it("rejects placeholder third-party recipient names", () => {
    const errors = collectPublishErrors(
      snapshot({
        privacy: {
          ...snapshot().privacy,
          thirdPartyProvisionEnabled: true,
          thirdPartyRecipientName: "광고주명미정",
          thirdPartyPurpose: "상담",
          thirdPartyFields: ["이름"],
          thirdPartyRetentionDescription: "1년",
        },
      }),
    );
    expect(errors.some((item) => item.includes("제3자"))).toBe(true);
  });

  it("throws ApiError via assertPublishable", () => {
    expect(() => assertPublishable(snapshot({ projectName: "" }))).toThrow(ApiError);
  });
});
