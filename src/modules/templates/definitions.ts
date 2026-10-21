import { REQUIRED_SECTION_TYPES } from "@/lib/constants";
import type { LeadFormField, PageSection, ProjectPrivacyConfig, TemplateCode } from "@/types";

function section(partial: Omit<PageSection, "projectId" | "rootSectionId" | "sourceSectionId" | "sortOrder"> & { id: string }): Omit<PageSection, "projectId" | "sortOrder"> {
  return {
    ...partial,
    rootSectionId: partial.id,
    sourceSectionId: null,
  };
}

export const SECTION_EYEBROW_KEY: Record<string, string> = {
  overview: "eyebrowOverview",
  location: "eyebrowLocation",
  premium: "eyebrowPremium",
  gallery: "eyebrowGallery",
  floorplan: "eyebrowFloorplan",
  lead_form: "eyebrowLeadForm",
  directions: "eyebrowDirections",
};

const SECTION_EYEBROW_FALLBACK: Record<string, string> = {
  overview: "사업 정보",
  location: "입지",
  premium: "특장점",
  gallery: "갤러리",
  floorplan: "평면",
  lead_form: "등록",
  directions: "찾아오는 길",
};

function seedText(settings: Record<string, unknown> | undefined, key: string, fallback: string) {
  return String(settings?.[key] ?? "").trim() || fallback;
}

export function hasSectionEyebrow(sectionType: string) {
  return Boolean(SECTION_EYEBROW_KEY[sectionType]);
}

export function sectionEyebrowDefaults(settings?: Record<string, unknown>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [sectionType, key] of Object.entries(SECTION_EYEBROW_KEY)) {
    next[sectionType] = seedText(settings, key, SECTION_EYEBROW_FALLBACK[sectionType] ?? "");
  }
  return next;
}

/** 설정 없이 쓰는 기본 눈썹. 화면에서는 sectionEyebrowText(settings, type)를 쓴다. */
export const SECTION_EYEBROW: Record<string, string> = sectionEyebrowDefaults();

export function sectionEyebrowText(settings: Record<string, unknown> | undefined, sectionType: string) {
  const key = SECTION_EYEBROW_KEY[sectionType];
  if (!key) return "";
  return seedText(settings, key, SECTION_EYEBROW_FALLBACK[sectionType] ?? "");
}

export function floorSpecLabels(settings?: Record<string, unknown>) {
  return {
    exclusive: seedText(settings, "floorSpecExclusive", "전용"),
    supply: seedText(settings, "floorSpecSupply", "공급"),
    rooms: seedText(settings, "floorSpecRooms", "구성"),
  };
}

/** 설정 없이 쓰는 기본 평면 라벨. 신규·편집은 floorSpecLabels(settings)를 쓴다. */
export const FLOOR_SPEC_LABELS = floorSpecLabels();

export const GALLERY_IMAGE_MAX = 10;

export const LOCATION_MATRIX_ICONS = ["transit", "life", "school", "nature"] as const;
export type LocationMatrixIcon = (typeof LOCATION_MATRIX_ICONS)[number];
export type LocationMatrixItem = { icon: LocationMatrixIcon; label: string; body: string };

export function locationMatrixDefaults(settings?: Record<string, unknown>): LocationMatrixItem[] {
  return [
    { icon: "transit", label: seedText(settings, "iconTransit", "교통"), body: seedText(settings, "seedMatrixTransit", "주요 교통을 입력하세요.") },
    { icon: "life", label: seedText(settings, "iconLife", "생활"), body: seedText(settings, "seedMatrixLife", "생활 인프라를 입력하세요.") },
    { icon: "school", label: seedText(settings, "iconSchool", "교육"), body: seedText(settings, "seedMatrixSchool", "교육 환경을 입력하세요.") },
    { icon: "nature", label: seedText(settings, "iconGreen", "녹지"), body: seedText(settings, "seedMatrixNature", "공원과 녹지를 입력하세요.") },
  ];
}

/** 설정 없이 쓰는 기본 입지 칸. 신규 프로젝트 시드는 locationMatrixDefaults(settings)를 쓴다. */
export const LOCATION_MATRIX_DEFAULTS: LocationMatrixItem[] = locationMatrixDefaults();

export function locationMatrix(content: { matrix?: LocationMatrixItem[] }): LocationMatrixItem[] | null {
  if (!Array.isArray(content.matrix)) return null;
  return LOCATION_MATRIX_DEFAULTS.map((fallback, index) => {
    const row = content.matrix?.[index];
    const icon = LOCATION_MATRIX_ICONS.includes(row?.icon as LocationMatrixIcon) ? (row?.icon as LocationMatrixIcon) : fallback.icon;
    return {
      icon,
      label: String(row?.label ?? fallback.label),
      body: String(row?.body ?? ""),
    };
  });
}

