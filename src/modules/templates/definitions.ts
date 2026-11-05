import { REQUIRED_SECTION_TYPES } from "@/lib/constants";
import type { LeadFormField, PageSection, PageSnapshot, ProjectPrivacyConfig, TemplateCode } from "@/types";
import { createOakEditorialSections } from "@/modules/templates/oak-editorial/create-sections";
import { OAK_DATA_KEY, type OakEditorialData } from "@/modules/templates/oak-editorial/types";
import { SAMPLE_SITE } from "@/modules/templates/sample-site";

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
  faq: "eyebrowFaq",
  lead_form: "eyebrowLeadForm",
  directions: "eyebrowDirections",
};

const SECTION_EYEBROW_FALLBACK: Record<string, string> = {
  overview: "사업 정보",
  location: "입지",
  premium: "특장점",
  gallery: "갤러리",
  floorplan: "평면",
  faq: "자주 묻는 질문",
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
/** 히어로 하단 서브 갤러리 상한 (시안 01: 대표 제외 4장). */
export const HERO_GALLERY_MAX = 4;
export type GalleryImageSlot = { url?: string; alt?: string; caption?: string };

export function heroGalleryImages(content: { images?: GalleryImageSlot[] }): GalleryImageSlot[] {
  if (!Array.isArray(content.images)) return [];
  return content.images
    .map((image) => ({
      url: String(image?.url ?? "").trim(),
      alt: String(image?.alt ?? ""),
      caption: String(image?.caption ?? ""),
    }))
    .filter((image) => image.url)
    .slice(0, HERO_GALLERY_MAX);
}

/** 입지·프리미엄·레거시 gallery 슬롯(빈 URL 포함). 편집 패널용. */
export function sectionGallerySlots(value: unknown): GalleryImageSlot[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, GALLERY_IMAGE_MAX).map((image) => {
    const row = image as GalleryImageSlot;
    return {
      url: String(row?.url ?? "").trim(),
      alt: String(row?.alt ?? ""),
      caption: String(row?.caption ?? ""),
    };
  });
}

/** 공개·뷰어용: URL 있는 이미지만, GALLERY_IMAGE_MAX 이하. */
export function sectionGalleryImages(value: unknown): Array<{ url: string; alt: string; caption: string }> {
  return sectionGallerySlots(value)
    .filter((image): image is GalleryImageSlot & { url: string } => Boolean(image.url))
    .map((image) => ({ url: image.url, alt: image.alt ?? "", caption: image.caption ?? "" }));
}

/** 직방 프리미엄 화보형과 동일한 15종 아이콘 팩 */
export const PREMIUM_ICON_DEFS = [
  { id: "ocean-view-residence", label: "오션뷰 주거" },
  { id: "transit-hub", label: "교통 허브" },
  { id: "residential-environment", label: "주거 환경" },
  { id: "premium-school-district", label: "명품 학군" },
  { id: "floor-plan", label: "평면도" },
  { id: "future-value", label: "미래 가치" },
  { id: "apartment-complex", label: "아파트 단지" },
  { id: "price-benefit", label: "가격 혜택" },
  { id: "model-house", label: "모델하우스" },
  { id: "prime-location", label: "핵심 입지" },
  { id: "move-in-support", label: "입주 지원" },
  { id: "promotion-event", label: "프로모션" },
  { id: "sales-schedule", label: "분양 일정" },
  { id: "secure-guarantee", label: "안심 보장" },
  { id: "subscription-info", label: "청약 안내" },
] as const;

export const PREMIUM_ICONS = PREMIUM_ICON_DEFS.map((item) => item.id);
export type PremiumIcon = (typeof PREMIUM_ICONS)[number];
export type PremiumItem = { title: string; body: string; imageUrl?: string; icon: PremiumIcon };
export const PREMIUM_ITEM_MAX = 6;

const PREMIUM_ICON_SET = new Set<string>(PREMIUM_ICONS);

/** 예전 SVG 아이콘 id → 신규 팩 */
const LEGACY_PREMIUM_ICON: Record<string, PremiumIcon> = {
  community: "apartment-complex",
  park: "residential-environment",
  parking: "move-in-support",
  view: "ocean-view-residence",
  transit: "transit-hub",
  school: "premium-school-district",
  security: "secure-guarantee",
  home: "residential-environment",
  life: "prime-location",
  nature: "residential-environment",
};

export function resolvePremiumIcon(raw: string | undefined, fallbackIndex = 0): PremiumIcon {
  const trimmed = String(raw ?? "").trim();
  if (trimmed && PREMIUM_ICON_SET.has(trimmed)) return trimmed as PremiumIcon;
  if (trimmed && LEGACY_PREMIUM_ICON[trimmed]) return LEGACY_PREMIUM_ICON[trimmed];
  return PREMIUM_ICONS[fallbackIndex % PREMIUM_ICONS.length] ?? "ocean-view-residence";
}

export function premiumIconSrc(iconId: string, fallbackIndex = 0): string {
  return `/images/presale/icons/${resolvePremiumIcon(iconId, fallbackIndex)}.png`;
}

