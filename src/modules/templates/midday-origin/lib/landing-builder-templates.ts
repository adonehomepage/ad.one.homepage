/**
 * 랜딩 빌더 「디자인 템플릿」 카탈로그.
 * 빌더 로직·섹션 스키마는 동일하고, 비주얼(스킨)만 분기한다.
 */

import { getDeployEnv } from "@midday/lib/deploy-env";

export const LANDING_BUILDER_TEMPLATE_QUERY_KEY = "template" as const;
/** 선택 화면에서 「제작하기」로 편집을 시작할 때 */
export const LANDING_BUILDER_CREATE_QUERY_KEY = "create" as const;

/** PROD에서 아직 제작 불가인 템플릿에 노출하는 안내 */
export const LANDING_BUILDER_TEMPLATE_COMING_SOON_MESSAGE =
  "오픈 대기 중이에요. 준비되는 대로 바로 안내드릴게요 — 조금만 기다려 주세요.";

/** URL `?template=` 값 — 신규 선택 가능한 템플릿만 */
export type LandingBuilderTemplateId = "premium" | "midday" | "serenoa" | "hognono";

/** 저장된 프로젝트 content.skin (`artem` 레거시는 로드 시 `premium`으로 정규화) */
export type LandingBuilderSkinId = "premium" | "artem" | "midday" | "serenoa" | "hognono";

export type LandingBuilderTemplateMeta = {
  id: LandingBuilderTemplateId;
  /** UI 표시명 */
  name: string;
  /** 짧은 설명 */
  description: string;
  /** 목록 썸네일 */
  mockupImageSrc: string;
  /** DB projects.template_type — 스키마 동일 계열 */
  dbTemplateType: "PREMIUM";
  /** 히어로 등에 영상 샘플이 포함된 템플릿 */
  hasVideo?: boolean;
};

export const LANDING_BUILDER_TEMPLATES: readonly LandingBuilderTemplateMeta[] = [
  {
    id: "premium",
    name: "E-commerce형",
    description: "사업개요·입지·프리미엄·평면 등 분양 핵심 섹션을 담은 기본 상품형 시안",
    mockupImageSrc: "/images/presale/product-aerial-default.png",
    dbTemplateType: "PREMIUM",
  },
  {
    id: "midday",
    name: "프리미엄 화보형",
    description: "풀블리드 히어로와 화보형 레이아웃으로 단지 분위기를 강조한 프리미엄 시안",
    mockupImageSrc: "/images/presale/product-life-default.png",
    dbTemplateType: "PREMIUM",
  },
  {
    id: "serenoa",
    name: "브라이트 포레스트형",
    description: "포레스트 그린 톤과 스크롤 확장 히어로로 단지를 소개하는 신뢰형 시안",
    mockupImageSrc: "/images/presale/serenoa/serenoa-hero-bg.png",
    dbTemplateType: "PREMIUM",
    hasVideo: true,
  },
  {
    id: "hognono",
    name: "호갱노노 단지상세형",
    description: "호갱노노 단지상세와 유사한 정보 구조·인터랙션으로 상담 전환에 최적화된 시안",
    mockupImageSrc: "/images/presale/product-aerial-default.png",
    dbTemplateType: "PREMIUM",
  },
] as const;

export const DEFAULT_LANDING_BUILDER_TEMPLATE_ID: LandingBuilderTemplateId = "premium";

export function isLandingBuilderTemplateId(v: unknown): v is LandingBuilderTemplateId {
  return v === "premium" || v === "midday" || v === "serenoa" || v === "hognono";
}

/**
 * 신규 제작에 쓸 수 있는지.
 * PROD: E-commerce형 · 프리미엄 화보형 · 브라이트 포레스트형 오픈. 호갱노노 단지상세형은 대기.
 * DEV/local: 전부 제작 가능.
 */
