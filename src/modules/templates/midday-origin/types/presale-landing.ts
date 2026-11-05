/**
 * 분양 랜딩 인라인 편집기 v2 — premium_presale_landing 템플릿 스키마
 * DB `template_type`: PREMIUM. 랜딩은 PREMIUM(ver.2) 계열만 지원.
 */

export const PRESALE_TEMPLATE_ID = "premium_presale_landing" as const;

export const PRESALE_GALLERY_MAX = 10;

/** editor-v2 상담사 기본 프로필 이미지 */
export const PRESALE_CONSULTANT_DEFAULT_IMAGE = "/images/presale/consultant-default.png";

/** GNB 로고 기본 이미지 (50×50) */
export const PRESALE_GNB_LOGO_DEFAULT_IMAGE = "/images/presale/gnb-logo-default.png";

/** 상담사 배지 — 고정 문구 (편집 불가) */
export const PRESALE_CONSULTANT_BADGE_LABEL = "🏆 호갱노노 공인 파트너";

/** 상담사 비즈프로필 기본 URL */
export const PRESALE_CONSULTANT_DEFAULT_PROFILE_URL =
  "https://kaelkim-sketch.github.io/hgn-listings/consultant-biz-profile-v2";

/** editor-v2 상품 상단 대표 조감도 목업 */
export const PRESALE_PRODUCT_AERIAL_DEFAULT_IMAGE = "/images/presale/product-aerial-default.png";

export const PRESALE_PRODUCT_CITY_DEFAULT_IMAGE = "/images/presale/product-city-default.png";
export const PRESALE_PRODUCT_LIFE_DEFAULT_IMAGE = "/images/presale/product-life-default.png";
export const PRESALE_PRODUCT_SCHOOL_DEFAULT_IMAGE = "/images/presale/product-school-default.png";
export const PRESALE_PRODUCT_MAP_DEFAULT_IMAGE = "/images/presale/product-map-default.png";

/** 오시는 길 지도 영역 기본 이미지 (지도 링크 연동 전) */
export const PRESALE_LOCATION_MAP_DEFAULT_IMAGE = "/images/presale/location-map-default.png";

/** 갤러리 슬롯 표시명 (1-based) */
export function presaleGalleryImageLabel(index: number): string {
  return `이미지 ${index + 1}`;
}

/** 상품 상단 갤러리 1~5번 기본 목업 */
export const PRESALE_PRODUCT_GALLERY_MOCKUPS: PresaleImageSlot[] = [
  { url: PRESALE_PRODUCT_AERIAL_DEFAULT_IMAGE, label: presaleGalleryImageLabel(0) },
  { url: PRESALE_PRODUCT_CITY_DEFAULT_IMAGE, label: presaleGalleryImageLabel(1) },
  { url: PRESALE_PRODUCT_LIFE_DEFAULT_IMAGE, label: presaleGalleryImageLabel(2) },
  { url: PRESALE_PRODUCT_SCHOOL_DEFAULT_IMAGE, label: presaleGalleryImageLabel(3) },
  { url: PRESALE_PRODUCT_MAP_DEFAULT_IMAGE, label: presaleGalleryImageLabel(4) },
];

/** editor-v2 입지조건 갤러리 1~5번 기본 목업 */
export const PRESALE_SITE_TRANSIT_DEFAULT_IMAGE = "/images/presale/site-transit-default.png";
export const PRESALE_SITE_SHOPPING_DEFAULT_IMAGE = "/images/presale/site-shopping-default.png";
export const PRESALE_SITE_SCHOOL_DEFAULT_IMAGE = "/images/presale/site-school-default.png";
export const PRESALE_SITE_PARK_DEFAULT_IMAGE = "/images/presale/site-park-default.png";
export const PRESALE_SITE_DEVELOPMENT_DEFAULT_IMAGE = "/images/presale/site-development-default.png";

export const PRESALE_SITE_GALLERY_MOCKUPS: PresaleImageSlot[] = [
  {
    url: PRESALE_SITE_TRANSIT_DEFAULT_IMAGE,
    label: presaleGalleryImageLabel(0),
    caption: "입지 위치도 · 서해선 배곧역 도보권",
  },
  {
    url: PRESALE_SITE_SHOPPING_DEFAULT_IMAGE,
    label: presaleGalleryImageLabel(1),
    caption: "생활 인프라 · 쇼핑·편의시설 밀집",
  },
  {
    url: PRESALE_SITE_SCHOOL_DEFAULT_IMAGE,
    label: presaleGalleryImageLabel(2),
    caption: "학세권 · 초·중·고 교육환경",
  },
  {
    url: PRESALE_SITE_PARK_DEFAULT_IMAGE,
    label: presaleGalleryImageLabel(3),
    caption: "공원 녹지 · 수변·산책 인프라",
  },
  {
    url: PRESALE_SITE_DEVELOPMENT_DEFAULT_IMAGE,
    label: presaleGalleryImageLabel(4),
    caption: "개발 호재 · 미래 가치 성장축",
  },
];