export function premiumIconLabel(iconId: string, fallbackIndex = 0): string {
  const id = resolvePremiumIcon(iconId, fallbackIndex);
  return PREMIUM_ICON_DEFS.find((item) => item.id === id)?.label ?? id;
}

/** 입지 4칸도 같은 아이콘 팩에서 고른다. */
export const LOCATION_MATRIX_ICONS = PREMIUM_ICONS;
export type LocationMatrixIcon = PremiumIcon;
export type LocationMatrixItem = { icon: LocationMatrixIcon; label: string; body: string };

export function locationMatrixDefaults(settings?: Record<string, unknown>): LocationMatrixItem[] {
  return [
    { icon: "transit-hub", label: seedText(settings, "iconTransit", "교통"), body: seedText(settings, "seedMatrixTransit", "주요 교통을 입력하세요.") },
    { icon: "prime-location", label: seedText(settings, "iconLife", "생활"), body: seedText(settings, "seedMatrixLife", "생활 인프라를 입력하세요.") },
    { icon: "premium-school-district", label: seedText(settings, "iconSchool", "교육"), body: seedText(settings, "seedMatrixSchool", "교육 환경을 입력하세요.") },
    { icon: "residential-environment", label: seedText(settings, "iconGreen", "녹지"), body: seedText(settings, "seedMatrixNature", "공원과 녹지를 입력하세요.") },
  ];
}

/** 설정 없이 쓰는 기본 입지 칸. 신규 프로젝트 시드는 locationMatrixDefaults(settings)를 쓴다. */
export const LOCATION_MATRIX_DEFAULTS: LocationMatrixItem[] = locationMatrixDefaults();

export function locationMatrix(content: { matrix?: LocationMatrixItem[] }): LocationMatrixItem[] | null {
  if (!Array.isArray(content.matrix)) return null;
  return LOCATION_MATRIX_DEFAULTS.map((fallback, index) => {
    const row = content.matrix?.[index];
    return {
      icon: resolvePremiumIcon(row?.icon, index) || fallback.icon,
      label: String(row?.label ?? fallback.label),
      body: String(row?.body ?? ""),
    };
  });
}
/** 히어로 신뢰 태그 상한 (명세 LIMIT-003: 1~8). */
export const HERO_TAG_MAX = 8;
/** 이벤트 팝업 혜택 상한 (명세 LIMIT-010: 1~3). */
export const POPUP_PERK_MAX = 3;

/** 현장명 변경 시 히어로 헤드라인·오시는 길 장소명 접두를 맞춘다. 사용자 전용 장소명은 덮지 않는다. */
export function withLinkedSiteName<T extends { sectionType: string; content: Record<string, unknown> }>(
  sections: T[],
  previousName: string,
  nextName: string,
): T[] {
  const prev = previousName.trim();
  return sections.map((section) => {
    if (section.sectionType === "hero") {
      // 현장명과 연동된 헤드라인만 갱신. 사용자가 따로 쓴 광고 제목은 덮지 않는다.
      const headline = String(section.content.headline ?? "").trim();
      if (prev && headline && headline !== prev) return section;
      return { ...section, content: { ...section.content, headline: nextName } };
    }
    if (section.sectionType === "directions" && prev) {
      const place = String(section.content.placeName ?? "");
      if (!place.trim()) return section;
      const linked =
        place === prev || place.startsWith(`${prev} `) || place.startsWith(`${prev}/`) || place.startsWith(`${prev} /`);
      if (!linked) return section;
      return { ...section, content: { ...section.content, placeName: `${nextName}${place.slice(prev.length)}` } };
    }
    return section;
  });
}

export function premiumItems(value: unknown): PremiumItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, PREMIUM_ITEM_MAX).map((item, index) => {
    const row = item as { title?: string; body?: string; imageUrl?: string; icon?: string };
    return {
      title: String(row.title ?? ""),
      body: String(row.body ?? ""),
      imageUrl: row.imageUrl ? String(row.imageUrl) : "",
      icon: resolvePremiumIcon(row.icon, index),
    };
  });
}

export function unitTypeNames(types: Array<{ name?: string }>) {
  return types.map((type) => (type.name ?? "").trim()).filter(Boolean);
}

export type FloorplanImage = { url: string; alt: string; caption?: string };
export type FloorplanSpec = { label: string; value: string };
export const FLOORPLAN_SPEC_MAX = 12;

/** 화면에 보이는 캡션. 예전 데이터는 alt만 있을 수 있어 그때만 alt를 표시용으로 읽는다. */
export function imageDisplayCaption(image: { caption?: string; alt?: string } | null | undefined): string {
  if (!image) return "";
  const caption = String(image.caption ?? "").trim();
  if (caption) return caption;
  // caption 키가 한 번도 없던 레거시 슬롯만 alt를 표시에 쓴다.
  if (!("caption" in image)) return String(image.alt ?? "").trim();
  return "";
}

/** 편집 칸용 캡션. 표시용과 동일하게 레거시를 보여 주되, 저장은 caption 키로만 한다. */
export function imageEditorCaption(image: { caption?: string; alt?: string } | null | undefined): string {
  if (!image) return "";
  if ("caption" in image) return String(image.caption ?? "");
  return String(image.alt ?? "");
}