const PROD_CREATE_ENABLED_TEMPLATE_IDS = new Set<LandingBuilderTemplateId>([
  "premium",
  "midday",
  "serenoa",
]);

export function isLandingBuilderTemplateCreateEnabled(
  id: LandingBuilderTemplateId | string | null | undefined
): boolean {
  const resolved = resolveLandingBuilderTemplateId(id);
  if (getDeployEnv() !== "prod") return true;
  return PROD_CREATE_ENABLED_TEMPLATE_IDS.has(resolved);
}

export function isLandingBuilderTemplateComingSoon(
  id: LandingBuilderTemplateId | string | null | undefined
): boolean {
  return !isLandingBuilderTemplateCreateEnabled(id);
}

/** URL에 template 쿼리가 명시적으로 있는지 (스킨 복구용) */
export function hasExplicitLandingBuilderTemplate(
  raw: string | null | undefined
): boolean {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  return isLandingBuilderTemplateId(t);
}

/** 「제작하기」로 편집 시작이 확정됐는지 (`?create=1`) */
export function isLandingBuilderCreateRequested(
  raw: string | null | undefined
): boolean {
  return String(raw ?? "").trim() === "1";
}

export function resolveLandingBuilderTemplateId(
  raw: string | null | undefined
): LandingBuilderTemplateId {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (isLandingBuilderTemplateId(t)) return t;
  return DEFAULT_LANDING_BUILDER_TEMPLATE_ID;
}

/** 템플릿 id → 랜딩 데이터 skin */
export function landingBuilderTemplateToSkin(
  id: LandingBuilderTemplateId | string | null | undefined
): "premium" | "midday" | "serenoa" | "hognono" {
  const resolved = resolveLandingBuilderTemplateId(id);
  if (resolved === "midday") return "midday";
  if (resolved === "serenoa") return "serenoa";
  if (resolved === "hognono") return "hognono";
  return "premium";
}

export function getLandingBuilderTemplate(
  id: LandingBuilderTemplateId | string | null | undefined
): LandingBuilderTemplateMeta {
  const resolved = resolveLandingBuilderTemplateId(id);
  return (
    LANDING_BUILDER_TEMPLATES.find((t) => t.id === resolved) ??
    LANDING_BUILDER_TEMPLATES[0]!
  );
}

/** 1step — 템플릿 선택 (저장·부트스트랩 없음). templateId가 있으면 미리보기 선택 유지 */
export function buildLandingEditorSelectUrl(
  templateId?: LandingBuilderTemplateId | string | null
): string {
  const params = new URLSearchParams();
  params.set("new", "1");
  if (templateId != null && String(templateId).trim()) {
    params.set(
      LANDING_BUILDER_TEMPLATE_QUERY_KEY,
      resolveLandingBuilderTemplateId(templateId)
    );
  }
  return `/landing/editor?${params.toString()}`;
}

/** 2step — 선택 확정 후 편집 시작 */
export function buildLandingEditorNewUrl(templateId: LandingBuilderTemplateId): string {
  const id = resolveLandingBuilderTemplateId(templateId);
  const params = new URLSearchParams();
  params.set("new", "1");
  params.set(LANDING_BUILDER_TEMPLATE_QUERY_KEY, id);
  params.set(LANDING_BUILDER_CREATE_QUERY_KEY, "1");
  return `/landing/editor?${params.toString()}`;
}

/** 편집기 — 프로젝트 로드. template을 빼면 새로고침 때 기본 스킨(1번)으로 떨어질 수 있음 */
export function buildLandingEditorProjectUrl(
  projectId: string,
  templateId?: string | null
): string {
  const params = new URLSearchParams();
  params.set("project", projectId.trim());
  const skin = String(templateId ?? "")
    .trim()
    .toLowerCase();
  if (isLandingBuilderTemplateId(skin)) {
    params.set(LANDING_BUILDER_TEMPLATE_QUERY_KEY, skin);
  }
  return `/landing/editor?${params.toString()}`;
}