/** 프리미엄 섹션 스택 갤러리 기본 목업 (7장) */
export const PRESALE_PREMIUM_GALLERY_MOCKUPS: PresaleImageSlot[] = [
  { url: PRESALE_PRODUCT_CITY_DEFAULT_IMAGE, label: presaleGalleryImageLabel(0) },
  { url: PRESALE_SITE_PARK_DEFAULT_IMAGE, label: presaleGalleryImageLabel(1) },
  { url: PRESALE_SITE_DEVELOPMENT_DEFAULT_IMAGE, label: presaleGalleryImageLabel(2) },
  { url: PRESALE_PRODUCT_LIFE_DEFAULT_IMAGE, label: presaleGalleryImageLabel(3) },
  { url: PRESALE_SITE_TRANSIT_DEFAULT_IMAGE, label: presaleGalleryImageLabel(4) },
  { url: PRESALE_PRODUCT_SCHOOL_DEFAULT_IMAGE, label: presaleGalleryImageLabel(5) },
  { url: PRESALE_PRODUCT_AERIAL_DEFAULT_IMAGE, label: presaleGalleryImageLabel(6) },
];

/** WHY ZIGBANG · HOGANGNONO — 고정 섹션 (편집·숨김 불가) */
export const PRESALE_WHY_ZIGBANG_LOGO_ZB = "/images/gnb/zblogo.svg";
export const PRESALE_WHY_ZIGBANG_LOGO_HGN = "/images/gnb/hglogo.svg";
export const PRESALE_WHY_ZIGBANG_URL_ZB = "https://www.zigbang.com/";
export const PRESALE_WHY_ZIGBANG_URL_HGN = "https://hogangnono.com/";

export const PRESALE_WHY_BRAND_META = {
  zigbang: {
    label: "직방",
    logo: PRESALE_WHY_ZIGBANG_LOGO_ZB,
    url: PRESALE_WHY_ZIGBANG_URL_ZB,
  },
  hogangnono: {
    label: "호갱노노",
    logo: PRESALE_WHY_ZIGBANG_LOGO_HGN,
    url: PRESALE_WHY_ZIGBANG_URL_HGN,
  },
} as const;

export const PRESALE_SITE_MATRIX_DEFAULTS = [
  { cat: "TRAFFIC", blurb: "광역급행철도 예정 및 2개 노선 환승" },
  { cat: "LIFE", blurb: "대형마트·백화점·종합병원 생활권" },
  { cat: "EDU", blurb: "초·중·고교와 학원가 도보 이용" },
  { cat: "NATURE", blurb: "수변공원과 중앙공원을 가까이" },
] as const;

export const PRESALE_WHY_ZIGBANG_CARDS = [
  {
    n: "01",
    tag: "DEMAND DISCOVERY",
    title: "움직이는 수요 발견",
    description:
      "관심 지역을 반복 조회하거나 유사 단지를 비교하는 행동을 분석해, 현장에 반응할 가능성이 높은 수요를 발견합니다.",
  },
  {
    n: "02",
    tag: "CUSTOMER JOURNEY",
    title: "단계별 고객 여정 분석",
    description:
      "인지 → 탐색 → 비교 → 고려 → 문의 → 방문으로 이어지는 의사결정 흐름을 기반으로 전환 가능성을 판단합니다.",
  },
  {
    n: "03",
    tag: "CUSTOM TARGETING",
    title: "현장 맞춤 타겟팅",
    description:
      "지역·단지·가격·상품 조건·상담 행동을 종합해 분양 현장별로 적합한 고객군을 세분화합니다.",
  },
  {
    n: "04",
    tag: "AD EFFICIENCY",
    title: "광고 효율 극대화",
    description:
      "무분별한 노출보다 전환 가능성이 높은 고객에게 메시지를 집중해 광고 효율과 상담 전환 가능성을 높입니다.",
  },
] as const;

/** 이벤트 팝업 기본 이미지 (정사각형) */
export const PRESALE_POPUP_DEFAULT_IMAGE = "/images/presale/popup-event-default.png";