/** 접근성 대체텍스트. 캡션과 섞지 않는다. */
export function imageAltText(image: { caption?: string; alt?: string } | null | undefined, fallback = ""): string {
  if (!image) return fallback;
  const alt = String(image.alt ?? "").trim();
  return alt || fallback;
}

/**
 * alt만 바꿀 때. caption 키가 없던 레거시면 화면 캡션이 사라지지 않게
 * 기존 alt를 caption으로 고정한 뒤 alt만 갱신한다.
 */
export function withImageAlt<T extends { caption?: string; alt?: string }>(image: T, alt: string): T {
  if (!("caption" in image)) {
    return { ...image, caption: String(image.alt ?? ""), alt };
  }
  return { ...image, alt };
}

/** 탭 라벨. 비어 있으면 기존 name(타입명)을 쓴다. */
export function floorplanTabLabel(type: { tabLabel?: string; name?: string }, fallback = ""): string {
  const tab = String(type.tabLabel ?? "").trim();
  if (tab) return tab;
  return String(type.name ?? "").trim() || fallback;
}

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

/** 평면 타입 이름을 관심고객 폼의 unitType 선택지에 맞춘다. 이름이 없으면 선택지를 비운다. 「미정」은 항상 끝에 둔다. */
export function withUnitTypeOptions(fields: LeadFormField[], names: string[]) {
  const cleaned = names.map((name) => String(name ?? "").trim()).filter(Boolean);
  const options =
    cleaned.length === 0 ? [] : cleaned.includes("미정") ? cleaned : [...cleaned, "미정"];
  return fields.map((field) => {
    if (field.key !== "unitType") return field;
    return { ...field, options };
  });
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

export const FAQ_ITEM_MAX = 12;
export const OVERVIEW_FACT_MAX = 20;
export const OVERVIEW_SCHEDULE_MAX = 8;
export const OVERVIEW_STAT_MAX = 4;
export const FLOORPLAN_TYPE_MAX = 12;
export const LEAD_FORM_PERK_MAX = 8;
/** 입지 카드 (그리드 6열·프리미엄 상한과 맞춤). */
export const LOCATION_CARD_MAX = 6;
/** 오시는 길 교통 안내 줄. */
export const DIRECTIONS_ROUTE_MAX = 8;
/** 관심유형 선택 시 평면 스펙 미리보기 줄 수. */
export const INTEREST_FLOORPLAN_SPEC_LINES = 3;
/** 법적 고지 하단 문장 상한. */
export const LEGAL_NOTICE_MAX = 20;
const PLACEHOLDER_PARTY_NAMES = new Set(["처리주체미정", "운영법인미정", "광고사명미정", "광고주명미정"]);

/** 샘플·미확정 법인명. 공개 렌더·발행 게이트에서 숨기거나 거부한다. */
export function isPlaceholderPartyName(value: string) {
  return PLACEHOLDER_PARTY_NAMES.has(value.trim());
}

export function publicPartyName(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const trimmed = String(candidate ?? "").trim();
    if (trimmed && !isPlaceholderPartyName(trimmed)) return trimmed;
  }
  return "";
}

export type FaqItem = { question: string; answer: string };
export type LocationCard = { title: string; body: string; imageUrl?: string };
export type DirectionsRoute = { label: string; detail: string };
export type LegalNotice = { text: string };

export function legalNotices(value: unknown): LegalNotice[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, LEGAL_NOTICE_MAX).map((item) => {
    const row = item as { text?: unknown };
    return { text: String(row.text ?? "") };
  });
}

export function locationCards(value: unknown): LocationCard[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, LOCATION_CARD_MAX).map((item) => {
    const row = item as { title?: unknown; body?: unknown; imageUrl?: unknown };
    return {
      title: String(row.title ?? ""),
      body: String(row.body ?? ""),
      imageUrl: String(row.imageUrl ?? "").trim() || undefined,
    };
  });
}

export function directionsRoutes(value: unknown): DirectionsRoute[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, DIRECTIONS_ROUTE_MAX).map((item) => {
    const row = item as { label?: unknown; detail?: unknown };
    return { label: String(row.label ?? ""), detail: String(row.detail ?? "") };
  });
}

export function faqItems(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, FAQ_ITEM_MAX).map((item) => {
    const row = item as { question?: unknown; answer?: unknown };
    return { question: String(row.question ?? ""), answer: String(row.answer ?? "") };
  });
}