export const PREMIUM_ICONS = ["community", "park", "parking", "view", "transit", "school", "security", "home"] as const;
export type PremiumIcon = (typeof PREMIUM_ICONS)[number];
export type PremiumItem = { title: string; body: string; imageUrl?: string; icon: PremiumIcon };
export const PREMIUM_ITEM_MAX = 6;

export function premiumItems(value: unknown): PremiumItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, PREMIUM_ITEM_MAX).map((item, index) => {
    const row = item as { title?: string; body?: string; imageUrl?: string; icon?: string };
    const fallback = PREMIUM_ICONS[index % PREMIUM_ICONS.length] ?? "community";
    const icon = PREMIUM_ICONS.includes(row.icon as PremiumIcon) ? (row.icon as PremiumIcon) : fallback;
    return {
      title: String(row.title ?? ""),
      body: String(row.body ?? ""),
      imageUrl: row.imageUrl ? String(row.imageUrl) : "",
      icon,
    };
  });
}

export function unitTypeNames(types: Array<{ name?: string }>) {
  return types.map((type) => (type.name ?? "").trim()).filter(Boolean);
}

export type FloorplanImage = { url: string; alt: string };
export type FloorplanSpec = { label: string; value: string };
export const FLOORPLAN_SPEC_MAX = 12;

export function floorplanSpecs(
  type: { specs?: FloorplanSpec[]; exclusiveArea?: string; supplyArea?: string; rooms?: string },
  settings?: Record<string, unknown>,
): FloorplanSpec[] {
  if (Array.isArray(type.specs) && type.specs.length > 0) {
    return type.specs.slice(0, FLOORPLAN_SPEC_MAX).map((spec) => ({ label: String(spec.label ?? ""), value: String(spec.value ?? "") }));
  }
  const labels = floorSpecLabels(settings);
  return [
    { label: labels.exclusive, value: String(type.exclusiveArea ?? "") },
    { label: labels.supply, value: String(type.supplyArea ?? "") },
    { label: labels.rooms, value: String(type.rooms ?? "") },
  ];
}

export function withFloorplanSpecs<T extends { specs?: FloorplanSpec[]; exclusiveArea?: string; supplyArea?: string; rooms?: string }>(
  type: T,
  specs: FloorplanSpec[],
  settings?: Record<string, unknown>,
): T {
  const next = specs.slice(0, FLOORPLAN_SPEC_MAX);
  const labels = floorSpecLabels(settings);
  const valueOf = (label: string) => next.find((spec) => spec.label.trim() === label)?.value;
  return {
    ...type,
    specs: next,
    exclusiveArea: valueOf(labels.exclusive) ?? type.exclusiveArea ?? "",
    supplyArea: valueOf(labels.supply) ?? type.supplyArea ?? "",
    rooms: valueOf(labels.rooms) ?? type.rooms ?? "",
  };
}

export function floorplanImages(type: { name?: string; imageUrl?: string; images?: FloorplanImage[] }, settings?: Record<string, unknown>): FloorplanImage[] {
  const listed = (type.images ?? []).filter((image) => image.url);
  if (listed.length > 0) return listed;
  if (type.imageUrl) return [{ url: type.imageUrl, alt: type.name || seedText(settings, "eyebrowFloorplan", "평면") }];
  return [];
}

export function withFloorplanImages<T extends { imageUrl?: string; images?: FloorplanImage[]; activeImageIndex?: number }>(
  type: T,
  images: FloorplanImage[],
  activeImageIndex = type.activeImageIndex ?? 0,
): T {
  const index = images.length > 0 ? Math.min(Math.max(activeImageIndex, 0), images.length - 1) : 0;
  return { ...type, images, imageUrl: images[index]?.url ?? "", activeImageIndex: index };
}

export function withUnitTypeOptions(fields: LeadFormField[], names: string[]) {
  if (names.length === 0) return fields;
  return fields.map((field) => (field.key === "unitType" && field.type === "select" ? { ...field, options: names } : field));
}