/** 평면안내 타입별 기본 평면도 */
export const PRESALE_FLOORPLAN_58A_DEFAULT_IMAGE = "/images/presale/floorplan-58a-default.png";
export const PRESALE_FLOORPLAN_84A_DEFAULT_IMAGE = "/images/presale/floorplan-84a-default.png";

export const PRESALE_FLOORPLAN_DEFAULT_IMAGES: Record<string, string> = {
  "58a": PRESALE_FLOORPLAN_58A_DEFAULT_IMAGE,
  "59a": PRESALE_FLOORPLAN_58A_DEFAULT_IMAGE,
  "84a": PRESALE_FLOORPLAN_84A_DEFAULT_IMAGE,
};

export const PRESALE_POPUP_DEFAULT_PERKS = [
  "스타벅스 아메리카노 기프티콘 증정",
  "잔여세대 동호수 우선 안내",
  "견본주택 1:1 방문 예약",
] as const;

export const PRESALE_POPUP_DEFAULT_DISCLAIMER = "※ 경품은 소진 시 조기 종료될 수 있습니다.";

export type PresalePopupData = {
  title: string;
  description: string;
  /** 방문 시 자동 노출 (미리보기 제외) */
  enabled: boolean;
  ctaLabel: string;
  /** 상단 프로모 이미지 (정사각형) */
  imageUrl: string;
  perks: string[];
  disclaimer: string;
  phone: string;
};

export type PresaleSectionKey =
  | "product"
  | "overview"
  | "site"
  | "premium"
  | "floorplan"
  | "whyZigbang"
  | "faq"
  | "register"
  | "consultant"
  | "location";

export interface PresaleImageSlot {
  url: string;
  label?: string;
  /** 입지 갤러리 등 — 이미지별 오버레이 캡션 */
  caption?: string;
}

export interface PresaleOverviewRow {
  label: string;
  value: string;
}

/** 상품 상단 스펙 표 (위치·공급규모 등). 항목명과 값을 추가·삭제할 수 있다. */
export interface PresaleSpecRow {
  label: string;
  value: string;
}

/** 사업개요 하단 수치 스트립 (레퍼런스 number-strip) */
export interface PresaleOverviewStat {
  value: string;
  label: string;
}

export interface PresaleFaqItem {
  question: string;
  answer: string;
}

/** 관심고객 등록 폼·상품 상단 평형(타입) 선택 옵션 */
export interface PresaleProductInterestType {
  code: string;
  label: string;
  detail: string;
}

export const DEFAULT_PRESALE_PRODUCT_INTEREST_TYPES: PresaleProductInterestType[] = [
  { code: "59A", label: "59A타입 · 전용 59㎡", detail: "전용 59㎡ · 분양가 약 6.2억" },
  { code: "84A", label: "84A타입 · 전용 84㎡ (인기)", detail: "전용 84㎡ · 분양가 약 8.41억" },
];

export const PRESALE_TRUST_TAG_MAX = 8;

export const DEFAULT_PRESALE_TRUST_TAGS = [
  "당일 상담 가능",
  "모델하우스 운영중",
  "1:1 맞춤 분양 안내",
] as const;

export interface PresaleFloorType {
  id: string;
  tabLabel: string;
  typeLabel: string;
  title: string;
  images: PresaleImageSlot[];
  activeImageIndex: number;
  specs: { label: string; value: string }[];
}

export interface PresalePremiumCard {
  icon: string;
  title: string;
  description: string;
  /** 카드 호버 시 커서를 따라다니는 미리보기 이미지 */
  imageUrl?: string;
}

export interface PresaleConsultant {
  name: string;
  badge: string;
  description: string;
  imageUrl: string;
  profileUrl: string;
  kakaoChannelUrl: string;
  /** 공개 상담사 프로필 slug — 있으면 사이트 프로필에 고정 연동 */
  consultantSlug?: string;
  /** 상담사 연락처 (상담사 연결 모달용) */
  phone?: string;
}

export interface PresaleLocation {
  sectionTitle: string;
  /** 섹션 제목 앞부분 — 예: "모델하우스" (뒤 " 오시는 길"은 고정) */
  headingVenueLabel: string;
  sectionDescription: string;
  placeName: string;
  address: string;
  phone: string;
  hours: string;
  note: string;
  /** 선택 — 약도 이미지 클릭 시 새 탭으로 열 지도 URL (네이버/카카오 등). iframe 임베드 불가 */
  naverMapUrl: string;
  /** 오시는 길 영역에 표시할 약도·지도 캡처 이미지 */
  mapImageUrl: string;
}

