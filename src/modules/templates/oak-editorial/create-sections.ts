import type { PageSection } from "@/types";
import { defaultOakEditorialData } from "./default-data";
import { applyOakSiteIdentity, oakSectionContents } from "./oak-data";
import type { OakEditorialData } from "./types";

function section(
  partial: Omit<PageSection, "projectId" | "sortOrder">,
): Omit<PageSection, "projectId" | "sortOrder"> {
  return partial;
}

/** oak-editorial 전용 섹션 시드 (directions 없음, FAQ 포함, HTML 앵커 유지) */
export function createOakEditorialSections(
  projectId: string,
  options?: {
    stableIds?: boolean;
    siteName?: string;
    data?: OakEditorialData;
  },
): PageSection[] {
  const id = (type: string) => (options?.stableIds ? `oak-preview-${type}` : crypto.randomUUID());
  let data = options?.data ?? defaultOakEditorialData();
  if (options?.siteName?.trim()) {
    data = applyOakSiteIdentity(data, { siteName: options.siteName.trim() });
  }
  const contents = oakSectionContents(data);

  const heroId = id("hero");
  const overviewId = id("overview");
  const spacesId = id("premium");
  const plansId = id("floorplan");
  const locationId = id("location");
  const faqId = id("faq");
  const formId = id("lead_form");
  const legalId = id("legal");

  const rows: Array<Omit<PageSection, "projectId" | "sortOrder">> = [
    section({
      id: heroId,
      rootSectionId: heroId,
      sourceSectionId: null,
      sectionType: "hero",
      title: "히어로",
      gnbLabel: "히어로",
      anchorId: "hero",
      isOriginal: true,
      isRequired: true,
      isVisible: true,
      showInGnb: false,
      content: contents.hero,
      settings: { oak: true },
    }),
    section({
      id: overviewId,
      rootSectionId: overviewId,
      sourceSectionId: null,
      sectionType: "overview",
      title: "사업개요",
      gnbLabel: data.nav.overview,
      anchorId: "overview",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: contents.overview,
      settings: { oak: true },
    }),
    section({
      id: spacesId,
      rootSectionId: spacesId,
      sourceSectionId: null,
      sectionType: "premium",
      title: "공간의 가치",
      gnbLabel: data.nav.spaces,
      anchorId: "spaces",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: contents.premium,
      settings: { oak: true },
    }),
    section({
      id: plansId,
      rootSectionId: plansId,
      sourceSectionId: null,
      sectionType: "floorplan",
      title: "평형 안내",
      gnbLabel: data.nav.plans,
      anchorId: "plans",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: contents.floorplan,
      settings: { oak: true },
    }),
    section({
      id: locationId,
      rootSectionId: locationId,
      sourceSectionId: null,
      sectionType: "location",
      title: "입지환경",
      gnbLabel: data.nav.location,
      anchorId: "location",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: contents.location,
      settings: { oak: true },
    }),
    section({
      id: faqId,
      rootSectionId: faqId,
      sourceSectionId: null,
      sectionType: "faq",
      title: "FAQ",
      gnbLabel: "FAQ",
      anchorId: "faq",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: false,
      content: contents.faq,
      settings: { oak: true },
    }),
    section({
      id: formId,
      rootSectionId: formId,
      sourceSectionId: null,
      sectionType: "lead_form",
      title: "관심고객 등록",
      gnbLabel: "관심고객 등록",
      anchorId: "register",
      isOriginal: true,
      isRequired: true,
      isVisible: true,
      showInGnb: true,
      content: contents.lead_form,
      settings: { oak: true },
    }),
    section({
      id: legalId,
      rootSectionId: legalId,
      sourceSectionId: null,
      sectionType: "legal",
      title: "푸터",
      gnbLabel: "푸터",
      anchorId: "legal",
      isOriginal: true,
      isRequired: true,
      isVisible: true,
      showInGnb: false,
      content: contents.legal,
      settings: { oak: true },
    }),
  ];

  return rows.map((item, index) => ({
    ...item,
    projectId,
    sortOrder: index,
  }));
}

export function isOakEditorialTemplate(code: string | undefined) {
  return code === "oak-editorial";
}
