import type { PresaleLandingData } from "@midday/types/presale-landing";
import { PRESALE_SITE_MATRIX_DEFAULT_ICONS } from "@midday/lib/presale-premium-icons";

const SERENOA_SITE_TITLES = ["더블 교통망", "완성형 생활권", "안심 교육환경", "공원 품은 단지"];
const SERENOA_SITE_BLURBS = [
  "역세권 도보와 광역 교통으로 도심을 빠르게 연결합니다.",
  "마트·백화점·병원을 가까이 두는 생활권입니다.",
  "초·중·고와 학원가를 도보로 이용하는 주거환경입니다.",
  "공원과 산책로가 이어져 자연을 가깝게 둡니다.",
];
const SERENOA_PREMIUM_TITLES = ["사계절 중앙정원", "호텔형 커뮤니티", "남향 위주 배치", "스마트 주거"];
const SERENOA_PREMIUM_BODIES = [
  "채광과 녹지를 담은 단지 조경",
  "여유로운 라운지와 커뮤니티",
  "통풍을 고려한 동간 거리",
  "주차 유도와 에너지 관리",
];

export const SERENOA_HERO_LEAD = "도시의 여유를\n새롭게 설계하다";
export const PREMIUM_HERO_LEAD = "더블 역세권에서\n일상이 가까워지다";

export const SERENOA_HERO_BG_IMAGE = "/images/presale/serenoa/serenoa-hero-bg.png";
export const SERENOA_HERO_CARD_IMAGE = "/images/presale/serenoa/serenoa-hero.png";

/** 시안 기본/더미로 쓰이던 대표 이미지 — 새 배경으로 교체 */
const SERENOA_LEGACY_HERO_IMAGE_URLS = new Set([
  "/images/presale/serenoa/serenoa-hero.png",
  "/images/presale/product-aerial-default.png",
  "/images/presale/product-city-default.png",
  "/images/presale/product-life-default.png",
  "/images/presale/product-school-default.png",
  "/images/presale/product-map-default.png",
]);

/** 히어로 배경 URL 결정 — 레거시/더미면 시안 기본 배경으로 */
export function resolveSerenoaHeroBackgroundUrl(url?: string | null): string {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return SERENOA_HERO_BG_IMAGE;
  // query/hash 제거 후 비교
  const path = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (SERENOA_LEGACY_HERO_IMAGE_URLS.has(path)) return SERENOA_HERO_BG_IMAGE;
  return trimmed;
}

function isSerenoaLegacyHeroImage(url?: string | null): boolean {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return true;
  const path = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  return SERENOA_LEGACY_HERO_IMAGE_URLS.has(path);
}

/** 예전 커머스 더미 헤드라인 — 과장 광고 + 어색한 줄바꿈 */
const LEGACY_DUMMY_LEAD_COLLAPSED =
  "생활·의료·학군·분양가까지, 넘볼 수 없는 압도적 차이 — 더블 역세권 프리미엄 주거.";

function collapsePresaleLead(text: string | undefined): string {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/[—–−-]/g, "—")
    .trim();
}

export function isLegacyPresaleDummyLead(text: string | undefined): boolean {
  return collapsePresaleLead(text) === LEGACY_DUMMY_LEAD_COLLAPSED;
}

export function rewriteLegacyPresaleDummyLead(
  lead: string | undefined,
  skin?: PresaleLandingData["skin"]
): string {
  if (!isLegacyPresaleDummyLead(lead)) return lead ?? "";
  return skin === "serenoa" ? SERENOA_HERO_LEAD : PREMIUM_HERO_LEAD;
}

