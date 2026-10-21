import { nanoid } from "nanoid";
import { MAX_SECTION_COPIES_PER_ORIGINAL } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import type { PageSection } from "@/types";
import { orgText } from "@/modules/admin/org-copy";

export function countCopiesForRoot(sections: Pick<PageSection, "rootSectionId" | "isOriginal">[], rootSectionId: string) {
  return sections.filter((section) => section.rootSectionId === rootSectionId && !section.isOriginal).length;
}

export function canDuplicate(sections: Pick<PageSection, "rootSectionId" | "isOriginal">[], rootSectionId: string) {
  return countCopiesForRoot(sections, rootSectionId) < MAX_SECTION_COPIES_PER_ORIGINAL;
}

const PINNED_TAIL = new Set(["lead_form", "legal"]);

/** 히어로는 맨 앞, 등록은 법적 고지 바로 앞, 법적 고지는 맨 뒤. 가운데 섹션 순서는 유지한다. */
export function pinSectionOrder<T extends { sectionType: string }>(sections: T[]): T[] {
  const heroes = sections.filter((section) => section.sectionType === "hero");
  const forms = sections.filter((section) => section.sectionType === "lead_form");
  const legals = sections.filter((section) => section.sectionType === "legal");
  const middle = sections.filter((section) => section.sectionType !== "hero" && !PINNED_TAIL.has(section.sectionType));
  return [...heroes, ...middle, ...forms, ...legals].map((section, index) => ({ ...section, sortOrder: index }));
}

export function duplicateSection(input: {
  sections: PageSection[];
  selectedSectionId: string;
  projectId: string;
}): PageSection[] {
  const selected = input.sections.find((section) => section.id === input.selectedSectionId);
  if (!selected) {
    throw new ApiError("NOT_FOUND", orgText("sectionNotFound"), 404);
  }
  if (!canDuplicate(input.sections, selected.rootSectionId)) {
    throw new ApiError("SECTION_COPY_LIMIT_EXCEEDED", orgText("sectionCopyLimit"));
  }

  const copyIndex = countCopiesForRoot(input.sections, selected.rootSectionId) + 1;
  const id = crypto.randomUUID();
  const cloned: PageSection = {
    ...structuredClone(selected),
    id,
    projectId: input.projectId,
    rootSectionId: selected.rootSectionId,
    sourceSectionId: selected.id,
    content: structuredClone(selected.content),
    settings: structuredClone(selected.settings),
    anchorId: `${selected.sectionType}-${nanoid(8)}`,
    title: selected.title,
    gnbLabel: selected.gnbLabel,
    sortOrder: selected.sortOrder + 1,
    isOriginal: false,
    isRequired: false,
  };

  const next = input.sections.map((section) =>
    section.sortOrder > selected.sortOrder ? { ...section, sortOrder: section.sortOrder + 1 } : section,
  );
  next.splice(
    next.findIndex((section) => section.id === selected.id) + 1,
    0,
    cloned,
  );
  return next.map((section, index) => ({ ...section, sortOrder: index }));
}

export function gnbItemsFromSections(sections: PageSection[]) {
  return sections
    .filter((section) => section.isVisible && section.showInGnb)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => ({
      label: section.gnbLabel || section.title,
      href: `#${section.anchorId}`,
      anchorId: section.anchorId,
    }));
}

export function reorderSections(sections: PageSection[], orderedIds: string[]) {
  const byId = new Map(sections.map((section) => [section.id, section]));
  return orderedIds.map((id, index) => {
    const section = byId.get(id);
    if (!section) {
      throw new ApiError("VALIDATION_ERROR", orgText("sectionOrderInvalid"));
    }
    return { ...section, sortOrder: index };
  });
}

export function copyLabel(title: string, copyIndex: number) {
  return orgText("sectionCopyLabel").replace("{title}", title).replace("{n}", String(copyIndex));
}