export function defaultFormFields(settings?: Record<string, unknown>): LeadFormField[] {
  return [
    {
      key: "name",
      type: "name",
      label: seedText(settings, "formFieldName", "이름"),
      placeholder: seedText(settings, "formNamePh", "홍길동"),
      required: true,
      visible: true,
      includeInNotification: true,
    },
    {
      key: "phone",
      type: "phone",
      label: seedText(settings, "formFieldPhone", "연락처"),
      placeholder: seedText(settings, "formPhonePh", "010-0000-0000"),
      required: true,
      visible: true,
      includeInNotification: true,
    },
    {
      key: "unitType",
      type: "select",
      label: seedText(settings, "formFieldUnitType", "관심 타입"),
      required: false,
      visible: true,
      includeInNotification: true,
      options: ["59㎡", "74㎡", "84㎡"],
    },
    {
      key: "inquiry",
      type: "textarea",
      label: seedText(settings, "formFieldInquiry", "문의 내용"),
      placeholder: seedText(settings, "formTextareaPh", "궁금하신 점을 남겨 주세요"),
      required: false,
      visible: true,
      includeInNotification: true,
    },
  ];
}

export function placeholderPrivacy(settings?: Record<string, unknown>): ProjectPrivacyConfig {
  return {
    collectingControllerName: "처리주체미정",
    operatingCompanyName: "운영법인미정",
    advertisingAgencyName: "광고사명미정",
    advertiserCompanyName: "광고주명미정",
    collectionPurpose: seedText(settings, "privacyPurpose", "해당 분양 현장의 상담 및 문의 응대"),
    collectedFields: [
      seedText(settings, "formFieldName", "이름"),
      seedText(settings, "formFieldPhone", "연락처"),
      seedText(settings, "formFieldInquiry", "문의 내용"),
      seedText(settings, "privacyOptionalField", "선택 질문"),
    ],
    retentionDescription: seedText(
      settings,
      "privacyRetentionBody",
      "목적 달성 후 또는 동의 철회 시까지. 운영 검토용 기본안은 별도 법무 확인이 필요합니다.",
    ),
    privacyPolicyUrl: "/privacy",
    thirdPartyProvisionEnabled: false,
    refusalConsequence: seedText(settings, "privacyRefusalBody", "동의를 거부하면 관심고객 등록 및 상담 안내가 제한될 수 있습니다."),
    noticeLabels: {
      title: seedText(settings, "noticeTitle", "개인정보 수집 및 이용"),
      controller: seedText(settings, "noticeController", "수집 주체"),
      purpose: seedText(settings, "noticePurpose", "목적"),
      fields: seedText(settings, "noticeFields", "항목"),
      retention: seedText(settings, "noticeRetention", "보유 기간"),
      operator: seedText(settings, "noticeOperator", "시스템 운영"),
      operatorNote: seedText(settings, "noticeOperatorNote", "상담과 개인정보 이용의 주체는 위에 적은 수집 주체입니다."),
      thirdParty: seedText(settings, "noticeThird", "제3자 제공"),
      refusal: seedText(settings, "noticeRefusal", "동의 거부"),
      close: seedText(settings, "shellPopupClosePh", "닫기"),
    },
  };
}