/** draft/API 저장 전 배열 상한을 맞춘다. */
export function normalizeSectionContent(sectionType: string, content: Record<string, unknown>): Record<string, unknown> {
  const next = { ...content };
  // oak-editorial 섹션 content는 템플릿 전용 스키마 — 공통 상한 변환을 건너뛴다.
  if (next.oak === true) return next;
  if (sectionType === "faq" && "items" in next) {
    next.items = faqItems(next.items);
  }
  if (sectionType === "hero") {
    // 히어로는 대표 이미지 1장만. 구버전 갤러리 첫 장을 imageUrl로 올리고 images는 비운다.
    const gallery = heroGalleryImages(next as { images?: GalleryImageSlot[] });
    if (!String(next.imageUrl ?? "").trim() && gallery[0]?.url) {
      next.imageUrl = gallery[0].url;
      if (!String(next.imageAlt ?? "").trim() && gallery[0].alt) next.imageAlt = gallery[0].alt;
    }
    next.images = [];
    if (Array.isArray(next.trustTags)) next.trustTags = (next.trustTags as unknown[]).slice(0, HERO_TAG_MAX);
  }
  if (sectionType === "overview") {
    if (Array.isArray(next.facts)) next.facts = (next.facts as unknown[]).slice(0, OVERVIEW_FACT_MAX);
    if (Array.isArray(next.schedule)) next.schedule = (next.schedule as unknown[]).slice(0, OVERVIEW_SCHEDULE_MAX);
    if (Array.isArray(next.stats)) next.stats = (next.stats as unknown[]).slice(0, OVERVIEW_STAT_MAX);
  }
  if (sectionType === "location" || sectionType === "gallery" || sectionType === "premium") {
    if ("images" in next) next.images = sectionGallerySlots(next.images);
  }
  if (sectionType === "location" && "cards" in next) {
    next.cards = locationCards(next.cards);
  }
  if (sectionType === "directions" && "routes" in next) {
    next.routes = directionsRoutes(next.routes);
  }
  if (sectionType === "legal" && "notices" in next) {
    next.notices = legalNotices(next.notices);
  }
  if (sectionType === "premium" && "items" in next) {
    next.items = premiumItems(next.items);
  }
  if (sectionType === "floorplan" && Array.isArray(next.types)) {
    next.types = (next.types as Array<Record<string, unknown>>).slice(0, FLOORPLAN_TYPE_MAX).map((type) => {
      const images = Array.isArray(type.images) ? (type.images as unknown[]).slice(0, GALLERY_IMAGE_MAX) : type.images;
      const specs = Array.isArray(type.specs) ? (type.specs as unknown[]).slice(0, FLOORPLAN_SPEC_MAX) : type.specs;
      return { ...type, images, specs };
    });
  }
  if (sectionType === "lead_form" && Array.isArray(next.perks)) {
    next.perks = (next.perks as unknown[]).slice(0, LEAD_FORM_PERK_MAX);
  }
  return next;
}

export function normalizeGlobalSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const next = { ...settings };
  const popup = next.popup;
  if (popup && typeof popup === "object" && !Array.isArray(popup)) {
    const row = { ...(popup as Record<string, unknown>) };
    if (Array.isArray(row.perks)) row.perks = (row.perks as unknown[]).slice(0, POPUP_PERK_MAX);
    next.popup = row;
  }
  return next;
}

/** 개인정보 수집·제3자 제공 항목 목록 상한. */
export const PRIVACY_FIELD_LIST_MAX = 20;
export const PRIVACY_FIELD_ITEM_MAX = 80;
/** 관심고객 폼 필드·선택지 상한. */
export const FORM_FIELD_MAX = 20;
export const FORM_OPTION_MAX = 30;

function normalizeStringList(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of value) {
    const text = String(item ?? "").trim().slice(0, maxItemLength);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    next.push(text);
    if (next.length >= maxItems) break;
  }
  return next;
}

export function normalizePrivacySettings(privacy: ProjectPrivacyConfig): ProjectPrivacyConfig {
  return {
    ...privacy,
    collectingControllerName: String(privacy.collectingControllerName ?? "").trim(),
    operatingCompanyName: String(privacy.operatingCompanyName ?? "").trim(),
    advertisingAgencyName: String(privacy.advertisingAgencyName ?? "").trim(),
    advertiserCompanyName: String(privacy.advertiserCompanyName ?? "").trim(),
    collectionPurpose: String(privacy.collectionPurpose ?? "").trim(),
    collectedFields: normalizeStringList(privacy.collectedFields, PRIVACY_FIELD_LIST_MAX, PRIVACY_FIELD_ITEM_MAX),
    retentionDescription: String(privacy.retentionDescription ?? "").trim(),
    privacyPolicyUrl: String(privacy.privacyPolicyUrl ?? "").trim(),
    privacyPolicyLabel: privacy.privacyPolicyLabel == null ? privacy.privacyPolicyLabel : String(privacy.privacyPolicyLabel).trim(),
    thirdPartyRecipientName: privacy.thirdPartyRecipientName == null ? privacy.thirdPartyRecipientName : String(privacy.thirdPartyRecipientName).trim(),
    thirdPartyPurpose: privacy.thirdPartyPurpose == null ? privacy.thirdPartyPurpose : String(privacy.thirdPartyPurpose).trim(),
    thirdPartyFields: normalizeStringList(privacy.thirdPartyFields, PRIVACY_FIELD_LIST_MAX, PRIVACY_FIELD_ITEM_MAX),
    thirdPartyRetentionDescription:
      privacy.thirdPartyRetentionDescription == null ? privacy.thirdPartyRetentionDescription : String(privacy.thirdPartyRetentionDescription).trim(),
    refusalConsequence: String(privacy.refusalConsequence ?? "").trim(),
    privacyContactEmail: privacy.privacyContactEmail == null ? privacy.privacyContactEmail : String(privacy.privacyContactEmail).trim(),
  };
}

