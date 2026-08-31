import { REQUIRED_SECTION_TYPES } from "@/lib/constants";
import type { LeadFormField, PageSection, ProjectPrivacyConfig, TemplateCode } from "@/types";

function section(partial: Omit<PageSection, "projectId" | "rootSectionId" | "sourceSectionId" | "sortOrder"> & { id: string }): Omit<PageSection, "projectId" | "sortOrder"> {
  return {
    ...partial,
    rootSectionId: partial.id,
    sourceSectionId: null,
  };
}

export function defaultFormFields(): LeadFormField[] {
  return [
    { key: "name", type: "name", label: "이름", required: true, visible: true, includeInNotification: true },
    { key: "phone", type: "phone", label: "연락처", required: true, visible: true, includeInNotification: true },
    {
      key: "unitType",
      type: "select",
      label: "관심 타입",
      required: false,
      visible: true,
      includeInNotification: true,
      options: ["59㎡", "74㎡", "84㎡"],
    },
    { key: "inquiry", type: "textarea", label: "문의 내용", required: false, visible: true, includeInNotification: true },
  ];
}

export function placeholderPrivacy(): ProjectPrivacyConfig {
  return {
    collectingControllerName: "처리주체미정",
    operatingCompanyName: "운영법인미정",
    advertisingAgencyName: "광고사명미정",
    advertiserCompanyName: "광고주명미정",
    collectionPurpose: "해당 분양 현장의 상담 및 문의 응대",
    collectedFields: ["이름", "연락처", "문의 내용", "선택 질문"],
    retentionDescription: "목적 달성 후 또는 동의 철회 시까지. 운영 검토용 기본안은 별도 법무 확인이 필요합니다.",
    privacyPolicyUrl: "/privacy",
    thirdPartyProvisionEnabled: false,
    refusalConsequence: "동의를 거부하면 관심고객 등록 및 상담 안내가 제한될 수 있습니다.",
  };
}