export interface PresaleLandingData {
  template: typeof PRESALE_TEMPLATE_ID;
  /** 비주얼 스킨 — 섹션·필드 스키마는 동일, 디자인만 분기 */
  skin?: "premium" | "artem" | "midday" | "serenoa" | "hognono";
  /** 호갱노노 단지상세형 전용 설정 (midday 이식에서는 미사용) */
  hognono?: Record<string, unknown>;
  visibleSections: Record<PresaleSectionKey, boolean>;
  gnb: {
    siteName: string;
    navSubtitle: string;
    phone: string;
    logoUrl: string;
  };
  product: {
    region1: string;
    region2: string;
    siteNameCrumb: string;
    badge: string;
    siteName: string;
    lead: string;
    priceLabel: string;
    priceType: string;
    priceMain: string;
    priceSub: string;
    priceNote: string;
    specLocation: string;
    specScale: string;
    specSupplyType: string;
    specArea: string;
    specMoveIn: string;
    specBuilder: string;
    /** 없으면 위 고정 필드 6개로 채운다 */
    specRows?: PresaleSpecRow[];
    coupon: string;
    trustTags: string[];
    mainImage: PresaleImageSlot;
    galleryImages: PresaleImageSlot[];
    interestTypes: PresaleProductInterestType[];
  };
  overview: {
    title: string;
    description: string;
    rows: PresaleOverviewRow[];
    stats: PresaleOverviewStat[];
    disclaimer: string;
  };
  site: {
    title: string;
    description: string;
    caption: string;
    mainImage: PresaleImageSlot;
    thumbImages: PresaleImageSlot[];
    /** 입지 매트릭스 카테고리 라벨 4개 (TRAFFIC / LIFE / EDU / NATURE) */
    matrixLabels: string[];
    /** 입지 매트릭스 보조 설명 4개 */
    matrixBlurbs: string[];
    /** 입지 매트릭스 아이콘 id 4개 (`PresalePremiumIconId`) */
    matrixIcons: string[];
  };
  premium: {
    title: string;
    description: string;
    copyHeadline: string;
    copyBody: string;
    galleryCaption: string;
    galleryImages: PresaleImageSlot[];
    cards: PresalePremiumCard[];
  };
  floorplan: {
    title: string;
    description: string;
    types: PresaleFloorType[];
    activeTypeIndex: number;
  };
  faq: {
    title: string;
    description: string;
    items: PresaleFaqItem[];
  };
  register: {
    title: string;
    description: string;
    copyHeadline: string;
    copyBody: string;
    perks: string[];
    bottomPhone: string;
    /** 개인정보 책임자(법인명) — 동의 전문 1항 사업주체 표기, 미입력 시 일반 문구 */
    privacyContactName?: string;
    /**
     * 선택적 외부 등록 URL(구글폼 등).
     * CTA는 내부 수집 폼이 기본이며, 설정 시 보조 링크로 안내할 수 있습니다.
     */
    externalRegisterUrl?: string;
  };
  consultant: PresaleConsultant;
  location: PresaleLocation;
  footer: {
    siteName: string;
    subtitle: string;
    phone: string;
    info: string;
  };
  popup: PresalePopupData;
  /** 본문 섹션 표시 순서 (GNB·푸터 제외) */
  sectionOrder: PresaleSectionKey[];
}

export const PRESALE_SECTION_LABELS: Record<PresaleSectionKey, string> = {
  product: "상품 상단",
  overview: "사업개요",
  site: "입지조건",
  premium: "프리미엄",
  floorplan: "평면안내",
  whyZigbang: "WHY 직방·호갱노노",
  faq: "FAQ",
  register: "관심고객 등록",
  consultant: "담당 분양상담사",
  location: "오시는 길",
};

/** 미리보기 좌측 섹션 네비 표시명 */
export const PRESALE_SECTION_SCROLL_LABELS: Record<PresaleSectionKey, string> = {
  ...PRESALE_SECTION_LABELS,
  whyZigbang: "WHY 직방·호갱노노",
  faq: "자주 묻는 질문",
  register: "관심고객 등록",
  consultant: "담당 분양상담사",
  location: "오시는 길",
};

export const PRESALE_SECTION_DOM_IDS: Record<PresaleSectionKey, string> = {
  product: "presale-product",
  overview: "presale-overview",
  site: "presale-site",
  premium: "presale-premium",
  floorplan: "presale-floorplan",
  whyZigbang: "presale-why",
  faq: "presale-faq",
  register: "presale-register",
  consultant: "presale-consultant",
  location: "presale-location",
};