export function normalizeFormSettings(form: PageSnapshot["formSettings"]): PageSnapshot["formSettings"] {
  const fields = (Array.isArray(form.fields) ? form.fields : []).slice(0, FORM_FIELD_MAX).map((field) => {
    const options = Array.isArray(field.options) ? normalizeStringList(field.options, FORM_OPTION_MAX, PRIVACY_FIELD_ITEM_MAX) : field.options;
    return {
      ...field,
      key: String(field.key ?? "").trim() || `extra-${crypto.randomUUID()}`,
      label: String(field.label ?? "").trim().slice(0, PRIVACY_FIELD_ITEM_MAX),
      helperText: field.helperText == null ? field.helperText : String(field.helperText).trim().slice(0, PRIVACY_FIELD_ITEM_MAX),
      placeholder: field.placeholder == null ? field.placeholder : String(field.placeholder).trim().slice(0, PRIVACY_FIELD_ITEM_MAX),
      options: options && options.length > 0 ? options : field.type === "select" || field.type === "radio" || field.type === "checkbox" ? [] : undefined,
    };
  });
  return {
    ...form,
    intro: String(form.intro ?? ""),
    successMessage: String(form.successMessage ?? ""),
    successTitle: form.successTitle == null ? form.successTitle : String(form.successTitle),
    againLabel: form.againLabel == null ? form.againLabel : String(form.againLabel),
    submittingLabel: form.submittingLabel == null ? form.submittingLabel : String(form.submittingLabel),
    previewNote: form.previewNote == null ? form.previewNote : String(form.previewNote),
    fields,
  };
}

function baseSections(settings?: Record<string, unknown>, stableIds = false): Array<Omit<PageSection, "projectId" | "sortOrder">> {
  const t = (key: string, fallback: string) => seedText(settings, key, fallback);
  const matrix = locationMatrixDefaults(settings);
  const id = (type: string) => (stableIds ? `preview-${type}` : crypto.randomUUID());
  const heroId = id("hero");
  const overviewId = id("overview");
  const locationId = id("location");
  const premiumId = id("premium");
  const floorId = id("floorplan");
  const directionsId = id("directions");
  const formId = id("lead_form");
  const legalId = id("legal");

  return [
    section({
      id: heroId,
      sectionType: "hero",
      title: t("shellSectionHero", "상품 상단"),
      gnbLabel: t("seedGnbHome", "상품 상단"),
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
        priceLabel: t("phPriceLabelSample", "분양가"),
        priceType: "",
        priceMain: "",
        priceSub: "",
        priceNote: "",
        benefit: t("seedHeroBenefit", "등록 혜택을 입력하세요"),
        benefitBadge: t("formPerkItemPh", "혜택"),
        trustTags: [{ text: t("seedTagConsult", "당일 상담") }, { text: t("phPlaceSample", "모델하우스") }, { text: t("seedTagGuide", "1:1 안내") }],
      },
      settings: { overlay: true, align: "center" },
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
      settings: { layout: "split" },
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
      settings: { layout: "cards" },
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
          { icon: "apartment-complex", title: t("seedPremiumItem1", "특장점 1"), body: t("seedPremiumItem1Body", "실제 확인된 특장점만 작성하세요.") },
          { icon: "residential-environment", title: t("seedPremiumItem2", "특장점 2"), body: t("seedPremiumItem2Body", "광고 문구의 적법성은 담당자가 확인합니다.") },
          { icon: "move-in-support", title: t("seedPremiumItem3", "특장점 3"), body: t("seedPremiumItem3Body", "시스템이 분양 조건을 대신 검증하지 않습니다.") },
        ],
      },
      settings: { layout: "feature" },
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
          { name: "59㎡", summary: t("seedTypeSummary", "설명을 입력하세요."), exclusiveArea: "", supplyArea: "", rooms: "" },
          { name: "84㎡", summary: t("seedTypeSummary", "설명을 입력하세요."), exclusiveArea: "", supplyArea: "", rooms: "" },
        ],
      },
      settings: {},
    }),
    // FAQ는 출시 범위 제외(product-spec). 기존 프로젝트에 남아 있으면 렌더러만 유지한다.
    section({
      id: formId,
      sectionType: "lead_form",
      title: t("shellSectionLead", "관심고객 등록"),
      gnbLabel: t("seedGnbLead", "관심고객 등록"),
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
        controllerWarning: t("formControllerWarnPh", "개인정보 처리 주체가 정해지기 전에는 관심고객을 접수할 수 없습니다."),
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
        placeLabel: t("phPlaceLabel", "견본주택"),
        placeName: t("phPlaceSample", "모델하우스"),
        headingSuffix: "",
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
        body: t(
          "seedLegalBody",
          "본 페이지는 분양 광고 랜딩페이지 예시입니다. 실제 분양 조건 및 세부 내용은 입주자 모집공고와 공식 안내를 기준으로 확인해 주세요.",
        ),
        developerName: "",
        builderName: "",
        advertiserName: "",
        agencyName: "",
        contact: "",
        sitePhoneLabel: t("phPhoneCaption", "문의번호"),
        notices: [],
        footerNote: "",
      },
      settings: {},
    }),
  ];
}

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
      code: "foreon",
      name: t("catalogForeonName", "분양 현장형"),
      description: t(
        "catalogForeonDesc",
        "다크 톤으로 정리한 분양 현장 시안",
      ),
      comingSoon: false,
    },
    {
      code: "info",
      name: t("catalogInfoName", "프리미엄 화보형"),
      description: t(
        "catalogInfoDesc",
        "풀블리드 히어로 · 타이틀 리빌 · 화보형 레이아웃",
      ),
      comingSoon: false,
    },
    {
      code: "oak-editorial",
      name: t("catalogOakName", "내추럴 에디토리얼"),
      description: t(
        "catalogOakDesc",
        "린넨 톤 · 히어로 스크롤 확대 · 분양 에디토리얼 레이아웃",
      ),
      comingSoon: false,
    },
    // midday(직방 LUMIÈRE 카탈로그 카드)는 선택 UI에서 제거. 기존 프로젝트·코드 경로는 유지.
  ];
}

