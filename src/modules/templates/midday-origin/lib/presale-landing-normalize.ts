import type {
  PresaleLandingData,
  PresaleSectionKey,
  PresaleImageSlot,
  PresaleFloorType,
  PresalePremiumCard,
  PresaleProductInterestType,
  PresaleOverviewStat,
  PresaleSpecRow,
} from "@midday/types/presale-landing";
import {
  PRESALE_GALLERY_MAX,
  PRESALE_CONSULTANT_DEFAULT_IMAGE,
  PRESALE_CONSULTANT_DEFAULT_PROFILE_URL,
  PRESALE_GNB_LOGO_DEFAULT_IMAGE,
  PRESALE_FLOORPLAN_DEFAULT_IMAGES,
  PRESALE_LOCATION_MAP_DEFAULT_IMAGE,
  PRESALE_POPUP_DEFAULT_DISCLAIMER,
  PRESALE_POPUP_DEFAULT_IMAGE,
  PRESALE_POPUP_DEFAULT_PERKS,
  PRESALE_PRODUCT_GALLERY_MOCKUPS,
  PRESALE_SITE_GALLERY_MOCKUPS,
  PRESALE_PREMIUM_GALLERY_MOCKUPS,
  PRESALE_SECTION_LABELS,
  PRESALE_SITE_MATRIX_DEFAULTS,
  DEFAULT_PRESALE_PRODUCT_INTEREST_TYPES,
  DEFAULT_PRESALE_TRUST_TAGS,
  PRESALE_TRUST_TAG_MAX,
  presaleGalleryImageLabel,
} from "@midday/types/presale-landing";
import {
  createDefaultPremiumCard,
  isPresalePremiumIconId,
  PRESALE_SITE_MATRIX_DEFAULT_ICONS,
  resolvePresalePremiumIconId,
} from "@midday/lib/presale-premium-icons";
import { rewriteLegacyPresaleDummyLead } from "@midday/lib/presale-serenoa-defaults";

export const PRESALE_SPEC_ROW_MAX = 20;

const PRESALE_SPEC_LEGACY_FIELDS = [
  ["위치", "specLocation"],
  ["공급규모", "specScale"],
  ["공급유형", "specSupplyType"],
  ["전용면적", "specArea"],
  ["입주예정", "specMoveIn"],
  ["시행시공", "specBuilder"],
] as const;

type PresaleSpecLegacyKey = (typeof PRESALE_SPEC_LEGACY_FIELDS)[number][1];

function specLabelKey(label: string): string {
  return label.replace(/[\s·ㆍ]/g, "");
}

function legacySpecPatch(rows: PresaleSpecRow[]): Partial<Record<PresaleSpecLegacyKey, string>> {
  const patch: Partial<Record<PresaleSpecLegacyKey, string>> = {};
  for (const row of rows) {
    const key = specLabelKey(row.label);
    const match = PRESALE_SPEC_LEGACY_FIELDS.find(([label]) => label === key);
    if (match) patch[match[1]] = row.value;
  }
  return patch;
}

/** 저장된 specRows가 없으면 기존 고정 필드 6개로 만든다. 빈 배열은 전부 삭제한 상태로 유지. */
export function normalizeProductSpecRows(
  product: PresaleLandingData["product"] | undefined
): PresaleSpecRow[] {
  if (Array.isArray(product?.specRows)) {
    return product.specRows.slice(0, PRESALE_SPEC_ROW_MAX).map((row) => ({
      label: typeof row?.label === "string" ? row.label : "",
      value: typeof row?.value === "string" ? row.value : "",
    }));
  }
  return PRESALE_SPEC_LEGACY_FIELDS.map(([label, key]) => ({
    label: label === "시행시공" ? "시행 · 시공" : label,
    value: product?.[key] ?? "",
  }));
}

/** 기본 FAQ 제목은 한 줄. 예전 기본값의 줄바꿈만 펼친다. */
function normalizeFaqTitle(title: string | undefined): string {
  const raw = (title ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw || raw === "FAQ" || raw.replace(/\s+/g, "") === "자주묻는질문") {
    return "자주 묻는 질문";
  }
  return raw;
}