function baseSections(code: TemplateCode, settings?: Record<string, unknown>): Array<Omit<PageSection, "projectId" | "sortOrder">> {
  const t = (key: string, fallback: string) => seedText(settings, key, fallback);
  const matrix = locationMatrixDefaults(settings);
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
      title: t("shellSectionHero", "히어로"),
      gnbLabel: t("seedGnbHome", "홈"),
      anchorId: "hero",
      isOriginal: true,
      isRequired: true,
      isVisible: true,
      showInGnb: false,
      content: {
        kicker: t("seedHeroKicker", "신규 분양"),
        region: "",
        region1: "",
        region2: "",
        headline: t("seedHeroHeadline", "현장명을 입력하세요"),
        subheadline: t("seedHeroSubheadline", "핵심 카피와 분양 안내를 여기에 작성합니다."),
        ctaLabel: t("phCta", "관심고객 등록"),
        phoneLabel: t("phPhoneAsk", "전화 문의"),
        headerPhoneLabel: t("phPhoneCaption", "문의번호"),
        dockLabel: t("phDock", "분양문의"),
        dockCloseLabel: t("shellPopupClosePh", "닫기"),
        emptyMediaLabel: t("phEmptyMedia", "대표 이미지를 올려 주세요"),
        imageAlt: "",
        phone: "",
        priceLine: t("seedHeroPriceLine", "분양가 정보를 입력하세요"),
        priceLabel: t("phPriceLabelSample", "분양가"),
        priceType: "",
        priceMain: "",
        priceSub: "",
        priceNote: "",
        benefit: t("seedHeroBenefit", "등록 혜택을 입력하세요"),
        benefitBadge: t("formPerkItemPh", "혜택"),
        trustTags: [{ text: t("seedTagConsult", "당일 상담") }, { text: t("phPlaceSample", "모델하우스") }, { text: t("seedTagGuide", "1:1 안내") }],
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
      title: t("shellSectionOverview", "사업개요"),
      gnbLabel: t("shellSectionOverview", "사업개요"),
      anchorId: "overview",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: t("shellSectionOverview", "사업개요"),
        body: t("seedOverviewBody", "규모, 위치, 세대수, 공급 일정 등 확정된 정보만 입력하세요. 추정 수치는 자동으로 만들지 않습니다."),
        scheduleTitle: t("phScheduleTitle", "분양 일정"),
        factsMoreLabel: t("phFactsMore", "사업개요 전체"),
        scheduleMoreLabel: t("phScheduleMore", "일정 전체"),
        disclaimer: t("seedOverviewDisclaimer", "상기 내용은 사업 진행에 따라 변경될 수 있습니다."),
        homepageUrl: "",
        homepageLabel: t("phOfficialHome", "분양 홈페이지"),
        noticeUrl: "",
        noticeLabel: t("phOfficialNotice", "입주자 모집공고"),
        stats: [
          { value: t("seedStatValue", "입력"), label: t("seedStatHouseholds", "세대수") },
          { value: t("seedStatValue", "입력"), label: t("seedStatFloors", "최고 층수") },
          { value: t("seedStatValue", "입력"), label: t("seedStatBuildings", "주거동") },
          { value: t("seedStatValue", "입력"), label: t("seedStatMoveIn", "입주 예정") },
        ],
        facts: [
          { label: t("seedFactLocation", "위치"), value: t("seedFactNeed", "입력 필요") },
          { label: t("seedFactScale", "공급규모"), value: t("seedFactNeed", "입력 필요") },
          { label: t("seedFactType", "공급유형"), value: t("seedFactNeed", "입력 필요") },
          { label: t("seedFactArea", "전용면적"), value: t("seedFactNeed", "입력 필요") },
          { label: t("seedFactMoveIn", "입주예정"), value: t("seedFactNeed", "입력 필요") },
          { label: t("seedFactParties", "시행 · 시공"), value: t("seedFactNeed", "입력 필요") },
        ],
        schedule: [
          { title: t("seedScheduleApply", "청약"), date: t("seedSchedulePending", "일정 확정 후 입력"), note: "" },
          { title: t("seedScheduleWinner", "당첨자 발표"), date: t("seedSchedulePending", "일정 확정 후 입력"), note: "" },
          { title: t("seedScheduleContract", "계약"), date: t("seedSchedulePending", "일정 확정 후 입력"), note: "" },
          { title: t("seedScheduleMoveIn", "입주"), date: t("seedSchedulePending", "일정 확정 후 입력"), note: "" },
        ],
      },
      settings: { layout: code === "image-focus" ? "grid" : "split" },
    }),
    section({
      id: locationId,
      sectionType: "location",
      title: t("seedLocationTitle", "입지조건"),
      gnbLabel: t("seedLocationTitle", "입지조건"),
      anchorId: "location",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: t("seedLocationTitle", "입지조건"),
        body: t("seedLocationBody", "교통, 생활권, 교육, 녹지 등 현장 주변 정보를 입력합니다."),
        images: [] as Array<{ url: string; alt: string }>,
        matrix,
        cards: [
          { title: matrix[0]?.label ?? t("iconTransit", "교통"), body: t("seedCardTransit", "주요 교통 정보를 입력하세요.") },
          { title: matrix[1]?.label ?? t("iconLife", "생활"), body: t("seedCardLife", "생활 인프라 정보를 입력하세요.") },
          { title: matrix[2]?.label ?? t("iconSchool", "교육"), body: t("seedCardSchool", "교육 환경 정보를 입력하세요.") },
        ],
      },
      settings: { layout: code === "video-ready" ? "timeline" : "cards" },
    }),
    section({
      id: premiumId,
      sectionType: "premium",
      title: t("seedPremiumTitleSection", "프리미엄"),
      gnbLabel: t("seedPremiumTitleSection", "프리미엄"),
      anchorId: "premium",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: t("seedPremiumHeading", "프리미엄 / 특장점"),
        copyHeadline: t("seedPremiumHeadline", "이 단지의 특장점"),
        copyBody: t("seedPremiumBodySeed", "확인된 내용만 적습니다."),
        galleryCaption: "",
        images: [] as Array<{ url: string; alt: string }>,
        items: [
          { icon: "community", title: t("seedPremiumItem1", "특장점 1"), body: t("seedPremiumItem1Body", "실제 확인된 특장점만 작성하세요.") },
          { icon: "park", title: t("seedPremiumItem2", "특장점 2"), body: t("seedPremiumItem2Body", "광고 문구의 적법성은 담당자가 확인합니다.") },
          { icon: "parking", title: t("seedPremiumItem3", "특장점 3"), body: t("seedPremiumItem3Body", "시스템이 분양 조건을 대신 검증하지 않습니다.") },
        ],
      },
      settings: { layout: code === "image-focus" ? "feature" : "magazine" },
    }),
    section({
      id: galleryId,
      sectionType: "gallery",
      title: t("shellSectionGallery", "갤러리"),
      gnbLabel: t("shellSectionGallery", "갤러리"),
      anchorId: "gallery",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: t("seedGalleryHeading", "시설 / 갤러리"),
        body: t("seedGalleryBody", "단지와 시설 사진을 올리고, 각 사진 설명을 입력하세요."),
        representativeLabel: t("phBadgeMain", "대표"),
        emptyImageLabel: t("phImageEmpty", "이미지"),
        images: [] as Array<{ assetId: string; alt: string }>,
      },
      settings: { columns: code === "image-focus" ? 3 : 2 },
    }),
    section({
      id: floorId,
      sectionType: "floorplan",
      title: t("seedFloorplanTitle", "평면안내"),
      gnbLabel: t("seedFloorplanTitle", "평면안내"),
      anchorId: "floorplan",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: t("seedFloorplanTitle", "평면안내"),
        body: t("seedFloorplanBody", "타입을 고르면 해당 평면이 보입니다."),
        planAlt: t("phPlanAlt", "평면"),
        emptyImageLabel: t("phPlanEmpty", "평면 이미지"),
        activeTypeIndex: 0,
        types: [
          { name: "59㎡", summary: t("seedTypeSummary", "설명을 입력하세요."), exclusiveArea: "", supplyArea: "", rooms: "", imageAssetId: null },
          { name: "84㎡", summary: t("seedTypeSummary", "설명을 입력하세요."), exclusiveArea: "", supplyArea: "", rooms: "", imageAssetId: null },
        ],
      },
      settings: {},
    }),
    section({
      id: directionsId,
      sectionType: "directions",
      title: t("phDirections", "오시는 길"),
      gnbLabel: t("phDirections", "오시는 길"),
      anchorId: "directions",
      isOriginal: true,
      isRequired: false,
      isVisible: true,
      showInGnb: true,
      content: {
        heading: t("phDirections", "오시는 길"),
        address: t("seedDirectionsAddress", "현장 주소를 입력하세요."),
        placeName: t("phPlaceSample", "모델하우스"),
        headingSuffix: t("phDirections", "오시는 길"),
        phone: "",
        addressLabel: t("phRowAddress", "주소"),
        phoneRowLabel: t("phRowPhone", "전화"),
        hoursLabel: t("phRowHours", "운영"),
        parkingLabel: t("phRowParking", "주차"),
        copyAddressLabel: t("phCopyAddress", "주소 복사"),
        mapEmptyLabel: t("phMapEmpty", "약도 이미지"),
        mapLinkLabel: t("phMapLink", "지도에서 보기"),
        mapAlt: t("phMapAlt", "약도"),
        guide: t("seedDirectionsGuide", "찾아오시는 방법과 주차 안내를 입력하세요."),
        hours: t("seedDirectionsHours", "운영 시간을 입력하세요."),
        parking: t("seedDirectionsParking", "주차 안내를 입력하세요."),
        routes: [
          { label: t("phTransit", "지하철"), detail: t("seedRouteSubway", "역과 출구를 입력하세요.") },
          { label: t("seedRouteBus", "버스"), detail: t("seedRouteBusDetail", "노선을 입력하세요.") },
        ],
        mapImageAssetId: null,
      },
      settings: {},
    }),
    section({
      id: formId,
      sectionType: "lead_form",
      title: t("shellSectionLead", "관심고객 등록"),
      gnbLabel: t("seedGnbLead", "관심고객"),
      anchorId: "inquiry",
      isOriginal: true,
      isRequired: REQUIRED_SECTION_TYPES.includes("lead_form"),
      isVisible: true,
      showInGnb: true,
      content: {
        heading: t("shellSectionLead", "관심고객 등록"),
        intro: t("seedLeadIntro", "상담을 원하시면 아래 정보를 남겨 주세요. 담당자가 확인 후 연락드립니다."),
        perkHeadline: t("seedLeadPerkTitle", "등록하면 먼저 안내받는 내용"),
        perkBody: t("seedLeadPerkBody", "확정된 안내만 적습니다."),
        perks: [{ text: t("seedLeadPerk1", "청약 일정 안내") }, { text: t("seedLeadPerk2", "모델하우스 오픈 안내") }],
        phone: "",
        phoneCaption: t("formPhoneCaptionPh", "문의번호"),
        emptyUnitTypeLabel: t("formUnitEmptyPh", "평면안내에서 타입 이름을 입력하면 여기에 나타납니다."),
        externalRegisterUrl: "",
        nameError: t("formNameErrorPh", "이름을 입력해 주세요."),
        phoneError: t("formPhoneErrorPh", "올바른 휴대전화 번호를 입력해 주세요."),
        collectionError: t("formCollectionErrorPh", "개인정보 수집 및 이용에 동의해 주세요."),
        thirdPartyError: t("formThirdErrorPh", "개인정보 제3자 제공에 동의해 주세요."),
        submitError: t("formSubmitErrorPh", "등록에 실패했습니다."),
        controllerWarning: t("formControllerWarnPh", "개인정보 처리 주체가 확정되기 전에는 실제 접수가 저장되지 않을 수 있습니다."),
      },
      settings: {},
    }),
    section({
      id: legalId,
      sectionType: "legal",
      title: t("shellSectionLegal", "법적 고지"),
      gnbLabel: t("seedGnbLegal", "고지"),
      anchorId: "legal",
      isOriginal: true,
      isRequired: true,
      isVisible: true,
      showInGnb: false,
      content: {
        heading: t("seedLegalHeading", "사업 주체 및 법적 고지"),
        body: t("seedLegalBody", "시행, 시공, 광고 문의처, 분양 광고 관련 고지는 담당자가 직접 입력합니다. 미확정 정보는 사실처럼 표시하지 마세요."),
        developerName: "",
        developerLabel: t("phPrefixDeveloper", "시행"),
        builderName: "",
        builderLabel: t("phPrefixBuilder", "시공"),
        advertiserName: "",
        advertiserLabel: t("phPrefixAdvertiser", "광고주"),
        agencyName: "",
        agencyLabel: t("phPrefixAgency", "광고사"),
        contact: "",
        contactLabel: t("phPrefixContact", "문의"),
        copyPageLabel: t("phCopyPage", "페이지 주소 복사"),
        sitePhoneLabel: t("phPhoneCaption", "문의번호"),
        notices: [
          { text: t("seedLegalNotice1", "조감도, 평면도, 이미지는 이해를 돕기 위한 것이며 실제와 다를 수 있습니다.") },
          { text: t("seedLegalNotice2", "확정되지 않은 일정과 금액은 사실처럼 적지 않습니다.") },
        ],
        footerNote: t("seedLegalFooter", "분양 조건과 일정은 입주자 모집공고와 현장 안내를 기준으로 확인해 주세요."),
      },
      settings: {},
    }),
  ];
}