/** DB 시드·기본 목록. 화면에서는 templateCatalog(settings)를 쓴다. */
export const TEMPLATE_CATALOG: TemplateCatalogItem[] = templateCatalog();

/** 프리미엄 화보형 예시 팩. 원본: Desktop/프리미엄-화보형-섹션예시 → public/samples/presale-premium */
export const SAMPLE_PREMIUM_BASE = "/samples/presale-premium";
/** GNB 기본 임시 로고(50×50). 미업로드 시 편집·미리보기에서 쓴다. */
export const SAMPLE_LOGO_URL = `${SAMPLE_PREMIUM_BASE}/gnb-logo.png`;

/** 샘플·기본 임시 로고면 true. 발행 체크·교체 힌트에 쓴다. */
export function isDefaultSampleLogo(url: string | null | undefined) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return true;
  if (trimmed === SAMPLE_LOGO_URL) return true;
  if (trimmed.endsWith("/gnb-logo.png") && trimmed.includes("/samples/presale-premium/")) return true;
  if (trimmed.endsWith("/gnb-logo-default.png")) return true;
  if (trimmed === "/images/presale/gnb-logo-default.png") return true;
  return false;
}

/** 관심고객 등록 안내(섹션·폼 설정 공통). */
export const SAMPLE_LEAD_INTRO = "먼저 등록하신 분께 분양 일정과 사전예약 혜택을 우선 안내드립니다";

/** 새 프로젝트·미리보기에 처음부터 넣는 공통 설정(로고·전화·팝업). */
export function sampleGlobalExtras(): Record<string, unknown> {
  const img = (name: string) => `${SAMPLE_PREMIUM_BASE}/${name}`;
  return {
    siteName: SAMPLE_SITE.name,
    navSubtitle: "분양 안내",
    phone: SAMPLE_SITE.phone,
    logoUrl: SAMPLE_LOGO_URL,
    popup: {
      enabled: true,
      banner: "방문 고객 안내",
      title: "관심고객 등록하고\n|스타벅스 아메리카노| 받기",
      body: "잔여세대 동호수 우선 안내와 견본주택 1:1 방문 예약을 받아보세요.",
      imageUrl: img("popup-event.png"),
      ctaLabel: "관심고객 등록하기",
      phone: SAMPLE_SITE.phone,
      perks: ["스타벅스 아메리카노 기프티콘", "잔여세대 동호수 우선 안내", "견본주택 1:1 방문 예약"],
      disclaimer: "※ 관심고객 등록은 청약 접수가 아니며, 이벤트 혜택은 사정에 따라 변경될 수 있습니다.",
      closeLabel: "닫기",
      emptyImageLabel: "배너 이미지",
      hideTodayLabel: "오늘 하루 보지 않기",
    },
  };
}

export function createTemplateSections(
  _code: TemplateCode,
  projectId: string,
  settings?: Record<string, unknown>,
  options?: { stableIds?: boolean },
): PageSection[] {
  if (_code === "oak-editorial") {
    const siteName = String(settings?.siteName ?? "").trim();
    const oakRaw = settings?.[OAK_DATA_KEY];
    return createOakEditorialSections(projectId, {
      stableIds: Boolean(options?.stableIds),
      siteName: siteName || undefined,
      data: oakRaw && typeof oakRaw === "object" ? (oakRaw as OakEditorialData) : undefined,
    });
  }
  // 새 프로젝트는 처음부터 가상 현장(SAMPLE_SITE)과 프리미엄 화보형 이미지로 채운다. 에디터에 「샘플로 채우기」는 두지 않는다.
  // stableIds: 생성 화면 미리보기용. SSR/CSR·입력 변경 시 UUID가 바뀌어 hydration이 깨지지 않게 한다.
  const sections = baseSections(settings, Boolean(options?.stableIds)).map((item, index) => ({
    ...item,
    projectId,
    sortOrder: index,
  }));
  return applySampleCopy(sections, settings);
}

