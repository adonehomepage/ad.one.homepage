import { describe, expect, it } from "vitest";
import {
  canDuplicate,
  clampLaunchExcludedSection,
  clampLaunchExcludedSnapshot,
  countCopiesForRoot,
  duplicateSection,
  gnbItemsFromSections,
  isLaunchExcludedSectionType,
  pinSectionOrder,
  removeCloneSection,
} from "@/modules/sections/duplicate";
import type { PageSection, PageSnapshot } from "@/types";

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

  it("rejects FAQ and gallery duplication", () => {
    const faq = section({ id: "faq", rootSectionId: "faq", sectionType: "faq", isOriginal: true, sortOrder: 0 });
    expect(canDuplicate([faq], "faq")).toBe(false);
    expect(() => duplicateSection({ sections: [faq], selectedSectionId: "faq", projectId: "p1" })).toThrow();
    const gallery = section({ id: "gal", rootSectionId: "gal", sectionType: "gallery", isOriginal: true, sortOrder: 0 });
    expect(canDuplicate([gallery], "gal")).toBe(false);
    expect(() => duplicateSection({ sections: [gallery], selectedSectionId: "gal", projectId: "p1" })).toThrow();
  });

  it("clamps FAQ and gallery to hidden and out of GNB", () => {
    expect(isLaunchExcludedSectionType("faq")).toBe(true);
    expect(isLaunchExcludedSectionType("gallery")).toBe(true);
    expect(isLaunchExcludedSectionType("hero")).toBe(false);
    const faq = section({ id: "faq", rootSectionId: "faq", sectionType: "faq", isOriginal: true, sortOrder: 0, isVisible: true, showInGnb: true });
    const clamped = clampLaunchExcludedSection(faq);
    expect(clamped).toEqual({ ...faq, isVisible: false, showInGnb: false });
    expect(clampLaunchExcludedSection(clamped)).toEqual(clamped);
    const hero = section({ id: "hero", rootSectionId: "hero", sectionType: "hero", isOriginal: true, sortOrder: 0 });
    expect(clampLaunchExcludedSection(hero)).toBe(hero);
  });

  it("keeps oak-editorial FAQ visible even when templateCode is omitted", () => {
    const oakFaq = section({
      id: "faq",
      rootSectionId: "faq",
      sectionType: "faq",
      isOriginal: true,
      sortOrder: 0,
      isVisible: true,
      showInGnb: false,
      content: { oak: true, title: "FAQ" },
      settings: { oak: true },
    });
    expect(clampLaunchExcludedSection(oakFaq)).toBe(oakFaq);
    expect(clampLaunchExcludedSection(oakFaq, { templateCode: "oak-editorial" })).toBe(oakFaq);
    expect(clampLaunchExcludedSection(oakFaq, 3 as never)).toBe(oakFaq);
  });

  it("clamps FAQ and gallery inside a snapshot", () => {
    const faq = section({ id: "faq", rootSectionId: "faq", sectionType: "faq", isOriginal: true, sortOrder: 0, isVisible: true, showInGnb: true });
    const hero = section({ id: "hero", rootSectionId: "hero", sectionType: "hero", isOriginal: true, sortOrder: 1 });
    const snapshot = {
      sections: [faq, hero],
      projectName: "demo",
      publicSlug: "demo",
      globalSettings: {},
    } as PageSnapshot;
    const next = clampLaunchExcludedSnapshot(snapshot);
    expect(next.sections[0]).toMatchObject({ id: "faq", isVisible: false, showInGnb: false });
    expect(next.sections[1]).toMatchObject({ id: "hero", sectionType: "hero", isVisible: true });
    expect(next.projectName).toBe("demo");
  });

  it("keeps oak-editorial FAQ visible in snapshot clamp", () => {
    const oakFaq = section({
      id: "faq",
      rootSectionId: "faq",
      sectionType: "faq",
      isOriginal: true,
      sortOrder: 0,
      isVisible: true,
      content: { oak: true },
      settings: { oak: true },
    });
    const snapshot = {
      templateCode: "oak-editorial",
      sections: [oakFaq],
      projectName: "demo",
      publicSlug: "demo",
      globalSettings: {},
    } as PageSnapshot;
    const next = clampLaunchExcludedSnapshot(snapshot);
    expect(next.sections[0]).toMatchObject({ id: "faq", isVisible: true });
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

  it("keeps the hero first and the legal footer last", () => {
    const ordered = pinSectionOrder([
      section({ id: "legal", rootSectionId: "legal", sectionType: "legal", isOriginal: true, sortOrder: 0 }),
      section({ id: "overview", rootSectionId: "overview", sectionType: "overview", isOriginal: true, sortOrder: 1 }),
      section({ id: "hero", rootSectionId: "hero", sectionType: "hero", isOriginal: true, sortOrder: 2 }),
      section({ id: "form", rootSectionId: "form", sectionType: "lead_form", isOriginal: true, sortOrder: 3 }),
      section({ id: "gallery", rootSectionId: "gallery", sectionType: "gallery", isOriginal: true, sortOrder: 4 }),
    ]);
    expect(ordered.map((item) => item.sectionType)).toEqual(["hero", "overview", "lead_form", "gallery", "legal"]);
    expect(ordered.map((item) => item.sortOrder)).toEqual([0, 1, 2, 3, 4]);
  });

  it("removes only clones and rejects originals", () => {
    const original = section({ id: "root", rootSectionId: "root", isOriginal: true, sortOrder: 0 });
    const copy = section({
      id: "copy-1",
      rootSectionId: "root",
      isOriginal: false,
      sourceSectionId: "root",
      sortOrder: 1,
      anchorId: "location-copy1",
    });
    expect(() => removeCloneSection([original, copy], "root")).toThrow();
    const next = removeCloneSection([original, copy], "copy-1");
    expect(next.map((item) => item.id)).toEqual(["root"]);
    expect(next[0]?.sortOrder).toBe(0);
    expect(gnbItemsFromSections(next).map((item) => item.anchorId)).toEqual(["root"]);
  });
});