/** 브라이트 포레스트형 초기 카피 — 긴 커머스/화보형 더미를 짧은 시안 톤으로 맞춤 */
export function applySerenoaDefaultCopy(data: PresaleLandingData): PresaleLandingData {
  const nextMainImage = isSerenoaLegacyHeroImage(data.product.mainImage?.url)
    ? {
        url: SERENOA_HERO_BG_IMAGE,
        label: data.product.mainImage?.label?.trim() || "히어로 배경",
      }
    : {
        url: data.product.mainImage?.url?.trim() || SERENOA_HERO_BG_IMAGE,
        label: data.product.mainImage?.label?.trim() || "히어로 배경",
      };

  return {
    ...data,
    product: {
      ...data.product,
      badge: "GRAND OPEN",
      lead: SERENOA_HERO_LEAD,
      priceNote: "공원과 교통, 교육과 생활이 이어지는 자리.\n매일이 더 밝아지는 새로운 중심입니다.",
      mainImage: nextMainImage,
    },
    overview: {
      ...data.overview,
      title: "사업개요",
      description: "단지의 기본 공급 정보를 안내드립니다.",
    },
    site: {
      ...data.site,
      title: "가까운 일상이 만드는\n더 큰 생활의 가치",
      description: "교통·생활·교육·자연을 한자리에서 누립니다.",
      matrixLabels: SERENOA_SITE_TITLES,
      matrixBlurbs: SERENOA_SITE_BLURBS,
      matrixIcons: [...PRESALE_SITE_MATRIX_DEFAULT_ICONS],
    },
    premium: {
      ...data.premium,
      copyHeadline: "빛과 자연이 머무는\n새로운 주거 기준",
      copyBody: "집 안에서 단지 전체까지, 일상의 품격을 높입니다.",
      cards: (data.premium.cards.length > 0
        ? data.premium.cards
        : [
            { icon: "residential-environment" as const, title: "", description: "", imageUrl: "" },
            { icon: "apartment-complex" as const, title: "", description: "", imageUrl: "" },
            { icon: "floor-plan" as const, title: "", description: "", imageUrl: "" },
            { icon: "future-value" as const, title: "", description: "", imageUrl: "" },
          ]
      ).map((card, i) => ({
        ...card,
        title: SERENOA_PREMIUM_TITLES[i] ?? card.title,
        description: SERENOA_PREMIUM_BODIES[i] ?? card.description,
        imageUrl:
          card.imageUrl?.trim() ||
          [
            "/images/presale/serenoa/serenoa-garden.png",
            "/images/presale/serenoa/serenoa-community.png",
            "/images/presale/serenoa/serenoa-hero.png",
            "/images/presale/serenoa/serenoa-garden.png",
          ][i] ||
          "/images/presale/serenoa/serenoa-garden.png",
      })),
    },
    floorplan: {
      ...data.floorplan,
      title: "생활을 이해한 공간 설계",
      description: "라이프스타일에 맞춰 고르는 실용 평면입니다.",
    },
    faq: {
      ...data.faq,
      title: "자주 묻는 질문",
      description: "상담 전 많이 궁금해하시는 내용입니다.",
    },
    register: {
      ...data.register,
      copyHeadline: "새로운 소식을\n가장 먼저 만나보세요",
      copyBody: "분양 일정과 타입별 안내를 우선 드립니다.",
      perks: [
        "분양 일정 · 잔여세대 우선 안내",
        "타입별 자료 제공",
        "견본주택 상담 안내",
      ],
    },
    location: {
      ...data.location,
      headingVenueLabel: "견본주택",
      sectionDescription: "방문 전 관심고객등록 또는 전화를 권장합니다.",
      placeName: data.gnb.siteName?.trim()
        ? `${data.gnb.siteName.trim()} 주택전시관`
        : "주택전시관",
      note: "방문 전 관심고객등록을 권장합니다.",
    },
    footer: {
      ...data.footer,
      info: "본 페이지의 이미지와 내용은 이해를 돕기 위한 예시입니다.",
    },
  };
}

export const SERENOA_SITE_TITLE_FALLBACKS = SERENOA_SITE_TITLES;

export function isPresaleDisclaimerCopy(text: string | undefined): boolean {
  return Boolean(text?.trim().startsWith("※"));
}

export function isEnglishSiteMatrixLabel(label: string | undefined): boolean {
  return /^(TRAFFIC|LIFE|EDU|NATURE)$/i.test(String(label ?? "").trim());
}
