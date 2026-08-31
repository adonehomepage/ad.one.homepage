import { describe, expect, it } from "vitest";
import { canDuplicate, countCopiesForRoot, duplicateSection, gnbItemsFromSections } from "@/modules/sections/duplicate";
import type { PageSection } from "@/types";

function section(partial: Partial<PageSection> & Pick<PageSection, "id" | "rootSectionId" | "isOriginal" | "sortOrder">): PageSection {
  return {
    projectId: "p1",
    sourceSectionId: null,
    sectionType: "location",
    title: "입지환경",
    content: { heading: "입지" },
    settings: {},
    isVisible: true,
    showInGnb: true,
    gnbLabel: "입지",
    anchorId: partial.anchorId ?? partial.id,
    isRequired: false,
    ...partial,
  };
}

describe("section duplication", () => {
  it("allows up to 3 copies per original", () => {
    const original = section({ id: "root", rootSectionId: "root", isOriginal: true, sortOrder: 0 });
    let sections = [original];
    for (let i = 0; i < 3; i += 1) {
      sections = duplicateSection({ sections, selectedSectionId: original.id, projectId: "p1" });
    }
    expect(countCopiesForRoot(sections, "root")).toBe(3);
    expect(canDuplicate(sections, "root")).toBe(false);
    expect(() => duplicateSection({ sections, selectedSectionId: original.id, projectId: "p1" })).toThrow();
  });

  it("deep-copies content and assigns a new anchor", () => {
    const original = section({ id: "root", rootSectionId: "root", isOriginal: true, sortOrder: 0, content: { heading: "A" } });
    const next = duplicateSection({ sections: [original], selectedSectionId: "root", projectId: "p1" });
    const copy = next.find((item) => !item.isOriginal)!;
    copy.content.heading = "B";
    expect(original.content.heading).toBe("A");
    expect(copy.anchorId).not.toBe(original.anchorId);
    expect(copy.rootSectionId).toBe("root");
  });

  it("keeps GNB in the same order as visible sections", () => {
    const sections = [
      section({ id: "a", rootSectionId: "a", isOriginal: true, sortOrder: 0, showInGnb: true, gnbLabel: "A", isVisible: true }),
      section({ id: "b", rootSectionId: "b", isOriginal: true, sortOrder: 1, showInGnb: true, gnbLabel: "B", isVisible: false }),
      section({ id: "c", rootSectionId: "c", isOriginal: true, sortOrder: 2, showInGnb: true, gnbLabel: "C", isVisible: true }),
    ];
    expect(gnbItemsFromSections(sections).map((item) => item.label)).toEqual(["A", "C"]);
  });
});