function sampleByType(settings?: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const t = (key: string, fallback: string) => seedText(settings, key, fallback);
  const img = (name: string) => `${SAMPLE_PREMIUM_BASE}/${name}`;
  // 섹션별 전화는 비운다. 표시·문의는 draft globalSettings.phone(샘플 기본 SAMPLE_SITE.phone)을 쓴다.
  const floorLabels = { ...floorSpecLabels(settings), price: t("floorSpecPrice", "분양가") };
  return {
    hero: {
      kicker: SAMPLE_SITE.kicker,
      region: SAMPLE_SITE.address,
      region1: SAMPLE_SITE.region1,
      region2: SAMPLE_SITE.region2,
      headline: SAMPLE_SITE.name,
      subheadline: SAMPLE_SITE.lead,
      priceLabel: "분양가 (전용면적 기준)",
      priceType: "전용 59㎡",
      priceMain: "6억 2,200만원~",
      priceSub: "전용 84㎡ 8억 4,100만원 (최고가 기준)",
      priceNote: "※ 분양가는 타입/층/향에 따라 상이합니다. 자세한 금액은 상담 시 안내드립니다.",
      benefit: "관심고객 등록 시 **스타벅스 아메리카노 기프티콘** 증정",
      benefitBadge: "혜택",
      trustTags: [{ text: "당일 상담 가능" }, { text: "모델하우스 운영중" }, { text: "1:1 맞춤 분양 안내" }],
      ctaLabel: t("phCta", "관심고객 등록"),
      phone: "",
      imageUrl: img("hero-main.png"),
      imageAlt: SAMPLE_SITE.heroAlt,
      images: [],
    },
    overview: {
      heading: "중심을 누리는\n완성된 주거",
      scheduleTitle: t("phScheduleTitle", "분양 일정"),
      body: SAMPLE_SITE.overviewBody,
      disclaimer: "※ 본 페이지에 기재된 단지 정보는 이해를 돕기 위한 예시이며, 사업 진행에 따라 변경될 수 있습니다.",
      homepageUrl: "",
      homepageLabel: t("phOfficialHome", "분양 홈페이지"),
      noticeUrl: "",
      noticeLabel: t("phOfficialNotice", "입주자 모집공고"),
      stats: [
        { value: "525", label: "총 세대수" },
        { value: "29F", label: "최고 층수" },
        { value: "7", label: "주거동" },
        { value: "2027.09", label: "입주 예정" },
      ],
      facts: [
        { label: t("seedFactName", "사업명"), value: SAMPLE_SITE.name },
        { label: t("seedFactLocation", "위치"), value: SAMPLE_SITE.address },
        { label: t("seedFactScale", "규모"), value: "지하 3층 ~ 지상 29층, 7개동" },
        { label: t("seedFactHouseholds", "세대수"), value: "총 525세대" },
        { label: t("seedFactArea", "주택형"), value: "59㎡ · 84㎡" },
        { label: t("seedFactMoveIn", "입주예정"), value: "2027년 9월 예정" },
      ],
      // 시안 overview에는 분양 일정이 없다. 일정은 편집 시 추가.
      schedule: [],
    },
    location: {
      heading: "가까울수록,\n삶은 커집니다",
      body: "도보권 교통망부터 풍부한 생활 인프라까지, 일상이 가까워지는 입지입니다.",
      galleryCaption: SAMPLE_SITE.locationCaption,
      matrix: [
        { icon: "transit-hub", label: t("iconTransit", "교통"), body: SAMPLE_SITE.transitBody },
        { icon: "prime-location", label: t("iconLife", "생활"), body: SAMPLE_SITE.lifeBody },
        { icon: "premium-school-district", label: t("iconSchool", "교육"), body: SAMPLE_SITE.schoolBody },
        { icon: "residential-environment", label: t("iconGreen", "녹지"), body: SAMPLE_SITE.greenBody },
      ],
      cards: [],
      images: [
        { url: img("location-aerial.png"), alt: "입지 위치도", caption: "" },
        { url: img("location-transit.png"), alt: "교통" },
        { url: img("location-life.png"), alt: "생활편의" },
        { url: img("location-school.png"), alt: "학군" },
        { url: img("location-nature.png"), alt: "공원·녹지" },
        { url: img("location-dev.png"), alt: "개발호재" },
      ],
    },
    premium: {
      heading: "프리미엄",
      body: SAMPLE_SITE.premiumBody,
      copyHeadline: SAMPLE_SITE.premiumHeadline,
      copyBody: SAMPLE_SITE.premiumCopy,
      galleryCaption: SAMPLE_SITE.galleryCaption,
      images: [{ url: img("hero-main.png"), alt: SAMPLE_SITE.galleryCaption, caption: "" }],
      items: [
        { icon: "ocean-view-residence", title: SAMPLE_SITE.viewTitle, body: SAMPLE_SITE.viewBody, imageUrl: img("premium-ocean.png") },
        { icon: "transit-hub", title: SAMPLE_SITE.transitTitle, body: SAMPLE_SITE.transitBody, imageUrl: img("premium-transit.png") },
        { icon: "premium-school-district", title: "명품 학군", body: "도보권 학군과 생활 인프라를 갖춘 주거 환경", imageUrl: img("premium-school.png") },
        { icon: "residential-environment", title: "스마트 라이프", body: "AI 주차와 얼굴인식 출입 등, 단지 생활이 한층 편리해집니다.", imageUrl: img("premium-smart.png") },
      ],
    },
    floorplan: {
      heading: "생활을 읽은\n정교한 설계",
      body: "라이프스타일에 맞춘 다양한 타입 구성",
      disclaimer: "※ 평면도는 이해를 돕기 위한 이미지이며, 실제 시공 시 일부 변경될 수 있습니다.",
      activeTypeIndex: 0,
      types: [
        {
          name: "58A",
          summary: "전용 59.84㎡ · 약 25평형",
          exclusiveArea: "59.84㎡ (약 25평형)",
          supplyArea: "81.27㎡",
          rooms: "방3 · 욕실2 (4BAY)",
          specs: [
            { label: floorLabels.exclusive, value: "59.84㎡ (약 25평형)" },
            { label: floorLabels.supply, value: "81.27㎡" },
            { label: floorLabels.rooms, value: "방3 · 욕실2 (4BAY)" },
            { label: floorLabels.price, value: "약 6억 2,200만원" },
          ],
          imageUrl: img("floor-58a.png"),
          images: [{ url: img("floor-58a.png"), alt: "58A 평면도" }],
        },
        {
          name: "84A",
          summary: "전용 84.99㎡ · 약 34평형",
          exclusiveArea: "84.99㎡ (약 34평형)",
          supplyArea: "113.97㎡",
          rooms: "방4 · 욕실2 (4BAY)",
          specs: [
            { label: floorLabels.exclusive, value: "84.99㎡ (약 34평형)" },
            { label: floorLabels.supply, value: "113.97㎡" },
            { label: floorLabels.rooms, value: "방4 · 욕실2 (4BAY)" },
            { label: floorLabels.price, value: "약 8억 4,100만원" },
          ],
          imageUrl: img("floor-84a.png"),
          images: [{ url: img("floor-84a.png"), alt: "84A 평면도" }],
        },
      ],
    },
    lead_form: {
      heading: "관심고객 등록",
      intro: SAMPLE_LEAD_INTRO,
      perkHeadline: "지금 등록하면\n먼저 받는 혜택",
      perkBody: "잔여세대와 분양가, 계약 조건을 가장 먼저 안내해 드립니다",
      perks: [
        { text: "잔여세대·분양 조건 우선 안내" },
        { text: "타입별 분양가·한정 혜택" },
        { text: "견본주택 1:1 방문 예약" },
        { text: "전담 상담·자금계획 안내" },
      ],
      phone: "",
    },
    directions: {
      heading: t("phDirections", "오시는 길"),
      headingSuffix: "",
      placeLabel: "견본주택",
      body: "견본주택 및 현장 방문 전 위치를 확인해 주세요",
      placeName: SAMPLE_SITE.placeName,
      phone: "",
      address: SAMPLE_SITE.address,
      guide: "방문 전 관심고객 등록 또는 전화 예약을 권장드립니다.",
      hours: "평일/주말 10:00 ~ 18:00",
      parking: "방문 전 상담실에 주차 안내를 문의해 주세요.",
      mapImageUrl: img("directions-map.png"),
      routes: [
        { label: t("phTransit", "지하철"), detail: SAMPLE_SITE.transitRoute },
        { label: t("seedRouteBus", "버스"), detail: SAMPLE_SITE.busRoute },
      ],
    },
    legal: {
      body: "본 페이지는 분양 광고 랜딩페이지 예시입니다. 실제 분양 조건 및 세부 내용은 입주자 모집공고와 공식 안내를 기준으로 확인해 주세요.",
      developerName: SAMPLE_SITE.developer,
      builderName: SAMPLE_SITE.builder,
      contact: "",
      notices: [],
      footerNote: "",
    },
  };
}