export function templateComingSoonMessage(settings?: Record<string, unknown>) {
  return seedText(settings, "pickerComingSoon", "오픈 대기 중이에요. 준비되는 대로 바로 안내드릴게요.");
}

/** @deprecated use templateComingSoonMessage(settings) */
export const TEMPLATE_COMING_SOON_MESSAGE = templateComingSoonMessage();

export type TemplateCatalogItem = {
  code: TemplateCode | null;
  name: string;
  description: string;
  comingSoon: boolean;
};

export function templateCatalog(settings?: Record<string, unknown>): TemplateCatalogItem[] {
  const t = (key: string, fallback: string) => seedText(settings, key, fallback);
  return [
    {
      code: "image-focus",
      name: t("catalogImageFocusName", "E-commerce형"),
      description: t("catalogImageFocusDesc", "사업개요, 입지, 프리미엄, 평면 등 분양 핵심 섹션을 담은 기본 상품형 시안"),
      comingSoon: false,
    },
    {
      code: "video-ready",
      name: t("catalogVideoReadyName", "프리미엄 화보형"),
      description: t("catalogVideoReadyDesc", "히어로에서 이미지 또는 영상을 고를 수 있는 화보형 시안"),
      comingSoon: false,
    },
    {
      code: "forest",
      name: t("catalogForestName", "브라이트 포레스트형"),
      description: t("catalogForestDesc", "첫 화면을 크게 보여주고 아래로 이어지는 시안"),
      comingSoon: true,
    },
    {
      code: "info",
      name: t("catalogInfoName", "단지 정보형"),
      description: t("catalogInfoDesc", "사진보다 위치, 규모, 세대 정보를 먼저 보여주는 시안"),
      comingSoon: true,
    },
  ];
}

