import { nanoid } from "nanoid";
import { MAX_SECTION_COPIES_PER_ORIGINAL } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import type { PageSection, PageSnapshot } from "@/types";
import { orgText } from "@/modules/admin/org-copy";
import {
  normalizeFormSettings,
  normalizeGlobalSettings,
  normalizePrivacySettings,
  normalizeSectionContent,
} from "@/modules/templates/definitions";

/** 출시 범위에서 제외(FAQ·독립 gallery). 복제·재표시·공개 노출을 막는다. */
export function isLaunchExcludedSectionType(sectionType: string) {
  return sectionType === "faq" || sectionType === "gallery";
}

/** oak-editorial FAQ는 본문 섹션이다. content/settings.oak 또는 템플릿 코드로 판별. */
export function isOakEditorialFaqSection(section: {
  sectionType: string;
  content?: unknown;
  settings?: unknown;
}) {
  if (section.sectionType !== "faq") return false;
  const content = section.content as Record<string, unknown> | undefined;
  const settings = section.settings as Record<string, unknown> | undefined;
  return content?.oak === true || settings?.oak === true;
}

export function clampLaunchExcludedSection<
  T extends { sectionType: string; isVisible: boolean; showInGnb: boolean; content?: unknown; settings?: unknown },
>(section: T, options?: { templateCode?: string } | number): T {
  // Array.map 두 번째 인자(index:number)와 옵션 객체를 구분한다.
  const templateCode = typeof options === "object" && options ? options.templateCode : undefined;
  if (templateCode === "oak-editorial" && section.sectionType === "faq") return section;
  // templateCode가 빠진 호출(draft GET·persist map)에서도 oak FAQ가 숨겨지지 않게 한다.
  if (isOakEditorialFaqSection(section)) return section;
  if (!isLaunchExcludedSectionType(section.sectionType)) return section;
  return { ...section, isVisible: false, showInGnb: false };
}

/** FAQ·gallery 숨김 + 섹션·폼·개인정보 상한. 공개·미리보기·발행 스냅샷에 쓴다.
 * oak-editorial은 HTML 시안의 FAQ를 본문에 포함하므로 FAQ clamp를 건너뛴다. */
export function clampLaunchExcludedSnapshot(snapshot: PageSnapshot): PageSnapshot {
  const allowOakFaq = snapshot.templateCode === "oak-editorial";
  return {
    ...snapshot,
    globalSettings: normalizeGlobalSettings((snapshot.globalSettings ?? {}) as Record<string, unknown>),
    formSettings: snapshot.formSettings ? normalizeFormSettings(snapshot.formSettings) : snapshot.formSettings,
    privacy: snapshot.privacy ? normalizePrivacySettings(snapshot.privacy) : snapshot.privacy,
    sections: snapshot.sections.map((section) => {
      const clamped = clampLaunchExcludedSection(section, {
        templateCode: allowOakFaq ? "oak-editorial" : snapshot.templateCode,
      });
      return {
        ...clamped,
        content: normalizeSectionContent(clamped.sectionType, (clamped.content ?? {}) as Record<string, unknown>),
      };
    }),
  };
}

export function countCopiesForRoot(sections: Pick<PageSection, "rootSectionId" | "isOriginal">[], rootSectionId: string) {
  return sections.filter((section) => section.rootSectionId === rootSectionId && !section.isOriginal).length;
}

export function canDuplicate(
  sections: Pick<PageSection, "rootSectionId" | "isOriginal" | "sectionType" | "id" | "content">[],
  rootSectionId: string,
  options?: { allowOakFaq?: boolean },
) {
  const root =
    sections.find((section) => section.id === rootSectionId) ??
    sections.find((section) => section.rootSectionId === rootSectionId && section.isOriginal);
  if (root && isLaunchExcludedSectionType(root.sectionType)) {
    const oakFaq =
      options?.allowOakFaq &&
      root.sectionType === "faq" &&
      Boolean((root.content as Record<string, unknown> | undefined)?.oak);
    if (!oakFaq) return false;
  }
  return countCopiesForRoot(sections, rootSectionId) < MAX_SECTION_COPIES_PER_ORIGINAL;
}

/** 히어로는 맨 앞, 법적 고지는 맨 뒤. 그 사이(관심고객 등록·오시는 길 포함) 순서는 유지한다. */
export function pinSectionOrder<T extends { sectionType: string }>(sections: T[]): T[] {
  const heroes = sections.filter((section) => section.sectionType === "hero");
  const legals = sections.filter((section) => section.sectionType === "legal");
  const middle = sections.filter((section) => section.sectionType !== "hero" && section.sectionType !== "legal");
  return [...heroes, ...middle, ...legals].map((section, index) => ({ ...section, sortOrder: index }));
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
  const allowOakFaq = Boolean((selected.content as Record<string, unknown> | undefined)?.oak) && selected.sectionType === "faq";
  if (isLaunchExcludedSectionType(selected.sectionType) && !allowOakFaq) {
    throw new ApiError("FORBIDDEN", orgText("sectionCopyExcluded"), 403);
  }
  if (!canDuplicate(input.sections, selected.rootSectionId, { allowOakFaq })) {
    throw new ApiError("SECTION_COPY_LIMIT_EXCEEDED", orgText("sectionCopyLimit"));
  }

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

/** 복제본만 제거한다. 원본·필수 섹션은 거부. 콘텐츠 숨기기(isVisible)와 별개다. */
export function removeCloneSection(sections: PageSection[], sectionId: string): PageSection[] {
  const target = sections.find((section) => section.id === sectionId);
  if (!target) {
    throw new ApiError("NOT_FOUND", orgText("sectionDeleteNotFound"), 404);
  }
  if (target.isOriginal || target.isRequired) {
    throw new ApiError("FORBIDDEN", orgText("sectionDeleteForbidden"));
  }
  return sections
    .filter((section) => section.id !== sectionId)
    .map((section, index) => ({ ...section, sortOrder: index }));
}

export function copyLabel(title: string, copyIndex: number) {
  return orgText("sectionCopyLabel").replace("{title}", title).replace("{n}", String(copyIndex));
}