function baseSections(code: TemplateCode): Array<Omit<PageSection, "projectId" | "sortOrder">> {
  const heroId = crypto.randomUUID();
  const overviewId = crypto.randomUUID();
  const locationId = crypto.randomUUID();
  const premiumId = crypto.randomUUID();
  const galleryId = crypto.randomUUID();
  const floorId = crypto.randomUUID();
  const directionsId = crypto.randomUUID();
  const formId = crypto.randomUUID();
  const legalId = crypto.randomUUID();

  return [
    section({
      id: heroId,
      sectionType: "hero",
      title: "히어로",
      gnbLabel: "홈",
      anchorId: "hero",
      isOriginal: true,
      isRequired: true,
      isVisible: true,
      showInGnb: false,
      content: {
        kicker: "신규 분양",
        headline: "현장명을 입력하세요",
        subheadline: "핵심 카피와 분양 안내를 여기에 작성합니다.",
        ctaLabel: "관심고객 등록",
        phoneLabel: "전화 문의",
        phone: "",
        mediaMode: code === "video-ready" ? "image" : "image",
        imageAssetId: null,
        mobileImageAssetId: null,
        videoAssetId: null,
        posterAssetId: null,
      },
      settings: { overlay: true, align: code === "image-focus" ? "left" : "center" },
    }),
    section({
      id: overviewId,
      sectionType: "overview",
      title: "사업개요",
      gnbLabel: "사업개요",
      anchorId: "overview",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: "사업개요",
        body: "규모, 위치, 세대수, 공급 일정 등 확정된 정보만 입력하세요. 추정 수치는 자동으로 만들지 않습니다.",
        facts: [
          { label: "위치", value: "입력 필요" },
          { label: "규모", value: "입력 필요" },
          { label: "세대수", value: "입력 필요" },
          { label: "입주", value: "입력 필요" },
        ],
      },
      settings: { layout: code === "image-focus" ? "grid" : "split" },
    }),
    section({
      id: locationId,
      sectionType: "location",
      title: "입지환경",
      gnbLabel: "입지",
      anchorId: "location",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: "입지환경",
        body: "교통, 생활권, 교육, 녹지 등 현장 주변 정보를 입력합니다.",
        cards: [
          { title: "교통", body: "주요 교통 정보를 입력하세요." },
          { title: "생활", body: "생활 인프라 정보를 입력하세요." },
          { title: "교육", body: "교육 환경 정보를 입력하세요." },
        ],
      },
      settings: { layout: code === "video-ready" ? "timeline" : "cards" },
    }),
    section({
      id: premiumId,
      sectionType: "premium",
      title: "프리미엄",
      gnbLabel: "프리미엄",
      anchorId: "premium",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: "프리미엄 / 특장점",
        items: [
          { title: "특장점 1", body: "실제 확인된 특장점만 작성하세요." },
          { title: "특장점 2", body: "광고 문구의 적법성은 담당자가 확인합니다." },
          { title: "특장점 3", body: "시스템이 분양 조건을 대신 검증하지 않습니다." },
        ],
      },
      settings: { layout: code === "image-focus" ? "feature" : "magazine" },
    }),
    section({
      id: galleryId,
      sectionType: "gallery",
      title: "갤러리",
      gnbLabel: "갤러리",
      anchorId: "gallery",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: "시설 / 갤러리",
        images: [] as Array<{ assetId: string; alt: string }>,
      },
      settings: { columns: code === "image-focus" ? 3 : 2 },
    }),
    section({
      id: floorId,
      sectionType: "floorplan",
      title: "타입 정보",
      gnbLabel: "타입",
      anchorId: "floorplan",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: "타입 / 평면 정보",
        types: [
          { name: "59㎡", summary: "타입 설명을 입력하세요.", imageAssetId: null },
          { name: "84㎡", summary: "타입 설명을 입력하세요.", imageAssetId: null },
        ],
      },
      settings: {},
    }),
    section({
      id: directionsId,
      sectionType: "directions",
      title: "오시는 길",
      gnbLabel: "오시는 길",
      anchorId: "directions",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: "오시는 길",
        address: "현장 주소를 입력하세요.",
        guide: "찾아오시는 방법과 주차 안내를 입력하세요.",
        mapImageAssetId: null,
      },
      settings: {},
    }),
    section({
      id: formId,
      sectionType: "lead_form",
      title: "관심고객 등록",
      gnbLabel: "관심고객",
      anchorId: "inquiry",
      isOriginal: true,
      isRequired: REQUIRED_SECTION_TYPES.includes("lead_form"),
      isVisible: true,
      showInGnb: true,
      content: {
        heading: "관심고객 등록",
        intro: "상담을 원하시면 아래 정보를 남겨 주세요. 담당자가 확인 후 연락드립니다.",
      },
      settings: {},
    }),
    section({
      id: legalId,
      sectionType: "legal",
      title: "법적 고지",
      gnbLabel: "고지",
      anchorId: "legal",
      isOriginal: true,
      isRequired: true,
      isVisible: true,
      showInGnb: false,
      content: {
        heading: "사업 주체 및 법적 고지",
        body: "시행, 시공, 광고 문의처, 분양 광고 관련 고지는 담당자가 직접 입력합니다. 미확정 정보는 사실처럼 표시하지 마세요.",
        advertiserName: "",
        agencyName: "",
        contact: "",
      },
      settings: {},
    }),
  ];
}

export const TEMPLATE_CATALOG = [
  {
    code: "image-focus" as const,
    name: "이미지 중심형",
    description: "대형 히어로 이미지와 정돈된 정보 구성의 분양 브랜드 사이트",
  },
  {
    code: "video-ready" as const,
    name: "영상 지원형",
    description: "히어로에서 이미지 또는 영상을 선택할 수 있는 시네마틱 레이아웃",
  },
];

export function createTemplateSections(code: TemplateCode, projectId: string): PageSection[] {
  return baseSections(code).map((item, index) => ({
    ...item,
    projectId,
    sortOrder: index,
  }));
}