/** DB 시드·기본 목록. 화면에서는 templateCatalog(settings)를 쓴다. */
export const TEMPLATE_CATALOG: TemplateCatalogItem[] = templateCatalog();

export function createTemplateSections(code: TemplateCode, projectId: string, settings?: Record<string, unknown>): PageSection[] {
  return baseSections(code, settings).map((item, index) => ({
    ...item,
    projectId,
    sortOrder: index,
  }));
}

function sampleByType(settings?: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const t = (key: string, fallback: string) => seedText(settings, key, fallback);
  const matrix = locationMatrixDefaults(settings);
  return {
    hero: {
      kicker: t("seedSampleComplex", "샘플 단지"),
      region: "",
      region1: t("phRegion1", "시·도"),
      region2: t("phRegion2", "시·군·구"),
      headline: t("seedSampleComplex", "샘플 단지"),
      subheadline: t("seedSampleSubheadline", "분양 안내 문구를 여기에 넣습니다."),
      priceLine: t("seedSamplePriceLine", "전용 59㎡ · 분양가 입력"),
      priceLabel: t("phPriceLabelSample", "분양가"),
      priceMain: t("seedSamplePriceMain", "분양가 입력"),
      benefit: t("seedSampleBenefit", "모델하우스 방문 예약"),
      benefitBadge: t("formPerkItemPh", "혜택"),
      trustTags: [{ text: t("seedTagConsult", "당일 상담") }, { text: t("phPlaceSample", "모델하우스") }],
      ctaLabel: t("phCta", "관심고객 등록"),
    },
    overview: {
      heading: t("shellSectionOverview", "사업개요"),
      scheduleTitle: t("phScheduleTitle", "분양 일정"),
      body: t("seedSampleOverviewBody", "위치, 규모, 세대수처럼 확정된 정보만 보여 주는 샘플입니다."),
      disclaimer: t("seedOverviewDisclaimer", "상기 내용은 사업 진행에 따라 변경될 수 있습니다."),
      homepageUrl: "",
      homepageLabel: t("phOfficialHome", "분양 홈페이지"),
      noticeUrl: "",
      noticeLabel: t("phOfficialNotice", "입주자 모집공고"),
      stats: [
        { value: t("seedStatValue", "입력"), label: t("seedStatHouseholds", "세대수") },
        { value: t("seedStatValue", "입력"), label: t("seedStatFloors", "최고 층수") },
        { value: t("seedStatValue", "입력"), label: t("seedStatBuildings", "주거동") },
        { value: t("seedStatValue", "입력"), label: t("seedStatMoveIn", "입주 예정") },
      ],
      facts: [
        { label: t("seedFactLocation", "위치"), value: t("seedSampleFactLocation", "주소를 입력하세요") },
        { label: t("seedFactScale", "공급규모"), value: t("seedSampleFactScale", "지하·지상 규모를 입력하세요") },
        { label: t("seedFactType", "공급유형"), value: t("seedSampleFactType", "아파트·오피스텔 등 공급 유형을 입력하세요") },
        { label: t("seedFactArea", "전용면적"), value: t("seedSampleFactArea", "전용면적 범위를 입력하세요") },
        { label: t("seedFactMoveIn", "입주예정"), value: t("seedSampleFactMoveIn", "입주 시기를 입력하세요") },
        { label: t("seedFactParties", "시행 · 시공"), value: t("seedSampleFactParties", "시행사와 시공사를 입력하세요") },
      ],
      schedule: [
        { title: t("seedScheduleApply", "청약"), date: t("seedScheduleDate", "날짜를 입력하세요"), note: "" },
        { title: t("seedScheduleWinner", "당첨자 발표"), date: t("seedScheduleDate", "날짜를 입력하세요"), note: "" },
        { title: t("seedScheduleContract", "계약"), date: t("seedScheduleDate", "날짜를 입력하세요"), note: "" },
        { title: t("seedScheduleMoveIn", "입주"), date: t("seedScheduleDate", "날짜를 입력하세요"), note: "" },
      ],
    },
    location: {
      heading: t("seedLocationTitle", "입지조건"),
      body: t("seedSampleLocationBody", "교통, 생활, 교육 정보를 샘플 칸에 맞춰 바꿉니다."),
      matrix: [
        { icon: "transit", label: matrix[0]?.label ?? t("iconTransit", "교통"), body: t("seedSampleMatrixTransit", "가까운 역과 도로를 입력하세요.") },
        { icon: "life", label: matrix[1]?.label ?? t("iconLife", "생활"), body: t("seedMatrixLife", "생활 인프라를 입력하세요.") },
        { icon: "school", label: matrix[2]?.label ?? t("iconSchool", "교육"), body: t("seedSampleMatrixSchool", "학교와 학원가를 입력하세요.") },
        { icon: "nature", label: matrix[3]?.label ?? t("iconGreen", "녹지"), body: t("seedSampleMatrixNature", "공원과 산책길을 입력하세요.") },
      ],
      cards: [
        { title: matrix[0]?.label ?? t("iconTransit", "교통"), body: t("seedSampleMatrixTransit", "가까운 역과 도로를 입력하세요.") },
        { title: matrix[1]?.label ?? t("iconLife", "생활"), body: t("seedMatrixLife", "생활 인프라를 입력하세요.") },
        { title: matrix[2]?.label ?? t("iconSchool", "교육"), body: t("seedSampleMatrixSchool", "학교와 학원가를 입력하세요.") },
      ],
    },
    premium: {
      heading: t("seedPremiumTitleSection", "프리미엄"),
      copyHeadline: t("seedPremiumHeadline", "이 단지의 특장점"),
      copyBody: t("seedSamplePremiumBody", "샘플로 넣은 문장입니다. 확정된 내용으로 바꿔 주세요."),
      galleryCaption: "",
      items: [
        { icon: "community", title: t("iconCommunity", "커뮤니티"), body: t("seedSamplePremiumCommunity", "단지 안 시설을 입력하세요.") },
        { icon: "park", title: t("iconPark", "조경"), body: t("seedSamplePremiumPark", "조경 계획을 입력하세요.") },
        { icon: "parking", title: t("iconParking", "주차"), body: t("seedSamplePremiumParking", "주차 대수를 입력하세요.") },
      ],
    },
    floorplan: {
      heading: t("seedFloorplanTitle", "평면안내"),
      body: t("seedFloorplanBody", "타입을 고르면 해당 평면이 보입니다."),
      activeTypeIndex: 0,
      types: [
        { name: "59㎡", summary: t("seedSampleTypeSummary", "방 구성과 전용면적을 입력하세요."), exclusiveArea: "59㎡", supplyArea: "84㎡", rooms: t("seedSampleRooms59", "방 2, 욕실 1") },
        { name: "84㎡", summary: t("seedSampleTypeSummary", "방 구성과 전용면적을 입력하세요."), exclusiveArea: "84㎡", supplyArea: "112㎡", rooms: t("seedSampleRooms84", "방 3, 욕실 2") },
      ],
    },
    lead_form: {
      perkHeadline: t("seedLeadPerkTitle", "등록하면 먼저 안내받는 내용"),
      perkBody: t("seedSampleLeadPerkBody", "청약 일정과 방문 안내처럼 확정된 내용만 적습니다."),
      perks: [{ text: t("seedLeadPerk1", "청약 일정 안내") }, { text: t("seedSampleLeadPerk2", "모델하우스 방문 안내") }],
      phone: "",
    },
    directions: {
      heading: t("phDirections", "오시는 길"),
      placeName: t("phPlaceSample", "모델하우스"),
      phone: "",
      address: t("seedDirectionsAddress", "현장 주소를 입력하세요."),
      guide: t("seedSampleDirectionsGuide", "대중교통과 주차 안내를 입력하세요."),
      hours: t("seedSampleDirectionsHours", "매일 10:00–18:00"),
      parking: t("seedSampleDirectionsParking", "지상 주차장 이용. 만차 시 인근 주차를 안내하세요."),
      routes: [
        { label: t("phTransit", "지하철"), detail: t("seedSampleRouteSubway", "가까운 역과 도보 시간을 입력하세요.") },
        { label: t("seedRouteBus", "버스"), detail: t("seedSampleRouteBus", "정류장과 노선을 입력하세요.") },
      ],
    },
  };
}

export function applySampleCopy(sections: PageSection[], settings?: Record<string, unknown>): PageSection[] {
  const samples = sampleByType(settings);
  return sections.map((section) => {
    const sample = samples[section.sectionType];
    if (!sample) return section;
    return { ...section, content: { ...section.content, ...sample } };
  });
}
