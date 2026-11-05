import { getDeployEnv } from "@midday/lib/deploy-env";

/**
 * 상담사 프리미엄 기능 잠금 해제 플래그.
 * 등급 정책 확정 전 테스트용 — 확정 후 false로 되돌리면 기존 등급 제한이 다시 적용됩니다.
 */
export const CONSULTANT_PREMIUM_FEATURES_UNLOCKED = true;

/**
 * 랜딩 상담사 섹션 노출 여부.
 * 비즈프로필 연동이 준비되기 전에는 편집기·미리보기·공개 랜딩에서 숨긴다.
 */
export function isLandingConsultantSectionEnabled(): boolean {
  return false;
}

/**
 * 상담사(비즈프로필) 기능 노출 여부.
 * 1차 상용(PROD)에서는 미제공 — GNB·계정·Admin·공개 라우트·랜딩 상담사 섹션을 끈다.
 * DEV/local 에서는 그대로 제공한다.
 */
export function isConsultantFeaturesEnabled(): boolean {
  return getDeployEnv() !== "prod";
}