export function withProductSpecRows(
  product: PresaleLandingData["product"],
  rows: PresaleSpecRow[]
): PresaleLandingData["product"] {
  const specRows = rows.slice(0, PRESALE_SPEC_ROW_MAX);
  return { ...product, ...legacySpecPatch(specRows), specRows };
}

/** 입지 큰 글씨 등 레거시 스펙 필드를 고치면, 같은 항목명의 specRows 값도 같이 바꾼다. */
export function patchProductLegacySpec(
  product: PresaleLandingData["product"],
  key: PresaleSpecLegacyKey,
  value: string
): PresaleLandingData["product"] {
  const next = { ...product, [key]: value };
  if (!Array.isArray(product.specRows)) return next;
  const label = PRESALE_SPEC_LEGACY_FIELDS.find(([, field]) => field === key)?.[0];
  if (!label) return next;
  const labelKey = specLabelKey(label);
  return {
    ...next,
    specRows: product.specRows.map((row) =>
      specLabelKey(row.label) === labelKey ? { ...row, value } : row
    ),
  };
}

/** 항상 최상단 고정 · 순서 변경·숨김 불가 */
export const PRESALE_PINNED_SECTION_KEY: PresaleSectionKey = "product";

/** 내용·노출 고정, 섹션 순서만 변경 가능 */
export const PRESALE_WHY_ZIGBANG_SECTION_KEY: PresaleSectionKey = "whyZigbang";

export const PRESALE_FIXED_SECTION_KEYS: PresaleSectionKey[] = [PRESALE_PINNED_SECTION_KEY];

export const PRESALE_ALWAYS_VISIBLE_SECTION_KEYS: PresaleSectionKey[] = [
  PRESALE_WHY_ZIGBANG_SECTION_KEY,
];

export function isPresaleFixedSection(key: PresaleSectionKey): boolean {
  return PRESALE_FIXED_SECTION_KEYS.includes(key);
}

export function isPresaleAlwaysVisibleSection(key: PresaleSectionKey): boolean {
  return PRESALE_ALWAYS_VISIBLE_SECTION_KEYS.includes(key);
}

export function isPresaleSectionToggleLocked(key: PresaleSectionKey): boolean {
  return isPresaleFixedSection(key) || isPresaleAlwaysVisibleSection(key);
}

/** GNB 앵커 메뉴에서 제외 (상품 상단=로고, WHY=브랜딩 고정 블록) */
export const PRESALE_GNB_EXCLUDED_SECTION_KEYS: PresaleSectionKey[] = [
  PRESALE_PINNED_SECTION_KEY,
  PRESALE_WHY_ZIGBANG_SECTION_KEY,
];

export function getPresaleGnbNavKeys(
  sectionOrder: PresaleSectionKey[],
  visibleSections: Record<PresaleSectionKey, boolean>
): PresaleSectionKey[] {
  const excluded = new Set(PRESALE_GNB_EXCLUDED_SECTION_KEYS);
  return sectionOrder.filter((key) => !excluded.has(key) && visibleSections[key]);
}

export const DEFAULT_PRESALE_SECTION_ORDER: PresaleSectionKey[] = [
  "product",
  "overview",
  "site",
  "premium",
  "floorplan",
  "register",
  "consultant",
  "location",
];

/** product는 항상 맨 앞 */
export function enforcePresaleSectionOrder(order: PresaleSectionKey[]): PresaleSectionKey[] {
  const allowed = new Set(DEFAULT_PRESALE_SECTION_ORDER);
  const seen = new Set<PresaleSectionKey>();
  const merged: PresaleSectionKey[] = [];

  for (const key of order) {
    if (allowed.has(key) && !seen.has(key)) {
      merged.push(key);
      seen.add(key);
    }
  }
  for (const key of DEFAULT_PRESALE_SECTION_ORDER) {
    if (!seen.has(key)) {
      merged.push(key);
      seen.add(key);
    }
  }

  const pinned = PRESALE_PINNED_SECTION_KEY;
  const withoutPinned = merged.filter((k) => k !== pinned);
  return [pinned, ...withoutPinned];
}

/** localStorage·구버전 draft 호환 — 편집 중 blob URL은 유지 */
function resolveConsultantImageUrl(url?: string): string {
  const trimmed = url?.trim() ?? "";
  if (trimmed.startsWith("blob:")) return trimmed;
  if (!trimmed) return PRESALE_CONSULTANT_DEFAULT_IMAGE;
  return trimmed;
}