const SAMPLE_DEAD_CONTENT_KEYS = [
  "mediaMode",
  "priceLine",
  "imageAssetId",
  "mapImageAssetId",
  "videoUrl",
  "posterUrl",
  "mobileImageUrl",
] as const;

export function applySampleCopy(sections: PageSection[], settings?: Record<string, unknown>): PageSection[] {
  const samples = sampleByType(settings);
  return sections.map((section) => {
    // 복제 섹션은 건드리지 않는다. 원본 섹션만 샘플로 덮어쓴다.
    if (section.isOriginal !== true) return section;
    // 출시 범위에서 FAQ·독립 gallery는 제외. 기존 프로젝트에 남아 있으면 샘플 적용 시 숨긴다.
    if (section.sectionType === "faq" || section.sectionType === "gallery") {
      return { ...section, isVisible: false, showInGnb: false };
    }
    const sample = samples[section.sectionType];
    if (!sample) return section;
    const content: Record<string, unknown> = { ...section.content, ...sample };
    for (const key of SAMPLE_DEAD_CONTENT_KEYS) delete content[key];
    return { ...section, content };
  });
}

/** 이벤트 팝업은 명시적으로 켠 경우에만 노출한다. (enabled === true) */
export function isPopupEnabled(popup: { enabled?: boolean } | null | undefined): boolean {
  return popup?.enabled === true;
}
