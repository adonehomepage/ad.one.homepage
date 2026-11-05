/** 프리미엄 섹션 카드 아이콘 — `/public/images/presale/icons` (SVG 교체 시 동일 id·경로) */
export type PresalePremiumIconId =
  | "floor-plan"
  | "future-value"
  | "apartment-complex"
  | "price-benefit"
  | "model-house"
  | "prime-location"
  | "move-in-support"
  | "promotion-event"
  | "ocean-view-residence"
  | "residential-environment"
  | "premium-school-district"
  | "sales-schedule"
  | "secure-guarantee"
  | "subscription-info"
  | "transit-hub";

export type PresalePremiumIconDef = {
  id: PresalePremiumIconId;
  label: string;
};

export const PRESALE_PREMIUM_ICONS: PresalePremiumIconDef[] = [
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
];

export const PRESALE_PREMIUM_DEFAULT_CARD_ICONS: PresalePremiumIconId[] = [
  "ocean-view-residence",
  "transit-hub",
  "premium-school-district",
  "apartment-complex",
];

/** 입지 매트릭스 기본 아이콘 (교통·생활·교육·단지) */
export const PRESALE_SITE_MATRIX_DEFAULT_ICONS: PresalePremiumIconId[] = [
  "transit-hub",
  "prime-location",
  "premium-school-district",
  "apartment-complex",
];

export const PRESALE_PREMIUM_MIN_CARDS = 1;
export const PRESALE_PREMIUM_MAX_CARDS = 6;

const ICON_ID_SET = new Set(PRESALE_PREMIUM_ICONS.map((item) => item.id));

const LEGACY_EMOJI_TO_ICON: Record<string, PresalePremiumIconId> = {
  "🌊": "ocean-view-residence",
  "🚇": "transit-hub",
  "🏫": "premium-school-district",
};

const ICON_BASE = "/images/presale/icons";

export function isPresalePremiumIconId(value: string): value is PresalePremiumIconId {
  return ICON_ID_SET.has(value as PresalePremiumIconId);
}

/** PNG 우선, 동일 id의 SVG가 있으면 나중에 교체 가능 */
export function presalePremiumIconSrc(iconId: string): string | null {
  if (!isPresalePremiumIconId(iconId)) return null;
  return `${ICON_BASE}/${iconId}.png`;
}

export function resolvePresalePremiumIconId(raw: string | undefined, fallbackIndex = 0): PresalePremiumIconId {
  const trimmed = raw?.trim() ?? "";
  if (trimmed && isPresalePremiumIconId(trimmed)) return trimmed;
  if (trimmed && LEGACY_EMOJI_TO_ICON[trimmed]) return LEGACY_EMOJI_TO_ICON[trimmed];
  if (trimmed.startsWith("/") || trimmed.startsWith("http")) {
    const file = trimmed.split("/").pop()?.replace(/\.(png|svg|webp)$/i, "") ?? "";
    if (isPresalePremiumIconId(file)) return file;
  }
  return (
    PRESALE_PREMIUM_DEFAULT_CARD_ICONS[fallbackIndex] ??
    PRESALE_PREMIUM_ICONS[0]?.id ??
    "ocean-view-residence"
  );
}

export function createDefaultPremiumCard(index = 0): {
  icon: PresalePremiumIconId;
  title: string;
  description: string;
  imageUrl: string;
} {
  return {
    icon: resolvePresalePremiumIconId(undefined, index),
    title: "새 카드 제목",
    description: "카드 설명을 입력하세요.",
    imageUrl: "",
  };
}