function resolveGnbLogoUrl(url?: string): string {
  const trimmed = url?.trim() ?? "";
  if (trimmed.startsWith("blob:")) return trimmed;
  if (!trimmed) return PRESALE_GNB_LOGO_DEFAULT_IMAGE;
  return trimmed;
}

function resolvePopupImageUrl(url?: string): string {
  const trimmed = url?.trim() ?? "";
  if (trimmed.startsWith("blob:")) return trimmed;
  if (!trimmed) return PRESALE_POPUP_DEFAULT_IMAGE;
  return trimmed;
}

function normalizePopupPerks(perks: string[] | undefined): string[] {
  const list = (perks ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [...PRESALE_POPUP_DEFAULT_PERKS];
}

function resolveFloorplanDefaultImage(type: PresaleFloorType & { imageUrl?: string }): string {
  const legacyUrl = type.imageUrl?.trim() ?? "";
  if (legacyUrl.startsWith("blob:")) return legacyUrl;
  if (legacyUrl) return legacyUrl;
  const firstImage = type.images?.[0]?.url?.trim() ?? "";
  if (firstImage.startsWith("blob:")) return firstImage;
  if (firstImage) return firstImage;
  const idKey = type.id.trim().toLowerCase();
  const tabKey = type.tabLabel.trim().toLowerCase();
  return PRESALE_FLOORPLAN_DEFAULT_IMAGES[idKey] ?? PRESALE_FLOORPLAN_DEFAULT_IMAGES[tabKey] ?? "";
}

function normalizeFloorplanTypeImages(
  type: PresaleFloorType & { imageUrl?: string }
): PresaleFloorType {
  const defaultUrl = resolveFloorplanDefaultImage(type);
  const mockups: PresaleImageSlot[] = defaultUrl
    ? [{ url: defaultUrl, label: presaleGalleryImageLabel(0) }]
    : [];

  let images = type.images;
  if (!images || images.length === 0) {
    images = mockups.length > 0 ? [...mockups] : [{ url: "", label: presaleGalleryImageLabel(0) }];
  } else {
    images = images.slice(0, PRESALE_GALLERY_MAX).map((img, i) => ({
      label: img.label?.trim() || presaleGalleryImageLabel(i),
      url:
        i === 0
          ? resolveGallerySlotUrl(img.url, 0, mockups)
          : img.url?.trim().startsWith("blob:")
            ? img.url
            : img.url?.trim() ?? "",
    }));
  }

  const activeImageIndex = Math.min(
    Math.max(0, type.activeImageIndex ?? 0),
    Math.max(0, images.length - 1)
  );

  return { ...type, images, activeImageIndex };
}

function normalizeFloorplanTypes(
  types: (PresaleFloorType & { imageUrl?: string })[] | undefined
): PresaleFloorType[] {
  return (types ?? []).map((type) => normalizeFloorplanTypeImages(type));
}

function resolveLocationMapImageUrl(url: string | undefined): string {
  const trimmed = url?.trim() ?? "";
  if (trimmed.startsWith("blob:")) return trimmed;
  if (trimmed) return trimmed;
  return PRESALE_LOCATION_MAP_DEFAULT_IMAGE;
}

function resolveConsultantProfileUrl(url: string | undefined): string {
  const trimmed = url?.trim() ?? "";
  if (trimmed) return trimmed;
  return PRESALE_CONSULTANT_DEFAULT_PROFILE_URL;
}

function normalizePremiumCards(cards: PresalePremiumCard[] | undefined): PresalePremiumCard[] {
  const list = (cards ?? []).map((card, index) => ({
    ...card,
    icon: resolvePresalePremiumIconId(card.icon, index),
    title: card.title?.trim() || "카드 제목",
    description: card.description?.trim() || "카드 설명을 입력하세요.",
    imageUrl: card.imageUrl?.trim() ?? "",
  }));
  if (list.length > 0) return list;
  return [
    createDefaultPremiumCard(0),
    createDefaultPremiumCard(1),
    createDefaultPremiumCard(2),
    createDefaultPremiumCard(3),
  ];
}

/** 갤러리 슬롯 — 빈 값은 목업, 편집 중 blob URL은 유지 */
function resolveGallerySlotUrl(
  url: string | undefined,
  index: number,
  mockups: PresaleImageSlot[]
): string {
  const trimmed = url?.trim() ?? "";
  if (trimmed.startsWith("blob:")) return trimmed;
  const mock = mockups[index];
  if (!mock) return trimmed;
  if (!trimmed) return mock.url;
  return trimmed;
}

function normalizeGallery(
  images: PresaleImageSlot[] | undefined,
  mockups: PresaleImageSlot[]
): PresaleImageSlot[] {
  const sliced = (images ?? []).slice(0, PRESALE_GALLERY_MAX);

  // 빈 갤러리만 목업으로 시드. 이미 슬롯이 있으면 개수·URL을 유지한다.
  // (편집 중 삭제 후 목업 장수로 다시 채워지던 버그 방지)
  if (sliced.length === 0) {
    return mockups.slice(0, PRESALE_GALLERY_MAX).map((mock, i) => ({
      label: presaleGalleryImageLabel(i),
      url: mock.url,
      ...(mock.caption?.trim() ? { caption: mock.caption.trim() } : {}),
    }));
  }

  return sliced.map((img, i) => {
    const raw = img.url?.trim() ?? "";
    // 편집 중 blob URL은 유지. 빈 칸은 빈 칸으로 두고 목업으로 다시 채우지 않음.
    const url = raw.startsWith("blob:") ? raw : raw;
    const caption = typeof img.caption === "string" ? img.caption.trim() : "";
    return {
      label: img.label?.trim() || presaleGalleryImageLabel(i),
      url,
      ...(caption ? { caption } : {}),
    };
  });
}

function normalizeProductGallery(images: PresaleImageSlot[] | undefined): PresaleImageSlot[] {
  return normalizeGallery(images, PRESALE_PRODUCT_GALLERY_MOCKUPS);
}

function normalizeSiteGallery(images: PresaleImageSlot[] | undefined): PresaleImageSlot[] {
  return normalizeGallery(images, PRESALE_SITE_GALLERY_MOCKUPS);
}

function normalizePremiumGallery(images: PresaleImageSlot[] | undefined): PresaleImageSlot[] {
  return normalizeGallery(images, PRESALE_PREMIUM_GALLERY_MOCKUPS);
}

function normalizeOverviewStats(raw: unknown): PresaleOverviewStat[] {
  if (Array.isArray(raw)) {
    const next = raw
      .slice(0, 4)
      .map((item) => {
        const row = item as { value?: unknown; label?: unknown };
        return {
          value: String(row?.value ?? "").trim(),
          label: String(row?.label ?? "").trim(),
        };
      })
      .filter((item) => item.value || item.label);
    if (next.length > 0) return next;
  }
  return [
    { value: "525", label: "총 세대수" },
    { value: "29F", label: "최고 층수" },
    { value: "7", label: "주거동" },
    { value: "2027.09", label: "입주 예정" },
  ];
}

/** contentEditable→미리보기 전환 시 생긴 정확히 2배 중복 문자열 복구 */
function repairDoubledText(text: string): string {
  if (!text || text.length % 2 !== 0) return text;
  const half = text.length / 2;
  const first = text.slice(0, half);
  return first === text.slice(half) ? first : text;
}

type LegacyTrustProduct = {
  trustTags?: string[];
  trust1?: string;
  trust2?: string;
  trust3?: string;
};

function normalizeProductTrustTags(product: LegacyTrustProduct): string[] {
  if (Array.isArray(product.trustTags) && product.trustTags.length > 0) {
    const normalized = product.trustTags.map((tag) => tag.trim()).filter(Boolean);
    if (normalized.length > 0) return normalized.slice(0, PRESALE_TRUST_TAG_MAX);
  }
  const legacy = [product.trust1, product.trust2, product.trust3]
    .map((tag) => tag?.trim())
    .filter(Boolean) as string[];
  if (legacy.length > 0) return legacy.slice(0, PRESALE_TRUST_TAG_MAX);
  return [...DEFAULT_PRESALE_TRUST_TAGS];
}

function normalizeFixedStringSlots(
  raw: string[] | undefined,
  defaults: readonly string[]
): string[] {
  const src = Array.isArray(raw) ? raw : [];
  return defaults.map((fallback, i) => {
    const value = typeof src[i] === "string" ? src[i].trim() : "";
    return value || fallback;
  });
}

function normalizeSiteMatrixIcons(raw: string[] | undefined): string[] {
  const src = Array.isArray(raw) ? raw : [];
  return PRESALE_SITE_MATRIX_DEFAULT_ICONS.map((fallback, i) => {
    const value = typeof src[i] === "string" ? src[i].trim() : "";
    if (!value) return fallback;
    if (isPresalePremiumIconId(value)) return value;
    return resolvePresalePremiumIconId(value, i);
  });
}

function normalizeProductInterestTypes(
  types: PresaleProductInterestType[] | undefined
): PresaleProductInterestType[] {
  const source = types?.length ? types : DEFAULT_PRESALE_PRODUCT_INTEREST_TYPES;
  const normalized = source.map((item, index) => ({
    code: item.code?.trim() || `타입${index + 1}`,
    label: item.label?.trim() || "평형 타입",
    detail: item.detail?.trim() || "",
  }));
  return normalized.length > 0 ? normalized : DEFAULT_PRESALE_PRODUCT_INTEREST_TYPES.map((item) => ({ ...item }));
}

/** UNIT PLAN(평면) 타입 → 관심고객 등록 관심 타입 */
export function interestTypesFromFloorplan(
  types: PresaleFloorType[] | undefined
): PresaleProductInterestType[] {
  return (types ?? [])
    .map((type, index) => {
      const code = (type.tabLabel || type.typeLabel || "").trim() || `타입${index + 1}`;
      const title = type.title?.trim() ?? "";
      const label = title && title !== code ? `${code} · ${title}` : code;
      return { code, label, detail: "" };
    })
    .filter((item) => Boolean(item.code));
}

/** 관심고객 모달 옵션 — 평면 타입이 있으면 그걸 우선 사용. 끝에 「미정」을 둔다. */
export function resolveInterestTypeFormOptions(
  data: PresaleLandingData
): { label: string }[] {
  const fromFloor = interestTypesFromFloorplan(data.floorplan?.types);
  const base =
    fromFloor.length > 0
      ? fromFloor.map((opt) => ({ label: opt.label }))
      : normalizeProductInterestTypes(data.product?.interestTypes).map((opt) => ({
          label: opt.label,
        }));
  if (base.some((opt) => opt.label === "미정")) return base;
  return [...base, { label: "미정" }];
}

/** 평면 타입 변경 시 product.interestTypes도 함께 맞춤 */
export function withFloorplanTypesAndInterestSync(
  data: PresaleLandingData,
  types: PresaleFloorType[],
  floorplanPatch?: Partial<PresaleLandingData["floorplan"]>
): PresaleLandingData {
  const synced = interestTypesFromFloorplan(types);
  return {
    ...data,
    floorplan: { ...data.floorplan, ...floorplanPatch, types },
    product: {
      ...data.product,
      interestTypes: synced.length > 0 ? synced : data.product.interestTypes,
    },
  };
}

function repairDoubledStrings<T>(value: T): T {
  if (typeof value === "string") return repairDoubledText(value) as T;
  if (Array.isArray(value)) return value.map(repairDoubledStrings) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, repairDoubledStrings(v)])
    ) as T;
  }
  return value;
}

