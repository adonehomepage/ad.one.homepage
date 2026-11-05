import { describe, expect, it } from "vitest";
import { floorplanTabLabel, imageAltText, imageDisplayCaption, imageEditorCaption, withImageAlt } from "@/modules/templates/definitions";

describe("imageDisplayCaption / imageAltText", () => {
  it("uses legacy alt as display caption only when caption key is absent", () => {
    expect(imageDisplayCaption({ alt: "옛 설명" })).toBe("옛 설명");
    expect(imageAltText({ alt: "옛 설명" })).toBe("옛 설명");
    expect(imageEditorCaption({ alt: "옛 설명" })).toBe("옛 설명");
  });

  it("keeps caption and alt independent once caption exists", () => {
    expect(imageDisplayCaption({ caption: "화면 캡션", alt: "대체" })).toBe("화면 캡션");
    expect(imageAltText({ caption: "화면 캡션", alt: "대체" })).toBe("대체");
    expect(imageDisplayCaption({ caption: "", alt: "대체" })).toBe("");
    expect(imageAltText({ caption: "화면 캡션", alt: "" }, "fallback")).toBe("fallback");
    expect(imageEditorCaption({ caption: "", alt: "대체" })).toBe("");
  });

  it("freezes legacy display caption when alt is edited first", () => {
    const next = withImageAlt({ alt: "옛 설명" } as { alt: string; caption?: string }, "새 대체");
    expect(next.caption).toBe("옛 설명");
    expect(next.alt).toBe("새 대체");
    expect(imageDisplayCaption(next)).toBe("옛 설명");
    expect(imageAltText(next)).toBe("새 대체");
  });
});

describe("floorplanTabLabel", () => {
  it("falls back to name when tabLabel is empty", () => {
    expect(floorplanTabLabel({ name: "84A" })).toBe("84A");
    expect(floorplanTabLabel({ name: "84A", tabLabel: "84㎡" })).toBe("84㎡");
  });
});
