import { describe, expect, it } from "vitest";
import { draftPatchSchema } from "@/lib/validation/draft";

const section = {
  id: "sec-1",
  projectId: "proj-1",
  rootSectionId: "sec-1",
  sourceSectionId: null,
  sectionType: "hero" as const,
  title: "히어로",
  content: { headline: "안녕" },
  settings: {},
  isVisible: true,
  showInGnb: true,
  gnbLabel: "홈",
  anchorId: "hero",
  sortOrder: 0,
  isOriginal: true,
  isRequired: true,
};

describe("draftPatchSchema", () => {
  it("accepts a valid patch", () => {
    const parsed = draftPatchSchema.safeParse({ expectedRevision: 1, sections: [section] });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown section types", () => {
    const parsed = draftPatchSchema.safeParse({
      expectedRevision: 1,
      sections: [{ ...section, sectionType: "unknown" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects oversized content", () => {
    const parsed = draftPatchSchema.safeParse({
      expectedRevision: 1,
      sections: [{ ...section, content: { blob: "x".repeat(200_000) } }],
    });
    expect(parsed.success).toBe(false);
  });
});
