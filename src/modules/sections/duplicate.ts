import { nanoid } from "nanoid";
import { MAX_SECTION_COPIES_PER_ORIGINAL } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import type { PageSection } from "@/types";

export function countCopiesForRoot(sections: Pick<PageSection, "rootSectionId" | "isOriginal">[], rootSectionId: string) {
  return sections.filter((section) => section.rootSectionId === rootSectionId && !section.isOriginal).length;
}

export function canDuplicate(sections: Pick<PageSection, "rootSectionId" | "isOriginal">[], rootSectionId: string) {
  return countCopiesForRoot(sections, rootSectionId) < MAX_SECTION_COPIES_PER_ORIGINAL;
}

export function duplicateSection(input: {
  sections: PageSection[];
  selectedSectionId: string;
  projectId: string;
}): PageSection[] {
  const selected = input.sections.find((section) => section.id === input.selectedSectionId);
  if (!selected) {
    throw new ApiError("NOT_FOUND", "복제할 섹션을 찾을 수 없습니다.", 404);
  }
  if (!canDuplicate(input.sections, selected.rootSectionId)) {
    throw new ApiError("SECTION_COPY_LIMIT_EXCEEDED", "원본 섹션당 복제본은 최대 3개까지 만들 수 있습니다.");
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
      throw new ApiError("VALIDATION_ERROR", "섹션 순서가 올바르지 않습니다.");
    }
    return { ...section, sortOrder: index };
  });
}

export function copyLabel(title: string, copyIndex: number) {
  return `${title} · 복제 ${copyIndex}`;
}