/** 브라우저 재시작 후 무효화된 blob: URL 제거 (서버·localStorage 로드용) */
function stripEphemeralBlobUrls<T>(value: T): T {
  if (typeof value === "string") {
    return (value.trim().startsWith("blob:") ? "" : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripEphemeralBlobUrls(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripEphemeralBlobUrls(v)])
    ) as T;
  }
  return value;
}

/** DB·스냅샷에서 불러올 때 — 죽은 blob URL은 기본 이미지로 대체 */
export function normalizePresaleLandingDataFromPersistence(input: PresaleLandingData): PresaleLandingData {
  const stripped = stripEphemeralBlobUrls(JSON.parse(JSON.stringify(input)) as PresaleLandingData);
  return normalizePresaleLandingData(stripped);
}

export function normalizePresaleLandingData(input: PresaleLandingData): PresaleLandingData {
  const data = repairDoubledStrings(input);
  const pinnedOrder = enforcePresaleSectionOrder(data.sectionOrder ?? []);

  const thumbImages = normalizeSiteGallery(data.site.thumbImages);
  const siteImages = thumbImages.map((img, i) => {
    if (typeof img.caption === "string") {
      return { ...img, caption: img.caption.trim() };
    }
    const caption =
      (i === 0 ? data.site.caption?.trim() : "") ||
      PRESALE_SITE_GALLERY_MOCKUPS[i]?.caption?.trim() ||
      "";
    return { ...img, caption };
  });

  const productGallery = normalizeProductGallery(data.product.galleryImages);
  const galleryImages = productGallery;

  const premiumGallery = normalizePremiumGallery(data.premium?.galleryImages);
  const floorplanTypes = normalizeFloorplanTypes(data.floorplan.types);
  const interestTypesFromFloor = interestTypesFromFloorplan(floorplanTypes);
  const specRows = normalizeProductSpecRows(data.product);

  const contactPhone =
    data.gnb?.phone?.trim() ||
    data.footer?.phone?.trim() ||
    data.register?.bottomPhone?.trim() ||
    data.location?.phone?.trim() ||
    "";
  const brandSiteName =
    data.gnb?.siteName?.trim() ||
    data.product?.siteName?.trim() ||
    data.footer?.siteName?.trim() ||
    "";
  const brandSubtitle = data.gnb?.navSubtitle?.trim() || data.footer?.subtitle?.trim() || "";
  const skin =
    data.skin === "midday"
      ? "midday"
      : data.skin === "serenoa"
        ? "serenoa"
        : data.skin === "hognono"
          ? "hognono"
          : "premium";

  return {
    ...data,
    skin,
    gnb: {
      ...data.gnb,
      logoUrl: resolveGnbLogoUrl(data.gnb?.logoUrl),
      phone: contactPhone,
      siteName: brandSiteName,
      navSubtitle: brandSubtitle,
    },
    footer: {
      ...data.footer,
      phone: contactPhone,
      siteName: brandSiteName,
      subtitle: brandSubtitle,
    },
    sectionOrder: pinnedOrder,
    visibleSections: {
      ...data.visibleSections,
      [PRESALE_PINNED_SECTION_KEY]: true,
      [PRESALE_WHY_ZIGBANG_SECTION_KEY]: true,
    },
    product: {
      ...data.product,
      lead: rewriteLegacyPresaleDummyLead(data.product.lead, skin),
      siteName: brandSiteName || data.product.siteName,
      siteNameCrumb: brandSiteName || data.product.siteNameCrumb,
      galleryImages,
      mainImage: {
        label: galleryImages[0]?.label ?? data.product.mainImage.label,
        url: galleryImages[0]?.url ?? "",
      },
      interestTypes:
        interestTypesFromFloor.length > 0
          ? interestTypesFromFloor
          : normalizeProductInterestTypes(data.product.interestTypes),
      trustTags: normalizeProductTrustTags(data.product),
      ...legacySpecPatch(specRows),
      specRows,
    },
    register: {
      ...data.register,
      title: PRESALE_SECTION_LABELS.register,
      bottomPhone: contactPhone,
      privacyContactName: data.register.privacyContactName ?? "",
      externalRegisterUrl: data.register.externalRegisterUrl ?? "",
      copyHeadline: (data.register.copyHeadline ?? "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.replace(/\s{2,}/g, " ").trim())
        .join("\n")
        .trim(),
    },
    overview: {
      ...data.overview,
      title: data.overview.title?.trim() || PRESALE_SECTION_LABELS.overview,
      stats: normalizeOverviewStats(data.overview.stats),
    },
    site: {
      ...data.site,
      title: data.site.title?.trim() || PRESALE_SECTION_LABELS.site,
      thumbImages: siteImages,
      caption: siteImages[0]?.caption?.trim() || data.site.caption?.trim() || "",
      mainImage: {
        label: siteImages[0]?.label ?? data.site.mainImage.label,
        url: siteImages[0]?.url ?? "",
        ...(siteImages[0]?.caption?.trim()
          ? { caption: siteImages[0].caption.trim() }
          : {}),
      },
      matrixLabels: normalizeFixedStringSlots(
        data.site.matrixLabels,
        PRESALE_SITE_MATRIX_DEFAULTS.map((item) => item.cat)
      ),
      matrixBlurbs: normalizeFixedStringSlots(
        data.site.matrixBlurbs,
        PRESALE_SITE_MATRIX_DEFAULTS.map((item) => item.blurb)
      ),
      matrixIcons: normalizeSiteMatrixIcons(data.site.matrixIcons),
    },
    premium: {
      ...data.premium,
      title: data.premium.title?.trim() || PRESALE_SECTION_LABELS.premium,
      cards: normalizePremiumCards(data.premium.cards),
      galleryImages: premiumGallery,
      galleryCaption:
        data.premium?.galleryCaption?.trim() ||
        `${premiumGallery[0]?.label ?? "조감도"} · ${brandSiteName}`,
    },
    floorplan: {
      ...data.floorplan,
      title: data.floorplan.title?.trim() || PRESALE_SECTION_LABELS.floorplan,
      types: floorplanTypes,
    },
    faq: {
      ...data.faq,
      title: normalizeFaqTitle(data.faq.title),
    },
    location: {
      ...data.location,
      sectionTitle: PRESALE_SECTION_LABELS.location,
      headingVenueLabel: data.location.headingVenueLabel?.trim() || "모델하우스",
      phone: contactPhone,
      naverMapUrl: data.location.naverMapUrl?.trim() ?? "",
      mapImageUrl: resolveLocationMapImageUrl(data.location.mapImageUrl),
    },
    consultant: {
      ...data.consultant,
      imageUrl: resolveConsultantImageUrl(data.consultant.imageUrl),
      kakaoChannelUrl: data.consultant.kakaoChannelUrl?.trim() ?? "",
      consultantSlug: data.consultant.consultantSlug?.trim() || undefined,
      phone: data.consultant.phone?.trim() ?? "",
      profileUrl: data.consultant.consultantSlug?.trim()
        ? `/consultants/${encodeURIComponent(data.consultant.consultantSlug.trim())}`
        : resolveConsultantProfileUrl(data.consultant.profileUrl),
    },
    popup: {
      ...data.popup,
      enabled: data.popup.enabled ?? true,
      ctaLabel: data.popup.ctaLabel?.trim() || "관심고객 등록하기",
      imageUrl: resolvePopupImageUrl(data.popup.imageUrl),
      perks: normalizePopupPerks(data.popup.perks),
      disclaimer: data.popup.disclaimer?.trim() || PRESALE_POPUP_DEFAULT_DISCLAIMER,
      phone: data.popup.phone?.trim() || contactPhone,
    },
  };
}

/** GNB·히어로·푸터 현장명을 묶고, 오시는 길 장소명이 같은 접두면 같이 갱신 */
export function applyPresaleLinkedSiteName(
  data: PresaleLandingData,
  siteName: string
): PresaleLandingData {
  const prev = (data.product.siteName || data.gnb.siteName || "").trim();
  let placeName = data.location.placeName;
  if (prev && placeName.startsWith(prev)) {
    placeName = siteName + placeName.slice(prev.length);
  }
  return {
    ...data,
    gnb: { ...data.gnb, siteName },
    product: { ...data.product, siteName, siteNameCrumb: siteName },
    footer: { ...data.footer, siteName },
    location: { ...data.location, placeName },
  };
}

/** GNB·푸터·관심고객·오시는 길·플로트 문의번호 전화를 묶음. 상담사·팝업 번호는 제외 */
export function applyPresaleLinkedPhone(
  data: PresaleLandingData,
  phone: string
): PresaleLandingData {
  return {
    ...data,
    gnb: { ...data.gnb, phone },
    footer: { ...data.footer, phone },
    register: { ...data.register, bottomPhone: phone },
    location: { ...data.location, phone },
  };
}

export function reorderPresaleSections(
  order: PresaleSectionKey[],
  fromKey: PresaleSectionKey,
  toKey: PresaleSectionKey
): PresaleSectionKey[] {
  if (isPresaleFixedSection(fromKey) || isPresaleFixedSection(toKey)) {
    return order;
  }
  if (fromKey === toKey) return order;
  const next = [...order];
  const from = next.indexOf(fromKey);
  const to = next.indexOf(toKey);
  if (from < 0 || to < 0) return order;
  next.splice(from, 1);
  next.splice(to, 0, fromKey);
  return enforcePresaleSectionOrder(next);
}
